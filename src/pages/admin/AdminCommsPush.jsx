import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Settings } from 'lucide-react';
import PushNotificationBroadcast from '../../components/admin/PushNotificationBroadcast';
import TriggeredNotificationManager from '../../components/admin/TriggeredNotificationManager';
import NotificationTemplateEditor from '../../components/admin/NotificationTemplateEditor';

export default function AdminCommsPush() {
  const { theme } = useOutletContext();
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold" style={{ color: theme.text }}>Push Notifications</h2>
        <button
          onClick={() => setShowTemplateEditor(true)}
          className="px-3 py-1.5 text-sm rounded-lg border transition-all hover:opacity-90 flex items-center gap-2"
          style={{ 
            borderColor: theme.border, 
            color: theme.text,
            backgroundColor: theme.cardBackground 
          }}
        >
          <Settings size={14} />
          Edit Templates
        </button>
      </div>
      <PushNotificationBroadcast theme={theme} />
      <TriggeredNotificationManager theme={theme} />
      
      <NotificationTemplateEditor 
        isOpen={showTemplateEditor} 
        onClose={() => setShowTemplateEditor(false)} 
        theme={theme} 
      />
    </div>
  );
}
