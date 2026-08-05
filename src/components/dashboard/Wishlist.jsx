import React, { useState, useMemo, useCallback, useRef } from 'react'
import { BookBookmark, Plus, PencilLine, CaretDown, X, Heart, Sparkle } from '@phosphor-icons/react'
import BottomSheet from '../common/BottomSheet'
import ModernTooltip from '../ui/ModernTooltip'
import { getDeletedItems, isDeleted } from '../../utils/deletionTracking'
import ExpandableTooltip from '../ui/ExpandableTooltip'
import { WIDGET_TOOLTIPS } from '../../utils/widgetTooltips'
import { WISHLIST_ICON_OPTIONS, getWishlistIconMeta } from './AddWishlistItemModal'

const getWishlistIcon = (iconValue) => {
  if (!iconValue) return null;
  return WISHLIST_ICON_OPTIONS.find(o => o.value === iconValue)?.Icon ?? null;
};

const getWishlistIconColor = (iconValue, fallback) => {
  return getWishlistIconMeta(iconValue)?.color || fallback;
};

/** Soft vertical stagger so the board feels curated, not a rigid grid. */
const boardStaggerY = (index) => {
  const pattern = [0, 10, 4, 14, 2, 8];
  return pattern[index % pattern.length];
};

/**
 * @param {'widget' | 'page'} [props.variant] — `page` = full list inline (standalone route); `widget` = dashboard card + View All sheet
 * @param {(item: object, destination: 'order' | 'stockpile') => void} [props.onAcquireDestination] — after user marks acquired and picks next step; parent removes item and opens order/stockpile with prefills
 */
export default function Wishlist({ items = [], wishlist, theme, onAdd, onEdit, onAcquireDestination, isReadOnly = false, variant = 'widget' }) {
  const [showModal, setShowModal] = useState(false);
  const [acquirePromptItem, setAcquirePromptItem] = useState(null);
  const isPage = variant === 'page';
  
  // Ref to track if we just deleted an item (prevent props from restoring it)
  const justDeletedIdsRef = useRef(new Set());
  
  // Initialize deleted IDs from persistent deletion tracking on mount ONLY
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
  
  // Helper function to check if an item is deleted (uses both ref and persistent tracking)
  const isItemDeleted = useCallback((itemId) => {
    const idStr = String(itemId);
    return justDeletedIdsRef.current.has(idStr) || isDeleted('wishlist', idStr);
  }, []);
  
  // Helper function to deduplicate array by ID (keep last occurrence)
  const deduplicateById = useCallback((items) => {
    const seen = new Map();
    const reversed = [...items].reverse();
    reversed.forEach(item => {
      const idKey = String(item.id);
      if (!seen.has(idKey)) {
        seen.set(idKey, { ...item });
      }
    });
    return Array.from(seen.values()).reverse();
  }, []);
  
  // Use props directly, filter in useMemo
  const list = useMemo(() => {
    const propList = Array.isArray(wishlist) ? wishlist : items;
    
    // Filter deleted items using persistent tracking
    const filtered = propList.filter(item => !isItemDeleted(item.id));
    
    // Deduplicate
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

  /** Remove from wishlist only (no order / stockpile); does not use deletion-restore tracking. */
  const handleOnlyMarkAcquired = useCallback(() => {
    const item = acquirePromptItem;
    setAcquirePromptItem(null);
    if (!item?.id) return;
    try {
      const raw = localStorage.getItem('tpprover_wishlist');
      const prev = raw ? JSON.parse(raw) : [];
      const updatedItems = prev.filter((i) => String(i.id) !== String(item.id));
      const deduped = deduplicateById(updatedItems);
      localStorage.setItem('tpprover_wishlist', JSON.stringify(deduped));
      localStorage.setItem('tpprover_wishlist_lastUpdate', String(Date.now()));
      window.dispatchEvent(new CustomEvent('tpp:wishlist-updated', { detail: { wishlist: deduped } }));
      if (deduped.length === 0) setShowModal(false);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: 'Marked as acquired', type: 'success' },
      }));
    } catch (error) {
      console.error('Error marking wishlist item as acquired:', error);
    }
  }, [acquirePromptItem, deduplicateById]);

  const itemMetaLine = (item) => {
    const parts = [
      item.vendor,
      item.price ? `$${item.price}` : null,
      item.mgAmount ? `${item.mgAmount} ${(item.mgUnit || 'mg').toLowerCase()}` : null,
    ].filter(Boolean);
    return parts.join(' · ');
  };

  const renderVisionBoardCard = (item, index) => {
    const Icon = getWishlistIcon(item.icon);
    const iconColor = getWishlistIconColor(item.icon, theme.primary);
    const cardShadow = theme.isDark
      ? '0 1px 2px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.28)'
      : '0 1px 2px rgba(0,0,0,0.04), 0 8px 28px rgba(0,0,0,0.07)';
    const hoverShadow = theme.isDark
      ? '0 2px 4px rgba(0,0,0,0.4), 0 14px 36px rgba(0,0,0,0.38)'
      : '0 2px 4px rgba(0,0,0,0.05), 0 14px 36px rgba(0,0,0,0.1)';

    return (
      <li
        key={`wishlist-${item.id}-${item.updatedAt || ''}`}
        role={onEdit ? 'button' : undefined}
        tabIndex={onEdit ? 0 : undefined}
        className={`group relative flex flex-col rounded-2xl overflow-hidden transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-0.5 ${onEdit ? 'cursor-pointer' : ''}`}
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
        {/* Soft top wash tinted by icon color */}
        <div
          className="absolute inset-x-0 top-0 h-16 pointer-events-none"
          style={{
            background: `linear-gradient(180deg, ${iconColor}${theme.isDark ? '22' : '14'} 0%, transparent 100%)`,
          }}
          aria-hidden="true"
        />

        <div className="relative flex flex-col flex-1 p-3.5 sm:p-4 min-h-[8.5rem]">
          <div className="flex items-start gap-2.5 mb-3">
            <div
              className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{
                backgroundColor: `${iconColor}${theme.isDark ? '28' : '18'}`,
                color: iconColor,
              }}
            >
              {Icon ? (
                <Icon size={26} weight="duotone" style={{ color: iconColor }} />
              ) : (
                <Heart size={26} weight="duotone" style={{ color: iconColor }} />
              )}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <div
                className="text-[15px] font-semibold leading-snug tracking-tight truncate"
                style={{ color: theme.text }}
              >
                {item.name || item.item || 'Untitled Item'}
              </div>
              {itemMetaLine(item) ? (
                <div
                  className="text-[11px] mt-1 leading-relaxed truncate"
                  style={{ color: theme.textLight }}
                >
                  {itemMetaLine(item)}
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-auto flex items-center justify-end gap-2 pt-1">
            {!isReadOnly && onAcquireDestination && (
              <button
                type="button"
                onClick={(e) => openAcquirePrompt(e, item)}
                className="text-[11px] font-semibold px-3 py-1.5 rounded-full transition-all touch-manipulation active:scale-[0.98] btn-primary-inset"
                style={{
                  color: theme.textOnPrimary || '#fff',
                  backgroundColor: theme.primary,
                }}
              >
                Acquired
              </button>
            )}
          </div>
        </div>
      </li>
    );
  };

  // Shared: full detail list (same rows as "View all" bottom sheet)
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
        <>
          <div className="flex items-center gap-2 px-4 sm:px-5 pt-3 pb-1 w-full min-w-0">
            <Heart size={14} className="opacity-40 shrink-0" style={{ color: theme.text }} weight="duotone" />
            <h2
              className="text-xs font-semibold uppercase tracking-wider opacity-40 shrink-0"
              style={{ color: theme.text }}
            >
              Wanted ({list.length})
            </h2>
            <div
              className="flex-1 h-px min-w-0"
              style={{
                background: `linear-gradient(to right, ${theme.primary}55 0%, ${theme.primary}22 45%, transparent 100%)`,
              }}
            />
          </div>
          <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 px-3 sm:px-5 pt-2 pb-6 overflow-x-hidden items-start">
            {list.map((item, index) => renderVisionBoardCard(item, index))}
          </ul>
        </>
      ) : (
        <ul className="space-y-2">
          {list.map((item) => (
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
        {list.length === 0 ? (
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
            {list.map((it, index) => (
              <li 
                key={it.id} 
                onClick={handleItemClick}
                className="flex items-center justify-between py-2.5 px-3 cursor-pointer transition-all duration-200 hover:opacity-80 touch-manipulation" 
                style={{ 
                  backgroundColor: 'transparent',
                  borderLeft: `3px solid ${theme.isDark ? 'rgba(255,255,255,0.12)' : theme.primary + '40'}`,
                  boxShadow: index < list.length - 1
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
      
      {list.length > 0 && (
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
        footer={list.length > 0 ? (
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
