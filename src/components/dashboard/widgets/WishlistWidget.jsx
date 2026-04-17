import React from 'react';
import { BookHeart, Plus, Lock, ChevronDown } from 'lucide-react';
import Wishlist from '../Wishlist';
import ModernTooltip from '../../ui/ModernTooltip';
import ExpandableTooltip from '../../ui/ExpandableTooltip';
import { WIDGET_TOOLTIPS } from '../../../utils/widgetTooltips';

const WishlistWidget = ({ widget, theme, wishlist, onAdd, onEdit, onAcquire, isReadOnly = false, onUpgrade }) => {
  // Show all wishlist items (no limit)
  const displayItems = wishlist || [];

  // If no items, show compact version matching PendingVendorsView structure
  if (!displayItems || displayItems.length === 0) {
    return (
      <div className="h-full">
        <div className="h-full flex flex-col p-4 rounded-xl content-card w-full">
          <h3 className="text-base font-bold mb-3 pb-2 flex-shrink-0 flex items-center justify-between widget-separator" style={{ color: theme.text }}>
            <span className="flex items-center gap-2">
              Wishlist
              <BookHeart size={20} style={{ color: theme.primary }} />
            </span>
            <div className="flex items-center gap-2">
              <ExpandableTooltip content={WIDGET_TOOLTIPS.wishlist} theme={theme} position="left" />
              <ModernTooltip text="Add" position="top">
                <button
                  onClick={onAdd}
                  className="rounded-full flex items-center justify-center action-button-hover transition-colors"
                  style={{ 
                    color: '#ffffff',
                    backgroundColor: theme.primary,
                    width: '28px',
                    height: '28px',
                    padding: 0,
                    border: 'none',
                    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.15), inset 0 1px 2px rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                >
                  <Plus size={14} strokeWidth={3.5} style={{ color: '#ffffff' }} />
                </button>
              </ModernTooltip>
            </div>
          </h3>
          <div className="flex-1 p-2 sm:p-4 flex flex-col items-center justify-center gap-3 min-h-0">
            <p className="text-sm text-center px-2" style={{ color: theme.textLight }}>
              No items in wishlist
            </p>
            <button
              type="button"
              onClick={onAdd}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
              style={{
                color: theme.primary,
                backgroundColor: theme.isDark ? `${theme.primary}20` : `${theme.primary}15`,
                border: `1px solid ${theme.primary}40`
              }}
            >
              Add to Wishlist
              <ChevronDown size={14} />
            </button>
          </div>
        </div>
        
        {/* Lockout Overlay */}
        {isReadOnly && (
          <div className="absolute inset-0 backdrop-blur-sm bg-white/70 flex items-center justify-center z-50 rounded-lg">
            <div className="text-center p-4">
              <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: `${theme.primary}20` }}>
                <Lock size={24} style={{ color: theme.primary }} />
              </div>
              <p className="text-sm font-semibold mb-2" style={{ color: theme.primaryDark }}>
                Trial has ended
              </p>
              <button
                onClick={() => {
                  if (onUpgrade) onUpgrade();
                  else window.location.href = '/app/account';
                }}
                className="px-4 py-2 rounded-lg font-medium action-button-hover text-sm btn-primary-inset"
                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
              >
                <span className="text-hover">Upgrade</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full">
      <Wishlist 
        wishlist={displayItems} 
        theme={theme} 
        onAdd={onAdd}
        onEdit={onEdit}
        onAcquireDestination={onAcquire}
        isReadOnly={isReadOnly}
      />
      
      {/* Lockout Overlay */}
      {isReadOnly && (
        <div className="absolute inset-0 backdrop-blur-sm bg-white/70 flex items-center justify-center z-50 rounded-lg">
          <div className="text-center p-4">
            <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: `${theme.primary}20` }}>
              <Lock size={24} style={{ color: theme.primary }} />
            </div>
            <p className="text-sm font-semibold mb-2" style={{ color: theme.primaryDark }}>
              Trial has ended
            </p>
              <button
                onClick={() => {
                  if (onUpgrade) onUpgrade();
                  else window.location.href = '/app/account';
                }}
                className="px-4 py-2 rounded-lg font-medium action-button-hover text-sm btn-primary-inset"
                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
              >
                <span className="text-hover">Upgrade</span>
              </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WishlistWidget;

