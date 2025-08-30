import React from 'react';
import { PlusCircle, Trash2 } from 'lucide-react';

export default function DosingScheduleEditor({ titration, onChange, theme }) {
    const addStep = () => {
        onChange([...(titration || []), { dose: '', doseUnit: 'mcg', durationCount: '', durationUnit: 'weeks' }]);
    };

    const updateStep = (index, field, value) => {
        const newTitration = [...titration];
        newTitration[index] = { ...newTitration[index], [field]: value };
        onChange(newTitration);
    };

    const removeStep = (index) => {
        onChange(titration.filter((_, i) => i !== index));
    };

    const PillSelector = ({ options, value, onChange }) => (
        <div className="inline-flex rounded-md bg-white p-1 border" style={{ borderColor: theme.border }}>
            {options.map(opt => (
                <button 
                    key={opt} 
                    type="button" 
                    onClick={() => onChange(opt)}
                    className={`px-2 py-1 text-xs font-semibold rounded ${value === opt ? 'text-white' : 'text-gray-600'}`}
                    style={value === opt ? { backgroundColor: theme.primary } : {}}
                >
                    {opt}
                </button>
            ))}
        </div>
    );

    return (
        <div className="space-y-3">
            <div className="text-sm font-medium" style={{ color: theme.text }}>Dosing Schedule (Titration)</div>
            <div className="space-y-2">
                {(titration || []).map((step, index) => (
                    <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center p-2 border rounded bg-white" style={{borderColor: theme.border}}>
                        <div className="sm:col-span-3">
                            <input type="number" value={step.dose} onChange={e => updateStep(index, 'dose', e.target.value)} className="w-full p-1.5 border rounded" placeholder="Dose" />
                        </div>
                        <div className="sm:col-span-3">
                            <PillSelector 
                                options={['mcg', 'mg', 'iu']}
                                value={step.doseUnit}
                                onChange={v => updateStep(index, 'doseUnit', v)}
                            />
                        </div>
                        <div className="sm:col-span-1 text-center text-sm text-gray-500">for</div>
                        <div className="sm:col-span-2">
                            <input type="number" value={step.durationCount} onChange={e => updateStep(index, 'durationCount', e.target.value)} className="w-full p-1.5 border rounded" placeholder="Time" />
                        </div>
                        <div className="sm:col-span-2">
                            <PillSelector
                                options={['days', 'weeks', 'months']}
                                value={step.durationUnit}
                                onChange={v => updateStep(index, 'durationUnit', v)}
                            />
                        </div>
                        <div className="sm:col-span-1 text-right">
                            <button type="button" onClick={() => removeStep(index)} className="text-red-500 hover:text-red-700">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            <button 
                type="button" 
                onClick={addStep} 
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-xs font-semibold border-dashed border-2"
                style={{ borderColor: theme.border, color: theme.text }}
            >
                <PlusCircle size={14} /> Add Step
            </button>
        </div>
    );
}
