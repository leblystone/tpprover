import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../common/Modal';
import TextInput from '../common/inputs/TextInput';
import { CheckCircle, Clock, Truck, Paperclip, Upload, FileText, PlusCircle } from 'lucide-react';
import { formatMMDDYYYY } from '../../utils/date';
import OrderItemSubForm from './OrderItemSubForm'; // Import the new sub-form
import VendorSuggestInput from '../vendors/VendorSuggestInput';

export default function OrderDetailsModal({ open, onClose, order, theme, onSave, onDelete, vendors = [], maxWidth = "max-w-3xl" }) {
  const [form, setForm] = useState({});
  const [attachments, setAttachments] = useState([]);

  const totalCost = useMemo(() => {
    return (form.items || []).reduce((sum, item) => {
        const price = parseFloat(item.price) || 0;
        const quantity = parseInt(item.quantity, 10) || 1;
        return sum + (price * quantity);
    }, 0);
  }, [form.items]);

  useEffect(() => {
    if (open) {
      const initialData = order ? { ...order } : { date: new Date().toISOString() };
      
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

      setForm(initialData);
      setAttachments(initialData.attachments || []);
    }
  }, [open, order]);

  const vendorMap = useMemo(() => vendors.reduce((acc, v) => ({ ...acc, [v.id]: v.name }), {}), [vendors]);
  
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
  const onUpload = async (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const att = { id: Date.now(), name: file.name, type: file.type, dataUrl: reader.result }
      setAttachments(prev => [att, ...prev])
    }
    reader.readAsDataURL(file)
  }

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
          items: [...(prev.items || []), { id: Date.now() }]
      }));
  };

  const removeItem = (index) => {
      setForm(prev => ({
          ...prev,
          items: prev.items.filter((_, i) => i !== index)
      }));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Order${form?.id ? ` #${form.id}` : ''}`}
      theme={theme}
      maxWidth={maxWidth}
      footer={(
        <div className="w-full flex justify-between items-center">
          <div>
            {form?.id && (
              <button onClick={() => onDelete?.(form.id)} className="px-3 py-2 rounded-md text-sm font-semibold bg-red-600 text-white hover:bg-red-700">Delete</button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-2 rounded-md border" style={{ borderColor: theme?.border }}>Cancel</button>
            <button onClick={() => onSave?.({ ...form, attachments })} className="px-3 py-2 rounded-md" style={{ backgroundColor: theme?.primary, color: theme?.white }}>Save</button>
          </div>
        </div>
      )}
    >
      <div className="space-y-4">
        {/* Header card: Vendor & Category */}
        <div className="rounded border p-4 bg-white content-card" style={{ borderColor: theme?.border }}>
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
                  <div className="inline-flex rounded-md bg-gray-100 p-1 shadow-inner">
                    {['domestic','international','group'].map(k => (
                      <button key={k} type="button" onClick={() => setForm(prev => ({ ...prev, category: k }))}
                        className={`px-3 py-1.5 text-sm font-semibold rounded-md ${form.category === k ? 'text-white' : 'text-gray-700 hover:bg-gray-200'}`}
                        style={form.category === k ? { backgroundColor: theme?.primary } : {}}>
                        {k.charAt(0).toUpperCase() + k.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
            </div>
        </div>

        {/* Items card */}
        <div className="rounded border p-4 bg-white content-card" style={{ borderColor: theme?.border }}>
            <h4 className="text-sm font-semibold mb-2" style={{ color: theme?.text }}>Items</h4>
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
              className="mt-3 px-3 py-2 rounded-md text-xs font-semibold border-dashed border-2 flex items-center gap-2 w-full justify-center"
              style={{ borderColor: theme.border, color: theme.text }}
              onClick={addItem}
            >
              <PlusCircle size={14} /> Add Another Item
            </button>
            <div className="flex justify-end items-center pt-2">
                <span className="text-sm font-medium" style={{ color: theme?.text }}>Total Cost:</span>
                <span className="text-lg font-semibold ml-2" style={{ color: theme?.primaryDark }}>
                    ${totalCost.toFixed(2)}
                </span>
            </div>
        </div>

        {/* Status & Dates card */}
        <div className="rounded border p-4 bg-white content-card" style={{ borderColor: theme?.border }}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div className="sm:col-span-3">
              <div className="text-sm font-medium mb-1" style={{ color: theme?.text }}>Status</div>
              <div className="flex w-full rounded-md bg-gray-100 p-1 shadow-inner">
                {[
                  { label: 'Order Placed', value: 'Order Placed' },
                  { label: 'In Transit', value: 'Shipped' },
                  { label: 'Delivered', value: 'Delivered' },
                ].map(opt => (
                  <button key={opt.value} type="button" onClick={() => setForm({ ...form, status: opt.value, shipDate: opt.value==='Shipped' ? (form.shipDate || new Date().toISOString().slice(0,10)) : form.shipDate, deliveryDate: opt.value==='Delivered' ? (form.deliveryDate || new Date().toISOString().slice(0,10)) : form.deliveryDate })}
                    className={`flex-1 text-center px-3 py-1.5 text-sm font-semibold rounded-md ${form.status === opt.value ? 'text-white' : 'text-gray-700 hover:bg-gray-200'}`}
                    style={form.status === opt.value ? { backgroundColor: theme?.primary } : {}}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <TextInput label="Tracking #" value={form.tracking || ''} onChange={v => setForm({ ...form, tracking: v })} placeholder="Optional" theme={theme} />
            <TextInput type="date" label="Date Ordered" value={form.date ? new Date(form.date).toISOString().slice(0,10) : ''} onChange={v => setForm({ ...form, date: v })} theme={theme} />
            <TextInput type="date" label="Delivery Date" value={form.deliveryDate ? new Date(form.deliveryDate).toISOString().slice(0,10) : ''} onChange={v => setForm({ ...form, deliveryDate: v })} theme={theme} />
          </div>
        </div>

        {/* Notes & Attachments card */}
        <div className="rounded border p-4 bg-white content-card" style={{ borderColor: theme?.border }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <TextInput label="Notes" value={form.notes || ''} onChange={v => setForm({ ...form, notes: v })} placeholder="Notes" theme={theme} />
            <div>
                <h4 className="text-sm font-semibold mb-2" style={{ color: theme?.text }}>Attachments</h4>
                <div className="flex items-center gap-2 mb-2">
                    <label className="px-3 py-2 rounded-md text-sm font-semibold cursor-pointer" style={{ backgroundColor: theme?.accent, color: theme?.accentText }}>
                    <Upload className="h-4 w-4 inline mr-1" /> Upload
                    <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => e.target.files && onUpload(e.target.files[0])} />
                    </label>
                </div>
                {attachments.length === 0 ? (
                    <div className="text-xs text-gray-500">No attachments yet.</div>
                ) : (
                    <ul className="space-y-2">
                    {attachments.map(a => (
                        <li key={a.id} className="flex items-center justify-between p-2 rounded border" style={{ borderColor: theme?.border }}>
                        <div className="flex items-center gap-2">
                            <Paperclip className="h-4 w-4" />
                            <span className="text-sm">{a.name}</span>
                        </div>
                        {a.type?.includes('image') ? (
                            <a href={a.dataUrl} target="_blank" rel="noreferrer" className="px-2 py-1 rounded text-xs" style={{ backgroundColor: theme?.white, border: `1px solid ${theme?.border}` }}>View</a>
                        ) : (
                            <a href={a.dataUrl} download={a.name} className="px-2 py-1 rounded text-xs" style={{ backgroundColor: theme?.white, border: `1px solid ${theme?.border}` }}>Download</a>
                        )}
                        </li>
                    ))}
                    </ul>
                )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

// shipping timeline removed


