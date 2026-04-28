import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { generateVoice } from "../services/aiService";
import { Sidebar } from "../components/Sidebar";
import type { Task } from "../services/plannerService";
import "./AIPage.css";
 
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
 
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}
 
const SYSTEM_CONTEXT = `You are Task-kun, an AI assistant with the personality of Hatsune Miku — cheerful, encouraging, and a little playful, but always helpful and professional when it comes to task management and productivity. You help students organize their work, break down tasks, manage deadlines, and stay motivated. Keep responses concise and friendly. Use occasional light kaomoji like (ﾉ◕ヮ◕)ﾉ or ^_^ to add personality, but don't overdo it.`;
 
async function callGemini(userMessage: string, taskContext: string): Promise<string> {
  const fullPrompt = `${SYSTEM_CONTEXT}\n\nCurrent task context: ${taskContext}\n\nUser: ${userMessage}`;
  const response = await fetch(`${BACKEND_URL}/generate-gemini`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: fullPrompt }),
  });
  if (!response.ok) throw new Error("Backend unavailable");
  const data = await response.json();
  return data.response;
}
 
const SUGGESTIONS = [
  "What should I work on first?",
  "Help me break down my hardest task",
  "I'm feeling overwhelmed, help me prioritize",
  "Create a study schedule for today",
];
 
export function AIPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
 
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      // display_name is the correct field from AuthContext's User type
      content: `Heyyyy ${user?.display_name?.split(" ")[0] ?? "there"}! I'm Task-kun — your AI study companion! (ﾉ◕ヮ◕)ﾉ\n\nI can help you prioritize tasks, break down big projects, and keep you motivated. What are we conquering today?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
 
  // Tasks loaded async from the API for the context panel and AI prompt
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
 
  const bottomRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
 
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
 
  /** Fetch the user's tasks once on mount for the context panel and AI prompt. */
  const loadTasks = useCallback(async () => {
    if (!user) return;
    const token = localStorage.getItem("token") ?? "";
    try {
      const res = await fetch(`${BACKEND_URL}/tasks/by-user/${user.user_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const tasks: Task[] = data.tasks ?? [];
      setActiveTasks(tasks.filter((t) => !t.completed));
    } catch (err) {
      console.warn("Failed to load task context:", err);
    }
  }, [user]);
 
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);
 
  /** Builds the task summary string passed to Gemini as context. */
  const getTaskContext = () => {
    if (activeTasks.length === 0) return "User has no active tasks.";
    return (
      `User has ${activeTasks.length} active tasks. ` +
      `Top tasks: ${activeTasks
        .slice(0, 3)
        .map((t) => `"${t.task_title}" (${t.priority} priority, due ${t.deadline ?? "unknown"})`)
        .join(", ")}.`
    );
  };
 
  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
 
    setInput("");
    setError("");
 
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
 
    try {
      const reply = await callGemini(content, getTaskContext());
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
 
      try {
        const audioUrl = await generateVoice(reply, "miku");
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.play().catch((err) => {
            console.warn("Failed to play audio:", err);
          });
        }
      } catch (voiceError) {
        console.warn("Failed to generate voice:", voiceError);
      }
    } catch {
      setError("Couldn't reach the AI backend. Make sure the server is running.");
    } finally {
      setLoading(false);
    }
  };
 
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
 
  const handleLogout = () => { logout(); navigate("/"); };
 
  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
 
  return (
    <div className="sk-shell ai-shell">
      <Sidebar active="ai" tipBody="Ask me to break your biggest task into manageable steps!" />
 
      <div className="sk-main">
        <header className="sk-topbar">
          <div className="sk-topLeft">
            <div className="sk-topTitle">task-kun<span className="sk-brandTld">.ai</span></div>
          </div>
          <div className="sk-searchWrap" />
          <div className="sk-topRight">
            <button className="sk-iconBtn" onClick={toggleTheme} title="Toggle theme">{theme === "light" ? "🌙" : "☀️"}</button>
            <button className="sk-iconBtn" onClick={() => navigate("/profile")} title="Profile">👤</button>
            <button className="sk-iconBtn" onClick={handleLogout} title="Sign out">⎋</button>
          </div>
        </header>
 
        <main className="ai-main">
          <div className="ai-layout">
            {/* Chat area */}
            <div className="ai-chatPane">
              <div className="ai-chatHeader">
                <div className="ai-avatarWrap">
                  <div className="ai-avatar">♪</div>
                  <div className="ai-avatarOnline" />
                </div>
                <div>
                  <div className="ai-chatName">Task-kun</div>
                  <div className="ai-chatStatus">Online · Powered by Gemini</div>
                </div>
              </div>
 
              <div className="ai-messages">
                {messages.map((msg) => (
                  <div key={msg.id} className={`ai-msgRow ${msg.role}`}>
                    {msg.role === "assistant" && (
                      <div className="ai-msgAvatar">♪</div>
                    )}
                    <div className="ai-bubble">
                      <div className="ai-bubbleContent">
                        {msg.content.split("\n").map((line, i, arr) => (
                          <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
                        ))}
                      </div>
                      <div className="ai-bubbleTime">{formatTime(msg.timestamp)}</div>
                    </div>
                  </div>
                ))}
 
                {loading && (
                  <div className="ai-msgRow assistant">
                    <div className="ai-msgAvatar">♪</div>
                    <div className="ai-bubble ai-typing">
                      <span /><span /><span />
                    </div>
                  </div>
                )}
 
                {error && <div className="ai-error">{error}</div>}
 
                <div ref={bottomRef} />
              </div>
 
              {messages.length <= 1 && !loading && (
                <div className="ai-suggestions">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} className="ai-suggestion" onClick={() => sendMessage(s)}>{s}</button>
                  ))}
                </div>
              )}
 
              <div className="ai-inputArea">
                <textarea
                  className="ai-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Task-kun anything... (Enter to send)"
                  rows={1}
                  disabled={loading}
                />
                <button
                  className="ai-sendBtn"
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  title="Send"
                >
                  ↑
                </button>
              </div>
            </div>
 
            {/* Right context panel */}
            <aside className="ai-contextPane">
              <div className="ai-contextCard">
                <div className="ai-contextTitle">✦ Task Context</div>
                <div className="ai-contextBody">
                  {activeTasks.length === 0 ? (
                    <div className="ai-noTasks">No active tasks yet. Add some from the dashboard!</div>
                  ) : (
                    activeTasks.slice(0, 5).map((t) => (
                      <div key={t.task_id} className="ai-contextTask">
                        <div className={`ai-contextPriority ${t.priority}`} />
                        <div>
                          <div className="ai-contextTaskTitle">{t.task_title}</div>
                          {t.deadline && (
                            <div className="ai-contextTaskMeta">Due {t.deadline}</div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
 
              <div className="ai-contextCard">
                <div className="ai-contextTitle">💡 What I can do</div>
                <div className="ai-contextList">
                  <div className="ai-contextItem">Break tasks into steps</div>
                  <div className="ai-contextItem">Prioritize your workload</div>
                  <div className="ai-contextItem">Create study schedules</div>
                  <div className="ai-contextItem">Motivate & encourage you</div>
                  <div className="ai-contextItem">Answer study questions</div>
                </div>
              </div>
            </aside>
          </div>
 
          <footer className="sk-footer">© 2026 task-kun.ai · Built for students</footer>
        </main>
      </div>
 
      <audio ref={audioRef} hidden />
    </div>
  );
}
 