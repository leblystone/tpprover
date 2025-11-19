import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { formatMMDDYYYY } from '../../utils/date'
import { ShoppingCart, Plus, X, Calendar, MapPin, Users, DollarSign, Edit, HandCoins } from 'lucide-react'
import Modal from '../common/Modal'
import ModernTooltip from '../ui/ModernTooltip'
import TextInput from '../common/inputs/TextInput'
import GlassmorphismDatePicker from '../common/GlassmorphismDatePicker'

export default function UpcomingBuys({ items = [], buys, theme, onAdd }) {
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editingItems, setEditingItems] = useState({});
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [renderKey, setRenderKey] = useState(0);
  
  // Reload list from localStorage when it changes
  const reloadList = () => {
    try {
      const rawScheduled = localStorage.getItem('tpprover_scheduled_buys');
      return rawScheduled ? JSON.parse(rawScheduled) : [];
    } catch (error) {
      console.error('Error loading scheduled buys:', error);
      return [];
    }
  };
  
  // Use local list state that syncs with localStorage
  const [localList, setLocalList] = useState(() => {
    const propList = Array.isArray(buys) ? buys : items;
    return propList.length > 0 ? propList : reloadList();
  });
  
  // Update local list when props change
  useEffect(() => {
    const propList = Array.isArray(buys) ? buys : items;
    if (propList.length > 0) {
      setLocalList(propList);
    }
  }, [buys, items]);
  
  // Listen for delete events to refresh list (update events are handled directly in handleSave)
  useEffect(() => {
    const handleDeleteEvent = () => {
      const updatedList = reloadList();
      setLocalList(updatedList.map(buy => ({ ...buy })));
    };
    
    window.addEventListener('tpp:group-buy-deleted', handleDeleteEvent);
    return () => {
      window.removeEventListener('tpp:group-buy-deleted', handleDeleteEvent);
    };
  }, []);
  
  const list = localList;
  
  // Terracotta gradient for delete button
  const terracottaGradient = 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)';
  const terracottaHoverGradient = 'linear-gradient(135deg, #b5684a 0%, #a35a3f 100%)';
  
  const handleViewAll = () => {
    setShowModal(true);
  }

  const handleItemClick = (item) => {
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
      // CRITICAL: Use current localList state instead of reading from localStorage
      // Reading from localStorage can give stale data if a previous save hasn't been written yet
      const scheduledBuys = [...localList];
      
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
        const updatedTimestamp = new Date().toISOString();
        const oldItem = scheduledBuys[itemIndex];
        
        // Build updated item: old item base + all editedData fields + metadata
        const updatedItem = {
          ...oldItem,           // Start with old item
          ...editedData,        // Override with ALL edited fields
          id: itemId,           // Ensure ID preserved
          updatedAt: updatedTimestamp,  // Add timestamp
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
      
      // Update local list immediately - create a new array reference to force re-render
      // Map through to create new object references so React detects the change
      const updatedList = scheduledBuys.map(buy => ({ ...buy }));
      setLocalList(updatedList);
      
      // CRITICAL: Dispatch event to update parent component's state (AppContext)
      // This prevents AppContext from overwriting our localStorage changes
      window.dispatchEvent(new CustomEvent('tpp:scheduled-buys-updated', {
        detail: { scheduledBuys: updatedList }
      }));
      
      // Trigger calendar sync
      window.dispatchEvent(new CustomEvent('tpp:calendar-sync'));
      
      console.log('✅ Saved group buy:', itemId, editedData);
      console.log('📋 Updated list:', updatedList);
      
      // Force exit edit mode immediately
      setEditingItems({});
      
      // Increment render key to force complete re-render
      setRenderKey(prev => prev + 1);
      
      // Re-select the item from the updatedList (which has fresh data)
      setTimeout(() => {
        const savedItem = updatedList.find(buy => buy.id === itemId);
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
      // CRITICAL: Use current localList state instead of reading from localStorage
      // This ensures we preserve any recent edits that haven't been synced yet
      const updatedBuys = localList.filter(item => item.id !== itemId);
      localStorage.setItem('tpprover_scheduled_buys', JSON.stringify(updatedBuys));
      
      // Update local list immediately
      setLocalList([...updatedBuys]);
      
      // CRITICAL: Dispatch event to update parent component's state (AppContext)
      window.dispatchEvent(new CustomEvent('tpp:scheduled-buys-updated', {
        detail: { scheduledBuys: updatedBuys }
      }));
      
      // Trigger calendar sync
      window.dispatchEvent(new CustomEvent('tpp:calendar-sync'));
      
      // Remove from editing state
      setEditingItems(prev => {
        const newState = { ...prev };
        delete newState[itemId];
        return newState;
      });
      
      // Close modal if item was selected
      if (selectedItem?.id === itemId) {
        setShowModal(false);
        setSelectedItem(null);
      }
      
      // Dispatch a custom event to notify parent components of the change
      window.dispatchEvent(new CustomEvent('tpp:group-buy-deleted', { detail: { itemId } }));
      
      // Close delete confirmation
      setDeleteConfirmId(null);
      
    } catch (error) {
      console.error('Error deleting group buy:', error);
    }
  }

  // Removed auto-save functionality - using manual save button instead

  return (
    <div className="rounded-xl content-card" style={{ backgroundColor: theme.cardBackground }}>
      <div className="px-3 py-2 border-b" style={{ borderColor: theme.border }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold" style={{ color: theme.text }}>
            Upcoming Buys
          </h3>
          <div className="flex items-center gap-2">
            <ShoppingCart size={20} style={{ color: theme.primary }} />
            <ModernTooltip text="Add" position="top">
              <button
                onClick={onAdd}
                className="rounded-full flex items-center justify-center action-button-hover transition-colors"
                style={{ 
                  color: '#ffffff',
                  backgroundColor: theme.primary,
                  width: '28px',
                  height: '28px',
                  padding: 0,
                  border: 'none',
                  boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.15), inset 0 1px 2px rgba(0, 0, 0, 0.1)'
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
              onClick={handleViewAll} 
              className="px-2 py-0.5 rounded text-xs font-medium border transition-colors opacity-70 hover:opacity-100" 
              style={{ 
                borderColor: theme.border, 
                color: theme.textLight,
                backgroundColor: 'transparent'
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
                onClick={onAdd}
                className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all hover:opacity-90 hover:scale-105"
                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
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
      {deleteConfirmId && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-sm"
            onClick={() => setDeleteConfirmId(null)}
          />
          <div 
            className="relative w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
            style={{ backgroundColor: theme.cardBackground }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h3 className="text-lg font-bold mb-2" style={{ color: theme.text }}>
                Delete Group Buy?
              </h3>
              <p className="text-sm mb-6" style={{ color: theme.textLight }}>
                This action cannot be undone. Are you sure you want to delete this group buy?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 border"
                  style={{ 
                    borderColor: theme.border,
                    color: theme.text
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => confirmDelete(deleteConfirmId)}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md active:scale-95"
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
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}


