import React from 'react';
import { CheckCircle, Clock, XCircle, Crown, Calendar, Lightning, WarningCircle } from '@phosphor-icons/react';
import { calcTrialEndFallback } from '../../utils/trialDays';
import { isSubscriptionCancelingRenewal } from '../../utils/renewalDate';

function getSubscriptionStatus(user) {
  const subscription = user.subscription;
  const now = new Date();

  const canceling = isSubscriptionCancelingRenewal(subscription);
  const cancelSuffix = canceling ? ' · ↓' : '';

  if (subscription?.status === 'active') {
    const planLower = subscription.plan?.toLowerCase() || '';
    const billingLower = subscription.billing?.toLowerCase() || '';
    const intervalLower = subscription.interval?.toLowerCase() || '';

    const lifetimeTerms = ['lifetime', 'life', 'permanent', 'forever', 'unlimited'];
    const isLifetime =
      subscription.hasLifetimeAccess ||
      lifetimeTerms.some(
        (term) =>
          planLower.includes(term) || billingLower.includes(term) || intervalLower.includes(term)
      );
    if (isLifetime) return { label: 'Lifetime', color: '#FFD700', icon: Crown };

    const annualTerms = ['annual', 'annually', 'year', 'yearly', '12 month', 'twelve month'];
    const isAnnual = annualTerms.some(
      (term) =>
        planLower.includes(term) || billingLower.includes(term) || intervalLower.includes(term)
    );
    if (isAnnual) {
      return { label: `Annual${cancelSuffix}`, color: canceling ? '#F59E0B' : '#10B981', icon: Calendar };
    }

    const monthlyTerms = ['monthly', 'month', '1 month', 'one month', '30 day'];
    const isMonthly = monthlyTerms.some(
      (term) =>
        planLower.includes(term) || billingLower.includes(term) || intervalLower.includes(term)
    );
    if (
      isMonthly ||
      subscription.platform === 'squarespace' ||
      subscription.platform === 'stripe'
    ) {
      return { label: `Monthly${cancelSuffix}`, color: canceling ? '#F59E0B' : '#3B82F6', icon: Lightning };
    }
    if (subscription.platform === 'google-play') {
      return { label: `Google Play${cancelSuffix}`, color: canceling ? '#F59E0B' : '#10B981', icon: CheckCircle };
    }
    if (subscription.platform === 'apple') {
      return { label: `Apple${cancelSuffix}`, color: canceling ? '#F59E0B' : '#10B981', icon: CheckCircle };
    }
    return { label: `Active${cancelSuffix}`, color: canceling ? '#F59E0B' : '#10B981', icon: CheckCircle };
  }

  let trialEndDate = null;
  if (user.trialEndDate) {
    trialEndDate = user.trialEndDate?.toDate?.() || new Date(user.trialEndDate);
  } else if (subscription?.status === 'trialing' && subscription?.currentPeriodEnd) {
    trialEndDate =
      subscription.currentPeriodEnd?.toDate?.() || new Date(subscription.currentPeriodEnd);
  } else if (user.createdAt) {
    const createdDate = user.createdAt?.toDate?.() || new Date(user.createdAt);
    trialEndDate = calcTrialEndFallback(createdDate);
  }

  if (trialEndDate) {
    if (trialEndDate > now) {
      const daysLeft = Math.ceil((trialEndDate - now) / (1000 * 60 * 60 * 24));
      return { label: `Trial ${daysLeft}d`, color: '#F59E0B', icon: Clock };
    }
    return { label: 'Trial expired', color: '#EF4444', icon: XCircle };
  }

  return { label: 'Unknown', color: '#9CA3AF', icon: WarningCircle };
}

export default function UserTable({ users, searchTerm, theme, onSelectUser, selectedUid }) {
  const filteredUsers = users.filter((user) => {
    if (!searchTerm?.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    const email = user.email?.toLowerCase() || '';
    const name = user.displayName?.toLowerCase() || '';
    const uid = (user.uid || user.id || '').toLowerCase();
    return email.includes(term) || name.includes(term) || uid.includes(term);
  });

  if (filteredUsers.length === 0) {
    return (
      <p className="p-4 text-sm text-center" style={{ color: theme.textLight }}>
        No users found.
      </p>
    );
  }

  return (
    <div>
      {filteredUsers.map((user, index) => {
        const status = getSubscriptionStatus(user);
        const StatusIcon = status.icon;
        const uid = user.uid || user.id;
        const isSelected = selectedUid && uid === selectedUid;
        return (
          <button
            key={uid || `${user.email}-${index}`}
            type="button"
            onClick={() => onSelectUser?.(user)}
            className="w-full text-left flex items-center gap-3 px-3 py-3 border-b transition-colors"
            style={{
              borderColor: theme.border,
              backgroundColor: isSelected ? theme.primary + '12' : 'transparent',
              borderLeft: isSelected ? `3px solid ${theme.primary}` : '3px solid transparent',
            }}
          >
            <img
              className="h-9 w-9 rounded-full flex-shrink-0"
              src={
                user.photoURL ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email || 'U')}&background=random`
              }
              alt=""
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: theme.text }}>
                {user.displayName || user.email?.split('@')[0] || 'No name'}
              </p>
              <p className="text-xs truncate" style={{ color: theme.textLight }}>
                {user.email}
              </p>
            </div>
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full flex-shrink-0"
              style={{ backgroundColor: status.color + '20', color: status.color }}
            >
              <StatusIcon size={10} />
              {status.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
