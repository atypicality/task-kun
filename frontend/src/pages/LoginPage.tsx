import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import loginMascot from "../assets/login-mascot.png";
import logoB from "../assets/taki-logo-full.svg";
import Computer from '../assets/taki-computer.svg';
import "./LoginPage.css";

export function LoginPage() {
  const [isSignup, setIsSignup] = useState(false);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login, signup } = useAuth();

  const title = useMemo(() => (isSignup ? "Create Account" : "Welcome Back!"), [isSignup]);
  const subtitle = useMemo(
    () => (isSignup ? "Create your Task-kun account in seconds." : "Ready to tackle your tasks today?"),
    [isSignup]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignup) {
        // Validation for signup
        if (!email || !name || !password) {
          throw new Error("Please fill in all fields");
        }
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters");
        }
        await signup(email, name, password);
      } else {
        // Validation for login
        if (!email || !password) {
          throw new Error("Please enter email and password");
        }
        await login(email, password);
      }
      // Navigate after successful auth
      navigate("/dashboard");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      console.error("Auth error:", err);
    } finally {
      setLoading(false);
    }
  };

  const resetAndToggleMode = () => {
    setIsSignup((v) => !v);
    setError("");
    setEmail("");
    setName("");
    setPassword("");
    setShowPassword(false);
  };

  return (
    <div className="lp-page">
      {/* Top bar */}
      <header className="lp-topbar">
        <div className="lp-brand" onClick={() => navigate("/")}>
          <div className="lp-brandMark" />
          <div className="lp-brandText">Task-kun AI</div>
        </div>

        <button className="lp-langBtn" type="button" title="Language">
          <img className="svg sidebarsvg svgalwayson" src={Computer} alt="" />
          <span>English</span>
        </button>
      </header>

      {/* Main split */}
      <main className="lp-main">
        {/* Left: marketing/wireframe hero */}
        <section className="lp-hero">
          <div className="lp-heroInner">
            <div className="lp-illustration" aria-hidden="true">
              <img className="lp-heroImg" src={loginMascot} alt="" />
            </div>

            <h1 className="lp-heroTitle">
              Let's crush those deadlines,{" "}
              <span className="lp-accentItalic">together!</span>
            </h1>

            <p className="lp-heroSub">
              Task-kun AI helps you organize your study life with AI breakdowns, voice reminders, and smart priority
              sorting.
            </p>

            <div className="lp-pillRow">
              <span className="lp-pill">AI-Powered Sorting</span>
              <span className="lp-pill">Voice Reminders</span>
              <span className="lp-pill">Smart Breakdowns</span>
            </div>
          </div>
        </section>

        {/* Right: auth card */}
        <section className="lp-auth">
          <div className="lp-card">
            <div className="lp-cardHeader">
              <h2>{title}</h2>
              <p>{subtitle}</p>
            </div>

            <form className="lp-form" onSubmit={handleSubmit}>
              {error && <div className="lp-error">{error}</div>}

              {isSignup && (
                <div className="lp-field">
                  <label htmlFor="name">Full Name</label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Sweeney"
                    required
                  />
                </div>
              )}

              <div className="lp-field">
                <label htmlFor="email">College Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@university.edu"
                  required
                />
              </div>

              <div className="lp-field">
                <div className="lp-fieldRow">
                  <label htmlFor="password">Password</label>
                  {!isSignup && (
                    <button className="lp-link" type="button" onClick={() => alert("Not implemented yet")}>
                      Forgot password?
                    </button>
                  )}
                </div>

                <div className="lp-passwordWrap">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                  <button
                    className="lp-eyeBtn"
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      // eye-off outline
                      <svg viewBox="0 0 24 24" className="lp-eyeIcon" aria-hidden="true">
                        <path
                          d="M3 3l18 18M10.6 10.6a3 3 0 004.2 4.2M9.9 5.1A10.5 10.5 0 0122 12c-1.8 3.6-5.4 6-10 6-1.7 0-3.2-.3-4.5-.9M6.2 6.2A10.7 10.7 0 002 12c1.8 3.6 5.4 6 10 6"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M12 9a3 3 0 013 3"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    ) : (
                      // eye outline
                      <svg viewBox="0 0 24 24" className="lp-eyeIcon" aria-hidden="true">
                        <path
                          d="M2 12c1.8-3.6 5.4-6 10-6s8.2 2.4 10 6c-1.8 3.6-5.4 6-10 6S3.8 15.6 2 12z"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinejoin="round"
                        />
                        <circle
                          cx="12"
                          cy="12"
                          r="3"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button className="lp-primaryBtn" type="submit" disabled={loading}>
                {loading ? "Loading..." : isSignup ? "Create Account" : "Sign In"}
              </button>

              <div className="lp-bottomText">
                {isSignup ? (
                  <>
                    Already have an account?{" "}
                    <button type="button" className="lp-link" onClick={resetAndToggleMode}>
                      Sign In
                    </button>
                  </>
                ) : (
                  <>
                    New to Task-kun?{" "}
                    <button type="button" className="lp-link" onClick={resetAndToggleMode}>
                      Create an account
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </section>
      </main>

      {/* Footer (wireframe style) */}
      <footer className="lp-footer">
        <div className="lp-footerInner">
          <div className="lp-footerBrand">
            <div className="lp-brandMini">
              <div className="lp-brandMark" />
              <div className="lp-brandText">task-kun.ai</div>
            </div>
            <p>Empowering students through AI-driven productivity and Miku-inspired design.</p>
          </div>

          <div className="lp-footerCols">
            <div className="lp-col">
              <div className="lp-colTitle">Product</div>
              <a className="lp-footLink" href="#" onClick={(e) => e.preventDefault()}>
                Features
              </a>
              <a className="lp-footLink" href="#" onClick={(e) => e.preventDefault()}>
                Voice Assistant
              </a>
              <a className="lp-footLink" href="#" onClick={(e) => e.preventDefault()}>
                Integrations
              </a>
            </div>

            <div className="lp-col">
              <div className="lp-colTitle">Resources</div>
              <a className="lp-footLink" href="#" onClick={(e) => e.preventDefault()}>
                Student Guide
              </a>
              <a className="lp-footLink" href="#" onClick={(e) => e.preventDefault()}>
                AI Tips
              </a>
              <a className="lp-footLink" href="#" onClick={(e) => e.preventDefault()}>
                Community
              </a>
            </div>

            <div className="lp-col">
              <div className="lp-colTitle">Support</div>
              <a className="lp-footLink" href="#" onClick={(e) => e.preventDefault()}>
                Help Center
              </a>
              <a className="lp-footLink" href="#" onClick={(e) => e.preventDefault()}>
                Contact Us
              </a>
              <a className="lp-footLink" href="#" onClick={(e) => e.preventDefault()}>
                Status
              </a>
            </div>
          </div>
        </div>

        <div className="lp-footerBottom">© 2026 task-kun.ai · All rights reserved.</div>
      </footer>
    </div>
  );
}