import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { getChromeGradient } from '../../../utils/recon';

/**
 * Color swatch dropdown selector
 * Shows a button with the selected color, opens to show color grid
 */
export default function ColorSwatchDropdown({ 
    label, 
    value, 
    onChange, 
    colors = [], 
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

    const selectedColor = colors.find(c => c.hex === value || c.name === value);
    const selectedHex = selectedColor?.hex || '#C0C0C0';
    const selectedName = selectedColor?.name || '(Optional)';

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
                    color: theme.text
                }}
            >
                <span className="flex items-center gap-2">
                    {/* Color preview dot */}
                    <span 
                        className="w-5 h-5 rounded border-2 border-gray-300"
                        style={{ 
                            background: getChromeGradient(selectedHex),
                            boxShadow: selectedHex === '#FFFFFF' ? 'inset 0 0 0 1px #ddd' : 'none'
                        }}
                    ></span>
                    <span>{selectedName}</span>
                </span>
                <ChevronDown 
                    size={16} 
                    className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    style={{ color: theme.textLight }}
                />
            </button>

            {/* Dropdown Menu with Color Swatches */}
            {isOpen && (
                <div 
                    className="absolute z-50 w-full mt-1 p-2 bg-white border rounded-md shadow-lg"
                    style={{ 
                        borderColor: theme.border,
                        backgroundColor: theme.cardBackground
                    }}
                >
                    <div className="grid grid-cols-7 gap-1.5">
                        {colors.map(({ name, hex }) => {
                            const isSelected = value === hex || value === name;
                            const style = {
                                background: getChromeGradient(hex),
                            };
                            if (hex === '#FFFFFF') {
                                style.boxShadow = 'inset 0 0 0 1px #ddd';
                            }
                            return (
                                <button 
                                    key={name}
                                    type="button"
                                    title={name}
                                    onClick={() => {
                                        onChange(hex);
                                        setIsOpen(false);
                                    }}
                                    className={`relative w-full aspect-square rounded-lg transition-all duration-200 hover:scale-105 ${
                                        isSelected 
                                            ? 'ring-2 ring-offset-2 shadow-lg' 
                                            : 'hover:shadow-md border-2 border-gray-300'
                                    }`}
                                    style={isSelected ? { ...style, ringColor: theme.primary } : style}
                                >
                                    {isSelected && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-3 h-3 bg-white rounded-full border-2" style={{ borderColor: hex === '#FFFFFF' ? '#333' : '#fff' }}></div>
                                        </div>
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

