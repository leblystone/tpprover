import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Target, Heart, Flask, Barbell, Star, Stethoscope, MagnifyingGlass, ChartLine, CaretDown } from '@phosphor-icons/react'
import BottomSheet from '../common/BottomSheet'
import TextInput from '../common/inputs/TextInput'
import useAutoSave from '../../utils/useAutoSave'
import GlassmorphismDatePicker from '../common/GlassmorphismDatePicker'
import { searchCommonGoalTemplates } from '../../data/commonGoalTemplates'
import { searchLabMarkers } from '../../data/labMarkers'
import { isSimpleMode, getLocalTrackingMode } from '../../utils/trackingMode'
import { trackMoreOptionsClick } from '../../utils/moreOptionsTracking'

export const GOAL_CATEGORIES = [
  { id: 'General', label: 'General', Icon: Target, color: null },
  { id: 'Health', label: 'Health', Icon: Heart, color: '#e07b7b' },
  { id: 'Research', label: 'Research', Icon: Flask, color: '#8ba4c0' },
  { id: 'Fitness', label: 'Fitness', Icon: Barbell, color: '#8fab8f' },
  { id: 'Lifestyle', label: 'Lifestyle', Icon: Star, color: '#b5a87a' },
  { id: 'Medical', label: 'Medical', Icon: Stethoscope, color: '#9ca3af' },
]

export const LINKED_TYPES = [
  { id: null, label: 'Manual (no auto-track)', category: 'General' },
  { id: 'weight', label: 'Weight', category: 'Health' },
  { id: 'bodyfat', label: 'Body fat', category: 'Fitness' },
  { id: 'streak', label: 'Daily research streak', category: 'Lifestyle' },
  { id: 'hydrationStreak', label: 'Hydration streak', category: 'Health' },
  { id: 'complianceGrade', label: 'Compliance grade', category: 'Research' },
  { id: 'allTimeDoses', label: 'Total doses logged', category: 'Research' },
  { id: 'completedProtocols', label: 'Protocols finished', category: 'Research' },
  { id: 'spendBudget', label: 'Spending budget', category: 'Lifestyle' },
  { id: 'lowStockCleared', label: 'Clear low-stock items', category: 'Lifestyle' },
  { id: 'labMarker', label: 'Lab marker', category: 'Medical' },
]

function linkedTypeKey(id) {
  return id == null ? 'manual' : String(id)
}

function parseLinkedTypeKey(key) {
  return key === 'manual' || key == null ? null : key
}

export function getGoalCategoryMeta(category, theme) {
  const found = GOAL_CATEGORIES.find(c => c.id === category) || GOAL_CATEGORIES[0]
  return {
    ...found,
    color: found.color || theme?.primary || '#929e82',
  }
}

function toISODate(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export function todayISO() {
  return toISODate(new Date())
}

export function addDaysISO(baseISO, days) {
  const base = baseISO ? new Date(`${baseISO}T12:00:00`) : new Date()
  if (Number.isNaN(base.getTime())) {
    const fallback = new Date()
    fallback.setDate(fallback.getDate() + days)
    return toISODate(fallback)
  }
  base.setDate(base.getDate() + days)
  return toISODate(base)
}

const TARGET_QUICK_OPTIONS = [
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
]

const emptyForm = (overrides = {}) => ({
  id: undefined,
  text: '',
  startDate: todayISO(),
  dueDate: '',
  notes: '',
  completed: false,
  category: 'General',
  linkedType: null,
  linkedTarget: '',
  linkedMarkerKey: '',
  linkedMarkerName: '',
  linkedMarkerUnit: '',
  linkedStartValue: null,
  ...overrides,
})

export function LinkedTargetFields({ form, setForm, theme }) {
  const type = form.linkedType
  if (!type || type === 'lowStockCleared') return null

  const labelStyle = {
    color: theme.textLight || theme.text,
    fontSize: '0.75rem',
    marginBottom: '4px',
  }

  if (type === 'complianceGrade') {
    return (
      <div>
        <label className="text-sm font-medium block" style={labelStyle}>Target grade</label>
        <div className="flex gap-2">
          {['A', 'A+'].map((g) => {
            const selected = String(form.linkedTarget || 'A').toUpperCase() === g
            return (
              <button
                key={g}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, linkedTarget: g }))}
                className="flex-1 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
                style={{
                  backgroundColor: selected ? theme.primary : (theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                  color: selected ? (theme.textOnPrimary || '#fff') : theme.text,
                  border: `1px solid ${selected ? theme.primary : theme.border}`,
                }}
              >
                Grade {g}
              </button>
            )
          })}
        </div>
        <p className="text-[10px] mt-1.5" style={{ color: theme.textLight }}>
          Based on your own 30-day dose compliance — no medical advice.
        </p>
      </div>
    )
  }

  if (type === 'labMarker') {
    const markerQuery = form.linkedMarkerName || ''
    const suggestions = searchLabMarkers(markerQuery, 8)
    return (
      <div className="space-y-3">
        <div className="relative">
          <TextInput
            label="Lab marker"
            value={form.linkedMarkerName || ''}
            onChange={(v) => setForm((prev) => ({
              ...prev,
              linkedMarkerName: v,
              linkedMarkerKey: '',
              linkedMarkerUnit: '',
            }))}
            placeholder="Search markers you track…"
            theme={theme}
            outlined
          />
          {markerQuery.trim() && !form.linkedMarkerKey && suggestions.length > 0 && (
            <div
              className="absolute z-20 left-0 right-0 mt-1 rounded-xl overflow-hidden max-h-40 overflow-y-auto"
              style={{
                backgroundColor: theme.isDark ? theme.cardBackground || '#1a2028' : theme.cardBackground || '#fff',
                border: `1px solid ${theme.border}`,
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              }}
            >
              {suggestions.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:opacity-80"
                  style={{ color: theme.text, borderBottom: `1px solid ${theme.border}` }}
                  onClick={() => setForm((prev) => ({
                    ...prev,
                    linkedMarkerKey: m.key,
                    linkedMarkerName: m.name,
                    linkedMarkerUnit: m.unit || '',
                  }))}
                >
                  <span className="font-semibold">{m.name}</span>
                  {m.unit ? (
                    <span className="text-xs ml-2" style={{ color: theme.textLight }}>{m.unit}</span>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>
        <TextInput
          label={`Your target value${form.linkedMarkerUnit ? ` (${form.linkedMarkerUnit})` : ''}`}
          value={form.linkedTarget || ''}
          onChange={(v) => setForm((prev) => ({ ...prev, linkedTarget: v }))}
          placeholder="Enter your own target number"
          theme={theme}
          outlined
        />
        <p className="text-[10px]" style={{ color: theme.textLight }}>
          You choose the number. We only compare against your logged entries — no reference ranges.
        </p>
      </div>
    )
  }

  const fieldMeta = {
    weight: { label: 'Target weight (lbs)', placeholder: 'Your target' },
    bodyfat: { label: 'Target body fat (%)', placeholder: 'Your target' },
    streak: { label: 'Target streak (days)', placeholder: 'e.g. days you want' },
    hydrationStreak: { label: 'Target hydration streak (days)', placeholder: 'e.g. days you want' },
    allTimeDoses: { label: 'Target dose count', placeholder: 'Your milestone' },
    completedProtocols: { label: 'Target protocols finished', placeholder: 'Your milestone' },
    spendBudget: { label: 'Budget ceiling ($)', placeholder: 'Your budget' },
  }[type]

  if (!fieldMeta) return null

  return (
    <div>
      <TextInput
        label={fieldMeta.label}
        value={form.linkedTarget || ''}
        onChange={(v) => setForm((prev) => ({ ...prev, linkedTarget: v }))}
        placeholder={fieldMeta.placeholder}
        theme={theme}
        outlined
      />
      <p className="text-[10px] mt-1.5" style={{ color: theme.textLight }}>
        Enter your own target — we never suggest a number for you.
      </p>
    </div>
  )
}

export default function GoalModal({ open, onClose, onSave, onDelete, theme, goal, templatePrefill = null }) {
  const simpleMode = isSimpleMode(getLocalTrackingMode())
  const [form, setForm] = useState(emptyForm())
  const [showNameSuggestions, setShowNameSuggestions] = useState(false)
  const [showAdvancedFields, setShowAdvancedFields] = useState(false)
  const suggestionsRef = useRef(null)

  const { markAsSubmitted } = useAutoSave(
    `goal_form_${goal?.id || templatePrefill?.id || 'new'}`,
    form,
    setForm
  )

  useEffect(() => {
    if (!open) return
    if (goal) {
      setForm(emptyForm({
        id: goal.id,
        text: goal.text || goal.title || '',
        startDate: goal.startDate || todayISO(),
        dueDate: goal.dueDate || goal.targetDate || '',
        notes: goal.notes || '',
        completed: !!goal.completed,
        category: goal.category || 'General',
        linkedType: goal.linkedType || null,
        linkedTarget: goal.linkedTarget != null ? String(goal.linkedTarget) : '',
        linkedMarkerKey: goal.linkedMarkerKey || '',
        linkedMarkerName: goal.linkedMarkerName || '',
        linkedMarkerUnit: goal.linkedMarkerUnit || '',
        linkedStartValue: goal.linkedStartValue ?? null,
      }))
      setShowNameSuggestions(false)
    } else if (templatePrefill) {
      setForm(emptyForm({
        text: templatePrefill.name || '',
        category: templatePrefill.category || 'General',
        linkedType: templatePrefill.linkedType ?? null,
        linkedTarget: templatePrefill.linkedType === 'complianceGrade' ? 'A' : '',
      }))
      setShowNameSuggestions(false)
    } else {
      setForm(emptyForm())
      setShowNameSuggestions(false)
    }
  }, [open, goal, templatePrefill])

  // When typing: show template matches. When focused with empty input: show all linked-type shortcuts.
  const nameSuggestions = useMemo(() => {
    if (!showNameSuggestions) return []
    const q = form.text.trim()
    if (q) return searchCommonGoalTemplates(q, 6)
    // Empty query — show all auto-track options as quick-pick shortcuts
    return LINKED_TYPES.filter((lt) => lt.id !== null).map((lt) => ({
      id: lt.id,
      name: lt.label,
      description: 'Auto-track from your logged data',
      category: lt.category,
      linkedType: lt.id,
      _isLinkedTypeShortcut: true,
    }))
  }, [form.text, showNameSuggestions])

  const applyTemplate = (t) => {
    const linkedMeta = LINKED_TYPES.find((lt) => lt.id === (t.linkedType ?? null))
    setForm((prev) => ({
      ...prev,
      // For linked-type shortcuts, keep the user's existing text if any, otherwise use the label
      text: t._isLinkedTypeShortcut ? (prev.text || t.name) : (t.id === 'manual' ? '' : t.name),
      category: t.category || linkedMeta?.category || prev.category,
      linkedType: t.linkedType ?? null,
      linkedTarget: t.linkedType === 'complianceGrade' ? 'A' : '',
      linkedMarkerKey: '',
      linkedMarkerName: '',
      linkedMarkerUnit: '',
    }))
    setShowNameSuggestions(false)
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={goal ? 'Edit Goal' : 'New Goal'}
      theme={theme}
      fitContent={true}
      footer={(
        <div className="flex items-center w-full">
          <button onClick={onClose} className="text-sm font-medium" style={{ color: theme?.textLight || theme?.text, background: 'none', border: 'none', padding: 0 }}>Cancel</button>
          <div className="ml-auto flex items-center gap-2">
            {goal && <button onClick={() => onDelete?.(form)} className="px-3 py-2 rounded-md text-sm font-medium" style={{ color: '#b91c1c', background: 'none', border: 'none' }}>Delete</button>}
            <button onClick={() => {
              markAsSubmitted()
              onSave?.(form)
            }} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ backgroundColor: theme?.primary, color: theme?.textOnPrimary || '#fff' }}>Save</button>
          </div>
        </div>
      )}
    >
      <div className="space-y-5">
        <div className="flex items-center gap-4 mb-4">
          <Target size={28} className="shrink-0" style={{ color: theme.isDark ? 'rgba(200, 215, 195, 0.7)' : theme.primary }} />
          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-base font-semibold tracking-wide" style={{ color: theme.text }}>Research Goal</h4>
            </div>
            <div className="flex items-center gap-2 ml-1">
              <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.2)' : theme.primary }}></div>
              <span className="text-[10px] font-medium uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                Category, Name & Dates
              </span>
            </div>
          </div>
        </div>

        <div>
          <div className="grid grid-cols-3 gap-2">
            {GOAL_CATEGORIES.map(({ id, label, Icon, color }) => {
              const selected = (form.category || 'General') === id
              const accent = color || theme.primary
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, category: id }))}
                  className="w-full inline-flex justify-center items-center gap-1.5 px-2 py-2 rounded-full text-xs font-semibold transition-all active:scale-95"
                  style={{
                    backgroundColor: selected ? accent : (theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                    color: selected ? '#fff' : theme.textLight,
                    border: `1px solid ${selected ? accent : theme.border}`,
                  }}
                >
                  <Icon size={14} weight={selected ? 'fill' : 'duotone'} />
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="relative">
          <TextInput
            label="Goal"
            value={form.text}
            onChange={(v) => {
              setForm((prev) => ({ ...prev, text: v }))
              setShowNameSuggestions(true)
            }}
            onFocus={() => setShowNameSuggestions(true)}
            onBlur={(e) => {
              // Delay closing so clicks inside the list register first
              if (!suggestionsRef.current?.contains(e.relatedTarget)) {
                setTimeout(() => setShowNameSuggestions(false), 150)
              }
            }}
            placeholder="Describe your goal or pick a suggestion"
            theme={theme}
            outlined
          />
          {showNameSuggestions && nameSuggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute z-20 left-0 right-0 mt-1 rounded-xl overflow-hidden max-h-52 overflow-y-auto"
              style={{
                backgroundColor: theme.isDark ? theme.cardBackground || '#1a2028' : theme.cardBackground || '#fff',
                border: `1px solid ${theme.border}`,
                boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
              }}
            >
              {!form.text.trim() && !simpleMode && (
                <div className="px-3 py-1.5 flex items-center gap-1.5" style={{ borderBottom: `1px solid ${theme.border}` }}>
                  <ChartLine size={11} style={{ color: theme.textLight }} />
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: theme.textLight }}>
                    Auto-track from data
                  </span>
                </div>
              )}
              {nameSuggestions
                .filter(t => simpleMode ? !t._isLinkedTypeShortcut : true)
                .map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="w-full text-left px-3 py-2.5 hover:opacity-90 transition-opacity"
                    style={{ borderBottom: `1px solid ${theme.border}` }}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyTemplate(t)}
                  >
                    <div className="flex items-center gap-2">
                      {t._isLinkedTypeShortcut
                        ? <ChartLine size={12} style={{ color: theme.primary }} />
                        : <MagnifyingGlass size={12} style={{ color: theme.textLight }} />
                      }
                      <span className="text-sm font-semibold" style={{ color: theme.text }}>{t.name}</span>
                    </div>
                    <p className="text-[10px] mt-0.5 pl-5" style={{ color: theme.textLight }}>{t.description}</p>
                  </button>
                ))}
            </div>
          )}
          {/* Chip showing currently selected auto-track type with option to clear */}
          {form.linkedType && !simpleMode && (
            <div className="flex items-center gap-1.5 mt-2">
              <ChartLine size={11} style={{ color: theme.primary }} />
              <span className="text-[11px] font-medium" style={{ color: theme.primary }}>
                Auto-tracking: {LINKED_TYPES.find(lt => lt.id === form.linkedType)?.label || form.linkedType}
              </span>
              <button
                type="button"
                onClick={() => setForm(prev => ({ ...prev, linkedType: null, linkedTarget: '', linkedMarkerKey: '', linkedMarkerName: '', linkedMarkerUnit: '' }))}
                className="text-[10px] px-1.5 py-0.5 rounded ml-1 hover:opacity-70"
                style={{ color: theme.textLight, border: `1px solid ${theme.border}` }}
              >
                ✕ clear
              </button>
            </div>
          )}
        </div>

        {!simpleMode && <LinkedTargetFields form={form} setForm={setForm} theme={theme} />}

        <div className="grid grid-cols-2 gap-3">
          {!simpleMode && (
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: theme.textLight || theme.text, fontSize: '0.75rem', marginBottom: '4px' }}>
                Start Date
              </label>
              <GlassmorphismDatePicker
                value={form.startDate || ''}
                onChange={(dateString) => setForm(prev => ({ ...prev, startDate: dateString }))}
                theme={theme}
                placeholder="Start Date"
              />
            </div>
          )}
          <div className={simpleMode ? 'col-span-2' : ''}>
            <label className="text-sm font-medium mb-2 block" style={{ color: theme.textLight || theme.text, fontSize: '0.75rem', marginBottom: '4px' }}>
              Target Date
            </label>
            <GlassmorphismDatePicker
              value={form.dueDate || ''}
              onChange={(dateString) => setForm(prev => ({ ...prev, dueDate: dateString }))}
              theme={theme}
              placeholder="Target Date"
            />
            <div className="flex gap-1.5 mt-2">
              {TARGET_QUICK_OPTIONS.map(({ label, days }) => {
                const presetDate = addDaysISO(form.startDate || todayISO(), days)
                const selected = form.dueDate === presetDate
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, dueDate: presetDate }))}
                    className="flex-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all active:scale-95"
                    style={{
                      backgroundColor: selected
                        ? `${theme.primary}22`
                        : (theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                      color: selected ? theme.primary : theme.textLight,
                      border: `1px solid ${selected ? `${theme.primary}40` : theme.border}`,
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {!simpleMode && (
          <TextInput
            label="Notes"
            value={form.notes || ''}
            onChange={v => setForm(prev => ({ ...prev, notes: v }))}
            placeholder="Details, milestones, or reasoning (optional)"
            theme={theme}
            multiline={true}
            outlined
          />
        )}

        {simpleMode && (
          <div>
            <button
              type="button"
              onClick={() => {
                if (!showAdvancedFields) trackMoreOptionsClick();
                setShowAdvancedFields(v => !v);
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all"
              style={{
                color: theme.primary,
                backgroundColor: `${theme.primary}10`,
                border: `1px solid ${theme.primary}25`,
              }}
            >
              <CaretDown size={12} weight="bold" style={{ transform: showAdvancedFields ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }} />
              {showAdvancedFields ? 'Hide advanced options' : 'More options'}
            </button>
            {showAdvancedFields && (
              <div className="space-y-4 mt-4">
                <LinkedTargetFields form={form} setForm={setForm} theme={theme} />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-2 block" style={{ color: theme.textLight || theme.text, fontSize: '0.75rem', marginBottom: '4px' }}>
                      Start Date
                    </label>
                    <GlassmorphismDatePicker
                      value={form.startDate || ''}
                      onChange={(dateString) => setForm(prev => ({ ...prev, startDate: dateString }))}
                      theme={theme}
                      placeholder="Start Date"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block" style={{ color: theme.textLight || theme.text, fontSize: '0.75rem', marginBottom: '4px' }}>
                      Notes
                    </label>
                    <TextInput
                      value={form.notes || ''}
                      onChange={v => setForm(prev => ({ ...prev, notes: v }))}
                      placeholder="Optional notes"
                      theme={theme}
                      outlined
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </BottomSheet>
  )
}
