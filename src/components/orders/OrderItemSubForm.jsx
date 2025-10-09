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
                    <label className="text-sm font-medium mb-2 block" style={{ color: theme.text }}>Peptide/Amino Name</label>
                    <input
                        type="text"
                        value={item.name || ''}
                        onChange={e => handleChange('name', e.target.value)}
                        placeholder="e.g., BPC-157, Superhuman, Lipo-C"
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-opacity-50 transition-all"
                        style={{
                            borderColor: theme.border,
                            backgroundColor: theme.cardBackground,
                            color: theme.text,
                            focusRingColor: theme.primary
                        }}
                    />
                </div>
                
                {/* Row 2: Amount and Quantity */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-sm font-medium mb-2 block" style={{ color: theme.text }}>Amount</label>
                        <div 
                            className="flex items-stretch border rounded-lg overflow-hidden"
                            style={{ borderColor: theme.border }}
                        >
                            <input 
                                type="text"
                                value={item.mg || ''} 
                                onChange={e => handleChange('mg', e.target.value)} 
                                placeholder="10 or 0.5"
                                className="flex-1 px-3 py-2 outline-none min-w-0"
                                style={{
                                    backgroundColor: theme.inputBackground || '#fff',
                                    color: theme.text
                                }}
                            />
                            <div 
                                className="flex items-center gap-0.5 px-1 py-1 border-l flex-shrink-0"
                                style={{ 
                                    borderColor: theme.border,
                                    backgroundColor: theme.cardBackground || '#f9fafb'
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
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-2 block" style={{ color: theme.text }}>Quantity</label>
                        <div 
                            className="flex items-stretch border rounded-lg overflow-hidden"
                            style={{ borderColor: theme.border }}
                        >
                            <input 
                                type="number"
                                value={item.quantity || ''} 
                                onChange={e => handleChange('quantity', e.target.value)} 
                                placeholder="1"
                                className="flex-1 px-3 py-2 outline-none min-w-0"
                                style={{
                                    backgroundColor: theme.inputBackground || '#fff',
                                    color: theme.text
                                }}
                            />
                            <div 
                                className="flex items-center gap-0.5 px-1 py-1 border-l flex-shrink-0"
                                style={{ 
                                    borderColor: theme.border,
                                    backgroundColor: theme.cardBackground || '#f9fafb'
                                }}
                            >
                                {['vial', 'bottle', 'kit'].map(unit => (
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
                    </div>
                </div>
                
                {/* Row 3: Price */}
                <div>
                    <label className="text-sm font-medium mb-2 block" style={{ color: theme.text }}>Price ($)</label>
                    <input
                        type="text"
                        value={item.price || ''}
                        onChange={e => handleChange('price', e.target.value)}
                        placeholder="e.g., 45.00"
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-opacity-50 transition-all"
                        style={{
                            borderColor: theme.border,
                            backgroundColor: theme.cardBackground,
                            color: theme.text,
                            focusRingColor: theme.primary
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
