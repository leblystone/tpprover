import React, { useState, useEffect, useRef } from 'react';

/**
 * Combined Dosage Input - integrates amount and unit into a single component
 * Shows number input on left with unit selector pills on the right side
 */
export default function CombinedDosageInput({ 
    value = { amount: '', unit: 'mcg' }, 
    onChange, 
    theme,
    deliveryMethod = 'pipette',
    placeholder = "250, 0.5, or 2",
    units = null, // Optional: override default units
    outlined = false,
    customTextColor = null,
    customShadow = null,
    id = 'dose-input'
}) {
    const [isFocused, setIsFocused] = useState(false);
    const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);
    const inputRef = useRef(null);
    // Determine units to display based on delivery method
    // Match the recon calculator: mcg, mg, mL, iu, and sprays
    // Always include all units to match recon calculator
    const displayUnits = units || ['mcg', 'mg', 'mL', 'iu', 'sprays'];

    // Close dropdown when delivery method changes
    useEffect(() => {
        setIsUnitDropdownOpen(false);
    }, [deliveryMethod]);

    const handleAmountChange = (e) => {
        const input = e.target;
        const newAmount = input.value;
        const { selectionStart, selectionEnd } = input;

        onChange({ ...value, amount: newAmount });

        // Restore cursor after React re-render (fixes mobile "insert at start" bug)
        requestAnimationFrame(() => {
            if (inputRef.current && document.activeElement === inputRef.current) {
                const len = newAmount.length;
                const newStart = Math.min(selectionStart ?? len, len);
                const newEnd = Math.min(selectionEnd ?? len, len);
                inputRef.current.setSelectionRange(newStart, newEnd);
            }
        });
    };

    const handleUnitChange = (newUnit) => {
        onChange({ ...value, unit: newUnit });
    };

    const currentUnit = value?.unit || 'mcg';

    if (outlined) {
        return (
            <div className="relative">
                <div 
                    className="flex items-stretch rounded-lg"
                    style={{ 
                        border: `1px solid ${isFocused ? theme.primary : (theme.isDark ? '#4b5563' : '#f0eee7')}`,
                        boxShadow: customShadow || (theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'),
                        backgroundColor: theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')
                    }}
                >
                    {/* Amount Input */}
                    <input
                        ref={inputRef}
                        type="text"
                        id={id}
                        inputMode="decimal"
                        value={value?.amount || ''}
                        onInput={handleAmountChange}
                        onFocus={() => setIsFocused(true)}
                        onBlur={(e) => {
                            setTimeout(() => {
                                const relatedTarget = e.relatedTarget || document.activeElement;
                                const isClickingDropdown = relatedTarget?.closest('[data-dropdown-container]');
                                if (!isClickingDropdown && !isUnitDropdownOpen) {
                                    setIsFocused(false);
                                }
                            }, 150);
                        }}
                        placeholder=" "
                        className="flex-1 py-3 outline-none min-w-0 rounded-l-lg"
                        style={{ 
                            backgroundColor: 'transparent',
                            color: customTextColor && !theme.isDark ? customTextColor : theme.text,
                            border: 'none',
                            paddingLeft: '12px',
                            paddingRight: '8px'
                        }}
                        autoComplete="off"
                    />
                    
                    {/* Unit Dropdown Button */}
                    <button
                        type="button"
                        onClick={() => setIsUnitDropdownOpen(!isUnitDropdownOpen)}
                        onMouseDown={(e) => e.preventDefault()}
                        onTouchStart={(e) => e.preventDefault()}
                        className="flex items-center justify-between gap-2 px-3 py-3 flex-shrink-0 rounded-r-lg relative cursor-pointer transition-all border-none outline-none"
                        data-dropdown-container
                        style={{ 
                            borderLeft: theme.isDark ? '1px solid #4b5563' : `1px solid #f0eee7`,
                            backgroundColor: theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb'),
                            color: theme.isDark ? theme.text : '#181A18',
                            minWidth: '80px'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = theme.isDark ? '#4b5563' : '#f3f4f6';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb');
                        }}
                    >
                        <span className="text-sm font-semibold">
                            {currentUnit === 'iu' ? 'IU' : currentUnit}
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
                                    minWidth: '100px',
                                    boxShadow: theme.isDark ? '0 4px 6px rgba(0,0,0,0.3)' : '0 4px 6px rgba(0,0,0,0.1)'
                                }}
                            >
                                {displayUnits.map((unit, idx) => (
                                    <React.Fragment key={unit}>
                                        {idx > 0 && (
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
                                                handleUnitChange(unit);
                                                setIsUnitDropdownOpen(false);
                                            }}
                                            className="w-full text-left px-3 py-2 text-sm transition-all touch-manipulation"
                                            style={{
                                                color: currentUnit === unit ? theme.primary : theme.text,
                                                backgroundColor: 'transparent',
                                                WebkitTapHighlightColor: 'transparent'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = theme.primaryLight || `${theme.primary}20`;
                                                e.currentTarget.style.color = theme.primary;
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                                e.currentTarget.style.color = currentUnit === unit ? theme.primary : theme.text;
                                            }}
                            >
                                {unit === 'iu' ? 'IU' : unit}
                            </button>
                                    </React.Fragment>
                        ))}
                    </div>
                        </div>
                    )}
                </div>
                {/* Adaptive Label */}
                <label 
                    htmlFor={id}
                    className="absolute pointer-events-none transition-all"
                    style={{
                        fontSize: (isFocused || (value?.amount && String(value.amount).trim())) ? '0.75rem' : '0.9375rem',
                        top: (isFocused || (value?.amount && String(value.amount).trim())) ? '-8px' : '14px',
                        left: (isFocused || (value?.amount && String(value.amount).trim())) ? '12px' : '16px',
                        padding: (isFocused || (value?.amount && String(value.amount).trim())) ? '0 4px' : '0',
                        background: (isFocused || (value?.amount && String(value.amount).trim())) ? (theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')) : 'transparent',
                        color: (isFocused || (value?.amount && String(value.amount).trim())) ? theme.primary : (theme.textLight || theme.text),
                        fontWeight: 500
                    }}
                >
                    Dose
                </label>
            </div>
        );
    }

    return (
        <div className="relative">
            <div 
                className="flex items-stretch rounded-lg overflow-hidden"
                style={{ 
                    boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.4)' : '0 1px 2px rgba(0,0,0,0.05)'
                }}
            >
                {/* Amount Input */}
                <input
                    ref={inputRef}
                    type="text"
                    id={id}
                    inputMode="decimal"
                    value={value?.amount || ''}
                    onInput={handleAmountChange}
                    placeholder={placeholder}
                    className="flex-1 px-3 py-2 outline-none min-w-0 border-0 focus:ring-0"
                    style={{ 
                        backgroundColor: theme.isDark ? '#1f2937' : (theme.inputBackground || '#fff'),
                        color: theme.text 
                    }}
                    autoComplete="off"
                />
                
                {/* Unit Dropdown Button */}
                <button
                    type="button"
                    onClick={() => setIsUnitDropdownOpen(!isUnitDropdownOpen)}
                    onMouseDown={(e) => e.preventDefault()}
                    onTouchStart={(e) => e.preventDefault()}
                    className="flex items-center justify-between gap-2 px-3 py-2 flex-shrink-0 relative cursor-pointer transition-all border-none outline-none"
                    data-dropdown-container
                    style={{ 
                        backgroundColor: theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb'),
                        color: theme.text,
                        minWidth: '80px'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme.isDark ? '#4b5563' : '#f3f4f6';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb');
                    }}
                >
                    <span className="text-sm font-semibold">
                        {currentUnit === 'iu' ? 'IU' : currentUnit}
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
                                minWidth: '100px',
                                boxShadow: theme.isDark ? '0 4px 6px rgba(0,0,0,0.3)' : '0 4px 6px rgba(0,0,0,0.1)'
                            }}
                        >
                            {displayUnits.map((unit, idx) => (
                                <React.Fragment key={unit}>
                                    {idx > 0 && (
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
                                            handleUnitChange(unit);
                                            setIsUnitDropdownOpen(false);
                                        }}
                                        className="w-full text-left px-3 py-2 text-sm transition-all touch-manipulation"
                                        style={{
                                            color: currentUnit === unit ? theme.primary : theme.text,
                                            backgroundColor: 'transparent',
                                            WebkitTapHighlightColor: 'transparent'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = theme.primaryLight || `${theme.primary}20`;
                                            e.currentTarget.style.color = theme.primary;
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                            e.currentTarget.style.color = currentUnit === unit ? theme.primary : theme.text;
                                        }}
                        >
                            {unit === 'iu' ? 'IU' : unit}
                        </button>
                                </React.Fragment>
                    ))}
                </div>
                    </div>
                )}
            </div>

            {/* Nasal spray disclaimer */}
            {deliveryMethod === 'nasal' && currentUnit === 'sprays' && (
                <div className="text-xs text-blue-600 mt-2 p-2 bg-blue-50 rounded border border-blue-200 whitespace-nowrap text-center">
                    💡 Assumes 100 mcg per spray (typical nasal spray)
                </div>
            )}
        </div>
    );
}

