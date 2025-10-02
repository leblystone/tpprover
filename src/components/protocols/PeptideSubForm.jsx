import React from 'react';
import TextInput from '../common/inputs/TextInput';
import CombinedDosageInput from '../common/inputs/CombinedDosageInput';
import ColorSwatchDropdown from '../common/inputs/ColorSwatchDropdown';
import { X, Syringe, Pen, Droplets, Activity } from 'lucide-react';
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
            newFreq.time = ['AM'];
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
        <div className="space-y-4">
                {/* PEPTIDE DETAILS Section Header */}
                <div className="mb-4 px-4 py-2.5 rounded-lg" style={{ backgroundColor: theme.secondary, borderLeft: `4px solid ${theme.primary}` }}>
                        <h4 className="font-black text-sm tracking-wide uppercase" style={{ color: theme.primary }}>Details</h4>
                </div>

                {/* Peptide Information */}
                <div className="space-y-4">
                    <TextInput 
                        label="Peptide Name" 
                        value={item.name || ''} 
                        onChange={v => handleChange('name', v)} 
                        theme={theme} 
                        placeholder="e.g., BPC-157, Superhuman, Super Shredder, Lipo-C" 
                    />
                    
                    <div>
                        <div className="text-sm font-medium mb-2" style={{ color: theme.text }}>Dosage</div>
                        <div className="grid grid-cols-3 gap-3">
                            {/* Dosage - 2/3 width */}
                            <div className="col-span-2">
                                <CombinedDosageInput
                                            value={item.dosage || { amount: '', unit: 'mcg' }}
                                            onChange={(newDosage) => {
                                                // Update only dosage, do NOT sync to units text box
                                                onChange({ 
                                                    ...item, 
                                                    dosage: newDosage
                                                });
                                            }}
                                            theme={theme}
                                            deliveryMethod={item.deliveryMethod}
                                            placeholder="250, 0.5, or 2"
                                        />
                                    </div>
                                    
                                    {/* Units - 1/3 width */}
                                    <div className="col-span-1">
                                        <div 
                                            className="flex items-stretch border rounded-lg overflow-hidden"
                                            style={{ borderColor: theme.border }}
                                        >
                                            {/* Input field for units - numeric values only */}
                                            <input
                                                type="text"
                                                value={item.unitValue || ''}
                                                onChange={(e) => {
                                                    const newValue = e.target.value;
                                                    onChange({ 
                                                        ...item, 
                                                        unitValue: newValue
                                                    });
                                                }}
                                                placeholder="Optional"
                                                className="flex-1 px-2 py-2 outline-none min-w-0"
                                                style={{ 
                                                    backgroundColor: theme.inputBackground || '#fff',
                                                    color: theme.text 
                                                }}
                                            />
                                            
                                            {/* Unit Selector - Single 'units' pill */}
                                            <div 
                                                className="flex items-center px-1.5 py-1.5 border-l flex-shrink-0"
                                                style={{ 
                                                    borderColor: theme.border,
                                                    backgroundColor: theme.cardBackground || '#f9fafb'
                                                }}
                                            >
                                                <div
                                                    className="px-2 py-1 text-xs font-semibold rounded transition-all text-white shadow-sm flex-shrink-0"
                                                    style={{ backgroundColor: theme.primary }}
                                                >
                                                    units
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                        </div>
                </div>

                {/* DELIVERY METHOD Section - Only show for separate protocols or first peptide in blended */}
                {(protocolType === 'separate' || (protocolType === 'blended' && isFirstPeptide)) && (
                    <>
                        <div className="mb-4 px-4 py-2.5 rounded-lg" style={{ backgroundColor: theme.secondary, borderLeft: `4px solid ${theme.primary}` }}>
                            <h4 className="font-black text-sm tracking-wide uppercase" style={{ color: theme.primary }}>
                                Delivery Method {protocolType === 'blended' && <span className="text-xs font-normal lowercase" style={{ color: theme.primary }}>(shared by all peptides)</span>}
                            </h4>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-2">
                                <button 
                                    type="button"
                                    onClick={() => {
                                        handleChange('deliveryMethod', 'syringe');
                                        // Auto-set injection type to SubQ if not already set
                                        if (!item.injectionType) {
                                            handleChange('injectionType', 'SubQ');
                                        }
                                    }}
                                    className={`flex items-center justify-center gap-2 p-2 rounded-md border text-xs font-semibold`}
                                    style={{
                                        backgroundColor: (item.deliveryMethod || 'syringe') === 'syringe' ? theme.primary : theme.secondary,
                                        color: (item.deliveryMethod || 'syringe') === 'syringe' ? theme.textOnPrimary : theme.text,
                                        borderColor: (item.deliveryMethod || 'syringe') === 'syringe' ? theme.primary : theme.border
                                    }}
                                >
                                    <Syringe size={16} /> Syringe
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => handleChange('deliveryMethod', 'pen')}
                                    className={`flex items-center justify-center gap-2 p-2 rounded-md border text-xs font-semibold`}
                                    style={{
                                        backgroundColor: (item.deliveryMethod || 'syringe') === 'pen' ? theme.primary : theme.secondary,
                                        color: (item.deliveryMethod || 'syringe') === 'pen' ? theme.textOnPrimary : theme.text,
                                        borderColor: (item.deliveryMethod || 'syringe') === 'pen' ? theme.primary : theme.border
                                    }}
                                >
                                    <Pen size={16} /> Pen
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => {
                                        handleChange('deliveryMethod', 'nasal');
                                        // Auto-set unit to sprays when nasal is selected
                                        if (!item.dosage || item.dosage.unit !== 'sprays') {
                                            handleChange('dosage', { ...item.dosage, unit: 'sprays' });
                                        }
                                    }}
                                    className={`flex items-center justify-center gap-2 p-2 rounded-md border text-xs font-semibold`}
                                    style={{
                                        backgroundColor: (item.deliveryMethod || 'syringe') === 'nasal' ? theme.primary : theme.secondary,
                                        color: (item.deliveryMethod || 'syringe') === 'nasal' ? theme.textOnPrimary : theme.text,
                                        borderColor: (item.deliveryMethod || 'syringe') === 'nasal' ? theme.primary : theme.border
                                    }}
                                >
                                    <Droplets size={16} /> Nasal
                                </button>
                            </div>
                            
                            {/* Syringe Injection Type Options */}
                            {(item.deliveryMethod || 'syringe') === 'syringe' && (
                                <div className="mt-3">
                                    <label className="text-sm font-medium mb-2 block" style={{ color: theme.text }}>Injection Type</label>
                                    <div className="inline-flex w-full rounded-md p-1.5 gap-2" style={{ backgroundColor: theme.secondary }}>
                                        {['SubQ', 'IM', 'IV'].map(type => (
                                            <button 
                                                key={type}
                                                type="button"
                                                onClick={() => handleChange('injectionType', type)}
                                                className={`flex-1 px-2 py-2 text-xs font-semibold rounded transition-all ${(item.injectionType || 'SubQ') === type ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'}`}
                                                style={(item.injectionType || 'SubQ') === type ? { backgroundColor: theme.primary } : {}}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {/* Pen Options */}
                            {(item.deliveryMethod || 'syringe') === 'pen' && (
                                <div className="mt-3 grid grid-cols-2 gap-4">
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
                                            <option value="">(Optional)</option>
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

                                    {/* Pen Color Selection - Dropdown with Color Swatch */}
                                    <div>
                                        <ColorSwatchDropdown
                                            label="Pen Color"
                                            value={item.penColor}
                                            onChange={(hexValue) => {
                                                // Find the color name from hex and save the name
                                                const colorObj = penColors.find(c => c.hex === hexValue);
                                                handleChange('penColor', colorObj?.name || hexValue);
                                            }}
                                            colors={penColors}
                                            theme={theme}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* FREQUENCY Section - Show for separate protocols OR first peptide in blended protocols */}
                {(protocolType === 'separate' || isFirstPeptide) && (
                <>
                    <div>
                        <div className="px-4 py-2.5 rounded-lg" style={{ backgroundColor: theme.secondary, borderLeft: `4px solid ${theme.primary}` }}>
                            <h4 className="font-black text-sm tracking-wide uppercase" style={{ color: theme.primary }}>Frequency & Schedule</h4>
                        </div>
                        <div className="text-xs text-center mt-2 italic" style={{ color: theme.textLight }}>
                            Schedules peptide research on your dashboard & calendar
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                        <div className="inline-flex w-full rounded-md p-1.5 gap-2" style={{ backgroundColor: theme.secondary }}>
                            {['daily', 'weekly', 'custom', 'cycle'].map(type => (
                                <button 
                                    key={type} 
                                    type="button" 
                                    onClick={() => handleFrequencyChange('type', type)}
                                    className={`flex-1 px-2 py-2 text-xs font-semibold rounded transition-all ${(item.frequency?.type || 'daily') === type ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'}`}
                                    style={(item.frequency?.type || 'daily') === type ? { backgroundColor: theme.primary } : {}}
                                    title={
                                        type === 'daily' ? 'Every day of the week' :
                                        type === 'weekly' ? 'Select specific days of the week' :
                                        type === 'custom' ? 'Every X number of days' :
                                        type === 'cycle' ? 'X days on, Y days off pattern' : ''
                                    }
                                >
                                    {type === 'custom' ? 'Every X Days' : type.charAt(0).toUpperCase() + type.slice(1)}
                                </button>
                            ))}
                        </div>
                        
                        {/* Frequency explanations */}
                        <div className="text-xs text-center italic" style={{ color: theme.textLight }}>
                            {((item.frequency?.type || 'daily') === 'daily' && 'Task appears every day') ||
                             (item.frequency?.type === 'weekly' && 'Task appears on selected days only') ||
                             (item.frequency?.type === 'custom' && 'Task repeats every X days') ||
                             (item.frequency?.type === 'cycle' && 'On/off cycling pattern (e.g., 5 days on, 2 days off)') ||
                             ''}
                        </div>
                    </div>

                    {item.frequency?.type === 'cycle' && (
                        <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                            <div className="text-sm font-medium mb-3" style={{ color: theme.text }}>Cycle Pattern</div>
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
                        </div>
                    )}

                    {item.frequency?.type === 'weekly' && (
                        <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                            <div className="text-sm font-medium mb-3" style={{ color: theme.text }}>Select Days</div>
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
                        <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium" style={{ color: theme.text }}>Every</span>
                                
                                {/* Combined Input with 'days' pill */}
                                <div 
                                    className="flex items-stretch border rounded-lg overflow-hidden"
                                    style={{ borderColor: theme.border }}
                                >
                                    <input 
                                        type="text"
                                        value={item.frequency?.customDays || ''}
                                        onChange={e => handleFrequencyChange('customDays', e.target.value)}
                                        placeholder="3"
                                        className="flex-1 px-3 py-2 outline-none min-w-0 w-20"
                                        style={{ 
                                            backgroundColor: theme.inputBackground || '#fff',
                                            color: theme.text 
                                        }}
                                    />
                                    
                                    {/* Single 'days' pill */}
                                    <div 
                                        className="flex items-center px-1.5 py-1.5 border-l flex-shrink-0"
                                        style={{ 
                                            borderColor: theme.border,
                                            backgroundColor: theme.cardBackground || '#f9fafb'
                                        }}
                                    >
                                        <div
                                            className="px-2 py-1 text-xs font-semibold rounded transition-all text-white shadow-sm flex-shrink-0"
                                            style={{ backgroundColor: theme.primary }}
                                        >
                                            days
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                        <div className="text-sm font-medium mb-3" style={{ color: theme.text }}>Time of Day</div>
                        <div className="inline-flex w-full rounded-md p-1.5 gap-2" style={{ backgroundColor: theme.secondary }}>
                            {['AM','PM'].map(t => {
                                const active = Array.isArray(item.frequency?.time) ? item.frequency.time.includes(t) : t === 'AM';
                                return (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => {
                                            const current = Array.isArray(item.frequency?.time) && item.frequency.time.length > 0 ? item.frequency.time : ['AM'];
                                            const next = current.includes(t) ? current.filter(x => x !== t) : [...current, t];
                                            const safeNext = next.length === 0 ? ['AM'] : next;
                                            handleFrequencyChange('time', safeNext);
                                        }}
                                        className={`flex-1 px-4 py-2 text-xs font-semibold rounded transition-all ${active ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'}`}
                                        style={active ? { backgroundColor: theme.primary } : {}}
                                    >
                                        {t}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    </div>
                </>
                )}

                {/* Info note for blended protocols (non-first peptides) */}
                {protocolType === 'blended' && !isFirstPeptide && (
                    <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.info + '10' }}>
                        <div className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center mt-0.5" style={{ backgroundColor: theme.info + '20' }}>
                                <span className="text-xs font-bold" style={{ color: theme.info }}>ℹ</span>
                            </div>
                            <div className="text-sm" style={{ color: theme.text }}>
                                <p className="font-medium mb-1">Blended Protocol</p>
                                <p style={{ color: theme.textLight }}>
                                    This peptide will be administered together with other peptides in the blend. 
                                    The frequency and timing are set by the first peptide in the protocol.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* TITRATION Section - Only show for separate protocols */}
                {protocolType === 'separate' && (
                <>
                    <div className="mb-4 px-4 py-2.5 rounded-lg" style={{ backgroundColor: theme.secondary, borderLeft: `4px solid ${theme.primary}` }}>
                        <h4 className="font-black text-sm tracking-wide uppercase" style={{ color: theme.primary }}>Dosing Schedule (Optional)</h4>
                    </div>

                    <div className="space-y-4">
                        <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
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
                        </div>

                        {item.titrationEnabled && (
                            <DosingScheduleEditor 
                                titration={item.titration || []}
                                onChange={t => handleChange('titration', t)}
                                theme={theme}
                            />
                        )}
                    </div>
                </>
                )}
        </div>
    );
}
