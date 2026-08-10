import React from 'react';

/**
 * Dashboard widget shell.
 * Drag-to-reorder / hold-to-edit are deferred for a later release.
 */
const DashboardWidget = ({
  widget,
  children,
  theme,
  gridClassName = '',
  style = {},
}) => {
  const glassClass = widget.type === 'TASKS' || widget.type === 'tasks'
    ? 'glass-panel-depth'
    : 'glass-panel-minimal';

  return (
    <div
      data-widget-id={widget.id}
      className={`dashboard-widget relative rounded-xl ${glassClass} transition-shadow duration-200 widget-card-hover ${gridClassName}`}
      style={{
        width: '100%',
        maxWidth: '100%',
        height: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        fontFamily: 'Poppins, sans-serif',
        outline: 'none',
        borderRadius: '14px',
        ...style,
      }}
      tabIndex={-1}
      onFocus={(e) => { e.currentTarget.style.outline = 'none'; }}
    >
      <div className="h-full w-full relative flex flex-col">
        <div
          className="flex-1 min-h-0 w-full max-w-full overflow-hidden flex flex-col relative"
          style={{
            minWidth: 0,
            boxSizing: 'border-box',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default DashboardWidget;
