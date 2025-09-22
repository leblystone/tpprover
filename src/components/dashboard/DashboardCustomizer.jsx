import React, { useState } from 'react';
import { Settings, Plus, RotateCcw, Save, X } from 'lucide-react';
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div 
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden"
        style={{ backgroundColor: theme.cardBackground }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: theme.border }}>
          <div>
            <h2 className="text-xl font-semibold" style={{ color: theme.text }}>
              Customize Dashboard
            </h2>
            <p className="text-sm mt-1" style={{ color: theme.textLight }}>
              Add, remove, and configure your dashboard widgets
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            style={{ color: theme.text }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: theme.border }}>
          <button
            onClick={() => setActiveTab('layout')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'layout' 
                ? 'border-current' 
                : 'border-transparent hover:bg-gray-50'
            }`}
            style={{ 
              color: activeTab === 'layout' ? theme.primary : theme.textLight 
            }}
          >
            Layout & Widgets
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'settings' 
                ? 'border-current' 
                : 'border-transparent hover:bg-gray-50'
            }`}
            style={{ 
              color: activeTab === 'settings' ? theme.primary : theme.textLight 
            }}
          >
            Widget Settings
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'layout' && (
            <div className="space-y-6">
              {/* All Widgets */}
              <div>
                <h3 className="text-lg font-medium mb-4" style={{ color: theme.text }}>
                  Dashboard Widgets
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(WIDGET_METADATA).map(([type, meta]) => {
                    const existingWidget = widgets.find(w => w.type === type);
                    const isActive = existingWidget?.enabled;
                    const hasWidget = !!existingWidget;
                    
                    return (
                      <div
                        key={type}
                        className={`p-4 border rounded-lg hover:shadow-md transition-all ${
                          isActive ? 'ring-2 ring-opacity-50' : ''
                        }`}
                        style={{ 
                          borderColor: theme.border,
                          ringColor: isActive ? theme.primary : 'transparent',
                          backgroundColor: isActive ? theme.secondary + '20' : 'transparent'
                        }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium" style={{ color: theme.text }}>
                            {meta.title}
                          </h4>
                          {hasWidget && (
                            <button
                              onClick={() => setSelectedWidget(existingWidget)}
                              className="p-1 rounded hover:bg-gray-100 transition-colors"
                              style={{ color: theme.text }}
                              title="Widget settings"
                            >
                              <Settings size={14} />
                            </button>
                          )}
                        </div>
                        <p className="text-sm mb-3" style={{ color: theme.textLight }}>
                          {meta.description}
                        </p>
                        <div className="flex items-center gap-2">
                          {!hasWidget ? (
                            <button
                              onClick={() => handleAddWidget(type)}
                              className="flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                              style={{
                                backgroundColor: theme.primary,
                                color: theme.textOnPrimary
                              }}
                            >
                              <Plus size={16} className="inline mr-1" />
                              Add Widget
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRemoveWidget(existingWidget.id)}
                              className="flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors border hover:bg-red-50"
                              style={{
                                borderColor: theme.border,
                                color: '#dc2626'
                              }}
                            >
                              <X size={16} className="inline mr-1" />
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reset Layout */}
              <div className="pt-4 border-t" style={{ borderColor: theme.border }}>
                <button
                  onClick={handleResetLayout}
                  className="px-4 py-2 rounded-md text-sm font-medium transition-colors border"
                  style={{
                    borderColor: theme.border,
                    color: theme.text,
                    backgroundColor: 'transparent'
                  }}
                >
                  <RotateCcw size={16} className="inline mr-2" />
                  Reset to Default Layout
                </button>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              {selectedWidget ? (
                <WidgetSettings
                  widget={selectedWidget}
                  metadata={WIDGET_METADATA[selectedWidget.type]}
                  theme={theme}
                  onChange={handleWidgetSettingChange}
                  onBack={() => setSelectedWidget(null)}
                />
              ) : (
                <div>
                  <h3 className="text-lg font-medium mb-4" style={{ color: theme.text }}>
                    Select a Widget to Configure
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {widgets.map(widget => {
                      const metadata = WIDGET_METADATA[widget.type];
                      const hasSettings = metadata?.settings && metadata.settings.length > 0;
                      
                      return (
                        <button
                          key={widget.id}
                          onClick={() => setSelectedWidget(widget)}
                          className="p-4 border rounded-lg text-left hover:shadow-md transition-shadow"
                          style={{ borderColor: theme.border }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium" style={{ color: theme.text }}>
                              {widget.title}
                            </div>
                            {hasSettings ? (
                              <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                                Configurable
                              </span>
                            ) : (
                              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                                No Settings
                              </span>
                            )}
                          </div>
                          <div className="text-sm" style={{ color: theme.textLight }}>
                            {metadata?.description}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t" style={{ borderColor: theme.border }}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
            style={{ color: theme.text }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const WidgetSettings = ({ widget, metadata, theme, onChange, onBack }) => {
  if (!metadata.settings || metadata.settings.length === 0) {
    return (
      <div>
        <button
          onClick={onBack}
          className="mb-4 text-sm font-medium"
          style={{ color: theme.primary }}
        >
          ← Back to Widget List
        </button>
        <div className="text-center py-8">
          <p style={{ color: theme.textLight }}>
            This widget has no configurable settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-4 text-sm font-medium"
        style={{ color: theme.primary }}
      >
        ← Back to Widget List
      </button>
      
      <h3 className="text-lg font-medium mb-4" style={{ color: theme.text }}>
        {widget.title} Settings
      </h3>
      
      <div className="space-y-4">
        {metadata.settings.map(setting => (
          <div key={setting.key}>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
              {setting.label}
            </label>
            
            {setting.type === 'boolean' && (
              <input
                type="checkbox"
                checked={widget.settings[setting.key] ?? setting.default}
                onChange={(e) => onChange(widget.id, setting.key, e.target.checked)}
                className="rounded"
              />
            )}
            
            {setting.type === 'number' && (
              <input
                type="number"
                value={widget.settings[setting.key] ?? setting.default}
                min={setting.min}
                max={setting.max}
                onChange={(e) => onChange(widget.id, setting.key, parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded-md"
                style={{ borderColor: theme.border }}
              />
            )}
            
            {setting.type === 'select' && (
              <select
                value={widget.settings[setting.key] ?? setting.default}
                onChange={(e) => onChange(widget.id, setting.key, e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                style={{ borderColor: theme.border }}
              >
                {setting.options.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardCustomizer;
