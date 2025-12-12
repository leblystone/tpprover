import React, { useState, useMemo, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { BookHeart, Plus, X, DollarSign, Edit, Package } from 'lucide-react'
import Modal from '../common/Modal'
import ModernTooltip from '../ui/ModernTooltip'
import TextInput from '../common/inputs/TextInput'
import { recordDeletion, getDeletedItems, isDeleted } from '../../utils/deletionTracking'
import { generateId } from '../../utils/string'
import ExpandableTooltip from '../ui/ExpandableTooltip'
import { WIDGET_TOOLTIPS } from '../../utils/widgetTooltips'

export default function Wishlist({ items = [], wishlist, theme, onAdd }) {
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editingItems, setEditingItems] = useState({});
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [renderKey, setRenderKey] = useState(0);
  const [priceFocused, setPriceFocused] = useState({});
  
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
    
    setEditingItems(prev => ({
      ...prev,
      [itemId]: {
        name: item.name || item.item || '',
        vendor: item.vendor || '',
        price: item.price || '',
        notes: item.notes || item.description || '',
        priority: item.priority || 'medium'
      }
    }));
  }

  const handleCancelEdit = (itemId) => {
    setEditingItems(prev => {
      const newState = { ...prev };
      delete newState[itemId];
      return newState;
    });
    setPriceFocused(prev => {
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
      console.log('💾 Starting save for wishlist itemId:', itemId);
      
      let wishlistItems = list.filter(item => !isItemDeleted(item.id));
      
      const editedData = editingItems[itemId];
      if (!editedData) {
        console.error('No edited data found for item:', itemId);
        return;
      }
      
      const itemIndex = wishlistItems.findIndex(item => {
        return String(item.id) === String(itemId) || item.id === itemId;
      });
      
      if (itemIndex !== -1) {
        const oldItem = wishlistItems[itemIndex];
        const updatedItem = {
          ...oldItem,
          ...editedData,
          id: itemId,
          item: editedData.name || oldItem.name || oldItem.item,
          description: editedData.notes || oldItem.description || oldItem.notes
        };
        
        wishlistItems[itemIndex] = updatedItem;
      } else {
        wishlistItems.push({
          ...editedData,
          id: itemId,
          item: editedData.name,
          description: editedData.notes
        });
      }
      
      const deduplicated = deduplicateById(wishlistItems);
      const hasDeletedItems = deduplicated.some(item => isItemDeleted(item.id));
      if (hasDeletedItems) {
        const filtered = deduplicated.filter(item => !isItemDeleted(item.id));
        wishlistItems = filtered;
      } else {
        wishlistItems = deduplicated;
      }
      
      localStorage.setItem('tpprover_wishlist', JSON.stringify(wishlistItems));
      localStorage.setItem('tpprover_wishlist_lastUpdate', String(Date.now()));
      
      window.dispatchEvent(new CustomEvent('tpp:wishlist-updated', {
        detail: { wishlist: wishlistItems }
      }));
      
      console.log('✅ Saved wishlist item:', itemId, editedData);
      
      setEditingItems({});
      setRenderKey(prev => prev + 1);
      
      setTimeout(() => {
        const savedItem = wishlistItems.find(item => item.id === itemId);
        if (savedItem) {
          setSelectedItem({ ...savedItem });
        }
      }, 50);
      
    } catch (error) {
      console.error('Error saving wishlist item:', error);
    }
  }

  const handleDelete = (itemId) => {
    setDeleteConfirmId(itemId);
  }

  const confirmDelete = (itemId) => {
    try {
      console.log('🗑️ Starting delete for wishlist itemId:', itemId);
      
      let itemsToSave = list.filter(item => {
        const itemIdStr = String(item.id);
        const deleteIdStr = String(itemId);
        return itemIdStr !== deleteIdStr;
      });
      
      itemsToSave = itemsToSave.map(item => {
        const itemIdStr = String(item.id);
        if (editingItems[itemIdStr] && itemIdStr !== String(itemId)) {
          const editedData = editingItems[itemIdStr];
          return {
            ...item,
            ...editedData,
            id: item.id,
            item: editedData.name || item.name || item.item,
            description: editedData.notes || item.description || item.notes
          };
        }
        return item;
      });
      
      const updatedItems = deduplicateById(itemsToSave);
      
      localStorage.setItem('tpprover_wishlist', JSON.stringify(updatedItems));
      localStorage.setItem('tpprover_wishlist_lastUpdate', String(Date.now()));
      
      window.dispatchEvent(new CustomEvent('tpp:wishlist-updated', {
        detail: { wishlist: updatedItems }
      }));
      
      setEditingItems({});
      
      if (selectedItem?.id === itemId) {
        if (updatedItems.length > 0) {
          setSelectedItem({ ...updatedItems[0] });
        } else {
          setShowModal(false);
          setSelectedItem(null);
        }
      } else if (selectedItem) {
        const updatedSelected = updatedItems.find(item => String(item.id) === String(selectedItem.id));
        if (updatedSelected) {
          setSelectedItem({ ...updatedSelected });
        }
      }
      
      justDeletedIdsRef.current.add(String(itemId));
      
      const itemToDelete = list.find(item => String(item.id) === String(itemId));
      if (itemToDelete) {
        recordDeletion('wishlist', String(itemId), itemToDelete);
      } else {
        recordDeletion('wishlist', String(itemId));
      }
      
      setDeleteConfirmId(null);
      
      console.log('✅ Deleted wishlist item:', itemId);
      
    } catch (error) {
      console.error('Error deleting wishlist item:', error);
    }
  }

  return (
    <div className="h-full flex flex-col p-4 rounded-xl content-card w-full" style={{ backgroundColor: theme.white }}>
      <h3 className="text-sm font-semibold mb-3 border-b pb-2 flex-shrink-0 flex items-center justify-between" style={{ color: theme.text, borderColor: theme.border }}>
        <span className="flex items-center gap-2">
          Wishlist
          <BookHeart size={18} style={{ color: theme.primary }} />
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
          <p className="text-sm" style={{ color: theme.textLight }}>No items in wishlist.</p>
        ) : (
          <ul className="space-y-2">
            {list.map((it) => (
              <li 
                key={it.id} 
                onClick={() => handleItemClick(it)}
                className="flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors hover:opacity-80" 
                style={{ borderColor: theme.border }}
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
      
      {/* Wishlist Modal */}
      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedItem(null);
          setEditingItems({});
          setPriceFocused({});
        }}
        title="Research Wishlist"
        theme={theme}
        maxWidth="max-w-4xl"
        variant="modern"
      >
        <div className="space-y-6">
          {list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${theme.primary}10` }}>
                <BookHeart size={32} style={{ color: theme.primary }} />
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>No Wishlist Items</h3>
              <p className="text-sm mb-6 max-w-md" style={{ color: theme.textLight }}>
                Your wishlist is empty. Add items you're interested in researching to keep track of them.
              </p>
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
                className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all hover:opacity-90 hover:scale-105 touch-manipulation"
                style={{ 
                  backgroundColor: theme.primary, 
                  color: theme.textOnPrimary,
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                <Plus size={18} />
                Add to Wishlist
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" key={`modal-content-${renderKey}`}>
              {list.map((item) => (
                <div
                  key={`wishlist-${item.id}-${item.updatedAt || ''}`}
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
                      <div className="px-4 py-2.5 rounded-lg flex items-center justify-between mb-2" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, borderLeft: '4px solid #e0ded7' }}>
                        <h4 className="font-bold text-sm tracking-wider uppercase" style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76', letterSpacing: '0.1em' }}>WISHLIST ITEM</h4>
                        <BookHeart size={20} style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76' }} />
                      </div>

                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <TextInput
                            label="Item Name"
                            value={editingItems[item.id]?.name || ''}
                            onChange={v => handleFieldChange(item.id, 'name', v)}
                            placeholder="Product or Research Item"
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
                        <TextInput
                          label="Vendor"
                          value={editingItems[item.id]?.vendor || ''}
                          onChange={v => handleFieldChange(item.id, 'vendor', v)}
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
                              placeholder=" "
                              className="w-full p-3 pl-8 rounded-lg transition-all focus:outline-none outlined-input"
                              style={{
                                border: `1px solid ${priceFocused[item.id] ? theme.primary : '#f0eee7'}`,
                                backgroundColor: theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff'),
                                color: theme.isDark ? theme.text : '#181A18',
                                boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'
                              }}
                              onFocus={(e) => {
                                setPriceFocused(prev => ({ ...prev, [item.id]: true }));
                                e.target.style.borderColor = theme.primary;
                              }}
                              onBlur={(e) => {
                                setPriceFocused(prev => ({ ...prev, [item.id]: false }));
                                e.target.style.borderColor = '#f0eee7';
                              }}
                            />
                            <label 
                              className={`absolute transition-all pointer-events-none outlined-input-label ${(priceFocused[item.id] || editingItems[item.id]?.price) ? 'active' : ''}`}
                              style={{ 
                                top: (priceFocused[item.id] || editingItems[item.id]?.price) ? '-8px' : '14px',
                                left: (priceFocused[item.id] || editingItems[item.id]?.price) ? '12px' : '24px',
                                fontSize: (priceFocused[item.id] || editingItems[item.id]?.price) ? '0.875rem' : '1rem',
                                padding: (priceFocused[item.id] || editingItems[item.id]?.price) ? '0 4px' : '0',
                                color: (priceFocused[item.id] || editingItems[item.id]?.price) ? theme.primary : (theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76'),
                                backgroundColor: (priceFocused[item.id] || editingItems[item.id]?.price) ? (theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')) : 'transparent',
                                fontWeight: 500
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
                        placeholder="Research notes or details about this item"
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
                            {item.name || item.item || 'Untitled Item'}
                          </h4>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditMode(item.id);
                            }}
                            className="p-1 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                            title="Edit wishlist item"
                          >
                            <Edit size={14} />
                          </button>
                          <BookHeart size={16} style={{ color: theme.primary }} />
                        </div>
                      </div>
                      
                      <div className="space-y-2.5">
                        {item.vendor && (
                          <div className="flex items-start gap-2 text-sm">
                            <span className="font-medium min-w-[100px]" style={{ color: theme.text }}>Vendor:</span>
                            <span style={{ color: theme.textLight }}>{item.vendor}</span>
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
                Add New Item
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && createPortal(
        <div className="fixed inset-0 z-[10010] flex items-center justify-center p-4">
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
                Delete Wishlist Item?
              </h3>
              <p className="text-sm mb-6" style={{ color: theme.textLight }}>
                This action cannot be undone. Are you sure you want to delete this item from your wishlist?
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

