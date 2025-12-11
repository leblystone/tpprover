import React from 'react';
import { BookHeart, HeartPlus, Lock } from 'lucide-react';
import Wishlist from '../Wishlist';
import ModernTooltip from '../../ui/ModernTooltip';

const WishlistWidget = ({ widget, theme, wishlist, onAdd, isReadOnly = false, onUpgrade }) => {
  const { maxItems = 3 } = widget.settings;
  
  // Limit items based on settings
  const limitedItems = wishlist ? wishlist.slice(0, maxItems) : [];

  // If no items, show compact version matching PendingVendorsView structure
  if (!limitedItems || limitedItems.length === 0) {
    return (
      <div className="h-full">
        <div className="h-full flex flex-col p-4 rounded-xl content-card w-full" style={{ backgroundColor: theme.white }}>
          <h3 className="text-base font-semibold mb-3 border-b pb-2 flex-shrink-0 flex items-center justify-between" style={{ color: theme.primaryDark || theme.text, borderColor: theme.border }}>
            <span>Wishlist</span>
            <div className="flex items-center gap-2">
              <BookHeart size={18} style={{ color: theme.primary }} />
              <ModernTooltip text="Add" position="top">
                <button
                  onClick={onAdd}
                  className="rounded-full flex items-center justify-center action-button-hover transition-colors"
                  style={{ 
                    color: '#ffffff',
                    backgroundColor: theme.primary,
                    width: '24px',
                    height: '24px',
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
                  <HeartPlus size={12} strokeWidth={3.5} style={{ color: '#ffffff' }} />
                </button>
              </ModernTooltip>
            </div>
          </h3>
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-center" style={{ color: theme.textLight }}>
              No items in wishlist.
            </p>
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
                className="px-4 py-2 rounded-lg font-medium action-button-hover text-sm"
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
        wishlist={limitedItems} 
        theme={theme} 
        onAdd={onAdd}
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
                className="px-4 py-2 rounded-lg font-medium action-button-hover text-sm"
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

