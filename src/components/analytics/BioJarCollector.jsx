import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { Flask, ArrowClockwise, X } from '@phosphor-icons/react';
import { getStockHistory } from '../../utils/stockHistory';
import {
  getPurposeIconColor,
  inferPurposeIconFromCompound,
} from '../../utils/protocolPurposeIcons';

const MAX_ANIMATED = 60; // Up to 60 items in the jar

function resolveJarColor(name, purposeIcon) {
  if (purposeIcon) return getPurposeIconColor(purposeIcon);
  const inferred = inferPurposeIconFromCompound(name || '');
  return getPurposeIconColor(inferred || 'research');
}

function formatMg(mg, unit = 'mg') {
  if (mg == null || mg === '') return null;
  return `${mg}${unit || 'mg'}`;
}

function formatDate(iso) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return null;
  }
}

function hash01(str, salt = 0) {
  let h = salt * 374761393 + 13;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 2654435761);
  }
  return ((h >>> 0) % 10000) / 10000;
}

export function buildCollectorJars(stockpile = [], history = []) {
  const jars = [];

  for (const item of stockpile || []) {
    const qty = Math.max(0, Math.floor(parseFloat(item.quantity) || 0));
    if (qty === 0) continue;
    const color = resolveJarColor(item.name, item.purposeIcon);
    const baseId = item.id || `${item.name}-${item.mg}-${item.vendor || ''}`;
    for (let i = 0; i < qty; i++) {
      jars.push({
        id: `owned-${baseId}-${i}`,
        name: item.name || 'Unknown',
        mg: item.mg,
        mgUnit: item.mgUnit || 'mg',
        vendor: item.vendor || '',
        date: item.date || item.purchaseDate || null,
        status: 'owned',
        color,
      });
    }
  }

  for (const ev of history || []) {
    const type = ev?.type;
    if (!type) continue;

    const color = resolveJarColor(ev.name, ev.purposeIcon);
    const prev = Number(ev.prevQty);
    const next = Number(ev.nextQty);

    if (type === 'out_of_stock') {
      const n = Math.max(1, Math.floor(Number.isFinite(prev) && prev > 0 ? prev : 1));
      const baseId = ev.id || `oos-${ev.date}-${ev.name}-${ev.mg}`;
      for (let i = 0; i < n; i++) {
        jars.push({
          id: `depleted-${baseId}-${i}`,
          name: ev.name || 'Unknown',
          mg: ev.mg,
          mgUnit: ev.mgUnit || 'mg',
          vendor: ev.vendor || '',
          date: ev.date || null,
          status: 'depleted',
          color,
        });
      }
      continue;
    }

    if ((type === 'used' || type === 'adjust') && Number.isFinite(prev) && Number.isFinite(next) && prev > next && next > 0) {
      const delta = Math.floor(prev - next);
      if (delta <= 0) continue;
      const baseId = ev.id || `${type}-${ev.date}-${ev.name}-${ev.mg}`;
      for (let i = 0; i < delta; i++) {
        jars.push({
          id: `depleted-${baseId}-${i}`,
          name: ev.name || 'Unknown',
          mg: ev.mg,
          mgUnit: ev.mgUnit || 'mg',
          vendor: ev.vendor || '',
          date: ev.date || null,
          status: 'depleted',
          color,
        });
      }
    }
  }

  jars.sort((a, b) => {
    if (a.status !== b.status) return a.status === 'depleted' ? -1 : 1;
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    return da - db;
  });

  return jars;
}

/** Cute, polished mini vial for the pile */
function MiniVial({ color, size = 24, depleted = false }) {
  // A cute, rounded serum vial
  return (
    <svg width={size} height={size * 1.4} viewBox="0 0 24 34" fill="none" aria-hidden="true" style={{ overflow: 'visible' }}>
      <g opacity={depleted ? 0.6 : 1}>
        {/* Metal Crimp Cap */}
        <rect x="6" y="2" width="12" height="6" rx="2" fill="#E2E8F0" />
        <rect x="6" y="2" width="12" height="6" rx="2" fill="url(#metalShine)" opacity="0.8" />
        {/* Neck */}
        <rect x="8" y="8" width="8" height="3" fill="#CBD5E1" />
        
        {/* Glass Body */}
        <rect x="4" y="11" width="16" height="21" rx="6" fill={color} opacity={depleted ? 0.4 : 0.85} />
        {/* Inner Liquid/Shadow */}
        {!depleted && <rect x="5.5" y="14" width="13" height="16.5" rx="4" fill={color} />}
        
        {/* Glass Glare */}
        <path d="M7 15 L7 28" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" />
        <ellipse cx="16" cy="14" rx="2" ry="3" fill="rgba(255,255,255,0.4)" transform="rotate(15 16 14)" />
      </g>
      <defs>
        <linearGradient id="metalShine" x1="6" y1="2" x2="18" y2="8" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#94A3B8" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.5" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** Elegant glass apothecary jar */
function ElegantJarShell({ theme, children }) {
  const isDark = theme?.isDark;
  const glass = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.4)';
  const stroke = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(15,23,42,0.1)';
  const highlight = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.7)';

  // Jar path for clipping the vials inside
  // An elegant, straight-walled beaker with a rounded bottom
  const jarPath = "M 40 100 L 40 250 A 20 20 0 0 0 60 270 L 140 270 A 20 20 0 0 0 160 250 L 160 100 Z";
  
  return (
    <div className="relative mx-auto" style={{ width: '100%', maxWidth: 260, aspectRatio: '200 / 280' }}>
      
      {/* Vials inside the jar */}
      <div
        className="absolute inset-0 z-[1] overflow-hidden"
        style={{ clipPath: `path("${jarPath}")` }}
      >
        {children}
      </div>

      {/* Glass overlay */}
      <svg
        className="absolute inset-0 z-[2] pointer-events-none w-full h-full drop-shadow-xl"
        viewBox="0 0 200 280"
        fill="none"
        aria-hidden="true"
      >
        {/* Cork Stopper */}
        <path d="M 75 25 L 125 25 L 120 50 L 80 50 Z" fill="#D4A373" />
        <path d="M 75 25 L 125 25 L 120 50 L 80 50 Z" fill="rgba(0,0,0,0.1)" />
        
        {/* Jar Rim */}
        <rect x="70" y="45" width="60" height="12" rx="6" fill={glass} stroke={stroke} strokeWidth="2" />
        <rect x="76" y="57" width="48" height="15" fill={glass} stroke={stroke} strokeWidth="2" />
        
        {/* Jar Shoulder & Body */}
        <path
          d="M 76 72 C 76 85, 40 90, 40 110 L 40 250 A 20 20 0 0 0 60 270 L 140 270 A 20 20 0 0 0 160 250 L 160 110 C 160 90, 124 85, 124 72 Z"
          fill={glass}
          stroke={stroke}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Front Shine */}
        <path
          d="M 50 115 L 50 240"
          stroke={highlight}
          strokeWidth="6"
          strokeLinecap="round"
          opacity={0.6}
        />
        <path
          d="M 62 110 L 62 250"
          stroke={highlight}
          strokeWidth="2"
          strokeLinecap="round"
          opacity={0.3}
        />
        
        {/* Base shadow/curve */}
        <ellipse cx="100" cy="265" rx="40" ry="4" fill={isDark ? 'rgba(0,0,0,0.4)' : 'rgba(15,23,42,0.06)'} />
      </svg>
    </div>
  );
}

export default function BioJarCollector({ theme, stockpile = [], borderColor, embedded = false }) {
  const reducedMotion = useReducedMotion();
  const [historyVersion, setHistoryVersion] = useState(0);
  const [selected, setSelected] = useState(null);
  const [playKey, setPlayKey] = useState(0);
  const [animDone, setAnimDone] = useState(false);
  const tipRef = useRef(null);
  const rootRef = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const bump = () => setHistoryVersion((v) => v + 1);
    window.addEventListener('tpp:stockpile-history-updated', bump);
    window.addEventListener('storage', bump);
    return () => {
      window.removeEventListener('tpp:stockpile-history-updated', bump);
      window.removeEventListener('storage', bump);
    };
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const history = useMemo(() => {
    void historyVersion;
    return getStockHistory();
  }, [historyVersion]);

  const jars = useMemo(
    () => buildCollectorJars(stockpile, history),
    [stockpile, history],
  );

  const stats = useMemo(() => {
    const depleted = jars.filter((j) => j.status === 'depleted').length;
    const owned = jars.filter((j) => j.status === 'owned').length;
    const compounds = new Set(jars.map((j) => (j.name || '').toLowerCase().trim()).filter(Boolean)).size;
    return { depleted, owned, total: jars.length, compounds };
  }, [jars]);

  const animated = useMemo(() => {
    if (jars.length <= MAX_ANIMATED) return jars;
    const half = Math.floor(MAX_ANIMATED / 2);
    return [...jars.slice(0, half), ...jars.slice(-half)];
  }, [jars]);

  // Hex-like packing layout from bottom to top
  const laidOut = useMemo(() => {
    return animated.map((jar, i) => {
      // Jar interior: X from 40 to 160 (width 120). Y from 270 up to 100.
      const colsPerRow = 6;
      const rowIdx = Math.floor(i / colsPerRow);
      const colIdx = i % colsPerRow;
      
      const isOffset = rowIdx % 2 === 1;
      const rowCols = isOffset ? colsPerRow - 1 : colsPerRow;
      const actualCol = Math.min(colIdx, rowCols - 1);
      
      const vialW = 16;
      const vialH = 22;
      
      // X spread: evenly space `rowCols` items across 100px of interior
      const startX = 50 + (isOffset ? (100 / colsPerRow) / 2 : 0);
      const spacingX = 100 / colsPerRow;
      
      const baseX = startX + actualCol * spacingX;
      // Y from bottom (265) moving up
      const baseY = 260 - rowIdx * (vialH * 0.8);
      
      // Add organic jitter
      const jitterX = (hash01(jar.id, 1) - 0.5) * 6;
      const jitterY = (hash01(jar.id, 2) - 0.5) * 4;
      
      // Gentle tilt so it looks like a resting pile
      const rot = (hash01(jar.id, 3) - 0.5) * 40;
      
      // Drop physics
      const fallFromX = baseX + (hash01(jar.id, 4) - 0.5) * 40;

      return {
        ...jar,
        x: baseX + jitterX,
        y: baseY + jitterY,
        rotate: rot,
        delay: reducedMotion ? 0 : 0.1 + i * 0.07,
        fallFromX,
        z: i,
        size: 20 + hash01(jar.id, 5) * 4,
      };
    });
  }, [animated, reducedMotion]);

  useEffect(() => {
    if (!inView || reducedMotion || laidOut.length === 0) {
      setAnimDone(true);
      return undefined;
    }
    setAnimDone(false);
    const t = setTimeout(
      () => setAnimDone(true),
      Math.min(8000, 600 + laidOut.length * 70),
    );
    return () => clearTimeout(t);
  }, [inView, playKey, laidOut.length, reducedMotion]);

  const replay = useCallback(() => {
    setSelected(null);
    setAnimDone(false);
    setPlayKey((k) => k + 1);
  }, []);

  const dismissTip = useCallback(() => setSelected(null), []);

  useEffect(() => {
    if (!selected) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') dismissTip();
    };
    const onPointer = (e) => {
      if (tipRef.current && !tipRef.current.contains(e.target)) dismissTip();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
    };
  }, [selected, dismissTip]);

  const isDark = theme?.isDark;
  const cardBg = theme?.cardBackground || (isDark ? 'rgba(15,23,42,0.6)' : '#fff');
  const border = borderColor || theme?.border || (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)');

  if (jars.length === 0) {
    return (
      <div
        ref={rootRef}
        className={embedded ? 'py-4 text-center' : 'rounded-xl border p-6 text-center'}
        style={embedded ? undefined : { borderColor: border, backgroundColor: cardBg }}
      >
        <div className="opacity-70 mb-2">
          <ElegantJarShell theme={theme} />
        </div>
        <p className="text-sm font-semibold" style={{ color: theme?.text }}>
          Empty collector
        </p>
        <p className="text-xs mt-1 px-4" style={{ color: theme?.textLight }}>
          Vials you stock and finish will drop into this jar — a visual of your research trail.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={embedded ? 'relative' : 'rounded-xl border p-4 relative'}
      style={embedded ? undefined : { borderColor: border, backgroundColor: cardBg }}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        {!embedded ? (
          <div>
            <h3 className="text-sm font-bold flex items-center gap-1.5" style={{ color: theme?.text }}>
              <Flask size={16} weight="duotone" style={{ color: theme?.primary }} />
              Bio Jar Collector
            </h3>
            <p className="text-xs mt-0.5" style={{ color: theme?.textLight }}>
              {stats.total} vial{stats.total === 1 ? '' : 's'} dropped in · {stats.compounds} compound
              {stats.compounds === 1 ? '' : 's'}
            </p>
          </div>
        ) : (
          <p className="text-xs pr-2" style={{ color: theme?.textLight }}>
            Vials fall into the jar — {stats.total} collected · {stats.compounds} compounds
          </p>
        )}
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
              color: theme?.textLight,
            }}
          >
            {stats.depleted} used
          </span>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: `${theme?.primary || '#7F9E95'}22`,
              color: theme?.primary,
            }}
          >
            {stats.owned} stocked
          </span>
          <button
            type="button"
            onClick={replay}
            className="p-1.5 rounded-lg transition-transform active:scale-90"
            style={{
              color: theme?.primary,
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : `${theme?.primary}14`,
            }}
            aria-label="Replay drop animation"
            title="Replay"
          >
            <ArrowClockwise size={14} weight="bold" />
          </button>
        </div>
      </div>

      <ElegantJarShell theme={theme}>
        {inView &&
          laidOut.map((jar) => (
            <div
              key={`${playKey}-${jar.id}`}
              className="absolute"
              style={{
                // Convert SVG viewBox coordinates (200x280) to percentages for absolute positioning
                left: `${(jar.x / 200) * 100}%`,
                top: `${(jar.y / 280) * 100}%`,
                zIndex: selected?.id === jar.id ? 99 : jar.z,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <motion.button
                type="button"
                className="p-0 border-0 bg-transparent cursor-pointer touch-manipulation block"
                initial={
                  reducedMotion
                    ? { opacity: 1, y: 0, x: 0, rotate: jar.rotate, scale: 1 }
                    : {
                        opacity: 0,
                        y: -300,
                        x: jar.fallFromX - jar.x,
                        rotate: jar.rotate - 60,
                        scale: 0.8,
                      }
                }
                animate={{
                  opacity: 1,
                  y: 0,
                  x: 0,
                  rotate: jar.rotate,
                  scale: selected?.id === jar.id ? 1.2 : 1,
                }}
                transition={
                  reducedMotion
                    ? { duration: 0 }
                    : {
                        type: 'spring',
                        stiffness: 200,
                        damping: 18,
                        mass: 1.2,
                        delay: jar.delay,
                      }
                }
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected((prev) => (prev?.id === jar.id ? null : jar));
                }}
                aria-label={`${jar.name} ${formatMg(jar.mg, jar.mgUnit) || ''}`}
              >
                <span
                  className="block"
                  style={{
                    filter:
                      selected?.id === jar.id
                        ? `drop-shadow(0 0 10px ${jar.color})`
                        : 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))',
                  }}
                >
                  <MiniVial
                    color={jar.color}
                    size={jar.size}
                    depleted={jar.status === 'depleted'}
                  />
                </span>
              </motion.button>
            </div>
          ))}
      </ElegantJarShell>

      {jars.length > MAX_ANIMATED && (
        <p className="text-[10px] text-center mt-1" style={{ color: theme?.textLight }}>
          Showing {laidOut.length} of {jars.length} vials in the pile
        </p>
      )}

      <motion.div
        className="flex justify-center mt-1"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: animDone || reducedMotion ? 1 : 0.35, y: 0 }}
      >
        <div
          className="px-3 py-1 rounded-full text-xs font-bold"
          style={{
            backgroundColor: isDark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.9)',
            color: theme?.text,
            border: `1px solid ${theme?.primary}55`,
            boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
          }}
        >
          {stats.total} in the jar
        </div>
      </motion.div>

      <AnimatePresence>
        {selected && (
          <motion.div
            ref={tipRef}
            role="dialog"
            aria-label="Vial details"
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="absolute left-2 right-2 bottom-2 z-20 rounded-xl border p-3 shadow-lg"
            style={{
              backgroundColor: isDark ? 'rgba(15,23,42,0.97)' : '#fff',
              borderColor: `${selected.color}66`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <MiniVial color={selected.color} size={36} depleted={selected.status === 'depleted'} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold truncate" style={{ color: theme?.text }}>
                    {selected.name}
                  </p>
                  <button
                    type="button"
                    aria-label="Close"
                    onClick={dismissTip}
                    className="p-0.5 rounded"
                    style={{ color: theme?.textLight }}
                  >
                    <X size={14} weight="bold" />
                  </button>
                </div>
                <p className="text-xs mt-0.5" style={{ color: selected.color }}>
                  {selected.status === 'depleted' ? 'Gone through' : 'On hand'}
                  {formatMg(selected.mg, selected.mgUnit) ? ` · ${formatMg(selected.mg, selected.mgUnit)}` : ''}
                </p>
                {(selected.vendor || formatDate(selected.date)) && (
                  <p className="text-[11px] mt-1 truncate" style={{ color: theme?.textLight }}>
                    {[selected.vendor, formatDate(selected.date)].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
