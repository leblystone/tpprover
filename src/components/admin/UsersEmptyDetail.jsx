import React from 'react';
import { Users, Gift, Medal, Clock } from '@phosphor-icons/react';
import { useLocation } from 'react-router-dom';
import { AdminSectionHelp } from './adminUi';
import ManualLifetimeGrant from './ManualLifetimeGrant';
import AnnualCodeManager from './AnnualCodeManager';
import ExpiredTrialManager from './ExpiredTrialManager';
import FounderBackfillCard from './FounderBackfillCard';
import LifetimeCodeManager from './LifetimeCodeManager';
import LifetimeAccessAudit from './LifetimeAccessAudit';
import StaleUserDataAudit from './StaleUserDataAudit';

const MODE_HINTS = {
  subscriptions: {
    icon: Users,
    title: 'Select a user',
    body: 'Click a row in the list to see subscription status, sync/grant tools, trial controls, and communications — no modal.',
  },
  lifetime: {
    icon: Medal,
    title: 'Lifetime workspace',
    body: 'Select a lifetime entry to manage that account, or use the tools below to grant codes and audit access.',
  },
  annual: {
    icon: Gift,
    title: 'Annual codes',
    body: 'Manage promo codes below. Select a user from the list when you need their full account panel.',
  },
  'expired-trials': {
    icon: Clock,
    title: 'Expired trials',
    body: 'Bulk extend trials below, or select a user to open their full account panel.',
  },
};

export default function UsersEmptyDetail({ theme, onLoadLifetime }) {
  const { pathname } = useLocation();
  const mode = pathname.includes('/lifetime')
    ? 'lifetime'
    : pathname.includes('/annual')
      ? 'annual'
      : pathname.includes('/expired-trials')
        ? 'expired-trials'
        : 'subscriptions';
  const hint = MODE_HINTS[mode] || MODE_HINTS.subscriptions;
  const Icon = hint.icon;

  return (
    <div className="flex flex-col p-4 lg:p-6" style={{ backgroundColor: theme.background }}>
      <div
        className="rounded-xl border p-6 mb-4 text-center"
        style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}
      >
        <div
          className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center"
          style={{ backgroundColor: theme.primary + '15' }}
        >
          <Icon size={24} style={{ color: theme.primary }} />
        </div>
        <h3 className="font-bold text-base mb-1" style={{ color: theme.primaryDark }}>
          {hint.title}
        </h3>
        <p className="text-sm max-w-md mx-auto" style={{ color: theme.textLight }}>
          {hint.body}
        </p>
        {mode === 'subscriptions' && (
          <div className="mt-3 flex justify-center">
            <AdminSectionHelp title="Quick reference" theme={theme}>
              <p>
                <strong>Sync</strong> = pull from Stripe. <strong>Grant</strong> = write Firestore when Apple/Android/web webhook failed.
              </p>
            </AdminSectionHelp>
          </div>
        )}
      </div>

      {mode === 'lifetime' && (
        <div className="space-y-3">
          <LifetimeCodeManager theme={theme} />
          <ManualLifetimeGrant theme={theme} onUserAdded={onLoadLifetime} />
          <LifetimeAccessAudit theme={theme} />
          <StaleUserDataAudit theme={theme} />
        </div>
      )}
      {mode === 'annual' && <AnnualCodeManager theme={theme} />}
      {mode === 'expired-trials' && (
        <div className="space-y-3">
          <FounderBackfillCard theme={theme} />
          <ExpiredTrialManager theme={theme} />
        </div>
      )}
    </div>
  );
}
