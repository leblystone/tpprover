import React, { useState, useMemo } from 'react';
import TextInput from '../common/inputs/TextInput';
import { X } from 'lucide-react';
import { formatCurrencyWithSymbol } from '../../utils/currencyUtils';

export default function OrderItemSubForm({ item, onChange, onRemove, theme, isOnlyItem, hasNameError = false }) {
    const [isNameFocused, setIsNameFocused] = useState(false);
    const [isAmountFocused, setIsAmountFocused] = useState(false);
    const [isQuantityFocused, setIsQuantityFocused] = useState(false);
    const [isPriceFocused, setIsPriceFocused] = useState(false);
    const [isCostPerMgFocused, setIsCostPerMgFocused] = useState(false);

    // Calculate cost per milligram based on current values
    const calculatedCostPerMg = useMemo(() => {
        const price = parseFloat(item.price) || 0;
        const mg = Number(item.mg) || 0;
        const quantity = Math.max(1, Number(item.quantity) || 1);
        const unitMult = String(item.unit || 'vial').toLowerCase() === 'kit' ? 10 : 1;
        const totalMg = mg * quantity * unitMult;
        
        if (totalMg > 0 && price > 0) {
            return price / totalMg;
        }
        return null;
    }, [item.price, item.mg, item.quantity, item.unit]);

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
                            border: hasNameError ? `2px solid #c87a5c` : `1px solid #f0eee7`,
                            boxShadow: hasNameError 
                                ? (theme.isDark ? '0 0 0 3px rgba(200, 122, 92, 0.2)' : '0 0 0 3px rgba(200, 122, 92, 0.1)')
                                : (theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'),
                            backgroundColor: theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff'),
                            color: theme.isDark ? theme.text : '#181A18'
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
                            color: hasNameError ? '#c87a5c' : ((isNameFocused || (item.name && String(item.name).trim())) ? theme.primary : (theme.textLight || theme.text)),
                            fontWeight: 500
                        }}
                    >
                        Peptide/Amino Name {hasNameError && <span style={{ color: '#c87a5c' }}>*</span>}
                    </label>
                    {hasNameError && (
                        <div className="mt-1 text-xs flex items-center gap-1" style={{ color: '#c87a5c' }}>
                            <span>⚠️</span>
                            <span>Peptide name is required</span>
                        </div>
                    )}
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
                                    color: theme.isDark ? theme.text : '#181A18',
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
                                    color: theme.isDark ? theme.text : '#181A18',
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
                
                {/* Row 3: Price and Cost per Milligram */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Price Column */}
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
                                color: theme.isDark ? theme.text : '#181A18'
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

                    {/* Cost per Milligram Column */}
                    <div className="relative">
                        <input
                            type="text"
                            id={`costpermg-input-${item.id || 'new'}`}
                            value={item.costPerMg || ''}
                            onChange={e => handleChange('costPerMg', e.target.value)}
                            onFocus={() => setIsCostPerMgFocused(true)}
                            onBlur={() => setIsCostPerMgFocused(false)}
                            placeholder=" "
                            className="w-full px-3 py-3 rounded-lg outline-none transition-all"
                            style={{
                                border: `1px solid #f0eee7`,
                                boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)',
                                backgroundColor: theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff'),
                                color: theme.isDark ? theme.text : '#181A18'
                            }}
                        />
                        <label 
                            htmlFor={`costpermg-input-${item.id || 'new'}`}
                            className="absolute pointer-events-none transition-all"
                            style={{
                                fontSize: (isCostPerMgFocused || (item.costPerMg && String(item.costPerMg).trim())) ? '0.75rem' : '0.9375rem',
                                top: (isCostPerMgFocused || (item.costPerMg && String(item.costPerMg).trim())) ? '-8px' : '14px',
                                left: (isCostPerMgFocused || (item.costPerMg && String(item.costPerMg).trim())) ? '12px' : '16px',
                                padding: (isCostPerMgFocused || (item.costPerMg && String(item.costPerMg).trim())) ? '0 4px' : '0',
                                background: (isCostPerMgFocused || (item.costPerMg && String(item.costPerMg).trim())) ? (theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')) : 'transparent',
                                color: (isCostPerMgFocused || (item.costPerMg && String(item.costPerMg).trim())) ? theme.primary : (theme.textLight || theme.text),
                                fontWeight: 500
                            }}
                        >
                            Cost per Milligram ($/mg) {item.costPerMg && <span className="text-xs" style={{ color: theme.textLight }}>(override)</span>}
                        </label>
                        {calculatedCostPerMg !== null && !item.costPerMg && (
                            <div className="mt-1 text-xs flex items-center gap-1 flex-wrap" style={{ color: theme.textLight }}>
                                <span>💡</span>
                                <span style={{ color: theme.primary, fontWeight: 500 }}>
                                    {formatCurrencyWithSymbol(calculatedCostPerMg)}/mg
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
