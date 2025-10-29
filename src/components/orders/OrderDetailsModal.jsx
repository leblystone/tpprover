import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../common/Modal';
import TextInput from '../common/inputs/TextInput';
import { CheckCircle, Clock, Truck, Paperclip, Upload, FileText, PlusCircle } from 'lucide-react';
import { formatMMDDYYYY } from '../../utils/date';
import { formatCurrency } from '../../utils/currencyUtils';
import OrderItemSubForm from './OrderItemSubForm'; // Import the new sub-form
import VendorSuggestInput from '../vendors/VendorSuggestInput';
import DocumentationUpload from '../common/DocumentationUpload';
import useAutoSave from '../../utils/useAutoSave';
import AutoSaveIndicator from '../common/AutoSaveIndicator';

export default function OrderDetailsModal({ open, onClose, order, theme, onSave, onDelete, vendors = [], maxWidth = "max-w-3xl", isReadOnly = false, onUpgrade }) {
  const [form, setForm] = useState({});
  const [attachments, setAttachments] = useState([]);
  const [originalStatus, setOriginalStatus] = useState(null);
  
  // Auto-save functionality with order persistence
  const { isSaving, lastSaved, clearSavedData, markAsSubmitted } = useAutoSave(
    `order_form_${order?.id || 'new'}`,
    form,
    setForm,
    2000, // 2 second delay
    async (formData) => {
      // Auto-save to orders list if there's meaningful data
      const hasVendor = formData?.vendor && formData.vendor.trim().length > 0;
      const hasItemsWithData = formData?.items?.some(item => 
        item.name && item.name.trim().length > 0 && 
        (item.quantity > 0 || item.price || item.mg)
      );
      const hasNotes = formData?.notes && formData.notes.trim().length > 0;
      
      if (formData && (hasVendor || hasItemsWithData || hasNotes)) {
        try {
          if (order?.id) {
            console.log('🔄 Auto-saving existing order:', order.id);
            await onSave?.(formData);
          } else {
            console.log('🔄 Auto-saving new order draft');
            // For new orders, we don't auto-save to the orders list yet
            // Just keep the localStorage draft for now
          }
        } catch (error) {
          console.warn('Auto-save to orders failed:', error);
        }
      } else {
        console.log('🚫 Skipping autosave - insufficient data:', {
          hasVendor,
          hasItemsWithData,
          hasNotes,
          formData: formData ? Object.keys(formData) : 'null'
        });
      }
    }
  );
  
  // State for save operations
  const [isSavingToOrders, setIsSavingToOrders] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const totalCost = useMemo(() => {
    const itemsCost = (form.items || []).reduce((sum, item) => {
        const price = parseFloat(item.price) || 0;
        const quantity = parseInt(item.quantity, 10) || 1;
        return sum + (price * quantity);
    }, 0);
    const shippingCost = parseFloat(form.shippingCost) || 0;
    return itemsCost + shippingCost;
  }, [form.items, form.shippingCost]);

  useEffect(() => {
    if (open) {
      const initialData = order ? { ...order } : { date: new Date().toISOString() };
      
      // Ensure category defaults to 'domestic' if not set
      if (!initialData.category && !initialData.type) {
        initialData.category = 'domestic';
      } else if (initialData.type && !initialData.category) {
        // Migration: use 'type' as 'category' for consistency
        initialData.category = initialData.type;
      }
      
      // Migration for old single-item orders
      if (initialData.peptide && !initialData.items) {
        initialData.items = [{
          id: Date.now(),
          name: initialData.peptide,
          quantity: initialData.quantity || 1,
          unit: initialData.unit || 'vial',
          price: initialData.cost || ''
        }];
      } else if (!initialData.items || initialData.items.length === 0) {
        initialData.items = [{ id: Date.now(), quantity: 1, unit: 'vial' }]; // Start with one empty item for new orders
      }

      console.log('📝 OrderDetailsModal: Initializing form with data:', JSON.stringify(initialData, null, 2));
      setForm(initialData);
      setAttachments(initialData.attachments || []);
      setOriginalStatus(initialData.status || 'Order Placed');
    }
  }, [open, order]);

  // Debug form changes
  useEffect(() => {
    if (form && Object.keys(form).length > 0) {
      console.log('📝 OrderDetailsModal: Form state updated:', JSON.stringify(form, null, 2));
    }
  }, [form]);
  
  const steps = [
    { status: 'received', icon: <Clock size={20} color={theme?.primary} />, label: 'Order Placed' },
    { status: 'shipped', icon: <Truck size={20} color={theme?.primary} />, label: 'Shipped' },
    { status: 'delivered', icon: <CheckCircle size={20} color={theme?.primary} />, label: 'Delivered' },
  ]
  let current = 0
  if (form?.deliveryDate) current = 2
  else if (form?.shipDate) current = 1

  const markShipped = () => setForm(prev => ({ ...prev, status: 'Shipped', shipDate: new Date().toISOString().slice(0, 10) }))
  const markDelivered = () => setForm(prev => ({ ...prev, status: 'Delivered', deliveryDate: new Date().toISOString().slice(0, 10) }))

  const handleItemChange = (index, updatedItem) => {
    setForm(prev => {
        const newItems = [...(prev.items || [])];
        newItems[index] = updatedItem;
        return { ...prev, items: newItems };
    });
  };

  const addItem = () => {
      setForm(prev => ({
          ...prev,
          items: [...(prev.items || []), { id: Date.now(), quantity: 1, unit: 'vial' }]
      }));
  };

  const removeItem = (index) => {
      setForm(prev => ({
          ...prev,
          items: prev.items.filter((_, i) => i !== index)
      }));
  };

  // Prevent modal from closing if there's unsaved data
  const handleClose = () => {
    // Check if there's meaningful data that hasn't been saved
    const hasData = form && (
      form.vendor || 
      form.items?.some(item => item.name || item.quantity > 1) ||
      form.notes ||
      form.tracking
    );
    
    if (hasData && !isSavingToOrders) {
      const shouldClose = window.confirm(
        'You have unsaved changes. Are you sure you want to close without saving?'
      );
      if (!shouldClose) return;
    }
    
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Order${form?.id ? ` #${form.id}` : ''}`}
      titleExtra={
        <div className="flex items-center gap-2">
          <AutoSaveIndicator 
            isSaving={isSaving || isSavingToOrders} 
            lastSaved={lastSaved} 
            onClearForm={clearSavedData} 
            theme={theme}
            compact={true}
            iconOnly={true}
          />
          {(isSaving || isSavingToOrders) && (
            <span className="text-xs opacity-75" style={{ color: theme.textOnPrimary }}>
              {isSavingToOrders ? 'Saving...' : 'Auto-saving...'}
            </span>
          )}
        </div>
      }
      theme={theme}
      variant="modern"
      maxWidth={isReadOnly ? "max-w-md" : maxWidth}
      footer={(
        <div className="w-full flex justify-between items-center">
          <div>
            {form?.id && (
              <button onClick={() => onDelete?.(form.id)} className="px-3 py-2 rounded-md text-sm font-semibold bg-red-600 text-white hover:bg-red-700">Delete</button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleClose} className="px-4 py-2 rounded-lg text-sm font-medium border transition-all" style={{ borderColor: theme?.border, color: theme?.text }}>Cancel</button>
            <button 
              onClick={async () => {
                try {
                  setIsSavingToOrders(true);
                  setSaveError(null);
                  
                  // Validate that we have meaningful data before saving
                  const hasVendor = form?.vendor && form.vendor.trim().length > 0;
                  const hasItemsWithData = form?.items?.some(item => 
                    item.name && item.name.trim().length > 0 && 
                    (item.quantity > 0 || item.price || item.mg)
                  );
                  const hasNotes = form?.notes && form.notes.trim().length > 0;
                  
                  if (!hasVendor && !hasItemsWithData && !hasNotes) {
                    setSaveError('Please enter at least a vendor name, item details, or notes before saving.');
                    return;
                  }
                  
                  console.log('💾 Saving order:', JSON.stringify({ ...form, attachments }, null, 2));
                  
                  // Track status change for toast notification
                  const previousStatus = originalStatus || order?.status || 'Order Placed';
                  const newStatus = form?.status || 'Order Placed';
                  
                  // Call the save function
                  await onSave?.({ ...form, attachments });
                  
                  // Show toast if status changed to Shipped or Delivered
                  const statusChanged = previousStatus.toLowerCase() !== newStatus.toLowerCase();
                  if (statusChanged) {
                    if (newStatus.toLowerCase().includes('ship')) {
                      window.dispatchEvent(new CustomEvent('tpp:toast', { 
                        detail: { 
                          message: '🚚 Order marked as shipped!', 
                          type: 'info' 
                        } 
                      }));
                    } else if (newStatus.toLowerCase().includes('deliver')) {
                      window.dispatchEvent(new CustomEvent('tpp:toast', { 
                        detail: { 
                          message: '📦 Order marked as delivered!', 
                          type: 'success' 
                        } 
                      }));
                    }
                  }
                  
                  // Only clear auto-save and close modal after successful save
                  markAsSubmitted();
                  onClose();
                } catch (error) {
                  console.error('❌ Failed to save order:', error);
                  setSaveError('Failed to save order. Please try again.');
                } finally {
                  setIsSavingToOrders(false);
                }
              }}
              disabled={isSavingToOrders}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed" 
              style={{ backgroundColor: theme?.primary, color: theme?.textOnPrimary }}
            >
              {isSavingToOrders ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}
    >
      <div className="space-y-6">
        {/* Error Display */}
        {saveError && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-sm font-medium text-red-800">{saveError}</span>
            </div>
          </div>
        )}
        
        {/* Main form */}
        <div className="space-y-4">
          {/* Section: Vendor & Category */}
          <div>
            {/* Section Header */}
            <div className="mb-4 px-4 py-2.5 rounded-lg flex items-center justify-between" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, borderLeft: `4px solid ${theme.primary}` }}>
              <h4 className="font-black text-sm tracking-wide uppercase" style={{ color: theme.isDark ? '#a8b5a0' : theme.primary }}>Order Details</h4>
              {form.vendorId && (
                <button
                  onClick={() => {
                    const selectedVendor = vendors.find(v => v.id === form.vendorId);
                    if (selectedVendor && selectedVendor.type) {
                      setForm(prev => ({ ...prev, category: selectedVendor.type }));
                      window.dispatchEvent(new CustomEvent('tpp:toast', { 
                        detail: { message: 'Category autofilled from vendor', type: 'success' } 
                      }));
                    }
                  }}
                  className="text-xs px-2 py-1 rounded-md transition-all hover:opacity-80"
                  style={{ backgroundColor: theme.accent, color: theme.accentText }}
                  title="Autofill category from selected vendor"
                >
                  Autofill from Vendor
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <VendorSuggestInput
                    label="Vendor"
                    value={form.vendorId ? vendorMap[form.vendorId] : (form.vendor || '')}
                    onChange={v => {
                        const selectedVendor = vendors.find(vendor => vendor.name === v);
                        setForm(prev => ({ ...prev, vendor: v, vendorId: selectedVendor ? selectedVendor.id : null }));
                    }}
                    placeholder="Vendor"
                    theme={theme}
                  />
                </div>
                <div>
                  <div className="text-sm font-medium mb-1" style={{ color: theme?.text }}>
                    Category <span className="text-red-500">*</span>
                  </div>
                  <div className="flex rounded-lg p-1 gap-1" style={{ backgroundColor: theme.isDark ? '#1f2937' : '#f3f4f6' }}>
                    {['domestic','international','groupbuy'].map(k => (
                      <button key={k} type="button" onClick={() => setForm(prev => ({ ...prev, category: k }))}
                        className="flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all text-center"
                        style={form.category === k 
                          ? { backgroundColor: theme?.primary, color: '#ffffff' } 
                          : { color: theme.text }
                        }
                        onMouseEnter={(e) => {
                          if (form.category !== k) {
                            e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : '#e5e7eb';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (form.category !== k) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}>
                        {k === 'groupbuy' ? 'Group Buy' : k.charAt(0).toUpperCase() + k.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
            </div>
        </div>

        {/* Section: Items */}
        <div>
            {/* Section Header */}
            <div className="mb-4 px-4 py-2.5 rounded-lg" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, borderLeft: `4px solid ${theme.primary}` }}>
              <h4 className="font-black text-sm tracking-wide uppercase" style={{ color: theme.isDark ? '#a8b5a0' : theme.primary }}>Items</h4>
            </div>
            <div className="space-y-3">
                {form.items?.map((item, index) => (
                    <OrderItemSubForm 
                        key={item.id || index}
                        item={item}
                        onChange={(updated) => handleItemChange(index, updated)}
                        onRemove={() => removeItem(index)}
                        theme={theme}
                        isOnlyItem={form.items.length === 1}
                    />
                ))}
            </div>
            <button
              type="button"
              className="mt-3 px-3 py-2 rounded-md text-xs font-semibold flex items-center gap-2 w-full justify-center transition-all"
              style={{ 
                backgroundColor: theme.isDark ? '#1f2937' : theme.secondary,
                color: theme.text 
              }}
              onClick={addItem}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : theme.primary + '20';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.isDark ? '#1f2937' : theme.secondary;
              }}
            >
              <PlusCircle size={14} /> Add Another Item
            </button>
            
            {/* Shipping Cost Field */}
            <div className="mt-4 pt-3 border-t" style={{ borderColor: theme.border }}>
              <TextInput 
                label="Shipping Cost" 
                value={form.shippingCost || ''} 
                onChange={v => setForm({ ...form, shippingCost: v })} 
                placeholder="0.00" 
                theme={theme}
                type="number"
                step="0.01"
              />
            </div>
            
            <div className="flex justify-end items-center pt-2">
                <span className="text-sm font-medium" style={{ color: theme?.text }}>Total Cost:</span>
                <span className="text-lg font-semibold ml-2" style={{ color: theme?.primaryDark }}>
                    {formatCurrency(totalCost)}
                </span>
            </div>
        </div>

        {/* Section: Status & Dates */}
        <div>
          {/* Section Header */}
          <div className="mb-4 px-4 py-2.5 rounded-lg" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, borderLeft: `4px solid ${theme.primary}` }}>
            <h4 className="font-black text-sm tracking-wide uppercase" style={{ color: theme.isDark ? '#a8b5a0' : theme.primary }}>Order Status</h4>
          </div>
          <div className="space-y-3">
            <div className="flex rounded-lg p-1 gap-1" style={{ backgroundColor: theme.isDark ? '#1f2937' : '#f3f4f6' }}>
              {[
                { label: 'Order Placed', value: 'Order Placed' },
                { label: 'In Transit', value: 'Shipped' },
                { label: 'Delivered', value: 'Delivered' },
                { label: 'Delayed', value: 'Delayed' },
              ].map(opt => (
                <button key={opt.value} type="button" onClick={() => {
                  const previousStatus = form.status || originalStatus || 'Order Placed';
                  const newForm = { 
                    ...form, 
                    status: opt.value, 
                    shipDate: opt.value==='Shipped' ? (form.shipDate || new Date().toISOString().slice(0,10)) : form.shipDate, 
                    deliveryDate: opt.value==='Delivered' ? (form.deliveryDate || new Date().toISOString().slice(0,10)) : form.deliveryDate 
                  };
                  setForm(newForm);
                  
                  // Show toast immediately if status changed to Shipped or Delivered
                  const statusChanged = previousStatus.toLowerCase() !== opt.value.toLowerCase();
                  if (statusChanged) {
                    if (opt.value.toLowerCase().includes('ship')) {
                      window.dispatchEvent(new CustomEvent('tpp:toast', { 
                        detail: { 
                          message: '🚚 Order marked as shipped!', 
                          type: 'info' 
                        } 
                      }));
                    } else if (opt.value.toLowerCase().includes('deliver')) {
                      window.dispatchEvent(new CustomEvent('tpp:toast', { 
                        detail: { 
                          message: '📦 Order marked as delivered!', 
                          type: 'success' 
                        } 
                      }));
                    }
                  }
                }}
                  className="flex-1 text-center px-2 py-2 text-xs font-medium rounded-md transition-all whitespace-nowrap"
                  style={form.status === opt.value 
                    ? { backgroundColor: theme?.primary, color: '#ffffff' } 
                    : { color: theme.text }
                  }
                  onMouseEnter={(e) => {
                    if (form.status !== opt.value) {
                      e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : '#e5e7eb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (form.status !== opt.value) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
            <TextInput label="Tracking #" value={form.tracking || ''} onChange={v => setForm({ ...form, tracking: v })} placeholder="Optional" theme={theme} />
            <div className="grid grid-cols-2 gap-3">
              <TextInput type="date" label="Date Ordered" value={form.date ? new Date(form.date).toISOString().slice(0,10) : ''} onChange={v => setForm({ ...form, date: v })} theme={theme} />
              <TextInput type="date" label="Delivery Date" value={form.deliveryDate ? new Date(form.deliveryDate).toISOString().slice(0,10) : ''} onChange={v => setForm({ ...form, deliveryDate: v })} theme={theme} />
            </div>
          </div>
        </div>

        {/* Page Break */}
        <div className="border-t" style={{ borderColor: theme.border }}></div>

        {/* Section: Notes & Documentation */}
        <div className="space-y-4">
          <TextInput label="Notes" value={form.notes || ''} onChange={v => setForm({ ...form, notes: v })} placeholder="Order notes..." theme={theme} />
          
          <DocumentationUpload
            documentation={attachments}
            onChange={setAttachments}
            theme={theme}
            title="Pre-Delivery Documentation"
            placeholder="Add COA links, vendor photos, or other documentation..."
            allowImages={true}
            allowLinks={true}
          />
        </div>
        </div>
      </div>
      
      {/* Lockout Overlay - Covers entire modal */}
      {isReadOnly && (
        <div className="absolute inset-0 backdrop-blur-md bg-white/60 flex items-center justify-center z-50 rounded-lg">
          <div className="text-center p-6 max-w-md">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: `${theme.primary}20` }}>
              <PlusCircle size={32} style={{ color: theme.primary }} />
            </div>
            <h3 className="text-xl font-bold mb-2" style={{ color: theme.primaryDark }}>
              Trial has ended
            </h3>
            <p className="text-sm mb-4" style={{ color: theme.text }}>
              Upgrade to continue adding and managing orders
            </p>
            <button
              onClick={() => {
                if (onUpgrade) {
                  onUpgrade();
                } else {
                  window.location.href = '/app/account';
                }
              }}
              className="px-6 py-2.5 rounded-lg font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
            >
              Choose a Plan
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// shipping timeline removed


