import React from 'react';
import { CheckCircle, Clock, XCircle, Crown, Calendar, Zap, AlertCircle } from 'lucide-react';

// Helper function to determine subscription status
function getSubscriptionStatus(user) {
  const subscription = user.subscription;
  const now = new Date();
  
  // First check trial status (regardless of subscription)
  let trialEndDate = null;
  
  // Check if user has explicit trialEndDate
  if (user.trialEndDate) {
    trialEndDate = user.trialEndDate?.toDate?.() || new Date(user.trialEndDate);
  } else if (user.createdAt) {
    // If no trialEndDate, calculate default 30-day trial from registration
    const createdDate = user.createdAt?.toDate?.() || new Date(user.createdAt);
    trialEndDate = new Date(createdDate.getTime() + (30 * 24 * 60 * 60 * 1000));
  }
  
  if (trialEndDate) {
    if (trialEndDate > now) {
      // Active trial
      const daysLeft = Math.ceil((trialEndDate - now) / (1000 * 60 * 60 * 24));
      return { 
        label: `Trial (${daysLeft}d left)`, 
        color: '#F59E0B', 
        icon: Clock 
      };
    } else {
      // Trial expired - check if they have paid subscription
      if (subscription?.status === 'active') {
        // Fall through to check subscription type below
      } else {
        return { 
          label: 'Trial Expired', 
          color: '#EF4444', 
          icon: XCircle 
        };
      }
    }
  }
  
  // Check if user has an active subscription (using 'plan' field instead of 'planType')
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
      return { label: 'Lifetime', color: '#FFD700', icon: Crown };
    }
    
    // Check for annual subscription - comprehensive search for all variations
    const annualTerms = ['annual', 'annually', 'year', 'yearly', '12 month', 'twelve month'];
    const isAnnual = annualTerms.some(term => 
      planLower.includes(term) || 
      billingLower.includes(term) || 
      intervalLower.includes(term)
    );
    
    if (isAnnual) {
      return { label: 'Annual', color: '#10B981', icon: Calendar };
    }
    
    // Check for monthly - comprehensive search for all variations
    const monthlyTerms = ['monthly', 'month', '1 month', 'one month', '30 day'];
    const isMonthly = monthlyTerms.some(term => 
      planLower.includes(term) || 
      billingLower.includes(term) || 
      intervalLower.includes(term)
    );
    
    if (isMonthly || subscription.platform === 'squarespace' || subscription.platform === 'stripe') {
      return { label: 'Monthly', color: '#3B82F6', icon: Zap };
    }
    
    if (subscription.platform === 'google-play') {
      return { label: 'Google Play', color: '#10B981', icon: CheckCircle };
    }
    if (subscription.platform === 'apple') {
      return { label: 'Apple', color: '#10B981', icon: CheckCircle };
    }
    return { label: 'Active', color: '#10B981', icon: CheckCircle };
  }
  
  // If we get here, user has no trial date and no subscription - shouldn't happen
  return { label: 'Unknown', color: '#9CA3AF', icon: AlertCircle };
}

export default function UserTable({ users, searchTerm, theme, onViewUser }) {
  const filteredUsers = users.filter(user => {
    const term = searchTerm.toLowerCase();
    const email = user.email?.toLowerCase() || '';
    const name = user.displayName?.toLowerCase() || '';
    return email.includes(term) || name.includes(term);
  });

  if (filteredUsers.length === 0) {
    return <p style={{ color: theme.textLight }}>No users found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y" style={{ borderColor: theme.border }}>
        <thead className="sticky top-0 z-10" style={{ backgroundColor: theme.background }}>
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.textLight }}>User</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.textLight }}>Subscription Status</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.textLight }}>Last Active</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.textLight }}>Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          {filteredUsers.map((user, index) => {
            const status = getSubscriptionStatus(user);
            const StatusIcon = status.icon;
            
            return (
              <tr key={user.uid || user.id || `${user.email}-${index}`}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <img className="h-10 w-10 rounded-full" src={user.photoURL || `https://ui-avatars.com/api/?name=${user.email}&background=random`} alt="" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium" style={{ color: theme.text }}>{user.displayName || 'No Name'}</div>
                      <div className="text-sm" style={{ color: theme.textLight }}>{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span 
                    className="px-2 py-1 inline-flex items-center gap-1.5 text-xs leading-5 font-semibold rounded-full"
                    style={{ 
                      backgroundColor: status.color + '20',
                      color: status.color
                    }}
                  >
                    <StatusIcon size={12} />
                    {status.label}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: theme.textLight }}>
                  {user.lastActive?.toDate?.()?.toLocaleDateString?.() ?? '—'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button onClick={() => onViewUser(user)} className="text-indigo-600 hover:text-indigo-900">View</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}




