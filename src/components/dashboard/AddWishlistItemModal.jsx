import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import TextInput from '../common/inputs/TextInput';
import { BookHeart } from 'lucide-react';

export default function AddWishlistItemModal({ open, onClose, theme, item, onSave }) {
    const [form, setForm] = useState({ 
        name: '', 
        vendor: '', 
        price: '',
        notes: '',
        mgAmount: '',
        mgUnit: 'mg'
    });
    const [isSaving, setIsSaving] = useState(false);
    const [isPriceFocused, setIsPriceFocused] = useState(false);
    const [isMgFocused, setIsMgFocused] = useState(false);
    const [isMgUnitDropdownOpen, setIsMgUnitDropdownOpen] = useState(false);

    useEffect(() => {
        if (open) {
            if (item) {
                setForm({ 
                    name: item.name || item.item || '', 
                    vendor: item.vendor || '', 
                    price: item.price || '',
                    notes: item.notes || item.description || '',
                    mgAmount: item.mgAmount || '',
                    mgUnit: item.mgUnit || 'mg'
                });
            } else {
                setForm({ 
                    name: '', 
                    vendor: '', 
                    price: '',
                    notes: '',
                    mgAmount: '',
                    mgUnit: 'mg'
                });
            }
        }
    }, [item, open]);

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
        <Modal 
            open={open} 
            onClose={onClose}
            title="Add to Wishlist"
            theme={theme}
            maxWidth="max-w-2xl"
            variant="modern"
        >
            <div className="space-y-6">
                <div className="px-4 py-2.5 rounded-lg flex items-center justify-between mb-2" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, borderLeft: '4px solid #e0ded7' }}>
                    <h4 className="font-bold text-sm tracking-wider uppercase" style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76', letterSpacing: '0.1em' }}>WISHLIST ITEM</h4>
                    <BookHeart size={20} style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76' }} />
                </div>

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
                                    backgroundColor: theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff'),
                                    color: theme.isDark ? theme.text : '#181A18',
                                    boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'
                                }}
                                onFocus={(e) => {
                                    setIsPriceFocused(true);
                                    e.target.style.borderColor = theme.primary;
                                }}
                                onBlur={(e) => {
                                    setIsPriceFocused(false);
                                    e.target.style.borderColor = '#f0eee7';
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
                                    backgroundColor: (isPriceFocused || form.price) ? (theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')) : 'transparent',
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
                        backgroundColor: theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')
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
                            type="button"
                            onClick={() => setIsMgUnitDropdownOpen(prev => !prev)}
                            onMouseDown={(e) => e.preventDefault()}
                            onTouchStart={(e) => e.preventDefault()}
                            className="flex items-center justify-between gap-3 px-4 py-3 flex-shrink-0 rounded-r-lg relative cursor-pointer transition-all border-none outline-none"
                            data-dropdown-container
                            style={{ 
                                borderLeft: theme.isDark ? '1px solid #4b5563' : `1px solid #f0eee7`,
                                backgroundColor: theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb'),
                                color: theme.isDark ? theme.text : '#181A18',
                                minWidth: '100px'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = theme.isDark ? '#4b5563' : '#f3f4f6';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb');
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
                        {isMgUnitDropdownOpen && (
                            <div className="relative" data-dropdown-container>
                                <div 
                                    className="absolute top-full right-0 mt-1 z-50 rounded-lg shadow-lg border overflow-hidden"
                                    style={{
                                        backgroundColor: theme.isDark ? '#1f2937' : '#ffffff',
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
                                </div>
                            </div>
                        )}
                    </div>
                    <label 
                        className={`absolute left-3 transition-all pointer-events-none outlined-input-label ${(isMgFocused || form.mgAmount) ? 'active' : ''}`}
                        style={{ 
                            top: (isMgFocused || form.mgAmount) ? '-8px' : '14px',
                            left: (isMgFocused || form.mgAmount) ? '12px' : '16px',
                            fontSize: (isMgFocused || form.mgAmount) ? '0.75rem' : '0.9375rem',
                            padding: (isMgFocused || form.mgAmount) ? '0 4px' : '0',
                            background: (isMgFocused || form.mgAmount) ? (theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')) : 'transparent',
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
                
                <div className="flex items-center justify-end gap-3 pt-4 border-t" style={{ borderColor: theme.border }}>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 border"
                        style={{ 
                            borderColor: theme.border,
                            color: theme.text
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !form.name.trim()}
                        className="px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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
                </div>
            </div>
        </Modal>
    );
}

