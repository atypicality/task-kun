import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Sidebar } from "../components/Sidebar";
import {
  getMonthTaskEvents,
  getQuickReminderTasks,
  getLongTermTasks,
  getAllQuickReminderTasks,
  getAllLongTermTasks,
  toISODate,
  type CalendarEvent,
  type DueTask,
} from "../services/plannerService";
import Clock from '../assets/taki-clock.svg';
import Stopwatch from '../assets/taki-stopwatch.svg';
import Sun from '../assets/taki-sun.svg';
import Moon from '../assets/taki-moon.svg';
import Sparkle from '../assets/taki-sparkle.svg';
import Bell from '../assets/taki-bell.svg';
import Person from '../assets/taki-person.svg';
import Logout from '../assets/taki-logout.svg';
import Calendar from '../assets/taki-calendar.svg';
import Pencil from '../assets/taki-pencil.svg';
import "./Planner.css";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

function startOfCalendarGrid(year: number, monthIndex0: number) {
  const first = new Date(year, monthIndex0, 1);
  const dayOfWeek = first.getDay();
  const start = new Date(year, monthIndex0, 1 - dayOfWeek);
  start.setHours(0, 0, 0, 0);
  return start;
}

function formatDueLabel(dueDate: string, dueTime: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(`${dueDate}T00:00:00`);
  due.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const timeLabel = toNiceTime(dueTime);

  if (due.getTime() === today.getTime()) return `Today, ${timeLabel}`;
  if (due.getTime() === tomorrow.getTime()) return `Tomorrow, ${timeLabel}`;

  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${monthNames[due.getMonth()]} ${due.getDate()}, ${timeLabel}`;
}

function toNiceTime(hhmm: string) {
  const [hh, mm] = hhmm.split(":").map(Number);
  const ampm = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${String(mm).padStart(2, "0")} ${ampm}`;
}

export function Planner() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [selectedDate, setSelectedDate] = useState<string>(() => toISODate(new Date()));
  const [showAllQuick, setShowAllQuick] = useState(false);
  const [showAllLong, setShowAllLong] = useState(false);

  const year = cursor.getFullYear();
  const monthIndex0 = cursor.getMonth();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [quickTasks, setQuickTasks] = useState<DueTask[]>([]);
  const [longTasks, setLongTasks] = useState<DueTask[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * Reads the JWT stored by AuthContext on login.
   * Falls back to empty string — the backend will return 401 and the
   * catch block will log it without crashing the UI.
   */
  const getToken = useCallback(() => localStorage.getItem("token") ?? "", []);

  const refreshData = useCallback(async () => {
    if (!user) return;
    const token = getToken();
    const userId = user.user_id;

    setLoading(true);
    try {
      const [monthEvents, quick, long] = await Promise.all([
        getMonthTaskEvents(userId, token, year, monthIndex0),
        showAllQuick
          ? getAllQuickReminderTasks(userId, token)
          : getQuickReminderTasks(userId, token, 3),
        showAllLong
          ? getAllLongTermTasks(userId, token)
          : getLongTermTasks(userId, token, 7, 3),
      ]);
      setEvents(monthEvents);
      setQuickTasks(quick);
      setLongTasks(long);
    } catch (err) {
      console.error("Planner fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [user, getToken, year, monthIndex0, showAllQuick, showAllLong]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    }
    return map;
  }, [events]);

  const gridDays = useMemo(() => {
    const start = startOfCalendarGrid(year, monthIndex0);
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  }, [year, monthIndex0]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const prevMonth = () => setCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const goToday = () => {
    const t = new Date();
    t.setDate(1);
    setCursor(t);
    setSelectedDate(toISODate(new Date()));
  };

  return (
    <div className="sk-shell planner-shell">
      <Sidebar active="calendar" tipBody="Set due dates so Planner can keep you on track." />

      <div className="sk-main">
        <header className="sk-topbar">
          <div className="sk-topLeft">
            <div className="sk-topTitle">task-kun<span className="sk-brandTld">.ai</span></div>
          </div>

          <div className="sk-searchWrap">
            <input className="sk-search" placeholder="Search tasks, tags, classes..." />
          </div>

          <div className="sk-topRight">
            <button className="sk-iconBtn" title="Toggle theme" onClick={toggleTheme}>
              {theme === "light"
                ? <img className="svg sidebarsvg svgalwayson" src={Moon} alt="" />
                : <img className="svg sidebarsvg svgalwayson" src={Sun} alt="" />}
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

        <main className="sk-content planner-content">
          <div className="planner-grid">
            {/* Calendar */}
            <section className="planner-left">
              <div className="planner-header">
                <div className="planner-titleBlock">
                  <h1 className="planner-title">{MONTHS[monthIndex0]} {year}</h1>
                </div>

                <div className="planner-controls">
                  <button className="planner-iconBtn" onClick={prevMonth} aria-label="Previous month">‹</button>
                  <button className="planner-btn" onClick={goToday}>Today</button>
                  <button className="planner-iconBtn" onClick={nextMonth} aria-label="Next month">›</button>
                </div>
              </div>

              <div className="planner-calendar sk-card">
                <div className="planner-weekdays">
                  {["SUN","MON","TUE","WED","THU","FRI","SAT"].map((d) => (
                    <div key={d} className="planner-weekday">{d}</div>
                  ))}
                </div>

                <div className="planner-cells">
                  {gridDays.map((d) => {
                    const iso = toISODate(d);
                    const inMonth = d.getMonth() === monthIndex0;
                    const selected = iso === selectedDate;
                    const dayEvents = eventsByDate.get(iso) ?? [];

                    return (
                      <button
                        key={iso}
                        className={`planner-cell ${inMonth ? "" : "muted"} ${selected ? "selected" : ""}`}
                        onClick={() => setSelectedDate(iso)}
                        type="button"
                      >
                        <div className="planner-cellTop">
                          <span className="planner-dayNum">{d.getDate()}</span>
                        </div>

                        <div className="planner-events">
                          {dayEvents.slice(0, 2).map((e) => (
                            <span key={e.id} className={`planner-chip ${e.color ?? "gray"}`}>{e.title}</span>
                          ))}
                          {dayEvents.length > 2 && (
                            <span className="planner-more">+{dayEvents.length - 2} more</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Right rail */}
            <aside className="planner-right">
              {/* Long-term Trackers */}
              <section className="sk-card planner-panel">
                <div className="planner-panelHead">
                  <div className="planner-panelTitle">
                    <span className="planner-dotIcon">
                      <img className="svg sidebarsvg svgalwayson" src={Pencil} alt="" />
                    </span> Long-term Trackers
                  </div>
                  <button
                    className="planner-linkBtn"
                    type="button"
                    onClick={() => setShowAllLong((v) => !v)}
                  >
                    {showAllLong ? "Show Less" : "View All"}
                  </button>
                </div>

                {loading ? (
                  <div className="planner-emptyRight">Loading…</div>
                ) : longTasks.length === 0 ? (
                  <div className="planner-emptyRight">No tasks due more than a week away.</div>
                ) : (
                  longTasks.map((t) => (
                    <div key={t.task_id} className="planner-trackerCard">
                      <div className="tracker-topRow">
                        <div className="tracker-title">{t.task_title}</div>
                        <div className="tracker-pill">{t.priority?.toUpperCase?.() ?? "TASK"}</div>
                      </div>

                      <div className="tracker-metaRow">
                        <span>
                          <img className="svg sidebarsvg svgalwayson" src={Calendar} alt="" />
                        </span>
                        <span>{formatDueLabel(t.deadline, t.time)}</span>
                      </div>

                      <div className="tracker-bar">
                        <div className="tracker-barFill" style={{ width: t.completed ? "100%" : "45%" }} />
                      </div>
                    </div>
                  ))
                )}
              </section>

              {/* Quick Reminders */}
              <section className="sk-card planner-panel">
                <div className="planner-panelHead">
                  <div className="planner-panelTitle">
                    <span className="planner-dotIcon">
                      <img className="svg sidebarsvg svgalwayson" src={Stopwatch} alt="" />
                    </span> Quick Reminders
                  </div>
                  <button
                    className="planner-linkBtn"
                    type="button"
                    onClick={() => setShowAllQuick((v) => !v)}
                  >
                    {showAllQuick ? "Show Less" : "View All"}
                  </button>
                </div>

                {loading ? (
                  <div className="planner-emptyRight">Loading…</div>
                ) : quickTasks.length === 0 ? (
                  <div className="planner-emptyRight">No tasks due in the next 7 days.</div>
                ) : (
                  quickTasks.map((t) => (
                    <div key={t.task_id} className="planner-reminderCard">
                      <div className="rem-iconWrap">
                        <img className="svg sidebarsvg svgalwayson" src={Clock} alt="" />
                      </div>
                      <div>
                        <div className="rem-title">{t.task_title}</div>
                        <div className="rem-sub">{formatDueLabel(t.deadline, t.time)}</div>
                      </div>
                    </div>
                  ))
                )}
              </section>

              <section className="sk-card planner-ai">
                <div className="planner-aiTitle">
                  <img className="svg sidebarsvg svgalwayson" src={Sparkle} alt="" />
                  ‎‎   AI Strategy
                </div>
                <div className="planner-aiText">Want help blocking time for your next due task?</div>
                <button className="planner-aiBtn" type="button">Optimize Schedule</button>
              </section>
            </aside>
          </div>

          <footer className="sk-footer">© 2026 task-kun.ai · Built for students</footer>
        </main>
      </div>
    </div>
  );
}