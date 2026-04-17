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

/* ─── ReconstitutionMathWidget ──────────────────────────────────────────── */
function ReconstitutionMathWidget() {
  const [bac, setBac] = useState(2);
  const [mg, setMg] = useState(5);
  const [units, setUnits] = useState(10);
  const concentration = mg > 0 && bac > 0 ? (mg / bac).toFixed(3) : '—';
  const doseML = mg > 0 && bac > 0 && units > 0 ? ((units * bac) / (mg * 100)).toFixed(3) : '—';

  return (
    <div
      className="w-full max-w-sm mx-auto rounded-xl overflow-hidden transition-all duration-300"
      style={{ backgroundColor: '#FFFFFF', boxShadow: '0 10px 25px rgba(127,158,149,0.15)', border: '1px solid rgba(47,59,58,0.15)' }}
    >
      <div
        className="px-4 py-3 flex-shrink-0 relative z-10 widget-separator"
        style={{ borderColor: 'rgba(47,59,58,0.15)', background: 'linear-gradient(135deg,rgba(127,158,149,0.08),rgba(127,158,149,0.03))' }}
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold" style={{ color: '#2F3B3A' }}>Reconstitution Math</h3>
          <Calculator className="w-4 h-4 flex-shrink-0" style={{ color: '#7F9E95' }} />
        </div>
      </div>
      <div className="p-4 space-y-3">
        {[
          { label: 'BAC Water (mL)', value: bac, setter: setBac, min: 0.5, max: 10, step: 0.5 },
          { label: 'Peptide (mg)', value: mg, setter: setMg, min: 1, max: 20, step: 1 },
          { label: 'Desired dose (units)', value: units, setter: setUnits, min: 1, max: 50, step: 1 },
        ].map(({ label, value, setter, min, max, step }) => (
          <div key={label}>
            <div className="flex justify-between text-xs mb-1" style={{ color: '#6B7D7A' }}>
              <span>{label}</span>
              <span className="font-semibold" style={{ color: '#2F3B3A' }}>{value}</span>
            </div>
            <input
              type="range" min={min} max={max} step={step} value={value}
              onChange={(e) => setter(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{ accentColor: '#7F9E95' }}
            />
          </div>
        ))}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {[
            { label: 'Concentration', value: `${concentration} mg/mL` },
            { label: 'Dose volume', value: `${doseML} mL` },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg p-2.5 text-center" style={{ backgroundColor: 'rgba(127,158,149,0.08)' }}>
              <div className="text-[10px] font-medium uppercase tracking-wider mb-0.5" style={{ color: '#7F9E95' }}>{label}</div>
              <div className="text-sm font-bold" style={{ color: '#2F3B3A' }}>{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── WashoutFlowGraphWidget ────────────────────────────────────────────── */
function WashoutFlowGraphWidget() {
  const NODES = [
    { label: 'Dose', sub: 'Day 0' },
    { label: '50%', sub: '1st Half-Life' },
    { label: '25%', sub: '2nd Half-Life' },
    { label: '12.5%', sub: '3rd Half-Life' },
    { label: '6.25%', sub: '4th Half-Life' },
    { label: 'Clear', sub: '~5 half-lives' },
  ];
  const [step, setStep] = useState(-1);
  const timerRef = useRef(null);

  const runSimulation = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setStep(0);
    let s = 0;
    timerRef.current = setInterval(() => {
      s += 1;
      if (s >= NODES.length) { clearInterval(timerRef.current); timerRef.current = null; return; }
      setStep(s);
    }, 700);
  };

  const reset = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setStep(-1);
  };

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  return (
    <div
      className="w-full max-w-sm mx-auto rounded-xl overflow-hidden transition-all duration-300"
      style={{ backgroundColor: '#FFFFFF', boxShadow: '0 10px 25px rgba(127,158,149,0.15)', border: '1px solid rgba(47,59,58,0.15)' }}
    >
      <div
        className="px-4 py-3 flex-shrink-0 relative z-10 widget-separator"
        style={{ borderColor: 'rgba(47,59,58,0.15)', background: 'linear-gradient(135deg,rgba(127,158,149,0.08),rgba(127,158,149,0.03))' }}
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold" style={{ color: '#2F3B3A' }}>Half-Life Washout</h3>
          <FlaskConicalOff className="w-4 h-4 flex-shrink-0" style={{ color: '#7F9E95' }} />
        </div>
      </div>
      <div className="px-4 pt-4 pb-3">
        {/* Flow nodes */}
        <div className="flex items-center justify-between gap-0 mb-4">
          {NODES.map((node, i) => {
            const active = step >= i;
            return (
              <React.Fragment key={i}>
                <div className="flex flex-col items-center flex-shrink-0" style={{ minWidth: 0 }}>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500"
                    style={{
                      backgroundColor: active ? '#7F9E95' : 'rgba(127,158,149,0.12)',
                      color: active ? '#FFFFFF' : '#9CA3AF',
                      boxShadow: active ? '0 2px 8px rgba(127,158,149,0.4)' : 'none',
                      transform: active ? 'scale(1.1)' : 'scale(1)',
                    }}
                  >
                    {i + 1}
                  </div>
                  <div className="mt-1 text-center" style={{ maxWidth: 36 }}>
                    <div className="text-[9px] font-semibold leading-tight" style={{ color: active ? '#2F3B3A' : '#9CA3AF' }}>{node.label}</div>
                    <div className="text-[8px] leading-tight" style={{ color: active ? '#7F9E95' : '#C4CCC9' }}>{node.sub}</div>
                  </div>
                </div>
                {i < NODES.length - 1 && (
                  <div className="flex-1 h-0.5 mx-0.5 rounded-full transition-all duration-500" style={{ backgroundColor: step > i ? '#7F9E95' : 'rgba(127,158,149,0.15)', minWidth: 4 }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
        {/* Status line */}
        <div className="text-center mb-3 h-4">
          {step >= 0 && step < NODES.length && (
            <p className="text-xs" style={{ color: '#6B7D7A' }}>
              {step === NODES.length - 1 ? '✓ Washout complete — compound cleared' : `Tracking half-life step ${step + 1} of ${NODES.length - 1}`}
            </p>
          )}
        </div>
        <div className="flex gap-2 justify-center">
          <button
            onClick={runSimulation}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:scale-105"
            style={{ backgroundColor: '#7F9E95' }}
          >
            <Play className="w-3 h-3" /> Run
          </button>
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
            style={{ backgroundColor: 'rgba(127,158,149,0.12)', color: '#2F3B3A' }}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── TitrationPhasesWidget ─────────────────────────────────────────────── */
const TITRATION_PHASES = [
  { label: 'Phase 1', dose: '0.25 mg', note: 'Starting dose — tolerance build', color: '#B8DDD6' },
  { label: 'Phase 2', dose: '0.5 mg', note: 'First escalation', color: '#8FC4BB' },
  { label: 'Phase 3', dose: '1.0 mg', note: 'Maintenance or hold', color: '#6BA89E' },
  { label: 'Phase 4', dose: '2.0 mg', note: 'Target dose reached', color: '#4B8C82' },
];

function TitrationPhasesWidget() {
  const [phase, setPhase] = useState(0);
  const [held, setHeld] = useState(false);
  const current = TITRATION_PHASES[phase];

  const prev = () => { if (phase > 0) { setPhase((p) => p - 1); setHeld(false); } };
  const next = () => { if (phase < TITRATION_PHASES.length - 1) { setPhase((p) => p + 1); setHeld(false); } };
  const toggleHold = () => setHeld((h) => !h);

  return (
    <div
      className="w-full max-w-sm mx-auto rounded-xl overflow-hidden transition-all duration-300"
      style={{ backgroundColor: '#FFFFFF', boxShadow: '0 10px 25px rgba(127,158,149,0.15)', border: '1px solid rgba(47,59,58,0.15)' }}
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
        {/* Progress bar */}
        <div className="flex gap-1 mb-4">
          {TITRATION_PHASES.map((p, i) => (
            <div
              key={i}
              className="flex-1 h-1.5 rounded-full transition-all duration-400"
              style={{ backgroundColor: i <= phase ? p.color : 'rgba(127,158,149,0.15)' }}
            />
          ))}
        </div>
        {/* Phase card */}
        <div
          className="rounded-lg p-4 mb-4 transition-all duration-300"
          style={{ backgroundColor: `${current.color}22`, border: `1px solid ${current.color}` }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: current.color.replace('B8', '4B') }}>
              {current.label}
            </span>
            {held && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: '#FFF3CD', color: '#856404' }}>
                ON HOLD
              </span>
            )}
          </div>
          <div className="text-2xl font-bold" style={{ color: '#2F3B3A' }}>{current.dose}</div>
          <div className="text-xs mt-0.5" style={{ color: '#6B7D7A' }}>{current.note}</div>
        </div>
        {/* Controls */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={prev}
            disabled={phase === 0}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              backgroundColor: phase === 0 ? 'rgba(127,158,149,0.06)' : 'rgba(127,158,149,0.12)',
              color: phase === 0 ? '#C4CCC9' : '#2F3B3A',
              cursor: phase === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <SkipBack className="w-3 h-3" /> Back
          </button>
          <button
            onClick={toggleHold}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              backgroundColor: held ? '#FFF3CD' : 'rgba(127,158,149,0.12)',
              color: held ? '#856404' : '#2F3B3A',
            }}
          >
            <Pause className="w-3 h-3" /> {held ? 'Resume' : 'Hold'}
          </button>
          <button
            onClick={next}
            disabled={phase === TITRATION_PHASES.length - 1}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              backgroundColor: phase === TITRATION_PHASES.length - 1 ? 'rgba(127,158,149,0.06)' : '#7F9E95',
              color: phase === TITRATION_PHASES.length - 1 ? '#C4CCC9' : '#FFFFFF',
              cursor: phase === TITRATION_PHASES.length - 1 ? 'not-allowed' : 'pointer',
            }}
          >
            Next <SkipForward className="w-3 h-3" />
          </button>
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
              }}
            >
              <img
                src={items[idx]}
                alt={`Planner cover ${idx + 1}`}
                className="rounded-lg"
                style={{
                  height: isCenter ? 220 : isSide1 ? 180 : 150,
                  width: 'auto',
                  maxWidth: isCenter ? 160 : isSide1 ? 120 : 100,
                  objectFit: 'cover',
                  filter: isCenter ? 'drop-shadow(0 8px 24px rgba(0,0,0,0.18))' : 'none',
                  transition: 'all 0.5s cubic-bezier(0.4,0,0.2,1)',
                }}
              />
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

  const handleGetStarted = () => startTransition(() => navigate('/login?trial=true'));
  const handleSignIn = () => startTransition(() => navigate('/login'));

  const features = [
    { icon: Package, title: 'Stockpiles', description: 'No need to PANIC! Always know how much is in your stockpile with aggressive vial tracking.', boldText: 'PANIC' },
    { icon: ShoppingCart, title: 'Orders', description: 'Let the app do the work for you by syncing your incoming peptides into your stockpile.' },
    { icon: MapPin, title: 'Vendors', description: 'Domestic, International or GB vendor info at your fingertips! Never lose your contact again.' },
  ];

  const carouselCovers = COVERS.filter(Boolean).slice(0, 9);

  return (
    <div className="min-h-screen landing-page-root" style={{ backgroundColor: '#F5F5F0', fontFamily: 'Poppins, sans-serif' }}>
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

            {/* Dual CTAs */}
            <div className="flex items-center gap-3 w-full max-w-xs">
              <button
                onClick={handleSignIn}
                className="flex-1 min-h-[42px] rounded-lg text-sm font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center gap-2 btn-primary-inset"
                style={{ backgroundColor: '#6B8B78', color: '#FFFFFF' }}
              >
                Get Started
                <Pen className="w-4 h-4" />
              </button>
              <a
                href="https://thepepplanner.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-h-[42px] rounded-lg text-sm font-semibold border transition-all flex items-center justify-center gap-2 hover:shadow-md"
                style={{ color: '#4C6B52', borderColor: '#4C6B52', backgroundColor: 'transparent' }}
              >
                <ShoppingCart className="w-4 h-4" aria-hidden="true" />
                Shop Planners
              </a>
            </div>
          </div>

          {/* Desktop layout — side by side */}
          <div className="hidden md:grid md:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="flex flex-col gap-8">
              <h1 className="font-bold leading-tight uppercase tracking-wide text-center" style={{ color: '#7F9E95', fontFamily: 'Poppins, sans-serif' }}>
                <span className="block text-4xl md:text-5xl lg:text-6xl">ORGANIZE</span>
                <span className="block text-3xl md:text-4xl lg:text-5xl" style={{ color: '#1F2B2A' }}>Your Research.</span>
              </h1>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSignIn}
                  className="px-6 py-3 rounded-lg text-base font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2 btn-primary-inset"
                  style={{ backgroundColor: '#7F9E95', color: '#FFFFFF' }}
                >
                  Get Started
                  <Pen className="w-4 h-4" />
                </button>
                <a
                  href="https://thepepplanner.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 rounded-lg text-base font-semibold border transition-all flex items-center gap-2 hover:shadow-md"
                  style={{ color: '#4C6B52', borderColor: '#4C6B52', backgroundColor: 'transparent' }}
                >
                  <ShoppingCart className="w-4 h-4" />
                  Shop Planners
                </a>
              </div>
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
      <section className="py-12 md:py-16" style={{ backgroundColor: '#FFFFFF' }}>
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
      <section className="py-16 md:py-24" style={{ backgroundColor: '#EDEAE5' }}>
        <div className="w-full px-4 md:max-w-7xl md:mx-auto md:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            
            {/* Left Typography */}
            <div className="lg:w-1/3 text-center lg:text-left flex flex-col items-center lg:items-start relative z-10">
              <div className="flex items-center gap-2 mb-4 justify-center lg:justify-start">
                <BookOpen className="w-5 h-5" style={{ color: '#7F9E95' }} />
                <span className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: '#7F9E95' }}>Physical Planners</span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-5 leading-tight" style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}>
                For the desk.<br className="hidden lg:block" />Built for research.
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
                <div className="py-8 relative w-full overflow-hidden">
                   <ShopCarousel covers={carouselCovers} />
                </div>
              ) : (
                <div className="text-center py-12 rounded-2xl border" style={{ borderColor: '#DDE6DE', backgroundColor: 'rgba(255,255,255,0.4)' }}>
                  <p className="text-sm" style={{ color: '#6B7D7A' }}>Drop your cover images into src/assets/ to see the carousel.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* ── SEE IT IN ACTION — Interactive Widgets ───────────────────────── */}
      <section className="py-12 md:py-16" style={{ backgroundColor: '#F5F5F0' }}>
        <div className="w-full px-3 md:max-w-7xl md:mx-auto md:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}>
              See it in action
            </h2>
            <p className="text-sm max-w-xl mx-auto" style={{ color: '#6B7D7A' }}>
              Real features you'll use every day. Try them right here.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8 items-start">
            {/* Today's Research Card */}
            <div className="w-full max-w-sm mx-auto landing-todays-research-animate">
              <TodaysResearchCard darkMode={darkMode} setDarkMode={setDarkMode} checkedState={checkedState} toggleCheck={toggleCheck} />
            </div>
            {/* Reconstitution Math */}
            <ReconstitutionMathWidget />
            {/* Washout Flow */}
            <WashoutFlowGraphWidget />
            {/* Titration Phases */}
            <TitrationPhasesWidget />
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section className="py-6" style={{ backgroundColor: '#F5F5F0' }}>
        <div className="w-full px-3 md:max-w-7xl md:mx-auto md:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-4xl font-bold mb-4" style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}>
              <span className="block">Time to ditch the spreadsheets.</span>
              <span className="block text-lg sm:text-xl font-normal mt-1" style={{ color: '#4A5A56' }}>And welcome your new research tool!</span>
            </h2>
          </div>

          {/* Protocols feature card */}
          <div className="mb-10 rounded-2xl p-6 sm:p-8 md:p-10 md:max-w-4xl md:mx-auto"
            style={{ backgroundColor: '#FFFFFF', border: '2px solid #DDE6DE', boxShadow: '0 4px 20px rgba(127, 158, 149, 0.12)' }}>
            <div className="flex items-center gap-3 sm:gap-4 mb-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#7F9E95', boxShadow: '0 3px 10px rgba(127, 158, 149, 0.3)' }}>
                <Calendar className="w-6 h-6 sm:w-7 sm:h-7" style={{ color: '#FFFFFF' }} />
              </div>
              <h3 className="text-xl sm:text-2xl md:text-3xl font-bold m-0" style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}>
                Protocols<br />
                The heart of your research
              </h3>
            </div>
            <p className="text-sm sm:text-base leading-relaxed mb-5" style={{ color: '#4A5A56' }}>
              Keep your dedicated info in one spot. Schedule your next research protocol—doses, timing, notes—and let the app do the rest.
            </p>
            <div className="pt-4 border-t" style={{ borderColor: 'rgba(127, 158, 149, 0.2)' }}>
              <h4 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}>
                What you can do that others can&apos;t
              </h4>
              <ul className="space-y-2.5 text-sm pl-1" style={{ color: '#4A5A56', listStyle: 'none' }}>
                {[
                  ['Titration scheduling', '— plan multi-phase dose changes and stay on track.'],
                  ['Hold your current dosage', '— and resume when you need to increase dose again.'],
                  ['Half-life tracking', '— so you and your calendar stay in the know.'],
                  ['Delivery methods', '— Love your Savvio? Pens, syringes, nasal, and more.'],
                  ['Washout periods', '— visualized so you know when you\'re clear.'],
                  ['Custom reminders for each protocol!', ''],
                ].map(([bold, rest]) => (
                  <li key={bold} className="flex gap-2 items-baseline">
                    <span className="text-[#7F9E95] font-bold flex-shrink-0" style={{ lineHeight: 1.4 }}>•</span>
                    <span><strong style={{ color: '#2F3B3A' }}>{bold}</strong>{rest}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="text-center mb-6">
            <h3 className="text-base sm:text-xl font-semibold" style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}>
              Plus the rest of your toolkit:
            </h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 lg:gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center p-6 rounded-xl" style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDE6DE' }}>
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
        </div>
      </section>

      {/* ── ADDITIONAL FEATURES ──────────────────────────────────────────── */}
      <section className="py-8" style={{ backgroundColor: '#F5F5F0' }}>
        <div className="w-full px-3 md:max-w-7xl md:mx-auto md:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2" style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}>Plus So Much More</h2>
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
      <section className="py-12" style={{ backgroundColor: '#6b8b78' }}>
        <div className="w-full text-center px-3 md:max-w-4xl md:mx-auto md:px-8">
          <h2 className="text-2xl sm:text-4xl font-bold mb-6" style={{ color: '#FFFFFF', fontFamily: 'Poppins, sans-serif' }}>
            Ready to Organize Your Research?
          </h2>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <button
              onClick={handleSignIn}
              className="w-full sm:w-auto px-7 py-3.5 rounded-lg text-lg font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center gap-2 btn-primary-inset"
              style={{ backgroundColor: '#FFFFFF', color: '#7F9E95' }}
            >
              Start Free <Pen className="w-5 h-5" />
            </button>
            <a
              href="https://thepepplanner.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-7 py-3.5 rounded-lg text-lg font-semibold border-2 transition-all hover:shadow-xl hover:scale-105 flex items-center justify-center gap-2"
              style={{ borderColor: '#FFFFFF', color: '#FFFFFF', backgroundColor: 'transparent' }}
            >
              Shop Now <ShoppingCart className="w-5 h-5" />
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
