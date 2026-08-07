import React, { useState, useMemo, useEffect, useRef } from 'react';
import BottomSheet from '../common/BottomSheet';
import {
  Star,
  CalendarBlank,
  XCircle,
  Clock,
  Lightbulb,
  Target,
  Tag,
  NotePencil,
  WarningCircle,
  ArrowCounterClockwise,
  TrendUp,
  Medal,
  CurrencyDollar,
  ThumbsDown,
  ThumbsUp,
  Users,
  Prohibit,
  Timer,
  Package,
  Flask,
  Check,
} from '@phosphor-icons/react';
import { getLocalDateString } from '../../utils/date';
import { addNoteToProtocolHistory, updateProtocolHistoryEntry, getProtocolHistory } from '../../utils/protocolHistory';
import { getUnitLabel } from '../../utils/unitConversion';
import GlassmorphismDatePicker from '../common/GlassmorphismDatePicker';
import { prepareItemForSave } from '../../utils/userDataSave';
import { getPeptideDoseDisplay } from '../../utils/protocolDoseDisplay';

const formatMMDDYY = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const y = String(date.getFullYear()).slice(-2);
    return `${m}/${d}/${y}`;
  } catch {
    return dateString;
  }
};

const QUICK_TAGS = [
  { id: 'met_goals', label: 'Met Goals', icon: Target },
  { id: 'side_effects', label: 'Side Effects', icon: WarningCircle },
  { id: 'will_repeat', label: 'Will Repeat', icon: ArrowCounterClockwise },
  { id: 'adjustments_needed', label: 'Adjustments Needed', icon: TrendUp },
  { id: 'positive_results', label: 'Positive Results', icon: TrendUp },
  { id: 'no_results', label: 'No Results', icon: XCircle },
  { id: 'exceeded_expectations', label: 'Exceeded Expectations', icon: Medal },
  { id: 'adherence_issues', label: 'Adherence Issues', icon: WarningCircle },
  { id: 'cost_effective', label: 'Cost Effective', icon: CurrencyDollar },
  { id: 'not_cost_effective', label: 'Not Cost Effective', icon: ThumbsDown },
  { id: 'easy_to_follow', label: 'Easy to Follow', icon: ThumbsUp },
  { id: 'complex_schedule', label: 'Complex Schedule', icon: CalendarBlank },
  { id: 'recommend_to_others', label: 'Recommend to Others', icon: Users },
  { id: 'would_not_repeat', label: 'Would Not Repeat', icon: Prohibit },
  { id: 'needs_more_time', label: 'Needs More Time', icon: Timer },
];

/** Standard modal section header (matches VendorDetailsModal / AddToStockpile pattern). */
function SectionHeader({ icon: Icon, title, subtitle, theme }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      {Icon && <Icon size={28} weight="duotone" style={{ color: theme.primary }} />}
      <div className="flex flex-col gap-0.5">
        <h4 className="text-base font-semibold tracking-wide" style={{ color: theme.text }}>{title}</h4>
        {subtitle && (
          <div className="flex items-center gap-2 ml-1">
            <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }} />
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
              {subtitle}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * EndProtocolAssessment - Single-page end-of-protocol assessment.
 * Combines: protocol summary, vial usage toggles, and follow-up notes/tags/rating.
 * 
 * Props:
 *   open, onClose, protocol, historyEntryId, theme
 *   stockpile, setStockpile - for auto-decrementing fully used vials
 *   reconItems, setReconItems, reconHistory, setReconHistory - for moving recon items
 *   onComplete - callback after save
 */
export default function EndProtocolAssessment({ 
  open, onClose, protocol, historyEntryId, theme,
  stockpile, setStockpile,
  reconItems, setReconItems, reconHistory, setReconHistory,
  onComplete
}) {
  // Vial usage state: { [vialId]: { status: 'fully_used' | 'leftover', notes: '' } }
  const [vialAssessment, setVialAssessment] = useState({});
  
  // Follow-up state
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [rating, setRating] = useState(0);
  const [ratingWave, setRatingWave] = useState(0); // remount key so L→R fill re-runs
  const [linkedDate, setLinkedDate] = useState(getLocalDateString());
  const [showLinkedDate, setShowLinkedDate] = useState(true);
  const [currentSuggestionIndex, setCurrentSuggestionIndex] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);
  // Keep last protocol so BottomSheet can finish its close animation after parent clears state
  const heldProtocolRef = useRef(protocol);
  if (protocol) heldProtocolRef.current = protocol;
  const displayProtocol = protocol || heldProtocolRef.current;

  // Allow a fresh save each time the sheet opens
  useEffect(() => {
    if (open) {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, [open]);

  const handleSetRating = (num) => {
    setRating(num);
    setRatingWave((w) => w + 1);
  };

  const writingPrompts = [
    'What were the main outcomes or results you observed?',
    'Did you experience any side effects or reactions?',
    'How did your adherence compare to the planned schedule?',
    'Would you repeat this protocol? Why or why not?',
    'What adjustments would you make if running this again?',
    'How did you feel overall during this research period?'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setCurrentSuggestionIndex((prev) => (prev + 1) % writingPrompts.length);
        setFadeIn(true);
      }, 200);
    }, 4000);
    return () => clearInterval(interval);
  }, [writingPrompts.length]);

  // Load history entry data
  const historyEntry = useMemo(() => {
    if (!historyEntryId) return null;
    const allHistory = getProtocolHistory();
    return allHistory.find(entry => entry.id === historyEntryId);
  }, [historyEntryId, open]);

  // Get linked vials from protocol
  const linkedVials = useMemo(() => {
    if (!protocol || !stockpile) return [];
    const linkedItems = protocol.linkedItems || {};
    const vials = [];

    Object.entries(linkedItems).forEach(([peptideId, item]) => {
      if (item.status === 'linked' && item.vialId) {
        const vial = stockpile.find(v => v.id === item.vialId);
        const peptide = protocol.peptides?.find(p => (p.id || `peptide-${protocol.peptides.indexOf(p)}`) === peptideId);
        if (vial) {
          vials.push({
            peptideId,
            peptideName: peptide?.name || vial.name || 'Unknown',
            vialId: vial.id,
            mg: vial.mg,
            mgUnit: vial.mgUnit || 'mg',
            unit: vial.unit || 'vial',
            vendor: vial.vendor || 'Unknown',
            reconId: item.reconId || null,
            quantity: vial.quantity
          });
        }
      }
    });

    return vials;
  }, [protocol, stockpile, open]);

  // Initialize vial assessment: default all to 'fully_used'
  useEffect(() => {
    if (open && linkedVials.length > 0) {
      const initial = {};
      linkedVials.forEach(v => {
        initial[v.vialId] = { status: 'fully_used', notes: '' };
      });
      setVialAssessment(initial);
    }
  }, [open, linkedVials.length]);

  // Reset form when opened
  useEffect(() => {
    if (open) {
      setContent('');
      setSelectedTags([]);
      setRating(0);
      setLinkedDate(getLocalDateString());
      setShowLinkedDate(true);
    }
  }, [open]);

  // Protocol snapshot for the highlight card
  const protocolInfo = useMemo(() => {
    if (!historyEntry && !protocol) return null;
    const startDate = historyEntry?.startDate || protocol?.startDate;
    const endDate = historyEntry?.endDate || getLocalDateString();

    let durationDays = null;
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        durationDays = Math.max(1, Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1);
      }
    }
    const duration =
      durationDays == null ? 'N/A' : `${durationDays} day${durationDays !== 1 ? 's' : ''}`;

    const peptides = protocol?.peptides || [];
    const doseRows = peptides.map((pep, idx) => {
      const disp = getPeptideDoseDisplay(protocol, pep, { reconItems: reconItems || [] });
      return {
        id: pep.id || `peptide-${idx}`,
        name: pep.name || 'Peptide',
        doseLabel: disp.combined || disp.primary || null,
        massLabel: disp.massLabel,
        unitsLabel: disp.unitsLabel,
      };
    }).filter((r) => r.name);

    const vialRows = (linkedVials || []).map((v) => {
      const linked = protocol?.linkedItems
        ? Object.values(protocol.linkedItems).find((li) => li?.vialId === v.vialId)
        : null;
      const qty = Number(linked?.quantityUsed) || Number(v.quantity) || 1;
      const unitLabel = getUnitLabel(v.unit || 'vial', qty);
      const mgLabel = v.mg != null && v.mg !== '' ? `${v.mg}${v.mgUnit || 'mg'}` : null;
      const vendor = v.vendor && v.vendor !== 'Unknown' ? v.vendor : null;
      const qtyLabel = `${qty} ${unitLabel}`;
      return {
        id: v.vialId,
        name: v.peptideName,
        mgLabel,
        vendor,
        qtyLabel,
        // Fallback single line if needed elsewhere
        detail: [mgLabel, vendor, qtyLabel].filter(Boolean).join(' · '),
      };
    });

    return {
      startDate,
      endDate,
      duration,
      durationDays,
      purpose: protocol?.purpose || '',
      doseRows,
      vialRows,
      vialCount: vialRows.length,
      // Avoid repeating protocol title in single-peptide / single-vial snapshots
      showDoseNames: doseRows.length > 1,
      showVialNames: vialRows.length > 1,
    };
  }, [historyEntry, protocol, reconItems, linkedVials]);

  const handleTagToggle = (tagId) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const handleVialStatusToggle = (vialId) => {
    setVialAssessment(prev => ({
      ...prev,
      [vialId]: {
        ...prev[vialId],
        status: prev[vialId]?.status === 'fully_used' ? 'leftover' : 'fully_used'
      }
    }));
  };

  const handleVialNotes = (vialId, notes) => {
    setVialAssessment(prev => ({
      ...prev,
      [vialId]: { ...prev[vialId], notes }
    }));
  };

  const handleSave = () => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setIsSaving(true);

    const protocolName = protocol?.protocolName || protocol?.name || 'Protocol';
    const assessmentSnapshot = { ...vialAssessment };
    const vialsSnapshot = [...(linkedVials || [])];
    const shouldSyncCalendar = showLinkedDate && linkedDate;

    // 1. Persist assessment + follow-up note (sync localStorage — safe before unmount)
    if (historyEntryId) {
      updateProtocolHistoryEntry(historyEntryId, {
        vialAssessment: Object.keys(assessmentSnapshot).length > 0 ? assessmentSnapshot : null
      });

      if (content.trim() || selectedTags.length > 0 || rating > 0) {
        addNoteToProtocolHistory(historyEntryId, {
          type: 'follow_up',
          content: content.trim(),
          tags: selectedTags,
          linkedDate: showLinkedDate ? linkedDate : null,
          rating: rating > 0 ? rating : null
        });
      }
    }

    window.dispatchEvent(new CustomEvent('tpp:toast', {
      detail: {
        message: `Post-protocol assessment for ${protocolName} saved.`,
        type: 'success',
      },
    }));

    // Close first so vial/recon state updates don't remount this sheet mid-save
    if (onComplete) onComplete({ saved: true, historyEntryId, protocolId: protocol?.id });
    else onClose?.();

    // 2. Apply vial side-effects after close (next tick)
    queueMicrotask(() => {
      const now = new Date().toISOString();

      Object.entries(assessmentSnapshot).forEach(([vialId, assessment]) => {
        const linkedVial = vialsSnapshot.find(v => v.vialId === vialId);
        if (!linkedVial) return;

        if (assessment.status === 'fully_used') {
          if (linkedVial.reconId && reconItems && setReconItems && setReconHistory) {
            const reconItem = reconItems.find(r => r.id === linkedVial.reconId);
            if (reconItem) {
              const usedItem = { ...reconItem, usedDate: now, usedByProtocol: protocolName };
              setReconHistory(prev => [usedItem, ...(prev || [])]);
              setReconItems(prev => prev.filter(r => r.id !== linkedVial.reconId));
            }
          }
        } else if (assessment.status === 'leftover') {
          if (linkedVial.reconId && reconItems && setReconItems) {
            setReconItems(prev => prev.map(r => {
              if (r.id === linkedVial.reconId) {
                return prepareItemForSave({
                  ...r,
                  leftover: true,
                  leftoverFromProtocol: protocolName,
                  leftoverNotes: assessment.notes || ''
                });
              }
              return r;
            }));
          }
        }
      });

      if (shouldSyncCalendar) {
        window.dispatchEvent(new CustomEvent('tpp:calendar-sync', { detail: { protocolNoteUpdated: true } }));
      }
    });
  };

  const handleClose = () => {
    setContent('');
    setSelectedTags([]);
    setRating(0);
    setVialAssessment({});
    setLinkedDate(getLocalDateString());
    setShowLinkedDate(true);
    onClose();
  };

  if (!displayProtocol) return null;

  return (
    <BottomSheet
      open={open}
      onClose={handleClose}
      onBack={handleClose}
      title="Post-Protocol Assessment"
      theme={theme}
      maxHeight="92vh"
      footer={
        <div className="flex justify-between items-center gap-3 w-full">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-lg font-medium transition-all"
            style={{
              backgroundColor: theme.isDark ? '#374151' : '#f3f4f6',
              color: theme.text
            }}
          >
            Skip for Now
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !open}
            className="px-4 py-2 rounded-lg font-medium transition-all"
            style={{
              backgroundColor: theme.primary,
              color: theme.textOnPrimary,
              opacity: isSaving ? 0.7 : 1,
            }}
          >
            Finish Assessment
          </button>
        </div>
      }
    >
      <div className="space-y-6 pb-8">
        {/* Section 1: Protocol Snapshot highlight */}
        {protocolInfo && (
          <div>
            <SectionHeader icon={Flask} title="Protocol Snapshot" subtitle="Run Summary" theme={theme} />
            <div
              className="relative rounded-xl p-4 overflow-hidden"
              style={{
                background: theme.isDark
                  ? `${theme.primary}20`
                  : `${theme.primary}18`,
                border: `1px solid ${theme.isDark ? `${theme.primary}45` : `${theme.primary}40`}`,
                borderLeft: `4px solid ${theme.primary}`,
                boxShadow: theme.isDark
                  ? 'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 8px rgba(0,0,0,0.25)'
                  : 'inset 0 1px 0 rgba(255,255,255,0.65), 0 2px 10px rgba(127,158,149,0.18)',
              }}
            >
              {/* Title + duration chip (date tucked under chip) */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0 flex-1">
                  <div className="text-base font-bold leading-snug truncate" style={{ color: theme.text }}>
                    {displayProtocol.protocolName || 'Unnamed Protocol'}
                  </div>
                  {protocolInfo.purpose && (
                    <p className="text-xs mt-1 opacity-70 truncate" style={{ color: theme.text }}>
                      {protocolInfo.purpose}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0 flex flex-col items-end gap-1">
                  {protocolInfo.durationDays != null && (
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm tabular-nums"
                      style={{
                        backgroundColor: `${theme.primary}18`,
                        color: theme.primary,
                        border: `1px solid ${theme.primary}30`,
                      }}
                    >
                      <Clock size={16} weight="duotone" />
                      <span className="font-medium">
                        Ran for{' '}
                        <span className="font-bold">{protocolInfo.durationDays}</span>
                        {` day${protocolInfo.durationDays !== 1 ? 's' : ''}`}
                      </span>
                    </span>
                  )}
                  {protocolInfo.startDate && protocolInfo.endDate && (
                    <div className="text-[11px] font-medium tabular-nums" style={{ color: theme.textLight }}>
                      {formatMMDDYY(protocolInfo.startDate)} – {formatMMDDYY(protocolInfo.endDate)}
                    </div>
                  )}
                </div>
              </div>

              {/* Ending dosage — skip repeating protocol name on single-peptide runs */}
              {protocolInfo.doseRows.length > 0 && (
                <div className="mb-3">
                  {!protocolInfo.showDoseNames ? (
                    (() => {
                      const row = protocolInfo.doseRows[0];
                      const units = row?.unitsLabel && row.unitsLabel !== '—' ? row.unitsLabel : null;
                      const mass = row?.massLabel && row.massLabel !== '—' ? row.massLabel : null;
                      const doseText = row?.doseLabel && row.doseLabel !== '—' ? row.doseLabel : null;
                      const hasParts = units || mass;
                      return (
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span
                            className="text-sm font-medium flex-shrink-0"
                            style={{ color: theme.textLight }}
                          >
                            Ended dosage at
                          </span>
                          {hasParts ? (
                            <span className="inline-flex items-baseline gap-2 min-w-0">
                              {mass && (
                                <span
                                  className="text-base font-bold tabular-nums"
                                  style={{ color: theme.primary }}
                                >
                                  {mass}
                                </span>
                              )}
                              {mass && units && (
                                <span
                                  className="text-base font-bold mx-0.5"
                                  style={{ color: theme.text, opacity: 0.45 }}
                                  aria-hidden
                                >
                                  |
                                </span>
                              )}
                              {units && (
                                <span
                                  className="text-base font-semibold tabular-nums"
                                  style={{ color: theme.text }}
                                >
                                  {units}
                                </span>
                              )}
                            </span>
                          ) : doseText ? (
                            <span
                              className="text-base font-bold tabular-nums"
                              style={{ color: theme.primary }}
                            >
                              {doseText}
                            </span>
                          ) : (
                            <span className="text-base opacity-40" style={{ color: theme.textLight }}>—</span>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    <>
                      <div
                        className="text-[10px] font-bold uppercase tracking-[0.12em] mb-1.5 opacity-50"
                        style={{ color: theme.text }}
                      >
                        Dosage ended on
                      </div>
                      <div className="space-y-1.5">
                        {protocolInfo.doseRows.map((row) => {
                          const doseText = row.doseLabel && row.doseLabel !== '—' ? row.doseLabel : null;
                          return (
                            <div
                              key={row.id}
                              className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg"
                              style={{
                                backgroundColor: theme.isDark ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.7)',
                                border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
                              }}
                            >
                              <span className="text-sm font-semibold truncate min-w-0" style={{ color: theme.text }}>
                                {row.name}
                              </span>
                              {doseText ? (
                                <span
                                  className="flex-shrink-0 text-[11px] font-bold tabular-nums"
                                  style={{ color: theme.primary }}
                                >
                                  {doseText}
                                </span>
                              ) : (
                                <span className="text-[11px] opacity-40" style={{ color: theme.textLight }}>—</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Vials used — includes Fully Used / Leftover toggle */}
              {protocolInfo.vialCount > 0 && (
                <div>
                  <div
                    className="text-[10px] font-bold uppercase tracking-[0.12em] mb-1.5 opacity-50"
                    style={{ color: theme.text }}
                  >
                    Vials used · {protocolInfo.vialCount}
                  </div>
                  <div className="space-y-1.5">
                    {protocolInfo.vialRows.map((v) => {
                      const assessment = vialAssessment[v.id] || { status: 'fully_used', notes: '' };
                      const isFullyUsed = assessment.status === 'fully_used';
                      return (
                        <div
                          key={v.id}
                          className="rounded-lg px-2.5 py-2 transition-all"
                          style={{
                            backgroundColor: theme.isDark ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.7)',
                            border: `1px solid ${
                              isFullyUsed
                                ? `${theme.primary}55`
                                : (theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)')
                            }`,
                          }}
                        >
                          <div className="flex items-center gap-2.5">
                            <Package size={20} weight="duotone" className="flex-shrink-0" style={{ color: theme.primary }} />
                            <div className="min-w-0 flex-1">
                              {protocolInfo.showVialNames && v.name && (
                                <div className="text-[11px] mb-0.5 truncate font-medium" style={{ color: theme.textLight }}>
                                  {v.name}
                                </div>
                              )}
                              <div className="flex items-baseline gap-2 min-w-0">
                                {v.mgLabel ? (
                                  <span
                                    className="text-sm font-bold tabular-nums flex-shrink-0"
                                    style={{ color: theme.primary }}
                                  >
                                    {v.mgLabel}
                                  </span>
                                ) : null}
                                {(v.vendor || v.qtyLabel) && (
                                  <span
                                    className="text-xs truncate min-w-0"
                                    style={{ color: theme.textLight }}
                                  >
                                    {[v.vendor, v.qtyLabel].filter(Boolean).join('  ·  ')}
                                  </span>
                                )}
                                {!v.mgLabel && !v.vendor && !v.qtyLabel && (
                                  <span className="text-sm font-bold truncate" style={{ color: theme.text }}>
                                    {v.name || 'Vial'}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleVialStatusToggle(v.id)}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all flex-shrink-0 active:scale-95"
                              style={{
                                backgroundColor: isFullyUsed
                                  ? theme.primary
                                  : (theme.isDark ? '#78350f' : '#fef3c7'),
                                color: isFullyUsed
                                  ? '#ffffff'
                                  : (theme.isDark ? '#fcd34d' : '#92400e'),
                                border: isFullyUsed
                                  ? `1px solid ${theme.primaryDark || theme.primary}`
                                  : `1px solid ${theme.isDark ? '#92400e' : '#fcd34d'}`,
                                boxShadow: isFullyUsed
                                  ? (theme.isDark
                                    ? 'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -2px 4px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.3)'
                                    : 'inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -2px 4px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.1)')
                                  : (theme.isDark
                                    ? 'inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -2px 4px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.25)'
                                    : 'inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -2px 4px rgba(146,64,14,0.12), 0 1px 2px rgba(0,0,0,0.08)'),
                                WebkitTapHighlightColor: 'transparent',
                              }}
                            >
                              {isFullyUsed ? <Check size={13} weight="bold" /> : <WarningCircle size={13} weight="duotone" />}
                              {isFullyUsed ? 'Fully Used' : 'Leftover'}
                            </button>
                          </div>
                          {!isFullyUsed && (
                            <input
                              type="text"
                              value={assessment.notes || ''}
                              onChange={(e) => handleVialNotes(v.id, e.target.value)}
                              placeholder="Notes (e.g. remaining doses, reason...)"
                              className="w-full mt-2 px-2.5 py-1.5 rounded-lg text-xs"
                              style={{
                                backgroundColor: theme.isDark ? '#111827' : '#ffffff',
                                border: `1px solid ${theme.border}`,
                                color: theme.text,
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section 3: Rating */}
        <div className="flex flex-col items-center">
          <div className="w-full">
            <SectionHeader icon={Target} title="Overall Assessment" subtitle="Rate This Research Run" theme={theme} />
          </div>
          <style>{`
            @keyframes epaStarFillLtr {
              0% { transform: scale(0.65); opacity: 0.35; }
              55% { transform: scale(1.22); opacity: 1; }
              100% { transform: scale(1); opacity: 1; }
            }
            .epa-star-btn {
              transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .epa-star-btn:hover { transform: scale(1.1); }
            .epa-star-btn:active { transform: scale(0.96); }
            .epa-star-fill {
              animation: epaStarFillLtr 0.38s cubic-bezier(0.34, 1.45, 0.64, 1) both;
            }
          `}</style>
          <div
            className="flex items-center justify-between w-full max-w-xs rounded-lg p-1 mb-3 mt-1"
            style={{
              backgroundColor: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.05)' : '#f0eee7'}`,
            }}
            role="radiogroup"
            aria-label="Overall research rating"
          >
            {[1, 2, 3, 4, 5].map((num) => {
              const filled = rating >= num;
              const fillSteps = ['#7A8E85', '#6B7F77', '#566D64', '#445952', '#3B4240'];
              const fillColor = fillSteps[num - 1];
              const emptyColor = theme.isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)';
              return (
                <button
                  key={num}
                  type="button"
                  role="radio"
                  aria-checked={rating === num}
                  aria-label={`${num} star${num !== 1 ? 's' : ''}`}
                  onClick={() => handleSetRating(num)}
                  className="epa-star-btn px-2 py-1"
                >
                  <Star
                    key={filled ? `fill-${ratingWave}-${num}` : `empty-${num}`}
                    size={22}
                    weight={filled ? 'fill' : 'regular'}
                    className={filled ? 'epa-star-fill' : undefined}
                    style={{
                      color: filled ? fillColor : emptyColor,
                      opacity: filled ? 1 : 0.85,
                      animationDelay: filled ? `${(num - 1) * 70}ms` : '0ms',
                    }}
                  />
                </button>
              );
            })}
          </div>
          {rating > 0 && (
            <span
              key={`label-${ratingWave}`}
              className="text-sm epa-star-fill"
              style={{ color: theme.textLight, animationDelay: `${rating * 70}ms` }}
            >
              {rating === 5 ? 'Excellent' : rating === 4 ? 'Good' : rating === 3 ? 'Average' : rating === 2 ? 'Below Average' : 'Poor'}
            </span>
          )}
        </div>

        {/* Section 4: Quick Tags — match VendorDetailsModal label buttons */}
        <div>
          <SectionHeader icon={Tag} title="Quick Tags" subtitle="Research Outcomes" theme={theme} />
          <div className="grid grid-cols-2 gap-2">
            {QUICK_TAGS.map(tag => {
              const isSelected = selectedTags.includes(tag.id);
              const TagIcon = tag.icon || Tag;
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleTagToggle(tag.id)}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg transition-all duration-200 active:scale-95 min-w-0"
                  style={{
                    backgroundColor: isSelected ? '#6B7F77' : (theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                    border: isSelected ? '1px solid #566D64' : `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                    color: isSelected ? '#fff' : (theme.isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)'),
                    boxShadow: isSelected
                      ? 'inset 0 2px 4px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.08)'
                      : 'inset 0 1px 3px rgba(0,0,0,0.06)',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <TagIcon size={20} weight="duotone" className="shrink-0" style={{ color: isSelected ? '#fff' : 'inherit' }} />
                  <span className="text-sm font-semibold leading-tight truncate text-center">{tag.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 5: Notes & Observations */}
        <div>
          <SectionHeader icon={NotePencil} title="Notes & Observations" subtitle="Freeform Assessment" theme={theme} />

          <div
            className="w-full px-3 py-2 rounded-t-lg flex items-center gap-2 mb-0 transition-all"
            style={{
              backgroundColor: theme.isDark ? '#1f2937' : theme.secondary,
              border: `1px solid ${theme.border}`,
              borderBottom: 'none'
            }}
          >
            <Lightbulb size={14} weight="duotone" style={{ color: theme.primary, flexShrink: 0 }} />
            <div className="flex-1 transition-opacity duration-200" style={{ opacity: fadeIn ? 1 : 0 }}>
              <span className="text-xs italic" style={{ color: theme.textLight }}>
                {writingPrompts[currentSuggestionIndex]}
              </span>
            </div>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add your overall assessment, outcomes, side effects, future considerations..."
            className="w-full p-3 rounded-b-lg rounded-t-none text-sm resize-none"
            rows={6}
            style={{
              backgroundColor: theme.isDark ? '#1f2937' : theme.cardBackground,
              border: `1px solid ${theme.border}`,
              borderTop: 'none',
              color: theme.text
            }}
          />
        </div>

        {/* Section 6: Link to Calendar — compact controls */}
        <div>
          <SectionHeader icon={CalendarBlank} title="Show in Calendar" subtitle="Optional Visibility" theme={theme} />
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="checkbox"
              aria-checked={showLinkedDate}
              aria-label="Show this note in calendar"
              onClick={() => setShowLinkedDate((v) => !v)}
              className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center transition-all active:scale-95"
              style={{
                backgroundColor: showLinkedDate ? theme.primary : (theme.isDark ? '#1f2937' : '#fff'),
                border: `2px solid ${showLinkedDate ? theme.primary : theme.border}`,
                color: '#fff',
              }}
            >
              {showLinkedDate && <Check size={16} weight="bold" />}
            </button>
            <div
              className="flex-1 min-w-0 transition-opacity"
              style={{
                opacity: showLinkedDate ? 1 : 0.45,
                pointerEvents: showLinkedDate ? 'auto' : 'none',
              }}
            >
              <GlassmorphismDatePicker
                value={linkedDate}
                onChange={setLinkedDate}
                theme={theme}
              />
            </div>
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
