import React, { useState, useEffect, useMemo } from 'react';
import BottomSheet from '../common/BottomSheet';
import TextInput from '../common/inputs/TextInput';
import { Pill, ClockCountdown, MagnifyingGlass, HandHeart, Syringe, TestTube, Question } from '@phosphor-icons/react';
import { formatMedicationLabel, searchCommonMedications } from '../../data/commonMedications';

const DAY_ORDER = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function MedicationEditorModal({ open, onClose, theme, medication, onSave, onMoveToSupplement }) {
  const [form, setForm] = useState({
    name: '',
    brandName: '',
    genericName: '',
    catalogId: null,
    dose: '',
    unit: '',
    schedule: ['AM'],
    days: [],
    delivery: 'oral',
  });
  const [nameQuery, setNameQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [deleteConfirmFollowUp, setDeleteConfirmFollowUp] = useState(false);

  useEffect(() => {
    if (medication) {
      setForm({
        name: medication.name || '',
        brandName: medication.brandName || '',
        genericName: medication.genericName || '',
        catalogId: medication.catalogId || null,
        dose: medication.dose || '',
        unit: medication.unit || '',
        schedule: medication.schedule?.length ? medication.schedule : ['AM'],
        days: Array.isArray(medication.days) ? medication.days : [],
        delivery: medication.delivery || 'oral',
      });
      setNameQuery(medication.name || formatMedicationLabel(medication) || '');
    } else {
      setForm({
        name: '',
        brandName: '',
        genericName: '',
        catalogId: null,
        dose: '',
        unit: '',
        schedule: ['AM'],
        days: [],
        delivery: 'oral',
      });
      setNameQuery('');
    }
    setShowSuggestions(false);
    setDeleteConfirmFollowUp(false);
  }, [medication, open]);

  const suggestions = useMemo(
    () => (showSuggestions ? searchCommonMedications(nameQuery, 10) : []),
    [nameQuery, showSuggestions]
  );

  const pickSuggestion = (med) => {
    const label = formatMedicationLabel(med);
    setNameQuery(label);
    setForm((prev) => ({
      ...prev,
      name: label,
      brandName: med.brandName,
      genericName: med.genericName,
      catalogId: med.id,
    }));
    setShowSuggestions(false);
  };

  const handleSave = async () => {
    const name = (nameQuery || form.name || '').trim();
    if (!name) return;
    await onSave({
      ...form,
      id: medication?.id,
      name,
      brandName: form.brandName || undefined,
      genericName: form.genericName || undefined,
    });
  };

  const toggleTime = (time) => {
    const schedule = form.schedule.includes(time)
      ? form.schedule.filter((t) => t !== time)
      : [...form.schedule, time];
    setForm({ ...form, schedule });
  };

  const deliveryOptions = [
    { value: 'oral', label: 'Oral', Icon: Pill },
    { value: 'injection', label: 'Injection', Icon: Syringe },
    { value: 'powder', label: 'Powder', Icon: TestTube },
  ];

  const toggleDay = (day) => {
    const days = form.days.includes(day)
      ? form.days.filter((d) => d !== day)
      : [...form.days, day];
    setForm({ ...form, days });
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={medication ? 'Edit Medication' : 'Add Medication'}
      theme={theme}
      maxHeight="90vh"
      fitContent
      footer={
        <div className="w-full flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1 justify-start min-h-[40px]">
            {medication?.id && (
              !deleteConfirmFollowUp ? (
                <button
                  type="button"
                  onClick={() => setDeleteConfirmFollowUp(true)}
                  className="text-sm font-medium py-2.5 px-1 -my-1 -mx-1 rounded-lg transition-opacity hover:opacity-85"
                  style={{ color: theme.error || '#c4714f' }}
                >
                  Delete
                </button>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    await onSave({ ...medication, _delete: true });
                    setDeleteConfirmFollowUp(false);
                  }}
                  className="text-sm font-semibold py-2.5 px-1 -my-1 -mx-1 rounded-lg"
                  style={{ color: theme.error || '#c4714f' }}
                >
                  Tap to Confirm
                </button>
              )
            )}
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={!String(nameQuery || '').trim()}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-md active:scale-95 btn-primary-inset disabled:opacity-50"
            style={{
              background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryDark || theme.primary} 100%)`,
              color: theme.textOnPrimary || '#ffffff',
              border: 'none',
            }}
          >
            Save
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-4 mb-4">
            <Pill size={28} weight="duotone" className="shrink-0" style={{ color: theme.primary }} />
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-base font-semibold tracking-wide" style={{ color: theme.text }}>
                  Medication
                </h4>
                {onMoveToSupplement && (
                  <button
                    type="button"
                    onClick={() => {
                      const name = (nameQuery || form.name || '').trim();
                      onMoveToSupplement({
                        ...form,
                        id: medication?.id || form.id,
                        name,
                      });
                    }}
                    className="shrink-0 text-[15px] font-medium transition-opacity hover:opacity-80 active:opacity-70"
                    style={{ color: theme.primary }}
                  >
                    Move to Supplements →
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 ml-1">
                <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }} />
                <span className="text-[10px] font-medium uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                  Brand or generic name
                </span>
              </div>
            </div>
          </div>

          <div className="relative">
            <TextInput
              label="Name"
              value={nameQuery}
              onChange={(v) => {
                setNameQuery(v);
                setForm((prev) => ({
                  ...prev,
                  name: v,
                  catalogId: null,
                  brandName: '',
                  genericName: '',
                }));
                setShowSuggestions(String(v || '').trim().length > 0);
              }}
              placeholder="e.g. Lipitor, metformin…"
              theme={theme}
              outlined
              customTextColor={theme.isDark ? null : '#181A18'}
              customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
            />
            {showSuggestions && String(nameQuery || '').trim() && suggestions.length > 0 && (
              <div
                className="absolute z-20 left-0 right-0 mt-1 rounded-xl overflow-hidden max-h-48 overflow-y-auto"
                style={{
                  backgroundColor: theme.isDark ? '#1a2028' : '#fff',
                  border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                }}
              >
                {suggestions.map((med) => (
                  <button
                    key={med.id}
                    type="button"
                    onClick={() => pickSuggestion(med)}
                    className="w-full text-left px-3 py-2.5 text-sm flex items-start gap-2 hover:opacity-90"
                    style={{
                      color: theme.text,
                      borderBottom: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
                    }}
                  >
                    <MagnifyingGlass size={14} className="mt-0.5 shrink-0 opacity-40" />
                    <span>
                      <span className="font-medium">{formatMedicationLabel(med)}</span>
                      {med.category && (
                        <span className="block text-[11px] opacity-50">{med.category}</span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <TextInput
              label="Dose"
              value={form.dose}
              onChange={(v) => setForm({ ...form, dose: v })}
              placeholder="10"
              theme={theme}
              outlined
              customTextColor={theme.isDark ? null : '#181A18'}
              customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
            />
            <TextInput
              label="Unit"
              value={form.unit}
              onChange={(v) => setForm({ ...form, unit: v })}
              placeholder="mg"
              theme={theme}
              outlined
              customTextColor={theme.isDark ? null : '#181A18'}
              customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
            />
          </div>

        </div>

        <div className="pt-2">
          <div className="flex items-center gap-4 mb-4">
            <ClockCountdown size={28} weight="duotone" style={{ color: theme.primary }} />
            <div className="flex flex-col gap-0.5">
              <h4 className="text-base font-semibold tracking-wide" style={{ color: theme.text }}>
                Schedule
              </h4>
              <div className="flex items-center gap-2 ml-1">
                <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }} />
                <span className="text-[10px] font-medium uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                  Time & days
                </span>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div
              className="flex rounded-lg p-1 gap-1"
              style={{
                backgroundColor: theme.isDark ? '#1a2028' : '#f0efe9',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08)',
              }}
            >
              {['AM', 'PM'].map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => toggleTime(time)}
                  className="flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all active:scale-95"
                  style={{
                    backgroundColor: form.schedule.includes(time) ? '#6B7F77' : 'transparent',
                    color: form.schedule.includes(time) ? '#fff' : theme.textLight,
                    boxShadow: form.schedule.includes(time)
                      ? 'inset 0 2px 4px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.08)'
                      : 'none',
                  }}
                >
                  {time}
                </button>
              ))}
            </div>
            <div>
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5 w-full">
                {DAY_ORDER.map((day) => {
                  const on = form.days.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className="min-w-0 w-full px-0.5 sm:px-1 py-1.5 text-[10px] sm:text-xs font-medium rounded-md transition-all active:scale-95 text-center"
                      style={{
                        backgroundColor: on ? '#445952' : (theme.isDark ? '#1f2937' : '#f5f4f0'),
                        color: on ? '#fff' : theme.text,
                        border: on ? '1px solid #3B4240' : `1px solid ${theme.border}`,
                        boxShadow: on
                          ? 'inset 0 2px 4px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.1)'
                          : 'inset 0 1px 3px rgba(0,0,0,0.06)',
                      }}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] mt-2 text-center flex items-center justify-center gap-1.5 opacity-60" style={{ color: theme.text }}>
                <HandHeart size={12} weight="duotone" /> Leave days unchecked for everyday.
              </p>
            </div>
          </div>
        </div>

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
          <div
            className="inline-flex w-full rounded-lg p-1 gap-1"
            style={{ backgroundColor: theme.isDark ? '#1a2028' : '#f0efe9', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08)' }}
          >
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
                    boxShadow: isSelected ? 'inset 0 2px 4px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  <Icon size={16} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
