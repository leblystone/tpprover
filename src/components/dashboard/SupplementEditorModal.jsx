import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import TextInput from '../common/inputs/TextInput';
import { Pill, TestTube, Pipette, Pill as PillIcon, CalendarClock, BadgeQuestionMark } from 'lucide-react';

export default function SupplementEditorModal({ open, onClose, theme, supplement, onSave }) {
    const [form, setForm] = useState({ name: '', dose: '', schedule: ['AM'], delivery: 'oral', days: [] });

    useEffect(() => {
        if (supplement) {
            setForm({
                schedule: supplement.schedule && supplement.schedule.length > 0 ? supplement.schedule : ['AM'],
                days: [],
                ...supplement,
                // Ensure delivery is never undefined
                delivery: supplement.delivery || 'oral'
            });
        } else {
            setForm({ name: '', dose: '', schedule: ['AM'], delivery: 'oral', days: [] });
        }
    }, [supplement, open]);

    const handleSave = () => {
        const dataToSave = { ...form, id: supplement?.id || Date.now() };
        console.log('💾 SupplementsWidget handleSave - saving:', dataToSave);
        console.log('💾 Delivery field in saved data:', dataToSave.delivery);
        onSave(dataToSave);
        onClose();
    };
    
    const toggleTime = (time) => {
        const schedule = form.schedule.includes(time)
            ? form.schedule.filter(t => t !== time)
            : [...form.schedule, time];
        setForm({ ...form, schedule });
    };

    const toggleDay = (day) => {
        const days = form.days.includes(day)
            ? form.days.filter(d => d !== day)
            : [...form.days, day];
        setForm({ ...form, days });
    };

    const deliveryOptions = [
        { value: 'oral', label: 'Oral', Icon: Pill },
        { value: 'injection', label: 'Injection', Icon: Pipette },
        { value: 'powder', label: 'Powder', Icon: TestTube },
    ];

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={supplement ? 'Edit Supplement' : 'Add Supplement'}
            theme={theme}
            variant="modern"
            footer={
                <div className="flex justify-between items-center w-full">
                    <div className="flex-1">
                        {supplement?.id && (
                            <button 
                                onClick={() => {
                                    onSave({ ...supplement, _delete: true });
                                    onClose();
                                }}
                                className="px-4 py-2 rounded-lg border font-medium transition-all text-red-600 hover:bg-red-50"
                                style={{ borderColor: '#ef4444' }}
                            >
                                Delete
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 rounded-lg border font-medium transition-all" style={{ borderColor: theme.border, color: theme.text }}>Cancel</button>
                        <button onClick={handleSave} className="px-4 py-2 rounded-lg font-medium transition-all" style={{ backgroundColor: theme.primary, color: '#ffffff' }}>Save</button>
                    </div>
                </div>
            }
        >
            <div className="space-y-4">
                {/* SUPPLEMENT Section Header */}
                <div className="px-4 py-2.5 rounded-lg flex items-center justify-between mb-2" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, borderLeft: '4px solid #e0ded7' }}>
                    <h4 className="font-bold text-sm tracking-wider uppercase" style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76', letterSpacing: '0.1em' }}>SUPPLEMENT</h4>
                    <PillIcon size={20} style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76' }} />
                </div>

                {/* Name and Dosage on same line */}
                <div className="grid grid-cols-2 gap-3">
                    <TextInput
                        label="Name"
                        value={form.name}
                        onChange={v => setForm({ ...form, name: v })}
                        placeholder="B12 Injection, Vitamin D"
                        theme={theme}
                        outlined={true}
                        customTextColor="#181A18"
                        customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
                    />
                    <TextInput
                        label="Dosage"
                        value={form.dose}
                        onChange={v => setForm({ ...form, dose: v })}
                        placeholder="2 tablets, 1 mL"
                        theme={theme}
                        outlined={true}
                        customTextColor="#181A18"
                        customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
                    />
                </div>
                
                {/* SCHEDULE Section Header */}
                <div className="px-4 py-2.5 rounded-lg flex items-center justify-between mb-2" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, borderLeft: '4px solid #e0ded7' }}>
                    <h4 className="font-bold text-sm tracking-wider uppercase" style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76', letterSpacing: '0.1em' }}>SCHEDULE</h4>
                    <CalendarClock size={20} style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76' }} />
                </div>
                
                {/* Schedule and Days combined */}
                <div className="space-y-3">
                    {/* AM/PM Schedule */}
                    <div>
                        <div className="flex rounded-lg p-1 gap-1" style={{ 
                            backgroundColor: theme.isDark ? '#1f2937' : '#f9fafb',
                            boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'
                        }}>
                            {['AM', 'PM'].map(time => (
                                <button 
                                    key={time} 
                                    type="button" 
                                    onClick={() => toggleTime(time)}
                                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                                        form.schedule.includes(time) 
                                            ? 'text-white shadow-sm' 
                                            : 'text-gray-700 hover:bg-gray-200'
                                    }`}
                                    style={form.schedule.includes(time) ? { backgroundColor: theme.primary } : {}}
                                >
                                    {time}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    {/* Days */}
                    <div>
                        <div className="flex flex-wrap items-center justify-center gap-1">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <button
                                    key={day}
                                    type="button"
                                    onClick={() => toggleDay(day)}
                                    className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${form.days.includes(day) ? 'text-white shadow-sm' : 'text-gray-700 bg-gray-100 hover:bg-gray-200'}`}
                                    style={form.days.includes(day) ? {backgroundColor: theme.primary} : {}}
                                >
                                    {day}
                                </button>
                            ))}
                        </div>
                        <div className="text-xs mt-2 text-center" style={{ color: theme.textLight || theme.text, opacity: 0.7 }}>Leave days blank to schedule for every day.</div>
                    </div>
                </div>

                {/* DELIVERY METHOD Section Header */}
                <div className="px-4 py-2.5 rounded-lg flex items-center justify-between mb-2" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, borderLeft: '4px solid #e0ded7' }}>
                    <h4 className="font-bold text-sm tracking-wider uppercase" style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76', letterSpacing: '0.1em' }}>DELIVERY METHOD</h4>
                    <BadgeQuestionMark size={20} style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76' }} />
                </div>

                {/* Delivery Method pills */}
                <div>
                    <div className="flex rounded-lg p-1 gap-1" style={{ 
                        backgroundColor: theme.isDark ? '#1f2937' : '#f9fafb',
                        boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'
                    }}>
                        {deliveryOptions.map(({ value, label, Icon }) => (
                            <button 
                                key={value} 
                                type="button" 
                                onClick={() => {
                                    console.log('🖱️ Delivery method clicked:', value);
                                    setForm({ ...form, delivery: value });
                                    console.log('📋 Form state after update:', { ...form, delivery: value });
                                }} 
                                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${form.delivery === value ? 'text-white shadow-sm' : 'text-gray-700 hover:bg-gray-200'}`}
                                style={form.delivery === value ? { backgroundColor: theme.primary } : {}}
                            >
                                <Icon size={16} />
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </Modal>
    );
}

