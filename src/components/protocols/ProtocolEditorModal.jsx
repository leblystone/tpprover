import React, { useState, useEffect, useRef } from 'react';
import BottomSheet from '../common/BottomSheet';
import TextInput from '../common/inputs/TextInput';
import { PlusCircle, Trash2, Lock, BookOpenCheck, Calendar, CalendarClock, ImageUp, Ungroup, Blend, TestTube, ChevronDown, ChevronRight, Check, Loader2 } from 'lucide-react';
import PeptideSubForm from './PeptideSubForm';
import SchedulingPreview from './SchedulingPreview';
import AutoSaveIndicator from '../common/AutoSaveIndicator';
import useAutoSave from '../../utils/useAutoSave';
import { generateId } from '../../utils/string';

export default function ProtocolEditorModal({ open, onClose, onSave, onDelete, theme, protocol, isReadOnly = false, onUpgrade, embedded = false }) {

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
    const formRef = useRef(form);
    formRef.current = form; // Always have latest for embedded save
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
    // When embedded, use separate key so we never load stale draft (parent owns the data)
    const storageKey = embedded
        ? `tpprover_protocol_draft_embedded_${protocol?.id || 'new'}`
        : `tpprover_protocol_draft_${protocol?.id || 'new'}`;
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
                        // Event is dispatched by useAutoSave hook automatically for existing protocols
                    } else {
                        // For new protocols, we don't auto-save to the protocols list yet
                        // Just keep the localStorage draft for now
                    }
                } catch (error) {
                    console.warn('Auto-save to protocols failed:', error);
                }
            } else {
                // Insufficient data for auto-save - skip
            }
        }
    );
    

    useEffect(() => {
        if (!open) return;

        // IMPORTANT: Clear any stale localStorage draft when loading fresh protocol data
        // This prevents old drafts from overwriting updated protocol data
        if (protocol?.id) {
            try {
                localStorage.removeItem(`tpprover_protocol_draft_${protocol.id}`);
                if (embedded) localStorage.removeItem(`tpprover_protocol_draft_embedded_${protocol.id}`);
            } catch (e) {
                console.warn('Failed to clear stale draft:', e);
            }
        }

        let initialData = protocol ? { ...createEmpty(), ...protocol } : createEmpty();
        
        // Migration: protocol may use legacy 'name' instead of 'protocolName'
        if (initialData.name && !initialData.protocolName) {
            initialData.protocolName = initialData.name;
        }
        
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
        
        // Auto-set to 'separate' if only 1 peptide (can't be blended with just one)
        if (initialData.peptides && initialData.peptides.length === 1) {
            initialData.protocolType = 'separate';
        }

        // If it's a blended protocol, ensure sharedFrequency exists and all peptides have it
        if (initialData.blendMode === 'blended' && initialData.peptides.length > 0) {
            const firstFreq = initialData.peptides[0].frequency;
            const shared = firstFreq && (firstFreq.type || firstFreq.time) 
                ? firstFreq 
                : { type: 'daily', time: ['AM'] };
            initialData.sharedFrequency = shared;
            initialData.peptides = initialData.peptides.map(p => ({
                ...p,
                frequency: shared
            }));
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
                // Preserve peptide name (ensure we don't lose it from legacy or alternate structures)
                if (!normalized.name && peptide.name) normalized.name = peptide.name;
                // Migrate legacy scalar dosage to { amount, unit } format
                if (normalized.dosage !== undefined && normalized.dosage !== null) {
                    if (typeof normalized.dosage === 'number' || typeof normalized.dosage === 'string') {
                        normalized.dosage = { amount: String(normalized.dosage), unit: 'mcg' };
                    } else if (normalized.dosage && typeof normalized.dosage === 'object') {
                        normalized.dosage = {
                            amount: normalized.dosage.amount !== undefined && normalized.dosage.amount !== null ? String(normalized.dosage.amount) : '',
                            unit: normalized.dosage.unit || 'mcg'
                        };
                    }
                }
                // Ensure unitValue is always a string
                if (normalized.unitValue === undefined || normalized.unitValue === null) {
                    normalized.unitValue = '';
                }
                // Normalize frequency.time to ensure it's always a valid array
                // Preserve user's selection (AM or PM) - don't force default to AM
                if (normalized.frequency) {
                    if (!normalized.frequency.time || !Array.isArray(normalized.frequency.time) || normalized.frequency.time.length === 0) {
                        // Only default to AM if time is completely missing
                        normalized.frequency.time = ['AM'];
                    } else {
                        // Ensure time array only contains valid values (AM or PM)
                        normalized.frequency.time = normalized.frequency.time.filter(t => t === 'AM' || t === 'PM');
                        // If filtering removed all values, default to AM
                        if (normalized.frequency.time.length === 0) {
                            normalized.frequency.time = ['AM'];
                        }
                    }
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
        
        // DEBUG: Log what's being loaded into the form
        console.log('🔴 FORM INIT - peptides frequency:', initialData.peptides?.map(p => ({ name: p.name, time: p.frequency?.time })));
        
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

    const handleSharedFrequencyChange = (field, value) => {
        setForm(prev => {
            const base = prev.sharedFrequency || { type: 'daily', time: ['AM'] };
            let newFreq = { ...base, [field]: value };
            if (field === 'type') {
                if (value !== 'weekly') newFreq.days = [];
                if (value !== 'cycle') { newFreq.onDays = ''; newFreq.offDays = ''; }
                if (!newFreq.time?.length) newFreq.time = ['AM'];
            }
            if (field === 'time' && (!Array.isArray(newFreq.time) || newFreq.time.length === 0)) {
                newFreq.time = ['AM'];
            }
            const newState = { ...prev, sharedFrequency: newFreq };
            newState.peptides = newState.peptides.map(p => ({ ...p, frequency: newFreq }));
            updateFormData(newState);
            return newState;
        });
    };

    const handleSharedFrequencyTimeToggle = (t) => {
        setForm(prev => {
            const base = prev.sharedFrequency || { type: 'daily', time: ['AM'] };
            const current = Array.isArray(base.time) && base.time.length > 0 ? base.time : ['AM'];
            const next = current.includes(t) ? current.filter(x => x !== t) : [...current, t];
            const newTime = next.length === 0 ? (t === 'AM' ? ['PM'] : ['AM']) : next;
            const newFreq = { ...base, time: newTime };
            const newState = { ...prev, sharedFrequency: newFreq };
            newState.peptides = newState.peptides.map(p => ({ ...p, frequency: newFreq }));
            updateFormData(newState);
            return newState;
        });
    };

    const handleSharedFrequencyToggleDay = (day) => {
        const dayMap = { 'Monday': 'Mon', 'Tuesday': 'Tue', 'Wednesday': 'Wed', 'Thursday': 'Thu', 'Friday': 'Fri', 'Saturday': 'Sat', 'Sunday': 'Sun' };
        const norm = (d) => dayMap[d] || d;
        setForm(prev => {
            const base = prev.sharedFrequency || { type: 'weekly', time: ['AM'], days: [] };
            const current = (base.days || []).map(norm);
            const newDays = current.includes(day) ? current.filter(d => d !== day) : [...current, day];
            const newFreq = { ...base, type: 'weekly', days: newDays };
            if (!newFreq.time?.length) newFreq.time = ['AM'];
            const newState = { ...prev, sharedFrequency: newFreq };
            newState.peptides = newState.peptides.map(p => ({ ...p, frequency: newFreq }));
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
            
            // Auto-set to 'separate' if only 1 peptide (shouldn't happen here, but ensure consistency)
            if (newState.peptides.length === 1) {
                newState.protocolType = 'separate';
            }
            
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
            
            // Auto-set to 'separate' if only 1 peptide remains
            if (newState.peptides.length === 1) {
                newState.protocolType = 'separate';
            }
            
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
        
        setForm(prev => {
            // For count field, keep it simple - let the HTML5 number input handle validation
            const processedValue = field === 'count' ? String(value) : value;
            
            const newForm = {
                ...prev,
                duration: { ...prev.duration, [field]: processedValue }
            };
            
            // Update auto-save data
            updateFormData(newForm);
            
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
            // Use formRef when embedded to avoid stale closure (listener captures initial form)
            const formToSave = embedded ? formRef.current : form;
            const finalForm = { ...formToSave };

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
            
            // When embedded (editing active protocol), ensure protocol id and active-only fields are passed
            if (embedded && protocol?.id) {
                finalForm.id = protocol.id;
                finalForm.active = protocol.active;
                finalForm.startDate = protocol.startDate ?? finalForm.startDate;
                finalForm.endDate = protocol.endDate ?? finalForm.endDate;
                finalForm.linkedItems = finalForm.linkedItems ?? protocol.linkedItems;
                finalForm.emoji = finalForm.emoji ?? protocol.emoji;
            }
            
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

    // Listen for save event when embedded - handleFinalSave uses formRef.current to avoid stale closure
    useEffect(() => {
        if (!embedded) return;
        const handleSaveEvent = () => handleFinalSave();
        window.addEventListener('tpp:save-embedded-editor', handleSaveEvent);
        return () => window.removeEventListener('tpp:save-embedded-editor', handleSaveEvent);
    }, [embedded]);

    // Main content that can be rendered with or without BottomSheet wrapper
    const editorContent = (
        <div className={embedded ? "space-y-4 w-full max-w-full overflow-x-hidden" : "space-y-4"}>
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
                    {/* Protocol Name - Full Width */}
                    <div className="w-full">
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

                    {/* Purpose/Goal - Full Width */}
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

                    {/* Protocol Type - Only show when 2+ peptides */}
                    {form.peptides && form.peptides.length > 1 && (
                        <div className="w-full">
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
                    )}

                    {/* Shared Settings + Frequency & Schedule for Blended Protocols */}
                    {form.protocolType === 'blended' && form.peptides?.length > 1 && (
                        <div className="space-y-3">
                            <div className="p-2.5 rounded-lg border text-xs" 
                                 style={{ borderColor: theme.primary + '20', backgroundColor: theme.primary + '05' }}>
                                <p className="font-medium" style={{ color: theme.text }}>
                                    <span className="font-bold uppercase mr-1" style={{ color: theme.primary }}>Blended:</span>
                                    All peptides share the same delivery method and schedule.
                                </p>
                            </div>
                            {/* Blend-level Frequency & Schedule - always visible so schedule is set and shown on cards */}
                            <div className="p-3 rounded-lg border space-y-3" style={{ borderColor: theme.border }}>
                                <span className="text-xs font-black uppercase tracking-[0.15em] opacity-60" style={{ color: theme.text }}>
                                    Frequency & Schedule
                                </span>
                                <div className="inline-flex w-full rounded-md p-1 gap-1" style={{ backgroundColor: theme.secondary }}>
                                    {['daily', 'weekly', 'custom', 'cycle'].map(type => (
                                        <button key={type} type="button"
                                            onClick={() => handleSharedFrequencyChange('type', type)}
                                            className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-all ${((form.sharedFrequency?.type || 'daily') === type ? 'text-white shadow-sm' : '')}`}
                                            style={(form.sharedFrequency?.type || 'daily') === type ? { backgroundColor: theme.primary } : { color: theme.textLight }}
                                        >
                                            {type === 'custom' ? 'X Days' : type === 'weekly' ? 'Select Days' : type}
                                        </button>
                                    ))}
                                </div>
                                {form.sharedFrequency?.type === 'cycle' && (
                                    <div className="grid grid-cols-2 gap-2">
                                        <TextInput label="On" value={form.sharedFrequency.onDays || ''} onChange={v => handleSharedFrequencyChange('onDays', v)} theme={theme} placeholder="5" type="number" outlined={true} compact={true} />
                                        <TextInput label="Off" value={form.sharedFrequency.offDays || ''} onChange={v => handleSharedFrequencyChange('offDays', v)} theme={theme} placeholder="2" type="number" outlined={true} compact={true} />
                                    </div>
                                )}
                                {form.sharedFrequency?.type === 'weekly' && (
                                    <div className="flex flex-wrap gap-1">
                                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                                            const days = form.sharedFrequency?.days || [];
                                            const dayMap = { 'Monday': 'Mon', 'Tuesday': 'Tue', 'Wednesday': 'Wed', 'Thursday': 'Thu', 'Friday': 'Fri', 'Saturday': 'Sat', 'Sunday': 'Sun' };
                                            const norm = d => dayMap[d] || d;
                                            const isSelected = days.some(d => norm(d) === day || d === day);
                                            return (
                                                <button key={day} type="button" onClick={() => handleSharedFrequencyToggleDay(day)}
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
                                {form.sharedFrequency?.type === 'custom' && (
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="text-sm font-semibold" style={{ color: theme.text }}>Every</span>
                                        <div className="w-20">
                                            <TextInput label="" value={form.sharedFrequency.customDays || ''} onChange={v => handleSharedFrequencyChange('customDays', v)} theme={theme} placeholder="3" type="number" outlined={true} customTextColor={theme.isDark ? null : '#181A18'} customShadow />
                                        </div>
                                        <span className="text-sm font-semibold" style={{ color: theme.text }}>Days</span>
                                    </div>
                                )}
                                <div className="inline-flex w-full rounded-md p-1 gap-2" style={{ backgroundColor: theme.secondary }}>
                                    {['AM', 'PM'].map(t => {
                                        const active = Array.isArray(form.sharedFrequency?.time) ? form.sharedFrequency.time.includes(t) : (t === 'AM');
                                        return (
                                            <button key={t} type="button" onClick={() => handleSharedFrequencyTimeToggle(t)}
                                                className={`flex-1 py-1 text-xs font-bold rounded transition-all ${active ? 'text-white shadow-sm' : ''}`}
                                                style={active ? { backgroundColor: theme.primary } : { color: theme.textLight }}
                                            >
                                                {t}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
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
                            // For blended protocols, use shared/blend-level frequency (no masking - show real schedule or Not set)
                            const freq = form.protocolType === 'blended' 
                                ? (form.sharedFrequency || form.peptides?.[0]?.frequency || p.frequency)
                                : p.frequency;
                            const frequencySummary = freq?.type === 'daily' 
                                ? `Daily ${freq?.time?.join('/') || 'AM'}`
                                : freq?.type === 'weekly'
                                    ? (() => {
                                        const days = freq?.days || [];
                                        const dayStr = days.length > 0 ? days.join(', ') : '(no days)';
                                        const timeStr = freq?.time && Array.isArray(freq.time) && freq.time.length > 0 
                                            ? ` ${freq.time.join('/')}` : '';
                                        return `Weekly (${dayStr})${timeStr}`;
                                    })()
                                    : freq?.type === 'cycle'
                                        ? (() => {
                                            const cycleStr = `Cycle: ${freq?.onDays || '-'} on / ${freq?.offDays || '-'} off`;
                                            const timeStr = freq?.time && Array.isArray(freq.time) && freq.time.length > 0 
                                                ? ` ${freq.time.join('/')}` 
                                                : '';
                                            return cycleStr + timeStr;
                                        })()
                                        : freq?.type === 'custom'
                                            ? (() => {
                                                const days = freq?.customDays || 'X';
                                                const timeStr = freq?.time && Array.isArray(freq.time) && freq.time.length > 0 
                                                    ? ` ${freq.time.join('/')}` 
                                                    : ' AM';
                                                return `Every ${days} days${timeStr}`;
                                            })()
                                            : freq?.type || 'Not set';
                            
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
                                                index={index}
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
                        <div className="flex items-center gap-2 flex-1">
                            <CalendarClock size={28} style={{ color: theme.primary }} />
                            <div className="flex flex-col gap-0.5 flex-1">
                                <div className="flex items-center gap-2">
                                    <h4 className="text-base font-semibold tracking-wide" style={{ color: theme.text }}>Protocol Duration</h4>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider" style={{ backgroundColor: theme.secondary, color: theme.textLight }}>Optional</span>
                                </div>
                                <div className="flex items-center gap-2 ml-1">
                                    <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
                                    {!isTimelineExpanded && (
                                        <span className="text-[10px] font-medium tracking-wide" style={{ color: theme.textLight }}>
                                            {form.duration?.noEnd ? 'Run indefinitely' : form.duration?.count ? `${form.duration.count} ${form.duration.unit || 'weeks'}` : 'Click to set timeline'}
                                        </span>
                                    )}
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
                                        <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all" style={{backgroundColor: form.duration?.noEnd ? theme.primary : (theme.isDark ? 'rgba(255,255,255,0.12)' : theme.secondary) }}></div>
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
                                            border: `1px solid ${isDurationFocused ? theme.primary : (theme.isDark ? 'rgba(255,255,255,0.1)' : '#f0eee7')}`,
                                        boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)',
                                            backgroundColor: theme.isDark ? 'rgba(0,0,0,0.2)' : (theme.inputBackground || '#fff')
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
                                            borderLeft: theme.isDark ? '1px solid rgba(255,255,255,0.1)' : `1px solid #f0eee7`,
                                                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : (theme.cardBackground || '#f9fafb'),
                                                color: theme.isDark ? theme.text : '#181A18',
                                                minWidth: '90px'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.04)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255,255,255,0.1)' : (theme.cardBackground || '#f9fafb');
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
                                                        backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
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
                                            background: (isDurationFocused || (form.duration?.count && form.duration.count.trim())) ? (theme.isDark ? 'rgba(0,0,0,0.2)' : (theme.inputBackground || '#fff')) : 'transparent',
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
                                        <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all" style={{backgroundColor: form.washout?.enabled ? theme.primary : (theme.isDark ? 'rgba(255,255,255,0.12)' : theme.secondary)}}></div>
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
                                            border: `1px solid ${isWashoutFocused ? theme.primary : (theme.isDark ? 'rgba(255,255,255,0.1)' : '#f0eee7')}`,
                                        boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)',
                                            backgroundColor: theme.isDark ? 'rgba(0,0,0,0.2)' : (theme.inputBackground || '#fff')
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
                                            borderLeft: theme.isDark ? '1px solid rgba(255,255,255,0.1)' : `1px solid #f0eee7`,
                                                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : (theme.cardBackground || '#f9fafb'),
                                                color: theme.isDark ? theme.text : '#181A18',
                                                minWidth: '90px'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.04)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255,255,255,0.1)' : (theme.cardBackground || '#f9fafb');
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
                                                        backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
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
                                            background: (isWashoutFocused || (form.washout?.duration && form.washout.duration.trim())) ? (theme.isDark ? 'rgba(0,0,0,0.2)' : (theme.inputBackground || '#fff')) : 'transparent',
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
                        <div className="flex items-center gap-2 flex-1">
                            <ImageUp size={28} style={{ color: theme.primary }} />
                            <div className="flex flex-col gap-0.5 flex-1">
                                <div className="flex items-center gap-2">
                                    <h4 className="text-base font-semibold tracking-wide" style={{ color: theme.text }}>Additional Details</h4>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider" style={{ backgroundColor: theme.secondary, color: theme.textLight }}>Optional</span>
                                </div>
                                <div className="flex items-center gap-2 ml-1">
                                    <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
                                    {!isAdditionalDetailsExpanded && (
                                        <span className="text-[10px] font-medium tracking-wide" style={{ color: theme.textLight }}>
                                            {form.notes ? 'Notes added • Preview available' : 'Click to add notes or preview schedule'}
                                        </span>
                                    )}
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

                {/* Delete Section - Only show for existing protocols */}
                {form?.id && onDelete && (
                    <div className="mt-6 pt-6 border-t" style={{ borderColor: theme.border }}>
                        <div className="p-5 rounded-lg space-y-4" style={{ backgroundColor: theme.isDark ? 'rgba(200,122,92,0.1)' : 'rgba(200,122,92,0.05)' }}>
                            <div>
                                <h4 className="text-sm font-semibold mb-2" style={{ color: theme.text }}>Delete Entire Protocol</h4>
                                <p className="text-xs leading-relaxed" style={{ color: theme.textLight }}>
                                    This action cannot be undone.
                                </p>
                            </div>
                            <button
                                onClick={() => onDelete?.(form)}
                                className="w-full px-5 py-3 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md active:scale-95"
                                style={{
                                    background: terracottaGradient,
                                    color: '#ffffff',
                                    border: 'none',
                                    boxShadow: theme?.isDark ? '0 4px 10px rgba(0,0,0,0.35)' : '0 4px 10px rgba(0,0,0,0.15)'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = terracottaHoverGradient;
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = terracottaGradient;
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                Delete Entire Protocol
                            </button>
                        </div>
                    </div>
                )}
            
                {/* Lockout Overlay - Covers entire modal */}
                {isReadOnly && (
                    <div className="absolute inset-0 backdrop-blur-md flex items-center justify-center z-50 rounded-lg" style={{ backgroundColor: theme.isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)' }}>
                        <div className="text-center p-6 max-w-md">
                            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: `${theme.primary}20` }}>
                                <Lock size={32} style={{ color: theme.primary }} />
                            </div>
                            <h3 className="text-xl font-semibold mb-2" style={{ color: theme.isDark ? theme.text : theme.primaryDark }}>
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
        </div>
    );

    // If embedded, return just the content without the BottomSheet wrapper
    if (embedded) {
        return editorContent;
    }

    // Otherwise, render with full BottomSheet modal
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
            {editorContent}
        </BottomSheet>
    );
}


