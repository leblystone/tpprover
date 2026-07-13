import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import UserTable from '../../components/admin/UserTable';
import { calcTrialEndFallback } from '../../utils/trialDays';

export default function AdminUsersSubscriptions() {
  const { theme, selectedUid, onUserSelect } = useOutletContext();
  const { users, selectUserByUid } = useAdmin();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const getUserStatus = (user) => {
    const subscription = user.subscription;
    const now = new Date();

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

      if (isLifetime) return 'lifetime';

      const annualTerms = ['annual', 'annually', 'year', 'yearly', '12 month', 'twelve month'];
      const isAnnual = annualTerms.some(
        (term) =>
          planLower.includes(term) || billingLower.includes(term) || intervalLower.includes(term)
      );
      if (isAnnual) return 'annual';

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
        return 'monthly';
      }
      if (subscription.platform === 'google-play' || subscription.platform === 'apple') {
        return 'monthly';
      }
      return 'monthly';
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
      return trialEndDate > now ? 'trialing' : 'trial-expired';
    }
    return 'unknown';
  };

  const counts = users.reduce(
    (acc, user) => {
      const status = getUserStatus(user);
      acc[status] = (acc[status] || 0) + 1;
      acc.all++;
      return acc;
    },
    { all: 0, trialing: 0, 'trial-expired': 0, monthly: 0, annual: 0, lifetime: 0, active: 0, unknown: 0 }
  );

  const filteredUsers = users.filter((user) => {
    if (statusFilter === 'all') return true;
    return getUserStatus(user) === statusFilter;
  });

  const filters = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'trialing', label: 'Trialing', count: counts.trialing },
    { id: 'trial-expired', label: 'Expired', count: counts['trial-expired'] },
    { id: 'monthly', label: 'Monthly', count: counts.monthly },
    { id: 'annual', label: 'Annual', count: counts.annual },
    { id: 'lifetime', label: 'Lifetime', count: counts.lifetime },
  ];

  const handleSelectUser = (user) => {
    const uid = user.uid || user.id;
    if (!uid) return;
    selectUserByUid(uid, { seed: user });
    onUserSelect?.();
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div
        className="flex-shrink-0 p-3 border-b space-y-2"
        style={{ borderColor: theme.border, backgroundColor: theme.background }}
      >
        <h2 className="text-sm font-bold" style={{ color: theme.primaryDark }}>
          All Users
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {filters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setStatusFilter(filter.id)}
              className="px-2 py-1 rounded-md text-[10px] font-semibold"
              style={{
                backgroundColor: statusFilter === filter.id ? theme.primary : theme.cardBackground,
                color: statusFilter === filter.id ? theme.textOnPrimary || '#fff' : theme.text,
                border: `1px solid ${statusFilter === filter.id ? theme.primary : theme.border}`,
              }}
            >
              {filter.label} ({filter.count})
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search email, name, UID…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 rounded-lg text-sm border"
          style={{ borderColor: theme.border, backgroundColor: theme.cardBackground, color: theme.text }}
        />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <UserTable
          users={filteredUsers}
          searchTerm={searchTerm}
          theme={theme}
          selectedUid={selectedUid}
          onSelectUser={handleSelectUser}
        />
      </div>
    </div>
  );
}
