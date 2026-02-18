import React, { useState, useMemo, useCallback, useRef } from 'react'
import { BookHeart, Plus, Edit, Trash2, ChevronDown } from 'lucide-react'
import BottomSheet from '../common/BottomSheet'
import ConfirmationModal from '../ui/ConfirmationModal'
import ModernTooltip from '../ui/ModernTooltip'
import { recordDeletion, getDeletedItems, isDeleted } from '../../utils/deletionTracking'
import ExpandableTooltip from '../ui/ExpandableTooltip'
import { WIDGET_TOOLTIPS } from '../../utils/widgetTooltips'

export default function Wishlist({ items = [], wishlist, theme, onAdd, onEdit }) {
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  
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
      console.log('🔒 Initialized deleted IDs from persistent tracking:', persistentDeletedIds);
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
    setShowModal(false);
  }

  const handleDelete = (itemId) => {
    setDeleteConfirmId(itemId);
  }

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

  return (
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
      
      <div className="flex-1 overflow-y-auto min-h-0 space-y-2">
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
      
      {/* View All - BottomSheet */}
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
            <ul className="space-y-2">
              {list.map((item) => (
                <li
                  key={`wishlist-${item.id}-${item.updatedAt || ''}`}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border transition-colors"
                  style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate" style={{ color: theme.text }}>{item.name || item.item || 'Untitled Item'}</div>
                    <div className="text-xs truncate mt-0.5" style={{ color: theme.textLight }}>
                      {[item.vendor, item.price && `$${item.price}`].filter(Boolean).join(' • ')}
                      {item.mgAmount && ` • ${item.mgAmount} ${(item.mgUnit || 'mg').toLowerCase()}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {onEdit && (
                      <button
                        type="button"
                        onClick={(e) => handleEditClick(e, item)}
                        className="p-2 rounded-lg transition-colors touch-manipulation"
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
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                      className="p-2 rounded-lg transition-colors touch-manipulation"
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
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </BottomSheet>

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
    </div>
  )
}
