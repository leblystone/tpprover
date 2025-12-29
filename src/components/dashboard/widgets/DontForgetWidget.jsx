import React, { useMemo } from 'react';
import { ClipboardList, Building2, ClipboardCheck, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ExpandableTooltip from '../../ui/ExpandableTooltip';
import { WIDGET_TOOLTIPS } from '../../../utils/widgetTooltips';
import { getProtocolHistory } from '../../../utils/protocolHistory';

/**
 * Action Items Widget
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
            Action Items
            <ClipboardList size={18} style={{ color: theme.primary, opacity: 0.7 }} />
          </h3>
          <div className="flex items-center gap-2">
            <ExpandableTooltip content={WIDGET_TOOLTIPS.dont_forget} theme={theme} />
          </div>
        </div>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto min-h-0 space-y-2.5">
        {allTasks.slice(0, 5).map((task) => {
          const IconComponent = task.icon;
          return (
            <button
              key={task.id}
              onClick={() => handleTaskClick(task)}
              className="w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 text-left group"
              style={{ 
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
                e.currentTarget.style.borderColor = theme.primary;
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';
                e.currentTarget.style.borderColor = theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div 
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ 
                  backgroundColor: task.type === 'vendor' 
                    ? (theme.isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)')
                    : (theme.isDark ? 'rgba(168, 85, 247, 0.15)' : 'rgba(168, 85, 247, 0.1)')
                }}
              >
                <IconComponent 
                  size={18} 
                  style={{ 
                    color: task.type === 'vendor'
                      ? (theme.isDark ? '#60a5fa' : '#3b82f6')
                      : (theme.isDark ? '#c084fc' : '#a855f7'),
                    opacity: 0.85
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
                  className="text-xs truncate mt-0.5"
                  style={{ color: theme.textLight, opacity: 0.8 }}
                  title={task.subtitle}
                >
                  {task.subtitle}
                </div>
              </div>
              <ChevronRight 
                size={16} 
                className="flex-shrink-0 opacity-0 group-hover:opacity-70 transition-opacity"
                style={{ color: theme.primary }} 
              />
            </button>
          );
        })}
      </div>
      
      {allTasks.length > 5 && (
        <button 
          onClick={onViewAllVendors}
          className="px-4 pb-3 pt-1 text-xs text-center hover:underline transition-all duration-200"
          style={{ color: theme.primary, opacity: 0.8 }}
        >
          View all {allTasks.length} items
        </button>
      )}
    </div>
  );
};

export default DontForgetWidget;

