import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import TextInput from '../common/inputs/TextInput';
import { Pill, TestTube, Pipette } from 'lucide-react';

export default function SupplementEditorModal({ open, onClose, theme, supplement, onSave }) {
    const [form, setForm] = useState({ name: '', dose: '', schedule: [], delivery: 'oral', days: [] });

    useEffect(() => {
        if (supplement) {
            setForm({
                schedule: [],
                delivery: 'oral',
                days: [],
                ...supplement,
                // Ensure delivery is never undefined
                delivery: supplement.delivery || 'oral'
            });
        } else {
            setForm({ name: '', dose: '', schedule: [], delivery: 'oral', days: [] });
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
                {/* SUPPLEMENT DETAILS Section Header */}
                <div className="px-4 py-2.5 rounded-lg" style={{ backgroundColor: theme.secondary, borderLeft: `4px solid ${theme.primary}` }}>
                    <h4 className="font-black text-sm tracking-wide uppercase" style={{ color: theme.primary }}>SUPPLEMENT DETAILS</h4>
                </div>

                {/* Name and Dosage on same line */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-sm font-medium mb-2 block" style={{ color: theme.text }}>Name</label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            placeholder="Vit C, B12 Injection, etc."
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-opacity-50 transition-all"
                            style={{
                                borderColor: theme.border,
                                backgroundColor: theme.cardBackground,
                                color: theme.text,
                                focusRingColor: theme.primary
                            }}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-2 block" style={{ color: theme.text }}>Dosage</label>
                        <input
                            type="text"
                            value={form.dose}
                            onChange={e => setForm({ ...form, dose: e.target.value })}
                            placeholder="2 tablets, 1ml, 2 scoops, etc."
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-opacity-50 transition-all"
                            style={{
                                borderColor: theme.border,
                                backgroundColor: theme.cardBackground,
                                color: theme.text,
                                focusRingColor: theme.primary
                            }}
                        />
                    </div>
                </div>
                
                {/* SCHEDULE & DAYS Section Header */}
                <div className="px-4 py-2.5 rounded-lg" style={{ backgroundColor: theme.secondary, borderLeft: `4px solid ${theme.primary}` }}>
                    <h4 className="font-black text-sm tracking-wide uppercase" style={{ color: theme.primary }}>SCHEDULE & DAYS</h4>
                </div>
                
                {/* Schedule and Days combined */}
                <div>
                    <div className="text-sm font-medium mb-2" style={{ color: theme.text }}>Schedule & Days</div>
                    <div className="space-y-2">
                        {/* AM/PM Schedule */}
                        <div>
                            <label className="text-sm font-medium mb-2 block" style={{ color: theme.text }}>Time</label>
                            <div className="flex rounded-lg bg-gray-100 p-1 gap-1">
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
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium mb-2 block" style={{ color: theme.text }}>Days</label>
                            <div className="flex flex-wrap items-center gap-1">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                    <button
                                        key={day}
                                        type="button"
                                        onClick={() => toggleDay(day)}
                                        className={`px-3 py-2 text-sm font-medium rounded-md transition-all ${form.days.includes(day) ? 'text-white shadow-sm' : 'text-gray-700 bg-gray-100 hover:bg-gray-200'}`}
                                        style={form.days.includes(day) ? {backgroundColor: theme.primary} : {}}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="text-xs mt-2 text-center" style={{ color: theme.text, opacity: 0.7 }}>Leave days blank to schedule for every day.</div>
                    </div>
                </div>

                {/* DELIVERY METHOD Section Header */}
                <div className="px-4 py-2.5 rounded-lg" style={{ backgroundColor: theme.secondary, borderLeft: `4px solid ${theme.primary}` }}>
                    <h4 className="font-black text-sm tracking-wide uppercase" style={{ color: theme.primary }}>DELIVERY METHOD</h4>
                </div>

                {/* Delivery Method pills */}
                <div>
                    <div className="flex rounded-lg bg-gray-100 p-1 gap-1">
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

