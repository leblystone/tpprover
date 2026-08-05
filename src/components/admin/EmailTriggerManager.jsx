import React, { useState, useEffect } from 'react';
import { Clock, FloppyDisk, CheckCircle, Calendar, Timer, Alarm, Lightning, HandPointing, EnvelopeSimple } from '@phosphor-icons/react';
import { db, auth } from '../../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import CustomDropdown from '../common/inputs/CustomDropdown';
import Modal from '../common/Modal';

function DepthToggle({ enabled, onClick, theme, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={enabled}
      className="relative shrink-0 rounded-full transition-transform active:scale-[0.96] focus:outline-none focus-visible:ring-2"
      style={{
        width: 48,
        height: 28,
        background: enabled
          ? `linear-gradient(180deg, ${theme.primary} 0%, ${theme.primaryLight || theme.primary} 100%)`
          : theme.isDark
            ? 'linear-gradient(180deg, #3a3f3e 0%, #2a2e2d 100%)'
            : 'linear-gradient(180deg, #e8ece9 0%, #d5dbd7 100%)',
        boxShadow: enabled
          ? theme.isDark
            ? `inset 0 1px 1px rgba(255,255,255,0.18), inset 0 -2px 4px rgba(0,0,0,0.35), 0 2px 6px ${theme.primary}55`
            : `inset 0 1px 1px rgba(255,255,255,0.35), inset 0 -2px 4px rgba(0,0,0,0.18), 0 2px 8px ${theme.primary}40`
          : theme.isDark
            ? 'inset 0 2px 4px rgba(0,0,0,0.45), inset 0 -1px 1px rgba(255,255,255,0.06)'
            : 'inset 0 2px 5px rgba(0,0,0,0.12), inset 0 -1px 1px rgba(255,255,255,0.8)',
        border: `1px solid ${enabled ? (theme.primaryDark || theme.primary) : theme.border}`,
        '--tw-ring-color': `${theme.primary}55`,
      }}
    >
      <span
        className="absolute top-1/2 rounded-full transition-all duration-200 ease-out"
        style={{
          width: 22,
          height: 22,
          left: enabled ? 23 : 3,
          transform: 'translateY(-50%)',
          background: enabled
            ? 'linear-gradient(180deg, #ffffff 0%, #f0f2f1 100%)'
            : theme.isDark
              ? 'linear-gradient(180deg, #c5cbc8 0%, #9aa39f 100%)'
              : 'linear-gradient(180deg, #ffffff 0%, #eef1ef 100%)',
          boxShadow: enabled
            ? '0 2px 4px rgba(0,0,0,0.28), 0 1px 1px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.95)'
            : '0 1px 3px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.9)',
        }}
      />
    </button>
  );
}

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
    description: 'Sent when user\'s trial has 2 days remaining — at send time in EACH user\'s timezone',
    schedule: 'Hourly check; sends at configured local time',
    timing: '2 days before trial ends',
    daysBefore: 2,
    sendTime: '09:00'
  },
  weeklyReminder: {
    enabled: true,
    triggerType: 'scheduled',
    description: 'Sent on the configured weekday at the configured time in EACH user\'s timezone',
    schedule: 'Hourly check; per-user local day + time',
    timing: 'Weekly',
    dayOfWeek: 'Sunday',
    time: '11:00'
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
    description: 'Sent before subscription renewal — at send time in EACH user\'s timezone',
    schedule: 'Hourly check; per-user local time',
    timing: '3 days before renewal',
    daysBefore: 3,
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
    description: 'Sent 3 days after trial expires — at send time in EACH user\'s timezone',
    schedule: 'Hourly check; per-user local time',
    timing: '3 days after trial expiration',
    daysAfter: 3,
    sendTime: '09:00'
  },
  trialExtensionOffer: {
    enabled: true,
    triggerType: 'scheduled',
    description: 'Sent at day 10 of trial offering a one-time 7-day extension — per-user local time',
    schedule: 'Hourly check; per-user local time',
    timing: '4 days before trial ends',
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

export default function EmailTriggerManager({ theme }) {
  const [triggers, setTriggers] = useState(DEFAULT_TRIGGERS);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState(null);
  const [triggerCategory, setTriggerCategory] = useState('scheduled');

  // Load triggers from Firestore
  useEffect(() => {
    const loadTriggers = async () => {
      try {
        const snap = await getDoc(doc(db, 'emailTemplates', '_triggers'));
        if (snap.exists()) {
          const data = snap.data();
          const merged = { ...DEFAULT_TRIGGERS };
          for (const [key, value] of Object.entries(data || {})) {
            if (!value || typeof value !== 'object') continue;
            const { timezone: _ignoredTz, ...rest } = value;
            merged[key] = { ...(DEFAULT_TRIGGERS[key] || {}), ...rest };
          }
          setTriggers(merged);
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
      const cleaned = {};
      for (const [key, value] of Object.entries(triggers)) {
        if (!value || typeof value !== 'object') continue;
        const { timezone: _ignoredTz, ...rest } = value;
        cleaned[key] = rest;
      }
      await setDoc(doc(db, 'emailTemplates', '_triggers'), cleaned, { merge: true });
      localStorage.setItem('tpp_email_triggers', JSON.stringify(cleaned));
      setTriggers(cleaned);
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

  const categoryOptions = [
    {
      value: 'scheduled',
      label: `Scheduled Emails (${groupedTriggers.scheduled.length})`,
      icon: <Clock size={18} weight="duotone" style={{ color: theme.primary }} />,
    },
    {
      value: 'event',
      label: `Event-Based (${groupedTriggers.event.length})`,
      icon: <Lightning size={18} weight="duotone" style={{ color: theme.primary }} />,
    },
    {
      value: 'manual',
      label: `Manual (${groupedTriggers.manual.length})`,
      icon: <HandPointing size={18} weight="duotone" style={{ color: theme.primary }} />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Category + Save */}
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <CustomDropdown
            value={triggerCategory}
            onChange={(val) => {
              setTriggerCategory(val);
              setEditingTrigger(null);
            }}
            options={categoryOptions}
            theme={theme}
            outlined
            customShadow
            placeholder="Choose category…"
          />
        </div>
        <button
          type="button"
          onClick={saveTriggers}
          disabled={isSaving || !auth.currentUser}
          className="px-4 py-2 rounded-full text-sm font-semibold tracking-wide flex items-center gap-2 transition-all disabled:opacity-50 hover:brightness-105 active:scale-[0.97] shrink-0"
          style={{
            backgroundColor: theme.success || theme.primary,
            color: '#fff',
            boxShadow: theme.isDark
              ? '0 2px 8px rgba(0,0,0,0.35)'
              : `0 2px 8px ${(theme.success || theme.primary)}45`,
          }}
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving…
            </>
          ) : saveSuccess ? (
            <>
              <CheckCircle size={20} weight="duotone" />
              Saved
            </>
          ) : (
            <>
              <FloppyDisk size={20} weight="duotone" />
              Save
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
      {triggerCategory === 'scheduled' && groupedTriggers.scheduled.length > 0 && (
        <div className="space-y-3">
          {groupedTriggers.scheduled.map(([key, trigger]) => (
            <div
              key={key}
              role="button"
              tabIndex={0}
              onClick={() => setEditingTrigger(key)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setEditingTrigger(key);
                }
              }}
              className="rounded-2xl border overflow-hidden transition-all cursor-pointer hover:brightness-[0.99] active:scale-[0.995]"
              style={{
                borderColor: theme.border,
                backgroundColor: theme.cardBackground,
                boxShadow: theme.isDark ? '0 4px 16px rgba(0,0,0,0.2)' : '0 4px 16px rgba(47,59,58,0.05)',
                opacity: trigger.enabled ? 1 : 0.72,
              }}
            >
              <div className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <DepthToggle
                      enabled={!!trigger.enabled}
                      onClick={() => updateTrigger(key, { enabled: !trigger.enabled })}
                      theme={theme}
                      title={trigger.enabled ? 'Disable' : 'Enable'}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-sm" style={{ color: theme.text }}>
                        {TEMPLATE_NAMES[key] || key}
                      </h4>
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{
                          backgroundColor: theme.isDark ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.12)',
                          color: theme.isDark ? '#C4B5FD' : '#6D28D9',
                        }}
                      >
                        <Clock size={12} weight="duotone" />
                        Scheduled
                      </span>
                    </div>
                    <p className="text-xs mt-1 leading-relaxed" style={{ color: theme.textLight }}>
                      {trigger.description}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {trigger.dayOfWeek && (
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium"
                      style={{
                        backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(47,59,58,0.05)',
                        color: theme.text,
                      }}
                    >
                      <Calendar size={16} weight="duotone" style={{ color: theme.primary }} />
                      Every {trigger.dayOfWeek}
                    </span>
                  )}
                  {(trigger.sendTime || trigger.time) && (
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium"
                      style={{
                        backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(47,59,58,0.05)',
                        color: theme.text,
                      }}
                    >
                      <Timer size={16} weight="duotone" style={{ color: theme.primary }} />
                      At {trigger.sendTime || trigger.time}
                    </span>
                  )}
                  {trigger.daysBefore !== undefined && (
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium"
                      style={{
                        backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(47,59,58,0.05)',
                        color: theme.text,
                      }}
                    >
                      <Alarm size={16} weight="duotone" style={{ color: theme.primary }} />
                      {trigger.daysBefore} days before
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit schedule modal */}
      {editingTrigger && triggers[editingTrigger] && (
        <Modal
          open={!!editingTrigger}
          onClose={() => setEditingTrigger(null)}
          title={`Edit · ${TEMPLATE_NAMES[editingTrigger] || editingTrigger}`}
          theme={theme}
          maxWidth="28rem"
          footer={
            <button
              type="button"
              onClick={() => setEditingTrigger(null)}
              className="w-full px-4 py-2.5 rounded-full text-sm font-semibold"
              style={{ backgroundColor: theme.primary, color: theme.textOnPrimary || '#fff' }}
            >
              Done
            </button>
          }
        >
          <div className="space-y-4">
            {triggers[editingTrigger].dayOfWeek && (
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: theme.textLight }}>
                  Day of Week
                </label>
                <select
                  value={triggers[editingTrigger].dayOfWeek}
                  onChange={(e) => updateTrigger(editingTrigger, { dayOfWeek: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border text-sm"
                  style={{ borderColor: theme.border, backgroundColor: theme.cardBackground, color: theme.text }}
                >
                  {DAYS_OF_WEEK.map((day) => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>
            )}

            {(triggers[editingTrigger].sendTime || triggers[editingTrigger].time) && (
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: theme.textLight }}>
                  Send Time
                </label>
                <input
                  type="time"
                  value={triggers[editingTrigger].sendTime || triggers[editingTrigger].time}
                  onChange={(e) => updateTrigger(editingTrigger, { sendTime: e.target.value, time: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border text-sm"
                  style={{ borderColor: theme.border, backgroundColor: theme.cardBackground, color: theme.text }}
                />
                <p className="text-[10px] mt-1.5" style={{ color: theme.textLight }}>
                  Interpreted in each recipient&apos;s app timezone.
                </p>
              </div>
            )}

            {triggers[editingTrigger].daysBefore !== undefined && (
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: theme.textLight }}>
                  Days Before Event
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={triggers[editingTrigger].daysBefore}
                  onChange={(e) => updateTrigger(editingTrigger, { daysBefore: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2.5 rounded-xl border text-sm"
                  style={{ borderColor: theme.border, backgroundColor: theme.cardBackground, color: theme.text }}
                />
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Event-Based Emails */}
      {triggerCategory === 'event' && groupedTriggers.event.length > 0 && (
        <div className="space-y-3">
          {groupedTriggers.event.map(([key, trigger]) => (
            <div
              key={key}
              className="rounded-2xl border overflow-hidden transition-opacity"
              style={{
                borderColor: theme.border,
                backgroundColor: theme.cardBackground,
                boxShadow: theme.isDark ? '0 4px 16px rgba(0,0,0,0.2)' : '0 4px 16px rgba(47,59,58,0.05)',
                opacity: trigger.enabled ? 1 : 0.72,
              }}
            >
              <div className="p-4 flex items-start gap-3">
                <DepthToggle
                  enabled={!!trigger.enabled}
                  onClick={() => updateTrigger(key, { enabled: !trigger.enabled })}
                  theme={theme}
                  title={trigger.enabled ? 'Disable' : 'Enable'}
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-sm" style={{ color: theme.text }}>
                      {TEMPLATE_NAMES[key] || key}
                    </h4>
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{
                        backgroundColor: theme.isDark ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.12)',
                        color: theme.isDark ? '#93C5FD' : '#1D4ED8',
                      }}
                    >
                      <Lightning size={12} weight="duotone" />
                      Event
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: theme.textLight }}>
                    {trigger.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium"
                      style={{
                        backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(47,59,58,0.05)',
                        color: theme.text,
                      }}
                    >
                      <Lightning size={16} weight="duotone" style={{ color: theme.primary }} />
                      {trigger.event}
                    </span>
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium"
                      style={{
                        backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(47,59,58,0.05)',
                        color: theme.text,
                      }}
                    >
                      <Timer size={16} weight="duotone" style={{ color: theme.primary }} />
                      {trigger.timing}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Manual Emails */}
      {triggerCategory === 'manual' && groupedTriggers.manual.length > 0 && (
        <div className="space-y-3">
          {groupedTriggers.manual.map(([key, trigger]) => (
            <div
              key={key}
              className="rounded-2xl border overflow-hidden transition-opacity"
              style={{
                borderColor: theme.border,
                backgroundColor: theme.cardBackground,
                boxShadow: theme.isDark ? '0 4px 16px rgba(0,0,0,0.2)' : '0 4px 16px rgba(47,59,58,0.05)',
                opacity: trigger.enabled ? 1 : 0.72,
              }}
            >
              <div className="p-4 flex items-start gap-3">
                <DepthToggle
                  enabled={!!trigger.enabled}
                  onClick={() => updateTrigger(key, { enabled: !trigger.enabled })}
                  theme={theme}
                  title={trigger.enabled ? 'Disable' : 'Enable'}
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-sm" style={{ color: theme.text }}>
                      {TEMPLATE_NAMES[key] || key}
                    </h4>
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{
                        backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(47,59,58,0.08)',
                        color: theme.text,
                      }}
                    >
                      <HandPointing size={12} weight="duotone" />
                      Manual
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: theme.textLight }}>
                    {trigger.description}
                  </p>
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium"
                    style={{
                      backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(47,59,58,0.05)',
                      color: theme.text,
                    }}
                  >
                    <EnvelopeSimple size={16} weight="duotone" style={{ color: theme.primary }} />
                    Sent from admin tools
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {groupedTriggers[triggerCategory]?.length === 0 && (
        <div
          className="rounded-2xl border px-4 py-8 text-center text-sm"
          style={{ borderColor: theme.border, color: theme.textLight, backgroundColor: theme.cardBackground }}
        >
          No triggers in this category.
        </div>
      )}
    </div>
  );
}

