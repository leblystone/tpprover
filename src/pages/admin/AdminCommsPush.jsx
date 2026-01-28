import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Settings } from 'lucide-react';
import PushNotificationBroadcast from '../../components/admin/PushNotificationBroadcast';
import TriggeredNotificationManager from '../../components/admin/TriggeredNotificationManager';
import NotificationTemplateEditor from '../../components/admin/NotificationTemplateEditor';

export default function AdminCommsPush() {
  const { theme } = useOutletContext();
  const [templateEditorOpen, setTemplateEditorOpen] = useState(false);

  return (
    <div className="space-y-3">
      {/* Header with Template Editor Button */}
      <div className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
        <div>
          <h2 className="text-lg font-bold" style={{ color: theme.text }}>
            Push Notification Management
          </h2>
          <p className="text-xs mt-0.5" style={{ color: theme.textLight }}>
            Manage push notification templates and triggered notifications
          </p>
        </div>
        <button
          onClick={() => setTemplateEditorOpen(true)}
          className="px-4 py-2 rounded-lg flex items-center gap-2 transition-all hover:opacity-90"
          style={{ 
            backgroundColor: theme.primary,
            color: theme.textOnPrimary
          }}
        >
          <Settings size={16} />
          Edit Templates
        </button>
      </div>

      <PushNotificationBroadcast theme={theme} />
      <TriggeredNotificationManager theme={theme} />

      {/* Template Editor Modal */}
      <NotificationTemplateEditor
        isOpen={templateEditorOpen}
        onClose={() => setTemplateEditorOpen(false)}
        theme={theme}
      />
    </div>
  );
}
