import { useNavigate } from "react-router-dom";
import Calendar from '../assets/taki-calendar.svg';
import Home from '../assets/taki-home.svg';
import Taskbox from '../assets/taki-taskbox.svg';
import Logo from '../assets/taki-logo.svg';
import Cog from '../assets/taki-cog.svg';

export type SidebarPage = "home" | "calendar" | "tasks" | "ai" | "settings";

interface SidebarProps {
  active: SidebarPage;
  tipBody?: string;
}

export function Sidebar({ active, tipBody }: SidebarProps) {
  const navigate = useNavigate();

  return (
    <aside className="sk-sidebar">
      <div className="sk-brand" role="button" onClick={() => navigate("/dashboard")}>
        <div className="sk-logoDot" />
        <div className="sk-brandText">task-kun<span className="sk-brandTld">.ai</span></div>
      </div>

      <nav className="sk-nav">
        <button
          className={`sk-navItem ${active === "home" ? "sk-active" : ""}`}
          onClick={() => navigate("/dashboard")}
        >
          <img className="svg sidebarsvg" src={Home} alt="" />
          <span>Home</span>
        </button>

        <button
          className={`sk-navItem ${active === "calendar" ? "sk-active" : ""}`}
          onClick={() => navigate("/planner")}
        >
          <img className="svg sidebarsvg" src={Calendar} alt="" />
          <span>Calendar</span>
        </button>

        <button
          className={`sk-navItem ${active === "tasks" ? "sk-active" : ""}`}
          onClick={() => navigate("/tasks")}
        >
          <img className="svg sidebarsvg" src={Taskbox} alt="" />
          <span>My Tasks</span>
        </button>

        <button
          className={`sk-navItem ${active === "ai" ? "sk-active" : ""}`}
          onClick={() => navigate("/ai")}
        >
          <img className="svg sidebarsvg" src={Logo} alt="" />
          <span>AI Assistant</span>
        </button>

        <button
          className={`sk-navItem ${active === "settings" ? "sk-active" : ""}`}
          onClick={() => navigate("/settings")}
        >
          <img className="svg sidebarsvg" src={Cog} alt="" />
          <span>Settings</span>
        </button>
      </nav>

      {tipBody && (
        <div className="sk-tip">
          <div className="sk-tipTitle">Pro Tip</div>
          <div className="sk-tipBody">{tipBody}</div>
        </div>
      )}
    </aside>
  );
}
