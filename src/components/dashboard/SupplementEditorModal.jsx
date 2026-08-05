import React, { useState, useEffect, useMemo } from 'react';
import BottomSheet from '../common/BottomSheet';
import TextInput from '../common/inputs/TextInput';
import GlassmorphismDatePicker from '../common/GlassmorphismDatePicker';
import { Pill, TestTube, Syringe, Pill as PillIcon, ClockCountdown, Question, HandHeart, MagnifyingGlass } from '@phosphor-icons/react';
import { generateId } from '../../utils/string';
import OwnerSelect from '../buddy/OwnerSelect';
import { OWNER_SELF } from '../../utils/buddies';
import { searchCommonSupplements } from '../../data/commonSupplements';

export default function SupplementEditorModal({ open, onClose, theme, supplement, onSave, onMoveToMedication }) {
    const [form, setForm] = useState({ name: '', dose: '', schedule: ['AM'], delivery: 'oral', days: [], startDate: '', endDate: '', ownerId: OWNER_SELF });
    const [deleteConfirmFollowUp, setDeleteConfirmFollowUp] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    useEffect(() => {
        if (supplement) {
            setForm({
                schedule: supplement.schedule && supplement.schedule.length > 0 ? supplement.schedule : ['AM'],
                days: [],
                ...supplement,
                delivery: supplement.delivery || 'oral',
                startDate: supplement.startDate || '',
                endDate: supplement.endDate || '',
                ownerId: supplement.ownerId || OWNER_SELF,
            });
        } else {
            setForm({ name: '', dose: '', schedule: ['AM'], delivery: 'oral', days: [], startDate: '', endDate: '', ownerId: OWNER_SELF });
        }
        setShowSuggestions(false);
    }, [supplement, open]);

    useEffect(() => {
        setDeleteConfirmFollowUp(false);
    }, [supplement?.id, open]);

    const suggestions = useMemo(
        () => (showSuggestions ? searchCommonSupplements(form.name, 10) : []),
        [form.name, showSuggestions]
    );

    const pickSuggestion = (item) => {
        setForm((prev) => ({ ...prev, name: item.name }));
        setShowSuggestions(false);
    };

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
        { value: 'injection', label: 'Injection', Icon: Syringe },
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
                    <div className="flex items-center gap-2 flex-1 justify-start min-h-[40px]">
                        {supplement?.id && (
                            !deleteConfirmFollowUp ? (
                                <button
                                    type="button"
                                    onClick={() => setDeleteConfirmFollowUp(true)}
                                    className="text-sm font-medium py-2.5 px-1 -my-1 -mx-1 rounded-lg transition-opacity hover:opacity-85 active:opacity-75 touch-manipulation bg-transparent text-left"
                                    style={{ color: theme.error || '#c4714f', WebkitTapHighlightColor: 'transparent' }}
                                >
                                    Delete
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={async () => {
                                        await onSave({ ...supplement, _delete: true });
                                        setDeleteConfirmFollowUp(false);
                                    }}
                                    className="text-sm font-semibold py-2.5 px-1 -my-1 -mx-1 rounded-lg transition-opacity hover:opacity-85 active:opacity-75 touch-manipulation bg-transparent text-left"
                                    style={{ color: theme.error || '#c4714f', WebkitTapHighlightColor: 'transparent' }}
                                >
                                    Tap to Confirm
                                </button>
                            )
                        )}
                    </div>
                    <div className="flex items-center gap-2 flex-1 justify-end">
                        <button 
                            type="button"
                            onClick={handleSave} 
                            className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg active:scale-95 whitespace-nowrap min-w-fit btn-primary-inset"
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
                        <PillIcon size={28} className="shrink-0" style={{ color: theme.primary }} />
                        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-3">
                                <h4 className="text-base font-semibold tracking-wide" style={{ color: theme.text }}>Supplement Details</h4>
                                {onMoveToMedication && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const payload = {
                                                ...form,
                                                id: supplement?.id || form.id,
                                            };
                                            onMoveToMedication(payload);
                                        }}
                                        className="shrink-0 text-[15px] font-medium transition-opacity hover:opacity-80 active:opacity-70"
                                        style={{ color: theme.primary }}
                                    >
                                        Move to Medication →
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center gap-2 ml-1">
                                <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }} />
                                <span className="text-[10px] font-medium uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                                    Name, Dosage & Dates
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="relative">
                            <TextInput
                                label="Name"
                                value={form.name}
                                onChange={v => {
                                    setForm({ ...form, name: v });
                                    setShowSuggestions(String(v || '').trim().length > 0);
                                }}
                                placeholder="Vitamin C, Magnesium…"
                                theme={theme}
                                outlined={true}
                                customTextColor={theme.isDark ? null : "#181A18"}
                                customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
                            />
                            {showSuggestions && String(form.name || '').trim() && suggestions.length > 0 && (
                                <div
                                    className="absolute z-20 left-0 right-0 mt-1 rounded-xl overflow-hidden max-h-48 overflow-y-auto"
                                    style={{
                                        backgroundColor: theme.isDark ? '#1a2028' : '#fff',
                                        border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                                    }}
                                >
                                    {suggestions.map((item) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => pickSuggestion(item)}
                                            className="w-full text-left px-3 py-2.5 text-sm flex items-start gap-2 hover:opacity-90"
                                            style={{
                                                color: theme.text,
                                                borderBottom: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
                                            }}
                                        >
                                            <MagnifyingGlass size={14} className="mt-0.5 shrink-0 opacity-40" />
                                            <span>
                                                <span className="font-medium">{item.name}</span>
                                                {item.category && (
                                                    <span className="block text-[11px] opacity-50">{item.category}</span>
                                                )}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
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
                        <GlassmorphismDatePicker
                            outlined
                            label="Start Date"
                            value={form.startDate}
                            onChange={(dateString) => setForm({ ...form, startDate: dateString })}
                            theme={theme}
                            placeholder="Select start date"
                            customTextColor={theme.isDark ? null : '#181A18'}
                            customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
                        />
                        <GlassmorphismDatePicker
                            outlined
                            label="End Date"
                            value={form.endDate}
                            onChange={(dateString) => setForm({ ...form, endDate: dateString })}
                            theme={theme}
                            placeholder="Select end date"
                            customTextColor={theme.isDark ? null : '#181A18'}
                            customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
                        />
                    </div>
                </div>

                {/* Section: Schedule (New Order modal style) */}
                <div className="pt-2">
                    <div className="flex items-center gap-4 mb-4">
                        <ClockCountdown size={28} weight="duotone" style={{ color: theme.primary }} />
                        <div className="flex flex-col gap-0.5">
                            <h4 className="text-base font-semibold tracking-wide" style={{ color: theme.text }}>Schedule</h4>
                            <div className="flex items-center gap-2 ml-1">
                                <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }} />
                                <span className="text-[10px] font-medium uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                                    Time & Days
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex rounded-lg p-1 gap-1" style={{ backgroundColor: theme.isDark ? `${theme.primary}18` : `${theme.primary}12`, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08)' }}>
                            {['AM', 'PM'].map(time => (
                                <button
                                    key={time}
                                    type="button"
                                    onClick={() => toggleTime(time)}
                                    className="flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all active:scale-95"
                                    style={{
                                        backgroundColor: form.schedule.includes(time) ? '#6B7F77' : 'transparent',
                                        color: form.schedule.includes(time) ? '#fff' : theme.textLight,
                                        boxShadow: form.schedule.includes(time) ? 'inset 0 2px 4px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.08)' : 'none'
                                    }}
                                >
                                    {time}
                                </button>
                            ))}
                        </div>
                        <div>
                            <div className="grid grid-cols-7 gap-1 sm:gap-1.5 w-full">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                    <button
                                        key={day}
                                        type="button"
                                        onClick={() => toggleDay(day)}
                                        className="min-w-0 w-full px-0.5 sm:px-1 py-1.5 text-[10px] sm:text-xs font-medium rounded-md transition-all active:scale-95 text-center"
                                        style={{
                                            backgroundColor: form.days.includes(day) ? '#445952' : (theme.isDark ? '#1f2937' : '#f5f4f0'),
                                            color: form.days.includes(day) ? '#fff' : theme.text,
                                            border: form.days.includes(day) ? '1px solid #3B4240' : `1px solid ${theme.border}`,
                                            boxShadow: form.days.includes(day) ? 'inset 0 2px 4px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.1)' : 'inset 0 1px 3px rgba(0,0,0,0.06)'
                                        }}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[10px] mt-2 text-center flex items-center justify-center gap-1.5 opacity-60" style={{ color: theme.text }}>
                                <HandHeart size={12} weight="duotone" /> Leave days unchecked for everyday.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Section: Delivery Method (New Order modal style) */}
                <div className="pt-2">
                    <div className="flex items-center gap-4 mb-4">
                        <Question size={28} weight="duotone" style={{ color: theme.primary }} />
                        <div className="flex flex-col gap-0.5">
                            <h4 className="text-base font-semibold tracking-wide" style={{ color: theme.text }}>Delivery Method</h4>
                            <div className="flex items-center gap-2 ml-1">
                                <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }} />
                                <span className="text-[10px] font-medium uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                                    Oral, Injection or Powder
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="inline-flex w-full rounded-lg p-1 gap-1" style={{ backgroundColor: theme.isDark ? `${theme.primary}18` : `${theme.primary}12`, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08)' }}>
                        {deliveryOptions.map(({ value, label, Icon }) => {
                            const isSelected = form.delivery === value;
                            return (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setForm({ ...form, delivery: value })}
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-semibold transition-all active:scale-95"
                                    style={{
                                        backgroundColor: isSelected ? '#445952' : 'transparent',
                                        color: isSelected ? '#fff' : theme.textLight,
                                        boxShadow: isSelected ? 'inset 0 2px 4px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.08)' : 'none'
                                    }}
                                >
                                    <Icon size={16} />
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Who is this for? — only visible when a buddy is configured */}
                <OwnerSelect
                    value={form.ownerId}
                    onChange={(ownerId) => setForm({ ...form, ownerId })}
                    theme={theme}
                    label="Who is this for?"
                />
            </div>
        </BottomSheet>
    </>
    );
}

