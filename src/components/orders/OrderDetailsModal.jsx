import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../common/Modal';
import TextInput from '../common/inputs/TextInput';
import { CheckCircle, Clock, Truck, Paperclip, Upload, FileText, PlusCircle, PackageOpen, ListChecks, TruckElectric, ImageUp } from 'lucide-react';
import { formatMMDDYYYY } from '../../utils/date';
import { formatCurrency } from '../../utils/currencyUtils';
import OrderItemSubForm from './OrderItemSubForm'; // Import the new sub-form
import VendorSuggestInput from '../vendors/VendorSuggestInput';
import DocumentationUpload from '../common/DocumentationUpload';
import useAutoSave from '../../utils/useAutoSave';
import AutoSaveIndicator from '../common/AutoSaveIndicator';
import { generateId } from '../../utils/string';
import GlassmorphismDatePicker from '../common/GlassmorphismDatePicker';

export default function OrderDetailsModal({ open, onClose, order, theme, onSave, onDelete, vendors = [], maxWidth = "max-w-3xl", isReadOnly = false, onUpgrade }) {
  const [form, setForm] = useState({});
  const [attachments, setAttachments] = useState([]);
  const [originalStatus, setOriginalStatus] = useState(null);

  const primaryColor = theme?.primary || '#3b82f6';
  const toSubtleBackground = (hex) => {
    if (theme?.isDark) {
      return 'transparent';
    }

    if (typeof hex === 'string' && hex.startsWith('#') && hex.length === 7) {
      return `${hex}1A`;
    }

    return 'rgba(59, 130, 246, 0.08)';
  };
  const primaryStrongColor = theme?.primaryDark || primaryColor;
  const subtlePrimaryBackground = toSubtleBackground(primaryColor);
  const neutralBorderColor = theme?.border || '#d1d5db';
  const neutralTextColor = theme?.mutedText || theme?.text || '#4b5563';
  const dangerBorderColor = theme?.dangerBorder || '#fecaca';
  const dangerTextColor = theme?.dangerText || '#b91c1c';

  const formatCategoryLabel = (category) => {
    if (!category) return 'Research Buy Queue';
    if (category === 'groupbuy') return 'Group Buy';
    return category.charAt(0).toUpperCase() + category.slice(1);
  };
  
  // Auto-save functionality with order persistence
  const { isSaving, lastSaved, clearSavedData, markAsSubmitted } = useAutoSave(
    `order_form_${order?.id || 'new'}`,
    form,
    setForm,
    2000, // 2 second delay
    async () => {
      // Drafts are kept locally; orders are only persisted on explicit save.
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

  const vendorMap = useMemo(() => {
    return (vendors || []).reduce((acc, vendor) => {
      if (vendor?.id != null) {
        acc[vendor.id] = vendor.name || '';
      }
      return acc;
    }, {});
  }, [vendors]);

  useEffect(() => {
    if (open) {
      const initialData = order ? { ...order } : { date: new Date().toISOString(), status: 'Order Placed' };
      
      // Ensure category defaults to 'domestic' if not set
      if (!initialData.category && !initialData.type) {
        initialData.category = 'domestic';
      } else if (initialData.type && !initialData.category) {
        // Migration: use 'type' as 'category' for consistency
        initialData.category = initialData.type;
      }
      
      // Ensure new orders have status set
      if (!order && !initialData.status) {
        initialData.status = 'Order Placed';
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
        initialData.items = [{ id: Date.now(), unit: 'vial' }]; // Start with one empty item for new orders
      }

      initialData.items = (initialData.items || []).map(item => ({
        ...item,
        unit: item.unit === 'bottle' ? 'vial' : (item.unit || 'vial'),
        mgUnit: item.mgUnit || 'mg'
      }));

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
          items: [...(prev.items || []), { id: Date.now(), quantity: 1, unit: 'vial', mgUnit: 'mg' }]
      }));
  };

  const removeItem = (index) => {
      setForm(prev => ({
          ...prev,
          items: prev.items.filter((_, i) => i !== index)
      }));
  };

  // Close handler - autosave handles data persistence, so no confirmation needed
  const handleClose = () => {
    onClose();
  };

  useEffect(() => {
    setForm(prev => {
      if (!prev) return prev;
      if (prev.attachments === attachments) {
        return prev;
      }
      return { ...prev, attachments };
    });
  }, [attachments]);

  const handleSave = async () => {
    if (isReadOnly) {
      if (onUpgrade) {
        onUpgrade();
      }
      return;
    }

    if (!onSave) {
      return;
    }

    setIsSavingToOrders(true);
    setSaveError(null);

    try {
      const normalizedCategory = form.category || form.type || 'domestic';
      const normalizedItems = (form.items || []).map((item, index) => {
        const trimmedName = (item.name || '').trim();
        const normalizedQuantity = item.quantity ?? '';
        const normalizedPrice = item.price ?? '';
        const normalizedMg = item.mg ?? '';

        return {
          ...item,
          id: item.id || generateId(12),
          name: trimmedName,
          mg: normalizedMg,
          mgUnit: item.mgUnit || 'mg',
          quantity: normalizedQuantity,
          unit: item.unit || 'vial',
          price: normalizedPrice
        };
      }).filter(item => {
        const hasQuantity = item.quantity !== undefined && item.quantity !== '' && Number(item.quantity) > 0;
        return item.name || item.price || item.mg || hasQuantity;
      });
      const primaryItem = normalizedItems[0] || {};
      const vendorName = (form.vendor || '').trim();
      const computedCost = normalizedItems.reduce((sum, item) => {
        const price = parseFloat(item.price) || 0;
        const quantity = Number(item.quantity) || 1;
        return sum + (price * quantity);
      }, 0);

      const payload = {
        ...form,
        vendor: vendorName,
        vendorId: form.vendorId ?? null,
        category: normalizedCategory,
        type: normalizedCategory,
        items: normalizedItems,
        peptide: form.peptide || form.peptideName || primaryItem.name || '',
        peptideName: form.peptideName || primaryItem.name || form.peptide || '',
        mg: form.mg || primaryItem.mg || '',
        unit: form.unit || primaryItem.unit || '',
        quantity: form.quantity || primaryItem.quantity || '',
        cost: form.cost || form.price || primaryItem.price || (computedCost ? computedCost.toString() : ''),
        price: form.price || primaryItem.price || '',
        attachments
      };
      await onSave(payload);
      markAsSubmitted();

      if (!form?.id) {
        clearSavedData();
      }

      const categoryLabel = formatCategoryLabel(payload.category);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: {
          message: `${categoryLabel} order saved!`,
          type: 'success'
        }
      }));

      // Close the modal after successful save
      onClose();
    } catch (error) {
      console.error('❌ Failed to save order:', error);
      setSaveError('We had trouble saving this order. Please try again.');
    } finally {
      setIsSavingToOrders(false);
    }
  };

  const handleDelete = async () => {
    if (!form?.id || !onDelete) {
      return;
    }

    try {
      await onDelete(form.id);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: {
          message: 'Order has been deleted! 🗑️',
          type: 'info'
        }
      }));
    } catch (error) {
      console.error('❌ Failed to delete order:', error);
      setSaveError('We could not delete this order right now.');
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={
        form?.publicOrderNumber
          ? `Order #${form.publicOrderNumber}`
          : form?.id
            ? `Order #${form.id}`
            : 'New Order'
      }
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
        </div>
      }
      theme={theme}
      variant="modern"
      maxWidth={isReadOnly ? "max-w-md" : maxWidth}
      footer={(
        <div className="w-full flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1 justify-start">
            {form?.id && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)',
                  color: '#ffffff',
                  border: 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #b5684a 0%, #a35a3f 100%)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)';
                }}
              >
                Delete
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-1 justify-end">
            {!isReadOnly && (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSavingToOrders}
                className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ 
                  background: isSavingToOrders ? theme.secondary : `linear-gradient(135deg, ${theme?.primary} 0%, ${theme?.primaryDark || theme?.primary} 100%)`,
                  color: theme?.textOnPrimary || '#ffffff',
                  border: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isSavingToOrders) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = theme.isDark ? '0 10px 25px rgba(0, 0, 0, 0.5)' : '0 10px 25px rgba(0, 0, 0, 0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSavingToOrders) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = theme.isDark ? '0 4px 6px rgba(0, 0, 0, 0.3)' : '0 4px 6px rgba(0, 0, 0, 0.1)';
                  }
                }}
              >
                {isSavingToOrders ? 'Saving…' : 'Save Changes'}
              </button>
            )}
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
            <div className="px-4 py-2.5 rounded-lg flex items-center justify-between mb-2" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, borderLeft: '4px solid #e0ded7' }}>
              <h4 className="font-bold text-sm tracking-wider uppercase" style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76', letterSpacing: '0.1em' }}>ORDER DETAILS</h4>
              <div className="flex items-center gap-2">
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
                <PackageOpen size={20} style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76' }} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
                <div className="relative lg:col-span-3">
                  <VendorSuggestInput
                    label="Vendor"
                    value={form.vendorId ? vendorMap[form.vendorId] : (form.vendor || '')}
                    onChange={v => {
                        const selectedVendor = vendors.find(vendor => vendor.name === v);
                        setForm(prev => ({ ...prev, vendor: v, vendorId: selectedVendor ? selectedVendor.id : null }));
                    }}
                    placeholder="e.g., Pharm..."
                    theme={theme}
                    outlined={true}
                    customTextColor="#181A18"
                    customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
                  />
                </div>
                <div className="lg:col-span-4">
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
            <div className="px-4 py-2.5 rounded-lg flex items-center justify-between mb-2" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, borderLeft: '4px solid #e0ded7' }}>
              <h4 className="font-bold text-sm tracking-wider uppercase" style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76', letterSpacing: '0.1em' }}>ITEMS</h4>
              <ListChecks size={20} style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76' }} />
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
                outlined={true}
                customTextColor="#181A18"
                customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
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
          <div className="px-4 py-2.5 rounded-lg flex items-center justify-between mb-2" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, borderLeft: '4px solid #e0ded7' }}>
            <h4 className="font-bold text-sm tracking-wider uppercase" style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76', letterSpacing: '0.1em' }}>ORDER STATUS</h4>
            <TruckElectric size={20} style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76' }} />
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
                  style={(form.status || (order ? null : 'Order Placed')) === opt.value 
                    ? { backgroundColor: theme?.primary, color: '#ffffff' } 
                    : { color: theme.text }
                  }
                  onMouseEnter={(e) => {
                    if ((form.status || (order ? null : 'Order Placed')) !== opt.value) {
                      e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : '#e5e7eb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if ((form.status || (order ? null : 'Order Placed')) !== opt.value) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
            <TextInput 
              label="Tracking #" 
              value={form.tracking || ''} 
              onChange={v => setForm({ ...form, tracking: v })} 
              placeholder="Optional" 
              theme={theme}
              outlined={true}
              customTextColor="#181A18"
              customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: theme.textLight || theme.text, fontSize: '0.75rem', marginBottom: '4px' }}>Date Ordered</label>
                <GlassmorphismDatePicker
                  value={form.date ? new Date(form.date).toISOString().slice(0,10) : ''}
                  onChange={(dateString) => setForm({ ...form, date: dateString })}
                  theme={theme}
                  placeholder="Date Ordered"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: theme.textLight || theme.text, fontSize: '0.75rem', marginBottom: '4px' }}>Delivery Date</label>
                <GlassmorphismDatePicker
                  value={form.deliveryDate ? new Date(form.deliveryDate).toISOString().slice(0,10) : ''}
                  onChange={(dateString) => setForm({ ...form, deliveryDate: dateString })}
                  theme={theme}
                  placeholder="Delivery Date"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Page Break */}
        <div className="border-t" style={{ borderColor: theme.border }}></div>

        {/* Section: Notes & Documentation */}
        <div>
          {/* Section Header */}
          <div className="px-4 py-2.5 rounded-lg flex items-center justify-between mb-2" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, borderLeft: '4px solid #e0ded7' }}>
            <h4 className="font-bold text-sm tracking-wider uppercase" style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76', letterSpacing: '0.1em' }}>EXTRA DETAILS</h4>
            <ImageUp size={20} style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76' }} />
          </div>
        <div className="space-y-4">
            <TextInput 
              label="Notes" 
              value={form.notes || ''} 
              onChange={v => setForm({ ...form, notes: v })} 
              placeholder="Order notes..." 
              theme={theme}
              outlined={true}
              customTextColor="#181A18"
              customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
            />
          
          <DocumentationUpload
            documentation={attachments}
            onChange={setAttachments}
            theme={theme}
              title=""
              placeholder="Add COA link, vendor photos, or screenshots that correlate with this peptide."
            allowImages={true}
            allowLinks={true}
          />
          </div>
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


