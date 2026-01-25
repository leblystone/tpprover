import React, { useState, useRef, useEffect } from 'react';
import { Clock, ChevronDown, Check } from 'lucide-react';

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
    const dropdownRef = useRef(null);

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

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
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

    return (
        <div ref={dropdownRef} className="relative">
            {label && (
                <label className="text-xs font-semibold mb-1.5 block opacity-70" style={{ color: theme.text }}>
                    {label}
                </label>
            )}
            
            {/* Time Picker Button */}
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

            {/* Dropdown Menu */}
            {isOpen && !disabled && (
            <div 
                className="absolute z-50 w-full mt-1.5 overflow-hidden transition-all duration-200 ease-in-out"
                style={{
                    maxHeight: '240px',
                    opacity: 1,
                    transform: 'translateY(0)',
                    pointerEvents: 'auto'
                }}
            >
                <div 
                    className="py-1.5 border rounded-xl shadow-xl overflow-x-hidden"
                    style={{ 
                        borderColor: theme.border,
                        backgroundColor: theme.cardBackground,
                        boxShadow: theme.isDark 
                            ? '0 10px 25px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.1)' 
                            : '0 10px 25px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0,0,0,0.05)'
                    }}
                >
                    <div className="max-h-60 overflow-y-auto overflow-x-hidden">
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
                </div>
            </div>
            )}
        </div>
    );
}
