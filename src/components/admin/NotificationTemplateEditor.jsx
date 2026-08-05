import React, { useState, useEffect } from 'react';
import {
  FloppyDisk,
  ArrowsCounterClockwise,
  ChatCircle,
  Bell,
  Warning,
  PaperPlaneTilt,
  Clock,
  Lightning,
  Package,
  CreditCard,
  UsersFour,
} from '@phosphor-icons/react';
import {
  loadAllTemplatesFromFirestore,
  saveNotificationTemplate,
  resetTemplatesToDefault,
  DEFAULT_TEMPLATES,
} from '../../utils/notificationTemplates';
import { AdminBottomSheet } from './adminUi';
import TextInput from '../common/inputs/TextInput';
import TextArea from '../common/inputs/TextArea';
import pwaNotificationService from '../../services/pwaNotifications';

/** Trigger / schedule metadata shown next to each live FCM template. */
export const TEMPLATE_TRIGGER_META = {
  lowStock: {
    label: 'Low Stock',
    icon: 'warning',
    trigger: 'Daily cron (14:00 UTC)',
    rule: 'Stockpile item quantity ≤ user threshold (default 3)',
    prefType: 'lowStockAlerts',
  },
  orderStatusUpdate: {
    label: 'Order Status (manual)',
    icon: 'package',
    trigger: 'Order status change (manual / admin)',
    rule: 'When an order status string changes in user data',
    prefType: 'orderStatusUpdates',
  },
  orderCarrierPickup: {
    label: 'Order — Carrier Pickup',
    icon: 'package',
    trigger: 'EasyPost / tracking webhook',
    rule: 'Raw status → pre_transit or first in_transit',
    prefType: 'orderStatusUpdates',
  },
  orderOnTheWay: {
    label: 'Order — In Transit',
    icon: 'package',
    trigger: 'EasyPost / tracking webhook',
    rule: 'Raw status → in_transit (after pickup)',
    prefType: 'orderStatusUpdates',
  },
  orderOutForDelivery: {
    label: 'Order — Out for Delivery',
    icon: 'package',
    trigger: 'EasyPost / tracking webhook',
    rule: 'Raw status → out_for_delivery',
    prefType: 'orderStatusUpdates',
  },
  orderDelivered: {
    label: 'Order — Delivered',
    icon: 'package',
    trigger: 'EasyPost / tracking webhook',
    rule: 'Raw status → delivered',
    prefType: 'orderStatusUpdates',
  },
  washoutReminder: {
    label: 'Washout Reminder',
    icon: 'clock',
    trigger: 'Daily cron',
    rule: 'Protocol ended; washout window active',
    prefType: 'washoutReminders',
  },
  cycleReminder: {
    label: 'Cycle Starting Soon',
    icon: 'clock',
    trigger: 'Daily cron',
    rule: 'Scheduled protocol starts within reminder window',
    prefType: 'cycleReminders',
  },
  cycleEndReminder: {
    label: 'Cycle Ending Soon',
    icon: 'clock',
    trigger: 'Daily cron',
    rule: 'Active protocol ends within reminder window',
    prefType: 'cycleReminders',
  },
  researchReminderAM: {
    label: 'Morning Research',
    icon: 'bell',
    trigger: 'Every 15 min cron (user local AM time)',
    rule: 'Incomplete AM tasks + researchRemindersAM on + FCM token',
    prefType: 'researchReminders',
  },
  researchReminderPM: {
    label: 'Evening Research',
    icon: 'bell',
    trigger: 'Every 15 min cron (user local PM time)',
    rule: 'Incomplete PM tasks + researchRemindersPM on + FCM token',
    prefType: 'researchReminders',
  },
  researchReminderCustom: {
    label: 'Custom Protocol Reminder',
    icon: 'bell',
    trigger: 'Every 15 min cron (custom HH:mm)',
    rule: 'Peptide has customReminder + reminderTime; incomplete today',
    prefType: 'researchReminders',
  },
  titrationDoseChange: {
    label: 'Titration Dose Change',
    icon: 'lightning',
    trigger: 'Every 15 min cron (with research reminders)',
    rule: 'Titration protocol dose differs from yesterday',
    prefType: 'researchReminders',
  },
  inactiveUser: {
    label: 'Inactive User Re-engage',
    icon: 'users',
    trigger: 'Engagement cron',
    rule: 'No app activity for 14+ days',
    prefType: 'engagement',
  },
  unreadAnnouncements: {
    label: 'Unread Announcements',
    icon: 'bell',
    trigger: 'Engagement cron',
    rule: '5+ unread announcements',
    prefType: 'engagement',
  },
  groupBuyReminder: {
    label: 'Group Buy T-2',
    icon: 'users',
    trigger: 'Group-buy cron',
    rule: '2 days before group buy closes',
    prefType: 'groupBuys',
  },
  supportTicketReply: {
    label: 'Support Ticket Reply',
    icon: 'chat',
    trigger: 'Admin reply on support ticket',
    rule: 'Fires when admin posts a ticket reply',
    prefType: 'engagement',
  },
  researchPlusExpiringSoon: {
    label: 'Research+ Expiring (3 days)',
    icon: 'billing',
    trigger: 'Subscription lifecycle cron',
    rule: 'Trial or paid Research+ period ends in exactly 3 days',
    prefType: 'subscription',
  },
  freePlanActive: {
    label: 'Moved to Free Plan',
    icon: 'billing',
    trigger: 'Subscription lifecycle cron',
    rule: '0–2 days after subscription/trial ended',
    prefType: 'subscription',
  },
  researchPlusWinback: {
    label: 'Research+ Win-back',
    icon: 'billing',
    trigger: 'Subscription lifecycle cron',
    rule: '~90 days after subscription ended',
    prefType: 'subscription',
  },
  paymentFailedSoon: {
    label: 'Payment Failed',
    icon: 'billing',
    trigger: 'Stripe / billing webhook',
    rule: 'Payment failed; access ending soon',
    prefType: 'subscription',
  },
};

function MetaIcon({ name, size = 16 }) {
  switch (name) {
    case 'warning':
      return <Warning size={size} />;
    case 'package':
      return <Package size={size} />;
    case 'clock':
      return <Clock size={size} />;
    case 'lightning':
      return <Lightning size={size} />;
    case 'users':
      return <UsersFour size={size} />;
    case 'billing':
      return <CreditCard size={size} />;
    case 'chat':
      return <ChatCircle size={size} />;
    default:
      return <Bell size={size} />;
  }
}

function humanizeId(type) {
  return type.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).trim();
}

export default function NotificationTemplateEditor({ isOpen = false, onClose, theme, inline = false }) {
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [editedTemplate, setEditedTemplate] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen || inline) {
      loadTemplates();
    }
  }, [isOpen, inline]);

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const loadedTemplates = await loadAllTemplatesFromFirestore();
      setTemplates(loadedTemplates);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleTemplateSelect = (templateType) => {
    setSelectedTemplate(templateType);
    setEditedTemplate({ ...templates[templateType] });
    setHasChanges(false);
  };

  const handleTemplateChange = (field, value) => {
    setEditedTemplate((prev) => ({
      ...prev,
      [field]: value,
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!selectedTemplate || !editedTemplate || saving) return;
    setSaving(true);
    try {
      const result = await saveNotificationTemplate(selectedTemplate, editedTemplate);
      if (result?.success) {
        setTemplates((prev) => ({
          ...prev,
          [selectedTemplate]: editedTemplate,
        }));
        setHasChanges(false);
        window.dispatchEvent(
          new CustomEvent('tpp:toast', {
            detail: {
              type: 'success',
              message: result.firestore
                ? 'Template saved to Firestore — live for all users.'
                : 'Saved locally only — Firestore write failed (check admin rules).',
            },
          })
        );
        if (!result.firestore) {
          // Still mark as error-ish so admin notices
          window.dispatchEvent(
            new CustomEvent('tpp:toast', {
              detail: {
                type: 'error',
                message: result.error || 'Firestore denied the template write.',
              },
            })
          );
        }
      } else {
        window.dispatchEvent(
          new CustomEvent('tpp:toast', {
            detail: {
              type: 'error',
              message: result?.error || 'Failed to save notification template',
            },
          })
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (selectedTemplate) {
      setEditedTemplate({ ...DEFAULT_TEMPLATES[selectedTemplate] });
      setHasChanges(true);
    }
  };

  const handleResetAll = () => {
    const success = resetTemplatesToDefault();
    if (success) {
      setTemplates(DEFAULT_TEMPLATES);
      setSelectedTemplate(null);
      setEditedTemplate(null);
      setHasChanges(false);
      setShowResetConfirm(false);
      window.dispatchEvent(
        new CustomEvent('tpp:toast', {
          detail: {
            type: 'success',
            message: 'Editor reset to code defaults (re-save each template to push to Firestore).',
          },
        })
      );
    }
  };

  const handleTestNotification = async () => {
    if (!selectedTemplate || !editedTemplate) {
      window.dispatchEvent(
        new CustomEvent('tpp:toast', {
          detail: { type: 'error', message: 'Please select a template to test' },
        })
      );
      return;
    }

    try {
      const sampleData = getSampleDataForTemplate(selectedTemplate);
      const processedTemplate = { ...editedTemplate };
      Object.keys(sampleData).forEach((key) => {
        const placeholder = `{${key}}`;
        processedTemplate.title = processedTemplate.title?.replace(
          new RegExp(placeholder, 'g'),
          sampleData[key] || ''
        );
        processedTemplate.body = processedTemplate.body?.replace(
          new RegExp(placeholder, 'g'),
          sampleData[key] || ''
        );
      });

      const status = pwaNotificationService.getStatus();
      if (!status.supported) {
        window.dispatchEvent(
          new CustomEvent('tpp:toast', {
            detail: {
              type: 'error',
              message: 'Browser notifications not supported here — preview unavailable.',
            },
          })
        );
        return;
      }

      if (status.permission !== 'granted') {
        const permission = await pwaNotificationService.requestPermission();
        if (permission !== 'granted') {
          window.dispatchEvent(
            new CustomEvent('tpp:toast', {
              detail: {
                type: 'warning',
                message: 'Notification permission needed to preview template appearance',
              },
            })
          );
          return;
        }
      }

      pwaNotificationService.showNotification(processedTemplate.title, {
        body: processedTemplate.body,
        tag: `template-preview-${selectedTemplate}`,
        icon: '/tpp_logo.png',
        data: { path: processedTemplate.actionUrl || '/app/dashboard' },
      });

      window.dispatchEvent(
        new CustomEvent('tpp:toast', {
          detail: { type: 'success', message: 'Template preview sent!' },
        })
      );
    } catch (error) {
      console.error('Failed to preview template:', error);
      window.dispatchEvent(
        new CustomEvent('tpp:toast', {
          detail: { type: 'error', message: 'Failed to preview template: ' + error.message },
        })
      );
    }
  };

  const getSampleDataForTemplate = (templateType) => {
    const sampleData = {
      lowStock: { count: 2, peptideName: 'BPC-157' },
      orderStatusUpdate: { peptideName: 'Semaglutide', status: 'Shipped', additionalMessage: '' },
      orderCarrierPickup: { peptideName: 'BPC-157' },
      orderOnTheWay: { peptideName: 'TB-500' },
      orderOutForDelivery: { peptideName: 'Semaglutide' },
      orderDelivered: { peptideName: 'BPC-157' },
      washoutReminder: { protocolName: 'BPC-157 Protocol', daysAgo: 3 },
      cycleReminder: { protocolName: 'Recovery Protocol', daysUntil: 2 },
      cycleEndReminder: { protocolName: 'Recovery Protocol', daysUntil: 1 },
      researchReminderAM: { peptideList: 'BPC-157, TB-500' },
      researchReminderPM: { peptideList: 'Semaglutide' },
      researchReminderCustom: { peptideName: 'BPC-157', peptideList: 'BPC-157' },
      titrationDoseChange: { peptideName: 'BPC-157', oldDose: '250mcg', newDose: '500mcg' },
      inactiveUser: {},
      unreadAnnouncements: { count: 5 },
      groupBuyReminder: { peptideName: 'BPC-157 Group', daysUntil: 2 },
      supportTicketReply: { subject: 'Order question' },
      researchPlusExpiringSoon: { daysLeft: 3 },
      freePlanActive: {},
      researchPlusWinback: {},
      paymentFailedSoon: {},
    };
    return sampleData[templateType] || {};
  };

  const selectedMeta = selectedTemplate ? TEMPLATE_TRIGGER_META[selectedTemplate] : null;

  const resetAllButton = (
    <button
      type="button"
      onClick={() => setShowResetConfirm(true)}
      className="px-3 py-1 text-sm rounded-lg border transition-all hover:opacity-90"
      style={{
        borderColor: theme.border,
        color: theme.text,
        backgroundColor: theme.cardBackground,
      }}
    >
      <ArrowsCounterClockwise size={14} className="inline mr-1" />
      Reset All
    </button>
  );

  const editorGrid = (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${inline ? '' : 'h-full'}`}>
      <div className="space-y-3">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: theme.text }}>
            Templates & triggers
          </h3>
          <p className="text-xs mt-0.5" style={{ color: theme.textLight }}>
            {loadingTemplates
              ? 'Loading from Firestore…'
              : `${Object.keys(templates).length} FCM templates — each card shows when it fires`}
          </p>
        </div>
        <div className={`space-y-2 overflow-y-auto ${inline ? 'max-h-[36rem]' : 'max-h-96'}`}>
          {Object.entries(templates).map(([type, template]) => {
            const meta = TEMPLATE_TRIGGER_META[type] || {};
            const active = selectedTemplate === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => handleTemplateSelect(type)}
                className="w-full text-left p-3 rounded-lg border transition-all hover:shadow-md"
                style={{
                  borderColor: active ? theme.primary : theme.border,
                  backgroundColor: active ? `${theme.primary}12` : theme.cardBackground,
                  color: theme.text,
                  boxShadow: active ? `0 0 0 1px ${theme.primary}55` : undefined,
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span style={{ color: theme.primary }}>
                    <MetaIcon name={meta.icon} />
                  </span>
                  <span className="font-medium text-sm">{meta.label || humanizeId(type)}</span>
                </div>
                <p className="text-[11px] opacity-80 leading-snug">
                  <span className="font-semibold opacity-90">Trigger: </span>
                  {meta.trigger || 'See editor for details'}
                </p>
                {meta.rule && (
                  <p className="text-[11px] opacity-60 mt-0.5 leading-snug line-clamp-2">{meta.rule}</p>
                )}
                <p className="text-[10px] mt-1.5 opacity-50 truncate">
                  Preview: {template.title}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        {selectedTemplate && editedTemplate ? (
          <>
            {selectedMeta && (
              <div
                className="rounded-lg border p-3 space-y-1.5"
                style={{
                  borderColor: `${theme.primary}40`,
                  backgroundColor: `${theme.primary}0c`,
                }}
              >
                <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.primary }}>
                  Trigger rule
                </div>
                <div className="text-sm" style={{ color: theme.text }}>
                  <strong>When:</strong> {selectedMeta.trigger}
                </div>
                <div className="text-sm" style={{ color: theme.text }}>
                  <strong>Condition:</strong> {selectedMeta.rule}
                </div>
                <div className="text-xs opacity-70" style={{ color: theme.text }}>
                  User pref gate: <code>{selectedMeta.prefType}</code>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-lg font-semibold" style={{ color: theme.text }}>
                Edit template
              </h3>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-1 text-sm rounded-lg border transition-all hover:opacity-90"
                  style={{
                    borderColor: theme.border,
                    color: theme.text,
                    backgroundColor: theme.cardBackground,
                  }}
                >
                  <ArrowsCounterClockwise size={14} className="inline mr-1" />
                  Reset
                </button>
                <button
                  type="button"
                  onClick={handleTestNotification}
                  className="px-3 py-1 text-sm rounded-lg border transition-all hover:opacity-90"
                  style={{
                    borderColor: theme.primary,
                    color: theme.primary,
                    backgroundColor: theme.cardBackground,
                  }}
                >
                  <PaperPlaneTilt size={14} className="inline mr-1" />
                  Preview
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!hasChanges || saving}
                  className="px-3 py-1 text-sm rounded-lg transition-all hover:opacity-90 disabled:opacity-50"
                  style={{
                    backgroundColor: hasChanges ? theme.primary : theme.border,
                    color: hasChanges ? theme.textOnPrimary || '#fff' : theme.textLight,
                  }}
                >
                  <FloppyDisk size={14} className="inline mr-1" />
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
                  Title
                </label>
                <TextInput
                  value={editedTemplate.title || ''}
                  onChange={(value) => handleTemplateChange('title', value)}
                  placeholder="Notification title"
                  theme={theme}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
                  Message Body
                </label>
                <TextArea
                  value={editedTemplate.body || ''}
                  onChange={(value) => handleTemplateChange('body', value)}
                  placeholder="Notification message"
                  rows={3}
                  theme={theme}
                />
                <p className="text-xs mt-1" style={{ color: theme.textLight }}>
                  Variables like {'{peptideName}'}, {'{count}'}, {'{daysLeft}'} are replaced at send time.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
                  Action Button Text
                </label>
                <TextInput
                  value={editedTemplate.actionText || ''}
                  onChange={(value) => handleTemplateChange('actionText', value)}
                  placeholder="Button text"
                  theme={theme}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
                  Action URL
                </label>
                <TextInput
                  value={editedTemplate.actionUrl || ''}
                  onChange={(value) => handleTemplateChange('actionUrl', value)}
                  placeholder="/app/dashboard"
                  theme={theme}
                />
              </div>

              {hasChanges && (
                <div
                  className="p-3 rounded-lg border"
                  style={{
                    borderColor: `${theme.primary}50`,
                    backgroundColor: `${theme.primary}10`,
                  }}
                >
                  <p className="text-sm" style={{ color: theme.primary }}>
                    Unsaved changes — click Save to push to Firestore for all users.
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <ChatCircle size={48} style={{ color: theme.textLight, opacity: 0.5 }} />
              <p className="mt-2" style={{ color: theme.textLight }}>
                Select a template to edit copy and review its trigger
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {inline ? (
        <div
          className="rounded-lg border p-4 space-y-4"
          style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold" style={{ color: theme.text }}>
                FCM templates & triggers
              </h2>
              <p className="text-xs mt-0.5" style={{ color: theme.textLight }}>
                Edit title &amp; body, then Save — stored in Firestore for the next push of that type.
              </p>
            </div>
            {resetAllButton}
          </div>
          {editorGrid}
        </div>
      ) : (
        <AdminBottomSheet
          open={isOpen}
          onClose={onClose}
          title="Notification Template Editor"
          titleExtra={<div className="flex items-center gap-2">{resetAllButton}</div>}
          theme={theme}
          size="large"
        >
          {editorGrid}
        </AdminBottomSheet>
      )}

      <AdminBottomSheet
        open={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        title="Reset all templates?"
        theme={theme}
        size="small"
      >
        <p className="text-sm mb-4" style={{ color: theme.text }}>
          This clears local overrides in this browser. Re-save templates to overwrite Firestore.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setShowResetConfirm(false)}
            className="px-3 py-1.5 rounded-lg border text-sm"
            style={{ borderColor: theme.border, color: theme.text }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleResetAll}
            className="px-3 py-1.5 rounded-lg text-sm"
            style={{ backgroundColor: theme.primary, color: '#fff' }}
          >
            Reset
          </button>
        </div>
      </AdminBottomSheet>
    </>
  );
}
