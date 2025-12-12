import React, { useState, useMemo, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { formatMMDDYYYY } from '../../utils/date'
import { ShoppingCart, Plus, X, Calendar, MapPin, Users, DollarSign, Edit, HandCoins } from 'lucide-react'
import Modal from '../common/Modal'
import ModernTooltip from '../ui/ModernTooltip'
import TextInput from '../common/inputs/TextInput'
import GlassmorphismDatePicker from '../common/GlassmorphismDatePicker'
import ConfirmationModal from '../ui/ConfirmationModal'
import { recordDeletion, getDeletedItems, isDeleted } from '../../utils/deletionTracking'
import ExpandableTooltip from '../ui/ExpandableTooltip'
import { WIDGET_TOOLTIPS } from '../../utils/widgetTooltips'

export default function UpcomingBuys({ items = [], buys, theme, onAdd }) {
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editingItems, setEditingItems] = useState({});
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [renderKey, setRenderKey] = useState(0);
  
  // Ref to track if we just deleted an item (prevent props from restoring it)
  const justDeletedIdsRef = useRef(new Set());
  
  // Initialize deleted IDs from persistent deletion tracking on mount ONLY
  const initializedRef = useRef(false);
  const hasLoggedRef = useRef(false);
  if (!initializedRef.current) {
    const persistentDeletedIds = getDeletedItems('scheduledBuys');
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
    // Check both the ref (session-based) and persistent tracking (cross-session)
    return justDeletedIdsRef.current.has(idStr) || isDeleted('scheduledBuys', idStr);
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
    // CRITICAL: Preserve any unsaved edits when switching items
    // Don't clear editingItems here - let users save or cancel explicitly
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
    // Save changes to localStorage
    try {
      console.log('💾 Starting save for itemId:', itemId);
      console.log('📋 Current list before save:', list.map(b => ({ id: b.id })));
      
      // CRITICAL: Use current list (from props) instead of reading from localStorage
      // Filter out any deleted items that might have been restored using persistent tracking
      let scheduledBuys = list.filter(item => {
        const shouldKeep = !isItemDeleted(item.id);
        if (!shouldKeep) {
          console.log('🚫 Filtering out deleted item during save:', item.id);
        }
        return shouldKeep;
      });
      
      const editedData = editingItems[itemId];
      if (!editedData) {
        console.error('No edited data found for item:', itemId);
        return;
      }
      
      // Find item by ID - handle both string and number IDs
      const itemIndex = scheduledBuys.findIndex(item => {
        return String(item.id) === String(itemId) || item.id === itemId;
      });
      
      if (itemIndex !== -1) {
        // Update existing item - spread editedData to override old values
        // Note: updatedAt will be set by Firestore serverTimestamp during sync
        const oldItem = scheduledBuys[itemIndex];
        
        // Build updated item: old item base + all editedData fields + metadata
        const updatedItem = {
          ...oldItem,           // Start with old item
          ...editedData,        // Override with ALL edited fields
          id: itemId,           // Ensure ID preserved
          // ✅ Remove client-side timestamp - will be set by Firestore serverTimestamp
          // Backward compatibility fields (update these too)
          name: editedData.item || oldItem.name || oldItem.item,
          peptideName: editedData.item || oldItem.peptideName || oldItem.item,
          date: editedData.openDate || oldItem.date || oldItem.openDate,
          description: editedData.notes || oldItem.description || oldItem.notes
        };
        
        // Assign the complete updated item
        scheduledBuys[itemIndex] = updatedItem;
        
        console.log('🔍 Updated item structure:', updatedItem);
        console.log('📝 Fields that should be there:', {
          location: updatedItem.location,
          participants: updatedItem.participants,
          price: updatedItem.price,
          vendor: updatedItem.vendor
        });
      } else {
        // Item not found - this shouldn't happen but handle it
        console.warn('Item not found in scheduledBuys, adding new item:', itemId);
        scheduledBuys.push({
          ...editedData,
          id: itemId,
          // Keep backward compatibility
          name: editedData.item,
          peptideName: editedData.item,
          date: editedData.openDate,
          description: editedData.notes
        });
      }
      
      // Deduplicate before saving
      const deduplicated = deduplicateById(scheduledBuys);
      
      // Verify no deleted items are in the list using persistent tracking
      const hasDeletedItems = deduplicated.some(item => isItemDeleted(item.id));
      if (hasDeletedItems) {
        console.warn('⚠️ Deleted items found in save list, filtering them out');
        const filtered = deduplicated.filter(item => !isItemDeleted(item.id));
        scheduledBuys = filtered;
      } else {
        scheduledBuys = deduplicated;
      }
      
      console.log('💾 Saving item with data:', {
        item: editedData.item,
        vendor: editedData.vendor,
        location: editedData.location,
        participants: editedData.participants,
        price: editedData.price,
        notes: editedData.notes,
        openDate: editedData.openDate,
        closeDate: editedData.closeDate
      });
      
      localStorage.setItem('tpprover_scheduled_buys', JSON.stringify(scheduledBuys));
      // Also set protection timestamp to prevent Firebase overwrite
      localStorage.setItem('tpprover_scheduledBuys_lastUpdate', String(Date.now()));
      
      // CRITICAL: Dispatch event to update parent component's state (AppContext)
      // This will trigger a prop update which will re-render this component
      window.dispatchEvent(new CustomEvent('tpp:scheduled-buys-updated', {
        detail: { scheduledBuys }
      }));
      
      // Trigger calendar sync
      window.dispatchEvent(new CustomEvent('tpp:calendar-sync'));
      
      console.log('✅ Saved group buy:', itemId, editedData);
      console.log('📋 Updated list after save:', scheduledBuys.map(b => ({ id: b.id })));
      
      // Force exit edit mode immediately
      setEditingItems({});
      
      // Increment render key to force complete re-render
      setRenderKey(prev => prev + 1);
      
      // Re-select the item from the scheduledBuys (which has fresh data)
      setTimeout(() => {
        const savedItem = scheduledBuys.find(buy => buy.id === itemId);
        if (savedItem) {
          console.log('🔄 Re-selecting item with fresh data:', savedItem);
          setSelectedItem({ ...savedItem }); // Create new reference
        }
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
      console.log('🗑️ Starting delete for itemId:', itemId);
      console.log('📋 Current list before delete:', list.map(b => ({ id: b.id })));
      
      // CRITICAL: Start with current list (from props)
      // Filter out the deleted item first
      let buysToSave = list.filter(item => {
        const itemIdStr = String(item.id);
        const deleteIdStr = String(itemId);
        const shouldKeep = itemIdStr !== deleteIdStr;
        if (!shouldKeep) {
          console.log('❌ Filtering out deleted item:', item.id);
        }
        return shouldKeep;
      });
      
      // Apply any unsaved edits from editingItems (but not for the deleted item)
      buysToSave = buysToSave.map(item => {
        const itemIdStr = String(item.id);
        if (editingItems[itemIdStr] && itemIdStr !== String(itemId)) {
          const editedData = editingItems[itemIdStr];
          return {
            ...item,
            ...editedData,
            id: item.id,
            // ✅ Remove client-side timestamp - will be set by Firestore serverTimestamp
            name: editedData.item || item.name || item.item,
            peptideName: editedData.item || item.peptideName || item.item,
            date: editedData.openDate || item.date || item.openDate,
            description: editedData.notes || item.description || item.notes
          };
        }
        return item;
      });
      
      // Deduplicate before saving
      const updatedBuys = deduplicateById(buysToSave);
      
      // Verify the deleted item is NOT in the list
      const deletedItemStillExists = updatedBuys.some(b => String(b.id) === String(itemId));
      if (deletedItemStillExists) {
        console.error('❌ ERROR: Deleted item still exists in updatedBuys!');
        // Force remove it one more time
        const finalBuys = updatedBuys.filter(b => String(b.id) !== String(itemId));
        console.log('🔧 Force filtered, final count:', finalBuys.length);
        // Save the force-filtered version
        localStorage.setItem('tpprover_scheduled_buys', JSON.stringify(finalBuys));
        localStorage.setItem('tpprover_scheduledBuys_lastUpdate', String(Date.now()));
        window.dispatchEvent(new CustomEvent('tpp:scheduled-buys-updated', {
          detail: { scheduledBuys: finalBuys }
        }));
      } else {
        // Save to localStorage
        console.log('💾 Saving to localStorage, count:', updatedBuys.length);
        localStorage.setItem('tpprover_scheduled_buys', JSON.stringify(updatedBuys));
        localStorage.setItem('tpprover_scheduledBuys_lastUpdate', String(Date.now()));
        
        // CRITICAL: Dispatch event to update parent component's state (AppContext)
        window.dispatchEvent(new CustomEvent('tpp:scheduled-buys-updated', {
          detail: { scheduledBuys: updatedBuys }
        }));
      }
      
      // Verify localStorage was saved correctly
      const verifySaved = JSON.parse(localStorage.getItem('tpprover_scheduled_buys') || '[]');
      const verifyDeleted = verifySaved.some(b => String(b.id) === String(itemId));
      if (verifyDeleted) {
        console.error('❌ ERROR: Deleted item found in localStorage after save!');
        // Force remove from localStorage one more time
        const corrected = verifySaved.filter(b => String(b.id) !== String(itemId));
        localStorage.setItem('tpprover_scheduled_buys', JSON.stringify(corrected));
        localStorage.setItem('tpprover_scheduledBuys_lastUpdate', String(Date.now()));
        window.dispatchEvent(new CustomEvent('tpp:scheduled-buys-updated', {
          detail: { scheduledBuys: corrected }
        }));
      }
      
      // Trigger calendar sync
      window.dispatchEvent(new CustomEvent('tpp:calendar-sync'));
      
      // Clear ALL editing state after save (edits have been saved)
      setEditingItems({});
      
      // Close modal if item was selected
      if (selectedItem?.id === itemId) {
        // If there are other items, select the first one, otherwise close
        const finalList = verifyDeleted ? JSON.parse(localStorage.getItem('tpprover_scheduled_buys') || '[]') : updatedBuys;
        if (finalList.length > 0) {
          setSelectedItem({ ...finalList[0] });
        } else {
          setShowModal(false);
          setSelectedItem(null);
        }
      } else if (selectedItem) {
        // Update selectedItem to match updated data if it exists
        const finalList = verifyDeleted ? JSON.parse(localStorage.getItem('tpprover_scheduled_buys') || '[]') : updatedBuys;
        const updatedSelected = finalList.find(b => String(b.id) === String(selectedItem.id));
        if (updatedSelected) {
          setSelectedItem({ ...updatedSelected });
        }
      }
      
      // Dispatch a custom event to notify parent components of the change
      // BUT: Don't trigger a reload that would overwrite our state
      window.dispatchEvent(new CustomEvent('tpp:group-buy-deleted', { 
        detail: { 
          itemId,
          skipReload: true // Flag to prevent other listeners from reloading
        } 
      }));
      
      // Close delete confirmation
      setDeleteConfirmId(null);
      
      // CRITICAL: Permanently track deleted items to prevent props from restoring them
      // We never clear this - deleted items should stay deleted
      justDeletedIdsRef.current.add(String(itemId));
      
      // CRITICAL: Record deletion in persistent tracking to prevent restoration across refreshes/syncs
      // Find the item before deletion to save snapshot (use original upcomingBuys before filter)
      const itemToDelete = upcomingBuys.find(b => String(b.id) === String(itemId));
      if (itemToDelete) {
        recordDeletion('scheduledBuys', String(itemId), itemToDelete);
      } else {
        recordDeletion('scheduledBuys', String(itemId));
      }
      console.log('📝 Recorded deletion in persistent tracking for scheduledBuys:', itemId);
      
      const finalVerify = JSON.parse(localStorage.getItem('tpprover_scheduled_buys') || '[]');
      console.log('✅ Deleted group buy:', itemId);
      console.log('📋 Final list after delete:', finalVerify.map(b => ({ id: b.id })));
      console.log('🔒 Permanently tracking deleted item to prevent restore');
      console.log('📝 Tracked deleted IDs:', Array.from(justDeletedIdsRef.current));
      
    } catch (error) {
      console.error('Error deleting group buy:', error);
    }
  }

  // Removed auto-save functionality - using manual save button instead

  return (
    <div className="rounded-xl content-card" style={{ backgroundColor: theme.cardBackground }}>
      <div className="px-3 py-2 border-b" style={{ borderColor: theme.border }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold flex items-center gap-2" style={{ color: theme.text }}>
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
          <ul className="space-y-1.5">
            {list.map((it) => (
              <li 
                key={it.id} 
                onClick={() => handleItemClick(it)}
                className="flex items-center justify-between p-1.5 rounded cursor-pointer transition-colors hover:bg-gray-50" 
              >
                <div>
                  <div className="font-medium text-xs">{it.item || it.name || it.peptideName || 'Untitled Group Buy'}</div>
                  <div className="text-xs" style={{ color: theme.textLight }}>
                    {it.openDate && formatMMDDYYYY(it.openDate)}
                    {!it.openDate && it.date && formatMMDDYYYY(it.date)}
                    {it.participants && ` • ${it.participants}`}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        
        {list.length > 0 && (
          <div className="mt-2 pt-2 border-t flex justify-center" style={{ borderColor: theme.border }}>
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
      
      {/* Upcoming Buys Modal */}
      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedItem(null);
          setEditingItems({});
        }}
        title="Upcoming Group Buys"
        theme={theme}
        maxWidth="max-w-4xl"
        variant="modern"
      >
        <div className="space-y-6">
          {list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${theme.primary}10` }}>
                <ShoppingCart size={32} style={{ color: theme.primary }} />
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>No Upcoming Buys</h3>
              <p className="text-sm mb-6 max-w-md" style={{ color: theme.textLight }}>
                You don't have any scheduled group buys yet. Group buys are a great way to save money on bulk peptide orders.
              </p>
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
                className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all hover:opacity-90 hover:scale-105 touch-manipulation"
                style={{ 
                  backgroundColor: theme.primary, 
                  color: theme.textOnPrimary,
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                <Plus size={18} />
                Schedule a Group Buy
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
                          className="px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md active:scale-95"
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
          
          {list.length > 0 && (
            <div className="flex justify-center pt-4 border-t" style={{ borderColor: theme.border }}>
              <button
                onClick={onAdd}
                className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all hover:opacity-90 hover:scale-105"
                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
              >
                <Plus size={18} />
                Schedule New Group Buy
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => confirmDelete(deleteConfirmId)}
        title="Confirm Deletion"
        message=""
        confirmText="Delete"
        cancelText="Cancel"
        type="delete"
        theme={theme}
        hideIcon={true}
      />
    </div>
  )
}


