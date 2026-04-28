import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Sidebar } from "../components/Sidebar";
import Speaker from '../assets/taki-speaker.svg';
import Sun from '../assets/taki-sun.svg';
import Moon from '../assets/taki-moon.svg';
import Cog from '../assets/taki-cog.svg';
import Bell from '../assets/taki-bell.svg';
import Person from '../assets/taki-person.svg';
import Pencil from '../assets/taki-pencil.svg';
import Computer from '../assets/taki-computer.svg';
import "./Settings.css";

type TaskSort = "deadline" | "priority" | "ai";
type ThemeChoice = "light" | "dark" | "system";
type MascotColor = "taskkun" | "energetic" | "study" | "zen" | "deep";

type SettingsState = {
  voice: string;
  speed: number;
  volume: number;
  autoVoiceFeedback: boolean;
  taskSort: TaskSort;
  themeChoice: ThemeChoice;
  mascotColor: MascotColor;
};

const DEFAULTS: SettingsState = {
  voice: "Default",
  speed: 1.0,
  volume: 80,
  autoVoiceFeedback: true,
  taskSort: "deadline",
  themeChoice: "light",
  mascotColor: "taskkun",
};

// Map DB snake_case values to local types
const dbSortToLocal: Record<string, TaskSort> = {
  Deadline: "deadline",
  Priority: "priority",
  "AI Balance": "ai",
};
const localSortToDB: Record<TaskSort, string> = {
  deadline: "Deadline",
  priority: "Priority",
  ai: "AI Balance",
};
const dbThemeToLocal: Record<string, ThemeChoice> = {
  "Light Mode": "light",
  "Dark Mode": "dark",
  System: "system",
};
const localThemeToDB: Record<ThemeChoice, string> = {
  light: "Light Mode",
  dark: "Dark Mode",
  system: "System",
};
const dbMascotToLocal: Record<string, MascotColor> = {
  "task-kun": "taskkun",
  energetic: "energetic",
  study: "study",
  zen: "zen",
  deep: "deep",
};
const localMascotToDB: Record<MascotColor, string> = {
  taskkun: "task-kun",
  energetic: "energetic",
  study: "study",
  zen: "zen",
  deep: "deep",
};

export function Settings() {
  const navigate = useNavigate();
  const { user, settings: remoteSettings, logout, saveProfile, saveSettings } = useAuth();
  const { theme, setTheme, setAccent } = useTheme();

  // Profile fields — email is read-only
  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [university, setUniversity] = useState(user?.university ?? "");
  const [major, setMajor] = useState(user?.major ?? "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Settings fields
  const [voice, setVoice] = useState(DEFAULTS.voice);
  const [speed, setSpeed] = useState(DEFAULTS.speed);
  const [volume, setVolume] = useState(DEFAULTS.volume);
  const [autoVoiceFeedback, setAutoVoiceFeedback] = useState(DEFAULTS.autoVoiceFeedback);
  const [taskSort, setTaskSort] = useState<TaskSort>(DEFAULTS.taskSort);
  const [themeChoice, setThemeChoice] = useState<ThemeChoice>(DEFAULTS.themeChoice);
  const [mascotColor, setMascotColor] = useState<MascotColor>(DEFAULTS.mascotColor);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Seed from backend settings on mount / when remoteSettings changes
  useEffect(() => {
    if (!remoteSettings) return;
    setVoice(remoteSettings.assistant_voice ?? DEFAULTS.voice);
    setSpeed(remoteSettings.assistant_speaking_speed ?? DEFAULTS.speed);
    setVolume(remoteSettings.assistant_volume ?? DEFAULTS.volume);
    setAutoVoiceFeedback(remoteSettings.auto_voice_feedback ?? DEFAULTS.autoVoiceFeedback);
    setTaskSort(dbSortToLocal[remoteSettings.default_task_sorting] ?? DEFAULTS.taskSort);
    const mappedTheme = dbThemeToLocal[remoteSettings.interface_theme] ?? DEFAULTS.themeChoice;
    setThemeChoice(mappedTheme);
    applyThemeChoice(mappedTheme);
    const mappedMascot = dbMascotToLocal[remoteSettings.mascot_soul_color] ?? DEFAULTS.mascotColor;
    setMascotColor(mappedMascot);
    setAccent(mascotToAccent[mappedMascot]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteSettings]);

  // Seed profile fields when user context loads/changes
  useEffect(() => {
    setDisplayName(user?.display_name ?? "");
    setUniversity(user?.university ?? "");
    setMajor(user?.major ?? "");
  }, [user]);

  const hasProfileChanges = useMemo(() => {
    return (
      displayName.trim() !== (user?.display_name ?? "") ||
      university.trim() !== (user?.university ?? "") ||
      major.trim() !== (user?.major ?? "")
    );
  }, [displayName, university, major, user]);

  const discardProfile = () => {
    setDisplayName(user?.display_name ?? "");
    setUniversity(user?.university ?? "");
    setMajor(user?.major ?? "");
    setProfileError(null);
  };

  const updateProfile = async () => {
    if (!displayName.trim()) {
      setProfileError("Display name is required.");
      return;
    }
    setProfileError(null);
    setProfileSaving(true);
    try {
      await saveProfile({
        display_name: displayName.trim(),
        university: university.trim() || undefined,
        major: major.trim() || undefined,
      });
    } catch (e: any) {
      setProfileError(e.message || "Failed to update profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  const playVoiceSample = () => {
    alert(`(Demo) Playing voice sample for: ${voice}`);
  };

  const applyThemeChoice = (choice: ThemeChoice) => {
    setThemeChoice(choice);
    if (choice === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(prefersDark ? "dark" : "light");
      return;
    }
    setTheme(choice);
  };

  const mascotToAccent: Record<string, string> = {
    taskkun: "#39c5bb",
    energetic: "#22c55e",
    study: "#facc15",
    zen: "#4f46e5",
    deep: "#7a2198",
  };

  const chooseMascotColor = (c: string) => {
    setMascotColor(c as MascotColor);
    setAccent(mascotToAccent[c]);
  };

  const restoreDefaults = () => {
    const ok = confirm("Restore default settings?");
    if (!ok) return;

    setVoice(DEFAULTS.voice);
    setSpeed(DEFAULTS.speed);
    setVolume(DEFAULTS.volume);
    setAutoVoiceFeedback(DEFAULTS.autoVoiceFeedback);
    setTaskSort(DEFAULTS.taskSort);
    setMascotColor(DEFAULTS.mascotColor);
    applyThemeChoice(DEFAULTS.themeChoice);
    setAccent(mascotToAccent[DEFAULTS.mascotColor]);
  };

  const saveAll = async () => {
    setSettingsError(null);
    setSettingsSaving(true);
    try {
      await saveSettings({
        assistant_voice: voice,
        assistant_speaking_speed: speed,
        assistant_volume: volume,
        auto_voice_feedback: autoVoiceFeedback,
        default_task_sorting: localSortToDB[taskSort],
        interface_theme: localThemeToDB[themeChoice],
        mascot_soul_color: localMascotToDB[mascotColor],
      });
    } catch (e: any) {
      setSettingsError(e.message || "Failed to save settings.");
    } finally {
      setSettingsSaving(false);
    }
  };

  const deleteAccountAndData = () => {
    const ok = confirm("This will clear local data and sign you out. Continue?");
    if (!ok) return;
    localStorage.clear();
    logout();
    navigate("/");
  };

  return (
    <div className="sk-shell">
      <Sidebar active="settings" tipBody="Ask Task-kun to break down your large tasks!" />

      <div className="sk-main">
        <header className="sk-topbar">
          <div className="sk-topLeft">
            <div className="sk-topTitle">task-kun<span className="sk-brandTld">.ai</span></div>
          </div>

          <div className="sk-searchWrap">
            <input className="sk-search" placeholder="Search tasks, tags, classes..." />
          </div>

          <div className="sk-topRight">
            <button className="sk-iconBtn" title="Notifications">
              <img className="svg sidebarsvg svgalwayson" src={Bell} alt="" />
            </button>
            <button className="sk-iconBtn" title="Profile" onClick={() => navigate("/profile")}>
              <img className="svg sidebarsvg svgalwayson" src={Person} alt="" />
            </button>
          </div>
        </header>

        <main className="sk-content">
          <div className="sk-pageHeader">
            <h1>Settings</h1>
            <p>Configure your study companion and app behavior to match your workflow.</p>
          </div>

          {/* Profile Settings */}
          <section className="sk-card">
            <div className="sk-cardHead">
              <div className="sk-cardIcon">
                <img className="svg sidebarsvg svgalwayson" src={Person} alt="" />
              </div>
              <div>
                <div className="sk-cardTitle">Profile Settings</div>
                <div className="sk-cardSub">
                  Manage your student account and personal identity.
                </div>
              </div>
            </div>

            <div className="sk-cardBody sk-profileGrid">
              <div className="sk-profileLeft">
                <div className="sk-profileAvatar">
                  <div className="sk-profileAvatarInner">
                    {user?.display_name?.[0]?.toUpperCase() ?? "U"}
                  </div>
                  <span className="sk-onlineDot" />
                </div>
              </div>

              <div className="sk-profileForm">
                {profileError && <p className="sk-errorMsg">{profileError}</p>}

                <div className="sk-twoCol">
                  <label className="sk-field">
                    <span>Display Name</span>
                    <input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </label>

                  {/* Email is read-only — not changeable through the profile API */}
                  <label className="sk-field">
                    <span>Email Address</span>
                    <input value={user?.email ?? ""} disabled title="Email cannot be changed here" />
                  </label>

                  <label className="sk-field">
                    <span>University</span>
                    <input
                      value={university}
                      onChange={(e) => setUniversity(e.target.value)}
                      placeholder="e.g. MIT"
                    />
                  </label>

                  <label className="sk-field">
                    <span>Major / Concentration</span>
                    <input
                      value={major}
                      onChange={(e) => setMajor(e.target.value)}
                      placeholder="e.g. Computer Science"
                    />
                  </label>
                </div>

                <div className="sk-actionsRight">
                  <button
                    className="sk-btn sk-btnGhost"
                    onClick={discardProfile}
                    disabled={!hasProfileChanges || profileSaving}
                  >
                    Discard Changes
                  </button>
                  <button
                    className="sk-btn sk-btnPrimary"
                    onClick={updateProfile}
                    disabled={!hasProfileChanges || profileSaving}
                  >
                    {profileSaving ? "Saving…" : "Update Profile"}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Voice & AI Feedback */}
          <section className="sk-card">
            <div className="sk-cardHead">
              <div className="sk-cardIcon">
                <img className="svg sidebarsvg svgalwayson" src={Speaker} alt="" />
              </div>
              <div>
                <div className="sk-cardTitle">Voice & AI Feedback</div>
                <div className="sk-cardSub">
                  Personalize how Task-kun sounds and interacts with you verbally.
                </div>
              </div>
            </div>

            <div className="sk-cardBody">
              <div className="sk-voiceRow">
                <label className="sk-field sk-grow">
                  <span>Assistant Voice</span>
                  <select value={voice} onChange={(e) => setVoice(e.target.value)}>
                    <option>Default</option>
                    <option>Soft</option>
                    <option>Energetic</option>
                    <option>Calm</option>
                  </select>
                </label>

                <button className="sk-btn sk-btnPrimary" onClick={playVoiceSample}>
                  ▶ Play Voice Sample
                </button>
              </div>

              <div className="sk-sliderBlock">
                <div className="sk-sliderTop">
                  <div className="sk-sliderLabel">Speaking Speed</div>
                  <div className="sk-sliderValue">{speed.toFixed(1)}x</div>
                </div>
                <input
                  type="range"
                  min={0.6}
                  max={1.6}
                  step={0.1}
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="sk-slider"
                />
              </div>

              <div className="sk-sliderBlock">
                <div className="sk-sliderTop">
                  <div className="sk-sliderLabel">Assistant Volume</div>
                  <div className="sk-sliderValue">{volume}%</div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="sk-slider"
                />
              </div>

              <div className="sk-toggleCard">
                <div>
                  <div className="sk-toggleTitle">Automatic Voice Feedback</div>
                  <div className="sk-toggleSub">
                    Task-kun will talk to you when deadlines are near.
                  </div>
                </div>
                <button
                  className={`sk-switch ${autoVoiceFeedback ? "on" : ""}`}
                  onClick={() => setAutoVoiceFeedback((v) => !v)}
                >
                  <span className="sk-switchKnob" />
                </button>
              </div>
            </div>
          </section>

          {/* App Preferences */}
          <section className="sk-card">
            <div className="sk-cardHead">
              <div className="sk-cardIcon">
                <img className="svg sidebarsvg svgalwayson" src={Cog} alt="" />
              </div>
              <div>
                <div className="sk-cardTitle">App Preferences</div>
                <div className="sk-cardSub">
                  General application behavior and interface defaults.
                </div>
              </div>
            </div>

            <div className="sk-cardBody">
              <div className="sk-prefRow">
                <div>
                  <div className="sk-prefTitle">Default Task Sorting</div>
                  <div className="sk-prefSub">
                    The primary method Task-kun uses to organize your dashboard.
                  </div>
                </div>

                <div className="sk-seg">
                  <button
                    className={`sk-segBtn ${taskSort === "deadline" ? "active" : ""}`}
                    onClick={() => setTaskSort("deadline")}
                  >
                    Deadline
                  </button>
                  <button
                    className={`sk-segBtn ${taskSort === "priority" ? "active" : ""}`}
                    onClick={() => setTaskSort("priority")}
                  >
                    Priority
                  </button>
                  <button
                    className={`sk-segBtn ${taskSort === "ai" ? "active" : ""}`}
                    onClick={() => setTaskSort("ai")}
                  >
                    AI Balance
                  </button>
                </div>
              </div>

              <div className="sk-themeTiles">
                <div className="sk-prefTitle">Interface Theme</div>
                <div className="sk-tiles">
                  <button
                    className={`sk-tile ${themeChoice === "light" ? "active" : ""}`}
                    onClick={() => applyThemeChoice("light")}
                  >
                    <img className="svg sidebarsvg svgalwayson" src={Sun} alt="" />
                    <span>LIGHT MODE</span>
                  </button>
                  <button
                    className={`sk-tile ${themeChoice === "dark" ? "active" : ""}`}
                    onClick={() => applyThemeChoice("dark")}
                  >
                    <img className="svg sidebarsvg svgalwayson" src={Moon} alt="" />
                    <span>DARK MODE</span>
                  </button>
                  <button
                    className={`sk-tile ${themeChoice === "system" ? "active" : ""}`}
                    onClick={() => applyThemeChoice("system")}
                  >
                    <img className="svg sidebarsvg svgalwayson" src={Computer} alt="" />
                    <span>SYSTEM</span>
                  </button>
                </div>

                <div className="sk-smallNote">
                  Current app theme: <b>{theme}</b>
                </div>
              </div>
            </div>
          </section>

          {/* Mascot & Styling */}
          <section className="sk-card">
            <div className="sk-cardHead">
              <div className="sk-cardIcon">
                <img className="svg sidebarsvg svgalwayson" src={Pencil} alt="" />
              </div>
              <div>
                <div className="sk-cardTitle">Mascot & Styling</div>
                <div className="sk-cardSub">
                  Pick Task-kun's soul color to match your current study mood.
                </div>
              </div>
            </div>

            <div className="sk-cardBody sk-mascotGrid">
              <div className="sk-preview">
                <div className="sk-previewTag">Preview</div>
                <div className="sk-mascotFace">
                  <div className="sk-eyes">
                    <span />
                    <span />
                  </div>
                </div>
                <div className="sk-previewQuote">"I look great in this color!"</div>
              </div>

              <div className="sk-mascotControls">
                <div className="sk-prefTitle">Mascot Soul Color</div>

                <div className="sk-colorRow">
                  <ColorDot label="TASK-KUN" active={mascotColor === "taskkun"} onClick={() => chooseMascotColor("taskkun")} />
                  <ColorDot label="ENERGETIC" tone="green" active={mascotColor === "energetic"} onClick={() => chooseMascotColor("energetic")} />
                  <ColorDot label="STUDY" tone="yellow" active={mascotColor === "study"} onClick={() => chooseMascotColor("study")} />
                  <ColorDot label="ZEN" tone="indigo" active={mascotColor === "zen"} onClick={() => chooseMascotColor("zen")} />
                  <ColorDot label="DEEP" tone="purple" active={mascotColor === "deep"} onClick={() => chooseMascotColor("deep")} />
                </div>

                <div className="sk-smallNote">
                  Saved when you click "Save All Changes".
                </div>
              </div>
            </div>
          </section>

          {/* Bottom actions */}
          <section className="sk-bottomBar">
            <button className="sk-linkDanger" onClick={deleteAccountAndData}>
              Delete Account & Data
            </button>

            <div className="sk-bottomActions">
              {settingsError && <p className="sk-errorMsg">{settingsError}</p>}
              <button className="sk-btn sk-btnGhost" onClick={restoreDefaults} disabled={settingsSaving}>
                Restore Defaults
              </button>
              <button className="sk-btn sk-btnPrimary" onClick={saveAll} disabled={settingsSaving}>
                {settingsSaving ? "Saving…" : "Save All Changes"}
              </button>
            </div>
          </section>

          <footer className="sk-footer">© 2026 task-kun.ai · Built for students</footer>
        </main>
      </div>
    </div>
  );
}

function ColorDot({
  label,
  active,
  onClick,
  tone = "blue",
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  tone?: "purple" | "green" | "yellow" | "blue" | "indigo";
}) {
  return (
    <button className="sk-colorDot" onClick={onClick} aria-label={label} type="button">
      <span className={`sk-dot ${tone} ${active ? "active" : ""}`} />
      <span className="sk-dotLabel">{label}</span>
    </button>
  );
}