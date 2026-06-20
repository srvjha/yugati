'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export type Theme = 'dark' | 'light';

const EVENT = 'yugati-theme';

/** Apply a theme everywhere: <html data-theme>, a cookie (so the server
 *  renders the right theme on the next request — survives navigation,
 *  reloads, and full page loads), and notify any other toggles on the
 *  page so they stay in sync. */
export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.cookie = `theme=${theme};path=/;max-age=31536000;samesite=lax`;
  window.dispatchEvent(new CustomEvent<Theme>(EVENT, { detail: theme }));
}

/** Reads the current theme from the DOM (set during SSR from the theme
 *  cookie) and stays in sync with other toggles. */
export function useTheme() {
  // Read the initial theme from the DOM attribute (set during SSR from the
  // theme cookie) in the state initializer so it runs synchronously on mount
  // and avoids a setState-in-effect that triggers a second render.
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark';
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
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
      suppressHydrationWarning
      className={`inline-flex items-center justify-center w-7 h-7 rounded-md transition-colors
        ${isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-800'} ${className}`}
    >
      {isDark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
