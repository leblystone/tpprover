import React, { useMemo } from 'react';
import { CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';

function useLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

const ComplianceWidget = ({ widget, theme }) => {
  const supplements = useLocal('tpprover_supplements', []);
  const suppDone = useLocal('tpprover_supp_completions', {});

  const complianceData = useMemo(() => {
    // Calculate 7-day compliance
    const days = [...Array(7)].map((_, i) => 
      new Date(Date.now() - (6 - i) * 86400000).toISOString().slice(0, 10)
    );
    
    let planned = 0, done = 0;
    for (const day of days) {
      const weekday = new Date(day).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      for (const s of supplements) {
        if (!s.days?.includes(weekday)) continue;
        if (s.schedule === 'AM') { 
          planned += 1; 
          if (suppDone?.[day]?.[`${s.id}_AM`]) done += 1;
        } else if (s.schedule === 'PM') { 
          planned += 1; 
          if (suppDone?.[day]?.[`${s.id}_PM`]) done += 1;
        } else if (s.schedule === 'BOTH') { 
          planned += 2; 
          if (suppDone?.[day]?.[`${s.id}_AM`]) done += 1;
          if (suppDone?.[day]?.[`${s.id}_PM`]) done += 1;
        }
      }
    }
    
    const compliancePct = planned > 0 ? Math.round((done / planned) * 100) : 0;
    
    // Calculate current streak
    let streak = 0;
    const today = new Date().toISOString().slice(0, 10);
    let checkDate = new Date();
    
    while (streak < 30) { // Max 30 days back
      const dateStr = checkDate.toISOString().slice(0, 10);
      const weekday = checkDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      
      let dayPlanned = 0, dayDone = 0;
      for (const s of supplements) {
        if (!s.days?.includes(weekday)) continue;
        if (s.schedule === 'AM') { 
          dayPlanned += 1; 
          if (suppDone?.[dateStr]?.[`${s.id}_AM`]) dayDone += 1;
        } else if (s.schedule === 'PM') { 
          dayPlanned += 1; 
          if (suppDone?.[dateStr]?.[`${s.id}_PM`]) dayDone += 1;
        } else if (s.schedule === 'BOTH') { 
          dayPlanned += 2; 
          if (suppDone?.[dateStr]?.[`${s.id}_AM`]) dayDone += 1;
          if (suppDone?.[dateStr]?.[`${s.id}_PM`]) dayDone += 1;
        }
      }
      
      if (dayPlanned === 0 || dayDone === dayPlanned) {
        streak++;
      } else {
        break;
      }
      
      checkDate.setDate(checkDate.getDate() - 1);
    }
    
    return { compliancePct, planned, done, streak };
  }, [supplements, suppDone]);

  const getComplianceColor = (pct) => {
    if (pct >= 90) return theme.success;
    if (pct >= 70) return theme.warning;
    return theme.error;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b" style={{ borderColor: theme.border }}>
        <h3 className="text-lg font-semibold" style={{ color: theme.text }}>
          Compliance
        </h3>
      </div>
      
      <div className="flex-1 p-6 flex flex-col items-center justify-center">
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
            7-day compliance
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

        {complianceData.planned > 0 && (
          <div className="mt-4 text-center">
            <div className="text-xs" style={{ color: theme.textLight }}>
              {complianceData.done} of {complianceData.planned} completed this week
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComplianceWidget;
