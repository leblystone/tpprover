import React, { useState, useEffect, useCallback } from 'react'
import BottomSheet from '../common/BottomSheet'
import TextInput from '../common/inputs/TextInput'
import useAutoSave from '../../utils/useAutoSave'
import AutoSaveIndicator from '../common/AutoSaveIndicator'
import GlassmorphismDatePicker from '../common/GlassmorphismDatePicker'
import { getLocalDateString } from '../../utils/date'
import {
  ClipboardText,
  CaretLeft,
  Moon,
  MoonStars,
  WarningCircle,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  SmileySad,
  SmileyMeh,
  Smiley,
  CheckCircle,
  Warning,
  XCircle,
  Scales,
  Trash,
} from '@phosphor-icons/react'

const STEPS = [
  {
    key: 'sleep',
    kind: 'rate',
    ratingType: 'sleep',
    title: 'Sleep quality',
    hint: 'How rested do you feel from last night—rough, okay, or solid?',
  },
  {
    key: 'energy',
    kind: 'rate',
    ratingType: 'energy',
    title: 'Energy level',
    hint: 'Right now: drained, steady, or energized?',
  },
  {
    key: 'mood',
    kind: 'rate',
    ratingType: 'mood',
    title: 'Mood',
    hint: 'Overall today: down, neutral, or in a good place?',
  },
  {
    key: 'pain',
    kind: 'rate',
    ratingType: 'pain',
    title: 'Pain level',
    hint: 'Any aches or discomfort today—not really, noticeable, or hard to ignore?',
  },
  {
    key: 'physical',
    kind: 'physical',
    title: 'Weight (optional)',
    hint: 'Skip if you already logged on Home — or add weight / body fat for today.',
  },
]

function slotPalette(theme, slot) {
  const p = theme.primary
  const d = theme.isDark
  const textColors = d
    ? ['rgba(255,255,255,0.35)', 'rgba(255,255,255,0.6)', 'rgba(255,255,255,0.88)']
    : ['rgba(0,0,0,0.28)', 'rgba(0,0,0,0.50)', 'rgba(0,0,0,0.72)']
  return {
    text: textColors[slot - 1],
    bg: d ? 'rgba(255,255,255,0.07)' : '#ffffff',
    border: d ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.09)',
    fg: p,
    glow: `${p}55`,
  }
}

function ratingOptions(type) {
  switch (type) {
    case 'sleep':
      return [
        { icon: WarningCircle, label: 'Poor', value: 1 },
        { icon: Moon, label: 'Okay', value: 2 },
        { icon: MoonStars, label: 'Great', value: 3 },
      ]
    case 'energy':
      return [
        { icon: BatteryLow, label: 'Low', value: 1 },
        { icon: BatteryMedium, label: 'Med', value: 2 },
        { icon: BatteryFull, label: 'High', value: 3 },
      ]
    case 'mood':
      return [
        { icon: SmileySad, label: 'Low', value: 1 },
        { icon: SmileyMeh, label: 'OK', value: 2 },
        { icon: Smiley, label: 'Good', value: 3 },
      ]
    case 'pain':
      return [
        { icon: CheckCircle, label: 'None', value: 1 },
        { icon: Warning, label: 'Moderate', value: 2 },
        { icon: XCircle, label: 'High', value: 3 },
      ]
    default:
      return [
        { icon: BatteryLow, label: 'Low', value: 1 },
        { icon: BatteryMedium, label: 'Med', value: 2 },
        { icon: BatteryFull, label: 'High', value: 3 },
      ]
  }
}

export default function BodyMetricsModal({ open, onClose, onSave, onDelete, theme, metric, showBackButton = false, onBack }) {
  const [form, setForm] = useState({})
  const [step, setStep] = useState(0)
  const [showPhysical, setShowPhysical] = useState(false)

  const terracottaGradient = 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)'
  const terracottaHoverGradient = 'linear-gradient(135deg, #b5684a 0%, #a35a3f 100%)'

  const { isSaving, lastSaved, clearSavedData, markAsSubmitted } = useAutoSave(
    `metrics_form_${metric?.id || 'new'}`,
    form,
    setForm
  )

  useEffect(() => {
    if (open) {
      const base = metric
        ? { ...metric, date: metric.date || getLocalDateString() }
        : { date: getLocalDateString() }
      setForm(base)
      setStep(0)
      // Soft-open physical only when editing an entry that already has weight/bodyfat
      const hasPhysical =
        (base.weight != null && String(base.weight).trim() !== '') ||
        (base.bodyfat != null && String(base.bodyfat).trim() !== '')
      setShowPhysical(!!hasPhysical)
    }
  }, [open, metric])

  const saveAndClose = useCallback(async () => {
    markAsSubmitted()
    try {
      await onSave?.(form)
    } catch (error) {
      console.error('Error saving metric:', error)
    }
    onClose()
  }, [form, markAsSubmitted, onSave, onClose])

  const handleBack = () => {
    onClose()
    if (onBack) {
      setTimeout(() => onBack(), 100)
    }
  }

  const stepDef = STEPS[step]
  const atLastRate = step === STEPS.length - 2 // pain is last rate before physical
  const onPhysicalStep = stepDef?.kind === 'physical'

  const pickRating = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (!atLastRate) {
      setStep((s) => s + 1)
    } else {
      setStep(STEPS.length - 1) // go to optional weight
    }
  }

  const skipRating = () => {
    if (!atLastRate) {
      setStep((s) => s + 1)
    } else {
      setStep(STEPS.length - 1)
    }
  }

  const skipPhysicalAndSave = () => {
    setForm((prev) => {
      const next = { ...prev }
      // Don't force-clear existing weight on edit skip — only skip adding new
      return next
    })
    saveAndClose()
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          {showBackButton && (
            <button
              type="button"
              onClick={handleBack}
              className="p-1 rounded-md hover:bg-white/10 transition-colors"
              style={{ color: '#ffffff' }}
              title="Back to All Entries"
            >
              <CaretLeft size={20} weight="bold" />
            </button>
          )}
          <ClipboardText size={20} weight="duotone" className="opacity-90" />
          <span>{metric ? 'Edit Check-In' : 'Daily Check-In'}</span>
        </div>
      }
      titleExtra={
        <AutoSaveIndicator
          isSaving={isSaving}
          lastSaved={lastSaved}
          onClearForm={clearSavedData}
          theme={theme}
          iconOnly={true}
          style={{ color: '#ffffff' }}
        />
      }
      theme={theme}
      fitContent
      maxWidthClass="md:max-w-lg"
      footer={
        <div className="w-full flex items-center justify-between gap-2">
          {metric ? (
            <button
              type="button"
              onClick={() => onDelete?.(form)}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm hover:shadow-md active:scale-95 flex items-center gap-1.5"
              style={{
                background: terracottaGradient,
                color: '#ffffff',
                border: 'none',
                boxShadow: theme?.isDark ? '0 4px 10px rgba(0,0,0,0.35)' : '0 4px 10px rgba(0,0,0,0.15)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = terracottaHoverGradient }}
              onMouseLeave={(e) => { e.currentTarget.style.background = terracottaGradient }}
            >
              <Trash size={14} weight="bold" />
              Delete
            </button>
          ) : (
            <span />
          )}
          {onPhysicalStep ? (
            <button
              type="button"
              onClick={saveAndClose}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ml-auto"
              style={{ backgroundColor: theme?.primary, color: '#ffffff' }}
            >
              Save check-in
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep(STEPS.length - 1)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all ml-auto"
              style={{ backgroundColor: `${theme?.primary}22`, color: theme?.primary }}
            >
              Skip to end
            </button>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-3 pb-1">
        {/* Progress */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold tabular-nums" style={{ color: theme.textLight }}>
            {step + 1}/{STEPS.length}
          </span>
          <div className="flex gap-1 flex-1 justify-center">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className="h-1 rounded-full transition-all"
                style={{
                  width: i === step ? 18 : 7,
                  backgroundColor: i <= step ? theme.primary : theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                }}
              />
            ))}
          </div>
          <span className="w-8" />
        </div>

        {/* Date — compact */}
        <GlassmorphismDatePicker
          value={form.date || ''}
          onChange={(dateString) => setForm({ ...form, date: dateString })}
          theme={theme}
          placeholder="Date"
        />

        {/* Rating steps — same language + UI as dashboard Daily Check-In */}
        {stepDef?.kind === 'rate' && (
          <>
            <div className="flex items-start justify-between gap-2">
              {step > 0 && (
                <button
                  type="button"
                  aria-label="Back"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  className="p-1.5 rounded-lg touch-manipulation shrink-0 mt-0.5"
                  style={{ color: theme.text }}
                >
                  <CaretLeft size={18} weight="bold" />
                </button>
              )}
              <div className={`flex-1 min-w-0 flex flex-col gap-0.5 ${step > 0 ? '' : 'pl-1'}`}>
                <span className="text-sm font-semibold leading-snug" style={{ color: theme.text }}>
                  {stepDef.title}
                </span>
                <span
                  className="text-[10px] font-medium leading-snug"
                  style={{
                    color: theme.isDark ? 'rgba(255,255,255,0.78)' : 'rgba(0,0,0,0.62)',
                  }}
                >
                  {stepDef.hint}
                </span>
              </div>
            </div>

            <div
              className="flex rounded-xl p-1 gap-1 border"
              style={{
                backgroundColor: theme.isDark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.07)',
                borderColor: theme.border,
                boxShadow: theme.isDark
                  ? 'inset 0 1px 2px rgba(0,0,0,0.5)'
                  : 'inset 0 1px 2px rgba(0,0,0,0.06)',
              }}
            >
              {ratingOptions(stepDef.ratingType).map((option) => {
                const IconComponent = option.icon
                const sel = form[stepDef.key] === option.value
                const pal = slotPalette(theme, option.value)
                const shadowUnselected = theme.isDark
                  ? 'inset 0 1px 0 rgba(255,255,255,0.08), 0 1px 2px rgba(0,0,0,0.25)'
                  : 'inset 0 1px 0 rgba(255,255,255,0.85), 0 1px 2px rgba(0,0,0,0.05)'
                const shadowSelected = `0 3px 12px ${pal.glow}, inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -1px 0 rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.12)`
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => pickRating(stepDef.key, option.value)}
                    className="flex-1 flex flex-col items-center justify-center gap-0.5 px-1 py-2 rounded-lg text-[10px] font-semibold transition-[color,background-color,box-shadow,border-color] touch-manipulation min-h-[52px] border"
                    style={
                      sel
                        ? {
                            backgroundColor: pal.fg,
                            borderColor: 'transparent',
                            boxShadow: shadowSelected,
                            color: '#fff',
                          }
                        : {
                            color: pal.text,
                            backgroundColor: pal.bg,
                            borderColor: pal.border,
                            boxShadow: shadowUnselected,
                          }
                    }
                  >
                    <IconComponent size={18} weight="duotone" />
                    <span>{option.label}</span>
                  </button>
                )
              })}
            </div>

            <div className="flex justify-center w-full">
              <button
                type="button"
                onClick={skipRating}
                className="py-1.5 px-2 text-[11px] font-semibold bg-transparent border-0 cursor-pointer underline underline-offset-[3px] decoration-[1.5px] touch-manipulation rounded-md"
                style={{ color: theme.primary, textDecorationColor: theme.primary }}
              >
                Skip for now
              </button>
            </div>
          </>
        )}

        {/* Softened optional weight step */}
        {onPhysicalStep && (
          <>
            <div className="flex items-start gap-2">
              <button
                type="button"
                aria-label="Back"
                onClick={() => setStep(STEPS.length - 2)}
                className="p-1.5 rounded-lg touch-manipulation shrink-0 mt-0.5"
                style={{ color: theme.text }}
              >
                <CaretLeft size={18} weight="bold" />
              </button>
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <span className="text-sm font-semibold leading-snug flex items-center gap-2" style={{ color: theme.text }}>
                  {stepDef.title}
                  <Scales size={18} weight="duotone" style={{ color: theme.primary }} />
                </span>
                <span
                  className="text-[10px] font-medium leading-snug"
                  style={{
                    color: theme.isDark ? 'rgba(255,255,255,0.78)' : 'rgba(0,0,0,0.62)',
                  }}
                >
                  {stepDef.hint}
                </span>
              </div>
            </div>

            {!showPhysical ? (
              <button
                type="button"
                onClick={() => setShowPhysical(true)}
                className="w-full py-3 rounded-xl text-sm font-semibold touch-manipulation active:scale-[0.98] transition-all border"
                style={{
                  backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                  borderColor: theme.isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.09)',
                  color: theme.primary,
                  boxShadow: theme.isDark
                    ? 'inset 0 1px 0 rgba(255,255,255,0.06)'
                    : 'inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                Add weight for today?
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <TextInput
                  label="Weight (lbs)"
                  value={form.weight || ''}
                  onChange={(v) => setForm({ ...form, weight: v })}
                  placeholder="e.g. 175"
                  theme={theme}
                  outlined={true}
                  customTextColor={theme.isDark ? null : '#181A18'}
                  customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
                />
                <TextInput
                  label="Body Fat %"
                  value={form.bodyfat || ''}
                  onChange={(v) => setForm({ ...form, bodyfat: v })}
                  placeholder="e.g. 15"
                  theme={theme}
                  outlined={true}
                  customTextColor={theme.isDark ? null : '#181A18'}
                  customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
                />
              </div>
            )}

            <div className="flex justify-center w-full">
              <button
                type="button"
                onClick={skipPhysicalAndSave}
                className="py-1.5 px-2 text-[11px] font-semibold bg-transparent border-0 cursor-pointer underline underline-offset-[3px] decoration-[1.5px] touch-manipulation rounded-md"
                style={{ color: theme.primary, textDecorationColor: theme.primary }}
              >
                {showPhysical ? 'Save without changing weight' : 'Skip weight — save check-in'}
              </button>
            </div>
          </>
        )}
      </div>
    </BottomSheet>
  )
}
