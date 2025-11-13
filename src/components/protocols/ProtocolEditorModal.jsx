import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import TextInput from '../common/inputs/TextInput';
import { PlusCircle, Trash2, Lock, BookOpenCheck, Calendar, CalendarClock, ImageUp, Ungroup, Blend } from 'lucide-react';
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
    const [isDurationFocused, setIsDurationFocused] = useState(false);
    const [isWashoutFocused, setIsWashoutFocused] = useState(false);
    const getPrimaryActionGradient = (saving) => {
        const secondaryColor = theme?.secondary || '#d1d5db';
        if (saving) {
            return `linear-gradient(135deg, ${secondaryColor} 0%, ${secondaryColor} 100%)`;
        }
        return `linear-gradient(135deg, ${theme?.primary} 0%, ${theme?.primaryDark || theme?.primary} 100%)`;
    };
    const primaryActionDefaultShadow = theme?.isDark ? '0 4px 6px rgba(0, 0, 0, 0.3)' : '0 4px 6px rgba(0, 0, 0, 0.1)';
    const primaryActionHoverShadow = theme?.isDark ? '0 10px 25px rgba(0, 0, 0, 0.5)' : '0 10px 25px rgba(0, 0, 0, 0.15)';
    const terracottaGradient = 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)';
    const terracottaHoverGradient = 'linear-gradient(135deg, #b5684a 0%, #a35a3f 100%)';
    
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
                <div className="w-full flex items-center justify-between gap-3">
                    {form?.id ? (
                        <button
                            onClick={() => onDelete?.(form)}
                            className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md active:scale-95"
                            style={{
                                background: terracottaGradient,
                                color: '#ffffff',
                                border: 'none',
                                boxShadow: theme?.isDark ? '0 4px 10px rgba(0,0,0,0.35)' : '0 4px 10px rgba(0,0,0,0.15)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = terracottaHoverGradient;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = terracottaGradient;
                            }}
                        >
                            Delete
                        </button>
                    ) : <span />}
                    <div className="flex items-center gap-3 ml-auto">
                        {saveError && (
                            <span className="text-sm font-medium" style={{ color: theme?.error || '#b91c1c' }}>
                                {saveError}
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={handleFinalSave}
                            disabled={isSavingToProtocols || isReadOnly}
                            className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:shadow-none disabled:opacity-75"
                            style={{
                                background: getPrimaryActionGradient(isSavingToProtocols || isReadOnly),
                                color: (isSavingToProtocols || isReadOnly) ? (theme?.text || '#111827') : (theme?.textOnPrimary || '#ffffff'),
                                border: 'none',
                                boxShadow: (isSavingToProtocols || isReadOnly) ? 'none' : primaryActionDefaultShadow
                            }}
                            onMouseEnter={(e) => {
                                if (isSavingToProtocols || isReadOnly) return;
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = primaryActionHoverShadow;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = (isSavingToProtocols || isReadOnly) ? 'none' : primaryActionDefaultShadow;
                                e.currentTarget.style.background = getPrimaryActionGradient(isSavingToProtocols || isReadOnly);
                            }}
                            title={isReadOnly ? "Upgrade to save protocols" : "Save protocol changes"}
                        >
                            {isSavingToProtocols ? 'Saving…' : (isReadOnly ? 'Save Protocol (Upgrade Required)' : 'Save Protocol')}
                        </button>
                    </div>
                </div>
            }
        >
            <div className="space-y-5">
                {/* PROTOCOL INFO Section Header */}
                <div className="px-4 py-2.5 rounded-lg flex items-center justify-between mb-2" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, borderLeft: `4px solid #e0ded7` }}>
                    <h4 className="font-bold text-sm tracking-wider uppercase" style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76', letterSpacing: '0.1em' }}>PROTOCOL INFO</h4>
                    <BookOpenCheck size={20} style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76' }} />
                </div>

                {/* Protocol Basics - Visual Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 -mt-2">
                    <div className="space-y-2">
                        <TextInput
                            label="Name"
                            value={form.protocolName || ''}
                            onChange={v => handleChange('protocolName', v)}
                            placeholder="e.g., Retatrutide, GLOW, etc."
                            theme={theme}
                            outlined={true}
                            customTextColor="#181A18"
                            customShadow
                        />

                        <TextInput
                            label="Purpose/Goal"
                            value={form.purpose || ''}
                            onChange={v => handleChange('purpose', v)}
                            placeholder="Weight Loss, Recovery, etc."
                            theme={theme}
                            outlined={true}
                            customTextColor="#181A18"
                            customShadow
                        />
                    </div>

                    {/* Protocol Type - Compact Card Style */}
                    <div className="flex items-start">
                        <div className="grid grid-cols-2 gap-2 w-full">
                            {[
                                { key: 'separate', name: 'Separate', icon: Ungroup, description: 'Individual doses' },
                                { key: 'blended', name: 'Blended', icon: Blend, description: 'Mixed together' }
                            ].map(option => {
                                const Icon = option.icon
                                const isSelected = form.protocolType === option.key
                                return (
                                    <button
                                        key={option.key}
                                        type="button"
                                        onClick={() => handleChange('protocolType', option.key)}
                                        className="flex flex-col items-center justify-center p-1 rounded-lg transition-all"
                                        style={{
                                            backgroundColor: isSelected ? theme.primary : (theme.isDark ? '#1f2937' : '#ffffff'),
                                            border: `1px solid ${isSelected ? theme.primary : theme.border}`,
                                            color: isSelected ? '#ffffff' : (theme.isDark ? '#9ca3af' : '#6b7280'),
                                            minHeight: '50px',
                                            boxShadow: isSelected ? `0 1px 3px ${theme.primary}30` : 'none',
                                            position: 'relative'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isSelected) {
                                                e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : '#f9fafb'
                                                e.currentTarget.style.color = theme.text
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isSelected) {
                                                e.currentTarget.style.backgroundColor = theme.isDark ? '#1f2937' : '#ffffff'
                                                e.currentTarget.style.color = theme.isDark ? '#9ca3af' : '#6b7280'
                                            }
                                        }}
                                    >
                                        <Icon size={18} style={{ marginBottom: '2px', position: 'relative', zIndex: 1 }} />
                                        <span className="text-xs font-medium text-center leading-tight" style={{ position: 'relative', zIndex: 1 }}>{option.name}</span>
                                        <span className="text-xs text-center leading-tight opacity-75 mt-0.5" style={{ position: 'relative', zIndex: 1 }}>{option.description}</span>
                                    </button>
                                )
                            })}
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
                <div className="mb-4 px-4 py-2.5 rounded-lg flex items-center justify-between" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, borderLeft: `4px solid #e0ded7` }}>
                    <h4 className="font-bold text-sm tracking-wider uppercase" style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76', letterSpacing: '0.1em' }}>PROTOCOL DURATION</h4>
                    <CalendarClock size={20} style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76' }} />
                </div>

                {/* Duration Content */}
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={form.duration?.noEnd} onChange={e => handleDurationChange('noEnd', e.target.checked)} className="sr-only peer" />
                                        <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all" style={{backgroundColor: form.duration?.noEnd ? theme.primary : (theme.isDark ? '#4b5563' : theme.secondary) }}></div>
                                    </label>
                                    <span className="text-sm" style={{ color: theme.text }}>No end date</span>
                                </div>
                            </div>
                            <div className="relative">
                                {/* Combined Input with Pill Selector - Outlined Style */}
                                <div 
                                    className="flex items-stretch rounded-lg"
                                    style={{ 
                                        border: `1px solid #f0eee7`,
                                        boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)',
                                        backgroundColor: theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff'),
                                        opacity: form.duration?.noEnd ? 0.5 : 1
                                    }}
                                >
                                    <input 
                                        type="text"
                                        id="duration-input"
                                        value={form.duration?.noEnd ? '' : (form.duration?.count ?? '')}
                                        onChange={e => handleDurationChange('count', e.target.value)}
                                        onFocus={() => setIsDurationFocused(true)}
                                        onBlur={() => setIsDurationFocused(false)}
                                        placeholder=" "
                                        disabled={form.duration?.noEnd}
                                        className="flex-1 px-3 py-3 outline-none min-w-0 rounded-l-lg"
                                        style={{ 
                                            backgroundColor: 'transparent',
                                            color: '#181A18',
                                            border: 'none'
                                        }}
                                    />
                                    
                                    {/* Unit Selector Pills */}
                                    <div 
                                        className="flex items-center gap-0.5 px-1 py-1 flex-shrink-0 rounded-r-lg"
                                        style={{ 
                                            borderLeft: theme.isDark ? '1px solid #4b5563' : `1px solid #f0eee7`,
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
                                <label 
                                    htmlFor="duration-input"
                                    className="absolute pointer-events-none transition-all"
                                    style={{
                                        fontSize: (isDurationFocused || (form.duration?.count && form.duration.count.trim() && !form.duration?.noEnd)) ? '0.75rem' : '0.9375rem',
                                        top: (isDurationFocused || (form.duration?.count && form.duration.count.trim() && !form.duration?.noEnd)) ? '-8px' : '14px',
                                        left: (isDurationFocused || (form.duration?.count && form.duration.count.trim() && !form.duration?.noEnd)) ? '12px' : '16px',
                                        padding: (isDurationFocused || (form.duration?.count && form.duration.count.trim() && !form.duration?.noEnd)) ? '0 4px' : '0',
                                        background: (isDurationFocused || (form.duration?.count && form.duration.count.trim() && !form.duration?.noEnd)) ? (theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')) : 'transparent',
                                        color: (isDurationFocused || (form.duration?.count && form.duration.count.trim() && !form.duration?.noEnd)) ? theme.primary : (theme.textLight || theme.text),
                                        fontWeight: 500
                                    }}
                                >
                                    Duration
                                </label>
                            </div>
                        </div>
                        
                        <div className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={form.washout?.enabled} onChange={e => handleWashoutChange('enabled', e.target.checked)} className="sr-only peer" />
                                        <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all" style={{backgroundColor: form.washout?.enabled ? theme.primary : (theme.isDark ? '#4b5563' : theme.secondary)}}></div>
                                    </label>
                                    <span className="text-sm" style={{ color: theme.text }}>Enable washout</span>
                                </div>
                            </div>
                            <div className="relative">
                                {/* Combined Input with Pill Selector - Outlined Style */}
                                <div 
                                    className="flex items-stretch rounded-lg"
                                    style={{ 
                                        border: `1px solid #f0eee7`,
                                        boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)',
                                        backgroundColor: theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff'),
                                        opacity: !form.washout?.enabled ? 0.5 : 1
                                    }}
                                >
                                    <input 
                                        type="text"
                                        id="washout-input"
                                        value={form.washout?.enabled ? (form.washout?.duration ?? '') : ''}
                                        onChange={e => handleWashoutChange('duration', e.target.value)}
                                        onFocus={() => setIsWashoutFocused(true)}
                                        onBlur={() => setIsWashoutFocused(false)}
                                        placeholder=" "
                                        disabled={!form.washout?.enabled}
                                        className="flex-1 px-3 py-3 outline-none min-w-0 rounded-l-lg"
                                        style={{ 
                                            backgroundColor: 'transparent',
                                            color: '#181A18',
                                            border: 'none'
                                        }}
                                    />
                                    
                                    {/* Unit Selector Pills */}
                                    <div 
                                        className="flex items-center gap-0.5 px-1 py-1 flex-shrink-0 rounded-r-lg"
                                        style={{ 
                                            borderLeft: theme.isDark ? '1px solid #4b5563' : `1px solid #f0eee7`,
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
                                <label 
                                    htmlFor="washout-input"
                                    className="absolute pointer-events-none transition-all"
                                    style={{
                                        fontSize: (isWashoutFocused || (form.washout?.duration && form.washout.duration.trim() && form.washout?.enabled)) ? '0.75rem' : '0.9375rem',
                                        top: (isWashoutFocused || (form.washout?.duration && form.washout.duration.trim() && form.washout?.enabled)) ? '-8px' : '14px',
                                        left: (isWashoutFocused || (form.washout?.duration && form.washout.duration.trim() && form.washout?.enabled)) ? '12px' : '16px',
                                        padding: (isWashoutFocused || (form.washout?.duration && form.washout.duration.trim() && form.washout?.enabled)) ? '0 4px' : '0',
                                        background: (isWashoutFocused || (form.washout?.duration && form.washout.duration.trim() && form.washout?.enabled)) ? (theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')) : 'transparent',
                                        color: (isWashoutFocused || (form.washout?.duration && form.washout.duration.trim() && form.washout?.enabled)) ? theme.primary : (theme.textLight || theme.text),
                                        fontWeight: 500
                                    }}
                                >
                                    Washout Period
                                </label>
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

                {/* After Start Info */}
                <div className="p-3 rounded-lg" style={{ 
                    backgroundColor: theme.isDark ? '#1f2937' : theme.cardBackground,
                    boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 3px rgba(15,23,42,0.08)'
                }}>
                    <div className="text-sm font-semibold mb-3" style={{ color: theme.text }}>What Happens After Starting</div>
                    <div className="grid grid-cols-1 gap-2.5 text-sm">
                        <div className="flex items-start gap-3 p-2.5 rounded-lg" style={{ backgroundColor: theme.secondary, borderLeft: `4px solid ${theme.primary}` }}>
                            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: theme.primary }}>
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <div className="space-y-0.5">
                                <div className="font-medium" style={{ color: theme.text }}>Dashboard Integration</div>
                                <div className="text-xs" style={{ color: theme.textLight }}>Daily research entries surface on your Dashboard.</div>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-2.5 rounded-lg" style={{ backgroundColor: theme.secondary, borderLeft: `4px solid ${theme.primary}` }}>
                            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: theme.primary }}>
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div className="space-y-0.5">
                                <div className="font-medium" style={{ color: theme.text }}>Calendar Schedule</div>
                                <div className="text-xs" style={{ color: theme.textLight }}>Research cadence appears on your Calendar automatically.</div>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-2.5 rounded-lg" style={{ backgroundColor: theme.secondary, borderLeft: `4px solid ${theme.primary}` }}>
                            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: theme.primary }}>
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="space-y-0.5">
                                <div className="font-medium" style={{ color: theme.text }}>Progress Tracking</div>
                                <div className="text-xs" style={{ color: theme.textLight }}>Mark research complete to track momentum across the study.</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* EXTRA DETAILS Section Header */}
                <div className="mb-4 px-4 py-2.5 rounded-lg flex items-center justify-between" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, borderLeft: `4px solid #e0ded7` }}>
                    <h4 className="font-bold text-sm tracking-wider uppercase" style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76', letterSpacing: '0.1em' }}>EXTRA DETAILS</h4>
                    <ImageUp size={20} style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76' }} />
                </div>

                {/* Notes Content */}
                <div>
                    <TextInput 
                        label="Notes"
                        value={form.notes || ''} 
                        onChange={v => handleChange('notes', v)} 
                        theme={theme} 
                        placeholder="Add any personal notes for this protocol..." 
                        multiline 
                        rows={3}
                        outlined={true}
                        customTextColor="#181A18"
                        customShadow
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


