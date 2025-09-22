import React, { useState, useRef } from 'react';
import { Settings, X, Move, Maximize2, Minimize2 } from 'lucide-react';
import { WIDGET_SIZES, getSizeConfig } from '../../utils/dashboardCustomization';

const DashboardWidget = ({ 
  widget, 
  children, 
  theme, 
  isCustomizing = false,
  onRemove,
  onSettings,
  onResize,
  onMove,
  style = {}
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const widgetRef = useRef(null);

  const handleDragStart = (e) => {
    if (!isCustomizing) return;
    
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', widget.id);
    
    // Add visual feedback
    e.currentTarget.style.opacity = '0.5';
    e.currentTarget.style.transform = 'rotate(5deg)';
    e.currentTarget.style.zIndex = '1000';
  };

  const handleDragEnd = (e) => {
    setIsDragging(false);
    e.target.style.opacity = '1';
  };

  const handleDragOver = (e) => {
    if (!isCustomizing) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e) => {
    if (!isCustomizing) return;
    e.preventDefault();
    
    const draggedWidgetId = e.dataTransfer.getData('text/plain');
    const dropTargetId = widget.id;
    
    if (draggedWidgetId !== dropTargetId) {
      // Swap positions with the dropped widget
      onMove?.(draggedWidgetId, dropTargetId);
    }
  };

  const widgetStyle = {
    width: '100%',
    height: '100%',
    ...style
  };

  const canResize = widget.type !== 'analytics' || widget.size !== WIDGET_SIZES.FULL;

  return (
    <div
      className={`relative rounded-xl border content-card shadow-lg transition-all duration-200 ${
        isCustomizing ? 'ring-2 ring-opacity-50 cursor-move' : ''
      } ${isDragging ? 'z-50 shadow-2xl' : 'hover:shadow-xl'}`}
      style={{
        ...widgetStyle,
        borderColor: theme.border,
        backgroundColor: theme.white || '#ffffff',
        ringColor: isCustomizing ? theme.primary : 'transparent'
      }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      ref={widgetRef}
      draggable={isCustomizing}
    >
      {isCustomizing && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
          {canResize && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const currentSizes = [WIDGET_SIZES.SMALL, WIDGET_SIZES.MEDIUM, WIDGET_SIZES.LARGE, WIDGET_SIZES.WIDE, WIDGET_SIZES.FULL];
                const currentIndex = currentSizes.indexOf(widget.size);
                const nextSize = currentSizes[(currentIndex + 1) % currentSizes.length];
                onResize?.(widget.id, nextSize);
              }}
              className="p-1 rounded bg-white shadow-sm hover:bg-gray-50 transition-colors"
              style={{ color: theme.text }}
              title="Resize widget"
            >
              {widget.size === WIDGET_SIZES.SMALL ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
            </button>
          )}
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSettings?.(widget.id);
            }}
            className="p-1 rounded bg-white shadow-sm hover:bg-gray-50 transition-colors"
            style={{ color: theme.text }}
            title="Widget settings"
          >
            <Settings size={14} />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove?.(widget.id);
            }}
            className="p-1 rounded bg-white shadow-sm hover:bg-red-50 transition-colors text-red-600"
            title="Remove widget"
          >
            <X size={14} />
          </button>
        </div>
      )}
      
      {isCustomizing && (
        <div className="absolute top-2 left-2 z-10">
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-white shadow-sm">
            <Move size={12} style={{ color: theme.textLight }} />
            <span className="text-xs font-medium" style={{ color: theme.textLight }}>
              {widget.title}
            </span>
          </div>
        </div>
      )}
      
      <div className={`h-full ${isCustomizing ? 'pt-8' : ''}`}>
        {children}
      </div>
    </div>
  );
};

export default DashboardWidget;
