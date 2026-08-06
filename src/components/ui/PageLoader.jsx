import React from 'react'

const CSS = `
  @keyframes pl-fade-in {
    from { opacity: 0; transform: scale(0.85) translateY(12px); }
    to   { opacity: 1; transform: scale(1)    translateY(0);    }
  }
  @keyframes pl-ring-cw  { to { transform: rotate(360deg);  } }
  @keyframes pl-ring-ccw { to { transform: rotate(-360deg); } }

  @keyframes pl-arc-chase {
    0%   { stroke-dashoffset: 314; }
    50%  { stroke-dashoffset: 65;  }
    100% { stroke-dashoffset: 314; }
  }
  @keyframes pl-arc-inner {
    0%   { stroke-dashoffset: 188; }
    50%  { stroke-dashoffset: 42;  }
    100% { stroke-dashoffset: 188; }
  }
  @keyframes pl-breathe-glow {
    0%, 100% { opacity: .25; transform: scale(.88); }
    50%       { opacity: .5;  transform: scale(1.08); }
  }
  @keyframes pl-tip-pulse {
    0%, 100% { opacity: .8;  transform: scale(1);   }
    50%       { opacity: 1;   transform: scale(1.4); }
  }
  @keyframes pl-dot-bounce {
    0%, 80%, 100% { transform: translateY(0);     opacity: .25; }
    40%            { transform: translateY(-11px); opacity: 1;   }
  }

  .pl-root { animation: pl-fade-in .4s cubic-bezier(.22,.68,0,1.2) both; }
  .pl-ring-cw  { transform-origin: 60px 60px; animation: pl-ring-cw  1.9s linear     infinite; }
  .pl-ring-ccw { transform-origin: 60px 60px; animation: pl-ring-ccw 1.4s linear     infinite; }
  .pl-arc-o    { stroke-dasharray: 314; stroke-linecap: round; animation: pl-arc-chase 1.9s ease-in-out infinite; }
  .pl-arc-i    { stroke-dasharray: 188; stroke-linecap: round; animation: pl-arc-inner 1.4s ease-in-out infinite; }
  .pl-glow     { transform-origin: 60px 60px; animation: pl-breathe-glow 1.8s ease-in-out infinite; }
  .pl-tip      { transform-origin: 60px 10px; animation: pl-tip-pulse    .95s ease-in-out infinite; }
  .pl-d1 { animation: pl-dot-bounce 1.25s ease-in-out infinite 0s;    }
  .pl-d2 { animation: pl-dot-bounce 1.25s ease-in-out infinite .17s;  }
  .pl-d3 { animation: pl-dot-bounce 1.25s ease-in-out infinite .34s;  }
`

export default function PageLoader({ theme, fullScreen = false, message, className = '' }) {
  // Use the darker/more-saturated shade for the main strokes so the loader reads
  // clearly against pale card backgrounds — theme.primary alone is often too light.
  const primary      = theme?.primaryDark  || theme?.primary || '#4E7B71'
  const primaryLight = theme?.primary      || theme?.primaryLight || '#7F9E95'
  const textLight    = theme?.textLight    || '#6B7D7A'
  const background   = theme?.background   || '#F5F5F0'
  const id           = React.useId().replace(/:/g, 'x')

  const gId    = `plg-${id}`
  const glowId = `plgl-${id}`
  const blurId = `plb-${id}`

  return (
    <div
      className={[
        'flex items-center justify-center w-full',
        fullScreen ? 'h-screen' : 'min-h-[50vh]',
        className,
      ].join(' ')}
      style={fullScreen ? { backgroundColor: background } : undefined}
      role="status" aria-live="polite" aria-busy="true"
    >
      <style>{CSS}</style>

      {/* Frosted card gives the loader its own contrast layer */}
      <div
        className="pl-root flex flex-col items-center"
        style={{
          gap: 22,
          backgroundColor: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: 28,
          padding: '36px 44px 30px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.10), 0 1px 0 rgba(255,255,255,0.9) inset',
          border: '1px solid rgba(255,255,255,0.65)',
        }}
      >
        {/* ── Rings SVG ──────────────────────────────── */}
        <svg width="160" height="160" viewBox="0 0 120 120" fill="none" overflow="visible" aria-hidden>
          <defs>
            <linearGradient id={gId} x1="10" y1="10" x2="110" y2="110" gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor={primaryLight} stopOpacity=".9" />
              <stop offset="100%" stopColor={primary} />
            </linearGradient>
            <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor={primary} stopOpacity=".55" />
              <stop offset="100%" stopColor={primary} stopOpacity="0"   />
            </radialGradient>
            <filter id={blurId} x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="3.5" />
            </filter>
          </defs>

          {/* Ambient glow */}
          <circle className="pl-glow" cx="60" cy="60" r="46" fill={`url(#${glowId})`} />

          {/* Outer track */}
          <circle cx="60" cy="60" r="50" stroke={primary} strokeWidth="3" opacity=".3" />
          {/* Outer chasing arc + tip */}
          <g className="pl-ring-cw">
            <circle className="pl-arc-o" cx="60" cy="60" r="50" stroke={`url(#${gId})`} strokeWidth="7" />
            {/* Soft halo behind tip */}
            <circle cx="60" cy="10" r="8" fill={primary} opacity=".25" filter={`url(#${blurId})`} />
            {/* Hard tip dot */}
            <circle className="pl-tip" cx="60" cy="10" r="4.5" fill={primary} />
          </g>

          {/* Inner track */}
          <circle cx="60" cy="60" r="34" stroke={primary} strokeWidth="2.5" opacity=".35" />
          {/* Inner counter-arc + tip */}
          <g className="pl-ring-ccw">
            <circle className="pl-arc-i" cx="60" cy="60" r="34" stroke={primaryLight} strokeWidth="5.5" opacity="1" />
            <circle cx="60" cy="26" r="4" fill={primaryLight} opacity="1" />
          </g>

          {/* Center breathe */}
          <circle cx="60" cy="60" r="15" fill={primary} opacity=".12" />
          <circle cx="60" cy="60" r="9"  fill={primary} opacity=".75">
            <animate attributeName="r"       values="9;13;9"          dur="1.8s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.6;0.95;0.6"    dur="1.8s" repeatCount="indefinite" />
          </circle>
          <circle cx="60" cy="60" r="4.5" fill={primary} opacity="1" />
        </svg>

        {/* ── Bouncing dots ────────────────────────── */}
        <div aria-hidden="true" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {[[1, 'pl-d1'], [0.6, 'pl-d2'], [0.35, 'pl-d3']].map(([op, cls], i) => (
            <span key={i} className={cls} style={{
              display: 'inline-block', width: 9, height: 9,
              borderRadius: '50%', backgroundColor: primary, opacity: op,
            }} />
          ))}
        </div>

        {message
          ? <p style={{ fontSize: 13, fontWeight: 500, color: textLight, margin: 0, letterSpacing: '0.01em' }}>{message}</p>
          : <span className="sr-only">Loading…</span>
        }
      </div>
    </div>
  )
}
