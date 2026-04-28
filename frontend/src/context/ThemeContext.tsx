import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

type ThemeType = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeType;
  toggleTheme: () => void;

  setTheme: (theme: ThemeType) => void;
  accent: string | null;
  setAccent: (color: string | null) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = 'theme';
const ACCENT_KEY = 'accent';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeType>(() => {
    const stored = localStorage.getItem(THEME_KEY) as ThemeType | null;
    if (stored) return stored;

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [accent, setAccentState] = useState<string | null>(() => {
    return localStorage.getItem(ACCENT_KEY) ?? '#39c5bb';
  });

  // Apply theme
  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const html = document.documentElement;

    if (!accent) {
      html.style.removeProperty('--accent');
      html.style.removeProperty('--accent-hover');
      localStorage.removeItem(ACCENT_KEY);
      return;
    }

    html.style.setProperty('--accent', accent);
    // derive a slightly shifted hover (darken by ~10%)
    html.style.setProperty('--accent-hover', accent);
    localStorage.setItem(ACCENT_KEY, accent);
  }, [accent]);

  const toggleTheme = () => setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  const setTheme = (t: ThemeType) => setThemeState(t);
  const setAccent = (c: string | null) => setAccentState(c);

  const value = useMemo(
    () => ({ theme, toggleTheme, setTheme, accent, setAccent }),
    [theme, accent]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}