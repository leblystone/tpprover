import React, { useEffect, useState } from 'react'
import { Lock } from 'lucide-react'
import Modal from '../common/Modal'
import TextInput from '../common/inputs/TextInput'
import { formatMMDDYYYY } from '../../utils/date'
import useAutoSave from '../../utils/useAutoSave'
import AutoSaveIndicator from '../common/AutoSaveIndicator'

const labelOptions = ['Reliable','Vetted','Fast Shipping','Overfill','GLP1','Aminos','Oils','Pricey','Untested','Slow Shipping','Bad Test','Bad Packaging','Broken Vials','Rude Reps','Out of Service','Puck Problem']

export default function VendorDetailsModal({ open, onClose, theme, vendor, onSave, onAutoSave, onDelete, onForceDelete, activeTab, isReadOnly = false, onUpgrade }) {
  const [form, setForm] = useState(createEmptyVendor())
  
  // Auto-save functionality with vendor persistence
  const { isSaving, lastSaved, clearSavedData, markAsSubmitted } = useAutoSave(
    `vendor_form_${vendor?.id || 'new'}`,
    form,
    setForm,
    2000, // 2 second delay
    async (formData) => {
      // Auto-save to vendors list if there's meaningful data
      const hasName = formData?.name && formData.name.trim().length > 0;
      const hasContacts = formData?.contacts?.some(c => c.value && c.value.trim().length > 0);
      const hasNotes = formData?.notes && formData.notes.trim().length > 0;
      
      if (formData && (hasName || hasContacts || hasNotes)) {
        try {
          if (vendor?.id) {
            console.log('🔄 Auto-saving existing vendor:', vendor.id);
          } else {
            console.log('🔄 Auto-saving new vendor draft');
          }
          // Use onAutoSave if provided, otherwise fall back to onSave
          await (onAutoSave || onSave)?.(formData);
        } catch (error) {
          console.warn('Auto-save to vendors failed:', error);
        }
      } else {
        console.log('🚫 Skipping autosave - insufficient data:', {
          hasName,
          hasContacts,
          hasNotes
        });
      }
    }
  );
  
  useEffect(() => {
    if (open) {
      const base = vendor ? { ...createEmptyVendor(), ...vendor } : createEmptyVendor()
      // Set default category for new vendors from the active tab
      if (!vendor?.id) {
          base.type = activeTab || 'domestic';
      }
      // Ensure at least one contact input (default to email)
      if (!Array.isArray(base.contacts) || base.contacts.length === 0) {
        base.contacts = [{ type: 'email', value: '' }]
      }
      // Fix: Ensure rating is a number and labels is an array
      if (typeof base.rating !== 'number') {
        base.rating = 0;
      }
      if (!Array.isArray(base.labels)) {
        base.labels = [];
      }
      if (!base.payments || typeof base.payments !== 'object') {
        base.payments = { notes: '' };
      }
      setForm(base)
    }
  }, [open, vendor, activeTab])

  const addContact = () => setForm(prev => ({ ...prev, contacts: [...prev.contacts, { type: 'email', value: '' }] }))
  const updateContact = (idx, key, value) => setForm(prev => ({ ...prev, contacts: prev.contacts.map((c, i) => i === idx ? { ...c, [key]: value } : c) }))
  const removeContact = (idx) => setForm(prev => ({ ...prev, contacts: prev.contacts.filter((_, i) => i !== idx) }))

  // Close handler - autosave handles data persistence, so no confirmation needed
  const handleClose = () => {
    onClose();
  };

  return (
    <Modal 
      open={open} 
      onClose={handleClose} 
      title={form.name || 'Vendor Details'} 
      titleExtra={
        <div className="flex items-center gap-2">
          <AutoSaveIndicator 
            isSaving={isSaving}
            lastSaved={lastSaved}
            theme={theme}
            compact={true}
            iconOnly={true}
          />
        </div>
      }
      theme={theme} 
      variant="modern"
      maxWidth="max-w-4xl" 
      footer={(
      <div className="w-full flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {(vendor?.id || form?.id) && (
            <button 
              onClick={() => {
                const targetId = form?.id || vendor?.id;
                console.log('🗑️ Modal delete clicked - vendor.id:', vendor?.id, 'form.id:', form?.id, 'using:', targetId);
                // Try normal delete first, fall back to force delete if it fails
                const vendorToDelete = { ...form, id: targetId };
                onDelete?.(targetId);
                // If delete fails (vendor not found), automatically try force delete
                setTimeout(() => {
                  const stillExists = JSON.parse(localStorage.getItem('tpprover_vendors') || '[]')
                    .some(v => String(v.id) === String(targetId) || (v.name && form?.name && v.name.trim().toLowerCase() === form.name.trim().toLowerCase()));
                  if (stillExists && onForceDelete) {
                    console.warn('⚠️ Normal delete failed, attempting force delete');
                    onForceDelete(vendorToDelete);
                  }
                }, 100);
              }} 
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
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              const vendorData = { ...form, id: form?.id || vendor?.id };
              console.log('💾 Save button clicked:', vendorData);
              onSave?.(vendorData);
            }}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg active:scale-95"
            style={{ 
              background: `linear-gradient(135deg, ${theme?.primary} 0%, ${theme?.primaryDark || theme?.primary} 100%)`,
              color: theme?.textOnPrimary || '#ffffff',
              border: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = theme.isDark ? '0 10px 25px rgba(0, 0, 0, 0.5)' : '0 10px 25px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = theme.isDark ? '0 4px 6px rgba(0, 0, 0, 0.3)' : '0 4px 6px rgba(0, 0, 0, 0.1)';
            }}
          >
            Save Changes
          </button>
        </div>
      </div>
    )}    >
      <div className="relative space-y-4">
        {/* VENDOR INFO Section Header */}
        <div className="px-4 py-2.5 rounded-lg" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, borderLeft: `4px solid ${theme.primary}` }}>
          <h4 className="font-black text-sm tracking-wide uppercase" style={{ color: theme.isDark ? '#a8b5a0' : theme.primary }}>VENDOR INFO</h4>
        </div>

        {/* Section: Name, Rating, Category */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
          <div className="sm:col-span-1"><TextInput label="Name" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="Vendor" theme={theme} /></div>
          <div className="flex flex-col items-start sm:items-start gap-2">
            <div className="text-sm font-medium hidden sm:block" style={{ color: theme.text }}>Rating</div>
            <div className="flex items-center justify-around w-full rounded-md p-1" style={{ 
              backgroundColor: theme.isDark ? '#1f2937' : theme.cardBackground,
              border: theme.isDark ? 'none' : `1px solid ${theme.border}`,
              boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 2px 4px rgba(0,0,0,0.06)'
            }} aria-label="Rating">
              {[1,2,3,4,5].map(n => (
                <button key={n} type="button" className="p-2" onClick={() => setForm(prev => ({ ...prev, rating: n }))}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={form.rating >= n ? theme.primary : 'none'} stroke={form.rating >= n ? theme.primary : (theme.isDark ? '#4b5563' : theme.border)} className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.972 20.539a.562.562 0 01-.84-.61l1.285-5.385a.563.563 0 00-.182-.557L3.031 10.385a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/></svg>
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-start sm:items-start gap-2">
            <div className="text-sm font-medium hidden sm:block" style={{ color: theme.text }}>Category</div>
            <div className="flex w-full rounded-md p-1" style={{ 
              backgroundColor: theme.isDark ? '#1f2937' : theme.cardBackground,
              boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 2px 4px rgba(0,0,0,0.06)'
            }}>
              {['domestic','international','groupbuy'].map(k => (
                <button 
                  key={k} 
                  type="button" 
                  onClick={() => setForm(prev => ({ ...prev, type: k }))}
                  className="flex-1 text-center px-2 py-1.5 text-xs font-semibold rounded-md transition-all"
                  style={{ 
                    backgroundColor: form.type === k ? theme?.primary : 'transparent', 
                    color: form.type === k ? theme.textOnPrimary : theme.text 
                  }}
                  onMouseEnter={(e) => {
                    if (form.type !== k) {
                      e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : '#e5e7eb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (form.type !== k) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {k === 'groupbuy' ? 'Group Buy' : k.charAt(0).toUpperCase() + k.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CONTACT INFO Section Header */}
        <div className="px-4 py-2.5 rounded-lg" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, borderLeft: `4px solid ${theme.primary}` }}>
          <h4 className="font-black text-sm tracking-wide uppercase" style={{ color: theme.isDark ? '#a8b5a0' : theme.primary }}>CONTACT INFO</h4>
        </div>

        {/* Section: Contacts */}
        <div>
          <div className="space-y-3">
            {form.contacts.map((c, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="flex-1">
                  <div 
                    className="flex items-stretch rounded-lg overflow-hidden"
                    style={{ 
                      border: theme.isDark ? 'none' : `1px solid ${theme.border}`,
                      boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.05)'
                    }}
                  >
                    <input 
                      type="text"
                      value={c.value} 
                      onChange={e => updateContact(idx, 'value', e.target.value)} 
                      placeholder={getContactPlaceholder(c.type)}
                      className="flex-1 px-3 py-2 outline-none min-w-0"
                      style={{
                        backgroundColor: theme.isDark ? '#1f2937' : (theme.inputBackground || '#fff'),
                        color: theme.text
                      }}
                    />
                    <div 
                      className="flex items-center gap-0.5 px-1 py-1 flex-shrink-0"
                      style={{ 
                        borderLeft: theme.isDark ? '1px solid #4b5563' : `1px solid ${theme.border}`,
                        backgroundColor: theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb')
                      }}
                    >
                      <select 
                        value={c.type} 
                        onChange={e => updateContact(idx, 'type', e.target.value)} 
                        className="px-2 py-1 text-xs font-semibold rounded-md transition-all border-none outline-none cursor-pointer"
                        style={{ 
                          backgroundColor: theme.primary,
                          color: '#ffffff'
                        }}
                      >
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
                    </div>
                  </div>
                </div>
                <button 
                  className="p-2 rounded hover:bg-gray-100 flex-shrink-0" 
                  style={{ color: theme.text }} 
                  onClick={() => removeContact(idx)}
                >
                  ✕
                </button>
              </div>
            ))}
            <button 
              className="px-3 py-2 rounded-md text-sm font-semibold transition-all" 
              style={{ 
                backgroundColor: theme.isDark ? '#1f2937' : theme.secondary,
                color: theme.primary 
              }} 
              onClick={addContact}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : theme.primary + '15';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.isDark ? '#1f2937' : theme.secondary;
              }}
            >
              + Add Contact
            </button>
          </div>
        </div>

        {/* PAYMENT INFO Section Header */}
        <div className="px-4 py-2.5 rounded-lg" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, borderLeft: `4px solid ${theme.primary}` }}>
          <h4 className="font-black text-sm tracking-wide uppercase" style={{ color: theme.isDark ? '#a8b5a0' : theme.primary }}>PAYMENT INFO</h4>
        </div>

        {/* Section: Payment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        {/* ADDITIONAL INFO Section Header */}
        <div className="px-4 py-2.5 rounded-lg" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, borderLeft: `4px solid ${theme.primary}` }}>
          <h4 className="font-black text-sm tracking-wide uppercase" style={{ color: theme.isDark ? '#a8b5a0' : theme.primary }}>ADDITIONAL INFO</h4>
        </div>

        {/* Section: Labels + Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
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
            <textarea 
              className="w-full p-3 rounded-lg text-sm transition-all focus:outline-none resize-none" 
              value={form.notes} 
              onChange={e => setForm({ ...form, notes: e.target.value })} 
              placeholder="Vendor notes" 
              rows={4}
              style={{ 
                border: theme.isDark ? 'none' : `1px solid ${theme.border}`,
                backgroundColor: theme.isDark ? '#1f2937' : theme.cardBackground, 
                color: theme.text,
                boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.05)'
              }} 
            />
          </label>
        </div>

        {/* ORDER HISTORY Section Header - Only show for existing vendors */}
        {vendor && (
          <>
            <div className="px-4 py-2.5 rounded-lg" style={{ backgroundColor: theme.secondary, borderLeft: `4px solid ${theme.primary}` }}>
              <h4 className="font-black text-sm tracking-wide uppercase" style={{ color: theme.primary }}>ORDER HISTORY</h4>
            </div>

            {/* Section: Order History */}
            <div>
              <VendorOrderHistory vendorName={form.name} theme={theme} />
            </div>
          </>
        )}
      </div>
      
      {/* Lockout Overlay - Covers entire modal */}
      {isReadOnly && (
        <div className="absolute inset-0 backdrop-blur-md bg-white/60 flex items-center justify-center z-50 rounded-lg">
          <div className="text-center p-6 max-w-md">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: `${theme.primary}20` }}>
              <Lock size={32} style={{ color: theme.primary }} />
            </div>
            <h3 className="text-xl font-bold mb-2" style={{ color: theme.primaryDark }}>
              Trial has ended
            </h3>
            <p className="text-sm mb-4" style={{ color: theme.text }}>
              Upgrade to continue adding and managing vendors
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
    case 'other': return 'Enter contact information'
    default: return 'Enter contact information'
  }
}

function createEmptyVendor() {
  return {
    id: Date.now(),
    name: '',
    type: 'domestic',
    rating: 0, // Fix: Add missing rating field
    contacts: [],
    payments: { notes: '' },
    platforms: { website: '', telegram: '', reddit: '', discord: '' },
    reliability: 'Unknown',
    notes: '',
    labels: [], // Fix: Add missing labels field
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


