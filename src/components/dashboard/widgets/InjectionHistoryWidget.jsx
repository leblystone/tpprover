import React, { useState, useEffect } from 'react';
import { Clock, Calendar, MapPin, Pipette } from 'lucide-react';
import { getInjectionHistory, getInjectionStats } from '../../../utils/injectionTracking';
import { isInjectionSiteTrackingEnabled } from '../../../utils/injectionSiteSettings';
import ExpandableTooltip from '../../ui/ExpandableTooltip';
import { WIDGET_TOOLTIPS } from '../../../utils/widgetTooltips';

export default function InjectionHistoryWidget({ theme }) {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const load = () => {
      setHistory(getInjectionHistory());
      setStats(getInjectionStats());
    };
    load();
    window.addEventListener('tpp:cloud-data-loaded', load);
    window.addEventListener('tpp:task-completion-changed', load);
    return () => {
      window.removeEventListener('tpp:cloud-data-loaded', load);
      window.removeEventListener('tpp:task-completion-changed', load);
    };
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

  // Check if injection site tracking is disabled
  if (!isInjectionSiteTrackingEnabled()) {
    return (
      <div className="h-full flex flex-col p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Pipette size={18} style={{ color: theme.primary }} />
            <h3 className="text-base font-bold" style={{ color: theme.text }}>
              View History
            </h3>
          </div>
          <ExpandableTooltip content={WIDGET_TOOLTIPS.injection_history} theme={theme} position="left" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Pipette size={48} style={{ color: theme.textLight, opacity: 0.5 }} />
            <p className="text-sm mt-2" style={{ color: theme.textLight }}>
              Injection site tracking is disabled
            </p>
            <p className="text-xs mt-1" style={{ color: theme.textLight }}>
              Enable in Settings → App Preferences
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!history.length) {
    return (
      <div className="h-full flex flex-col p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Pipette size={18} style={{ color: theme.primary }} />
            <h3 className="text-base font-bold" style={{ color: theme.text }}>
              View History
            </h3>
          </div>
          <ExpandableTooltip content={WIDGET_TOOLTIPS.injection_history} theme={theme} position="left" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Pipette size={48} style={{ color: theme.textLight, opacity: 0.5 }} />
            <p className="text-sm mt-2" style={{ color: theme.textLight }}>
              No research site history yet
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
    <div className="h-full flex flex-col p-4 overflow-hidden">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Pipette size={20} style={{ color: theme.primary }} />
          <h3 className="text-sm font-semibold" style={{ color: theme.text }}>
            View History
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <ExpandableTooltip content={WIDGET_TOOLTIPS.injection_history} theme={theme} position="left" />
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
      </div>

      <div 
        className="flex-1 overflow-y-auto space-y-2 min-h-0" 
        style={{ 
          maxHeight: '100%',
          WebkitOverflowScrolling: 'touch',
          position: 'relative',
          zIndex: 1
        }}
      >
        {recentHistory.map((record, index) => (
          <div
            key={record.id}
            className="p-3 rounded-lg border flex-shrink-0"
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
        <div className="mt-4 pt-3 border-t flex-shrink-0" style={{ borderColor: theme.border }}>
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
