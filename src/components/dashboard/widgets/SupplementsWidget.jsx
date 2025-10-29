import React from 'react';
import { Plus, Pill, Beaker, Edit, Trash2, Lock, Pipette } from 'lucide-react';
import ModernTooltip from '../../ui/ModernTooltip';

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

    if (days.length > 0 && days.length < 7) {
      return `${scheduleText} (${days.join(', ')})`;
    }
    return scheduleText;
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
            <Pill size={20} style={{ color: theme.primary }} />
            <ModernTooltip text="Add" position="top">
              <button
                onClick={onAddSupplement}
                className="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all"
                style={{ borderColor: theme.primary, color: theme.primary }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.isDark ? theme.primary + '30' : theme.primary + '20';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Plus size={12} strokeWidth={3} />
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
              className="px-4 py-2 rounded-lg font-medium transition-colors"
              style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
            >
              <Plus size={16} className="inline mr-2" />
              Add Supplement
            </button>
          </div>
        ) : (
                     <div className="space-y-3">
             {supplements.map(supplement => {
               return (
               <div 
                key={supplement.id} 
                className="p-3 rounded-lg" 
                style={{ backgroundColor: theme.isDark ? '#1f2937' : theme.secondary }}
              >
                 <div className="flex items-start justify-between">
                   <div className="flex items-start gap-3 flex-1">
                     {getDeliveryIcon(supplement.delivery || supplement.deliveryMethod)}
                    
                    <div className="flex-1">
                      <div className="font-medium text-sm" style={{ color: theme.text }}>
                        {supplement.name}
                      </div>
                      
                      <div className="text-xs mt-1" style={{ color: theme.textLight }}>
                        {supplement.dose} {supplement.unit}
                      </div>
                      
                      {showSchedule && (
                        <div className="text-xs mt-1" style={{ color: theme.textLight }}>
                          Schedule: {formatSchedule(supplement)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 ml-2">
                    <ModernTooltip text="Edit" position="top">
                      <button
                        onClick={() => onEditSupplement?.(supplement)}
                        className="p-1 rounded transition-all"
                        style={{ color: theme.textLight }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : theme.border + '40';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <Edit size={14} />
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
