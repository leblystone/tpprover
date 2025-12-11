import React, { useMemo, useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import { calculateScheduledTasksForDate } from '../../../utils/calendarTasks';
import { getTaskCompletion } from '../../../utils/taskCompletion';
import { generateTaskId } from '../../../utils/taskCompletion';
import { toKey } from '../../../components/calendar/MonthGrid';

function useLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

const ComplianceWidget = ({ widget, theme }) => {
  const protocols = useLocal('tpprover_protocols', []);
  const supplements = useLocal('tpprover_supplements', []);
  const reconItems = useLocal('tpprover_recon_items', []);
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
      hasData: totalPlanned > 0
    };
  }, [protocols, supplements, reconItems, taskCompletion, refreshTrigger]);

  const getComplianceColor = (pct) => {
    if (pct >= 90) return theme.success;
    if (pct >= 70) return theme.warning;
    return theme.error;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b" style={{ borderColor: theme.border }}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color: theme.text }}>
            Research Consistency
          </h3>
          <CheckCircle size={20} style={{ color: theme.primary }} />
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
        <div className="flex-1 p-4 flex flex-col items-center justify-center">
          <div className="text-center mb-4">
            <div className="flex items-center justify-center mb-2">
              <CheckCircle size={24} style={{ color: getComplianceColor(complianceData.compliancePct) }} />
            </div>
            
            <div 
              className="text-3xl font-bold mb-1" 
              style={{ color: getComplianceColor(complianceData.compliancePct) }}
            >
              {complianceData.compliancePct}%
            </div>
            
            <div className="text-sm" style={{ color: theme.textLight }}>
              30-day compliance
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold mb-1" style={{ color: theme.primary }}>
              {complianceData.streak}
            </div>
            <div className="text-xs" style={{ color: theme.textLight }}>
              day streak
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplianceWidget;
