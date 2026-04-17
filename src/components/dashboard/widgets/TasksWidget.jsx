import React, { useState, useMemo, useRef, useEffect } from 'react';
import { CheckSquare, PenTool, Check, Beaker, Pill, Clock, MapPin, History, Pipette, SprayCan, Hand, ChevronDown, Zap, CheckCheck, Flame, Trophy } from 'lucide-react';
import TasksList from '../TasksList';
import InjectionSiteSelector from '../../common/InjectionSiteSelector';
import InjectionHistoryModal from '../../common/InjectionHistoryModal';
import { penColors } from '../../../utils/penColors';
import { getChromeGradient } from '../../../utils/recon';
import { getInjectionHistory } from '../../../utils/injectionTracking';
import { debugLog } from '../../../utils/debugMode';
import { isInjectionSiteTrackingEnabled } from '../../../utils/injectionSiteSettings';
import ExpandableTooltip from '../../ui/ExpandableTooltip';
import ModernTooltip from '../../ui/ModernTooltip';
import { WIDGET_TOOLTIPS } from '../../../utils/widgetTooltips';
import { getTaskStreak, getTaskStreakData } from '../../../utils/taskStreak';

const DeliveryIcon = ({ task, theme }) => {
  // Handle peptide delivery methods
  if (task.type === 'peptide') {
    if (task.deliveryMethod === 'pen') {
      return <PenTool size={12} className="sm:w-3.5 sm:h-3.5" style={{ color: theme.textLight }} />;
    }
    if (task.deliveryMethod === 'syringe' || task.deliveryMethod === 'pipette') {
      return <Pipette size={12} className="sm:w-3.5 sm:h-3.5" style={{ color: theme.textLight }} />;
    }
    if (task.deliveryMethod === 'nasal') {
      return <SprayCan size={12} className="sm:w-3.5 sm:h-3.5" style={{ color: theme.textLight }} />;
    }
    if (task.deliveryMethod === 'topical') {
      return <Hand size={12} className="sm:w-3.5 sm:h-3.5" style={{ color: theme.textLight }} />;
    }
  }
  
  // Handle supplement delivery methods
  if (task.type === 'supplement') {
    const delivery = String(task.delivery || task.deliveryMethod || '').toLowerCase();
    if (delivery === 'injection' || delivery === 'syringe') {
      return <Pipette size={12} className="sm:w-3.5 sm:h-3.5" style={{ color: theme.textLight }} />;
    }
    if (delivery === 'powder') {
      return <Beaker size={12} className="sm:w-3.5 sm:h-3.5" style={{ color: theme.textLight }} />;
    }
    if (delivery === 'pill' || delivery === 'oral') {
      return <Pill size={12} className="sm:w-3.5 sm:h-3.5" style={{ color: theme.textLight }} />;
    }
  }
  
  return null;
};

const getResolvedPenColor = (penColor) => {
  if (!penColor) return '#9ca3af';
  const raw = String(penColor || '').trim();
  // Type safety: ensure raw is a string before calling startsWith
  if (typeof raw !== 'string' || !raw) return '#9ca3af';
  const isHex = raw.startsWith('#');
  if (isHex) return raw;
  
  // Find color by name in penColors array
  const foundColor = penColors.find(color => 
    color.name.toLowerCase() === raw.toLowerCase()
  );
  
  
  return foundColor ? foundColor.hex : '#9ca3af';
};

const BookmarkRibbon = ({ theme }) => (
  <div 
    className="absolute -top-1 right-16 w-6 h-10 pointer-events-none hidden"
    style={{ 
      zIndex: 1,
      filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.15))'
    }}
  >
    <div 
      className="w-full h-full"
      style={{
        backgroundColor: theme.primary,
        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 82%, 0 100%)',
      }}
    >
        <div className="absolute inset-0 bg-gradient-to-b from-black/5 to-transparent" />
        <div className="absolute inset-0 opacity-20" style={{ 
            backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)',
            backgroundSize: '3px 3px'
        }} />
    </div>
  </div>
);

/* ── Streak popover shown when chip is clicked ────────────────────────── */
const StreakPopover = ({ data, theme, onClose }) => {
  const { streak, lastRewardDate, streakStartDate } = data;

  const fmtDate = (key) => {
    if (!key) return '—';
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Mini calendar dots — last 7 days relative to lastRewardDate (or today)
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const refKey = lastRewardDate || todayKey;
  const dots = Array.from({ length: 7 }, (_, i) => {
    const [y, m, d] = refKey.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() - (6 - i));
    const key = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
    const dayLabel = dt.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 1);
    const filled = streakStartDate && lastRewardDate && key >= streakStartDate && key <= lastRewardDate;
    return { key, dayLabel, filled };
  });

  return (
    <>
      {/* Invisible overlay to catch outside clicks */}
      <div className="fixed inset-0 z-[90]" onClick={onClose} />
      <div
        className="absolute top-full right-0 mt-2 z-[100] w-64 rounded-2xl border shadow-2xl overflow-hidden"
        style={{
          backgroundColor: theme.isDark ? 'rgba(15,23,42,0.97)' : theme.cardBackground || '#fff',
          borderColor: `${theme.primary}35`,
          boxShadow: `0 8px 32px -8px rgba(0,0,0,0.28), 0 0 0 1px ${theme.primary}18`,
        }}
      >
        {/* Header */}
        <div
          className="px-4 pt-4 pb-3 text-center"
          style={{
            background: theme.isDark
              ? `linear-gradient(135deg, ${theme.primary}22 0%, transparent 100%)`
              : `linear-gradient(135deg, ${theme.primary}10 0%, transparent 100%)`,
          }}
        >
          <div className="flex justify-center mb-1">
            <Flame size={30} strokeWidth={2} style={{ color: theme.primary }} />
          </div>
          <div className="text-3xl font-black tabular-nums leading-none" style={{ color: theme.text }}>
            {streak}
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-widest mt-0.5" style={{ color: theme.textLight }}>
            day streak
          </div>
        </div>

        {/* Calendar dots */}
        <div className="px-4 py-3 border-t" style={{ borderColor: `${theme.primary}18` }}>
          <p className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: theme.textLight }}>
            Last 7 days
          </p>
          <div className="flex justify-between gap-1">
            {dots.map(({ key, dayLabel, filled }) => (
              <div key={key} className="flex flex-col items-center gap-1">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200"
                  style={{
                    backgroundColor: filled ? theme.primary : (theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                    boxShadow: filled ? `0 2px 8px ${theme.primary}45` : 'none',
                  }}
                >
                  {filled && <Check size={12} strokeWidth={3} style={{ color: '#fff' }} />}
                </div>
                <span className="text-[9px] font-medium" style={{ color: filled ? theme.primary : theme.textLight }}>
                  {dayLabel}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="px-4 pb-4 space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-[11px]" style={{ color: theme.textLight }}>Streak started</span>
            <span className="text-[11px] font-semibold" style={{ color: theme.text }}>{fmtDate(streakStartDate)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[11px]" style={{ color: theme.textLight }}>Last completed</span>
            <span className="text-[11px] font-semibold" style={{ color: theme.text }}>{fmtDate(lastRewardDate)}</span>
          </div>
          {streak >= 3 && (
            <p className="text-[11px] text-center pt-1" style={{ color: theme.primary }}>
              {streak >= 7 ? '🔥 You\'re on fire — incredible consistency!' : streak >= 5 ? '⚡ Almost a full week — keep pushing!' : '💪 Building momentum — don\'t stop now!'}
            </p>
          )}
        </div>
      </div>
    </>
  );
};

/* ── Streak chip shown in every header ────────────────────────────────── */
const StreakChip = ({ streak, theme }) => {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);

  if (streak <= 0) return null;

  const handleClick = () => {
    if (!open) setData(getTaskStreakData());
    setOpen((v) => !v);
  };

  return (
    <div className="relative flex-shrink-0">
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-1 px-2 py-0.5 rounded-full border transition-all duration-200 hover:scale-105 active:scale-95"
        style={{
          borderColor: `${theme.primary}45`,
          backgroundColor: open
            ? (theme.isDark ? `${theme.primary}28` : `${theme.primary}20`)
            : (theme.isDark ? `${theme.primary}18` : `${theme.primary}12`),
          boxShadow: open ? `0 0 0 2px ${theme.primary}30` : 'none',
        }}
        title="View your streak data"
        aria-expanded={open}
      >
        <Flame size={12} strokeWidth={2.5} style={{ color: theme.primary }} />
        <span className="text-[11px] font-bold tabular-nums" style={{ color: theme.text }}>
          {streak}
        </span>
      </button>
      {open && data && (
        <StreakPopover data={data} theme={theme} onClose={() => setOpen(false)} />
      )}
    </div>
  );
};

/* ── Compact all-done banner that slides in below tasks ───────────────── */
const AllDoneBanner = ({ streak, theme, visible }) => (
  <div
    className="overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
    style={{ maxHeight: visible ? '96px' : '0px', opacity: visible ? 1 : 0 }}
  >
    <div
      className="mx-2 mb-2 mt-1 rounded-xl px-4 py-3 flex items-center gap-3 border"
      style={{
        background: theme.isDark
          ? `linear-gradient(120deg, ${theme.primary}20 0%, rgba(15,23,42,0.6) 100%)`
          : `linear-gradient(120deg, ${theme.primary}12 0%, ${theme.cardBackground || '#fff'} 100%)`,
        borderColor: `${theme.primary}35`,
        boxShadow: `0 4px 18px -6px ${theme.primary}30`,
      }}
    >
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center all-done-trophy"
        style={{ backgroundColor: `${theme.primary}20` }}
      >
        <Trophy size={16} strokeWidth={2} style={{ color: theme.primary }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-bold leading-tight" style={{ color: theme.text }}>
          All done for today
        </p>
        <p className="text-[10px] leading-tight mt-0.5" style={{ color: theme.textLight }}>
          {streak > 1 ? `${streak}-day streak — keep it up!` : 'Great start — come back tomorrow!'}
        </p>
      </div>
      {streak > 0 && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <Flame size={15} strokeWidth={2.5} style={{ color: theme.primary }} className="all-done-flame" />
          <span className="text-base font-black tabular-nums" style={{ color: theme.primary }}>{streak}</span>
        </div>
      )}
    </div>
    <style>{`
      .all-done-trophy { animation: allDoneBounce 0.55s cubic-bezier(0.34,1.56,0.64,1) 0.1s both; }
      .all-done-flame  { animation: allDoneFlame  0.7s cubic-bezier(0.34,1.56,0.64,1) 0.25s both; }
      @keyframes allDoneBounce {
        0%   { transform: scale(0.5) rotate(-15deg); opacity: 0; }
        70%  { transform: scale(1.15) rotate(5deg); opacity: 1; }
        100% { transform: scale(1) rotate(0deg); }
      }
      @keyframes allDoneFlame {
        0%   { transform: scale(0.6) translateY(4px); opacity: 0; }
        60%  { transform: scale(1.2) translateY(-2px); opacity: 1; }
        100% { transform: scale(1) translateY(0); }
      }
    `}</style>
  </div>
);

const TasksWidget = ({ widget, theme, tasks, onToggle, onOpenQuickStart, onOpenFullSetup }) => {
  const [injectionTask, setInjectionTask] = useState(null);
  const [showInjectionHistory, setShowInjectionHistory] = useState(false);
  const [showStartOptions, setShowStartOptions] = useState(false);
  const clickTimers = useRef({});

  // Streak state — syncs from storage via global event
  const [streak, setStreak] = useState(() => getTaskStreak());
  useEffect(() => {
    const onUpdate = (e) => {
      const n = e.detail?.streak;
      setStreak(typeof n === 'number' ? n : getTaskStreak());
    };
    window.addEventListener('tpp:task-streak-updated', onUpdate);
    return () => window.removeEventListener('tpp:task-streak-updated', onUpdate);
  }, []);
  
  // Check if there are any injection tasks
  const hasInjectionTasks = useMemo(() => {
    if (!tasks) return false;
    return tasks.some(task => {
      const deliveryMethod = task.deliveryMethod || task.delivery;
      return deliveryMethod === 'syringe' || deliveryMethod === 'pipette' || deliveryMethod === 'pen' || deliveryMethod === 'injection';
    });
  }, [tasks]);
  
  debugLog('🎯 TasksWidget received:', { 
    tasksCount: tasks?.length || 0, 
    tasks: tasks?.slice(0, 3).map(t => ({ 
      name: t.name, 
      type: t.type, 
      deliveryMethod: t.deliveryMethod, 
      penColor: t.penColor,
      dose: t.dose,
      unit: t.unit
    })) || []
  }, 'tasks');
  
  
  const { showCompleted, groupByTime } = widget.settings;

  // Whether every task for today is checked off
  const allDone = useMemo(() => {
    const all = tasks || [];
    return all.length > 0 && all.every((t) => t.completed === true);
  }, [tasks]);
  
  // Filter tasks based on settings
  let filteredTasks = tasks || [];
  if (!showCompleted) {
    filteredTasks = filteredTasks.filter(task => !task.completed);
  }
  
  debugLog('🎯 TasksWidget filtered:', { 
    filteredCount: filteredTasks.length,
    showCompleted,
    willUseCompactLayout: filteredTasks.length <= 3
  }, 'tasks');

  // If no tasks, show compact empty state
  if (filteredTasks.length === 0) {
    return (
      <div className="h-full flex flex-col relative">
        <BookmarkRibbon theme={theme} />
      <div className={`px-4 py-3 relative z-10 widget-separator`} style={{ 
        borderColor: theme.isDark ? 'transparent' : 'rgba(47, 59, 58, 0.15)', 
        background: theme.isDark 
          ? `linear-gradient(135deg, ${theme.primary}30, rgba(255,255,255,0.05))` 
          : `linear-gradient(135deg, ${theme.primary}15, rgba(255,255,255,0.6))`,
        backdropFilter: 'blur(8px)'
      }}>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xl font-bold flex items-center gap-2 truncate tracking-tight" style={{ color: theme.text }}>
              Today's Research
              <div className="p-1 rounded-md" style={{ background: theme.primary, color: '#fff' }}>
                <CheckSquare size={16} className="sm:w-4 sm:h-4 flex-shrink-0" />
              </div>
            </h3>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <StreakChip streak={streak} theme={theme} />
              <ExpandableTooltip content={WIDGET_TOOLTIPS.tasks} theme={theme} />
              {hasInjectionTasks && (
                <ModernTooltip text="Site History" position="top">
                  <button
                    onClick={() => setShowInjectionHistory(true)}
                    className="rounded-full flex items-center justify-center action-button-hover transition-colors"
                    style={{ 
                      color: '#ffffff',
                      backgroundColor: theme.primary,
                      width: '28px',
                      height: '28px',
                      padding: 0,
                      border: 'none',
                      boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.15), inset 0 1px 2px rgba(0, 0, 0, 0.1)'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                  >
                    <History size={14} strokeWidth={2.5} style={{ color: '#ffffff' }} />
                  </button>
                </ModernTooltip>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex-1 p-2 sm:p-4 flex flex-col items-center justify-center gap-3 min-h-0 overflow-hidden">
          {!showStartOptions ? (
            <>
              <p className="text-sm text-center px-2" style={{ color: theme.textLight }}>
                No research scheduled for today
              </p>
              <button
                type="button"
                onClick={() => (onOpenQuickStart || onOpenFullSetup) && setShowStartOptions(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
                style={{
                  color: theme.primary,
                  backgroundColor: theme.isDark ? `${theme.primary}20` : `${theme.primary}15`,
                  border: `1px solid ${theme.primary}40`
                }}
              >
                Let&apos;s Start
                <ChevronDown size={14} />
              </button>
            </>
          ) : (
            <div className="w-full max-w-[260px] space-y-2 overflow-y-auto">
              {onOpenQuickStart && (
                <button
                  type="button"
                  onClick={() => { setShowStartOptions(false); onOpenQuickStart(); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
                  style={{
                    color: theme.text,
                    backgroundColor: theme.isDark ? '#1f2937' : theme.secondary,
                    border: `1px solid ${theme.border}`
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : 'rgba(0,0,0,0.06)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = theme.isDark ? '#1f2937' : theme.secondary; }}
                >
                  <Zap size={18} style={{ color: theme.primary }} fill={theme.primary} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">Quick Start Protocol</div>
                    <div className="text-[10px] opacity-60">30 sec, add details later</div>
                  </div>
                </button>
              )}
              {onOpenFullSetup && (
                <button
                  type="button"
                  onClick={() => { setShowStartOptions(false); onOpenFullSetup(); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
                  style={{
                    color: theme.text,
                    backgroundColor: theme.isDark ? '#1f2937' : theme.secondary,
                    border: `1px solid ${theme.border}`
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : 'rgba(0,0,0,0.06)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = theme.isDark ? '#1f2937' : theme.secondary; }}
                >
                  <CheckCheck size={18} style={{ color: theme.textLight }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">Full Protocol Setup</div>
                    <div className="text-[10px] opacity-60">Complete details</div>
                  </div>
                </button>
              )}
            </div>
          )}
        </div>
        
        <InjectionHistoryModal
          isOpen={showInjectionHistory}
          onClose={() => setShowInjectionHistory(false)}
          theme={theme}
        />
      </div>
    );
  }

  // If few tasks, show compact layout with modernized display
  if (filteredTasks.length <= 3) {
    return (
      <div className="h-full flex flex-col overflow-hidden relative">
      <BookmarkRibbon theme={theme} />
      <div className={`px-4 py-3 flex-shrink-0 relative z-10 widget-separator`} style={{ borderColor: theme.isDark ? 'transparent' : 'rgba(47, 59, 58, 0.15)', background: theme.isDark ? `linear-gradient(135deg, ${theme.primary}15, transparent)` : `linear-gradient(135deg, ${theme.primary}08, ${theme.primary}03)` }}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-bold flex items-center gap-2 truncate" style={{ color: theme.text }}>
            Today's Research
            <CheckSquare size={16} className="sm:w-5 sm:h-5 flex-shrink-0" style={{ color: theme.primary }} />
          </h3>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <StreakChip streak={streak} theme={theme} />
            <ExpandableTooltip content={WIDGET_TOOLTIPS.tasks} theme={theme} />
            {hasInjectionTasks && (
              <ModernTooltip text="Site History" position="top">
                <button
                  onClick={() => setShowInjectionHistory(true)}
                  className="rounded-full flex items-center justify-center action-button-hover transition-colors"
                  style={{ 
                    color: '#ffffff',
                    backgroundColor: theme.primary,
                    width: '28px',
                    height: '28px',
                    padding: 0,
                    border: 'none',
                    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.15), inset 0 1px 2px rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                >
                  <History size={14} strokeWidth={2.5} style={{ color: '#ffffff' }} />
                </button>
              </ModernTooltip>
            )}
          </div>
        </div>
      </div>
        
        <div className="flex-1 p-2 sm:p-4 overflow-hidden overflow-y-auto pr-1 sm:pr-2">
          <TasksList
            tasks={filteredTasks}
            theme={theme}
            onToggle={onToggle}
            setInjectionTask={setInjectionTask}
          />
          <AllDoneBanner streak={streak} theme={theme} visible={allDone} />
        </div>
        
        <InjectionSiteSelector
          taskName={injectionTask?.name}
          task={injectionTask}
          onConfirm={(injectionSite) => {
            debugLog('💉 TasksWidget injection confirmed:', injectionSite, 'tasks');
            const taskToToggle = injectionTask;
            setInjectionTask(null);
            if (taskToToggle) onToggle(taskToToggle);
          }}
          onCancel={() => {
            debugLog('💉 TasksWidget injection cancelled', null, 'tasks');
            setInjectionTask(null);
          }}
          theme={theme}
          isVisible={!!injectionTask}
        />
        
        <InjectionHistoryModal
          isOpen={showInjectionHistory}
          onClose={() => setShowInjectionHistory(false)}
          theme={theme}
        />
      </div>
    );
  }

  // Default full layout for many tasks
  return (
    <div className="h-full flex flex-col overflow-hidden relative">
      <BookmarkRibbon theme={theme} />
      <div className={`px-4 py-3 flex-shrink-0 relative z-10 widget-separator`} style={{ borderColor: theme.isDark ? 'transparent' : 'rgba(47, 59, 58, 0.15)', background: theme.isDark ? `linear-gradient(135deg, ${theme.primary}15, transparent)` : `linear-gradient(135deg, ${theme.primary}08, ${theme.primary}03)` }}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-bold flex items-center gap-2 truncate" style={{ color: theme.text }}>
            {widget.title}
            <CheckSquare size={16} className="sm:w-5 sm:h-5 flex-shrink-0" style={{ color: theme.primary }} />
          </h3>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <StreakChip streak={streak} theme={theme} />
            <ExpandableTooltip content={WIDGET_TOOLTIPS.tasks} theme={theme} />
            {hasInjectionTasks && (
              <ModernTooltip text="Site History" position="top">
                <button
                  onClick={() => setShowInjectionHistory(true)}
                  className="rounded-full flex items-center justify-center action-button-hover transition-colors"
                  style={{ 
                    color: '#ffffff',
                    backgroundColor: theme.primary,
                    width: '28px',
                    height: '28px',
                    padding: 0,
                    border: 'none',
                    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.15), inset 0 1px 2px rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                >
                  <History size={14} strokeWidth={2.5} style={{ color: '#ffffff' }} />
                </button>
              </ModernTooltip>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex-1 p-2 sm:p-4 overflow-hidden overflow-y-auto pr-1 sm:pr-2">
        <div>
          <TasksList 
            tasks={filteredTasks} 
            theme={theme} 
            onToggle={onToggle}
            groupByTime={groupByTime}
            setInjectionTask={setInjectionTask}
          />
          <AllDoneBanner streak={streak} theme={theme} visible={allDone} />
        </div>
        
        <InjectionSiteSelector
          taskName={injectionTask?.name}
          task={injectionTask}
          onConfirm={(injectionSite) => {
            debugLog('💉 TasksWidget injection confirmed:', injectionSite, 'tasks');
            // Close the selector first to prevent multiple clicks
            const taskToToggle = injectionTask;
            setInjectionTask(null);
            // Then toggle the task completion
            if (taskToToggle) {
              onToggle(taskToToggle);
            }
          }}
          onCancel={() => {
            debugLog('💉 TasksWidget injection cancelled', null, 'tasks');
            setInjectionTask(null);
          }}
          theme={theme}
          isVisible={!!injectionTask}
        />
        
        <InjectionHistoryModal
          isOpen={showInjectionHistory}
          onClose={() => setShowInjectionHistory(false)}
          theme={theme}
        />
      </div>
    </div>
  );
};

export default TasksWidget;
