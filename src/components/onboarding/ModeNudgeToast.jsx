import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { X, Sparkles } from 'lucide-react';
import { isAdvancedNavPath } from '../../config/navigation';
import {
  getLocalTrackingMode,
  isSimpleMode,
  TRACKING_MODES,
  setLocalTrackingMode,
  TRACKING_MODE_LABELS,
} from '../../utils/trackingMode';
import { saveSettings, loadSettings, getDefaultSettings } from '../../utils/settingsHelpers';
import { getWidgetsForTrackingMode, saveDashboardLayout } from '../../utils/dashboardCustomization';

const USAGE_KEY = 'tpprover_advanced_nav_visits';
const USAGE_NUDGE_KEY = 'tpprover_usage_nudge';
const DISCOVERY_NUDGE_KEY = 'tpprover_discovery_nudge';
const USAGE_THRESHOLD = 3;
const MAX_SHOWS = 3;
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 1 week

const DISCOVERY_FEATURES = [
  { path: '/app/recon', label: 'Peptide Calculator' },
  { path: '/app/insights', label: 'Analytics' },
  { path: '/app/goals', label: 'Goals' },
];

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* ignore */ }
}

function canShow(meta) {
  if (!meta) return true;
  if ((meta.shownCount || 0) >= MAX_SHOWS) return false;
  if (meta.lastShownAt && Date.now() - meta.lastShownAt < COOLDOWN_MS) return false;
  return true;
}

/**
 * Two nudge types for Simple-mode users:
 * 1) Usage-detected — visited advanced nav paths enough times
 * 2) Feature-discovery — periodic tip about unused advanced tools
 */
export default function ModeNudgeToast({ theme }) {
  const location = useLocation();
  const [nudge, setNudge] = useState(null); // { type, featureLabel }

  useEffect(() => {
    if (!isSimpleMode(getLocalTrackingMode())) return;
    if (!isAdvancedNavPath(location.pathname)) return;

    const visits = readJson(USAGE_KEY, {});
    const key = location.pathname.split('?')[0];
    visits[key] = (visits[key] || 0) + 1;
    writeJson(USAGE_KEY, visits);

    const totalAdvanced = Object.values(visits).reduce((a, b) => a + b, 0);
    const usageMeta = readJson(USAGE_NUDGE_KEY, { shownCount: 0, lastShownAt: 0 });

    if (totalAdvanced >= USAGE_THRESHOLD && canShow(usageMeta)) {
      const featureLabel =
        DISCOVERY_FEATURES.find((f) => key.startsWith(f.path))?.label || 'advanced tools';
      setNudge({ type: 'usage', featureLabel });
      writeJson(USAGE_NUDGE_KEY, {
        shownCount: (usageMeta.shownCount || 0) + 1,
        lastShownAt: Date.now(),
      });
    }
  }, [location.pathname]);

  // Periodic discovery nudge (once per session max, after delay)
  useEffect(() => {
    if (!isSimpleMode(getLocalTrackingMode())) return;
    const discoveryMeta = readJson(DISCOVERY_NUDGE_KEY, { shownCount: 0, lastShownAt: 0 });
    if (!canShow(discoveryMeta)) return;
    if (sessionStorage.getItem('tpp_discovery_nudge_session') === '1') return;

    const timer = setTimeout(() => {
      if (!isSimpleMode(getLocalTrackingMode())) return;
      const feature = DISCOVERY_FEATURES[Math.floor(Math.random() * DISCOVERY_FEATURES.length)];
      setNudge((current) => current || { type: 'discovery', featureLabel: feature.label, path: feature.path });
      sessionStorage.setItem('tpp_discovery_nudge_session', '1');
      writeJson(DISCOVERY_NUDGE_KEY, {
        shownCount: (discoveryMeta.shownCount || 0) + 1,
        lastShownAt: Date.now(),
      });
    }, 45000);

    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => setNudge(null);

  const switchToAdvanced = async () => {
    setLocalTrackingMode(TRACKING_MODES.ADVANCED);
    const settings = { ...getDefaultSettings(), ...loadSettings(), trackingMode: TRACKING_MODES.ADVANCED };
    saveSettings(settings);
    saveDashboardLayout(getWidgetsForTrackingMode(TRACKING_MODES.ADVANCED));
    window.dispatchEvent(new CustomEvent('tpp:dashboard-layout-changed'));
    window.dispatchEvent(new CustomEvent('tpp:toast', {
      detail: { message: `Switched to ${TRACKING_MODE_LABELS[TRACKING_MODES.ADVANCED]} mode`, type: 'success' },
    }));

    try {
      const userRaw = localStorage.getItem('tpprover_user');
      const user = userRaw ? JSON.parse(userRaw) : null;
      if (user?.uid) {
        const { saveUserState, loadUserState } = await import('../../services/cloudStorage');
        const current = (await loadUserState(user.uid)) || {};
        await saveUserState(user.uid, { ...current, trackingMode: TRACKING_MODES.ADVANCED });
      }
    } catch (e) {
      console.warn('Failed to sync trackingMode', e);
    }
    dismiss();
  };

  if (!nudge) return null;

  const primary = theme?.primary || '#7F9E95';
  const bg = theme?.isDark ? 'rgba(20,25,33,0.96)' : '#ffffff';
  const text = theme?.text || '#1f2937';
  const muted = theme?.isDark ? 'rgba(255,255,255,0.65)' : '#6b7280';

  const message = nudge.type === 'usage'
    ? `We noticed you've been using ${nudge.featureLabel}. Want to switch to ${TRACKING_MODE_LABELS[TRACKING_MODES.ADVANCED]} mode for full access?`
    : `Don't forget — you also have ${nudge.featureLabel} available. Switch to ${TRACKING_MODE_LABELS[TRACKING_MODES.ADVANCED]} anytime in Settings.`;

  return (
    <div
      className="fixed left-3 right-3 z-[10050] max-w-md mx-auto"
      style={{ bottom: 'calc(5.5rem + var(--safe-area-bottom, 0px))' }}
    >
      <div
        className="rounded-2xl shadow-2xl border p-4 flex gap-3 items-start"
        style={{ backgroundColor: bg, borderColor: theme?.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${primary}22`, color: primary }}
        >
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug mb-2" style={{ color: text }}>{message}</p>
          <div className="flex flex-wrap gap-2">
            {nudge.type === 'usage' && (
              <button
                type="button"
                onClick={switchToAdvanced}
                className="px-3 py-1.5 rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: primary }}
              >
                Switch to Advanced
              </button>
            )}
            <button
              type="button"
              onClick={dismiss}
              className="px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ color: muted }}
            >
              Not now
            </button>
          </div>
        </div>
        <button type="button" onClick={dismiss} className="p-1 opacity-50" aria-label="Dismiss">
          <X className="w-4 h-4" style={{ color: text }} />
        </button>
      </div>
    </div>
  );
}
