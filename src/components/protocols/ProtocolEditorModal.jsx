import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import TextInput from '../common/inputs/TextInput';
import { PlusCircle, Trash2, Lock } from 'lucide-react';
import PeptideSubForm from './PeptideSubForm';
import DosingScheduleEditor from './DosingScheduleEditor';
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
    
    // Auto-save functionality with protocol persistence
    const storageKey = `tpprover_protocol_draft_${protocol?.id || 'new'}`;
    const { isSaving, lastSaved, clearSavedData, markAsSubmitted, updateFormData } = useAutoSave(
        storageKey, 
        form, 
        setForm, 
        2000, // 2 second delay
        async (formData) => {
            // Auto-save to protocols list if this is an existing protocol
            if (protocol?.id && formData && Object.keys(formData).length > 0) {
                try {
                    console.log('🔄 Auto-saving existing protocol:', protocol.id);
                    await onSave?.(formData);
                } catch (error) {
                    console.warn('Auto-save to protocols failed:', error);
                }
            }
        }
    );
    
    // State for save operations
    const [isSavingToProtocols, setIsSavingToProtocols] = useState(false);
    const [saveError, setSaveError] = useState(null);

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

    // Prevent modal from closing if there's unsaved data
    const handleClose = () => {
        // Check if there's meaningful data that hasn't been saved
        const hasData = form && (
            form.protocolName || 
            form.purpose ||
            form.peptides?.some(p => p.name) ||
            form.notes
        );
        
        if (hasData && !isSavingToProtocols) {
            const shouldClose = window.confirm(
                'You have unsaved changes. Are you sure you want to close without saving?'
            );
            if (!shouldClose) return;
        }
        
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
                <div className="flex items-center gap-2">
                    <AutoSaveIndicator 
                        isSaving={isSaving || isSavingToProtocols}
                        lastSaved={lastSaved}
                        theme={theme}
                        compact={true}
                    />
                    {(isSaving || isSavingToProtocols) && (
                        <span className="text-xs opacity-75" style={{ color: theme.textOnPrimary }}>
                            {isSavingToProtocols ? 'Saving...' : 'Auto-saving...'}
                        </span>
                    )}
                </div>
            }
            theme={theme}
            variant="modern"
            maxWidth="max-w-4xl"
            footer={
                <div className="flex items-center justify-between w-full">
                    {form?.id ? (
                        // Existing protocol - show delete button
                        <button onClick={() => onDelete?.(form)} className="px-3 py-2 rounded-md border text-sm font-medium" style={{ borderColor: theme?.border, color: '#b91c1c' }}>
                            Delete Protocol
                        </button>
                    ) : (
                        // New protocol - show save/cancel buttons
                        <div className="flex items-center justify-end gap-2 w-full">
                            <button 
                                onClick={handleClose} 
                                className="px-4 py-2 rounded-md border text-sm font-medium" 
                                style={{ borderColor: theme?.border, color: theme?.text }}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleFinalSave}
                                disabled={isSavingToProtocols}
                                className="px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ backgroundColor: theme?.primary, color: theme?.textOnPrimary }}
                            >
                                {isSavingToProtocols ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    )}
                </div>
            }
        >
            <div className="space-y-5">
                {/* Error Display */}
                {saveError && (
                    <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span className="text-sm font-medium text-red-800">{saveError}</span>
                        </div>
                    </div>
                )}
                
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
                                Protocol For:
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
                                frequency={form.peptides[0]?.frequency || { type: 'daily', time: ['AM'] }}
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
                                 className="rounded-xl border overflow-hidden transition-all hover:shadow-lg"
                                 style={{ 
                                     borderColor: theme.border,
                                     backgroundColor: index % 2 === 0 
                                         ? theme.cardBackground 
                                         : theme.secondary + '80'
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
                    <button
                        onClick={addPeptide}
                        className="p-6 rounded-xl flex items-center justify-center gap-3 transition-all"
                        style={{ 
                            backgroundColor: theme.isDark ? '#1f2937' : theme.secondary,
                            color: theme.textLight
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : theme.primary + '15';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = theme.isDark ? '#1f2937' : theme.secondary;
                        }}
                    >
                        <PlusCircle size={24} />
                        <div className="text-left">
                            <div className="font-semibold" style={{ color: theme.text }}>Add Another Peptide</div>
                            <div className="text-sm">Click to add more compounds to this protocol</div>
                        </div>
                    </button>

                    {/* Global Titration for Blended Protocols */}
                    {form.protocolType === 'blended' && form.peptides?.length > 0 && (
                        <div className="p-6 rounded-xl border-2" 
                             style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                            <h4 className="font-semibold mb-4" style={{ color: theme.text }}>
                                Titration Schedule (Blended Protocol)
                            </h4>
                            <p className="text-sm mb-4" style={{ color: theme.textLight }}>
                                This titration schedule applies to the entire blended protocol
                            </p>
                            
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={!!form.sharedTitrationEnabled} 
                                            onChange={e => {
                                                const isEnabled = e.target.checked;
                                                handleChange('sharedTitrationEnabled', isEnabled);
                                                // If enabling and no steps exist, add the first one automatically
                                                if (isEnabled && (!form.sharedTitration || form.sharedTitration.length === 0)) {
                                                    handleChange('sharedTitration', [{ dose: '', doseUnit: 'mcg', durationCount: '', durationUnit: 'weeks' }]);
                                                }
                                            }} 
                                            className="sr-only peer" 
                                        />
                                        <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all" 
                                             style={{backgroundColor: form.sharedTitrationEnabled ? theme.primary : theme.secondary}}></div>
                                    </label>
                                    <span className="text-sm font-medium" style={{ color: theme.text }}>Enable Dosing Schedule (Titration)</span>
                                </div>

                                {form.sharedTitrationEnabled && (
                                    <DosingScheduleEditor 
                                        titration={form.sharedTitration || []}
                                        onChange={t => handleChange('sharedTitration', t)}
                                        theme={theme}
                                    />
                                )}
                            </div>
                        </div>
                    )}
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
                                        value={form.duration?.noEnd ? '' : String(form.duration?.count || '')}
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
                                        <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all" style={{backgroundColor: form.duration?.noEnd ? theme.primary : theme.secondary }}></div>
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
                                        <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all" style={{backgroundColor: form.washout?.enabled ? theme.primary : theme.secondary}}></div>
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
                                        value={form.washout?.enabled ? form.washout?.duration || '' : ''}
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

                {/* Separator */}
                <div className="border-t" style={{ borderColor: theme.border }}></div>

                {/* Notes Content */}
                <div>
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


