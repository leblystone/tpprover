import React, { useState, useEffect } from 'react';
import { Clock, Gear, ToggleLeft, ToggleRight, FloppyDisk, CheckCircle, Calendar, Timer } from '@phosphor-icons/react';
import { db, auth } from '../../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const DEFAULT_TRIGGERS = {
  welcome: {
    enabled: true,
    triggerType: 'event',
    description: 'Sent immediately when a new user creates an account',
    event: 'onUserCreated',
    timing: 'Immediate'
  },
  verification: {
    enabled: true,
    triggerType: 'event',
    description: 'Sent immediately when a new user creates an account',
    event: 'onUserCreated',
    timing: 'Immediate'
  },
  trialEnding: {
    enabled: true,
    triggerType: 'scheduled',
    description: 'Sent when user\'s trial has 2 days remaining',
    schedule: 'Hourly check at 9 AM user timezone',
    timing: '2 days before trial ends',
    timezone: 'America/New_York',
    daysBefore: 2,
    sendTime: '09:00'
  },
  weeklyReminder: {
    enabled: true,
    triggerType: 'scheduled',
    description: 'Sent every Sunday to active users',
    schedule: 'Every Sunday at 11 AM EST',
    timing: 'Weekly',
    dayOfWeek: 'Sunday',
    time: '11:00',
    timezone: 'America/New_York'
  },
  subscription: {
    enabled: true,
    triggerType: 'event',
    description: 'Sent when user completes Stripe checkout',
    event: 'stripe.checkout.session.completed',
    timing: 'Immediate after payment'
  },
  paymentFailed: {
    enabled: true,
    triggerType: 'event',
    description: 'Sent when Stripe payment fails',
    event: 'stripe.invoice.payment_failed',
    timing: 'Immediate after failure'
  },
  paymentSuccessful: {
    enabled: true,
    triggerType: 'event',
    description: 'Sent when payment is successfully processed',
    event: 'stripe.invoice.payment_succeeded',
    timing: 'Immediate after success'
  },
  subscriptionCancelled: {
    enabled: true,
    triggerType: 'event',
    description: 'Sent when user cancels subscription',
    event: 'stripe.customer.subscription.deleted',
    timing: 'Immediate after cancellation'
  },
  renewalReminder: {
    enabled: true,
    triggerType: 'scheduled',
    description: 'Sent before subscription renewal',
    schedule: 'Daily check',
    timing: '3 days before renewal',
    daysBefore: 3,
    timezone: 'America/New_York',
    sendTime: '09:00'
  },
  passwordReset: {
    enabled: true,
    triggerType: 'manual',
    description: 'Sent when user requests password reset',
    event: 'user.passwordReset',
    timing: 'On request'
  },
  lifetimeAccessGranted: {
    enabled: true,
    triggerType: 'event',
    description: 'Sent when system grants lifetime access',
    event: 'system.lifetimeAccessGranted',
    timing: 'Immediate'
  },
  manualLifetimeGrant: {
    enabled: true,
    triggerType: 'manual',
    description: 'Sent when admin manually grants lifetime access',
    event: 'admin.manualGrant',
    timing: 'On admin action'
  },
  customAnnouncement: {
    enabled: true,
    triggerType: 'manual',
    description: 'Sent manually from admin panel',
    event: 'admin.manualSend',
    timing: 'On admin action'
  },
  trialExpiredSurvey: {
    enabled: true,
    triggerType: 'scheduled',
    description: 'Sent 3 days after trial expires to gather feedback',
    schedule: 'Hourly check at 9 AM user timezone',
    timing: '3 days after trial expiration',
    timezone: 'America/New_York',
    daysAfter: 3,
    sendTime: '09:00'
  },
  trialExtensionOffer: {
    enabled: true,
    triggerType: 'scheduled',
    description: 'Sent at day 10 of trial (4 days before end) offering a one-time 7-day extension',
    schedule: 'Daily check at 10 AM EST',
    timing: '4 days before trial ends',
    timezone: 'America/New_York',
    daysBefore: 4,
    sendTime: '10:00'
  }
};

const TEMPLATE_NAMES = {
  welcome: 'Welcome Email',
  verification: 'Email Verification',
  trialEnding: 'Trial Ending Soon',
  trialExtensionOffer: 'Trial Extension Offer (Day 10)',
  weeklyReminder: 'Weekly Research Reminder',
  subscription: 'Subscription Confirmed',
  paymentFailed: 'Payment Failed',
  paymentSuccessful: 'Payment Successful',
  subscriptionCancelled: 'Subscription Cancelled',
  renewalReminder: 'Subscription Renewal Reminder',
  passwordReset: 'Password Reset',
  lifetimeAccessGranted: 'Lifetime Access Granted',
  manualLifetimeGrant: 'Manual Lifetime Grant',
  customAnnouncement: 'Custom Announcement / Maintenance',
  trialExpiredSurvey: 'Trial Expired Survey'
};

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (EST/EDT)' },
  { value: 'America/Chicago', label: 'Central Time (CST/CDT)' },
  { value: 'America/Denver', label: 'Mountain Time (MST/MDT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PST/PDT)' },
  { value: 'UTC', label: 'UTC' }
];

export default function EmailTriggerManager({ theme }) {
  const [triggers, setTriggers] = useState(DEFAULT_TRIGGERS);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState(null);

  // Load triggers from Firestore
  useEffect(() => {
    const loadTriggers = async () => {
      try {
        const snap = await getDoc(doc(db, 'emailTemplates', '_triggers'));
        if (snap.exists()) {
          const data = snap.data();
          setTriggers({ ...DEFAULT_TRIGGERS, ...data });
        }
      } catch (error) {
        console.error('Failed to load email triggers:', error);
      }
    };
    loadTriggers();
  }, []);

  const saveTriggers = async () => {
    if (!auth.currentUser) {
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: '❌ You must be logged in to save triggers.', type: 'error' }
      }));
      return;
    }

    setIsSaving(true);
    try {
      await setDoc(doc(db, 'emailTemplates', '_triggers'), triggers, { merge: true });
      localStorage.setItem('tpp_email_triggers', JSON.stringify(triggers));
      setSaveSuccess(true);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: '✅ Email triggers saved!', type: 'success' }
      }));
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error('Failed to save triggers:', error);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: `❌ Failed to save triggers: ${error.message}`, type: 'error' }
      }));
    } finally {
      setIsSaving(false);
    }
  };

  const updateTrigger = (key, updates) => {
    setTriggers(prev => ({
      ...prev,
      [key]: { ...prev[key], ...updates }
    }));
  };

  const groupedTriggers = {
    event: Object.entries(triggers).filter(([_, t]) => t.triggerType === 'event'),
    scheduled: Object.entries(triggers).filter(([_, t]) => t.triggerType === 'scheduled'),
    manual: Object.entries(triggers).filter(([_, t]) => t.triggerType === 'manual')
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.primary + '20' }}>
            <Gear size={20} style={{ color: theme.primary }} />
          </div>
          <div>
            <h2 className="text-xl font-semibold" style={{ color: theme.text }}>
              Email Triggers & Scheduling
            </h2>
            <p className="text-sm" style={{ color: theme.textLight }}>
              Configure when and how each email is sent
            </p>
          </div>
        </div>
        <button
          onClick={saveTriggers}
          disabled={isSaving || !auth.currentUser}
          className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
          style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : saveSuccess ? (
            <>
              <CheckCircle size={16} />
              Saved!
            </>
          ) : (
            <>
              <FloppyDisk size={16} />
              FloppyDisk Triggers
            </>
          )}
        </button>
      </div>

      {!auth.currentUser && (
        <div className="px-4 py-3 rounded-lg bg-yellow-100 text-yellow-800 border border-yellow-200">
          ⚠️ You must be logged in to save triggers. Log in to the main app first, then navigate to /admin
        </div>
      )}

      {/* Scheduled Emails */}
      {groupedTriggers.scheduled.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: theme.text }}>
            <Clock size={18} />
            Scheduled Emails
          </h3>
          {groupedTriggers.scheduled.map(([key, trigger]) => (
            <div key={key} className="p-5 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <button
                      onClick={() => updateTrigger(key, { enabled: !trigger.enabled })}
                      className="flex items-center"
                    >
                      {trigger.enabled ? (
                        <ToggleRight size={24} style={{ color: theme.primary }} />
                      ) : (
                        <ToggleLeft size={24} style={{ color: theme.textLight }} />
                      )}
                    </button>
                    <h4 className="font-semibold text-base" style={{ color: theme.text }}>
                      {TEMPLATE_NAMES[key] || key}
                    </h4>
                    <span className="px-2 py-1 rounded text-xs bg-purple-100 text-purple-800">
                      Scheduled
                    </span>
                  </div>
                  <p className="text-sm mb-4" style={{ color: theme.textLight }}>
                    {trigger.description}
                  </p>
                  
                  {editingTrigger === key ? (
                    <div className="space-y-3 p-4 rounded-lg" style={{ backgroundColor: theme.background }}>
                      {trigger.dayOfWeek && (
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
                            Day of Week
                          </label>
                          <select
                            value={trigger.dayOfWeek}
                            onChange={(e) => updateTrigger(key, { dayOfWeek: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border text-sm"
                            style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
                          >
                            {DAYS_OF_WEEK.map(day => (
                              <option key={day} value={day}>{day}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      
                      {(trigger.sendTime || trigger.time) && (
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
                            PaperPlaneTilt Time
                          </label>
                          <input
                            type="time"
                            value={trigger.sendTime || trigger.time}
                            onChange={(e) => updateTrigger(key, { sendTime: e.target.value, time: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border text-sm"
                            style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
                          />
                        </div>
                      )}
                      
                      {trigger.daysBefore !== undefined && (
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
                            Days Before Event
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="30"
                            value={trigger.daysBefore}
                            onChange={(e) => updateTrigger(key, { daysBefore: parseInt(e.target.value) || 0 })}
                            className="w-full px-3 py-2 rounded-lg border text-sm"
                            style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
                          />
                        </div>
                      )}
                      
                      {trigger.timezone && (
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
                            Timezone
                          </label>
                          <select
                            value={trigger.timezone}
                            onChange={(e) => updateTrigger(key, { timezone: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border text-sm"
                            style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
                          >
                            {TIMEZONES.map(tz => (
                              <option key={tz.value} value={tz.value}>{tz.label}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingTrigger(null)}
                          className="px-4 py-2 rounded-lg text-sm font-medium"
                          style={{ backgroundColor: theme.secondary, color: theme.text }}
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-4 text-sm" style={{ color: theme.textLight }}>
                        {trigger.dayOfWeek && (
                          <div className="flex items-center gap-1">
                            <Calendar size={14} />
                            <span>Every {trigger.dayOfWeek}</span>
                          </div>
                        )}
                        {(trigger.sendTime || trigger.time) && (
                          <div className="flex items-center gap-1">
                            <Timer size={14} />
                            <span>At {trigger.sendTime || trigger.time}</span>
                          </div>
                        )}
                        {trigger.daysBefore !== undefined && (
                          <div className="flex items-center gap-1">
                            <span>⏰ {trigger.daysBefore} days before</span>
                          </div>
                        )}
                        {trigger.timezone && (
                          <div className="flex items-center gap-1">
                            <span>🌍 {trigger.timezone}</span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setEditingTrigger(key)}
                        className="text-sm px-3 py-1.5 rounded-lg font-medium hover:opacity-90 transition-all"
                        style={{ backgroundColor: theme.primary + '20', color: theme.primary }}
                      >
                        PencilSimple Schedule
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Event-Based Emails */}
      {groupedTriggers.event.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: theme.text }}>
            <Gear size={18} />
            Event-Based Emails
          </h3>
          {groupedTriggers.event.map(([key, trigger]) => (
            <div key={key} className="p-5 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updateTrigger(key, { enabled: !trigger.enabled })}
                  className="flex items-center"
                >
                  {trigger.enabled ? (
                    <ToggleRight size={24} style={{ color: theme.primary }} />
                  ) : (
                    <ToggleLeft size={24} style={{ color: theme.textLight }} />
                  )}
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-base" style={{ color: theme.text }}>
                      {TEMPLATE_NAMES[key] || key}
                    </h4>
                    <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                      Event
                    </span>
                  </div>
                  <p className="text-sm mb-2" style={{ color: theme.textLight }}>
                    {trigger.description}
                  </p>
                  <div className="text-xs" style={{ color: theme.textLight }}>
                    <strong>Trigger:</strong> {trigger.event} • <strong>Timing:</strong> {trigger.timing}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Manual Emails */}
      {groupedTriggers.manual.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: theme.text }}>
            <Gear size={18} />
            Manual Emails
          </h3>
          {groupedTriggers.manual.map(([key, trigger]) => (
            <div key={key} className="p-5 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updateTrigger(key, { enabled: !trigger.enabled })}
                  className="flex items-center"
                >
                  {trigger.enabled ? (
                    <ToggleRight size={24} style={{ color: theme.primary }} />
                  ) : (
                    <ToggleLeft size={24} style={{ color: theme.textLight }} />
                  )}
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-base" style={{ color: theme.text }}>
                      {TEMPLATE_NAMES[key] || key}
                    </h4>
                    <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">
                      Manual
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: theme.textLight }}>
                    {trigger.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

