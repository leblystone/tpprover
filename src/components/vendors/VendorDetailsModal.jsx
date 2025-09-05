import React, { useEffect, useState } from 'react'
import Modal from '../common/Modal'
import TextInput from '../common/inputs/TextInput'
import { formatMMDDYYYY } from '../../utils/date'

const labelOptions = ['Reliable','Bad Test','Fast Shipping','Overfill','Bad Packaging','Broken Vials','Rude Reps','Out of Service','Vetted', 'Puck Problem']

export default function VendorDetailsModal({ open, onClose, theme, vendor, onSave, onDelete }) {
  const [form, setForm] = useState(createEmptyVendor())
  useEffect(() => {
    if (open) {
      const base = vendor ? { ...createEmptyVendor(), ...vendor } : createEmptyVendor()
      // Ensure at least one contact input (default to email)
      if (!Array.isArray(base.contacts) || base.contacts.length === 0) {
        base.contacts = [{ type: 'email', value: '' }]
      }
      setForm(base)
    }
  }, [open, vendor])

  const addContact = () => setForm(prev => ({ ...prev, contacts: [...prev.contacts, { type: 'email', value: '' }] }))
  const updateContact = (idx, key, value) => setForm(prev => ({ ...prev, contacts: prev.contacts.map((c, i) => i === idx ? { ...c, [key]: value } : c) }))
  const removeContact = (idx) => setForm(prev => ({ ...prev, contacts: prev.contacts.filter((_, i) => i !== idx) }))

  return (
    <Modal open={open} onClose={onClose} title={form.name || 'Vendor Details'} theme={theme} maxWidth="max-w-4xl" footer={(
      <div className="w-full flex items-center justify-end gap-2">
        {vendor?.id && (
          <button onClick={() => onDelete?.(vendor.id)} className="px-3 py-2 rounded-md border mr-auto bg-red-600 text-white hover:bg-red-700">Delete</button>
        )}
        <button onClick={onClose} className="px-3 py-2 rounded-md border" style={{ borderColor: theme?.border }}>Cancel</button>
        <button onClick={() => onSave?.(form)} className="px-3 py-2 rounded-md" style={{ backgroundColor: theme?.primary, color: theme?.white }}>Save</button>
      </div>
    )}>
      <div className="space-y-4">
        {/* Header card: Name, Rating, Category */}
        <div className="rounded border p-4 content-card" style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
          <div className="sm:col-span-1"><TextInput label="Name" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="Vendor" theme={theme} /></div>
          <div className="flex flex-col items-start sm:items-start gap-2">
            <div className="text-sm font-medium hidden sm:block" style={{ color: theme.text }}>Rating</div>
            <div className="flex items-center justify-around w-full rounded-md p-1 shadow-inner border" style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }} aria-label="Rating">
              {[1,2,3,4,5].map(n => (
                <button key={n} type="button" className="p-2" onClick={() => setForm(prev => ({ ...prev, rating: n }))}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={form.rating >= n ? theme.primary : 'none'} stroke={form.rating >= n ? theme.primary : theme.border} className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.972 20.539a.562.562 0 01-.84-.61l1.285-5.385a.563.563 0 00-.182-.557L3.031 10.385a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/></svg>
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-start sm:items-start gap-2">
            <div className="text-sm font-medium hidden sm:block" style={{ color: theme.text }}>Category</div>
            <div className="flex w-full rounded-md p-1 shadow-inner" style={{ backgroundColor: theme.cardBackground }}>
              {['domestic','international','group'].map(k => (
                <button key={k} type="button" onClick={() => setForm(prev => ({ ...prev, type: k }))}
                  className={`flex-1 text-center px-2 py-1.5 text-xs font-semibold rounded-md ${form.type === k ? '' : 'hover:opacity-80'}`}
                  style={{ backgroundColor: form.type === k ? theme?.primary : 'transparent', color: form.type === k ? theme.textOnPrimary : theme.text }}>
                  {k.charAt(0).toUpperCase() + k.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
        </div>

        {/* Contacts card */}
        <div className="rounded border p-4 content-card" style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}>
          <div className="font-semibold mb-2" style={{ color: theme.text }}>Contacts</div>
          <div className="space-y-3">
            {form.contacts.map((c, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-3 items-center">
                <select className="col-span-3 p-2 rounded border" value={c.type} onChange={e => updateContact(idx, 'type', e.target.value)} style={{ borderColor: theme.border, backgroundColor: theme.cardBackground, color: theme.text }}>
                  <option value="name">Name</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="discord">Discord</option>
                  <option value="telegram">Telegram</option>
                  <option value="facebook">Facebook</option>
                  <option value="website">Website</option>
                  <option value="other">Other</option>
                </select>
                <input
                  className="col-span-8 p-2 rounded border"
                  value={c.value}
                  onChange={e => updateContact(idx, 'value', e.target.value)}
                  placeholder={getContactPlaceholder(c.type)}
                  style={{ borderColor: theme.border, backgroundColor: theme.cardBackground, color: theme.text }}
                />
                <button className="col-span-1 p-2 rounded hover:bg-gray-100" style={{ color: theme.text }} onClick={() => removeContact(idx)}>✕</button>
              </div>
            ))}
            <button className="px-3 py-2 rounded-md text-sm font-semibold border-dashed border" style={{ borderColor: theme.primary, color: theme.primary }} onClick={addContact}>+ Add Contact</button>
          </div>
        </div>

        {/* Payment card */}

        <div className="rounded border p-4 content-card grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}>
          <label className="block text-sm font-medium" style={{ color: theme.text }}>Payment Methods
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              {['Card','Zelle','Crypto','PayPal','Wire', 'Venmo', 'CashApp', 'AliPay'].map(p => (
                <label key={p} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!form.payments[p.toLowerCase()]} onChange={e => setForm(prev => ({ ...prev, payments: { ...prev.payments, [p.toLowerCase()]: e.target.checked } }))} className="h-4 w-4 rounded" style={{ accentColor: theme?.primary }} />
                  <span>{p}</span>
                </label>
              ))}
            </div>
          </label>
          <TextInput label="Payment Notes" value={form.payments.notes} onChange={v => setForm(prev => ({ ...prev, payments: { ...prev.payments, notes: v } }))} placeholder="Preferences / fees / tips" theme={theme} />
        </div>

        {/* Labels + Notes card */}
        <div className="rounded border p-4 content-card grid grid-cols-1 sm:grid-cols-2 gap-4 items-start" style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}>
          <label className="block text-sm font-medium" style={{ color: theme.text }}>Labels
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              {labelOptions.map(l => (
                <label key={l} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={Array.isArray(form.labels) && form.labels.includes(l)} onChange={e => setForm(prev => ({ ...prev, labels: e.target.checked ? Array.from(new Set([...(prev.labels||[]), l])) : (prev.labels||[]).filter(x => x !== l) }))} className="h-4 w-4 rounded" style={{ accentColor: theme?.primary }} />
                  <span>{l}</span>
                </label>
              ))}
            </div>
          </label>
          <label className="block text-sm font-medium" style={{ color: theme.text }}>Notes
            <textarea className="w-full p-3 rounded-lg border text-sm" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Vendor notes" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground, color: theme.text }} />
          </label>
        </div>

        {/* Order history card */}
        <div className="rounded border p-4 content-card" style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}>
          <div className="font-semibold mb-2" style={{ color: theme.text }}>Order History</div>
          <VendorOrderHistory vendorName={form.name} theme={theme} />
        </div>
      </div>
    </Modal>
  )
}

// Also export a named version for flexibility in import styles
export { VendorDetailsModal }

function NameSuggestions({ anchorValue, onPick, theme }) {
  let vendors = []
  try { vendors = JSON.parse(localStorage.getItem('tpprover_vendors') || '[]') } catch {}
  const base = Array.from(new Set(vendors))
  const q = (anchorValue || '').toLowerCase()
  const list = q ? base.filter(v => v.toLowerCase().includes(q)).slice(0, 6) : []
  if (list.length === 0) return null
  return (
    <div className="absolute z-10 mt-1 w-full bg-white rounded-md border shadow" style={{ borderColor: theme?.border }}>
      {list.map(v => (
        <button key={v} type="button" className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => onPick?.(v)}>
          {v}
        </button>
      ))}
    </div>
  )
}

function getContactPlaceholder(type) {
  switch ((type || '').toLowerCase()) {
    case 'name': return 'John Doe'
    case 'email': return 'name@example.com'
    case 'phone': return '(555) 555-5555'
    case 'whatsapp': return '+1 555 555 5555 or wa.me/...' 
    case 'telegram': return '@handle'
    case 'discord': return 'user#1234'
    case 'website': return 'https://example.com'
    case 'facebook': return 'facebook.com/username'
    case 'other': return 'value'
    default: return 'value'
  }
}

function createEmptyVendor() {
  return {
    id: Date.now(),
    name: '',
    type: 'domestic',
    contacts: [],
    payments: { notes: '' },
    platforms: { website: '', telegram: '', reddit: '', discord: '' },
    reliability: 'Unknown',
    notes: '',
    isAutoCreated: false,
    needsCompletion: false,
    createdAt: new Date().toISOString(),
  }
}

function VendorOrderHistory({ vendorName, theme }) {
  let orders = []
  try { orders = JSON.parse(localStorage.getItem('tpprover_orders') || '[]') } catch {}
  const history = orders.filter(o => (o.vendor || '').toLowerCase() === (vendorName || '').toLowerCase())
  if (history.length === 0) return <div className="text-sm text-gray-500">No orders for this vendor yet.</div>
  return (
    <div className="rounded border" style={{ borderColor: theme.border }}>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs text-gray-500">
            <th className="py-2 px-2">Date</th>
            <th className="py-2 px-2">Peptide</th>
            <th className="py-2 px-2">mg</th>
            <th className="py-2 px-2">Status</th>
            <th className="py-2 px-2">Cost</th>
          </tr>
        </thead>
        <tbody>
          {history.map(h => (
            <tr key={h.id} className="border-t" style={{ borderColor: theme.border }}>
              <td className="py-2 px-2">{formatMMDDYYYY(h.date)}</td>
              <td className="py-2 px-2">{h.peptide}</td>
              <td className="py-2 px-2">{h.mg}</td>
              <td className="py-2 px-2">{h.status}</td>
              <td className="py-2 px-2">{h.cost || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}


