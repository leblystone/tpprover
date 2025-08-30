import React from 'react';
import TextInput from './TextInput';
import { X } from 'lucide-react';

export default function PeptideSubForm({ item, onChange, onRemove, theme, isOnlyItem }) {
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
                    aria-label="Remove peptide"
                >
                    <X size={14} />
                </button>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div className="sm:col-span-2">
                    <TextInput label="Peptide" value={item.peptide || ''} onChange={v => handleChange('peptide', v)} placeholder="Peptide Name" theme={theme} />
                </div>
                <div className="sm:col-span-1">
                    <TextInput label="mg" value={item.mg || ''} onChange={v => handleChange('mg', v)} placeholder="10" theme={theme} />
                </div>
                <div className="sm:col-span-1">
                    <TextInput label="Cost ($)" value={item.cost || ''} onChange={v => handleChange('cost', v)} placeholder="0.00" theme={theme} />
                </div>
                <div className="sm:col-span-4">
                    <div className="text-sm font-medium mb-1" style={{ color: theme?.text }}>Quantity & Unit</div>
                    <div className="flex items-center p-2 rounded border bg-white" style={{ borderColor: theme?.border }}>
                        <input className="flex-1 border-none outline-none text-sm bg-transparent" value={item.quantity || ''} onChange={e => handleChange('quantity', e.target.value)} placeholder="1" />
                        <div className="inline-flex rounded-md bg-gray-100 p-1 shadow-inner">
                            {['vial','kit'].map(k => (
                                <button key={k} type="button" onClick={() => handleChange('unit', k)}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-md ${((item.unit || 'vial') === k) ? 'text-white' : 'text-gray-700 hover:bg-gray-200'}`}
                                    style={((item.unit || 'vial') === k) ? { backgroundColor: theme.primary } : {}}>
                                    {k.charAt(0).toUpperCase() + k.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
