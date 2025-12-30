import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Check } from 'lucide-react';

export default function SearchableDropdown({
    options = [],
    value,
    onChange,
    placeholder = "Select an option...",
    emptyMessage = "No options match your search.",
    idleMessage = "Start typing to search.",
    theme
}) {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const inputRef = useRef(null);
    const dropdownRef = useRef(null);

    const trimmedQuery = query.trim();

    const filteredOptions = useMemo(() => {
        if (!trimmedQuery) return [];
        return options.filter(option => 
            (option.label || '').toLowerCase().includes(trimmedQuery.toLowerCase())
        );
    }, [options, trimmedQuery]);

    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        // Support both mouse and touch events for mobile compatibility
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("touchstart", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("touchstart", handleClickOutside);
        };
    }, []);

    const handleSelect = (optionValue) => {
        onChange(optionValue);
        const newlySelected = options.find(opt => opt.value === optionValue);
        setQuery(newlySelected ? newlySelected.label : '');
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <input
                ref={inputRef}
                type="text"
                className="w-full text-left p-2 rounded border-0 focus:ring-0 outline-none"
                style={{ 
                    backgroundColor: theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff'),
                    color: theme.text,
                    border: 'none'
                }}
                placeholder={placeholder}
                value={isOpen ? query : (selectedOption ? selectedOption.label : '')}
                onChange={(e) => {
                    setQuery(e.target.value);
                    if (!isOpen) setIsOpen(true);
                }}
                onFocus={() => {
                    setIsOpen(true);
                    setQuery('');
                }}
                onBlur={(e) => {
                    // Delay blur to allow dropdown clicks to register on mobile
                    setTimeout(() => {
                        const relatedTarget = e.relatedTarget || document.activeElement;
                        const isClickingDropdown = relatedTarget?.closest('[data-dropdown-container]') || 
                                                   dropdownRef.current?.contains(relatedTarget);
                        if (!isClickingDropdown && !isOpen) {
                            // Only close if not clicking inside dropdown
                        }
                    }, 150);
                }}
            />
            <div 
                className="absolute mt-1 w-full rounded shadow-lg z-20 border-0 overflow-hidden transition-all duration-300 ease-in-out"
                data-dropdown-container
                style={{ 
                    backgroundColor: theme.isDark ? '#1f2937' : '#fff',
                    border: 'none',
                    boxShadow: theme.isDark ? '0 4px 6px rgba(0,0,0,0.5)' : '0 4px 6px rgba(0,0,0,0.1)',
                    maxHeight: isOpen ? '400px' : '0',
                    opacity: isOpen ? 1 : 0,
                    transform: isOpen ? 'translateY(0)' : 'translateY(-10px)',
                    pointerEvents: isOpen ? 'auto' : 'none'
                }}
            >
                    <ul>
                        {!trimmedQuery ? (
                            <li className="p-2" style={{ color: theme.textLight }}>{idleMessage}</li>
                        ) : filteredOptions.length > 0 ? (
                            filteredOptions.map(option => (
                                <li
                                    key={option.value}
                                    className="p-2 cursor-pointer flex justify-between items-center transition-colors touch-manipulation"
                                    style={{
                                        backgroundColor: value === option.value 
                                            ? (theme.isDark ? '#374151' : theme.secondary)
                                            : 'transparent',
                                        color: theme.text,
                                        WebkitTapHighlightColor: 'transparent'
                                    }}
                                    onMouseDown={(e) => {
                                        // Prevent input blur on mobile
                                        e.preventDefault();
                                    }}
                                    onTouchStart={(e) => {
                                        // Prevent input blur on touch devices
                                        e.preventDefault();
                                    }}
                                    onMouseEnter={(e) => {
                                        if (value !== option.value) {
                                            e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : '#f3f4f6';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (value !== option.value) {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                        }
                                    }}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleSelect(option.value);
                                    }}
                                >
                                    <span>{option.label}</span>
                                    {value === option.value && <Check size={16} style={{ color: theme.primary }} />}
                                </li>
                            ))
                        ) : (
                            <li className="p-2" style={{ color: theme.textLight }}>{emptyMessage}</li>
                        )}
                    </ul>
                </div>
            </div>
        </div>
    );
}
