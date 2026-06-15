'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'theme';
const EVENT = 'yugati-theme';

/** Apply a theme everywhere: <html data-theme>, localStorage, and notify
 *  any other toggles mounted on the same page so they stay in sync. */
export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* localStorage unavailable (private mode, etc.) — ignore */
  }
  window.dispatchEvent(new CustomEvent<Theme>(EVENT, { detail: theme }));
}

/** Reads the current theme from the DOM (set pre-paint by the inline
 *  script in the root layout) and stays in sync with other toggles. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme');
    setTheme(current === 'light' ? 'light' : 'dark');

    const onChange = (e: Event) => setTheme((e as CustomEvent<Theme>).detail);
    window.addEventListener(EVENT, onChange as EventListener);
    return () => window.removeEventListener(EVENT, onChange as EventListener);
  }, []);

  const toggle = () => applyTheme(theme === 'dark' ? 'light' : 'dark');
  return { theme, toggle };
}

/** Dark/light toggle button. Uses theme-aware utility classes so it
 *  reads correctly in both modes. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border border-zinc-800
        ${isDark ? 'text-zinc-500' : 'text-zinc-100'}
        hover:text-white hover:border-zinc-700 hover:bg-zinc-800 transition-colors ${className}`}
    >
      {isDark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
