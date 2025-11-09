import React from 'react';
import TextInput from '../common/inputs/TextInput';
import { X } from 'lucide-react';

export default function OrderItemSubForm({ item, onChange, onRemove, theme, isOnlyItem }) {
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
                <div>
                    <label className="text-sm font-medium mb-2 block" style={{ color: theme.text }}>Peptide/Amino Name</label>
                    <input
                        type="text"
                        value={item.name || ''}
                        onChange={e => handleChange('name', e.target.value)}
                        placeholder="e.g., BPC-157, Superhuman, Lipo-C"
                        className="w-full px-3 py-2 rounded-lg text-sm transition-all focus:outline-none"
                        style={{
                            border: theme.isDark ? 'none' : `1px solid ${theme.border}`,
                            backgroundColor: theme.isDark ? '#374151' : theme.cardBackground,
                            color: theme.text,
                            boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                    />
                </div>
                
                {/* Row 2: Amount and Quantity */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-sm font-medium mb-2 block" style={{ color: theme.text }}>Amount</label>
                        <div 
                            className="flex items-stretch rounded-lg overflow-hidden"
                            style={{ 
                                border: theme.isDark ? 'none' : `1px solid ${theme.border}`,
                                boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.05)'
                            }}
                        >
                            <input 
                                type="text"
                                value={item.mg || ''} 
                                onChange={e => handleChange('mg', e.target.value)} 
                                placeholder="10 or 0.5"
                                className="flex-1 px-3 py-2 outline-none min-w-0"
                                style={{
                                    backgroundColor: theme.isDark ? '#374151' : (theme.inputBackground || '#fff'),
                                    color: theme.text
                                }}
                            />
                            <div 
                                className="flex items-center gap-0.5 px-1 py-1 flex-shrink-0"
                                style={{ 
                                    borderLeft: theme.isDark ? '1px solid #4b5563' : `1px solid ${theme.border}`,
                                    backgroundColor: theme.isDark ? '#1f2937' : (theme.cardBackground || '#f9fafb')
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
                            className="flex items-stretch rounded-lg overflow-hidden focus-within:ring-2"
                            style={{ 
                                border: `1px solid ${theme.isDark ? '#4b5563' : theme.border}`,
                                boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 4px rgba(15, 23, 42, 0.08)',
                                transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                            }}
                        >
                            <input 
                                type="number"
                                value={item.quantity || ''} 
                                onChange={e => handleChange('quantity', e.target.value)} 
                                placeholder="1"
                                className="flex-1 px-3 py-2 outline-none min-w-0 bg-transparent text-base"
                                style={{
                                    backgroundColor: theme.isDark ? '#1f2937' : '#ffffff',
                                    color: theme.text,
                                    borderRight: theme.isDark ? '1px solid #4b5563' : `1px solid ${theme.border}`
                                }}
                            />
                            <div 
                                className="flex items-center gap-0.5 px-1 py-1 flex-shrink-0"
                                style={{ 
                                    borderLeft: theme.isDark ? '1px solid #4b5563' : `1px solid ${theme.border}`,
                                    backgroundColor: theme.isDark ? '#1f2937' : (theme.cardBackground || '#f9fafb')
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
                        className="w-full px-3 py-2 rounded-lg text-sm transition-all focus:outline-none"
                        style={{
                            border: theme.isDark ? 'none' : `1px solid ${theme.border}`,
                            backgroundColor: theme.isDark ? '#374151' : theme.cardBackground,
                            color: theme.text,
                            boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
