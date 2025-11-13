import React, { useState, useEffect } from 'react';
import { Settings, Plus, RotateCcw, Save, X } from 'lucide-react';
import ModernTooltip from '../ui/ModernTooltip';
import Modal from '../common/Modal';
import { 
  WIDGET_TYPES, 
  WIDGET_METADATA, 
  WIDGET_SIZES,
  findEmptyPosition,
  resetDashboardLayout 
} from '../../utils/dashboardCustomization';

const DashboardCustomizer = ({ 
  widgets, 
  onUpdateWidgets, 
  theme, 
  isOpen, 
  onClose 
}) => {
  const [activeTab, setActiveTab] = useState('layout');
  const [selectedWidget, setSelectedWidget] = useState(null);
  const [groupBuysEnabled, setGroupBuysEnabled] = useState(true);
  
  // Check if group buys are enabled
  useEffect(() => {
    import('../../utils/featureSettings').then(({ areGroupBuysEnabled }) => {
      setGroupBuysEnabled(areGroupBuysEnabled());
    });
  }, []);

  const handleAddWidget = (type) => {
    const newWidget = {
      id: `${type}_${Date.now()}`,
      type,
      title: WIDGET_METADATA[type].title,
      size: WIDGET_SIZES.MEDIUM,
      position: findEmptyPosition(widgets, WIDGET_SIZES.MEDIUM),
      enabled: true,
      settings: Object.fromEntries(
        WIDGET_METADATA[type].settings.map(setting => [
          setting.key, 
          setting.default
        ])
      )
    };
    
    onUpdateWidgets([...widgets, newWidget]);
  };

  const handleRemoveWidget = (widgetId) => {
    onUpdateWidgets(widgets.filter(w => w.id !== widgetId));
  };

  const handleToggleWidget = (widgetId) => {
    onUpdateWidgets(
      widgets.map(w => 
        w.id === widgetId ? { ...w, enabled: !w.enabled } : w
      )
    );
  };

  const handleResetLayout = () => {
    const defaultWidgets = resetDashboardLayout();
    onUpdateWidgets(defaultWidgets);
  };

  const handleWidgetSettingChange = (widgetId, settingKey, value) => {
    onUpdateWidgets(
      widgets.map(w => 
        w.id === widgetId 
          ? { ...w, settings: { ...w.settings, [settingKey]: value } }
          : w
      )
    );
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Customize Dashboard"
      theme={theme}
      maxWidth="max-w-4xl"
      variant="modern"
    >
      <div className="space-y-6">
        {/* All Widgets */}
        <div>
          <h3 className="text-lg font-medium mb-4" style={{ color: theme.text }}>
            Dashboard Widgets
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(WIDGET_METADATA)
              .filter(([type]) => {
                // Hide group buy widgets if group buys are disabled
                if (type === WIDGET_TYPES.UPCOMING_BUYS && !groupBuysEnabled) {
                  return false;
                }
                return true;
              })
              .map(([type, meta]) => {
              const existingWidget = widgets.find(w => w.type === type);
              const isActive = existingWidget?.enabled;
              const hasWidget = !!existingWidget;
              
              return (
                <div key={type}>
                  <div
                    className={`p-4 border rounded-lg hover:shadow-md transition-all ${
                      isActive ? 'ring-2 ring-opacity-50' : ''
                    }`}
                    style={{ 
                      borderColor: theme.border,
                      ringColor: isActive ? theme.primary : 'transparent',
                      backgroundColor: isActive ? theme.secondary + '20' : 'transparent'
                    }}
                  >
                    <div className="mb-2">
                      <h4 className="font-medium" style={{ color: theme.text }}>
                        {meta.title}
                      </h4>
                      <p className="text-sm" style={{ color: theme.textLight }}>
                        {meta.description}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {hasWidget ? (
                          <button
                            onClick={() => handleToggleWidget(existingWidget.id)}
                            className={`px-3 py-1 text-xs rounded-full transition-colors ${
                              isActive ? 'text-white' : 'text-gray-600'
                            }`}
                            style={{
                              backgroundColor: isActive ? theme.primary : theme.secondary
                            }}
                          >
                            {isActive ? 'Enabled' : 'Disabled'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAddWidget(type)}
                            className="px-3 py-1 text-xs rounded-full text-white transition-colors"
                            style={{ backgroundColor: theme.primary }}
                          >
                            <Plus size={12} className="inline mr-1" />
                            Add
                          </button>
                        )}
                      </div>
                      
                      {hasWidget && (
                        <div className="flex items-center gap-1">
                          <ModernTooltip text="Settings" position="top">
                            <button
                              onClick={() => setSelectedWidget(existingWidget)}
                              className="p-1 rounded hover:bg-gray-100 transition-colors"
                              style={{ color: theme.textLight }}
                            >
                              <Settings size={14} />
                            </button>
                          </ModernTooltip>
                          <ModernTooltip text="Remove" position="top">
                            <button
                              onClick={() => handleRemoveWidget(existingWidget.id)}
                              className="p-1 rounded transition-all"
                              style={{ background: 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)', color: 'white' }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #b5684a 0%, #a35a3f 100%)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)'}
                            >
                              <X size={14} />
                            </button>
                          </ModernTooltip>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reset Layout */}
        <div className="pt-4 border-t" style={{ borderColor: theme.border }}>
          <div className="flex justify-center">
            <button
              onClick={handleResetLayout}
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
              style={{ 
                backgroundColor: theme.error + '15', 
                color: theme.error,
                border: `1px solid ${theme.error}30`
              }}
            >
              <RotateCcw size={16} className="inline mr-2" />
              Reset to Default Layout
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

const InlineWidgetSettings = ({ widget, metadata, theme, onChange, onClose }) => {
  if (!metadata.settings || metadata.settings.length === 0) {
    return (
      <div className="text-center py-3">
        <p className="text-sm" style={{ color: theme.textLight }}>
          No settings available for this widget.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium" style={{ color: theme.text }}>
          {metadata.title} Settings
        </h4>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-100 transition-colors"
          style={{ color: theme.textLight }}
        >
          <X size={16} />
        </button>
      </div>
      
      {metadata.settings.map(setting => (
        <div key={setting.key}>
          <label className="block text-sm font-medium mb-1" style={{ color: theme.text }}>
            {setting.label}
          </label>
          {setting.type === 'select' ? (
            <select
              value={widget.settings[setting.key] || setting.default}
              onChange={(e) => onChange(widget.id, setting.key, e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-opacity-50 transition-all"
              style={{
                borderColor: theme.border,
                backgroundColor: theme.cardBackground,
                color: theme.text,
                focusRingColor: theme.primary
              }}
            >
              {setting.options.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={setting.type}
              value={widget.settings[setting.key] || setting.default}
              onChange={(e) => onChange(widget.id, setting.key, e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-opacity-50 transition-all"
              style={{
                borderColor: theme.border,
                backgroundColor: theme.cardBackground,
                color: theme.text,
                focusRingColor: theme.primary
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default DashboardCustomizer;