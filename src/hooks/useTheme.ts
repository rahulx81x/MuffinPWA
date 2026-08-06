import { useEffect, useState } from 'react';

const THEME_KEY = 'themeMode';

function getPreferredDark(): boolean {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'dark') return true;
  if (stored === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyDarkClass(isDark: boolean): void {
  document.documentElement.classList.toggle('dark', isDark);
  const themeColor = isDark ? '#1C130D' : '#FAF5EF';
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((el) => el.setAttribute('content', themeColor));
}

export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof document === 'undefined') return false;
    const dark = getPreferredDark();
    applyDarkClass(dark);
    return dark;
  });

  useEffect(() => {
    applyDarkClass(isDark);
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
  }, [isDark]);

  function toggleTheme() {
    setIsDark((prev) => !prev);
  }

  return { isDark, toggleTheme };
}
