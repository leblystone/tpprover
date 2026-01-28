import React, { useState, useEffect } from 'react';
import BottomSheet from '../common/BottomSheet';
import TextInput from '../common/inputs/TextInput';
import GlassmorphismDatePicker from '../common/GlassmorphismDatePicker';
import ConfirmationModal from '../ui/ConfirmationModal';
import { Pill, TestTube, Pipette, Pill as PillIcon, CalendarClock, BadgeQuestionMark, HandHelping } from 'lucide-react';
import { generateId } from '../../utils/string';

export default function SupplementEditorModal({ open, onClose, theme, supplement, onSave }) {
    const [form, setForm] = useState({ name: '', dose: '', schedule: ['AM'], delivery: 'oral', days: [], startDate: '', endDate: '' });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
    <>
        <BottomSheet
            open={open}
            onClose={onClose}
            title={supplement ? 'Edit Supplement' : 'Add Supplement'}
            theme={theme}
            maxHeight="90vh"
            fitContent
            footer={
                <div className="w-full flex items-center gap-3">
                    <div className="flex items-center gap-2 flex-1 justify-start">
                        {supplement?.id && (
                            <button 
                                type="button"
                                onClick={() => setShowDeleteConfirm(true)}
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
                            className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg active:scale-95 whitespace-nowrap min-w-fit"
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
            <div className="space-y-6">
                {/* Section: Supplement Details (New Order modal style) */}
                <div>
                    <div className="flex items-center gap-4 mb-4">
                        <PillIcon size={32} style={{ color: theme.primary }} />
                        <div className="flex flex-col gap-0.5 flex-1">
                            <h4 className="text-lg font-black tracking-wide" style={{ color: theme.text }}>Supplement Details</h4>
                            <div className="flex items-center gap-2 ml-1">
                                <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }} />
                                <span className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                                    Name, Dosage & Dates
                                </span>
                            </div>
                        </div>
                    </div>
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
                    <div className="grid grid-cols-2 gap-3 mt-3">
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
                </div>

                {/* Section: Schedule (New Order modal style) */}
                <div className="pt-2">
                    <div className="flex items-center gap-4 mb-4">
                        <CalendarClock size={32} style={{ color: theme.primary }} />
                        <div className="flex flex-col gap-0.5">
                            <h4 className="text-lg font-black tracking-wide" style={{ color: theme.text }}>Schedule</h4>
                            <div className="flex items-center gap-2 ml-1">
                                <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }} />
                                <span className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                                    Time & Days
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex rounded-lg p-1 gap-1" style={{ backgroundColor: theme.isDark ? '#1f2937' : '#f3f4f6' }}>
                            {['AM', 'PM'].map(time => (
                                <button
                                    key={time}
                                    type="button"
                                    onClick={() => toggleTime(time)}
                                    className="flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all text-center"
                                    style={form.schedule.includes(time) ? { backgroundColor: theme.primary, color: '#ffffff' } : { color: theme.text }}
                                    onMouseEnter={(e) => {
                                        if (!form.schedule.includes(time)) e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : '#e5e7eb';
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!form.schedule.includes(time)) e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                >
                                    {time}
                                </button>
                            ))}
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center justify-center gap-1">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                    <button
                                        key={day}
                                        type="button"
                                        onClick={() => toggleDay(day)}
                                        className="px-2 py-1 text-xs font-medium rounded-md transition-all"
                                        style={form.days.includes(day) ? { backgroundColor: theme.primary, color: '#ffffff' } : { color: theme.text, backgroundColor: 'transparent' }}
                                        onMouseEnter={(e) => {
                                            if (!form.days.includes(day)) e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : '#e5e7eb';
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!form.days.includes(day)) e.currentTarget.style.backgroundColor = 'transparent';
                                        }}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[10px] mt-2 text-center flex items-center justify-center gap-1.5 opacity-60" style={{ color: theme.text }}>
                                <HandHelping size={12} /> Leave days unchecked for everyday.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Section: Delivery Method (New Order modal style) */}
                <div className="pt-2">
                    <div className="flex items-center gap-4 mb-4">
                        <BadgeQuestionMark size={32} style={{ color: theme.primary }} />
                        <div className="flex flex-col gap-0.5">
                            <h4 className="text-lg font-black tracking-wide" style={{ color: theme.text }}>Delivery Method</h4>
                            <div className="flex items-center gap-2 ml-1">
                                <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }} />
                                <span className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                                    Oral, Injection or Powder
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex rounded-lg p-1 gap-1" style={{ backgroundColor: theme.isDark ? '#1f2937' : '#f3f4f6' }}>
                        {deliveryOptions.map(({ value, label, Icon }) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setForm({ ...form, delivery: value })}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all"
                                style={form.delivery === value ? { backgroundColor: theme.primary, color: '#ffffff' } : { color: theme.text }}
                                onMouseEnter={(e) => {
                                    if (form.delivery !== value) e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : '#e5e7eb';
                                }}
                                onMouseLeave={(e) => {
                                    if (form.delivery !== value) e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                            >
                                <Icon size={16} />
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </BottomSheet>
        
        <ConfirmationModal
            open={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            onConfirm={async () => {
                await onSave({ ...supplement, _delete: true });
                setShowDeleteConfirm(false);
                // onSave will handle closing the modal
            }}
            title="Confirm Deletion"
            message=""
            confirmText="Delete"
            cancelText="Cancel"
            type="delete"
            theme={theme}
            hideIcon={true}
        />
    </>
    );
}

