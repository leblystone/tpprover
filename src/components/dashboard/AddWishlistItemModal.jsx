import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import BottomSheet from '../common/BottomSheet';
import TextInput from '../common/inputs/TextInput';
import {
  BookHeart, X,
  FlaskConical, TestTube, Pill, Syringe,
  HeartPulse, Brain, Dumbbell, Zap,
  Moon, Leaf, Droplets, Target,
  Microscope, Activity, Star, Package,
} from 'lucide-react';

export const WISHLIST_ICON_OPTIONS = [
  { value: 'FlaskConical', label: 'Flask',        Icon: FlaskConical },
  { value: 'TestTube',     label: 'Test Tube',     Icon: TestTube     },
  { value: 'Pill',         label: 'Pill',          Icon: Pill         },
  { value: 'Syringe',      label: 'Syringe',       Icon: Syringe      },
  { value: 'HeartPulse',   label: 'Heart Rate',    Icon: HeartPulse   },
  { value: 'Brain',        label: 'Cognitive',     Icon: Brain        },
  { value: 'Dumbbell',     label: 'Performance',   Icon: Dumbbell     },
  { value: 'Zap',          label: 'Energy',        Icon: Zap          },
  { value: 'Moon',         label: 'Recovery',      Icon: Moon         },
  { value: 'Leaf',         label: 'Natural',       Icon: Leaf         },
  { value: 'Droplets',     label: 'Hydration',     Icon: Droplets     },
  { value: 'Target',       label: 'Goal',          Icon: Target       },
  { value: 'Microscope',   label: 'Research',      Icon: Microscope   },
  { value: 'Activity',     label: 'Bio-Metrics',   Icon: Activity     },
  { value: 'Star',         label: 'Priority',      Icon: Star         },
  { value: 'Package',      label: 'Product',       Icon: Package      },
];

export default function AddWishlistItemModal({ open, onClose, theme, item, onSave }) {
    const [form, setForm] = useState({ 
        name: '', 
        vendor: '', 
        price: '',
        notes: '',
        mgAmount: '',
        mgUnit: 'mg',
        icon: '',
    });
    const [isSaving, setIsSaving] = useState(false);
    const [isPriceFocused, setIsPriceFocused] = useState(false);
    const [isMgFocused, setIsMgFocused] = useState(false);
    const [isMgUnitDropdownOpen, setIsMgUnitDropdownOpen] = useState(false);
    const [isIconDropdownOpen, setIsIconDropdownOpen] = useState(false);
    const unitButtonRef = useRef(null);
    const iconButtonRef = useRef(null);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 'auto', bottom: 'auto', right: 0 });
    const [iconDropdownPosition, setIconDropdownPosition] = useState({ top: 'auto', bottom: 'auto', left: 0 });

    useEffect(() => {
        if (open) {
            if (item) {
                setForm({ 
                    name: item.name || item.item || '', 
                    vendor: item.vendor || '', 
                    price: item.price || '',
                    notes: item.notes || item.description || '',
                    mgAmount: item.mgAmount || '',
                    mgUnit: item.mgUnit || 'mg',
                    icon: item.icon || '',
                });
            } else {
                setForm({ 
                    name: '', 
                    vendor: '', 
                    price: '',
                    notes: '',
                    mgAmount: '',
                    mgUnit: 'mg',
                    icon: '',
                });
            }
        }
    }, [item, open]);

    // Update dropdown position when opened
    useEffect(() => {
        if (isMgUnitDropdownOpen && unitButtonRef.current) {
            const updatePosition = () => {
                if (unitButtonRef.current) {
                    const rect = unitButtonRef.current.getBoundingClientRect();
                    const dropdownHeight = 240; // Approximate height for 6 items
                    const spaceBelow = window.innerHeight - rect.bottom;
                    
                    if (spaceBelow < dropdownHeight) {
                        // Pop upwards
                        setDropdownPosition({
                            top: 'auto',
                            bottom: window.innerHeight - rect.top + 4,
                            right: window.innerWidth - rect.right
                        });
                    } else {
                        // Pop downwards
                        setDropdownPosition({
                            top: rect.bottom + 4,
                            bottom: 'auto',
                            right: window.innerWidth - rect.right
                        });
                    }
                }
            };
            updatePosition();
            window.addEventListener('resize', updatePosition);
            window.addEventListener('scroll', updatePosition, true);
            return () => {
                window.removeEventListener('resize', updatePosition);
                window.removeEventListener('scroll', updatePosition, true);
            };
        }
    }, [isMgUnitDropdownOpen]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (isMgUnitDropdownOpen && !e.target.closest('[data-dropdown-container]')) {
                setIsMgUnitDropdownOpen(false);
            }
        };
        if (isMgUnitDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isMgUnitDropdownOpen]);

    // Icon dropdown position
    useEffect(() => {
        if (isIconDropdownOpen && iconButtonRef.current) {
            const rect = iconButtonRef.current.getBoundingClientRect();
            const dropdownHeight = 220;
            const spaceBelow = window.innerHeight - rect.bottom;
            if (spaceBelow < dropdownHeight) {
                setIconDropdownPosition({ top: 'auto', bottom: window.innerHeight - rect.top + 4, left: rect.left });
            } else {
                setIconDropdownPosition({ top: rect.bottom + 4, bottom: 'auto', left: rect.left });
            }
        }
    }, [isIconDropdownOpen]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (isIconDropdownOpen && !e.target.closest('[data-icon-dropdown]')) {
                setIsIconDropdownOpen(false);
            }
        };
        if (isIconDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isIconDropdownOpen]);

    const handleSave = async () => {
        if (!form.name.trim()) {
            return; // Don't save empty items
        }
        
        setIsSaving(true);
        try {
            await Promise.resolve(onSave({
                ...form,
                id: item?.id,
                item: form.name, // For backward compatibility
                description: form.notes // For backward compatibility
            }));
            onClose();
        } catch (error) {
            console.error('Failed to save wishlist item:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <BottomSheet 
            open={open} 
            onClose={onClose}
            title="Add to Wishlist"
            theme={theme}
            maxHeight="90vh"
            fitContent
            footer={
                <button
                    onClick={handleSave}
                    disabled={isSaving || !form.name.trim()}
                    className="w-full px-4 py-3 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation btn-primary-inset"
                    style={{ 
                        backgroundColor: theme.primary,
                        color: theme.textOnPrimary || '#ffffff',
                        border: 'none',
                        boxShadow: theme?.isDark ? '0 4px 10px rgba(0,0,0,0.35)' : '0 4px 10px rgba(0,0,0,0.15)'
                    }}
                    onMouseEnter={(e) => {
                        if (!isSaving && form.name.trim()) {
                            e.currentTarget.style.opacity = '0.9';
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '1';
                    }}
                >
                    {isSaving ? 'Saving...' : (item ? 'Update' : 'Add to Wishlist')}
                </button>
            }
        >
            <div className="space-y-3 -my-3 sm:-my-4">
                <div className="flex items-center gap-4 mb-4">
                    <BookHeart size={32} style={{ color: theme.primary }} />
                    <div className="flex flex-col gap-0.5 flex-1">
                        <h4 className="text-lg font-semibold tracking-wide" style={{ color: theme.text }}>Wishlist Item</h4>
                        <div className="flex items-center gap-2 ml-1">
                            <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }} />
                            <span className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                                Product Details
                            </span>
                        </div>
                    </div>
                </div>

                {/* Item Name + inline icon picker */}
                <div className="flex items-stretch gap-2">
                    {/* Icon trigger button */}
                    <div className="relative flex-shrink-0" data-icon-dropdown>
                        {(() => {
                            const selected = WISHLIST_ICON_OPTIONS.find(o => o.value === form.icon);
                            const SelectedIcon = selected?.Icon ?? null;
                            return (
                                <button
                                    ref={iconButtonRef}
                                    type="button"
                                    data-icon-dropdown
                                    title={selected ? selected.label : 'Pick an icon'}
                                    onClick={() => setIsIconDropdownOpen(prev => !prev)}
                                    onMouseDown={(e) => e.preventDefault()}
                                    className="h-full flex items-center justify-center rounded-lg border transition-all touch-manipulation"
                                    style={{
                                        width: '44px',
                                        border: `1px solid ${isIconDropdownOpen ? theme.primary : (theme.isDark ? 'rgba(255,255,255,0.1)' : '#f0eee7')}`,
                                        backgroundColor: isIconDropdownOpen
                                            ? `${theme.primary}18`
                                            : (theme.isDark ? 'rgba(255,255,255,0.04)' : (theme.inputBackground || '#fff')),
                                        color: SelectedIcon ? theme.primary : theme.textLight,
                                        boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)',
                                    }}
                                >
                                    {SelectedIcon
                                        ? <SelectedIcon size={18} strokeWidth={2} />
                                        : <BookHeart size={18} strokeWidth={1.5} style={{ opacity: 0.35 }} />
                                    }
                                </button>
                            );
                        })()}

                        {isIconDropdownOpen && createPortal(
                            <div
                                data-icon-dropdown
                                className="fixed z-[10005] rounded-xl shadow-lg border p-2"
                                style={{
                                    top: iconDropdownPosition.top !== 'auto' ? `${iconDropdownPosition.top}px` : 'auto',
                                    bottom: iconDropdownPosition.bottom !== 'auto' ? `${iconDropdownPosition.bottom}px` : 'auto',
                                    left: `${iconDropdownPosition.left}px`,
                                    width: '224px',
                                    backgroundColor: theme.isDark ? theme.cardBackground : '#ffffff',
                                    borderColor: theme.border,
                                    boxShadow: theme.isDark ? '0 8px 24px rgba(0,0,0,0.45)' : '0 8px 24px rgba(0,0,0,0.12)',
                                }}
                            >
                                <div className="grid grid-cols-4 gap-1">
                                    {/* None / clear */}
                                    <button
                                        type="button"
                                        data-icon-dropdown
                                        onMouseDown={(e) => e.preventDefault()}
                                        onTouchStart={(e) => e.preventDefault()}
                                        onClick={() => { setForm({ ...form, icon: '' }); setIsIconDropdownOpen(false); }}
                                        className="flex flex-col items-center justify-center gap-1 py-2 rounded-lg border transition-all touch-manipulation"
                                        style={{
                                            borderColor: !form.icon ? theme.primary : 'transparent',
                                            backgroundColor: !form.icon ? `${theme.primary}18` : 'transparent',
                                            color: !form.icon ? theme.primary : theme.textLight,
                                        }}
                                    >
                                        <X size={16} strokeWidth={2} />
                                        <span className="text-[9px] font-medium leading-none">None</span>
                                    </button>
                                    {WISHLIST_ICON_OPTIONS.map(({ value, label, Icon }) => (
                                        <button
                                            key={value}
                                            type="button"
                                            data-icon-dropdown
                                            onMouseDown={(e) => e.preventDefault()}
                                            onTouchStart={(e) => e.preventDefault()}
                                            onClick={() => { setForm({ ...form, icon: value }); setIsIconDropdownOpen(false); }}
                                            title={label}
                                            className="flex flex-col items-center justify-center gap-1 py-2 rounded-lg border transition-all touch-manipulation"
                                            style={{
                                                borderColor: form.icon === value ? theme.primary : 'transparent',
                                                backgroundColor: form.icon === value ? `${theme.primary}18` : 'transparent',
                                                color: form.icon === value ? theme.primary : theme.textLight,
                                            }}
                                        >
                                            <Icon size={16} strokeWidth={2} />
                                            <span className="text-[9px] font-medium leading-none text-center">{label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>,
                            document.body
                        )}
                    </div>

                    {/* Item Name input */}
                    <div className="flex-1 min-w-0">
                        <TextInput
                            label="Item Name"
                            value={form.name}
                            onChange={v => setForm({ ...form, name: v })}
                            placeholder="Product or Research Item"
                            theme={theme}
                            outlined={true}
                            customTextColor={theme.isDark ? null : "#181A18"}
                            customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
                        />
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                    <TextInput
                        label="Vendor"
                        value={form.vendor}
                        onChange={v => setForm({ ...form, vendor: v })}
                        placeholder="Vendor Name (optional)"
                        theme={theme}
                        outlined={true}
                        customTextColor={theme.isDark ? null : "#181A18"}
                        customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
                    />
                    <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" style={{ color: theme.textLight || theme.text }}>
                            <span className="text-sm">$</span>
                        </div>
                        <div className="relative">
                            <input
                                type="text"
                                value={form.price}
                                onChange={(e) => setForm({ ...form, price: e.target.value })}
                                placeholder=" "
                                className="w-full p-3 pl-8 rounded-lg transition-all focus:outline-none outlined-input"
                                style={{
                                    border: `1px solid ${isPriceFocused ? theme.primary : '#f0eee7'}`,
                                    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : (theme.inputBackground || '#fff'),
                                    color: theme.isDark ? theme.text : '#181A18',
                                    boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'
                                }}
                                onFocus={(e) => {
                                    setIsPriceFocused(true);
                                    e.target.style.borderColor = theme.primary;
                                }}
                                onBlur={(e) => {
                                    setIsPriceFocused(false);
                                    e.target.style.borderColor = theme.isDark ? 'rgba(255,255,255,0.08)' : '#f0eee7';
                                }}
                            />
                            <label 
                                className={`absolute left-3 transition-all pointer-events-none outlined-input-label ${(isPriceFocused || form.price) ? 'active' : ''}`}
                                style={{ 
                                    top: (isPriceFocused || form.price) ? '-8px' : '14px',
                                    left: (isPriceFocused || form.price) ? '12px' : '24px',
                                    fontSize: (isPriceFocused || form.price) ? '0.875rem' : '1rem',
                                    padding: (isPriceFocused || form.price) ? '0 4px' : '0',
                                    color: (isPriceFocused || form.price) ? theme.primary : (theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76'),
                                    backgroundColor: (isPriceFocused || form.price) ? (theme.isDark ? theme.cardBackground : (theme.inputBackground || '#fff')) : 'transparent',
                                    fontWeight: 500
                                }}
                            >
                                Price
                            </label>
                        </div>
                    </div>
                </div>
                
                <div className="relative">
                    <div className="flex items-stretch rounded-lg" style={{ 
                        border: `1px solid ${isMgFocused ? theme.primary : '#f0eee7'}`,
                        boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)',
                        backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : (theme.inputBackground || '#fff')
                    }}>
                        <input
                            type="text"
                            value={form.mgAmount}
                            onChange={(e) => setForm({ ...form, mgAmount: e.target.value })}
                            placeholder=" "
                            className="flex-1 px-3 py-3 outline-none min-w-0 rounded-l-lg"
                            style={{
                                backgroundColor: 'transparent',
                                color: theme.isDark ? theme.text : '#181A18',
                                border: 'none'
                            }}
                            onFocus={() => {
                                setIsMgFocused(true);
                            }}
                            onBlur={() => {
                                setIsMgFocused(false);
                            }}
                        />
                        <button
                            ref={unitButtonRef}
                            type="button"
                            onClick={() => setIsMgUnitDropdownOpen(prev => !prev)}
                            onMouseDown={(e) => e.preventDefault()}
                            onTouchStart={(e) => e.preventDefault()}
                            className="flex items-center justify-between gap-3 px-4 py-3 flex-shrink-0 rounded-r-lg relative cursor-pointer transition-all border-none outline-none"
                            data-dropdown-container
                            style={{ 
                                borderLeft: theme.isDark ? '1px solid rgba(255,255,255,0.08)' : `1px solid #f0eee7`,
                                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : (theme.cardBackground || '#f9fafb'),
                                color: theme.isDark ? theme.text : '#181A18',
                                minWidth: '100px'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.02)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255,255,255,0.06)' : (theme.cardBackground || '#f9fafb');
                            }}
                        >
                            <span className="text-sm font-semibold">
                                {(() => {
                                    const unit = (form.mgUnit || 'mg').toLowerCase();
                                    if (unit === 'mg') return 'mg';
                                    if (unit === 'g') return 'g';
                                    if (unit === 'mcg') return 'mcg';
                                    if (unit === 'tab') return 'Tab';
                                    if (unit === 'bottle') return 'Bottle';
                                    if (unit === 'ui') return 'UI';
                                    return unit.charAt(0).toUpperCase() + unit.slice(1);
                                })()}
                            </span>
                            <svg width="14" height="14" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </button>
                    </div>
                    {isMgUnitDropdownOpen && createPortal(
                        <div 
                            className="fixed z-[10005] rounded-lg shadow-lg border overflow-hidden"
                            data-dropdown-container
                            style={{
                                top: dropdownPosition.top !== 'auto' ? `${dropdownPosition.top}px` : 'auto',
                                bottom: dropdownPosition.bottom !== 'auto' ? `${dropdownPosition.bottom}px` : 'auto',
                                right: `${dropdownPosition.right}px`,
                                backgroundColor: theme.isDark ? theme.cardBackground : '#ffffff',
                                borderColor: theme.border,
                                minWidth: '100px',
                                boxShadow: theme.isDark ? '0 4px 6px rgba(0,0,0,0.3)' : '0 4px 6px rgba(0,0,0,0.1)'
                            }}
                        >
                                    {[
                                        { value: 'mg', label: 'mg' },
                                        { value: 'g', label: 'g' },
                                        { value: 'mcg', label: 'mcg' },
                                        { value: 'tab', label: 'Tab' },
                                        { value: 'bottle', label: 'Bottle' },
                                        { value: 'ui', label: 'UI' }
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
                                                onMouseDown={(e) => e.preventDefault()}
                                                onTouchStart={(e) => e.preventDefault()}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setForm({ ...form, mgUnit: option.value });
                                                    setIsMgUnitDropdownOpen(false);
                                                }}
                                                className="w-full text-left px-3 py-2 text-sm transition-all touch-manipulation"
                                                style={{
                                                    color: (form.mgUnit || 'mg') === option.value ? theme.primary : theme.text,
                                                    backgroundColor: 'transparent',
                                                    WebkitTapHighlightColor: 'transparent'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = theme.primaryLight || `${theme.primary}20`;
                                                    e.currentTarget.style.color = theme.primary;
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                    e.currentTarget.style.color = (form.mgUnit || 'mg') === option.value ? theme.primary : theme.text;
                                                }}
                                            >
                                                {option.label}
                                            </button>
                                        </React.Fragment>
                                    ))}
                        </div>,
                        document.body
                    )}
                    <label 
                        className={`absolute left-3 transition-all pointer-events-none outlined-input-label ${(isMgFocused || form.mgAmount) ? 'active' : ''}`}
                        style={{ 
                            top: (isMgFocused || form.mgAmount) ? '-8px' : '14px',
                            left: (isMgFocused || form.mgAmount) ? '12px' : '16px',
                            fontSize: (isMgFocused || form.mgAmount) ? '0.75rem' : '0.9375rem',
                            padding: (isMgFocused || form.mgAmount) ? '0 4px' : '0',
                            background: (isMgFocused || form.mgAmount) ? (theme.isDark ? theme.cardBackground : (theme.inputBackground || '#fff')) : 'transparent',
                            color: (isMgFocused || form.mgAmount) ? theme.primary : (theme.textLight || theme.text),
                            fontWeight: 500
                        }}
                    >
                        Amount
                    </label>
                </div>
                
                <TextInput
                    label="Notes"
                    value={form.notes}
                    onChange={v => setForm({ ...form, notes: v })}
                    placeholder="Research notes or details about this item (optional)"
                    theme={theme}
                    outlined={true}
                    customTextColor={theme.isDark ? null : "#181A18"}
                    customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
                    multiline={true}
                    rows={3}
                />
            </div>
        </BottomSheet>
    );
}
