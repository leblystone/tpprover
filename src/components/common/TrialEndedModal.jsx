import React from 'react';
import { Sparkle } from '@phosphor-icons/react';
import { ArrowRight, Lock, Unlock, FlaskConical } from 'lucide-react';

const STORAGE_KEY = 'tpp_trial_ended_modal_v1';

/** Returns the localStorage key scoped to a specific user */
export function trialEndedModalKey(uid) {
  return uid ? `${STORAGE_KEY}_${uid}` : STORAGE_KEY;
}

/** Mark the modal as shown for this user so it never fires again */
export function markTrialEndedModalShown(uid) {
  try {
    localStorage.setItem(trialEndedModalKey(uid), 'true');
  } catch { /* ignore */ }
}

/** Returns true if the modal has already been shown for this user */
export function hasSeenTrialEndedModal(uid) {
  try {
    return localStorage.getItem(trialEndedModalKey(uid)) === 'true';
  } catch { return false; }
}

const FREE_INCLUDES = [
  'Your protocols & history — all preserved',
  'Stockpile tracking (up to 10 items)',
  'Core dashboard & settings',
  'Data export at any time',
];

const LOCKED_FEATURES = [
  'AI Research assistant',
  'Buddy System',
  'Community Directory',
  'Premium themes & cloud sync',
  'Advanced analytics',
];

export default function TrialEndedModal({ open, onClose, onSubscribe, theme }) {
  if (!open) return null;

  const handleSubscribe = () => {
    onClose();
    if (onSubscribe) onSubscribe();
  };

  const overlay = {
    position: 'fixed',
    inset: 0,
    zIndex: 99999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    backgroundColor: 'rgba(0,0,0,0.55)',
    backdropFilter: 'blur(4px)',
  };

  const card = {
    width: '100%',
    maxWidth: '440px',
    borderRadius: '20px',
    overflow: 'hidden',
    backgroundColor: theme.cardBackground,
    boxShadow: '0 24px 64px rgba(0,0,0,0.28)',
    border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={card} onClick={e => e.stopPropagation()}>

        {/* Gold header strip */}
        <div style={{
          background: 'linear-gradient(135deg, #B8822A 0%, #D4A030 35%, #F0CC60 50%, #D4A030 65%, #A87020 100%)',
          padding: '16px 20px 14px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Glisten sweep */}
          <style>{`
            @keyframes teMdlGlisten {
              0%   { transform: translateX(-120%) skewX(-15deg); opacity: 0; }
              10%  { opacity: 1; }
              50%  { transform: translateX(120%) skewX(-15deg); opacity: 1; }
              52%  { opacity: 0; }
              100% { transform: translateX(120%) skewX(-15deg); opacity: 0; }
            }
            .te-mdl-glisten {
              position: absolute; inset: 0; pointer-events: none;
              background: linear-gradient(105deg, transparent 25%, rgba(255,255,255,0.45) 47%, rgba(255,255,255,0.65) 50%, rgba(255,255,255,0.45) 53%, transparent 75%);
              animation: teMdlGlisten 4s ease-in-out infinite;
            }
          `}</style>
          <div className="te-mdl-glisten" aria-hidden="true" />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
              <Sparkle size={13} weight="fill" style={{ color: '#3A2B10' }} />
              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#3A2B10', opacity: 0.7 }}>
                Trial Complete
              </span>
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#3A2B10', margin: 0, lineHeight: 1.2 }}>
              Your free trial has wrapped up
            </h2>
            <p style={{ fontSize: '12px', color: '#3A2B10', opacity: 0.65, marginTop: '4px', marginBottom: 0 }}>
              You&rsquo;re now on the free plan — your data is right where you left it.
            </p>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px' }}>

          {/* Two-column: free keeps / locked */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>

            <div style={{
              borderRadius: '10px',
              padding: '11px',
              backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
                <Unlock size={11} style={{ color: theme.primary }} />
                <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: theme.primary }}>
                  Still yours
                </span>
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {FREE_INCLUDES.map(item => (
                  <li key={item} style={{ fontSize: '11px', color: theme.text, opacity: 0.7, display: 'flex', alignItems: 'flex-start', gap: '4px', lineHeight: 1.3 }}>
                    <span style={{ color: theme.primary, flexShrink: 0 }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div style={{
              borderRadius: '10px',
              padding: '11px',
              backgroundColor: theme.isDark ? 'rgba(212,160,48,0.05)' : 'rgba(212,160,48,0.05)',
              border: `1px solid ${theme.isDark ? 'rgba(212,160,48,0.15)' : 'rgba(212,160,48,0.18)'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
                <Lock size={11} style={{ color: '#D4A030' }} />
                <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#D4A030' }}>
                  Research+
                </span>
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {LOCKED_FEATURES.map(item => (
                  <li key={item} style={{ fontSize: '11px', color: theme.text, opacity: 0.55, display: 'flex', alignItems: 'flex-start', gap: '4px', lineHeight: 1.3 }}>
                    <span style={{ color: '#D4A030', opacity: 0.7, flexShrink: 0 }}>✦</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            <button
              onClick={handleSubscribe}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '7px',
                background: 'linear-gradient(135deg, #B8822A 0%, #D4A030 40%, #E8C050 60%, #D4A030 80%, #A87020 100%)',
                color: '#3A2B10',
                fontWeight: 700,
                fontSize: '13px',
                boxShadow: '0 2px 10px rgba(184,138,62,0.3)',
              }}
            >
              <FlaskConical size={14} />
              View Research+ Plans
              <ArrowRight size={13} />
            </button>
            <button
              onClick={onClose}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '10px',
                border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                cursor: 'pointer',
                background: 'transparent',
                color: theme.text,
                opacity: 0.5,
                fontWeight: 500,
                fontSize: '12px',
              }}
            >
              Continue on free plan
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
