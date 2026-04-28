import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

interface User {
  user_id: string;
  email: string;
  display_name: string;
  university?: string;
  major?: string;
}

export interface UserSettings {
  assistant_voice: string;
  assistant_speaking_speed: number;
  assistant_volume: number;
  auto_voice_feedback: boolean;
  default_task_sorting: string;
  interface_theme: string;
  mascot_soul_color: string;
}

interface AuthContextType {
  user: User | null;
  settings: UserSettings | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, display_name: string, password: string) => Promise<void>;
  logout: () => void;
  /** Optimistic local-only update — use saveProfile for persisted changes */
  updateUser: (updates: Partial<User>) => void;
  /** Calls PUT /auth/user/updateInfo/:id with JWT, then syncs local state */
  saveProfile: (updates: { display_name?: string; university?: string; major?: string }) => Promise<void>;
  /** Calls PUT /auth/user/updateSettings/:id with JWT, then syncs local state */
  saveSettings: (updates: Partial<UserSettings>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage, then fetch fresh profile + settings
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');

    if (savedUser && savedToken) {
      try {
        const parsedUser: User = JSON.parse(savedUser);
        setUser(parsedUser);
        setToken(savedToken);

        // Hydrate fresh settings from backend (avoids stale localStorage data)
        fetch(`${BACKEND_URL}/auth/user/${parsedUser.user_id}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              // Sync user in case profile changed elsewhere
              setUser(data.user);
              localStorage.setItem('user', JSON.stringify(data.user));
              if (data.settings) setSettings(data.settings);
            }
          })
          .catch(() => {
            // Non-fatal: cached data is still usable
          })
          .finally(() => setLoading(false));
      } catch {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch(`${BACKEND_URL}/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const data = await response.json();
      const errorMsg =
        typeof data.detail === 'string'
          ? data.detail
          : data.detail?.error || data.error || `Login failed with status ${response.status}`;
      throw new Error(errorMsg);
    }

    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Login failed');

    setUser(data.user);
    setToken(data.session.access_token);
    if (data.settings) setSettings(data.settings);
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('token', data.session.access_token);
  };

  const signup = async (email: string, display_name: string, password: string) => {
    const response = await fetch(`${BACKEND_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, display_name }),
    });

    if (!response.ok) {
      const data = await response.json();
      const errorMsg =
        typeof data.detail === 'string'
          ? data.detail
          : data.detail?.error || data.error || `Signup failed with status ${response.status}`;
      throw new Error(errorMsg);
    }

    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Signup failed');

    setUser(data.user);
    if (data.session?.access_token) {
      setToken(data.session.access_token);
      localStorage.setItem('token', data.session.access_token);
    }
    localStorage.setItem('user', JSON.stringify(data.user));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setSettings(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  /** Local-only state sync — call after a successful backend update */
  const updateUser = (updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  /**
   * Persist display_name / university / major to Supabase via
   * PUT /auth/user/updateInfo/:user_id, then sync local state.
   * JWT is sent as Bearer token so the backend can enforce RLS.
   */
  const saveProfile = async (updates: {
    display_name?: string;
    university?: string;
    major?: string;
  }) => {
    if (!user || !token) throw new Error('Not authenticated');

    const response = await fetch(`${BACKEND_URL}/auth/user/updateInfo/${user.user_id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.detail?.error || 'Failed to update profile');
    }

    const data = await response.json();
    if (data.success && data.user) {
      updateUser(data.user);
    }
  };

  /**
   * Persist User Settings to Supabase via
   * PUT /auth/user/updateSettings/:user_id, then sync local state.
   */
  const saveSettings = async (updates: Partial<UserSettings>) => {
    if (!user || !token) throw new Error('Not authenticated');

    const response = await fetch(`${BACKEND_URL}/auth/user/updateSettings/${user.user_id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.detail?.error || 'Failed to update settings');
    }

    const data = await response.json();
    if (data.success && data.settings) {
      setSettings(data.settings);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        settings,
        token,
        isAuthenticated: !!user,
        loading,
        login,
        signup,
        logout,
        updateUser,
        saveProfile,
        saveSettings,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}