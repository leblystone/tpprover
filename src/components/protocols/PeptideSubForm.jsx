import React, { useState, useEffect } from 'react';
import TextInput from '../common/inputs/TextInput';
import CombinedDosageInput from '../common/inputs/CombinedDosageInput';
import ColorSwatchDropdown from '../common/inputs/ColorSwatchDropdown';
import { Pen, Droplets, Pipette, TestTube, Calendar, ChevronDown } from 'lucide-react';
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

    const toggleDay = (day) => {
        const currentDays = item.frequency?.days || [];
        const newDays = currentDays.includes(day)
            ? currentDays.filter(d => d !== day)
            : [...currentDays, day];
        handleFrequencyChange('days', newDays);
    };

    // Handle click outside for pen type dropdown
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (penTypeDropdownRef.current && !penTypeDropdownRef.current.contains(event.target)) {
                setIsPenTypeDropdownOpen(false);
            }
        };

        if (isPenTypeDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isPenTypeDropdownOpen]);

    return (
        <div className="space-y-4">
                {/* PEPTIDE DETAILS Section Header */}
                <div className="mb-4 px-4 py-2.5 rounded-lg flex items-center justify-between" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, borderLeft: `4px solid #e0ded7` }}>
                    <h4 className="font-bold text-sm tracking-wider uppercase" style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76', letterSpacing: '0.1em' }}>PEPTIDE DETAILS</h4>
                    <TestTube size={20} style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76' }} />
                </div>

                {/* Peptide Information */}
                <div className="space-y-4">
                    <TextInput 
                        label="Peptide Name" 
                        value={item.name || ''} 
                        onChange={v => handleChange('name', v)} 
                        theme={theme} 
                        placeholder="e.g., BPC-157, Lipo-C"
                        outlined={true}
                        customTextColor="#181A18"
                        customShadow
                    />
                    
                    <div>
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
                                            placeholder="250"
                                            outlined={true}
                                            customTextColor="#181A18"
                                            customShadow
                                        />
                                    </div>
                                    
                                    {/* Units - 1/3 width */}
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
                                            customTextColor="#181A18"
                                            customShadow
                                        />
                                    </div>
                                </div>
                        </div>
                </div>

                {/* DELIVERY METHOD Section - Only show for separate protocols or first peptide in blended */}
                {(protocolType === 'separate' || (protocolType === 'blended' && isFirstPeptide)) && (
                    <>
                        <div className="mb-4 px-4 py-2.5 rounded-lg flex items-center justify-between" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, borderLeft: `4px solid #e0ded7` }}>
                            <h4 className="font-bold text-sm tracking-wider uppercase" style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76', letterSpacing: '0.1em' }}>
                                DELIVERY METHOD {protocolType === 'blended' && <span className="text-xs font-normal lowercase" style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76' }}>(shared by all peptides)</span>}
                            </h4>
                            <Droplets size={20} style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76' }} />
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-2 p-1.5 rounded-lg" style={{ backgroundColor: theme.secondary, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)' }}>
                                <button 
                                    type="button"
                                    onClick={() => {
                                        handleChange('deliveryMethod', 'pipette');
                                        // Auto-set injection type to SubQ if not already set
                                        if (!item.injectionType) {
                                            handleChange('injectionType', 'SubQ');
                                        }
                                    }}
                                    className={`flex items-center justify-center gap-2 p-2 rounded-md border text-xs font-semibold transition-all`}
                                    style={{
                                        backgroundColor: (item.deliveryMethod || 'pipette') === 'pipette' ? theme.primary : theme.secondary,
                                        color: (item.deliveryMethod || 'pipette') === 'pipette' ? theme.textOnPrimary : theme.text,
                                        borderColor: (item.deliveryMethod || 'pipette') === 'pipette' ? theme.primary : theme.border
                                    }}
                                    onMouseEnter={(e) => {
                                        if ((item.deliveryMethod || 'pipette') !== 'pipette') {
                                            e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : theme.primary + '15';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if ((item.deliveryMethod || 'pipette') !== 'pipette') {
                                            e.currentTarget.style.backgroundColor = theme.secondary;
                                        }
                                    }}
                                >
                                    <Pipette size={16} /> Syringe
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => handleChange('deliveryMethod', 'pen')}
                                    className={`flex items-center justify-center gap-2 p-2 rounded-md border text-xs font-semibold transition-all`}
                                    style={{
                                        backgroundColor: (item.deliveryMethod || 'pipette') === 'pen' ? theme.primary : theme.secondary,
                                        color: (item.deliveryMethod || 'pipette') === 'pen' ? theme.textOnPrimary : theme.text,
                                        borderColor: (item.deliveryMethod || 'pipette') === 'pen' ? theme.primary : theme.border
                                    }}
                                    onMouseEnter={(e) => {
                                        if ((item.deliveryMethod || 'pipette') !== 'pen') {
                                            e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : theme.primary + '15';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if ((item.deliveryMethod || 'pipette') !== 'pen') {
                                            e.currentTarget.style.backgroundColor = theme.secondary;
                                        }
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
                                    className={`flex items-center justify-center gap-2 p-2 rounded-md border text-xs font-semibold transition-all`}
                                    style={{
                                        backgroundColor: (item.deliveryMethod || 'pipette') === 'nasal' ? theme.primary : theme.secondary,
                                        color: (item.deliveryMethod || 'pipette') === 'nasal' ? theme.textOnPrimary : theme.text,
                                        borderColor: (item.deliveryMethod || 'pipette') === 'nasal' ? theme.primary : theme.border
                                    }}
                                    onMouseEnter={(e) => {
                                        if ((item.deliveryMethod || 'pipette') !== 'nasal') {
                                            e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : theme.primary + '15';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if ((item.deliveryMethod || 'pipette') !== 'nasal') {
                                            e.currentTarget.style.backgroundColor = theme.secondary;
                                        }
                                    }}
                                >
                                    <Droplets size={16} /> Nasal
                                </button>
                            </div>
                            
                            {/* Pipette Injection Type Options */}
                            {(item.deliveryMethod || 'pipette') === 'pipette' && (
                                <div className="mt-3">
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
                            {(item.deliveryMethod || 'pipette') === 'pen' && (
                                <div className="mt-3 grid grid-cols-2 gap-4">
                                    {/* Pen Type Selection */}
                                    <div className="relative" ref={penTypeDropdownRef}>
                                        <button
                                            type="button"
                                            onClick={() => setIsPenTypeDropdownOpen(prev => !prev)}
                                            className="w-full px-3 py-2 text-sm border rounded-md flex items-center justify-between transition-all hover:border-gray-400"
                                            style={{
                                                borderColor: isPenTypeDropdownOpen ? theme.primary : '#f0eee7',
                                                backgroundColor: theme.cardBackground,
                                                color: item.penType ? theme.text : theme.textLight
                                            }}
                                        >
                                            <span>
                                                {item.penType ? (
                                                    penTypes.find(t => t.id === item.penType)?.name || 
                                                    (item.penType === 'savvio' ? 'Savvio' :
                                                     item.penType === 'novo' ? 'Novo' :
                                                     item.penType === 'v1' ? 'V1' :
                                                     item.penType === 'v2' ? 'V2' :
                                                     item.penType === 'v3' ? 'V3' :
                                                     item.penType === 'bird-pen' ? 'Bird Pen' :
                                                     item.penType === 'luxura' ? 'Luxura' :
                                                     item.penType === 'gansulin' ? 'Gansulin' :
                                                     item.penType === 'other' ? 'Other' : item.penType)
                                                ) : 'Pen Type'}
                                            </span>
                                            <ChevronDown 
                                                size={16} 
                                                className={`transition-transform duration-200 ${isPenTypeDropdownOpen ? 'rotate-180' : ''}`}
                                                style={{ color: theme.textLight }}
                                            />
                                        </button>
                                        {isPenTypeDropdownOpen && (
                                            <div 
                                                className="absolute z-50 w-full mt-1 rounded-lg shadow-lg border overflow-hidden"
                                                style={{
                                                    backgroundColor: theme.isDark ? '#1f2937' : '#ffffff',
                                                    borderColor: theme.border,
                                                    boxShadow: theme.isDark ? '0 4px 6px rgba(0,0,0,0.3)' : '0 4px 6px rgba(0,0,0,0.1)'
                                                }}
                                            >
                                                {[
                                                    { value: '', label: 'Pen Type' },
                                                    ...penTypes
                                                ].map((option, optIdx) => (
                                                    <React.Fragment key={option.id || option.value || 'empty'}>
                                                        {optIdx > 0 && (
                                                            <div 
                                                                className="h-px mx-2"
                                                                style={{ backgroundColor: theme.border }}
                                                            />
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                handleChange('penType', option.id || option.value || '');
                                                                setIsPenTypeDropdownOpen(false);
                                                            }}
                                                            className="w-full text-left px-3 py-2 text-sm transition-all"
                                                            style={{
                                                                color: item.penType === (option.id || option.value) ? theme.primary : theme.text,
                                                                backgroundColor: 'transparent'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.backgroundColor = theme.primaryLight || `${theme.primary}20`;
                                                                e.currentTarget.style.color = theme.primary;
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.backgroundColor = 'transparent';
                                                                e.currentTarget.style.color = item.penType === (option.id || option.value) ? theme.primary : theme.text;
                                                            }}
                                                        >
                                                            {option.name || option.label}
                                                        </button>
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Pen Color Selection - Dropdown with Color Swatch */}
                                    <div>
                                        <ColorSwatchDropdown
                                            value={item.penColor ? (() => {
                                                const colorObj = penColors.find(c => c.name.toLowerCase() === item.penColor.toLowerCase());
                                                return colorObj?.hex || '#9ca3af';
                                            })() : '#9ca3af'}
                                            onChange={(hexValue) => {
                                                // Find the color name from hex and save the name
                                                const colorObj = penColors.find(c => c.hex === hexValue);
                                                handleChange('penColor', colorObj?.name || hexValue);
                                            }}
                                            colors={penColors}
                                            theme={theme}
                                            placeholder="Pen Color"
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
                        <div className="px-4 py-2.5 rounded-lg flex items-center justify-between" style={{ backgroundColor: theme.secondary, borderLeft: `4px solid #e0ded7` }}>
                            <h4 className="font-bold text-sm tracking-wider uppercase" style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76', letterSpacing: '0.1em' }}>FREQUENCY & SCHEDULE</h4>
                            <Calendar size={20} style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76' }} />
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
                                    outlined={true}
                                    customTextColor="#181A18"
                                    customShadow
                                />
                                <TextInput 
                                    label="Days Off" 
                                    value={item.frequency?.offDays || ''} 
                                    onChange={v => handleFrequencyChange('offDays', v)} 
                                    theme={theme} 
                                    placeholder="2" 
                                    type="number"
                                    outlined={true}
                                    customTextColor="#181A18"
                                    customShadow
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

        </div>
    );
}
