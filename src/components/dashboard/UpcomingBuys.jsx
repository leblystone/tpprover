import React, { useState, useMemo, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { formatMMDDYYYY } from '../../utils/date'
import { ShoppingCart, Plus, X, Calendar, MapPin, Users, DollarSign, Edit, HandCoins, ChevronDown } from 'lucide-react'

const getSmartBuyDateLabel = (openDate, closeDate) => {
  if (!openDate && !closeDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const open = openDate ? new Date(openDate) : null;
  if (open) open.setHours(0, 0, 0, 0);
  const close = closeDate ? new Date(closeDate) : null;
  if (close) close.setHours(0, 0, 0, 0);

  // If there's a close date and it's passed: ended
  if (close && today > close) return { label: 'Ended', status: 'ended' };

  // If open date has passed (and no close date, or close date is still in future): live now
  if (open && today >= open) return { label: 'Live now', status: 'live' };

  // Open date is in the future
  if (open) {
    const diffDays = Math.round((open.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 2) return { label: 'Soon', status: 'soon' };
    if (diffDays > 14) return { label: `Opens in ${Math.round(diffDays / 7)}w`, status: 'onTrack' };
    return { label: `Opens in ${diffDays}d`, status: 'onTrack' };
  }

  // Only close date, no open date, and close is in the future
  if (close) {
    const diffDays = Math.round((close.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 2) return { label: 'Closing soon', status: 'soon' };
    return { label: `Closes in ${diffDays}d`, status: 'onTrack' };
  }

  return null;
};

const getBuyDateColor = (status, isDark) => {
  switch (status) {
    case 'ended': return isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)';
    case 'live': return isDark ? 'rgba(160, 180, 153, 0.9)' : '#5f7f76';
    case 'soon': return isDark ? 'rgba(217, 167, 60, 0.85)' : '#d97706';
    case 'onTrack':
    default: return undefined;
  }
};
import BottomSheet from '../common/BottomSheet'
import ModernTooltip from '../ui/ModernTooltip'
import TextInput from '../common/inputs/TextInput'
import GlassmorphismDatePicker from '../common/GlassmorphismDatePicker'
import ConfirmationModal from '../ui/ConfirmationModal'
import { recordDeletion, getDeletedItems, isDeleted } from '../../utils/deletionTracking'
import { prepareItemForSave } from '../../utils/userDataSave'
import ExpandableTooltip from '../ui/ExpandableTooltip'
import { WIDGET_TOOLTIPS } from '../../utils/widgetTooltips'

const SCHEDULED_BUYS_KEY = 'tpprover_scheduled_buys'
const SCHEDULED_BUYS_UPDATE_KEY = 'tpprover_scheduledBuys_lastUpdate'
const isDev = () => process.env.NODE_ENV === 'development'

export default function UpcomingBuys({ items = [], buys, theme, onAdd, onOpenBuy }) {
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editingItems, setEditingItems] = useState({});
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [renderKey, setRenderKey] = useState(0);
  
  // Ref to track if we just deleted an item (prevent props from restoring it)
  const justDeletedIdsRef = useRef(new Set());
  
  // Initialize deleted IDs from persistent deletion tracking on mount ONLY
  const initializedRef = useRef(false);
  if (!initializedRef.current) {
    const persistentDeletedIds = getDeletedItems('scheduledBuys');
    persistentDeletedIds.forEach(id => {
      justDeletedIdsRef.current.add(String(id));
    });
    initializedRef.current = true;
  }
  
  // Helper function to check if an item is deleted (uses both ref and persistent tracking)
  const isItemDeleted = useCallback((itemId) => {
    const idStr = String(itemId);
    // Check both the ref (session-based) and persistent tracking (cross-session)
    return justDeletedIdsRef.current.has(idStr) || isDeleted('scheduledBuys', idStr);
  }, []);
  
  // Read full list from localStorage (includes past buys) so save/delete don't wipe them
  const getFullListFromStorage = useCallback(() => {
    try {
      const raw = localStorage.getItem(SCHEDULED_BUYS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, []);

  // Helper function to deduplicate array by ID (keep last occurrence)
  // Memoized to prevent recreation on every render
  const deduplicateById = useCallback((items) => {
    const seen = new Map();
    // Process in reverse order so the last occurrence wins
    const reversed = [...items].reverse();
    reversed.forEach(item => {
      const idKey = String(item.id);
      if (!seen.has(idKey)) {
        seen.set(idKey, { ...item });
      }
    });
    // Return in original order (reverse again)
    return Array.from(seen.values()).reverse();
  }, []);
  
  // SIMPLIFIED: Just use props directly, filter in useMemo (no complex syncing)
  const list = useMemo(() => {
    const propList = Array.isArray(buys) ? buys : items;
    
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
  }, [buys, items, isItemDeleted]);
  
  // Terracotta gradient for delete button
  const terracottaGradient = 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)';
  const terracottaHoverGradient = 'linear-gradient(135deg, #b5684a 0%, #a35a3f 100%)';
  
  const handleViewAll = () => {
    setShowModal(true);
  }

  const handleItemClick = (item) => {
    if (onOpenBuy) {
      onOpenBuy(item);
      return;
    }
    setSelectedItem(item);
    setShowModal(true);
  }

  const handleEditMode = (itemId) => {
    const item = list.find(i => i.id === itemId);
    if (!item) return;
    
    // Initialize editing state for this specific item - match the form field names
    setEditingItems(prev => ({
      ...prev,
      [itemId]: {
        item: item.item || item.name || item.peptideName || '',
        vendor: item.vendor || '',
        location: item.location || '',
        participants: item.participants || '',
        price: item.price || '',
        notes: item.notes || item.description || '',
        openDate: item.openDate || item.date || '',
        closeDate: item.closeDate || ''
      }
    }));
  }

  const handleCancelEdit = (itemId) => {
    setEditingItems(prev => {
      const newState = { ...prev };
      delete newState[itemId];
      return newState;
    });
  }

  const handleFieldChange = (itemId, field, value) => {
    setEditingItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value
      }
    }));
  }

  const handleSave = (itemId) => {
    try {
      const editedData = editingItems[itemId];
      if (!editedData) {
        if (isDev()) console.error('No edited data found for item:', itemId);
        return;
      }

      // Read FULL list from localStorage so we don't wipe past buys
      let fullList = getFullListFromStorage();
      fullList = fullList.filter(item => !isItemDeleted(item.id));
      fullList = deduplicateById(fullList);

      const itemIndex = fullList.findIndex(item =>
        String(item.id) === String(itemId) || item.id === itemId
      );

      const oldItem = itemIndex >= 0 ? fullList[itemIndex] : null;
      const updatedItem = prepareItemForSave({
        ...(oldItem || {}),
        ...editedData,
        id: itemId,
        name: editedData.item || oldItem?.name || oldItem?.item,
        peptideName: editedData.item || oldItem?.peptideName || oldItem?.item,
        date: editedData.openDate || oldItem?.date || oldItem?.openDate,
        description: editedData.notes || oldItem?.description || oldItem?.notes
      }, { isNew: !oldItem });

      if (itemIndex >= 0) {
        fullList[itemIndex] = updatedItem;
      } else {
        fullList.push(updatedItem);
      }

      const scheduledBuys = deduplicateById(fullList);

      localStorage.setItem(SCHEDULED_BUYS_KEY, JSON.stringify(scheduledBuys));
      localStorage.setItem(SCHEDULED_BUYS_UPDATE_KEY, String(Date.now()));

      window.dispatchEvent(new CustomEvent('tpp:scheduled-buys-updated', {
        detail: { scheduledBuys }
      }));
      window.dispatchEvent(new CustomEvent('tpp:calendar-sync'));

      setEditingItems({});
      setRenderKey(prev => prev + 1);

      setTimeout(() => {
        const savedItem = scheduledBuys.find(buy => String(buy.id) === String(itemId));
        if (savedItem) setSelectedItem({ ...savedItem });
      }, 50);
    } catch (error) {
      console.error('Error saving group buy changes:', error);
    }
  }

  const handleDelete = (itemId) => {
    setDeleteConfirmId(itemId);
  }

  const confirmDelete = (itemId) => {
    try {
      // Read FULL list from localStorage so we don't wipe past buys
      let fullList = getFullListFromStorage();
      fullList = fullList.filter(item => !isItemDeleted(item.id));
      fullList = deduplicateById(fullList);

      // Item to delete snapshot for Recently Deleted (use list, not upcomingBuys)
      const itemToDelete = list.find(b => String(b.id) === String(itemId));
      if (itemToDelete) {
        recordDeletion('scheduledBuys', String(itemId), itemToDelete);
      } else {
        recordDeletion('scheduledBuys', String(itemId));
      }

      const updatedBuys = fullList.filter(b => String(b.id) !== String(itemId));
      const scheduledBuys = deduplicateById(updatedBuys);

      localStorage.setItem(SCHEDULED_BUYS_KEY, JSON.stringify(scheduledBuys));
      localStorage.setItem(SCHEDULED_BUYS_UPDATE_KEY, String(Date.now()));

      window.dispatchEvent(new CustomEvent('tpp:scheduled-buys-updated', {
        detail: { scheduledBuys }
      }));
      window.dispatchEvent(new CustomEvent('tpp:calendar-sync'));
      window.dispatchEvent(new CustomEvent('tpp:group-buy-deleted', {
        detail: { itemId, skipReload: true }
      }));

      setEditingItems({});
      setDeleteConfirmId(null);
      justDeletedIdsRef.current.add(String(itemId));

      if (selectedItem && String(selectedItem.id) === String(itemId)) {
        if (scheduledBuys.length > 0) {
          setSelectedItem({ ...scheduledBuys[0] });
        } else {
          setShowModal(false);
          setSelectedItem(null);
        }
      } else if (selectedItem) {
        const updatedSelected = scheduledBuys.find(b => String(b.id) === String(selectedItem.id));
        if (updatedSelected) setSelectedItem({ ...updatedSelected });
      }
    } catch (error) {
      console.error('Error deleting group buy:', error);
    }
  }

  // Removed auto-save functionality - using manual save button instead

  return (
    <div className="rounded-xl content-card">
      <div className="px-3 py-2 border-b" style={{ borderColor: theme.isDark ? 'transparent' : theme.border }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold flex items-center gap-2" style={{ color: theme.text }}>
            Upcoming Buys
            <ShoppingCart size={20} style={{ color: theme.primary }} />
          </h3>
          <div className="flex items-center gap-2">
            <ExpandableTooltip content={WIDGET_TOOLTIPS.upcoming_buys} theme={theme} />
            <ModernTooltip text="Add" position="top">
              <button
                type="button"
                onMouseDown={(e) => {
                  // Prevent blur events on mobile
                  e.preventDefault();
                }}
                onTouchStart={(e) => {
                  // Prevent blur events on touch devices
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
        </div>
      </div>
      
      <div className="p-3">
        {list.length === 0 ? (
          <p className="text-xs py-2" style={{ color: theme.textLight }}>No planned purchases.</p>
        ) : (
          <div className="space-y-0">
            {list.map((it, index) => {
              const dateInfo = getSmartBuyDateLabel(it.openDate || it.date, it.closeDate);
              const dateColor = dateInfo ? (getBuyDateColor(dateInfo.status, theme.isDark) || theme.textLight) : theme.textLight;
              const isEnded = dateInfo?.status === 'ended';
              const mutedColor = theme.isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';
              return (
                <div 
                  key={it.id} 
                  onClick={() => handleItemClick(it)}
                  className="flex items-center gap-2 py-2.5 px-3 cursor-pointer transition-all duration-200"
                  style={{
                    borderLeft: `3px solid ${isEnded
                      ? (theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)')
                      : (theme.isDark ? 'rgba(255,255,255,0.12)' : theme.primary + '40')}`,
                    boxShadow: index < list.length - 1
                      ? `0 1px 0 ${theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(127, 158, 149, 0.08)'}`
                      : 'none'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-xs truncate" style={{ color: isEnded ? mutedColor : theme.text }}>
                      {it.item || it.name || it.peptideName || 'Untitled Group Buy'}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {it.participants && (
                        <span className="text-xs truncate" style={{ color: isEnded ? mutedColor : theme.textLight }}>{it.participants}</span>
                      )}
                      {it.participants && it.price && (
                        <span className="text-xs" style={{ color: theme.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }}>·</span>
                      )}
                      {it.price && (
                        <span className="text-xs" style={{ color: isEnded ? mutedColor : theme.textLight }}>${it.price}</span>
                      )}
                    </div>
                  </div>
                  {dateInfo && (
                    <span 
                      className="flex-shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full"
                      style={{ 
                        color: dateInfo.status === 'ended'
                          ? (theme.isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)')
                          : dateInfo.status === 'live'
                            ? '#ffffff'
                            : dateColor,
                        backgroundColor: dateInfo.status === 'live'
                          ? (theme.isDark ? 'rgba(160, 180, 153, 0.7)' : '#5f7f76')
                          : dateInfo.status === 'soon'
                            ? (theme.isDark ? 'rgba(217, 167, 60, 0.15)' : '#d9770612')
                            : dateInfo.status === 'ended'
                              ? (theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)')
                              : (theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)')
                      }}
                    >
                      {dateInfo.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        {list.length > 0 && (
          <div className="mt-2 pt-2 border-t flex justify-center" style={{ borderColor: theme.border }}>
            <button 
              type="button"
              onMouseDown={(e) => {
                // Prevent blur events on mobile
                e.preventDefault();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleViewAll();
              }}
              className="px-2 py-0.5 rounded text-xs font-medium border transition-colors opacity-70 hover:opacity-100 touch-manipulation" 
              style={{ 
                borderColor: theme.border, 
                color: theme.textLight,
                backgroundColor: 'transparent',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              View All
            </button>
          </div>
        )}
      </div>
      
      {/* Upcoming Buys - Bottom Sheet */}
      <BottomSheet
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedItem(null);
          setEditingItems({});
        }}
        title="Upcoming Group Buys"
        theme={theme}
        maxHeight="90vh"
        footer={list.length > 0 ? (
          <div className="w-full flex justify-center">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAdd();
              }}
              className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98] touch-manipulation btn-primary-inset"
              style={{ backgroundColor: theme.primary, color: theme.textOnPrimary || '#ffffff', WebkitTapHighlightColor: 'transparent' }}
            >
              <Plus size={18} />
              Schedule New Group Buy
            </button>
          </div>
        ) : null}
      >
        <div className="space-y-6 overflow-y-auto min-h-0">
          {list.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8 px-4 text-center">
              <p className="text-sm text-center px-2" style={{ color: theme.textLight }}>
                No upcoming buys
              </p>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onTouchStart={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAdd();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors touch-manipulation"
                style={{
                  color: theme.primary,
                  backgroundColor: theme.isDark ? `${theme.primary}20` : `${theme.primary}15`,
                  border: `1px solid ${theme.primary}40`,
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                Schedule Buy
                <ChevronDown size={14} />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" key={`modal-content-${renderKey}`}>
              {list.map((item) => (
                <div
                  key={`buy-${item.id}-${item.updatedAt || ''}`}
                  className="p-4 rounded-lg border transition-all"
                  style={{ 
                    borderColor: theme.border, 
                    backgroundColor: theme.cardBackground,
                    ...(selectedItem?.id === item.id && !editingItems[item.id] && {
                      borderColor: theme.primary,
                      backgroundColor: `${theme.primary}05`
                    })
                  }}
                  onClick={() => !editingItems[item.id] && setSelectedItem(item)}
                >
                  {editingItems[item.id] ? (
                    // Edit Mode
                    <div className="space-y-4">
                      {/* GROUP BUY DETAILS Section Header */}
                      <div className="px-4 py-2.5 rounded-lg flex items-center justify-between mb-2" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, borderLeft: '4px solid #e0ded7' }}>
                        <h4 className="font-bold text-sm tracking-wider uppercase" style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76', letterSpacing: '0.1em' }}>GROUP BUY DETAILS</h4>
                        <ShoppingCart size={20} style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76' }} />
                      </div>

                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <TextInput
                            label="Group Buy For"
                            value={editingItems[item.id]?.item || ''}
                            onChange={v => handleFieldChange(item.id, 'item', v)}
                            placeholder="Product Name"
                            theme={theme}
                            outlined={true}
                            customTextColor={theme.isDark ? null : "#181A18"}
                            customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
                          />
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={() => handleCancelEdit(item.id)}
                            className="p-2 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
                            title="Cancel editing"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm font-medium mb-2 block text-center" style={{ color: theme.text }}>Open Date</label>
                          <GlassmorphismDatePicker
                            value={editingItems[item.id]?.openDate || ''}
                            onChange={(dateString) => handleFieldChange(item.id, 'openDate', dateString)}
                            theme={theme}
                            placeholder="Open Date"
                            compact={true}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block text-center" style={{ color: theme.text }}>Close Date</label>
                          <GlassmorphismDatePicker
                            value={editingItems[item.id]?.closeDate || ''}
                            onChange={(dateString) => handleFieldChange(item.id, 'closeDate', dateString)}
                            theme={theme}
                            placeholder="Close Date"
                            compact={true}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <TextInput
                          label="Group Buy Host"
                          value={editingItems[item.id]?.vendor || ''}
                          onChange={v => handleFieldChange(item.id, 'vendor', v)}
                          placeholder="Name"
                          theme={theme}
                          outlined={true}
                          customTextColor={theme.isDark ? null : "#181A18"}
                          customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
                        />
                        <TextInput
                          label="Platform"
                          value={editingItems[item.id]?.location || ''}
                          onChange={v => handleFieldChange(item.id, 'location', v)}
                          placeholder="e.g Discord, Telegram, etc."
                          theme={theme}
                          outlined={true}
                          customTextColor={theme.isDark ? null : "#181A18"}
                          customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
                        />
                      </div>
                      
                      {/* VENDOR & PRICING Section Header */}
                      <div className="px-4 py-2.5 rounded-lg flex items-center justify-between mb-2" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, borderLeft: '4px solid #e0ded7' }}>
                        <h4 className="font-bold text-sm tracking-wider uppercase" style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76', letterSpacing: '0.1em' }}>VENDOR & PRICING</h4>
                        <HandCoins size={20} style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76' }} />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <TextInput
                          label="Vendor"
                          value={editingItems[item.id]?.participants || ''}
                          onChange={v => handleFieldChange(item.id, 'participants', v)}
                          placeholder="Vendor Name"
                          theme={theme}
                          outlined={true}
                          customTextColor={theme.isDark ? null : "#181A18"}
                          customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
                        />
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" style={{ color: theme.textLight || theme.text }}>
                            <span className="text-sm">$</span>
                          </div>
                          <div className="relative">
                            <input
                              type="text"
                              value={editingItems[item.id]?.price || ''}
                              onChange={(e) => handleFieldChange(item.id, 'price', e.target.value)}
                              placeholder="0.00"
                              className="w-full p-3 pl-8 rounded-lg transition-all focus:outline-none"
                              style={{
                                border: `1px solid #f0eee7`,
                                backgroundColor: theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff'),
                                color: theme.isDark ? theme.text : '#181A18',
                                boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'
                              }}
                              onFocus={(e) => {
                                e.target.style.borderColor = theme.primary;
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = '#f0eee7';
                              }}
                            />
                            <label 
                              className="absolute left-3 -top-2.5 px-1 text-xs font-medium transition-all pointer-events-none"
                              style={{ 
                                color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76',
                                backgroundColor: theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')
                              }}
                            >
                              Price
                            </label>
                          </div>
                        </div>
                      </div>
                      
                      <TextInput
                        label="Notes"
                        value={editingItems[item.id]?.notes || ''}
                        onChange={v => handleFieldChange(item.id, 'notes', v)}
                        placeholder="Any further group buy details."
                        theme={theme}
                        outlined={true}
                        customTextColor={theme.isDark ? null : "#181A18"}
                        customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
                        multiline={true}
                        rows={3}
                      />
                      
                      {/* Action Buttons */}
                      <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: theme.border }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item.id);
                          }}
                          className="px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md active:scale-95"
                          style={{ 
                            background: terracottaGradient,
                            color: '#ffffff',
                            border: 'none',
                            boxShadow: theme?.isDark ? '0 4px 10px rgba(0,0,0,0.35)' : '0 4px 10px rgba(0,0,0,0.15)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = terracottaHoverGradient;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = terracottaGradient;
                          }}
                        >
                          Delete
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            if (item?.id) {
                              handleSave(item.id);
                            } else {
                              console.error('No item ID found for save');
                            }
                          }}
                          className="px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md active:scale-95 btn-primary-inset"
                          style={{ 
                            backgroundColor: theme.primary,
                            color: theme.textOnPrimary || '#ffffff',
                            border: 'none',
                            boxShadow: theme?.isDark ? '0 4px 10px rgba(0,0,0,0.35)' : '0 4px 10px rgba(0,0,0,0.15)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = '0.9';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = '1';
                          }}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-base mb-2" style={{ color: theme.text }}>
                            {item.item || item.name || item.peptideName || 'Untitled Group Buy'}
                          </h4>
                          <div className="flex items-center gap-4 text-xs mb-3" style={{ color: theme.textLight }}>
                            {item.openDate && (
                              <div className="flex items-center gap-1">
                                <Calendar size={12} />
                                <span>Opens: {formatMMDDYYYY(item.openDate)}</span>
                              </div>
                            )}
                            {item.closeDate && (
                              <div className="flex items-center gap-1">
                                <Calendar size={12} />
                                <span>Closes: {formatMMDDYYYY(item.closeDate)}</span>
                              </div>
                            )}
                            {!item.openDate && !item.closeDate && item.date && (
                              <div className="flex items-center gap-1">
                                <Calendar size={12} />
                                <span>{formatMMDDYYYY(item.date)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditMode(item.id);
                            }}
                            className="p-1 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                            title="Edit group buy"
                          >
                            <Edit size={14} />
                          </button>
                          <ShoppingCart size={16} style={{ color: theme.primary }} />
                        </div>
                      </div>
                      
                      <div className="space-y-2.5">
                        {item.vendor && (
                          <div className="flex items-start gap-2 text-sm">
                            <span className="font-medium min-w-[100px]" style={{ color: theme.text }}>Group Buy Host:</span>
                            <span style={{ color: theme.textLight }}>{item.vendor}</span>
                          </div>
                        )}
                        
                        {item.location && (
                          <div className="flex items-start gap-2 text-sm">
                            <span className="font-medium min-w-[100px]" style={{ color: theme.text }}>Platform:</span>
                            <div className="flex items-center gap-1" style={{ color: theme.textLight }}>
                              <MapPin size={12} />
                              <span>{item.location}</span>
                            </div>
                          </div>
                        )}
                        
                        {item.participants && (
                          <div className="flex items-start gap-2 text-sm">
                            <span className="font-medium min-w-[100px]" style={{ color: theme.text }}>Vendor:</span>
                            <span style={{ color: theme.textLight }}>{item.participants}</span>
                          </div>
                        )}
                        
                        {item.price && (
                          <div className="flex items-start gap-2 text-sm">
                            <span className="font-medium min-w-[100px]" style={{ color: theme.text }}>Price:</span>
                            <div className="flex items-center gap-1" style={{ color: theme.textLight }}>
                              <DollarSign size={12} />
                              <span>${item.price}</span>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {item.notes && (
                        <div className="mt-4 pt-3 border-t" style={{ borderColor: theme.border }}>
                          <p className="text-xs font-medium mb-1" style={{ color: theme.text }}>Notes:</p>
                          <p className="text-sm leading-relaxed" style={{ color: theme.textLight }}>
                            {item.notes}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </BottomSheet>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => confirmDelete(deleteConfirmId)}
        title="Confirm Deletion"
        message={deleteConfirmId ? (() => {
          const item = list.find(b => String(b.id) === String(deleteConfirmId));
          const name = item?.item || item?.name || item?.peptideName || 'this group buy';
          return `Remove "${name}"? You can restore it later from Settings > Recently Deleted.`;
        })() : ''}
        confirmText="Delete"
        cancelText="Cancel"
        type="delete"
        theme={theme}
        hideIcon={true}
      />
    </div>
  )
}


