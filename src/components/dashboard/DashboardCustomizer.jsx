import React, { useState, useEffect } from 'react';
import { GearSix, Plus, ArrowCounterClockwise, X } from '@phosphor-icons/react';
import ModernTooltip from '../ui/ModernTooltip';
import Modal from '../common/Modal';
import { 
  WIDGET_TYPES, 
  WIDGET_METADATA, 
  WIDGET_SIZES,
  MANAGEABLE_DASHBOARD_WIDGET_TYPES,
  RETIRED_DASHBOARD_WIDGET_TYPES,
  findEmptyPosition,
  resetDashboardLayout 
} from '../../utils/dashboardCustomization';

const SIZE_LABELS = {
  [WIDGET_SIZES.SMALL]: 'S',
  [WIDGET_SIZES.MEDIUM]: 'M',
  [WIDGET_SIZES.TALL]: 'Tall',
  [WIDGET_SIZES.LARGE]: 'L',
  [WIDGET_SIZES.WIDE]: 'Wide',
  [WIDGET_SIZES.FULL]: 'Full',
};

const MANAGEABLE_WIDGET_ENTRIES = Object.entries(WIDGET_METADATA).filter(
  ([type]) => MANAGEABLE_DASHBOARD_WIDGET_TYPES.has(type) && !RETIRED_DASHBOARD_WIDGET_TYPES.has(type)
);

const DashboardCustomizer = ({ 
  widgets, 
  onUpdateWidgets, 
  theme, 
  isOpen, 
  onClose 
}) => {
  const [selectedWidget, setSelectedWidget] = useState(null);

  // Keep selectedWidget in sync when widgets array updates
  useEffect(() => {
    if (selectedWidget) {
      const updated = widgets.find(w => w.id === selectedWidget.id);
      if (updated) setSelectedWidget(updated);
      else setSelectedWidget(null);
    }
  }, [widgets]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (selectedWidget?.id === widgetId) setSelectedWidget(null);
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
    setSelectedWidget(null);
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

  const handleResizeWidget = (widgetId, newSize) => {
    onUpdateWidgets(
      widgets.map(w =>
        w.id === widgetId ? { ...w, size: newSize } : w
      )
    );
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Manage dashboard widgets"
      theme={theme}
      maxWidth="max-w-4xl"
      variant="modern"
    >
      <div className="space-y-6" style={{ fontFamily: 'Poppins, sans-serif' }}>
        {/* Widget settings panel (gear icon target) */}
        {selectedWidget && WIDGET_METADATA[selectedWidget.type] && (
          <div
            className="p-4 rounded-lg border"
            style={{ borderColor: theme.border, backgroundColor: theme.secondary + '15' }}
          >
            <InlineWidgetSettings
              widget={selectedWidget}
              metadata={WIDGET_METADATA[selectedWidget.type]}
              theme={theme}
              onChange={handleWidgetSettingChange}
              onClose={() => setSelectedWidget(null)}
            />
          </div>
        )}

        {/* All Widgets */}
        <div>
          <h3 className="text-lg font-medium mb-1" style={{ color: theme.text }}>
            On this dashboard
          </h3>
          <p className="text-sm mb-4" style={{ color: theme.textLight }}>
            Only widgets that appear on the home dashboard are listed here.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {MANAGEABLE_WIDGET_ENTRIES.map(([type, meta]) => {
              const existingWidget = widgets.find(w => w.type === type);
              const isActive = existingWidget?.enabled;
              const hasWidget = !!existingWidget;
              const availableSizes = meta.availableSizes || [];
              
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
                            type="button"
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
                            type="button"
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
                              type="button"
                              onClick={() => setSelectedWidget(existingWidget)}
                              className="p-1 rounded hover:bg-gray-100 transition-colors"
                              style={{ color: theme.textLight }}
                            >
                              <GearSix size={14} weight="duotone" />
                            </button>
                          </ModernTooltip>
                          <ModernTooltip text="Remove" position="top">
                            <button
                              type="button"
                              onClick={() => handleRemoveWidget(existingWidget.id)}
                              className="p-1 rounded transition-all"
                              style={{ background: 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)', color: 'white' }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #b5684a 0%, #a35a3f 100%)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)'; }}
                            >
                              <X size={14} />
                            </button>
                          </ModernTooltip>
                        </div>
                      )}
                    </div>

                    {/* Size picker */}
                    {hasWidget && availableSizes.length > 1 && (
                      <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-medium uppercase tracking-wide mr-1" style={{ color: theme.textLight }}>
                          Size
                        </span>
                        {availableSizes.map((size) => {
                          const isSelected = existingWidget.size === size;
                          return (
                            <button
                              key={size}
                              type="button"
                              onClick={() => handleResizeWidget(existingWidget.id, size)}
                              className="px-2 py-0.5 text-[11px] rounded-md font-medium transition-all"
                              style={{
                                backgroundColor: isSelected ? theme.primary : 'transparent',
                                color: isSelected ? '#fff' : theme.textLight,
                                border: `1px solid ${isSelected ? theme.primary : theme.border}`,
                              }}
                            >
                              {SIZE_LABELS[size] || size}
                            </button>
                          );
                        })}
                      </div>
                    )}
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
              type="button"
              onClick={handleResetLayout}
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
              style={{ 
                backgroundColor: theme.error + '15', 
                color: theme.error,
                border: `1px solid ${theme.error}30`
              }}
            >
              <ArrowCounterClockwise size={16} weight="bold" className="inline mr-2" />
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
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium" style={{ color: theme.text }}>
            {metadata.title} Settings
          </h4>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
            style={{ color: theme.textLight }}
          >
            <X size={16} />
          </button>
        </div>
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
          type="button"
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
          {setting.type === 'boolean' ? (
            <button
              type="button"
              onClick={() => onChange(widget.id, setting.key, !(widget.settings?.[setting.key] ?? setting.default))}
              className="px-3 py-1.5 text-sm rounded-md font-medium transition-colors"
              style={{
                backgroundColor: (widget.settings?.[setting.key] ?? setting.default) ? theme.primary : theme.secondary,
                color: (widget.settings?.[setting.key] ?? setting.default) ? '#fff' : theme.text,
              }}
            >
              {(widget.settings?.[setting.key] ?? setting.default) ? 'On' : 'Off'}
            </button>
          ) : setting.type === 'select' ? (
            <select
              value={widget.settings?.[setting.key] ?? setting.default}
              onChange={(e) => onChange(widget.id, setting.key, e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-opacity-50 transition-all"
              style={{
                borderColor: theme.border,
                backgroundColor: theme.cardBackground,
                color: theme.text,
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
              type={setting.type === 'number' ? 'number' : 'text'}
              min={setting.min}
              max={setting.max}
              value={widget.settings?.[setting.key] ?? setting.default}
              onChange={(e) => onChange(
                widget.id,
                setting.key,
                setting.type === 'number' ? Number(e.target.value) : e.target.value
              )}
              className="w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-opacity-50 transition-all"
              style={{
                borderColor: theme.border,
                backgroundColor: theme.cardBackground,
                color: theme.text,
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default DashboardCustomizer;
