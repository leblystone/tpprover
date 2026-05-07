import React from 'react';
import { WarningCircle, Clock, Repeat } from '@phosphor-icons/react';

const SchedulingPreview = ({ protocol, theme }) => {
  if (!protocol || !protocol.peptides || protocol.peptides.length === 0) {
    return null;
  }

  const getFrequencyDescription = (frequency) => {
    if (!frequency) return 'Daily';
    
    switch (frequency.type) {
      case 'daily':
        if (frequency.time && Array.isArray(frequency.time) && frequency.time.length > 0) {
          return `Every day (${frequency.time.join(', ')})`;
        }
        return 'Every day';
      case 'weekly':
        const days = frequency.days || [];
        if (days.length === 0) return 'Weekly (no days selected)';
        if (days.length === 7) return 'Every day';
        return `${days.length} days per week (${days.join(', ')})`;
      case 'cycle':
        const onDays = frequency.onDays || 0;
        const offDays = frequency.offDays || 0;
        return `${onDays} days on, ${offDays} days off (cycling)`;
      case 'custom':
        const customDays = frequency.customDays || '';
        return customDays ? `Every ${customDays} days` : 'Every X days';
      default:
        return 'Daily';
    }
  };

  const getTimeDescription = (frequency) => {
    if (!frequency || !frequency.time) return 'AM';
    const times = Array.isArray(frequency.time) ? frequency.time : [frequency.time];
    return times.join(' & ');
  };

  const calculateWeeklyTasks = (peptides) => {
    let totalTasks = 0;
    peptides.forEach(peptide => {
      const freq = peptide.frequency || { type: 'daily' };
      const times = freq.time ? (Array.isArray(freq.time) ? freq.time.length : 1) : 1;
      
      switch (freq.type) {
        case 'daily':
          totalTasks += 7 * times;
          break;
        case 'weekly':
          const days = freq.days || [];
          totalTasks += days.length * times;
          break;
        case 'cycle':
          const onDays = Number(freq.onDays) || 0;
          const offDays = Number(freq.offDays) || 0;
          if (onDays > 0) {
            const cycleLength = onDays + offDays;
            const activeDaysPerWeek = cycleLength > 0 ? (onDays / cycleLength) * 7 : 0;
            totalTasks += Math.round(activeDaysPerWeek * times);
          }
          break;
        case 'custom':
          const customDays = Number(freq.customDays) || 1;
          if (customDays > 0) {
            const tasksPerWeek = (7 / customDays) * times;
            totalTasks += Math.round(tasksPerWeek);
          }
          break;
      }
    });
    return totalTasks;
  };

  const weeklyTasks = calculateWeeklyTasks(protocol.peptides);

  return (
    <div className="rounded-lg p-4 space-y-3" style={{ 
      backgroundColor: theme.isDark ? '#1f2937' : (theme.info + '10'), 
      borderColor: theme.isDark ? theme.border : (theme.info + '40'),
      borderWidth: '1px',
      borderStyle: 'solid'
    }}>
      
      <div className="text-sm space-y-2" style={{ color: theme.text }}>
        <div className="flex items-start gap-2">
          <WarningCircle size={18} weight="duotone" className="mt-0.5 flex-shrink-0" style={{ color: theme.info }} />
          <div>
            <strong>What happens when you start this protocol:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1 text-xs" style={{ color: theme.textLight }}>
              <li>Tasks will appear on your <strong>Dashboard</strong> under "Today's Research"</li>
              <li>Schedule will show in your <strong>Calendar</strong> view</li>
              <li>You'll get <strong>{weeklyTasks} tasks per week</strong> to complete</li>
            </ul>
          </div>
        </div>

        <div className="border-t pt-2" style={{ borderColor: theme.border }}>
          <div className="font-medium mb-2">Daily Schedule:</div>
          {protocol.peptides.map((peptide, index) => (
            <div key={index} className="rounded p-2 mb-2 text-xs" style={{ 
              backgroundColor: theme.isDark ? '#0f172a' : (theme.cardBackground || '#fff'),
              border: theme.isDark ? 'none' : `1px solid ${theme.border}`
            }}>
              <div className="font-medium" style={{ color: theme.text }}>
                {peptide.name}
              </div>
              <div className="flex items-center gap-4 mt-1" style={{ color: theme.textLight }}>
                <div className="flex items-center gap-1">
                  <Repeat size={16} weight="duotone" />
                  <span>{getFrequencyDescription(peptide.frequency)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={16} weight="duotone" />
                  <span>{getTimeDescription(peptide.frequency)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default SchedulingPreview;

