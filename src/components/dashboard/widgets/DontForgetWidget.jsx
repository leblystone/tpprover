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

  // Group tasks by type
  const groupedTasks = useMemo(() => {
    const groups = [];
    
    // Add protocol follow-ups group (higher priority)
    if (protocolsNeedingFollowUp.length > 0) {
      groups.push({
        type: 'protocol',
        title: 'Protocol Assessments',
        icon: ClipboardCheck,
        items: protocolsNeedingFollowUp.map(protocol => ({
          id: `protocol-${protocol.id}`,
          type: 'protocol',
          title: protocol.name,
          subtitle: 'Add follow-up assessment',
          icon: ClipboardCheck,
          data: protocol
        }))
      });
    }
    
    // Add pending vendors group
    if (pendingVendors.length > 0) {
      groups.push({
        type: 'vendor',
        title: 'Vendor Profiles',
        icon: Building2,
        items: pendingVendors.map(vendor => ({
          id: `vendor-${vendor.id}`,
          type: 'vendor',
          title: vendor.name,
          subtitle: 'Complete vendor profile',
          icon: Building2,
          data: vendor
        }))
      });
    }
    
    return groups;
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
  const totalTasks = groupedTasks.reduce((sum, group) => sum + group.items.length, 0);
  if (totalTasks === 0) {
    return null;
  }

  return (
    <div className="h-full flex flex-col">
      <div className={`px-4 py-3 ${theme.isDark ? '' : 'border-b'}`} style={{ borderColor: theme.isDark ? 'transparent' : theme.border }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold flex items-center gap-2" style={{ color: theme.text }}>
            Action Items
            <ClipboardList size={18} style={{ color: theme.primary, opacity: 0.7 }} />
          </h3>
          <div className="flex items-center gap-2">
            <ExpandableTooltip content={WIDGET_TOOLTIPS.dont_forget} theme={theme} />
          </div>
        </div>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto min-h-0 space-y-4">
        {groupedTasks.map((group, groupIndex) => {
          const GroupIcon = group.icon;
          const displayItems = group.items.slice(0, 5);
          
          return (
            <div key={group.type} className="space-y-2">
              {/* Group Header */}
              <div className="flex items-center gap-2 px-1">
                <GroupIcon 
                  size={14} 
                  style={{ color: theme.primary, opacity: 0.7 }} 
                />
                <h4 
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: theme.textLight, opacity: 0.7 }}
                >
                  {group.title}
                </h4>
                <span 
                  className="text-xs font-medium px-1.5 py-0.5 rounded"
                  style={{ 
                    color: theme.primary,
                    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                  }}
                >
                  {group.items.length}
                </span>
              </div>
              
              {/* Group Items */}
              <div className="space-y-2">
                {displayItems.map((task) => {
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
                          backgroundColor: theme.isDark 
                            ? 'rgba(255,255,255,0.08)' 
                            : 'rgba(0,0,0,0.04)'
                        }}
                      >
                        <IconComponent 
                          size={18} 
                          style={{ 
                            color: theme.primary,
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
            </div>
          );
        })}
      </div>
      
      {totalTasks > 5 && (
        <button 
          onClick={onViewAllVendors}
          className="px-4 pb-3 pt-1 text-xs text-center hover:underline transition-all duration-200"
          style={{ color: theme.primary, opacity: 0.8 }}
        >
          View all {totalTasks} items
        </button>
      )}
    </div>
  );
};

export default DontForgetWidget;

