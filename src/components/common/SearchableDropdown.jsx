import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Check } from 'lucide-react';

export default function SearchableDropdown({
    options = [],
    value,
    onChange,
    placeholder = "Select an option...",
    theme
}) {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const inputRef = useRef(null);
    const dropdownRef = useRef(null);

    const filteredOptions = useMemo(() => {
        if (!query) return options;
        return options.filter(option => 
            (option.label || '').toLowerCase().includes(query.toLowerCase())
        );
    }, [options, query]);

    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
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
                className="w-full text-left p-2 border rounded bg-gray-50"
                style={{ borderColor: theme.border }}
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
            />
            {isOpen && (
                <div 
                    className="absolute mt-1 w-full bg-white border rounded shadow-lg z-20" 
                    style={{ borderColor: theme.border }}
                >
                    <ul>
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map(option => (
                                <li
                                    key={option.value}
                                    className="p-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                                    onClick={() => handleSelect(option.value)}
                                >
                                    <span>{option.label}</span>
                                    {value === option.value && <Check size={16} style={{ color: theme.primary }} />}
                                </li>
                            ))
                        ) : (
                            <li className="p-2 text-gray-500">No options match your search.</li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}
