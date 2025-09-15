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

            <div className="space-y-6">
                {/* Peptide Information */}
                <div className="space-y-4">
                    <TextInput 
                        label="Peptide/Amino Name" 
                        value={item.name || ''} 
                        onChange={v => handleChange('name', v)} 
                        theme={theme} 
                        placeholder="e.g., BPC-157, Superhuman, Super Shredder, Lipo-C" 
                    />
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <div className="text-sm font-medium mb-2" style={{ color: theme.text }}>Dosage Amount</div>
                            <TextInput 
                                value={item.dosage?.amount || ''} 
                                onChange={v => handleChange('dosage', { ...item.dosage, amount: v })} 
                                theme={theme} 
                                placeholder="250, 0.5, or 2" 
                            />
                        </div>
                        
                        <div>
                            <div className="text-sm font-medium mb-2" style={{ color: theme.text }}>Dosage Unit</div>
                            <div className="inline-flex w-full rounded-md bg-gray-100 p-1 shadow-inner">
                                {(item.deliveryMethod === 'Nasal' 
                                    ? ['mcg', 'mg', 'iu', 'mL', 'sprays'] 
                                    : ['mcg', 'mg', 'iu', 'mL']
                                ).map(unit => (
                                    <button 
                                        key={unit} 
                                        type="button" 
                                        onClick={() => handleChange('dosage', { ...item.dosage, unit })}
                                        className={`flex-1 px-2 py-1.5 text-xs font-semibold rounded ${(item.dosage?.unit || 'mcg') === unit ? 'text-white' : 'text-gray-700 hover:bg-gray-200'}`}
                                        style={(item.dosage?.unit || 'mcg') === unit ? { backgroundColor: theme.primary } : {}}
                                    >
                                        {unit}
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        <div>
                            <div className="text-sm font-medium mb-2" style={{ color: theme.text }}>Delivery Method</div>
                            <div className="inline-flex w-full rounded-md bg-gray-100 p-1 shadow-inner">
                                {['SubQ', 'IM', 'Nasal'].map(method => (
                                    <button 
                                        key={method} 
                                        type="button" 
                                        onClick={() => handleChange('deliveryMethod', method)}
                                        className={`flex-1 px-2 py-1.5 text-xs font-semibold rounded ${(item.deliveryMethod || 'SubQ') === method ? 'text-white' : 'text-gray-700 hover:bg-gray-200'}`}
                                        style={(item.deliveryMethod || 'SubQ') === method ? { backgroundColor: theme.primary } : {}}
                                    >
                                        {method}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Frequency & Schedule */}
                <div className="space-y-4">
                    <div>
                        <div className="text-sm font-medium mb-2" style={{ color: theme.text }}>Frequency</div>
                        <div className="inline-flex w-full rounded-md bg-gray-100 p-1 shadow-inner">
                            {['daily', 'weekly', 'custom', 'cycle'].map(type => (
                                <button 
                                    key={type} 
                                    type="button" 
                                    onClick={() => handleFrequencyChange('type', type)}
                                    className={`flex-1 px-2 py-1.5 text-xs font-semibold rounded ${(item.frequency?.type || 'daily') === type ? 'text-white' : 'text-gray-700 hover:bg-gray-200'}`}
                                    style={(item.frequency?.type || 'daily') === type ? { backgroundColor: theme.primary } : {}}
                                >
                                    {type === 'custom' ? 'Every X Days' : type.charAt(0).toUpperCase() + type.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {item.frequency?.type === 'cycle' && (
                        <div className="grid grid-cols-2 gap-3">
                            <TextInput 
                                label="Days On" 
                                value={item.frequency?.onDays || ''} 
                                onChange={v => handleFrequencyChange('onDays', v)} 
                                theme={theme} 
                                placeholder="5" 
                                type="number"
                            />
                            <TextInput 
                                label="Days Off" 
                                value={item.frequency?.offDays || ''} 
                                onChange={v => handleFrequencyChange('offDays', v)} 
                                theme={theme} 
                                placeholder="2" 
                                type="number"
                            />
                        </div>
                    )}

                    {item.frequency?.type === 'weekly' && (
                        <div>
                            <div className="text-sm font-medium mb-2" style={{ color: theme.text }}>Select Days</div>
                            <div className="flex flex-wrap gap-2">
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                    <button 
                                        key={day} 
                                        type="button" 
                                        onClick={() => toggleDay(day)}
                                        className={`px-3 py-2 text-xs font-semibold rounded-md border ${item.frequency?.days?.includes(day) ? 'text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                                        style={{
                                            backgroundColor: item.frequency?.days?.includes(day) ? theme.primary : 'white',
                                            borderColor: item.frequency?.days?.includes(day) ? theme.primary : theme.border
                                        }}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {item.frequency?.type === 'custom' && (
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium" style={{ color: theme.text }}>Every</span>
                            <TextInput 
                                value={item.frequency?.customDays || ''} 
                                onChange={v => handleFrequencyChange('customDays', v)} 
                                theme={theme} 
                                placeholder="3" 
                                type="number"
                                className="w-20"
                            />
                            <span className="text-sm" style={{ color: theme.text }}>day(s)</span>
                        </div>
                    )}

                    <div>
                        <div className="text-sm font-medium mb-2" style={{ color: theme.text }}>Time of Day</div>
                        <div className="inline-flex rounded-md bg-gray-100 p-1 shadow-inner">
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
                                        className={`px-4 py-1.5 text-xs font-semibold rounded ${active ? 'text-white' : 'text-gray-700 hover:bg-gray-200'}`}
                                        style={active ? { backgroundColor: theme.primary } : {}}
                                    >
                                        {t}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Titration Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
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
                            <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all" style={{backgroundColor: item.titrationEnabled ? theme.primary : theme.secondary}}></div>
                        </label>
                        <span className="text-sm font-medium" style={{ color: theme.text }}>Enable Dosing Schedule (Titration)</span>
                    </div>

                    {item.titrationEnabled && (
                        <DosingScheduleEditor 
                            titration={item.titration || []}
                            onChange={t => handleChange('titration', t)}
                            theme={theme}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
