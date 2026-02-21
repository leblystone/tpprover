import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const DROPDOWN_MIN_WIDTH = 100;

/**
 * Gets or creates a singleton fixed portal root that lives as a direct child of <body>,
 * AFTER the modal portals, so it's always painted on top regardless of transforms/compositing.
 */
function getPortalRoot() {
    let el = document.getElementById('__dosage-dropdown-root__');
    if (!el) {
        el = document.createElement('div');
        el.id = '__dosage-dropdown-root__';
        el.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;overflow:visible;z-index:2147483647;pointer-events:none;';
        document.body.appendChild(el);
    }
    return el;
}

/**
 * Combined Dosage Input - integrates amount and unit into a single component
 * Shows number input on left with unit selector pills on the right side
 * Dropdown portals into a singleton body div appended after all modals,
 * so it always paints on top on iOS (even with GPU-composited transform layers).
 */
export default function CombinedDosageInput({ 
    value = { amount: '', unit: 'mcg' }, 
    onChange, 
    theme,
    deliveryMethod = 'pipette',
    placeholder = "250, 0.5, or 2",
    units = null,
    outlined = false,
    customTextColor = null,
    customShadow = null,
    id = 'dose-input'
}) {
    const [isFocused, setIsFocused] = useState(false);
    const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);
    const [dropdownRect, setDropdownRect] = useState(null);
    const inputRef = useRef(null);
    const triggerRef = useRef(null);
    const portalRootRef = useRef(null);

    const displayUnits = units || ['mcg', 'mg', 'mL', 'IU', 'sprays'];

    // Ensure portal root exists and is last child of body (paints last = on top)
    useEffect(() => {
        portalRootRef.current = getPortalRoot();
        // Move to end of body so it's painted after all modals
        document.body.appendChild(portalRootRef.current);
    }, []);

    useEffect(() => {
        setIsUnitDropdownOpen(false);
    }, [deliveryMethod]);

    const updateRect = () => {
        if (!triggerRef.current) return;
        const r = triggerRef.current.getBoundingClientRect();
        setDropdownRect({ top: r.bottom + 4, left: r.right, right: window.innerWidth - r.right });
    };

    useEffect(() => {
        if (!isUnitDropdownOpen) { setDropdownRect(null); return; }
        requestAnimationFrame(updateRect);
        window.addEventListener('scroll', updateRect, true);
        window.addEventListener('resize', updateRect);
        return () => {
            window.removeEventListener('scroll', updateRect, true);
            window.removeEventListener('resize', updateRect);
        };
    }, [isUnitDropdownOpen]);

    // Close on outside click/touch
    useEffect(() => {
        if (!isUnitDropdownOpen) return;
        const close = (e) => {
            if (!e.target.closest('[data-dosage-dropdown]')) {
                setIsUnitDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', close);
        document.addEventListener('touchstart', close);
        return () => {
            document.removeEventListener('mousedown', close);
            document.removeEventListener('touchstart', close);
        };
    }, [isUnitDropdownOpen]);

    const handleAmountChange = (e) => {
        const input = e.target;
        const newAmount = input.value;
        const { selectionStart, selectionEnd } = input;
        onChange({ ...value, amount: newAmount });
        requestAnimationFrame(() => {
            if (inputRef.current && document.activeElement === inputRef.current) {
                const len = newAmount.length;
                inputRef.current.setSelectionRange(
                    Math.min(selectionStart ?? len, len),
                    Math.min(selectionEnd ?? len, len)
                );
            }
        });
    };

    const handleUnitChange = (newUnit) => {
        onChange({ ...value, unit: newUnit });
        setIsUnitDropdownOpen(false);
    };

    const currentUnit = value?.unit || 'mcg';

    const dropdownMenu = isUnitDropdownOpen && dropdownRect && portalRootRef.current && createPortal(
        <div
            data-dosage-dropdown
            style={{
                position: 'fixed',
                top: dropdownRect.top,
                right: dropdownRect.right,
                pointerEvents: 'auto',
                zIndex: 2147483647,
                minWidth: `${DROPDOWN_MIN_WIDTH}px`,
                borderRadius: '8px',
                border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : (theme.border || '#e5e7eb')}`,
                backgroundColor: theme.isDark ? '#1f2937' : '#ffffff',
                boxShadow: theme.isDark ? '0 8px 16px rgba(0,0,0,0.5)' : '0 8px 16px rgba(0,0,0,0.15)',
                overflow: 'hidden',
            }}
        >
            {displayUnits.map((unit, idx) => (
                <React.Fragment key={unit}>
                    {idx > 0 && (
                        <div style={{ height: '1px', margin: '0 8px', backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : (theme.border || '#e5e7eb') }} />
                    )}
                    <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onTouchStart={(e) => e.preventDefault()}
                        onClick={() => handleUnitChange(unit)}
                        className="w-full text-left px-3 py-2.5 text-sm touch-manipulation"
                        style={{
                            color: currentUnit === unit ? (theme.isDark ? 'rgba(255,255,255,0.9)' : theme.primary) : theme.text,
                            backgroundColor: 'transparent',
                            WebkitTapHighlightColor: 'transparent',
                            display: 'block',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255,255,255,0.08)' : (theme.primaryLight || `${theme.primary}20`);
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                    >
                        {(unit === 'iu' || unit === 'IU') ? 'IU' : unit}
                    </button>
                </React.Fragment>
            ))}
        </div>,
        portalRootRef.current
    );

    const chevron = (
        <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    );

    if (outlined) {
        return (
            <div className="relative">
                <div 
                    className="flex items-stretch rounded-lg"
                    style={{ 
                        border: `1px solid ${isFocused 
                            ? (theme.isDark ? 'rgba(255,255,255,0.25)' : theme.primary) 
                            : (theme.isDark ? 'rgba(255,255,255,0.08)' : '#f0eee7')}`,
                        boxShadow: customShadow || (theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'),
                        backgroundColor: theme.isDark ? (theme.cardBackground || '#222831') : (theme.inputBackground || '#fff')
                    }}
                >
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
                                if (!e.relatedTarget?.closest?.('[data-dosage-dropdown]') && !isUnitDropdownOpen) {
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
                    <button
                        ref={triggerRef}
                        type="button"
                        data-dosage-dropdown
                        onClick={() => setIsUnitDropdownOpen(v => !v)}
                        onMouseDown={(e) => e.preventDefault()}
                        onTouchStart={(e) => e.preventDefault()}
                        className="flex items-center justify-between gap-2 px-3 py-3 flex-shrink-0 rounded-r-lg cursor-pointer transition-all border-none outline-none"
                        style={{ 
                            borderLeft: theme.isDark ? '1px solid rgba(255,255,255,0.08)' : `1px solid #f0eee7`,
                            backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : (theme.cardBackground || '#f9fafb'),
                            color: theme.isDark ? theme.text : '#181A18',
                            minWidth: '80px'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255,255,255,0.1)' : '#f3f4f6'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255,255,255,0.06)' : (theme.cardBackground || '#f9fafb'); }}
                    >
                        <span className="text-sm font-semibold">{currentUnit === 'iu' ? 'IU' : currentUnit}</span>
                        {chevron}
                    </button>
                </div>
                {dropdownMenu}
                <label 
                    htmlFor={id}
                    className="absolute pointer-events-none transition-all"
                    style={{
                        fontSize: (isFocused || (value?.amount && String(value.amount).trim())) ? '0.75rem' : '0.9375rem',
                        top: (isFocused || (value?.amount && String(value.amount).trim())) ? '-8px' : '14px',
                        left: (isFocused || (value?.amount && String(value.amount).trim())) ? '12px' : '16px',
                        padding: (isFocused || (value?.amount && String(value.amount).trim())) ? '0 4px' : '0',
                        background: (isFocused || (value?.amount && String(value.amount).trim())) ? (theme.isDark ? (theme.cardBackground || '#222831') : (theme.inputBackground || '#fff')) : 'transparent',
                        color: (isFocused || (value?.amount && String(value.amount).trim())) ? (theme.isDark ? 'rgba(255,255,255,0.7)' : theme.primary) : (theme.textLight || theme.text),
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
                style={{ boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.4)' : '0 1px 2px rgba(0,0,0,0.05)' }}
            >
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
                <button
                    ref={triggerRef}
                    type="button"
                    data-dosage-dropdown
                    onClick={() => setIsUnitDropdownOpen(v => !v)}
                    onMouseDown={(e) => e.preventDefault()}
                    onTouchStart={(e) => e.preventDefault()}
                    className="flex items-center justify-between gap-2 px-3 py-2 flex-shrink-0 cursor-pointer transition-all border-none outline-none"
                    style={{ 
                        backgroundColor: theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb'),
                        color: theme.text,
                        minWidth: '80px'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.isDark ? '#4b5563' : '#f3f4f6'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb'); }}
                >
                    <span className="text-sm font-semibold">{currentUnit === 'iu' ? 'IU' : currentUnit}</span>
                    {chevron}
                </button>
            </div>
            {dropdownMenu}
            {deliveryMethod === 'nasal' && currentUnit === 'sprays' && (
                <div className="text-xs text-blue-600 mt-2 p-2 bg-blue-50 rounded border border-blue-200 whitespace-nowrap text-center">
                    💡 Assumes 100 mcg per spray (typical nasal spray)
                </div>
            )}
        </div>
    );
}
