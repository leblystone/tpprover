import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { Calculator, ChartLine, ClipboardText } from '@phosphor-icons/react';
import { isAdvancedNavPath } from '../../config/navigation';
import {
  getLocalTrackingMode,
  isSimpleMode,
  TRACKING_MODES,
  setLocalTrackingMode,
  TRACKING_MODE_LABELS,
} from '../../utils/trackingMode';
import { saveSettings, loadSettings, getDefaultSettings } from '../../utils/settingsHelpers';
import { switchModeDashboardLayout } from '../../utils/dashboardCustomization';

const USAGE_KEY = 'tpprover_advanced_nav_visits';
const USAGE_NUDGE_KEY = 'tpprover_usage_nudge';
const DISCOVERY_NUDGE_KEY = 'tpprover_discovery_nudge';
const USAGE_THRESHOLD = 3;
const MAX_SHOWS = 3;
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 1 week
const ICON_SIZE = 48;

const DISCOVERY_FEATURES = [
  { path: '/app/recon', label: 'Peptide Calculator', Icon: Calculator },
  { path: '/app/insights', label: 'Analytics', Icon: ChartLine },
  { path: '/app/goals', label: 'Goals', Icon: ClipboardText },
];

function resolveFeature(pathOrLabel) {
  if (!pathOrLabel) return DISCOVERY_FEATURES[0];
  return (
    DISCOVERY_FEATURES.find(
      (f) =>
        pathOrLabel === f.path ||
        pathOrLabel.startsWith(f.path) ||
        pathOrLabel === f.label
    ) || DISCOVERY_FEATURES[0]
  );
}

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
  const [nudge, setNudge] = useState(null); // { type, featureLabel, path }

  // Dev preview: phone-icon menu can force-show either nudge type (test account only).
  useEffect(() => {
    const onPreview = (e) => {
      const type = e?.detail?.type === 'discovery' ? 'discovery' : 'usage';
      const feature = resolveFeature(e?.detail?.path || e?.detail?.feature);
      setNudge({
        type,
        featureLabel: feature.label,
        path: feature.path,
      });
    };
    window.addEventListener('tpp:dev-preview-mode-nudge', onPreview);
    return () => window.removeEventListener('tpp:dev-preview-mode-nudge', onPreview);
  }, []);

  // Fired by moreOptionsTracking when user taps "More options" 3+ times
  useEffect(() => {
    const onUsage = (e) => {
      if (!isSimpleMode(getLocalTrackingMode())) return;
      const feature = resolveFeature(e?.detail?.path || e?.detail?.featureLabel);
      setNudge((current) => current || {
        type: 'usage',
        featureLabel: feature.label,
        path: feature.path,
      });
    };
    window.addEventListener('tpp:upgrade-nudge', onUsage);
    return () => window.removeEventListener('tpp:upgrade-nudge', onUsage);
  }, []);

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
      const feature = resolveFeature(key);
      setNudge({ type: 'usage', featureLabel: feature.label, path: feature.path });
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

  // Bottom nav tap clears mode nudge so it doesn't sit over the bar
  useEffect(() => {
    const onNav = () => setNudge(null);
    window.addEventListener('tpp:bottom-nav-click', onNav);
    return () => window.removeEventListener('tpp:bottom-nav-click', onNav);
  }, []);

  const switchToAdvanced = async () => {
    const fromMode = getLocalTrackingMode();
    setLocalTrackingMode(TRACKING_MODES.ADVANCED);
    const settings = { ...getDefaultSettings(), ...loadSettings(), trackingMode: TRACKING_MODES.ADVANCED };
    saveSettings(settings);
    switchModeDashboardLayout(fromMode, TRACKING_MODES.ADVANCED);
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
  const feature = resolveFeature(nudge.path || nudge.featureLabel);
  const FeatureIcon = feature.Icon;

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
        <FeatureIcon
          className="flex-shrink-0 self-center"
          size={ICON_SIZE}
          weight="duotone"
          style={{ color: primary }}
          aria-hidden
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug mb-2" style={{ color: text }}>{message}</p>
          <div className="flex flex-wrap gap-2 justify-center">
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
