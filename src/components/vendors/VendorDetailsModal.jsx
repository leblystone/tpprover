import React, { useEffect, useState } from 'react'
import { Lock, Building2, Phone, CreditCard, FileText, History, X, Wallet, Coins, DollarSign, Smartphone, Banknote, CheckCircle, BadgeCheck, Truck, PackagePlus, Beaker, Pill, Droplet, TrendingUp, AlertCircle, Clock, PackageX, AlertTriangle, UserX, Ban, Ship, Amphora, Turtle, Rabbit, CircleGauge, EggOff } from 'lucide-react'
import { SiZelle, SiCashapp, SiVenmo } from 'react-icons/si'

// Venmo icon wrapper - passes through size directly
const VenmoIcon = ({ size = 18, style, className }) => {
    return <SiVenmo size={size} style={style} className={className} />;
}
import { FaPaypal, FaAlipay } from 'react-icons/fa6'
import Modal from '../common/Modal'

import TextInput from '../common/inputs/TextInput'
import { formatMMDDYYYY } from '../../utils/date'
import useAutoSave from '../../utils/useAutoSave'
import AutoSaveIndicator from '../common/AutoSaveIndicator'

const labelOptions = ['Reliable','Vetted','Fast Shipping','Overfill','GLP1','Aminos','Oils','Pricey','Reshipper','Slow Shipping','Bad Test','Bad Packaging','Broken Vials','Rude Reps','Out of Service','Puck Problem']

const getLabelIcon = (label) => {
  const labelLower = label.toLowerCase()
  switch (labelLower) {
    case 'reliable': return CheckCircle
    case 'vetted': return BadgeCheck
    case 'fast shipping': return Rabbit
    case 'overfill': return PackagePlus
    case 'glp1': return Beaker
    case 'aminos': return Pill
    case 'oils': return Amphora
    case 'pricey': return TrendingUp
    case 'reshipper': return Ship
    case 'slow shipping': return Turtle
    case 'bad test': return EggOff
    case 'bad packaging': return PackageX
    case 'broken vials': return AlertTriangle
    case 'rude reps': return UserX
    case 'out of service': return Ban
    case 'puck problem': return CircleGauge
    default: return FileText
  }
}

export default function VendorDetailsModal({ open, onClose, theme, vendor, onSave, onDelete, onForceDelete, activeTab, isReadOnly = false, onUpgrade }) {
  const [form, setForm] = useState(createEmptyVendor())
  const [contactFocused, setContactFocused] = useState({})
  const [isNotesFocused, setIsNotesFocused] = useState(false)
  const [openDropdowns, setOpenDropdowns] = useState({})
  
  // Auto-save functionality with vendor persistence
  const { isSaving, lastSaved, clearSavedData, markAsSubmitted } = useAutoSave(
    `vendor_form_${vendor?.id || 'new'}`,
    form,
    setForm,
    2000, // 2 second delay
    async () => {
      // Drafts are kept locally; vendors are only persisted on explicit save.
    }
  );
  
  useEffect(() => {
    if (open) {
      const base = vendor ? { ...createEmptyVendor(), ...vendor } : createEmptyVendor()
      // For new vendors, default type to activeTab. For existing vendors, preserve their type.
      if (!vendor || !vendor.id) {
        // New vendor: use activeTab as default type
        base.type = activeTab || 'domestic';
      } else {
        // Existing vendor: preserve type, but default to activeTab if not set
        if (!base.type) {
          base.type = activeTab || 'domestic';
        }
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

  // Close dropdowns when clicking outside (supports both mouse and touch)
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside any dropdown
      const isClickInside = event.target.closest('[data-dropdown-container]')
      if (!isClickInside && Object.keys(openDropdowns).some(idx => openDropdowns[idx])) {
        setOpenDropdowns({})
      }
    }
    if (Object.keys(openDropdowns).some(idx => openDropdowns[idx])) {
      // Support both mouse and touch events for mobile compatibility
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('touchstart', handleClickOutside)
      }
    }
  }, [openDropdowns])

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
      title={form.name || 'New Vendor'} 
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
                // Try normal delete first, fall back silently if it fails
                const vendorToDelete = { ...form, id: targetId };
                onDelete?.(targetId);
                // If delete fails (vendor not found), silently try fallback delete
                setTimeout(() => {
                  const stillExists = JSON.parse(localStorage.getItem('tpprover_vendors') || '[]')
                    .some(v => String(v.id) === String(targetId) || (v.name && form?.name && v.name.trim().toLowerCase() === form.name.trim().toLowerCase()));
                  if (stillExists && onForceDelete) {
                    // Silent fallback - users should never know this happened
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
        <div className="px-4 py-2.5 rounded-lg flex items-center justify-between mb-2" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, borderLeft: '4px solid #e0ded7' }}>
          <h4 className="font-bold text-sm tracking-wider uppercase" style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76', letterSpacing: '0.1em' }}>VENDOR INFO</h4>
          <Building2 size={20} style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76' }} />
        </div>

        {/* Section: Name, Rating, Category */}
        <div className="space-y-3">
          {/* Name and Rating row - 1:1 on desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
            <div>
              <TextInput 
                label="Name" 
                value={form.name} 
                onChange={v => setForm({ ...form, name: v })} 
                placeholder="e.g., Pharm..." 
                theme={theme}
                outlined={true}
                customTextColor={theme.isDark ? null : "#181A18"}
                customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
              />
            </div>
            <div className="flex flex-col gap-2">
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
          </div>
          
          {/* Category on its own row */}
          <div>
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
        <div className="px-4 py-2.5 rounded-lg flex items-center justify-between mb-2" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, borderLeft: '4px solid #e0ded7' }}>
          <h4 className="font-bold text-sm tracking-wider uppercase" style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76', letterSpacing: '0.1em' }}>CONTACT INFO</h4>
          <Phone size={20} style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76' }} />
        </div>

        {/* Section: Contacts */}
        <div>
          <div className="space-y-3">
            {form.contacts.map((c, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <div 
                    className="flex items-stretch rounded-lg"
                    style={{ 
                      border: `1px solid #f0eee7`,
                      boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)',
                      backgroundColor: theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')
                    }}
                  >
                    <input 
                      type="text"
                      id={`contact-input-${idx}`}
                      value={c.value || ''} 
                      onChange={e => updateContact(idx, 'value', e.target.value)} 
                      onFocus={() => setContactFocused(prev => ({ ...prev, [idx]: true }))}
                      onBlur={(e) => {
                        // Delay blur to allow dropdown clicks to register on mobile
                        setTimeout(() => {
                          // Only blur if dropdown is closed or if focus moved outside the dropdown container
                          const relatedTarget = e.relatedTarget || document.activeElement
                          const isClickingDropdown = relatedTarget?.closest('[data-dropdown-container]')
                          if (!isClickingDropdown && !openDropdowns[idx]) {
                            setContactFocused(prev => ({ ...prev, [idx]: false }))
                          }
                        }, 150)
                      }}
                      placeholder={!contactFocused[idx] && !c.value ? getContactPlaceholder(c.type) : ' '}
                      className="flex-1 py-3 outline-none min-w-0 rounded-l-lg"
                      style={{
                        backgroundColor: 'transparent',
                        color: theme.isDark ? theme.text : '#181A18',
                        border: 'none',
                        paddingLeft: '12px',
                        paddingRight: '8px'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setOpenDropdowns(prev => ({ ...prev, [idx]: !prev[idx] }))}
                      onMouseDown={(e) => {
                        // Prevent input blur when clicking dropdown button
                        e.preventDefault()
                      }}
                      onTouchStart={(e) => {
                        // Prevent input blur on touch devices
                        e.preventDefault()
                      }}
                      className="flex items-center justify-between gap-3 px-4 py-3 flex-shrink-0 rounded-r-lg relative cursor-pointer transition-all border-none outline-none"
                      data-dropdown-container
                      style={{ 
                        borderLeft: theme.isDark ? '1px solid #4b5563' : `1px solid #f0eee7`,
                        backgroundColor: theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb'),
                        color: theme.isDark ? theme.text : '#181A18',
                        minWidth: '130px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme.isDark ? '#4b5563' : '#f3f4f6';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb');
                      }}
                    >
                      <span className="text-sm font-semibold">{getContactLabel(c.type)}</span>
                      <svg width="14" height="14" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    {openDropdowns[idx] && (
                      <div className="relative" data-dropdown-container>
                        <div 
                          className="absolute top-full right-0 mt-1 z-50 rounded-lg shadow-lg border overflow-hidden"
                          style={{
                            backgroundColor: theme.isDark ? '#1f2937' : '#ffffff',
                            borderColor: theme.border,
                            minWidth: '180px',
                            boxShadow: theme.isDark ? '0 4px 6px rgba(0,0,0,0.3)' : '0 4px 6px rgba(0,0,0,0.1)'
                          }}
                        >
                            {[
                              { value: 'name', label: 'Name' },
                              { value: 'email', label: 'Email' },
                              { value: 'phone', label: 'Phone' },
                              { value: 'whatsapp', label: 'WhatsApp' },
                              { value: 'discord', label: 'Discord' },
                              { value: 'telegram', label: 'Telegram' },
                              { value: 'facebook', label: 'Facebook' },
                              { value: 'website', label: 'Website' },
                              { value: 'other', label: 'Other' }
                            ].map((option, optIdx) => (
                              <React.Fragment key={option.value}>
                                {optIdx > 0 && (
                                  <div 
                                    className="h-px mx-2"
                                    style={{ backgroundColor: theme.border }}
                                  />
                                )}
                                <button
                                  type="button"
                                  onMouseDown={(e) => {
                                    // Prevent input blur when clicking dropdown option
                                    e.preventDefault()
                                  }}
                                  onTouchStart={(e) => {
                                    // Prevent input blur on touch devices
                                    e.preventDefault()
                                  }}
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    updateContact(idx, 'type', option.value);
                                    setOpenDropdowns(prev => ({ ...prev, [idx]: false }));
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm transition-all touch-manipulation"
                                  style={{
                                    color: c.type === option.value ? theme.primary : theme.text,
                                    backgroundColor: 'transparent',
                                    WebkitTapHighlightColor: 'transparent'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = theme.primaryLight || `${theme.primary}20`;
                                    e.currentTarget.style.color = theme.primary;
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.color = c.type === option.value ? theme.primary : theme.text;
                                  }}
                                >
                                  {option.label}
                                </button>
                              </React.Fragment>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <label 
                    htmlFor={`contact-input-${idx}`}
                    className="absolute pointer-events-none transition-all"
                    style={{
                      fontSize: (contactFocused[idx] || (c.value && String(c.value).trim())) ? '0.65rem' : '0.875rem',
                      top: (contactFocused[idx] || (c.value && String(c.value).trim())) ? '-8px' : '14px',
                      left: (contactFocused[idx] || (c.value && String(c.value).trim())) ? '12px' : '16px',
                      padding: (contactFocused[idx] || (c.value && String(c.value).trim())) ? '0 4px' : '0',
                      background: (contactFocused[idx] || (c.value && String(c.value).trim())) ? (theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')) : 'transparent',
                      color: (contactFocused[idx] || (c.value && String(c.value).trim())) ? theme.primary : (theme.textLight || theme.text),
                      fontWeight: 500,
                      opacity: (!contactFocused[idx] && !c.value) ? 0 : 1
                    }}
                  >
                    {getContactLabel(c.type)}
                  </label>
                </div>
                <button 
                  className="p-1.5 rounded-lg transition-all hover:scale-110 active:scale-95 flex-shrink-0 flex items-center justify-center" 
                  style={{ 
                    background: 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)',
                    color: '#ffffff',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                  }} 
                  onClick={() => removeContact(idx)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #b5684a 0%, #a35a3f 100%)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)';
                  }}
                >
                  <X size={14} />
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

        {/* PAYMENT METHODS Section Header */}
        <div className="px-4 py-2.5 rounded-lg flex items-center justify-between mb-2" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, borderLeft: '4px solid #e0ded7' }}>
          <h4 className="font-bold text-sm tracking-wider uppercase" style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76', letterSpacing: '0.1em' }}>PAYMENT METHODS</h4>
          <CreditCard size={20} style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76' }} />
        </div>

        {/* Section: Payment */}
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {[
              { name: 'Card', key: 'card', icon: CreditCard },
              { name: 'Zelle', key: 'zelle', icon: SiZelle },
              { name: 'Crypto', key: 'crypto', icon: Coins },
              { name: 'PayPal', key: 'paypal', icon: FaPaypal },
              { name: 'Wire', key: 'wire', icon: Banknote },
              { name: 'Venmo', key: 'venmo', icon: VenmoIcon },
              { name: 'CashApp', key: 'cashapp', icon: SiCashapp },
              { name: 'AliPay', key: 'alipay', icon: FaAlipay }
            ].map(payment => {
              const Icon = payment.icon
              const isSelected = !!form.payments[payment.key]
              return (
                <button
                  key={payment.key}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, payments: { ...prev.payments, [payment.key]: !prev.payments[payment.key] } }))}
                  className="flex flex-col items-center justify-center p-1.5 rounded-lg transition-all"
                  style={{
                    backgroundColor: isSelected ? theme.primary : (theme.isDark ? '#1f2937' : '#ffffff'),
                    border: `1px solid ${isSelected ? theme.primary : theme.border}`,
                    color: isSelected ? '#ffffff' : (theme.isDark ? '#9ca3af' : '#6b7280'),
                    minHeight: '60px',
                    boxShadow: isSelected ? `0 1px 3px ${theme.primary}30` : 'none',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : '#f9fafb'
                      e.currentTarget.style.color = theme.text
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = theme.isDark ? '#1f2937' : '#ffffff'
                      e.currentTarget.style.color = theme.isDark ? '#9ca3af' : '#6b7280'
                    }
                  }}
                >
                  <Icon size={payment.key === 'venmo' ? 24 : 18} style={{ marginBottom: '2px', position: 'relative', zIndex: 1 }} />
                  <span className="text-xs font-medium text-center leading-tight" style={{ position: 'relative', zIndex: 1 }}>{payment.name}</span>
                </button>
              )
            })}
          </div>
          <TextInput 
            label="Payment Notes" 
            value={form.payments.notes} 
            onChange={v => setForm(prev => ({ ...prev, payments: { ...prev.payments, notes: v } }))} 
            placeholder="Preferences / fees / tips" 
            theme={theme}
            outlined={true}
            customTextColor={theme.isDark ? null : "#181A18"}
            customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
          />
        </div>

        {/* ADDITIONAL INFO Section Header */}
        <div className="px-4 py-2.5 rounded-lg flex items-center justify-between mb-2" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, borderLeft: '4px solid #e0ded7' }}>
          <h4 className="font-bold text-sm tracking-wider uppercase" style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76', letterSpacing: '0.1em' }}>ADDITIONAL INFO</h4>
          <FileText size={20} style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76' }} />
        </div>

        {/* Section: Labels + Notes */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {labelOptions.map(label => {
              const Icon = getLabelIcon(label)
              const isSelected = Array.isArray(form.labels) && form.labels.includes(label)
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, labels: isSelected ? (prev.labels||[]).filter(x => x !== label) : Array.from(new Set([...(prev.labels||[]), label])) }))}
                  className="flex items-center justify-between px-2 py-1.5 rounded-lg transition-all text-left"
                  style={{
                    backgroundColor: isSelected ? theme.primary : (theme.isDark ? '#1f2937' : '#ffffff'),
                    border: `1px solid ${isSelected ? theme.primary : theme.border}`,
                    color: isSelected ? '#ffffff' : (theme.isDark ? '#9ca3af' : '#6b7280'),
                    boxShadow: isSelected ? `0 1px 3px ${theme.primary}30` : 'none',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : '#f9fafb'
                      e.currentTarget.style.color = theme.text
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = theme.isDark ? '#1f2937' : '#ffffff'
                      e.currentTarget.style.color = theme.isDark ? '#9ca3af' : '#6b7280'
                    }
                  }}
                >
                  <span className="text-xs font-medium leading-tight" style={{ position: 'relative', zIndex: 1 }}>{label}</span>
                  <Icon size={14} style={{ position: 'relative', zIndex: 1, flexShrink: 0 }} />
                </button>
              )
            })}
          </div>
          <div className="relative">
            <textarea 
              id="notes-textarea"
              className="w-full p-3 rounded-lg text-sm transition-all focus:outline-none resize-none" 
              value={form.notes || ''} 
              onChange={e => setForm({ ...form, notes: e.target.value })} 
              onFocus={() => setIsNotesFocused(true)}
              onBlur={() => setIsNotesFocused(false)}
              placeholder=" " 
              rows={2}
              style={{ 
                border: `1px solid #f0eee7`,
                backgroundColor: theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff'), 
                color: '#181A18',
                boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                overflowWrap: 'break-word'
              }} 
            />
            <label 
              htmlFor="notes-textarea"
              className="absolute pointer-events-none transition-all"
              style={{
                fontSize: (isNotesFocused || (form.notes && form.notes.trim())) ? '0.75rem' : '0.9375rem',
                top: (isNotesFocused || (form.notes && form.notes.trim())) ? '-8px' : '14px',
                left: (isNotesFocused || (form.notes && form.notes.trim())) ? '12px' : '16px',
                padding: (isNotesFocused || (form.notes && form.notes.trim())) ? '0 4px' : '0',
                background: (isNotesFocused || (form.notes && form.notes.trim())) ? (theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')) : 'transparent',
                color: (isNotesFocused || (form.notes && form.notes.trim())) ? theme.primary : (theme.textLight || theme.text),
                fontWeight: 500
              }}
            >
              Notes
          </label>
          </div>
        </div>

        {/* ORDER HISTORY Section Header - Only show for existing vendors */}
        {vendor && (
          <>
            <div className="px-4 py-2.5 rounded-lg flex items-center justify-between mb-2" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, borderLeft: '4px solid #e0ded7' }}>
              <h4 className="font-bold text-sm tracking-wider uppercase" style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76', letterSpacing: '0.1em' }}>ORDER HISTORY</h4>
              <History size={20} style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76' }} />
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
    case 'name': return 'e.g., Pharm...'
    case 'email': return 'name@example.com'
    case 'phone': return '(555) 555-5555'
    case 'whatsapp': return '+1 555-555-5555' 
    case 'telegram': return '@ telegramname'
    case 'discord': return '@ discordname'
    case 'website': return 'https://example.com'
    case 'facebook': return 'facebook.com/username'
    case 'other': return 'Enter contact information'
    default: return 'Enter contact information'
  }
}

function getContactLabel(type) {
  switch ((type || '').toLowerCase()) {
    case 'name': return 'Name'
    case 'email': return 'Email'
    case 'phone': return 'Phone'
    case 'whatsapp': return 'WhatsApp'
    case 'telegram': return 'Telegram'
    case 'discord': return 'Discord'
    case 'website': return 'Website'
    case 'facebook': return 'Facebook'
    case 'other': return 'Contact'
    default: return 'Contact'
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


