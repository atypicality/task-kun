import { useMemo } from "react";
import "./TaskCharts.css";

type Priority = "low" | "medium" | "high";

interface Task {
  id: string;
  completed: boolean;
  priority: Priority;
  dueDate: string;
  dueTime?: string;
}

interface Props {
  tasks: Task[];
}

/* ── Donut chart ─────────────────────────────────────── */
function DonutChart({ done, total }: { done: number; total: number }) {
  const R = 52;
  const cx = 70;
  const cy = 70;
  const circumference = 2 * Math.PI * R;
  const pct = total === 0 ? 0 : done / total;
  const dashOffset = circumference * (1 - pct);

  return (
    <svg viewBox="0 0 140 140" className="chart-donut-svg" aria-hidden="true">
      {/* track */}
      <circle
        cx={cx} cy={cy} r={R}
        fill="none"
        stroke="var(--border)"
        strokeWidth="14"
      />
      {/* fill — starts at 12 o'clock with rotate(-90) */}
      <circle
        cx={cx} cy={cy} r={R}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        transform={`rotate(-90 ${cx} ${cy})`}
        className="chart-donut-fill"
      />
      {/* center label */}
      <text x={cx} y={cy - 7} textAnchor="middle" className="chart-donut-pct">
        {total === 0 ? "—" : `${Math.round(pct * 100)}%`}
      </text>
      <text x={cx} y={cy + 13} textAnchor="middle" className="chart-donut-sub">
        DONE
      </text>
    </svg>
  );
}

/* ── Priority bar chart ──────────────────────────────── */
function PriorityBars({ tasks }: { tasks: Task[] }) {
  const counts = useMemo(() => {
    const active = tasks.filter((t) => !t.completed);
    return {
      high:   active.filter((t) => t.priority === "high").length,
      medium: active.filter((t) => t.priority === "medium").length,
      low:    active.filter((t) => t.priority === "low").length,
    };
  }, [tasks]);

  const max = Math.max(counts.high, counts.medium, counts.low, 1);

  const CHART_W = 180;
  const CHART_H = 90;
  const BAR_W = 34;
  const GAP = 20;
  const GROUP_W = BAR_W * 3 + GAP * 2;
  const startX = (CHART_W - GROUP_W) / 2;

  const bars: { key: keyof typeof counts; color: string; label: string }[] = [
    { key: "high",   color: "#ef4444", label: "HIGH" },
    { key: "medium", color: "#f59e0b", label: "MED" },
    { key: "low",    color: "#10b981", label: "LOW" },
  ];

  return (
    <svg viewBox={`0 0 ${CHART_W} ${CHART_H + 24}`} className="chart-bars-svg" aria-hidden="true">
      {bars.map((b, i) => {
        const barH = Math.max(4, (counts[b.key] / max) * CHART_H);
        const x = startX + i * (BAR_W + GAP);
        const y = CHART_H - barH;
        return (
          <g key={b.key}>
            {/* bg track */}
            <rect x={x} y={0} width={BAR_W} height={CHART_H} rx={8} fill="var(--border)" opacity="0.4" />
            {/* fill */}
            <rect
              x={x} y={y} width={BAR_W} height={barH}
              rx={8} fill={b.color} opacity="0.85"
              className="chart-bar-fill"
            />
            {/* count label */}
            <text x={x + BAR_W / 2} y={y - 5} textAnchor="middle" className="chart-bar-val">
              {counts[b.key]}
            </text>
            {/* priority label */}
            <text x={x + BAR_W / 2} y={CHART_H + 16} textAnchor="middle" className="chart-bar-label" fill={b.color}>
              {b.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Weekly sparkline ────────────────────────────────── */
function WeeklySparkline({ tasks }: { tasks: Task[] }) {
  const points = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const count = tasks.filter((t) => t.dueDate === iso).length;
      return { iso, count, label: ["Su","Mo","Tu","We","Th","Fr","Sa"][d.getDay()] };
    });
  }, [tasks]);

  const W = 260;
  const H = 60;
  const maxV = Math.max(...points.map((p) => p.count), 1);
  const colW = W / 7;

  const coords = points.map((p, i) => {
    const x = i * colW + colW / 2;
    const y = H - (p.count / maxV) * H * 0.85;
    return { x, y, ...p };
  });

  const pathD = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`)
    .join(" ");

  const areaD =
    `M ${coords[0].x} ${H} ` +
    coords.map((c) => `L ${c.x} ${c.y}`).join(" ") +
    ` L ${coords[coords.length - 1].x} ${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H + 18}`} className="chart-spark-svg" aria-hidden="true">
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#sparkGrad)" />
      <path d={pathD} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {coords.map((c) => (
        <circle key={c.iso} cx={c.x} cy={c.y} r={3} fill="var(--accent)" />
      ))}
      {coords.map((c) => (
        <text key={c.iso + "l"} x={c.x} y={H + 14} textAnchor="middle" className="chart-spark-label">
          {c.label}
        </text>
      ))}
    </svg>
  );
}

/* ── Main export ─────────────────────────────────────── */
export function TaskCharts({ tasks }: Props) {
  const done  = tasks.filter((t) => t.completed).length;
  const total = tasks.length;
  const active = total - done;

  return (
    <div className="task-charts">
      {/* Donut */}
      <div className="chart-card">
        <div className="chart-card-title">Completion</div>
        <DonutChart done={done} total={total} />
        <div className="chart-card-meta">
          <span><span className="chart-dot teal" />{done} done</span>
          <span><span className="chart-dot gray" />{active} active</span>
        </div>
      </div>

      {/* Bars */}
      <div className="chart-card">
        <div className="chart-card-title">By Priority</div>
        <PriorityBars tasks={tasks} />
        <div className="chart-card-meta center">Active tasks</div>
      </div>

      {/* Sparkline */}
      <div className="chart-card chart-card-wide">
        <div className="chart-card-title">This Week · Due Dates</div>
        <WeeklySparkline tasks={tasks} />
        <div className="chart-card-meta center">Tasks due per day</div>
      </div>
    </div>
  );
}
