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
            <div className="space-y-3">
                {/* Row 1: Name */}
                <div>
                    <TextInput 
                        label="Peptide/Amino Name" 
                        value={item.name || ''} 
                        onChange={v => handleChange('name', v)} 
                        theme={theme} 
                        placeholder="e.g., BPC-157, Superhuman, Lipo-C" 
                    />
                </div>
                
                {/* Row 2: Amount/Unit and Price */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <div className="text-sm font-medium mb-1" style={{ color: theme.text }}>Amount & Unit</div>
                        <div className="flex items-center p-0.5 rounded border" style={{ borderColor: theme.border }}>
                            <input 
                                className="flex-1 w-full border-none outline-none text-sm bg-transparent px-2 py-1.5" 
                                value={item.mg || ''} 
                                onChange={e => handleChange('mg', e.target.value)} 
                                placeholder="10 or 0.5" 
                                type="text"
                                inputMode="decimal"
                            />
                            <div className="inline-flex rounded-full bg-gray-100 p-0.5 shadow-inner">
                                {['mg', 'mL'].map(unit => (
                                    <button 
                                        key={unit} 
                                        type="button" 
                                        onClick={() => handleChange('mgUnit', unit)}
                                        className={`px-2 py-1 text-xs font-semibold rounded-full ${(item.mgUnit || 'mg') === unit ? 'text-white' : 'text-gray-600 hover:bg-gray-200'}`}
                                        style={(item.mgUnit || 'mg') === unit ? { backgroundColor: theme.primary } : {}}
                                    >
                                        {unit}
                                    </button>
                                ))}
                            </div>
                        </div>
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
                </div>
                
                {/* Row 3: Quantity and Unit */}
                <div>
                    <div className="text-sm font-medium mb-1" style={{ color: theme.text }}>Quantity & Unit</div>
                    <div className="flex items-center p-2 rounded border" style={{ borderColor: theme.border }}>
                        <input 
                            className="flex-1 border-none outline-none text-sm bg-transparent" 
                            value={item.quantity || ''} 
                            onChange={e => handleChange('quantity', e.target.value)} 
                            placeholder="1" 
                            type="text"
                            inputMode="numeric"
                        />
                        <div className="inline-flex rounded-full bg-gray-100 p-1 shadow-inner">
                            {['vial', 'kit'].map(unit => (
                                <button 
                                    key={unit} 
                                    type="button" 
                                    onClick={() => handleChange('unit', unit)}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-full ${(item.unit || 'vial') === unit ? 'text-white' : 'text-gray-700 hover:bg-gray-200'}`}
                                    style={(item.unit || 'vial') === unit ? { backgroundColor: theme.primary } : {}}
                                >
                                    {unit.charAt(0).toUpperCase() + unit.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
