import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, MessageSquare, Bell, AlertTriangle, Send } from 'lucide-react';
import { 
  getAllTemplates, 
  saveNotificationTemplate, 
  resetTemplatesToDefault,
  DEFAULT_TEMPLATES 
} from '../../utils/notificationTemplates';
import Modal from '../common/Modal';
import TextInput from '../common/inputs/TextInput';
import TextArea from '../common/inputs/TextArea';
import pwaNotificationService from '../../services/pwaNotifications';

export default function NotificationTemplateEditor({ isOpen, onClose, theme }) {
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [editedTemplate, setEditedTemplate] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = () => {
    const loadedTemplates = getAllTemplates();
    setTemplates(loadedTemplates);
  };

  const handleTemplateSelect = (templateType) => {
    setSelectedTemplate(templateType);
    setEditedTemplate({ ...templates[templateType] });
    setHasChanges(false);
  };

  const handleTemplateChange = (field, value) => {
    setEditedTemplate(prev => ({
      ...prev,
      [field]: value
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    if (selectedTemplate && editedTemplate) {
      const success = saveNotificationTemplate(selectedTemplate, editedTemplate);
      if (success) {
        setTemplates(prev => ({
          ...prev,
          [selectedTemplate]: editedTemplate
        }));
        setHasChanges(false);
        // Show success message
        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: { 
            type: 'success', 
            message: 'Notification template saved successfully!' 
          }
        }));
      }
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
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { 
          type: 'success', 
          message: 'All templates reset to defaults!' 
        }
      }));
    }
  };

  const handleTestNotification = async () => {
    if (!selectedTemplate || !editedTemplate) {
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { 
          type: 'error', 
          message: 'Please select a template to test' 
        }
      }));
      return;
    }

    try {
      // Get sample data for the selected template type
      const sampleData = getSampleDataForTemplate(selectedTemplate);
      
      // Replace variables in the template
      const processedTemplate = { ...editedTemplate };
      Object.keys(sampleData).forEach(key => {
        const placeholder = `{${key}}`;
        processedTemplate.title = processedTemplate.title?.replace(new RegExp(placeholder, 'g'), sampleData[key] || '');
        processedTemplate.body = processedTemplate.body?.replace(new RegExp(placeholder, 'g'), sampleData[key] || '');
      });

      // ONLY test PWA notifications for Templates (this is just for previewing the text)
      const status = pwaNotificationService.getStatus();
      
      if (!status.supported) {
        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: { 
            type: 'error', 
            message: 'PWA notifications not supported in this browser. Template preview not available.' 
          }
        }));
        return;
      }

      if (status.permission !== 'granted') {
        try {
          const permission = await pwaNotificationService.requestPermission();
          if (permission !== 'granted') {
            window.dispatchEvent(new CustomEvent('tpp:toast', {
              detail: { 
                type: 'warning', 
                message: 'Notification permission needed to preview template appearance' 
              }
            }));
            return;
          }
        } catch (error) {
          window.dispatchEvent(new CustomEvent('tpp:toast', {
            detail: { 
              type: 'warning', 
              message: 'Cannot preview template - permission denied' 
            }
          }));
          return;
        }
      }

      // Send PWA notification (template preview only)
      pwaNotificationService.showNotification(processedTemplate.title, {
        body: processedTemplate.body,
        tag: `template-preview-${selectedTemplate}`,
        icon: '/tpp_logo.png',
        data: {
          path: processedTemplate.actionUrl || '/app/dashboard'
        }
      });

      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { 
          type: 'success', 
          message: 'Template preview sent! This is how the message will look.' 
        }
      }));

    } catch (error) {
      console.error('Failed to preview template:', error);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { 
          type: 'error', 
          message: 'Failed to preview template: ' + error.message 
        }
      }));
    }
  };

  const getSampleDataForTemplate = (templateType) => {
    const sampleData = {
      lowStock: {
        count: 2,
        peptideName: 'BPC-157'
      },
      orderArrived: {
        peptideName: 'TB-500'
      },
      orderStatusUpdate: {
        peptideName: 'Semaglutide',
        status: 'Shipped',
        additionalMessage: 'Expected delivery: 2-3 business days'
      },
      washoutReminder: {
        protocolName: 'BPC-157 Protocol',
        daysAgo: 3
      },
      cycleReminder: {
        protocolName: 'Recovery Protocol',
        daysUntil: 2
      },
      cycleEndReminder: {
        protocolName: 'Recovery Protocol', 
        daysUntil: 1
      },
      researchReminder: {
        peptideName: 'BPC-157',
        taskCount: 3
      }
    };
    
    return sampleData[templateType] || {};
  };

  const getTemplateIcon = (type) => {
    switch (type) {
      case 'lowStock': return <AlertTriangle size={16} />;
      case 'orderArrived': return <Bell size={16} />;
      case 'orderStatusUpdate': return <Bell size={16} />;
      case 'washoutReminder': return <Bell size={16} />;
      case 'cycleReminder': return <Bell size={16} />;
      case 'cycleEndReminder': return <Bell size={16} />;
      case 'researchReminder': return <Bell size={16} />;
      default: return <MessageSquare size={16} />;
    }
  };

  const getTemplateDescription = (type) => {
    const descriptions = {
      lowStock: 'Alert when stockpile items are running low',
      orderArrived: 'Notification when orders are delivered',
      orderStatusUpdate: 'Updates when order status changes',
      washoutReminder: 'Reminders about washout periods',
      cycleReminder: 'Reminders about upcoming cycles',
      cycleEndReminder: 'Reminders when cycles are ending',
      researchReminder: 'Daily research task reminders'
    };
    return descriptions[type] || 'Custom notification template';
  };

  return (
    <>
      <Modal
        open={isOpen}
        onClose={onClose}
        title="Notification Template Editor"
        titleExtra={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowResetConfirm(true)}
              className="px-3 py-1 text-sm rounded-lg border transition-all hover:opacity-90"
              style={{ 
                borderColor: theme.border, 
                color: theme.text,
                backgroundColor: theme.cardBackground 
              }}
            >
              <RotateCcw size={14} className="inline mr-1" />
              Reset All
            </button>
          </div>
        }
        theme={theme}
        size="large"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
          {/* Template List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold" style={{ color: theme.text }}>
              Available Templates
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {Object.entries(templates).map(([type, template]) => (
                <div
                  key={type}
                  onClick={() => handleTemplateSelect(type)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                    selectedTemplate === type ? 'ring-2 ring-opacity-50' : ''
                  }`}
                  style={{
                    borderColor: selectedTemplate === type ? theme.primary : theme.border,
                    backgroundColor: selectedTemplate === type ? theme.primary + '10' : theme.cardBackground,
                    color: theme.text
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {getTemplateIcon(type)}
                    <span className="font-medium capitalize">
                      {type.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </div>
                  <p className="text-sm opacity-75">
                    {getTemplateDescription(type)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Template Editor */}
          <div className="space-y-4">
            {selectedTemplate && editedTemplate ? (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold" style={{ color: theme.text }}>
                    Edit Template
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handleReset}
                      className="px-3 py-1 text-sm rounded-lg border transition-all hover:opacity-90"
                      style={{ 
                        borderColor: theme.border, 
                        color: theme.text,
                        backgroundColor: theme.cardBackground 
                      }}
                    >
                      <RotateCcw size={14} className="inline mr-1" />
                      Reset
                    </button>
                    <button
                      onClick={handleTestNotification}
                      className="px-3 py-1 text-sm rounded-lg border transition-all hover:opacity-90"
                      style={{ 
                        borderColor: theme.primary,
                        color: theme.primary,
                        backgroundColor: theme.cardBackground 
                      }}
                    >
                      <Send size={14} className="inline mr-1" />
                      Preview
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={!hasChanges}
                      className="px-3 py-1 text-sm rounded-lg transition-all hover:opacity-90 disabled:opacity-50"
                      style={{ 
                        backgroundColor: hasChanges ? theme.primary : theme.border,
                        color: hasChanges ? theme.textOnPrimary : theme.textLight
                      }}
                    >
                      <Save size={14} className="inline mr-1" />
                      Save
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
                      onChange={(e) => handleTemplateChange('title', e.target.value)}
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
                      onChange={(e) => handleTemplateChange('body', e.target.value)}
                      placeholder="Notification message"
                      rows={3}
                      theme={theme}
                    />
                    <p className="text-xs mt-1" style={{ color: theme.textLight }}>
                      Use variables like {'{peptideName}'}, {'{count}'}, {'{daysUntil}'} for dynamic content
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
                      Action Button Text
                    </label>
                    <TextInput
                      value={editedTemplate.actionText || ''}
                      onChange={(e) => handleTemplateChange('actionText', e.target.value)}
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
                      onChange={(e) => handleTemplateChange('actionUrl', e.target.value)}
                      placeholder="/app/dashboard"
                      theme={theme}
                    />
                  </div>

                  {hasChanges && (
                    <div className="p-3 rounded-lg border" style={{ 
                      borderColor: theme.primary + '50', 
                      backgroundColor: theme.primary + '10' 
                    }}>
                      <p className="text-sm" style={{ color: theme.primary }}>
                        You have unsaved changes. Click Save to apply them.
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <MessageSquare size={48} style={{ color: theme.textLight, opacity: 0.5 }} />
                  <p className="mt-2" style={{ color: theme.textLight }}>
                    Select a template to edit
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Reset Confirmation Modal */}
      <Modal
        open={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        title="Reset All Templates"
        theme={theme}
      >
        <div className="space-y-4">
          <p style={{ color: theme.text }}>
            Are you sure you want to reset all notification templates to their default values? 
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowResetConfirm(false)}
              className="px-4 py-2 rounded-lg border transition-all hover:opacity-90"
              style={{ 
                borderColor: theme.border, 
                color: theme.text,
                backgroundColor: theme.cardBackground 
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleResetAll}
              className="px-4 py-2 rounded-lg transition-all hover:opacity-90"
              style={{ 
                backgroundColor: theme.error || '#ef4444',
                color: '#ffffff'
              }}
            >
              Reset All
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
