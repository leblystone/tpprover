import React from 'react';
import { Calendar, Clock, Repeat, AlertCircle } from 'lucide-react';

const SchedulingPreview = ({ protocol, theme }) => {
  if (!protocol || !protocol.peptides || protocol.peptides.length === 0) {
    return null;
  }

  const getFrequencyDescription = (frequency) => {
    if (!frequency) return 'Daily';
    
    switch (frequency.type) {
      case 'daily':
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
      default:
        return 'Daily';
    }
  };

  const getTimeDescription = (frequency) => {
    if (!frequency || !frequency.time) return 'Morning';
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
      }
    });
    return totalTasks;
  };

  const weeklyTasks = calculateWeeklyTasks(protocol.peptides);

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3" style={{ backgroundColor: theme.info + '10', borderColor: theme.info + '40' }}>
      <div className="flex items-center gap-2 mb-3">
        <Calendar size={18} style={{ color: theme.info }} />
        <h4 className="font-semibold text-sm" style={{ color: theme.text }}>
          📅 Scheduling Preview
        </h4>
      </div>
      
      <div className="text-sm space-y-2" style={{ color: theme.text }}>
        <div className="flex items-start gap-2">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" style={{ color: theme.info }} />
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
            <div key={index} className="bg-white rounded p-2 mb-2 text-xs" style={{ backgroundColor: theme.white, border: `1px solid ${theme.border}` }}>
              <div className="font-medium" style={{ color: theme.text }}>
                {peptide.name}
              </div>
              <div className="flex items-center gap-4 mt-1" style={{ color: theme.textLight }}>
                <div className="flex items-center gap-1">
                  <Repeat size={12} />
                  <span>{getFrequencyDescription(peptide.frequency)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={12} />
                  <span>{getTimeDescription(peptide.frequency)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-green-50 border border-green-200 rounded p-2 text-xs" style={{ backgroundColor: theme.success + '10', borderColor: theme.success + '40' }}>
          <div className="font-medium" style={{ color: theme.success }}>
            ✅ Ready to Schedule
          </div>
          <div style={{ color: theme.textLight }}>
            This will create {weeklyTasks} tasks per week based on your frequency settings.
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchedulingPreview;

