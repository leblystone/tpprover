import React, { useState, useEffect } from 'react';
import { X, Clock, Check } from 'lucide-react';
import { recordInjectionSite, getInjectionSiteSuggestions } from '../../utils/injectionTracking';
import { isInjectionSiteTrackingEnabled } from '../../utils/injectionSiteSettings';

function toTitleCase(str) {
  if (!str || typeof str !== 'string') return str;
  return str.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

function getDaysAgo(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.floor((today - d) / (1000 * 60 * 60 * 24));
}

function formatLastUsed(lastUsed) {
  if (!lastUsed) return null;
  const daysAgo = getDaysAgo(lastUsed);
  if (daysAgo === null) return null;
  if (daysAgo === 0) return 'Today';
  if (daysAgo === 1) return 'Yesterday';
  if (daysAgo < 7) return `${daysAgo}d ago`;
  const d = new Date(lastUsed);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Tiny mini-body icon — each zone card contains one of these.
 * The relevant body zone is lit up with a color; the rest is muted.
 */
function BodyZoneIcon({ bodyPart, side, isSelected, recency, theme }) {
  const daysAgo = getDaysAgo(recency);
  const base = theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.09)';

  let zoneColor;
  if (isSelected) {
    zoneColor = theme.primary;
  } else if (daysAgo !== null && daysAgo < 3) {
    zoneColor = '#f59e0b'; // amber — used very recently
  } else if (daysAgo !== null && daysAgo < 7) {
    zoneColor = '#10b981'; // green — used this week
  } else {
    zoneColor = base;
  }

  const leftArm  = side === 'left'  && bodyPart === 'arm';
  const rightArm = side === 'right' && bodyPart === 'arm';
  const leftMid  = side === 'left'  && (bodyPart === 'abdomen' || bodyPart === 'back');
  const rightMid = side === 'right' && (bodyPart === 'abdomen' || bodyPart === 'back');
  const leftLow  = side === 'left'  && (bodyPart === 'thigh'   || bodyPart === 'rear');
  const rightLow = side === 'right' && (bodyPart === 'thigh'   || bodyPart === 'rear');

  return (
    <svg width="42" height="62" viewBox="0 0 42 62">
      {/* Head */}
      <circle cx="21" cy="7" r="6" fill={base} />
      {/* Left upper arm */}
      <rect x="1"  y="15" width="7" height="18" rx="3.5" fill={leftArm  ? zoneColor : base} />
      {/* Right upper arm */}
      <rect x="34" y="15" width="7" height="18" rx="3.5" fill={rightArm ? zoneColor : base} />
      {/* Upper torso bar */}
      <rect x="11" y="14" width="20" height="7" rx="3" fill={base} />
      {/* Mid-left zone (abdomen / lower back) */}
      <rect x="11" y="23" width="9"  height="11" rx="3" fill={leftMid  ? zoneColor : base} />
      {/* Mid-right zone */}
      <rect x="22" y="23" width="9"  height="11" rx="3" fill={rightMid ? zoneColor : base} />
      {/* Lower-left zone (thigh / glute) */}
      <rect x="11" y="36" width="9"  height="16" rx="4" fill={leftLow  ? zoneColor : base} />
      {/* Lower-right zone */}
      <rect x="22" y="36" width="9"  height="16" rx="4" fill={rightLow ? zoneColor : base} />
      {/* Left lower leg */}
      <rect x="11" y="54" width="9" height="7" rx="3" fill={base} />
      {/* Right lower leg */}
      <rect x="22" y="54" width="9" height="7" rx="3" fill={base} />
    </svg>
  );
}

const FRONT_ZONES = [
  { id: 'left arm',      label: 'Left Arm',      bodyPart: 'arm',     side: 'left'  },
  { id: 'right arm',     label: 'Right Arm',     bodyPart: 'arm',     side: 'right' },
  { id: 'left abdomen',  label: 'Left Abdomen',  bodyPart: 'abdomen', side: 'left'  },
  { id: 'right abdomen', label: 'Right Abdomen', bodyPart: 'abdomen', side: 'right' },
  { id: 'left thigh',    label: 'Left Thigh',    bodyPart: 'thigh',   side: 'left'  },
  { id: 'right thigh',   label: 'Right Thigh',   bodyPart: 'thigh',   side: 'right' },
];

const BACK_ZONES = [
  { id: 'left arm',         label: 'Left Arm',        bodyPart: 'arm',  side: 'left'  },
  { id: 'right arm',        label: 'Right Arm',       bodyPart: 'arm',  side: 'right' },
  { id: 'left lower back',  label: 'Left Lower Back', bodyPart: 'back', side: 'left'  },
  { id: 'right lower back', label: 'Right Lower Back',bodyPart: 'back', side: 'right' },
  { id: 'left rear',        label: 'Left Rear',       bodyPart: 'rear', side: 'left'  },
  { id: 'right rear',       label: 'Right Rear',      bodyPart: 'rear', side: 'right' },
];

export default function InjectionSiteSelector({ taskName, task, onConfirm, onCancel, theme, isVisible }) {
  const [selectedSite, setSelectedSite]           = useState('');
  const [customSite, setCustomSite]               = useState('');
  const [suggestions, setSuggestions]             = useState([]);
  const [hasCheckedTracking, setHasCheckedTracking] = useState(false);
  const [viewMode, setViewMode]                   = useState('front');
  const [showOther, setShowOther]                 = useState(false);

  useEffect(() => {
    if (isVisible && !hasCheckedTracking && !isInjectionSiteTrackingEnabled()) {
      setHasCheckedTracking(true);
      onConfirm('');
      return;
    }
    if (isVisible && !hasCheckedTracking) setHasCheckedTracking(true);
    if (!isVisible) {
      setHasCheckedTracking(false);
      setSelectedSite('');
      setCustomSite('');
      setShowOther(false);
      setViewMode('front');
    }
  }, [isVisible, hasCheckedTracking]);

  useEffect(() => {
    if (isVisible && taskName && isInjectionSiteTrackingEnabled()) {
      setSuggestions(getInjectionSiteSuggestions(taskName));
    }
  }, [isVisible, taskName]);

  if (!isVisible) return null;

  const siteRecency = suggestions.reduce((acc, s) => {
    acc[s.site.toLowerCase()] = s.lastUsed;
    return acc;
  }, {});

  const handleConfirm = () => {
    const site = showOther ? customSite.trim() : selectedSite;
    if (task && site) recordInjectionSite(task, site, new Date(), task.time);
    onConfirm(site);
  };

  const handleSkip   = () => { setSelectedSite(''); setCustomSite(''); onConfirm(''); };
  const handleCancel = () => { setSelectedSite(''); setCustomSite(''); onCancel(); };

  const isFormValid = () => showOther ? customSite.trim().length > 0 : selectedSite.length > 0;

  const zones = viewMode === 'front' ? FRONT_ZONES : BACK_ZONES;

  const recencyMeta = (zoneId) => {
    const lastUsed = siteRecency[zoneId];
    const daysAgo  = getDaysAgo(lastUsed);
    const label    = formatLastUsed(lastUsed);
    let color = null;
    if (daysAgo !== null && daysAgo < 3)  color = '#f59e0b';
    else if (daysAgo !== null && daysAgo < 7) color = '#10b981';
    return { label, color };
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 9999, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', backgroundColor: 'rgba(255,255,255,0.4)' }}
      onClick={handleCancel}
    >
      <div
        className="glass-modal rounded-2xl shadow-2xl w-full mx-4 flex flex-col overflow-hidden"
        style={{ maxWidth: 360, maxHeight: '88vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0 px-4 pt-4 pb-3" style={{ borderBottom: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
          <div>
            <p className="text-[10px] uppercase tracking-widest font-semibold mb-0.5" style={{ color: theme.textLight }}>Injection Site</p>
            <h4 className="font-bold text-sm leading-tight" style={{ color: theme.text }}>{taskName}</h4>
          </div>
          <button onClick={handleCancel} className="p-1.5 rounded-full transition-colors hover:bg-black/5" title="Cancel">
            <X size={15} style={{ color: theme.textLight }} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {!showOther ? (
            <div className="px-4 pt-4 pb-2 space-y-3">
              {/* Front / Back Toggle */}
              <div className="flex rounded-xl overflow-hidden p-0.5" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                {['front', 'back'].map(v => (
                  <button
                    key={v}
                    onClick={() => { setViewMode(v); setSelectedSite(''); }}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      backgroundColor: viewMode === v ? (theme.isDark ? 'rgba(255,255,255,0.12)' : '#fff') : 'transparent',
                      color: viewMode === v ? theme.text : theme.textLight,
                      boxShadow: viewMode === v ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                    }}
                  >
                    {v === 'front' ? '▸ Front' : '◂ Back'}
                  </button>
                ))}
              </div>

              {/* Zone Cards Grid */}
              <div className="grid grid-cols-2 gap-2">
                {zones.map(zone => {
                  const isSelected = selectedSite === zone.id;
                  const recency    = siteRecency[zone.id];
                  const { label: recencyLabel, color: recencyColor } = recencyMeta(zone.id);

                  return (
                    <button
                      key={zone.id + viewMode}
                      onClick={() => setSelectedSite(zone.id)}
                      className="flex flex-col items-center rounded-xl px-2 pt-3 pb-2.5 transition-all active:scale-95 relative"
                      style={{
                        border: `2px solid ${isSelected ? theme.primary : recencyColor || (theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)')}`,
                        backgroundColor: isSelected
                          ? (theme.isDark ? theme.primary + '22' : theme.primary + '12')
                          : (theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.7)'),
                        boxShadow: isSelected ? `0 0 0 3px ${theme.primary}22` : 'none',
                      }}
                    >
                      {/* Selected checkmark */}
                      {isSelected && (
                        <div
                          className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: theme.primary }}
                        >
                          <Check size={10} color="#fff" strokeWidth={3} />
                        </div>
                      )}

                      {/* Mini body icon */}
                      <BodyZoneIcon
                        bodyPart={zone.bodyPart}
                        side={zone.side}
                        isSelected={isSelected}
                        recency={recency}
                        theme={theme}
                      />

                      {/* Zone label */}
                      <span
                        className="text-[11px] font-semibold mt-1.5 text-center leading-tight"
                        style={{ color: isSelected ? theme.primary : theme.text }}
                      >
                        {zone.label}
                      </span>

                      {/* Recency badge */}
                      {recencyLabel && (
                        <span
                          className="text-[9px] font-medium mt-0.5 px-1.5 py-0.5 rounded-full"
                          style={{
                            color: recencyColor || theme.textLight,
                            backgroundColor: recencyColor ? recencyColor + '18' : 'transparent',
                          }}
                        >
                          {recencyLabel}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-4 pt-1" style={{ color: theme.textLight }}>
                <div className="flex items-center gap-1 text-[9px]">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
                  <span>Used recently</span>
                </div>
                <div className="flex items-center gap-1 text-[9px]">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10b981' }} />
                  <span>This week</span>
                </div>
              </div>
            </div>
          ) : (
            /* Custom Input Panel */
            <div className="px-4 pt-4 pb-2 space-y-3">
              <p className="text-sm font-medium" style={{ color: theme.text }}>Enter custom injection site:</p>
              <input
                type="text"
                value={customSite}
                onChange={e => setCustomSite(e.target.value)}
                placeholder="e.g. Deltoid, SubQ belly..."
                className="w-full px-3 py-3 rounded-xl text-sm"
                style={{
                  border: `1.5px solid ${theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
                  backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
                  color: theme.text,
                  outline: 'none',
                }}
                onFocus={e => { e.target.style.borderColor = theme.primary; e.target.style.boxShadow = `0 0 0 3px ${theme.primary}22`; }}
                onBlur={e => { e.target.style.borderColor = theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none'; }}
                autoFocus
              />

              {suggestions.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium flex items-center gap-1 mb-2" style={{ color: theme.textLight }}>
                    <Clock size={10} /> Recent
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.map((s, i) => {
                      const label = formatLastUsed(s.lastUsed);
                      return (
                        <button
                          key={i}
                          onClick={() => setCustomSite(s.site)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium border transition-all hover:opacity-80"
                          style={{
                            borderColor: customSite.toLowerCase() === s.site.toLowerCase() ? theme.primary : theme.border,
                            color: theme.text,
                            backgroundColor: customSite.toLowerCase() === s.site.toLowerCase() ? theme.primary + '18' : 'transparent',
                          }}
                        >
                          {toTitleCase(s.site)}{label ? ` · ${label}` : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Switch between Body Map / Custom */}
          <div className="flex justify-center pb-4 px-4">
            <button
              onClick={() => { setShowOther(!showOther); setSelectedSite(''); setCustomSite(''); }}
              className="text-xs font-medium underline underline-offset-2 transition-opacity hover:opacity-70"
              style={{ color: theme.textLight }}
            >
              {showOther ? '← Use Body Map' : 'Custom / Other Site'}
            </button>
          </div>
        </div>

        {/* Selected zone preview bar */}
        {selectedSite && !showOther && (
          <div
            className="px-4 py-2 flex items-center justify-center gap-1.5 text-sm font-semibold"
            style={{
              backgroundColor: theme.primary + '12',
              borderTop: `1px solid ${theme.primary}30`,
              color: theme.primary,
            }}
          >
            <Check size={13} strokeWidth={3} />
            {toTitleCase(selectedSite)}
          </div>
        )}

        {/* Footer */}
        <div
          className="flex-shrink-0 flex gap-2 px-4 py-3"
          style={{ borderTop: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}
        >
          <button
            onClick={handleSkip}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all hover:opacity-80"
            style={{ borderColor: theme.border, color: theme.textLight }}
          >
            Skip
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isFormValid()}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
          >
            Confirm Site
          </button>
        </div>
      </div>
    </div>
  );
}
