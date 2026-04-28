import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { AddTask } from "../components/AddTask";
import { Sidebar } from "../components/Sidebar";
import * as taskServiceAPI from "../services/taskService";
import Sun from '../assets/taki-sun.svg';
import Moon from '../assets/taki-moon.svg';
import Logout from '../assets/taki-logout.svg';
import Bell from '../assets/taki-bell.svg';
import Person from '../assets/taki-person.svg';
import Pencil from '../assets/taki-pencil.svg';
import Computer from '../assets/taki-computer.svg';
import "./TasksPage.css";

type Priority = "low" | "medium" | "high";

interface Task {
  id: string; // task_id from Supabase
  title: string; // task_title from Supabase
  description: string; // notes from Supabase (or empty if not used)
  completed: boolean;
  priority: Priority;
  createdAt: Date;
  dueDate: string;
  dueTime: string;
  userId?: string; // to track the owner
}

function pad(n: number) { return String(n).padStart(2, "0"); }
function toISODate(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

function toNiceTime(hhmm: string) {
  const [hh, mm] = hhmm.split(":").map(Number);
  const ampm = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${String(mm).padStart(2, "0")} ${ampm}`;
}

function formatDueLabel(dueDate: string, dueTime: string) {
  const today = new Date(); today.setHours(0,0,0,0);
  const due = new Date(`${dueDate}T00:00:00`); due.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const timeLabel = toNiceTime(dueTime || "23:59");
  if (due.getTime() === today.getTime()) return `Today, ${timeLabel}`;
  if (due.getTime() === tomorrow.getTime()) return `Tomorrow, ${timeLabel}`;
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${monthNames[due.getMonth()]} ${due.getDate()}, ${timeLabel}`;
}

function isOverdue(dueDate: string, dueTime: string, completed: boolean) {
  if (completed) return false;
  const now = new Date();
  const due = new Date(`${dueDate}T${dueTime || "23:59"}:00`);
  return due < now;
}

type FilterMode = "active" | "completed" | "all";
type SortMode = "deadline" | "priority" | "both";

export function TasksPage() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("deadline");
  const [filterMode, setFilterMode] = useState<FilterMode>("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch tasks from Supabase on mount
  useEffect(() => {
    const fetchTasks = async () => {
      if (!user?.user_id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const fetchedTasks = await taskServiceAPI.getUserTasks(user.user_id);
        
        // Convert Supabase response to local Task format
        const convertedTasks = fetchedTasks.map((t) => ({
          id: t.task_id,
          title: t.task_title,
          description: t.notes || "",
          completed: t.completed,
          priority: (t.priority as Priority) || "medium",
          createdAt: new Date(),
          dueDate: t.deadline || "",
          dueTime: t.time || "23:59",
          userId: t.user_id,
        }));
        
        setTasks(convertedTasks);
      } catch (err) {
        console.error("Failed to fetch tasks:", err);
        setError(err instanceof Error ? err.message : "Failed to load tasks");
        // Fall back to empty list
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [user?.user_id]);

  const handleLogout = () => { logout(); navigate("/"); };

  const handleAddTask = async (taskData: Omit<Task, "id" | "createdAt" | "userId">) => {
    if (!user?.user_id) {
      setError("User not authenticated");
      return;
    }

    try {
      setError(null);
      // Only send time if explicitly set (not the default 23:59)
      const hasExplicitTime = taskData.dueTime && taskData.dueTime !== "23:59";
      
      const newSupabaseTask = await taskServiceAPI.createTask({
        user_id: user.user_id,
        task_title: taskData.title,
        priority: taskData.priority,
        deadline: taskData.dueDate || undefined,
        time: hasExplicitTime ? taskData.dueTime : undefined,
        notes: taskData.description || undefined,
        completed: taskData.completed,
      });

      // Convert response back to local format
      const newTask: Task = {
        id: newSupabaseTask.task_id,
        title: newSupabaseTask.task_title,
        description: newSupabaseTask.notes || "",
        completed: newSupabaseTask.completed,
        priority: (newSupabaseTask.priority as Priority) || "medium",
        createdAt: new Date(),
        dueDate: newSupabaseTask.deadline || "",
        dueTime: newSupabaseTask.time || "23:59",
        userId: newSupabaseTask.user_id,
      };

      setTasks([newTask, ...tasks]);
    } catch (err) {
      console.error("Failed to add task:", err);
      setError(err instanceof Error ? err.message : "Failed to add task");
    }
  };

  const handleUpdateTask = async (updated: Task) => {
    try {
      setError(null);
      // Only send time if explicitly set (not the default 23:59)
      const hasExplicitTime = updated.dueTime && updated.dueTime !== "23:59";
      
      await taskServiceAPI.updateTask(updated.id, {
        task_title: updated.title,
        priority: updated.priority,
        deadline: updated.dueDate || undefined,
        time: hasExplicitTime ? updated.dueTime : undefined,
        notes: updated.description || undefined,
        completed: updated.completed,
      });

      setTasks(tasks.map(t => t.id === updated.id ? updated : t));
      setEditingTask(null);
    } catch (err) {
      console.error("Failed to update task:", err);
      setError(err instanceof Error ? err.message : "Failed to update task");
    }
  };

  const handleToggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    try {
      setError(null);
      await taskServiceAPI.updateTask(id, {
        completed: !task.completed,
      });

      setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    } catch (err) {
      console.error("Failed to toggle task:", err);
      setError(err instanceof Error ? err.message : "Failed to update task");
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm("Delete this task?")) return;

    try {
      setError(null);
      await taskServiceAPI.deleteTask(id);
      setTasks(tasks.filter(t => t.id !== id));
      if (editingTask?.id === id) setEditingTask(null);
    } catch (err) {
      console.error("Failed to delete task:", err);
      setError(err instanceof Error ? err.message : "Failed to delete task");
    }
  };

  const handleEditTask = (task: Task) => { setEditingTask(task); setShowCreate(true); };

  const pri = (p: Priority) => p === "high" ? 0 : p === "medium" ? 1 : 2;

  const filteredSortedTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = tasks.filter(t => {
      if (filterMode === "active") return !t.completed;
      if (filterMode === "completed") return t.completed;
      return true;
    });
    if (q) list = list.filter(t => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    list.sort((a, b) => {
      const dueCmp = `${a.dueDate}T${a.dueTime || "23:59"}`.localeCompare(`${b.dueDate}T${b.dueTime || "23:59"}`);
      const priCmp = pri(a.priority) - pri(b.priority);
      if (sortMode === "deadline") return dueCmp;
      if (sortMode === "priority") return priCmp;
      return dueCmp !== 0 ? dueCmp : priCmp;
    });
    return list;
  }, [tasks, searchQuery, sortMode, filterMode]);

  const counts = useMemo(() => ({
    active: tasks.filter(t => !t.completed).length,
    completed: tasks.filter(t => t.completed).length,
    overdue: tasks.filter(t => !t.completed && isOverdue(t.dueDate, t.dueTime, t.completed)).length,
  }), [tasks]);

  const todayIso = toISODate(new Date());

  return (
    <div className="sk-shell tasks-shell">
      <Sidebar active="tasks" tipBody="Use AI Assistant to break down complex tasks into steps!" />

      <div className="sk-main">
        <header className="sk-topbar">
          <div className="sk-topLeft">
            <div className="sk-topTitle">task-kun<span className="sk-brandTld">.ai</span></div>
          </div>
          <div className="sk-searchWrap">
            <input className="sk-search" placeholder="Search tasks..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
          <div className="sk-topRight">
            <button className="sk-iconBtn" title="Toggle theme" onClick={toggleTheme}>
              {theme === "light" ? 
              <img className="svg sidebarsvg svgalwayson" src={Moon} alt="" />
               :
              <img className="svg sidebarsvg svgalwayson" src={Sun} alt="" />}
            </button>
            <button className="sk-iconBtn" title="Profile" onClick={() => navigate("/profile")}>
              <img className="svg sidebarsvg svgalwayson" src={Person} alt="" />
            </button>
            <button className="sk-iconBtn" title="Sign out" onClick={handleLogout}>
              <img className="svg sidebarsvg svgalwayson" src={Logout} alt="" />
            </button>
          </div>
        </header>

        <main className="sk-content tasks-content">
          {/* Error message */}
          {error && (
            <div style={{ padding: "12px 16px", marginBottom: "16px", backgroundColor: "#fee", borderRadius: "6px", color: "#c00", fontSize: "14px" }}>
              {error}
            </div>
          )}

          {/* Page header */}
          <div className="tasks-pageHeader">
            <div>
              <h1 className="tasks-title">My Tasks</h1>
              <p className="tasks-subtitle">Everything on your plate, all in one place.</p>
            </div>
            <button className="tasks-addBtn" onClick={() => { setEditingTask(null); setShowCreate(true); }}>
              + New Task
            </button>
          </div>

          {/* Summary row */}
          <div className="tasks-summary">
            <div className="tasks-summaryCard">
              <div className="tasks-summaryValue">{counts.active}</div>
              <div className="tasks-summaryLabel">Active</div>
            </div>
            <div className="tasks-summaryCard completed">
              <div className="tasks-summaryValue">{counts.completed}</div>
              <div className="tasks-summaryLabel">Completed</div>
            </div>
            {counts.overdue > 0 && (
              <div className="tasks-summaryCard overdue">
                <div className="tasks-summaryValue">{counts.overdue}</div>
                <div className="tasks-summaryLabel">Overdue</div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="tasks-controls">
            <div className="tasks-filterSeg">
              {(["active", "completed", "all"] as FilterMode[]).map(f => (
                <button key={f} className={`tasks-segBtn ${filterMode === f ? "active" : ""}`} onClick={() => setFilterMode(f)}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            <div className="tasks-sortSeg">
              <span className="tasks-sortLabel">Sort:</span>
              {(["deadline", "priority", "both"] as SortMode[]).map(s => (
                <button key={s} className={`tasks-segBtn ${sortMode === s ? "active" : ""}`} onClick={() => setSortMode(s)}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Task list */}
          <section className="tasks-list">
            {loading ? (
              <div className="tasks-empty sk-card">
                <div className="tasks-emptyIcon">⏳</div>
                <div className="tasks-emptyTitle">Loading tasks...</div>
              </div>
            ) : filteredSortedTasks.length === 0 ? (
              <div className="tasks-empty sk-card">
                <div className="tasks-emptyIcon">{filterMode === "completed" ? "🎉" : "📝"}</div>
                <div className="tasks-emptyTitle">
                  {filterMode === "completed" ? "No completed tasks yet" : searchQuery ? "No matching tasks" : "No tasks here"}
                </div>
                <div className="tasks-emptySub">
                  {filterMode === "completed" ? "Complete some tasks to see them here." : searchQuery ? "Try a different search." : "Click \"+ New Task\" to get started."}
                </div>
                {filterMode === "active" && !searchQuery && (
                  <button className="tasks-emptyBtn" onClick={() => { setEditingTask(null); setShowCreate(true); }}>
                    + Add Your First Task
                  </button>
                )}
              </div>
            ) : (
              filteredSortedTasks.map(t => {
                const overdue = isOverdue(t.dueDate, t.dueTime, t.completed);
                return (
                  <div key={t.id} className={`tasks-row sk-card ${t.completed ? "is-done" : ""} ${overdue ? "is-overdue" : ""}`}>
                    <button className={`tasks-check ${t.completed ? "checked" : ""}`} onClick={() => handleToggleTask(t.id)} title="Toggle complete">
                      {t.completed ? "✓" : ""}
                    </button>

                    <div className="tasks-rowMain">
                      <div className="tasks-rowTitle">{t.title}</div>
                      {t.description && <div className="tasks-rowDesc">{t.description}</div>}
                      <div className="tasks-rowMeta">
                        <span className={`tasks-dueChip ${overdue ? "overdue" : t.dueDate === todayIso ? "today" : ""}`}>
                          {overdue ? "⚠ " : "⏰ "}{formatDueLabel(t.dueDate, t.dueTime)}
                        </span>
                      </div>
                    </div>

                    <div className={`tasks-priority ${t.priority}`}>{t.priority}</div>

                    <div className="tasks-actions">
                      <button className="tasks-action" onClick={() => handleEditTask(t)} title="Edit">✏️</button>
                      <button className="tasks-action danger" onClick={() => handleDeleteTask(t.id)} title="Delete">🗑️</button>
                    </div>
                  </div>
                );
              })
            )}
          </section>

          <footer className="sk-footer">© 2026 task-kun.ai · Built for students</footer>

          {/* Modal */}
          {showCreate && (
            <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) { setShowCreate(false); setEditingTask(null); } }}>
              <div className="modal-card" onMouseDown={e => e.stopPropagation()}>
                <div className="modal-topBar" />
                <div className="modal-header">
                  <div className="modal-headerLeft">
                    <div className="modal-badge">✦</div>
                    <div>
                      <div className="modal-title">{editingTask ? "Edit Task" : "Create New Task"}</div>
                      <div className="modal-subtitle">Let's get organized and crush your goals!</div>
                    </div>
                  </div>
                  <button className="modal-close" onClick={() => { setShowCreate(false); setEditingTask(null); }}>✕</button>
                </div>
                <div className="modal-body">
                  <AddTask onAdd={handleAddTask} editingTask={editingTask} onEditComplete={() => setEditingTask(null)} onUpdate={handleUpdateTask} inModal onCloseModal={() => { setShowCreate(false); setEditingTask(null); }} />
                </div>
                <div className="modal-footer">
                  <button className="modal-cancel" onClick={() => { setShowCreate(false); setEditingTask(null); }}>Cancel</button>
                  <button className="modal-save" type="submit" form="addTaskForm">Save Task</button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
