import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import UserTable from '../../components/admin/UserTable';

export default function AdminUsersSubscriptions() {
  const { theme } = useOutletContext();
  const { users, subscriptions, handleOpenUserModal } = useAdmin();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Helper function to get user status (matching UserTable logic)
  const getUserStatus = (user) => {
    const subscription = user.subscription;
    const now = new Date();
    
    // Check trial status first
    let trialEndDate = null;
    if (user.trialEndDate) {
      trialEndDate = user.trialEndDate?.toDate?.() || new Date(user.trialEndDate);
    } else if (user.createdAt) {
      const createdDate = user.createdAt?.toDate?.() || new Date(user.createdAt);
      trialEndDate = new Date(createdDate.getTime() + (30 * 24 * 60 * 60 * 1000));
    }
    
    if (trialEndDate) {
      if (trialEndDate > now) {
        // Active trial - return trialing
        return 'trialing';
      } else {
        // Trial expired - check if they have paid subscription
        if (subscription?.status === 'active') {
          // Fall through to check subscription type below
        } else {
          return 'trial-expired';
        }
      }
    }
    
    // Check if user has an active paid subscription
    if (subscription?.status === 'active') {
      // Normalize all fields to lowercase for case-insensitive comparison
      const planLower = subscription.plan?.toLowerCase() || '';
      const billingLower = subscription.billing?.toLowerCase() || '';
      const intervalLower = subscription.interval?.toLowerCase() || '';
      
      // Check for lifetime access - comprehensive search for all variations
      const lifetimeTerms = ['lifetime', 'life', 'permanent', 'forever', 'unlimited'];
      const isLifetime = subscription.hasLifetimeAccess || 
        lifetimeTerms.some(term => 
          planLower.includes(term) || 
          billingLower.includes(term) || 
          intervalLower.includes(term)
        );
      
      if (isLifetime) {
        return 'lifetime';
      }
      
      // Check for annual subscription - comprehensive search for all variations
      const annualTerms = ['annual', 'annually', 'year', 'yearly', '12 month', 'twelve month'];
      const isAnnual = annualTerms.some(term => 
        planLower.includes(term) || 
        billingLower.includes(term) || 
        intervalLower.includes(term)
      );
      
      if (isAnnual) {
        return 'annual';
      }
      
      // Check for monthly - comprehensive search for all variations
      const monthlyTerms = ['monthly', 'month', '1 month', 'one month', '30 day'];
      const isMonthly = monthlyTerms.some(term => 
        planLower.includes(term) || 
        billingLower.includes(term) || 
        intervalLower.includes(term)
      );
      
      if (isMonthly || subscription.platform === 'squarespace' || subscription.platform === 'stripe') {
        return 'monthly';
      }
      
      // Google Play and Apple subscriptions counted as monthly
      if (subscription.platform === 'google-play' || subscription.platform === 'apple') {
        return 'monthly';
      }
      
      return 'monthly'; // Default active subscription to monthly
    }
    
    return 'unknown';
  };

  // Calculate counts for each status
  const counts = users.reduce((acc, user) => {
    const status = getUserStatus(user);
    acc[status] = (acc[status] || 0) + 1;
    acc.all++;
    return acc;
  }, { all: 0, trialing: 0, 'trial-expired': 0, monthly: 0, annual: 0, lifetime: 0, active: 0, unknown: 0 });

  // Filter users based on selected status
  const filteredUsers = users.filter(user => {
    if (statusFilter === 'all') return true;
    return getUserStatus(user) === statusFilter;
  });

  const filters = [
    { id: 'all', label: 'All Users', count: counts.all },
    { id: 'trialing', label: 'Trialing', count: counts.trialing },
    { id: 'trial-expired', label: 'Trial Expired', count: counts['trial-expired'] },
    { id: 'monthly', label: 'Monthly', count: counts.monthly },
    { id: 'annual', label: 'Annual', count: counts.annual },
    { id: 'lifetime', label: 'Lifetime', count: counts.lifetime },
  ];

  return (
    <div className="space-y-3">
      {/* All Users - Full width */}
      <div className="rounded-lg border p-3 shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
        <h2 className="text-lg font-semibold mb-2" style={{ color: theme.primaryDark }}>All Users</h2>
        
        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2 mb-3">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setStatusFilter(filter.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 hover:scale-105"
              style={{
                backgroundColor: statusFilter === filter.id ? theme.primary : theme.background,
                color: statusFilter === filter.id ? theme.textOnPrimary || '#FFFFFF' : theme.text,
                border: `1px solid ${statusFilter === filter.id ? theme.primary : theme.border}`,
              }}
            >
              {filter.label} <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px]" style={{ 
                backgroundColor: statusFilter === filter.id ? 'rgba(255,255,255,0.2)' : theme.primary + '20',
                color: statusFilter === filter.id ? theme.textOnPrimary || '#FFFFFF' : theme.primary
              }}>
                {filter.count}
              </span>
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search by email, name, or UID…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 rounded border mb-2"
          style={{ borderColor: theme.border, backgroundColor: theme.background }}
        />
        <div className="max-h-[600px] overflow-y-auto">
          <UserTable users={filteredUsers} searchTerm={searchTerm} theme={theme} onViewUser={handleOpenUserModal} />
        </div>
      </div>
    </div>
  );
}
