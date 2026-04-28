import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import Sun from '../assets/taki-sun.svg';
import Moon from '../assets/taki-moon.svg';
import "./Profile.css";

export function Profile() {
  const navigate = useNavigate();
  const { user, logout, saveProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editable fields — email and password are not changeable here
  const initialDisplayName = user?.display_name ?? "";
  const initialUniversity = user?.university ?? "";
  const initialMajor = user?.major ?? "";

  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [university, setUniversity] = useState(initialUniversity);
  const [major, setMajor] = useState(initialMajor);

  const hasChanges = useMemo(() => {
    return (
      displayName.trim() !== initialDisplayName ||
      university.trim() !== initialUniversity ||
      major.trim() !== initialMajor
    );
  }, [displayName, university, major, initialDisplayName, initialUniversity, initialMajor]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      setError("Display name cannot be empty.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await saveProfile({
        display_name: displayName.trim(),
        university: university.trim() || undefined,
        major: major.trim() || undefined,
      });
      setIsEditing(false);
    } catch (e: any) {
      setError(e.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDisplayName(initialDisplayName);
    setUniversity(initialUniversity);
    setMajor(initialMajor);
    setError(null);
    setIsEditing(false);
  };

  return (
    <div className="profile-container">
      <header className="profile-header">
        <div className="header-content">
          <h1 className="profile-title">task-kun<span>.ai</span></h1>

          <div className="header-controls">
            <button className="nav-link" onClick={() => navigate("/dashboard")}>
              Dashboard
            </button>

            <span className="user-name">Hello, {user?.display_name}!</span>
              <button
                className="theme-toggle"
                onClick={toggleTheme}
                title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              >
              {theme === "light" ? 
              <img className="svg sidebarsvg svgalwayson" src={Moon} alt="" />
               :
              <img className="svg sidebarsvg svgalwayson" src={Sun} alt="" />}            
              </button>
            <button className="logout-button" onClick={handleLogout}>
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="profile-content">
        <div className="profile-card">
          <div className="profile-card-top">
            <h2>Profile</h2>

            {!isEditing ? (
              <button className="primary-btn" onClick={() => setIsEditing(true)}>
                Edit
              </button>
            ) : (
              <div className="edit-actions">
                <button
                  className="primary-btn"
                  onClick={handleSave}
                  disabled={!hasChanges || saving}
                  title={!hasChanges ? "No changes to save" : "Save changes"}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button className="secondary-btn" onClick={handleCancel} disabled={saving}>
                  Cancel
                </button>
              </div>
            )}
          </div>

          {error && <p className="error-message">{error}</p>}

          <div className="profile-row">
            <span className="label">Display Name</span>
            {!isEditing ? (
              <span className="value">{user?.display_name}</span>
            ) : (
              <input
                className="text-input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            )}
          </div>

          {/* Email is read-only — change via account security settings */}
          <div className="profile-row">
            <span className="label">Email</span>
            <span className="value">{user?.email}</span>
          </div>

          <div className="profile-row">
            <span className="label">University</span>
            {!isEditing ? (
              <span className="value">{user?.university || "—"}</span>
            ) : (
              <input
                className="text-input"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                placeholder="e.g. MIT"
              />
            )}
          </div>

          <div className="profile-row">
            <span className="label">Major</span>
            {!isEditing ? (
              <span className="value">{user?.major || "—"}</span>
            ) : (
              <input
                className="text-input"
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                placeholder="e.g. Computer Science"
              />
            )}
          </div>

          <div className="profile-row">
            <span className="label">User ID</span>
            <span className="value">{user?.user_id}</span>
          </div>
        </div>
      </main>
    </div>
  );
}