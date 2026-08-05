import React from 'react';
import Modal from '../common/Modal';
import { FileText, ShieldCheck } from '@phosphor-icons/react';
import legalImg from '../../assets/legal.png';

/**
 * Shown when the user has not yet accepted the current Terms of Service and Privacy Policy
 * (e.g. after a legal/version update). Records TERMS_UPDATE and PRIVACY_UPDATE on "I agree".
 */
export default function ReConsentModal({ open, onClose, onAgree, theme }) {
  if (!theme) return null;

  const linkStyle = {
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : `${theme.primary}10`,
    color: theme.text,
    border: `1.5px solid ${theme.border || `${theme.primary}35`}`,
  };

  return (
    <Modal
      open={open}
      onClose={() => {}}
      title="Updated Terms & Privacy"
      theme={theme}
      maxWidth="max-w-md"
      hideCloseButton
      disableBackdropClose
      footer={
        <div className="w-full space-y-3">
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
          <p className="text-xs text-center" style={{ color: theme.textLight }}>
            By clicking &quot;I agree&quot; you accept the current Terms of Service and Privacy Policy.
          </p>
        </div>
      }
    >
      <div className="space-y-4 text-sm text-center" style={{ color: theme.text }}>
        <div className="flex justify-center pt-1">
          <img
            src={legalImg}
            alt=""
            className="w-[140px] h-auto max-h-[150px] object-contain select-none pointer-events-none drop-shadow-sm"
            draggable={false}
          />
        </div>
        <p>
          We&apos;ve updated our Terms of Service and Privacy Policy. Please review and accept to continue using the app.
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-2 py-3.5 px-3 rounded-xl transition-opacity hover:opacity-85"
            style={linkStyle}
          >
            <FileText size={28} weight="duotone" style={{ color: theme.primary }} />
            <span className="text-xs font-semibold" style={{ color: theme.text }}>Terms</span>
          </a>
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-2 py-3.5 px-3 rounded-xl transition-opacity hover:opacity-85"
            style={linkStyle}
          >
            <ShieldCheck size={28} weight="duotone" style={{ color: theme.primary }} />
            <span className="text-xs font-semibold" style={{ color: theme.text }}>Privacy</span>
          </a>
        </div>
      </div>
    </Modal>
  );
}
