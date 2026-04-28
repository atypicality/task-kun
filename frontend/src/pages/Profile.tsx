import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import Sun from '../assets/taki-sun.svg';
import Moon from '../assets/taki-moon.svg';
import "./Profile.css";

export function Profile() {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [isEditing, setIsEditing] = useState(false);

  const initialName = user?.name ?? "";
  const initialEmail = user?.email ?? "";

  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);

  const hasChanges = useMemo(() => {
    return name.trim() !== initialName || email.trim() !== initialEmail;
  }, [name, email, initialName, initialEmail]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleSave = () => {
    if (!name.trim() || !email.trim()) {
      alert("Name and email cannot be empty.");
      return;
    }
    updateUser({ name: name.trim(), email: email.trim() });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setName(initialName);
    setEmail(initialEmail);
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

            <span className="user-name">Hello, {user?.name}!</span>

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
                  disabled={!hasChanges}
                  title={!hasChanges ? "No changes to save" : "Save changes"}
                >
                  Save
                </button>
                <button className="secondary-btn" onClick={handleCancel}>
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="profile-row">
            <span className="label">Name</span>
            {!isEditing ? (
              <span className="value">{user?.name}</span>
            ) : (
              <input
                className="text-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
          </div>

          <div className="profile-row">
            <span className="label">Email</span>
            {!isEditing ? (
              <span className="value">{user?.email}</span>
            ) : (
              <input
                className="text-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            )}
          </div>

          <div className="profile-row">
            <span className="label">User ID</span>
            <span className="value">{user?.id}</span>
          </div>
        </div>
      </main>
    </div>
  );
}