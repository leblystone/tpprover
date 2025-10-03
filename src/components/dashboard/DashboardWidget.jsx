import React, { useState, useRef } from 'react';
import { X, Move } from 'lucide-react';
import { getSizeConfig } from '../../utils/dashboardCustomization';

const DashboardWidget = ({ 
  widget, 
  children, 
  theme, 
  isCustomizing = false,
  onRemove,
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
    
    // Add subtle visual feedback without rotation
    e.currentTarget.style.opacity = '0.7';
    e.currentTarget.style.transform = 'scale(0.98)';
    e.currentTarget.style.zIndex = '1000';
    e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
  };

  const handleDragEnd = (e) => {
    setIsDragging(false);
    // Reset all visual changes
    e.currentTarget.style.opacity = '1';
    e.currentTarget.style.transform = '';
    e.currentTarget.style.zIndex = '';
    e.currentTarget.style.boxShadow = '';
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

  // Resize functionality disabled - widgets use dynamic sizing based on content

  return (
    <div
      className={`dashboard-widget relative rounded-xl border content-card shadow-lg transition-all duration-200 ${
        isCustomizing ? 'ring-2 ring-opacity-50 cursor-move' : 'hover:border-2'
      } ${isDragging ? 'z-50 shadow-2xl' : 'hover:shadow-xl'}`}
      style={{
        ...widgetStyle,
        borderColor: theme.border,
        backgroundColor: theme.white || '#ffffff',
        '--tw-ring-color': isCustomizing ? theme.primary : theme.primary + '4D', // 30% opacity for hover
        '--hover-border-color': theme.primary
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
        <div className="absolute top-1 right-1 z-20 flex items-center gap-1 bg-white rounded-md shadow-lg p-1 border" style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove?.(widget.id);
            }}
            className="p-1 rounded hover:bg-red-50 transition-colors text-red-600"
            title="Remove widget"
          >
            <X size={14} />
          </button>
        </div>
      )}
      
      
      <div className="h-full overflow-hidden flex flex-col relative">
        {children}
      </div>
    </div>
  );
};

export default DashboardWidget;
