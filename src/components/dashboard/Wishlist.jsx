import React, { useState, useMemo, useCallback, useRef } from 'react'
import { BookHeart, Plus, Edit, Trash2, ChevronDown, X } from 'lucide-react'
import BottomSheet from '../common/BottomSheet'
import ConfirmationModal from '../ui/ConfirmationModal'
import ModernTooltip from '../ui/ModernTooltip'
import { recordDeletion, getDeletedItems, isDeleted } from '../../utils/deletionTracking'
import ExpandableTooltip from '../ui/ExpandableTooltip'
import { WIDGET_TOOLTIPS } from '../../utils/widgetTooltips'

/**
 * @param {'widget' | 'page'} [props.variant] — `page` = full list inline (standalone route); `widget` = dashboard card + View All sheet
 * @param {(item: object, destination: 'order' | 'stockpile') => void} [props.onAcquireDestination] — after user marks acquired and picks next step; parent removes item and opens order/stockpile with prefills
 */
export default function Wishlist({ items = [], wishlist, theme, onAdd, onEdit, onAcquireDestination, isReadOnly = false, variant = 'widget' }) {
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
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

  /** Vision-board accents — derived from active theme (no fixed hex decor). */
  const visionDeco = useMemo(() => {
    const tapeBg = theme.primaryLight || theme.primary;
    // Title chip: use accent band (not warning/amber — reads as “random yellow” on light themes)
    const pillBg = theme.isDark
      ? `${theme.primary || theme.accent || '#888'}24`
      : (theme.accent || theme.secondary || theme.cardBackground);
    const pillBorder = theme.isDark
      ? `${theme.primaryLight || theme.primary}55`
      : (theme.border || `${theme.primary}35`);
    const pillText = theme.isDark ? theme.text : (theme.accentText || theme.text);
    return {
      tapeBg,
      tapeBorder: theme.isDark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.55)',
      tapeShadow: theme.isDark ? '0 2px 10px rgba(0,0,0,0.45)' : '0 1px 5px rgba(0,0,0,0.12)',
      metalStroke: theme.textLight || theme.border,
      pinFill: theme.textLight || theme.border,
      pinHi: theme.cardBackground,
      pinShadow: theme.isDark ? '0 1px 3px rgba(0,0,0,0.65)' : '0 1px 3px rgba(0,0,0,0.35)',
      clipShadow: theme.isDark ? '0 1px 6px rgba(0,0,0,0.4)' : '0 1px 4px rgba(0,0,0,0.12)',
      heartFill: theme.primary,
      pillBg,
      pillBorder,
      pillText,
    };
  }, [theme]);
  
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

  const handleDelete = (itemId) => {
    setDeleteConfirmId(itemId);
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

  const confirmDelete = (itemId) => {
    try {
      const updatedItems = list.filter(item => String(item.id) !== String(itemId));
      const deduped = deduplicateById(updatedItems);
      localStorage.setItem('tpprover_wishlist', JSON.stringify(deduped));
      localStorage.setItem('tpprover_wishlist_lastUpdate', String(Date.now()));
      window.dispatchEvent(new CustomEvent('tpp:wishlist-updated', { detail: { wishlist: deduped } }));
      justDeletedIdsRef.current.add(String(itemId));
      const itemToDelete = list.find(item => String(item.id) === String(itemId));
      if (itemToDelete) recordDeletion('wishlist', String(itemId), itemToDelete);
      else recordDeletion('wishlist', String(itemId));
      setDeleteConfirmId(null);
      if (deduped.length === 0) setShowModal(false);
    } catch (error) {
      console.error('Error deleting wishlist item:', error);
    }
  }

  // Shared: full detail list (same rows as "View all" bottom sheet)
  const detailContent = (
    <div className="space-y-4">
      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-6 px-4 text-center">
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
            <ChevronDown size={14} />
          </button>
        </div>
      ) : (
        <ul className={isPage ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 px-3 sm:px-4 py-4 overflow-x-hidden" : "space-y-2"}>
          {list.map((item, index) => {
            if (!isPage) {
              return (
                <li
                  key={`wishlist-${item.id}-${item.updatedAt || ''}`}
                  className="relative rounded-lg border transition-colors pl-3 pr-3 pt-9 pb-10 min-h-[5.5rem]"
                  style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}
                >
                  <div className="flex-1 min-w-0 pr-8">
                    <div className="text-sm font-semibold truncate" style={{ color: theme.text }}>{item.name || item.item || 'Untitled Item'}</div>
                    <div className="text-xs truncate mt-0.5" style={{ color: theme.textLight }}>
                      {[item.vendor, item.price && `$${item.price}`].filter(Boolean).join(' • ')}
                      {item.mgAmount && ` • ${item.mgAmount} ${(item.mgUnit || 'mg').toLowerCase()}`}
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
                      <Edit size={16} />
                    </button>
                  )}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2 z-10">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                      className="p-1.5 rounded-lg transition-colors touch-manipulation"
                      style={{ color: theme.textLight }}
                      title="Delete wishlist item"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(220,38,38,0.2)' : 'rgba(220,38,38,0.1)';
                        e.currentTarget.style.color = theme.error || '#DC2626';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = theme.textLight;
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
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
              );
            }

            // isPage vision board styles matching app aesthetic
            const rotations = ['-rotate-2', 'rotate-3', '-rotate-3', 'rotate-1', '-rotate-1', 'rotate-2'];
            const rot = rotations[index % rotations.length];
            
            const styles = [
              // Style 1: Polaroid-like with app card background
              { 
                bg: theme.cardBackground, 
                text: theme.text, 
                sub: theme.textLight, 
                p: 'p-3 pb-8', 
                border: `border-[6px]`, 
                borderColor: theme.border,
                shadow: 'shadow-[0_4px_12px_rgba(0,0,0,0.08)]', 
                deco: 'tape-top' 
              },
              // Style 2: Subtle warm tint (theme secondary / warning wash)
              { 
                bg: theme.isDark ? 'rgba(255,255,255,0.03)' : (theme.secondary || theme.cardBackground), 
                text: theme.text, 
                sub: theme.textLight, 
                p: 'p-4', 
                border: 'border', 
                borderColor: theme.border,
                shadow: 'shadow-[2px_2px_8px_rgba(0,0,0,0.05)]', 
                deco: 'oval-title' 
              },
              // Style 3: Subtle cool tint (page background tone)
              { 
                bg: theme.isDark ? 'rgba(255,255,255,0.02)' : (theme.background || theme.secondary || theme.cardBackground), 
                text: theme.text, 
                sub: theme.textLight, 
                p: 'p-3 pb-6', 
                border: 'border', 
                borderColor: theme.border,
                shadow: 'shadow-[0_2px_10px_rgba(0,0,0,0.04)]', 
                deco: 'tape-corners' 
              },
              // Style 4: Standard card with clip
              { 
                bg: theme.cardBackground, 
                text: theme.text, 
                sub: theme.textLight, 
                p: 'p-4', 
                border: 'border', 
                borderColor: theme.border,
                shadow: 'shadow-[0_2px_8px_rgba(0,0,0,0.04)]', 
                deco: 'clip' 
              },
              // Style 5: Deeper contrast card
              { 
                bg: theme.isDark ? 'rgba(0,0,0,0.22)' : (theme.secondary || theme.cardBackground), 
                text: theme.text, 
                sub: theme.textLight, 
                p: 'p-4', 
                border: 'border', 
                borderColor: theme.border,
                shadow: 'shadow-[0_6px_16px_rgba(0,0,0,0.08)]', 
                deco: 'pin' 
              }
            ];
            
            const st = styles[index % styles.length];

            return (
              <li
                key={`wishlist-${item.id}-${item.updatedAt || ''}`}
                className={`relative flex flex-col justify-between gap-3 ${st.p} ${st.border} ${st.shadow} ${rot} transition-shadow duration-300 hover:z-10 hover:shadow-lg pb-12`}
                style={{ backgroundColor: st.bg, borderColor: st.borderColor }}
              >
                {/* Decorators */}
                {st.deco === 'tape-top' && (
                  <div
                    className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-4 -rotate-2 z-10 backdrop-blur-sm rounded-[2px]"
                    style={{
                      backgroundColor: visionDeco.tapeBg,
                      opacity: 0.9,
                      borderWidth: 1,
                      borderStyle: 'solid',
                      borderColor: visionDeco.tapeBorder,
                      boxShadow: visionDeco.tapeShadow,
                    }}
                  />
                )}
                {st.deco === 'tape-corners-heart' && (
                  <>
                    <div
                      className="absolute -top-2 left-2 w-4 h-6 -rotate-12 z-10 rounded-[2px]"
                      style={{
                        backgroundColor: visionDeco.tapeBg,
                        opacity: 0.9,
                        borderWidth: 1,
                        borderStyle: 'solid',
                        borderColor: visionDeco.tapeBorder,
                        boxShadow: visionDeco.tapeShadow,
                        backdropFilter: 'blur(2px)',
                      }}
                    />
                    <div
                      className="absolute -top-3 right-2 w-4 h-6 rotate-12 z-10 rounded-[2px]"
                      style={{
                        backgroundColor: visionDeco.tapeBg,
                        opacity: 0.9,
                        borderWidth: 1,
                        borderStyle: 'solid',
                        borderColor: visionDeco.tapeBorder,
                        boxShadow: visionDeco.tapeShadow,
                        backdropFilter: 'blur(2px)',
                      }}
                    />
                    <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 opacity-80">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill={visionDeco.heartFill}>
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                      </svg>
                    </div>
                  </>
                )}
                {st.deco === 'pin' && (
                  <div
                    className="absolute top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full z-10 flex items-center justify-center"
                    style={{ backgroundColor: visionDeco.pinFill, boxShadow: visionDeco.pinShadow }}
                  >
                     <div className="w-0.5 h-0.5 rounded-full opacity-80" style={{ backgroundColor: visionDeco.pinHi }} />
                  </div>
                )}
                {st.deco === 'clip' && (
                  <div
                    className="absolute -top-1 right-4 z-10 w-[9px] h-7 -rotate-6 rounded-full border-[1.5px] border-solid bg-transparent"
                    style={{
                      borderColor: visionDeco.metalStroke,
                      boxShadow: theme.isDark
                        ? visionDeco.clipShadow
                        : `${visionDeco.clipShadow}, inset 0 1px 0 rgba(255,255,255,0.4)`,
                    }}
                    aria-hidden="true"
                  />
                )}

                <div className="flex-1 min-w-0 mb-1 relative z-0 flex flex-col pr-7">
                  {st.deco === 'oval-title' ? (
                    <div
                      className="self-start mb-2 rounded-[100%] px-3 py-0.5 border transform -rotate-2 shadow-sm inline-block"
                      style={{
                        backgroundColor: visionDeco.pillBg,
                        color: visionDeco.pillText,
                        borderColor: visionDeco.pillBorder,
                      }}
                    >
                      <div className="text-[10px] font-bold tracking-wider uppercase">
                        {item.name || item.item || 'Untitled Item'}
                      </div>
                    </div>
                  ) : (
                    <div className="text-base font-bold tracking-tight leading-snug mb-1" style={{ color: st.text }}>
                      {item.name || item.item || 'Untitled Item'}
                    </div>
                  )}
                  <div className="text-xs font-medium mt-auto pt-1" style={{ color: st.sub }}>
                    {[item.vendor, item.price && `$${item.price}`].filter(Boolean).join(' • ')}
                    {item.mgAmount && ` • ${item.mgAmount} ${(item.mgUnit || 'mg').toLowerCase()}`}
                  </div>
                </div>

                {onEdit && (
                  <button
                    type="button"
                    onClick={(e) => handleEditClick(e, item)}
                    className="absolute top-2 right-2 z-20 p-1.5 rounded-full transition-colors touch-manipulation"
                    style={{ color: st.sub }}
                    title="Edit"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <Edit size={14} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                  className="absolute bottom-2 left-2 z-20 p-1.5 rounded-full transition-colors touch-manipulation"
                  style={{ color: st.sub }}
                  title="Delete"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(220,38,38,0.22)' : 'rgba(220,38,38,0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Trash2 size={14} />
                </button>
                {!isReadOnly && onAcquireDestination && (
                  <button
                    type="button"
                    onClick={(e) => openAcquirePrompt(e, item)}
                    className="absolute bottom-2 right-2 z-20 text-[10px] font-semibold px-2 py-1 rounded-md border border-solid transition-shadow touch-manipulation hover:brightness-[1.02]"
                    style={{
                      color: theme.isDark ? (theme.primaryLight || theme.primary) : (theme.primaryDark || theme.text),
                      backgroundColor: theme.isDark ? `${theme.primary}26` : theme.cardBackground,
                      borderColor: theme.isDark ? `${theme.primaryLight}50` : (theme.primaryDark || theme.primary),
                      boxShadow: theme.isDark
                        ? '0 1px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)'
                        : '0 1px 2px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.98)',
                    }}
                  >
                    Acquired
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  const confirmation = (
    <ConfirmationModal
      open={!!deleteConfirmId}
      onClose={() => setDeleteConfirmId(null)}
      onConfirm={() => deleteConfirmId && confirmDelete(deleteConfirmId)}
      title="Delete Wishlist Item?"
      message="This action cannot be undone. Are you sure you want to delete this item from your wishlist?"
      confirmText="Delete"
      cancelText="Cancel"
      type="delete"
      theme={theme}
    />
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
          <X size={18} strokeWidth={2.25} />
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
        {confirmation}
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
          <BookHeart size={20} style={{ color: theme.primary }} />
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
              <ChevronDown size={14} />
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
        onClose={() => { setShowModal(false); setDeleteConfirmId(null); }}
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

      {confirmation}
    </div>
    {acquireChoiceModal}
    </>
  )
}
