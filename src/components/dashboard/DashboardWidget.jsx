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
    // Reset all visual changes
    e.currentTarget.style.opacity = '1';
    e.currentTarget.style.transform = '';
    e.currentTarget.style.zIndex = '';
  };

  const handleDragOver = (e) => {
    if (!isCustomizing) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Add visual feedback for drop target
    e.currentTarget.style.borderColor = theme.primary;
    e.currentTarget.style.borderWidth = '2px';
  };

  const handleDragLeave = (e) => {
    if (!isCustomizing) return;
    // Reset border when drag leaves
    e.currentTarget.style.borderColor = theme.border;
    e.currentTarget.style.borderWidth = '1px';
  };

  const handleDrop = (e) => {
    if (!isCustomizing) return;
    e.preventDefault();
    
    // Reset border styling
    e.currentTarget.style.borderColor = theme.border;
    e.currentTarget.style.borderWidth = '1px';
    
    const draggedWidgetId = e.dataTransfer.getData('text/plain');
    const dropTargetId = widget.id;
    
    if (draggedWidgetId && draggedWidgetId !== dropTargetId) {
      // Call the move handler to reorder widgets
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
      onDragLeave={handleDragLeave}
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
      
      
      <div className="h-full">
        {children}
      </div>
    </div>
  );
};

export default DashboardWidget;
