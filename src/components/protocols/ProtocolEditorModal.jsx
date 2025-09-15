import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import TextInput from '../common/inputs/TextInput';
import { PlusCircle, Trash2 } from 'lucide-react';
import PeptideSubForm from './PeptideSubForm';
import DosingScheduleEditor from './DosingScheduleEditor';

export default function ProtocolEditorModal({ open, onClose, onSave, onDelete, theme, protocol }) {

    const createEmpty = () => ({
        protocolName: '',
        purpose: '',
        protocolType: 'separate', // 'separate' | 'blended'
        peptides: [{ id: Date.now(), frequency: { type: 'daily', time: ['Morning'] } }],
        duration: { count: '', unit: 'weeks', noEnd: false },
        washout: { enabled: false, duration: '', unit: 'weeks' },
        notes: ''
    });

    const [form, setForm] = useState(createEmpty);

    useEffect(() => {
        if (!open) return;

        let initialData = protocol ? { ...createEmpty(), ...protocol } : createEmpty();
        
        // Clean duration data on load to prevent corruption
        if (initialData.duration && initialData.duration.count !== '') {
            // Keep it simple - just ensure it's a string for the input
            initialData.duration.count = String(initialData.duration.count);
        }

        // Migration logic for old single-peptide protocols
        if (initialData.name && (!initialData.peptides || initialData.peptides.length === 0)) {
            const legacyPeptide = {
                id: initialData.id || Date.now(),
                name: initialData.name,
                dosage: initialData.dosage,
                frequency: initialData.frequency || { type: 'daily', time: ['Morning'] },
                titration: initialData.titration,
            };
            initialData.peptides = [legacyPeptide];

            // Clean up old top-level fields
            delete initialData.name;
            delete initialData.dosage;
            delete initialData.frequency;
            delete initialData.titration;
        }

        if (!initialData.peptides || initialData.peptides.length === 0) {
            initialData.peptides = [{ id: Date.now(), frequency: { type: 'daily', time: ['Morning'] } }];
        }

        // If it's a blended protocol, sync the frequency from the first peptide to a shared root-level frequency
        if (initialData.blendMode === 'blended' && initialData.peptides.length > 0) {
            initialData.sharedFrequency = initialData.peptides[0].frequency;
            initialData.sharedTitrationEnabled = initialData.peptides[0].titrationEnabled;
            initialData.sharedTitration = initialData.peptides[0].titration;
        }


        // Normalize units for editor display (Day/Week/Month) and hydrate washout.duration from count
        const toEditorUnit = (u) => {
            const s = String(u || '').toLowerCase();
            if (s.includes('day')) return 'Day';
            if (s.includes('week')) return 'Week';
            if (s.includes('month')) return 'Month';
            return 'Week';
        };
        try {
            initialData.duration = initialData.duration || {};
            if (initialData.duration.unit) {
                initialData.duration.unit = toEditorUnit(initialData.duration.unit);
            } else {
                initialData.duration.unit = 'Week';
            }
            initialData.washout = initialData.washout || {};
            if (initialData.washout.unit) {
                initialData.washout.unit = toEditorUnit(initialData.washout.unit);
            }
            if (initialData.washout.enabled && (initialData.washout.duration == null || initialData.washout.duration === '') && (initialData.washout.count != null && initialData.washout.count !== '')) {
                initialData.washout.duration = initialData.washout.count;
            }
        } catch {}

        setForm(initialData);
    }, [open, protocol]);
    
    const handleChange = (field, value) => {
        setForm(prev => {
            const newState = { ...prev, [field]: value };
            // If protocolName is being changed, update the first peptide's name
            if (field === 'protocolName') {
                const newPeptides = [...(prev.peptides || [])];
                if (newPeptides.length > 0) {
                    newPeptides[0] = { ...newPeptides[0], name: value };
                    newState.peptides = newPeptides;
                }
            }
            return newState;
        });
    };

    const handlePeptideChange = (index, updatedPeptide) => {
        setForm(prev => {
            const newPeptides = [...(prev.peptides || [])];
            newPeptides[index] = updatedPeptide;
            return { ...prev, peptides: newPeptides };
        });
    };

    const addPeptide = () => {
        setForm(prev => ({
            ...prev,
            peptides: [...(prev.peptides || []), { id: Date.now(), frequency: { type: 'daily', time: ['Morning'] } }]
        }));
    };

    const removePeptide = (index) => {
        setForm(prev => ({
            ...prev,
            peptides: prev.peptides.filter((_, i) => i !== index)
        }));
    };

    const handleDurationChange = (field, value) => {
        console.log('🔢 Duration change:', { field, value, type: typeof value });
        
        setForm(prev => {
            // For count field, keep it simple - let the HTML5 number input handle validation
            const processedValue = field === 'count' ? String(value) : value;
            
            const newForm = {
                ...prev,
                duration: { ...prev.duration, [field]: processedValue }
            };
            
            console.log('🔢 New duration:', newForm.duration);
            return newForm;
        });
    };

    const handleWashoutChange = (field, value) => {
        setForm(prev => ({
            ...prev,
            washout: { ...prev.washout, [field]: value }
        }))
    };

    const handleFinalSave = () => {
        const fromEditorUnit = (u) => {
            const s = String(u || '').toLowerCase();
            if (s.includes('day')) return 'day';
            if (s.includes('week')) return 'week';
            if (s.includes('month')) return 'month';
            return s || 'week';
        };
        const finalForm = { ...form };

        // If blended, sync the shared frequency/titration back to all peptides
        if (finalForm.blendMode === 'blended') {
            finalForm.peptides = finalForm.peptides.map(p => ({
                ...p,
                frequency: finalForm.sharedFrequency,
                titrationEnabled: finalForm.sharedTitrationEnabled,
                titration: finalForm.sharedTitration
            }));
        }

        if (finalForm.duration) {
            // Validate duration count
            let cleanCount = finalForm.duration.count;
            if (!finalForm.duration.noEnd && cleanCount !== '') {
                const numValue = parseFloat(cleanCount);
                if (isNaN(numValue) || numValue <= 0 || numValue > 999) {
                    alert('Please enter a valid duration count (1-999)');
                    return;
                }
                cleanCount = numValue;
            }
            
            finalForm.duration = {
                ...finalForm.duration,
                unit: fromEditorUnit(finalForm.duration.unit),
                count: finalForm.duration.noEnd ? '' : cleanCount
            };
        }
        if (finalForm.washout) {
            if (finalForm.washout.duration) {
                finalForm.washout.count = finalForm.washout.duration;
                delete finalForm.washout.duration;
            }
            finalForm.washout = {
                ...finalForm.washout,
                unit: fromEditorUnit(finalForm.washout.unit)
            };
        }
        onSave?.(finalForm);
    };

    return (
        <Modal 
            open={open}
            onClose={onClose}
            title={
                form?.protocolName 
                    ? (form?.id ? `Edit: ${form.protocolName}` : `New: ${form.protocolName}`)
                    : (form?.id ? "Edit Protocol" : "New Protocol")
            }
            theme={theme}
            maxWidth="max-w-4xl"
            footer={(
                <div className="flex items-center justify-between w-full">
                    <div>
                        {form?.id && (
                            <button onClick={() => onDelete?.(form)} className="px-3 py-2 rounded-md border text-sm" style={{ borderColor: theme?.border, color: '#b91c1c' }}>Delete</button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onClose} className="px-3 py-2 rounded-md border text-sm" style={{ borderColor: theme?.border }}>Cancel</button>
                        <button onClick={handleFinalSave} className="px-3 py-2 rounded-md text-sm" style={{ backgroundColor: theme?.primary, color: theme?.white }}>Save Protocol</button>
                    </div>
                </div>
            )}
        >
            <div className="space-y-8">
                {/* Header Section - Clean and Minimal */}
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2" style={{ color: theme.text }}>
                        {form?.id ? "Edit Protocol" : "Create New Protocol"}
                    </h2>
                </div>

                {/* Protocol Basics - Visual Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="relative">
                            <input
                                type="text"
                                value={form.protocolName || ''}
                                onChange={e => handleChange('protocolName', e.target.value)}
                                placeholder="e.g., Semaglutide, NAD+, etc."
                                className="w-full px-4 py-3 text-lg font-medium rounded-xl border-2 focus:ring-2 focus:ring-opacity-50 transition-all"
                                style={{
                                    borderColor: theme.border,
                                    backgroundColor: theme.cardBackground,
                                    color: theme.text,
                                    '--tw-ring-color': theme.primary
                                }}
                            />
                            <label className="absolute -top-2 left-3 px-2 text-xs font-medium" 
                                   style={{ backgroundColor: theme.cardBackground, color: theme.textLight }}>
                                Protocol Name
                            </label>
                        </div>

                        <div className="relative">
                            <input
                                type="text"
                                value={form.purpose || ''}
                                onChange={e => handleChange('purpose', e.target.value)}
                                placeholder="Weight Loss, Recovery, etc."
                                className="w-full px-4 py-3 rounded-xl border-2 focus:ring-2 focus:ring-opacity-50 transition-all"
                                style={{
                                    borderColor: theme.border,
                                    backgroundColor: theme.cardBackground,
                                    color: theme.text,
                                    '--tw-ring-color': theme.primary
                                }}
                            />
                            <label className="absolute -top-2 left-3 px-2 text-xs font-medium"
                                   style={{ backgroundColor: theme.cardBackground, color: theme.textLight }}>
                                Purpose/Goal
                            </label>
                        </div>
                    </div>

                    {/* Protocol Type - Side by Side Cards */}
                    <div>
                        <label className="block text-sm font-semibold mb-3" style={{ color: theme.text }}>
                            Protocol Type
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => handleChange('protocolType', 'separate')}
                                className="p-3 border-2 rounded-lg text-center transition-all transform hover:scale-[1.02]"
                                style={{ 
                                    borderColor: form.protocolType === 'separate' ? theme.primary : theme.border,
                                    backgroundColor: form.protocolType === 'separate' ? theme.primary + '15' : theme.cardBackground,
                                    boxShadow: form.protocolType === 'separate' ? `0 2px 8px ${theme.primary}20` : 'none'
                                }}
                            >
                                <div className="font-semibold text-sm mb-1" style={{ color: theme.text }}>Separate</div>
                                <div className="text-xs" style={{ color: theme.textLight }}>
                                    Individual timing
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleChange('protocolType', 'blended')}
                                className="p-3 border-2 rounded-lg text-center transition-all transform hover:scale-[1.02]"
                                style={{ 
                                    borderColor: form.protocolType === 'blended' ? theme.primary : theme.border,
                                    backgroundColor: form.protocolType === 'blended' ? theme.primary + '15' : theme.cardBackground,
                                    boxShadow: form.protocolType === 'blended' ? `0 2px 8px ${theme.primary}20` : 'none'
                                }}
                            >
                                <div className="font-semibold text-sm mb-1" style={{ color: theme.text }}>Blended</div>
                                <div className="text-xs" style={{ color: theme.textLight }}>
                                    Mixed together
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Separator */}
                <div className="border-t" style={{ borderColor: theme.border }}></div>


                {/* Peptides Section - Visual Cards */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-bold" style={{ color: theme.text }}>Peptides & Compounds</h3>
                            <p className="text-sm mt-1" style={{ color: theme.textLight }}>
                                Add the peptides and compounds for this protocol
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-full text-sm font-medium" 
                                  style={{ backgroundColor: theme.primary + '20', color: theme.primary }}>
                                {form.peptides?.length || 0} {form.peptides?.length === 1 ? 'peptide' : 'peptides'}
                            </span>
                        </div>
                    </div>

                    {/* Shared Settings for Blended Protocols */}
                    {form.protocolType === 'blended' && form.peptides?.length > 1 && (
                        <div className="p-6 rounded-xl border-2" 
                             style={{ borderColor: theme.primary + '40', backgroundColor: theme.primary + '08' }}>
                            <h4 className="font-semibold mb-3" style={{ color: theme.text }}>
                                Shared Protocol Settings
                            </h4>
                            <p className="text-sm mb-4" style={{ color: theme.textLight }}>
                                These settings apply to all peptides since they'll be mixed together
                            </p>
                            <DosingScheduleEditor
                                frequency={form.peptides[0]?.frequency || { type: 'daily', time: ['Morning'] }}
                                onChange={(newFreq) => {
                                    const updatedPeptides = form.peptides.map(p => ({ ...p, frequency: newFreq }));
                                    handleChange('peptides', updatedPeptides);
                                }}
                                theme={theme}
                            />
                        </div>
                    )}
                    
                    {/* Peptide Cards */}
                    <div className="grid gap-4">
                        {form.peptides?.map((p, index) => (
                            <div key={p.id || index} 
                                 className="rounded-xl border-2 overflow-hidden transition-all hover:shadow-lg"
                                 style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                                <div className="p-1">
                                    <PeptideSubForm
                                        item={p}
                                        onChange={(updated) => handlePeptideChange(index, updated)}
                                        onRemove={() => removePeptide(index)}
                                        protocolType={form.protocolType}
                                        isFirstPeptide={index === 0}
                                        theme={theme}
                                        isOnlyItem={form.peptides.length === 1}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>


                        {/* Add Peptide Button */}
                        <button
                            onClick={addPeptide}
                            className="p-6 border-2 border-dashed rounded-xl flex items-center justify-center gap-3 transition-all hover:scale-[1.01] hover:shadow-md"
                            style={{ 
                                borderColor: theme.border, 
                                color: theme.textLight,
                                backgroundColor: theme.cardBackground + '50'
                            }}
                        >
                            <PlusCircle size={24} />
                            <div className="text-left">
                                <div className="font-semibold" style={{ color: theme.text }}>Add Another Peptide</div>
                                <div className="text-sm">Click to add more compounds to this protocol</div>
                            </div>
                        </button>
                </div>

                {/* Separator */}
                <div className="border-t" style={{ borderColor: theme.border }}></div>

                {/* Duration & Washout Section */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold" style={{ color: theme.text }}>Duration & Washout</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                            <div className="text-sm font-medium mb-3" style={{ color: theme.text }}>Protocol Duration</div>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <TextInput 
                                        type="number" 
                                        value={form.duration?.noEnd ? '' : String(form.duration?.count || '')} 
                                        onChange={v => handleDurationChange('count', v)} 
                                        theme={theme} 
                                        placeholder="4"
                                        disabled={form.duration?.noEnd}
                                        className="w-20"
                                    />
                                    <div className="inline-flex rounded-md p-1 border" style={{ borderColor: theme.border, backgroundColor: form.duration?.noEnd ? theme.secondary : theme.cardBackground }}>
                                        {['Day', 'Week', 'Month'].map(unit => (
                                            <button 
                                                key={unit} 
                                                type="button" 
                                                onClick={() => !form.duration?.noEnd && handleDurationChange('unit', unit)}
                                                disabled={form.duration?.noEnd}
                                                className={`px-2 py-1 text-xs font-semibold rounded`}
                                                style={{
                                                    color: (form.duration?.unit === unit && !form.duration?.noEnd) ? theme.textOnPrimary : theme.text,
                                                    backgroundColor: (form.duration?.unit === unit && !form.duration?.noEnd) ? theme.primary : 'transparent'
                                                }}
                                            >
                                                {unit}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={form.duration?.noEnd} onChange={e => handleDurationChange('noEnd', e.target.checked)} className="sr-only peer" />
                                        <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all" style={{backgroundColor: form.duration?.noEnd ? theme.primary : theme.secondary }}></div>
                                    </label>
                                    <span className="text-sm" style={{ color: theme.text }}>No end date</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                            <div className="text-sm font-medium mb-3" style={{ color: theme.text }}>Washout Period</div>
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={form.washout?.enabled} onChange={e => handleWashoutChange('enabled', e.target.checked)} className="sr-only peer" />
                                        <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all" style={{backgroundColor: form.washout?.enabled ? theme.primary : theme.secondary}}></div>
                                    </label>
                                    <span className="text-sm" style={{ color: theme.text }}>Enable washout</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <TextInput 
                                        type="number" 
                                        value={form.washout?.enabled ? form.washout?.duration || '' : ''} 
                                        onChange={v => handleWashoutChange('duration', v)} 
                                        theme={theme} 
                                        placeholder="2"
                                        disabled={!form.washout?.enabled}
                                        className="w-20"
                                    />
                                    <div className="inline-flex rounded-md p-1 border" style={{ borderColor: theme.border, backgroundColor: !form.washout?.enabled ? theme.secondary : theme.cardBackground }}>
                                        {['Day', 'Week', 'Month'].map(unit => (
                                            <button 
                                                key={unit} 
                                                type="button" 
                                                onClick={() => form.washout?.enabled && handleWashoutChange('unit', unit)}
                                                disabled={!form.washout?.enabled}
                                                className={`px-2 py-1 text-xs font-semibold rounded`}
                                                style={{
                                                    color: (form.washout?.unit === unit && form.washout?.enabled) ? theme.textOnPrimary : theme.text,
                                                    backgroundColor: (form.washout?.unit === unit && form.washout?.enabled) ? theme.primary : 'transparent'
                                                }}
                                            >
                                                {unit}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Separator */}
                <div className="border-t" style={{ borderColor: theme.border }}></div>

                {/* Notes Section */}
                <div className="space-y-3">
                    <h3 className="text-lg font-semibold" style={{ color: theme.text }}>Notes</h3>
                    <TextInput 
                        value={form.notes || ''} 
                        onChange={v => handleChange('notes', v)} 
                        theme={theme} 
                        placeholder="Add any personal notes for this protocol..." 
                        multiline 
                        rows={3}
                    />
                </div>
            </div>
        </Modal>
    );
}


