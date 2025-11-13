import React, { useState } from 'react';
import TextInput from '../common/inputs/TextInput';
import { X } from 'lucide-react';

export default function OrderItemSubForm({ item, onChange, onRemove, theme, isOnlyItem }) {
    const [isNameFocused, setIsNameFocused] = useState(false);
    const [isAmountFocused, setIsAmountFocused] = useState(false);
    const [isQuantityFocused, setIsQuantityFocused] = useState(false);
    const [isPriceFocused, setIsPriceFocused] = useState(false);

    const handleChange = (field, value) => {
        onChange({ ...item, [field]: value });
    };

    return (
        <div className="p-3 rounded-lg relative" style={{ 
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
            <div className="space-y-3">
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
                            border: `1px solid #f0eee7`,
                            boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)',
                            backgroundColor: theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff'),
                            color: '#181A18'
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
                            color: (isNameFocused || (item.name && String(item.name).trim())) ? theme.primary : (theme.textLight || theme.text),
                            fontWeight: 500
                        }}
                    >
                        Peptide/Amino Name
                    </label>
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
                                onBlur={() => setIsAmountFocused(false)}
                                placeholder=" "
                                className="flex-1 py-3 outline-none min-w-0 rounded-l-lg"
                                style={{
                                    backgroundColor: 'transparent',
                                    color: '#181A18',
                                    border: 'none',
                                    paddingLeft: '12px',
                                    paddingRight: '8px'
                                }}
                            />
                            <div 
                                className="flex items-center gap-0.5 px-1 py-1 flex-shrink-0 rounded-r-lg"
                                style={{ 
                                    borderLeft: theme.isDark ? '1px solid #4b5563' : `1px solid #f0eee7`,
                                    backgroundColor: theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb')
                                }}
                            >
                                {['mg', 'mL'].map(unit => (
                                    <button 
                                        key={unit} 
                                        type="button" 
                                        onClick={() => handleChange('mgUnit', unit)}
                                        className={`px-1.5 py-0.5 text-xs font-semibold rounded transition-all flex-shrink-0 ${
                                            (item.mgUnit || 'mg') === unit 
                                                ? 'text-white shadow-sm' 
                                                : 'text-gray-600 hover:bg-gray-200'
                                        }`}
                                        style={(item.mgUnit || 'mg') === unit ? { backgroundColor: theme.primary } : {}}
                                    >
                                        {unit}
                                    </button>
                                ))}
                            </div>
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
                                onBlur={() => setIsQuantityFocused(false)}
                                placeholder=" "
                                className="flex-1 px-3 py-3 outline-none min-w-0 rounded-l-lg"
                                style={{
                                    backgroundColor: 'transparent',
                                    color: '#181A18',
                                    border: 'none'
                                }}
                            />
                            <div 
                                className="flex items-center gap-0.5 px-1 py-1 flex-shrink-0 rounded-r-lg"
                                style={{ 
                                    borderLeft: theme.isDark ? '1px solid #4b5563' : `1px solid #f0eee7`,
                                    backgroundColor: theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb')
                                }}
                            >
                                {['vial', 'kit'].map(unit => (
                                    <button 
                                        key={unit} 
                                        type="button" 
                                        onClick={() => handleChange('unit', unit)}
                                        className={`px-1.5 py-0.5 text-xs font-semibold rounded transition-all flex-shrink-0 ${
                                            (item.unit || 'vial') === unit 
                                                ? 'text-white shadow-sm' 
                                                : 'text-gray-600 hover:bg-gray-200'
                                        }`}
                                        style={(item.unit || 'vial') === unit ? { backgroundColor: theme.primary } : {}}
                                    >
                                        {unit.charAt(0).toUpperCase() + unit.slice(1)}
                                    </button>
                                ))}
                            </div>
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
                    </div>
                </div>
                
                {/* Row 3: Price */}
                <div className="relative">
                    <input
                        type="text"
                        id={`price-input-${item.id || 'new'}`}
                        value={item.price || ''}
                        onChange={e => handleChange('price', e.target.value)}
                        onFocus={() => setIsPriceFocused(true)}
                        onBlur={() => setIsPriceFocused(false)}
                        placeholder=" "
                        className="w-full px-3 py-3 rounded-lg outline-none transition-all"
                        style={{
                            border: `1px solid #f0eee7`,
                            boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)',
                            backgroundColor: theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff'),
                            color: '#181A18'
                        }}
                    />
                    <label 
                        htmlFor={`price-input-${item.id || 'new'}`}
                        className="absolute pointer-events-none transition-all"
                        style={{
                            fontSize: (isPriceFocused || (item.price && String(item.price).trim())) ? '0.75rem' : '0.9375rem',
                            top: (isPriceFocused || (item.price && String(item.price).trim())) ? '-8px' : '14px',
                            left: (isPriceFocused || (item.price && String(item.price).trim())) ? '12px' : '16px',
                            padding: (isPriceFocused || (item.price && String(item.price).trim())) ? '0 4px' : '0',
                            background: (isPriceFocused || (item.price && String(item.price).trim())) ? (theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')) : 'transparent',
                            color: (isPriceFocused || (item.price && String(item.price).trim())) ? theme.primary : (theme.textLight || theme.text),
                            fontWeight: 500
                        }}
                    >
                        Price ($)
                    </label>
                </div>
            </div>
        </div>
    );
}
