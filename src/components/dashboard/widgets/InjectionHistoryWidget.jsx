import React, { useState, useEffect } from 'react';
import { Syringe, Clock, Calendar, MapPin } from 'lucide-react';
import { getInjectionHistory, getInjectionStats } from '../../../utils/injectionTracking';

export default function InjectionHistoryWidget({ theme }) {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const injectionHistory = getInjectionHistory();
    const injectionStats = getInjectionStats();
    
    setHistory(injectionHistory);
    setStats(injectionStats);
  }, []);

  const recentHistory = showAll ? history : history.slice(0, 5);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTaskColor = (taskType) => {
    switch (taskType) {
      case 'peptide': return '#8B5CF6';
      case 'supplement': return '#10B981';
      default: return theme.textLight;
    }
  };

  if (!history.length) {
    return (
      <div className="h-full flex flex-col p-4" style={{ backgroundColor: theme.cardBackground }}>
        <div className="flex items-center gap-2 mb-4">
          <Syringe size={20} style={{ color: theme.primary }} />
          <h3 className="text-lg font-semibold" style={{ color: theme.text }}>
            Injection History
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Syringe size={48} style={{ color: theme.textLight, opacity: 0.5 }} />
            <p className="text-sm mt-2" style={{ color: theme.textLight }}>
              No injection history yet
            </p>
            <p className="text-xs mt-1" style={{ color: theme.textLight }}>
              Complete injection tasks to see your history here
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4" style={{ backgroundColor: theme.cardBackground }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Syringe size={20} style={{ color: theme.primary }} />
          <h3 className="text-lg font-semibold" style={{ color: theme.text }}>
            Injection History
          </h3>
        </div>
        {stats && (
          <div className="text-right">
            <div className="text-sm font-medium" style={{ color: theme.text }}>
              {stats.global.totalInjections} total
            </div>
            <div className="text-xs" style={{ color: theme.textLight }}>
              injections recorded
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {recentHistory.map((record, index) => (
          <div
            key={record.id}
            className="p-3 rounded-lg border"
            style={{ 
              borderColor: theme.border,
              backgroundColor: theme.secondary + '20'
            }}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: getTaskColor(record.taskType) }}
                />
                <span className="font-medium text-sm" style={{ color: theme.text }}>
                  {record.taskName}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs" style={{ color: theme.textLight }}>
                <Clock size={12} />
                {formatDate(record.date)}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <MapPin size={14} style={{ color: theme.textLight }} />
              <span className="text-sm" style={{ color: theme.textLight }}>
                {record.injectionSite}
              </span>
            </div>
            
            {record.dose && (
              <div className="text-xs mt-1" style={{ color: theme.textLight }}>
                {record.dose} {record.unit} • {record.deliveryMethod}
              </div>
            )}
          </div>
        ))}
      </div>

      {history.length > 5 && (
        <div className="mt-4 pt-3 border-t" style={{ borderColor: theme.border }}>
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full py-2 px-3 rounded text-sm font-medium transition-all hover:opacity-80"
            style={{
              backgroundColor: theme.primary + '10',
              color: theme.primary,
              border: `1px solid ${theme.primary}30`
            }}
          >
            {showAll ? 'Show Less' : `Show All ${history.length} Injections`}
          </button>
        </div>
      )}
    </div>
  );
}
