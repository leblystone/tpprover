import React, { useState, useEffect, useMemo, useRef } from 'react';
import BottomSheet from '../common/BottomSheet';
import TextInput from '../common/inputs/TextInput';
import GlassmorphismDatePicker from '../common/GlassmorphismDatePicker';
import { Flask, MagnifyingGlass } from '@phosphor-icons/react';
import { CUSTOM_MARKER_KEY, LAB_MARKERS, searchLabMarkers } from '../../data/labMarkers';

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function LabEntryModal({ open, onClose, theme, entry, onSave }) {
  const [markerKey, setMarkerKey] = useState('');
  const [markerName, setMarkerName] = useState('');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('');
  const [date, setDate] = useState(todayKey());
  const [notes, setNotes] = useState('');
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [deleteConfirmFollowUp, setDeleteConfirmFollowUp] = useState(false);
  const markerFieldRef = useRef(null);

  useEffect(() => {
    if (entry) {
      setMarkerKey(entry.markerKey || CUSTOM_MARKER_KEY);
      setMarkerName(entry.markerName || '');
      setValue(entry.value != null ? String(entry.value) : '');
      setUnit(entry.unit || '');
      setDate(entry.date || todayKey());
      setNotes(entry.notes || '');
      setQuery(entry.markerName || '');
    } else {
      setMarkerKey('');
      setMarkerName('');
      setValue('');
      setUnit('');
      setDate(todayKey());
      setNotes('');
      setQuery('');
    }
    setShowSuggestions(false);
    setDeleteConfirmFollowUp(false);
  }, [entry, open]);

  // Close marker suggestions when tapping/clicking outside the field + dropdown
  useEffect(() => {
    if (!showSuggestions) return undefined;
    const onPointerDown = (e) => {
      if (markerFieldRef.current && !markerFieldRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [showSuggestions]);

  const suggestions = useMemo(
    () => (showSuggestions ? searchLabMarkers(query, 12) : []),
    [query, showSuggestions]
  );

  const pickMarker = (m) => {
    setMarkerKey(m.key);
    setMarkerName(m.name);
    setUnit(m.unit || '');
    setQuery(m.name);
    setShowSuggestions(false);
  };

  const handleSave = async () => {
    const name = (markerName || query || '').trim();
    if (!name || value === '' || value == null) return;
    const num = Number(value);
    if (!Number.isFinite(num)) return;
    await onSave({
      id: entry?.id,
      markerKey: markerKey || CUSTOM_MARKER_KEY,
      markerName: name,
      value: num,
      unit: (unit || '').trim(),
      date: date || todayKey(),
      notes: notes || '',
    });
  };

  const canSave = Boolean((markerName || query || '').trim()) && value !== '' && Number.isFinite(Number(value));

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={entry ? 'Edit Lab Value' : 'Log Lab Value'}
      theme={theme}
      maxHeight="90vh"
      fitContent
      footer={
        <div className="w-full flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1 justify-start min-h-[40px]">
            {entry?.id && (
              !deleteConfirmFollowUp ? (
                <button
                  type="button"
                  onClick={() => setDeleteConfirmFollowUp(true)}
                  className="text-sm font-medium py-2.5 px-1"
                  style={{ color: theme.error || '#c4714f' }}
                >
                  Delete
                </button>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    await onSave({ ...entry, _delete: true });
                    setDeleteConfirmFollowUp(false);
                  }}
                  className="text-sm font-semibold py-2.5 px-1"
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
            disabled={!canSave}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold shadow-md active:scale-95 disabled:opacity-50 btn-primary-inset"
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
      <div className="space-y-5">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <Flask size={24} weight="duotone" style={{ color: theme.primary }} />
            <h4 className="text-sm font-semibold" style={{ color: theme.text }}>
              Marker
            </h4>
          </div>
          <div className="relative" ref={markerFieldRef}>
            <TextInput
              label="Lab marker"
              value={query}
              onChange={(v) => {
                setQuery(v);
                setMarkerName(v);
                setMarkerKey(CUSTOM_MARKER_KEY);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="e.g. IGF-1, fasting glucose…"
              theme={theme}
              outlined
              customTextColor={theme.isDark ? null : '#181A18'}
              customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
            />
            {showSuggestions && suggestions.length > 0 && (
              <div
                className="absolute z-20 left-0 right-0 mt-1 rounded-xl overflow-hidden max-h-48 overflow-y-auto"
                style={{
                  backgroundColor: theme.isDark ? '#1a2028' : '#fff',
                  border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                }}
              >
                {suggestions.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => pickMarker(m)}
                    className="w-full text-left px-3 py-2.5 text-sm flex items-start gap-2"
                    style={{
                      color: theme.text,
                      borderBottom: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
                    }}
                  >
                    <MagnifyingGlass size={14} className="mt-0.5 shrink-0 opacity-40" />
                    <span>
                      <span className="font-medium">{m.name}</span>
                      <span className="block text-[11px] opacity-50">
                        {m.category}
                        {m.unit ? ` · ${m.unit}` : ''}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {!query && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {LAB_MARKERS.slice(0, 8).map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => pickMarker(m)}
                  className="text-[11px] px-2 py-1 rounded-lg"
                  style={{
                    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    color: theme.textLight,
                  }}
                >
                  {m.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <TextInput
            label="Value"
            value={value}
            onChange={setValue}
            placeholder="0"
            theme={theme}
            outlined
            customTextColor={theme.isDark ? null : '#181A18'}
            customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
          />
          <TextInput
            label="Unit"
            value={unit}
            onChange={setUnit}
            placeholder="mg/dL"
            theme={theme}
            outlined
            customTextColor={theme.isDark ? null : '#181A18'}
            customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
          />
        </div>

        <GlassmorphismDatePicker
          outlined
          label="Date"
          value={date}
          onChange={(dateString) => setDate(dateString)}
          theme={theme}
          placeholder="Select date"
          customTextColor={theme.isDark ? null : '#181A18'}
          customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
        />

        <TextInput
          label="Notes (optional)"
          value={notes}
          onChange={setNotes}
          placeholder="Fasting, lab name…"
          theme={theme}
          outlined
          customTextColor={theme.isDark ? null : '#181A18'}
          customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
        />
      </div>
    </BottomSheet>
  );
}
