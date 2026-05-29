import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, PencilSimple, Trash, FloppyDisk, X, Bell, Clock, Users, Crosshair, PaperPlaneTilt, 
  Play, Pause, Calendar, Gear, Warning, CheckCircle, Copy, Cloud, CloudSlash, CircleNotch
} from '@phosphor-icons/react';
import Modal from '../common/Modal';
import TextInput from '../common/inputs/TextInput';
import TextArea from '../common/inputs/TextArea';
import adminNotificationService from '../../services/adminNotifications';
import { generateId } from '../../utils/string';
import { db } from '../../config/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

// Default triggered notification templates
const DEFAULT_TRIGGERED_NOTIFICATIONS = {
  lowStock: {
    id: 'lowStock',
    name: 'Low Stock Alert',
    title: '🔬 Stock Running Low!',
    body: 'You have {count} items running low in your stockpile.',
    enabled: true,
    triggers: {
      type: 'data_condition',
      condition: 'stockpile_low',
      threshold: 3,
      checkInterval: 'daily'
    },
    targeting: {
      audience: 'all_users',
      conditions: [
        { field: 'has_stockpile', operator: 'equals', value: true }
      ]
    },
    scheduling: {
      active: true,
      timezone: 'user_local',
      quietHours: { start: '22:00', end: '08:00' }
    }
  },
  inactiveUser: {
    id: 'inactiveUser',
    name: 'Re-engagement (14 days inactive)',
    title: 'Your research is still here',
    body: 'Your research is still here whenever you\'re ready.',
    enabled: true,
    triggers: {
      type: 'time_based',
      condition: 'last_active',
      delay: 14,
      unit: 'days'
    },
    targeting: {
      audience: 'inactive_users',
      conditions: [
        { field: 'last_active', operator: 'older_than', value: 14, unit: 'days' }
      ]
    },
    scheduling: {
      active: true,
      timezone: 'user_local',
      preferredTime: '10:00'
    }
  },
  groupBuys: {
    id: 'groupBuys',
    name: 'Group Buy Updates',
    title: '👥 Group Buy Available!',
    body: 'New group buy opportunity for {peptideName} at {price}. Limited time offer!',
    enabled: true,
    triggers: {
      type: 'data_condition',
      condition: 'group_buy_available',
      checkInterval: 'hourly'
    },
    targeting: {
      audience: 'all_users',
      conditions: [
        { field: 'group_buy_notifications', operator: 'equals', value: true }
      ]
    },
    scheduling: {
      active: true,
      timezone: 'user_local',
      quietHours: { start: '22:00', end: '08:00' }
    }
  },
  orderStatusUpdates: {
    id: 'orderStatusUpdates',
    name: 'Order Status Updates',
    title: '📦 Order Update',
    body: 'Your order #{orderId} status has been updated to {orderStatus}.',
    enabled: true,
    triggers: {
      type: 'data_condition',
      condition: 'order_status_change',
      checkInterval: 'realtime'
    },
    targeting: {
      audience: 'all_users',
      conditions: [
        { field: 'has_active_orders', operator: 'equals', value: true }
      ]
    },
    scheduling: {
      active: true,
      timezone: 'user_local'
    }
  },
  washoutReminders: {
    id: 'washoutReminders',
    name: 'Washout Reminders',
    title: '⏳ Washout Period',
    body: 'Your {protocolName} cycle is complete. Start your {days}-day washout period.',
    enabled: true,
    triggers: {
      type: 'user_event',
      event: 'protocol_completed',
      delay: 0
    },
    targeting: {
      audience: 'all_users',
      conditions: [
        { field: 'has_completed_protocol', operator: 'equals', value: true }
      ]
    },
    scheduling: {
      active: true,
      timezone: 'user_local',
      preferredTime: '10:00'
    }
  },
  cycleReminders: {
    id: 'cycleReminders',
    name: 'Protocol Start Reminder',
    title: '🔄 Protocol Starting Soon',
    body: 'Your {protocolName} protocol starts in {days} days. Prepare your research materials.',
    enabled: true,
    triggers: {
      type: 'time_based',
      condition: 'protocol_start_reminder',
      delay: 1, // 1 day before
      unit: 'days'
    },
    targeting: {
      audience: 'all_users',
      conditions: [
        { field: 'has_scheduled_protocol', operator: 'equals', value: true }
      ]
    },
    scheduling: {
      active: true,
      timezone: 'user_local',
      preferredTime: '09:00'
    }
  }
};

const STRIP_LEGACY_TRIGGERED_IDS = ['welcome', 'researchReminders', 'trialEnding', 'trialExtensionOffer'];

function stripLegacyTriggeredNotifications(data) {
  const out = { ...data };
  STRIP_LEGACY_TRIGGERED_IDS.forEach((id) => delete out[id]);
  return out;
}

const TRIGGER_TYPES = [
  { value: 'user_event', label: 'User Event', description: 'Triggered by user actions' },
  { value: 'data_condition', label: 'Data Condition', description: 'Based on app data changes' },
  { value: 'time_based', label: 'Time-based', description: 'After a time period' },
  { value: 'scheduled', label: 'Scheduled', description: 'At specific times' }
];

const AUDIENCE_TYPES = [
  { value: 'all_users', label: 'All Users' },
  { value: 'new_users', label: 'New Users' },
  { value: 'active_users', label: 'Active Users' },
  { value: 'inactive_users', label: 'Inactive Users' },
  { value: 'premium_users', label: 'Premium Users' },
  { value: 'custom', label: 'Custom Conditions' }
];

// Firestore document path for triggered notifications
const TRIGGERED_NOTIFICATIONS_DOC = 'triggeredNotifications';
const TRIGGERED_NOTIFICATIONS_COLLECTION = 'adminConfig';

export default function TriggeredNotificationManager({ theme }) {
  const [notifications, setNotifications] = useState(DEFAULT_TRIGGERED_NOTIFICATIONS);
  const [editingNotification, setEditingNotification] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [testingId, setTestingId] = useState(null);
  const [syncStatus, setSyncStatus] = useState('loading'); // 'loading' | 'synced' | 'error'

  // Load from Firestore on mount
  useEffect(() => {
    loadFromFirestore();
  }, []);

  const loadFromFirestore = async () => {
    setSyncStatus('loading');
    try {
      const docRef = doc(db, TRIGGERED_NOTIFICATIONS_COLLECTION, TRIGGERED_NOTIFICATIONS_DOC);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const firestoreData = docSnap.data()?.notifications || {};
        // Merge with defaults to ensure new default notifications appear
        const merged = stripLegacyTriggeredNotifications({
          ...DEFAULT_TRIGGERED_NOTIFICATIONS,
          ...firestoreData,
        });
        setNotifications(merged);
        // Also update localStorage for the processor
        localStorage.setItem('tpp_triggered_notifications', JSON.stringify(merged));
      } else {
        // First time: seed Firestore with defaults
        await saveToFirestore(DEFAULT_TRIGGERED_NOTIFICATIONS);
        setNotifications(DEFAULT_TRIGGERED_NOTIFICATIONS);
        localStorage.setItem('tpp_triggered_notifications', JSON.stringify(DEFAULT_TRIGGERED_NOTIFICATIONS));
      }
      setSyncStatus('synced');
    } catch (error) {
      console.error('Failed to load triggered notifications from Firestore:', error);
      // Fallback to localStorage
      try {
        const saved = localStorage.getItem('tpp_triggered_notifications');
        if (saved) {
          const savedNotifications = JSON.parse(saved);
          setNotifications({ ...DEFAULT_TRIGGERED_NOTIFICATIONS, ...savedNotifications });
        }
      } catch (e) {
        console.error('Failed to load from localStorage fallback:', e);
      }
      setSyncStatus('error');
    }
  };

  const saveToFirestore = async (data) => {
    try {
      const docRef = doc(db, TRIGGERED_NOTIFICATIONS_COLLECTION, TRIGGERED_NOTIFICATIONS_DOC);
      await setDoc(docRef, {
        notifications: data,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      // Also keep localStorage in sync for the processor
      localStorage.setItem('tpp_triggered_notifications', JSON.stringify(data));
      setSyncStatus('synced');
    } catch (error) {
      console.error('Failed to save triggered notifications to Firestore:', error);
      // Still save to localStorage as fallback
      localStorage.setItem('tpp_triggered_notifications', JSON.stringify(data));
      setSyncStatus('error');
    }
  };

  const handleCreateNew = () => {
    const newId = `custom_${generateId()}`;
    const newNotification = {
      id: newId,
      name: 'New Notification',
      title: '📢 Custom Notification',
      body: 'This is a custom notification message.',
      enabled: false,
      triggers: {
        type: 'user_event',
        event: 'custom',
        delay: 0
      },
      targeting: {
        audience: 'all_users',
        conditions: []
      },
      scheduling: {
        active: true,
        timezone: 'user_local'
      }
    };
    
    setEditingNotification(newNotification);
    setShowEditor(true);
  };

  const handleEdit = (notification) => {
    setEditingNotification({ ...notification });
    setShowEditor(true);
  };

  const handleSave = async (updatedNotification) => {
    const updated = {
      ...notifications,
      [updatedNotification.id]: updatedNotification
    };
    setNotifications(updated);
    await saveToFirestore(updated);
    setShowEditor(false);
    setEditingNotification(null);
    
    window.dispatchEvent(new CustomEvent('tpp:toast', {
      detail: { 
        type: 'success', 
        message: 'Triggered notification saved to Firestore!' 
      }
    }));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this triggered notification?')) {
      return;
    }
    
    const updated = { ...notifications };
    delete updated[id];
    setNotifications(updated);
    await saveToFirestore(updated);
    
    window.dispatchEvent(new CustomEvent('tpp:toast', {
      detail: { 
        type: 'success', 
        message: 'Triggered notification deleted!' 
      }
    }));
  };

  const handleToggleEnabled = async (id) => {
    const updated = {
      ...notifications,
      [id]: {
        ...notifications[id],
        enabled: !notifications[id].enabled
      }
    };
    setNotifications(updated);
    await saveToFirestore(updated);
  };

  const handleTest = async (notification) => {
    setTestingId(notification.id);
    
    try {
      // Test both PWA (local) and Firebase (cross-device) notifications
      let pwaSuccess = false;
      let firebaseSuccess = false;

      // Try PWA notification first (for immediate feedback)
      try {
        const { default: pwaNotificationService } = await import('../../services/pwaNotifications');
        const status = pwaNotificationService.getStatus();
        
        if (status.supported && status.permission === 'granted') {
          const processed = adminNotificationService.processVariables(notification.title, { count: 3, peptideName: 'BPC-157', userName: 'Test User', days: 7 });
          const processedBody = adminNotificationService.processVariables(notification.body, { count: 3, peptideName: 'BPC-157', userName: 'Test User', days: 7 });
          
          pwaNotificationService.showNotification(processed, {
            body: processedBody,
            tag: `test-pwa-${notification.id}`,
            icon: '/tpp_logo.png'
          });
          pwaSuccess = true;
        }
      } catch (error) {
        console.warn('PWA notification failed:', error);
      }

      // Try Firebase notification (for mobile cross-device)
      try {
        if (adminNotificationService.isAuthenticated()) {
          const result = await adminNotificationService.sendTriggeredNotification(notification, {
            count: 3,
            peptideName: 'BPC-157',
            userName: 'Test User',
            days: 7
          });
          firebaseSuccess = result;
        }
      } catch (error) {
        console.warn('Firebase notification failed:', error);
      }

      if (pwaSuccess || firebaseSuccess) {
        const messages = [];
        if (pwaSuccess) messages.push('PWA ✅');
        if (firebaseSuccess) messages.push('Firebase ✅');
        
        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: { 
            type: 'success', 
            message: `Test sent: ${messages.join(', ')}. Check your notifications!` 
          }
        }));
      } else {
        throw new Error('Both PWA and Firebase notifications failed');
      }

    } catch (error) {
      console.error('Failed to send test notification:', error);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { 
          type: 'error', 
          message: 'Failed to send test notification: ' + error.message 
        }
      }));
    } finally {
      setTestingId(null);
    }
  };

  const getTriggerDescription = (triggers) => {
    switch (triggers.type) {
      case 'user_event':
        return `On ${triggers.event}${triggers.delay > 0 ? ` (${triggers.delay}m delay)` : ''}`;
      case 'data_condition':
        return `When ${triggers.condition} ${triggers.threshold ? `≤ ${triggers.threshold}` : ''}`;
      case 'time_based':
        return `${triggers.delay} ${triggers.unit} after ${triggers.condition}`;
      case 'scheduled':
        return `At ${triggers.time} ${triggers.frequency}`;
      default:
        return 'Custom trigger';
    }
  };

  const getStatusColor = (notification) => {
    if (!notification.enabled) return theme.textLight;
    if (!notification.scheduling.active) return theme.warning || '#f59e0b';
    return theme.success || '#10b981';
  };

  const getStatusText = (notification) => {
    if (!notification.enabled) return 'Disabled';
    if (!notification.scheduling.active) return 'Scheduled Off';
    return 'Active';
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="p-3 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: theme.text }}>
              <Bell size={20} />
              Triggered Push Notifications
            </h2>
            <p className="text-xs mt-0.5" style={{ color: theme.textLight }}>
              Rule metadata & enable toggles. <strong>Push title/body copy</strong> for live FCM is edited in <strong>PencilSimple Templates</strong> above.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {syncStatus === 'loading' && (
              <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full" style={{ backgroundColor: theme.primary + '15', color: theme.primary }}>
                <CircleNotch size={12} className="animate-spin" /> Loading...
              </span>
            )}
            {syncStatus === 'synced' && (
              <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full" style={{ backgroundColor: (theme.success || '#10b981') + '15', color: theme.success || '#10b981' }}>
                <Cloud size={12} /> Synced to Firestore
              </span>
            )}
            {syncStatus === 'error' && (
              <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full cursor-pointer" onClick={loadFromFirestore} style={{ backgroundColor: (theme.error || '#ef4444') + '15', color: theme.error || '#ef4444' }}>
                <CloudSlash size={12} /> Sync failed — click to retry
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Notifications Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {Object.values(notifications).map(notification => (
          <div
            key={notification.id}
            className="rounded-lg border p-3 shadow-sm"
            style={{ 
              borderColor: theme.border, 
              backgroundColor: theme.cardBackground 
            }}
          >
            {/* Header with Status and Actions */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold" style={{ color: theme.text }}>
                    {notification.name}
                  </h3>
                  <span 
                    className="px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                    style={{ 
                      backgroundColor: getStatusColor(notification) + '20',
                      color: getStatusColor(notification)
                    }}
                  >
                    {getStatusText(notification)}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleToggleEnabled(notification.id)}
                  className="p-1.5 rounded-lg transition-colors hover:opacity-90"
                  style={{ 
                    backgroundColor: notification.enabled ? theme.success + '20' : theme.textLight + '20',
                    color: notification.enabled ? theme.success : theme.textLight
                  }}
                  title={notification.enabled ? 'Disable' : 'Enable'}
                >
                  {notification.enabled ? <Play size={14} /> : <Pause size={14} />}
                </button>
                
                <button
                  onClick={() => handleTest(notification)}
                  disabled={testingId === notification.id}
                  className="p-1.5 rounded-lg transition-colors hover:opacity-90 disabled:opacity-50"
                  style={{ 
                    backgroundColor: theme.primary + '20',
                    color: theme.primary
                  }}
                  title="PaperPlaneTilt Test"
                >
                  {testingId === notification.id ? (
                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <PaperPlaneTilt size={14} />
                  )}
                </button>
                
                <button
                  onClick={() => handleEdit(notification)}
                  className="p-1.5 rounded-lg transition-colors hover:opacity-90"
                  style={{ 
                    backgroundColor: theme.info + '20' || '#3b82f620',
                    color: theme.info || '#3b82f6'
                  }}
                  title="PencilSimple"
                >
                  <PencilSimple size={14} />
                </button>
                
                <button
                  onClick={() => handleDelete(notification.id)}
                  className="p-1.5 rounded-lg transition-colors hover:opacity-90"
                  style={{ 
                    backgroundColor: theme.error + '20' || '#ef444420',
                    color: theme.error || '#ef4444'
                  }}
                  title="Delete"
                >
                  <Trash size={14} />
                </button>
              </div>
            </div>
            
            {/* Details Grid */}
            <div className="grid grid-cols-1 gap-1.5 text-xs mb-2" style={{ color: theme.textLight }}>
              <div className="flex items-center gap-1.5">
                <Bell size={12} className="flex-shrink-0" />
                <span className="truncate"><strong>Title:</strong> {notification.title}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={12} className="flex-shrink-0" />
                <span className="truncate"><strong>Trigger:</strong> {getTriggerDescription(notification.triggers)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users size={12} className="flex-shrink-0" />
                <span className="truncate"><strong>Audience:</strong> {AUDIENCE_TYPES.find(a => a.value === notification.targeting.audience)?.label}</span>
              </div>
            </div>
            
            {/* Message */}
            <div className="p-2 rounded-lg" style={{ backgroundColor: theme.background }}>
              <p className="text-xs line-clamp-2" style={{ color: theme.text }}>
                {notification.body}
              </p>
            </div>
          </div>
        ))}
        
        {Object.keys(notifications).length === 0 && (
          <div className="col-span-full text-center py-8">
            <Bell size={40} style={{ color: theme.textLight, opacity: 0.5 }} className="mx-auto mb-3" />
            <p className="text-base font-medium mb-1" style={{ color: theme.text }}>
              No triggered notifications yet
            </p>
            <p className="text-xs" style={{ color: theme.textLight }}>
              Configured notifications will appear here
            </p>
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {showEditor && editingNotification && (
        <NotificationEditor
          notification={editingNotification}
          onSave={handleSave}
          onClose={() => {
            setShowEditor(false);
            setEditingNotification(null);
          }}
          theme={theme}
        />
      )}
    </div>
  );
}

// Notification Editor Component
function NotificationEditor({ notification, onSave, onClose, theme }) {
  const [formData, setFormData] = useState(notification);
  const [activeTab, setActiveTab] = useState('basic');

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleSave = () => {
    if (!formData.name.trim() || !formData.title.trim() || !formData.body.trim()) {
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { 
          type: 'error', 
          message: 'Please fill in all required fields' 
        }
      }));
      return;
    }
    
    onSave(formData);
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: Bell },
    { id: 'triggers', label: 'Triggers', icon: Clock },
    { id: 'targeting', label: 'Targeting', icon: Crosshair },
    { id: 'scheduling', label: 'Scheduling', icon: Calendar }
  ];

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={`${notification?.id && typeof notification.id === 'string' && notification.id.startsWith('custom_') ? 'Create' : 'PencilSimple'} Triggered Notification`}
      theme={theme}
      maxWidth="max-w-4xl"
      footer={
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border transition-colors hover:opacity-90"
            style={{ 
              borderColor: theme.border,
              backgroundColor: theme.cardBackground,
              color: theme.text
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg font-semibold transition-colors hover:opacity-90"
            style={{ 
              backgroundColor: theme.primary,
              color: theme.textOnPrimary
            }}
          >
            <FloppyDisk size={16} className="inline mr-2" />
            FloppyDisk Notification
          </button>
        </div>
      }
    >
      <div className="flex flex-col h-full">
        {/* Tabs */}
        <div className="flex border-b mb-6" style={{ borderColor: theme.border }}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
                  isActive ? 'border-b-2' : ''
                }`}
                style={{
                  color: isActive ? theme.primary : theme.textLight,
                  borderBottomColor: isActive ? theme.primary : 'transparent'
                }}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'basic' && (
            <BasicInfoTab 
              formData={formData} 
              onChange={handleInputChange} 
              theme={theme} 
            />
          )}
          
          {activeTab === 'triggers' && (
            <TriggersTab 
              formData={formData} 
              onChange={handleNestedChange} 
              theme={theme} 
            />
          )}
          
          {activeTab === 'targeting' && (
            <TargetingTab 
              formData={formData} 
              onChange={handleNestedChange} 
              theme={theme} 
            />
          )}
          
          {activeTab === 'scheduling' && (
            <SchedulingTab 
              formData={formData} 
              onChange={handleNestedChange} 
              theme={theme} 
            />
          )}
        </div>
      </div>
    </Modal>
  );
}

// Basic Info Tab
function BasicInfoTab({ formData, onChange, theme }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TextInput
          label="Notification Name *"
          value={formData.name}
          onChange={(value) => onChange('name', value)}
          placeholder="e.g., Welcome Message"
          theme={theme}
        />
        
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.enabled}
              onChange={(e) => onChange('enabled', e.target.checked)}
              className="w-4 h-4 rounded border-2"
              style={{ borderColor: theme.border, accentColor: theme.primary }}
            />
            <span className="text-sm font-medium" style={{ color: theme.text }}>
              Enabled
            </span>
          </label>
        </div>
      </div>
      
      <TextInput
        label="Notification Title *"
        value={formData.title}
        onChange={(value) => onChange('title', value)}
        placeholder="e.g., 🎉 Welcome to The Pep Planner!"
        theme={theme}
      />
      
      <TextArea
        label="Message Body *"
        value={formData.body}
        onChange={(value) => onChange('body', value)}
        placeholder="Enter your notification message..."
        rows={4}
        theme={theme}
      />
      
      <div className="p-4 rounded-lg" style={{ backgroundColor: theme.info + '10' || '#3b82f610' }}>
        <h4 className="font-medium mb-2" style={{ color: theme.text }}>
          Available Variables:
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm" style={{ color: theme.textLight }}>
          <div>• <code>{'{userName}'}</code> - User's name</div>
          <div>• <code>{'{count}'}</code> - Count/number</div>
          <div>• <code>{'{peptideName}'}</code> - Peptide name</div>
          <div>• <code>{'{days}'}</code> - Number of days</div>
          <div>• <code>{'{protocolName}'}</code> - Protocol name</div>
          <div>• <code>{'{orderId}'}</code> - Order ID</div>
          <div>• <code>{'{orderStatus}'}</code> - Order status</div>
          <div>• <code>{'{vendorName}'}</code> - Vendor name</div>
          <div>• <code>{'{date}'}</code> - Date</div>
          <div>• <code>{'{time}'}</code> - Time</div>
          <div>• <code>{'{researchTask}'}</code> - Research task name</div>
          <div>• <code>{'{cycleName}'}</code> - Cycle name</div>
          <div>• <code>{'{stockpileCount}'}</code> - Stockpile item count</div>
          <div>• <code>{'{stockpileItem}'}</code> - Stockpile item name</div>
          <div>• <code>{'{price}'}</code> - Price/amount</div>
          <div>• <code>{'{link}'}</code> - Deep link URL</div>
        </div>
      </div>
    </div>
  );
}

// Triggers Tab
function TriggersTab({ formData, onChange, theme }) {
  const triggers = formData.triggers;
  
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-3" style={{ color: theme.text }}>
          Trigger Type *
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TRIGGER_TYPES.map(type => (
            <div
              key={type.value}
              onClick={() => onChange('triggers', 'type', type.value)}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                triggers.type === type.value ? 'ring-2 ring-opacity-50' : ''
              }`}
              style={{
                borderColor: triggers.type === type.value ? theme.primary : theme.border,
                backgroundColor: triggers.type === type.value ? theme.primary + '10' : theme.cardBackground
              }}
            >
              <h4 className="font-medium mb-1" style={{ color: theme.text }}>
                {type.label}
              </h4>
              <p className="text-sm" style={{ color: theme.textLight }}>
                {type.description}
              </p>
            </div>
          ))}
        </div>
      </div>
      
      {/* Trigger-specific configuration */}
      {triggers.type === 'user_event' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput
            label="Event Name"
            value={triggers.event || ''}
            onChange={(value) => onChange('triggers', 'event', value)}
            placeholder="e.g., first_login, protocol_complete"
            theme={theme}
          />
          <TextInput
            label="Delay (minutes)"
            type="number"
            value={triggers.delay || 0}
            onChange={(value) => onChange('triggers', 'delay', parseInt(value) || 0)}
            placeholder="0"
            theme={theme}
          />
        </div>
      )}
      
      {triggers.type === 'data_condition' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TextInput
            label="Condition"
            value={triggers.condition || ''}
            onChange={(value) => onChange('triggers', 'condition', value)}
            placeholder="e.g., stockpile_low"
            theme={theme}
          />
          <TextInput
            label="Threshold"
            type="number"
            value={triggers.threshold || ''}
            onChange={(value) => onChange('triggers', 'threshold', parseInt(value) || 0)}
            placeholder="3"
            theme={theme}
          />
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
              Check Interval
            </label>
            <select
              value={triggers.checkInterval || 'daily'}
              onChange={(e) => onChange('triggers', 'checkInterval', e.target.value)}
              className="w-full p-3 rounded-lg border"
              style={{ 
                borderColor: theme.border, 
                backgroundColor: theme.cardBackground, 
                color: theme.text 
              }}
            >
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
        </div>
      )}
      
      {triggers.type === 'time_based' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TextInput
            label="Delay Amount"
            type="number"
            value={triggers.delay || ''}
            onChange={(value) => onChange('triggers', 'delay', parseInt(value) || 0)}
            placeholder="7"
            theme={theme}
          />
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
              Time Unit
            </label>
            <select
              value={triggers.unit || 'days'}
              onChange={(e) => onChange('triggers', 'unit', e.target.value)}
              className="w-full p-3 rounded-lg border"
              style={{ 
                borderColor: theme.border, 
                backgroundColor: theme.cardBackground, 
                color: theme.text 
              }}
            >
              <option value="minutes">Minutes</option>
              <option value="hours">Hours</option>
              <option value="days">Days</option>
              <option value="weeks">Weeks</option>
            </select>
          </div>
          <TextInput
            label="After Event"
            value={triggers.condition || ''}
            onChange={(value) => onChange('triggers', 'condition', value)}
            placeholder="e.g., last_login"
            theme={theme}
          />
        </div>
      )}
    </div>
  );
}

// Targeting Tab  
function TargetingTab({ formData, onChange, theme }) {
  const targeting = formData.targeting;
  
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-3" style={{ color: theme.text }}>
          Crosshair Audience *
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {AUDIENCE_TYPES.map(audience => (
            <div
              key={audience.value}
              onClick={() => onChange('targeting', 'audience', audience.value)}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                targeting.audience === audience.value ? 'ring-2 ring-opacity-50' : ''
              }`}
              style={{
                borderColor: targeting.audience === audience.value ? theme.primary : theme.border,
                backgroundColor: targeting.audience === audience.value ? theme.primary + '10' : theme.cardBackground
              }}
            >
              <h4 className="font-medium" style={{ color: theme.text }}>
                {audience.label}
              </h4>
            </div>
          ))}
        </div>
      </div>
      
      {targeting.audience === 'custom' && (
        <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.background }}>
          <h4 className="font-medium mb-3" style={{ color: theme.text }}>
            Custom Conditions
          </h4>
          <p className="text-sm mb-4" style={{ color: theme.textLight }}>
            Define specific conditions for targeting users. Coming soon: visual condition builder.
          </p>
          <TextArea
            label="Conditions (JSON format)"
            value={JSON.stringify(targeting.conditions, null, 2)}
            onChange={(value) => {
              try {
                const parsed = JSON.parse(value);
                onChange('targeting', 'conditions', parsed);
              } catch (e) {
                // Invalid JSON, don't update
              }
            }}
            rows={4}
            theme={theme}
            placeholder='[{"field": "subscription_status", "operator": "equals", "value": "premium"}]'
          />
        </div>
      )}
    </div>
  );
}

// Scheduling Tab
function SchedulingTab({ formData, onChange, theme }) {
  const scheduling = formData.scheduling;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={scheduling.active}
            onChange={(e) => onChange('scheduling', 'active', e.target.checked)}
            className="w-4 h-4 rounded border-2"
            style={{ borderColor: theme.border, accentColor: theme.primary }}
          />
          <span className="text-sm font-medium" style={{ color: theme.text }}>
            Scheduling Active
          </span>
        </label>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
            Timezone
          </label>
          <select
            value={scheduling.timezone || 'user_local'}
            onChange={(e) => onChange('scheduling', 'timezone', e.target.value)}
            className="w-full p-3 rounded-lg border"
            style={{ 
              borderColor: theme.border, 
              backgroundColor: theme.cardBackground, 
              color: theme.text 
            }}
          >
            <option value="user_local">User's Local Time</option>
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
          </select>
        </div>
        
        <TextInput
          label="Preferred Time (optional)"
          type="time"
          value={scheduling.preferredTime || ''}
          onChange={(value) => onChange('scheduling', 'preferredTime', value)}
          theme={theme}
        />
      </div>
      
      {scheduling.quietHours !== undefined && (
        <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.background }}>
          <h4 className="font-medium mb-3" style={{ color: theme.text }}>
            Quiet Hours
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <TextInput
              label="Start Time"
              type="time"
              value={scheduling.quietHours?.start || ''}
              onChange={(value) => onChange('scheduling', 'quietHours', { 
                ...scheduling.quietHours, 
                start: value 
              })}
              theme={theme}
            />
            <TextInput
              label="End Time"
              type="time"
              value={scheduling.quietHours?.end || ''}
              onChange={(value) => onChange('scheduling', 'quietHours', { 
                ...scheduling.quietHours, 
                end: value 
              })}
              theme={theme}
            />
          </div>
        </div>
      )}
    </div>
  );
}
