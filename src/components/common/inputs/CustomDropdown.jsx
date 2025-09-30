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
    theme 
}) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const selectedOption = options.find(opt => opt.value === value);
    const displayText = selectedOption ? selectedOption.label : placeholder;

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
                className="w-full px-3 py-2 text-sm border rounded-md flex items-center justify-between transition-all hover:border-gray-400"
                style={{
                    borderColor: isOpen ? theme.primary : theme.border,
                    backgroundColor: theme.cardBackground,
                    color: value ? theme.text : theme.textLight
                }}
            >
                <span>{displayText}</span>
                <ChevronDown 
                    size={16} 
                    className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    style={{ color: theme.textLight }}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div 
                    className="absolute z-50 w-full mt-1 py-1 bg-white border rounded-md shadow-lg overflow-hidden"
                    style={{ 
                        borderColor: theme.border,
                        backgroundColor: theme.cardBackground 
                    }}
                >
                    <div className="max-h-60 overflow-y-auto">
                        {options.map((option) => {
                            const isSelected = value === option.value;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                        onChange(option.value);
                                        setIsOpen(false);
                                    }}
                                    className="w-full px-3 py-2 text-sm text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                                    style={{
                                        backgroundColor: isSelected ? theme.primary + '10' : 'transparent',
                                        color: theme.text
                                    }}
                                >
                                    <span className="flex items-center gap-2">
                                        {option.icon && <span>{option.icon}</span>}
                                        <span>{option.label}</span>
                                    </span>
                                    {isSelected && (
                                        <Check size={16} style={{ color: theme.primary }} />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

