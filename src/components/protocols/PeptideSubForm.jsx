import React from 'react';
import TextInput from '../common/inputs/TextInput';
import { X, Syringe, Pen } from 'lucide-react';
import DosingScheduleEditor from './DosingScheduleEditor';
import { getChromeGradient } from '../../utils/recon';

const penColors = [
    { name: 'Gold', hex: '#DAA520' },
    { name: 'Silver', hex: '#C0C0C0' },
    { name: 'Black', hex: '#000000' },
    { name: 'Blue', hex: '#0066CC' },
    { name: 'Red', hex: '#CC0000' },
    { name: 'Green', hex: '#00AA00' },
    { name: 'Purple', hex: '#6600CC' },
    { name: 'Orange', hex: '#FF6600' },
    { name: 'Pink', hex: '#FF69B4' },
    { name: 'White', hex: '#FFFFFF' },
    { name: 'Gray', hex: '#9CA3AF' },
];

export default function PeptideSubForm({ item, onChange, onRemove, theme, isOnlyItem, protocolType, isFirstPeptide }) {
    
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
        <div className="p-6 rounded-xl relative" style={{ backgroundColor: theme.cardBackground }}>
            {!isOnlyItem && (
                <button type="button" onClick={onRemove} className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg" aria-label="Remove peptide">
                    <X size={16} />
                </button>
            )}

            <div className="space-y-8">
                {/* Peptide Header */}
                <div className="space-y-6">
                    {/* Peptide Name */}
                    <div className="relative">
                        <input
                            type="text"
                            value={item.name || ''}
                            onChange={e => handleChange('name', e.target.value)}
                            placeholder="e.g., BPC-157, Semaglutide, NAD+"
                            className="w-full px-4 py-3 text-lg font-medium rounded-xl border-2 focus:ring-2 focus:ring-opacity-50 transition-all"
                            style={{
                                borderColor: theme.border,
                                backgroundColor: theme.background,
                                color: theme.text,
                                '--tw-ring-color': theme.primary
                            }}
                        />
                        <label className="absolute -top-2 left-3 px-2 text-xs font-medium"
                               style={{ backgroundColor: theme.cardBackground, color: theme.textLight }}>
                            Peptide/Amino Name
                        </label>
                    </div>

                    {/* Dosage Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Dosage Amount */}
                        <div className="relative">
                            <input
                                type="text"
                                value={item.dosage?.amount || ''}
                                onChange={e => handleChange('dosage', { ...item.dosage, amount: e.target.value })}
                                placeholder="250, 0.5, or 2"
                                className="w-full px-4 py-3 rounded-xl border-2 focus:ring-2 focus:ring-opacity-50 transition-all"
                                style={{
                                    borderColor: theme.border,
                                    backgroundColor: theme.background,
                                    color: theme.text,
                                    '--tw-ring-color': theme.primary
                                }}
                            />
                            <label className="absolute -top-2 left-3 px-2 text-xs font-medium"
                                   style={{ backgroundColor: theme.cardBackground, color: theme.textLight }}>
                                Dosage Amount
                            </label>
                        </div>
                        
                        {/* Dosage Unit */}
                        <div className="relative">
                            <div className="flex rounded-xl border-2 overflow-hidden" style={{ borderColor: theme.border }}>
                                {(item.deliveryMethod === 'Nasal' 
                                    ? ['mcg', 'mg', 'iu', 'mL', 'sprays'] 
                                    : ['mcg', 'mg', 'iu', 'mL']
                                ).map(unit => (
                                    <button 
                                        key={unit} 
                                        type="button" 
                                        onClick={() => handleChange('dosage', { ...item.dosage, unit })}
                                        className="flex-1 px-3 py-3 text-sm font-medium transition-all hover:scale-105"
                                        style={{
                                            backgroundColor: (item.dosage?.unit || 'mcg') === unit ? theme.primary : theme.background,
                                            color: (item.dosage?.unit || 'mcg') === unit ? theme.textOnPrimary : theme.text
                                        }}
                                    >
                                        {unit}
                                    </button>
                                ))}
                            </div>
                            <label className="absolute -top-2 left-3 px-2 text-xs font-medium"
                                   style={{ backgroundColor: theme.cardBackground, color: theme.textLight }}>
                                Dosage Unit
                            </label>
                        </div>
                        
                        {/* Delivery Method - Only show for separate protocols or first peptide in blended */}
                        {(protocolType === 'separate' || (protocolType === 'blended' && isFirstPeptide)) && (
                            <div className="relative">
                                <div className="flex rounded-xl border-2 overflow-hidden" style={{ borderColor: theme.border }}>
                                    <button 
                                        type="button"
                                        onClick={() => handleChange('deliveryMethod', 'syringe')}
                                        className="flex-1 flex items-center justify-center gap-2 p-3 text-sm font-medium transition-all hover:scale-105"
                                        style={{
                                            backgroundColor: (item.deliveryMethod || 'syringe') === 'syringe' ? theme.primary : theme.background,
                                            color: (item.deliveryMethod || 'syringe') === 'syringe' ? theme.textOnPrimary : theme.text
                                        }}
                                    >
                                        <Syringe size={16} /> Syringe
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => handleChange('deliveryMethod', 'pen')}
                                        className="flex-1 flex items-center justify-center gap-2 p-3 text-sm font-medium transition-all hover:scale-105"
                                        style={{
                                            backgroundColor: (item.deliveryMethod || 'syringe') === 'pen' ? theme.primary : theme.background,
                                            color: (item.deliveryMethod || 'syringe') === 'pen' ? theme.textOnPrimary : theme.text
                                        }}
                                    >
                                        <Pen size={16} /> Pen
                                    </button>
                                </div>
                                <label className="absolute -top-2 left-3 px-2 text-xs font-medium"
                                       style={{ backgroundColor: theme.cardBackground, color: theme.textLight }}>
                                    Delivery Method {protocolType === 'blended' && <span className="font-normal">(shared by all peptides)</span>}
                                </label>
                            </div>
                            
                            {/* Pen Options */}
                            {(item.deliveryMethod || 'syringe') === 'pen' && (
                                <div className="mt-3 space-y-3">
                                    {/* Pen Type Selection */}
                                    <div>
                                        <label className="text-sm font-medium mb-1 block" style={{ color: theme.text }}>Pen Type</label>
                                        <select
                                            value={item.penType || ''}
                                            onChange={e => handleChange('penType', e.target.value)}
                                            className="w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-opacity-50 transition-all"
                                            style={{
                                                borderColor: theme.border,
                                                backgroundColor: theme.cardBackground,
                                                color: theme.text,
                                                focusRingColor: theme.primary
                                            }}
                                        >
                           <option value="">Select pen type (optional)</option>
                           <option value="savvio">Savvio</option>
                           <option value="novo">Novo</option>
                           <option value="v1">V1</option>
                           <option value="v2">V2</option>
                           <option value="v3">V3</option>
                           <option value="bird-pen">Bird Pen</option>
                           <option value="luxura">Luxura</option>
                           <option value="gansulin">Gansulin</option>
                           <option value="other">Other</option>
                                        </select>
                                    </div>

                                    {/* Pen Color Selection */}
                                    <div>
                                        <label className="text-sm font-medium mb-1 block" style={{ color: theme.text }}>Pen Color</label>
                                        <div className="flex gap-2 flex-wrap">
                                            {penColors.map(({ name, hex }) => {
                                                const style = {
                                                    background: getChromeGradient(hex),
                                                    borderColor: hex,
                                                    ringColor: theme.primary,
                                                };
                                                if (hex === '#FFFFFF') {
                                                    style.boxShadow = 'inset 0 0 0 1px #ddd';
                                                }
                                                return (
                                                    <button 
                                                        key={name}
                                                        type="button"
                                                        title={name}
                                                        onClick={() => handleChange('penColor', name)}
                                                        className={`w-8 h-8 rounded-full border-2 transition-transform duration-150 transform hover:scale-110 ${(item.penColor || 'Silver') === name ? 'ring-2 ring-offset-2' : ''}`}
                                                        style={style}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        )}
                    </div>
                </div>

                {/* Frequency & Schedule - Only show for separate protocols, hidden for blended (handled globally) */}
                {protocolType === 'separate' && (
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
                )}

                {/* Titration Section - Only show for separate protocols or first peptide in blended */}
                {(protocolType === 'separate' || (protocolType === 'blended' && isFirstPeptide)) && (
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
                )}
            </div>
        </div>
    );
}
