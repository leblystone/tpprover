import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';

/**
 * BottomNavMenu Component
 * Animated bottom sheet that slides up when user taps Research/Inventory/More
 */
export default function BottomNavMenu({ isOpen, onClose, items, title, theme }) {
  const navigate = useNavigate();

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleItemClick = (item) => {
    if (item.action) {
      // Handle custom actions (like opening modals)
      window.dispatchEvent(new CustomEvent(item.action));
    } else if (item.external) {
      // External links
      window.open(item.path, '_blank', 'noopener,noreferrer');
    } else {
      // Navigate to route
      navigate(item.path);
    }
    onClose();
  };

  if (!isOpen) return null;

  const content = (
    <div 
      className="fixed inset-0 z-[10000]"
      style={{
        transition: 'opacity 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: isOpen ? 1 : 0
      }}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        style={{
          transition: 'opacity 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />

      {/* Bottom Sheet */}
      <div 
        className="absolute bottom-0 left-0 right-0 rounded-t-3xl shadow-2xl"
        style={{
          backgroundColor: theme.cardBackground,
          maxHeight: '70vh',
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)',
        }}
      >
        {/* Handle Bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div 
            className="w-10 h-1 rounded-full"
            style={{ backgroundColor: theme.border }}
          />
        </div>

        {/* Title */}
        {title && (
          <div className="px-6 py-3 border-b" style={{ borderColor: theme.border }}>
            <h3 className="text-lg font-bold" style={{ color: theme.text }}>
              {title}
            </h3>
          </div>
        )}

        {/* Menu Items */}
        <div className="overflow-y-auto max-h-[60vh] pb-4">
          {items.map((item, index) => {
            const Icon = item.icon;
            
            return (
              <button
                key={item.label}
                onClick={() => handleItemClick(item)}
                className="w-full flex items-center gap-4 px-6 py-4 transition-all duration-200 touch-manipulation"
                style={{
                  backgroundColor: 'transparent',
                  color: theme.text,
                  borderBottom: index < items.length - 1 ? `1px solid ${theme.border}` : 'none',
                  WebkitTapHighlightColor: 'transparent',
                  animation: isOpen ? `slideInUp ${200 + index * 50}ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards` : 'none',
                  opacity: 0,
                  transform: 'translateY(20px)'
                }}
              >
                {Icon && (
                  <div
                    className="flex items-center justify-center w-12 h-12 rounded-full"
                    style={{
                      backgroundColor: item.primary ? theme.primary : theme.primaryLight,
                      color: item.primary ? theme.textOnPrimary : theme.primary
                    }}
                  >
                    <Icon size={24} />
                  </div>
                )}
                
                <div className="flex-1 text-left">
                  <div className="font-semibold text-base" style={{ color: theme.text }}>
                    {item.label}
                  </div>
                  {item.description && (
                    <div className="text-sm mt-0.5" style={{ color: theme.textLight }}>
                      {item.description}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Close button for accessibility */}
        <div className="px-6 pb-2 pt-2">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-semibold transition-all"
            style={{
              backgroundColor: theme.secondary,
              color: theme.text
            }}
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes slideInUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );

  return createPortal(content, document.body);
}

