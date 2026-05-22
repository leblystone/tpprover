import React from 'react';

const MESSAGES = [
  'Wrangling your tickets…',
  'Fetching the goods…',
  'Almost there…',
  'Loading up the queue…',
  'Getting everything ready…',
];

const styles = `
  @keyframes al-bounce {
    0%, 80%, 100% { transform: translateY(0) scale(1); opacity: 0.9; }
    40%           { transform: translateY(-14px) scale(1.1); opacity: 1; }
  }
  @keyframes al-fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes al-spin {
    0%   { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes al-pulse-ring {
    0%   { transform: scale(0.8); opacity: 0.6; }
    50%  { transform: scale(1.15); opacity: 0.2; }
    100% { transform: scale(0.8); opacity: 0.6; }
  }
  @keyframes al-shimmer {
    0%   { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  .al-dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    animation: al-bounce 1.3s infinite ease-in-out both;
  }
  .al-dot:nth-child(1) { animation-delay: 0s; }
  .al-dot:nth-child(2) { animation-delay: 0.18s; }
  .al-dot:nth-child(3) { animation-delay: 0.36s; }
  .al-wrap {
    animation: al-fadeIn 0.35s ease both;
  }
  .al-ring {
    animation: al-pulse-ring 1.8s ease-in-out infinite;
  }
  .al-icon-spin {
    animation: al-spin 2.4s linear infinite;
    transform-origin: center;
  }
  .al-text-shimmer {
    background: linear-gradient(90deg, #9CA3AF 0%, #6B7280 30%, #4a7c59 50%, #6B7280 70%, #9CA3AF 100%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: al-shimmer 2.2s linear infinite;
  }
`;

export default function AdminLoader({ message, theme, size = 'default' }) {
  const primary = theme?.primary || '#4a7c59';
  const textLight = theme?.textLight || '#6B7280';
  const bg = theme?.cardBackground || '#fff';

  const msg = message ?? MESSAGES[Math.floor(Date.now() / 1000) % MESSAGES.length];
  const isCompact = size === 'compact';
  const padding = isCompact ? '24px 16px' : '56px 24px';

  return (
    <div style={{ padding, textAlign: 'center', backgroundColor: 'transparent' }}>
      <style>{styles.replace(/#4a7c59/g, primary)}</style>
      <div className="al-wrap">

        {/* Animated icon ring */}
        {!isCompact && (
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px' }}>
            {/* Outer pulsing ring */}
            <div className="al-ring" style={{
              position: 'absolute',
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              border: `2px solid ${primary}`,
              opacity: 0.3,
            }} />
            {/* Middle ring */}
            <div className="al-ring" style={{
              position: 'absolute',
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              border: `2px solid ${primary}`,
              opacity: 0.2,
              animationDelay: '0.3s',
            }} />
            {/* Icon */}
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: `${primary}18`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
            }}>
              🌿
            </div>
          </div>
        )}

        {/* Bouncing dots */}
        <div style={{ display: 'flex', gap: '7px', justifyContent: 'center', marginBottom: isCompact ? '8px' : '14px' }}>
          <span className="al-dot" style={{ backgroundColor: primary }} />
          <span className="al-dot" style={{ backgroundColor: primary, opacity: 0.7 }} />
          <span className="al-dot" style={{ backgroundColor: primary, opacity: 0.45 }} />
        </div>

        {/* Message */}
        <p className={isCompact ? '' : 'al-text-shimmer'} style={{
          fontSize: isCompact ? '12px' : '13px',
          fontWeight: '500',
          color: isCompact ? textLight : undefined,
          letterSpacing: '0.01em',
        }}>
          {msg}
        </p>
      </div>
    </div>
  );
}
