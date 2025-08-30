import React from 'react';
import TextInput from '../common/inputs/TextInput';
import { X } from 'lucide-react';

export default function OrderItemSubForm({ item, onChange, onRemove, theme, isOnlyItem }) {
    const handleChange = (field, value) => {
        onChange({ ...item, [field]: value });
    };

    return (
        <div className="p-3 rounded-lg border bg-gray-50/50 relative" style={{ borderColor: theme.border }}>
            {!isOnlyItem && (
                <button 
                    type="button" 
                    onClick={onRemove} 
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600" 
                    aria-label="Remove item"
                >
                    <X size={14} />
                </button>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                <div className="sm:col-span-2">
                    <TextInput 
                        label="Peptide Name" 
                        value={item.name || ''} 
                        onChange={v => handleChange('name', v)} 
                        theme={theme} 
                        placeholder="e.g., BPC-157" 
                    />
                </div>
                 <div>
                    <TextInput 
                        label="mg" 
                        value={item.mg || ''} 
                        onChange={v => handleChange('mg', v)} 
                        theme={theme} 
                        placeholder="e.g., 10"
                        type="text"
                        inputMode="decimal"
                    />
                </div>
                <div>
                    <TextInput 
                        label="Price ($)" 
                        value={item.price || ''} 
                        onChange={v => handleChange('price', v)} 
                        theme={theme} 
                        placeholder="e.g., 45.00"
                        type="text"
                        inputMode="decimal"
                    />
                </div>
                <div className="flex items-end gap-1">
                    <div className="flex-grow">
                        <TextInput 
                            label="Quantity" 
                            value={item.quantity || ''} 
                            onChange={v => handleChange('quantity', v)} 
                            theme={theme} 
                            placeholder="e.g., 1"
                            type="text"
                            inputMode="numeric"
                        />
                    </div>
                    <div className="flex-shrink-0 inline-flex rounded-md bg-white p-1 border" style={{ borderColor: theme.border }}>
                        {['vial', 'kit'].map(unit => (
                            <button 
                                key={unit} 
                                type="button" 
                                onClick={() => handleChange('unit', unit)}
                                className={`px-2 py-1 text-xs font-semibold rounded ${(item.unit || 'vial') === unit ? 'text-white' : 'text-gray-600'}`}
                                style={(item.unit || 'vial') === unit ? { backgroundColor: theme.primary } : {}}
                            >
                                {unit.charAt(0).toUpperCase() + unit.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
