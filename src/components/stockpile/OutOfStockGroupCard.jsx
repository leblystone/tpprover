import React from 'react';
import { X } from 'lucide-react';

/**
 * OutOfStockGroupCard Component - Similar style to StockpileGroupCard
 * Simplified for out of stock items - minimal information displayed
 */
export default function OutOfStockGroupCard({ 
  group, 
  theme,
  isReadOnly,
  onDelete,
  onCardClick
}) {
  return (
    <div
      onClick={onCardClick}
      className="group relative rounded-2xl cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:shadow-2xl"
      style={{
        background: theme.isDark 
          ? `linear-gradient(135deg, ${theme.cardBackground} 0%, ${theme.cardBackground}ee 100%)`
          : `linear-gradient(135deg, ${theme.cardBackground} 0%, #ffffff 100%)`,
        boxShadow: theme.isDark
          ? '0 4px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
          : '0 2px 16px rgba(0, 0, 0, 0.06), 0 8px 32px rgba(0, 0, 0, 0.04)',
        border: `1px solid ${theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'}`,
      }}
    >
      {/* Hover Border Glow */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none rounded-2xl overflow-hidden"
        style={{
          boxShadow: `inset 0 0 0 2px ${theme.primary}40, 0 0 20px ${theme.primary}20`
        }}
      />
      
      {/* Decorative gradient overlay */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none overflow-hidden rounded-2xl"
        style={{
          background: `radial-gradient(circle at top right, ${theme.primary}15 0%, transparent 60%)`
        }}
      />

      {/* OUT Watermark - Subtle background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
        <div 
          style={{ 
            fontSize: '64px', 
            color: theme.text, 
            fontWeight: 800, 
            transform: 'rotate(-20deg)',
            fontFamily: 'Poppins, sans-serif'
          }}
        >
          OUT
        </div>
      </div>

      {/* Content */}
      <div className="relative p-3">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-2 gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold truncate" style={{ color: theme.text, fontFamily: 'Poppins, sans-serif' }}>
              {group.name}
            </h3>
          </div>
        </div>

        {/* Simple Info */}
        <div className="mt-3 mb-2">
          <div className="text-sm opacity-60" style={{ color: theme.textLight, fontFamily: 'Poppins, sans-serif' }}>
            No vials on hand
          </div>
        </div>

        {/* Action Footer */}
        <div className="flex justify-end items-center mt-3 pt-2 border-t" style={{ borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onDelete) {
                onDelete(group);
              }
            }}
            className="p-1.5 rounded-lg transition-all hover:scale-110 active:scale-95"
            style={{
              color: theme.isDark ? '#f87171' : '#dc2626',
              backgroundColor: 'transparent'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title="Delete this out of stock item"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

