import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import EmailHistory from '../../components/admin/EmailHistory';
import { Envelope, PaperPlaneTilt, CircleNotch } from '@phosphor-icons/react';

export default function AdminCommsHistory() {
  const { theme } = useOutletContext();
  const [currentEmail, setCurrentEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [sending, setSending] = useState(false);

  const handleResendEmailChangeVerification = async () => {
    const cur = currentEmail?.trim();
    const neu = newEmail?.trim();
    if (!cur || !neu) {
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Enter both current and new email.', type: 'error' } }));
      return;
    }
    if (cur === neu) {
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Current and new email must be different.', type: 'error' } }));
      return;
    }
    setSending(true);
    try {
      const functions = getFunctions(undefined, 'us-central1');
      const resend = httpsCallable(functions, 'resendEmailChangeVerificationLink');
      const result = await resend({ currentEmail: cur, newEmail: neu });
      if (result.data?.success) {
        window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: `✅ Verification email sent to ${neu}`, type: 'success', duration: 6000 } }));
        setNewEmail('');
      } else {
        window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: result.data?.message || 'Failed to send', type: 'error' } }));
      }
    } catch (e) {
      const msg = e.message || e.code || 'Failed to send verification email.';
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: msg, type: 'error', duration: 6000 } }));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="max-w-5xl mx-auto">
        <div
          className="rounded-xl border p-4 mb-6 flex flex-col gap-3"
          style={{
            borderColor: theme.border || '#e5e7eb',
            backgroundColor: theme.surface || theme.cardBg || '#fff'
          }}
        >
          <div className="flex items-center gap-2" style={{ color: theme.text }}>
            <Envelope size={18} />
            <span className="font-semibold">Resend email change verification</span>
          </div>
          <p className="text-sm" style={{ color: theme.textLight }}>
            Use when a user didn’t receive the verification email (e.g. k_williams_02@hotmail.com). Sends the verification link via Resend to the new address. Enter the account’s current email and the new email they requested.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium" style={{ color: theme.textLight }}>Current account email</span>
              <input
                type="email"
                value={currentEmail}
                onChange={(e) => setCurrentEmail(e.target.value)}
                placeholder="e.g. k_williams_02@hotmail.com"
                className="rounded-lg border px-3 py-2 text-sm w-64"
                style={{ borderColor: theme.border, backgroundColor: theme.inputBg || theme.surface, color: theme.text }}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium" style={{ color: theme.textLight }}>New email (to verify)</span>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="new@example.com"
                className="rounded-lg border px-3 py-2 text-sm w-64"
                style={{ borderColor: theme.border, backgroundColor: theme.inputBg || theme.surface, color: theme.text }}
              />
            </label>
            <button
              type="button"
              onClick={handleResendEmailChangeVerification}
              disabled={sending}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              style={{ backgroundColor: theme.primary }}
            >
              {sending ? <CircleNotch size={16} className="animate-spin" /> : <PaperPlaneTilt size={16} />}
              {sending ? 'Sending…' : 'Send verification email'}
            </button>
          </div>
        </div>
        <EmailHistory theme={theme} />
      </div>
    </div>
  );
}
