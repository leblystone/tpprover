import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, Save, X, Bell, Clock, Users, Target, Send, 
  Play, Pause, Calendar, Settings, AlertTriangle, CheckCircle, Copy
} from 'lucide-react';
import Modal from '../common/Modal';
import TextInput from '../common/inputs/TextInput';
import TextArea from '../common/inputs/TextArea';
import unifiedNotificationService from '../../services/unifiedNotifications';

// Default triggered notification templates
const DEFAULT_TRIGGERED_NOTIFICATIONS = {
  welcome: {
    id: 'welcome',
    name: 'Welcome Message',
    title: '🎉 Welcome to The Pep Planner!',
    body: 'Thanks for joining! Get started by exploring your dashboard.',
    enabled: true,
    triggers: {
      type: 'user_event',
      event: 'first_login',
      delay: 0
    },
    targeting: {
      audience: 'new_users',
      conditions: []
    },
    scheduling: {
      active: true,
      timezone: 'user_local'
    }
  },
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
    name: 'Re-engagement',
    title: '👋 We miss you!',
    body: 'Your research journey is waiting. Come back and check your progress!',
    enabled: false,
    triggers: {
      type: 'time_based',
      condition: 'last_login',
      delay: 7, // days
      unit: 'days'
    },
    targeting: {
      audience: 'inactive_users',
      conditions: [
        { field: 'last_login', operator: 'older_than', value: 7, unit: 'days' }
      ]
    },
    scheduling: {
      active: true,
      timezone: 'user_local',
      preferredTime: '10:00'
    }
  }
};

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

export default function TriggeredNotificationManager({ theme }) {
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('tpp_triggered_notifications');
      return saved ? JSON.parse(saved) : DEFAULT_TRIGGERED_NOTIFICATIONS;
    } catch (error) {
      console.error('Failed to load triggered notifications:', error);
      return DEFAULT_TRIGGERED_NOTIFICATIONS;
    }
  });

  const [editingNotification, setEditingNotification] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [testingId, setTestingId] = useState(null);

  // Save to localStorage whenever notifications change
  useEffect(() => {
    try {
      localStorage.setItem('tpp_triggered_notifications', JSON.stringify(notifications));
    } catch (error) {
      console.error('Failed to save triggered notifications:', error);
    }
  }, [notifications]);

  const handleCreateNew = () => {
    const newId = `custom_${Date.now()}`;
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

  const handleSave = (updatedNotification) => {
    setNotifications(prev => ({
      ...prev,
      [updatedNotification.id]: updatedNotification
    }));
    setShowEditor(false);
    setEditingNotification(null);
    
    window.dispatchEvent(new CustomEvent('tpp:toast', {
      detail: { 
        type: 'success', 
        message: 'Triggered notification saved successfully!' 
      }
    }));
  };

  const handleDelete = (id) => {
    if (!window.confirm('Are you sure you want to delete this triggered notification?')) {
      return;
    }
    
    setNotifications(prev => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
    
    window.dispatchEvent(new CustomEvent('tpp:toast', {
      detail: { 
        type: 'success', 
        message: 'Triggered notification deleted!' 
      }
    }));
  };

  const handleToggleEnabled = (id) => {
    setNotifications(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        enabled: !prev[id].enabled
      }
    }));
  };

  const handleTest = async (notification) => {
    setTestingId(notification.id);
    
    try {
      // Check if notifications are supported
      const status = await unifiedNotificationService.isSupported();
      
      if (!status.supported) {
        throw new Error(`Notifications not supported on ${status.platform}`);
      }

      if (status.permission !== 'granted') {
        const permission = await unifiedNotificationService.requestPermission();
        if (permission !== 'granted') {
          throw new Error('Notification permission is required');
        }
      }

      // Process any variables in the notification using sample data
      const sampleData = {
        count: 3,
        peptideName: 'BPC-157',
        userName: 'Test User',
        days: 7
      };
      
      const processed = unifiedNotificationService.processTemplate(notification, sampleData);

      // Send test notification (automatically detects platform - mobile or web)
      await unifiedNotificationService.sendNotification(processed.title, {
        body: processed.body,
        tag: `test-triggered-${notification.id}`,
        data: {
          test: true,
          path: '/app/dashboard',
          notificationId: notification.id
        }
      });

      const platformInfo = unifiedNotificationService.getPlatformInfo();
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { 
          type: 'success', 
          message: `Test notification sent! Check your ${platformInfo.isNative ? 'mobile' : 'browser'} notifications.` 
        }
      }));

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: theme.text }}>
            Triggered Push Notifications
          </h2>
          <p className="text-sm mt-1" style={{ color: theme.textLight }}>
            Automate notifications based on user behavior, data conditions, and time triggers
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          className="px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity"
          style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
        >
          <Plus size={18} />
          Create Notification
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {Object.values(notifications).map(notification => (
          <div
            key={notification.id}
            className="rounded-lg border p-6 shadow-sm"
            style={{ 
              borderColor: theme.border, 
              backgroundColor: theme.cardBackground 
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold" style={{ color: theme.text }}>
                    {notification.name}
                  </h3>
                  <span 
                    className="px-2 py-1 rounded-full text-xs font-medium"
                    style={{ 
                      backgroundColor: getStatusColor(notification) + '20',
                      color: getStatusColor(notification)
                    }}
                  >
                    {getStatusText(notification)}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm" style={{ color: theme.textLight }}>
                  <div className="flex items-center gap-2">
                    <Bell size={14} />
                    <span><strong>Title:</strong> {notification.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={14} />
                    <span><strong>Trigger:</strong> {getTriggerDescription(notification.triggers)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={14} />
                    <span><strong>Audience:</strong> {AUDIENCE_TYPES.find(a => a.value === notification.targeting.audience)?.label}</span>
                  </div>
                </div>
                
                <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: theme.background }}>
                  <p className="text-sm" style={{ color: theme.text }}>
                    <strong>Message:</strong> {notification.body}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => handleToggleEnabled(notification.id)}
                  className="p-2 rounded-lg transition-colors hover:opacity-90"
                  style={{ 
                    backgroundColor: notification.enabled ? theme.success + '20' : theme.textLight + '20',
                    color: notification.enabled ? theme.success : theme.textLight
                  }}
                  title={notification.enabled ? 'Disable' : 'Enable'}
                >
                  {notification.enabled ? <Play size={16} /> : <Pause size={16} />}
                </button>
                
                <button
                  onClick={() => handleTest(notification)}
                  disabled={testingId === notification.id}
                  className="p-2 rounded-lg transition-colors hover:opacity-90 disabled:opacity-50"
                  style={{ 
                    backgroundColor: theme.primary + '20',
                    color: theme.primary
                  }}
                  title="Send Test"
                >
                  {testingId === notification.id ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                </button>
                
                <button
                  onClick={() => handleEdit(notification)}
                  className="p-2 rounded-lg transition-colors hover:opacity-90"
                  style={{ 
                    backgroundColor: theme.info + '20' || '#3b82f620',
                    color: theme.info || '#3b82f6'
                  }}
                  title="Edit"
                >
                  <Edit size={16} />
                </button>
                
                <button
                  onClick={() => handleDelete(notification.id)}
                  className="p-2 rounded-lg transition-colors hover:opacity-90"
                  style={{ 
                    backgroundColor: theme.error + '20' || '#ef444420',
                    color: theme.error || '#ef4444'
                  }}
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {Object.keys(notifications).length === 0 && (
          <div className="text-center py-12">
            <Bell size={48} style={{ color: theme.textLight, opacity: 0.5 }} className="mx-auto mb-4" />
            <p className="text-lg font-medium mb-2" style={{ color: theme.text }}>
              No triggered notifications yet
            </p>
            <p className="text-sm mb-4" style={{ color: theme.textLight }}>
              Create your first automated notification to engage users
            </p>
            <button
              onClick={handleCreateNew}
              className="px-4 py-2 rounded-lg font-semibold"
              style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
            >
              Create Your First Notification
            </button>
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
    { id: 'targeting', label: 'Targeting', icon: Target },
    { id: 'scheduling', label: 'Scheduling', icon: Calendar }
  ];

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={`${notification.id.startsWith('custom_') ? 'Create' : 'Edit'} Triggered Notification`}
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
            <Save size={16} className="inline mr-2" />
            Save Notification
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
        <div className="grid grid-cols-2 gap-2 text-sm" style={{ color: theme.textLight }}>
          <div>• <code>{'{userName}'}</code> - User's name</div>
          <div>• <code>{'{count}'}</code> - Count/number</div>
          <div>• <code>{'{peptideName}'}</code> - Peptide name</div>
          <div>• <code>{'{days}'}</code> - Number of days</div>
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
          Target Audience *
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
