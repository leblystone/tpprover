import React, { useState, useEffect, useMemo, useRef } from 'react';
import vialImage from '../../assets/vial.png';
import mauveVialImage from '../../assets/mauve-vial.png';
import taupeVialImage from '../../assets/taupe-vial.png';

/* ═══════════════════════════════════════════════════════════════════════════
   MINI SVG ICONS — exported for delivery method buttons
   ═══════════════════════════════════════════════════════════════════════════ */

export function MiniSyringe({ color = '#6b7280', size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2l4 4-4 4" /><line x1="22" y1="6" x2="10" y2="6" />
      <rect x="2" y="9" width="12" height="6" rx="2" /><line x1="6" y1="9" x2="6" y2="15" />
      <line x1="10" y1="9" x2="10" y2="15" /><line x1="2" y1="12" x2="0" y2="12" />
    </svg>
  );
}
export function MiniPen({ color = '#6b7280', size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="7" y="2" width="10" height="18" rx="3" />
      <line x1="12" y1="18" x2="12" y2="22" /><circle cx="12" cy="7" r="1.5" fill={color} stroke="none" />
    </svg>
  );
}
export function MiniNasal({ color = '#6b7280', size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 20 Q6 10 12 6 Q18 10 18 20" /><rect x="9" y="2" width="6" height="6" rx="2" />
      <line x1="12" y1="8" x2="12" y2="10" />
    </svg>
  );
}
export function MiniTopical({ color = '#6b7280', size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20 Q4 12 12 10 Q20 12 20 20" /><circle cx="12" cy="6" r="3" />
      <path d="M9 10 Q9 8 12 8 Q15 8 15 10" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   FADE-SLIDE utility
   ═══════════════════════════════════════════════════════════════════════════ */

function FadeSlide({ show, delay = 0, children }) {
  return (
    <div style={{
      opacity: show ? 1 : 0,
      transform: show ? 'translateY(0)' : 'translateY(4px)',
      transition: `opacity 0.35s ease ${delay}s, transform 0.35s ease ${delay}s`,
      pointerEvents: show ? 'auto' : 'none',
    }}>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   VERTICAL SYRINGE — mobile-friendly, tall narrow orientation
   ═══════════════════════════════════════════════════════════════════════════ */

function VerticalVolumeGauge({ units, primary, isDark }) {
  const MAX = units > 50 ? 100 : 50;
  const clamped = Math.min(Math.max(units, 0), MAX);
  const fillRatio = clamped / MAX;

  const [fillH, setFillH] = useState(0);
  const [animating, setAnimating] = useState(false);
  const prevClamped = useRef(clamped);

  useEffect(() => {
    if (prevClamped.current !== clamped) {
      setAnimating(false);
      const t1 = setTimeout(() => setAnimating(true), 30);
      const t2 = setTimeout(() => setAnimating(false), 1800);
      prevClamped.current = clamped;
      return () => { clearTimeout(t1); clearTimeout(t2); };
    } else {
      setAnimating(true);
    }
  }, [clamped]);

  useEffect(() => {
    const t = setTimeout(() => setFillH(fillRatio * 140), 100);
    return () => clearTimeout(t);
  }, [fillRatio]);

  const majorStep = MAX === 50 ? 10 : 20;
  const minorStep = MAX === 50 ? 5 : 10;
  const ticks = [];
  for (let u = 0; u <= MAX; u += minorStep) ticks.push({ u, isMajor: u % majorStep === 0 });

  const barY = 20;
  const barH = 140;
  const barW = 36;
  const barX = 35;
  const uid = useRef(`vg${Math.random().toString(36).slice(2, 7)}`).current;

  return (
    <svg viewBox="0 0 110 180" width="85" style={{ display: 'block', overflow: 'visible', filter: isDark ? 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))' : 'drop-shadow(0 6px 16px rgba(0,0,0,0.08))' }}>
      <defs>
        <linearGradient id={`${uid}_barrel`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={isDark ? '#1e293b' : '#f1f5f9'} />
          <stop offset="20%" stopColor={isDark ? '#334155' : '#ffffff'} />
          <stop offset="80%" stopColor={isDark ? '#1e293b' : '#f8fafc'} />
          <stop offset="100%" stopColor={isDark ? '#0f172a' : '#e2e8f0'} />
        </linearGradient>
        <linearGradient id={`${uid}_liquid`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={primary} stopOpacity="0.85" />
          <stop offset="100%" stopColor={primary} stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id={`${uid}_shimmer`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0" />
          <stop offset="40%" stopColor="#fff" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${uid}_clip`}>
          <rect x={barX} y={barY} width={barW} height={barH} rx="18" />
        </clipPath>
        <clipPath id={`${uid}_liquidClip`}>
          <rect x={barX} y={barY + barH - fillH} width={barW} height={Math.max(0, fillH)} />
        </clipPath>
      </defs>

      {/* Outer Glass Capsule */}
      <rect x={barX} y={barY} width={barW} height={barH} rx="18" fill={`url(#${uid}_barrel)`} stroke={isDark ? '#475569' : '#cbd5e1'} strokeWidth="2" />

      {/* Inner Liquid Fill */}
      {clamped > 0 && (
        <rect x={barX + 2} y={barY + barH - fillH + 2} width={barW - 4} height={Math.max(0, fillH - 4)} rx="16"
          fill={`url(#${uid}_liquid)`}
          clipPath={`url(#${uid}_clip)`}
          style={{ transition: 'height 1s cubic-bezier(0.34,1.2,0.64,1), y 1s cubic-bezier(0.34,1.2,0.64,1)' }}
        />
      )}

      {/* Bubbles */}
      {clamped > 8 && [
        { cx: barX + barW * 0.3, r: 2.5, dur: '2.1s', delay: '0s' },
        { cx: barX + barW * 0.7, r: 1.8, dur: '1.7s', delay: '0.6s' },
        { cx: barX + barW * 0.5, r: 3.2, dur: '2.4s', delay: '0.2s' },
      ].map(({ cx, r, dur, delay }, i) => (
        <circle key={i} cx={cx} cy={barY + barH - r} r={r} fill="white" opacity="0" clipPath={`url(#${uid}_clip)`}>
          <animate attributeName="cy" values={`${barY + barH};${barY};${barY + barH}`} dur={dur} begin={delay} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;0.4;0.4;0" dur={dur} begin={delay} repeatCount="indefinite" />
        </circle>
      ))}

      {/* Shimmer sweep */}
      {clamped > 0 && (
        <rect x={barX + 2} y={barY + barH - fillH + 2} width={barW - 4} height={Math.max(0, fillH - 4)} rx="16"
          fill={`url(#${uid}_shimmer)`} clipPath={`url(#${uid}_liquidClip)`}
          style={{ transition: 'height 1s cubic-bezier(0.34,1.2,0.64,1), y 1s cubic-bezier(0.34,1.2,0.64,1)' }}>
          {animating && (
            <animateTransform attributeName="transform" type="translate"
              from={`0 ${fillH}`} to={`0 ${-fillH - 40}`} dur="1s" begin="0s" fill="freeze" />
          )}
        </rect>
      )}

      {/* Glass Highlight */}
      <rect x={barX + 4} y={barY + 4} width="5" height={barH - 8} rx="2.5" fill="#ffffff" opacity="0.3" clipPath={`url(#${uid}_clip)`} />

      {/* Tick marks & Labels */}
      {ticks.map(({ u, isMajor }) => {
        const y = barY + barH - (u / MAX) * barH;
        return (
          <g key={u}>
            <line x1={barX - (isMajor ? 8 : 4)} y1={y} x2={barX} y2={y} stroke={isDark ? '#94a3b8' : '#94a3b8'} strokeWidth={isMajor ? 2 : 1} />
            {isMajor && (
              <text x={barX - 12} y={y + 3} textAnchor="end" fontSize="10" fill={isDark ? '#cbd5e1' : '#64748b'} fontWeight="700" fontFamily="Helvetica,Arial,sans-serif">{u}</text>
            )}
          </g>
        );
      })}

      {/* Target indicator */}
      {clamped > 0 && (
        <g style={{ transform: `translateY(${barY + barH - fillH}px)`, transition: 'transform 1s cubic-bezier(0.34,1.2,0.64,1)' }}>
          <line x1={barX - 4} y1="0" x2={barX + barW + 4} y2="0" stroke={primary} strokeWidth="2.5" strokeDasharray="4 2">
            <animate attributeName="stroke-dashoffset" from="12" to="0" dur="0.8s" repeatCount="indefinite" />
          </line>
          <path d={`M${barX + barW + 4} 0 L${barX + barW + 12} -7 L${barX + barW + 36} -7 L${barX + barW + 36} 7 L${barX + barW + 12} 7 Z`} fill={primary} />
          <text x={barX + barW + 24} y="3.5" textAnchor="middle" fontSize="10" fontWeight="900" fill="#fff" fontFamily="Helvetica,Arial,sans-serif">{Math.round(clamped)}</text>
        </g>
      )}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PEN DIAL
   ═══════════════════════════════════════════════════════════════════════════ */

function PenDial({ units, primary, isDark }) {
  const MAX = units > 50 ? 100 : 60;
  const clamped = Math.min(Math.max(units, 0), MAX);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setProgress(clamped / MAX), 100);
    return () => clearTimeout(t);
  }, [clamped, MAX]);

  return (
    <svg width="90" height="130" viewBox="0 0 100 130" style={{ display: 'block', overflow: 'visible', transform: 'scaleX(-1)', filter: isDark ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.4))' : 'drop-shadow(0 6px 12px rgba(0,0,0,0.06))' }}>
      <defs>
        <linearGradient id="penBody" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={isDark ? '#334155' : '#e2e8f0'} />
          <stop offset="20%" stopColor={isDark ? '#475569' : '#ffffff'} />
          <stop offset="80%" stopColor={isDark ? '#334155' : '#f8fafc'} />
          <stop offset="100%" stopColor={isDark ? '#1e293b' : '#cbd5e1'} />
        </linearGradient>
        <linearGradient id="dialGrip" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={primary} />
          <stop offset="50%" stopColor={primary} stopOpacity="0.8" />
          <stop offset="100%" stopColor={primary} stopOpacity="0.6" />
        </linearGradient>
      </defs>

      {/* Pen Body */}
      <rect x="20" y="30" width="60" height="100" rx="6" fill="url(#penBody)" stroke={isDark ? '#475569' : '#94a3b8'} strokeWidth="1" />
      
      {/* Dial Grip (Top) */}
      <path d="M20 30 L80 30 L80 10 Q50 0 20 10 Z" fill="url(#dialGrip)" />
      {/* Ribs on grip */}
      <line x1="30" y1="12" x2="30" y2="30" stroke="#ffffff" strokeWidth="2" opacity="0.4" strokeLinecap="round"/>
      <line x1="40" y1="10" x2="40" y2="30" stroke="#ffffff" strokeWidth="2" opacity="0.4" strokeLinecap="round"/>
      <line x1="50" y1="8" x2="50" y2="30" stroke="#ffffff" strokeWidth="2" opacity="0.4" strokeLinecap="round"/>
      <line x1="60" y1="10" x2="60" y2="30" stroke="#ffffff" strokeWidth="2" opacity="0.4" strokeLinecap="round"/>
      <line x1="70" y1="12" x2="70" y2="30" stroke="#ffffff" strokeWidth="2" opacity="0.4" strokeLinecap="round"/>

      {/* Display Window Frame */}
      <rect x="30" y="55" width="40" height="36" rx="4" fill={isDark ? '#0f172a' : '#f1f5f9'} stroke={isDark ? '#475569' : '#cbd5e1'} strokeWidth="2" />
      
      {/* Inner Shadow for window */}
      <rect x="30" y="55" width="40" height="6" rx="4" fill="#000000" opacity="0.1" />

      {/* The Number */}
      <text x="50" y="81" textAnchor="middle" fontSize="24" fontWeight="900" fill={primary} fontFamily="Helvetica,Arial,sans-serif">
        {Math.round(clamped)}
      </text>
      
      {/* Arrow Indicator */}
      <path d="M15 73 L24 68 L24 78 Z" fill={primary} />
      
      {/* Shine overlay */}
      <rect x="25" y="32" width="6" height="96" rx="3" fill="#ffffff" opacity="0.5" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SPRAY COUNTER
   ═══════════════════════════════════════════════════════════════════════════ */

function SprayCounter({ sprays, primary, isDark }) {
  const count = Math.min(sprays, 12);
  const [show, setShow] = useState(0);
  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => { i++; setShow(i); if (i >= count) clearInterval(iv); }, 120);
    return () => clearInterval(iv);
  }, [count]);

  return (
    <svg width="85" height="130" viewBox="0 0 100 130" style={{ display: 'block', overflow: 'visible', filter: isDark ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.4))' : 'drop-shadow(0 6px 12px rgba(0,0,0,0.06))' }}>
      <defs>
        <linearGradient id="bottleBody" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={isDark ? '#334155' : '#e2e8f0'} />
          <stop offset="20%" stopColor={isDark ? '#475569' : '#ffffff'} />
          <stop offset="80%" stopColor={isDark ? '#334155' : '#f8fafc'} />
          <stop offset="100%" stopColor={isDark ? '#1e293b' : '#cbd5e1'} />
        </linearGradient>
      </defs>

      {/* Spray Mist (Animated) */}
      {Array.from({ length: show }).map((_, i) => {
        const dx = Math.sin((i / count) * Math.PI - Math.PI/2) * (20 + Math.random()*15);
        const dy = Math.cos((i / count) * Math.PI - Math.PI/2) * (30 + Math.random()*20);
        return (
          <circle key={i} cx={50 + dx} cy={30 - dy} r={2 + Math.random()*4} fill={primary} opacity={0.6 - (i*0.03)}>
            <animate attributeName="cy" values={`${30-dy};${10-dy}`} dur="1.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values={`${0.6};0`} dur="1.5s" repeatCount="indefinite" />
          </circle>
        );
      })}

      {/* Spray Tip */}
      <path d="M42 30 L58 30 L54 10 L46 10 Z" fill={isDark ? '#cbd5e1' : '#f1f5f9'} stroke={isDark ? '#475569' : '#cbd5e1'} strokeWidth="1" />
      
      {/* Bottle Neck */}
      <rect x="35" y="30" width="30" height="15" rx="3" fill="url(#bottleBody)" stroke={isDark ? '#475569' : '#94a3b8'} strokeWidth="1" />
      
      {/* Bottle Body */}
      <path d="M25 60 Q25 45 35 45 L65 45 Q75 45 75 60 L80 130 L20 130 Z" fill="url(#bottleBody)" stroke={isDark ? '#475569' : '#94a3b8'} strokeWidth="1" />

      {/* Label area on bottle */}
      <rect x="30" y="60" width="40" height="50" rx="4" fill={primary} opacity="0.1" stroke={primary} strokeWidth="1" />
      <text x="50" y="85" textAnchor="middle" fontSize="22" fontWeight="900" fill={primary} fontFamily="Helvetica,Arial,sans-serif">
        {count}
      </text>
      <text x="50" y="100" textAnchor="middle" fontSize="8" fontWeight="700" fill={primary} opacity="0.7" fontFamily="Helvetica,Arial,sans-serif" textTransform="uppercase">
        Sprays
      </text>

      {/* Shine overlay */}
      <path d="M28 65 Q28 50 35 50 L40 50 L40 120 L25 120 Z" fill="#ffffff" opacity="0.3" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   AUTO-SCALE TEXT — shrinks font to fit container width
   ═══════════════════════════════════════════════════════════════════════════ */

function AutoText({ text, maxFontSize, minFontSize, maxWidth, style = {}, className = '' }) {
  const len = text?.length || 0;
  const scale = len <= 6 ? 1 : len <= 10 ? 0.85 : len <= 14 ? 0.7 : 0.6;
  const fs = Math.max(minFontSize, Math.round(maxFontSize * scale));
  return (
    <div className={className} style={{
      ...style,
      fontSize: `${fs}px`,
      maxWidth, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    }}>
      {text}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MINI VIAL LABEL — compact reference shown in 2-col layout
   ═══════════════════════════════════════════════════════════════════════════ */

function MiniVialLabel({ peptideName, currentMg, mgUnit, concentration, primary }) {
  return (
    <div className="flex flex-col items-center text-center gap-0.5 mt-1">
      <AutoText text={peptideName} maxFontSize={11} minFontSize={7} maxWidth={70}
        className="font-bold leading-tight" style={{ color: '#374151' }} />
      {currentMg && (
        <div className="text-[9px] font-bold" style={{ color: primary }}>{currentMg}{mgUnit}</div>
      )}
      {concentration && (
        <div className="text-[7px] font-semibold" style={{ color: '#9ca3af' }}>{concentration}</div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   DOSE VISUAL — hero element for each delivery method
   ═══════════════════════════════════════════════════════════════════════════ */

function DoseVisual({ method, route, calc, form, primary, theme }) {
  const units = calc?.unitsPerDose || 0;
  const isDark = theme?.isDark || false;
  const firstPeptide = form?.peptides?.[0];
  const doseUnit = firstPeptide?.doseUnit || 'mcg';
  const doseValue = firstPeptide?.dose || '';
  const hasUnits = units > 0;

  if (method === 'syringe' || method === 'pipette') {
    const MAX = hasUnits ? (units > 50 ? 100 : 50) : 50;
    return (
      <div className="flex flex-col items-center">
        <p className="text-[10px] font-semibold text-center mb-1.5" style={{ color: primary, opacity: hasUnits ? 1 : 0.4 }}>
          {hasUnits
            ? <>Draw to <span className="font-black text-sm">{Math.round(units)}</span> on {MAX}U</>
            : 'Waiting for dose…'}
        </p>
        <div style={{ opacity: hasUnits ? 1 : 0.5 }}>
          <VerticalVolumeGauge units={units} primary={primary} isDark={isDark} />
        </div>
        {route && hasUnits && (
          <span className="text-[8px] font-bold uppercase tracking-widest mt-2 px-2.5 py-0.5 rounded-full"
            style={{ backgroundColor: `${primary}15`, color: primary }}>
            {route === 'subq' ? 'SubQ' : route === 'im' ? 'IM' : 'IV'}
          </span>
        )}
      </div>
    );
  }

  if (method === 'pen') {
    return (
      <div className="flex flex-col items-center">
        <p className="text-[10px] font-semibold text-center mb-1.5" style={{ color: primary, opacity: hasUnits ? 1 : 0.4 }}>
          {hasUnits
            ? <>Dial to <span className="font-black text-sm">{Math.round(units)}</span> units</>
            : 'Waiting for dose…'}
        </p>
        <div style={{ opacity: hasUnits ? 1 : 0.5 }}>
          <PenDial units={units} primary={primary} isDark={isDark} />
        </div>
        {hasUnits && (
          <p className="text-[8px] font-bold uppercase tracking-widest opacity-50 mt-2" style={{ color: primary }}>
            Dial &middot; inject &middot; recap
          </p>
        )}
      </div>
    );
  }

  if (method === 'nasal') {
    const sc = doseUnit === 'sprays' ? Number(doseValue) || 0 : (hasUnits ? Math.ceil(units / 10) : 0);
    return (
      <div className="flex flex-col items-center">
        <p className="text-[10px] font-semibold text-center mb-1.5" style={{ color: primary, opacity: sc > 0 ? 1 : 0.4 }}>
          {sc > 0
            ? <><span className="font-black text-sm">{sc}</span> spray{sc !== 1 ? 's' : ''}</>
            : 'Waiting for dose…'}
        </p>
        <div style={{ opacity: sc > 0 ? 1 : 0.5 }}>
          <SprayCounter sprays={sc > 0 ? sc : 3} primary={primary} isDark={isDark} />
        </div>
        {sc > 0 && (
          <p className="text-[8px] font-bold uppercase tracking-widest opacity-50 mt-2" style={{ color: primary }}>Alternate nostrils</p>
        )}
      </div>
    );
  }

  if (method === 'topical') {
    return (
      <div className="flex flex-col items-center justify-center py-2">
        <p className="text-[10px] font-semibold text-center" style={{ color: primary, opacity: hasUnits ? 1 : 0.4 }}>
          {hasUnits
            ? <>Apply <span className="font-black text-sm">{Math.round(units)}</span> units</>
            : 'Waiting for dose…'}
        </p>
      </div>
    );
  }

  return null;
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   Two modes:
   1. ENTRY MODE (no delivery or entering vial info) — centered vial
   2. DOSAGE MODE (delivery selected) — 2-col: mini vial left, dose visual right
   ═══════════════════════════════════════════════════════════════════════════ */

export default function VialLabelPreview({
  form,
  deliveryMethod,
  administrationRoute,
  penType,
  penColor,
  theme,
  currentPeptideIndex = 0,
  compact = false,
  shareCard = false,
  calc = null,
}) {
  const getVialImage = () => {
    if (theme.name === 'Mauve' || theme.name === 'Pearlescent') return mauveVialImage;
    if (theme.name === 'Taupe') return taupeVialImage;
    return vialImage;
  };

  const currentPeptide = form.peptides?.[currentPeptideIndex];
  const currentMg = currentPeptide?.mg || '';
  const mgUnit = currentPeptide?.mgUnit || 'mg';
  const peptideName = currentPeptide?.name || '';
  const vendor = currentPeptide?.vendor || '';
  const water = form?.water || '';

  const getElementSymbol = () => {
    if (!peptideName) return '';
    if (peptideName.length < 4) return peptideName[0].toUpperCase();
    return peptideName[0].toUpperCase() + peptideName[3].toLowerCase();
  };

  const elementSymbol = getElementSymbol();
  const primary = theme.primary || '#3b82f6';
  const hasCalc = calc && calc.unitsPerDose > 0;
  const hasDelivery = !!deliveryMethod && deliveryMethod !== '';

  const concentration = (currentMg && water && Number(water) > 0)
    ? `${currentMg}${mgUnit} / ${water}ml`
    : null;

  // Always show centered vial — dosing result card is rendered separately in the panel
  const vialWidth = shareCard ? 240 : compact ? 120 : 220;

  return (
    <div className="flex flex-col items-center w-full gap-1">
      <div className="relative" style={{ width: vialWidth, maxWidth: '100%' }}>
        {hasCalc && (
          <div className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              boxShadow: `0 0 25px 4px ${primary}20, 0 0 60px 8px ${primary}10`,
              transition: 'box-shadow 0.8s ease', zIndex: 0,
            }}
          />
        )}
        <img src={getVialImage()} alt="Vial" className="relative h-auto select-none w-full"
          style={{
            filter: hasCalc ? 'drop-shadow(0 10px 24px rgba(0,0,0,0.16))' : 'drop-shadow(0 6px 14px rgba(0,0,0,0.1))',
            transition: 'filter 0.6s ease', zIndex: 1,
          }}
          draggable={false}
        />

        {/* Label overlay */}
        <div className="absolute flex flex-col items-center text-center"
          style={{
            top: '42%', left: '53%', transform: 'translateX(-50%)',
            width: '85%', minHeight: '38%', zIndex: 2, padding: '0 6px',
          }}>
          <FadeSlide show={!!elementSymbol}>
            {elementSymbol && (
              <div className="relative border rounded mb-0.5"
                style={{
                  borderColor: primary, backgroundColor: '#f3f4f6',
                  fontFamily: 'Helvetica,Arial,sans-serif',
                  padding: compact ? '2px' : '4px',
                  width: compact ? 22 : 32,
                }}>
                <div className="font-bold absolute" style={{
                  color: primary, fontSize: compact ? '0.28rem' : '0.4rem',
                  top: 1, left: 1,
                }}>{currentMg}{mgUnit}</div>
                <div className="font-black text-center leading-none" style={{
                  color: primary, fontFamily: 'Helvetica,Arial,sans-serif',
                  fontSize: compact ? '0.5rem' : '0.8rem', paddingTop: 2,
                }}>{elementSymbol}</div>
              </div>
            )}
          </FadeSlide>

          <FadeSlide show={!!vendor} delay={0.05}>
            <div className="font-semibold mb-0.5 w-full leading-tight overflow-hidden"
              style={{
                color: '#9ca3af', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontSize: compact ? '0.5rem' : '0.7rem',
              }}>
              {vendor.toUpperCase().slice(0, 15)}
            </div>
          </FadeSlide>

          <FadeSlide show={!!peptideName} delay={0.1}>
            <AutoText text={peptideName}
              maxFontSize={compact ? 10 : 14} minFontSize={compact ? 6 : 9}
              maxWidth={compact ? 90 : 170}
              className="font-bold mb-0.5 w-full"
              style={{ color: '#374151', lineHeight: '1.3' }} />
          </FadeSlide>

          <FadeSlide show={!!currentMg} delay={0.15}>
            <div className="font-bold" style={{
              color: theme.primaryDark || primary, lineHeight: '1',
              fontSize: compact ? '0.55rem' : '0.8rem',
            }}>{currentMg}{mgUnit}</div>
          </FadeSlide>

          <FadeSlide show={!!concentration} delay={0.2}>
            <div className="font-semibold mt-0.5 tracking-wide"
              style={{ color: '#6b7280', fontSize: compact ? '0.38rem' : '0.5rem' }}>
              {concentration}
            </div>
          </FadeSlide>
        </div>

        {hasCalc && !shareCard && (
          <div className="absolute flex items-center rounded-full"
            style={{
              top: compact ? 2 : 6, right: compact ? -2 : -4,
              backgroundColor: primary, color: '#fff',
              fontSize: compact ? '0.45rem' : '0.55rem',
              fontWeight: 800, letterSpacing: '0.06em',
              padding: compact ? '2px 5px' : '3px 7px',
              gap: 2, boxShadow: `0 2px 8px ${primary}55`, zIndex: 5,
              animation: 'readyPulse 2s ease-in-out 1',
            }}>
            <svg width={compact ? 7 : 9} height={compact ? 7 : 9} viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="#fff" strokeWidth="2" />
              <path d="M5 8l2 2 4-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            READY
          </div>
        )}
      </div>

      <style>{`
        @keyframes readyPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 2px 8px ${primary}55; }
          50% { transform: scale(1.1); box-shadow: 0 4px 16px ${primary}75; }
        }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   HORIZONTAL SYRINGE RULER
   Competitor-style horizontal ruler that slides up below the form
   ═══════════════════════════════════════════════════════════════════════════ */

function HorizontalSyringe({ units, primary, isDark }) {
  /*
   * Clean ruler-only visual — no syringe anatomy.
   * SCALE: 0 at LEFT, MAX at RIGHT (standard left-to-right reading).
   * Fill grows from left as dose increases.
   */
  const MAX = 100;
  const clamped = Math.min(Math.max(units, 0), MAX);
  const fillRatio = clamped / MAX;
  const [animating, setAnimating] = useState(false);
  const prevClamped = useRef(clamped);

  useEffect(() => {
    if (prevClamped.current !== clamped) {
      setAnimating(false);
      const t1 = setTimeout(() => setAnimating(true), 30);
      const t2 = setTimeout(() => setAnimating(false), 1800);
      prevClamped.current = clamped;
      return () => { clearTimeout(t1); clearTimeout(t2); };
    } else {
      setAnimating(true);
    }
  }, [clamped]);

  const uid = useRef(`rl${Math.random().toString(36).slice(2, 7)}`).current;

  const W = 380, H = 52;
  // Ruler track bounds
  const rX1 = 8, rX2 = 372, rW = rX2 - rX1;
  const trackY = 24, trackH = 10;

  // Scale: u → x  (0 → rX1, MAX → rX2)
  const scaleX = u => rX1 + (u / MAX) * rW;
  const fillPx = fillRatio * rW;

  const majorStep = 20;
  const minorStep = 10;
  const ticks = [];
  for (let u = 0; u <= MAX; u += minorStep) ticks.push({ u, isMajor: u % majorStep === 0 });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%"
      style={{ display: 'block', width: '100%', overflow: 'visible' }}>
      <defs>
        <linearGradient id={`${uid}_fill`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor={primary} stopOpacity="0.55" />
          <stop offset="100%" stopColor={primary} stopOpacity="1"   />
        </linearGradient>
        <linearGradient id={`${uid}_shim`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="white" stopOpacity="0"   />
          <stop offset="50%"  stopColor="white" stopOpacity="0.7" />
          <stop offset="100%" stopColor="white" stopOpacity="0"   />
        </linearGradient>
        <clipPath id={`${uid}_fc`}>
          <rect x={rX1} y={trackY} width={fillPx} height={trackH} rx={trackH / 2} />
        </clipPath>
        <clipPath id={`${uid}_tc`}>
          <rect x={rX1} y={trackY} width={rW} height={trackH + 1} />
        </clipPath>
      </defs>

      {/* ── Tick marks + labels (above track) ── */}
      {ticks.map(({ u, isMajor }) => {
        const x = scaleX(u);
        return (
          <g key={u}>
            <line
              x1={x} y1={trackY - 1}
              x2={x} y2={trackY - (isMajor ? 8 : 4)}
              stroke={isDark ? '#94a3b8' : '#64748b'}
              strokeWidth={isMajor ? 1.2 : 0.7}
              opacity={isMajor ? 0.9 : 0.5}
            />
            {isMajor && (
              <text x={x} y={trackY - 12} textAnchor="middle" fontSize="8.5"
                fill={isDark ? '#94a3b8' : '#64748b'}
                fontWeight="700" fontFamily="Helvetica,Arial,sans-serif">{u}</text>
            )}
          </g>
        );
      })}

      {/* ── Track background ── */}
      <rect x={rX1} y={trackY} width={rW} height={trackH} rx={trackH / 2}
        fill={isDark ? '#1e293b' : '#e2e8f0'}
        stroke={isDark ? '#334155' : '#cbd5e1'} strokeWidth="0.8" />

      {/* ── Filled portion ── */}
      {fillPx > 0 && (
        <rect
          x={rX1} y={trackY} width={fillPx} height={trackH} rx={trackH / 2}
          fill={`url(#${uid}_fill)`}
          clipPath={`url(#${uid}_tc)`}
          style={{ transition: 'width 1s cubic-bezier(0.34,1.2,0.64,1)' }}
        />
      )}

      {/* Shimmer sweep on change */}
      {animating && fillPx > 0 && (
        <rect x={rX1} y={trackY} width={fillPx} height={trackH}
          fill={`url(#${uid}_shim)`}
          clipPath={`url(#${uid}_fc)`}>
          <animateTransform attributeName="transform" type="translate"
            from={`${-fillPx} 0`} to={`${fillPx + 40} 0`}
            dur="0.8s" begin="0s" fill="freeze" />
        </rect>
      )}

      {/* ── Target marker line at fill head ── */}
      {clamped > 0 && (
        <g style={{
          transform: `translateX(${fillPx}px)`,
          transition: 'transform 1s cubic-bezier(0.34,1.2,0.64,1)',
        }}>
          <line x1={rX1} y1={trackY - 2} x2={rX1} y2={trackY + trackH + 2}
            stroke={primary} strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
        </g>
      )}

      {/* ── Dose badge (pill, right of fill head, slides with it) ── */}
      {clamped > 0 && (
        <g style={{
          transform: `translateX(${fillPx}px)`,
          transition: 'transform 1s cubic-bezier(0.34,1.2,0.64,1)',
        }}>
          <rect x={rX1 + 5} y={trackY - 1} width="36" height={trackH + 2} rx={(trackH + 2) / 2}
            fill={primary}
            style={{ filter: `drop-shadow(0 2px 6px ${primary}55)` }}>
            {animating && (
              <animateTransform attributeName="transform" type="scale"
                values="0.7;1.1;1" keyTimes="0;0.4;1"
                dur="0.45s" begin="0s" fill="freeze" additive="sum" />
            )}
          </rect>
          <text x={rX1 + 23} y={trackY + trackH - 1.5}
            textAnchor="middle" fontSize="9" fontWeight="900" letterSpacing="-0.3"
            fill="#fff" fontFamily="Helvetica,Arial,sans-serif">
            {Math.round(clamped)}U
          </text>
        </g>
      )}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   HORIZONTAL DOSE CARD — exported for use in ReconCalculatorPanel
   Slides up from below the form when a delivery method is selected
   ═══════════════════════════════════════════════════════════════════════════ */

export function HorizontalDoseCard({ deliveryMethod, administrationRoute, calc, form, theme }) {
  const primary = theme?.primary || '#3b82f6';
  const isDark = theme?.isDark || false;
  const units = calc?.unitsPerDose || 0;
  const dosesPerVial = calc?.dosesPerVial || 0;
  const hasUnits = units > 0;

  const firstPeptide = form?.peptides?.[0];
  const doseUnit = firstPeptide?.doseUnit || 'mcg';
  const doseValue = firstPeptide?.dose || '';
  const method = deliveryMethod;

  const visible = !!method && method !== '';

  const getActionLabel = () => {
    if (method === 'pipette' || method === 'syringe') {
      const MAX = units > 50 ? 100 : 50;
      return hasUnits ? `Draw ${Math.round(units)} Units` : 'Enter your dose above';
    }
    if (method === 'pen') return hasUnits ? `Dial to ${Math.round(units)} units` : 'Enter your dose above';
    if (method === 'nasal') {
      const sc = doseUnit === 'sprays' ? Number(doseValue) || 0 : (hasUnits ? Math.ceil(units / 10) : 0);
      return sc > 0 ? `${sc} spray${sc !== 1 ? 's' : ''} per dose` : 'Enter your dose above';
    }
    if (method === 'topical') {
      const mcgDose = doseValue ? `${doseValue} ${doseUnit}` : null;
      return mcgDose ? `Apply ${mcgDose} per dose` : 'Enter your dose above';
    }
    return 'Enter your dose above';
  };

  const getRouteLabel = () => {
    if (method !== 'pipette' && method !== 'syringe') return null;
    if (!administrationRoute) return null;
    return administrationRoute === 'subq' ? 'SubQ' : administrationRoute === 'im' ? 'IM' : 'IV';
  };

  return (
    <div
      className="w-full overflow-hidden transition-all duration-500"
      style={{
        maxHeight: visible ? '260px' : '0px',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition: 'max-height 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.35s ease, transform 0.35s ease',
      }}
    >
      <div
        className="w-full rounded-xl p-4 border"
        style={{
          background: isDark
            ? `linear-gradient(135deg, ${primary}18 0%, rgba(15,23,42,0.9) 100%)`
            : `linear-gradient(135deg, ${primary}0f 0%, ${theme?.cardBackground || '#fff'} 100%)`,
          borderColor: `${primary}35`,
          boxShadow: isDark
            ? `0 8px 24px -6px rgba(0,0,0,0.4)`
            : `0 4px 16px -4px ${primary}22`,
        }}
      >
        {/* Header Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ backgroundColor: hasUnits ? primary : `${primary}50` }} />
            {method !== 'topical' && (
              <span className="text-[13px] font-semibold leading-snug truncate" style={{ color: isDark ? '#e2e8f0' : '#1e293b', opacity: hasUnits ? 1 : 0.45 }}>
                {getActionLabel()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            {getRouteLabel() && (
              <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${primary}18`, color: primary }}>
                {getRouteLabel()}
              </span>
            )}
            {hasUnits && dosesPerVial > 0 && (
              <span className="text-[9px] font-semibold opacity-60" style={{ color: primary }}>
                {dosesPerVial % 1 === 0 ? dosesPerVial : dosesPerVial.toFixed(1)} doses/vial
              </span>
            )}
          </div>
        </div>

        {/* Syringe Ruler (syringe/pipette only) */}
        {(method === 'pipette' || method === 'syringe') && (
          <div className="w-full flex items-center justify-center" style={{ opacity: hasUnits ? 1 : 0.4 }}>
            <HorizontalSyringe units={units} primary={primary} isDark={isDark} />
          </div>
        )}

        {/* Pen — big dose number + steps */}
        {method === 'pen' && (
          <div className="flex items-center gap-4" style={{ opacity: hasUnits ? 1 : 0.4 }}>
            {/* Dial number badge */}
            <div className="shrink-0 flex flex-col items-center gap-1">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center border-2"
                style={{
                  backgroundColor: isDark ? `${primary}18` : `${primary}12`,
                  borderColor: `${primary}50`,
                  boxShadow: `0 4px 14px -4px ${primary}40`,
                }}
              >
                <span className="text-3xl font-black tabular-nums" style={{ color: primary }}>
                  {hasUnits ? Math.round(units) : '–'}
                </span>
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider opacity-60" style={{ color: primary }}>units</span>
            </div>

            {/* Steps */}
            {hasUnits && (
              <div className="flex flex-col gap-1.5 flex-1">
                <div className="text-[11px] font-semibold opacity-60" style={{ color: primary }}>Step by step</div>
                {['Dial to target units', 'Inject subcutaneously', 'Hold 10 sec, recap'].map((s, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 text-[7px] font-black text-white" style={{ backgroundColor: primary }}>{i + 1}</div>
                    <span className="text-[10px] font-medium" style={{ color: isDark ? '#cbd5e1' : '#334155' }}>{s}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Topical */}
        {method === 'topical' && (
          <div className="flex flex-col gap-1.5">
            <div className="text-[11px] font-semibold opacity-60" style={{ color: primary }}>Application</div>
            {[
              'Clean and dry the target area',
              'Apply a thin layer and massage gently',
              'Wash hands after application',
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 text-[7px] font-black text-white" style={{ backgroundColor: primary }}>{i + 1}</div>
                <span className="text-[10px] font-medium" style={{ color: isDark ? '#cbd5e1' : '#334155' }}>{s}</span>
              </div>
            ))}
          </div>
        )}

        {/* Nasal Spray */}
        {method === 'nasal' && (() => {
          const sc = doseUnit === 'sprays' ? Number(doseValue) || 0 : (hasUnits ? Math.ceil(units / 10) : 0);
          return (
            <div className="flex flex-col items-center gap-2 w-full">
              <div style={{ opacity: sc > 0 ? 1 : 0.4 }}>
                <SprayCounter sprays={sc > 0 ? sc : 2} primary={primary} isDark={isDark} />
              </div>
              {sc > 0 && (
                <div className="flex flex-col items-center gap-1 w-full">
                  <div className="text-[11px] font-semibold opacity-60 text-center" style={{ color: primary }}>Technique</div>
                  {['Tilt head slightly forward', `${sc} spray${sc > 1 ? 's' : ''} — alternate nostrils`, 'Breathe in gently after each spray'].map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 text-[7px] font-black text-white" style={{ backgroundColor: primary }}>{i + 1}</div>
                      <span className="text-[10px] font-medium" style={{ color: isDark ? '#cbd5e1' : '#334155' }}>{s}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
