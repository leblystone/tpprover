import React, { useState, useEffect } from 'react';
import BottomSheet from '../common/BottomSheet';
import TextInput from '../common/inputs/TextInput';
import { Pill, TestTube, Pipette } from 'lucide-react';
import { isSimpleMode, getLocalTrackingMode } from '../../utils/trackingMode';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SupplementEditorModal({ open, onClose, onSave, theme, supplement }) {
    const simpleMode = isSimpleMode(getLocalTrackingMode());
    const [name, setName] = useState('');
    const [dose, setDose] = useState('');
    const [schedule, setSchedule] = useState([]);
    const [delivery, setDelivery] = useState('oral');
    const [days, setDays] = useState([]);
    const [deleteConfirmFollowUp, setDeleteConfirmFollowUp] = useState(false);
    
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

    useEffect(() => {
        setDeleteConfirmFollowUp(false);
    }, [supplement?.id, open]);

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
        { value: 'injection', label: 'Injection', icon: <Pipette size={16} /> },
        { value: 'powder', label: 'Powder', icon: <TestTube size={16} /> },
    ];

    return (
        <BottomSheet 
            open={open} 
            onClose={onClose} 
            title={supplement?.id ? "Edit Supplement" : "Add Supplement"} 
            theme={theme}
            footer={
                <div className="flex items-center w-full gap-3 flex-wrap">
                    <button type="button" onClick={onClose} className="text-sm font-medium py-2.5 bg-transparent border-0" style={{ color: theme.textLight || theme.text }}>Cancel</button>
                    <div className="ml-auto flex items-center gap-3 flex-wrap justify-end flex-1 min-w-0">
                        {supplement?.id && (
                            !deleteConfirmFollowUp ? (
                                <button
                                    type="button"
                                    onClick={() => setDeleteConfirmFollowUp(true)}
                                    className="text-sm font-medium py-2.5 px-1 bg-transparent border-0 touch-manipulation"
                                    style={{ color: theme.error || '#c4714f' }}
                                >
                                    Delete
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onSave({ ...supplement, _delete: true });
                                        setDeleteConfirmFollowUp(false);
                                        onClose();
                                    }}
                                    className="text-sm font-semibold py-2.5 px-1 bg-transparent border-0 touch-manipulation"
                                    style={{ color: theme.error || '#c4714f' }}
                                >
                                    Tap to Confirm
                                </button>
                            )
                        )}
                        <button type="button" onClick={handleSave} className="px-4 py-2 rounded-lg text-sm font-semibold transition-all" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}>Save</button>
                    </div>
                </div>
            }
        >
            <div className="space-y-6">
                <div className="flex items-center gap-4 mb-4">
                    <Pill size={32} style={{ color: theme.primary }} />
                    <div className="flex flex-col gap-0.5">
                        <h4 className="text-lg font-black tracking-wide" style={{ color: theme.text }}>Supplement Info</h4>
                        <div className="flex items-center gap-2 ml-1">
                            <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
                            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                                Regimen Details
                            </span>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <TextInput label="Supplement Name" value={name} onChange={setName} theme={theme} placeholder="e.g., Vitamin D3, B12 Injection, Protein Powder" outlined={true} />
                    <TextInput label="Dosage" value={dose} onChange={setDose} theme={theme} placeholder="e.g., 2 pills, 5000 IU, 1ml" outlined={true} />

                <div>
                    <label className="text-sm font-medium mb-1 block" style={{ color: theme.text }}>Schedule</label>
                    <div className="flex gap-2">
                        {['AM', 'PM'].map(val => (
                            <button
                                key={val}
                                type="button"
                                onClick={() => toggleSchedule(val)}
                                className="px-4 py-2 text-sm font-medium rounded-lg w-full transition-all active:scale-95"
                                style={{
                                    backgroundColor: schedule.includes(val) ? '#445952' : (theme.isDark ? '#1f2937' : '#f5f4f0'),
                                    color: schedule.includes(val) ? '#fff' : theme.text,
                                    border: schedule.includes(val) ? '1px solid #3B4240' : `1px solid ${theme.border}`,
                                    boxShadow: schedule.includes(val) ? 'inset 0 2px 4px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.1)' : 'inset 0 1px 3px rgba(0,0,0,0.06)'
                                }}
                            >
                                {val}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium mb-1 block" style={{ color: theme.text }}>Days</label>
                    <div className="grid grid-cols-7 gap-1 sm:gap-1.5 w-full">
                        {DAYS.map(day => (
                             <button
                                key={day}
                                type="button"
                                onClick={() => toggleDay(day)}
                                className="min-w-0 w-full px-0.5 sm:px-1 py-2 text-[10px] sm:text-xs font-bold rounded-md transition-all active:scale-95 text-center"
                                style={{
                                    backgroundColor: days.includes(day) ? '#445952' : (theme.isDark ? '#1f2937' : '#f5f4f0'),
                                    color: days.includes(day) ? '#fff' : theme.textLight,
                                    border: days.includes(day) ? '1px solid #3B4240' : `1px solid ${theme.border}`,
                                    boxShadow: days.includes(day) ? 'inset 0 2px 4px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.1)' : 'inset 0 1px 3px rgba(0,0,0,0.06)'
                                }}
                            >
                                {day}
                            </button>
                        ))}
                    </div>
                    <div className="text-xs mt-1" style={{ color: theme.textLight || theme.text, opacity: 0.6 }}>Leave blank for every day.</div>
                </div>

                {!simpleMode && (
                <div>
                    <label className="text-sm font-medium mb-1 block" style={{ color: theme.text }}>Delivery Method</label>
                    <div className="inline-flex w-full rounded-lg p-1 gap-1" style={{ backgroundColor: theme.isDark ? `${theme.primary}18` : `${theme.primary}12`, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08)' }}>
                         {deliveryOptions.map(opt => {
                            const isSelected = delivery === opt.value;
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setDelivery(opt.value)}
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-semibold transition-all active:scale-95"
                                    style={{
                                        backgroundColor: isSelected ? '#445952' : 'transparent',
                                        color: isSelected ? '#fff' : theme.textLight,
                                        boxShadow: isSelected ? 'inset 0 2px 4px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.08)' : 'none'
                                    }}
                                >
                                    {opt.icon}
                                    {opt.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
                )}
            </div>
        </BottomSheet>
    </>
    );
}
