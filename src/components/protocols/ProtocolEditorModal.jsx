import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import TextInput from '../common/inputs/TextInput';
import { PlusCircle, Trash2, Lock } from 'lucide-react';
import PeptideSubForm from './PeptideSubForm';
import SchedulingPreview from './SchedulingPreview';
import AutoSaveIndicator from '../common/AutoSaveIndicator';
import useAutoSave from '../../utils/useAutoSave';

export default function ProtocolEditorModal({ open, onClose, onSave, onDelete, theme, protocol, isReadOnly = false, onUpgrade }) {

    const createEmpty = () => ({
        protocolName: '',
        purpose: '',
        protocolType: 'separate', // 'separate' | 'blended'
        peptides: [{ id: Date.now(), frequency: { type: 'daily', time: ['AM'] }, unitValue: '' }],
        duration: { count: '', unit: 'weeks', noEnd: false },
        washout: { enabled: false, duration: '', unit: 'weeks' },
        notes: ''
    });

    const [form, setForm] = useState(createEmpty);
    const [isSavingToProtocols, setIsSavingToProtocols] = useState(false);
    const [saveError, setSaveError] = useState(null);
    
    // Auto-save functionality with protocol persistence
    const storageKey = `tpprover_protocol_draft_${protocol?.id || 'new'}`;
    const { isSaving, lastSaved, clearSavedData, markAsSubmitted, updateFormData } = useAutoSave(
        storageKey, 
        form, 
        setForm, 
        2000, // 2 second delay
        async (formData) => {
            // Auto-save to protocols list if there's meaningful data
            const hasProtocolName = formData?.protocolName && formData.protocolName.trim().length > 0;
            const hasPeptides = formData?.peptides && formData.peptides.length > 0 && 
                formData.peptides.some(p => p.name && p.name.trim().length > 0);
            const hasNotes = formData?.notes && formData.notes.trim().length > 0;
            
            if (formData && (hasProtocolName || hasPeptides || hasNotes)) {
                try {
                    if (protocol?.id) {
                        console.log('🔄 Auto-saving existing protocol:', protocol.id);
                        // Event is dispatched by useAutoSave hook automatically for existing protocols
                    } else {
                        console.log('🔄 Auto-saving new protocol draft');
                        // For new protocols, we don't auto-save to the protocols list yet
                        // Just keep the localStorage draft for now
                    }
                } catch (error) {
                    console.warn('Auto-save to protocols failed:', error);
                }
            } else {
                console.log('🚫 Skipping autosave - insufficient data:', {
                    hasProtocolName,
                    hasPeptides,
                    hasNotes
                });
            }
        }
    );
    

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
                frequency: initialData.frequency || { type: 'daily', time: ['AM'] },
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
            initialData.peptides = [{ id: Date.now(), frequency: { type: 'daily', time: ['AM'] }, unitValue: '' }];
        }

        // Map blendMode to protocolType for form state
        if (initialData.blendMode) {
            initialData.protocolType = initialData.blendMode;
        }

        // If it's a blended protocol, sync the frequency from the first peptide to a shared root-level frequency
        if (initialData.blendMode === 'blended' && initialData.peptides.length > 0) {
            initialData.sharedFrequency = initialData.peptides[0].frequency;
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
            // Ensure duration.count is always a string (never undefined)
            if (initialData.duration.count === undefined || initialData.duration.count === null) {
                initialData.duration.count = '';
            } else {
                initialData.duration.count = String(initialData.duration.count);
            }
            // Ensure duration.noEnd is always a boolean
            if (initialData.duration.noEnd === undefined || initialData.duration.noEnd === null) {
                initialData.duration.noEnd = false;
            }
            
            initialData.washout = initialData.washout || {};
            if (initialData.washout.unit) {
                initialData.washout.unit = toEditorUnit(initialData.washout.unit);
            }
            // Ensure washout.duration is always a string (never undefined)
            if (initialData.washout.duration === undefined || initialData.washout.duration === null) {
                initialData.washout.duration = '';
            } else {
                initialData.washout.duration = String(initialData.washout.duration);
            }
            // Ensure washout.enabled is always a boolean
            if (initialData.washout.enabled === undefined || initialData.washout.enabled === null) {
                initialData.washout.enabled = false;
            }
            if (initialData.washout.enabled && initialData.washout.duration === '' && (initialData.washout.count != null && initialData.washout.count !== '')) {
                initialData.washout.duration = String(initialData.washout.count);
            }
        } catch {}
        
        // Normalize peptide data to ensure all input values are defined
        if (initialData.peptides && Array.isArray(initialData.peptides)) {
            initialData.peptides = initialData.peptides.map(peptide => {
                const normalized = { ...peptide };
                // Ensure unitValue is always a string
                if (normalized.unitValue === undefined || normalized.unitValue === null) {
                    normalized.unitValue = '';
                }
                // Normalize titration steps
                if (normalized.titration && Array.isArray(normalized.titration)) {
                    normalized.titration = normalized.titration.map(step => ({
                        ...step,
                        dose: step.dose === undefined || step.dose === null ? '' : String(step.dose),
                        durationCount: step.durationCount === undefined || step.durationCount === null ? '' : String(step.durationCount),
                        doseUnit: step.doseUnit || 'mcg',
                        durationUnit: step.durationUnit || 'days'
                    }));
                }
                return normalized;
            });
        }
        
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
            
            // Update auto-save data
            updateFormData(newState);
            
            return newState;
        });
    };

    const handlePeptideChange = (index, updatedPeptide) => {
        setForm(prev => {
            const newPeptides = [...(prev.peptides || [])];
            newPeptides[index] = updatedPeptide;
            const newState = { ...prev, peptides: newPeptides };
            
            // Update auto-save data
            updateFormData(newState);
            
            return newState;
        });
    };

    const addPeptide = () => {
        setForm(prev => {
            const newState = {
                ...prev,
                peptides: [...(prev.peptides || []), { id: Date.now(), frequency: { type: 'daily', time: ['AM'] }, unitValue: '' }]
            };
            
            // Update auto-save data
            updateFormData(newState);
            
            return newState;
        });
    };

    const removePeptide = (index) => {
        setForm(prev => {
            const newState = {
                ...prev,
                peptides: prev.peptides.filter((_, i) => i !== index)
            };
            
            // Update auto-save data
            updateFormData(newState);
            
            return newState;
        });
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
            
            // Update auto-save data
            updateFormData(newForm);
            
            console.log('🔢 New duration:', newForm.duration);
            return newForm;
        });
    };

    const handleWashoutChange = (field, value) => {
        setForm(prev => {
            const newState = {
                ...prev,
                washout: { ...prev.washout, [field]: value }
            };
            
            // Update auto-save data
            updateFormData(newState);
            
            return newState;
        });
    };

    const handleFinalSave = async () => {
        if (isReadOnly) {
            if (onUpgrade) {
                onUpgrade();
            }
            return;
        }
        try {
            setIsSavingToProtocols(true);
            setSaveError(null);
            
            const fromEditorUnit = (u) => {
                const s = String(u || '').toLowerCase();
                if (s.includes('day')) return 'day';
                if (s.includes('week')) return 'week';
                if (s.includes('month')) return 'month';
                return s || 'week';
            };
            const finalForm = { ...form };

            // Map protocolType to blendMode for consistency with rest of app
            finalForm.blendMode = finalForm.protocolType;

            // If blended, sync the shared frequency back to all peptides
            if (finalForm.blendMode === 'blended') {
                finalForm.peptides = finalForm.peptides.map(p => ({
                    ...p,
                    frequency: finalForm.sharedFrequency
                }));
            }

            if (finalForm.duration) {
                // Validate duration count
                let cleanCount = finalForm.duration.count;
                if (!finalForm.duration.noEnd && cleanCount !== '') {
                    const numValue = parseFloat(cleanCount);
                    if (isNaN(numValue) || numValue <= 0 || numValue > 999) {
                        setSaveError('Please enter a valid duration count (1-999)');
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
            
            // Call the save function
            await onSave?.(finalForm);
            
            // Only clear auto-save and close modal after successful save
            markAsSubmitted();
            onClose();
        } catch (error) {
            console.error('❌ Failed to save protocol:', error);
            setSaveError('Failed to save protocol. Please try again.');
        } finally {
            setIsSavingToProtocols(false);
        }
    };

    // Close handler - auto-save handles all changes, so no confirmation needed
    const handleClose = () => {
        // Auto-save is handling all changes, so we can close without confirmation
        // For new protocols, data is auto-saved to localStorage
        // For existing protocols, data is auto-saved to both localStorage and the protocols list
        onClose();
    };

    return (
        <Modal 
            open={open}
            onClose={handleClose}
            title={
                form?.protocolName 
                    ? (form?.id ? `Editing: ${form.protocolName}` : `New: ${form.protocolName}`)
                    : (form?.id ? "Edit Protocol" : "New Protocol")
            }
            titleExtra={
                <AutoSaveIndicator 
                    isSaving={isSaving}
                    lastSaved={lastSaved}
                    theme={theme}
                    compact={true}
                    iconOnly={true}
                />
            }
            theme={theme}
            variant="modern"
            maxWidth="max-w-4xl"
            footer={
                <div className="flex items-center justify-between w-full">
                    {form?.id && (
                        <button onClick={() => onDelete?.(form)} className="px-3 py-2 rounded-md border text-sm font-medium" style={{ borderColor: theme?.border, color: '#b91c1c' }}>
                            Delete Protocol
                        </button>
                    )}
                    <div className="flex items-center justify-end gap-2" style={{ marginLeft: form?.id ? 'auto' : '0' }}>
                        {saveError && (
                            <span className="text-sm" style={{ color: theme?.error || '#b91c1c', marginRight: '0.5rem' }}>
                                {saveError}
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={handleFinalSave}
                            disabled={isSavingToProtocols || isReadOnly}
                            className="px-4 py-2 rounded-md text-sm font-medium transition-opacity"
                            style={{
                                backgroundColor: theme?.primary,
                                color: theme?.textOnPrimary,
                                opacity: (isSavingToProtocols || isReadOnly) ? 0.6 : 1
                            }}
                        >
                            {isSavingToProtocols ? 'Saving…' : 'Save Protocol'}
                        </button>
                        <button 
                            type="button"
                            onClick={handleClose} 
                            className="px-4 py-2 rounded-md border text-sm font-medium" 
                            style={{ borderColor: theme?.border, color: theme?.text }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            }
        >
            <div className="space-y-5">
                {/* Protocol Basics - Visual Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="relative">
                            <input
                                type="text"
                                value={form.protocolName || ''}
                                onChange={e => handleChange('protocolName', e.target.value)}
                                placeholder="e.g., Semaglutide, NAD+, etc."
                                className="w-full px-4 py-3 text-lg font-medium rounded-xl focus:ring-2 focus:ring-opacity-50 transition-all focus:outline-none"
                                style={{
                                    border: theme.isDark ? 'none' : `2px solid ${theme.border}`,
                                    boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.05)',
                                    backgroundColor: theme.cardBackground,
                                    color: theme.text,
                                    '--tw-ring-color': theme.primary
                                }}
                            />
                            <label className="absolute -top-2 left-3 px-2 text-xs font-medium" 
                                   style={{ backgroundColor: theme.cardBackground, color: theme.textLight }}>
                                Protocol For:
                            </label>
                        </div>

                        <div className="relative">
                            <input
                                type="text"
                                value={form.purpose || ''}
                                onChange={e => handleChange('purpose', e.target.value)}
                                placeholder="Weight Loss, Recovery, etc."
                                className="w-full px-4 py-3 rounded-xl focus:ring-2 focus:ring-opacity-50 transition-all focus:outline-none"
                                style={{
                                    border: theme.isDark ? 'none' : `2px solid ${theme.border}`,
                                    boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.05)',
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
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => handleChange('protocolType', 'separate')}
                                className="p-3 rounded-lg text-center transition-all"
                                style={{ 
                                    border: form.protocolType === 'separate' 
                                        ? `2px solid ${theme.primary}` 
                                        : (theme.isDark ? 'none' : `2px solid ${theme.border}`),
                                    backgroundColor: form.protocolType === 'separate' ? theme.primary + '15' : (theme.isDark ? '#1f2937' : theme.cardBackground),
                                    boxShadow: form.protocolType === 'separate' 
                                        ? `0 2px 8px ${theme.primary}20` 
                                        : (theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.05)')
                                }}
                                onMouseEnter={(e) => {
                                    if (form.protocolType !== 'separate') {
                                        e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : theme.primary + '10';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (form.protocolType !== 'separate') {
                                        e.currentTarget.style.backgroundColor = theme.isDark ? '#1f2937' : theme.cardBackground;
                                    }
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
                                className="p-3 rounded-lg text-center transition-all"
                                style={{ 
                                    border: form.protocolType === 'blended' 
                                        ? `2px solid ${theme.primary}` 
                                        : (theme.isDark ? 'none' : `2px solid ${theme.border}`),
                                    backgroundColor: form.protocolType === 'blended' ? theme.primary + '15' : (theme.isDark ? '#1f2937' : theme.cardBackground),
                                    boxShadow: form.protocolType === 'blended' 
                                        ? `0 2px 8px ${theme.primary}20` 
                                        : (theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.05)')
                                }}
                                onMouseEnter={(e) => {
                                    if (form.protocolType !== 'blended') {
                                        e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : theme.primary + '10';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (form.protocolType !== 'blended') {
                                        e.currentTarget.style.backgroundColor = theme.isDark ? '#1f2937' : theme.cardBackground;
                                    }
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
                    {/* Shared Settings for Blended Protocols */}
                    {form.protocolType === 'blended' && form.peptides?.length > 1 && (
                        <div className="p-4 rounded-xl border-2" 
                             style={{ borderColor: theme.primary + '40', backgroundColor: theme.primary + '08' }}>
                            <h4 className="font-semibold mb-1.5 text-sm" style={{ color: theme.text }}>
                                Shared Protocol Settings
                            </h4>
                            <p className="text-xs" style={{ color: theme.textLight }}>
                                These settings apply to all peptides since they'll be mixed together
                            </p>
                        </div>
                    )}
                    
                    {/* Peptide Cards */}
                    <div className="grid gap-4">
                        {form.peptides?.map((p, index) => (
                            <div key={p.id || index} 
                                 className="rounded-xl overflow-hidden transition-all hover:shadow-lg"
                                 style={{ 
                                     border: theme.isDark ? 'none' : `1px solid ${theme.border}`,
                                     boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.05)',
                                     backgroundColor: index % 2 === 0 
                                         ? (theme.isDark ? '#0f172a' : theme.cardBackground)  // Darker for better contrast with input fields
                                         : (theme.isDark ? '#111827' : theme.secondary + '80')
                                 }}>
                                {/* Peptide Header with Number */}
                                <div className="px-4 py-2 border-b flex items-center justify-between"
                                     style={{ 
                                         backgroundColor: index % 2 === 0 
                                             ? theme.primary + '15' 
                                             : theme.primary + '25',
                                         borderColor: theme.border
                                     }}>
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                                             style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}>
                                            {index + 1}
                                        </div>
                                        <span className="font-semibold text-sm" style={{ color: theme.text }}>
                                            Peptide {index + 1}
                                        </span>
                                    </div>
                                    {form.peptides.length > 1 && (
                                        <button 
                                            onClick={() => removePeptide(index)}
                                            className="text-red-500 hover:text-red-700 text-xs font-medium"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                                
                                {/* Peptide Content */}
                                <div className="p-4">
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
                    <div className="flex justify-center">
                        <button
                            onClick={addPeptide}
                            className="px-6 py-3 rounded-lg flex items-center gap-2 transition-all"
                            style={{ 
                                backgroundColor: theme.isDark ? '#1f2937' : theme.secondary,
                                color: theme.primary
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : theme.primary + '15';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = theme.isDark ? '#1f2937' : theme.secondary;
                            }}
                        >
                            <PlusCircle size={18} />
                            <span className="font-semibold text-sm" style={{ color: theme.text }}>Add Another Peptide</span>
                        </button>
                    </div>

                </div>

                {/* Separator */}
                <div className="border-t" style={{ borderColor: theme.border }}></div>

                {/* PROTOCOL DURATION Section Header */}
                <div className="mb-4 px-4 py-2.5 rounded-lg" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, borderLeft: `4px solid ${theme.primary}` }}>
                    <h4 className="font-black text-sm tracking-wide uppercase" style={{ color: theme.isDark ? '#a8b5a0' : theme.primary }}>Protocol Duration</h4>
                </div>

                {/* Duration Content */}
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <div className="text-sm font-medium" style={{ color: theme.text }}>Duration</div>
                            <div className="space-y-3">
                                {/* Combined Input with Pill Selector */}
                                <div 
                                    className="flex items-stretch rounded-lg overflow-hidden"
                                    style={{ 
                                        border: theme.isDark ? 'none' : `1px solid ${theme.border}`,
                                        boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.05)',
                                        opacity: form.duration?.noEnd ? 0.5 : 1
                                    }}
                                >
                                    <input 
                                        type="text"
                                        value={form.duration?.noEnd ? '' : (form.duration?.count ?? '')}
                                        onChange={e => handleDurationChange('count', e.target.value)}
                                        placeholder="4"
                                        disabled={form.duration?.noEnd}
                                        className="flex-1 px-3 py-2 outline-none min-w-0"
                                        style={{ 
                                            backgroundColor: theme.isDark ? '#1f2937' : (theme.inputBackground || '#fff'),
                                            color: theme.text 
                                        }}
                                    />
                                    
                                    {/* Unit Selector Pills */}
                                    <div 
                                        className="flex items-center gap-0.5 px-1 py-1 flex-shrink-0"
                                        style={{ 
                                            borderLeft: theme.isDark ? '1px solid #4b5563' : `1px solid ${theme.border}`,
                                            backgroundColor: theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb')
                                        }}
                                    >
                                        {['Day', 'Week', 'Month'].map(unit => (
                                            <button 
                                                key={unit}
                                                type="button"
                                                onClick={() => !form.duration?.noEnd && handleDurationChange('unit', unit)}
                                                disabled={form.duration?.noEnd}
                                                className={`px-1.5 py-0.5 text-xs font-semibold rounded transition-all flex-shrink-0 ${
                                                    (form.duration?.unit === unit && !form.duration?.noEnd)
                                                        ? 'text-white shadow-sm'
                                                        : 'text-gray-600 hover:bg-gray-200'
                                                }`}
                                                style={(form.duration?.unit === unit && !form.duration?.noEnd) ? { backgroundColor: theme.primary } : {}}
                                            >
                                                {unit}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={form.duration?.noEnd} onChange={e => handleDurationChange('noEnd', e.target.checked)} className="sr-only peer" />
                                        <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all" style={{backgroundColor: form.duration?.noEnd ? theme.primary : (theme.isDark ? '#4b5563' : theme.secondary) }}></div>
                                    </label>
                                    <span className="text-sm" style={{ color: theme.text }}>No end date</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="space-y-3">
                            <div className="text-sm font-medium" style={{ color: theme.text }}>Washout Period</div>
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={form.washout?.enabled} onChange={e => handleWashoutChange('enabled', e.target.checked)} className="sr-only peer" />
                                        <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all" style={{backgroundColor: form.washout?.enabled ? theme.primary : (theme.isDark ? '#4b5563' : theme.secondary)}}></div>
                                    </label>
                                    <span className="text-sm" style={{ color: theme.text }}>Enable washout</span>
                                </div>
                                {/* Combined Input with Pill Selector */}
                                <div 
                                    className="flex items-stretch rounded-lg overflow-hidden"
                                    style={{ 
                                        border: theme.isDark ? 'none' : `1px solid ${theme.border}`,
                                        boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.05)',
                                        opacity: !form.washout?.enabled ? 0.5 : 1
                                    }}
                                >
                                    <input 
                                        type="text"
                                        value={form.washout?.enabled ? (form.washout?.duration ?? '') : ''}
                                        onChange={e => handleWashoutChange('duration', e.target.value)}
                                        placeholder="2"
                                        disabled={!form.washout?.enabled}
                                        className="flex-1 px-3 py-2 outline-none min-w-0"
                                        style={{ 
                                            backgroundColor: theme.isDark ? '#1f2937' : (theme.inputBackground || '#fff'),
                                            color: theme.text 
                                        }}
                                    />
                                    
                                    {/* Unit Selector Pills */}
                                    <div 
                                        className="flex items-center gap-0.5 px-1 py-1 flex-shrink-0"
                                        style={{ 
                                            borderLeft: theme.isDark ? '1px solid #4b5563' : `1px solid ${theme.border}`,
                                            backgroundColor: theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb')
                                        }}
                                    >
                                        {['Day', 'Week', 'Month'].map(unit => (
                                            <button 
                                                key={unit}
                                                type="button"
                                                onClick={() => form.washout?.enabled && handleWashoutChange('unit', unit)}
                                                disabled={!form.washout?.enabled}
                                                className={`px-1.5 py-0.5 text-xs font-semibold rounded transition-all flex-shrink-0 ${
                                                    (form.washout?.unit === unit && form.washout?.enabled)
                                                        ? 'text-white shadow-sm'
                                                        : 'text-gray-600 hover:bg-gray-200'
                                                }`}
                                                style={(form.washout?.unit === unit && form.washout?.enabled) ? { backgroundColor: theme.primary } : {}}
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

                {/* Scheduling Preview */}
                {form.peptides && form.peptides.length > 0 && form.peptides.some(p => p.name) && (
                    <div className="space-y-3">
                        <SchedulingPreview protocol={form} theme={theme} />
                    </div>
                )}

                {/* Notes Content */}
                <div>
                    <TextInput 
                        value={form.notes || ''} 
                        onChange={v => handleChange('notes', v)} 
                        theme={theme} 
                        placeholder="Add any personal notes for this protocol..." 
                        multiline 
                        rows={6}
                    />
                </div>
            </div>
            
            {/* Lockout Overlay - Covers entire modal */}
            {isReadOnly && (
                <div className="absolute inset-0 backdrop-blur-md bg-white/60 flex items-center justify-center z-50 rounded-lg">
                    <div className="text-center p-6 max-w-md">
                        <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: `${theme.primary}20` }}>
                            <Lock size={32} style={{ color: theme.primary }} />
                        </div>
                        <h3 className="text-xl font-bold mb-2" style={{ color: theme.primaryDark }}>
                            Trial has ended
                        </h3>
                        <p className="text-sm mb-4" style={{ color: theme.text }}>
                            Upgrade to continue creating and managing protocols
                        </p>
                        <button
                            onClick={() => {
                                if (onUpgrade) {
                                    onUpgrade();
                                } else {
                                    window.location.href = '/app/account';
                                }
                            }}
                            className="px-6 py-2.5 rounded-lg font-semibold transition-all hover:opacity-90"
                            style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                        >
                            Choose a Plan
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
}


