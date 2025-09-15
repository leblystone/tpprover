import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import TextInput from '../common/inputs/TextInput';
import { Pill, Syringe, TestTube } from 'lucide-react';

export default function SupplementEditorModal({ open, onClose, theme, supplement, onSave }) {
    const [form, setForm] = useState({ name: '', dose: '', schedule: [], delivery: 'oral', days: [] });

    useEffect(() => {
        if (supplement) {
            setForm({
                schedule: [],
                delivery: 'oral',
                days: [],
                ...supplement
            });
        } else {
            setForm({ name: '', dose: '', schedule: [], delivery: 'oral', days: [] });
        }
    }, [supplement, open]);

    const handleSave = () => {
        onSave({ ...form, id: supplement?.id || Date.now() });
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
        { value: 'injection', label: 'Injection', Icon: Syringe },
        { value: 'powder', label: 'Powder', Icon: TestTube },
    ];

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={supplement ? 'Edit Supplement' : 'Add Supplement'}
            theme={theme}
            footer={
                <div className="flex justify-between items-center w-full">
                    <div className="flex-1">
                        {supplement?.id && (
                            <button 
                                onClick={() => {
                                    if (window.confirm('Are you sure you want to delete this supplement?')) {
                                        onSave({ ...supplement, _delete: true });
                                        onClose();
                                    }
                                }}
                                className="px-3 py-2 rounded-md border text-red-600 hover:bg-red-50 transition-colors"
                                style={{ borderColor: '#ef4444' }}
                            >
                                Delete
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-3 py-2 rounded-md border" style={{ borderColor: theme.border }}>Cancel</button>
                        <button onClick={handleSave} className="px-3 py-2 rounded-md" style={{ backgroundColor: theme.primary, color: theme.white }}>Save</button>
                    </div>
                </div>
            }
        >
            <div className="space-y-3">
                {/* Name and Dosage on same line */}
                <div className="grid grid-cols-2 gap-3">
                    <TextInput 
                        label="Name" 
                        value={form.name} 
                        onChange={v => setForm({ ...form, name: v })} 
                        theme={theme} 
                        placeholder="Vitamin C, B12 Injection, Protein, etc." 
                    />
                    <TextInput 
                        label="Dosage" 
                        value={form.dose} 
                        onChange={v => setForm({ ...form, dose: v })} 
                        theme={theme} 
                        placeholder="2 tablets, 1ml, 2 scoops, etc." 
                    />
                </div>
                
                {/* Schedule and Days combined */}
                <div>
                    <div className="text-sm font-medium mb-2" style={{ color: theme.text }}>Schedule & Days</div>
                    <div className="space-y-2">
                        {/* AM/PM Schedule */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600 w-12">Time:</span>
                            <div className="inline-flex rounded-md bg-gray-100 p-1 shadow-inner">
                                {['AM', 'PM'].map(time => (
                                    <button key={time} type="button" onClick={() => toggleTime(time)}
                                        className={`px-3 py-1.5 text-sm font-semibold rounded-md ${form.schedule.includes(time) ? 'text-white' : 'text-gray-700 hover:bg-gray-200'}`}
                                        style={form.schedule.includes(time) ? { backgroundColor: theme.primary } : {}}>
                                        {time}
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        {/* Days */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600 w-12">Days:</span>
                            <div className="flex flex-wrap items-center gap-1">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                    <button
                                        key={day}
                                        type="button"
                                        onClick={() => toggleDay(day)}
                                        className={`px-2 py-1 text-xs rounded-md ${form.days.includes(day) ? 'text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                        style={form.days.includes(day) ? {backgroundColor: theme.primary} : {}}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="text-xs text-gray-500 ml-14">Leave days blank to schedule for every day.</div>
                    </div>
                </div>

                {/* Larger Delivery Method buttons */}
                <div>
                    <div className="text-sm font-medium mb-2" style={{ color: theme.text }}>Delivery Method</div>
                    <div className="grid grid-cols-3 gap-2">
                        {deliveryOptions.map(({ value, label, Icon }) => (
                            <button 
                                key={value} 
                                type="button" 
                                onClick={() => setForm({ ...form, delivery: value })} 
                                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 transition-colors ${form.delivery === value ? 'text-white border-transparent' : 'text-gray-700 border-gray-200 hover:border-gray-300 bg-white'}`}
                                style={form.delivery === value ? { backgroundColor: theme.primary, borderColor: theme.primary } : {}}
                            >
                                <Icon size={20} />
                                <span className="text-sm font-medium">{label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </Modal>
    );
}
