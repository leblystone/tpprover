import React, { useState, useEffect, useRef, startTransition } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  CheckSquare,
  Star,
  HeartHandshake,
  Smartphone,
  Monitor,
  FlaskConical,
  Calendar,
  BarChart3,
  Apple,
  Play,
  Droplet,
  Pen,
  Package,
  ShoppingCart,
  MapPin,
  FileText,
  Share2,
  Shield,
  Calculator,
  BookOpen,
  Layers,
  Pipette,
  Sun,
  Moon,
  SkipBack,
  Pause,
  SkipForward,
  FlaskConicalOff,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import logo from '../assets/tpp_logo.png';
import LandingContactModal from '../components/legal/LandingContactModal';
import LandingFooter from '../components/layout/LandingFooter';
import LandingHeader from '../components/layout/LandingHeader';
import { isNative, isPWAInstalled, isIOS, APP_STORE_IOS_URL } from '../utils/platform';
import { usePageSEO } from '../utils/pageSEO';
import { COVERS } from '../data/products';

const LANDING_PAGE_BG = '#D7E0D9';
/** Neutral cream step for planners section (slightly darker) */
const PAPER_PLANNERS_BG = '#EAE3DB';
/** Inner planners card: warm neutral surface from taupe-family background */
const PHYSICAL_PLANNERS_SURFACE = '#EAE6E3';
/** See it in action — same light grey as hero (#EFF2EE) */
const SEE_IT_IN_ACTION_BG = '#EFF2EE';
/** Footer-derived sage scale: step 3 (darkest content band before CTA/footer) */
const TOOLKIT_BG = '#8FA395';

/* ─── TodaysResearchCard ────────────────────────────────────────────────── */
function TodaysResearchCard({ darkMode, setDarkMode, checkedState, toggleCheck }) {
  const bg = darkMode ? '#1C2421' : '#FFFFFF';
  const headerBg = darkMode
    ? 'linear-gradient(135deg,rgba(127,158,149,0.18),rgba(127,158,149,0.08))'
    : 'linear-gradient(135deg,rgba(127,158,149,0.08),rgba(127,158,149,0.03))';
  const textColor = darkMode ? '#D5E0DC' : '#2F3B3A';
  const subColor = darkMode ? '#8FB0A8' : '#6B7280';

  return (
    <div
      className="rounded-xl overflow-hidden transition-colors duration-300"
      style={{
        backgroundColor: bg,
        boxShadow: darkMode
          ? '0 10px 30px rgba(0,0,0,0.4)'
          : '0 10px 25px rgba(127,158,149,0.15)',
        border: `1px solid ${darkMode ? 'rgba(127,158,149,0.25)' : 'rgba(47,59,58,0.15)'}`,
      }}
    >
      <div
        className="px-4 py-3 flex-shrink-0 relative z-10 widget-separator"
        style={{ borderColor: darkMode ? 'rgba(127,158,149,0.25)' : 'rgba(47,59,58,0.15)', background: headerBg }}
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-bold flex items-center gap-2 truncate" style={{ color: textColor }}>
            Today's Research
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDarkMode((d) => !d)}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110"
              style={{
                backgroundColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(47,59,58,0.06)',
                color: darkMode ? '#FFD166' : '#2F3B3A',
              }}
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
            <CheckSquare className="w-4 h-4 flex-shrink-0" style={{ color: '#7F9E95' }} />
          </div>
        </div>
      </div>
      <div className="p-2 sm:p-4">
        <ul className="space-y-1.5">
          {[
            { id: 'b12', label: 'B12', dose: '1mL', Icon: Pipette, borderColor: 'rgba(127,158,149,0.4)', checkColor: '#7F9E95' },
            { id: 'glow', label: 'GLOW', dose: '16 units', Icon: Pen, borderColor: 'rgba(75,95,88,0.5)', checkColor: '#3d5a4c', dotColor: '#8B5CF6' },
            { id: 'nad', label: 'NAD+', dose: '10 units', Icon: Pipette, borderColor: 'rgba(127,158,149,0.4)', checkColor: '#7F9E95' },
          ].map(({ id, label, dose, Icon, borderColor, checkColor, dotColor }) => (
            <li
              key={id}
              className="flex items-center justify-between gap-2 py-2.5 px-3 min-w-0 transition-all duration-200"
              style={{ borderLeft: `3px solid ${borderColor}` }}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div
                  className={`font-semibold text-sm truncate ${checkedState[id] ? 'line-through decoration-2' : ''}`}
                  style={{ color: checkedState[id] ? subColor : textColor }}
                >
                  {label}
                </div>
              </div>
              <div
                className={`text-right flex items-center gap-1.5 flex-shrink-0 ${checkedState[id] ? 'line-through decoration-2' : ''}`}
                style={{ color: checkedState[id] ? subColor : undefined }}
              >
                <span className="font-medium text-xs whitespace-nowrap" style={{ color: subColor }}>{dose}</span>
                {dotColor && (
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor, opacity: checkedState[id] ? 0.5 : 1 }} />
                )}
                <Icon className="w-3.5 h-3.5" style={{ color: subColor, opacity: checkedState[id] ? 0.5 : 1 }} />
                <button
                  type="button"
                  onClick={() => toggleCheck(id)}
                  className="w-5 h-5 rounded-sm border-2 flex items-center justify-center flex-shrink-0 transition-all hover:scale-110 cursor-pointer touch-manipulation"
                  style={{
                    borderColor: checkedState[id] ? checkColor : 'rgba(127,158,149,0.4)',
                    backgroundColor: checkedState[id] ? checkColor : 'transparent',
                    borderRadius: 4,
                  }}
                >
                  {checkedState[id] && <Check size={14} className="text-white" style={{ strokeWidth: 2.5 }} />}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ─── PeptideCalculatorWidget ───────────────────────────────────────────── */
function ReconstitutionMathWidget() {
  const [bac, setBac] = useState(2);
  const [mg, setMg] = useState(5);
  const [dose, setDose] = useState(250);
  const [activeField, setActiveField] = useState(null);

  const concentration = mg > 0 && bac > 0 ? (mg / bac).toFixed(3) : '—';
  const doseML = mg > 0 && bac > 0 && dose > 0
    ? ((dose / 1000) / (mg / bac)).toFixed(3)
    : '—';

  const demoTimerRef = useRef(null);
  const demoPauseRef = useRef(null);

  useEffect(() => {
    const DEMO_STEPS = [
      { field: 'bac', value: 2 },
      { field: 'mg', value: 5 },
      { field: 'dose', value: 250 },
      { field: 'dose', value: 500 },
      { field: 'mg', value: 10 },
      { field: 'dose', value: 750 },
      { field: 'bac', value: 3 },
      { field: 'mg', value: 5 },
      { field: 'dose', value: 300 },
      { field: 'bac', value: 2 },
      { field: 'dose', value: 250 },
    ];
    const STEP_MS = 750;
    const LOOP_PAUSE_MS = 1600;

    const clearDemoTimers = () => {
      if (demoTimerRef.current) { clearInterval(demoTimerRef.current); demoTimerRef.current = null; }
      if (demoPauseRef.current) { clearTimeout(demoPauseRef.current); demoPauseRef.current = null; }
    };

    const applyStep = ({ field, value }) => {
      setActiveField(field);
      if (field === 'bac') setBac(value);
      if (field === 'mg') setMg(value);
      if (field === 'dose') setDose(value);
    };

    const runDemo = () => {
      clearDemoTimers();
      let idx = 0;
      applyStep(DEMO_STEPS[idx]);
      demoTimerRef.current = setInterval(() => {
        idx += 1;
        if (idx >= DEMO_STEPS.length) {
          clearInterval(demoTimerRef.current);
          demoTimerRef.current = null;
          setActiveField(null);
          demoPauseRef.current = setTimeout(() => { demoPauseRef.current = null; runDemo(); }, LOOP_PAUSE_MS);
          return;
        }
        applyStep(DEMO_STEPS[idx]);
      }, STEP_MS);
    };

    runDemo();
    return () => clearDemoTimers();
  }, []);

  return (
    <div
      className="w-full rounded-xl overflow-hidden transition-all duration-300"
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid rgba(47,59,58,0.12)',
        boxShadow: '0 4px 14px rgba(47,59,58,0.08), 0 12px 36px rgba(47,59,58,0.12)',
      }}
    >
      <div
        className="px-3 py-2.5 flex-shrink-0 relative z-10 widget-separator"
        style={{ borderColor: 'rgba(47,59,58,0.15)', background: 'linear-gradient(135deg,rgba(127,158,149,0.08),rgba(127,158,149,0.03))' }}
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-bold" style={{ color: '#2F3B3A' }}>Peptide Calculator</h3>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold tracking-wide" style={{ color: '#4C6B52', backgroundColor: 'rgba(127,158,149,0.2)' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#7F9E95' }} />
              DEMO
            </span>
            <Calculator className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#7F9E95' }} />
          </div>
        </div>
      </div>
      <div className="px-3 pt-2.5 pb-3">
        {/* Input rows — styled like app inputs, values animate via demo */}
        <div className="space-y-1.5 mb-3">
          {[
            { key: 'bac', label: 'BAC Water', value: bac, unit: 'mL' },
            { key: 'mg', label: 'Peptide', value: mg, unit: 'mg' },
            { key: 'dose', label: 'Dose', value: dose, unit: 'mcg' },
          ].map(({ key, label, value, unit }) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-lg px-2.5 py-2 transition-all duration-300"
              style={{
                backgroundColor: activeField === key ? 'rgba(127,158,149,0.12)' : 'rgba(47,59,58,0.04)',
                border: activeField === key ? '1px solid rgba(127,158,149,0.45)' : '1px solid rgba(47,59,58,0.1)',
              }}
            >
              <span className="text-[10px]" style={{ color: '#6B7D7A' }}>{label}</span>
              <span className="text-xs font-bold tabular-nums" style={{ color: activeField === key ? '#2F665C' : '#2F3B3A' }}>
                {value} <span className="text-[9px] font-normal" style={{ color: '#8AADA8' }}>{unit}</span>
              </span>
            </div>
          ))}
        </div>

        {/* Results */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Concentration', value: `${concentration}`, unit: 'mg/mL' },
            { label: 'Vol / Dose', value: `${doseML}`, unit: 'mL' },
          ].map(({ label, value, unit }) => (
            <div key={label} className="rounded-lg p-2 text-center" style={{ backgroundColor: 'rgba(127,158,149,0.1)', border: '1px solid rgba(127,158,149,0.2)' }}>
              <div className="text-[9px] font-medium uppercase tracking-wide mb-0.5" style={{ color: '#7F9E95' }}>{label}</div>
              <div className="text-xs font-bold tabular-nums" style={{ color: '#2F3B3A' }}>{value}</div>
              <div className="text-[9px]" style={{ color: '#8AADA8' }}>{unit}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── WashoutFlowGraphWidget ────────────────────────────────────────────── */
function WashoutFlowGraphWidget() {
  const NUM_HL = 5;
  const PTS_PER_HL = 8;
  const TOTAL_PTS = NUM_HL * PTS_PER_HL;

  // Smooth exponential decay curve: C(t) = 100 × 0.5^t
  const curveData = Array.from({ length: TOTAL_PTS + 1 }, (_, i) => {
    const t = (i / TOTAL_PTS) * NUM_HL;
    return { t, conc: 100 * Math.pow(0.5, t) };
  });

  // Half-life milestones for stepped animation
  const MILESTONES = [
    { t: 0, conc: 100, xLabel: 'Dose', badge: '100%' },
    { t: 1, conc: 50, xLabel: '1st HL', badge: '50%' },
    { t: 2, conc: 25, xLabel: '2nd HL', badge: '25%' },
    { t: 3, conc: 12.5, xLabel: '3rd HL', badge: '12.5%' },
    { t: 4, conc: 6.25, xLabel: '4th HL', badge: '6.25%' },
    { t: 5, conc: 3.125, xLabel: '5th HL', badge: '~3%' },
  ];

  const STATUS = [
    'Dose administered — 100% concentration in system',
    '1st half-life — 50% of compound remains',
    '2nd half-life — 25% of compound remains',
    '3rd half-life — 12.5% of compound remains',
    '4th half-life — 6.25% of compound remains',
    '✓ 5th half-life — compound cleared (~5 HLs)',
  ];

  const [step, setStep] = useState(0);
  const timerRef = useRef(null);
  const pauseRef = useRef(null);

  // SVG dimensions
  const W = 280, H = 118;
  const PL = 28, PR = 6, PT = 10, PB = 18;
  const plotW = W - PL - PR;
  const plotH = H - PT - PB;
  const baseY = PT + plotH; // y-coordinate of the 0% line

  const sx = (t) => PL + (t / NUM_HL) * plotW;
  const sy = (c) => PT + ((100 - c) / 100) * plotH;

  // Revealed portion of curve up to current step
  const revealCount = Math.round((step / NUM_HL) * TOTAL_PTS) + 1;
  const visible = curveData.slice(0, revealCount);
  const visPolyline = visible.map((p) => `${sx(p.t).toFixed(1)},${sy(p.conc).toFixed(1)}`).join(' ');
  const visArea = visible.length > 1
    ? `${sx(visible[0].t).toFixed(1)},${baseY} ${visPolyline} ${sx(visible[visible.length - 1].t).toFixed(1)},${baseY}`
    : '';
  const fullPolyline = curveData.map((p) => `${sx(p.t).toFixed(1)},${sy(p.conc).toFixed(1)}`).join(' ');

  useEffect(() => {
    const STEP_MS = 950;
    const PAUSE_MS = 3000;
    const clear = () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      if (pauseRef.current) { clearTimeout(pauseRef.current); pauseRef.current = null; }
    };
    const run = () => {
      clear(); setStep(0);
      let s = 0;
      timerRef.current = setInterval(() => {
        s += 1;
        if (s > NUM_HL) {
          clearInterval(timerRef.current); timerRef.current = null;
          pauseRef.current = setTimeout(() => { pauseRef.current = null; run(); }, PAUSE_MS);
          return;
        }
        setStep(s);
      }, STEP_MS);
    };
    run();
    return clear;
  }, []);

  return (
    <div
      className="w-full rounded-xl overflow-hidden transition-all duration-300"
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid rgba(47,59,58,0.12)',
        boxShadow: '0 4px 14px rgba(47,59,58,0.08), 0 12px 36px rgba(47,59,58,0.12)',
      }}
    >
      <div
        className="px-3 py-2.5 flex-shrink-0 relative z-10 widget-separator"
        style={{ borderColor: 'rgba(47,59,58,0.15)', background: 'linear-gradient(135deg,rgba(127,158,149,0.08),rgba(127,158,149,0.03))' }}
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-bold" style={{ color: '#2F3B3A' }}>Half-Life Washout</h3>
          <FlaskConicalOff className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#7F9E95' }} />
        </div>
      </div>
      <div className="px-2.5 pt-2.5 pb-2">
        {/* Smooth exponential decay chart */}
        <div className="rounded-lg p-1.5" style={{ backgroundColor: 'rgba(127,158,149,0.08)', border: '1px solid rgba(47,59,58,0.18)' }}>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
            {/* Y-axis gridlines + labels */}
            {[100, 50, 0].map((pct) => (
              <g key={pct}>
                <line x1={PL} y1={sy(pct)} x2={W - PR} y2={sy(pct)} stroke="rgba(47,59,58,0.13)" strokeWidth="0.7" strokeDasharray={pct === 0 ? undefined : '3 2'} />
                <text x={PL - 3} y={sy(pct) + 3} textAnchor="end" fontSize="7" fill="#8AADA8" fontFamily="system-ui">{pct}%</text>
              </g>
            ))}
            {/* 25% subtle gridline */}
            <line x1={PL} y1={sy(25)} x2={W - PR} y2={sy(25)} stroke="rgba(47,59,58,0.07)" strokeWidth="0.7" strokeDasharray="3 2" />

            {/* Ghost curve (full path, faint) */}
            <polyline points={fullPolyline} fill="none" stroke="rgba(47,59,58,0.17)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

            {/* Filled area under revealed curve */}
            {visArea && <polygon points={visArea} fill="rgba(79,140,127,0.12)" />}

            {/* Active revealed curve */}
            {visible.length > 1 && (
              <polyline points={visPolyline} fill="none" stroke="#2F665C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            )}

            {/* Milestone markers */}
            {MILESTONES.map((m, i) => {
              const active = step >= i;
              const curr = step === i;
              const cx = sx(m.t);
              const cy = sy(m.conc);
              // Badge sits above dot; nudge down for top-edge points
              const badgeY = cy < 22 ? cy + 6 : cy - 16;
              return (
                <g key={i}>
                  {curr && <circle cx={cx} cy={cy} r="8" fill="rgba(47,102,92,0.18)" className="animate-ping" />}
                  <circle cx={cx} cy={cy} r={active ? 4 : 3} fill={active ? '#2F665C' : '#D5E0DC'} stroke={active ? '#fff' : 'rgba(47,59,58,0.3)'} strokeWidth="1.5" />

                  {/* Concentration badge at current milestone */}
                  {curr && m.badge && (
                    <>
                      <rect x={cx - 16} y={badgeY} width="32" height="12" rx="3" fill="#2F665C" />
                      <text x={cx} y={badgeY + 8.5} textAnchor="middle" fontSize="7" fill="white" fontFamily="system-ui" fontWeight="700">{m.badge}</text>
                    </>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
        {/* Status */}
        <div className="mt-1.5 text-center min-h-[1.75rem] flex items-center justify-center">
          <p className="text-[9px] md:text-[10px] leading-tight px-1" style={{ color: '#4A5A56' }}>
            {STATUS[Math.min(step, STATUS.length - 1)]}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── TitrationPhasesWidget ─────────────────────────────────────────────── */
const TITRATION_PHASES = [
  { label: 'Phase 1', dose: '0.25', unit: 'mg', note: 'Starting dose - tolerance build', color: '#4F8C7F', durationDays: 28 },
  { label: 'Phase 2', dose: '0.5', unit: 'mg', note: 'First escalation', color: '#3E7A6E', durationDays: 28 },
  { label: 'Phase 3', dose: '1.0', unit: 'mg', note: 'Maintenance or hold', color: '#2F665C', durationDays: 28 },
  { label: 'Phase 4', dose: '2.0', unit: 'mg', note: 'Target dose reached', color: '#1F4F48', durationDays: null },
];

function TitrationPhasesWidget() {
  const [phase, setPhase] = useState(0);
  const [held, setHeld] = useState(false);
  const [activeAction, setActiveAction] = useState(null);
  const actionTimerRef = useRef(null);
  const loopPauseRef = useRef(null);
  const phaseRef = useRef(phase);
  const current = TITRATION_PHASES[phase];
  const isMaintenancePhase = phase === TITRATION_PHASES.length - 1;
  const daysRemainingInPhase = current.durationDays ? Math.max(1, Math.round(current.durationDays * 0.35)) : null;
  const phaseFillPct = current.durationDays
    ? Math.max(5, Math.min(95, Math.round(((current.durationDays - daysRemainingInPhase) / current.durationDays) * 100)))
    : 50;

  const prev = () => { if (phase > 0) { setPhase((p) => p - 1); setHeld(false); } };
  const next = () => { if (phase < TITRATION_PHASES.length - 1) { setPhase((p) => p + 1); setHeld(false); } };
  const toggleHold = () => setHeld((h) => !h);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    const STEP_MS = 1350;
    const LOOP_PAUSE_MS = 2600;
    const sequence = ['next', 'hold', 'resume', 'next', 'hold', 'resume', 'next', 'back', 'hold', 'resume', 'back'];

    const clearTimers = () => {
      if (actionTimerRef.current) {
        clearTimeout(actionTimerRef.current);
        actionTimerRef.current = null;
      }
      if (loopPauseRef.current) {
        clearTimeout(loopPauseRef.current);
        loopPauseRef.current = null;
      }
    };

    const applyAction = (action) => {
      setActiveAction(action);
      if (action === 'next') {
        setPhase((p) => Math.min(TITRATION_PHASES.length - 1, p + 1));
        setHeld(false);
        return;
      }
      if (action === 'back') {
        setPhase((p) => Math.max(0, p - 1));
        setHeld(false);
        return;
      }
      if (action === 'hold') {
        if (phaseRef.current < TITRATION_PHASES.length - 1) setHeld(true);
        return;
      }
      if (action === 'resume') {
        setHeld(false);
      }
    };

    const runLoop = () => {
      clearTimers();
      setPhase(0);
      setHeld(false);
      setActiveAction(null);
      let i = 0;

      const runStep = () => {
        if (i >= sequence.length) {
          setActiveAction(null);
          loopPauseRef.current = setTimeout(runLoop, LOOP_PAUSE_MS);
          return;
        }
        applyAction(sequence[i]);
        i += 1;
        actionTimerRef.current = setTimeout(runStep, STEP_MS);
      };

      runStep();
    };

    runLoop();
    return () => clearTimers();
  }, []);

  return (
    <div
      className="w-full max-w-2xl mx-auto rounded-xl overflow-hidden transition-all duration-300"
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid rgba(47,59,58,0.12)',
        boxShadow: '0 4px 14px rgba(47,59,58,0.08), 0 12px 36px rgba(47,59,58,0.12)',
      }}
    >
      <div
        className="px-4 py-3 flex-shrink-0 relative z-10 widget-separator"
        style={{ borderColor: 'rgba(47,59,58,0.15)', background: 'linear-gradient(135deg,rgba(127,158,149,0.08),rgba(127,158,149,0.03))' }}
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold" style={{ color: '#2F3B3A' }}>Titration Phases</h3>
          <BarChart3 className="w-4 h-4 flex-shrink-0" style={{ color: '#7F9E95' }} />
        </div>
      </div>
      <div className="p-4">
        {/* Phase header (mirrors Active Protocols card style) */}
        <div className="flex items-end justify-between mb-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[12px] font-bold leading-none" style={{ color: current.color }}>
              {current.dose} {current.unit}
            </span>
            <span className="text-[10px] font-medium leading-none opacity-60" style={{ color: '#2F3B3A' }}>
              Phase {phase + 1}/{TITRATION_PHASES.length}
            </span>
          </div>
          <span className="text-[10px] font-semibold leading-none opacity-55" style={{ color: '#2F3B3A' }}>
            {held ? 'HELD' : daysRemainingInPhase !== null ? `${daysRemainingInPhase}d left` : 'maintenance'}
          </span>
        </div>

        {/* Segmented phase bar */}
        <div className="flex items-center gap-[2px] h-[7px] w-full mb-2">
          {TITRATION_PHASES.map((p, idx) => {
            const isPast = idx < phase;
            const isCurr = idx === phase;
            return (
              <div
                key={p.label}
                className="h-full flex-1 rounded-full overflow-hidden relative"
                style={{
                  backgroundColor: isPast ? current.color : isCurr ? `${current.color}33` : `${current.color}1F`,
                  opacity: isPast ? 0.55 : 1,
                }}
              >
                {isCurr && (
                  <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ width: `${phaseFillPct}%`, backgroundColor: current.color, boxShadow: `0 0 4px ${current.color}80` }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Dose labels */}
        <div className="flex items-center mb-3">
          {TITRATION_PHASES.map((p, idx) => {
            const isPast = idx < phase;
            const isCurr = idx === phase;
            return (
              <span
                key={p.label}
                className="flex-1 text-center text-[8px] font-medium truncate"
                style={{ color: isCurr ? current.color : '#6B7D7A', opacity: isPast ? 0.55 : isCurr ? 1 : 0.35 }}
              >
                {p.dose}{p.unit}
              </span>
            );
          })}
        </div>

        <div className="text-xs mb-3" style={{ color: '#6B7D7A' }}>{current.note}</div>

        {/* Segmented controls (visual copied from Active Protocols) */}
        <div className="flex w-full overflow-hidden rounded-xl" style={{ backgroundColor: 'rgba(47,59,58,0.12)', border: '1px solid rgba(47,59,58,0.14)' }}>
          {phase > 0 && (
            <button
              onClick={prev}
              className="flex items-center justify-center gap-1 px-2.5 py-1.5 text-[11px] font-bold transition-all flex-1"
              style={{
                color: activeAction === 'back' ? '#2F3B3A' : '#6B7D7A',
                backgroundColor: activeAction === 'back' ? 'rgba(127,158,149,0.18)' : 'transparent',
                borderRight: '1px solid rgba(0,0,0,0.1)',
              }}
            >
              <SkipBack className="w-3 h-3" /> Back
            </button>
          )}

          {!isMaintenancePhase && (
            <button
              onClick={toggleHold}
              className="flex items-center justify-center gap-1 px-3 py-1.5 text-[11px] font-bold transition-all flex-[2]"
              style={{
                borderRight: phase < TITRATION_PHASES.length - 1 ? '1px solid rgba(0,0,0,0.1)' : 'none',
                backgroundColor: activeAction === 'hold' || activeAction === 'resume' || held ? '#E8F8EE' : 'transparent',
                color: held ? '#16A34A' : activeAction === 'hold' || activeAction === 'resume' ? '#2F3B3A' : '#6B7D7A',
              }}
            >
              {held ? <><Play className="w-3 h-3" /> Resume</> : <><Pause className="w-3 h-3" /> Hold Dose</>}
            </button>
          )}

          {!isMaintenancePhase && phase < TITRATION_PHASES.length - 1 && (
            <button
              onClick={next}
              className="flex items-center justify-center gap-1 px-2.5 py-1.5 text-[11px] font-bold transition-all flex-1"
              style={{
                color: current.color,
                backgroundColor: activeAction === 'next' ? `${current.color}26` : 'transparent',
              }}
            >
              Next <SkipForward className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── ShopCarousel ──────────────────────────────────────────────────────── */
function ShopCarousel({ covers }) {
  const items = covers.filter(Boolean);
  const total = items.length;
  const [active, setActive] = useState(Math.floor(total / 2));
  const timerRef = useRef(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (total < 2 || paused) return;
    timerRef.current = setInterval(() => setActive((a) => (a + 1) % total), 3200);
    return () => clearInterval(timerRef.current);
  }, [total, paused]);

  const go = (idx) => setActive((idx + total) % total);

  return (
    <div
      className="relative select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Carousel track */}
      <div className="flex items-end justify-center gap-4 px-4" style={{ height: 260 }}>
        {[-2, -1, 0, 1, 2].map((offset) => {
          const idx = (active + offset + total) % total;
          const isCenter = offset === 0;
          const isSide1 = Math.abs(offset) === 1;
          return (
            <button
              key={offset}
              type="button"
              onClick={() => go(idx)}
              className="flex-shrink-0 transition-all duration-500 cursor-pointer"
              style={{
                transform: isCenter
                  ? 'scale(1) translateY(0)'
                  : isSide1
                  ? `scale(0.75) translateY(16px)`
                  : `scale(0.55) translateY(32px)`,
                opacity: isCenter ? 1 : isSide1 ? 0.6 : 0.3,
                zIndex: isCenter ? 10 : isSide1 ? 5 : 1,
                outline: 'none',
                background: 'transparent',
                border: 'none',
                padding: 0,
                margin: 0,
              }}
            >
              <span
                className="inline-block rounded-lg align-bottom"
                style={{
                  backgroundColor: PHYSICAL_PLANNERS_SURFACE,
                  lineHeight: 0,
                  verticalAlign: 'bottom',
                }}
              >
                <img
                  src={items[idx]}
                  alt={`Planner cover ${idx + 1}`}
                  className="rounded-lg block"
                  style={{
                    height: isCenter ? 220 : isSide1 ? 180 : 150,
                    width: 'auto',
                    maxWidth: isCenter ? 160 : isSide1 ? 120 : 100,
                    objectFit: 'cover',
                    filter: isCenter ? 'drop-shadow(0 8px 24px rgba(0,0,0,0.18))' : 'none',
                    transition: 'all 0.5s cubic-bezier(0.4,0,0.2,1)',
                  }}
                />
              </span>
            </button>
          );
        })}
      </div>

      {/* Prev / Next */}
      <button
        type="button"
        onClick={() => go(active - 1)}
        className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
        style={{ backgroundColor: 'rgba(255,255,255,0.85)', color: '#2F3B3A', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => go(active + 1)}
        className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
        style={{ backgroundColor: 'rgba(255,255,255,0.85)', color: '#2F3B3A', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Dots */}
      <div className="flex justify-center gap-1.5 mt-4">
        {items.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => go(i)}
            className="rounded-full transition-all duration-300"
            style={{
              width: active === i ? 20 : 6,
              height: 6,
              backgroundColor: active === i ? '#7F9E95' : 'rgba(127,158,149,0.3)',
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Main Landing Page ─────────────────────────────────────────────────── */
export default function Landing() {
  usePageSEO();
  const navigate = useNavigate();
  const [showContact, setShowContact] = useState(false);
  const [showIOSPopup, setShowIOSPopup] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [checkedState, setCheckedState] = useState({ b12: false, glow: false, nad: false });
  const toggleCheck = (id) => setCheckedState((prev) => ({ ...prev, [id]: !prev[id] }));

  useEffect(() => {
    document.body.classList.add('landing-page');
    document.documentElement.classList.add('landing-page-active');
    return () => {
      document.body.classList.remove('landing-page');
      document.documentElement.classList.remove('landing-page-active');
    };
  }, []);

  useEffect(() => {
    const shouldRedirectToApp = isNative() || isPWAInstalled();
    if (shouldRedirectToApp) {
      startTransition(() => navigate('/login', { replace: true }));
    }
  }, [navigate]);

  const handleSignIn = () => startTransition(() => navigate('/login'));

  const features = [
    { icon: Calendar, title: 'Protocols', description: 'Build multi-phase protocols, pause and resume dose progressions, and keep every phase organized.' },
    { icon: Package, title: 'Stockpiles', description: 'No need to PANIC! Always know how much is in your stockpile with aggressive vial tracking.', boldText: 'PANIC' },
    { icon: ShoppingCart, title: 'Orders', description: 'Let the app do the work for you by syncing your incoming peptides into your stockpile.' },
    { icon: MapPin, title: 'Vendors', description: 'Domestic, International or GB vendor info at your fingertips! Never lose your contact again.' },
  ];

  const carouselCovers = COVERS.filter(Boolean).slice(0, 9);

  return (
    <div className="min-h-screen landing-page-root" style={{ backgroundColor: LANDING_PAGE_BG, fontFamily: 'Poppins, sans-serif' }}>
      <LandingHeader />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="py-12 md:py-20" style={{ backgroundColor: '#EFF2EE' }}>
        <div className="w-full px-3 md:max-w-7xl md:mx-auto md:px-8">

          {/* Mobile title */}
          <div className="text-center mb-8 md:hidden">
            <h1 className="font-bold leading-tight uppercase tracking-wide" style={{ color: '#7F9E95', fontFamily: 'Poppins, sans-serif' }}>
              <span className="block whitespace-nowrap text-5xl sm:text-6xl" style={{ color: '#7F9E95' }}>ORGANIZE</span>
              <span className="block text-4xl sm:text-5xl" style={{ color: '#1F2B2A' }}>Your Research.</span>
            </h1>
          </div>

          {/* Mobile layout — stacked */}
          <div className="md:hidden flex flex-col items-center gap-6">
            <div className="w-full max-w-xs sm:max-w-sm landing-todays-research-animate relative">
              <TodaysResearchCard darkMode={darkMode} setDarkMode={setDarkMode} checkedState={checkedState} toggleCheck={toggleCheck} />
            </div>

            {/* Built by chip */}
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium"
              style={{ backgroundColor: '#F4E4D6', color: '#B8860B' }}>
              <HeartHandshake className="w-3 h-3 flex-shrink-0" />
              Built by a fellow researcher
            </div>
          </div>

          {/* Desktop layout — side by side */}
          <div className="hidden md:grid md:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="flex flex-col gap-8">
              <h1 className="font-bold leading-tight uppercase tracking-wide text-center" style={{ color: '#7F9E95', fontFamily: 'Poppins, sans-serif' }}>
                <span className="block text-4xl md:text-5xl lg:text-6xl">ORGANIZE</span>
                <span className="block text-3xl md:text-4xl lg:text-5xl" style={{ color: '#1F2B2A' }}>Your Research.</span>
              </h1>
              <button
                onClick={handleSignIn}
                className="px-6 py-3 rounded-lg text-base font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2 btn-primary-inset"
                style={{ backgroundColor: '#7F9E95', color: '#FFFFFF' }}
              >
                Get Started
                <Pen className="w-4 h-4" />
              </button>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium w-fit"
                style={{ backgroundColor: '#F4E4D6', color: '#B8860B' }}>
                <HeartHandshake className="w-4 h-4" />
                Built by a fellow researcher.
              </div>
            </div>

            <div className="flex justify-end items-center landing-todays-research-animate">
              <div className="w-full max-w-md">
                <TodaysResearchCard darkMode={darkMode} setDarkMode={setDarkMode} checkedState={checkedState} toggleCheck={toggleCheck} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── THE APP ─────────────────────────────────── */}
      <section className="pt-12 md:pt-16 pb-0" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="w-full px-3 md:max-w-4xl md:mx-auto md:px-8">
          <div className="rounded-3xl p-8 md:p-12 text-center border relative overflow-hidden" style={{ borderColor: '#DDE6DE', backgroundColor: '#EFF2EE' }}>
            {/* Subtle background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full mix-blend-multiply filter blur-3xl opacity-30" style={{ backgroundColor: '#7F9E95', transform: 'translate(30%, -30%)' }} />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full mix-blend-multiply filter blur-3xl opacity-20" style={{ backgroundColor: '#D5E0DC', transform: 'translate(-20%, 20%)' }} />
            
            <div className="relative z-10">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Monitor className="w-5 h-5" style={{ color: '#7F9E95' }} />
                <h3 className="text-sm font-bold tracking-widest uppercase" style={{ color: '#7F9E95', letterSpacing: '0.15em' }}>The App</h3>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-3" style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}>
                Take your research anywhere.
              </h2>
              <p className="text-sm md:text-base mb-8 max-w-lg mx-auto leading-relaxed" style={{ color: '#6B7D7A' }}>
                Track doses, monitor washouts, and manage your stockpile on iOS and Android. Your account syncs seamlessly across all devices.
              </p>

              <div className="flex flex-col items-center gap-4">
                <div className="flex gap-2 justify-center flex-wrap">
                  <a
                    href={APP_STORE_IOS_URL}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all hover:opacity-90 hover:-translate-y-0.5 shadow-sm"
                    style={{ backgroundColor: '#1a1a1a', minWidth: 125 }}
                    target="_blank" rel="noopener noreferrer"
                  >
                    <Apple className="w-4 h-4 text-white flex-shrink-0" />
                    <div className="text-white leading-tight text-left">
                      <div className="text-[8px] font-normal opacity-80">Download on the</div>
                      <div className="text-[11px] font-semibold">App Store</div>
                    </div>
                  </a>
                  {!isIOS() && (
                    <a
                      href="https://play.google.com/store/apps/details?id=com.thepepplanner.app"
                      className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all hover:opacity-90 hover:-translate-y-0.5 shadow-sm"
                      style={{ backgroundColor: '#1a1a1a', minWidth: 125 }}
                      target="_blank" rel="noopener noreferrer"
                    >
                      <Play className="w-4 h-4 text-white flex-shrink-0" />
                      <div className="text-white leading-tight text-left">
                        <div className="text-[8px] font-normal opacity-80">GET IT ON</div>
                        <div className="text-[11px] font-semibold">Google Play</div>
                      </div>
                    </a>
                  )}
                </div>
                <button
                  onClick={handleSignIn}
                  className="text-xs font-medium underline underline-offset-2 transition-opacity hover:opacity-70"
                  style={{ color: '#6B7D7A' }}
                >
                  Or sign in on the web →
                </button>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── FROM THE SHOP — Editorial Carousel Layout ───────────────────── */}
      <section className="py-16 md:py-24" style={{ backgroundColor: PAPER_PLANNERS_BG }}>
        <div className="w-full px-4 md:max-w-7xl md:mx-auto md:px-8">
          <div
            className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16 w-full rounded-3xl px-6 py-10 md:px-11 md:py-12 lg:gap-16"
            style={{
              backgroundColor: PHYSICAL_PLANNERS_SURFACE,
              boxShadow: 'inset 0 0 0 1px rgba(127, 158, 149, 0.14)',
            }}
          >
            
            {/* Left Typography */}
            <div className="lg:w-1/3 text-center lg:text-left flex flex-col items-center lg:items-start relative z-10">
              <div className="flex items-center gap-2 mb-4 justify-center lg:justify-start">
                <BookOpen className="w-5 h-5" style={{ color: '#7F9E95' }} />
                <span className="text-xs font-bold tracking-[0.2em]" style={{ color: '#7F9E95' }}>Paper Pep Planners</span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-5 leading-tight" style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}>
                For the desk.<br />Built for research.
              </h2>
              <p className="text-sm md:text-base leading-relaxed mb-8 max-w-sm" style={{ color: '#6B7D7A' }}>
                Dedicated pages for protocols, reconstitution dates, stockpile notes, and daily tracking. Multiple cover designs and sizes to fit your style.
              </p>
              
              <a
                href="https://thepepplanner.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-1 shadow-lg hover:shadow-xl group"
                style={{ backgroundColor: '#2F3B3A' }}
              >
                Shop the Collection
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </a>
            </div>

            {/* Right Carousel */}
            <div className="lg:w-2/3 w-full">
              {carouselCovers.length > 0 ? (
                <div className="py-4 md:py-8 relative w-full overflow-hidden">
                   <ShopCarousel covers={carouselCovers} />
                </div>
              ) : (
                <div className="text-center py-12 rounded-2xl border" style={{ borderColor: '#DDE6DE', backgroundColor: PHYSICAL_PLANNERS_SURFACE }}>
                  <p className="text-sm" style={{ color: '#6B7D7A' }}>Drop your cover images into src/assets/ to see the carousel.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* ── SEE IT IN ACTION — Interactive Widgets ───────────────────────── */}
      <section className="py-12 md:py-16" style={{ backgroundColor: SEE_IT_IN_ACTION_BG }}>
        <div className="w-full px-3 md:max-w-7xl md:mx-auto md:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}>
              See it in action
            </h2>
            <p className="text-sm max-w-xl mx-auto" style={{ color: '#6B7D7A' }}>
              Real features you'll use every day. Try them right here.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:gap-6 items-start">
            {/* Half-Life Washout */}
            <WashoutFlowGraphWidget />
            {/* Peptide Calculator */}
            <ReconstitutionMathWidget />
            {/* Titration Phases — full-width bottom row on all screen sizes */}
            <div className="col-span-2">
              <TitrationPhasesWidget />
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section className="py-6" style={{ backgroundColor: TOOLKIT_BG }}>
        <div className="w-full px-3 md:max-w-7xl md:mx-auto md:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-4xl font-bold mb-4" style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}>
              <span className="block">Time to ditch the spreadsheets.</span>
              <span className="block text-lg sm:text-xl font-normal mt-1" style={{ color: '#4A5A56' }}>And welcome your new research tool!</span>
            </h2>
          </div>

          <div className="text-center mb-6">
            <h3 className="text-base sm:text-xl font-semibold" style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}>
              Plus the rest of your toolkit:
            </h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 lg:gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="text-center p-6 rounded-xl h-full transition-all duration-300 hover:-translate-y-0.5"
                style={{
                  backgroundColor: '#ECF2ED',
                  border: '1px solid #AABCAF',
                  boxShadow: '0 8px 20px rgba(47, 59, 58, 0.16)',
                }}
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#7F9E95' }}>
                  <feature.icon className="w-8 h-8" style={{ color: '#FFFFFF' }} />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}>{feature.title}</h3>
                <p className="text-sm" style={{ color: '#6B7D7A' }}
                  dangerouslySetInnerHTML={{ __html: feature.boldText ? feature.description.replace(feature.boldText, `<strong>${feature.boldText}</strong>`) : feature.description }}
                />
              </div>
            ))}
          </div>
          {/* Protocols feature card */}
          <div className="mt-8 mb-8 rounded-2xl p-6 sm:p-8 md:p-10 md:max-w-4xl md:mx-auto"
            style={{ backgroundColor: '#E6EDE7', border: '2px solid #AFBFB3', boxShadow: '0 8px 24px rgba(47, 59, 58, 0.22)' }}>
            <h4 className="text-lg sm:text-xl font-bold mb-4 text-center" style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}>
              What you can do that others can&apos;t
            </h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm sm:text-base pl-1" style={{ color: '#4A5A56', listStyle: 'none' }}>
              {[
                ['Titration scheduling', '— plan multi-phase dose changes and stay on track.'],
                ['Hold your current dosage', '— and resume when you need to increase dose again.'],
                ['Half-life tracking', '— so you and your calendar stay in the know.'],
                ['Delivery methods', '— Love your Savvio? Pens, syringes, nasal, and more.'],
                ['Washout periods', '— visualized so you know when you\'re clear.'],
                ['Custom reminders for each protocol!', ''],
              ].map(([bold, rest]) => (
                <li key={bold} className="flex gap-2.5 items-baseline">
                  <span className="text-[#7F9E95] font-bold flex-shrink-0" style={{ lineHeight: 1.4 }}>•</span>
                  <span><strong style={{ color: '#2F3B3A' }}>{bold}</strong>{rest}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── ADDITIONAL FEATURES ──────────────────────────────────────────── */}
      <section className="py-8" style={{ backgroundColor: '#F5F5F0' }}>
        <div className="w-full px-3 md:max-w-7xl md:mx-auto md:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2" style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}>&amp; So Much More</h2>
            <p className="text-sm sm:text-base max-w-xl mx-auto" style={{ color: '#6B7D7A' }}>
              We've packed the app with the tools researchers actually use—and we keep adding more.
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-2 gap-4 lg:gap-6 md:max-w-4xl md:mx-auto">
            {[
              { Icon: Calculator, title: 'Peptide Calculator', desc: 'Dosage information, delivery methods, vial visuals, and pen dosing—all in one place.' },
              { Icon: FileText, title: 'Imports', desc: 'Bring your existing data in—no need to start from scratch.' },
              { Icon: Calendar, title: 'Calendar & Day View', desc: 'Month, week, or day—visualize your research schedule, washouts, and upcoming orders.' },
              { Icon: BarChart3, title: 'Research Analytics', desc: 'Spending, trends, delivery times, and insights—so you can see patterns and optimize.' },
              { Icon: Star, title: 'Goals & Wishlists', desc: 'Set research goals and track progress, plus save items to wishlists for later.' },
              { Icon: Layers, title: 'One Place for Everything', desc: 'Protocols, orders, stockpile, calendar, and analytics—your whole research workflow.' },
            ].map(({ Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-2 sm:gap-4">
                <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#7F9E95' }}>
                  <Icon className="w-4 h-4 sm:w-6 sm:h-6" style={{ color: '#FFFFFF' }} />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm sm:text-lg font-bold mb-1 sm:mb-2" style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}>{title}</h3>
                  <p className="text-xs sm:text-sm leading-relaxed" style={{ color: '#6B7D7A' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DUAL CTA ─────────────────────────────────────────────────────── */}
      <section className="py-8 sm:py-10" style={{ backgroundColor: '#6b8b78' }}>
        <div className="w-full text-center px-3 md:max-w-4xl md:mx-auto md:px-8">
          <h2 className="text-xl sm:text-3xl font-bold mb-4 sm:mb-5" style={{ color: '#FFFFFF', fontFamily: 'Poppins, sans-serif' }}>
            Ready to Organize Your Research?
          </h2>
          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 justify-center items-center">
            <button
              onClick={handleSignIn}
              className="w-full max-w-[280px] sm:w-auto px-6 py-2.5 sm:py-3 rounded-lg text-base sm:text-lg font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center gap-2 btn-primary-inset"
              style={{ backgroundColor: '#FFFFFF', color: '#7F9E95' }}
            >
              Start Free <Pen className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <a
              href="https://thepepplanner.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full max-w-[280px] sm:w-auto px-6 py-2.5 sm:py-3 rounded-lg text-base sm:text-lg font-semibold border-2 transition-all hover:shadow-xl hover:scale-105 flex items-center justify-center gap-2"
              style={{ borderColor: '#FFFFFF', color: '#FFFFFF', backgroundColor: 'transparent' }}
            >
              Shop Now <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
            </a>
          </div>
        </div>
      </section>

      <LandingFooter />

      <LandingContactModal open={showContact} onClose={() => setShowContact(false)} />

      {showIOSPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn" onClick={() => setShowIOSPopup(false)}>
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#B8A99A' }}>
                <Apple className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3" style={{ color: '#2F3B3A' }}>Now Available on iOS!</h3>
              <p className="text-base mb-6" style={{ color: '#6B7D7A' }}>
                <strong>The Pep Planner</strong> is available on the App Store. Download now and start organizing your peptide research!
              </p>
              <a href={APP_STORE_IOS_URL} target="_blank" rel="noopener noreferrer"
                className="block w-full mb-3 px-6 py-3 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg btn-primary-inset text-center"
                style={{ backgroundColor: '#4c6b52', color: '#FFFFFF' }}>
                View on App Store
              </a>
              <button onClick={() => setShowIOSPopup(false)}
                className="w-full px-6 py-3 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg btn-primary-inset"
                style={{ backgroundColor: '#7F9E95', color: '#FFFFFF' }}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
