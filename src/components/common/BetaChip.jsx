import React, { useState } from 'react';
import Modal from './Modal';

export default function BetaChip({ theme }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      {/* Beta Chip */}
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:scale-105 group relative"
        style={{
          background: theme?.isDark 
            ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.2) 100%)'
            : 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%)',
          border: `1px solid ${theme?.isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)'}`,
        }}
      >
        {/* Pulsing dot */}
        <div className="relative flex items-center justify-center">
          <div 
            className="absolute w-2 h-2 rounded-full animate-ping"
            style={{ backgroundColor: '#3b82f6', opacity: 0.75 }}
          />
          <div 
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: '#3b82f6' }}
          />
        </div>
        
        <span 
          className="text-sm font-semibold"
          style={{ color: theme?.isDark ? '#93c5fd' : '#2563eb' }}
        >
          BETA
        </span>
      </button>

      {/* Beta Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="🧪 We're in Beta!"
        theme={theme}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="text-center">
            <h3 
              className="text-2xl font-bold mb-2"
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
              backgroundColor: theme?.isDark ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff',
              border: `1px solid ${theme?.isDark ? 'rgba(59, 130, 246, 0.2)' : '#bfdbfe'}`
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

            <div className="flex items-start gap-3">
              <div 
                className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm"
                style={{ backgroundColor: theme?.primary, color: '#ffffff' }}
              >
                ✓
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: theme?.text }}>
                  Beta pricing locked in
                </p>
                <p className="text-xs" style={{ color: theme?.textLight }}>
                  Subscribe now and keep your rate forever, even after we exit beta.
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
            <a
              href="mailto:support@tpprover.com"
              className="inline-block px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
              style={{
                backgroundColor: theme?.primary,
                color: '#ffffff'
              }}
            >
              📧 Email Support
            </a>
          </div>

          <div className="text-center pt-2">
            <button
              onClick={() => setShowModal(false)}
              className="text-sm font-semibold hover:underline"
              style={{ color: theme?.primary }}
            >
              Got it! Let's keep building 🚀
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

