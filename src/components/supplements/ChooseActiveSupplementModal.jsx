import React from 'react';
import { Shield, Lock } from 'lucide-react';

/**
 * ChooseActiveSupplementModal
 *
 * mode="choose" — when free-plan cap is enforced and user has >1 active supplements.
 * mode="resume" — when active slot opens and held supplements exist (optional dismiss).
 */
export default function ChooseActiveSupplementModal({ supplements, theme, onChoose, mode = 'choose' }) {
  const [selected, setSelected] = React.useState(null);
  const isResumeMode = mode === 'resume';

  const title = isResumeMode ? 'Your Supplement Slot is Open' : 'Choose Your Active Supplement';
  const subtitle = isResumeMode ? 'Free plan · slot available' : 'Free plan · 1 active supplement allowed';
  const description = isResumeMode
    ? 'Pick a held supplement to resume, or close this and keep your slot open.'
    : 'You have multiple active supplements. Pick one to keep scheduled — the rest will be held until you upgrade. Your data is never deleted.';
  const confirmLabel = isResumeMode ? 'Resume This Supplement' : 'Keep This Supplement Active';

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{
          backgroundColor: theme.surface || theme.cardBackground,
          border: `1px solid ${theme.border}`,
        }}
      >
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${theme.primary}20` }}
            >
              {isResumeMode
                ? <Lock size={20} style={{ color: theme.primary }} />
                : <Shield size={20} style={{ color: theme.primary }} />
              }
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight" style={{ color: theme.text }}>
                {title}
              </h2>
              <p className="text-xs" style={{ color: theme.textLight }}>{subtitle}</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: theme.textLight }}>
            {description}
          </p>
        </div>

        <div className="px-4 pb-2 space-y-2 max-h-64 overflow-y-auto">
          {supplements.map(s => {
            const isSelected = selected === s.id;
            const label = s.name || 'Unnamed Supplement';
            const sub = [s.dose, s.unit].filter(Boolean).join(' ');
            return (
              <button
                key={s.id}
                onClick={() => setSelected(s.id)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left"
                style={{
                  backgroundColor: isSelected
                    ? `${theme.primary}18`
                    : theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                  border: `2px solid ${isSelected ? (theme.primary || '#7F9E95') : (theme.border || 'transparent')}`,
                }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${theme.primary}22` }}
                >
                  <span style={{ color: theme.primary, fontSize: 14, fontWeight: 800 }}>
                    {label[0]?.toUpperCase?.() || 'S'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: theme.text }}>
                    {label}
                  </p>
                  <p className="text-xs truncate" style={{ color: theme.textLight }}>
                    {sub ? `Dose ${sub}` : 'Active'}
                  </p>
                </div>
                {isSelected && (
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: theme.primary }}
                  >
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path
                        d="M1.5 4L3.5 6L8.5 1.5"
                        stroke="white"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="px-6 py-4 border-t" style={{ borderColor: theme.border }}>
          <button
            onClick={() => selected && onChoose(selected)}
            disabled={!selected}
            className="w-full py-3 rounded-xl text-sm font-bold transition-all"
            style={{
              backgroundColor: selected ? theme.primary : theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
              color: selected ? (theme.textOnPrimary || '#fff') : theme.textLight,
              cursor: selected ? 'pointer' : 'not-allowed',
              opacity: selected ? 1 : 0.6,
            }}
          >
            {selected ? confirmLabel : 'Select a supplement above'}
          </button>
          {isResumeMode && (
            <button
              onClick={() => onChoose(null)}
              className="w-full mt-2 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-70"
              style={{ color: theme.textLight }}
            >
              Close — I'll pick later
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

