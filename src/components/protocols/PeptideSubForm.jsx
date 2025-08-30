import React from 'react';
import TextInput from '../common/inputs/TextInput';
import { X } from 'lucide-react';
import DosingScheduleEditor from './DosingScheduleEditor';

export default function PeptideSubForm({ item, onChange, onRemove, theme, isOnlyItem }) {
    
    const handleChange = (field, value) => {
        onChange({ ...item, [field]: value });
    };

    const handleFrequencyChange = (field, value) => {
        const newFreq = { ...(item.frequency || { type: 'daily' }), [field]: value };
        // Ensure a default time-of-day so scheduling appears on calendar
        if (!Array.isArray(newFreq.time) || newFreq.time.length === 0) {
            newFreq.time = ['Morning'];
        }
        if (field === 'type' && value !== 'weekly') newFreq.days = [];
        if (field === 'type' && value !== 'cycle') {
            newFreq.onDays = '';
            newFreq.offDays = '';
        }
        handleChange('frequency', newFreq);
    };

    const toggleDay = (day) => {
        const currentDays = item.frequency?.days || [];
        const newDays = currentDays.includes(day)
            ? currentDays.filter(d => d !== day)
            : [...currentDays, day];
        handleFrequencyChange('days', newDays);
    };

    return (
        <div className="p-4 rounded-lg border relative" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
            {!isOnlyItem && (
                <button type="button" onClick={onRemove} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600" aria-label="Remove peptide">
                    <X size={14} />
                </button>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {/* Column 1: Name & Dosage */}
                <div className="space-y-4">
                    <TextInput label="Peptide Name" value={item.name || ''} onChange={v => handleChange('name', v)} theme={theme} placeholder="e.g., BPC-157" />
                    <div className="grid grid-cols-2 gap-3">
                        <TextInput label="Dosage Amount" value={item.dosage?.amount || ''} onChange={v => handleChange('dosage', { ...item.dosage, amount: v })} theme={theme} placeholder="e.g., 250" />
                        <div>
                            <div className="text-sm font-medium mb-1" style={{ color: theme.text }}>Dosage Unit</div>
                            <div className="inline-flex rounded-md p-1 border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                                {['mcg', 'mg', 'iu'].map(unit => (
                                    <button key={unit} type="button" onClick={() => handleChange('dosage', { ...item.dosage, unit })}
                                        className={`px-2 py-1 text-xs font-semibold rounded`}
                                        style={{
                                            color: item.dosage?.unit === unit ? theme.textOnPrimary : theme.text,
                                            backgroundColor: item.dosage?.unit === unit ? theme.primary : 'transparent'
                                        }}>
                                        {unit.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Column 2: Frequency */}
                <div className="space-y-2">
                    <div className="text-sm font-medium" style={{ color: theme.text }}>Frequency</div>
                    <div className="inline-flex rounded-md p-1 border w-full" style={{ backgroundColor: theme.cardBackground }}>
                        {['daily', 'weekly', 'cycle'].map(type => (
                            <button 
                                key={type} 
                                type="button" 
                                onClick={() => handleFrequencyChange('type', type)}
                                className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded`}
                                style={{
                                    color: (item.frequency?.type || 'daily') === type ? theme.textOnPrimary : theme.text,
                                    backgroundColor: (item.frequency?.type || 'daily') === type ? theme.primary : 'transparent'
                                }}
                            >
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                            </button>
                        ))}
                    </div>
                    {item.frequency?.type === 'cycle' && (
                        <div className="flex items-center gap-2 p-2 rounded-md border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                            <input type="number" value={item.frequency?.onDays || ''} onChange={e => handleFrequencyChange('onDays', e.target.value)} className="w-full p-1.5 border rounded" placeholder="Days On" style={{ backgroundColor: theme.secondary, borderColor: theme.border, color: theme.text }} />
                            <span className="text-sm" style={{ color: theme.textLight }}>/</span>
                            <input type="number" value={item.frequency?.offDays || ''} onChange={e => handleFrequencyChange('offDays', e.target.value)} className="w-full p-1.5 border rounded" placeholder="Days Off" style={{ backgroundColor: theme.secondary, borderColor: theme.border, color: theme.text }} />
                        </div>
                    )}
                    {item.frequency?.type === 'weekly' && (
                        <div className="flex flex-wrap items-center gap-1 p-2 rounded-md border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                <button 
                                    key={day} 
                                    type="button" 
                                    onClick={() => toggleDay(day)}
                                    className={`px-3 py-1.5 text-xs rounded-md`}
                                    style={{
                                        color: item.frequency?.days?.includes(day) ? theme.textOnPrimary : theme.text,
                                        backgroundColor: item.frequency?.days?.includes(day) ? theme.primary : theme.secondary
                                    }}
                                >
                                    {day}
                                </button>
                            ))}
                        </div>
                    )}
                    {/* Time of Day selection */}
                    <div className="space-y-1 p-2 rounded-md border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                        <div className="text-sm font-medium" style={{ color: theme.text }}>Time of Day</div>
                        <div className="flex items-center gap-2">
                            {['Morning','Evening'].map(t => {
                                const active = Array.isArray(item.frequency?.time) ? item.frequency.time.includes(t) : t === 'Morning';
                                return (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => {
                                            const current = Array.isArray(item.frequency?.time) && item.frequency.time.length > 0 ? item.frequency.time : ['Morning'];
                                            const next = current.includes(t) ? current.filter(x => x !== t) : [...current, t];
                                            const safeNext = next.length === 0 ? ['Morning'] : next;
                                            handleFrequencyChange('time', safeNext);
                                        }}
                                        className={`px-3 py-1.5 text-xs rounded-md`}
                                        style={{
                                            color: active ? theme.textOnPrimary : theme.text,
                                            backgroundColor: active ? theme.primary : theme.secondary
                                        }}
                                    >
                                        {t}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Full Width below columns */}
                <div className="md:col-span-2">
                    <div className="flex items-center gap-2">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={!!item.titrationEnabled} 
                                onChange={e => {
                                    const isEnabled = e.target.checked;
                                    handleChange('titrationEnabled', isEnabled);
                                    // If enabling and no steps exist, add the first one automatically
                                    if (isEnabled && (!item.titration || item.titration.length === 0)) {
                                        handleChange('titration', [{ dose: '', doseUnit: 'mcg', durationCount: '', durationUnit: 'weeks' }]);
                                    }
                                }} 
                                className="sr-only peer" 
                            />
                            <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all" style={{backgroundColor: item.titrationEnabled ? theme.primary : theme.secondary}}></div>
                        </label>
                        <span className="text-sm font-medium" style={{ color: theme.text }}>Enable Dosing Schedule (Titration)</span>
                    </div>
                </div>

                {item.titrationEnabled && (
                    <div className="md:col-span-2">
                        <DosingScheduleEditor 
                            titration={item.titration || []}
                            onChange={t => handleChange('titration', t)}
                            theme={theme}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
