import React, { useState, useRef, useEffect } from 'react';
import { X, Move, Plus } from 'lucide-react';
import { getSizeConfig } from '../../utils/dashboardCustomization';

const DashboardWidget = ({ 
  widget, 
  children, 
  theme, 
  isCustomizing = false,
  onToggleVisibility,
  onMove,
  style = {}
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [screenWidth, setScreenWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const widgetRef = useRef(null);

  // Responsive width detection
  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get responsive size config
  const sizeConfig = getSizeConfig(widget.size, screenWidth);

  const handleDragStart = (e) => {
    if (!isCustomizing || !widget.enabled) return;
    
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
    e.currentTarget.style.borderColor = theme.isDark ? '#3d4451' : theme.border;
    e.currentTarget.style.borderWidth = '1px';
  };

  const handleDrop = (e) => {
    if (!isCustomizing) return;
    e.preventDefault();
    
    // Reset border styling
    e.currentTarget.style.borderColor = theme.isDark ? '#3d4451' : theme.border;
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
    maxWidth: '100%',
    height: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
    ...style
  };

  // Resize functionality disabled - widgets use dynamic sizing based on content

  const isHidden = isCustomizing && !widget.enabled;

  return (
    <div
      className={`dashboard-widget relative rounded-xl content-card shadow-xl transition-all duration-200 ${
        isCustomizing && widget.enabled ? 'ring-2 ring-opacity-50 cursor-move' : ''
      } ${isDragging ? 'z-50 shadow-2xl' : 'widget-card-hover'}`}
      style={{
        ...widgetStyle,
        backgroundColor: theme.cardBackground,
        '--tw-ring-color': isCustomizing && widget.enabled ? theme.primary : theme.primary + '4D' // 30% opacity for hover
      }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      ref={widgetRef}
      draggable={isCustomizing && widget.enabled}
    >
      {isCustomizing && (
        <div className="absolute top-1 right-1 z-20 flex items-center gap-1 bg-white rounded-md shadow-lg p-1 border" style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}>
          {widget.enabled ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleVisibility?.(widget.id);
              }}
              className="p-1 rounded transition-all"
              style={{ background: 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)', color: 'white' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #b5684a 0%, #a35a3f 100%)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)'}
              title="Hide widget"
            >
              <X size={14} />
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleVisibility?.(widget.id);
              }}
              className="p-1 rounded hover:bg-green-50 transition-colors text-green-600"
              title="Show widget"
            >
              <Plus size={14} />
            </button>
          )}
        </div>
      )}
      
      <div className={`h-full w-full max-w-full overflow-hidden flex flex-col relative ${isHidden ? 'opacity-75' : ''}`} style={{ minWidth: 0, boxSizing: 'border-box' }}>
        {children}
      </div>
      
      {isHidden && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl pointer-events-none" style={{ backgroundColor: 'rgba(0, 0, 0, 0.15)' }}>
          <span className="text-white font-semibold text-lg drop-shadow-lg">Hidden</span>
        </div>
      )}
    </div>
  );
};

export default DashboardWidget;
