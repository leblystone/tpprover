import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, BookAlert, Siren } from 'lucide-react';
import { getUnitMultiplier } from '../../utils/unitConversion';
import { isSimpleMode, getLocalTrackingMode } from '../../utils/trackingMode';

export default function OrderItemSubForm({ item, onChange, onRemove, theme, isOnlyItem, hasNameError = false }) {
    const simpleMode = isSimpleMode(getLocalTrackingMode());
    const [isNameFocused, setIsNameFocused] = useState(false);
    const [isAmountFocused, setIsAmountFocused] = useState(false);
    const [isQuantityFocused, setIsQuantityFocused] = useState(false);
    const [isPriceFocused, setIsPriceFocused] = useState(false);
    const [isCostPerMgFocused, setIsCostPerMgFocused] = useState(false);
    const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);
    const [isAmountUnitDropdownOpen, setIsAmountUnitDropdownOpen] = useState(false);
    const lastCalculatedValueRef = useRef(null);
    const userHasEditedRef = useRef(false);

    // Close dropdown when clicking outside
    useEffect(() => {
        if (!isUnitDropdownOpen && !isAmountUnitDropdownOpen) return;

        const handleClickOutside = (event) => {
            // Check if click is inside any dropdown container
            const isClickInside = event.target.closest('[data-dropdown-container]');
            if (!isClickInside) {
                setIsUnitDropdownOpen(false);
                setIsAmountUnitDropdownOpen(false);
            }
        };

        // Small delay to allow dropdown button click handlers to execute first
        const timeoutId = setTimeout(() => {
            document.addEventListener('click', handleClickOutside);
        }, 0);

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
        } else if (unit === 'iu' || unit === 'IU') {
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
        const unitMult = getUnitMultiplier(item.unit);
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

    // Auto-fill cost per unit when calculation is available
    // Updates when calculation changes, but not if user is currently focused on the input field
    useEffect(() => {
        if (calculatedCostPerUnit.value !== null && !isCostPerMgFocused) {
            const formattedValue = calculatedCostPerUnit.value.toFixed(6).replace(/\.?0+$/, '');
            const currentValue = item.costPerMg ? parseFloat(item.costPerMg) : null;
            
            // Check if the current value matches the last calculated value (meaning it was auto-filled)
            const matchesLastCalculated = lastCalculatedValueRef.current !== null && 
                                         currentValue !== null &&
                                         Math.abs(currentValue - lastCalculatedValueRef.current) < 0.000001;
            
            // Update if:
            // 1. Field is empty, OR
            // 2. Current value matches last calculated (was auto-filled), OR
            // 3. User hasn't manually edited
            if (!item.costPerMg || matchesLastCalculated || !userHasEditedRef.current) {
                // Only update if the value actually changed
                if (formattedValue !== String(item.costPerMg || '')) {
                    onChange({ ...item, costPerMg: formattedValue });
                    lastCalculatedValueRef.current = calculatedCostPerUnit.value;
                }
            }
        } else if (calculatedCostPerUnit.value === null) {
            // Clear the ref when calculation is invalid
            lastCalculatedValueRef.current = null;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [calculatedCostPerUnit.value, calculatedCostPerUnit.unit, isCostPerMgFocused]);

    const handleChange = (field, value) => {
        if (field === 'costPerMg') {
            // Mark that user has manually edited the cost per field
            userHasEditedRef.current = true;
            // Clear the last calculated value ref since user is overriding
            lastCalculatedValueRef.current = null;
        }
        onChange({ ...item, [field]: value });
    };
    
    // Reset user edit flag when costPerMg is cleared or when calculation inputs change
    // This allows auto-update when user changes price, amount, quantity, or unit
    useEffect(() => {
        if (!item.costPerMg) {
            userHasEditedRef.current = false;
            lastCalculatedValueRef.current = null;
        }
    }, [item.costPerMg, item.price, item.mg, item.quantity, item.unit, item.mgUnit]);

    return (
        <div className="px-3 pt-3 pb-2 rounded-lg relative" style={{ 
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
            <div className="space-y-2">
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
                            <Siren size={14} style={{ color: '#c87a5c' }} />
                            <span>Peptide name is required</span>
                        </div>
                    )}
                </div>
                
                {/* Row 2: Amount and Quantity */}
                <div className="grid grid-cols-2 gap-3">
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
                                        const relatedTarget = e.relatedTarget || document.activeElement
                                        const isClickingDropdown = relatedTarget?.closest('[data-dropdown-container]')
                                        if (!isClickingDropdown && !isAmountUnitDropdownOpen) {
                                            setIsAmountFocused(false)
                                        }
                                    }, 150)
                                }}
                                placeholder=" "
                                className="flex-1 py-3 px-3 outline-none min-w-0 rounded-l-lg transition-all"
                                style={{
                                    backgroundColor: 'transparent',
                                    color: theme.isDark ? theme.text : '#181A18',
                                    border: 'none'
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    setIsUnitDropdownOpen(false); // Close quantity dropdown if open
                                    setIsAmountUnitDropdownOpen(prev => !prev);
                                }}
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
                                    minWidth: '72px'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = theme.isDark ? '#4b5563' : '#f3f4f6';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb');
                                }}
                            >
                                <span className="text-sm font-semibold truncate">
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
                                    setTimeout(() => {
                                        const relatedTarget = e.relatedTarget || document.activeElement
                                        const isClickingDropdown = relatedTarget?.closest('[data-dropdown-container]')
                                        if (!isClickingDropdown && !isUnitDropdownOpen) {
                                            setIsQuantityFocused(false)
                                        }
                                    }, 150)
                                }}
                                placeholder=" "
                                className="flex-1 px-3 py-3 outline-none min-w-0 rounded-l-lg transition-all"
                                style={{
                                    backgroundColor: 'transparent',
                                    color: theme.isDark ? theme.text : '#181A18',
                                    border: 'none'
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    setIsAmountUnitDropdownOpen(false); // Close amount dropdown if open
                                    setIsUnitDropdownOpen(prev => !prev);
                                }}
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
                                    minWidth: '72px'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = theme.isDark ? '#4b5563' : '#f3f4f6';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb');
                                }}
                            >
                                <span className="text-sm font-semibold truncate">
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
                        {/* Kit to Vial conversion tooltip */}
                        {String(item.unit || 'vial').toLowerCase() === 'kit' && (
                            <div className="mt-1 text-xs flex items-center justify-center gap-1" style={{ color: theme.textLight || theme.text }}>
                                <BookAlert size={14} style={{ color: theme.primary }} />
                                <span>
                                    {(() => {
                                        const kitQuantity = Number(item.quantity) || 1;
                                        const totalVials = kitQuantity * 10;
                                        return `${kitQuantity} ${kitQuantity === 1 ? 'kit' : 'kits'} = ${totalVials} ${totalVials === 1 ? 'vial' : 'vials'}`;
                                    })()}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Row 3: Price and Cost per Milligram */}
                {!simpleMode && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                    {/* Price Column — same wrapper style as Amount (border/shadow/bg on wrapper, input borderless) */}
                    <div className="relative overflow-visible min-w-0">
                        <div
                            className="rounded-lg flex items-stretch"
                            style={{
                                border: '1px solid #f0eee7',
                                boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)',
                                backgroundColor: theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')
                            }}
                        >
                            {(item.price != null && String(item.price).trim() !== '') && (
                                <span
                                    className="absolute pointer-events-none z-10"
                                    style={{
                                        left: 13,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        fontSize: '1rem',
                                        fontWeight: 500,
                                        color: theme.isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)'
                                    }}
                                >
                                    $
                                </span>
                            )}
                            <input
                                type="text"
                                id={`price-input-${item.id || 'new'}`}
                                value={item.price || ''}
                                onChange={e => handleChange('price', e.target.value)}
                                onFocus={() => setIsPriceFocused(true)}
                                onBlur={() => setIsPriceFocused(false)}
                                placeholder=" "
                                className="flex-1 min-w-0 py-3 px-3 rounded-lg outline-none transition-all border-none"
                                style={{
                                    backgroundColor: 'transparent',
                                    color: theme.isDark ? theme.text : '#181A18',
                                    paddingLeft: (item.price != null && String(item.price).trim() !== '') ? 24 : 12
                                }}
                            />
                        </div>
                        <label 
                            htmlFor={`price-input-${item.id || 'new'}`}
                            className="absolute pointer-events-none transition-all whitespace-nowrap"
                            style={{
                                fontSize: (isPriceFocused || (item.price && String(item.price).trim())) ? '0.65rem' : '0.875rem',
                                top: (isPriceFocused || (item.price && String(item.price).trim())) ? '-8px' : '14px',
                                left: (isPriceFocused || (item.price && String(item.price).trim())) ? '12px' : '16px',
                                padding: (isPriceFocused || (item.price && String(item.price).trim())) ? '0 4px' : '0',
                                background: (isPriceFocused || (item.price && String(item.price).trim())) ? (theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')) : 'transparent',
                                color: (isPriceFocused || (item.price && String(item.price).trim())) ? theme.primary : (theme.textLight || theme.text),
                                fontWeight: 500
                            }}
                        >
                            Price
                        </label>
                    </div>

                    {/* Cost per Milligram Column — same wrapper style as Amount */}
                    <div className="relative overflow-visible min-w-0">
                        <div
                            className="rounded-lg flex items-stretch"
                            style={{
                                border: '1px solid #f0eee7',
                                boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)',
                                backgroundColor: theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')
                            }}
                        >
                            {(item.costPerMg != null && String(item.costPerMg).trim() !== '') && (
                                <span
                                    className="absolute pointer-events-none z-10"
                                    style={{
                                        left: 13,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        fontSize: '1rem',
                                        fontWeight: 500,
                                        color: theme.isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)'
                                    }}
                                >
                                    $
                                </span>
                            )}
                            <input
                                type="text"
                                id={`costpermg-input-${item.id || 'new'}`}
                                value={item.costPerMg || ''}
                                onChange={e => handleChange('costPerMg', e.target.value)}
                                onFocus={() => setIsCostPerMgFocused(true)}
                                onBlur={() => setIsCostPerMgFocused(false)}
                                placeholder=" "
                                className="flex-1 min-w-0 py-3 px-3 rounded-lg outline-none transition-all border-none"
                                style={{
                                    backgroundColor: 'transparent',
                                    color: theme.isDark ? theme.text : '#181A18',
                                    paddingLeft: (item.costPerMg != null && String(item.costPerMg).trim() !== '') ? 24 : 12
                                }}
                            />
                        </div>
                        <label 
                            htmlFor={`costpermg-input-${item.id || 'new'}`}
                            className="absolute pointer-events-none transition-all whitespace-nowrap"
                            style={{
                                fontSize: (isCostPerMgFocused || (item.costPerMg && String(item.costPerMg).trim())) ? '0.65rem' : '0.875rem',
                                top: (isCostPerMgFocused || (item.costPerMg && String(item.costPerMg).trim())) ? '-8px' : '14px',
                                left: (isCostPerMgFocused || (item.costPerMg && String(item.costPerMg).trim())) ? '12px' : '16px',
                                padding: (isCostPerMgFocused || (item.costPerMg && String(item.costPerMg).trim())) ? '0 4px' : '0',
                                background: (isCostPerMgFocused || (item.costPerMg && String(item.costPerMg).trim())) ? (theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')) : 'transparent',
                                color: (isCostPerMgFocused || (item.costPerMg && String(item.costPerMg).trim())) ? theme.primary : (theme.textLight || theme.text),
                                fontWeight: 500
                            }}
                            title={calculatedCostPerUnit.label}
                        >
                            Cost per {calculatedCostPerUnit.unit}
                        </label>
                    </div>
                </div>
                )}
            </div>
        </div>
    );
}
