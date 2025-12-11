import React, { useState, useMemo, useEffect } from 'react';
import { X } from 'lucide-react';

export default function OrderItemSubForm({ item, onChange, onRemove, theme, isOnlyItem, hasNameError = false }) {
    const [isNameFocused, setIsNameFocused] = useState(false);
    const [isAmountFocused, setIsAmountFocused] = useState(false);
    const [isQuantityFocused, setIsQuantityFocused] = useState(false);
    const [isPriceFocused, setIsPriceFocused] = useState(false);
    const [isCostPerMgFocused, setIsCostPerMgFocused] = useState(false);
    const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);
    const [isAmountUnitDropdownOpen, setIsAmountUnitDropdownOpen] = useState(false);

    // Close dropdown when clicking outside
    useEffect(() => {
        if (!isUnitDropdownOpen && !isAmountUnitDropdownOpen) return;

        const handleClickOutside = (event) => {
            const isClickInside = event.target.closest('[data-dropdown-container]');
            if (!isClickInside) {
                setIsUnitDropdownOpen(false);
                setIsAmountUnitDropdownOpen(false);
            }
        };

        // Use a small delay to allow dropdown button click to register
        const timeoutId = setTimeout(() => {
            document.addEventListener('click', handleClickOutside);
        }, 100);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('click', handleClickOutside);
        };
    }, [isUnitDropdownOpen, isAmountUnitDropdownOpen]);

    // Get the label for cost per unit based on selected dosage unit
    const getCostPerUnitLabel = (mgUnit) => {
        const unit = (mgUnit || 'mg').toLowerCase();
        if (unit === 'mg') {
            return 'Cost per Milligram ($/mg)';
        } else if (unit === 'g') {
            return 'Cost per Gram ($/g)';
        } else if (unit === 'ml') {
            return 'Cost per Milliliter ($/mL)';
        } else if (unit === 'iu') {
            return 'Cost per IU ($/IU)';
        }
        return 'Cost per Milligram ($/mg)';
    };

    // Calculate cost per unit based on current values and selected dosage unit
    // Returns an object with the calculated value and the appropriate unit label
    const calculatedCostPerUnit = useMemo(() => {
        const price = parseFloat(item.price) || 0;
        const amount = Number(item.mg) || 0;
        const quantity = Math.max(1, Number(item.quantity) || 1);
        const unitMult = String(item.unit || 'vial').toLowerCase() === 'kit' ? 10 : 1;
        const mgUnit = (item.mgUnit || 'mg').toLowerCase();
        
        // Get the label based on unit (always show appropriate label)
        const label = getCostPerUnitLabel(mgUnit);
        
        if (price <= 0 || amount <= 0) {
            return { value: null, unit: mgUnit, label };
        }
        
        // Calculate cost per unit based on selected unit
        if (mgUnit === 'mg') {
            // Cost per milligram
            const totalMg = amount * quantity * unitMult;
            if (totalMg > 0) {
                return { 
                    value: price / totalMg, 
                    unit: 'mg', 
                    label 
                };
            }
        } else if (mgUnit === 'g') {
            // Cost per gram
            const totalG = amount * quantity * unitMult;
            if (totalG > 0) {
                return { 
                    value: price / totalG, 
                    unit: 'g', 
                    label 
                };
            }
        } else if (mgUnit === 'ml') {
            // Cost per milliliter
            const totalMl = amount * quantity * unitMult;
            if (totalMl > 0) {
                return { 
                    value: price / totalMl, 
                    unit: 'mL', 
                    label 
                };
            }
        } else if (mgUnit === 'iu') {
            // Cost per International Unit
            const totalIu = amount * quantity * unitMult;
            if (totalIu > 0) {
                return { 
                    value: price / totalIu, 
                    unit: 'IU', 
                    label 
                };
            }
        }
        
        return { value: null, unit: mgUnit, label };
    }, [item.price, item.mg, item.quantity, item.unit, item.mgUnit]);

    // Auto-fill cost per unit when calculation is available and field is empty
    useEffect(() => {
        if (calculatedCostPerUnit.value !== null && !item.costPerMg) {
            // Format the value to a reasonable number of decimal places
            const formattedValue = calculatedCostPerUnit.value.toFixed(6).replace(/\.?0+$/, '');
            onChange({ ...item, costPerMg: formattedValue });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [calculatedCostPerUnit.value, calculatedCostPerUnit.unit, item.costPerMg]);

    const handleChange = (field, value) => {
        onChange({ ...item, [field]: value });
    };

    return (
        <div className="p-3 rounded-lg relative" style={{ 
            border: theme.isDark ? 'none' : `1px solid ${theme.border}`,
            backgroundColor: theme.isDark ? '#1f2937' : '#f9fafb',
            boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.05)'
        }}>
            {!isOnlyItem && (
                <button 
                    type="button" 
                    onClick={onRemove} 
                    className="absolute -top-2 -right-2 p-1 text-white rounded-full transition-all hover:scale-110 active:scale-95" 
                    style={{
                        background: 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #b5684a 0%, #a35a3f 100%)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)';
                    }}
                    aria-label="Remove item"
                >
                    <X size={14} />
                </button>
            )}
            <div className="space-y-3">
                {/* Row 1: Name */}
                <div className="relative">
                    <input
                        type="text"
                        id={`name-input-${item.id || 'new'}`}
                        value={item.name || ''}
                        onChange={e => handleChange('name', e.target.value)}
                        onFocus={() => setIsNameFocused(true)}
                        onBlur={() => setIsNameFocused(false)}
                        placeholder=" "
                        className="w-full px-3 py-3 rounded-lg outline-none transition-all"
                        style={{
                            border: hasNameError ? `2px solid #c87a5c` : `1px solid #f0eee7`,
                            boxShadow: hasNameError 
                                ? (theme.isDark ? '0 0 0 3px rgba(200, 122, 92, 0.2)' : '0 0 0 3px rgba(200, 122, 92, 0.1)')
                                : (theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'),
                            backgroundColor: theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff'),
                            color: theme.isDark ? theme.text : '#181A18'
                        }}
                    />
                    <label 
                        htmlFor={`name-input-${item.id || 'new'}`}
                        className="absolute pointer-events-none transition-all"
                        style={{
                            fontSize: (isNameFocused || (item.name && String(item.name).trim())) ? '0.75rem' : '0.9375rem',
                            top: (isNameFocused || (item.name && String(item.name).trim())) ? '-8px' : '14px',
                            left: (isNameFocused || (item.name && String(item.name).trim())) ? '12px' : '16px',
                            padding: (isNameFocused || (item.name && String(item.name).trim())) ? '0 4px' : '0',
                            background: (isNameFocused || (item.name && String(item.name).trim())) ? (theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')) : 'transparent',
                            color: hasNameError ? '#c87a5c' : ((isNameFocused || (item.name && String(item.name).trim())) ? theme.primary : (theme.textLight || theme.text)),
                            fontWeight: 500
                        }}
                    >
                        Peptide/Amino Name {hasNameError && <span style={{ color: '#c87a5c' }}>*</span>}
                    </label>
                    {hasNameError && (
                        <div className="mt-1 text-xs flex items-center gap-1" style={{ color: '#c87a5c' }}>
                            <span>⚠️</span>
                            <span>Peptide name is required</span>
                        </div>
                    )}
                </div>
                
                {/* Row 2: Amount and Quantity */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="relative">
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
                                id={`amount-input-${item.id || 'new'}`}
                                value={item.mg || ''} 
                                onChange={e => handleChange('mg', e.target.value)} 
                                onFocus={() => setIsAmountFocused(true)}
                                onBlur={(e) => {
                                    // Delay blur to allow dropdown clicks to register on mobile
                                    setTimeout(() => {
                                        // Only blur if dropdown is closed or if focus moved outside the dropdown container
                                        const relatedTarget = e.relatedTarget || document.activeElement
                                        const isClickingDropdown = relatedTarget?.closest('[data-dropdown-container]')
                                        if (!isClickingDropdown && !isAmountUnitDropdownOpen) {
                                            setIsAmountFocused(false)
                                        }
                                    }, 150)
                                }}
                                placeholder=" "
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
                                onClick={() => setIsAmountUnitDropdownOpen(prev => !prev)}
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
                                    {(item.mgUnit || 'mg')}
                                </span>
                                <svg width="14" height="14" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                            {isAmountUnitDropdownOpen && (
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
                                            { value: 'mL', label: 'mL' },
                                            { value: 'g', label: 'g' },
                                            { value: 'IU', label: 'IU' }
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
                                                        handleChange('mgUnit', option.value);
                                                        setIsAmountUnitDropdownOpen(false);
                                                    }}
                                                    className="w-full text-left px-3 py-2 text-sm transition-all touch-manipulation"
                                                    style={{
                                                        color: (item.mgUnit || 'mg') === option.value ? theme.primary : theme.text,
                                                        backgroundColor: 'transparent',
                                                        WebkitTapHighlightColor: 'transparent'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.backgroundColor = theme.primaryLight || `${theme.primary}20`;
                                                        e.currentTarget.style.color = theme.primary;
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.backgroundColor = 'transparent';
                                                        e.currentTarget.style.color = (item.mgUnit || 'mg') === option.value ? theme.primary : theme.text;
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
                            htmlFor={`amount-input-${item.id || 'new'}`}
                            className="absolute pointer-events-none transition-all"
                            style={{
                                fontSize: (isAmountFocused || (item.mg && String(item.mg).trim())) ? '0.65rem' : '0.875rem',
                                top: (isAmountFocused || (item.mg && String(item.mg).trim())) ? '-8px' : '14px',
                                left: (isAmountFocused || (item.mg && String(item.mg).trim())) ? '12px' : '16px',
                                padding: (isAmountFocused || (item.mg && String(item.mg).trim())) ? '0 4px' : '0',
                                background: (isAmountFocused || (item.mg && String(item.mg).trim())) ? (theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')) : 'transparent',
                                color: (isAmountFocused || (item.mg && String(item.mg).trim())) ? theme.primary : (theme.textLight || theme.text),
                                fontWeight: 500
                            }}
                        >
                            Amount
                        </label>
                    </div>
                    <div className="relative">
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
                                id={`quantity-input-${item.id || 'new'}`}
                                value={item.quantity || ''} 
                                onChange={e => handleChange('quantity', e.target.value)} 
                                onFocus={() => setIsQuantityFocused(true)}
                                onBlur={(e) => {
                                    // Delay blur to allow dropdown clicks to register on mobile
                                    setTimeout(() => {
                                        // Only blur if dropdown is closed or if focus moved outside the dropdown container
                                        const relatedTarget = e.relatedTarget || document.activeElement
                                        const isClickingDropdown = relatedTarget?.closest('[data-dropdown-container]')
                                        if (!isClickingDropdown && !isUnitDropdownOpen) {
                                            setIsQuantityFocused(false)
                                        }
                                    }, 150)
                                }}
                                placeholder=" "
                                className="flex-1 px-3 py-3 outline-none min-w-0 rounded-l-lg"
                                style={{
                                    backgroundColor: 'transparent',
                                    color: theme.isDark ? theme.text : '#181A18',
                                    border: 'none'
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setIsUnitDropdownOpen(prev => !prev)}
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
                                        const unit = (item.unit || 'vial').toLowerCase();
                                        const quantity = Number(item.quantity) || 1;
                                        
                                        // Pluralization rules
                                        if (unit === 'vial') {
                                            return quantity === 1 ? 'Vial' : 'Vials';
                                        } else if (unit === 'kit') {
                                            return quantity === 1 ? 'Kit' : 'Kits';
                                        } else if (unit === 'bottle') {
                                            return quantity === 1 ? 'Bottle' : 'Bottles';
                                        } else if (unit === 'tablets') {
                                            return 'Tablets'; // Already plural
                                        }
                                        // Default: capitalize first letter
                                        return unit.charAt(0).toUpperCase() + unit.slice(1);
                                    })()}
                                </span>
                                <svg width="14" height="14" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                            {isUnitDropdownOpen && (
                                <div className="relative" data-dropdown-container>
                                    <div 
                                        className="absolute top-full right-0 mt-1 z-50 rounded-lg shadow-lg border overflow-hidden"
                                        style={{
                                            backgroundColor: theme.isDark ? '#1f2937' : '#ffffff',
                                            borderColor: theme.border,
                                            minWidth: '120px',
                                            boxShadow: theme.isDark ? '0 4px 6px rgba(0,0,0,0.3)' : '0 4px 6px rgba(0,0,0,0.1)'
                                        }}
                                    >
                                        {[
                                            { value: 'vial', label: 'Vial' },
                                            { value: 'kit', label: 'Kit' },
                                            { value: 'bottle', label: 'Bottle' },
                                            { value: 'tablets', label: 'Tablets' }
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
                                                        handleChange('unit', option.value);
                                                        setIsUnitDropdownOpen(false);
                                                    }}
                                                    className="w-full text-left px-3 py-2 text-sm transition-all touch-manipulation"
                                                    style={{
                                                        color: (item.unit || 'vial') === option.value ? theme.primary : theme.text,
                                                        backgroundColor: 'transparent',
                                                        WebkitTapHighlightColor: 'transparent'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.backgroundColor = theme.primaryLight || `${theme.primary}20`;
                                                        e.currentTarget.style.color = theme.primary;
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.backgroundColor = 'transparent';
                                                        e.currentTarget.style.color = (item.unit || 'vial') === option.value ? theme.primary : theme.text;
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
                            htmlFor={`quantity-input-${item.id || 'new'}`}
                            className="absolute pointer-events-none transition-all"
                            style={{
                                fontSize: (isQuantityFocused || (item.quantity && String(item.quantity).trim())) ? '0.65rem' : '0.875rem',
                                top: (isQuantityFocused || (item.quantity && String(item.quantity).trim())) ? '-8px' : '14px',
                                left: (isQuantityFocused || (item.quantity && String(item.quantity).trim())) ? '12px' : '16px',
                                padding: (isQuantityFocused || (item.quantity && String(item.quantity).trim())) ? '0 4px' : '0',
                                background: (isQuantityFocused || (item.quantity && String(item.quantity).trim())) ? (theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')) : 'transparent',
                                color: (isQuantityFocused || (item.quantity && String(item.quantity).trim())) ? theme.primary : (theme.textLight || theme.text),
                                fontWeight: 500
                            }}
                        >
                            Quantity
                        </label>
                    </div>
                </div>
                
                {/* Row 3: Price and Cost per Milligram */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Price Column */}
                    <div className="relative">
                        <input
                            type="text"
                            id={`price-input-${item.id || 'new'}`}
                            value={item.price || ''}
                            onChange={e => handleChange('price', e.target.value)}
                            onFocus={() => setIsPriceFocused(true)}
                            onBlur={() => setIsPriceFocused(false)}
                            placeholder=" "
                            className="w-full px-3 py-3 rounded-lg outline-none transition-all"
                            style={{
                                border: `1px solid #f0eee7`,
                                boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)',
                                backgroundColor: theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff'),
                                color: theme.isDark ? theme.text : '#181A18'
                            }}
                        />
                        <label 
                            htmlFor={`price-input-${item.id || 'new'}`}
                            className="absolute pointer-events-none transition-all"
                            style={{
                                fontSize: (isPriceFocused || (item.price && String(item.price).trim())) ? '0.75rem' : '0.9375rem',
                                top: (isPriceFocused || (item.price && String(item.price).trim())) ? '-8px' : '14px',
                                left: (isPriceFocused || (item.price && String(item.price).trim())) ? '12px' : '16px',
                                padding: (isPriceFocused || (item.price && String(item.price).trim())) ? '0 4px' : '0',
                                background: (isPriceFocused || (item.price && String(item.price).trim())) ? (theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')) : 'transparent',
                                color: (isPriceFocused || (item.price && String(item.price).trim())) ? theme.primary : (theme.textLight || theme.text),
                                fontWeight: 500
                            }}
                        >
                            Price ($)
                        </label>
                    </div>

                    {/* Cost per Milligram Column */}
                    <div className="relative">
                        <input
                            type="text"
                            id={`costpermg-input-${item.id || 'new'}`}
                            value={item.costPerMg || ''}
                            onChange={e => handleChange('costPerMg', e.target.value)}
                            onFocus={() => setIsCostPerMgFocused(true)}
                            onBlur={() => setIsCostPerMgFocused(false)}
                            placeholder=" "
                            className="w-full px-3 py-3 rounded-lg outline-none transition-all"
                            style={{
                                border: `1px solid #f0eee7`,
                                boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)',
                                backgroundColor: theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff'),
                                color: theme.isDark ? theme.text : '#181A18'
                            }}
                        />
                        <label 
                            htmlFor={`costpermg-input-${item.id || 'new'}`}
                            className="absolute pointer-events-none transition-all"
                            style={{
                                fontSize: (isCostPerMgFocused || (item.costPerMg && String(item.costPerMg).trim())) ? '0.75rem' : '0.9375rem',
                                top: (isCostPerMgFocused || (item.costPerMg && String(item.costPerMg).trim())) ? '-8px' : '14px',
                                left: (isCostPerMgFocused || (item.costPerMg && String(item.costPerMg).trim())) ? '12px' : '16px',
                                padding: (isCostPerMgFocused || (item.costPerMg && String(item.costPerMg).trim())) ? '0 4px' : '0',
                                background: (isCostPerMgFocused || (item.costPerMg && String(item.costPerMg).trim())) ? (theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')) : 'transparent',
                                color: (isCostPerMgFocused || (item.costPerMg && String(item.costPerMg).trim())) ? theme.primary : (theme.textLight || theme.text),
                                fontWeight: 500
                            }}
                        >
                            {calculatedCostPerUnit.label}
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
}
