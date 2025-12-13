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
    <div 
      className="h-full w-full max-w-full flex flex-col p-2 sm:p-3 md:p-4 rounded-xl overflow-hidden box-border" 
      style={{ 
        backgroundColor: theme.white,
        minWidth: 0,
        width: '100%',
        maxWidth: '100%'
      }}
    >
      <div className="flex items-center justify-between mb-2 sm:mb-3 gap-1 sm:gap-2 min-w-0 w-full">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 overflow-hidden">
          <AlertCircle size={16} className="flex-shrink-0" style={{ color: theme.warning || '#f59e0b' }} />
          <h3 className="text-sm sm:text-base font-semibold truncate min-w-0" style={{ color: theme.text }}>
            Don't Forget
          </h3>
          <span 
            className="text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium flex-shrink-0 whitespace-nowrap"
            style={{ 
              backgroundColor: theme.isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7',
              color: theme.isDark ? '#fbbf24' : '#92400e'
            }}
          >
            {allTasks.length}
          </span>
        </div>
        <div className="flex-shrink-0">
          <ExpandableTooltip content={WIDGET_TOOLTIPS.dont_forget} theme={theme} position="left" />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 space-y-1.5 sm:space-y-2 w-full max-w-full">
        {allTasks.slice(0, 5).map((task) => {
          const IconComponent = task.icon;
          return (
            <button
              key={task.id}
              onClick={() => handleTaskClick(task)}
              className="w-full max-w-full flex items-center gap-1.5 sm:gap-2 md:gap-3 p-1.5 sm:p-2 md:p-3 rounded-lg border transition-all duration-200 hover:shadow-sm text-left group overflow-hidden box-border"
              style={{ 
                borderColor: theme.border,
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                minWidth: 0,
                width: '100%'
              }}
            >
              <div 
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ 
                  backgroundColor: task.type === 'vendor' 
                    ? (theme.isDark ? 'rgba(59, 130, 246, 0.2)' : '#dbeafe')
                    : (theme.isDark ? 'rgba(168, 85, 247, 0.2)' : '#f3e8ff')
                }}
              >
                <IconComponent 
                  size={14} 
                  style={{ 
                    color: task.type === 'vendor'
                      ? (theme.isDark ? '#60a5fa' : '#2563eb')
                      : (theme.isDark ? '#c084fc' : '#7c3aed')
                  }} 
                />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden box-border">
                <div 
                  className="font-medium text-xs sm:text-sm truncate block"
                  style={{ color: theme.text }}
                  title={task.title}
                >
                  {task.title}
                </div>
                <div 
                  className="text-xs truncate block"
                  style={{ color: theme.textLight }}
                  title={task.subtitle}
                >
                  {task.subtitle}
                </div>
              </div>
              <ChevronRight 
                size={14} 
                className="flex-shrink-0 opacity-50 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                style={{ color: theme.textLight }} 
              />
            </button>
          );
        })}
      </div>
      
      {allTasks.length > 5 && (
        <button 
          onClick={onViewAllVendors}
          className="mt-2 sm:mt-3 text-xs sm:text-sm text-center hover:underline transition-all duration-200 flex-shrink-0 w-full"
          style={{ color: theme.primary }}
        >
          View all {allTasks.length} tasks
        </button>
      )}
    </div>
  );
};

export default DontForgetWidget;

