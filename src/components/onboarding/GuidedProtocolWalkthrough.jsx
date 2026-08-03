import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { ChevronRight, ChevronLeft, ChevronDown, Check } from 'lucide-react';
import BottomSheet from '../common/BottomSheet';
import TextInput from '../common/inputs/TextInput';
import CombinedDosageInput from '../common/inputs/CombinedDosageInput';
import ColorSwatchDropdown from '../common/inputs/ColorSwatchDropdown';
import VisualSchedulePreview from '../protocols/VisualSchedulePreview';
import DosingScheduleEditor from '../protocols/DosingScheduleEditor';
import { getLocalDateString } from '../../utils/date';
import { generateId } from '../../utils/string';
import { prepareItemForSave } from '../../utils/userDataSave';
import { OWNER_SELF } from '../../utils/buddies';
import {
  searchCommonProtocolNames,
  ONBOARDING_PROTOCOL_NAME_PICKS,
  PURPOSE_SUGGESTIONS,
  suggestPurposeFromPeptideName,
} from '../../data/commonProtocolNames';
import { inferPurposeIconFromCompound, inferPurposeIconId } from '../../utils/protocolPurposeIcons';
import { penColors } from '../../utils/penColors';
import OnboardingLogoFooter from './OnboardingLogoFooter';
import { TRACKING_MODES } from '../../utils/trackingMode';

const DEFAULT_PEN_TYPES = [
  { id: 'savvio', name: 'Savvio' },
  { id: 'novo', name: 'Novo' },
  { id: 'v1', name: 'V1' },
  { id: 'v2', name: 'V2' },
  { id: 'v3', name: 'V3' },
  { id: 'bird-pen', name: 'Bird Pen' },
  { id: 'luxura', name: 'Luxura' },
  { id: 'gansulin', name: 'Gansulin' },
  { id: 'other', name: 'Other' },
];

function loadPenTypes() {
  try {
    const stored = localStorage.getItem('tpprover_pen_types');
    const types = stored ? JSON.parse(stored) : DEFAULT_PEN_TYPES;
    return Array.isArray(types) && types.length ? types : DEFAULT_PEN_TYPES;
  } catch {
    return DEFAULT_PEN_TYPES;
  }
}

const REVIEW_STEP = {
  id: 'review',
  title: 'Looking good!',
  subtitle: (
    <>
      This protocol gets you started in your Pep Planner.
      <br />
      Add more details in your active protocols!
    </>
  ),
};

/** Simple mode: name → dose → schedule → review */
export const GUIDED_PROTOCOL_STEPS = [
  { id: 'peptide', title: 'What are you tracking?' },
  { id: 'dose', title: "What's the dose?" },
  { id: 'schedule', title: 'When do you take it?' },
  REVIEW_STEP,
];

/** Advanced mode: all ProtocolEditorModal fields as conversational steps */
export const ADVANCED_PROTOCOL_STEPS = [
  { id: 'peptide', title: 'What are you tracking?' },
  { id: 'purpose', title: 'What is the goal?' },
  { id: 'dose', title: "What's the dose?" },
  { id: 'delivery', title: 'How do you take it?' },
  { id: 'halfLife', title: 'Half-life?' },
  { id: 'schedule', title: 'When do you take it?' },
  { id: 'duration', title: 'How long?' },
  { id: 'notes', title: 'Any notes?' },
  REVIEW_STEP,
];

const DELIVERY_OPTIONS = [
  { id: 'pipette', label: 'Syringe' },
  { id: 'pen', label: 'Pen' },
  { id: 'nasal', label: 'Nasal' },
  { id: 'topical', label: 'Topical' },
];

const INJECTION_TYPES = ['SubQ', 'IM', 'IV'];

/** Optional advanced steps — Skip advances without blocking */
const OPTIONAL_SKIP_STEP_IDS = new Set(['purpose', 'delivery', 'halfLife', 'duration', 'notes']);

/** Days to skip so the schedule lands on `phaseIndex` on start date. */
function titrationOffsetForPhase(titration, phaseIndex) {
  const list = Array.isArray(titration) ? titration : [];
  const target = Math.min(Math.max(0, phaseIndex || 0), Math.max(0, list.length - 1));
  let days = 0;
  for (let i = 0; i < target; i++) {
    const phase = list[i] || {};
    const count = Number(phase.durationCount) || 0;
    const unit = String(phase.durationUnit || 'days').toLowerCase();
    if (unit.includes('week')) days += count * 7;
    else if (unit.includes('month')) days += count * 30;
    else if (unit !== 'ongoing') days += count;
  }
  return days;
}

/** Best-effort reverse of titrationDaysOffset → phase index. */
function phaseIndexFromTitrationOffset(titration, offset) {
  const list = Array.isArray(titration) ? titration : [];
  if (!list.length) return 0;
  let remaining = Math.max(0, Number(offset) || 0);
  if (remaining <= 0) return 0;
  let cumulative = 0;
  for (let i = 0; i < list.length; i++) {
    const phase = list[i] || {};
    const count = Number(phase.durationCount) || 0;
    const unit = String(phase.durationUnit || 'days').toLowerCase();
    let phaseDays = count;
    if (unit.includes('week')) phaseDays = count * 7;
    else if (unit.includes('month')) phaseDays = count * 30;
    else if (unit === 'ongoing') phaseDays = 0;
    if (phaseDays <= 0) {
      if (i === list.length - 1) return i;
      phaseDays = 1;
    }
    if (remaining < cumulative + phaseDays) return i;
    cumulative += phaseDays;
  }
  return list.length - 1;
}

export function formFromGuidedProtocol(protocol) {
  const pep = protocol?.peptides?.[0] || {};
  const isTitration = pep.dosageScheduleType === 'titration'
    || (!pep.dosageScheduleType && Array.isArray(pep.titration) && pep.titration.length > 0);
  const titration = Array.isArray(pep.titration) && pep.titration.length > 0
    ? pep.titration
    : [{ dose: '', doseUnit: 'mcg', durationCount: '', durationUnit: 'days' }];
  return {
    name: protocol?.protocolName || pep.name || '',
    purpose: protocol?.purpose || '',
    dosage: pep.dosage?.amount != null ? String(pep.dosage.amount) : '',
    dosageUnit: pep.dosage?.unit || 'mg',
    unitValue: pep.unitValue || '',
    dosageScheduleType: isTitration ? 'titration' : 'fixed',
    titration,
    currentTitrationPhaseIndex: isTitration && Number(pep.titrationDaysOffset) > 0
      ? phaseIndexFromTitrationOffset(titration, pep.titrationDaysOffset)
      : (isTitration ? null : 0),
    deliveryMethod: pep.deliveryMethod || '',
    injectionType: pep.injectionType || 'SubQ',
    penType: pep.penType || '',
    penColor: pep.penColor || '',
    halfLifeValue: pep.halfLife?.value != null ? String(pep.halfLife.value) : '',
    halfLifeUnit: pep.halfLife?.unit || 'hours',
    frequency: pep.frequency || { type: 'daily', time: ['AM'] },
    durationValue: protocol?.duration?.count != null ? String(protocol.duration.count) : '',
    durationUnit: protocol?.duration?.unit || 'weeks',
    noEndDate: protocol?.duration?.noEnd !== false && !protocol?.duration?.count,
    washoutEnabled: Boolean(protocol?.washout?.enabled),
    washoutValue: protocol?.washout?.duration != null ? String(protocol.washout.duration) : '',
    washoutUnit: protocol?.washout?.unit || 'days',
    notes: protocol?.notes || '',
    ownerId: protocol?.ownerId || OWNER_SELF,
  };
}

function answerForStep(stepId, form) {
  if (stepId === 'peptide') return form.name?.trim() || '';
  if (stepId === 'purpose') return form.purpose?.trim() || '';
  if (stepId === 'dose') {
    if (form.dosageScheduleType === 'titration') {
      const phases = form.titration || [];
      const filled = phases.filter((p) => String(p.dose || '').trim());
      if (!filled.length) return '';
      if (form.currentTitrationPhaseIndex == null) {
        return `Titration (${filled.length} phase${filled.length > 1 ? 's' : ''})`;
      }
      const idx = Math.min(
        Math.max(0, form.currentTitrationPhaseIndex),
        Math.max(0, phases.length - 1)
      );
      const current = phases[idx];
      const doseLabel = current?.dose
        ? `${current.dose} ${current.doseUnit || ''}`.trim()
        : `Phase ${idx + 1}`;
      return `Titration · ${doseLabel} (${filled.length} phase${filled.length > 1 ? 's' : ''})`;
    }
    const amt = form.dosage?.trim();
    return amt ? `${amt} ${form.dosageUnit || ''}`.trim() : '';
  }
  if (stepId === 'delivery') {
    const method = form.deliveryMethod;
    if (!method) return '';
    if (method === 'pipette') return `Syringe · ${form.injectionType || 'SubQ'}`;
    if (method === 'pen') {
      const types = loadPenTypes();
      const typeName = form.penType
        ? (types.find((t) => t.id === form.penType)?.name || form.penType)
        : '';
      const parts = ['Pen'];
      if (typeName) parts.push(typeName);
      if (form.penColor) parts.push(form.penColor);
      return parts.join(' · ');
    }
    if (method === 'nasal') return 'Nasal';
    if (method === 'topical') return 'Topical';
    return method;
  }
  if (stepId === 'halfLife') {
    const v = form.halfLifeValue?.trim();
    if (!v) return '';
    return `${v} ${form.halfLifeUnit === 'days' ? 'days' : 'hours'}`;
  }
  if (stepId === 'schedule') {
    const freq = form.frequency || { type: 'daily', time: ['AM'] };
    const times = (freq.time || []).join(' / ');
    let desc = 'Daily';
    if (freq.type === 'weekly') desc = `Weekly (${(freq.days || []).join(', ')})`;
    else if (freq.type === 'cycle') desc = `Cycle (${freq.onDays || 0} on / ${freq.offDays || 0} off)`;
    else if (freq.type === 'custom') desc = `Every ${freq.customDays || 0} days`;
    else if (freq.type === 'as_needed') return 'As needed';
    return times ? `${desc} · ${times}` : desc;
  }
  if (stepId === 'duration') {
    if (form.noEndDate) return 'No end date';
    const v = form.durationValue?.trim();
    if (!v) return '';
    let out = `${v} ${form.durationUnit || 'weeks'}`;
    if (form.washoutEnabled && form.washoutValue?.trim()) {
      out += ` · washout ${form.washoutValue} ${form.washoutUnit || 'days'}`;
    }
    return out;
  }
  if (stepId === 'notes') {
    const n = form.notes?.trim();
    if (!n) return '';
    return n.length > 48 ? `${n.slice(0, 48)}…` : n;
  }
  return '';
}

const getDefaultForm = () => ({
  name: '',
  purpose: '',
  dosage: '',
  dosageUnit: 'mg',
  unitValue: '',
  dosageScheduleType: 'fixed',
  titration: [{ dose: '', doseUnit: 'mcg', durationCount: '', durationUnit: 'days' }],
  currentTitrationPhaseIndex: null,
  deliveryMethod: '',
  injectionType: 'SubQ',
  penType: '',
  penColor: '',
  halfLifeValue: '',
  halfLifeUnit: 'hours',
  frequency: { type: 'daily', time: ['AM'] },
  durationValue: '',
  durationUnit: 'weeks',
  noEndDate: true,
  washoutEnabled: false,
  washoutValue: '',
  washoutUnit: 'days',
  notes: '',
  ownerId: OWNER_SELF,
});

function hasValidDose(form) {
  if (form.dosageScheduleType === 'titration') {
    return (form.titration || []).some((p) => String(p.dose || '').trim());
  }
  return Boolean(form.dosage?.trim());
}

/**
 * Stepped protocol creation for Simple / Advanced onboarding + Simple day-to-day sheet.
 * presentation: 'fullscreen' | 'sheet'
 * mode: 'simple' | 'advanced'
 */
export default function GuidedProtocolWalkthrough({
  open,
  onClose,
  onSave,
  onSkip,
  onBack,
  theme,
  presentation = 'sheet',
  allowSkip = false,
  fillParent = false,
  mode = TRACKING_MODES.SIMPLE,
  /** Restore draft when remounting (e.g. back from setup checklist) */
  initialForm = null,
  initialStepIndex = null,
  /** Reuse this id on save so going back doesn't create a duplicate protocol */
  existingProtocolId = null,
}) {
  const isAdvanced = mode === TRACKING_MODES.ADVANCED;
  const STEPS = isAdvanced ? ADVANCED_PROTOCOL_STEPS : GUIDED_PROTOCOL_STEPS;

  const [stepIndex, setStepIndex] = useState(() => (
    typeof initialStepIndex === 'number' ? initialStepIndex : 0
  ));
  const [form, setForm] = useState(() => (
    initialForm ? { ...getDefaultForm(), ...initialForm } : getDefaultForm()
  ));
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false); // sync guard against rapid double-taps
  /** True while purpose still matches auto-suggest from peptide name (so renaming can refresh it) */
  const purposeAutoRef = useRef(false);
  const [customNameMode, setCustomNameMode] = useState(false);
  const [customPurposeMode, setCustomPurposeMode] = useState(false);
  const [nameQuery, setNameQuery] = useState('');
  const [showCustomSuggestions, setShowCustomSuggestions] = useState(false);
  /** After titration phases are filled, Next enters this pick-mode instead of leaving the dose step */
  const [titrationPickPhase, setTitrationPickPhase] = useState(false);
  const [penTypeMenuOpen, setPenTypeMenuOpen] = useState(false);
  const penTypes = useMemo(() => loadPenTypes(), []);

  const applyPeptideName = (name) => {
    const nextName = String(name || '').trim();
    const suggested = isAdvanced ? suggestPurposeFromPeptideName(nextName) : '';
    setForm((p) => {
      const shouldAutoPurpose = Boolean(
        suggested && (!p.purpose?.trim() || purposeAutoRef.current)
      );
      if (shouldAutoPurpose) purposeAutoRef.current = true;
      return {
        ...p,
        name: nextName,
        ...(shouldAutoPurpose ? { purpose: suggested } : {}),
      };
    });
  };

  useEffect(() => {
    if (!open) return;
    if (initialForm) {
      setForm({ ...getDefaultForm(), ...initialForm });
      setStepIndex(
        typeof initialStepIndex === 'number'
          ? initialStepIndex
          : STEPS.length - 1
      );
    } else {
      setStepIndex(0);
      setForm(getDefaultForm());
    }
    setCustomNameMode(false);
    setCustomPurposeMode(false);
    setNameQuery('');
    setShowCustomSuggestions(false);
    setTitrationPickPhase(false);
    setPenTypeMenuOpen(false);
    purposeAutoRef.current = Boolean(
      initialForm?.purpose && suggestPurposeFromPeptideName(initialForm?.name || '') === initialForm.purpose
    );
    // Only re-hydrate when the sheet/screen opens — not on every parent render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  // Prefill purpose when landing on that step if still empty (advanced only)
  useEffect(() => {
    if (!open || !isAdvanced) return;
    const current = STEPS[stepIndex];
    if (current?.id !== 'purpose') return;
    if (form.purpose?.trim()) return;
    const suggested = suggestPurposeFromPeptideName(form.name);
    if (!suggested) return;
    purposeAutoRef.current = true;
    setForm((p) => (p.purpose?.trim() ? p : { ...p, purpose: suggested }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isAdvanced, stepIndex, form.name]);

  // Leaving the dose step clears titration pick-mode
  useEffect(() => {
    if (STEPS[stepIndex]?.id !== 'dose' && titrationPickPhase) {
      setTitrationPickPhase(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  const customNameSuggestions = useMemo(
    () => (customNameMode && form.name.trim() ? searchCommonProtocolNames(form.name, 8) : []),
    [customNameMode, form.name]
  );

  if (!open) return null;

  const step = STEPS[stepIndex] || STEPS[0];
  const isLast = stepIndex === STEPS.length - 1;
  const isFirst = stepIndex === 0;
  const showSkipInNav = (isFirst && allowSkip) || OPTIONAL_SKIP_STEP_IDS.has(step.id);

  const canAdvance = () => {
    if (step.id === 'peptide') return Boolean(form.name?.trim());
    if (step.id === 'dose') {
      if (!hasValidDose(form)) return false;
      // In titration pick-mode, require a checked current phase
      if (
        isAdvanced
        && form.dosageScheduleType === 'titration'
        && titrationPickPhase
        && form.currentTitrationPhaseIndex == null
      ) {
        return false;
      }
      return true;
    }
    if (step.id === 'schedule') {
      const f = form.frequency;
      if (!f) return false;
      if (f.type === 'weekly' && (!f.days || f.days.length === 0)) return false;
      if (f.type === 'cycle' && (!f.onDays || !f.offDays)) return false;
      if (f.type === 'custom' && !f.customDays) return false;
      if (f.type !== 'as_needed' && (!f.time || f.time.length === 0)) return false;
      return true;
    }
    // purpose, delivery, halfLife, duration, notes are optional
    return true;
  };

  const handleNext = () => {
    if (!canAdvance()) {
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: {
          message: step.id === 'peptide'
            ? 'Enter a name to continue'
            : (step.id === 'dose' && titrationPickPhase
              ? 'Select which dosage you are currently researching'
              : 'Please complete the required fields'),
          type: 'error',
        },
      }));
      return;
    }

    // Titration: first Next stays on dose and enters "pick current phase" mode
    if (
      step.id === 'dose'
      && isAdvanced
      && form.dosageScheduleType === 'titration'
      && !titrationPickPhase
    ) {
      setForm((p) => ({ ...p, currentTitrationPhaseIndex: null }));
      setTitrationPickPhase(true);
      return;
    }

    if (isLast) {
      handleSave();
    } else {
      setTitrationPickPhase(false);
      setStepIndex((i) => i + 1);
    }
  };

  const handleBack = () => {
    // From pick-mode, back returns to editing phases (same step)
    if (step.id === 'dose' && titrationPickPhase) {
      setTitrationPickPhase(false);
      return;
    }
    if (!isFirst) {
      setTitrationPickPhase(false);
      setStepIndex((i) => i - 1);
      return;
    }
    if (onBack) onBack();
    else if (allowSkip) onSkip?.();
    else onClose?.();
  };

  const handleFrequencyChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      frequency: { ...(prev.frequency || { type: 'daily', time: ['AM'] }), [field]: value }
    }));
  };

  const toggleTimeOfDay = (time) => {
    setForm((prev) => {
      const current = prev.frequency?.time || [];
      const next = current.includes(time) ? current.filter((t) => t !== time) : [...current, time];
      return { ...prev, frequency: { ...prev.frequency, time: next.length > 0 ? next : ['AM'] } };
    });
  };

  const handleSave = async () => {
    // Sync re-entry guard — prevents duplicate saves from rapid double-taps
    if (savingRef.current) return;
    if (!form.name?.trim() || !hasValidDose(form)) return;
    savingRef.current = true;
    setIsSaving(true);
    const isUpdate = Boolean(existingProtocolId);
    try {
      const isTitration = form.dosageScheduleType === 'titration';
      const deliveryMethod = form.deliveryMethod || 'pipette';
      const peptide = {
        id: generateId(),
        name: form.name.trim(),
        dosage: {
          amount: isTitration ? (form.titration?.[0]?.dose || '') : form.dosage,
          unit: isTitration ? (form.titration?.[0]?.doseUnit || 'mcg') : form.dosageUnit,
        },
        dosageScheduleType: isTitration ? 'titration' : 'fixed',
        frequency: form.frequency,
        deliveryMethod,
        unitValue: form.unitValue || '',
      };
      if (isTitration) {
        peptide.titration = (form.titration || []).filter((p) => String(p.dose || '').trim() || String(p.durationCount || '').trim());
        const phaseIdx = form.currentTitrationPhaseIndex == null
          ? 0
          : Math.min(
              Math.max(0, form.currentTitrationPhaseIndex),
              Math.max(0, peptide.titration.length - 1)
            );
        const currentPhase = peptide.titration[phaseIdx];
        if (currentPhase?.dose) {
          peptide.dosage = {
            amount: currentPhase.dose,
            unit: currentPhase.doseUnit || 'mcg',
          };
        }
        peptide.titrationDaysOffset = titrationOffsetForPhase(peptide.titration, phaseIdx);
      }
      if (deliveryMethod === 'pipette') {
        peptide.injectionType = form.injectionType || 'SubQ';
      }
      if (deliveryMethod === 'pen') {
        if (form.penType) peptide.penType = form.penType;
        if (form.penColor) peptide.penColor = form.penColor;
      }
      if (form.halfLifeValue?.trim()) {
        peptide.halfLife = {
          value: form.halfLifeValue.trim(),
          unit: form.halfLifeUnit || 'hours',
        };
        peptide.halfLifeSource = 'user';
      }

      const purposeText = form.purpose?.trim() || '';
      const purposeIcon =
        inferPurposeIconId(purposeText)
        || inferPurposeIconFromCompound(form.name.trim())
        || 'research';

      const protocol = prepareItemForSave({
        // Preserve the existing id so we update, not duplicate
        ...(existingProtocolId ? { id: existingProtocolId } : {}),
        protocolName: form.name.trim(),
        purpose: purposeText,
        purposeIcon,
        protocolType: 'separate',
        blendMode: 'separate',
        peptides: [peptide],
        duration: form.noEndDate
          ? { count: '', unit: form.durationUnit || 'weeks', noEnd: true }
          : {
              count: form.durationValue || '',
              unit: form.durationUnit || 'weeks',
              noEnd: false,
            },
        washout: {
          enabled: Boolean(form.washoutEnabled),
          duration: form.washoutValue || '',
          unit: form.washoutUnit || 'days',
        },
        notes: form.notes?.trim() || '',
        quickStart: true,
        guidedWalkthrough: true,
        startDate: getLocalDateString(),
        active: true,
        linkedItems: {},
        ownerId: form.ownerId || OWNER_SELF,
      }, { isNew: !isUpdate });

      await onSave?.(protocol);
      // Fullscreen onboarding navigates away in onSave; sheet mode closes itself
      if (presentation === 'sheet') {
        setForm(getDefaultForm());
        onClose?.();
      }
    } catch (error) {
      console.error('Guided walkthrough save failed:', error);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: {
          message: isUpdate
            ? 'Failed to update protocol. Please try again.'
            : 'Failed to create protocol. Please try again.',
          type: 'error',
        },
      }));
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const primary = theme?.primary || '#7F9E95';
  const text = theme?.text || '#1f2937';
  const muted = theme?.isDark ? 'rgba(255,255,255,0.7)' : '#6b7280';
  const cardBg = theme?.isDark ? 'rgba(255,255,255,0.06)' : '#ffffff';
  const border = theme?.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  const chipStyle = (active) => ({
    backgroundColor: active ? primary : cardBg,
    borderColor: active ? primary : border,
    color: active ? (theme?.textOnPrimary || '#fff') : text,
    boxShadow: active ? `0 0 0 2px ${primary}33` : undefined,
  });

  const advanceSoon = () => setTimeout(() => setStepIndex((idx) => Math.min(idx + 1, STEPS.length - 1)), 220);

  const completedSteps = STEPS.slice(0, stepIndex);

  const body = (
    <div className="flex flex-col h-full min-h-0">
      {/* Progress */}
      <div className="flex gap-1.5 mb-4 px-1 flex-shrink-0">
        {STEPS.map((s, i) => (
          <div
            key={s.id}
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{ backgroundColor: i <= stepIndex ? primary : (theme?.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)') }}
          />
        ))}
      </div>

      <LayoutGroup id="guided-walkthrough-questions">
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Prior answers settle at the top — hidden on review (they morph into the protocol card) */}
          <div className="flex-shrink-0 space-y-2 mb-2">
            <AnimatePresence initial={false}>
              {step.id !== 'review' && completedSteps.map((s) => {
                const answer = answerForStep(s.id, form);
                return (
                  <motion.button
                    key={s.id}
                    type="button"
                    layoutId={`walk-chip-${s.id}`}
                    onClick={() => setStepIndex(STEPS.findIndex((x) => x.id === s.id))}
                    className="w-full text-left rounded-xl px-3 py-2.5 border"
                    style={{
                      backgroundColor: cardBg,
                      borderColor: border,
                    }}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 12 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <motion.p
                      layoutId={`walk-title-${s.id}`}
                      className="text-[11px] font-semibold uppercase tracking-wide opacity-55"
                      style={{ color: muted }}
                      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                    >
                      {s.title}
                    </motion.p>
                    {answer && (
                      <motion.p
                        layoutId={`walk-answer-${s.id}`}
                        className="text-sm font-semibold mt-0.5 truncate"
                        style={{ color: text }}
                        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                      >
                        {answer}
                      </motion.p>
                    )}
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Active question stays vertically centered in remaining space */}
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col justify-center">
            <div className="w-full">
              {/* Title lives outside exit animation so layoutId can morph to the top stack */}
              <motion.h1
                key={`title-active-${step.id}`}
                layoutId={`walk-title-${step.id}`}
                className={`text-2xl sm:text-3xl font-black leading-tight ${
                  step.id === 'review' ? 'text-center' : 'text-left'
                } ${step.subtitle ? 'mb-2' : 'mb-5'}`}
                style={{ color: text }}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  layout: { type: 'spring', stiffness: 320, damping: 32 },
                  opacity: { duration: 0.35, delay: 0.05 },
                  y: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
                }}
              >
                {step.title}
              </motion.h1>
              {step.subtitle && (
                <motion.p
                  key={`subtitle-active-${step.id}`}
                  className={`text-sm leading-relaxed mb-5 ${
                    step.id === 'review' ? 'text-center' : 'text-left'
                  }`}
                  style={{ color: muted }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.12 }}
                >
                  {step.subtitle}
                </motion.p>
              )}

              <AnimatePresence mode="sync">
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12, scale: 0.98 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                  {step.id === 'peptide' && (
                    <div className="space-y-4">
                      {/* Chip grid — tapping auto-advances */}
                      {!customNameMode && (
                        <div className="flex flex-wrap gap-2">
                          {ONBOARDING_PROTOCOL_NAME_PICKS.map((pick, i) => {
                            const active = form.name === pick.name;
                            return (
                              <motion.button
                                key={pick.id}
                                type="button"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.04, duration: 0.3, ease: 'easeOut' }}
                                onClick={() => {
                                  applyPeptideName(pick.name);
                                  // brief highlight then advance
                                  setTimeout(() => setStepIndex((idx) => idx + 1), 220);
                                }}
                                className="px-4 py-2.5 rounded-full text-sm font-medium border transition-colors active:scale-95"
                                style={{
                                  backgroundColor: active ? primary : cardBg,
                                  borderColor: active ? primary : border,
                                  color: active ? (theme?.textOnPrimary || '#fff') : text,
                                  boxShadow: active ? `0 0 0 2px ${primary}33` : undefined,
                                }}
                                whileTap={{ scale: 0.95 }}
                              >
                                {pick.name}
                              </motion.button>
                            );
                          })}
                        </div>
                      )}

                      {/* Custom name input with autocomplete */}
                      {customNameMode && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="relative space-y-2"
                        >
                          <TextInput
                            label="Peptide / Protocol name"
                            value={form.name}
                            onChange={(v) => {
                              applyPeptideName(v);
                              setShowCustomSuggestions(v.trim().length > 0);
                            }}
                            onFocus={() => {
                              if (form.name.trim()) setShowCustomSuggestions(true);
                            }}
                            onBlur={() => setTimeout(() => setShowCustomSuggestions(false), 150)}
                            placeholder="e.g. GHK-Cu, My Stack…"
                            theme={theme}
                            outlined
                            autoFocus
                          />
                          {showCustomSuggestions && customNameSuggestions.length > 0 && (
                            <div
                              className="absolute z-20 left-0 right-0 mt-1 rounded-xl overflow-hidden max-h-48 overflow-y-auto"
                              style={{
                                backgroundColor: theme?.isDark ? '#1a2028' : '#fff',
                                border: `1px solid ${theme?.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                              }}
                            >
                              {customNameSuggestions.map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    applyPeptideName(item.name);
                                    setShowCustomSuggestions(false);
                                  }}
                                  className="w-full text-left px-3.5 py-2.5 text-sm hover:opacity-90"
                                  style={{
                                    color: text,
                                    borderBottom: `1px solid ${theme?.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
                                  }}
                                >
                                  <span className="font-medium">{item.name}</span>
                                  {item.category && <span className="block text-[11px] opacity-50">{item.category}</span>}
                                </button>
                              ))}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setCustomNameMode(false);
                              setForm((p) => ({ ...p, name: '' }));
                            }}
                            className="text-xs opacity-50 hover:opacity-80 block"
                            style={{ color: muted }}
                          >
                            ← Back to suggestions
                          </button>
                        </motion.div>
                      )}

                      {/* Something else — centered, larger */}
                      {!customNameMode && (
                        <div className="flex justify-center pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setCustomNameMode(true);
                              setForm((p) => ({ ...p, name: '' }));
                            }}
                            className="text-base font-semibold opacity-70 hover:opacity-100 px-4 py-2 rounded-xl"
                            style={{ color: primary }}
                          >
                            + Something else…
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {step.id === 'purpose' && (
                    <div className="space-y-4">
                      {!customPurposeMode && (
                        <div className="flex flex-wrap gap-2">
                          {PURPOSE_SUGGESTIONS.map((pick, i) => {
                            const active = form.purpose === pick;
                            return (
                              <motion.button
                                key={pick}
                                type="button"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.03, duration: 0.28 }}
                                onClick={() => {
                                  purposeAutoRef.current = false;
                                  setForm((p) => ({ ...p, purpose: pick }));
                                  advanceSoon();
                                }}
                                className="px-4 py-2.5 rounded-full text-sm font-medium border transition-colors active:scale-95"
                                style={chipStyle(active)}
                                whileTap={{ scale: 0.95 }}
                              >
                                {pick}
                              </motion.button>
                            );
                          })}
                        </div>
                      )}

                      {customPurposeMode && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-2"
                        >
                          <TextInput
                            label="Goal"
                            value={form.purpose}
                            onChange={(v) => {
                              purposeAutoRef.current = false;
                              setForm((p) => ({ ...p, purpose: v }));
                            }}
                            placeholder="e.g. Skin healing, fat loss…"
                            theme={theme}
                            outlined
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setCustomPurposeMode(false);
                              const suggested = suggestPurposeFromPeptideName(form.name);
                              purposeAutoRef.current = Boolean(suggested);
                              setForm((p) => ({ ...p, purpose: suggested || '' }));
                            }}
                            className="text-xs opacity-50 hover:opacity-80 block"
                            style={{ color: muted }}
                          >
                            ← Back to suggestions
                          </button>
                        </motion.div>
                      )}

                      {!customPurposeMode && (
                        <div className="flex justify-center pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setCustomPurposeMode(true);
                              purposeAutoRef.current = false;
                              setForm((p) => ({ ...p, purpose: '' }));
                            }}
                            className="text-base font-semibold opacity-70 hover:opacity-100 px-4 py-2 rounded-xl"
                            style={{ color: primary }}
                          >
                            + Something else…
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {step.id === 'dose' && (
                    <div className="space-y-4">
                      {isAdvanced && !titrationPickPhase && (
                        <div
                          className="inline-flex w-full rounded-xl p-1 gap-1"
                          style={{ backgroundColor: cardBg, border: `1px solid ${border}` }}
                        >
                          {[
                            { id: 'fixed', label: 'Fixed Dose' },
                            { id: 'titration', label: 'Titration' },
                          ].map((opt) => {
                            const active = (form.dosageScheduleType || 'fixed') === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => {
                                  setTitrationPickPhase(false);
                                  setForm((p) => {
                                    const next = {
                                      ...p,
                                      dosageScheduleType: opt.id,
                                      currentTitrationPhaseIndex: null,
                                    };
                                    if (opt.id === 'titration' && (!p.titration || p.titration.length === 0)) {
                                      next.titration = [{ dose: '', doseUnit: 'mcg', durationCount: '', durationUnit: 'days' }];
                                    }
                                    return next;
                                  });
                                }}
                                className="flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95"
                                style={{
                                  backgroundColor: active ? primary : 'transparent',
                                  color: active ? (theme?.textOnPrimary || '#fff') : text,
                                  boxShadow: active ? `0 2px 8px ${primary}40` : 'none',
                                }}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {(!isAdvanced || form.dosageScheduleType !== 'titration') && (
                        <CombinedDosageInput
                          value={{ amount: form.dosage, unit: form.dosageUnit }}
                          onChange={(newDosage) => {
                            setForm((p) => ({
                              ...p,
                              dosage: newDosage.amount,
                              dosageUnit: newDosage.unit,
                            }));
                          }}
                          theme={theme}
                          placeholder="0.5"
                          outlined
                        />
                      )}

                      {isAdvanced && form.dosageScheduleType === 'titration' && (
                        <DosingScheduleEditor
                          titration={form.titration || []}
                          onChange={(next) => setForm((p) => ({
                            ...p,
                            titration: next,
                            currentTitrationPhaseIndex:
                              p.currentTitrationPhaseIndex == null
                                ? null
                                : Math.min(
                                    p.currentTitrationPhaseIndex,
                                    Math.max(0, next.length - 1)
                                  ),
                          }))}
                          theme={theme}
                          enableCurrentPhaseSelect={titrationPickPhase}
                          readOnly={titrationPickPhase}
                          currentPhaseIndex={form.currentTitrationPhaseIndex}
                          onSelectCurrentPhase={(index) => setForm((p) => ({
                            ...p,
                            currentTitrationPhaseIndex: index,
                          }))}
                        />
                      )}
                    </div>
                  )}

                  {step.id === 'delivery' && (
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {DELIVERY_OPTIONS.map((opt, i) => {
                          const active = form.deliveryMethod === opt.id;
                          return (
                            <motion.button
                              key={opt.id}
                              type="button"
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.03, duration: 0.28 }}
                              onClick={() => {
                                setPenTypeMenuOpen(false);
                                setForm((p) => ({
                                  ...p,
                                  deliveryMethod: opt.id,
                                  injectionType: opt.id === 'pipette' ? (p.injectionType || 'SubQ') : p.injectionType,
                                  // Clear pen details when switching away from pen
                                  ...(opt.id !== 'pen' ? { penType: '', penColor: '' } : {}),
                                }));
                                // Syringe / Pen need sub-options; nasal & topical can advance
                                if (opt.id !== 'pipette' && opt.id !== 'pen') advanceSoon();
                              }}
                              className="px-4 py-2.5 rounded-full text-sm font-medium border transition-colors active:scale-95"
                              style={chipStyle(active)}
                              whileTap={{ scale: 0.95 }}
                            >
                              {opt.label}
                            </motion.button>
                          );
                        })}
                      </div>

                      {form.deliveryMethod === 'pipette' && (
                        <div>
                          <p className="text-sm font-medium mb-2" style={{ color: text }}>Injection type</p>
                          <div className="flex gap-2">
                            {INJECTION_TYPES.map((type) => {
                              const active = (form.injectionType || 'SubQ') === type;
                              return (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() => {
                                    setForm((p) => ({ ...p, injectionType: type, deliveryMethod: 'pipette' }));
                                    advanceSoon();
                                  }}
                                  className="flex-1 py-3 rounded-xl font-semibold border transition-all active:scale-95"
                                  style={chipStyle(active)}
                                >
                                  {type}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {form.deliveryMethod === 'pen' && (
                        <div className="grid grid-cols-2 gap-3">
                          {/* Same pen-type dropdown as StartProtocolWizard / PeptideSubForm */}
                          <div className="relative">
                            <label
                              className="block text-[10px] font-black uppercase tracking-[0.15em] opacity-40 mb-2"
                              style={{ color: text }}
                            >
                              Pen Type
                            </label>
                            <button
                              type="button"
                              onClick={() => setPenTypeMenuOpen((v) => !v)}
                              onMouseDown={(e) => e.preventDefault()}
                              onTouchStart={(e) => e.preventDefault()}
                              className="w-full px-3 py-2 text-sm border rounded-lg flex items-center justify-between transition-all relative z-20 touch-manipulation"
                              style={{
                                borderColor: penTypeMenuOpen ? primary : border,
                                backgroundColor: cardBg,
                                color: form.penType ? text : muted,
                              }}
                            >
                              <span className="truncate">
                                {form.penType
                                  ? (penTypes.find((t) => t.id === form.penType)?.name || 'Other')
                                  : 'Select pen type'}
                              </span>
                              <ChevronDown
                                size={16}
                                className={`flex-shrink-0 transition-transform duration-200 ${penTypeMenuOpen ? 'rotate-180' : ''}`}
                                style={{ color: muted }}
                              />
                            </button>
                            {penTypeMenuOpen && (
                              <div
                                className="absolute z-[10003] left-0 right-0 bottom-full mb-1 rounded-lg shadow-lg border overflow-y-auto max-h-[min(50vh,17.5rem)]"
                                style={{
                                  backgroundColor: theme?.isDark ? 'rgba(30,30,40,0.95)' : '#ffffff',
                                  borderColor: border,
                                  boxShadow: '0 -10px 25px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.04)',
                                }}
                              >
                                {[{ id: '', name: 'Select pen type' }, ...penTypes].map((option, optIdx) => (
                                  <React.Fragment key={option.id || 'placeholder'}>
                                    {optIdx > 0 && (
                                      <div className="h-px mx-2" style={{ backgroundColor: border }} />
                                    )}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setForm((p) => ({
                                          ...p,
                                          deliveryMethod: 'pen',
                                          penType: option.id,
                                        }));
                                        setPenTypeMenuOpen(false);
                                      }}
                                      className="w-full text-left px-3 py-2 text-sm transition-all"
                                      style={{
                                        color: form.penType === option.id ? primary : text,
                                        backgroundColor: 'transparent',
                                      }}
                                    >
                                      {option.name}
                                    </button>
                                  </React.Fragment>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Same chrome color dropdown as the protocol wizard */}
                          <div>
                            <label
                              className="block text-[10px] font-black uppercase tracking-[0.15em] opacity-40 mb-2"
                              style={{ color: text }}
                            >
                              Pen Color
                            </label>
                            <ColorSwatchDropdown
                              value={
                                penColors.find((p) => p.name === form.penColor)?.hex
                                || '#9ca3af'
                              }
                              onChange={(hex) => {
                                const selected = penColors.find((p) => p.hex === hex);
                                setForm((p) => ({
                                  ...p,
                                  deliveryMethod: 'pen',
                                  penColor: selected?.name || '',
                                }));
                              }}
                              colors={penColors}
                              theme={{
                                ...theme,
                                text,
                                border,
                                cardBackground: cardBg,
                                primary,
                                textLight: muted,
                              }}
                              placeholder="Select color"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {step.id === 'halfLife' && (
                    <div
                      className="flex items-stretch rounded-xl overflow-hidden"
                      style={{
                        border: `1px solid ${border}`,
                        boxShadow: theme?.isDark
                          ? 'inset 0 2px 4px rgba(0,0,0,0.3)'
                          : 'inset 0 1px 2px rgba(0,0,0,0.08)',
                        backgroundColor: cardBg,
                      }}
                    >
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        value={form.halfLifeValue}
                        onChange={(e) => setForm((p) => ({ ...p, halfLifeValue: e.target.value }))}
                        placeholder="e.g. 7"
                        className="flex-1 min-w-0 py-3 pl-3.5 pr-2 outline-none text-sm bg-transparent"
                        style={{ color: text }}
                        aria-label="Half-life value"
                      />
                      <div
                        className="flex flex-shrink-0"
                        style={{
                          borderLeft: `1px solid ${border}`,
                        }}
                      >
                        {['hours', 'days'].map((u) => {
                          const active = (form.halfLifeUnit || 'hours') === u;
                          return (
                            <button
                              key={u}
                              type="button"
                              onClick={() => setForm((p) => ({ ...p, halfLifeUnit: u }))}
                              className="px-3.5 py-3 text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
                              style={{
                                backgroundColor: active ? primary : 'transparent',
                                color: active ? (theme?.textOnPrimary || '#fff') : muted,
                                border: 'none',
                              }}
                            >
                              {u === 'hours' ? 'Hrs' : 'Days'}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {step.id === 'schedule' && (
                    <div className="space-y-5">
                      <div>
                        <p className="text-sm font-medium mb-2" style={{ color: text }}>Frequency</p>
                        <div className="inline-flex w-full flex-wrap rounded-xl p-1 gap-1" style={{ backgroundColor: cardBg, border: `1px solid ${border}` }}>
                          {['daily', 'weekly', 'custom', 'cycle', 'as_needed'].map(type => {
                            const active = (form.frequency?.type || 'daily') === type;
                            return (
                              <button 
                                key={type} 
                                type="button" 
                                onClick={() => handleFrequencyChange('type', type)}
                                className="flex-1 min-w-[4.5rem] py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95"
                                style={{
                                  backgroundColor: active ? primary : 'transparent',
                                  color: active ? (theme?.textOnPrimary || '#fff') : text,
                                  boxShadow: active ? `0 2px 8px ${primary}40` : 'none'
                                }}
                              >
                                {type === 'custom' ? 'X Days' : type === 'weekly' ? 'Days' : type === 'as_needed' ? 'As Needed' : type}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {form.frequency?.type === 'weekly' && (
                        <div>
                          <p className="text-sm font-medium mb-2" style={{ color: text }}>Days of week</p>
                          <div className="flex flex-wrap gap-1.5">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                              const isSelected = (form.frequency?.days || []).includes(day);
                              return (
                                <button key={day} type="button" 
                                  onClick={() => {
                                    const current = form.frequency?.days || [];
                                    const next = current.includes(day) ? current.filter(d => d !== day) : [...current, day];
                                    handleFrequencyChange('days', next);
                                  }}
                                  className="flex-1 min-w-[35px] py-2 text-xs font-bold rounded-lg transition-all active:scale-95"
                                  style={{
                                    backgroundColor: isSelected ? primary : cardBg,
                                    border: `1px solid ${isSelected ? primary : border}`,
                                    color: isSelected ? (theme?.textOnPrimary || '#fff') : text,
                                  }}
                                >
                                  {day[0]}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {form.frequency?.type === 'cycle' && (
                        <div className="grid grid-cols-2 gap-3">
                          <TextInput label="Days On" value={form.frequency?.onDays || ''} onChange={v => handleFrequencyChange('onDays', v)} theme={theme} placeholder="5" type="number" outlined />
                          <TextInput label="Days Off" value={form.frequency?.offDays || ''} onChange={v => handleFrequencyChange('offDays', v)} theme={theme} placeholder="2" type="number" outlined />
                        </div>
                      )}

                      {form.frequency?.type === 'custom' && (
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium" style={{ color: text }}>Every</span>
                          <div className="flex-1">
                            <TextInput 
                              label="" 
                              value={form.frequency?.customDays || ''} 
                              onChange={v => handleFrequencyChange('customDays', v)} 
                              theme={theme} 
                              placeholder="3" 
                              type="number" 
                              outlined
                            />
                          </div>
                          <span className="text-sm font-medium" style={{ color: text }}>Days</span>
                        </div>
                      )}

                      {form.frequency?.type !== 'as_needed' && (
                        <div>
                          <p className="text-sm font-medium mb-2" style={{ color: text }}>Time of day</p>
                          <div className="flex gap-2">
                            {['AM', 'PM'].map((t) => {
                              const active = (form.frequency?.time || []).includes(t);
                              return (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() => toggleTimeOfDay(t)}
                                  className="flex-1 py-3 rounded-xl font-semibold transition-all active:scale-95"
                                  style={{
                                    backgroundColor: active ? primary : cardBg,
                                    color: active ? (theme?.textOnPrimary || '#fff') : text,
                                    border: `1px solid ${active ? primary : border}`,
                                  }}
                                >
                                  {t}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {step.id === 'duration' && (
                    <div className="space-y-4">
                      <button
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, noEndDate: !p.noEndDate }))}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium"
                        style={{
                          backgroundColor: cardBg,
                          borderColor: form.noEndDate ? primary : border,
                          color: text,
                        }}
                      >
                        <span>No end date</span>
                        <span
                          className="w-5 h-5 rounded-md border flex items-center justify-center"
                          style={{
                            backgroundColor: form.noEndDate ? primary : 'transparent',
                            borderColor: form.noEndDate ? primary : border,
                            color: '#fff',
                          }}
                        >
                          {form.noEndDate ? <Check className="w-3.5 h-3.5" /> : null}
                        </span>
                      </button>

                      {!form.noEndDate && (
                        <div
                          className="flex items-stretch rounded-xl overflow-hidden"
                          style={{
                            border: `1px solid ${border}`,
                            boxShadow: theme?.isDark
                              ? 'inset 0 2px 4px rgba(0,0,0,0.3)'
                              : 'inset 0 1px 2px rgba(0,0,0,0.08)',
                            backgroundColor: cardBg,
                          }}
                        >
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            value={form.durationValue}
                            onChange={(e) => setForm((p) => ({ ...p, durationValue: e.target.value }))}
                            placeholder="8"
                            className="flex-1 min-w-0 py-3 pl-3.5 pr-2 outline-none text-sm bg-transparent"
                            style={{ color: text }}
                            aria-label="Duration"
                          />
                          <div
                            className="flex flex-shrink-0"
                            style={{ borderLeft: `1px solid ${border}` }}
                          >
                            {[
                              { id: 'days', label: 'Days' },
                              { id: 'weeks', label: 'Wks' },
                              { id: 'months', label: 'Mos' },
                            ].map((u) => {
                              const active = (form.durationUnit || 'weeks') === u.id;
                              return (
                                <button
                                  key={u.id}
                                  type="button"
                                  onClick={() => setForm((p) => ({ ...p, durationUnit: u.id }))}
                                  className="px-2.5 py-3 text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95"
                                  style={{
                                    backgroundColor: active ? primary : 'transparent',
                                    color: active ? (theme?.textOnPrimary || '#fff') : muted,
                                    border: 'none',
                                  }}
                                >
                                  {u.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, washoutEnabled: !p.washoutEnabled }))}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium"
                        style={{
                          backgroundColor: cardBg,
                          borderColor: form.washoutEnabled ? primary : border,
                          color: text,
                        }}
                      >
                        <span>Enable washout</span>
                        <span
                          className="w-5 h-5 rounded-md border flex items-center justify-center"
                          style={{
                            backgroundColor: form.washoutEnabled ? primary : 'transparent',
                            borderColor: form.washoutEnabled ? primary : border,
                            color: '#fff',
                          }}
                        >
                          {form.washoutEnabled ? <Check className="w-3.5 h-3.5" /> : null}
                        </span>
                      </button>

                      {form.washoutEnabled && (
                        <div
                          className="flex items-stretch rounded-xl overflow-hidden"
                          style={{
                            border: `1px solid ${border}`,
                            boxShadow: theme?.isDark
                              ? 'inset 0 2px 4px rgba(0,0,0,0.3)'
                              : 'inset 0 1px 2px rgba(0,0,0,0.08)',
                            backgroundColor: cardBg,
                          }}
                        >
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            value={form.washoutValue}
                            onChange={(e) => setForm((p) => ({ ...p, washoutValue: e.target.value }))}
                            placeholder="7"
                            className="flex-1 min-w-0 py-3 pl-3.5 pr-2 outline-none text-sm bg-transparent"
                            style={{ color: text }}
                            aria-label="Washout period"
                          />
                          <div
                            className="flex flex-shrink-0"
                            style={{ borderLeft: `1px solid ${border}` }}
                          >
                            {[
                              { id: 'days', label: 'Days' },
                              { id: 'weeks', label: 'Wks' },
                            ].map((u) => {
                              const active = (form.washoutUnit || 'days') === u.id;
                              return (
                                <button
                                  key={u.id}
                                  type="button"
                                  onClick={() => setForm((p) => ({ ...p, washoutUnit: u.id }))}
                                  className="px-3 py-3 text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95"
                                  style={{
                                    backgroundColor: active ? primary : 'transparent',
                                    color: active ? (theme?.textOnPrimary || '#fff') : muted,
                                    border: 'none',
                                  }}
                                >
                                  {u.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {step.id === 'notes' && (
                    <div className="space-y-4">
                      <textarea
                        value={form.notes}
                        onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                        placeholder="Anything you want to remember…"
                        rows={4}
                        className="w-full rounded-xl px-3.5 py-3 text-sm outline-none resize-none border"
                        style={{
                          backgroundColor: cardBg,
                          borderColor: border,
                          color: text,
                        }}
                      />
                    </div>
                  )}

                  {step.id === 'review' && (
                    <motion.div
                      layoutId="walk-protocol-card"
                      className="rounded-2xl p-4 border space-y-3 overflow-hidden"
                      style={{ backgroundColor: cardBg, borderColor: border }}
                      initial={{ opacity: 0, scale: 0.94, y: 28 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{
                        type: 'spring',
                        stiffness: 280,
                        damping: 28,
                        opacity: { duration: 0.35 },
                      }}
                    >
                      <div>
                        <motion.p
                          layoutId="walk-title-peptide"
                          className="text-xs uppercase tracking-wider opacity-60"
                          style={{ color: text }}
                          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                        >
                          Protocol
                        </motion.p>
                        <motion.p
                          layoutId="walk-answer-peptide"
                          className="text-lg font-semibold"
                          style={{ color: text }}
                          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                        >
                          {form.name}
                        </motion.p>
                      </div>
                      {answerForStep('purpose', form) && (
                        <div>
                          <motion.p
                            layoutId="walk-title-purpose"
                            className="text-xs uppercase tracking-wider opacity-60"
                            style={{ color: text }}
                            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                          >
                            Purpose
                          </motion.p>
                          <motion.p
                            layoutId="walk-answer-purpose"
                            className="text-base font-medium"
                            style={{ color: text }}
                            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                          >
                            {answerForStep('purpose', form)}
                          </motion.p>
                        </div>
                      )}
                      <div>
                        <motion.p
                          layoutId="walk-title-dose"
                          className="text-xs uppercase tracking-wider opacity-60"
                          style={{ color: text }}
                          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                        >
                          Dose
                        </motion.p>
                        <motion.p
                          layoutId="walk-answer-dose"
                          className="text-base font-medium"
                          style={{ color: text }}
                          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                        >
                          {answerForStep('dose', form)}
                        </motion.p>
                      </div>
                      {answerForStep('delivery', form) && (
                        <div>
                          <motion.p
                            layoutId="walk-title-delivery"
                            className="text-xs uppercase tracking-wider opacity-60"
                            style={{ color: text }}
                            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                          >
                            Delivery
                          </motion.p>
                          <motion.p
                            layoutId="walk-answer-delivery"
                            className="text-base font-medium"
                            style={{ color: text }}
                            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                          >
                            {answerForStep('delivery', form)}
                          </motion.p>
                        </div>
                      )}
                      {answerForStep('halfLife', form) && (
                        <div>
                          <motion.p
                            layoutId="walk-title-halfLife"
                            className="text-xs uppercase tracking-wider opacity-60"
                            style={{ color: text }}
                            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                          >
                            Half-life
                          </motion.p>
                          <motion.p
                            layoutId="walk-answer-halfLife"
                            className="text-base font-medium"
                            style={{ color: text }}
                            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                          >
                            {answerForStep('halfLife', form)}
                          </motion.p>
                        </div>
                      )}
                      <div>
                        <motion.p
                          layoutId="walk-title-schedule"
                          className="text-xs uppercase tracking-wider opacity-60"
                          style={{ color: text }}
                          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                        >
                          Schedule
                        </motion.p>
                        <motion.p
                          layoutId="walk-answer-schedule"
                          className="text-base font-medium"
                          style={{ color: text }}
                          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                        >
                          {answerForStep('schedule', form)}
                        </motion.p>
                      </div>
                      {isAdvanced && answerForStep('duration', form) && (
                        <div>
                          <motion.p
                            layoutId="walk-title-duration"
                            className="text-xs uppercase tracking-wider opacity-60"
                            style={{ color: text }}
                            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                          >
                            Duration
                          </motion.p>
                          <motion.p
                            layoutId="walk-answer-duration"
                            className="text-base font-medium"
                            style={{ color: text }}
                            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                          >
                            {answerForStep('duration', form)}
                          </motion.p>
                        </div>
                      )}
                      {answerForStep('notes', form) && (
                        <div>
                          <motion.p
                            layoutId="walk-title-notes"
                            className="text-xs uppercase tracking-wider opacity-60"
                            style={{ color: text }}
                            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                          >
                            Notes
                          </motion.p>
                          <motion.p
                            layoutId="walk-answer-notes"
                            className="text-base font-medium"
                            style={{ color: text }}
                            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                          >
                            {answerForStep('notes', form)}
                          </motion.p>
                        </div>
                      )}
                      {form.name && hasValidDose(form) && (
                        <motion.div
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.28, duration: 0.35 }}
                        >
                          <VisualSchedulePreview
                            protocol={{
                              protocolName: form.name,
                              peptides: [{
                                id: 'preview',
                                name: form.name,
                                dosage: {
                                  amount: form.dosageScheduleType === 'titration'
                                    ? (form.titration?.[0]?.dose || '')
                                    : form.dosage,
                                  unit: form.dosageScheduleType === 'titration'
                                    ? (form.titration?.[0]?.doseUnit || 'mcg')
                                    : form.dosageUnit,
                                },
                                frequency: form.frequency,
                                deliveryMethod: form.deliveryMethod || 'pipette',
                              }],
                              duration: form.noEndDate
                                ? { count: '', unit: form.durationUnit || 'weeks', noEnd: true }
                                : {
                                    count: form.durationValue || '',
                                    unit: form.durationUnit || 'weeks',
                                    noEnd: false,
                                  },
                            }}
                            startDate={getLocalDateString()}
                            theme={theme}
                          />
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Nav sits with the question — Skip always centered between Back and Next */}
              <div
                className={`pt-6 gap-3 ${
                  showSkipInNav
                    ? 'grid grid-cols-3 items-center'
                    : 'flex items-center justify-between'
                }`}
              >
                <div className="flex justify-start">
                  {isFirst ? (
                    <>
                      {(onBack || presentation !== 'fullscreen') && (
                        <button
                          type="button"
                          onClick={handleBack}
                          className="inline-flex items-center gap-0.5 text-sm font-medium opacity-70 hover:opacity-100"
                          style={{ color: muted }}
                        >
                          <ChevronLeft className="w-4 h-4" /> Back
                        </button>
                      )}
                      {!allowSkip && !onBack && (
                        <button
                          type="button"
                          onClick={onClose}
                          className="text-sm font-medium opacity-70"
                          style={{ color: muted }}
                        >
                          Cancel
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleBack}
                      className="inline-flex items-center gap-0.5 text-sm font-medium opacity-70 hover:opacity-100"
                      style={{ color: muted }}
                    >
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                  )}
                </div>

                {showSkipInNav && (
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (isFirst && allowSkip) onSkip?.();
                        else setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
                      }}
                      className="text-sm font-medium opacity-70 hover:opacity-100"
                      style={{ color: muted }}
                    >
                      Skip for now
                    </button>
                  </div>
                )}

                <div className={`flex ${showSkipInNav ? 'justify-end' : 'justify-end ml-auto'}`}>
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold shadow-md active:scale-95 disabled:opacity-60"
                    style={{ backgroundColor: primary, color: theme?.textOnPrimary || '#fff' }}
                  >
                    {isLast ? (isSaving ? 'Saving…' : <>Start tracking <Check className="w-4 h-4" /></>) : <>Next <ChevronRight className="w-4 h-4" /></>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </LayoutGroup>
    </div>
  );

  if (presentation === 'fullscreen') {
    return (
      <div
        className={`${fillParent ? 'absolute inset-0' : 'fixed inset-0 z-[10020]'} flex flex-col`}
        style={{
          background: theme?.isDark
            ? 'linear-gradient(180deg, #14191f 0%, #0e1219 100%)'
            : 'linear-gradient(180deg, #F5F3EF 0%, #E8E6E1 100%)',
          paddingTop: fillParent ? 0 : 'max(1.5rem, var(--safe-area-top, 0px))',
          paddingBottom: fillParent ? 0 : 'max(1.5rem, var(--safe-area-bottom, 0px))',
        }}
      >
        <div className="flex-1 px-5 pt-8 sm:pt-10 pb-2 min-h-0 flex flex-col max-w-md mx-auto w-full">
          {body}
        </div>
        <OnboardingLogoFooter />
      </div>
    );
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="New Protocol"
      theme={theme}
      maxHeight="92vh"
      fitContent={false}
      hideHeader={false}
    >
      <div className="px-1 pb-2 min-h-[420px] flex flex-col">
        {body}
      </div>
    </BottomSheet>
  );
}
