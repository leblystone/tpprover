import React, { useState, useMemo, useEffect } from 'react';
import BottomSheet from '../common/BottomSheet';
import { 
  Star, Save, Calendar, CheckCircle, XCircle, Clock, Lightbulb, Target, Tag, 
  StickyNote, AlertCircle, RotateCcw, TrendingUp, Award, DollarSign, ThumbsDown, 
  ThumbsUp, Users, Ban, Timer, Package, Beaker, Check
} from 'lucide-react';
import { formatMMDDYYYY, getLocalDateString } from '../../utils/date';
import { addNoteToProtocolHistory, updateProtocolHistoryEntry, getProtocolHistory } from '../../utils/protocolHistory';
import { getUnitLabel } from '../../utils/unitConversion';
import GlassmorphismDatePicker from '../common/GlassmorphismDatePicker';
import { prepareItemForSave } from '../../utils/userDataSave';

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
  { id: 'side_effects', label: 'Side Effects', icon: AlertCircle },
  { id: 'will_repeat', label: 'Will Repeat', icon: RotateCcw },
  { id: 'adjustments_needed', label: 'Adjustments Needed', icon: TrendingUp },
  { id: 'positive_results', label: 'Positive Results', icon: TrendingUp },
  { id: 'no_results', label: 'No Results', icon: XCircle },
  { id: 'exceeded_expectations', label: 'Exceeded Expectations', icon: Award },
  { id: 'adherence_issues', label: 'Adherence Issues', icon: AlertCircle },
  { id: 'cost_effective', label: 'Cost Effective', icon: DollarSign },
  { id: 'not_cost_effective', label: 'Not Cost Effective', icon: ThumbsDown },
  { id: 'easy_to_follow', label: 'Easy to Follow', icon: ThumbsUp },
  { id: 'complex_schedule', label: 'Complex Schedule', icon: Calendar },
  { id: 'recommend_to_others', label: 'Recommend to Others', icon: Users },
  { id: 'would_not_repeat', label: 'Would Not Repeat', icon: Ban },
  { id: 'needs_more_time', label: 'Needs More Time', icon: Timer }
];

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
  const [linkedDate, setLinkedDate] = useState(getLocalDateString());
  const [showLinkedDate, setShowLinkedDate] = useState(true);
  const [currentSuggestionIndex, setCurrentSuggestionIndex] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);

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

  // Protocol info calculation
  const protocolInfo = useMemo(() => {
    if (!historyEntry && !protocol) return null;
    const startDate = historyEntry?.startDate || protocol?.startDate;
    const endDate = historyEntry?.endDate || getLocalDateString();
    
    let duration = 'N/A';
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
      duration = `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    }

    const peptideNames = (protocol?.peptides || []).map(p => p.name).filter(Boolean);

    return { startDate, endDate, duration, peptideNames };
  }, [historyEntry, protocol]);

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
    // 1. Save vial assessment to protocol history
    if (historyEntryId) {
      updateProtocolHistoryEntry(historyEntryId, {
        vialAssessment: Object.keys(vialAssessment).length > 0 ? vialAssessment : null
      });

      // Save follow-up note if there's any content
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

    // 2. Process vial actions
    const now = new Date().toISOString();

    Object.entries(vialAssessment).forEach(([vialId, assessment]) => {
      const linkedVial = linkedVials.find(v => v.vialId === vialId);
      if (!linkedVial) return;

      if (assessment.status === 'fully_used') {
        // Move linked recon item to history
        if (linkedVial.reconId && reconItems && setReconItems && setReconHistory) {
          const reconItem = reconItems.find(r => r.id === linkedVial.reconId);
          if (reconItem) {
            const usedItem = { ...reconItem, usedDate: now, usedByProtocol: protocol?.protocolName || 'Unknown' };
            setReconHistory(prev => [usedItem, ...(prev || [])]);
            setReconItems(prev => prev.filter(r => r.id !== linkedVial.reconId));
          }
        }
      } else if (assessment.status === 'leftover') {
        // Mark recon item as leftover (keep in In-Use tab)
        if (linkedVial.reconId && reconItems && setReconItems) {
          setReconItems(prev => prev.map(r => {
            if (r.id === linkedVial.reconId) {
              return prepareItemForSave({ 
                ...r, 
                leftover: true, 
                leftoverFromProtocol: protocol?.protocolName || 'Unknown',
                leftoverNotes: assessment.notes || ''
              });
            }
            return r;
          }));
        }
      }
    });

    // Trigger events (localStorage sync handled by AppContext useEffect hooks)
    window.dispatchEvent(new CustomEvent('tpp:protocol-history-updated'));
    if (showLinkedDate && linkedDate) {
      window.dispatchEvent(new CustomEvent('tpp:calendar-sync', { detail: { protocolNoteUpdated: true } }));
    }

    window.dispatchEvent(new CustomEvent('tpp:toast', {
      detail: { message: 'Protocol assessment saved successfully!', type: 'success' }
    }));

    if (onComplete) onComplete();
    handleClose();
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

  if (!open || !protocol) return null;

  return (
    <BottomSheet
      open={open}
      onClose={handleClose}
      onBack={handleClose}
      title="End Protocol Assessment"
      theme={theme}
      maxHeight="92vh"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <button
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
            onClick={handleSave}
            className="px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2"
            style={{
              backgroundColor: theme.primary,
              color: theme.textOnPrimary
            }}
          >
            <Save size={16} />
            Save Assessment
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Section 1: Protocol Summary */}
        {protocolInfo && (
          <div className="p-3 rounded-lg" style={{
            backgroundColor: theme.isDark ? '#1f2937' : theme.cardBackground,
            border: `1px solid ${theme.border}`
          }}>
            <div className="text-sm font-bold mb-2" style={{ color: theme.text }}>
              {protocol.protocolName || 'Unnamed Protocol'}
            </div>
            
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Clock size={13} style={{ color: theme.textLight }} />
                <span className="text-xs font-medium" style={{ color: theme.text }}>
                  {protocolInfo.duration}
                </span>
              </div>
              {protocolInfo.startDate && protocolInfo.endDate && (
                <div className="flex items-center gap-2">
                  <Calendar size={13} style={{ color: theme.textLight }} />
                  <span className="text-xs font-medium" style={{ color: theme.text }}>
                    {formatMMDDYY(protocolInfo.startDate)} - {formatMMDDYY(protocolInfo.endDate)}
                  </span>
                </div>
              )}
            </div>

            {protocolInfo.peptideNames.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {protocolInfo.peptideNames.map((name, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{
                      backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                      color: theme.text
                    }}
                  >
                    {name}
                  </span>
                ))}
              </div>
            )}

            {protocol.purpose && (
              <p className="text-xs mt-2 opacity-60" style={{ color: theme.text }}>
                {protocol.purpose}
              </p>
            )}
          </div>
        )}

        {/* Section 2: Vial Usage Assessment */}
        {linkedVials.length > 0 && (
          <div>
            <label className="block text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: theme.text }}>
              <Package size={16} style={{ color: theme.primary }} />
              Vial Usage
            </label>
            <div className="space-y-2">
              {linkedVials.map(vial => {
                const assessment = vialAssessment[vial.vialId] || { status: 'fully_used', notes: '' };
                const isFullyUsed = assessment.status === 'fully_used';

                return (
                  <div
                    key={vial.vialId}
                    className="rounded-lg p-3 transition-all"
                    style={{
                      backgroundColor: theme.isDark ? '#1f2937' : theme.cardBackground,
                      border: `1px solid ${isFullyUsed ? (theme.isDark ? '#22543d' : '#86efac') : theme.border}`
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate" style={{ color: theme.text }}>
                          {vial.peptideName}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-medium opacity-60" style={{ color: theme.text }}>
                            {vial.mg}{vial.mgUnit} · {vial.vendor}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleVialStatusToggle(vial.vialId)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                        style={{
                          backgroundColor: isFullyUsed
                            ? (theme.isDark ? '#22543d' : '#d1fae5')
                            : (theme.isDark ? '#78350f' : '#fef3c7'),
                          color: isFullyUsed
                            ? (theme.isDark ? '#86efac' : '#065f46')
                            : (theme.isDark ? '#fcd34d' : '#92400e')
                        }}
                      >
                        {isFullyUsed ? <Check size={14} /> : <AlertCircle size={14} />}
                        {isFullyUsed ? 'Fully Used' : 'Leftover'}
                      </button>
                    </div>

                    {!isFullyUsed && (
                      <div className="mt-2">
                        <input
                          type="text"
                          value={assessment.notes}
                          onChange={(e) => handleVialNotes(vial.vialId, e.target.value)}
                          placeholder="Notes (e.g. remaining doses, reason...)"
                          className="w-full px-3 py-1.5 rounded-lg text-xs"
                          style={{
                            backgroundColor: theme.isDark ? '#111827' : '#ffffff',
                            border: `1px solid ${theme.border}`,
                            color: theme.text
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 3: Rating */}
        <div className="flex flex-col items-center">
          <label className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: theme.text }}>
            <Target size={16} style={{ color: theme.primary }} />
            Overall Research Assessment
          </label>
          <div className="flex items-center gap-2 mb-3">
            {[1, 2, 3, 4, 5].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => setRating(num)}
                className="p-2 rounded-lg transition-all hover:scale-110"
                style={{ backgroundColor: theme.isDark ? '#374151' : '#DDE6DE' }}
              >
                <Star
                  size={24}
                  fill={rating >= num ? (theme.isDark ? '#D1D5DB' : (theme.primaryDark || '#5F7F76')) : 'none'}
                  style={{
                    color: rating >= num
                      ? (theme.isDark ? '#D1D5DB' : (theme.primaryDark || '#5F7F76'))
                      : (theme.isDark ? '#9CA3AF' : '#D1D5DB')
                  }}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <span className="text-sm" style={{ color: theme.textLight }}>
              {rating === 5 ? 'Excellent' : rating === 4 ? 'Good' : rating === 3 ? 'Average' : rating === 2 ? 'Below Average' : 'Poor'}
            </span>
          )}
        </div>

        {/* Section 4: Quick Tags */}
        <div>
          <label className="block text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: theme.text }}>
            <Tag size={16} style={{ color: theme.primary }} />
            Quick Tags
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {QUICK_TAGS.map(tag => {
              const isSelected = selectedTags.includes(tag.id);
              const TagIcon = tag.icon || Tag;
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleTagToggle(tag.id)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all text-left"
                  style={{
                    backgroundColor: isSelected ? theme.primary : (theme.isDark ? '#1f2937' : '#ffffff'),
                    border: `1px solid ${isSelected ? theme.primary : theme.border}`,
                    color: isSelected ? '#ffffff' : (theme.isDark ? '#9ca3af' : '#6b7280'),
                    boxShadow: isSelected ? `0 1px 3px ${theme.primary}30` : 'none'
                  }}
                >
                  <TagIcon size={14} style={{
                    color: isSelected ? '#ffffff' : theme.primary,
                    flexShrink: 0
                  }} />
                  <span className="text-xs font-medium leading-tight">{tag.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 5: Notes & Observations */}
        <div>
          <label className="block text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: theme.text }}>
            <StickyNote size={16} style={{ color: theme.primary }} />
            Notes & Observations
          </label>

          <div
            className="w-full px-3 py-2 rounded-t-lg flex items-center gap-2 mb-0 transition-all"
            style={{
              backgroundColor: theme.isDark ? '#1f2937' : theme.secondary,
              border: `1px solid ${theme.border}`,
              borderBottom: 'none'
            }}
          >
            <Lightbulb size={14} style={{ color: theme.primary, flexShrink: 0 }} />
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

        {/* Section 6: Link to Calendar */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold mb-2" style={{ color: theme.text }}>
            <input
              type="checkbox"
              checked={showLinkedDate}
              onChange={(e) => setShowLinkedDate(e.target.checked)}
              className="rounded"
              style={{ accentColor: theme.primary }}
            />
            <Calendar size={16} style={{ color: theme.primary }} />
            <span>Show this note in calendar</span>
          </label>
          {showLinkedDate && (
            <div className="mt-2">
              <GlassmorphismDatePicker
                value={linkedDate}
                onChange={setLinkedDate}
                theme={theme}
              />
            </div>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
