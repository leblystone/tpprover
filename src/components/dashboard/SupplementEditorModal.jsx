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
                <>
                    <button onClick={onClose} className="px-3 py-2 rounded-md border" style={{ borderColor: theme.border }}>Cancel</button>
                    <button onClick={handleSave} className="px-3 py-2 rounded-md" style={{ backgroundColor: theme.primary, color: theme.white }}>Save</button>
                </>
            }
        >
            <div className="space-y-4">
                <TextInput label="Name" value={form.name} onChange={v => setForm({ ...form, name: v })} theme={theme} placeholder="e.g., Vitamin D3" />
                <TextInput label="Dose" value={form.dose} onChange={v => setForm({ ...form, dose: v })} theme={theme} placeholder="e.g., 5000 IU" />
                
                <div>
                    <div className="text-sm font-medium mb-1" style={{ color: theme.text }}>Schedule</div>
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

                <div>
                    <div className="text-sm font-medium mb-1" style={{ color: theme.text }}>Days</div>
                    <div className="flex flex-wrap items-center gap-1 bg-gray-100 p-2 rounded-md shadow-inner">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <button
                                key={day}
                                type="button"
                                onClick={() => toggleDay(day)}
                                className={`px-3 py-1.5 text-xs rounded-md ${form.days.includes(day) ? 'text-white' : 'bg-white text-gray-700'}`}
                                style={form.days.includes(day) ? {backgroundColor: theme.primary} : {}}
                            >
                                {day}
                            </button>
                        ))}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Leave blank to schedule for every day.</div>
                </div>

                <div>
                    <div className="text-sm font-medium mb-1" style={{ color: theme.text }}>Delivery Method</div>
                    <div className="flex w-full rounded-md bg-gray-100 p-1 shadow-inner">
                        {deliveryOptions.map(({ value, label, Icon }) => (
                            <button 
                                key={value} 
                                type="button" 
                                onClick={() => setForm({ ...form, delivery: value })} 
                                className={`flex-1 flex items-center justify-center gap-2 text-center px-3 py-1.5 rounded-md text-sm font-semibold ${form.delivery === value ? 'text-white' : 'text-gray-700 hover:bg-gray-200'}`}
                                style={form.delivery === value ? { backgroundColor: theme.primary } : {}}
                            >
                                <Icon size={14} />
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </Modal>
    );
}
