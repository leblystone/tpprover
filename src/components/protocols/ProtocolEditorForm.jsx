import React, { useState, useEffect } from 'react';
import TextInput from '../common/inputs/TextInput';
import { PlusCircle, Trash2, Lock, BookOpenCheck, Calendar, CalendarClock, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import PeptideSubForm from './PeptideSubForm';
import SchedulingPreview from './SchedulingPreview';
import AutoSaveIndicator from '../common/AutoSaveIndicator';
import useAutoSave from '../../utils/useAutoSave';
import { generateId } from '../../utils/string';

/**
 * ProtocolEditorForm - The core form content for editing protocols
 * Can be used both in the modal and embedded inline
 */
export default function ProtocolEditorForm({ 
  protocol, 
  theme, 
  onSave, 
  onClose,
  isReadOnly = false, 
  onUpgrade,
  embedded = false,
  showFooter = true
}) {
  const createEmpty = () => ({
    protocolName: '',
    purpose: '',
    protocolType: 'separate',
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
  const [expandedPeptides, setExpandedPeptides] = useState(new Set());
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
  const [isAdditionalDetailsExpanded, setIsAdditionalDetailsExpanded] = useState(false);
  
  const getPrimaryActionGradient = (saving) => {
    const secondaryColor = theme?.secondary || '#d1d5db';
    if (saving) {
      return `linear-gradient(135deg, ${secondaryColor} 0%, ${secondaryColor} 100%)`;
    }
    const darkBase = theme?.primaryDark || theme?.primary;
    return `linear-gradient(135deg, ${darkBase} 0%, ${darkBase} 100%)`;
  };
  
  const primaryActionDefaultShadow = theme?.isDark ? '0 4px 6px rgba(0, 0, 0, 0.3)' : '0 4px 6px rgba(0, 0, 0, 0.1)';
  const primaryActionHoverShadow = theme?.isDark ? '0 10px 25px rgba(0, 0, 0, 0.5)' : '0 10px 25px rgba(0, 0, 0, 0.15)';
  const terracottaGradient = 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100())';
  const terracottaHoverGradient = 'linear-gradient(135deg, #b5684a 0%, #a35a3f 100%)';
  
  // Auto-save functionality
  const storageKey = `tpprover_protocol_draft_${protocol?.id || 'new'}`;
  const { isSaving, lastSaved, clearSavedData, markAsSubmitted, updateFormData } = useAutoSave(
    storageKey, 
    form, 
    setForm, 
    2000,
    async (formData) => {
      const hasProtocolName = formData?.protocolName && formData.protocolName.trim().length > 0;
      const hasPeptides = formData?.peptides && formData.peptides.length > 0 && 
        formData.peptides.some(p => p.name && p.name.trim().length > 0);
      const hasNotes = formData?.notes && formData.notes.trim().length > 0;
      
      if (formData && (hasProtocolName || hasPeptides || hasNotes)) {
        try {
          if (protocol?.id) {
            console.log('🔄 Auto-saving existing protocol:', protocol.id);
          } else {
            console.log('🔄 Auto-saving new protocol draft');
          }
        } catch (error) {
          console.warn('Auto-save to protocols failed:', error);
        }
      }
    }
  );

  // Initialize form
  useEffect(() => {
    let initialData = protocol ? { ...createEmpty(), ...protocol } : createEmpty();
    
    if (initialData.duration && initialData.duration.count !== '') {
      initialData.duration.count = String(initialData.duration.count);
    }

    // Migration logic for old single-peptide protocols
    if (initialData.name && (!initialData.peptides || initialData.peptides.length === 0)) {
      initialData.peptides = [{
        id: generateId(),
        name: initialData.name,
        dosage: initialData.dosage || { value: '', unit: 'mg' },
        frequency: initialData.frequency || { type: 'daily', time: ['AM'] },
        deliveryMethod: initialData.deliveryMethod || 'pen',
        unitValue: initialData.unitValue || '',
        vendor: initialData.vendor || '',
        price: initialData.price || ''
      }];
      initialData.protocolName = initialData.name;
    }

    // Ensure protocolName is set
    if (!initialData.protocolName && initialData.peptides && initialData.peptides.length > 0) {
      initialData.protocolName = initialData.peptides[0].name || '';
    }

    // Load from auto-save if available
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const { data, timestamp } = JSON.parse(saved);
        const savedTime = new Date(timestamp).getTime();
        const protocolTime = initialData.updatedAt ? new Date(initialData.updatedAt).getTime() : 0;
        
        if (savedTime > protocolTime) {
          console.log('📥 Loading auto-saved draft');
          initialData = { ...initialData, ...data };
        }
      }
    } catch (e) {
      console.warn('Failed to load auto-save:', e);
    }

    setForm(initialData);
    setExpandedPeptides(new Set());
  }, [protocol]);

  const handleChange = (field, value) => {
    setForm(prev => {
      const newState = { ...prev, [field]: value };
      if (field === 'protocolName') {
        const newPeptides = [...(prev.peptides || [])];
        if (newPeptides.length > 0) {
          newPeptides[0] = { ...newPeptides[0], name: value };
          newState.peptides = newPeptides;
        }
      }
      
      if (field === 'protocolType' && value === 'blended' && prev.peptides && prev.peptides.length > 0) {
        newState.sharedFrequency = prev.peptides[0].frequency || { type: 'daily', time: ['AM'] };
        newState.peptides = newState.peptides.map(p => ({
          ...p,
          frequency: newState.sharedFrequency
        }));
      }
      
      updateFormData(newState);
      return newState;
    });
  };

  const handlePeptideChange = (index, updatedPeptide) => {
    setForm(prev => {
      const newPeptides = [...(prev.peptides || [])];
      newPeptides[index] = updatedPeptide;
      const newState = { ...prev, peptides: newPeptides };
      
      if (prev.protocolType === 'blended' && index === 0 && updatedPeptide.frequency) {
        newState.sharedFrequency = updatedPeptide.frequency;
        newState.peptides = newState.peptides.map((p, i) => 
          i === 0 ? p : { ...p, frequency: updatedPeptide.frequency }
        );
      }
      
      updateFormData(newState);
      return newState;
    });
  };

  const addPeptide = () => {
    setForm(prev => {
      let newPeptideFrequency = { type: 'daily', time: ['AM'] };
      if (prev.protocolType === 'blended' && prev.peptides && prev.peptides.length > 0) {
        newPeptideFrequency = prev.sharedFrequency || prev.peptides[0].frequency || { type: 'daily', time: ['AM'] };
      }
      
      const newState = {
        ...prev,
        peptides: [...(prev.peptides || []), { id: generateId(), frequency: newPeptideFrequency, unitValue: '' }]
      };
      
      const newIndex = newState.peptides.length - 1;
      setExpandedPeptides(prev => new Set([...prev, newIndex]));
      
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
      
      setExpandedPeptides(prevExpanded => {
        const newExpanded = new Set();
        prevExpanded.forEach(expandedIndex => {
          if (expandedIndex < index) {
            newExpanded.add(expandedIndex);
          } else if (expandedIndex > index) {
            newExpanded.add(expandedIndex - 1);
          }
        });
        if (newExpanded.size === 0 && newState.peptides.length > 0) {
          newExpanded.add(0);
        }
        return newExpanded;
      });
      
      updateFormData(newState);
      return newState;
    });
  };

  const handleDurationChange = (field, value) => {
    setForm(prev => {
      const processedValue = field === 'count' ? String(value) : value;
      const newForm = {
        ...prev,
        duration: { ...prev.duration, [field]: processedValue }
      };
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
      updateFormData(newState);
      return newState;
    });
  };

  const toEditorUnit = (unit) => {
    if (!unit) return 'weeks';
    const u = String(unit).toLowerCase();
    if (u.includes('day')) return 'days';
    if (u.includes('week')) return 'weeks';
    if (u.includes('month')) return 'months';
    return 'weeks';
  };

  const fromEditorUnit = (unit) => {
    if (!unit) return 'weeks';
    const u = String(unit).toLowerCase();
    if (u === 'days') return 'days';
    if (u === 'weeks') return 'weeks';
    if (u === 'months') return 'months';
    return 'weeks';
  };

  const handleSaveClick = async () => {
    if (isReadOnly) {
      onUpgrade?.();
      return;
    }

    try {
      setIsSavingToProtocols(true);
      setSaveError(null);

      // Validate
      if (!form.protocolName || form.protocolName.trim().length === 0) {
        setSaveError('Please enter a protocol name');
        return;
      }

      if (!form.peptides || form.peptides.length === 0) {
        setSaveError('Please add at least one peptide');
        return;
      }

      // Clean up peptides
      let finalForm = { ...form };
      finalForm.peptides = finalForm.peptides.map(p => {
        const dosage = p.dosage || {};
        const deliveryMethod = p.deliveryMethod;

        if (deliveryMethod === 'oral' && dosage.unit !== 'mg') {
          return {
            ...p,
            dosage: { ...dosage, unit: 'mg' }
          };
        }
        if (deliveryMethod === 'nasal' && dosage.unit !== 'sprays') {
          return {
            ...p,
            dosage: { ...dosage, unit: 'sprays' }
          };
        }
        if ((deliveryMethod === 'pipette' || deliveryMethod === 'pen') && !dosage.unit) {
          return {
            ...p,
            dosage: { ...dosage, unit: 'mcg' }
          };
        }
        return p;
      });

      if (finalForm.duration) {
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
      
      await onSave?.(finalForm);
      markAsSubmitted();
      
      if (!embedded) {
        onClose?.();
      }
    } catch (error) {
      console.error('❌ Failed to save protocol:', error);
      setSaveError('Failed to save protocol. Please try again.');
    } finally {
      setIsSavingToProtocols(false);
    }
  };

  // Main form content
  return (
    <div className="flex flex-col h-full">
      {/* Header with auto-save indicator */}
      {embedded && (
        <div className="flex items-center justify-between mb-4 pb-3 border-b" style={{ borderColor: theme.border }}>
          <h3 className="text-lg font-semibold" style={{ color: theme.text }}>
            {form?.protocolName 
              ? (form?.id ? `Editing: ${form.protocolName}` : `New: ${form.protocolName}`)
              : (form?.id ? "Edit Protocol" : "New Protocol")}
          </h3>
          <AutoSaveIndicator 
            isSaving={isSaving}
            lastSaved={lastSaved}
            theme={theme}
            compact={true}
            iconOnly={true}
          />
        </div>
      )}

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto space-y-6 pb-4">
        {/* Protocol Name */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
            Protocol Name *
          </label>
          <TextInput
            value={form.protocolName || ''}
            onChange={(v) => handleChange('protocolName', v)}
            placeholder="e.g., Weight Loss Stack"
            theme={theme}
            outlined={true}
            disabled={isReadOnly}
          />
        </div>

        {/* Purpose/Goal */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
            Purpose/Goal
          </label>
          <TextInput
            value={form.purpose || ''}
            onChange={(v) => handleChange('purpose', v)}
            placeholder="e.g., Weight Loss, Recovery, etc."
            theme={theme}
            outlined={true}
            disabled={isReadOnly}
          />
        </div>

        {/* Peptides Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium" style={{ color: theme.text }}>
              Peptides *
            </label>
            <button
              type="button"
              onClick={addPeptide}
              disabled={isReadOnly}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all hover:opacity-80 disabled:opacity-40"
              style={{
                backgroundColor: theme.primary,
                color: theme.textOnPrimary || '#ffffff'
              }}
            >
              <PlusCircle size={14} />
              Add Peptide
            </button>
          </div>

          <div className="space-y-3">
            {form.peptides && form.peptides.map((peptide, idx) => {
              const isExpanded = expandedPeptides.has(idx);
              const canRemove = form.peptides.length > 1;

              return (
                <div
                  key={peptide.id || idx}
                  className="rounded-lg border"
                  style={{
                    backgroundColor: theme.cardBackground,
                    borderColor: theme.border
                  }}
                >
                  {/* Peptide Header */}
                  <button
                    type="button"
                    onClick={() => togglePeptideExpanded(idx)}
                    className="w-full flex items-center justify-between p-3 hover:opacity-80 transition-opacity"
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      <span className="font-medium text-sm" style={{ color: theme.text }}>
                        {peptide.name || `Peptide ${idx + 1}`}
                      </span>
                    </div>
                    {canRemove && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removePeptide(idx);
                        }}
                        disabled={isReadOnly}
                        className="p-1 hover:opacity-70 transition-opacity disabled:opacity-40"
                        style={{ color: '#c87a5c' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </button>

                  {/* Peptide Form */}
                  {isExpanded && (
                    <div className="px-3 pb-3">
                      <PeptideSubForm
                        peptide={peptide}
                        onChange={(updated) => handlePeptideChange(idx, updated)}
                        theme={theme}
                        protocolType={form.protocolType}
                        isFirstPeptide={idx === 0}
                        disabled={isReadOnly}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
            Duration
          </label>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.duration?.noEnd || false}
              onChange={(e) => handleDurationChange('noEnd', e.target.checked)}
              disabled={isReadOnly}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm" style={{ color: theme.textLight }}>
              Ongoing (no set duration)
            </span>
          </div>
          
          {!form.duration?.noEnd && (
            <div className="flex gap-2 mt-2">
              <input
                type="number"
                value={form.duration?.count || ''}
                onChange={(e) => handleDurationChange('count', e.target.value)}
                placeholder="Count"
                disabled={isReadOnly}
                className="flex-1 px-3 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: theme.isDark ? '#111827' : '#ffffff',
                  border: `1px solid ${theme.border}`,
                  color: theme.text
                }}
              />
              <select
                value={toEditorUnit(form.duration?.unit)}
                onChange={(e) => handleDurationChange('unit', e.target.value)}
                disabled={isReadOnly}
                className="px-3 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: theme.isDark ? '#111827' : '#ffffff',
                  border: `1px solid ${theme.border}`,
                  color: theme.text
                }}
              >
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
              </select>
            </div>
          )}
        </div>

        {/* Additional Notes */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
            Additional Notes
          </label>
          <textarea
            value={form.notes || ''}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Any additional information..."
            disabled={isReadOnly}
            className="w-full p-3 rounded-lg text-sm resize-none"
            rows={4}
            style={{
              backgroundColor: theme.isDark ? '#111827' : '#ffffff',
              border: `1px solid ${theme.border}`,
              color: theme.text
            }}
          />
        </div>

        {/* Error Message */}
        {saveError && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <p className="text-sm text-red-500">{saveError}</p>
          </div>
        )}
      </div>

      {/* Footer with Save button */}
      {showFooter && (
        <div className="pt-4 border-t" style={{ borderColor: theme.border }}>
          <button
            onClick={handleSaveClick}
            disabled={isSavingToProtocols || isReadOnly}
            className="w-full px-4 py-3 rounded-lg text-sm font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
            style={{
              background: getPrimaryActionGradient(isSavingToProtocols),
              color: theme.textOnPrimary || '#ffffff',
              boxShadow: isSavingToProtocols ? 'none' : primaryActionDefaultShadow
            }}
          >
            {isSavingToProtocols ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </span>
            ) : isReadOnly ? (
              <span className="flex items-center justify-center gap-2">
                <Lock size={16} />
                Unlock Full Access
              </span>
            ) : (
              'Save Protocol'
            )}
          </button>
        </div>
      )}
    </div>
  );
}

