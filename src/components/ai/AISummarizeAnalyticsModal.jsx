import React, { useEffect, useState } from 'react';
import {
  X,
  ChartLine,
  CircleNotch,
  Warning,
  Info,
  ChatCircle,
  Flame,
  CurrencyDollar,
  Package,
  Target,
} from '@phosphor-icons/react';
import {
  getLocalAnalyticsSummary,
  formatAnalyticsSummaryForPip,
  ANALYTICS_HANDOFF_DISPLAY,
} from '../../services/aiResearch';
import { openPipChat } from '../../utils/pipOpen';
import pipAvatar from '../../assets/PiP.png';

const ICON_WEIGHT = 'duotone';

const FLAG_META = {
  caution: { Icon: Warning, color: '#c4922a' },
  note: { Icon: Info, color: '#7F9E95' },
};

function renderRichText(text) {
  if (!text) return null;
  const parts = String(text).split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1
      ? <strong key={i}>{part}</strong>
      : <span key={i}>{part}</span>
  );
}

function StatTile({ label, value, theme }) {
  return (
    <div
      className="flex-1 min-w-0 rounded-xl px-3 py-2.5 text-center"
      style={{
        backgroundColor: theme?.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
        border: `1px solid ${theme?.border || 'rgba(0,0,0,0.06)'}`,
      }}
    >
      <div className="text-lg font-bold tabular-nums leading-none truncate" style={{ color: theme?.text }}>
        {value}
      </div>
      <div className="text-[10px] font-semibold uppercase tracking-wider mt-1" style={{ color: theme?.textLight }}>
        {label}
      </div>
    </div>
  );
}

/**
 * Analytics Summarize modal — visual snapshot (not chat bubbles).
 * "Want to know more?" opens P.i.P with the summary handed off into chat.
 */
export default function AISummarizeAnalyticsModal({
  open,
  theme,
  overviewData = {},
  complianceData = {},
  stats = {},
  protocols = [],
  supplements = [],
  onClose,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [handingOff, setHandingOff] = useState(false);

  useEffect(() => {
    if (!open) {
      setHandingOff(false);
      return;
    }
    setResult(null);
    setError(null);
    setHandingOff(false);
    setLoading(true);
    try {
      const local = getLocalAnalyticsSummary({
        overviewData,
        complianceData,
        stats,
        protocols,
        supplements,
      });
      setResult(local);
    } catch (e) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
    // Snapshot once when the modal opens (same pattern as Analyze Stack open intent)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const overview = result?.overview || null;

  const handleWantToKnowMore = () => {
    if (!result || handingOff) return;
    setHandingOff(true);
    const prompt = formatAnalyticsSummaryForPip(result);
    window.setTimeout(() => {
      onClose?.();
      openPipChat({
        prompt,
        autoSend: true,
        freshChat: true,
        displayContent: ANALYTICS_HANDOFF_DISPLAY,
      });
    }, 420);
  };

  if (!open) return null;

  const primary = theme?.primary || '#7F9E95';
  const border = theme?.border || 'rgba(0,0,0,0.08)';
  const oStats = overview?.stats || {};

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3"
      style={{
        backgroundColor: handingOff ? 'rgba(0,0,0,0.62)' : 'rgba(0,0,0,0.5)',
        transition: 'background-color 280ms ease',
      }}
      onClick={handingOff ? undefined : onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col relative"
        style={{
          backgroundColor: theme?.cardBackground || theme?.white || '#fff',
          border: `1px solid ${border}`,
          maxHeight: '88vh',
          opacity: handingOff ? 0.92 : 1,
          transform: handingOff ? 'translateY(8px) scale(0.985)' : 'none',
          transition: 'opacity 280ms ease, transform 320ms ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {handingOff && (
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-6"
            style={{
              backgroundColor: theme?.isDark ? 'rgba(14,18,25,0.92)' : 'rgba(255,255,255,0.94)',
              backdropFilter: 'blur(6px)',
            }}
          >
            <img src={pipAvatar} alt="PiP" className="w-12 h-12 rounded-full object-cover animate-pulse" />
            <p className="text-sm font-semibold text-center" style={{ color: theme?.text }}>
              Opening PiP with your summary…
            </p>
            <p className="text-[11px] text-center" style={{ color: theme?.textLight }}>
              Carrying over your analytics now
            </p>
          </div>
        )}

        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3.5 flex-shrink-0"
          style={{
            background: theme?.isDark
              ? `linear-gradient(135deg, ${primary}22 0%, transparent 70%)`
              : `linear-gradient(135deg, ${primary}14 0%, transparent 70%)`,
            borderBottom: `1px solid ${border}`,
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${primary}20`, border: `1px solid ${primary}35` }}
            >
              <ChartLine size={16} weight={ICON_WEIGHT} color={primary} />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm leading-tight" style={{ color: theme?.text }}>
                Analytics Summary
              </h3>
              <p className="text-[10px] leading-tight mt-0.5 truncate" style={{ color: theme?.textLight }}>
                Progress snapshot · not medical advice
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg flex-shrink-0"
            style={{ color: theme?.textLight }}
            disabled={handingOff}
            type="button"
          >
            <X size={16} weight={ICON_WEIGHT} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {loading && (
            <div className="flex items-center gap-2 py-8 justify-center">
              <CircleNotch size={14} weight={ICON_WEIGHT} color={primary} className="animate-spin" />
              <span className="text-sm" style={{ color: theme?.textLight }}>Building summary…</span>
            </div>
          )}

          {error && (
            <div
              className="rounded-xl p-3 text-xs flex items-start gap-2"
              style={{
                backgroundColor: 'rgba(214,69,69,0.09)',
                color: '#d64545',
                border: '1px solid rgba(214,69,69,0.30)',
              }}
            >
              <Warning size={13} weight={ICON_WEIGHT} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result && overview && (
            <>
              <p className="text-xs leading-relaxed" style={{ color: theme?.text }}>
                {result.summary}
              </p>

              <div className="flex gap-2">
                <StatTile
                  label="Compliance"
                  value={oStats.compliancePct != null ? `${oStats.compliancePct}%` : '—'}
                  theme={theme}
                />
                <StatTile label="Streak" value={`${oStats.streak ?? 0}d`} theme={theme} />
                <StatTile label="Grade" value={oStats.grade || '—'} theme={theme} />
              </div>

              <div className="flex gap-2">
                <StatTile label="Doses 30d" value={oStats.doses30 ?? 0} theme={theme} />
                <StatTile label="Active" value={oStats.activeCount ?? 0} theme={theme} />
                <StatTile label="Tracking" value={oStats.daysTracking ? `${oStats.daysTracking}d` : '—'} theme={theme} />
              </div>

              {Array.isArray(result.spending) && result.spending.length > 0 && (
                <section>
                  <div className="flex items-center gap-1.5 mb-2">
                    <CurrencyDollar size={12} weight={ICON_WEIGHT} color={primary} />
                    <h4 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: theme?.textLight }}>
                      Spending
                    </h4>
                  </div>
                  <div
                    className="rounded-xl overflow-hidden divide-y"
                    style={{
                      border: `1px solid ${border}`,
                      backgroundColor: theme?.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
                    }}
                  >
                    {result.spending.map((row) => (
                      <div key={row.label} className="px-3 py-2 flex items-center justify-between gap-2">
                        <span className="text-[11px]" style={{ color: theme?.textLight }}>{row.label}</span>
                        <span className="text-xs font-semibold tabular-nums" style={{ color: theme?.text }}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {overview.protocols?.length > 0 && (
                <section>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Target size={12} weight={ICON_WEIGHT} color={theme?.textLight} />
                    <h4 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: theme?.textLight }}>
                      Active protocols
                    </h4>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {overview.protocols.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold max-w-full truncate"
                        style={{
                          backgroundColor: theme?.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(127,158,149,0.12)',
                          color: primary,
                          border: `1px solid ${theme?.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(127,158,149,0.22)'}`,
                        }}
                        title={name}
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {result.flags?.length > 0 && (
                <section className="space-y-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Flame size={12} weight={ICON_WEIGHT} color={theme?.textLight} />
                    <h4 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: theme?.textLight }}>
                      Notes
                    </h4>
                  </div>
                  {result.flags.map((flag, i) => {
                    const Icon = FLAG_META[flag.type]?.Icon || Info;
                    const color = FLAG_META[flag.type]?.color || primary;
                    return (
                      <div
                        key={`${flag.title}-${i}`}
                        className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl"
                        style={{
                          backgroundColor: flag.type === 'caution'
                            ? 'rgba(228,167,47,0.08)'
                            : (theme?.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
                          border: `1px solid ${flag.type === 'caution' ? 'rgba(228,167,47,0.25)' : border}`,
                        }}
                      >
                        <Icon size={14} weight={ICON_WEIGHT} color={color} className="mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold" style={{ color }}>
                            {flag.title}
                          </p>
                          <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: theme?.textLight }}>
                            {renderRichText(flag.body)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </section>
              )}

              {(overview.lowStockCount > 0 || overview.endingSoonCount > 0) && (
                <div className="flex items-center gap-2 text-[10px]" style={{ color: theme?.textLight }}>
                  <Package size={12} weight={ICON_WEIGHT} />
                  <span>
                    {overview.lowStockCount > 0 && `${overview.lowStockCount} low stock`}
                    {overview.lowStockCount > 0 && overview.endingSoonCount > 0 && ' · '}
                    {overview.endingSoonCount > 0 && `${overview.endingSoonCount} ending soon`}
                  </span>
                </div>
              )}

              <p className="text-[10px] text-center pt-1" style={{ color: theme?.textLight, opacity: 0.75 }}>
                {result.disclaimer}
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between gap-2 px-3 py-2.5 flex-shrink-0"
          style={{ borderTop: `1px solid ${border}` }}
        >
          {result && (
            <button
              type="button"
              onClick={handleWantToKnowMore}
              disabled={handingOff}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold active:scale-95 disabled:opacity-70"
              style={{ backgroundColor: `${primary}18`, color: primary }}
            >
              {handingOff
                ? <CircleNotch size={12} weight={ICON_WEIGHT} className="animate-spin" />
                : <ChatCircle size={12} weight={ICON_WEIGHT} />}
              {handingOff ? 'Opening PiP…' : 'Want to know more?'}
            </button>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            disabled={handingOff}
            className="px-4 py-1.5 rounded-full font-semibold text-sm active:scale-95 disabled:opacity-60"
            style={{ backgroundColor: primary, color: '#fff' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
