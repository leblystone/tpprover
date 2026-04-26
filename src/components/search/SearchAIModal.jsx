import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChatCenteredDots,
  MagnifyingGlass,
  X,
  Package,
  ClipboardText,
  ShoppingCart,
  Pill,
  Storefront,
  Syringe,
  Sparkle,
  LockSimple,
  PaperPlaneTilt,
  ArrowCounterClockwise,
} from '@phosphor-icons/react';
import { useAppContext } from '../../context/AppContext';
import { useTierAccess } from '../../utils/useSubscriptionAccess';
import { getRemainingQuota } from '../../services/aiResearch';
import ChatPanel from '../ai/ChatPanel';
import UpgradeModal from '../common/UpgradeModal';

const TYPE_CONFIG = {
  protocol:   { Icon: ClipboardText, label: 'Protocol',   color: '#8ea5a0', path: '/app/protocols' },
  stockpile:  { Icon: Package,       label: 'Stockpile',  color: '#8ba4c0', path: '/app/stockpile' },
  supply:     { Icon: Syringe,       label: 'Supply',     color: '#9d95b5', path: '/app/stockpile' },
  order:      { Icon: ShoppingCart,  label: 'Order',      color: '#b5a87a', path: '/app/orders' },
  supplement: { Icon: Pill,          label: 'Supplement', color: '#8dab98', path: '/app/supplements' },
  vendor:     { Icon: Storefront,    label: 'Vendor',     color: '#b097a8', path: '/app/vendors' },
};

const INPUT_PLACEHOLDERS = [
  'Search your data or ask PiP…',
  'Log a dose (the painless way)…',
  'Not that kind of PIP. Talk to me…',
  'Ask about dosing, stacks, or protocols…',
  'Data goes here. Soreness stays there…',
];

function useSearchData() {
  const { protocols, stockpile, orders, supplements, vendors } = useAppContext();
  return useMemo(() => {
    const out = [];
    (protocols || []).forEach(p => {
      const name = p.name || p.protocolName || '';
      if (!name) return;
      out.push({ key: `prot-${p.id}`, id: p.id, type: 'protocol', title: name,
        subtitle: [p.purpose, p.category].filter(Boolean).join(' · '),
        navState: { openProtocolId: p.id } });
    });
    (stockpile || []).forEach(s => {
      if (s.type === 'supply') {
        out.push({ key: `sup-${s.id}`, id: s.id, type: 'supply', title: s.name || '',
          subtitle: s.brand ? `${s.brand} · ${s.quantity ?? 0} ${s.unit || 'each'}` : `${s.quantity ?? 0} ${s.unit || 'each'}`,
          navState: { openStockpileId: s.id } });
      } else {
        out.push({ key: `stk-${s.id}`, id: s.id, type: 'stockpile', title: s.name || '',
          subtitle: `${s.mg ?? ''}mg · ${s.vendor || ''}`.replace(/^·\s*|·\s*$/, '').trim(),
          navState: { openStockpileId: s.id } });
      }
    });
    (orders || []).forEach(o => out.push({ key: `ord-${o.id}`, id: o.id, type: 'order',
      title: `${o.peptide || ''} ${o.mg || ''}mg`.trim(), subtitle: o.vendor || '',
      navState: { openOrderId: o.id } }));
    (supplements || []).forEach(s => out.push({ key: `supp-${s.id}`, id: s.id, type: 'supplement',
      title: s.name || '',
      subtitle: [s.dose ? `${s.dose}${s.unit ? ' ' + s.unit : ''}` : '', s.delivery].filter(Boolean).join(' · '),
      navState: {} }));
    (vendors || []).forEach(v => out.push({ key: `vnd-${v.id || v.name}`, id: v.id, type: 'vendor',
      title: v.name || '', subtitle: v.url || '', navState: {} }));
    return out;
  }, [protocols, stockpile, orders, supplements, vendors]);
}

function PiPLocked({ theme, onUpgrade }) {
  return (
    <div
      className="rounded-2xl p-4 flex flex-col items-center text-center"
      style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(167,139,250,0.05))',
        border: '1px solid rgba(129,140,248,0.2)',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <LockSimple size={13} weight="duotone" color="#818cf8" />
        <p className="text-sm font-bold" style={{ color: '#818cf8' }}>PiP — Research+</p>
      </div>
      <p className="text-xs mb-3 max-w-xs leading-relaxed" style={{ color: theme.textLight }}>
        Ask questions about protocols, get stack analysis, and research peptide science with your AI companion.
      </p>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mb-4">
        {['Protocol Q&A', 'Stack analysis', 'Research summaries', 'Goal guidance'].map(f => (
          <span key={f} className="flex items-center gap-1 text-[11px]" style={{ color: theme.textLight }}>
            <Sparkle size={10} weight="fill" color="#818cf8" />{f}
          </span>
        ))}
      </div>
      <button
        onClick={onUpgrade}
        className="px-5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
        style={{
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          color: '#fff',
          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.18), inset 0 -2px 3px rgba(0,0,0,0.18)',
        }}
      >
        Upgrade to Research+
      </button>
    </div>
  );
}

export default function SearchAIModal({ open, onClose, theme }) {
  const navigate = useNavigate();
  const { canStartAIChat, aiDailyQuota } = useTierAccess();
  const { protocols, stockpile, supplements } = useAppContext();
  const allData = useSearchData();

  const [query, setQuery] = useState('');
  const [closing, setClosing] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [sessionKey, setSessionKey] = useState(0);
  const [quotaRemaining, setQuotaRemaining] = useState(() => getRemainingQuota(aiDailyQuota));
  const inputRef = useRef(null);
  const chatRef = useRef(null);
  const scrollRef = useRef(null);

  // User context for PiP's contextual awareness (includes history for past-cycle recall)
  const userContext = useMemo(() => {
    let protocolHistory = [];
    try {
      const raw = localStorage.getItem('tpprover_protocol_history');
      protocolHistory = raw ? JSON.parse(raw) : [];
    } catch { /* noop */ }
    return {
      protocols: protocols || [],
      stockpile: stockpile || [],
      supplements: supplements || [],
      protocolHistory: Array.isArray(protocolHistory) ? protocolHistory.slice(0, 20) : [],
    };
  }, [protocols, stockpile, supplements]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setClosing(false);
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [open]);

  // Rotate input placeholder
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIdx(i => (i + 1) % INPUT_PLACEHOLDERS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setQuotaRemaining(getRemainingQuota(aiDailyQuota));
  }, [aiDailyQuota, open]);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => { setClosing(false); onClose(); }, 280);
  }, [onClose]);

  const suggestions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return allData
      .filter(r =>
        (r.title || '').toLowerCase().includes(needle) ||
        (r.subtitle || '').toLowerCase().includes(needle)
      )
      .slice(0, 8);
  }, [query, allData]);


  const handleNavigate = useCallback((result) => {
    const cfg = TYPE_CONFIG[result.type];
    if (!cfg) return;
    navigate(cfg.path, { state: result.navState });
    handleClose();
  }, [navigate, handleClose]);

  const handleSendToPiP = useCallback(() => {
    const q = query.trim();
    if (!q) return;
    if (!canStartAIChat) { setShowUpgrade(true); return; }
    chatRef.current?.send(q, false);
    setQuery('');
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, 120);
  }, [query, canStartAIChat]);


  // Handle action callbacks from ChatPanel (protocol creation, etc.)
  const handleChatAction = useCallback((action) => {
    if (action.type === 'create_protocol' && action.prefill) {
      handleClose();
      // Navigate to protocols page and trigger new protocol creation with prefill
      setTimeout(() => {
        navigate('/app/protocols', { state: { aiPrefill: action.prefill } });
      }, 300);
    }
  }, [handleClose, navigate]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (suggestions.length > 0 && !e.metaKey && !e.ctrlKey) {
        handleNavigate(suggestions[0]);
      } else {
        handleSendToPiP();
      }
    }
  };

  if (!open && !closing) return null;

  const hasQuery = query.trim().length > 0;
  const isAIMode = hasQuery && suggestions.length === 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[10000] lg:hidden"
        onClick={handleClose}
        style={{
          backgroundColor: theme.isDark ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          animation: closing ? 'fadeOut 280ms ease-in forwards' : 'fadeIn 250ms ease-out',
        }}
      />

      {/* Sheet */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-[10001] rounded-t-3xl flex flex-col overflow-hidden"
        style={{
          height: '90vh',
          background: theme.isDark
            ? 'linear-gradient(180deg, rgba(18,22,30,0.98) 0%, rgba(14,18,25,0.99) 100%)'
            : 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(249,250,251,0.99) 100%)',
          border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          boxShadow: theme.isDark
            ? '0 -20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)'
            : '0 -20px 60px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.8)',
          animation: closing
            ? 'slideDownSmooth 280ms cubic-bezier(0.4, 0, 0.2, 1) forwards'
            : 'slideUpSmooth 320ms cubic-bezier(0.4, 0, 0.2, 1) forwards',
        }}
      >
        {/* Drag handle + header */}
        <div className="flex-shrink-0 pt-3 pb-2 px-4">
          <div className="flex justify-center mb-2">
            <div className="w-10 h-1 rounded-full" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'rgba(129,140,248,0.14)' }}
              >
                <ChatCenteredDots size={13} weight="bold" color="#818cf8" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold leading-tight" style={{ color: '#818cf8' }}>Ask PiP</p>
                <p className="text-[10px] truncate" style={{ color: theme.textLight, opacity: 0.7 }}>
                  Search your data or ask your research assistant
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {canStartAIChat && (
                <button
                  onClick={() => {
                    try { sessionStorage.removeItem('tpprover_pip_session'); } catch { /* noop */ }
                    setSessionKey(k => k + 1);
                  }}
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', color: theme.textLight }}
                  title="New conversation"
                >
                  <ArrowCounterClockwise size={12} weight="bold" />
                </button>
              )}
              <button
                onClick={handleClose}
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', color: theme.textLight }}
              >
                <X size={12} weight="bold" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Scrollable content area ───────────────────────────────────── */}
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 pb-2 space-y-3">

          {/* Suggestions strip */}
          {hasQuery && suggestions.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest px-0.5 pt-1" style={{ color: theme.textLight }}>
                Were you looking for?
              </p>
              {suggestions.map(r => {
                const cfg = TYPE_CONFIG[r.type];
                if (!cfg) return null;
                const { Icon, label, color } = cfg;
                return (
                  <button
                    key={r.key}
                    onClick={() => handleNavigate(r)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all active:scale-[0.98]"
                    style={{
                      backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)',
                      border: `1px solid ${theme.border}`,
                    }}
                  >
                    <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}18` }}>
                      <Icon size={12} weight="duotone" color={color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: theme.text }}>{r.title || '—'}</p>
                      {r.subtitle && <p className="text-[11px] truncate" style={{ color: theme.textLight }}>{r.subtitle}</p>}
                    </div>
                    <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: `${color}15`, color }}>
                      {label}
                    </span>
                  </button>
                );
              })}

              {/* Ask PiP with this query */}
              <button
                onClick={handleSendToPiP}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all active:scale-[0.98]"
                style={{ backgroundColor: 'rgba(99,102,241,0.06)', border: '1px solid rgba(129,140,248,0.25)' }}
              >
                <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(99,102,241,0.15)' }}>
                  <ChatCenteredDots size={12} weight="bold" color="#818cf8" />
                </div>
                <p className="text-xs font-medium flex-1 truncate" style={{ color: '#818cf8' }}>
                  Ask PiP: "{query.trim()}"
                </p>
                <PaperPlaneTilt size={12} weight="bold" color="#818cf8" />
              </button>
            </div>
          )}

          {/* ── PiP chat section ─────────────────────────────────────────── */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(129,140,248,0.18)' }} />
              <div className="flex items-center gap-1">
                <ChatCenteredDots size={10} weight="bold" color="#818cf8" />
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#818cf8' }}>PiP</span>
                {!canStartAIChat && <LockSimple size={9} weight="bold" color="#818cf8" />}
              </div>
              <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(129,140,248,0.18)' }} />
            </div>

            {canStartAIChat ? (
              <div style={{ minHeight: '45vh' }}>
                <ChatPanel
                  key={sessionKey}
                  ref={chatRef}
                  theme={theme}
                  onSaveToLibrary={() => {}}
                  headless
                  userContext={userContext}
                  onAction={handleChatAction}
                  quotaLimit={aiDailyQuota}
                  showSafetyBanner={false}
                  onQuotaChange={setQuotaRemaining}
                />
              </div>
            ) : (
              <PiPLocked theme={theme} onUpgrade={() => setShowUpgrade(true)} />
            )}
          </div>

        </div>

        {/* ── Bottom input bar (DM style) ───────────────────────────────── */}
        <div
          className="flex-shrink-0 px-4 pt-2"
          style={{
            borderTop: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
            paddingBottom: 'max(1rem, calc(1rem + var(--safe-area-bottom, 0px)))',
            backgroundColor: theme.isDark ? 'rgba(18,22,30,0.98)' : 'rgba(255,255,255,0.98)',
          }}
        >
          <div
            className="flex items-center gap-2 rounded-2xl px-3 py-2"
            style={{
              backgroundColor: theme.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
              border: `1px solid ${isAIMode ? 'rgba(129,140,248,0.4)' : theme.border}`,
              transition: 'border-color 0.2s',
            }}
          >
            {isAIMode
              ? <ChatCenteredDots size={15} weight="bold" color="#818cf8" className="flex-shrink-0" />
              : <MagnifyingGlass size={15} weight="bold" className="flex-shrink-0" style={{ color: theme.textLight }} />
            }

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={INPUT_PLACEHOLDERS[placeholderIdx]}
              className="flex-1 bg-transparent border-0 outline-none text-sm"
              style={{ color: theme.text }}
            />

            {query && (
              <button onClick={() => setQuery('')} className="flex-shrink-0" style={{ color: theme.textLight }}>
                <X size={13} weight="bold" />
              </button>
            )}

            <button
              onClick={handleSendToPiP}
              disabled={!hasQuery}
              className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-30"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff',
                boxShadow: hasQuery ? 'inset 0 1px 1px rgba(255,255,255,0.18)' : 'none',
              }}
              title="Ask PiP"
            >
              <PaperPlaneTilt size={14} weight="bold" />
            </button>
          </div>

          {hasQuery && suggestions.length > 0 && (
            <p className="text-[10px] text-center mt-1.5" style={{ color: theme.textLight, opacity: 0.45 }}>
              Tap a result to open · ↗ to ask PiP
            </p>
          )}
          {canStartAIChat && (
            <div className="flex items-center justify-between mt-2 px-0.5">
              <span className="text-[10px]" style={{ color: theme.textLight, opacity: 0.4 }}>
                Educational only · not medical advice
              </span>
              <span
                className="text-[10px] font-semibold"
                style={{ color: theme.textLight, opacity: 0.5 }}
              >
                {quotaRemaining}/{aiDailyQuota}
              </span>
            </div>
          )}
        </div>
      </div>

      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        actionAttempted="PiP"
        theme={theme}
      />

      <style>{`
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes slideUpSmooth {
          from { opacity: 0; transform: translateY(100%); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDownSmooth {
          from { opacity: 1; transform: translateY(0); }
          to   { opacity: 0; transform: translateY(100%); }
        }
      `}</style>
    </>
  );
}
