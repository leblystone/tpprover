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
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border"
            style={{ borderColor: theme.border, color: theme.text }}
          >
            Remind me later
          </button>
          <button
            type="button"
            onClick={onAgree}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold"
            style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
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
        <div className="flex flex-col gap-2">
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 py-2 px-3 rounded-lg hover:opacity-90 transition-opacity"
            style={{ backgroundColor: theme.primaryLight || theme.background, color: theme.primary }}
          >
            <FileText className="w-4 h-4 shrink-0" />
            View Terms of Service
          </a>
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 py-2 px-3 rounded-lg hover:opacity-90 transition-opacity"
            style={{ backgroundColor: theme.primaryLight || theme.background, color: theme.primary }}
          >
            <Shield className="w-4 h-4 shrink-0" />
            View Privacy Policy
          </a>
        </div>
        <p className="text-xs" style={{ color: theme.textLight }}>
          By clicking "I agree" you accept the current Terms of Service and Privacy Policy.
        </p>
      </div>
    </Modal>
  );
}
