import React, { useEffect, useState } from 'react';
import {
  Rocket,
  Calculator,
  Pulse,
  ClipboardText,
  Storefront,
  Heart,
  CheckCircle,
  X,
} from '@phosphor-icons/react';
import pipIcon from '../../assets/app_icon.png';
import { isFeatureEnabled } from '../../config/featureFlags';
import { openPipChat } from '../../utils/pipOpen';

const CHECKLIST_ITEMS = [
  {
    id: 'recon',
    icon: Calculator,
    title: 'Peptide Calculator',
    desc: 'Set up your BAC water and vial amounts for accurate reconstitution.',
    path: '/app/recon',
    cta: 'Open Calculator',
  },
  {
    id: 'analytics',
    icon: Pulse,
    title: 'Insights',
    desc: 'Review your compliance, streaks, and dose history.',
    path: '/app/insights',
    cta: 'View Insights',
  },
  {
    id: 'goals',
    icon: ClipboardText,
    title: 'Research Goals',
    desc: 'Set milestones and link them to your tracked data.',
    path: '/app/goals',
    cta: 'Add Goals',
  },
  {
    id: 'vendors',
    icon: Storefront,
    title: 'Vendors',
    desc: 'Add your trusted suppliers, payment methods, and ratings.',
    path: '/app/vendors',
    cta: 'Add Vendors',
  },
  {
    id: 'wishlist',
    icon: Heart,
    title: 'Wishlist',
    desc: 'Save peptides or supplements you want to add to future orders.',
    path: '/app/wishlist',
    cta: 'Start Wishlist',
  },
];

const STORAGE_KEY = 'tpp_upgrade_checklist_dismissed';

export default function UpgradeChecklistModal({ theme, onNavigate }) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'false');
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handler = (e) => {
      if (e?.detail?.trackingMode === 'ADVANCED' || e?.detail?.trackingMode === 'advanced') {
        if (!dismissed) setOpen(true);
      }
    };
    window.addEventListener('tpp:tracking-mode-changed', handler);
    return () => window.removeEventListener('tpp:tracking-mode-changed', handler);
  }, [dismissed]);

  // Dev preview — force-open regardless of dismissed state
  useEffect(() => {
    const forceOpen = () => {
      setDismissed(false);
      setOpen(true);
    };
    window.addEventListener('tpp:show-upgrade-checklist', forceOpen);
    return () => window.removeEventListener('tpp:show-upgrade-checklist', forceOpen);
  }, []);

  const handleDismiss = () => {
    setOpen(false);
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {}
  };

  const handleNavigate = (path) => {
    if (path === '__open_pip__') {
      openPipChat({ freshChat: false });
      handleDismiss();
      return;
    }
    if (onNavigate) onNavigate(path);
    handleDismiss();
  };

  if (!open) return null;

  const primary = theme?.primary || '#7F9E95';
  const bg = theme?.isDark
    ? 'rgba(14, 18, 25, 0.97)'
    : '#ffffff';
  const border = theme?.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  const aiEnabled = isFeatureEnabled('ENABLE_AI_RESEARCH');
  const items = [
    ...CHECKLIST_ITEMS,
    ...(aiEnabled
      ? [{
          id: 'ai',
          icon: null,
          isImage: true,
          title: 'P.i.P AI Research',
          desc: 'Use AI to research peptide protocols and answer questions.',
          path: '__open_pip__',
          cta: 'Try P.i.P',
        }]
      : []),
  ];

  return (
    <div className="fixed inset-0 z-[10060] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleDismiss}
      />

      {/* Sheet */}
      <div
        className="relative w-full max-w-md mx-auto rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
        style={{ backgroundColor: bg, border: `1px solid ${border}`, maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between p-5 pb-3"
          style={{ borderBottom: `1px solid ${border}` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${primary}20` }}
            >
              <Rocket size={22} weight="duotone" style={{ color: primary }} />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight" style={{ color: theme?.text }}>
                Advanced Mode Unlocked
              </h2>
              <p className="text-xs mt-0.5" style={{ color: theme?.textLight }}>
                Here's what's new — add data at your own pace.
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-xl transition-opacity hover:opacity-70 ml-2 flex-shrink-0"
            style={{ color: theme?.textLight }}
            aria-label="Dismiss"
          >
            <X size={18} />
          </button>
        </div>

        {/* Checklist */}
        <div className="p-4 space-y-2">
          {items.map(({ id, icon: Icon, isImage, title, desc, path, cta }) => (
            <div
              key={id}
              className="flex items-center gap-3 p-3 rounded-2xl"
              style={{
                backgroundColor: theme?.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                border: `1px solid ${border}`,
              }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                style={{ backgroundColor: isImage ? 'transparent' : `${primary}15` }}
              >
                {isImage
                  ? <img src={pipIcon} alt="P.i.P" className="w-9 h-9 rounded-xl object-cover" />
                  : <Icon size={18} weight="duotone" style={{ color: primary }} />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-tight" style={{ color: theme?.text }}>
                  {title}
                </p>
                <p className="text-[11px] mt-0.5 leading-snug" style={{ color: theme?.textLight }}>
                  {desc}
                </p>
              </div>
              <button
                onClick={() => handleNavigate(path)}
                className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
                style={{
                  backgroundColor: `${primary}20`,
                  color: primary,
                  border: `1px solid ${primary}30`,
                }}
              >
                {cta}
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 pb-5 pt-1 flex justify-center">
          <button
            onClick={handleDismiss}
            className="text-sm font-medium px-6 py-2.5 rounded-xl transition-all active:scale-95"
            style={{
              backgroundColor: primary,
              color: theme?.textOnPrimary || '#fff',
            }}
          >
            Got it — explore Advanced mode
          </button>
        </div>
      </div>
    </div>
  );
}
