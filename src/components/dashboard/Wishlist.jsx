import React, { useState, useMemo, useCallback, useRef } from 'react'
import { BookBookmark, Plus, PencilLine, CaretDown, X, Heart, Sparkle, ClockCounterClockwise, Check, CaretRight } from '@phosphor-icons/react'
import BottomSheet from '../common/BottomSheet'
import ModernTooltip from '../ui/ModernTooltip'
import { getDeletedItems, isDeleted } from '../../utils/deletionTracking'
import ExpandableTooltip from '../ui/ExpandableTooltip'
import { WIDGET_TOOLTIPS } from '../../utils/widgetTooltips'
import { WISHLIST_ICON_OPTIONS, getWishlistIconMeta } from './AddWishlistItemModal'
import {
  splitWishlistWantedAndHistory,
  markWishlistItemAcquired,
  restoreWishlistItemToWanted,
} from '../../utils/wishlistHistory'

const getWishlistIcon = (iconValue) => {
  if (!iconValue) return null;
  return WISHLIST_ICON_OPTIONS.find(o => o.value === iconValue)?.Icon ?? null;
};

const getWishlistIconColor = (iconValue, fallback) => {
  return getWishlistIconMeta(iconValue)?.color || fallback;
};

/** Soft vertical stagger so the board feels curated, not a rigid grid. */
const boardStaggerY = (index) => {
  const pattern = [0, 6, 2, 8, 1, 5];
  return pattern[index % pattern.length];
};

const formatAcquiredDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

/**
 * @param {'widget' | 'page'} [props.variant] — `page` = full list inline (standalone route); `widget` = dashboard card + View All sheet
 * @param {'board' | 'history' | 'all'} [props.section] — page mode: `board` = Wanted only; `history` = collapsible History below canvas; `all` unused for page
 * @param {(item: object, destination: 'order' | 'stockpile') => void} [props.onAcquireDestination] — after user marks acquired and picks next step; parent marks acquired and opens order/stockpile with prefills
 */
export default function Wishlist({ items = [], wishlist, theme, onAdd, onEdit, onAcquireDestination, isReadOnly = false, variant = 'widget', section = 'board' }) {
  const [showModal, setShowModal] = useState(false);
  const [acquirePromptItem, setAcquirePromptItem] = useState(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const isPage = variant === 'page';
  const isHistorySection = isPage && section === 'history';

  const justDeletedIdsRef = useRef(new Set());

  const initializedRef = useRef(false);
  const hasLoggedRef = useRef(false);
  if (!initializedRef.current) {
    const persistentDeletedIds = getDeletedItems('wishlist');
    persistentDeletedIds.forEach(id => {
      justDeletedIdsRef.current.add(String(id));
    });
    if (persistentDeletedIds.length > 0 && !hasLoggedRef.current) {
      hasLoggedRef.current = true;
    }
    initializedRef.current = true;
  }

  const isItemDeleted = useCallback((itemId) => {
    const idStr = String(itemId);
    return justDeletedIdsRef.current.has(idStr) || isDeleted('wishlist', idStr);
  }, []);

  const list = useMemo(() => {
    const propList = Array.isArray(wishlist) ? wishlist : items;
    const filtered = propList.filter(item => !isItemDeleted(item.id));
    const seen = new Map();
    const reversed = [...filtered].reverse();
    reversed.forEach(item => {
      const idKey = String(item.id);
      if (!seen.has(idKey)) {
        seen.set(idKey, { ...item });
      }
    });
    return Array.from(seen.values()).reverse();
  }, [wishlist, items, isItemDeleted]);

  const { wanted: wantedList, history: historyList } = useMemo(
    () => splitWishlistWantedAndHistory(list),
    [list]
  );

  const handleViewAll = () => {
    setShowModal(true);
  }

  const handleItemClick = () => {
    setShowModal(true);
  }

  const handleEditClick = (e, item) => {
    e.stopPropagation();
    if (onEdit) onEdit(item);
    if (!isPage) setShowModal(false);
  }

  const openAcquirePrompt = (e, item) => {
    e?.stopPropagation?.();
    if (isReadOnly || !onAcquireDestination) return;
    setAcquirePromptItem(item);
  };

  const confirmAcquireChoice = (destination) => {
    const item = acquirePromptItem;
    setAcquirePromptItem(null);
    if (item && onAcquireDestination) onAcquireDestination(item, destination);
  };

  const handleOnlyMarkAcquired = useCallback(() => {
    const item = acquirePromptItem;
    setAcquirePromptItem(null);
    if (!item?.id) return;
    try {
      markWishlistItemAcquired(item);
      if (wantedList.length <= 1) setShowModal(false);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: 'Moved to History', type: 'success' },
      }));
    } catch (error) {
      console.error('Error marking wishlist item as acquired:', error);
    }
  }, [acquirePromptItem, wantedList.length]);

  const handleRestoreToWanted = useCallback((e, item) => {
    e.stopPropagation();
    if (isReadOnly || !item?.id) return;
    try {
      restoreWishlistItemToWanted(item);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: 'Restored to Wanted', type: 'success' },
      }));
    } catch (error) {
      console.error('Error restoring wishlist item:', error);
    }
  }, [isReadOnly]);

  const itemMetaParts = (item) => ({
    vendor: item.vendor || null,
    price: item.price ? `$${item.price}` : null,
    dose: item.mgAmount ? `${item.mgAmount} ${(item.mgUnit || 'mg').toLowerCase()}` : null,
  });

  const itemMetaLine = (item) => {
    const { vendor, price, dose } = itemMetaParts(item);
    return [vendor, price, dose].filter(Boolean).join(' · ');
  };

  const renderSectionHeader = (Icon, label, count) => (
    <div className="flex items-center gap-2 px-4 sm:px-5 pt-3 pb-1 w-full min-w-0">
      <Icon size={14} className="opacity-40 shrink-0" style={{ color: theme.text }} weight="duotone" />
      <h2
        className="text-xs font-semibold uppercase tracking-wider opacity-40 shrink-0"
        style={{ color: theme.text }}
      >
        {label} ({count})
      </h2>
      <div
        className="flex-1 h-px min-w-0"
        style={{
          background: `linear-gradient(to right, ${theme.primary}55 0%, ${theme.primary}22 45%, transparent 100%)`,
        }}
      />
    </div>
  );

  const renderVisionBoardCard = (item, index, { isHistory = false } = {}) => {
    const Icon = getWishlistIcon(item.icon);
    const iconColor = getWishlistIconColor(item.icon, theme.primary);
    const cardShadow = theme.isDark
      ? '0 1px 2px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.28)'
      : '0 1px 2px rgba(0,0,0,0.04), 0 8px 28px rgba(0,0,0,0.07)';
    const hoverShadow = theme.isDark
      ? '0 2px 4px rgba(0,0,0,0.4), 0 14px 36px rgba(0,0,0,0.38)'
      : '0 2px 4px rgba(0,0,0,0.05), 0 14px 36px rgba(0,0,0,0.1)';
    const acquiredLabel = isHistory ? formatAcquiredDate(item.acquiredAt) : null;
    const meta = itemMetaParts(item);
    const detailBits = [meta.price, meta.dose].filter(Boolean);

    return (
      <li
        key={`wishlist-${item.id}-${item.updatedAt || ''}`}
        role={onEdit ? 'button' : undefined}
        tabIndex={onEdit ? 0 : undefined}
        className={`group relative flex flex-col rounded-2xl overflow-hidden transition-[transform,box-shadow,opacity] duration-300 ease-out hover:-translate-y-0.5 ${onEdit ? 'cursor-pointer' : ''} ${isHistory ? 'opacity-75 hover:opacity-100' : ''}`}
        style={{
          backgroundColor: theme.cardBackground,
          boxShadow: cardShadow,
          marginTop: boardStaggerY(index),
          border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : `${iconColor}22`}`,
        }}
        onClick={onEdit ? (e) => {
          handleEditClick(e, item);
        } : undefined}
        onKeyDown={onEdit ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleEditClick(e, item);
          }
        } : undefined}
        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = hoverShadow; }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = cardShadow; }}
      >
        <div
          className="absolute inset-x-0 top-0 h-14 pointer-events-none"
          style={{
            background: `linear-gradient(180deg, ${iconColor}${theme.isDark ? '22' : '14'} 0%, transparent 100%)`,
          }}
          aria-hidden="true"
        />

        <div className="relative flex flex-col gap-2.5 p-3 sm:p-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: `${iconColor}${theme.isDark ? '28' : '18'}`,
                color: iconColor,
              }}
            >
              {Icon ? (
                <Icon size={24} weight="duotone" style={{ color: iconColor }} />
              ) : (
                <Heart size={24} weight="duotone" style={{ color: iconColor }} />
              )}
            </div>
            <div
              className="flex-1 min-w-0 text-base sm:text-lg font-semibold leading-none tracking-tight truncate"
              style={{ color: theme.text }}
            >
              {item.name || item.item || 'Untitled Item'}
            </div>
          </div>

          {detailBits.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {detailBits.map((bit) => (
                <span
                  key={bit}
                  className="text-xs sm:text-[13px] font-semibold px-2.5 py-1 rounded-lg"
                  style={{
                    color: iconColor,
                    backgroundColor: `${iconColor}${theme.isDark ? '28' : '16'}`,
                  }}
                >
                  {bit}
                </span>
              ))}
            </div>
          ) : null}

          {(meta.vendor || item.notes || item.description || acquiredLabel) ? (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {meta.vendor ? (
                <span
                  className="text-[10px] font-medium px-2 py-0.5 rounded-md truncate max-w-full"
                  style={{
                    color: theme.textLight,
                    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  }}
                >
                  From: {meta.vendor}
                </span>
              ) : null}
              {(item.notes || item.description) ? (
                <span
                  className="text-[10px] font-medium px-2 py-0.5 rounded-md line-clamp-2 max-w-full"
                  style={{
                    color: theme.textLight,
                    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  }}
                >
                  {item.notes || item.description}
                </span>
              ) : null}
              {acquiredLabel ? (
                <span
                  className="text-[10px] font-medium px-2 py-0.5 rounded-md"
                  style={{
                    color: theme.textLight,
                    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  }}
                >
                  Acquired {acquiredLabel}
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="flex items-center justify-end">
            {isHistory ? (
              !isReadOnly && (
                <button
                  type="button"
                  onClick={(e) => handleRestoreToWanted(e, item)}
                  className="text-[11px] font-medium transition-all touch-manipulation"
                  style={{
                    color: theme.primary,
                    backgroundColor: 'transparent',
                    border: 'none',
                    padding: 0,
                  }}
                >
                  Restore
                </button>
              )
            ) : (
              !isReadOnly && onAcquireDestination && (
                <button
                  type="button"
                  onClick={(e) => openAcquirePrompt(e, item)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold pl-2 pr-2.5 py-1 rounded-lg transition-all touch-manipulation active:scale-[0.98]"
                  style={{
                    color: iconColor,
                    backgroundColor: `${iconColor}${theme.isDark ? '22' : '14'}`,
                    border: `1px solid ${iconColor}${theme.isDark ? '45' : '35'}`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = `${iconColor}${theme.isDark ? '30' : '22'}`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = `${iconColor}${theme.isDark ? '22' : '14'}`;
                  }}
                >
                  <Check size={12} weight="bold" />
                  Acquired
                </button>
              )
            )}
          </div>
        </div>
      </li>
    );
  };

  const detailContent = (
    <div className={isPage ? 'flex flex-col flex-1 min-h-0' : 'space-y-4'}>
      {list.length === 0 ? (
        <div className={`flex flex-col items-center justify-center gap-3 px-4 text-center ${isPage ? 'flex-1 py-16' : 'py-6'}`}>
          {isPage && (
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-1"
              style={{
                backgroundColor: theme.isDark ? `${theme.primary}22` : `${theme.primary}12`,
                color: theme.primary,
              }}
            >
              <Sparkle size={24} weight="duotone" />
            </div>
          )}
          <p className="text-sm font-medium px-2" style={{ color: isPage ? theme.text : theme.textLight }}>
            {isPage ? 'Your vision board is empty' : 'No items in wishlist'}
          </p>
          {isPage && (
            <p className="text-xs max-w-[16rem] leading-relaxed" style={{ color: theme.textLight }}>
              Pin the research you want next — vendors, doses, and prices in one place.
            </p>
          )}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onTouchStart={(e) => e.preventDefault()}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAdd(); }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors touch-manipulation mt-1"
            style={{
              color: theme.primary,
              backgroundColor: theme.isDark ? `${theme.primary}20` : `${theme.primary}15`,
              border: `1px solid ${theme.primary}40`,
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            {isPage ? 'Add your first item' : 'Add to Wishlist'}
            {!isPage && <CaretDown size={14} weight="bold" />}
            {isPage && <Plus size={14} weight="bold" />}
          </button>
        </div>
      ) : isPage ? (
        <div className="flex flex-col gap-2 pb-6">
          {renderSectionHeader(Heart, 'Wanted', wantedList.length)}
          {wantedList.length === 0 ? (
            <div className="px-4 sm:px-5 py-6 text-center">
              <p className="text-xs" style={{ color: theme.textLight }}>
                Nothing on the board — add an item or restore one from History.
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 px-3 sm:px-5 pt-2 overflow-x-hidden items-start">
              {wantedList.map((item, index) => renderVisionBoardCard(item, index, { isHistory: false }))}
            </ul>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {wantedList.map((item) => (
            <li
              key={`wishlist-${item.id}-${item.updatedAt || ''}`}
              className="relative rounded-lg border transition-colors pl-3 pr-3 pt-9 pb-10 min-h-[5.5rem]"
              style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}
            >
              <div className="flex-1 min-w-0 pr-8">
                <div className="flex items-center gap-1.5">
                  {(() => {
                    const Icon = getWishlistIcon(item.icon);
                    const iconColor = getWishlistIconColor(item.icon, theme.primary);
                    return Icon ? <Icon size={13} weight="duotone" style={{ color: iconColor, flexShrink: 0 }} /> : null;
                  })()}
                  <div className="text-sm font-semibold truncate" style={{ color: theme.text }}>{item.name || item.item || 'Untitled Item'}</div>
                </div>
                <div className="text-xs truncate mt-0.5" style={{ color: theme.textLight }}>
                  {itemMetaLine(item)}
                </div>
              </div>
              {onEdit && (
                <button
                  type="button"
                  onClick={(e) => handleEditClick(e, item)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg transition-colors touch-manipulation z-10"
                  style={{ color: theme.textLight }}
                  title="Edit wishlist item"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';
                    e.currentTarget.style.color = theme.primary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = theme.textLight;
                  }}
                >
                  <PencilLine size={16} weight="duotone" />
                </button>
              )}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-end gap-2 z-10">
                {!isReadOnly && onAcquireDestination && (
                  <button
                    type="button"
                    onClick={(e) => openAcquirePrompt(e, item)}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-solid transition-shadow touch-manipulation hover:brightness-[1.02]"
                    style={{
                      color: theme.isDark ? (theme.primaryLight || theme.primary) : (theme.primaryDark || theme.text),
                      backgroundColor: theme.isDark ? `${theme.primary}26` : theme.cardBackground,
                      borderColor: theme.isDark ? `${theme.primaryLight}50` : (theme.primaryDark || theme.primary),
                      boxShadow: theme.isDark
                        ? '0 1px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)'
                        : '0 1px 2px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.98)',
                    }}
                  >
                    Acquired
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const acquireChoiceModal = acquirePromptItem ? (
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={() => setAcquirePromptItem(null)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wishlist-acquire-title"
        className="relative w-full max-w-sm rounded-2xl p-5 pt-6 shadow-xl"
        style={{ backgroundColor: theme.cardBackground, border: `1px solid ${theme.border}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close"
          className="absolute top-3 right-3 p-1.5 rounded-lg touch-manipulation transition-colors"
          style={{ color: theme.textLight }}
          onClick={() => setAcquirePromptItem(null)}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <X size={18} weight="bold" />
        </button>
        <h3 id="wishlist-acquire-title" className="text-base font-bold pr-10 mb-4" style={{ color: theme.text }}>
          Should we…
        </h3>
        <div className="flex flex-col gap-2.5">
          <div className="flex gap-2">
            <button
              type="button"
              className="flex-1 min-w-0 py-2 px-2 rounded-xl text-xs font-semibold touch-manipulation active:scale-[0.99] transition-transform btn-primary-inset text-center leading-snug"
              style={{ backgroundColor: theme.primary, color: theme.textOnPrimary || '#ffffff' }}
              onClick={() => confirmAcquireChoice('order')}
            >
              Add as a New Order
            </button>
            <button
              type="button"
              className="flex-1 min-w-0 py-2 px-2 rounded-xl text-xs font-semibold border touch-manipulation active:scale-[0.99] transition-transform text-center leading-snug"
              style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : theme.secondary }}
              onClick={() => confirmAcquireChoice('stockpile')}
            >
              Add to Stockpile
            </button>
          </div>
          <button
            type="button"
            className="w-full py-2 rounded-xl text-xs font-medium border touch-manipulation active:scale-[0.99] transition-transform"
            style={{
              borderColor: `${theme.border}`,
              color: theme.textLight,
              backgroundColor: 'transparent',
            }}
            onClick={handleOnlyMarkAcquired}
          >
            Only Mark as Acquired
          </button>
        </div>
      </div>
    </div>
  ) : null;

  if (isHistorySection) {
    return (
      <div className="mt-4 rounded-2xl border overflow-hidden" style={{ borderColor: theme.border, backgroundColor: theme.isDark ? 'rgba(255,255,255,0.03)' : theme.cardBackground }}>
        <button
          type="button"
          onClick={() => setHistoryExpanded((v) => !v)}
          className="w-full flex items-center gap-2 px-4 sm:px-5 py-3 touch-manipulation transition-colors"
          style={{ color: theme.text }}
          aria-expanded={historyExpanded}
        >
          <ClockCounterClockwise size={14} className="opacity-40 shrink-0" weight="duotone" />
          <span className="text-xs font-semibold uppercase tracking-wider opacity-40 shrink-0">
            History ({historyList.length})
          </span>
          <div
            className="flex-1 h-px min-w-0"
            style={{
              background: `linear-gradient(to right, ${theme.primary}55 0%, ${theme.primary}22 45%, transparent 100%)`,
            }}
          />
          <CaretRight
            size={14}
            weight="bold"
            className="shrink-0 opacity-40 transition-transform duration-200"
            style={{ transform: historyExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
          />
        </button>

        {historyExpanded && (
          <div className="px-1 pb-4 sm:px-2">
            {historyList.length === 0 ? (
              <div className="px-4 py-5 text-center">
                <p className="text-xs" style={{ color: theme.textLight }}>
                  Acquired items will show up here.
                </p>
              </div>
            ) : (
              <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 px-3 sm:px-4 pt-1 overflow-x-hidden items-start">
                {historyList.map((item, index) => renderVisionBoardCard(item, index, { isHistory: true }))}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  }

  if (isPage) {
    return (
      <>
        <div className="flex flex-col flex-1 min-h-0 w-full">
          <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 space-y-4">
            {detailContent}
          </div>
        </div>
        {acquireChoiceModal}
      </>
    );
  }

  return (
    <>
    <div className="h-full flex flex-col p-4 rounded-xl content-card w-full">
      <h3 className="text-base font-bold mb-3 pb-2 flex-shrink-0 flex items-center justify-between widget-separator" style={{ color: theme.text }}>
        <span className="flex items-center gap-2">
          Wishlist
          <BookBookmark size={20} weight="duotone" style={{ color: theme.primary }} />
        </span>
        <div className="flex items-center gap-2">
          <ExpandableTooltip content={WIDGET_TOOLTIPS.wishlist} theme={theme} position="left" />
          <ModernTooltip text="Add" position="top">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
              }}
              onTouchStart={(e) => {
                e.preventDefault();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAdd();
              }}
              className="rounded-full flex items-center justify-center action-button-hover transition-colors touch-manipulation"
              style={{
                color: '#ffffff',
                backgroundColor: theme.primary,
                width: '28px',
                height: '28px',
                padding: 0,
                border: 'none',
                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.15), inset 0 1px 2px rgba(0, 0, 0, 0.1)',
                WebkitTapHighlightColor: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              <Plus size={14} strokeWidth={3.5} style={{ color: '#ffffff' }} />
            </button>
          </ModernTooltip>
        </div>
      </h3>

      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 space-y-2">
        {wantedList.length === 0 ? (
          <div className="flex-1 p-2 sm:p-4 flex flex-col items-center justify-center gap-3 min-h-0">
            <p className="text-sm text-center px-2" style={{ color: theme.textLight }}>
              No items in wishlist
            </p>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onTouchStart={(e) => e.preventDefault()}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAdd(); }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors touch-manipulation"
              style={{
                color: theme.primary,
                backgroundColor: theme.isDark ? `${theme.primary}20` : `${theme.primary}15`,
                border: `1px solid ${theme.primary}40`,
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              Add to Wishlist
              <CaretDown size={14} weight="bold" />
            </button>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {wantedList.map((it, index) => (
              <li
                key={it.id}
                onClick={handleItemClick}
                className="flex items-center justify-between py-2.5 px-3 cursor-pointer transition-all duration-200 hover:opacity-80 touch-manipulation"
                style={{
                  backgroundColor: 'transparent',
                  borderLeft: `3px solid ${theme.isDark ? 'rgba(255,255,255,0.12)' : theme.primary + '40'}`,
                  boxShadow: index < wantedList.length - 1
                    ? `0 1px 0 ${theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(127, 158, 149, 0.08)'}`
                    : 'none',
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate" style={{ color: theme.text }}>{it.name || it.item || 'Untitled Item'}</div>
                  <div className="text-xs truncate" style={{ color: theme.textLight }}>
                    {it.vendor && <span>{it.vendor}</span>}
                    {it.vendor && it.price && <span> • </span>}
                    {it.price && <span>${it.price}</span>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {wantedList.length > 0 && (
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
          }}
          onTouchStart={(e) => {
            e.preventDefault();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleViewAll();
          }}
          className="mt-3 text-sm text-center hover:underline transition-all duration-200 flex-shrink-0 cursor-pointer touch-manipulation"
          style={{
            color: theme.primary,
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          View All
        </button>
      )}

      <BottomSheet
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Research Wishlist"
        theme={theme}
        maxHeight="90vh"
        footer={wantedList.length > 0 ? (
          <button
            type="button"
            onClick={onAdd}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98] touch-manipulation btn-primary-inset"
            style={{ backgroundColor: theme.primary, color: theme.textOnPrimary || '#ffffff', WebkitTapHighlightColor: 'transparent' }}
          >
            <Plus size={18} />
            Add New Item
          </button>
        ) : null}
      >
        {detailContent}
      </BottomSheet>

    </div>
    {acquireChoiceModal}
    </>
  )
}
