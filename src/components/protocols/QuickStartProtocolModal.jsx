import React, { useState } from 'react';
import BottomSheet from '../common/BottomSheet';
import TextInput from '../common/inputs/TextInput';
import { Zap, Calendar, Clock } from 'lucide-react';
import { getLocalDateString } from '../../utils/date';
import { generateId } from '../../utils/string';

export default function QuickStartProtocolModal({ open, onClose, theme, onSave }) {
    const [form, setForm] = useState({
        name: '',
        dosage: '',
        dosageUnit: 'mg',
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
                    unitValue: ''
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

    return (
        <BottomSheet
            open={open}
            onClose={onClose}
            title="Quick Start Protocol"
            theme={theme}
            maxHeight="80vh"
        >
            <div className="space-y-4">
                {/* Header with icon */}
                <div className="flex items-center gap-3 p-4 rounded-lg" style={{ 
                    backgroundColor: theme.isDark ? 'rgba(200, 122, 92, 0.1)' : 'rgba(200, 122, 92, 0.05)',
                    borderLeft: `4px solid ${theme.primary}`
                }}>
                    <Zap size={24} style={{ color: theme.primary }} fill={theme.primary} />
                    <div>
                        <h4 className="text-sm font-bold" style={{ color: theme.text }}>Start in 30 seconds</h4>
                        <p className="text-xs mt-0.5" style={{ color: theme.textLight }}>
                            Create and start a protocol instantly. Add details later.
                        </p>
                    </div>
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

                {/* Dosage - Inline with Unit Selector */}
                <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.15em] opacity-40 mb-2 ml-1" style={{ color: theme.text }}>
                        Dosage
                    </label>
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <input
                                type="text"
                                value={form.dosage}
                                onChange={e => handleChange('dosage', e.target.value)}
                                placeholder="0.5"
                                className="w-full px-3 py-3 rounded-lg outline-none transition-all"
                                style={{
                                    border: `1px solid ${theme.isDark ? '#4b5563' : '#f0eee7'}`,
                                    boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)',
                                    backgroundColor: theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff'),
                                    color: theme.isDark ? theme.text : '#181A18'
                                }}
                            />
                        </div>
                        <div className="w-24">
                            <select
                                value={form.dosageUnit}
                                onChange={e => handleChange('dosageUnit', e.target.value)}
                                className="w-full px-3 py-3 rounded-lg outline-none transition-all appearance-none text-center font-medium"
                                style={{
                                    border: `1px solid ${theme.isDark ? '#4b5563' : '#f0eee7'}`,
                                    boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)',
                                    backgroundColor: theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb'),
                                    color: theme.isDark ? theme.text : '#181A18'
                                }}
                            >
                                <option value="mg">mg</option>
                                <option value="mcg">mcg</option>
                                <option value="iu">IU</option>
                                <option value="units">Units</option>
                            </select>
                        </div>
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

                {/* Info Box */}
                <div className="text-xs text-center py-2 px-3 rounded-lg" style={{ 
                    backgroundColor: `${theme.info || theme.primary}10`,
                    color: theme.textLight
                }}>
                    <p className="leading-relaxed">
                        Tasks will appear on your Dashboard & Calendar
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        className="flex-1 px-4 py-3 rounded-lg font-medium transition-all"
                        style={{ 
                            backgroundColor: theme.isDark ? '#374151' : theme.secondary, 
                            color: theme.text,
                            opacity: isSaving ? 0.5 : 1
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 px-4 py-3 rounded-lg font-bold transition-all"
                        style={{ 
                            backgroundColor: theme.primary, 
                            color: '#ffffff',
                            opacity: isSaving ? 0.7 : 1
                        }}
                    >
                        {isSaving ? 'Starting...' : 'Start Protocol 🚀'}
                    </button>
                </div>
            </div>
        </BottomSheet>
    );
}
