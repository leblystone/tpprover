import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Clock, ChevronDown, Check } from 'lucide-react';

const DROPDOWN_MAX_HEIGHT = 280;

/**
 * Time picker with 15-minute increments
 * Matches modern UI design patterns
 * @param {string} timeRange - 'am' for 12:00 AM - 11:45 AM, 'pm' for 12:00 PM - 11:45 PM, or undefined for all 24 hours
 */
export default function TimePicker15Min({ 
    label, 
    value = '08:00', // HH:mm format
    onChange, 
    theme,
    disabled = false,
    timeRange = undefined // 'am', 'pm', or undefined for full 24h
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0, openUp: false });
    const dropdownRef = useRef(null);
    const triggerRef = useRef(null);

    // Generate time options in 15-minute increments
    const generateTimeOptions = () => {
        const options = [];
        let startHour = 0;
        let endHour = 24;
        
        // Filter by time range if specified
        if (timeRange === 'am') {
            startHour = 0;  // 12:00 AM
            endHour = 12;   // up to 11:45 AM
        } else if (timeRange === 'pm') {
            startHour = 12; // 12:00 PM
            endHour = 24;   // up to 11:45 PM
        }
        
        for (let hour = startHour; hour < endHour; hour++) {
            for (let minute = 0; minute < 60; minute += 15) {
                const hourStr = hour.toString().padStart(2, '0');
                const minuteStr = minute.toString().padStart(2, '0');
                const timeValue = `${hourStr}:${minuteStr}`;
                
                // Format for display (12-hour format)
                const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                const ampm = hour < 12 ? 'AM' : 'PM';
                const displayLabel = `${hour12}:${minuteStr} ${ampm}`;
                
                options.push({ value: timeValue, label: displayLabel });
            }
        }
        return options;
    };

    const timeOptions = generateTimeOptions();

    // Position dropdown (portal) when open - fit on screen, open upward if needed (before paint)
    useLayoutEffect(() => {
        if (!isOpen || !triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const openUp = spaceBelow < DROPDOWN_MAX_HEIGHT && spaceAbove > spaceBelow;
        setDropdownPosition({
            top: openUp ? rect.top - DROPDOWN_MAX_HEIGHT : rect.bottom + 4,
            left: rect.left,
            width: Math.max(rect.width, 200),
            openUp
        });
    }, [isOpen]);

    // Close dropdown when clicking outside (trigger or portal content)
    useEffect(() => {
        const handleClickOutside = (event) => {
            const inTrigger = triggerRef.current?.contains(event.target);
            const inPortal = event.target.closest('[data-timepicker-dropdown]');
            if (!inTrigger && !inPortal) setIsOpen(false);
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isOpen]);

    const selectedOption = timeOptions.find(opt => opt.value === value);
    const displayText = selectedOption ? selectedOption.label : '8:00 AM';

    const dropdownContent = isOpen && !disabled && dropdownPosition.width > 0 && createPortal(
        <div
            data-timepicker-dropdown
            className="fixed z-[99999] rounded-xl shadow-xl overflow-hidden"
            style={{
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                width: dropdownPosition.width,
                maxHeight: DROPDOWN_MAX_HEIGHT,
                border: `1px solid ${theme.border}`,
                backgroundColor: theme.cardBackground,
                boxShadow: theme.isDark
                    ? '0 10px 25px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.1)'
                    : '0 10px 25px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0,0,0,0.05)'
            }}
        >
            <div
                className="py-1.5 overflow-x-hidden overflow-y-auto overscroll-contain"
                style={{ maxHeight: DROPDOWN_MAX_HEIGHT - 12 }}
            >
                {timeOptions.map((option) => {
                    const isSelected = value === option.value;
                    return (
                        <button
                            key={option.value}
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onChange(option.value);
                                setIsOpen(false);
                            }}
                            onMouseEnter={(e) => {
                                if (!isSelected) {
                                    e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : '#f3f4f6';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isSelected) {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }
                            }}
                            className="w-full px-3 py-2 text-xs text-left flex items-center justify-between transition-all duration-150 touch-manipulation"
                            style={{
                                backgroundColor: isSelected ? theme.primary + '15' : 'transparent',
                                color: theme.text,
                                WebkitTapHighlightColor: 'transparent',
                                borderRadius: '0.5rem',
                                margin: '1px 4px',
                                fontWeight: isSelected ? '600' : '500'
                            }}
                        >
                            <span className="flex items-center gap-2">
                                <Clock size={12} style={{ color: isSelected ? theme.primary : theme.textLight, opacity: 0.7 }} />
                                <span>{option.label}</span>
                            </span>
                            {isSelected && (
                                <Check size={14} style={{ color: theme.primary }} />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>,
        document.body
    );

    return (
        <div ref={dropdownRef} className="relative">
            <div ref={triggerRef}>
                {label && (
                    <label className="text-xs font-semibold mb-1.5 block opacity-70" style={{ color: theme.text }}>
                        {label}
                    </label>
                )}
                <button
                    type="button"
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    disabled={disabled}
                    className="w-full px-3 py-2.5 text-sm border rounded-xl flex items-center justify-between transition-all duration-200 touch-manipulation hover:shadow-sm"
                    style={{
                        borderColor: isOpen ? theme.primary : theme.border,
                        backgroundColor: disabled ? theme.secondary + '80' : (theme.isDark ? '#1f2937' : '#ffffff'),
                        color: disabled ? theme.textLight + '60' : theme.text,
                        WebkitTapHighlightColor: 'transparent',
                        fontWeight: '600',
                        opacity: disabled ? 0.5 : 1,
                        cursor: disabled ? 'not-allowed' : 'pointer'
                    }}
                >
                    <span className="flex items-center gap-2">
                        <Clock size={14} style={{ color: disabled ? theme.textLight : theme.primary }} />
                        <span>{displayText}</span>
                    </span>
                    <ChevronDown 
                        size={16} 
                        className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                        style={{ color: isOpen ? theme.primary : theme.textLight }}
                    />
                </button>
            </div>
            {dropdownContent}
        </div>
    );
}
