import React, { useEffect, useState } from 'react'
import { Lock, Building2, Phone, CreditCard, FileText, History, X, Wallet, Coins, DollarSign, Smartphone, Banknote, CheckCircle, BadgeCheck, Truck, PackagePlus, Beaker, Pill, Droplet, TrendingUp, AlertCircle, Clock, PackageX, AlertTriangle, UserX, Ban, Ship, Amphora, Turtle, Rabbit, CircleGauge, EggOff, MessageSquare } from 'lucide-react'
import { SiZelle, SiCashapp, SiVenmo } from 'react-icons/si'
import { generateId } from '../../utils/string'

// Venmo icon wrapper - passes through size directly
const VenmoIcon = ({ size = 18, style, className }) => {
    return <SiVenmo size={size} style={style} className={className} />;
}
import { FaPaypal, FaAlipay } from 'react-icons/fa6'
import BottomSheet from '../common/BottomSheet'

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
  // Dropdown is now inline, no refs/position state needed
  
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
    <BottomSheet 
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
      maxHeight="90vh" 
      footer={(
      <div className="w-full flex items-center justify-between gap-4 p-1">
        <div className="flex items-center">
          {(vendor?.id || form?.id) && (
            <button 
              onClick={() => {
                const targetId = form?.id || vendor?.id;
                const vendorToDelete = { ...form, id: targetId };
                onDelete?.(targetId);
                setTimeout(() => {
                  const stillExists = JSON.parse(localStorage.getItem('tpprover_vendors') || '[]')
                    .some(v => String(v.id) === String(targetId) || (v.name && form?.name && v.name.trim().toLowerCase() === form.name.trim().toLowerCase()));
                  if (stillExists && onForceDelete) {
                    onForceDelete(vendorToDelete);
                  }
                }, 100);
              }} 
              className="px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all hover:bg-gray-100 dark:hover:bg-white/10 text-black dark:text-white"
            >
              Cancel
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              const vendorData = { ...form, id: form?.id || vendor?.id };
              onSave?.(vendorData);
            }}
            className="px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg hover:shadow-xl active:scale-[0.98] whitespace-nowrap"
            style={{ 
              backgroundColor: theme?.primary,
              color: theme?.textOnPrimary || '#ffffff'
            }}
          >
            Save Vendor
          </button>
        </div>
      </div>
    )}    >
      <div className="relative space-y-4">
        {/* VENDOR INFO Section Header */}
        <div className="pt-2">
          {/* Section Header */}
          <div className="flex items-center gap-4 mb-4">
            <Building2 size={32} style={{ color: theme.primary }} />
            <div className="flex flex-col gap-0.5 flex-1">
              <h4 className="text-lg font-semibold tracking-wide" style={{ color: theme.text }}>Vendor Profile</h4>
              <div className="flex items-center gap-2 ml-1">
                <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                  Name & Rating
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Name, Rating, Category */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div>
              <TextInput 
                label="Vendor Name" 
                value={form.name} 
                onChange={v => setForm({ ...form, name: v })} 
                placeholder="e.g., Pharm..." 
                theme={theme}
                outlined={true}
                customTextColor={theme.isDark ? null : "#181A18"}
              />
            </div>
            <div className="flex flex-col gap-2">
              <style>{`
                @keyframes starPulse {
                  0%, 100% { transform: scale(1); }
                  50% { transform: scale(1.2); }
                }
                @keyframes starFadeIn {
                  0% { opacity: 0; transform: scale(0.5) rotate(-15deg); }
                  100% { opacity: 1; transform: scale(1) rotate(0deg); }
                }
                .star-rating-btn {
                  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .star-rating-btn:hover {
                  transform: scale(1.1);
                }
                .star-icon {
                  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                .star-icon.filled {
                  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
                }
                .star-icon.just-clicked {
                  animation: starPulse 0.4s ease-out;
                }
              `}</style>
              <div className="flex items-center justify-between w-full rounded-xl p-1.5" style={{ 
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.05)' : '#f0eee7'}`
              }} aria-label="Rating">
                {[1,2,3,4,5].map((n) => {
                  const isFilled = form.rating >= n;
                  return (
                    <button 
                      key={n} 
                      type="button" 
                      className="star-rating-btn px-3 py-1" 
                      onClick={() => {
                        setForm(prev => ({ ...prev, rating: n }));
                        const stars = document.querySelectorAll('.star-icon');
                        stars.forEach((star, i) => {
                          if (i < n) {
                            star.classList.add('just-clicked');
                            setTimeout(() => star.classList.remove('just-clicked'), 400);
                          }
                        });
                      }}
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 24 24" 
                        fill={isFilled ? ['#7A8E85', '#6B7F77', '#566D64', '#445952', '#3B4240'][n - 1] : 'none'} 
                        stroke={isFilled ? ['#7A8E85', '#6B7F77', '#566D64', '#445952', '#3B4240'][n - 1] : (theme.isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)')} 
                        className={`w-6 h-6 star-icon ${isFilled ? 'filled' : ''}`}
                        style={{ opacity: isFilled ? 1 : 0.5 }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.972 20.539a.562.562 0 01-.84-.61l1.285-5.385a.563.563 0 00-.182-.557L3.031 10.385a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
                      </svg>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          
          {/* Category Selection */}
          <div className="flex flex-col gap-2">
            <div className="flex w-full rounded-lg p-1 gap-1" style={{ 
              backgroundColor: theme.isDark ? '#1a2028' : '#f0efe9',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08)'
            }}>
              {['domestic','international','groupbuy'].map(k => (
                <button 
                  key={k} 
                  type="button" 
                  onClick={() => setForm(prev => ({ ...prev, type: k }))}
                  className="flex-1 text-center px-2 py-2 text-xs font-bold rounded-md transition-all active:scale-95"
                  style={{ 
                    backgroundColor: form.type === k ? '#445952' : 'transparent', 
                    color: form.type === k ? '#fff' : theme.textLight,
                    boxShadow: form.type === k ? 'inset 0 2px 4px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.08)' : 'none'
                  }}
                >
                  {k === 'groupbuy' ? 'Group Buy' : k.charAt(0).toUpperCase() + k.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CONTACT INFO Section Header */}
        <div className="pt-4">
          {/* Section Header */}
          <div className="flex items-center gap-4 mb-4">
            <MessageSquare size={32} style={{ color: theme.primary }} />
            <div className="flex flex-col gap-0.5">
              <h4 className="text-lg font-semibold tracking-wide" style={{ color: theme.text }}>Communication</h4>
              <div className="flex items-center gap-2 ml-1">
                <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                  Contact & Support Details
                </span>
              </div>
            </div>
          </div>
        </div>


        {/* Section: Contacts */}
        <div>
          <div className="space-y-4">
            {form.contacts.map((c, idx) => (
              <div key={idx} data-dropdown-container className="relative">
                <div className="flex items-center gap-2 group">
                  <div className="flex-1 min-w-0">
                    <div 
                      className="flex items-stretch rounded-xl transition-all duration-200"
                      style={{ 
                        border: `1px solid ${contactFocused[idx] ? theme.primary : (theme.isDark ? 'rgba(255,255,255,0.1)' : '#f0eee7')}`,
                        backgroundColor: theme.isDark ? 'rgba(255,255,255,0.03)' : '#fff',
                        boxShadow: contactFocused[idx] ? `0 0 0 2px ${theme.primary}15` : 'none'
                      }}
                    >
                      {/* Type Selector - entire left area is tappable */}
                      <div 
                        className="border-r flex items-center gap-2 px-4 py-3 cursor-pointer select-none"
                        style={{ 
                          borderColor: theme.isDark ? 'rgba(255,255,255,0.1)' : '#f0eee7', 
                          color: theme.text,
                          backgroundColor: openDropdowns[idx] ? (theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)') : 'transparent',
                        }}
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (openDropdowns[idx]) {
                            setOpenDropdowns({});
                          } else {
                            setOpenDropdowns({ [idx]: true });
                          }
                        }}
                      >
                        <span className="text-[11px] font-bold uppercase tracking-wider opacity-60">
                          {getContactLabel(c.type)}
                        </span>
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className={`transition-transform duration-200 ${openDropdowns[idx] ? 'rotate-180' : ''}`}>
                          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>

                      <input 
                        type="text"
                        value={c.value || ''} 
                        onChange={e => updateContact(idx, 'value', e.target.value)} 
                        onFocus={() => setContactFocused(prev => ({ ...prev, [idx]: true }))}
                        onBlur={() => setTimeout(() => setContactFocused(prev => ({ ...prev, [idx]: false })), 200)}
                        placeholder={getContactPlaceholder(c.type)}
                        className="flex-1 py-3 px-4 outline-none text-sm font-medium"
                        style={{
                          backgroundColor: 'transparent',
                          color: theme.text
                        }}
                      />
                    </div>
                  </div>
                  
                  <button 
                    type="button"
                    className="p-2.5 rounded-xl transition-all opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500" 
                    onClick={() => removeContact(idx)}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Overlay dropdown - floats over content below */}
                {openDropdowns[idx] && (
                  <div 
                    className="absolute left-0 mt-1 rounded-xl overflow-hidden border shadow-lg"
                    style={{
                      top: '100%',
                      zIndex: 50,
                      backgroundColor: theme.isDark ? 'rgba(24, 28, 36, 0.98)' : (theme.cardBackground || '#fff'),
                      borderColor: theme.isDark ? 'rgba(255,255,255,0.1)' : '#f0eee7',
                      width: '160px',
                    }}
                  >
                    {[
                      { value: 'email', label: 'Email' },
                      { value: 'website', label: 'Website' },
                      { value: 'phone', label: 'Phone' },
                      { value: 'whatsapp', label: 'WhatsApp' },
                      { value: 'telegram', label: 'Telegram' },
                      { value: 'discord', label: 'Discord' },
                      { value: 'facebook', label: 'Facebook' },
                      { value: 'other', label: 'Other' }
                    ].map((option, i, arr) => (
                      <button
                        key={option.value}
                        type="button"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          updateContact(idx, 'type', option.value);
                          setOpenDropdowns({});
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm font-medium transition-colors"
                        style={{ 
                          color: c.type === option.value ? theme.primary : theme.text,
                          backgroundColor: c.type === option.value ? `${theme.primary}08` : 'transparent',
                          borderBottom: i < arr.length - 1 ? `1px solid ${theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}` : 'none',
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            
            <button 
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98]" 
              style={{ 
                backgroundColor: `${theme.primary}15`,
                color: theme.primary,
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08)'
              }} 
              onClick={addContact}
            >
              <PackagePlus size={14} />
              Add Contact Method
            </button>
          </div>
        </div>

        {/* PAYMENT METHODS Section Header */}
        <div className="pt-4">
          {/* Section Header */}
          <div className="flex items-center gap-4 mb-4">
            <CreditCard size={32} style={{ color: theme.primary }} />
            <div className="flex flex-col gap-0.5">
              <h4 className="text-lg font-semibold tracking-wide" style={{ color: theme.text }}>Trust & Payments</h4>
              <div className="flex items-center gap-2 ml-1">
                <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                  Transaction Security
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Payment */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                  className="flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 active:scale-95"
                  style={{
                    backgroundColor: isSelected ? '#445952' : (theme.isDark ? '#1f2937' : '#f5f4f0'),
                    border: isSelected ? '1px solid #3B4240' : `1px solid ${theme.isDark ? 'rgba(255,255,255,0.05)' : '#e8e6df'}`,
                    color: isSelected ? '#fff' : (theme.isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'),
                    boxShadow: isSelected ? 'inset 0 2px 4px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.1)' : 'inset 0 1px 3px rgba(0,0,0,0.06)'
                  }}
                >
                  <Icon size={20} className="mb-2" style={{ color: isSelected ? '#fff' : 'inherit' }} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{payment.name}</span>
                </button>
              )
            })}
          </div>
          
          <TextInput 
            label="Payment Preferences" 
            value={form.payments.notes} 
            onChange={v => setForm(prev => ({ ...prev, payments: { ...prev.payments, notes: v } }))} 
            placeholder="Preferences / fees / tips" 
            theme={theme}
            outlined={true}
            customTextColor={theme.isDark ? null : "#181A18"}
          />
        </div>

        {/* ADDITIONAL INFO Section Header */}
        <div className="pt-4">
          {/* Section Header */}
          <div className="flex items-center gap-4 mb-4">
            <FileText size={32} style={{ color: theme.primary }} />
            <div className="flex flex-col gap-0.5">
              <h4 className="text-lg font-semibold tracking-wide" style={{ color: theme.text }}>Labels</h4>
              <div className="flex items-center gap-2 ml-1">
                <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                  Research Tags
                </span>
              </div>
            </div>
          </div>
        </div>


        {/* Section: Labels + Notes */}
        <div className="space-y-6">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {labelOptions.map(label => {
              const Icon = getLabelIcon(label)
              const isSelected = Array.isArray(form.labels) && form.labels.includes(label)
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, labels: isSelected ? (prev.labels||[]).filter(x => x !== label) : Array.from(new Set([...(prev.labels||[]), label])) }))}
                  className="flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 active:scale-95"
                  style={{
                    backgroundColor: isSelected ? '#6B7F77' : (theme.isDark ? '#1f2937' : '#f5f4f0'),
                    border: isSelected ? '1px solid #566D64' : `1px solid ${theme.isDark ? 'rgba(255,255,255,0.05)' : '#e8e6df'}`,
                    color: isSelected ? '#fff' : (theme.isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'),
                    boxShadow: isSelected ? 'inset 0 2px 4px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.08)' : 'inset 0 1px 3px rgba(0,0,0,0.06)'
                  }}
                >
                  <Icon size={16} className="mb-1" style={{ color: isSelected ? '#fff' : 'inherit' }} />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-center leading-tight">{label}</span>
                </button>
              )
            })}
          </div>
          
          <div className="relative">
            <textarea 
              id="notes-textarea"
              className="w-full p-3 rounded-xl text-sm font-medium transition-all focus:outline-none resize-none" 
              value={form.notes || ''} 
              onChange={e => setForm({ ...form, notes: e.target.value })} 
              onFocus={() => setIsNotesFocused(true)}
              onBlur={() => setIsNotesFocused(false)}
              rows={2}
              style={{ 
                border: `1px solid ${isNotesFocused ? theme.primary : (theme.isDark ? 'rgba(255,255,255,0.1)' : '#f0eee7')}`,
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.03)' : '#fff', 
                color: theme.text,
                boxShadow: isNotesFocused ? `0 0 0 2px ${theme.primary}15` : 'none'
              }} 
            />
            <label 
              htmlFor="notes-textarea"
              className="absolute pointer-events-none transition-all"
              style={{
                fontSize: (isNotesFocused || (form.notes && form.notes.trim())) ? '0.7rem' : '0.875rem',
                top: (isNotesFocused || (form.notes && form.notes.trim())) ? '-8px' : '12px',
                left: (isNotesFocused || (form.notes && form.notes.trim())) ? '12px' : '16px',
                padding: (isNotesFocused || (form.notes && form.notes.trim())) ? '0 4px' : '0',
                background: (isNotesFocused || (form.notes && form.notes.trim())) ? (theme.cardBackground || '#fff') : 'transparent',
                color: (isNotesFocused || (form.notes && form.notes.trim())) ? theme.primary : (theme.textLight || theme.text),
                fontWeight: 600,
                opacity: (isNotesFocused || (form.notes && form.notes.trim())) ? 1 : 0.5
              }}
            >
              Notes . . .
            </label>
          </div>
        </div>

        {/* ORDER HISTORY Section Header - Only show for existing vendors */}
        {vendor && (
          <>
            <div className="pt-4">
              {/* Section Header */}
              <div className="flex items-center gap-4 mb-4">
                <History size={32} style={{ color: theme.primary }} />
                <div className="flex flex-col gap-0.5">
                  <h4 className="text-lg font-semibold tracking-wide" style={{ color: theme.text }}>Order History</h4>
                  <div className="flex items-center gap-2 ml-1">
                    <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                      Recent
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Order History */}
            <div className="pb-4">
              <VendorOrderHistory vendorName={form.name} vendorId={vendor?.id} theme={theme} />
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
            <h3 className="text-xl font-semibold mb-2" style={{ color: theme.primaryDark }}>
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

      {/* Portal removed - dropdown is now inline within each contact row */}
    </BottomSheet>
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
    <div className="absolute z-10 mt-1 w-full rounded-md border shadow" style={{ borderColor: theme?.border, backgroundColor: theme?.cardBackground || '#ffffff' }}>
      {list.map(v => (
        <button key={v} type="button" className="w-full text-left px-3 py-2 transition-colors" style={{ color: theme?.text }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme?.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }} onClick={() => onPick?.(v)}>
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
    id: generateId(),
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

function VendorOrderHistory({ vendorName, vendorId, theme }) {
  let orders = []
  try { orders = JSON.parse(localStorage.getItem('tpprover_orders') || '[]') } catch {}
  const history = orders.filter(o => {
    if (vendorId && o.vendorId) return o.vendorId === vendorId;
    return (o.vendor || '').toLowerCase() === (vendorName || '').toLowerCase();
  })
  
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 opacity-40">
        <History size={32} className="mb-2" />
        <p className="text-sm font-semibold">No history for this vendor</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: theme.isDark ? 'rgba(255,255,255,0.05)' : '#f0eee7' }}>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
              <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider opacity-60">Date</th>
              <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider opacity-60">Peptide</th>
              <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider opacity-60 text-right">Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: theme.isDark ? 'rgba(255,255,255,0.05)' : '#f0eee7' }}>
            {history.map(h => (
              <tr key={h.id} className="hover:bg-black/5 transition-colors">
                <td className="py-3 px-4 text-xs font-semibold">{formatMMDDYYYY(h.date)}</td>
                <td className="py-3 px-4">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold">{h.peptide}</span>
                    <span className="text-[10px] opacity-60">{h.mg}mg</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-xs font-bold text-right">
                  {h.cost || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

