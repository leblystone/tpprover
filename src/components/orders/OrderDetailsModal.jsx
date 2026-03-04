import React, { useEffect, useMemo, useRef, useState } from 'react';
import BottomSheet from '../common/BottomSheet';
import TextInput from '../common/inputs/TextInput';
import { CheckCircle, Clock, Truck, Paperclip, Upload, FileText, PlusCircle, PackageOpen, ListChecks, TruckElectric, ImageUp, RefreshCw, MapPin } from 'lucide-react';
import { formatMMDDYYYY, getLocalDateString } from '../../utils/date';
import { formatCurrency } from '../../utils/currencyUtils';
import OrderItemSubForm from './OrderItemSubForm'; // Import the new sub-form
import VendorSuggestInput from '../vendors/VendorSuggestInput';
import DocumentationUpload from '../common/DocumentationUpload';
import useAutoSave from '../../utils/useAutoSave';
import AutoSaveIndicator from '../common/AutoSaveIndicator';
import { generateId } from '../../utils/string';
import GlassmorphismDatePicker from '../common/GlassmorphismDatePicker';
import { httpsCallable } from 'firebase/functions';
import { getFunctions } from 'firebase/functions';
import { getCachedTrackingInfo, detectCarrier, getMockTrackingInfo } from '../../services/tracking';

export default function OrderDetailsModal({ open, onClose, order, theme, onSave, onDelete, vendors = [], isReadOnly = false, onUpgrade, defaultCategory = 'domestic', activeTab, isDeleting = false }) {
  const [form, setForm] = useState({});
  const [attachments, setAttachments] = useState([]);
  const [originalStatus, setOriginalStatus] = useState(null);
  const [trackingInfo, setTrackingInfo] = useState(null);
  const [isLoadingTracking, setIsLoadingTracking] = useState(false);
  const lastSyncedTrackingRef = useRef(null);

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
  const [saveAttempted, setSaveAttempted] = useState(false);

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
      
      // Reset save attempted state when modal opens
      setSaveAttempted(false);
      setSaveError(null);
      
      const defaultCat = defaultCategory ?? activeTab ?? 'domestic';
      // For new orders, default category to defaultCategory/activeTab. For existing orders, preserve their category.
      if (!order) {
        initialData.category = defaultCat;
        initialData.type = defaultCat;
      } else {
        if (!initialData.category && !initialData.type) {
          initialData.category = defaultCat;
          initialData.type = defaultCat;
        } else if (initialData.type && !initialData.category) {
          initialData.category = initialData.type;
        }
      }
      
      // Ensure new orders have status set
      if (!order && !initialData.status) {
        initialData.status = 'Order Placed';
      }
      
      // Migration for old single-item orders
      if (initialData.peptide && !initialData.items) {
        initialData.items = [{
          id: generateId(),
          name: initialData.peptide,
          quantity: initialData.quantity || 1,
          unit: initialData.unit || 'vial',
          price: initialData.cost || ''
        }];
      } else if (!initialData.items || initialData.items.length === 0) {
        initialData.items = [{ id: generateId(), unit: 'vial' }]; // Start with one empty item for new orders
      }

      initialData.items = (initialData.items || []).map(item => ({
        ...item,
        unit: item.unit || 'vial',
        mgUnit: item.mgUnit || 'mg'
      }));

      setForm(initialData);
      setAttachments(initialData.attachments || []);
      setOriginalStatus(initialData.status || 'Order Placed');
      lastSyncedTrackingRef.current = null;
    }
  }, [open, order?.id, order?.status, order?.shipDate, order?.deliveryDate, order?.updatedAt, defaultCategory, activeTab]);


  // Fetch tracking info when tracking number changes
  useEffect(() => {
    const fetchTrackingInfo = async () => {
      if (!form?.tracking || !form.tracking.trim()) {
        setTrackingInfo(null);
        return;
      }

      setIsLoadingTracking(true);
      try {
        const carrier = detectCarrier(form.tracking);
        let info = await getCachedTrackingInfo(form.tracking, carrier, true);
        if (info?.hasError || info?.error) {
          info = getMockTrackingInfo(form.tracking);
        }
        if (info && !info.hasError) {
          setTrackingInfo(info);
        } else {
          setTrackingInfo(null);
        }
      } catch (error) {
        console.error('Error fetching tracking info:', error);
        const fallback = getMockTrackingInfo(form.tracking);
        setTrackingInfo(fallback?.hasError ? null : fallback);
      } finally {
        setIsLoadingTracking(false);
      }
    };

    // Debounce tracking number changes
    const timeoutId = setTimeout(() => {
      fetchTrackingInfo();
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timeoutId);
  }, [form?.tracking]);

  // Sync form status toggles from tracking data (only advances, never downgrades)
  useEffect(() => {
    if (!trackingInfo || !order?.id) return;

    const statusPriority = (s) => {
      const low = (s || '').toLowerCase();
      if (low.includes('deliver')) return 2;
      if (low.includes('ship') || low.includes('transit')) return 1;
      return 0;
    };

    const mapToFormStatus = () => {
      const ts = (trackingInfo.status || '').toLowerCase();
      if (ts.includes('deliver')) return 'Delivered';
      if (ts.includes('ship') || ts.includes('transit')) return 'Shipped';
      return 'Order Placed';
    };

    const newStatus = mapToFormStatus();
    const syncKey = `${order.id}-${trackingInfo.status}-${trackingInfo.lastUpdate || ''}`;
    if (lastSyncedTrackingRef.current === syncKey) return;

    setForm(prev => {
      if (statusPriority(newStatus) <= statusPriority(prev.status)) return prev;
      lastSyncedTrackingRef.current = syncKey;
      const now = getLocalDateString();
      return {
        ...prev,
        status: newStatus,
        statusSource: 'tracking',
        statusManuallySetAt: null,
        updatedAt: new Date().toISOString(),
        ...(newStatus === 'Shipped' && !prev.shipDate && { shipDate: now }),
        ...(newStatus === 'Delivered' && !prev.deliveryDate && { deliveryDate: now }),
      };
    });
  }, [trackingInfo, order?.id]);
  
  const steps = [
    { status: 'received', icon: <Clock size={20} color={theme?.primary} />, label: 'Order Placed' },
    { status: 'shipped', icon: <Truck size={20} color={theme?.primary} />, label: 'Shipped' },
    { status: 'delivered', icon: <CheckCircle size={20} color={theme?.primary} />, label: 'Delivered' },
  ]
  let current = 0
  if (form?.deliveryDate) current = 2
  else if (form?.shipDate) current = 1

  const markShipped = () => setForm(prev => ({ ...prev, status: 'Shipped', shipDate: getLocalDateString() }))
  const markDelivered = () => setForm(prev => ({ ...prev, status: 'Delivered', deliveryDate: getLocalDateString() }))

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
    setSaveAttempted(true);

    try {
      // Validate that all items have a peptide name
      const itemsWithMissingNames = (form.items || []).filter(item => {
        const trimmedName = (item.name || '').trim();
        return !trimmedName;
      });

      if (itemsWithMissingNames.length > 0) {
        setIsSavingToOrders(false);
        return;
      }

      const normalizedCategory = form.category || form.type || 'domestic';
      const normalizedItems = (form.items || []).map((item, index) => {
        const trimmedName = (item.name || '').trim();
        const normalizedQuantity = item.quantity ?? '';
        const normalizedPrice = item.price ?? '';
        const normalizedMg = item.mg ?? '';
        const normalizedCostPerMg = item.costPerMg ?? '';

        return {
          ...item,
          id: item.id || generateId(12),
          name: trimmedName,
          mg: normalizedMg,
          mgUnit: item.mgUnit || 'mg',
          quantity: normalizedQuantity,
          unit: item.unit || 'vial',
          price: normalizedPrice,
          costPerMg: normalizedCostPerMg
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

      // Register tracking with EasyPost so webhooks can update status (and trackingIndex is populated)
      const orderIdForTracking = payload.id || order?.id;
      if (payload.tracking && payload.tracking.trim() && orderIdForTracking) {
        try {
          const createTracker = httpsCallable(getFunctions(), 'createEasyPostTracker');
          await createTracker({
            trackingNumber: payload.tracking.trim(),
            orderId: orderIdForTracking,
            carrier: detectCarrier(payload.tracking),
          });
        } catch (err) {
          console.warn('EasyPost tracker registration failed (tracking still saved):', err);
        }
      }

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
      setSaveAttempted(false);
      onClose();
    } catch (error) {
      console.error('❌ Failed to save order:', error);
      setSaveError('We had trouble saving this order. Please try again.');
    } finally {
      setIsSavingToOrders(false);
    }
  };

  const handleDelete = async () => {
    if (!form?.id || !onDelete || isDeleting) {
      return;
    }

    try {
      await onDelete(form.id);
      // Toast notification is handled by the parent component
    } catch (error) {
      console.error('❌ Failed to delete order:', error);
      setSaveError('We could not delete this order right now.');
    }
  };

  return (
    <BottomSheet
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
      maxHeight="90vh"
      footer={(
        <div className="w-full flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1 justify-start">
            {form?.id && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed underline-offset-2 hover:underline"
                style={{
                  color: theme.isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)',
                  background: 'none',
                  border: 'none',
                  padding: '0 4px'
                }}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-1 justify-end">
            {!isReadOnly && (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSavingToOrders}
                className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap min-w-fit"
                style={{ 
                  background: isSavingToOrders ? theme.secondary : `linear-gradient(135deg, ${theme?.primary} 0%, ${theme?.primaryDark || theme?.primary} 100%)`,
                  color: theme?.textOnPrimary || '#ffffff',
                  border: 'none',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.15)'
                }}
                onMouseEnter={(e) => {
                  if (!isSavingToOrders) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = `inset 0 2px 4px rgba(0,0,0,0.15), ${theme.isDark ? '0 10px 25px rgba(0,0,0,0.5)' : '0 10px 25px rgba(0,0,0,0.15)'}`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSavingToOrders) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.15)';
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
          <div className="p-4 rounded-lg border" style={{ backgroundColor: theme.isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.05)', borderColor: theme.isDark ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.2)' }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-sm font-medium" style={{ color: theme.isDark ? '#fca5a5' : '#991b1b' }}>{saveError}</span>
            </div>
          </div>
        )}
        
        {/* Main form */}
        <div className="space-y-4">
          {/* Section: Vendor & Category */}
          <div>
            {/* Section Header */}
            <div className="flex items-center gap-4 mb-4">
              <PackageOpen size={32} style={{ color: theme.primary }} />
              <div className="flex flex-col gap-0.5 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-black tracking-wide" style={{ color: theme.text }}>Order Details</h4>
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
                      className="text-[10px] px-2 py-1 rounded-md transition-all hover:opacity-80 font-semibold uppercase tracking-wider"
                      style={{ backgroundColor: theme.accent, color: theme.accentText }}
                      title="Category was automatically applied"
                    >
                      Auto-applied
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-1">
                  <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                    Vendor & Category
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="relative lg:col-span-1">
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
                    customTextColor={theme.isDark ? null : "#181A18"}
                    customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
                  />
                </div>
                <div className="lg:col-span-2">
                  <div className="flex rounded-lg p-1 gap-1" style={{ backgroundColor: theme.isDark ? '#1a2028' : '#f0efe9', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08)' }}>
                    {['domestic','international','groupbuy'].map(k => (
                      <button key={k} type="button" onClick={() => setForm(prev => ({ ...prev, category: k }))}
                        className="flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all text-center active:scale-95"
                        style={{
                          backgroundColor: form.category === k ? '#445952' : 'transparent',
                          color: form.category === k ? '#fff' : theme.textLight,
                          boxShadow: form.category === k ? 'inset 0 2px 4px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.08)' : 'none'
                        }}>
                        {k === 'groupbuy' ? 'Group Buy' : k.charAt(0).toUpperCase() + k.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
            </div>
        </div>

        {/* Section: Items */}
        <div className="pt-2">
            {/* Section Header */}
            <div className="flex items-center gap-4 mb-4">
              <ListChecks size={32} style={{ color: theme.primary }} />
              <div className="flex flex-col gap-0.5">
                <h4 className="text-lg font-black tracking-wide" style={{ color: theme.text }}>Order Items</h4>
                <div className="flex items-center gap-2 ml-1">
                  <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                    Peptides & Quantities
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
                {form.items?.map((item, index) => {
                    const trimmedName = (item.name || '').trim();
                    const hasNameError = saveAttempted && !trimmedName;
                    return (
                        <OrderItemSubForm 
                            key={item.id || index}
                            item={item}
                            onChange={(updated) => {
                                handleItemChange(index, updated);
                                // Clear save attempted state when user starts typing
                                if (saveAttempted && updated.name && updated.name.trim()) {
                                    setSaveAttempted(false);
                                    setSaveError(null);
                                }
                            }}
                            onRemove={() => removeItem(index)}
                            theme={theme}
                            isOnlyItem={form.items.length === 1}
                            hasNameError={hasNameError}
                        />
                    );
                })}
            </div>
            <button
              type="button"
              className="mt-3 px-3 py-2 rounded-md text-xs font-semibold flex items-center gap-2 w-full justify-center transition-all"
              style={{ 
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : theme.secondary,
                color: theme.text,
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08)'
              }}
              onClick={addItem}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255,255,255,0.1)' : theme.primary + '20';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255,255,255,0.06)' : theme.secondary;
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
                customTextColor={theme.isDark ? null : "#181A18"}
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
        <div className="pt-2">
          {/* Section Header */}
          <div className="flex items-center gap-4 mb-4">
            <TruckElectric size={32} style={{ color: theme.primary }} />
            <div className="flex flex-col gap-0.5">
              <h4 className="text-lg font-black tracking-wide" style={{ color: theme.text }}>Order Status</h4>
              <div className="flex items-center gap-2 ml-1">
                <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                  Shipment Tracking
                </span>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex rounded-lg p-1 gap-1" style={{ backgroundColor: theme.isDark ? '#1a2028' : '#f0efe9', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08)' }}>
              {[
                { label: 'Order Placed', value: 'Order Placed' },
                { label: 'In Transit', value: 'Shipped' },
                { label: 'Delivered', value: 'Delivered' },
                { label: 'Delayed', value: 'Delayed' },
              ].map(opt => (
                <button key={opt.value} type="button" onClick={() => {
                  const previousStatus = form.status || originalStatus || 'Order Placed';
                  const now = new Date().toISOString();
                  const newForm = { 
                    ...form, 
                    status: opt.value, 
                    shipDate: opt.value==='Shipped' ? (form.shipDate || getLocalDateString()) : form.shipDate, 
                    deliveryDate: opt.value==='Delivered' ? (form.deliveryDate || getLocalDateString()) : form.deliveryDate,
                    statusSource: 'manual',
                    statusManuallySetAt: now,
                    updatedAt: now
                  };
                  setForm(newForm);
                  
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
                  className="flex-1 text-center px-2 py-2 text-xs font-medium rounded-md transition-all whitespace-nowrap active:scale-95"
                  style={{
                    backgroundColor: (form.status || (order ? null : 'Order Placed')) === opt.value ? '#445952' : 'transparent',
                    color: (form.status || (order ? null : 'Order Placed')) === opt.value ? '#fff' : theme.textLight,
                    boxShadow: (form.status || (order ? null : 'Order Placed')) === opt.value ? 'inset 0 2px 4px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.08)' : 'none'
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
              customTextColor={theme.isDark ? null : "#181A18"}
              customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
            />
            {/* Tracking Status Card — auto-track display */}
            {form.tracking && (
              <div
                className="rounded-xl overflow-hidden border"
                style={{
                  backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  borderColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                }}
              >
                <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}` }}>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : `${primaryColor}18` }}>
                      <Truck size={18} style={{ color: primaryColor }} />
                    </div>
                    <span className="text-sm font-semibold" style={{ color: theme.text }}>Live tracking</span>
                  </div>
                  {isLoadingTracking && <RefreshCw size={16} className="animate-spin" style={{ color: primaryColor }} />}
                </div>
                <div className="p-4">
                  {trackingInfo ? (
                    <div className="space-y-4">
                      {/* Progress: Order Placed → In Transit → Delivered */}
                      <div className="relative">
                        <div className="flex justify-between items-center mb-1.5">
                          {['Order Placed', 'In Transit', 'Delivered'].map((label, idx) => {
                            const progress = trackingInfo.progress ?? 0;
                            const active = idx <= progress;
                            return (
                              <span
                                key={label}
                                className="text-[10px] font-medium uppercase tracking-wide"
                                style={{ color: active ? (theme.isDark ? 'rgba(255,255,255,0.9)' : primaryColor) : theme.textLight }}
                              >
                                {label}
                              </span>
                            );
                          })}
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${((trackingInfo.progress ?? 0) / 2) * 100}%`,
                              backgroundColor: primaryColor,
                            }}
                          />
                        </div>
                      </div>
                      {/* Status pill */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold"
                          style={{
                            backgroundColor: trackingInfo.isDelivered
                              ? (theme.isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.15)')
                              : trackingInfo.isInTransit
                                ? (theme.isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.15)')
                                : (theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'),
                            color: trackingInfo.isDelivered ? '#22c55e' : trackingInfo.isInTransit ? '#d97706' : theme.text,
                          }}
                        >
                          {trackingInfo.status}
                        </span>
                        {trackingInfo.carrier && (
                          <span className="text-xs font-medium uppercase tracking-wide" style={{ color: theme.textLight }}>
                            {trackingInfo.carrier}
                          </span>
                        )}
                      </div>
                      {trackingInfo.statusDetail && (
                        <p className="text-xs leading-relaxed" style={{ color: theme.textLight }}>
                          {trackingInfo.statusDetail}
                        </p>
                      )}
                      {trackingInfo.location?.city && trackingInfo.location?.state && (
                        <div className="flex items-center gap-2 text-xs" style={{ color: theme.textLight }}>
                          <MapPin size={14} style={{ color: primaryColor, flexShrink: 0 }} />
                          <span>{[trackingInfo.location.city, trackingInfo.location.state, trackingInfo.location.country].filter(Boolean).join(', ')}</span>
                        </div>
                      )}
                      <div className="text-[10px] uppercase tracking-wide" style={{ color: theme.textLight, opacity: 0.8 }}>
                        Synced from carrier
                      </div>
                    </div>
                  ) : isLoadingTracking ? (
                    <div className="flex items-center gap-3 py-1">
                      <RefreshCw size={18} className="animate-spin flex-shrink-0" style={{ color: primaryColor }} />
                      <span className="text-sm" style={{ color: theme.textLight }}>Checking carrier…</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-2 text-center">
                      <div className="p-2 rounded-full" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
                        <Truck size={24} style={{ color: theme.textLight }} />
                      </div>
                      <p className="text-sm" style={{ color: theme.textLight }}>
                        No tracking data yet. Status will update when the carrier reports.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: theme.textLight || theme.text, fontSize: '0.75rem', marginBottom: '4px' }}>Date Ordered</label>
                <GlassmorphismDatePicker
                  value={form.date || ''}
                  onChange={(dateString) => setForm({ ...form, date: dateString })}
                  theme={theme}
                  placeholder="Date Ordered"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: theme.textLight || theme.text, fontSize: '0.75rem', marginBottom: '4px' }}>Delivery Date</label>
                <GlassmorphismDatePicker
                  value={form.deliveryDate || ''}
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
        <div className="pt-2">
          {/* Section Header */}
          <div className="flex items-center gap-4 mb-4">
            <ImageUp size={32} style={{ color: theme.primary }} />
            <div className="flex flex-col gap-0.5">
              <h4 className="text-lg font-black tracking-wide" style={{ color: theme.text }}>Extra Details</h4>
              <div className="flex items-center gap-2 ml-1">
                <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                  Notes & Documentation
                </span>
              </div>
            </div>
          </div>
        <div className="space-y-4">
            <TextInput 
              label="Notes" 
              value={form.notes || ''} 
              onChange={v => setForm({ ...form, notes: v })} 
              placeholder="Order notes..." 
              theme={theme}
              outlined={true}
              multiline={true}
              rows={3}
              customTextColor={theme.isDark ? null : "#181A18"}
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
        <div className="absolute inset-0 backdrop-blur-md flex items-center justify-center z-50 rounded-lg" style={{ backgroundColor: theme.isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)' }}>
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
    </BottomSheet>
  )
}

// shipping timeline removed
