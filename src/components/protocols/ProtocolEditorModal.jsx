import React, { useState, useEffect } from 'react';
import BottomSheet from '../common/BottomSheet';
import TextInput from '../common/inputs/TextInput';
import { PlusCircle, Trash2, Lock, BookOpenCheck, Calendar, CalendarClock, ImageUp, Ungroup, Blend, TestTube, ChevronDown, ChevronRight, Check, Loader2 } from 'lucide-react';
import PeptideSubForm from './PeptideSubForm';
import SchedulingPreview from './SchedulingPreview';
import AutoSaveIndicator from '../common/AutoSaveIndicator';
import useAutoSave from '../../utils/useAutoSave';
import { generateId } from '../../utils/string';

export default function ProtocolEditorModal({ open, onClose, onSave, onDelete, theme, protocol, isReadOnly = false, onUpgrade }) {

    const createEmpty = () => ({
        protocolName: '',
        purpose: '',
        protocolType: 'separate', // 'separate' | 'blended'
        peptides: [{ id: generateId(), frequency: { type: 'daily', time: ['AM'] }, unitValue: '' }],
        duration: { count: '', unit: 'weeks', noEnd: false },
        washout: { enabled: false, duration: '', unit: 'weeks' },
        notes: ''
    });

    const [form, setForm] = useState(createEmpty);
    const [isSavingToProtocols, setIsSavingToProtocols] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const [isDurationFocused, setIsDurationFocused] = useState(false);
    const [isWashoutFocused, setIsWashoutFocused] = useState(false);
    const [isDurationUnitDropdownOpen, setIsDurationUnitDropdownOpen] = useState(false);
    const [isWashoutUnitDropdownOpen, setIsWashoutUnitDropdownOpen] = useState(false);
    // Accordion state: track which peptides are expanded
    const [expandedPeptides, setExpandedPeptides] = useState(new Set()); // Will be set in useEffect
    const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
    const [isAdditionalDetailsExpanded, setIsAdditionalDetailsExpanded] = useState(false);
    const getPrimaryActionGradient = (saving) => {
        const secondaryColor = theme?.secondary || '#d1d5db';
        if (saving) {
            return `linear-gradient(135deg, ${secondaryColor} 0%, ${secondaryColor} 100%)`;
        }
        // Use primaryDark as the base to make it darker than toggle buttons (which use theme.primary)
        // Start with primaryDark and go to an even darker shade for depth
        const darkBase = theme?.primaryDark || theme?.primary;
        // For a more pronounced darker effect, use primaryDark as the lighter part and create a darker end
        return `linear-gradient(135deg, ${darkBase} 0%, ${darkBase} 100%)`;
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
            initialData.peptides = [{ id: generateId(), frequency: { type: 'daily', time: ['AM'] }, unitValue: '' }];
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
        
        // Initialize expanded peptides - collapse all by default
        // This applies to both new protocols and existing protocols being edited
        setExpandedPeptides(new Set()); // All peptides collapsed by default
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
            
            // If protocolType is being changed to blended, initialize sharedFrequency from first peptide
            if (field === 'protocolType' && value === 'blended' && prev.peptides && prev.peptides.length > 0) {
                newState.sharedFrequency = prev.peptides[0].frequency || { type: 'daily', time: ['AM'] };
                // Sync all peptides to use the shared frequency
                newState.peptides = newState.peptides.map(p => ({
                    ...p,
                    frequency: newState.sharedFrequency
                }));
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
            
            // If it's a blended protocol and the first peptide's frequency changed, update sharedFrequency
            if (prev.protocolType === 'blended' && index === 0 && updatedPeptide.frequency) {
                newState.sharedFrequency = updatedPeptide.frequency;
                // Also sync to all other peptides
                newState.peptides = newState.peptides.map((p, i) => 
                    i === 0 ? p : { ...p, frequency: updatedPeptide.frequency }
                );
            }
            
            // Update auto-save data
            updateFormData(newState);
            
            return newState;
        });
    };

    const addPeptide = () => {
        setForm(prev => {
            // For blended protocols, use the shared frequency (or first peptide's frequency)
            let newPeptideFrequency = { type: 'daily', time: ['AM'] };
            if (prev.protocolType === 'blended' && prev.peptides && prev.peptides.length > 0) {
                // Use sharedFrequency if available, otherwise use first peptide's frequency
                newPeptideFrequency = prev.sharedFrequency || prev.peptides[0].frequency || { type: 'daily', time: ['AM'] };
            }
            
            const newState = {
                ...prev,
                peptides: [...(prev.peptides || []), { id: generateId(), frequency: newPeptideFrequency, unitValue: '' }]
            };
            
            // Auto-expand the newly added peptide
            const newIndex = newState.peptides.length - 1;
            setExpandedPeptides(prev => new Set([...prev, newIndex]));
            
            // Update auto-save data
            updateFormData(newState);
            
            return newState;
        });
    };

    const togglePeptideExpanded = (index) => {
        setExpandedPeptides(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    const removePeptide = (index) => {
        setForm(prev => {
            const newState = {
                ...prev,
                peptides: prev.peptides.filter((_, i) => i !== index)
            };
            
            // Update expanded peptides - remove the deleted index and adjust others
            setExpandedPeptides(prevExpanded => {
                const newExpanded = new Set();
                prevExpanded.forEach(expandedIndex => {
                    if (expandedIndex < index) {
                        newExpanded.add(expandedIndex);
                    } else if (expandedIndex > index) {
                        newExpanded.add(expandedIndex - 1);
                    }
                });
                // If no peptides expanded, expand the first one
                if (newExpanded.size === 0 && newState.peptides.length > 0) {
                    newExpanded.add(0);
                }
                return newExpanded;
            });
            
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
            
            // Ensure dosage units match delivery method
            finalForm.peptides = finalForm.peptides.map(p => {
                const deliveryMethod = p.deliveryMethod || 'pipette';
                const dosage = p.dosage || { amount: '', unit: 'mcg' };
                
                // If delivery method is syringe/pen but unit is sprays, default to mcg
                if ((deliveryMethod === 'pipette' || deliveryMethod === 'pen') && dosage.unit === 'sprays') {
                    return {
                        ...p,
                        dosage: { ...dosage, unit: 'mcg' }
                    };
                }
                // If delivery method is nasal but unit is not sprays, default to sprays
                if (deliveryMethod === 'nasal' && dosage.unit !== 'sprays') {
                    return {
                        ...p,
                        dosage: { ...dosage, unit: 'sprays' }
                    };
                }
                // If no unit is set and delivery method is syringe/pen, default to mcg
                if ((deliveryMethod === 'pipette' || deliveryMethod === 'pen') && !dosage.unit) {
                    return {
                        ...p,
                        dosage: { ...dosage, unit: 'mcg' }
                    };
                }
                return p;
            });

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
        <BottomSheet 
            open={open}
            onClose={handleClose}
            onBack={handleClose}
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
            maxHeight="90vh"
            footer={
                <div className="w-full flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-70"
                        style={{
                            backgroundColor: 'transparent',
                            color: theme?.text || '#111827',
                            border: 'none'
                        }}
                    >
                        Cancel
                    </button>
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
                            className="px-6 py-3 rounded-full text-sm font-semibold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-75 whitespace-nowrap min-w-fit flex items-center justify-center gap-2"
                            style={{
                                background: getPrimaryActionGradient(isSavingToProtocols || isReadOnly),
                                color: (isSavingToProtocols || isReadOnly) ? (theme?.text || '#111827') : (theme?.textOnPrimary || '#ffffff'),
                                border: 'none',
                                boxShadow: (isSavingToProtocols || isReadOnly) 
                                    ? 'none' 
                                    : theme?.isDark
                                        ? '0 4px 20px rgba(127, 158, 149, 0.4), 0 0 0 1px rgba(127, 158, 149, 0.1)'
                                        : '0 4px 20px rgba(127, 158, 149, 0.3), 0 0 0 1px rgba(127, 158, 149, 0.1)'
                            }}
                            onMouseEnter={(e) => {
                                if (isSavingToProtocols || isReadOnly) return;
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = theme?.isDark
                                    ? '0 6px 25px rgba(127, 158, 149, 0.5), 0 0 0 1px rgba(127, 158, 149, 0.2)'
                                    : '0 6px 25px rgba(127, 158, 149, 0.4), 0 0 0 1px rgba(127, 158, 149, 0.15)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = (isSavingToProtocols || isReadOnly) 
                                    ? 'none' 
                                    : theme?.isDark
                                        ? '0 4px 20px rgba(127, 158, 149, 0.4), 0 0 0 1px rgba(127, 158, 149, 0.1)'
                                        : '0 4px 20px rgba(127, 158, 149, 0.3), 0 0 0 1px rgba(127, 158, 149, 0.1)';
                                e.currentTarget.style.background = getPrimaryActionGradient(isSavingToProtocols || isReadOnly);
                            }}
                            title={isReadOnly ? "Upgrade to save protocols" : "Save protocol changes"}
                        >
                            {isSavingToProtocols ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    <span>Saving…</span>
                                </>
                            ) : isReadOnly ? (
                                <>
                                    <Lock size={18} />
                                    <span>Save Protocol (Upgrade Required)</span>
                                </>
                            ) : (
                                <>
                                    <Check size={18} />
                                    <span>Save Protocol</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            }
        >
            <div className="space-y-4">
                {/* PROTOCOL INFO Section Header */}
                <div className="flex items-center gap-2 mb-1">
                    <BookOpenCheck size={28} style={{ color: theme.primary }} />
                    <div className="flex flex-col gap-0.5">
                        <h4 className="text-base font-semibold tracking-wide" style={{ color: theme.text }}>Protocol Info</h4>
                        <div className="flex items-center gap-2 ml-1">
                            <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
                            <span className="text-[10px] font-medium uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                                Name & Purpose
                            </span>
                        </div>
                    </div>
                </div>

                {/* Protocol Basics - Compact Layout */}
                <div className="flex flex-col gap-4">
                    <div className="w-full">
                        <TextInput
                            label="Purpose/Goal"
                            value={form.purpose || ''}
                            onChange={v => handleChange('purpose', v)}
                            placeholder="Weight Loss, Recovery, etc."
                            theme={theme}
                            outlined={true}
                            customTextColor={theme.isDark ? null : "#181A18"}
                            customShadow
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                        <div className="lg:col-span-8">
                            <TextInput
                                label="Protocol Name"
                                value={form.protocolName || ''}
                                onChange={v => handleChange('protocolName', v)}
                                placeholder="e.g., Retatrutide, GLOW, etc."
                                theme={theme}
                                outlined={true}
                                customTextColor={theme.isDark ? null : "#181A18"}
                                customShadow
                            />
                        </div>
                        
                        {/* Protocol Type - Segmented Control */}
                        <div className="lg:col-span-4 pb-0.5">
                            <div className="flex flex-col gap-1.5">
                                <span className="text-[10px] font-black uppercase tracking-[0.15em] opacity-40 ml-1" style={{ color: theme.text }}>Type</span>
                                <div className="inline-flex w-full rounded-lg p-1 gap-1" style={{ backgroundColor: theme.secondary, boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)' }}>
                                    {[
                                        { key: 'separate', name: 'Separate', icon: Ungroup },
                                        { key: 'blended', name: 'Blended', icon: Blend }
                                    ].map(option => {
                                        const Icon = option.icon;
                                        const isSelected = form.protocolType === option.key;
                                        return (
                                            <button
                                                key={option.key}
                                                type="button"
                                                onClick={() => handleChange('protocolType', option.key)}
                                                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all text-[10px] font-bold uppercase tracking-wider"
                                                style={{
                                                    backgroundColor: isSelected ? theme.primary : 'transparent',
                                                    color: isSelected ? '#ffffff' : theme.textLight,
                                                    boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                                                }}
                                            >
                                                <Icon size={14} />
                                                {option.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Peptides Section - Accordion Structure */}
                <div className="space-y-3">
                    {/* Section Header */}
                    <div className="flex items-center gap-2 mb-1">
                        <TestTube size={28} style={{ color: theme.primary }} />
                        <div className="flex flex-col gap-0.5">
                            <h4 className="text-base font-semibold tracking-wide" style={{ color: theme.text }}>Peptide(s)</h4>
                            <div className="flex items-center gap-2 ml-1">
                                <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
                                <span className="text-[10px] font-medium uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                                    Dosage & Schedule
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Shared Settings for Blended Protocols */}
                    {form.protocolType === 'blended' && form.peptides?.length > 1 && (
                        <div className="p-2.5 rounded-lg border text-xs" 
                             style={{ borderColor: theme.primary + '20', backgroundColor: theme.primary + '05' }}>
                            <p className="font-medium" style={{ color: theme.text }}>
                                <span className="font-bold uppercase mr-1" style={{ color: theme.primary }}>Blended:</span>
                                All peptides share the same delivery method and schedule.
                            </p>
                        </div>
                    )}
                    
                    {/* Peptide List - Accordion Cards */}
                    <div className="space-y-2">
                        {form.peptides?.map((p, index) => {
                            const isExpanded = expandedPeptides.has(index);
                            const peptideName = p.name || `Peptide ${index + 1}`;
                            const dosageSummary = p.titration && p.titration.length > 0 
                                ? `${p.titration.length} phase${p.titration.length > 1 ? 's' : ''} titration`
                                : p.dosage?.amount 
                                    ? `${p.dosage.amount} ${p.dosage.unit || 'mcg'}`
                                    : 'No dosage set';
                            const frequencySummary = p.frequency?.type === 'daily' 
                                ? `Daily ${p.frequency?.time?.join('/') || 'AM'}`
                                : p.frequency?.type === 'weekly'
                                    ? `Weekly (${p.frequency?.days?.length || 0} days)`
                                    : p.frequency?.type || 'Not set';
                            
                            return (
                                <div 
                                    key={p.id || index} 
                                    className="rounded-lg border transition-all"
                                    style={{ 
                                        borderColor: isExpanded ? theme.primary + '40' : theme.border,
                                        backgroundColor: isExpanded ? theme.cardBackground : (theme.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)')
                                    }}
                                >
                                    {/* Accordion Header */}
                                    <button
                                        type="button"
                                        onClick={() => togglePeptideExpanded(index)}
                                        className="w-full p-3 flex items-center justify-between hover:opacity-80 transition-opacity"
                                    >
                                        <div className="flex items-center gap-3 flex-1 min-w-0 text-left">
                                            {isExpanded ? (
                                                <ChevronDown size={16} style={{ color: theme.textLight }} className="flex-shrink-0" />
                                            ) : (
                                                <ChevronRight size={16} style={{ color: theme.textLight }} className="flex-shrink-0" />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-sm truncate" style={{ color: theme.text }}>
                                                    {peptideName}
                                                </div>
                                                {!isExpanded && (
                                                    <div className="text-xs mt-0.5 flex items-center gap-2 flex-wrap" style={{ color: theme.textLight }}>
                                                        <span>{dosageSummary}</span>
                                                        <span className="opacity-30">•</span>
                                                        <span>{frequencySummary}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {form.peptides.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removePeptide(index);
                                                }}
                                                className="ml-2 px-2 py-1 text-xs font-medium rounded hover:bg-red-50 transition-colors flex-shrink-0"
                                                style={{ color: '#ef4444' }}
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </button>

                                    {/* Accordion Content */}
                                    <div 
                                        className="overflow-hidden transition-all duration-300 ease-in-out"
                                        style={{
                                            maxHeight: isExpanded ? '2000px' : '0',
                                            opacity: isExpanded ? 1 : 0
                                        }}
                                    >
                                        <div className="px-3 pb-3 pt-4 border-t" style={{ borderColor: theme.border }}>
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
                                </div>
                            );
                        })}
                    </div>

                    {/* Add Peptide Button */}
                    <div className="flex justify-center pt-1">
                        <button
                            onClick={addPeptide}
                            className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-dashed transition-all hover:scale-105"
                            style={{ 
                                borderColor: theme.primary + '40',
                                color: theme.primary,
                                backgroundColor: 'transparent'
                            }}
                        >
                            <PlusCircle size={16} />
                            <span className="text-xs font-bold uppercase tracking-wider">Add Peptide</span>
                        </button>
                    </div>
                </div>

                {/* PROTOCOL DURATION Section - Collapsible */}
                <div className="rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                    <button
                        type="button"
                        onClick={() => setIsTimelineExpanded(!isTimelineExpanded)}
                        className="w-full p-3 flex items-center justify-between hover:opacity-80 transition-opacity"
                    >
                        <div className="flex items-center gap-2">
                            <CalendarClock size={28} style={{ color: theme.primary }} />
                            <div className="flex flex-col gap-0.5">
                                <h4 className="text-base font-semibold tracking-wide" style={{ color: theme.text }}>Protocol Duration</h4>
                                <div className="flex items-center gap-2 ml-1">
                                    <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
                                    <span className="text-[10px] font-medium uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                                        Timeline & Washout
                                    </span>
                                </div>
                            </div>
                        </div>
                        {isTimelineExpanded ? (
                            <ChevronDown size={16} style={{ color: theme.textLight }} />
                        ) : (
                            <ChevronRight size={16} style={{ color: theme.textLight }} />
                        )}
                    </button>

                    {/* Duration Content - Collapsible */}
                    <div 
                        className="overflow-hidden transition-all duration-300 ease-in-out"
                        style={{
                            maxHeight: isTimelineExpanded ? '500px' : '0',
                            opacity: isTimelineExpanded ? 1 : 0
                        }}
                    >
                        <div className="px-3 pb-3 pt-4 border-t space-y-3" style={{ borderColor: theme.border }}>
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
                            {!form.duration?.noEnd && (
                            <div className="relative">
                                    {/* Combined Input with Dropdown Selector */}
                                <div 
                                    className="flex items-stretch rounded-lg"
                                    style={{ 
                                            border: `1px solid ${isDurationFocused ? theme.primary : (theme.isDark ? '#4b5563' : '#f0eee7')}`,
                                        boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)',
                                            backgroundColor: theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')
                                    }}
                                >
                                    <input 
                                        type="text"
                                        id="duration-input"
                                            value={form.duration?.count ?? ''}
                                        onChange={e => handleDurationChange('count', e.target.value)}
                                        onFocus={() => setIsDurationFocused(true)}
                                            onBlur={(e) => {
                                                setTimeout(() => {
                                                    const relatedTarget = e.relatedTarget || document.activeElement;
                                                    const isClickingDropdown = relatedTarget?.closest('[data-dropdown-container]');
                                                    if (!isClickingDropdown && !isDurationUnitDropdownOpen) {
                                                        setIsDurationFocused(false);
                                                    }
                                                }, 150);
                                            }}
                                        placeholder=" "
                                            className="flex-1 py-3 outline-none min-w-0 rounded-l-lg"
                                        style={{ 
                                            backgroundColor: 'transparent',
                                            color: theme.isDark ? theme.text : '#181A18',
                                                border: 'none',
                                                paddingLeft: '12px',
                                                paddingRight: '8px'
                                        }}
                                    />
                                    
                                        {/* Unit Dropdown Button */}
                                        <button
                                            type="button"
                                            onClick={() => setIsDurationUnitDropdownOpen(!isDurationUnitDropdownOpen)}
                                            onMouseDown={(e) => e.preventDefault()}
                                            onTouchStart={(e) => e.preventDefault()}
                                            className="flex items-center justify-between gap-2 px-3 py-3 flex-shrink-0 rounded-r-lg relative cursor-pointer transition-all border-none outline-none"
                                            data-dropdown-container
                                        style={{ 
                                            borderLeft: theme.isDark ? '1px solid #4b5563' : `1px solid #f0eee7`,
                                                backgroundColor: theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb'),
                                                color: theme.isDark ? theme.text : '#181A18',
                                                minWidth: '90px'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = theme.isDark ? '#4b5563' : '#f3f4f6';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb');
                                            }}
                                        >
                                            <span className="text-sm font-semibold">
                                                {form.duration?.unit || 'Week'}
                                            </span>
                                            <svg width="14" height="14" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        </button>
                                        {isDurationUnitDropdownOpen && (
                                            <div className="relative" data-dropdown-container>
                                                <div 
                                                    className="absolute top-full right-0 mt-1 z-50 rounded-lg shadow-lg border overflow-hidden"
                                                    style={{
                                                        backgroundColor: theme.isDark ? '#1f2937' : '#ffffff',
                                                        borderColor: theme.border,
                                                        minWidth: '100px',
                                                        boxShadow: theme.isDark ? '0 4px 6px rgba(0,0,0,0.3)' : '0 4px 6px rgba(0,0,0,0.1)'
                                                    }}
                                                >
                                                    {['Day', 'Week', 'Month'].map((unit, idx) => (
                                                        <React.Fragment key={unit}>
                                                            {idx > 0 && (
                                                                <div 
                                                                    className="h-px mx-2"
                                                                    style={{ backgroundColor: theme.border }}
                                                                />
                                                            )}
                                            <button 
                                                type="button"
                                                                onMouseDown={(e) => e.preventDefault()}
                                                                onTouchStart={(e) => e.preventDefault()}
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    handleDurationChange('unit', unit);
                                                                    setIsDurationUnitDropdownOpen(false);
                                                                }}
                                                                className="w-full text-left px-3 py-2 text-sm transition-all touch-manipulation"
                                                                style={{
                                                                    color: form.duration?.unit === unit ? theme.primary : theme.text,
                                                                    backgroundColor: 'transparent',
                                                                    WebkitTapHighlightColor: 'transparent'
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.currentTarget.style.backgroundColor = theme.primaryLight || `${theme.primary}20`;
                                                                    e.currentTarget.style.color = theme.primary;
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                                    e.currentTarget.style.color = form.duration?.unit === unit ? theme.primary : theme.text;
                                                                }}
                                            >
                                                {unit}
                                            </button>
                                                        </React.Fragment>
                                        ))}
                                    </div>
                                            </div>
                                        )}
                                </div>
                                <label 
                                    htmlFor="duration-input"
                                    className="absolute pointer-events-none transition-all"
                                    style={{
                                            fontSize: (isDurationFocused || (form.duration?.count && form.duration.count.trim())) ? '0.75rem' : '0.9375rem',
                                            top: (isDurationFocused || (form.duration?.count && form.duration.count.trim())) ? '-8px' : '14px',
                                            left: (isDurationFocused || (form.duration?.count && form.duration.count.trim())) ? '12px' : '16px',
                                            padding: (isDurationFocused || (form.duration?.count && form.duration.count.trim())) ? '0 4px' : '0',
                                            background: (isDurationFocused || (form.duration?.count && form.duration.count.trim())) ? (theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')) : 'transparent',
                                            color: (isDurationFocused || (form.duration?.count && form.duration.count.trim())) ? theme.primary : (theme.textLight || theme.text),
                                        fontWeight: 500
                                    }}
                                >
                                    Duration
                                </label>
                            </div>
                            )}
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
                            {form.washout?.enabled && (
                            <div className="relative">
                                    {/* Combined Input with Dropdown Selector */}
                                <div 
                                    className="flex items-stretch rounded-lg"
                                    style={{ 
                                            border: `1px solid ${isWashoutFocused ? theme.primary : (theme.isDark ? '#4b5563' : '#f0eee7')}`,
                                        boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)',
                                            backgroundColor: theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')
                                    }}
                                >
                                    <input 
                                        type="text"
                                        id="washout-input"
                                            value={form.washout?.duration ?? ''}
                                        onChange={e => handleWashoutChange('duration', e.target.value)}
                                        onFocus={() => setIsWashoutFocused(true)}
                                            onBlur={(e) => {
                                                setTimeout(() => {
                                                    const relatedTarget = e.relatedTarget || document.activeElement;
                                                    const isClickingDropdown = relatedTarget?.closest('[data-dropdown-container]');
                                                    if (!isClickingDropdown && !isWashoutUnitDropdownOpen) {
                                                        setIsWashoutFocused(false);
                                                    }
                                                }, 150);
                                            }}
                                        placeholder=" "
                                            className="flex-1 py-3 outline-none min-w-0 rounded-l-lg"
                                        style={{ 
                                            backgroundColor: 'transparent',
                                            color: theme.isDark ? theme.text : '#181A18',
                                                border: 'none',
                                                paddingLeft: '12px',
                                                paddingRight: '8px'
                                        }}
                                    />
                                    
                                        {/* Unit Dropdown Button */}
                                        <button
                                            type="button"
                                            onClick={() => setIsWashoutUnitDropdownOpen(!isWashoutUnitDropdownOpen)}
                                            onMouseDown={(e) => e.preventDefault()}
                                            onTouchStart={(e) => e.preventDefault()}
                                            className="flex items-center justify-between gap-2 px-3 py-3 flex-shrink-0 rounded-r-lg relative cursor-pointer transition-all border-none outline-none"
                                            data-dropdown-container
                                        style={{ 
                                            borderLeft: theme.isDark ? '1px solid #4b5563' : `1px solid #f0eee7`,
                                                backgroundColor: theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb'),
                                                color: theme.isDark ? theme.text : '#181A18',
                                                minWidth: '90px'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = theme.isDark ? '#4b5563' : '#f3f4f6';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb');
                                            }}
                                        >
                                            <span className="text-sm font-semibold">
                                                {form.washout?.unit || 'Week'}
                                            </span>
                                            <svg width="14" height="14" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        </button>
                                        {isWashoutUnitDropdownOpen && (
                                            <div className="relative" data-dropdown-container>
                                                <div 
                                                    className="absolute top-full right-0 mt-1 z-50 rounded-lg shadow-lg border overflow-hidden"
                                                    style={{
                                                        backgroundColor: theme.isDark ? '#1f2937' : '#ffffff',
                                                        borderColor: theme.border,
                                                        minWidth: '100px',
                                                        boxShadow: theme.isDark ? '0 4px 6px rgba(0,0,0,0.3)' : '0 4px 6px rgba(0,0,0,0.1)'
                                                    }}
                                                >
                                                    {['Day', 'Week', 'Month'].map((unit, idx) => (
                                                        <React.Fragment key={unit}>
                                                            {idx > 0 && (
                                                                <div 
                                                                    className="h-px mx-2"
                                                                    style={{ backgroundColor: theme.border }}
                                                                />
                                                            )}
                                            <button 
                                                type="button"
                                                                onMouseDown={(e) => e.preventDefault()}
                                                                onTouchStart={(e) => e.preventDefault()}
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    handleWashoutChange('unit', unit);
                                                                    setIsWashoutUnitDropdownOpen(false);
                                                                }}
                                                                className="w-full text-left px-3 py-2 text-sm transition-all touch-manipulation"
                                                                style={{
                                                                    color: form.washout?.unit === unit ? theme.primary : theme.text,
                                                                    backgroundColor: 'transparent',
                                                                    WebkitTapHighlightColor: 'transparent'
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.currentTarget.style.backgroundColor = theme.primaryLight || `${theme.primary}20`;
                                                                    e.currentTarget.style.color = theme.primary;
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                                    e.currentTarget.style.color = form.washout?.unit === unit ? theme.primary : theme.text;
                                                                }}
                                            >
                                                {unit}
                                            </button>
                                                        </React.Fragment>
                                        ))}
                                    </div>
                                            </div>
                                        )}
                                </div>
                                <label 
                                    htmlFor="washout-input"
                                    className="absolute pointer-events-none transition-all"
                                    style={{
                                            fontSize: (isWashoutFocused || (form.washout?.duration && form.washout.duration.trim())) ? '0.75rem' : '0.9375rem',
                                            top: (isWashoutFocused || (form.washout?.duration && form.washout.duration.trim())) ? '-8px' : '14px',
                                            left: (isWashoutFocused || (form.washout?.duration && form.washout.duration.trim())) ? '12px' : '16px',
                                            padding: (isWashoutFocused || (form.washout?.duration && form.washout.duration.trim())) ? '0 4px' : '0',
                                            background: (isWashoutFocused || (form.washout?.duration && form.washout.duration.trim())) ? (theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')) : 'transparent',
                                            color: (isWashoutFocused || (form.washout?.duration && form.washout.duration.trim())) ? theme.primary : (theme.textLight || theme.text),
                                        fontWeight: 500
                                    }}
                                >
                                    Washout Period
                                </label>
                            </div>
                            )}
                        </div>
                    </div>
                        </div>
                    </div>
                </div>

                {/* EXTRA DETAILS & NOTES Section - Collapsible */}
                <div className="rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                    <button
                        type="button"
                        onClick={() => setIsAdditionalDetailsExpanded(!isAdditionalDetailsExpanded)}
                        className="w-full p-3 flex items-center justify-between hover:opacity-80 transition-opacity"
                    >
                        <div className="flex items-center gap-2">
                            <ImageUp size={28} style={{ color: theme.primary }} />
                            <div className="flex flex-col gap-0.5">
                                <h4 className="text-base font-semibold tracking-wide" style={{ color: theme.text }}>Additional Details</h4>
                                <div className="flex items-center gap-2 ml-1">
                                    <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
                                    <span className="text-[10px] font-medium uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                                        Notes & Preview
                                    </span>
                                </div>
                            </div>
                        </div>
                        {isAdditionalDetailsExpanded ? (
                            <ChevronDown size={16} style={{ color: theme.textLight }} />
                        ) : (
                            <ChevronRight size={16} style={{ color: theme.textLight }} />
                        )}
                    </button>

                    {/* Additional Details Content - Collapsible */}
                    <div 
                        className="overflow-hidden transition-all duration-300 ease-in-out"
                        style={{
                            maxHeight: isAdditionalDetailsExpanded ? '800px' : '0',
                            opacity: isAdditionalDetailsExpanded ? 1 : 0
                        }}
                    >
                        <div className="px-3 pb-3 pt-0 border-t" style={{ borderColor: theme.border }}>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start pt-3">
                                <div className="space-y-3">
                                    <TextInput 
                                        label="Notes"
                                        value={form.notes || ''} 
                                        onChange={v => handleChange('notes', v)} 
                                        theme={theme} 
                                        placeholder="Add any personal notes for this protocol..." 
                                        multiline 
                                        rows={3}
                                        outlined={true}
                                        customTextColor={theme.isDark ? null : "#181A18"}
                                        customShadow
                                    />
                                </div>

                                {/* Scheduling Preview */}
                                {form.peptides && form.peptides.length > 0 && form.peptides.some(p => p.name) && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <BookOpenCheck size={16} style={{ color: theme.primary }} />
                                            <span className="text-sm font-semibold" style={{ color: theme.text }}>Preview</span>
                                        </div>
                                        <SchedulingPreview protocol={form} theme={theme} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Research Insights Footer - Minimal & Clean */}
                <div className="flex items-center justify-center gap-6 py-2 border-t border-dashed" style={{ borderColor: theme.border }}>
                    {[
                        { label: 'Dashboard Integration', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2z' },
                        { label: 'Calendar Schedule', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
                        { label: 'Progress Tracking', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' }
                    ].map(info => (
                        <div key={info.label} className="flex items-center gap-1.5 opacity-40 hover:opacity-100 transition-opacity cursor-default">
                            <svg className="w-3.5 h-3.5" style={{ color: theme.primary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={info.icon} />
                            </svg>
                            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: theme.text }}>{info.label}</span>
                        </div>
                    ))}
                </div>

                {/* Delete Section - Only show for existing protocols */}
                {form?.id && onDelete && (
                    <div className="mt-6 pt-6 border-t" style={{ borderColor: theme.border }}>
                        <div className="p-4 rounded-lg" style={{ backgroundColor: theme.isDark ? 'rgba(200, 122, 92, 0.1)' : 'rgba(200, 122, 92, 0.05)' }}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-sm font-semibold mb-1" style={{ color: theme.text }}>Delete Protocol</h4>
                                    <p className="text-xs" style={{ color: theme.textLight }}>
                                        This action cannot be undone. All protocol data will be permanently deleted.
                                    </p>
                                </div>
                                <button
                                    onClick={() => onDelete?.(form)}
                                    className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md active:scale-95 whitespace-nowrap"
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
                            </div>
                        </div>
                    </div>
                )}
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
        </BottomSheet>
    );
}


