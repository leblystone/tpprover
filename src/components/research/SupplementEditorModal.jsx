import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import TextInput from '../common/inputs/TextInput';
import { Pill, Syringe, TestTube } from 'lucide-react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SupplementEditorModal({ open, onClose, onSave, theme, supplement }) {
    const [name, setName] = useState('');
    const [dose, setDose] = useState('');
    const [schedule, setSchedule] = useState([]);
    const [delivery, setDelivery] = useState('oral');
    const [days, setDays] = useState([]);
    
    useEffect(() => {
        if (open && supplement) {
            setName(supplement.name || '');
            setDose(supplement.dose || '');
            setSchedule(Array.isArray(supplement.schedule) ? supplement.schedule : []);
            setDelivery(supplement.delivery || 'oral');
            setDays(Array.isArray(supplement.days) ? supplement.days : []);
        } else if (open) {
            // Reset for new entry
            setName('');
            setDose('');
            setSchedule([]);
            setDelivery('oral');
            setDays([]);
        }
    }, [open, supplement]);

    const handleSave = () => {
        onSave({ ...supplement, id: supplement?.id || Date.now(), name, dose, schedule, delivery, days });
        onClose();
    };

    const toggleSchedule = (val) => {
        setSchedule(prev => {
            if (prev.includes(val)) {
                return prev.filter(item => item !== val);
            }
            return [...prev, val];
        });
    };

    const toggleDay = (day) => {
        setDays(prev => {
            if (prev.includes(day)) {
                return prev.filter(d => d !== day);
            }
            return [...prev, day];
        });
    };

    const deliveryOptions = [
        { value: 'oral', label: 'Oral', icon: <Pill size={16} /> },
        { value: 'injection', label: 'Injection', icon: <Syringe size={16} /> },
        { value: 'powder', label: 'Powder', icon: <TestTube size={16} /> },
    ];

    return (
        <Modal open={open} onClose={onClose} title={supplement?.id ? "Edit Supplement" : "Add Supplement"} theme={theme}>
            <div className="space-y-4 p-1">
                <TextInput label="Supplement Name" value={name} onChange={setName} theme={theme} placeholder="e.g., Vitamin D3, B12 Injection, Protein Powder" />
                <TextInput label="Dosage" value={dose} onChange={setDose} theme={theme} placeholder="e.g., 2 pills, 5000 IU, 1ml" />

                <div>
                    <label className="text-sm font-medium mb-1 block" style={{ color: theme.text }}>Schedule</label>
                    <div className="flex gap-2">
                        {['AM', 'PM'].map(val => (
                            <button
                                key={val}
                                type="button"
                                onClick={() => toggleSchedule(val)}
                                className={`px-4 py-2 text-sm rounded-md border w-full ${schedule.includes(val) ? 'text-white' : ''}`}
                                style={schedule.includes(val) ? { backgroundColor: theme.primary, borderColor: theme.primary } : { borderColor: theme.border }}
                            >
                                {val}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium mb-1 block" style={{ color: theme.text }}>Days</label>
                    <div className="grid grid-cols-7 gap-1">
                        {DAYS.map(day => (
                             <button
                                key={day}
                                type="button"
                                onClick={() => toggleDay(day)}
                                className={`px-2 py-2 text-xs rounded-md border ${days.includes(day) ? 'text-white' : ''}`}
                                style={days.includes(day) ? { backgroundColor: theme.primary, borderColor: theme.primary } : { borderColor: theme.border }}
                            >
                                {day}
                            </button>
                        ))}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">Leave blank for every day.</div>
                </div>

                <div>
                    <label className="text-sm font-medium mb-1 block" style={{ color: theme.text }}>Delivery Method</label>
                    <div className="grid grid-cols-3 gap-2">
                         {deliveryOptions.map(opt => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setDelivery(opt.value)}
                                className={`flex flex-col items-center justify-center gap-1 p-3 text-sm rounded-md border ${delivery === opt.value ? 'text-white' : ''}`}
                                style={delivery === opt.value ? { backgroundColor: theme.primary, borderColor: theme.primary } : { borderColor: theme.border }}
                            >
                                {opt.icon}
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <button onClick={onClose} className="px-4 py-2 rounded-md" style={{ backgroundColor: theme.background, color: theme.text }}>Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 rounded-md" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}>Save</button>
                </div>
            </div>
        </Modal>
    );
}
