import React, { useMemo, useState, useEffect } from 'react';
import { CheckCircle, Lightning } from '@phosphor-icons/react';
import { calculateScheduledTasksForDate } from '../../../utils/calendarTasks';
import { getTaskCompletion } from '../../../utils/taskCompletion';
import { generateTaskId } from '../../../utils/taskCompletion';
import { toKey } from '../../../components/calendar/MonthGrid';
import ExpandableTooltip from '../../ui/ExpandableTooltip';
import { WIDGET_TOOLTIPS } from '../../../utils/widgetTooltips';
import { useAppContext } from '../../../context/AppContext';

const ComplianceWidget = ({ widget, theme }) => {
  const { protocols: ctxProtocols, supplements: ctxSupplements, reconItems: ctxReconItems } = useAppContext();
  const protocols = ctxProtocols || [];
  const supplements = ctxSupplements || [];
  const reconItems = ctxReconItems || [];
  const [taskCompletion, setTaskCompletion] = useState(() => getTaskCompletion());
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Listen for task completion changes
  useEffect(() => {
    const handleTaskCompletionChange = () => {
      setTaskCompletion(getTaskCompletion());
      setRefreshTrigger(prev => prev + 1);
    };

    window.addEventListener('tpp:task-completion-changed', handleTaskCompletionChange);
    
    // Also refresh periodically to catch localStorage changes from other tabs
    const interval = setInterval(() => {
      setTaskCompletion(getTaskCompletion());
    }, 5000); // Check every 5 seconds

    return () => {
      window.removeEventListener('tpp:task-completion-changed', handleTaskCompletionChange);
      clearInterval(interval);
    };
  }, []);

  const complianceData = useMemo(() => {
    // Calculate 30-day compliance
    const days = [...Array(30)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return d;
    });
    
    let totalPlanned = 0, totalDone = 0;
    const dailyStats = [];
    
    // Process each of the last 30 days
    for (const day of days) {
      const dateKey = toKey(day);
      
      // Calculate what was scheduled for this day (protocols + supplements)
      const scheduledData = calculateScheduledTasksForDate(day, protocols, supplements, reconItems);
      
      let dayPlanned = 0;
      let dayDone = 0;
      
      // Count all scheduled tasks (peptides and supplements) across all time slots
      Object.keys(scheduledData.bySlot || {}).forEach(timeSlot => {
        const slot = scheduledData.bySlot[timeSlot];
        
        // Process peptides
        if (slot.peptides && Array.isArray(slot.peptides)) {
          slot.peptides.forEach(pep => {
            const task = {
              type: 'peptide',
              name: pep.name || 'Peptide',
              dose: pep.dose || '',
              unit: pep.unit || '',
              time: timeSlot,
              protocolId: pep.protocolId,
              peptideId: pep.peptideId
            };
            const taskId = generateTaskId(task);
            dayPlanned++;
            
            // Check if completed
            if (taskCompletion[dateKey]?.[timeSlot]?.[taskId]) {
              dayDone++;
            }
          });
        }
        
        // Process supplements
        if (slot.supplements && Array.isArray(slot.supplements)) {
          slot.supplements.forEach(supp => {
            const task = {
              type: 'supplement',
              name: supp.name || 'Supplement',
              dose: supp.dose || '',
              unit: supp.unit || '',
              time: timeSlot
            };
            const taskId = generateTaskId(task);
            dayPlanned++;
            
            // Check if completed
            if (taskCompletion[dateKey]?.[timeSlot]?.[taskId]) {
              dayDone++;
            }
          });
        }
      });
      
      totalPlanned += dayPlanned;
      totalDone += dayDone;
      
      dailyStats.push({
        date: dateKey,
        planned: dayPlanned,
        done: dayDone,
        completed: dayPlanned === 0 || dayDone === dayPlanned
      });
    }
    
    const compliancePct = totalPlanned > 0 ? Math.round((totalDone / totalPlanned) * 100) : 0;
    
    // Calculate current streak (consecutive days with 100% completion or no tasks)
    let streak = 0;
    for (let i = dailyStats.length - 1; i >= 0; i--) {
      if (dailyStats[i].completed) {
        streak++;
      } else {
        break;
      }
    }
    
    return { 
      compliancePct, 
      planned: totalPlanned, 
      done: totalDone, 
      streak,
      hasData: totalPlanned > 0,
      dailyStats
    };
  }, [protocols, supplements, reconItems, taskCompletion, refreshTrigger]);

  const getComplianceColor = (pct) => {
    if (pct >= 90) return theme.primary;
    if (pct >= 70) return theme.isDark ? 'rgba(217, 167, 60, 0.85)' : '#d97706';
    return theme.isDark ? 'rgba(197, 130, 100, 0.9)' : '#b5684a';
  };

  const last7 = complianceData.dailyStats?.slice(-7) || [];
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 widget-separator" style={{ borderColor: theme.isDark ? 'transparent' : 'rgba(47, 59, 58, 0.4)' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold flex items-center gap-2" style={{ color: theme.text }}>
            Research Consistency
            <CheckCircle size={20} weight="duotone" style={{ color: theme.primary }} />
          </h3>
          <div className="flex items-center gap-2">
            <ExpandableTooltip content={WIDGET_TOOLTIPS.compliance} theme={theme} />
          </div>
        </div>
      </div>
      
      {!complianceData.hasData ? (
        <div className="flex-1 p-4 flex flex-col items-center justify-center text-center">
          <div className="mb-3">
            <CheckCircle size={32} style={{ color: theme.textLight, opacity: 0.5 }} />
          </div>
          <div className="text-sm font-medium mb-1" style={{ color: theme.text }}>
            No data to track
          </div>
          <div className="text-xs px-2" style={{ color: theme.textLight }}>
            Start a protocol or add supplements to track your research consistency
          </div>
        </div>
      ) : (
        <div className="flex-1 p-4 flex flex-col justify-center">
          {/* Top row: percentage + streak */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <div 
                className="text-2xl lg:text-xl font-bold" 
                style={{ color: getComplianceColor(complianceData.compliancePct) }}
              >
                {complianceData.compliancePct}%
              </div>
              <div className="text-xs" style={{ color: theme.textLight }}>
                30-day compliance
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ backgroundColor: theme.primary + '10' }}>
              <Lightning size={14} weight="fill" style={{ color: theme.primary }} />
              <span className="text-sm font-bold" style={{ color: theme.primary }}>
                {complianceData.streak}
              </span>
              <span className="text-xs" style={{ color: theme.textLight }}>
                day streak
              </span>
            </div>
          </div>

          {/* 7-day dot grid */}
          <div className="rounded-lg p-3" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : theme.primary + '08' }}>
            <div className="text-xs font-medium mb-2" style={{ color: theme.textLight }}>
              Last 7 days
            </div>
            <div className="flex items-center justify-between">
              {last7.map((day, i) => {
                const dayDate = new Date(day.date + 'T00:00:00');
                const label = dayLabels[dayDate.getDay() === 0 ? 6 : dayDate.getDay() - 1];
                const hasTasks = day.planned > 0;
                const isComplete = day.completed && hasTasks;
                const isPartial = hasTasks && !day.completed && day.done > 0;

                return (
                  <div key={day.date} className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-medium" style={{ color: theme.textLight }}>
                      {label}
                    </span>
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: !hasTasks
                          ? (theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)')
                          : isComplete
                            ? theme.primary
                            : isPartial
                              ? (theme.isDark ? 'rgba(217, 167, 60, 0.5)' : '#d9770640')
                              : 'transparent',
                        border: !hasTasks
                          ? 'none'
                          : isComplete
                            ? 'none'
                            : `2px solid ${theme.isDark ? 'rgba(197, 130, 100, 0.6)' : '#b5684a60'}`
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplianceWidget;
