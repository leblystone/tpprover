import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import TextInput from '../common/inputs/TextInput';
import GlassmorphismDatePicker from '../common/GlassmorphismDatePicker';
import { Pill, TestTube, Pipette, Pill as PillIcon, CalendarClock, BadgeQuestionMark, HandHelping } from 'lucide-react';
import { generateId } from '../../utils/string';

export default function SupplementEditorModal({ open, onClose, theme, supplement, onSave }) {
    const [form, setForm] = useState({ name: '', dose: '', schedule: ['AM'], delivery: 'oral', days: [], startDate: '', endDate: '' });

    useEffect(() => {
        if (supplement) {
            setForm({
                schedule: supplement.schedule && supplement.schedule.length > 0 ? supplement.schedule : ['AM'],
                days: [],
                ...supplement,
                // Ensure delivery is never undefined
                delivery: supplement.delivery || 'oral',
                startDate: supplement.startDate || '',
                endDate: supplement.endDate || ''
            });
        } else {
            setForm({ name: '', dose: '', schedule: ['AM'], delivery: 'oral', days: [], startDate: '', endDate: '' });
        }
    }, [supplement, open]);

    const handleSave = async () => {
        // Validate that if dates are used, at least one should be filled
        // If neither is filled, don't include them in the save
        const dataToSave = { ...form, id: supplement?.id || generateId() };
        
        // If both dates are empty, remove them from the data
        if (!form.startDate && !form.endDate) {
            delete dataToSave.startDate;
            delete dataToSave.endDate;
        }
        
        await onSave(dataToSave);
        // onSave will handle closing the modal
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
                <div className="w-full flex items-center gap-3">
                    <div className="flex items-center gap-2 flex-1 justify-start">
                        {supplement?.id && (
                            <button 
                                type="button"
                                onClick={async () => {
                                    await onSave({ ...supplement, _delete: true });
                                    // onSave will handle closing the modal
                                }}
                                className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md active:scale-95"
                                style={{
                                    background: 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)',
                                    color: '#ffffff',
                                    border: 'none'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'linear-gradient(135deg, #b5684a 0%, #a35a3f 100%)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)';
                                }}
                            >
                                Delete
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2 flex-1 justify-end">
                        <button 
                            type="button"
                            onClick={handleSave} 
                            className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg active:scale-95"
                            style={{ 
                                background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryDark || theme.primary} 100%)`,
                                color: theme.textOnPrimary || '#ffffff',
                                border: 'none',
                                boxShadow: theme.isDark ? '0 4px 6px rgba(0, 0, 0, 0.3)' : '0 4px 6px rgba(0, 0, 0, 0.1)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = theme.isDark ? '0 10px 25px rgba(0, 0, 0, 0.5)' : '0 10px 25px rgba(0, 0, 0, 0.15)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = theme.isDark ? '0 4px 6px rgba(0, 0, 0, 0.3)' : '0 4px 6px rgba(0, 0, 0, 0.1)';
                            }}
                        >
                            Save Changes
                        </button>
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
                        customTextColor={theme.isDark ? null : "#181A18"}
                        customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
                    />
                    <TextInput
                        label="Dosage"
                        value={form.dose}
                        onChange={v => setForm({ ...form, dose: v })}
                        placeholder="2 tablets, 1 mL"
                        theme={theme}
                        outlined={true}
                        customTextColor={theme.isDark ? null : "#181A18"}
                        customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
                    />
                </div>

                {/* Start Date and End Date on same line */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: theme.text }}>Start Date</label>
                        <GlassmorphismDatePicker
                            value={form.startDate}
                            onChange={(dateString) => setForm({ ...form, startDate: dateString })}
                            theme={theme}
                            placeholder="Select start date"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: theme.text }}>End Date</label>
                        <GlassmorphismDatePicker
                            value={form.endDate}
                            onChange={(dateString) => setForm({ ...form, endDate: dateString })}
                            theme={theme}
                            placeholder="Select end date"
                        />
                    </div>
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
                        <div className="text-xs mt-2 text-center flex items-center justify-center gap-1.5" style={{ color: theme.textLight || theme.text, opacity: 0.7 }}>
                            <HandHelping size={14} />
                            <span>Leave days unchecked for everyday.</span>
                        </div>
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
                                    setForm({ ...form, delivery: value });
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

