import React, { useState } from 'react';
import Modal from './Modal';
import SupportModal from './SupportModal';

export default function BetaModal({ open, onClose, theme }) {
  const [showSupportModal, setShowSupportModal] = useState(false);

  const handleOpenSupport = () => {
    setShowSupportModal(true);
  };

  const handleCloseSupportAndReturnToBeta = () => {
    setShowSupportModal(false);
    // Beta modal stays open
  };

  return (
    <>
    <Modal
      open={open}
      onClose={onClose}
      title="🧪 We're in Beta!"
      theme={theme}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        <style>{`
          @keyframes pulse-text {
            0%, 100% {
              opacity: 1;
              transform: scale(1);
            }
            50% {
              opacity: 0.8;
              transform: scale(1.02);
            }
          }
          .pulsing-tagline {
            animation: pulse-text 3s ease-in-out infinite;
          }
        `}</style>
        
        <div className="text-center">
          <h3 
            className="text-lg font-bold mb-2 pulsing-tagline"
            style={{ color: theme?.primaryDark }}
          >
            Building with you, not for you
          </h3>
          <p 
            className="text-base leading-relaxed"
            style={{ color: theme?.textLight }}
          >
            Thank you for being an early supporter! 🙏
          </p>
        </div>

        <div 
          className="rounded-lg p-4"
          style={{
            backgroundColor: theme?.isDark ? 'rgba(240, 238, 231, 0.1)' : '#f0eee7',
            border: `1px solid ${theme?.isDark ? 'rgba(240, 238, 231, 0.2)' : '#e0ddd3'}`
          }}
        >
          <p 
            className="text-sm leading-relaxed"
            style={{ color: theme?.text }}
          >
            <strong>What Beta Means:</strong>
            <br />
            We're actively working out the kinks and bugs as we build. This is a living, breathing app that's improving every day based on YOUR feedback. It's going to take time, patience, and collaboration—but we know this is going to be something special.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div 
              className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm"
              style={{ backgroundColor: theme?.primary, color: '#ffffff' }}
            >
              ✓
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: theme?.text }}>
                Your voice matters
              </p>
              <p className="text-xs" style={{ color: theme?.textLight }}>
                Every bug report, feature request, and piece of feedback directly shapes the product.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div 
              className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm"
              style={{ backgroundColor: theme?.primary, color: '#ffffff' }}
            >
              ✓
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: theme?.text }}>
                Rapid improvements
              </p>
              <p className="text-xs" style={{ color: theme?.textLight }}>
                We're pushing fixes and features regularly—sometimes multiple times a week.
              </p>
            </div>
          </div>
        </div>

        <div 
          className="rounded-lg p-4 text-center"
          style={{
            backgroundColor: theme?.isDark ? 'rgba(34, 197, 94, 0.1)' : '#f0fdf4',
            border: `1px solid ${theme?.isDark ? 'rgba(34, 197, 94, 0.2)' : '#bbf7d0'}`
          }}
        >
          <p className="text-sm font-semibold mb-2" style={{ color: theme?.text }}>
            Found a bug or have feedback?
          </p>
          <button
            onClick={handleOpenSupport}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90 shadow-lg"
            style={{
              backgroundColor: theme?.primary,
              color: '#ffffff'
            }}
          >
            Support
          </button>
        </div>

        <div className="text-center pt-2">
          <button
            onClick={onClose}
            className="text-sm font-semibold hover:underline"
            style={{ color: theme?.primary }}
          >
            Got it! Let's keep building 🚀
          </button>
        </div>
      </div>
    </Modal>
    
    {/* Support Modal with back button */}
    <SupportModal 
      open={showSupportModal} 
      onClose={handleCloseSupportAndReturnToBeta}
      onBack={handleCloseSupportAndReturnToBeta}
      theme={theme}
      showBackButton={true}
    />
    </>
  );
}

