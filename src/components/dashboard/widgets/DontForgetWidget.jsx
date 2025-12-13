import React, { useMemo } from 'react';
import { AlertCircle, Building2, ClipboardCheck, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ExpandableTooltip from '../../ui/ExpandableTooltip';
import { WIDGET_TOOLTIPS } from '../../../utils/widgetTooltips';
import { getProtocolHistory } from '../../../utils/protocolHistory';

/**
 * Don't Forget Widget
 * Shows pending tasks that need user attention:
 * - Incomplete vendor profiles (auto-created stubs)
 * - Protocols that ended without follow-up assessments
 */
const DontForgetWidget = ({ 
  widget, 
  theme, 
  vendors = [], 
  onCompleteVendor,
  onViewAllVendors,
  isReadOnly,
  onUpgrade
}) => {
  const navigate = useNavigate();

  // Get pending vendors (incomplete profiles)
  const pendingVendors = useMemo(() => {
    return vendors.filter(v => v.isStub === true);
  }, [vendors]);

  // Get protocols that ended but need follow-up assessments
  const protocolsNeedingFollowUp = useMemo(() => {
    try {
      const allHistory = getProtocolHistory();
      
      // Filter for ended protocols without follow-up notes
      return allHistory.filter(entry => {
        // Must have an end date (protocol ended)
        if (!entry.endDate) return false;
        
        // Check if there's a follow-up note
        const hasFollowUpNote = entry.notes?.some(note => note.type === 'follow_up');
        
        return !hasFollowUpNote;
      }).map(entry => ({
        id: entry.id,
        protocolId: entry.protocolId,
        name: entry.protocolName || 'Unnamed Protocol',
        endDate: entry.endDate,
        completionStatus: entry.completionStatus
      }));
    } catch (error) {
      console.error('Error getting protocols needing follow-up:', error);
      return [];
    }
  }, []);

  // Combine all tasks
  const allTasks = useMemo(() => {
    const tasks = [];
    
    // Add pending vendors
    pendingVendors.forEach(vendor => {
      tasks.push({
        id: `vendor-${vendor.id}`,
        type: 'vendor',
        title: vendor.name,
        subtitle: 'Complete vendor profile',
        icon: Building2,
        data: vendor,
        priority: 1 // Vendors are medium priority
      });
    });
    
    // Add protocols needing follow-up
    protocolsNeedingFollowUp.forEach(protocol => {
      tasks.push({
        id: `protocol-${protocol.id}`,
        type: 'protocol',
        title: protocol.name,
        subtitle: 'Add follow-up assessment',
        icon: ClipboardCheck,
        data: protocol,
        priority: 0 // Protocol follow-ups are higher priority
      });
    });
    
    // Sort by priority (lower number = higher priority)
    return tasks.sort((a, b) => a.priority - b.priority);
  }, [pendingVendors, protocolsNeedingFollowUp]);

  const handleTaskClick = (task) => {
    if (isReadOnly) {
      onUpgrade?.();
      return;
    }

    if (task.type === 'vendor') {
      onCompleteVendor?.(task.data);
    } else if (task.type === 'protocol') {
      // Navigate to protocols page with history view
      navigate('/app/protocols', { 
        state: { 
          openHistory: true, 
          protocolId: task.data.protocolId,
          historyId: task.data.id 
        } 
      });
    }
  };

  // Don't render if no tasks
  if (allTasks.length === 0) {
    return null;
  }

  return (
    <div className="h-full flex flex-col">
      <div className={`px-4 py-3 ${theme.isDark ? '' : 'border-b'}`} style={{ borderColor: theme.isDark ? 'transparent' : theme.border }}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: theme.text }}>
            Don't Forget
            <AlertCircle size={20} style={{ color: theme.warning || '#f59e0b' }} />
          </h3>
          <div className="flex items-center gap-2">
            <ExpandableTooltip content={WIDGET_TOOLTIPS.dont_forget} theme={theme} />
          </div>
        </div>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto min-h-0 space-y-2">
        {allTasks.slice(0, 5).map((task) => {
          const IconComponent = task.icon;
          return (
            <button
              key={task.id}
              onClick={() => handleTaskClick(task)}
              className="w-full flex items-center gap-2 p-2 rounded-lg border transition-all duration-200 hover:shadow-sm text-left group"
              style={{ 
                borderColor: theme.border,
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)'
              }}
            >
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ 
                  backgroundColor: task.type === 'vendor' 
                    ? (theme.isDark ? 'rgba(59, 130, 246, 0.2)' : '#dbeafe')
                    : (theme.isDark ? 'rgba(168, 85, 247, 0.2)' : '#f3e8ff')
                }}
              >
                <IconComponent 
                  size={16} 
                  style={{ 
                    color: task.type === 'vendor'
                      ? (theme.isDark ? '#60a5fa' : '#2563eb')
                      : (theme.isDark ? '#c084fc' : '#7c3aed')
                  }} 
                />
              </div>
              <div className="min-w-0 flex-1">
                <div 
                  className="font-medium text-sm truncate"
                  style={{ color: theme.text }}
                  title={task.title}
                >
                  {task.title}
                </div>
                <div 
                  className="text-xs truncate"
                  style={{ color: theme.textLight }}
                  title={task.subtitle}
                >
                  {task.subtitle}
                </div>
              </div>
              <ChevronRight 
                size={16} 
                className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: theme.textLight }} 
              />
            </button>
          );
        })}
      </div>
      
      {allTasks.length > 5 && (
        <button 
          onClick={onViewAllVendors}
          className="px-4 pb-3 text-sm text-center hover:underline transition-all duration-200"
          style={{ color: theme.primary }}
        >
          View all {allTasks.length} tasks
        </button>
      )}
    </div>
  );
};

export default DontForgetWidget;

