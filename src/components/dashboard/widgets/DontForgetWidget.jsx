import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClockCountdown,
  ClipboardText,
  Package,
  Storefront,
  ListChecks as PhListChecks,
  X,
} from '@phosphor-icons/react';
import ExpandableTooltip from '../../ui/ExpandableTooltip';
import { WIDGET_TOOLTIPS } from '../../../utils/widgetTooltips';
import { buildActionItems } from '../../../utils/actionItems';
import {
  dismissActionItem,
  getDismissedActionItems,
  undismissActionItem,
} from '../../../utils/actionItemDismissals';
import { useIsSimpleMode } from '../../../hooks/useIsSimpleMode';

const TYPE_ICONS = {
  'ending-today': ClockCountdown,
  'ending-soon': ClockCountdown,
  'follow-up': ClipboardText,
  'stockpile-entry': Package,
  vendor: Storefront,
};

const DontForgetWidget = ({
  widget,
  theme,
  vendors = [],
  stockpile = [],
  protocols = [],
  onCompleteVendor,
  onViewAllVendors,
  onOpenFollowUp,
  onEditStockpileItem,
  isReadOnly,
  onUpgrade,
  hideHeader = false,
  onClose,
}) => {
  const navigate = useNavigate();
  const simpleMode = useIsSimpleMode();
  const [dismissedMap, setDismissedMap] = useState(() => getDismissedActionItems());
  const [undo, setUndo] = useState(null); // { id, title, timer }

  useEffect(() => {
    const sync = () => setDismissedMap(getDismissedActionItems());
    window.addEventListener('tpp:action-items-dismissed-changed', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('tpp:action-items-dismissed-changed', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => () => {
    if (undo?.timer) clearTimeout(undo.timer);
  }, [undo]);

  const allItems = useMemo(
    () => buildActionItems({ vendors, stockpile, protocols, simpleMode, dismissedMap }),
    [vendors, stockpile, protocols, simpleMode, dismissedMap]
  );

  const handleUndo = useCallback(() => {
    if (!undo?.id) return;
    if (undo.timer) clearTimeout(undo.timer);
    const restored = undismissActionItem(undo.id);
    setDismissedMap(restored);
    setUndo(null);
  }, [undo]);

  const handleDismiss = useCallback((e, item) => {
    e.preventDefault();
    e.stopPropagation();
    if (isReadOnly) { onUpgrade?.(); return; }
    if (undo?.timer) clearTimeout(undo.timer);
    const next = dismissActionItem(item.id);
    setDismissedMap(next);
    const timer = setTimeout(() => setUndo(null), 5000);
    setUndo({ id: item.id, title: item.title, timer });
  }, [isReadOnly, onUpgrade, undo]);

  const handleClick = (item) => {
    if (isReadOnly) { onUpgrade?.(); return; }

    if (item.type === 'vendor') {
      onCompleteVendor?.(item.data);
    } else if (item.type === 'follow-up') {
      if (onOpenFollowUp) {
        onOpenFollowUp(item.data.protocolId, item.data.id);
      } else {
        onClose?.();
        navigate('/app/protocols', { state: { openFollowUpHistoryId: item.data.id, openFollowUpProtocolId: item.data.protocolId } });
      }
    } else if (item.type === 'stockpile-entry') {
      if (onEditStockpileItem) { onEditStockpileItem(item.data); }
      else { onClose?.(); navigate('/app/stockpile', { state: { openStockpileId: item.data.id } }); }
    } else if (item.type === 'ending-today' || item.type === 'ending-soon') {
      onClose?.();
      navigate('/app/protocols');
    }
  };

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('tpp:action-item-count', { detail: { count: allItems.length } }));
  }, [allItems.length]);

  return (
    <div className="flex flex-col">
      {!hideHeader && (
        <div className="px-4 py-3 widget-separator" style={{ borderColor: theme.isDark ? 'transparent' : 'rgba(47, 59, 58, 0.4)' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold flex items-center gap-2" style={{ color: theme.text }}>
              To-Do
              <PhListChecks size={20} weight="duotone" style={{ color: theme.primary, opacity: 0.7 }} />
            </h3>
            <div className="flex items-center gap-2">
              {allItems.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${theme.primary}18`, color: theme.primary }}>
                  {allItems.length}
                </span>
              )}
              <ExpandableTooltip content={WIDGET_TOOLTIPS.dont_forget} theme={theme} />
            </div>
          </div>
        </div>
      )}

      <div className={`overflow-y-auto ${hideHeader ? 'px-1 pb-1' : 'p-4'} max-h-[min(70vh,36rem)]`}>
        {allItems.length === 0 && !undo ? (
          <div className="py-8 px-4 flex flex-col items-center justify-center gap-2">
            <PhListChecks size={32} weight="duotone" style={{ color: theme.primary, opacity: 0.3 }} />
            <p className="text-sm text-center px-2" style={{ color: theme.textLight }}>
              You're all caught up
            </p>
            <p className="text-xs text-center px-2 max-w-[220px]" style={{ color: theme.textLight, opacity: 0.7 }}>
              Follow-ups, ending protocols, and missing profile details show up here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {allItems.map((item) => {
              const Icon = TYPE_ICONS[item.type] || ClipboardText;
              const hasMissing = Array.isArray(item.missing) && item.missing.length > 0;
              const accent = item.badgeColor || item.iconColor;
              return (
                <div
                  key={item.id}
                  className="w-full flex items-stretch rounded-xl overflow-hidden transition-all duration-200 group"
                  style={{
                    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)',
                    border: `1px solid ${hasMissing ? `${accent}28` : (theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)')}`,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleClick(item)}
                    className="min-w-0 flex-1 flex items-stretch text-left active:scale-[0.99] transition-transform"
                  >
                    <div
                      className="w-11 flex-shrink-0 flex items-center justify-center self-stretch"
                      style={{ backgroundColor: `${accent}14` }}
                    >
                      <Icon size={20} weight="duotone" color={accent} />
                    </div>

                    <div className="min-w-0 flex-1 px-3 py-2.5 flex flex-col gap-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className="font-semibold text-[13px] leading-snug truncate"
                          style={{ color: theme.text }}
                          title={item.title}
                        >
                          {item.title}
                        </span>
                        {item.badge && (
                          <span
                            className="text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-lg flex-shrink-0"
                            style={{ backgroundColor: `${accent}18`, color: accent }}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>

                      <span
                        className="text-[12px] font-medium leading-snug"
                        style={{ color: theme.text, opacity: 0.78 }}
                      >
                        {item.action}
                      </span>

                      {hasMissing ? (
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span
                            className="text-[11px] font-semibold flex-shrink-0"
                            style={{ color: theme.textLight, opacity: 0.75 }}
                          >
                            Missing
                          </span>
                          {item.missing.map((field) => (
                            <span
                              key={field}
                              className="text-[11px] font-semibold px-2 py-1 rounded-lg capitalize"
                              style={{
                                backgroundColor: `${accent}18`,
                                color: accent,
                              }}
                            >
                              {field}
                            </span>
                          ))}
                        </div>
                      ) : (item.meta || item.detail) ? (
                        <div
                          className="flex items-center gap-1.5 mt-0.5 text-[11px] leading-snug truncate"
                          style={{ color: theme.textLight, opacity: 0.9 }}
                        >
                          {item.meta && (
                            <span className="tabular-nums flex-shrink-0" title={item.metaDate || item.meta}>
                              {item.meta}
                            </span>
                          )}
                          {item.meta && item.detail && (
                            <span className="opacity-40 flex-shrink-0" aria-hidden>·</span>
                          )}
                          {item.detail && (
                            <span className="truncate" title={item.detail}>
                              {item.detail}
                            </span>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDismiss(e, item)}
                    aria-label={`Dismiss ${item.title}`}
                    title="Dismiss"
                    className="w-10 flex-shrink-0 flex items-center justify-center transition-all opacity-45 hover:opacity-100 active:scale-95 border-l"
                    style={{
                      color: theme.textLight,
                      borderColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                      backgroundColor: theme.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                    }}
                  >
                    <X size={14} weight="bold" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {undo && (
        <div
          className="mx-4 mb-3 px-3 py-2.5 rounded-xl flex items-center justify-between gap-3"
          style={{
            backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
          }}
        >
          <span className="text-xs truncate" style={{ color: theme.textLight }}>
            Dismissed <span style={{ color: theme.text, fontWeight: 600 }}>{undo.title}</span>
          </span>
          <button
            type="button"
            onClick={handleUndo}
            className="text-xs font-bold uppercase tracking-wide flex-shrink-0 px-2 py-1 rounded-lg active:scale-95"
            style={{ color: theme.primary, backgroundColor: `${theme.primary}14` }}
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
};

export default DontForgetWidget;
