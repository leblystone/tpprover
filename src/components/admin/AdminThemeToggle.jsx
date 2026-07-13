import React from 'react';
import { Sun, Moon } from '@phosphor-icons/react';
import { ADMIN_DARK_THEME, ADMIN_LIGHT_THEME } from '../../utils/adminThemeStorage';

/**
 * Day (sun) / night (moon) segmented toggle — matches user app appearance track styling.
 */
export default function AdminThemeToggle({ themeName, onThemeChange, theme }) {
  const isDark = themeName === ADMIN_DARK_THEME;
  const trackBg = theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const activeBg = theme.cardBackground || (theme.isDark ? '#29303b' : '#fff');
  const activeColor = theme.primary;
  const inactiveColor = theme.isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)';

  return (
    <div
      role="group"
      aria-label="Appearance"
      className="flex items-center w-full rounded-xl p-1"
      style={{
        backgroundColor: trackBg,
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.12), inset 0 1px 2px rgba(0,0,0,0.08)',
      }}
    >
      <button
        type="button"
        aria-pressed={!isDark}
        title="Day mode"
        onClick={() => onThemeChange(ADMIN_LIGHT_THEME)}
        className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-semibold transition-all active:scale-95"
        style={{
          backgroundColor: !isDark ? activeBg : 'transparent',
          color: !isDark ? activeColor : inactiveColor,
          boxShadow: !isDark ? '0 1px 4px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)' : 'none',
        }}
      >
        <Sun size={16} weight={!isDark ? 'fill' : 'duotone'} />
        <span>Day</span>
      </button>
      <button
        type="button"
        aria-pressed={isDark}
        title="Night mode"
        onClick={() => onThemeChange(ADMIN_DARK_THEME)}
        className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-semibold transition-all active:scale-95"
        style={{
          backgroundColor: isDark ? activeBg : 'transparent',
          color: isDark ? activeColor : inactiveColor,
          boxShadow: isDark ? '0 1px 4px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)' : 'none',
        }}
      >
        <Moon size={16} weight={isDark ? 'fill' : 'duotone'} />
        <span>Night</span>
      </button>
    </div>
  );
}
