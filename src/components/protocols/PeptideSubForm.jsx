import React, { useState, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import TextInput from '../common/inputs/TextInput';
import CombinedDosageInput from '../common/inputs/CombinedDosageInput';
import ColorSwatchDropdown from '../common/inputs/ColorSwatchDropdown';
import DosingScheduleEditor from './DosingScheduleEditor';
import TimePicker15Min from '../common/inputs/TimePicker15Min';
import { Pen, Droplets, Pipette, ChevronDown, ChevronRight, TrendingUp, Hand, SprayCan, Beaker, Bell, Clock } from 'lucide-react';
import { getChromeGradient, calculateRecon } from '../../utils/recon';
import { penColors } from '../../utils/penColors';
import { useAppContext } from '../../context/AppContext';

export default function PeptideSubForm({ item, index = 0, onChange, onRemove, theme, isOnlyItem, protocolType, isFirstPeptide, linkedItems }) {
    const { reconItems } = useAppContext();
    // Load pen types from localStorage or use defaults
    const [penTypes, setPenTypes] = useState([]);
    const [isPenTypeDropdownOpen, setIsPenTypeDropdownOpen] = useState(false);
    const [penTypeDropdownUp, setPenTypeDropdownUp] = useState(false);
    const [penTypeDropdownPosition, setPenTypeDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const penTypeDropdownRef = React.useRef(null);
    const penTypeButtonRef = React.useRef(null);
    const penTypeListRef = React.useRef(null);

    // Collapsible sub-sections: only one open at a time (accordion), dosage open by default
    const [openSections, setOpenSections] = useState({ dosage: true, halfLife: false, delivery: false, frequency: false });
    const toggleSection = (key) => setOpenSections(prev => {
        const willBeOpen = !prev[key];
        if (willBeOpen) return { dosage: false, halfLife: false, delivery: false, frequency: false, [key]: true };
        return { ...prev, [key]: false };
    });
    
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
        // Only default when the time field is being changed or time is empty
        if (field === 'time') {
            // When time field is being changed, ensure it's not empty
            // But preserve the user's selection - don't force AM if they selected PM
            if (!Array.isArray(newFreq.time) || newFreq.time.length === 0) {
                // Only default to AM if there's no existing time preference
                // Check the original item's time to preserve user's last selection
                const existingTime = item.frequency?.time;
                if (Array.isArray(existingTime) && existingTime.length > 0) {
                    // Preserve the last selected time if available
                    newFreq.time = existingTime;
                } else {
                    newFreq.time = ['AM'];
                }
            }
        } else {
            // When other fields change, preserve existing time or default to AM
            // Don't reset time if it already exists
            if (!newFreq.time || !Array.isArray(newFreq.time) || newFreq.time.length === 0) {
                newFreq.time = ['AM'];
            }
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

    // Handle click outside for pen type dropdown (supports both mouse and touch).
    // List is portaled to document.body so we must check both trigger container and list ref.
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            const target = event.target;
            const inTrigger = penTypeDropdownRef.current?.contains(target);
            const inList = penTypeListRef.current?.contains(target);
            if (!inTrigger && !inList) {
                setIsPenTypeDropdownOpen(false);
            }
        };

        if (isPenTypeDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isPenTypeDropdownOpen]);

    // Check if dropdown should open upward and calculate position
    React.useEffect(() => {
        if (isPenTypeDropdownOpen && penTypeButtonRef.current) {
            const rect = penTypeButtonRef.current.getBoundingClientRect();
            const dropdownHeight = 300; // Approximate dropdown height
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            
            // If not enough space below but enough above, open upward
            const shouldOpenUp = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
            setPenTypeDropdownUp(shouldOpenUp);
            
            // Calculate position for fixed dropdown
            setPenTypeDropdownPosition({
                top: shouldOpenUp ? rect.top - dropdownHeight : rect.bottom,
                left: rect.left,
                width: rect.width
            });
        }
    }, [isPenTypeDropdownOpen]);

    // Summary lines when sections are collapsed
    const dosageSummary = (() => {
        if (item.titration && item.titration.length > 0) return `Titration (${item.titration.length} phase${item.titration.length > 1 ? 's' : ''})`;
        const amt = item.dosage?.amount;
        const unit = item.dosage?.unit || 'mcg';
        const u = item.unitValue ? `${item.unitValue} units` : '';
        if (amt) return `${amt} ${unit}${u ? ` · ${u}` : ''}`;
        return 'No dosage set';
    })();
    const halfLifeSummary = (() => {
        const v = item.halfLife?.value;
        if (!v) return '—';
        const u = item.halfLife?.unit === 'days' ? 'd' : 'h';
        return `${v} ${u}`;
    })();
    const deliverySummary = (() => {
        const d = item.deliveryMethod || 'pipette';
        if (d === 'pipette') return `Syringe, ${item.injectionType || 'SubQ'}`;
        if (d === 'pen') return `Pen${item.penType ? ` · ${penTypes.find(t => t.id === item.penType)?.name || 'Other'}` : ''}`;
        if (d === 'nasal') return 'Nasal';
        if (d === 'topical') return 'Topical';
        return '—';
    })();
    const frequencySummary = (() => {
        const f = item.frequency || { type: 'daily', time: ['AM'] };
        const t = Array.isArray(f.time) && f.time.length ? f.time.join('/') : 'AM';
        if (f.type === 'daily') return `Daily ${t}`;
        if (f.type === 'weekly') return `Weekly (${(f.days || []).join(', ') || '—'}) ${t}`;
        if (f.type === 'cycle') return `Cycle ${f.onDays || '?'} on / ${f.offDays || '?'} off ${t}`;
        if (f.type === 'custom') return `Every ${f.customDays || '?'} days ${t}`;
        return '—';
    })();

    const cardTint = theme.isDark ? theme.primary + '0c' : theme.primary + '06';
    const cardBorder = theme.isDark ? theme.primary + '18' : theme.primary + '10';
    const accentDark = theme.primaryDark || theme.primary;
    const accentLight = theme.primaryLight || theme.primary + '99';
    const accentGradient = `linear-gradient(180deg, ${accentDark} 0%, ${accentLight} 100%)`;

    const CollapsibleSection = ({ sectionKey, title, summary, icon: Icon, children }) => {
        const isOpen = openSections[sectionKey];
        return (
            <div className="rounded-lg overflow-hidden relative" style={{ borderColor: cardBorder, backgroundColor: cardTint, borderWidth: '1px 1px 1px 0', borderStyle: 'solid' }}>
                <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-[3px]" style={{ background: accentGradient }} aria-hidden />
                <button
                    type="button"
                    onClick={() => toggleSection(sectionKey)}
                    className="w-full px-3 py-2 flex items-center gap-2 text-left transition-opacity hover:opacity-90"
                >
                    {isOpen ? <ChevronDown size={16} style={{ color: theme.textLight }} /> : <ChevronRight size={16} style={{ color: theme.textLight }} />}
                    {Icon && <Icon size={14} style={{ color: theme.primary, opacity: 0.9 }} />}
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.text }}>{title}</span>
                    {!isOpen && <span className="text-[11px] ml-auto truncate max-w-[50%]" style={{ color: theme.textLight }}>{summary}</span>}
                </button>
                {isOpen && <div className="px-3 pb-2 pt-1 border-t space-y-2" style={{ borderColor: cardBorder }}>{children}</div>}
            </div>
        );
    };

    return (
        <div className="space-y-2">
                {/* Peptide Name — subtle tint strip */}
                <div className="rounded-lg px-3 py-1.5 border" style={{ backgroundColor: cardTint, borderColor: cardBorder }}>
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

                {/* Dosage Schedule — collapsible */}
                <CollapsibleSection sectionKey="dosage" title="Dosage Schedule" summary={dosageSummary} icon={Pipette}>
                <div className="space-y-2">
                    
                    {/* Dosage Type Toggle - preserve both fixed and titration data when switching */}
                    {(() => {
                        const isFixedDose = item.dosageScheduleType === 'fixed' || (!item.dosageScheduleType && (!item.titration || item.titration.length === 0));
                        const isTitration = item.dosageScheduleType === 'titration' || (!item.dosageScheduleType && item.titration && item.titration.length > 0);
                        return (
                    <div className="inline-flex w-full rounded-lg p-1 gap-1" style={{ backgroundColor: theme.isDark ? '#1a2028' : '#f0efe9', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08)' }}>
                        <button 
                            type="button"
                            onClick={() => {
                                const updated = { ...item, dosageScheduleType: 'fixed' };
                                onChange(updated);
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
                            style={{
                                backgroundColor: isFixedDose ? '#445952' : 'transparent',
                                color: isFixedDose ? '#fff' : theme.textLight,
                                boxShadow: isFixedDose ? 'inset 0 2px 4px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.08)' : 'none'
                            }}
                        >
                            <Pipette size={12} />
                            Fixed Dose
                        </button>
                        <button 
                            type="button"
                            onClick={() => {
                                const updated = { ...item, dosageScheduleType: 'titration' };
                                if (!updated.titration || updated.titration.length === 0) {
                                    updated.titration = [{ dose: '', doseUnit: 'mcg', durationCount: '', durationUnit: 'days' }];
                                }
                                onChange(updated);
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
                            style={{
                                backgroundColor: isTitration ? '#445952' : 'transparent',
                                color: isTitration ? '#fff' : theme.textLight,
                                boxShadow: isTitration ? 'inset 0 2px 4px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.08)' : 'none'
                            }}
                        >
                            <TrendingUp size={12} />
                            Titration
                        </button>
                    </div>
                        );
                    })()}

                    {/* Fixed Dose Input - show when Fixed Dose is selected (data preserved when switching to Titration) */}
                    {(item.dosageScheduleType === 'fixed' || (!item.dosageScheduleType && (!item.titration || item.titration.length === 0))) && (
                        <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2">
                                <CombinedDosageInput
                                    id={`dose-input-${item.id || index}`}
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
                                {/* Smart helper text - shows comparison with calculated units */}
                                {(() => {
                                    // Find matching recon item for this peptide
                                    const reconItem = reconItems?.find(r => {
                                        if (!r.peptides || r.peptides.length === 0) return false;
                                        const reconPeptideNames = r.peptides.map(p => (p.name || '').toLowerCase().trim());
                                        const itemName = (item.name || '').toLowerCase().trim();
                                        return reconPeptideNames.includes(itemName);
                                    });

                                    if (!reconItem) return null;

                                    // Calculate units from recon item
                                    // Pass raw dose amount + unit; recon.js handles conversion
                                    const calc = calculateRecon({
                                        mg: reconItem.mg,
                                        water: reconItem.water,
                                        dose: item.dosage?.amount || 0,
                                        doseUnit: item.dosage?.unit || 'mcg'
                                    });

                                    if (calc.unitsPerDose <= 0) return null;

                                    const calculatedUnits = calc.unitsPerDose.toFixed(0);
                                    const manualUnits = (item.unitValue || '').trim();

                                    if (manualUnits && manualUnits !== calculatedUnits) {
                                        // Manual override is different from calculated
                                        return (
                                            <div style={{ fontSize: '11px', marginTop: '4px', color: '#E5A87A' }}>
                                                ⚠️ Override active. Calc suggests: {calculatedUnits} units
                                            </div>
                                        );
                                    } else if (!manualUnits) {
                                        // No manual value, showing what will be auto-filled
                                        return (
                                            <div style={{ fontSize: '11px', marginTop: '4px', color: '#8B9F98' }}>
                                                ✓ Auto-calculated: {calculatedUnits} units
                                            </div>
                                        );
                                    } else {
                                        // Manual matches calculated
                                        return (
                                            <div style={{ fontSize: '11px', marginTop: '4px', color: '#5F7F76' }}>
                                                ✓ Matches calculation
                                            </div>
                                        );
                                    }
                                })()}
                            </div>
                        </div>
                    )}

                    {/* Reconstitution info - show when a matching recon item exists and recon wasn't skipped */}
                    {(() => {
                        const peptideId = item.id || `peptide-${index}`;
                        const linkedInfo = linkedItems?.[peptideId];
                        if (linkedInfo?.status === 'skipped') return null;

                        const reconItem = reconItems?.find(r => {
                            if (!r.peptides || r.peptides.length === 0) return false;
                            const reconPeptideNames = r.peptides.map(p => (p.name || '').toLowerCase().trim());
                            const itemName = (item.name || '').toLowerCase().trim();
                            return reconPeptideNames.includes(itemName);
                        });
                        if (!reconItem) return null;
                        const totalMg = Array.isArray(reconItem.peptides)
                            ? reconItem.peptides.reduce((sum, p) => sum + (Number(p.mg) || 0), 0)
                            : (Number(reconItem.mg) || 0);
                        const water = Number(reconItem.water) || 0;
                        if (totalMg <= 0 && water <= 0) return null;
                        return (
                            <div
                                className="flex items-center gap-2 mt-1.5 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all hover:opacity-80 active:scale-[0.99]"
                                style={{
                                    backgroundColor: theme.isDark ? 'rgba(68,89,82,0.15)' : 'rgba(68,89,82,0.06)',
                                    border: `1px solid ${theme.isDark ? 'rgba(107,127,119,0.2)' : 'rgba(107,127,119,0.15)'}`,
                                }}
                                onClick={() => {
                                    try { window.location.href = '/app/recon'; } catch { /* noop */ }
                                }}
                                title="View or edit reconstitution details"
                            >
                                <Beaker size={13} style={{ color: '#6B7F77', flexShrink: 0 }} />
                                <span className="text-[11px] font-medium" style={{ color: theme.isDark ? '#8B9F98' : '#5F7F76' }}>
                                    Recon: {totalMg}{reconItem.mgUnit || 'mg'} + {water} mL
                                </span>
                                <span className="text-[11px] font-bold ml-auto" style={{ color: '#6B7F77' }}>
                                    View →
                                </span>
                            </div>
                        );
                    })()}

                    {/* Titration Schedule Editor - show when Titration is selected (data preserved when switching to Fixed Dose) */}
                    {(item.dosageScheduleType === 'titration' || (item.titration && item.titration.length > 0)) && (
                        <div className="mt-1">
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
                </CollapsibleSection>

                {/* Half-Life (Optional) — collapsible */}
                <CollapsibleSection sectionKey="halfLife" title="Half-Life (optional)" summary={halfLifeSummary} icon={Clock}>
                    <div className="flex items-stretch rounded-lg"
                        style={{
                            border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.1)' : '#f0eee7'}`,
                            boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)',
                            backgroundColor: theme.isDark ? 'rgba(0,0,0,0.2)' : (theme.inputBackground || '#fff')
                        }}
                    >
                        <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            value={item.halfLife?.value || ''}
                            onChange={e => onChange({ ...item, halfLife: { ...(item.halfLife || { unit: 'hours' }), value: e.target.value } })}
                            placeholder="e.g., 4"
                            className="flex-1 py-2.5 outline-none min-w-0 rounded-l-lg text-sm"
                            style={{
                                backgroundColor: 'transparent',
                                color: theme.isDark ? theme.text : '#181A18',
                                border: 'none',
                                paddingLeft: '12px',
                                paddingRight: '8px'
                            }}
                        />
                        <div className="flex rounded-r-lg overflow-hidden"
                            style={{
                                borderLeft: theme.isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #f0eee7',
                            }}
                        >
                            {['hours', 'days'].map(u => {
                                const active = (item.halfLife?.unit || 'hours') === u;
                                return (
                                    <button
                                        key={u}
                                        type="button"
                                        onClick={() => onChange({ ...item, halfLife: { ...(item.halfLife || { value: '' }), unit: u } })}
                                        className="px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition-all"
                                        style={{
                                            backgroundColor: active ? '#445952' : (theme.isDark ? 'rgba(255,255,255,0.05)' : (theme.cardBackground || '#f9fafb')),
                                            color: active ? '#fff' : theme.textLight,
                                            border: 'none',
                                        }}
                                    >
                                        {u === 'hours' ? 'Hrs' : 'Days'}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </CollapsibleSection>

                {/* DELIVERY & FREQUENCY - collapsible sections, side by side on desktop when both shown */}
                {(protocolType === 'separate' || (protocolType === 'blended' && isFirstPeptide)) && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 pt-0">
                        {/* Delivery Column — collapsible */}
                        <CollapsibleSection sectionKey="delivery" title={protocolType === 'blended' ? 'Delivery (shared)' : 'Delivery Method'} summary={deliverySummary} icon={Pipette}>
                                <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-1.5">
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
                                        className="flex flex-col items-center justify-center gap-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
                                        style={{
                                            backgroundColor: (item.deliveryMethod || 'pipette') === 'pipette' ? '#445952' : (theme.isDark ? '#1f2937' : '#f5f4f0'),
                                            color: (item.deliveryMethod || 'pipette') === 'pipette' ? '#fff' : theme.text,
                                            border: (item.deliveryMethod || 'pipette') === 'pipette' ? '1px solid #3B4240' : `1px solid ${theme.border}`,
                                            boxShadow: (item.deliveryMethod || 'pipette') === 'pipette' ? 'inset 0 2px 4px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.1)' : 'inset 0 1px 3px rgba(0,0,0,0.06)'
                                        }}
                                    >
                                        <Pipette size={14} />
                                        <span>Syringe</span>
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
                                        className="flex flex-col items-center justify-center gap-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
                                        style={{
                                            backgroundColor: (item.deliveryMethod || 'pipette') === 'pen' ? '#445952' : (theme.isDark ? '#1f2937' : '#f5f4f0'),
                                            color: (item.deliveryMethod || 'pipette') === 'pen' ? '#fff' : theme.text,
                                            border: (item.deliveryMethod || 'pipette') === 'pen' ? '1px solid #3B4240' : `1px solid ${theme.border}`,
                                            boxShadow: (item.deliveryMethod || 'pipette') === 'pen' ? 'inset 0 2px 4px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.1)' : 'inset 0 1px 3px rgba(0,0,0,0.06)'
                                        }}
                                    >
                                        <Pen size={14} />
                                        <span>Pen</span>
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
                                        className="flex flex-col items-center justify-center gap-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
                                        style={{
                                            backgroundColor: (item.deliveryMethod || 'pipette') === 'nasal' ? '#445952' : (theme.isDark ? '#1f2937' : '#f5f4f0'),
                                            color: (item.deliveryMethod || 'pipette') === 'nasal' ? '#fff' : theme.text,
                                            border: (item.deliveryMethod || 'pipette') === 'nasal' ? '1px solid #3B4240' : `1px solid ${theme.border}`,
                                            boxShadow: (item.deliveryMethod || 'pipette') === 'nasal' ? 'inset 0 2px 4px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.1)' : 'inset 0 1px 3px rgba(0,0,0,0.06)'
                                        }}
                                    >
                                        <SprayCan size={14} />
                                        <span>Nasal</span>
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            // Batch all changes into a single state update to prevent lag
                                            const updates = { 
                                                ...item, 
                                                deliveryMethod: 'topical'
                                            };
                                            // Topical doesn't need special unit handling like nasal
                                            if (item.dosage?.unit === 'sprays') {
                                                updates.dosage = { ...item.dosage, unit: 'mcg' };
                                            }
                                            onChange(updates);
                                        }}
                                        className="flex flex-col items-center justify-center gap-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
                                        style={{
                                            backgroundColor: (item.deliveryMethod || 'pipette') === 'topical' ? '#445952' : (theme.isDark ? '#1f2937' : '#f5f4f0'),
                                            color: (item.deliveryMethod || 'pipette') === 'topical' ? '#fff' : theme.text,
                                            border: (item.deliveryMethod || 'pipette') === 'topical' ? '1px solid #3B4240' : `1px solid ${theme.border}`,
                                            boxShadow: (item.deliveryMethod || 'pipette') === 'topical' ? 'inset 0 2px 4px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.1)' : 'inset 0 1px 3px rgba(0,0,0,0.06)'
                                        }}
                                    >
                                        <Hand size={14} />
                                        <span>Topical</span>
                                    </button>
                                </div>
                                
                                {/* Pipette Injection Type Options */}
                                {(item.deliveryMethod || 'pipette') === 'pipette' && (
                                    <div className="inline-flex w-full rounded-lg p-1 gap-1" style={{ backgroundColor: theme.isDark ? '#1a2028' : '#f0efe9', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08)' }}>
                                        {['SubQ', 'IM', 'IV'].map(type => (
                                            <button 
                                                key={type}
                                                type="button"
                                                onClick={() => handleChange('injectionType', type)}
                                                className="flex-1 py-1.5 text-xs font-bold rounded-md transition-all active:scale-95"
                                                style={{
                                                    backgroundColor: (item.injectionType || 'SubQ') === type ? '#6B7F77' : 'transparent',
                                                    color: (item.injectionType || 'SubQ') === type ? '#fff' : theme.textLight,
                                                    boxShadow: (item.injectionType || 'SubQ') === type ? 'inset 0 2px 4px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.08)' : 'none'
                                                }}
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
                                                ref={penTypeButtonRef}
                                                type="button"
                                                onClick={() => setIsPenTypeDropdownOpen(prev => !prev)}
                                                onMouseDown={(e) => e.preventDefault()}
                                                onTouchStart={(e) => e.preventDefault()}
                                                className="w-full px-3 py-2 rounded-lg flex items-center justify-between transition-all border-none outline-none relative z-20"
                                                data-dropdown-container
                                                style={{ 
                                                    border: `1px solid ${theme.isDark ? '#4b5563' : '#f0eee7'}`,
                                                    boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)',
                                                    backgroundColor: theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb'),
                                                    color: item.penType ? theme.text : theme.textLight
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = theme.isDark ? '#4b5563' : '#f3f4f6';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb');
                                                }}
                                            >
                                                <span className="text-sm font-semibold truncate">
                                                    {item.penType ? penTypes.find(t => t.id === item.penType)?.name || 'Other' : 'Pen Type'}
                                                </span>
                                                <svg width="14" height="14" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            </button>
                                            {isPenTypeDropdownOpen && createPortal(
                                                <div 
                                                    ref={penTypeListRef}
                                                    className="fixed rounded-lg shadow-lg border overflow-hidden"
                                                    style={{
                                                        backgroundColor: theme.isDark ? '#1f2937' : '#ffffff',
                                                        borderColor: theme.border,
                                                        width: `${penTypeDropdownPosition.width}px`,
                                                        top: `${penTypeDropdownPosition.top}px`,
                                                        left: `${penTypeDropdownPosition.left}px`,
                                                        maxHeight: '300px',
                                                        overflowY: 'auto',
                                                        zIndex: 2147483647,
                                                        boxShadow: theme.isDark ? '0 10px 25px rgba(0,0,0,0.3)' : '0 10px 25px rgba(0,0,0,0.15)'
                                                    }}
                                                    data-dropdown-container
                                                >
                                                    {[{ id: '', name: 'Pen Type' }, ...penTypes].map((option, idx) => (
                                                        <React.Fragment key={option.id || 'placeholder'}>
                                                            {idx > 0 && (
                                                                <div 
                                                                    className="h-px mx-2"
                                                                    style={{ backgroundColor: theme.border }}
                                                                />
                                                            )}
                                                            <button
                                                                key={option.id || 'placeholder'}
                                                                type="button"
                                                                onMouseDown={(e) => e.preventDefault()}
                                                                onTouchStart={(e) => e.preventDefault()}
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    handleChange('penType', option.id);
                                                                    setIsPenTypeDropdownOpen(false);
                                                                }}
                                                                className="w-full text-left px-3 py-2 text-sm transition-all touch-manipulation"
                                                                style={{
                                                                    color: item.penType === option.id ? theme.primary : theme.text,
                                                                    backgroundColor: 'transparent',
                                                                    WebkitTapHighlightColor: 'transparent'
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.currentTarget.style.backgroundColor = theme.primaryLight || `${theme.primary}20`;
                                                                    e.currentTarget.style.color = theme.primary;
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                                    e.currentTarget.style.color = item.penType === option.id ? theme.primary : theme.text;
                                                                }}
                                                            >
                                                                {option.name}
                                                            </button>
                                                        </React.Fragment>
                                                    ))}
                                                </div>,
                                                document.body
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
                        </CollapsibleSection>

                        {/* Frequency Column — collapsible */}
                        <CollapsibleSection sectionKey="frequency" title="Frequency & Schedule" summary={frequencySummary} icon={Bell}>
                            <div className="space-y-2">
                                <div className="inline-flex w-full rounded-lg p-1 gap-1" style={{ backgroundColor: theme.isDark ? '#1a2028' : '#f0efe9', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08)' }}>
                                    {['daily', 'weekly', 'custom', 'cycle'].map(type => (
                                        <button 
                                            key={type} 
                                            type="button" 
                                            onClick={() => handleFrequencyChange('type', type)}
                                            className="flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all active:scale-95"
                                            style={{
                                                backgroundColor: (item.frequency?.type || 'daily') === type ? '#445952' : 'transparent',
                                                color: (item.frequency?.type || 'daily') === type ? '#fff' : theme.textLight,
                                                boxShadow: (item.frequency?.type || 'daily') === type ? 'inset 0 2px 4px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.08)' : 'none'
                                            }}
                                        >
                                            {type === 'custom' ? 'X Days' : type === 'weekly' ? 'Select Days' : type}
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
                                                    className="flex-1 min-w-[35px] py-1 text-xs font-bold rounded-md transition-all active:scale-95"
                                                    style={{
                                                        backgroundColor: isSelected ? '#445952' : (theme.isDark ? '#1f2937' : '#f5f4f0'),
                                                        border: isSelected ? '1px solid #3B4240' : `1px solid ${theme.border}`,
                                                        color: isSelected ? '#fff' : theme.textLight,
                                                        boxShadow: isSelected ? 'inset 0 2px 4px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.1)' : 'inset 0 1px 3px rgba(0,0,0,0.06)'
                                                    }}
                                                >
                                                    {day[0]}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {item.frequency?.type === 'custom' && (
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="text-sm font-semibold" style={{ color: theme.text }}>Every</span>
                                        <div className="w-20">
                                            <TextInput 
                                                label="" 
                                                value={item.frequency?.customDays || ''} 
                                                onChange={v => handleFrequencyChange('customDays', v)} 
                                                theme={theme} 
                                                placeholder="3" 
                                                type="number" 
                                                outlined={true}
                                                customTextColor={theme.isDark ? null : "#181A18"}
                                                customShadow
                                            />
                                        </div>
                                        <span className="text-sm font-semibold" style={{ color: theme.text }}>Days</span>
                                    </div>
                                )}

                                {/* AM/PM Toggle - More compact */}
                                <div className="inline-flex w-full rounded-lg p-1 gap-1" style={{ backgroundColor: theme.isDark ? '#1a2028' : '#f0efe9', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08)' }}>
                                    {['AM','PM'].map(t => {
                                        const active = Array.isArray(item.frequency?.time) ? item.frequency.time.includes(t) : t === 'AM';
                                        return (
                                            <button key={t} type="button"
                                                onClick={() => {
                                                    const current = Array.isArray(item.frequency?.time) && item.frequency.time.length > 0 ? item.frequency.time : ['AM'];
                                                    const next = current.includes(t) ? current.filter(x => x !== t) : [...current, t];
                                                    if (next.length === 0) {
                                                        const opposite = t === 'AM' ? ['PM'] : ['AM'];
                                                        handleFrequencyChange('time', opposite);
                                                    } else {
                                                        handleFrequencyChange('time', next);
                                                    }
                                                }}
                                                className="flex-1 py-1 text-xs font-bold rounded-md transition-all active:scale-95"
                                                style={{
                                                    backgroundColor: active ? '#6B7F77' : 'transparent',
                                                    color: active ? '#fff' : theme.textLight,
                                                    boxShadow: active ? 'inset 0 2px 4px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.08)' : 'none'
                                                }}
                                            >
                                                {t}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Per-peptide custom reminder time - wrapper elevates z-index so time dropdown appears above card */}
                                <div className="relative" style={{ zIndex: 10000 }}>
                                    <div 
                                        className="rounded-lg border p-2.5 space-y-2 transition-all"
                                        style={{ 
                                            borderColor: item.frequency?.customReminder ? theme.primary + '40' : theme.border + '60',
                                            backgroundColor: item.frequency?.customReminder ? theme.primary + '08' : 'transparent'
                                        }}
                                    >
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newFreq = { ...(item.frequency || { type: 'daily' }) };
                                            newFreq.customReminder = !newFreq.customReminder;
                                            // Set a sensible default time based on AM/PM
                                            if (newFreq.customReminder && !newFreq.reminderTime) {
                                                const isAM = Array.isArray(newFreq.time) ? newFreq.time.includes('AM') : true;
                                                newFreq.reminderTime = isAM ? '08:00' : '18:00';
                                            }
                                            handleChange('frequency', newFreq);
                                        }}
                                        className="w-full flex items-center gap-2 text-left"
                                    >
                                        <div
                                            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                                            style={{ 
                                                backgroundColor: item.frequency?.customReminder ? theme.primary + '20' : theme.secondary 
                                            }}
                                        >
                                            <Bell 
                                                size={13} 
                                                style={{ color: item.frequency?.customReminder ? theme.primary : theme.textLight }}
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <span className="text-xs font-bold block" style={{ color: theme.text }}>
                                                Custom Reminder
                                            </span>
                                            <span className="text-[10px] opacity-50 block" style={{ color: theme.text }}>
                                                Override the global AM/PM reminder with a specific time for this peptide
                                            </span>
                                        </div>
                                        <div 
                                            className={`w-8 h-[18px] rounded-full relative transition-all flex-shrink-0 ${item.frequency?.customReminder ? '' : ''}`}
                                            style={{ backgroundColor: item.frequency?.customReminder ? theme.primary : '#d1d5db' }}
                                        >
                                            <div 
                                                className="absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-all"
                                                style={{ left: item.frequency?.customReminder ? '16px' : '2px' }}
                                            />
                                        </div>
                                    </button>

                                    {item.frequency?.customReminder && (
                                        <div className="pt-1 space-y-1.5">
                                            <TimePicker15Min
                                                label="Remind me at"
                                                value={item.frequency?.reminderTime || '08:00'}
                                                onChange={(time) => {
                                                    const newFreq = { ...(item.frequency || { type: 'daily' }) };
                                                    newFreq.reminderTime = time;
                                                    handleChange('frequency', newFreq);
                                                }}
                                                theme={theme}
                                            />
                                            <p className="text-[9px] opacity-45 px-0.5" style={{ color: theme.text }}>
                                                This peptide will no longer appear in your global morning/evening reminder.
                                            </p>
                                        </div>
                                    )}
                                    </div>
                                </div>
                            </div>
                        </CollapsibleSection>
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
