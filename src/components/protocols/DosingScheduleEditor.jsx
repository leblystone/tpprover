import React from 'react';
import { PlusCircle, Trash2 } from 'lucide-react';

export default function DosingScheduleEditor({ titration, onChange, theme }) {
    const addStep = () => {
        onChange([...(titration || []), { dose: '', doseUnit: 'mcg', durationCount: '', durationUnit: 'days' }]);
    };

    const updateStep = (index, field, value) => {
        const newTitration = [...titration];
        newTitration[index] = { ...newTitration[index], [field]: value };
        onChange(newTitration);
    };

    const removeStep = (index) => {
        onChange(titration.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-3">
            <div className="space-y-3">
                {(titration || []).map((step, index) => (
                    <div key={index} className="p-4 rounded-lg" style={{backgroundColor: theme.cardBackground}}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-sm font-medium" style={{ color: theme.text }}>Step {index + 1}</div>
                            <button 
                                type="button" 
                                onClick={() => removeStep(index)} 
                                className="text-red-500 hover:text-red-700 transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                        
                        <div className="space-y-3">
                            {/* Dose Input with Pills */}
                            <div>
                                <label className="text-xs font-medium mb-1.5 block" style={{ color: theme.textLight }}>Dose</label>
                                <div 
                                    className="flex items-stretch rounded-lg overflow-hidden"
                                    style={{ 
                                        boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.4)' : '0 1px 2px rgba(0,0,0,0.05)'
                                    }}
                                >
                                    <input 
                                        type="text"
                                        value={step.dose || ''}
                                        onChange={e => updateStep(index, 'dose', e.target.value)}
                                        placeholder="250"
                                        className="flex-1 px-3 py-2 outline-none min-w-0 border-0 focus:ring-0"
                                        style={{ 
                                            backgroundColor: theme.isDark ? '#1f2937' : (theme.inputBackground || '#fff'),
                                            color: theme.text 
                                        }}
                                    />
                                    
                                    {/* Unit Selector Pills */}
                                    <div 
                                        className="flex items-center gap-0.5 px-1 py-1 flex-shrink-0"
                                        style={{ 
                                            backgroundColor: theme.cardBackground || '#f9fafb'
                                        }}
                                    >
                                        {['mcg', 'mg', 'mL', 'iu', 'sprays'].map(unit => (
                                            <button 
                                                key={unit}
                                                type="button"
                                                onClick={() => updateStep(index, 'doseUnit', unit)}
                                                className={`px-1.5 py-0.5 text-xs font-semibold rounded transition-all flex-shrink-0 ${
                                                    step.doseUnit === unit
                                                        ? 'text-white shadow-sm'
                                                        : 'text-gray-600 hover:bg-gray-200'
                                                }`}
                                                style={step.doseUnit === unit ? { backgroundColor: theme.primary } : {}}
                                            >
                                                {unit}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Duration Input with Single Pill */}
                            <div>
                                <label className="text-xs font-medium mb-1.5 block" style={{ color: theme.textLight }}>Duration</label>
                                <div 
                                    className="flex items-stretch rounded-lg overflow-hidden"
                                    style={{ 
                                        boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.4)' : '0 1px 2px rgba(0,0,0,0.05)'
                                    }}
                                >
                                    <input 
                                        type="text"
                                        value={step.durationCount || ''}
                                        onChange={e => updateStep(index, 'durationCount', e.target.value)}
                                        placeholder="7"
                                        className="flex-1 px-3 py-2 outline-none min-w-0 border-0 focus:ring-0"
                                        style={{ 
                                            backgroundColor: theme.isDark ? '#1f2937' : (theme.inputBackground || '#fff'),
                                            color: theme.text 
                                        }}
                                    />
                                    
                                    {/* Single 'days' pill */}
                                    <div 
                                        className="flex items-center px-1.5 py-1.5 flex-shrink-0"
                                        style={{ 
                                            backgroundColor: theme.cardBackground || '#f9fafb'
                                        }}
                                    >
                                        <div
                                            className="px-2 py-1 text-xs font-semibold rounded transition-all text-white shadow-sm flex-shrink-0"
                                            style={{ backgroundColor: theme.primary }}
                                        >
                                            day(s)
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <button 
                type="button" 
                onClick={addStep} 
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-xs font-semibold transition-all hover:opacity-90"
                style={{ 
                    backgroundColor: theme.isDark ? '#374151' : theme.secondary,
                    color: theme.primary,
                    boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.05)'
                }}
            >
                <PlusCircle size={14} /> Add Step
            </button>
        </div>
    );
}
