'use client';

/**
 * Light/dark toggle for the public fleet page. Light is the default;
 * dark is opt-in and remembered via localStorage so it persists across
 * visits. Parent owns the actual theme state — this is just the button.
 */
export default function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={onToggle}
      className="theme-toggle-btn"
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      <i className={`fa-solid ${isDark ? 'fa-sun' : 'fa-moon'}`}></i>
    </button>
  );
}
