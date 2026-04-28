import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './HomePage.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://task-kun-s9rt.onrender.com';

/* ── Typewriter hook ─────────────────────────────── */
const HERO_WORDS = ["goals.", "future.", "tasks.", "potential.", "success.", "dreams."];

function useHeroTypewriter() {
  const [wordIdx, setWordIdx] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = HERO_WORDS[wordIdx % HERO_WORDS.length];
    let timeout: ReturnType<typeof setTimeout>;

    if (!deleting) {
      if (text.length < word.length) {
        timeout = setTimeout(() => setText(word.slice(0, text.length + 1)), 80);
      } else {
        timeout = setTimeout(() => setDeleting(true), 2200);
      }
    } else {
      if (text.length > 0) {
        timeout = setTimeout(() => setText(text.slice(0, -1)), 45);
      } else {
        setDeleting(false);
        setWordIdx((i) => i + 1);
      }
    }
    return () => clearTimeout(timeout);
  }, [text, deleting, wordIdx]);

  return text;
}

/* ── Scroll-reveal hook ──────────────────────────── */
function useReveal() {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { ref, visible };
}

/* ── Ask Miku component ──────────────────────────── */
const MIKU_SYSTEM = `You are Hatsune Miku, the cheerful AI assistant of task-kun.ai. You help students manage tasks, stay motivated, and crush deadlines. Keep responses upbeat, short (2-4 sentences), and encourage the student. Occasionally add a music or star emoji. Never break character.`;

function AskMiku() {
  const [input, setInput] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const { ref, visible } = useReveal();

  const SUGGESTIONS = [
    "How do I stop procrastinating?",
    "Help me prioritize my tasks!",
    "What's the best study method?",
    "I have 3 exams this week 😱",
  ];

  const ask = async (q: string) => {
    if (!q.trim() || loading) return;
    setLoading(true);
    setError(false);
    setReply(null);
    try {
      const res = await fetch(`${BACKEND_URL}/generate-gemini`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `${MIKU_SYSTEM}\n\nStudent: ${q}` }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setReply(data.response);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    ask(input);
    setInput("");
  };

  return (
    <section
      id="ask-miku"
      className={`miku-section ${visible ? "revealed" : ""}`}
      ref={ref as React.RefObject<HTMLElement>}
    >
      <div className="miku-container">
        <div className="miku-header">
          <div className="miku-kicker">✦ Try it now — no login needed</div>
          <h2>Ask Miku anything</h2>
          <p>Get instant study tips, motivation, and task advice from your AI companion.</p>
        </div>

        <div className="miku-card">
          <div className="miku-avatar-row">
            <div className="miku-avatar">🎵</div>
            <div className="miku-avatar-name">Miku<span className="miku-tld">.ai</span></div>
            <div className="miku-online"><span className="miku-online-dot" />Online</div>
          </div>

          {reply && (
            <div className="miku-reply">
              <div className="miku-bubble">{reply}</div>
            </div>
          )}

          {loading && (
            <div className="miku-reply">
              <div className="miku-bubble miku-typing">
                <span /><span /><span />
              </div>
            </div>
          )}

          {error && (
            <div className="miku-reply">
              <div className="miku-bubble miku-error">
                Oops! Make sure the backend is running. ✦
              </div>
            </div>
          )}

          {!reply && !loading && !error && (
            <div className="miku-suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="miku-chip" onClick={() => { ask(s); }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          <form className="miku-form" onSubmit={handleSubmit}>
            <input
              className="miku-input"
              placeholder="Ask me anything about your tasks..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button className="miku-send" type="submit" disabled={loading || !input.trim()}>
              ↑
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

/* ── Main Page ───────────────────────────────────── */
function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function HomePage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const heroWord = useHeroTypewriter();

  const goApp = () => navigate(isAuthenticated ? '/dashboard' : '/login');

  const featuresReveal = useReveal();
  const ctaReveal = useReveal();

  return (
    <div className="home-page">
      {/* Navigation */}
      <nav className="home-nav">
        <div className="nav-container">
          <div className="nav-logo">
            <div className="nav-logo-dot" />
            <span>
              <span className="nav-logo-name">task-kun</span>
              <span className="nav-logo-tld">.ai</span>
            </span>
          </div>

          <div className="nav-right">
            <button className="nav-pill" onClick={goApp}>
              {isAuthenticated ? 'Dashboard' : 'Sign In'}
            </button>
            {!isAuthenticated && (
              <button className="nav-button" onClick={() => navigate('/login')}>
                Get Started
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-container">
          <div className="hero-content">
            <div className="hero-badge">
              <span className="hero-badge-dot" />
              AI-Powered · Built with Miku
            </div>

            <h1>
              Conquer your{' '}
              <span className="hero-accent">
                {heroWord}<span className="hero-cursor">|</span>
              </span>
            </h1>

            <p className="hero-subtitle">
              task-kun.ai pairs intelligent task management with Hatsune Miku's energy to keep you organized, motivated, and always one step ahead of your deadlines.
            </p>

            <div className="hero-actions">
              <button className="hero-button-primary" onClick={goApp}>
                {isAuthenticated ? 'Open Dashboard' : 'Start for Free'}
              </button>
              <button className="hero-button-secondary" onClick={() => scrollTo('features')}>
                See Features ↓
              </button>
            </div>

            <div className="hero-stats">
              <div onClick={() => scrollTo('features')} className="hero-stat-clickable">
                <div className="hero-stat-value">AI</div>
                <div className="hero-stat-label">Smart Sorting</div>
              </div>
              <div onClick={() => scrollTo('ask-miku')} className="hero-stat-clickable">
                <div className="hero-stat-value">🎵</div>
                <div className="hero-stat-label">Voice Reminders</div>
              </div>
              <div>
                <div className="hero-stat-value">∞</div>
                <div className="hero-stat-label">Tasks Tracked</div>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="visual-card">
              <div className="visual-card-header">
                <div className="visual-card-dot" />
                <div className="visual-card-dot" />
                <div className="visual-card-dot" />
                <span className="visual-card-title">My Tasks</span>
              </div>

              <div className="visual-item">
                <div className="visual-check done">✓</div>
                <div className="visual-item-content">
                  <div className="visual-item-title done">Review lecture notes</div>
                  <div className="visual-item-meta">Completed · History 101</div>
                </div>
                <span className="visual-priority low">low</span>
              </div>

              <div className="visual-item">
                <div className="visual-check" />
                <div className="visual-item-content">
                  <div className="visual-item-title">Submit project proposal</div>
                  <div className="visual-item-meta">Due · Today, 11:59 PM</div>
                </div>
                <span className="visual-priority high">high</span>
              </div>

              <div className="visual-item">
                <div className="visual-check" />
                <div className="visual-item-content">
                  <div className="visual-item-title">Study for midterm exam</div>
                  <div className="visual-item-meta">Due · Tomorrow, 9:00 AM</div>
                </div>
                <span className="visual-priority medium">med</span>
              </div>

              <div className="visual-ai-tag">
                <span className="visual-ai-icon">✦</span>
                <span className="visual-ai-text">AI suggests: Start "project proposal" now</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className={`features ${featuresReveal.visible ? "revealed" : ""}`}
        ref={featuresReveal.ref as React.RefObject<HTMLElement>}
      >
        <div className="features-container">
          <div className="features-header">
            <div className="features-kicker">✦ Everything You Need</div>
            <h2>Built for students who get things done</h2>
            <p>Smart tools that adapt to your workflow, so you can focus on what matters.</p>
          </div>

          <div className="features-grid">
            {[
              { icon: "🤖", title: "AI Task Intelligence", desc: "Let the AI recommend what to tackle next based on deadlines and priority scores." },
              { icon: "🎵", title: "Voice Reminders", desc: "Hatsune Miku reminds you of upcoming deadlines with cheerful voice notifications." },
              { icon: "📅", title: "Visual Calendar", desc: "See all your tasks at a glance on a beautiful monthly calendar with smart chips." },
              { icon: "⚡", title: "Priority Sorting", desc: "Automatically rank tasks by deadline, priority, or an AI-balanced combination." },
              { icon: "🌙", title: "Light & Dark Themes", desc: "Switch between light and dark mode with full accent color customization." },
              { icon: "💾", title: "Always in Sync", desc: "Tasks are saved instantly. Never lose progress, no matter where you left off." },
            ].map((f, i) => (
              <div key={f.title} className="feature-card" style={{ animationDelay: `${i * 0.07}s` }}>
                <div className="feature-icon-wrap">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ask Miku */}
      <AskMiku />

      {/* CTA */}
      <section
        className={`cta ${ctaReveal.visible ? "revealed" : ""}`}
        ref={ctaReveal.ref as React.RefObject<HTMLElement>}
      >
        <div className="cta-container">
          <span className="cta-kicker">Ready to start?</span>
          <h2>Your best work<br />starts here</h2>
          <p>Join students who use task-kun.ai to stay ahead of every deadline.</p>

          <div className="cta-actions">
            <button className="cta-button" onClick={goApp}>
              {isAuthenticated ? 'Go to Dashboard' : 'Create Free Account'}
            </button>
          </div>

          <p className="cta-note">No credit card required · Free forever for students</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="footer-brand-dot" />
            task-kun.ai
          </div>

          <span className="footer-copy">© 2026 task-kun.ai · Built for students</span>

          <div className="footer-links">
            <button className="footer-link">Features</button>
            <button className="footer-link">Privacy</button>
            <button className="footer-link">Contact</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
