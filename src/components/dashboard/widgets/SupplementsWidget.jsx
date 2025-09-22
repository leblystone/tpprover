import React from 'react';
import { Plus, Pill, Syringe, Beaker, Edit, Trash2 } from 'lucide-react';

const SupplementsWidget = ({ 
  widget, 
  theme, 
  supplements = [], 
  onAddSupplement,
  onEditSupplement,
  onDeleteSupplement 
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
    switch (String(delivery || '').toLowerCase()) {
      case 'injection': return <Syringe size={16} style={{ color: theme.textLight }} />;
      case 'powder': return <Beaker size={16} style={{ color: theme.textLight }} />;
      case 'pill':
      default: return <Pill size={16} style={{ color: theme.textLight }} />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b" style={{ borderColor: theme.border }}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold" style={{ color: theme.text }}>
            Supplements
          </h3>
          <button
            onClick={onAddSupplement}
            className="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors hover:bg-gray-50"
            style={{ borderColor: theme.primary, color: theme.primary }}
            title="Add Supplement"
          >
            <Plus size={12} strokeWidth={3} />
          </button>
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
              Add Your First Supplement
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {supplements.map(supplement => (
              <div 
                key={supplement.id} 
                className="p-3 rounded-lg border" 
                style={{ borderColor: theme.border, backgroundColor: theme.secondary }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getDeliveryIcon(supplement.delivery)}
                    
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
                    <button
                      onClick={() => onEditSupplement?.(supplement)}
                      className="p-1 rounded hover:bg-gray-100 transition-colors"
                      style={{ color: theme.textLight }}
                    >
                      <Edit size={14} />
                    </button>
                    
                    <button
                      onClick={() => onDeleteSupplement?.(supplement.id)}
                      className="p-1 rounded hover:bg-red-50 transition-colors text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplementsWidget;
