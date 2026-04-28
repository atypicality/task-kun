export type CalendarEvent = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  kind?: "task" | "event";
  color?: "red" | "gray" | "blue" | "purple";
};

export type Task = {
  task_id: string;
  user_id: string;
  task_title: string;
  notes: string | null;
  completed: boolean;
  priority: "low" | "medium" | "high";
  deadline?: string | null; // YYYY-MM-DD  (field name from tasks.py)
  time?: string | null;     // HH:MM       (field name from tasks.py)
};

export type DueTask = Task & { deadline: string; time: string };

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://task-kun-s9rt.onrender.com";

// ─── Date helpers ─────────────────────────────────────────────────────────────

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function safeISODate(input?: string | null): string | null {
  if (!input) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const d = new Date(input);
  if (isNaN(d.getTime())) return null;
  return toISODate(d);
}

function dueTimeHHMM(input?: string | null): string {
  // Supabase returns time as "HH:MM:SS" — trim to "HH:MM"
  return input && input.trim() ? input.slice(0, 5) : "23:59";
}

function dueDateTimeISO(t: { deadline: string; time: string }) {
  return `${t.deadline}T${t.time}:00`;
}

function taskColor(priority: Task["priority"]): CalendarEvent["color"] {
  if (priority === "high") return "red";
  if (priority === "medium") return "blue";
  return "gray";
}

function isDueTask(x: DueTask | null): x is DueTask {
  return x !== null;
}

// ─── API fetch ────────────────────────────────────────────────────────────────

/**
 * Fetch all tasks for the authenticated user from the backend.
 * Passes the JWT as a Bearer header so tasks.py enforces RLS — the
 * user_id in the URL is verified against the token server-side and
 * any attempt to query another user's tasks returns an empty array.
 */
async function fetchTasks(userId: string, token: string): Promise<Task[]> {
  const res = await fetch(`${BACKEND_URL}/tasks/by-user/${userId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail?.error ?? `Failed to fetch tasks (${res.status})`);
  }

  const data = await res.json();
  return (data.tasks ?? []) as Task[];
}

// ─── Shared normalisation ─────────────────────────────────────────────────────

/**
 * Filters out completed tasks and tasks without a valid deadline,
 * normalises the deadline/time fields, and sorts ascending by due datetime.
 */
function normaliseDueTasks(tasks: Task[]): DueTask[] {
  return tasks
    .map((t): DueTask | null => {
      const iso = safeISODate(t.deadline);
      if (!iso) return null;
      return { ...t, deadline: iso, time: dueTimeHHMM(t.time) };
    })
    .filter(isDueTask)
    .filter((t) => !t.completed)
    .sort((a, b) => dueDateTimeISO(a).localeCompare(dueDateTimeISO(b)));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Calendar grid — returns one CalendarEvent per task whose deadline falls
 * inside the calendar grid for the requested month. The calendar grid
 * displays 42 days (6 weeks) starting from the beginning of the week that
 * contains the 1st of the month, so we include trailing/leading days from
 * adjacent months (e.g. early-May tasks when viewing April).
 */
export async function getMonthTaskEvents(
  userId: string,
  token: string,
  year: number,
  monthIndex0: number
): Promise<CalendarEvent[]> {
  const tasks = await fetchTasks(userId, token);

  // Compute calendar grid start (the Sunday before or equal to the 1st)
  const first = new Date(year, monthIndex0, 1);
  const dayOfWeek = first.getDay();
  const gridStart = new Date(year, monthIndex0, 1 - dayOfWeek);
  gridStart.setHours(0, 0, 0, 0);

  // Grid spans 42 days (6 weeks)
  const gridEnd = new Date(gridStart);
  gridEnd.setDate(gridStart.getDate() + 41);

  const startIso = toISODate(gridStart);
  const endIso = toISODate(gridEnd);

  return normaliseDueTasks(tasks)
    .map((t) => ({
      id: t.task_id,
      title: t.task_title,
      date: t.deadline,
      kind: "task" as const,
      color: taskColor(t.priority),
    }))
    .filter((e) => {
      return e.date >= startIso && e.date <= endIso;
    });
}

/**
 * Quick Reminders — tasks due today through the next 7 days (inclusive).
 * Displayed in the "Quick Reminders" right-rail panel.
 * Pass limit = 0 to get all results (used by "View All").
 */
export async function getQuickReminderTasks(
  userId: string,
  token: string,
  limit = 3
): Promise<DueTask[]> {
  const tasks = await fetchTasks(userId, token);
  const today = toISODate(new Date());
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + 7);
  const cutoffIso = toISODate(cutoff);

  const results = normaliseDueTasks(tasks).filter(
    (t) => t.deadline >= today && t.deadline <= cutoffIso
  );
  return limit > 0 ? results.slice(0, limit) : results;
}

export async function getAllQuickReminderTasks(
  userId: string,
  token: string
): Promise<DueTask[]> {
  return getQuickReminderTasks(userId, token, 0);
}

/**
 * Long-term Trackers — tasks whose deadline is more than `daysAway` days
 * from today. Displayed in the "Long-term Trackers" right-rail panel.
 * Pass limit = 0 to get all results (used by "View All").
 */
export async function getLongTermTasks(
  userId: string,
  token: string,
  daysAway = 7,
  limit = 3
): Promise<DueTask[]> {
  const tasks = await fetchTasks(userId, token);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + daysAway);
  const cutoffIso = toISODate(cutoff);

  const results = normaliseDueTasks(tasks).filter((t) => t.deadline > cutoffIso);
  return limit > 0 ? results.slice(0, limit) : results;
}

export async function getAllLongTermTasks(
  userId: string,
  token: string,
  daysAway = 7
): Promise<DueTask[]> {
  return getLongTermTasks(userId, token, daysAway, 0);
}