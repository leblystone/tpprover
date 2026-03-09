import React, { useEffect, useMemo, useRef, useState } from 'react';
import BottomSheet from '../common/BottomSheet';
import TextInput from '../common/inputs/TextInput';
import { CheckCircle, Clock, Truck, PlusCircle, PackageOpen, ListChecks, TruckElectric, ImageUp, RefreshCw, MapPin, PencilLine } from 'lucide-react';
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [manualTracking, setManualTracking] = useState(false);
  const [isShippingCostFocused, setIsShippingCostFocused] = useState(false);
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
      setManualTracking(initialData.manualTracking || false);
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

  // Sync form status from tracking data — carrier is authoritative in live mode
  useEffect(() => {
    if (!trackingInfo || !order?.id || manualTracking) return;

    const mapToFormStatus = () => {
      const ts = (trackingInfo.status || '').toLowerCase();
      if (ts.includes('deliver')) return 'Delivered';
      if (ts.includes('ship') || ts.includes('transit')) return 'Shipped';
      return 'Order Placed';
    };

    const newStatus = mapToFormStatus();
    const syncKey = `${order.id}-${trackingInfo.status}-${trackingInfo.lastUpdate || ''}`;
    if (lastSyncedTrackingRef.current === syncKey) return;
    lastSyncedTrackingRef.current = syncKey;

    const now = getLocalDateString();
    setForm(prev => ({
      ...prev,
      status: newStatus,
      statusSource: 'tracking',
      statusManuallySetAt: null,
      updatedAt: new Date().toISOString(),
      ...(newStatus === 'Shipped' && !prev.shipDate && { shipDate: now }),
      ...(newStatus === 'Delivered' && !prev.deliveryDate && { deliveryDate: now }),
    }));
  }, [trackingInfo, order?.id, manualTracking]);
  
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
    setConfirmDelete(false);
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
      titleSuffix={form?.date ? `placed on ${formatMMDDYYYY(form.date)}` : undefined}
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
              <>
                <style>{`
                  @keyframes tapConfirmPop {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.08); }
                  }
                  .tap-confirm-pop {
                    animation: tapConfirmPop 0.45s ease-out 2;
                  }
                `}</style>
                <button
                  type="button"
                  onClick={() => {
                    if (confirmDelete) {
                      setConfirmDelete(false);
                      handleDelete();
                    } else {
                      setConfirmDelete(true);
                    }
                  }}
                  disabled={isDeleting}
                  className={`py-2 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${confirmDelete ? 'tap-confirm-pop' : ''}`}
                  style={{ color: confirmDelete ? '#8B5335' : '#C67A5C' }}
                >
                  {isDeleting ? 'Deleting...' : confirmDelete ? 'Tap Again to Confirm!' : 'Delete'}
                </button>
              </>
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
            
            {/* Shipping Cost + Total Cost on one row */}
            <div className="mt-4 pt-3 border-t flex items-center gap-3" style={{ borderColor: theme.border }}>
              <div className="relative flex-1 min-w-0">
                <div
                  className="rounded-lg flex items-stretch"
                  style={{
                    border: '1px solid #f0eee7',
                    boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)',
                    backgroundColor: theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff'),
                  }}
                >
                  {(form.shippingCost != null && String(form.shippingCost).trim() !== '') && (
                    <span
                      className="absolute pointer-events-none z-10"
                      style={{
                        left: 13,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '1rem',
                        fontWeight: 500,
                        color: theme.isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)',
                      }}
                    >
                      $
                    </span>
                  )}
                  <input
                    type="number"
                    id="outlined-input-shipping-cost"
                    name="outlined-input-shipping-cost"
                    value={form.shippingCost ?? ''}
                    onChange={e => setForm({ ...form, shippingCost: e.target.value })}
                    onFocus={() => setIsShippingCostFocused(true)}
                    onBlur={() => setIsShippingCostFocused(false)}
                    placeholder=" "
                    step="0.01"
                    className="flex-1 min-w-0 py-3 px-3 rounded-lg outline-none transition-all no-spin border-none"
                    style={{
                      backgroundColor: 'transparent',
                      color: theme.isDark ? theme.text : '#181A18',
                      paddingLeft: (form.shippingCost != null && String(form.shippingCost).trim() !== '') ? 24 : 12,
                    }}
                    aria-label="Shipping Cost"
                  />
                </div>
                <label
                  htmlFor="outlined-input-shipping-cost"
                  className="absolute pointer-events-none transition-all whitespace-nowrap"
                  style={{
                    fontSize: (isShippingCostFocused || (form.shippingCost != null && String(form.shippingCost).trim() !== '')) ? '0.65rem' : '0.875rem',
                    top: (isShippingCostFocused || (form.shippingCost != null && String(form.shippingCost).trim() !== '')) ? '-8px' : '14px',
                    left: (isShippingCostFocused || (form.shippingCost != null && String(form.shippingCost).trim() !== '')) ? '12px' : '16px',
                    padding: (isShippingCostFocused || (form.shippingCost != null && String(form.shippingCost).trim() !== '')) ? '0 4px' : '0',
                    background: (isShippingCostFocused || (form.shippingCost != null && String(form.shippingCost).trim() !== '')) ? (theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')) : 'transparent',
                    color: (isShippingCostFocused || (form.shippingCost != null && String(form.shippingCost).trim() !== '')) ? theme.primary : (theme.textLight || theme.text),
                    fontWeight: 500,
                  }}
                >
                  Shipping Cost
                </label>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-sm font-medium" style={{ color: theme?.text }}>Total Cost:</span>
                <span className="text-lg font-semibold" style={{ color: theme?.primaryDark }}>
                  {formatCurrency(totalCost)}
                </span>
              </div>
            </div>
        </div>

        {/* Section: Status & Dates */}
        <div className="pt-2">
          {/* Section Header */}
          <div className="flex items-center gap-4 mb-4">
            <TruckElectric size={32} style={{ color: theme.primary }} />
            <div className="flex flex-col gap-0.5 flex-1">
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
            {/* Tracking # input first; when no tracking we assume manual */}
            {/* Tracking # input + Manual tracking checkbox on same row */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <TextInput 
                  label="Tracking #" 
                  value={form.tracking || ''} 
                  onChange={v => {
                    const cleared = !v?.trim();
                    if (cleared) setManualTracking(false);
                    setForm(prev => ({ ...prev, tracking: v, ...(cleared && { manualTracking: false }) }));
                  }} 
                  placeholder="Optional" 
                  theme={theme}
                  outlined={true}
                  customTextColor={theme.isDark ? null : "#181A18"}
                  customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
                />
              </div>
              {/* Manual tracking checkbox — only visible when a tracking number is present */}
              {form.tracking?.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    const next = !manualTracking;
                    setManualTracking(next);
                    setForm(prev => ({ ...prev, manualTracking: next }));
                  }}
                  className="flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-all active:scale-95 flex-shrink-0"
                  style={{
                    backgroundColor: manualTracking
                      ? (theme.isDark ? `${primaryColor}30` : `${primaryColor}15`)
                      : (theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                    border: `1px solid ${manualTracking ? primaryColor : (theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)')}`,
                  }}
                  title="Toggle manual tracking"
                >
                  <div
                    className="w-4 h-4 rounded flex items-center justify-center transition-all border"
                    style={{
                      backgroundColor: manualTracking ? primaryColor : 'transparent',
                      borderColor: manualTracking ? primaryColor : theme.isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)',
                    }}
                  >
                    {manualTracking && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <span className="text-[10px] font-medium whitespace-nowrap" style={{ color: manualTracking ? primaryColor : theme.textLight }}>
                    Manual
                  </span>
                </button>
              )}
            </div>

            {/* Status buttons below tracking: no tracking = manual; or user chose Manual tracking */}
            {(!form.tracking?.trim() || manualTracking) && (
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
                    const wasDelivered = (previousStatus || '').toLowerCase().includes('deliver');
                    const becomingDelivered = opt.value === 'Delivered';
                    setForm({ 
                      ...form, 
                      status: opt.value, 
                      shipDate: opt.value==='Shipped' ? (form.shipDate || getLocalDateString()) : form.shipDate, 
                      // Set delivery date when marking delivered; clear it when reverting away from delivered
                      deliveryDate: becomingDelivered
                        ? (form.deliveryDate || getLocalDateString())
                        : wasDelivered ? null : form.deliveryDate,
                      statusSource: 'manual',
                      statusManuallySetAt: now,
                      updatedAt: now
                    });
                    const statusChanged = previousStatus.toLowerCase() !== opt.value.toLowerCase();
                    if (statusChanged) {
                      if (opt.value.toLowerCase().includes('ship')) {
                        window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: '🚚 Order marked as shipped!', type: 'info' } }));
                      } else if (opt.value.toLowerCase().includes('deliver')) {
                        window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: '📦 Order marked as delivered!', type: 'success' } }));
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
            )}

            {/* Live Tracking Card — shown when tracking number present and NOT in manual mode */}
            {form.tracking?.trim() && !manualTracking && (() => {
              const progress = trackingInfo?.progress ?? 0;
              const trackingSteps = [
                { icon: <Clock size={16} />, label: 'Order Placed' },
                { icon: <Truck size={16} />, label: 'In Transit' },
                { icon: <CheckCircle size={16} />, label: 'Delivered' },
              ];
              const carrierDisplay = (trackingInfo?.carrier || detectCarrier(form.tracking)).toUpperCase();
              const googleTrackingUrl = `https://www.google.com/search?q=${encodeURIComponent(form.tracking.trim() + ' tracking')}`;

              return (
                <div
                  className="rounded-xl overflow-hidden border"
                  style={{
                    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                    borderColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                    boxShadow: theme.isDark
                      ? 'inset 0 2px 8px rgba(0,0,0,0.35), inset 0 1px 2px rgba(0,0,0,0.2)'
                      : 'inset 0 2px 6px rgba(0,0,0,0.06), inset 0 1px 2px rgba(0,0,0,0.04)',
                  }}
                >
                  <div className="p-4 space-y-3">
                    {isLoadingTracking && !trackingInfo ? (
                      <div className="flex items-center gap-3 py-1">
                        <RefreshCw size={18} className="animate-spin flex-shrink-0" style={{ color: primaryColor }} />
                        <span className="text-sm" style={{ color: theme.textLight }}>Checking carrier…</span>
                      </div>
                    ) : (
                      <>
                        {/* Tracking number pill — clickable Google search link */}
                        <a
                          href={googleTrackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg w-full hover:opacity-80 transition-all"
                          style={{
                            backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : theme.secondary,
                            border: theme.isDark ? 'none' : `1px solid ${theme.border}`,
                            color: theme.text,
                            textDecoration: 'none',
                          }}
                        >
                          <span className="font-medium flex-shrink-0" style={{ color: theme.textLight }}>Tracking:</span>
                          <span className="font-mono flex-1 truncate">{form.tracking.trim()}</span>
                          <span className="text-xs px-2 py-0.5 rounded font-semibold flex-shrink-0" style={{
                            backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : `${primaryColor}20`,
                            color: theme.isDark ? 'rgba(255,255,255,0.7)' : primaryColor,
                          }}>
                            {carrierDisplay}
                          </span>
                        </a>

                        {/* Icon step circles + connecting line */}
                        {trackingInfo ? (
                          <>
                            <div className="w-full flex items-center justify-between relative mt-1">
                              {/* Track line background */}
                              <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1 rounded-full" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : theme.secondary }} />
                              {/* Track line fill */}
                              <div className="absolute top-1/2 -translate-y-1/2 left-0 h-1 rounded-full transition-all duration-500" style={{ width: `${(progress / 2) * 100}%`, backgroundColor: theme.isDark ? 'rgba(160,180,153,0.6)' : primaryColor }} />
                              {trackingSteps.map((s, idx) => (
                                <div key={s.label} className="flex flex-col items-center z-10 relative">
                                  <div
                                    className="rounded-full p-1.5 border-2 flex items-center justify-center"
                                    style={{
                                      backgroundColor: idx <= progress ? (theme.isDark ? '#7a8a72' : primaryColor) : (theme.isDark ? 'rgba(255,255,255,0.06)' : theme.cardBackground || '#fff'),
                                      borderColor: idx <= progress ? (theme.isDark ? '#7a8a72' : primaryColor) : (theme.isDark ? 'rgba(255,255,255,0.12)' : theme.secondary),
                                    }}
                                  >
                                    {React.cloneElement(s.icon, { color: idx <= progress ? (theme.textOnPrimary || '#fff') : theme.textLight })}
                                  </div>
                                </div>
                              ))}
                            </div>
                            {/* Step labels + dates */}
                            <div className="w-full flex justify-between">
                              {trackingSteps.map((s, idx) => {
                                let dateStr = null;
                                let dateLabel = null;
                                if (idx === 0) {
                                  dateStr = form.date;
                                } else if (idx === 2) {
                                  if (progress >= 2 && form.deliveryDate) {
                                    dateStr = form.deliveryDate;
                                  } else if (progress < 2 && trackingInfo?.estimatedDelivery) {
                                    dateStr = trackingInfo.estimatedDelivery;
                                    dateLabel = 'Est. ';
                                  }
                                }
                                return (
                                  <div key={s.label} className="flex flex-col items-center flex-1 gap-0.5">
                                    <span className="text-xs text-center" style={{ color: idx <= progress ? (theme.isDark ? 'rgba(255,255,255,0.85)' : primaryStrongColor) : theme.textLight, fontWeight: idx <= progress ? 600 : 400 }}>
                                      {s.label}
                                    </span>
                                    {dateStr && (
                                      <span className="text-[10px] text-center" style={{ color: theme.isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)' }}>
                                        {dateLabel}{formatMMDDYYYY(dateStr)}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            {/* Status detail + location */}
                            {trackingInfo.statusDetail && (
                              <p className="text-xs leading-relaxed" style={{ color: theme.textLight }}>{trackingInfo.statusDetail}</p>
                            )}
                            {trackingInfo.location?.city && (
                              <div className="flex items-center gap-1.5 text-xs" style={{ color: theme.textLight }}>
                                <MapPin size={12} style={{ color: primaryColor, flexShrink: 0 }} />
                                <span>{[trackingInfo.location.city, trackingInfo.location.state, trackingInfo.location.country].filter(Boolean).join(', ')}</span>
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-center py-1" style={{ color: theme.textLight }}>
                            No tracking data yet — status will update when the carrier reports.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })()}
            {/* Date pickers — shown when no tracking number OR in manual mode */}
            {(!form.tracking?.trim() || manualTracking) && (
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
            )}
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
