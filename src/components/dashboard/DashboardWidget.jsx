import React from 'react';
import { DotsSixVertical, EyeSlash } from '@phosphor-icons/react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useLongPress } from '../../hooks/useLongPress';

/**
 * Industry-standard widget chrome in edit mode:
 * - Subtle outline (no content overlays)
 * - Dedicated top chrome strip: drag grip + optional hide
 * - Content below stays fully visible
 */
const DashboardWidget = ({
  widget,
  children,
  theme,
  gridClassName = '',
  isCustomizing = false,
  onToggleVisibility,
  onMove: _onMove,
  onEnterEditMode,
  style = {},
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: widget.id,
    disabled: !isCustomizing || !widget.enabled,
  });

  const longPressHandlers = useLongPress(
    () => {
      if (!isCustomizing && onEnterEditMode) {
        onEnterEditMode();
      }
    },
    { delay: 500 }
  );

  const sortableStyle = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.92 : undefined,
  };

  const widgetStyle = {
    width: '100%',
    maxWidth: '100%',
    height: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
    ...style,
    ...sortableStyle,
  };

  const canDrag = isCustomizing && widget.enabled;

  const glassClass = widget.type === 'TASKS' || widget.type === 'tasks'
    ? 'glass-panel-depth'
    : 'glass-panel-minimal';

  const pressProps = !isCustomizing && onEnterEditMode ? longPressHandlers : {};

  return (
    <div
      ref={setNodeRef}
      data-widget-id={widget.id}
      className={`dashboard-widget relative rounded-xl ${glassClass} transition-shadow duration-200 ${gridClassName} ${
        isDragging ? 'z-50 shadow-xl' : 'widget-card-hover'
      }`}
      style={{
        ...widgetStyle,
        fontFamily: 'Poppins, sans-serif',
        outline: 'none',
        borderRadius: '14px',
        border: canDrag
          ? `1px solid ${theme.isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)'}`
          : undefined,
        boxShadow: isDragging
          ? (theme.isDark ? '0 12px 32px rgba(0,0,0,0.45)' : '0 12px 28px rgba(0,0,0,0.14)')
          : undefined,
      }}
      tabIndex={-1}
      onFocus={(e) => { e.currentTarget.style.outline = 'none'; }}
      {...pressProps}
    >
      <div className="h-full w-full relative flex flex-col">
        {canDrag && (
          <div
            className="flex items-center justify-between flex-shrink-0 select-none px-2"
            style={{
              height: 28,
              borderBottom: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
              backgroundColor: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              borderRadius: '14px 14px 0 0',
            }}
          >
            <button
              type="button"
              className="flex items-center justify-center h-full px-1 rounded"
              style={{
                cursor: isDragging ? 'grabbing' : 'grab',
                touchAction: 'none',
                color: theme.textLight,
                opacity: 0.7,
                background: 'transparent',
                border: 'none',
              }}
              {...attributes}
              {...listeners}
              aria-label="Drag to reorder"
              title="Drag to reorder"
            >
              <DotsSixVertical size={16} weight="bold" />
            </button>

            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onToggleVisibility?.(widget.id);
              }}
              className="flex items-center justify-center w-6 h-6 rounded transition-opacity hover:opacity-100"
              style={{
                color: theme.textLight,
                opacity: 0.55,
                background: 'transparent',
                border: 'none',
              }}
              title="Hide widget"
              aria-label="Hide widget"
            >
              <EyeSlash size={14} weight="bold" />
            </button>
          </div>
        )}

        <div
          className="flex-1 min-h-0 w-full max-w-full overflow-hidden flex flex-col relative"
          style={{
            minWidth: 0,
            boxSizing: 'border-box',
            pointerEvents: isCustomizing ? 'none' : undefined,
            borderRadius: canDrag ? '0 0 14px 14px' : undefined,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default DashboardWidget;
