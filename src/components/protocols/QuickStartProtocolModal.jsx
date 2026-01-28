import React, { useState, useMemo } from 'react';
import BottomSheet from '../common/BottomSheet';
import TextInput from '../common/inputs/TextInput';
import CombinedDosageInput from '../common/inputs/CombinedDosageInput';
import VisualSchedulePreview from './VisualSchedulePreview';
import { Zap, Calendar, Clock, Check, Loader2 } from 'lucide-react';
import { getLocalDateString } from '../../utils/date';
import { generateId } from '../../utils/string';

export default function QuickStartProtocolModal({ open, onClose, theme, onSave }) {
    const [form, setForm] = useState({
        name: '',
        dosage: '',
        dosageUnit: 'mg',
        unitValue: '',
        timeOfDay: ['AM'],
        startDate: getLocalDateString()
    });

    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        // Validate
        if (!form.name || !form.name.trim()) {
            alert('Please enter a protocol name');
            return;
        }
        if (!form.dosage || !form.dosage.trim()) {
            alert('Please enter a dosage');
            return;
        }

        setIsSaving(true);
        try {
            // Create a full protocol structure, but mark it as quick-started
            const protocol = {
                id: generateId(),
                protocolName: form.name.trim(),
                purpose: '',
                protocolType: 'separate',
                blendMode: 'separate',
                peptides: [{
                    id: generateId(),
                    name: form.name.trim(),
                    dosage: {
                        amount: form.dosage,
                        unit: form.dosageUnit
                    },
                    frequency: { 
                        type: 'daily', 
                        time: form.timeOfDay 
                    },
                    deliveryMethod: 'pipette',
                    unitValue: form.unitValue || ''
                }],
                duration: { 
                    count: '', 
                    unit: 'weeks', 
                    noEnd: true 
                },
                washout: { 
                    enabled: false, 
                    duration: '', 
                    unit: 'weeks' 
                },
                notes: '',
                quickStart: true, // Flag to identify quick-started protocols
                status: 'active',
                startDate: form.startDate,
                active: true,
                linkedItems: {} // Empty - no vials linked yet
            };

            await onSave(protocol);
            
            // Reset form
            setForm({
                name: '',
                dosage: '',
                dosageUnit: 'mg',
                unitValue: '',
                timeOfDay: ['AM'],
                startDate: getLocalDateString()
            });
            
            onClose();
        } catch (error) {
            console.error('Failed to create quick start protocol:', error);
            alert('Failed to create protocol. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const toggleTimeOfDay = (time) => {
        setForm(prev => {
            const current = prev.timeOfDay || [];
            const newTimes = current.includes(time)
                ? current.filter(t => t !== time)
                : [...current, time];
            // Ensure at least one time is selected
            return { ...prev, timeOfDay: newTimes.length > 0 ? newTimes : ['AM'] };
        });
    };

    const getPrimaryActionGradient = (saving) => {
        const secondaryColor = theme?.secondary || '#d1d5db';
        if (saving) {
            return `linear-gradient(135deg, ${secondaryColor} 0%, ${secondaryColor} 100%)`;
        }
        const darkBase = theme?.primaryDark || theme?.primary;
        return `linear-gradient(135deg, ${darkBase} 0%, ${darkBase} 100%)`;
    };

    return (
        <BottomSheet
            open={open}
            onClose={onClose}
            title="Quick Start Protocol"
            theme={theme}
            maxHeight="80vh"
            footer={
                <div className="w-full flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        className="px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-70"
                        style={{
                            backgroundColor: 'transparent',
                            color: theme?.text || '#111827',
                            border: 'none',
                            opacity: isSaving ? 0.5 : 1
                        }}
                    >
                        Cancel
                    </button>
                    <div className="flex items-center gap-3 ml-auto">
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-6 py-3 rounded-full text-sm font-semibold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-75 whitespace-nowrap min-w-fit flex items-center justify-center gap-2"
                            style={{
                                background: getPrimaryActionGradient(isSaving),
                                color: isSaving ? (theme?.text || '#111827') : (theme?.textOnPrimary || '#ffffff'),
                                border: 'none',
                                boxShadow: isSaving 
                                    ? 'none' 
                                    : theme?.isDark
                                        ? '0 4px 20px rgba(127, 158, 149, 0.4), 0 0 0 1px rgba(127, 158, 149, 0.1)'
                                        : '0 4px 20px rgba(127, 158, 149, 0.3), 0 0 0 1px rgba(127, 158, 149, 0.1)'
                            }}
                            onMouseEnter={(e) => {
                                if (isSaving) return;
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = theme?.isDark
                                    ? '0 6px 25px rgba(127, 158, 149, 0.5), 0 0 0 1px rgba(127, 158, 149, 0.2)'
                                    : '0 6px 25px rgba(127, 158, 149, 0.4), 0 0 0 1px rgba(127, 158, 149, 0.15)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = isSaving 
                                    ? 'none' 
                                    : theme?.isDark
                                        ? '0 4px 20px rgba(127, 158, 149, 0.4), 0 0 0 1px rgba(127, 158, 149, 0.1)'
                                        : '0 4px 20px rgba(127, 158, 149, 0.3), 0 0 0 1px rgba(127, 158, 149, 0.1)';
                                e.currentTarget.style.background = getPrimaryActionGradient(isSaving);
                            }}
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    <span>Starting…</span>
                                </>
                            ) : (
                                <>
                                    <Check size={18} />
                                    <span>Start Protocol</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            }
        >
            <div className="space-y-4">
                {/* Header with tip */}
                <div className="text-xs text-center py-2 px-3 rounded-lg" style={{ 
                    backgroundColor: `${theme.info || theme.primary}10`,
                    color: theme.textLight
                }}>
                    <p className="leading-relaxed">
                        <strong>Start in 30 seconds.</strong><br />
                        Create and start a protocol instantly. Add details later.
                    </p>
                </div>

                {/* Protocol Name */}
                <TextInput
                    label="Protocol Name"
                    value={form.name}
                    onChange={v => handleChange('name', v)}
                    placeholder="e.g., Semaglutide, BPC-157, etc."
                    theme={theme}
                    outlined={true}
                    customTextColor={theme.isDark ? null : "#181A18"}
                    customShadow
                />

                {/* Dosage and Units - Same row as Protocol Modal */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                        <CombinedDosageInput
                            value={{ amount: form.dosage, unit: form.dosageUnit }}
                            onChange={(newDosage) => {
                                handleChange('dosage', newDosage.amount);
                                handleChange('dosageUnit', newDosage.unit);
                            }}
                            theme={theme}
                            placeholder="0.5"
                            outlined={true}
                            customTextColor={theme.isDark ? null : "#181A18"}
                            customShadow
                        />
                    </div>
                    <div className="col-span-1">
                        <TextInput
                            label="Units"
                            value={form.unitValue || ''}
                            onChange={v => handleChange('unitValue', v)}
                            placeholder="10"
                            theme={theme}
                            outlined={true}
                            customTextColor={theme.isDark ? null : "#181A18"}
                            customShadow
                        />
                    </div>
                </div>

                {/* Time of Day - Toggle Buttons */}
                <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.15em] opacity-40 mb-2 ml-1" style={{ color: theme.text }}>
                        Time of Day
                    </label>
                    <div className="flex gap-2">
                        {['AM', 'PM'].map(time => {
                            const isSelected = form.timeOfDay.includes(time);
                            return (
                                <button
                                    key={time}
                                    type="button"
                                    onClick={() => toggleTimeOfDay(time)}
                                    className="flex-1 py-3 rounded-lg font-bold text-sm transition-all"
                                    style={{
                                        backgroundColor: isSelected ? theme.primary : (theme.isDark ? '#1f2937' : theme.secondary),
                                        color: isSelected ? '#ffffff' : theme.text,
                                        border: `2px solid ${isSelected ? theme.primary : 'transparent'}`
                                    }}
                                >
                                    <Clock size={14} className="inline mr-1" />
                                    {time}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Start Date */}
                <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.15em] opacity-40 mb-2 ml-1" style={{ color: theme.text }}>
                        Start Date
                    </label>
                    <div className="relative">
                        <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: theme.textLight }} />
                        <input
                            type="date"
                            value={form.startDate}
                            onChange={e => handleChange('startDate', e.target.value)}
                            className="w-full pl-10 pr-3 py-3 rounded-lg outline-none transition-all"
                            style={{
                                border: `1px solid ${theme.isDark ? '#4b5563' : '#f0eee7'}`,
                                boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)',
                                backgroundColor: theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff'),
                                color: theme.isDark ? theme.text : '#181A18'
                            }}
                        />
                    </div>
                </div>

                {/* Schedule Preview */}
                {form.name && form.dosage && (() => {
                    // Create a temporary protocol object for the preview
                    const previewProtocol = {
                        protocolName: form.name,
                        peptides: [{
                            id: generateId(),
                            name: form.name,
                            dosage: {
                                amount: form.dosage,
                                unit: form.dosageUnit
                            },
                            frequency: {
                                type: 'daily',
                                time: form.timeOfDay
                            },
                            deliveryMethod: 'pipette'
                        }],
                        duration: {
                            count: '',
                            unit: 'weeks',
                            noEnd: true
                        }
                    };
                    return (
                        <VisualSchedulePreview 
                            protocol={previewProtocol}
                            startDate={form.startDate}
                            theme={theme}
                        />
                    );
                })()}

            </div>
        </BottomSheet>
    );
}
