import React, { useState, useEffect, useMemo } from 'react';
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

function VerticalSyringe({ units, primary, isDark }) {
  const MAX = units > 50 ? 100 : 50;
  const clamped = Math.min(Math.max(units, 0), MAX);
  const fillRatio = clamped / MAX;

  const [fillH, setFillH] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setFillH(fillRatio * 140), 100);
    return () => clearTimeout(t);
  }, [fillRatio]);

  const majorStep = MAX === 50 ? 10 : 20;
  const minorStep = MAX === 50 ? 5 : 10;
  const ticks = [];
  for (let u = 0; u <= MAX; u += minorStep) ticks.push({ u, isMajor: u % majorStep === 0 });

  const barY = 45;
  const barH = 140;
  const barW = 32;
  const barX = 39;
  const targetY = barY + barH - fillH;

  return (
    <svg viewBox="0 0 120 240" width="85" style={{ display: 'block', overflow: 'visible', filter: isDark ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.4))' : 'drop-shadow(0 6px 12px rgba(0,0,0,0.06))' }}>
      <defs>
        <linearGradient id="syringeBarrel" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={isDark ? '#334155' : '#f1f5f9'} />
          <stop offset="20%" stopColor={isDark ? '#475569' : '#ffffff'} />
          <stop offset="80%" stopColor={isDark ? '#334155' : '#f8fafc'} />
          <stop offset="100%" stopColor={isDark ? '#1e293b' : '#e2e8f0'} />
        </linearGradient>
        <linearGradient id="liquidFill" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={primary} stopOpacity="0.6" />
          <stop offset="50%" stopColor={primary} stopOpacity="0.8" />
          <stop offset="100%" stopColor={primary} stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id="plungerRod" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#d1d5db" />
          <stop offset="50%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#9ca3af" />
        </linearGradient>
      </defs>

      {/* Plunger Push Button */}
      <g style={{ transform: `translateY(${targetY - barY}px)`, transition: 'transform 0.9s cubic-bezier(0.34,1.2,0.64,1)' }}>
        <rect x={barX - 6} y="5" width={barW + 12} height="8" rx="4" fill={isDark ? '#94a3b8' : '#e2e8f0'} stroke={isDark ? '#475569' : '#cbd5e1'} strokeWidth="1" />
        {/* Plunger Rod */}
        <rect x={barX + 8} y="13" width={barW - 16} height={barY + barH + 10} fill="url(#plungerRod)" />
        <line x1={barX + barW/2} y1="13" x2={barX + barW/2} y2="150" stroke="#fff" strokeWidth="2" opacity="0.6" />
        {/* Rubber Stopper */}
        <path d={`M${barX+1} ${barY} Q${barX+barW/2} ${barY-4} ${barX+barW-1} ${barY} L${barX+barW-1} ${barY+8} L${barX+1} ${barY+8} Z`} fill="#334155" />
        <rect x={barX + 1} y={barY + 8} width={barW - 2} height="4" fill="#1e293b" />
      </g>

      {/* Syringe Barrel (Background) */}
      <rect x={barX} y={barY} width={barW} height={barH} rx="2" fill="url(#syringeBarrel)" stroke={isDark ? '#475569' : '#cbd5e1'} strokeWidth="1.5" />

      {/* Syringe Flange (Finger grips) */}
      <rect x={barX - 10} y={barY} width={barW + 20} height="10" rx="3" fill="url(#syringeBarrel)" stroke={isDark ? '#475569' : '#cbd5e1'} strokeWidth="1" />

      {/* Liquid Fill */}
      <rect x={barX + 2} y={barY + barH - fillH} width={barW - 4} height={Math.max(0, fillH)} rx="1"
        fill="url(#liquidFill)" style={{ transition: 'height 0.9s cubic-bezier(0.34,1.2,0.64,1), y 0.9s cubic-bezier(0.34,1.2,0.64,1)' }} />

      {/* Shine overlay for glass effect */}
      <rect x={barX + 4} y={barY + 2} width="4" height={barH - 4} rx="2" fill="#ffffff" opacity="0.4" />

      {/* Needle Hub */}
      <path d={`M${barX+6} ${barY+barH} L${barX+barW-6} ${barY+barH} L${barX+barW/2+4} ${barY+barH+14} L${barX+barW/2-4} ${barY+barH+14} Z`} fill={isDark ? '#cbd5e1' : '#f1f5f9'} stroke={isDark ? '#94a3b8' : '#cbd5e1'} strokeWidth="1" />
      
      {/* Needle */}
      <line x1={barX + barW / 2} y1={barY + barH + 14} x2={barX + barW / 2} y2={barY + barH + 36} stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />

      {/* Tick Marks & Labels */}
      {ticks.map(({ u, isMajor }) => {
        const y = barY + barH - (u / MAX) * barH;
        return (
          <g key={u}>
            <line x1={barX} y1={y} x2={barX + (isMajor ? 10 : 6)} y2={y}
              stroke={isDark ? '#94a3b8' : '#475569'} strokeWidth={isMajor ? 2 : 1} />
            {isMajor && (
              <text x={barX - 6} y={y + 3} textAnchor="end" fontSize="10" fill={isDark ? '#cbd5e1' : '#334155'}
                fontWeight="800" fontFamily="Helvetica,Arial,sans-serif">{u}</text>
            )}
          </g>
        );
      })}

      {/* Target Level Indicator (Floating Badge) */}
      {clamped > 0 && (
        <g style={{ transform: `translateY(${targetY - barY}px)`, transition: 'transform 0.9s cubic-bezier(0.34,1.2,0.64,1)' }}>
          <line x1={barX} y1={barY} x2={barX + barW + 12} y2={barY} stroke={primary} strokeWidth="3" strokeDasharray="4 2">
            <animate attributeName="stroke-dashoffset" from="12" to="0" dur="1s" repeatCount="indefinite" />
          </line>
          <path d={`M${barX+barW+12} ${barY} L${barX+barW+18} ${barY-10} L${barX+barW+42} ${barY-10} L${barX+barW+42} ${barY+10} L${barX+barW+18} ${barY+10} Z`} fill={primary} />
          <text x={barX + barW + 30} y={barY + 3.5} textAnchor="middle" fontSize="11" fontWeight="900"
            fill="#ffffff" fontFamily="Helvetica,Arial,sans-serif">{Math.round(clamped)}</text>
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
    <svg width="90" height="130" viewBox="0 0 100 130" style={{ display: 'block', overflow: 'visible', filter: isDark ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.4))' : 'drop-shadow(0 6px 12px rgba(0,0,0,0.06))' }}>
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
          <VerticalSyringe units={units} primary={primary} isDark={isDark} />
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
  const MAX = units > 50 ? 100 : 50;
  const clamped = Math.min(Math.max(units, 0), MAX);
  const [fillW, setFillW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setFillW((clamped / MAX) * 100), 100);
    return () => clearTimeout(t);
  }, [clamped, MAX]);

  const majorStep = MAX === 50 ? 10 : 20;
  const minorStep = MAX === 50 ? 5 : 10;
  const ticks = [];
  for (let u = 0; u <= MAX; u += minorStep) ticks.push({ u, isMajor: u % majorStep === 0 });

  const W = 260, H = 60;
  const rulerX = 10, rulerY = 8, rulerW = W - 20, rulerH = 28;
  const fillPx = (clamped / MAX) * rulerW;
  const targetX = rulerX + fillPx;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', maxWidth: 340, overflow: 'visible' }}>
      <defs>
        <linearGradient id="hBarrel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={isDark ? '#334155' : '#f8fafc'} />
          <stop offset="40%" stopColor={isDark ? '#475569' : '#ffffff'} />
          <stop offset="100%" stopColor={isDark ? '#1e293b' : '#e2e8f0'} />
        </linearGradient>
        <linearGradient id="hLiquid" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={primary} stopOpacity="0.85" />
          <stop offset="100%" stopColor={primary} stopOpacity="0.5" />
        </linearGradient>
        <clipPath id="barrelClip">
          <rect x={rulerX} y={rulerY} width={rulerW} height={rulerH} rx="4" />
        </clipPath>
      </defs>

      {/* Barrel */}
      <rect x={rulerX} y={rulerY} width={rulerW} height={rulerH} rx="4" fill="url(#hBarrel)" stroke={isDark ? '#475569' : '#cbd5e1'} strokeWidth="1.5" />

      {/* Liquid fill */}
      <rect x={rulerX + 1} y={rulerY + 1} width={Math.max(0, fillPx - 2)} height={rulerH - 2} rx="3"
        fill="url(#hLiquid)"
        style={{ transition: 'width 0.9s cubic-bezier(0.34,1.2,0.64,1)' }}
        clipPath="url(#barrelClip)"
      />

      {/* Shine */}
      <rect x={rulerX + 2} y={rulerY + 2} width={rulerW - 4} height="5" rx="2" fill="#fff" opacity="0.35" />

      {/* Tick marks */}
      {ticks.map(({ u, isMajor }) => {
        const x = rulerX + (u / MAX) * rulerW;
        return (
          <g key={u}>
            <line x1={x} y1={rulerY + rulerH} x2={x} y2={rulerY + rulerH + (isMajor ? 8 : 4)}
              stroke={isDark ? '#94a3b8' : '#64748b'} strokeWidth={isMajor ? 1.5 : 0.8} />
            {isMajor && (
              <text x={x} y={rulerY + rulerH + 18} textAnchor="middle" fontSize="9"
                fill={isDark ? '#cbd5e1' : '#475569'} fontWeight="700" fontFamily="Helvetica,Arial,sans-serif">{u}</text>
            )}
          </g>
        );
      })}

      {/* Plunger */}
      <rect x={rulerX - 6} y={rulerY - 4} width="8" height={rulerH + 8} rx="3"
        fill={isDark ? '#94a3b8' : '#e2e8f0'} stroke={isDark ? '#475569' : '#cbd5e1'} strokeWidth="1" />

      {/* Target indicator */}
      {clamped > 0 && (
        <g style={{ transform: `translateX(${fillPx}px)`, transition: 'transform 0.9s cubic-bezier(0.34,1.2,0.64,1)' }}>
          <line x1={rulerX} y1={rulerY - 2} x2={rulerX} y2={rulerY + rulerH + 2}
            stroke={primary} strokeWidth="2.5" strokeDasharray="3 2">
            <animate attributeName="stroke-dashoffset" from="10" to="0" dur="0.8s" repeatCount="indefinite" />
          </line>
          {/* Floating badge above */}
          <path d={`M${rulerX - 22} ${rulerY - 22} L${rulerX + 22} ${rulerY - 22} L${rulerX + 22} ${rulerY - 8} L${rulerX + 6} ${rulerY - 8} L${rulerX} ${rulerY - 2} L${rulerX - 6} ${rulerY - 8} L${rulerX - 22} ${rulerY - 8} Z`}
            fill={primary} />
          <text x={rulerX} y={rulerY - 12} textAnchor="middle" fontSize="11" fontWeight="900"
            fill="#fff" fontFamily="Helvetica,Arial,sans-serif">{Math.round(clamped)}</text>
        </g>
      )}

      {/* Needle hub + needle */}
      <rect x={rulerX + rulerW} y={rulerY + 6} width="12" height={rulerH - 12} rx="2"
        fill={isDark ? '#cbd5e1' : '#f1f5f9'} stroke={isDark ? '#94a3b8' : '#cbd5e1'} strokeWidth="1" />
      <line x1={rulerX + rulerW + 12} y1={rulerY + rulerH / 2} x2={rulerX + rulerW + 20} y2={rulerY + rulerH / 2}
        stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
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
      return hasUnits ? `Draw to ${Math.round(units)} on ${MAX}U syringe` : 'Enter your dose above';
    }
    if (method === 'pen') return hasUnits ? `Dial to ${Math.round(units)} units` : 'Enter your dose above';
    if (method === 'nasal') {
      const sc = doseUnit === 'sprays' ? Number(doseValue) || 0 : (hasUnits ? Math.ceil(units / 10) : 0);
      return sc > 0 ? `${sc} spray${sc !== 1 ? 's' : ''} per dose` : 'Enter your dose above';
    }
    if (method === 'topical') return hasUnits ? `Apply ${Math.round(units)} units` : 'Enter your dose above';
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
        className="w-full rounded-2xl p-4"
        style={{
          background: isDark
            ? `linear-gradient(135deg, ${primary}22 0%, ${primary}10 100%)`
            : `linear-gradient(135deg, ${primary}12 0%, ${primary}06 100%)`,
          border: `1.5px solid ${primary}35`,
          boxShadow: `0 4px 24px -4px ${primary}25`,
        }}
      >
        {/* Header Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: hasUnits ? primary : `${primary}50` }} />
            <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: primary }}>
              {method === 'pen' ? 'Dial' : method === 'nasal' ? 'Spray' : method === 'topical' ? 'Apply' : 'Draw'}
            </span>
          </div>
          <div className="flex items-center gap-2">
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

        {/* Main Action Text */}
        <p className="text-[13px] font-semibold mb-3 leading-snug" style={{ color: isDark ? '#e2e8f0' : '#1e293b', opacity: hasUnits ? 1 : 0.5 }}>
          {getActionLabel()}
        </p>

        {/* Syringe Ruler (syringe/pipette only) */}
        {(method === 'pipette' || method === 'syringe') && (
          <div className="w-full flex items-center justify-center" style={{ opacity: hasUnits ? 1 : 0.4 }}>
            <HorizontalSyringe units={units} primary={primary} isDark={isDark} />
          </div>
        )}

        {/* Pen Dial */}
        {method === 'pen' && (
          <div className="flex items-center gap-4">
            <div style={{ opacity: hasUnits ? 1 : 0.4 }}>
              <PenDial units={units} primary={primary} isDark={isDark} />
            </div>
            {hasUnits && (
              <div className="flex flex-col gap-1">
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

        {/* Nasal Spray */}
        {method === 'nasal' && (() => {
          const sc = doseUnit === 'sprays' ? Number(doseValue) || 0 : (hasUnits ? Math.ceil(units / 10) : 0);
          return (
            <div className="flex items-center gap-4">
              <div style={{ opacity: sc > 0 ? 1 : 0.4 }}>
                <SprayCounter sprays={sc > 0 ? sc : 2} primary={primary} isDark={isDark} />
              </div>
              {sc > 0 && (
                <div className="flex flex-col gap-1">
                  <div className="text-[11px] font-semibold opacity-60" style={{ color: primary }}>Technique</div>
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
