 import React, { useEffect, useMemo, useState } from 'react'
 import Modal from '../common/Modal'
 import TextInput from '../common/inputs/TextInput'
import { CheckCircle, Clock, Truck, Paperclip, Upload, FileText } from 'lucide-react'
 import { formatMMDDYYYY } from '../../utils/date'

const defaultVendors = ['Acme Research', 'BioLabs', 'PeptideHouse']

export default function OrderDetailsModal({ open, onClose, order, theme, onSave, onDelete, vendorList = [] }) {
  const [form, setForm] = useState(order || {})
  useEffect(() => { setForm(order || {}) }, [order])
  const [attachments, setAttachments] = useState([])
  useEffect(() => { setAttachments(order?.attachments || []) }, [order])

  const [vendorQuery, setVendorQuery] = useState('')
  const [showVendorSuggest, setShowVendorSuggest] = useState(false)
  useEffect(() => { setVendorQuery(order?.vendor || '') }, [order])

  const vendorSuggestions = useMemo(() => {
    const q = (vendorQuery || '').toLowerCase()
    if (!q) return []
    const base = Array.from(new Set([...(form?.vendor ? [form.vendor] : []), ...defaultVendors, ...vendorList]))
    return base.filter(v => v.toLowerCase().includes(q)).slice(0, 5)
  }, [vendorQuery, form?.vendor, vendorList])

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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Order${form?.id ? ` #${form.id}` : ''}`}
      theme={theme}
      footer={(
        <div className="flex items-center gap-2">
          {form?.id && (
            <button onClick={() => onDelete?.(form)} className="px-3 py-2 rounded-md border" style={{ borderColor: theme?.border, color: '#b91c1c' }}>Delete</button>
          )}
          <button onClick={onClose} className="px-3 py-2 rounded-md border" style={{ borderColor: theme?.border }}>Cancel</button>
          <button onClick={() => onSave?.({ ...form, attachments })} className="px-3 py-2 rounded-md" style={{ backgroundColor: theme?.primary, color: theme?.white }}>Save</button>
        </div>
      )}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <TextInput
              label="Vendor"
              value={form.vendor || ''}
              onChange={v => { setForm({ ...form, vendor: v }); setVendorQuery(v); setShowVendorSuggest(true) }}
              placeholder="Vendor"
              theme={theme}
              onFocus={() => setShowVendorSuggest(true)}
              onBlur={() => setTimeout(() => setShowVendorSuggest(false), 120)}
            />
            {showVendorSuggest && vendorSuggestions.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white rounded-md border shadow" style={{ borderColor: theme?.border }}>
                {vendorSuggestions.map(v => (
                  <button key={v} type="button" className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => { setForm({ ...form, vendor: v }); setVendorQuery(v); setShowVendorSuggest(false) }}>
                    {v}
                  </button>
                ))}
              </div>
            )}
          </div>
          <TextInput label="Peptide" value={form.peptide || ''} onChange={v => setForm({ ...form, peptide: v })} placeholder="Peptide" theme={theme} />
          <TextInput label="mg" value={form.mg || ''} onChange={v => setForm({ ...form, mg: v })} placeholder="10" theme={theme} />
          <TextInput label="Cost ($)" value={form.cost || ''} onChange={v => setForm({ ...form, cost: v })} placeholder="$" theme={theme} />
          <TextInput label="Quantity" value={form.quantity || ''} onChange={v => setForm({ ...form, quantity: v })} placeholder="1" theme={theme} />
          <label className="block">
            <span className="block text-sm font-medium mb-1" style={{ color: theme?.text }}>Unit</span>
            <div className="inline-flex rounded-full bg-gray-100 p-1 shadow-inner">
              {['vial','kit'].map(k => (
                <button key={k} type="button" onClick={() => setForm(prev => ({ ...prev, unit: k }))}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full ${((form.unit || 'vial') === k) ? 'text-white' : 'text-gray-700 hover:bg-gray-200'}`}
                  style={((form.unit || 'vial') === k) ? { backgroundColor: theme?.primary } : {}}>
                  {k.charAt(0).toUpperCase() + k.slice(1)}
                </button>
              ))}
            </div>
          </label>
          <TextInput label="Tracking #" value={form.tracking || ''} onChange={v => setForm({ ...form, tracking: v })} placeholder="Optional" theme={theme} />
          <div>
            <div className="text-sm font-medium mb-1" style={{ color: theme?.text }}>Status</div>
            <div className="inline-flex rounded-full bg-gray-100 p-1 shadow-inner">
              {[
                { label: 'Order Placed', value: 'Order Placed' },
                { label: 'In Transit', value: 'Shipped' },
                { label: 'Delivered', value: 'Delivered' },
              ].map(opt => (
                <button key={opt.value} type="button" onClick={() => setForm({ ...form, status: opt.value, shipDate: opt.value==='Shipped' ? (form.shipDate || new Date().toISOString().slice(0,10)) : form.shipDate, deliveryDate: opt.value==='Delivered' ? (form.deliveryDate || new Date().toISOString().slice(0,10)) : form.deliveryDate })}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full ${form.status === opt.value ? 'text-white' : 'text-gray-700 hover:bg-gray-200'}`}
                  style={form.status === opt.value ? { backgroundColor: theme?.primary } : {}}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <TextInput label="Date Ordered" value={form.date || ''} onChange={v => setForm({ ...form, date: v })} placeholder="YYYY-MM-DD" theme={theme} />
          <TextInput label="Delivery Date" value={form.deliveryDate || ''} onChange={v => setForm({ ...form, deliveryDate: v })} placeholder="YYYY-MM-DD" theme={theme} />
          <TextInput label="Notes" value={form.notes || ''} onChange={v => setForm({ ...form, notes: v })} placeholder="Notes" theme={theme} />
          <div>
            <div className="text-sm font-medium mb-1" style={{ color: theme?.text }}>Category</div>
            <div className="inline-flex rounded-full bg-gray-100 p-1 shadow-inner">
              {['domestic','international','group'].map(k => (
                <button key={k} type="button" onClick={() => setForm(prev => ({ ...prev, category: k }))}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full ${form.category === k ? 'text-white' : 'text-gray-700 hover:bg-gray-200'}`}
                  style={form.category === k ? { backgroundColor: theme?.primary } : {}}>
                  {k.charAt(0).toUpperCase() + k.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* quick actions removed; status pills handle state */}

        {/* Shipping timeline removed per request */}

        <div className="mt-4">
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
        {/* moved Category next to Notes */}
      </div>
    </Modal>
  )
}

// shipping timeline removed


