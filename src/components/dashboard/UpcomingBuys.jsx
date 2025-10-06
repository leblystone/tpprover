import React, { useState, useEffect, useRef } from 'react'
import { formatMMDDYYYY } from '../../utils/date'
import { ShoppingCart, Plus, X, Calendar, MapPin, Users, DollarSign, Edit, Trash2, Save, Check } from 'lucide-react'
import Modal from '../common/Modal'

export default function UpcomingBuys({ items = [], buys, theme, onAdd }) {
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editingItems, setEditingItems] = useState({});
  const [autoSaveStatus, setAutoSaveStatus] = useState({});
  const autoSaveTimeoutRef = useRef({});
  const list = Array.isArray(buys) ? buys : items
  
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
    
    // Initialize editing state for this specific item
    setEditingItems(prev => ({
      ...prev,
      [itemId]: {
        name: item.name || item.peptideName || '',
        vendor: item.vendor || '',
        location: item.location || '',
        participants: item.participants || '',
        price: item.price || '',
        description: item.description || '',
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
      const rawScheduled = localStorage.getItem('tpprover_scheduled_buys');
      const scheduledBuys = rawScheduled ? JSON.parse(rawScheduled) : [];
      
      const editedData = editingItems[itemId];
      if (!editedData) return;
      
      const itemIndex = scheduledBuys.findIndex(item => item.id === itemId);
      
      if (itemIndex !== -1) {
        // Update existing item
        scheduledBuys[itemIndex] = {
          ...scheduledBuys[itemIndex],
          ...editedData,
          peptideName: editedData.name, // Keep backward compatibility
          date: editedData.openDate // Keep backward compatibility
        };
      }
      
      localStorage.setItem('tpprover_scheduled_buys', JSON.stringify(scheduledBuys));
      
      // Trigger calendar sync
      window.dispatchEvent(new CustomEvent('tpp:calendar-sync'));
      
      // Exit edit mode for this item
      setEditingItems(prev => {
        const newState = { ...prev };
        delete newState[itemId];
        return newState;
      });
      
    } catch (error) {
      console.error('Error saving group buy changes:', error);
    }
  }

  const handleDelete = (itemId) => {
    if (window.confirm('Are you sure you want to delete this group buy?')) {
      try {
        const rawScheduled = localStorage.getItem('tpprover_scheduled_buys');
        const scheduledBuys = rawScheduled ? JSON.parse(rawScheduled) : [];
        
        // Remove the item
        const updatedBuys = scheduledBuys.filter(item => item.id !== itemId);
        localStorage.setItem('tpprover_scheduled_buys', JSON.stringify(updatedBuys));
        
        // Trigger calendar sync
        window.dispatchEvent(new CustomEvent('tpp:calendar-sync'));
        
        // Remove from editing state
        setEditingItems(prev => {
          const newState = { ...prev };
          delete newState[itemId];
          return newState;
        });
        
        // Dispatch a custom event to notify parent components of the change
        window.dispatchEvent(new CustomEvent('tpp:group-buy-deleted', { detail: { itemId } }));
        
      } catch (error) {
        console.error('Error deleting group buy:', error);
      }
    }
  }

  // Auto-save function
  const autoSave = (itemId) => {
    const editedData = editingItems[itemId];
    if (!editedData) return;

    try {
      const rawScheduled = localStorage.getItem('tpprover_scheduled_buys');
      const scheduledBuys = rawScheduled ? JSON.parse(rawScheduled) : [];
      
      const itemIndex = scheduledBuys.findIndex(item => item.id === itemId);
      if (itemIndex !== -1) {
        // Update existing item
        scheduledBuys[itemIndex] = {
          ...scheduledBuys[itemIndex],
          ...editedData,
          peptideName: editedData.name, // Keep backward compatibility
          date: editedData.openDate // Keep backward compatibility
        };
        
        localStorage.setItem('tpprover_scheduled_buys', JSON.stringify(scheduledBuys));
        
        // Trigger calendar sync
        window.dispatchEvent(new CustomEvent('tpp:calendar-sync'));
        
        // Update auto-save status
        setAutoSaveStatus(prev => ({
          ...prev,
          [itemId]: { status: 'saved', timestamp: new Date() }
        }));
        
        console.log('💾 Auto-saved group buy:', itemId);
      }
    } catch (error) {
      console.error('Error auto-saving group buy:', error);
      setAutoSaveStatus(prev => ({
        ...prev,
        [itemId]: { status: 'error', timestamp: new Date() }
      }));
    }
  };

  // Auto-save effect
  useEffect(() => {
    Object.keys(editingItems).forEach(itemId => {
      // Clear existing timeout
      if (autoSaveTimeoutRef.current[itemId]) {
        clearTimeout(autoSaveTimeoutRef.current[itemId]);
      }
      
      // Set new timeout for auto-save (1 second delay)
      autoSaveTimeoutRef.current[itemId] = setTimeout(() => {
        autoSave(itemId);
      }, 1000);
    });

    // Cleanup timeouts on unmount
    return () => {
      Object.values(autoSaveTimeoutRef.current).forEach(timeout => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, [editingItems]);

  return (
    <div className="rounded-xl content-card" style={{ backgroundColor: theme.cardBackground }}>
      <div className="px-3 py-2 border-b" style={{ borderColor: theme.border }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold" style={{ color: theme.text }}>
            Upcoming Buys
          </h3>
          <div className="flex items-center gap-1.5">
            <button 
              onClick={onAdd} 
              className="w-5 h-5 rounded-full flex items-center justify-center transition-colors hover:opacity-80 border-2" 
              style={{ 
                borderColor: '#8F9B75', 
                color: '#8F9B75',
                backgroundColor: 'transparent'
              }}
            >
              <Plus size={10} strokeWidth={2} />
            </button>
            <ShoppingCart size={16} style={{ color: theme.primary }} />
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
                  <div className="font-medium text-xs">{it.name || it.peptideName}</div>
                  <div className="text-xs" style={{ color: theme.textLight }}>
                    {it.vendor && `${it.vendor} • `}
                    {it.openDate ? formatMMDDYYYY(it.openDate) : (it.date ? formatMMDDYYYY(it.date) : '')}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {list.map((item) => (
                <div
                  key={item.id}
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
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <label className="block text-xs font-medium mb-1" style={{ color: theme.textLight }}>
                            Group Buy For:
                          </label>
                          <input
                            type="text"
                            value={editingItems[item.id]?.name || ''}
                            onChange={(e) => handleFieldChange(item.id, 'name', e.target.value)}
                            placeholder="Product Name"
                            className="w-full p-2 rounded border text-base font-semibold"
                            style={{ borderColor: theme.border, backgroundColor: theme.background }}
                          />
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          {/* Auto-save status indicator */}
                          {autoSaveStatus[item.id] && (
                            <div className="text-xs mr-2" style={{ 
                              color: autoSaveStatus[item.id].status === 'saved' ? theme.success : 
                                     autoSaveStatus[item.id].status === 'error' ? theme.error : 
                                     theme.textLight 
                            }}>
                              {autoSaveStatus[item.id].status === 'saved' ? '✓ Saved' : 
                               autoSaveStatus[item.id].status === 'error' ? '✗ Error' : 
                               'Saving...'}
                            </div>
                          )}
                          <button
                            onClick={() => handleSave(item.id)}
                            className="p-2 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                            title="Save changes"
                          >
                            <Save size={16} />
                          </button>
                          <button
                            onClick={() => handleCancelEdit(item.id)}
                            className="p-2 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
                            title="Cancel editing"
                          >
                            <X size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                            title="Delete group buy"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: theme.textLight }}>
                            Open Date
                          </label>
                          <input
                            type="date"
                            value={editingItems[item.id]?.openDate || ''}
                            onChange={(e) => handleFieldChange(item.id, 'openDate', e.target.value)}
                            className="w-full p-2 rounded border text-sm"
                            style={{ borderColor: theme.border, backgroundColor: theme.background }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: theme.textLight }}>
                            Close Date
                          </label>
                          <input
                            type="date"
                            value={editingItems[item.id]?.closeDate || ''}
                            onChange={(e) => handleFieldChange(item.id, 'closeDate', e.target.value)}
                            className="w-full p-2 rounded border text-sm"
                            style={{ borderColor: theme.border, backgroundColor: theme.background }}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: theme.textLight }}>
                            Group Buy Host
                          </label>
                          <input
                            type="text"
                            value={editingItems[item.id]?.vendor || ''}
                            onChange={(e) => handleFieldChange(item.id, 'vendor', e.target.value)}
                            placeholder="Name"
                            className="w-full p-2 rounded border text-sm"
                            style={{ borderColor: theme.border, backgroundColor: theme.background }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: theme.textLight }}>
                            Platform
                          </label>
                          <input
                            type="text"
                            value={editingItems[item.id]?.location || ''}
                            onChange={(e) => handleFieldChange(item.id, 'location', e.target.value)}
                            placeholder="e.g Discord, Telegram, ect."
                            className="w-full p-2 rounded border text-sm"
                            style={{ borderColor: theme.border, backgroundColor: theme.background }}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: theme.textLight }}>
                            Vendor
                          </label>
                          <input
                            type="text"
                            value={editingItems[item.id]?.participants || ''}
                            onChange={(e) => handleFieldChange(item.id, 'participants', e.target.value)}
                            placeholder="Vendor Name"
                            className="w-full p-2 rounded border text-sm"
                            style={{ borderColor: theme.border, backgroundColor: theme.background }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: theme.textLight }}>
                            Price
                          </label>
                          <input
                            type="text"
                            value={editingItems[item.id]?.price || ''}
                            onChange={(e) => handleFieldChange(item.id, 'price', e.target.value)}
                            placeholder="$"
                            className="w-full p-2 rounded border text-sm"
                            style={{ borderColor: theme.border, backgroundColor: theme.background }}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: theme.textLight }}>
                          Notes
                        </label>
                        <textarea
                          value={editingItems[item.id]?.description || ''}
                          onChange={(e) => handleFieldChange(item.id, 'description', e.target.value)}
                          placeholder="Any further group buy details."
                          rows={3}
                          className="w-full p-2 rounded border text-sm resize-none"
                          style={{ borderColor: theme.border, backgroundColor: theme.background }}
                        />
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-base mb-1" style={{ color: theme.text }}>
                            Group Buy For: {item.name || item.peptideName}
                          </h4>
                          <div className="flex items-center gap-2 text-sm mb-2" style={{ color: theme.textLight }}>
                            <Calendar size={14} />
                            {item.openDate ? formatMMDDYYYY(item.openDate) : (item.date ? formatMMDDYYYY(item.date) : 'TBD')}
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
                      
                      <div className="space-y-2">
                        {item.vendor && (
                          <div className="flex items-center gap-2 text-sm" style={{ color: theme.textLight }}>
                            <span className="font-medium" style={{ color: theme.text }}>Vendor:</span>
                            {item.vendor}
                          </div>
                        )}
                        
                        {item.location && (
                          <div className="flex items-center gap-2 text-sm" style={{ color: theme.textLight }}>
                            <MapPin size={14} />
                            {item.location}
                          </div>
                        )}
                        
                        {item.participants && (
                          <div className="flex items-center gap-2 text-sm" style={{ color: theme.textLight }}>
                            <Users size={14} />
                            {item.participants} participants
                          </div>
                        )}
                        
                        {item.price && (
                          <div className="flex items-center gap-2 text-sm" style={{ color: theme.textLight }}>
                            <DollarSign size={14} />
                            ${item.price} per unit
                          </div>
                        )}
                      </div>
                      
                      {item.description && (
                        <div className="mt-3 pt-3 border-t" style={{ borderColor: theme.border }}>
                          <p className="text-sm" style={{ color: theme.textLight }}>
                            {item.description}
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
    </div>
  )
}


