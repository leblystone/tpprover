import React from 'react';
import Modal from '../common/Modal';
import { FileText, Shield } from 'lucide-react';

/**
 * Shown when the user has not yet accepted the current Terms of Service and Privacy Policy
 * (e.g. after a legal/version update). Records TERMS_UPDATE and PRIVACY_UPDATE on "I agree".
 */
export default function ReConsentModal({ open, onClose, onAgree, theme }) {
  if (!theme) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Updated Terms & Privacy"
      theme={theme}
      maxWidth="max-w-md"
      footer={
        <div className="w-full">
          <button
            type="button"
            onClick={onAgree}
            className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold"
            style={{
              backgroundColor: theme.primary,
              color: theme.textOnPrimary,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 4px rgba(0,0,0,0.12)'
            }}
          >
            I agree
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-sm" style={{ color: theme.text }}>
        <p>
          We've updated our Terms of Service and Privacy Policy. Please review and accept to continue using the app.
        </p>
        <div className="flex flex-row gap-2">
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg hover:opacity-90 transition-opacity text-xs font-medium"
            style={{
              backgroundColor: theme.primary,
              color: '#FFFFFF',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 4px rgba(0,0,0,0.12)'
            }}
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            Terms
          </a>
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg hover:opacity-90 transition-opacity text-xs font-medium"
            style={{
              backgroundColor: theme.primary,
              color: '#FFFFFF',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 4px rgba(0,0,0,0.12)'
            }}
          >
            <Shield className="w-3.5 h-3.5 shrink-0" />
            Privacy
          </a>
        </div>
        <p className="text-xs" style={{ color: theme.textLight }}>
          By clicking "I agree" you accept the current Terms of Service and Privacy Policy.
        </p>
      </div>
    </Modal>
  );
}
