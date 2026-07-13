import { defaultThemeName, themes } from '../theme/themes';

/** Admin-only light/dark preference (does not change user app `tpprover_theme`). */
export const ADMIN_THEME_STORAGE_KEY = 'tpp_admin_theme';

export const ADMIN_LIGHT_THEME = 'sage';
export const ADMIN_DARK_THEME = 'softDark';

const ADMIN_THEME_IDS = [ADMIN_LIGHT_THEME, ADMIN_DARK_THEME];

export function normalizeAdminThemeName(value) {
  if (ADMIN_THEME_IDS.includes(value)) return value;
  return ADMIN_LIGHT_THEME;
}

export function getAdminThemeName() {
  try {
    return normalizeAdminThemeName(localStorage.getItem(ADMIN_THEME_STORAGE_KEY));
  } catch {
    return ADMIN_LIGHT_THEME;
  }
}

export function setAdminThemeName(name) {
  try {
    localStorage.setItem(ADMIN_THEME_STORAGE_KEY, normalizeAdminThemeName(name));
  } catch {
    /* ignore */
  }
}

export function getAdminTheme() {
  const name = getAdminThemeName();
  return themes[name] || themes[defaultThemeName];
}

/** Restore main app html theme after leaving admin. */
export function applyMainAppDocumentTheme() {
  try {
    let savedTheme = localStorage.getItem('tpprover_theme') || defaultThemeName;
    if (savedTheme === 'twilight' || savedTheme === 'pastel') savedTheme = 'pearlescent';
    if (savedTheme === 'beekeeper' || savedTheme === 'mauve' || savedTheme === 'taupe') {
      savedTheme = defaultThemeName;
    }
    if (!themes[savedTheme]) savedTheme = defaultThemeName;
    const t = themes[savedTheme];
    const html = document.documentElement;
    html.setAttribute('data-theme', savedTheme);
    if (t.isDark) html.classList.add('dark');
    else html.classList.remove('dark');
  } catch {
    /* ignore */
  }
}

export function applyAdminDocumentTheme(themeName) {
  const name = normalizeAdminThemeName(themeName);
  const t = themes[name] || themes[defaultThemeName];
  const html = document.documentElement;
  html.setAttribute('data-theme', name);
  if (t.isDark) html.classList.add('dark');
  else html.classList.remove('dark');
}
