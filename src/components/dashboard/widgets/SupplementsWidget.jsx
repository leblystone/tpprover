import React from 'react';
import { Plus, Pill, Beaker, Edit, Lock, Pipette } from 'lucide-react';
import ModernTooltip from '../../ui/ModernTooltip';
import ExpandableTooltip from '../../ui/ExpandableTooltip';
import { WIDGET_TOOLTIPS } from '../../../utils/widgetTooltips';

const SupplementsWidget = ({ 
  widget, 
  theme, 
  supplements = [], 
  onAddSupplement,
  onEditSupplement,
  onDeleteSupplement,
  isReadOnly = false,
  onUpgrade
}) => {
  const { showSchedule = true } = widget.settings;

  const formatSchedule = (supplement) => {
    const schedule = Array.isArray(supplement.schedule) ? supplement.schedule : [];
    const days = Array.isArray(supplement.days) ? supplement.days : [];

    if (schedule.length === 0) return 'Not set';

    let scheduleText = '';
    if (schedule.includes('AM') && schedule.includes('PM')) {
      scheduleText = 'AM/PM';
    } else if (schedule.length > 0) {
      scheduleText = schedule[0];
    }

    // If specific days are selected, show them
    if (days.length > 0 && days.length < 7) {
      return `${scheduleText} (${days.join(', ')})`;
    }
    // If no days selected (daily schedule), add "Daily"
    return `${scheduleText} Daily`;
  };

  const formatDateRange = (supplement) => {
    if (!supplement.startDate && !supplement.endDate) return null;
    
    const formatDate = (dateStr) => {
      if (!dateStr) return null;
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const start = formatDate(supplement.startDate);
    const end = formatDate(supplement.endDate);

    if (start && end) {
      return `${start} - ${end}`;
    } else if (start) {
      return start;
    } else if (end) {
      return end;
    }
    return null;
  };

  const getDeliveryIcon = (delivery) => {
    const deliveryLower = String(delivery || 'oral').toLowerCase();
    switch (deliveryLower) {
      case 'injection':
      case 'syringe':
        return <Pipette size={16} style={{ color: theme.textLight }} />;
      case 'powder':
        return <Beaker size={16} style={{ color: theme.textLight }} />;
      case 'oral':
      case 'pill':
      default:
        return <Pill size={16} style={{ color: theme.textLight }} />;
    }
  };

  return (
    <div className="relative h-full flex flex-col">
      <div className={`px-4 py-3 ${theme.isDark ? '' : 'border-b'}`} style={{ borderColor: theme.isDark ? 'transparent' : theme.border }}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color: theme.text }}>
            Supplements
          </h3>
          <div className="flex items-center gap-2">
            <ExpandableTooltip content={WIDGET_TOOLTIPS.supplements} theme={theme} />
            <Pill size={20} style={{ color: theme.primary }} />
            <ModernTooltip text="Add" position="top">
              <button
                onClick={onAddSupplement}
                className="rounded-full flex items-center justify-center action-button-hover transition-colors"
                style={{ 
                  color: '#ffffff',
                  backgroundColor: theme.primary,
                  width: '28px',
                  height: '28px',
                  padding: 0,
                  border: 'none',
                  boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.15), inset 0 1px 2px rgba(0, 0, 0, 0.1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                <Plus size={14} strokeWidth={3.5} style={{ color: '#ffffff' }} />
              </button>
            </ModernTooltip>
          </div>
        </div>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto">
        {supplements.length === 0 ? (
          <div className="text-center py-8">
            <div className="flex items-center justify-center mb-4">
              <Pill size={24} style={{ color: theme.textLight }} />
            </div>
            <p className="text-sm mb-4" style={{ color: theme.textLight }}>
              No supplements tracked yet
            </p>
            <button
              onClick={onAddSupplement}
              className="px-4 py-2 rounded-lg font-medium action-button-hover"
              style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
            >
              <Plus size={16} className="inline mr-2 icon-hover" />
              <span className="text-hover">Add Supplement</span>
            </button>
          </div>
        ) : (
                     <div className="space-y-3">
             {supplements.map(supplement => {
               return (
               <div 
                 key={supplement.id} 
                className="p-3 rounded-lg supplement-card-hover" 
                style={{ backgroundColor: theme.isDark ? '#1f2937' : theme.secondary }}
               >
                 <div className="flex items-start justify-between gap-3">
                   <div className="flex items-start gap-3 flex-1 min-w-0">
                     {getDeliveryIcon(supplement.delivery || supplement.deliveryMethod)}
                    
                    <div className="flex-1 min-w-0">
                      {/* Name */}
                      <div className="font-medium text-sm mb-1" style={{ color: theme.text }}>
                        {supplement.name}
                      </div>
                      
                      {/* Two column layout */}
                      <div className="grid grid-cols-2 gap-3">
                        {/* Left column: Dosage and Date */}
                        <div>
                          <div className="text-xs" style={{ color: theme.textLight }}>
                            {supplement.dose} {supplement.unit}
                          </div>
                          {formatDateRange(supplement) && (
                            <div className="text-xs mt-0.5" style={{ color: theme.textLight, opacity: 0.8 }}>
                              {formatDateRange(supplement)}
                            </div>
                          )}
                        </div>
                        
                        {/* Right column: AM/PM chips and schedule */}
                        {showSchedule && (
                          <div>
                            {/* AM/PM chips */}
                            <div className="flex gap-1 mb-0.5">
                              {Array.isArray(supplement.schedule) && supplement.schedule.includes('AM') && (
                                <div className="px-1.5 py-0.5 rounded text-xs font-medium" style={{ 
                                  backgroundColor: theme.primary, 
                                  color: '#ffffff',
                                  fontSize: '10px'
                                }}>
                                  AM
                                </div>
                              )}
                              {Array.isArray(supplement.schedule) && supplement.schedule.includes('PM') && (
                                <div className="px-1.5 py-0.5 rounded text-xs font-medium" style={{ 
                                  backgroundColor: theme.primary, 
                                  color: '#ffffff',
                                  fontSize: '10px'
                                }}>
                                  PM
                                </div>
                              )}
                            </div>
                            {/* Schedule text (Daily or specific days) */}
                            <div className="text-xs" style={{ color: theme.textLight, fontSize: '10px' }}>
                              {supplement.days && supplement.days.length > 0 && supplement.days.length < 7 
                                ? supplement.days.join(', ')
                                : 'Daily'}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <ModernTooltip text="Edit" position="top">
                      <button
                        onClick={() => onEditSupplement?.(supplement)}
                        className="p-1 rounded action-button-hover"
                        style={{ color: theme.textLight }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : theme.border + '40';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <Edit size={14} className="icon-hover" />
                      </button>
                    </ModernTooltip>
                  </div>
                 </div>
               </div>
               );
             })}
           </div>
         )}
       </div>
      
      {/* Lockout Overlay */}
      {isReadOnly && (
        <div className="absolute inset-0 backdrop-blur-sm bg-white/70 flex items-center justify-center z-50 rounded-lg">
          <div className="text-center p-4">
            <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: `${theme.primary}20` }}>
              <Lock size={24} style={{ color: theme.primary }} />
            </div>
            <p className="text-sm font-semibold mb-2" style={{ color: theme.primaryDark }}>
              Trial has ended
            </p>
            <button
              onClick={() => {
                if (onUpgrade) onUpgrade();
                else window.location.href = '/app/account';
              }}
              className="px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90 text-sm"
              style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
            >
              Upgrade
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplementsWidget;
