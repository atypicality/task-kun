import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { AddTask } from "../components/AddTask";
import { TaskCharts } from "../components/TaskCharts";
import { Sidebar } from "../components/Sidebar";
import { getUserTasks, createTask, updateTask, deleteTask } from "../services/taskService";
import type { TaskResponse } from "../services/taskService";
import Taskbox from '../assets/taki-taskbox.svg';
import Calendar from '../assets/taki-calendar.svg';
import Sun from '../assets/taki-sun.svg';
import Moon from '../assets/taki-moon.svg';
import Sparkle from '../assets/taki-sparkle.svg';
import Bell from '../assets/taki-bell.svg';
import Person from '../assets/taki-person.svg';
import Logout from '../assets/taki-logout.svg';
import Fire from '../assets/taki-fire.svg';
import Pencil from '../assets/taki-pencil.svg';
import "./Dashboard.css";

type Priority = "low" | "medium" | "high";

// Frontend representation of a task (with converted field names)
interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: Priority;
  createdAt: Date;
  dueDate: string; // YYYY-MM-DD (required)
  dueTime: string; // HH:MM (defaults 23:59)
}

/**
 * Convert backend TaskResponse to frontend Task interface
 */
function convertBackendToFrontend(backendTask: TaskResponse): Task {
  const time = backendTask.time || "23:59";
  const timeStr = time.includes(":") ? time.split(":").slice(0, 2).join(":") : "23:59";
  
  return {
    id: backendTask.task_id,
    title: backendTask.task_title,
    description: backendTask.notes || "",
    completed: backendTask.completed,
    priority: (backendTask.priority as Priority) || "medium",
    createdAt: new Date(),
    dueDate: backendTask.deadline || "",
    dueTime: timeStr,
  };
}

/**
 * Convert frontend Task to backend format for API calls
 */
function convertFrontendToBackend(task: Task) {
  return {
    task_title: task.title,
    priority: task.priority,
    deadline: task.dueDate,
    time: task.dueTime ? `${task.dueTime}:00` : "23:59:00",
    notes: task.description,
    completed: task.completed,
  };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toNiceTime(hhmm: string) {
  const [hh, mm] = hhmm.split(":").map(Number);
  const ampm = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${String(mm).padStart(2, "0")} ${ampm}`;
}

function formatDueLabel(dueDate: string, dueTime: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(`${dueDate}T00:00:00`);
  due.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const timeLabel = toNiceTime(dueTime || "23:59");

  if (due.getTime() === today.getTime()) return `Today, ${timeLabel}`;
  if (due.getTime() === tomorrow.getTime()) return `Tomorrow, ${timeLabel}`;

  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${monthNames[due.getMonth()]} ${due.getDate()}, ${timeLabel}`;
}

export function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sortMode, setSortMode] = useState<"deadline" | "priority" | "both">("deadline");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);

  // Fetch tasks from Supabase on mount and when user changes
  useEffect(() => {
    const fetchTasks = async () => {
      if (!user?.user_id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const backendTasks = await getUserTasks(user.user_id);
        const frontendTasks = backendTasks.map(convertBackendToFrontend);
        setTasks(frontendTasks);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load tasks";
        setError(message);
        console.error("Error fetching tasks:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [user?.user_id]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleAddTask = async (taskData: Omit<Task, "id" | "createdAt">) => {
    if (!user?.user_id) {
      setError("User not authenticated");
      return;
    }

    try {
      setError(null);
      // Only send time if explicitly set (not the default 23:59)
      const hasExplicitTime = taskData.dueTime && taskData.dueTime !== "23:59";
      
      const result = await createTask({
        user_id: user.user_id,
        task_title: taskData.title,
        priority: taskData.priority,
        deadline: taskData.dueDate || undefined,
        time: hasExplicitTime ? taskData.dueTime : undefined,
        notes: taskData.description || undefined,
        completed: taskData.completed,
      });
      
      const newTask = convertBackendToFrontend(result);
      setTasks([newTask, ...tasks]);
      setShowCreate(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create task";
      setError(message);
      alert(`Failed to create task: ${message}`);
    }
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    try {
      const backendPayload = convertFrontendToBackend(updatedTask);
      const result = await updateTask(updatedTask.id, backendPayload);
      const convertedTask = convertBackendToFrontend(result);
      setTasks(tasks.map((t) => (t.id === updatedTask.id ? convertedTask : t)));
      setEditingTask(null);
      setShowCreate(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update task";
      setError(message);
      alert(`Failed to update task: ${message}`);
    }
  };

  const handleToggleTask = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    try {
      const result = await updateTask(id, { completed: !task.completed });
      const convertedTask = convertBackendToFrontend(result);
      setTasks(tasks.map((t) => (t.id === id ? convertedTask : t)));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to toggle task";
      setError(message);
      alert(`Failed to toggle task: ${message}`);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      await deleteTask(id);
      setTasks(tasks.filter((t) => t.id !== id));
      if (editingTask?.id === id) setEditingTask(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete task";
      setError(message);
      alert(`Failed to delete task: ${message}`);
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowCreate(true);
  };

  const todayIso = toISODate(new Date());

  const stats = useMemo(() => {
    const inNext7 = new Date();
    inNext7.setDate(inNext7.getDate() + 7);
    const cutoffIso = toISODate(inNext7);

    const incomplete = tasks.filter((t) => !t.completed);
    const dueToday = incomplete.filter((t) => t.dueDate === todayIso).length;
    const dueNext7 = incomplete.filter((t) => t.dueDate >= todayIso && t.dueDate <= cutoffIso).length;
    const completedWeek = tasks.filter((t) => t.completed).length;

    return { dueToday, dueNext7, completedWeek };
  }, [tasks, todayIso]);

  const nextBestTask = useMemo(() => {
    const incomplete = tasks.filter((t) => !t.completed);
    const pri = (p: Priority) => (p === "high" ? 0 : p === "medium" ? 1 : 2);

    return [...incomplete].sort((a, b) => {
      const pDiff = pri(a.priority) - pri(b.priority);
      if (pDiff !== 0) return pDiff;

      const aKey = `${a.dueDate}T${a.dueTime || "23:59"}`;
      const bKey = `${b.dueDate}T${b.dueTime || "23:59"}`;
      return aKey.localeCompare(bKey);
    })[0] ?? null;
  }, [tasks]);

  const filteredSortedTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = showCompletedTasks 
      ? tasks.filter((t) => t.completed)
      : tasks.filter((t) => !t.completed);

    if (q) {
      list = list.filter(
        (t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
      );
    }

    const pri = (p: Priority) => (p === "high" ? 0 : p === "medium" ? 1 : 2);

    list.sort((a, b) => {
      const dueCmp = `${a.dueDate}T${a.dueTime || "23:59"}`.localeCompare(
        `${b.dueDate}T${b.dueTime || "23:59"}`
      );
      const priCmp = pri(a.priority) - pri(b.priority);

      if (sortMode === "deadline") return dueCmp;
      if (sortMode === "priority") return priCmp;
      return dueCmp !== 0 ? dueCmp : priCmp;
    });

    return list;
  }, [tasks, searchQuery, sortMode, showCompletedTasks]);

  return (
    <div className="sk-shell dash-shell">
      <Sidebar active="home" tipBody="Ask Task-kun to break down your midterm study guide!" />

      {/* Main */}
      <div className="sk-main">
        {/* Topbar */}
        <header className="sk-topbar">
          <div className="sk-topLeft">
            <div className="sk-topTitle">task-kun<span className="sk-brandTld">.ai</span></div>
          </div>

          <div className="sk-searchWrap">
            <input
              className="sk-search"
              placeholder="Search tasks, tags, classes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="sk-topRight">
            <button className="sk-iconBtn" title="Toggle theme" onClick={toggleTheme}>
              {theme === "light" ? 
              <img className="svg sidebarsvg svgalwayson" src={Moon} alt="" />
               :
              <img className="svg sidebarsvg svgalwayson" src={Sun} alt="" />}
            </button>
            <button className="sk-iconBtn" title="Notifications">
              <img className="svg sidebarsvg svgalwayson" src={Bell} alt="" />
            </button>
            <button className="sk-iconBtn" title="Profile" onClick={() => navigate("/profile")}>
              <img className="svg sidebarsvg svgalwayson" src={Person} alt="" />
            </button>
            <button className="sk-iconBtn" title="Sign out" onClick={handleLogout}>
              <img className="svg sidebarsvg svgalwayson" src={Logout} alt="" />
            </button>
          </div>
        </header>

        <main className="sk-content dash-content">
          {/* Error Banner */}
          {error && (
            <div className="dash-errorBanner" style={{ padding: "12px 16px", marginBottom: "16px", backgroundColor: "#fee", border: "1px solid #fcc", borderRadius: "4px", color: "#c33" }}>
              {error}
              <button onClick={() => setError(null)} style={{ marginLeft: "8px", cursor: "pointer" }}>✕</button>
            </div>
          )}

          {loading && (
            <div className="dash-loading" style={{ padding: "32px", textAlign: "center", color: "#999" }}>
              Loading tasks...
            </div>
          )}

          {!loading && (
            <>
          {/* Welcome */}
          <div className="dash-welcomeRow">
            <div>
              <h1 className="dash-welcomeTitle">
                Welcome back, {user?.display_name ?? "friend"}! 
              </h1>
              <div className="dash-quote">“One step at a time leads to the summit.”</div>
            </div>

            <div className="dash-streakPill">
              <img className="svgstreak" src={Fire} alt="" />
              <span>12 Day Streak!</span>
            </div>
          </div>

          {/* Stats */}
          <section className="dash-stats">
            <div className="dash-statCard">
              <div className="dash-statIcon">
                 <img className="svg sidebarsvg svgalwayson" src={Taskbox} alt="" />
              </div>
              <div>
                <div className="dash-statLabel">Tasks for Today</div>
                <div className="dash-statValue">{stats.dueToday}</div>
              </div>
            </div>

            <div className="dash-statCard">
              <div className="dash-statIcon pink">
                <img className="svgpink" src={Calendar} alt="" />
              </div>
              <div>
                <div className="dash-statLabel">Next 7 Days</div>
                <div className="dash-statValue">{stats.dueNext7}</div>
              </div>
            </div>

            <div className="dash-statCard">
              <div className="dash-statIcon green">
                <img className="svggreen" src={Sparkle} alt="" />
              </div>
              <div>
                <div className="dash-statLabel">Completed (Week)</div>
                <div className="dash-statValue">{stats.completedWeek}</div>
              </div>
            </div>
          </section>

          {/* Charts */}
          <TaskCharts tasks={tasks} />

          {/* AI Card */}
          <section className="dash-aiCard">
            <div className="dash-aiLeft">
              <div className="dash-aiKicker">
                <span className="dash-aiKickerIcon">✦</span> AI NEXT BEST TASK
              </div>

              {nextBestTask ? (
                <>
                  <div className="dash-aiTitle">
                    Most valuable right now: <span className="dash-aiStrong">{nextBestTask.title}</span>
                  </div>
                  <div className="dash-aiSub">
                    Due {formatDueLabel(nextBestTask.dueDate, nextBestTask.dueTime)} • Priority {nextBestTask.priority}
                  </div>

                  <div className="dash-aiActions">
                    <button className="dash-primaryBtn">
                      Start Now
                    </button>
                    <div className="dash-confidence">
                      <div className="dash-confidenceLabel">CONFIDENCE SCORE</div>
                      <div className="dash-confidenceValue">82%</div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="dash-aiTitle">No active tasks yet — add one to get recommendations.</div>
              )}
            </div>

            <div className="dash-aiArt" aria-hidden="true">✦</div>
          </section>

          {/* Controls */}
          <div className="dash-controlsRow">
            <div className="dash-seg">
              <button className={`dash-segBtn ${sortMode === "deadline" ? "active" : ""}`} onClick={() => setSortMode("deadline")}>
                Deadline
              </button>
              <button className={`dash-segBtn ${sortMode === "priority" ? "active" : ""}`} onClick={() => setSortMode("priority")}>
                Priority
              </button>
              <button className={`dash-segBtn ${sortMode === "both" ? "active" : ""}`} onClick={() => setSortMode("both")}>
                Both
              </button>
            </div>

            <div className="dash-rightControls">
              <button 
                className={`dash-ghostBtn ${showCompletedTasks ? "active" : ""}`}
                type="button"
                onClick={() => setShowCompletedTasks(!showCompletedTasks)}
              > 
                Completed Tasks 
              </button>
              <button
                className="dash-ghostBtn"
                type="button"
                onClick={() => {
                  setEditingTask(null);
                  setShowCreate(true);
                }}
              >
                New Task
              </button>
            </div>
          </div>

          {/* Task list */}
          <section className="dash-taskList">
            {filteredSortedTasks.length === 0 ? (
              <div className="dash-empty sk-card">
                <div className="dash-emptySVG">
                  <img className="svg svgalwayson" src={Pencil} alt="" />
                </div>
                <div className="dash-emptyTitle">No {showCompletedTasks ? "completed" : ""} tasks found</div>
                <div className="dash-emptySub">
                  {searchQuery ? "Try a different search term." : showCompletedTasks ? "Complete some tasks to see them here." : "Click 'New Task' to add one."}
                </div>
              </div>
            ) : (
              filteredSortedTasks.map((t) => (
                <div key={t.id} className="dash-taskRow sk-card">
                  <button className="dash-check" onClick={() => handleToggleTask(t.id)} title="Mark complete">
                    {t.completed ? "✓" : ""}
                  </button>

                  <div className="dash-taskMain">
                    <div className="dash-taskTitle">{t.title}</div>
                    <div className="dash-taskMeta">
                      <span>⏰ {formatDueLabel(t.dueDate, t.dueTime)}</span>
                    </div>
                  </div>

                  <div className={`dash-priorityPill ${t.priority}`}>{t.priority}</div>

                  <div className="dash-rowActions">
                    <button className="dash-iconAction" onClick={() => handleEditTask(t)} title="Edit">✏️</button>
                    <button className="dash-iconAction" onClick={() => handleDeleteTask(t.id)} title="Delete">🗑️</button>
                  </div>
                </div>
              ))
            )}
          </section>

          <footer className="sk-footer">© 2026 task-kun.ai · Built for students</footer>

          {/* ===== Modal ===== */}
          {showCreate && (
            <div
              className="modal-overlay"
              role="dialog"
              aria-modal="true"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) {
                  setShowCreate(false);
                  setEditingTask(null);
                }
              }}
            >
              <div className="modal-card" onMouseDown={(e) => e.stopPropagation()}>
                <div className="modal-topBar" />

                <div className="modal-header">
                  <div className="modal-headerLeft">
                    <div className="modal-badge">✦</div>
                    <div>
                      <div className="modal-title">{editingTask ? "Edit Task" : "Create New Task"}</div>
                      <div className="modal-subtitle">Let’s get organized and crush your goals!</div>
                    </div>
                  </div>

                  <button
                    className="modal-close"
                    onClick={() => {
                      setShowCreate(false);
                      setEditingTask(null);
                    }}
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>

                <div className="modal-body">
                  <AddTask
                    onAdd={handleAddTask}
                    editingTask={editingTask}
                    onEditComplete={() => setEditingTask(null)}
                    onUpdate={handleUpdateTask}
                    inModal
                    onCloseModal={() => {
                      setShowCreate(false);
                      setEditingTask(null);
                    }}
                  />
                </div>

                <div className="modal-footer">
                  <button
                    className="modal-cancel"
                    onClick={() => {
                      setShowCreate(false);
                      setEditingTask(null);
                    }}
                  >
                    Cancel
                  </button>

                  <button className="modal-save" type="submit" form="addTaskForm">
                    Save Task
                  </button>
                </div>
              </div>
            </div>
          )}
            </>
          )}
        </main>
      
      </div>
    </div>
  );
}