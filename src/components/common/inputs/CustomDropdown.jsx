import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * Modern custom dropdown component with floating menu
 * Matches modern UI design patterns
 */
export default function CustomDropdown({ 
    label, 
    value, 
    onChange, 
    options = [], 
    placeholder = "Select...",
    theme,
    outlined = false,
    customShadow = false
}) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside (supports both mouse and touch)
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            // Support both mouse and touch events for mobile compatibility
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isOpen]);

    const selectedOption = options.find(opt => opt.value === value);
    const displayText = selectedOption ? selectedOption.label : (placeholder || '(Optional)');

    return (
        <div ref={dropdownRef} className="relative">
            {label && (
                <label className="text-sm font-medium mb-2 block" style={{ color: theme.text }}>
                    {label}
                </label>
            )}
            
            {/* Dropdown Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                onMouseDown={(e) => {
                    // Prevent any parent blur events on mobile
                    e.preventDefault();
                }}
                onTouchStart={(e) => {
                    // Prevent any parent blur events on touch devices
                    e.preventDefault();
                }}
                className={`w-full ${outlined ? 'px-4 py-3.5' : 'px-3 py-2'} text-sm border ${outlined ? 'rounded-xl' : 'rounded-md'} flex items-center justify-between transition-all duration-200 touch-manipulation ${outlined ? 'hover:shadow-md' : 'hover:border-gray-400'} overflow-hidden`}
                style={{
                    borderColor: isOpen ? theme.primary : theme.border,
                    backgroundColor: outlined ? (theme.isDark ? '#1f2937' : '#ffffff') : theme.cardBackground,
                    color: value ? (outlined && !theme.isDark ? '#181A18' : theme.text) : theme.textLight,
                    WebkitTapHighlightColor: 'transparent',
                    fontWeight: '500',
                    boxShadow: outlined && customShadow 
                        ? (isOpen 
                            ? (theme.isDark 
                                ? `0 0 0 2px ${theme.primary}40, 0 4px 12px rgba(0,0,0,0.5)` 
                                : `0 0 0 2px ${theme.primary}20, 0 4px 12px rgba(0,0,0,0.15)`)
                            : (theme.isDark 
                                ? '0 2px 8px rgba(0,0,0,0.4)' 
                                : '0 1px 3px rgba(0,0,0,0.1)'))
                        : (isOpen && outlined
                            ? (theme.isDark 
                                ? `0 0 0 2px ${theme.primary}40, 0 2px 8px rgba(0,0,0,0.4)` 
                                : `0 0 0 2px ${theme.primaryLight}, 0 1px 3px rgba(0,0,0,0.1)`)
                            : 'none')
                }}
            >
                <span className="flex items-center gap-2.5 min-w-0 flex-1">
                    {selectedOption?.icon && <span className="flex-shrink-0">{selectedOption.icon}</span>}
                    <span className="truncate text-left">{displayText}</span>
                </span>
                <ChevronDown 
                    size={18} 
                    className={`transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                    style={{ color: isOpen ? theme.primary : theme.textLight }}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
            <div 
                className="absolute z-50 w-full mt-2 overflow-hidden transition-all duration-200 ease-in-out"
                style={{
                    maxHeight: '400px',
                    opacity: 1,
                    transform: 'translateY(0)',
                    pointerEvents: 'auto'
                }}
            >
                <div 
                    className="py-2 border rounded-xl shadow-xl overflow-x-hidden"
                    style={{ 
                        borderColor: theme.border,
                        backgroundColor: theme.cardBackground,
                        boxShadow: theme.isDark 
                            ? '0 10px 25px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.1)' 
                            : '0 10px 25px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0,0,0,0.05)'
                    }}
                >
                    <div className="max-h-60 overflow-y-auto overflow-x-hidden">
                        {options && options.length > 0 ? options.map((option) => {
                            const isSelected = value === option.value;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onMouseDown={(e) => {
                                        // Prevent blur events on mobile
                                        e.preventDefault();
                                    }}
                                    onTouchStart={(e) => {
                                        // Prevent blur events on touch devices
                                        e.preventDefault();
                                    }}
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
                                    className="w-full px-4 py-3 text-sm text-left flex items-center justify-between transition-all duration-150 touch-manipulation overflow-hidden"
                                    style={{
                                        backgroundColor: isSelected ? theme.primary + '15' : 'transparent',
                                        color: theme.text,
                                        WebkitTapHighlightColor: 'transparent',
                                        borderRadius: '0.5rem',
                                        margin: '2px 4px'
                                    }}
                                >
                                    <span className="flex items-center gap-3 font-medium min-w-0 flex-1">
                                        {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
                                        <span className="truncate">{option.label}</span>
                                    </span>
                                    {isSelected && (
                                        <Check size={18} style={{ color: theme.primary }} className="flex-shrink-0" />
                                    )}
                                </button>
                            );
                        }) : (
                            <div className="px-4 py-3 text-sm text-center" style={{ color: theme.textLight }}>
                                No options available
                            </div>
                        )}
                    </div>
                </div>
            </div>
            )}
        </div>
    );
}

