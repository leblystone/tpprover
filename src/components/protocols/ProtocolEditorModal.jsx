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
        peptides: [{ id: Date.now(), frequency: { type: 'daily', time: ['Morning'] } }],
        duration: { count: '', unit: 'weeks', noEnd: false },
        washout: { enabled: false, duration: '', unit: 'weeks' },
        notes: ''
    });

    const [form, setForm] = useState(createEmpty);

    useEffect(() => {
        if (!open) return;

        let initialData = protocol ? { ...createEmpty(), ...protocol } : createEmpty();

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
        setForm(prev => ({
            ...prev,
            duration: { ...prev.duration, [field]: value }
        }))
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
            finalForm.duration = {
                ...finalForm.duration,
                unit: fromEditorUnit(finalForm.duration.unit),
                count: finalForm.duration.noEnd ? '' : finalForm.duration.count
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
            title={form?.id ? "Edit Protocol" : "New Protocol"}
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
            <div className="space-y-4">
                <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <TextInput label="Protocol Name" value={form.protocolName || ''} onChange={v => handleChange('protocolName', v)} theme={theme} placeholder="e.g., Gut Healing Stack" />
                        <TextInput label="Purpose" value={form.purpose || ''} onChange={v => handleChange('purpose', v)} theme={theme} placeholder="e.g., Immunity" />
                    </div>
                </div>

                {(form.peptides?.length > 1) && (
                    <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                        <div className="text-sm font-medium mb-2" style={{ color: theme.text }}>Protocol Type</div>
                        <div className="flex items-center gap-2">
                            <p className="text-xs text-gray-500 flex-1">Is this a blended protocol (all peptides in one vial) or taken separately?</p>
                            <div className="inline-flex rounded-md bg-gray-100 p-1 shadow-inner">
                                {['Separate', 'Blended'].map(k => (
                                    <button 
                                        key={k} 
                                        type="button" 
                                        onClick={() => handleChange('blendMode', k.toLowerCase())}
                                        className={`px-3 py-1.5 text-sm font-semibold rounded-md ${(form.blendMode || 'separate') === k.toLowerCase() ? 'text-white' : 'text-gray-700 hover:bg-gray-200'}`}
                                        style={(form.blendMode || 'separate') === k.toLowerCase() ? { backgroundColor: theme?.primary } : {}}
                                    >
                                        {k}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-3">
                    {form.peptides?.map((p, index) => (
                        <PeptideSubForm
                            key={p.id || index}
                            item={p}
                            onChange={(updated) => handlePeptideChange(index, updated)}
                            onRemove={() => removePeptide(index)}
                            theme={theme}
                            isOnlyItem={form.peptides.length === 1}
                            isBlended={form.blendMode === 'blended'}
                        />
                    ))}
                </div>

                {form.blendMode === 'blended' && (
                    <div className="p-4 rounded-lg border space-y-4" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                         <DosingScheduleEditor 
                            item={{
                                frequency: form.sharedFrequency,
                                titrationEnabled: form.sharedTitrationEnabled,
                                titration: form.sharedTitration
                            }}
                            onChange={(update) => {
                                setForm(prev => ({
                                    ...prev,
                                    sharedFrequency: update.frequency,
                                    sharedTitrationEnabled: update.titrationEnabled,
                                    sharedTitration: update.titration,
                                }));
                            }}
                            theme={theme}
                            isBlendedContext={true}
                        />
                    </div>
                )}

                <button
                    type="button"
                    onClick={addPeptide}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-xs font-semibold border-dashed border-2"
                    style={{ borderColor: theme.border, color: theme.text }}
                >
                    <PlusCircle size={14} /> Add Another Peptide
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                        <div className="text-sm font-medium mb-2" style={{ color: theme.text }}>Protocol Duration</div>
                        <div className="flex items-center gap-2">
                            <TextInput 
                                type="number" 
                                value={form.duration?.noEnd ? '' : form.duration?.count || ''} 
                                onChange={v => handleDurationChange('count', v)} 
                                theme={theme} 
                                placeholder="e.g., 4"
                                disabled={form.duration?.noEnd}
                                className="w-24"
                            />
                            <div className="inline-flex rounded-md p-1 border" style={{ borderColor: theme.border, backgroundColor: form.duration?.noEnd ? theme.secondary : theme.cardBackground }}>
                                {['Day', 'Week', 'Month'].map(unit => (
                                    <button 
                                        key={unit} 
                                        type="button" 
                                        onClick={() => !form.duration?.noEnd && handleDurationChange('unit', unit)}
                                        disabled={form.duration?.noEnd}
                                        className={`px-3 py-1.5 text-xs font-semibold rounded ${form.duration?.unit === unit && !form.duration?.noEnd ? '' : ''}`}
                                        style={{
                                            color: (form.duration?.unit === unit && !form.duration?.noEnd) ? theme.textOnPrimary : theme.text,
                                            backgroundColor: (form.duration?.unit === unit && !form.duration?.noEnd) ? theme.primary : 'transparent'
                                        }}
                                    >
                                        {unit}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center ml-auto pl-2">
                                <span className="text-sm mr-2" style={{ color: theme.text }}>No end</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={form.duration?.noEnd} onChange={e => handleDurationChange('noEnd', e.target.checked)} className="sr-only peer" />
                                    <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all" style={{backgroundColor: form.duration?.noEnd ? theme.primary : theme.secondary }}></div>
                                </label>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                        <div className="text-sm font-medium mb-2" style={{ color: theme.text }}>Enable Washout</div>
                        <div className="flex items-center gap-2">
                             <label className="relative inline-flex items-center cursor-pointer mr-2">
                                <input type="checkbox" checked={form.washout?.enabled} onChange={e => handleWashoutChange('enabled', e.target.checked)} className="sr-only peer" />
                                <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all" style={{backgroundColor: form.washout?.enabled ? theme.primary : theme.secondary}}></div>
                            </label>
                            <TextInput 
                                type="number" 
                                value={form.washout?.enabled ? form.washout?.duration || '' : ''} 
                                onChange={v => handleWashoutChange('duration', v)} 
                                theme={theme} 
                                placeholder="e.g., 2"
                                disabled={!form.washout?.enabled}
                                className="w-24"
                            />
                            <div className="inline-flex rounded-md p-1 border" style={{ borderColor: theme.border, backgroundColor: !form.washout?.enabled ? theme.secondary : theme.cardBackground }}>
                                {['Day', 'Week', 'Month'].map(unit => (
                                    <button 
                                        key={unit} 
                                        type="button" 
                                        onClick={() => form.washout?.enabled && handleWashoutChange('unit', unit)}
                                        disabled={!form.washout?.enabled}
                                        className={`px-3 py-1.5 text-xs font-semibold rounded ${form.washout?.unit === unit && form.washout?.enabled ? '' : ''}`}
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

                <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                    <TextInput label="Notes" value={form.notes || ''} onChange={v => handleChange('notes', v)} theme={theme} placeholder="Add any personal notes for this protocol..." multiline />
                </div>
            </div>
        </Modal>
    );
}


