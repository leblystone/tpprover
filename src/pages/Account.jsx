import React, { useState, useEffect } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { User, CreditCard, Shield, FileText, Settings, LogOut, ChevronRight, Microscope, BookUser } from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import { useFirebase } from '../context/FirebaseContext'
import { getRenewalDate } from '../utils/renewalDate'
import { getSubscriptionPlatform, getPlatformDisplayName } from '../utils/subscriptionPlatform'

// Load subscription from cloud storage
async function loadSubscription(firebaseUser) { 
  try { 
    const { loadUserSubscription } = await import('../services/cloudStorage');
    if (firebaseUser) {
      const subscription = await loadUserSubscription(firebaseUser.uid);
      if (subscription && !subscription.id?.includes('lab_access') && !subscription.id?.includes('demo') && !subscription.id?.includes('test') && subscription.status !== 'lab_access') {
        return subscription;
      }
    }
    return null;
  } catch (error) {
    console.error('❌ Failed to load subscription:', error);
    return null; 
  } 
}

export default function Account() {
  const { theme } = useOutletContext()
  const navigate = useNavigate()
  const { logout } = useAppContext()
  const { firebaseUser } = useFirebase()
  const [sub, setSub] = useState(null)
  
  // Load subscription data
  useEffect(() => {
    const loadSubData = async () => {
      if (!firebaseUser) return;
      const subscription = await loadSubscription(firebaseUser);
      setSub(subscription);
    }
    loadSubData();
  }, [firebaseUser]);

  // Get subscription description with renewal date
  const getSubscriptionDescription = () => {
    if (!sub) {
      return 'Manage plan and billing';
    }
    
    // Lifetime access
    if (sub.hasLifetimeAccess || sub.interval === 'lifetime') {
      const platform = getPlatformDisplayName(getSubscriptionPlatform(sub));
      return `Lifetime Access · ${platform}`;
    }
    
    // Get renewal info
    const renewalInfo = getRenewalDate(sub);
    const platform = getPlatformDisplayName(getSubscriptionPlatform(sub));
    
    // Show plan and renewal date
    const planName = sub.interval === 'month' ? 'Monthly' : sub.interval === 'year' ? 'Annual' : sub.plan;
    
    if (renewalInfo.formattedDate && renewalInfo.daysUntil !== null) {
      if (sub.cancelAtPeriodEnd) {
        return `${planName} · Ends ${renewalInfo.formattedDate}`;
      }
      if (renewalInfo.daysUntil < 0) {
        return `${planName} · Expired`;
      }
      if (renewalInfo.daysUntil <= 7) {
        return `${planName} · Renews in ${renewalInfo.daysUntil}d`;
      }
      return `${planName} · Renews ${renewalInfo.formattedDate}`;
    }
    
    return `${planName} · ${platform}`;
  };

  const accountSections = [
    {
      title: 'Profile',
      description: 'Email, account and security',
      icon: User,
      path: '/app/account/profile',
      color: theme.primary
    },
    {
      title: 'Subscription',
      description: getSubscriptionDescription(),
      icon: CreditCard,
      path: '/app/account/subscription',
      color: theme.primary
    },
    {
      title: 'Legal',
      description: 'Agreements and privacy',
      icon: FileText,
      path: '/app/account/legal',
      color: theme.primary
    }
  ]

  return (
    <section className="max-w-xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <BookUser size={32} style={{ color: theme.primary }} />
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-black tracking-wide" style={{ color: theme.text }}>Account</h1>
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
              Research Identity & Access
            </span>
          </div>
        </div>
      </div>
      <div className="h-px w-full mb-6 opacity-10" style={{ backgroundColor: theme.isDark ? '#4B5563' : '#9CA3AF' }}></div>

      {/* Navigation Sections */}
      <div className="space-y-4">
        {accountSections.map((section, index) => {
          const Icon = section.icon
          return (
            <button
              key={index}
              type="button"
              onClick={() => navigate(section.path)}
              className="group w-full p-5 rounded-[2rem] transition-all hover:shadow-md hover:translate-y-[-1px] active:scale-[0.99] text-left overflow-hidden relative"
              style={{
                backgroundColor: theme.cardBackground,
                boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded-2xl flex items-center justify-center transition-colors group-hover:bg-opacity-20"
                    style={{ backgroundColor: theme.primary + '10' }}
                  >
                    <Icon size={22} style={{ color: theme.primary }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-black tracking-wide" style={{ color: theme.text }}>
                      {section.title}
                    </h3>
                    <p className="text-[13px] font-medium opacity-50" style={{ color: theme.text }}>
                      {section.description}
                    </p>
                  </div>
                </div>
                <ChevronRight 
                  size={18} 
                  className="opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" 
                  style={{ color: theme.text }} 
                />
              </div>
            </button>
          )
        })}
      </div>

      {/* Sign Out Section */}
      <div className="pt-6 border-t border-dashed" style={{ borderColor: theme.border }}>
        <button
          onClick={logout}
          className="group w-full p-5 rounded-[2rem] transition-all hover:shadow-md hover:translate-y-[-1px] active:scale-[0.99] text-left flex items-center justify-between"
          style={{
            backgroundColor: theme.cardBackground,
            boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
          }}
        >
          <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: '#991B1B10' }}
            >
              <LogOut size={22} style={{ color: '#991B1B' }} />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-wide" style={{ color: '#991B1B' }}>
                Sign Out
              </h3>
              <p className="text-[13px] font-medium opacity-50" style={{ color: theme.text }}>
                Securely exit your session
              </p>
            </div>
          </div>
          <ChevronRight 
            size={18} 
            className="opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" 
            style={{ color: '#991B1B' }} 
          />
        </button>
      </div>
    </section>
  )
}
}
}
}
}