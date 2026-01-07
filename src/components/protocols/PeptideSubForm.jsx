import React, { useState, useEffect } from 'react';
import TextInput from '../common/inputs/TextInput';
import CombinedDosageInput from '../common/inputs/CombinedDosageInput';
import ColorSwatchDropdown from '../common/inputs/ColorSwatchDropdown';
import DosingScheduleEditor from './DosingScheduleEditor';
import { Pen, Droplets, Pipette, ChevronDown, TrendingUp } from 'lucide-react';
import { getChromeGradient } from '../../utils/recon';
import { penColors } from '../../utils/penColors';

export default function PeptideSubForm({ item, onChange, onRemove, theme, isOnlyItem, protocolType, isFirstPeptide }) {
    // Load pen types from localStorage or use defaults
    const [penTypes, setPenTypes] = useState([]);
    const [isPenTypeDropdownOpen, setIsPenTypeDropdownOpen] = useState(false);
    const penTypeDropdownRef = React.useRef(null);
    
    useEffect(() => {
        try {
            const storedPenTypes = localStorage.getItem('tpprover_pen_types');
            const types = storedPenTypes ? JSON.parse(storedPenTypes) : [
                { id: 'savvio', name: 'Savvio' },
                { id: 'novo', name: 'Novo' },
                { id: 'v1', name: 'V1' },
                { id: 'v2', name: 'V2' },
                { id: 'v3', name: 'V3' },
                { id: 'bird-pen', name: 'Bird Pen' },
                { id: 'luxura', name: 'Luxura' },
                { id: 'gansulin', name: 'Gansulin' },
                { id: 'other', name: 'Other' }
            ];
            setPenTypes(types);
        } catch (error) {
            console.error('Error loading pen types:', error);
            setPenTypes([{ id: 'other', name: 'Other' }]);
        }
    }, []);
    
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

    // Helper to normalize day names to short format (Mon, Tue, etc.)
    const normalizeDayName = (day) => {
        const dayMap = {
            'Monday': 'Mon', 'Tuesday': 'Tue', 'Wednesday': 'Wed', 'Thursday': 'Thu',
            'Friday': 'Fri', 'Saturday': 'Sat', 'Sunday': 'Sun',
            'monday': 'Mon', 'tuesday': 'Tue', 'wednesday': 'Wed', 'thursday': 'Thu',
            'friday': 'Fri', 'saturday': 'Sat', 'sunday': 'Sun'
        };
        return dayMap[day] || day;
    };

    // Helper to check if a day is selected (handles both short and full day names)
    const isDaySelected = (shortDay, storedDays) => {
        if (!storedDays || storedDays.length === 0) return false;
        // Check for exact match or normalized match
        return storedDays.some(d => {
            const normalized = normalizeDayName(d);
            return normalized === shortDay || d === shortDay;
        });
    };

    const toggleDay = (day) => {
        const currentDays = item.frequency?.days || [];
        // Normalize all stored days to short format
        const normalizedCurrentDays = currentDays.map(d => normalizeDayName(d));
        // Remove the day if it exists (in any format), otherwise add it
        const newDays = normalizedCurrentDays.includes(day)
            ? normalizedCurrentDays.filter(d => d !== day)
            : [...normalizedCurrentDays, day];
        handleFrequencyChange('days', newDays);
    };

    // Handle click outside for pen type dropdown (supports both mouse and touch)
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (penTypeDropdownRef.current && !penTypeDropdownRef.current.contains(event.target)) {
                setIsPenTypeDropdownOpen(false);
            }
        };

        if (isPenTypeDropdownOpen) {
            // Support both mouse and touch events for mobile compatibility
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isPenTypeDropdownOpen]);

    return (
        <div className="space-y-4">
                {/* Peptide Information */}
                <div>
                    <TextInput 
                        label="Peptide Name" 
                        value={item.name || ''} 
                        onChange={v => handleChange('name', v)} 
                        theme={theme} 
                        placeholder="e.g., BPC-157, Lipo-C"
                        outlined={true}
                        customTextColor={theme.isDark ? null : "#181A18"}
                        customShadow
                    />
                </div>

                {/* Dosage Type Toggle & Input */}
                <div className="space-y-3">
                    <div className="mb-1">
                        <span className="text-xs font-black uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                            Dosage Schedule
                        </span>
                    </div>
                    
                    {/* Dosage Type Toggle */}
                    <div className="inline-flex w-full rounded-md p-1 gap-1" style={{ backgroundColor: theme.secondary, boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)' }}>
                        <button 
                            type="button"
                            onClick={() => {
                                // Switch to fixed dose - clear titration if exists
                                const updated = { ...item };
                                if (updated.titration && updated.titration.length > 0) {
                                    updated.titration = [];
                                }
                                onChange(updated);
                            }}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                                (!item.titration || item.titration.length === 0) ? 'text-white shadow-sm' : 'text-gray-500'
                            }`}
                            style={(!item.titration || item.titration.length === 0) ? { backgroundColor: theme.primary } : {}}
                        >
                            <Pipette size={12} />
                            Fixed Dose
                        </button>
                        <button 
                            type="button"
                            onClick={() => {
                                // Switch to titration - initialize if empty
                                const updated = { ...item };
                                if (!updated.titration || updated.titration.length === 0) {
                                    updated.titration = [{ dose: '', doseUnit: 'mcg', durationCount: '', durationUnit: 'days' }];
                                }
                                onChange(updated);
                            }}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                                (item.titration && item.titration.length > 0) ? 'text-white shadow-sm' : 'text-gray-500'
                            }`}
                            style={(item.titration && item.titration.length > 0) ? { backgroundColor: theme.primary } : {}}
                        >
                            <TrendingUp size={12} />
                            Titration
                        </button>
                    </div>

                    {/* Fixed Dose Input */}
                    {(!item.titration || item.titration.length === 0) && (
                        <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2">
                                <CombinedDosageInput
                                    value={item.dosage || { amount: '', unit: 'mcg' }}
                                    onChange={(newDosage) => {
                                        onChange({ 
                                            ...item, 
                                            dosage: newDosage
                                        });
                                    }}
                                    theme={theme}
                                    deliveryMethod={item.deliveryMethod}
                                    placeholder="250"
                                    outlined={true}
                                    customTextColor={theme.isDark ? null : "#181A18"}
                                    customShadow
                                />
                            </div>
                            <div className="col-span-1">
                                <TextInput
                                    label="Units"
                                    value={item.unitValue || ''}
                                    onChange={v => onChange({ 
                                        ...item, 
                                        unitValue: v
                                    })}
                                    placeholder="10"
                                    theme={theme}
                                    outlined={true}
                                    customTextColor={theme.isDark ? null : "#181A18"}
                                    customShadow
                                />
                            </div>
                        </div>
                    )}

                    {/* Titration Schedule Editor */}
                    {(item.titration && item.titration.length > 0) && (
                        <div className="mt-2">
                            <DosingScheduleEditor
                                titration={item.titration}
                                onChange={(newTitration) => {
                                    onChange({
                                        ...item,
                                        titration: newTitration
                                    });
                                }}
                                theme={theme}
                            />
                        </div>
                    )}
                </div>

                {/* DELIVERY & FREQUENCY - Side by Side on Desktop */}
                {(protocolType === 'separate' || (protocolType === 'blended' && isFirstPeptide)) && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                        {/* Delivery Column */}
                        <div className="space-y-3">
                            <div className="mb-1">
                                <span className="text-xs font-black uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                                    Delivery Method {protocolType === 'blended' && <span className="lowercase">(shared)</span>}
                                </span>
                            </div>

                            <div className="space-y-3">
                                <div className="grid grid-cols-3 gap-2 p-1 rounded-lg" style={{ backgroundColor: theme.secondary, boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)' }}>
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            // Batch all changes into a single state update to prevent lag
                                            const updates = { 
                                                ...item, 
                                                deliveryMethod: 'pipette'
                                            };
                                            if (!item.injectionType) updates.injectionType = 'SubQ';
                                            if (item.dosage?.unit === 'sprays') {
                                                updates.dosage = { ...item.dosage, unit: 'mcg' };
                                            }
                                            onChange(updates);
                                        }}
                                        className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md border text-xs font-bold uppercase tracking-wider transition-all`}
                                        style={{
                                            backgroundColor: (item.deliveryMethod || 'pipette') === 'pipette' ? theme.primary : 'transparent',
                                            color: (item.deliveryMethod || 'pipette') === 'pipette' ? theme.textOnPrimary : theme.text,
                                            borderColor: (item.deliveryMethod || 'pipette') === 'pipette' ? theme.primary : 'transparent'
                                        }}
                                    >
                                        <Pipette size={14} /> Syringe
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            // Batch all changes into a single state update to prevent lag
                                            const updates = { 
                                                ...item, 
                                                deliveryMethod: 'pen'
                                            };
                                            if (item.dosage?.unit === 'sprays') {
                                                updates.dosage = { ...item.dosage, unit: 'mcg' };
                                            }
                                            onChange(updates);
                                        }}
                                        className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md border text-xs font-bold uppercase tracking-wider transition-all`}
                                        style={{
                                            backgroundColor: (item.deliveryMethod || 'pipette') === 'pen' ? theme.primary : 'transparent',
                                            color: (item.deliveryMethod || 'pipette') === 'pen' ? theme.textOnPrimary : theme.text,
                                            borderColor: (item.deliveryMethod || 'pipette') === 'pen' ? theme.primary : 'transparent'
                                        }}
                                    >
                                        <Pen size={14} /> Pen
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            // Batch all changes into a single state update to prevent lag
                                            const updates = { 
                                                ...item, 
                                                deliveryMethod: 'nasal'
                                            };
                                            if (!item.dosage || item.dosage.unit !== 'sprays') {
                                                updates.dosage = { ...item.dosage, unit: 'sprays' };
                                            }
                                            onChange(updates);
                                        }}
                                        className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md border text-xs font-bold uppercase tracking-wider transition-all`}
                                        style={{
                                            backgroundColor: (item.deliveryMethod || 'pipette') === 'nasal' ? theme.primary : 'transparent',
                                            color: (item.deliveryMethod || 'pipette') === 'nasal' ? theme.textOnPrimary : theme.text,
                                            borderColor: (item.deliveryMethod || 'pipette') === 'nasal' ? theme.primary : 'transparent'
                                        }}
                                    >
                                        <Droplets size={14} /> Nasal
                                    </button>
                                </div>
                                
                                {/* Pipette Injection Type Options */}
                                {(item.deliveryMethod || 'pipette') === 'pipette' && (
                                    <div className="inline-flex w-full rounded-md p-1 gap-2" style={{ backgroundColor: theme.secondary }}>
                                        {['SubQ', 'IM', 'IV'].map(type => (
                                            <button 
                                                key={type}
                                                type="button"
                                                onClick={() => handleChange('injectionType', type)}
                                                className={`flex-1 py-1.5 text-xs font-bold rounded transition-all ${(item.injectionType || 'SubQ') === type ? 'text-white shadow-sm' : 'text-gray-500'}`}
                                                style={(item.injectionType || 'SubQ') === type ? { backgroundColor: theme.primary } : {}}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                
                                {/* Pen Options */}
                                {(item.deliveryMethod || 'pipette') === 'pen' && (
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="relative" ref={penTypeDropdownRef}>
                                            <button
                                                type="button"
                                                onClick={() => setIsPenTypeDropdownOpen(prev => !prev)}
                                                className="w-full px-2 py-1.5 text-xs border rounded-md flex items-center justify-between transition-all"
                                                style={{ borderColor: '#f0eee7', backgroundColor: theme.cardBackground, color: item.penType ? theme.text : theme.textLight }}
                                            >
                                                <span className="truncate">{item.penType ? penTypes.find(t => t.id === item.penType)?.name || 'Other' : 'Pen Type'}</span>
                                                <ChevronDown size={14} className={`transition-transform ${isPenTypeDropdownOpen ? 'rotate-180' : ''}`} />
                                            </button>
                                            {isPenTypeDropdownOpen && (
                                                <div className="absolute z-50 w-full mt-1 rounded-lg shadow-lg border overflow-hidden" style={{ backgroundColor: theme.isDark ? '#1f2937' : '#ffffff', borderColor: theme.border }}>
                                                    {[{ id: '', name: 'Pen Type' }, ...penTypes].map((option) => (
                                                        <button
                                                            key={option.id}
                                                            type="button"
                                                            onClick={() => { handleChange('penType', option.id); setIsPenTypeDropdownOpen(false); }}
                                                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 transition-colors"
                                                            style={{ color: item.penType === option.id ? theme.primary : theme.text }}
                                                        >
                                                            {option.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <ColorSwatchDropdown
                                            value={item.penColor ? penColors.find(c => c.name.toLowerCase() === item.penColor.toLowerCase())?.hex : '#9ca3af'}
                                            onChange={(hex) => handleChange('penColor', penColors.find(c => c.hex === hex)?.name || hex)}
                                            colors={penColors}
                                            theme={theme}
                                            compact={true}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Frequency Column */}
                        <div className="space-y-3">
                            <div className="mb-1">
                                <span className="text-xs font-black uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                                    Frequency & Schedule
                                </span>
                            </div>

                            <div className="space-y-3">
                                <div className="inline-flex w-full rounded-md p-1 gap-1" style={{ backgroundColor: theme.secondary }}>
                                    {['daily', 'weekly', 'custom', 'cycle'].map(type => (
                                        <button 
                                            key={type} 
                                            type="button" 
                                            onClick={() => handleFrequencyChange('type', type)}
                                            className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-all ${(item.frequency?.type || 'daily') === type ? 'text-white shadow-sm' : 'text-gray-500'}`}
                                            style={(item.frequency?.type || 'daily') === type ? { backgroundColor: theme.primary } : {}}
                                        >
                                            {type === 'custom' ? 'X Days' : type}
                                        </button>
                                    ))}
                                </div>
                                
                                {item.frequency?.type === 'cycle' && (
                                    <div className="grid grid-cols-2 gap-2">
                                        <TextInput label="On" value={item.frequency?.onDays || ''} onChange={v => handleFrequencyChange('onDays', v)} theme={theme} placeholder="5" type="number" outlined={true} compact={true} />
                                        <TextInput label="Off" value={item.frequency?.offDays || ''} onChange={v => handleFrequencyChange('offDays', v)} theme={theme} placeholder="2" type="number" outlined={true} compact={true} />
                                    </div>
                                )}

                                {item.frequency?.type === 'weekly' && (
                                    <div className="flex flex-wrap gap-1">
                                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                                            const isSelected = isDaySelected(day, item.frequency?.days);
                                            return (
                                                <button key={day} type="button" onClick={() => toggleDay(day)}
                                                    className="flex-1 min-w-[35px] py-1 text-xs font-bold rounded border transition-all"
                                                    style={{
                                                        backgroundColor: isSelected ? theme.primary : 'transparent',
                                                        borderColor: isSelected ? theme.primary : theme.border,
                                                        color: isSelected ? '#ffffff' : theme.textLight
                                                    }}
                                                >
                                                    {day[0]}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {item.frequency?.type === 'custom' && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold uppercase opacity-40">Every</span>
                                        <input type="text" value={item.frequency?.customDays || ''} onChange={e => handleFrequencyChange('customDays', e.target.value)} placeholder="3" className="w-12 px-2 py-1 text-xs border rounded" />
                                        <span className="text-xs font-bold uppercase opacity-40">Days</span>
                                    </div>
                                )}

                                {/* AM/PM Toggle - More compact */}
                                <div className="inline-flex w-full rounded-md p-1 gap-2" style={{ backgroundColor: theme.secondary }}>
                                    {['AM','PM'].map(t => {
                                        const active = Array.isArray(item.frequency?.time) ? item.frequency.time.includes(t) : t === 'AM';
                                        return (
                                            <button key={t} type="button"
                                                onClick={() => {
                                                    const current = Array.isArray(item.frequency?.time) && item.frequency.time.length > 0 ? item.frequency.time : ['AM'];
                                                    const next = current.includes(t) ? current.filter(x => x !== t) : [...current, t];
                                                    handleFrequencyChange('time', next.length === 0 ? ['AM'] : next);
                                                }}
                                                className={`flex-1 py-1 text-xs font-bold rounded transition-all ${active ? 'text-white shadow-sm' : 'text-gray-500'}`}
                                                style={active ? { backgroundColor: theme.primary } : {}}
                                            >
                                                {t}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
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

        </div>
    );
}
