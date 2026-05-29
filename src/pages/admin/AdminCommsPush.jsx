import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { CaretDown, CaretUp } from '@phosphor-icons/react';
import PushNotificationBroadcast from '../../components/admin/PushNotificationBroadcast';
import TriggeredNotificationManager from '../../components/admin/TriggeredNotificationManager';
import NotificationTemplateEditor from '../../components/admin/NotificationTemplateEditor';

export default function AdminCommsPush() {
  const { theme } = useOutletContext();
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [showTriggered, setShowTriggered] = useState(false);

  return (
    <div className="space-y-4">
      {/* Primary: all FCM templates inline */}
      <NotificationTemplateEditor theme={theme} inline />

      {/* Optional: one-off broadcast */}
      <div
        className="rounded-lg border overflow-hidden"
        style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}
      >
        <button
          type="button"
          onClick={() => setShowBroadcast((v) => !v)}
          className="w-full flex items-center justify-between p-4 text-left"
          style={{ color: theme.text }}
        >
          <span className="font-semibold">One-off broadcast</span>
          {showBroadcast ? <CaretUp size={18} /> : <CaretDown size={18} />}
        </button>
        {showBroadcast && (
          <div className="px-4 pb-4 border-t" style={{ borderColor: theme.border }}>
            <PushNotificationBroadcast theme={theme} />
          </div>
        )}
      </div>

      {/* Optional: triggered rules metadata */}
      <div
        className="rounded-lg border overflow-hidden"
        style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}
      >
        <button
          type="button"
          onClick={() => setShowTriggered((v) => !v)}
          className="w-full flex items-center justify-between p-4 text-left"
          style={{ color: theme.text }}
        >
          <span className="font-semibold">Triggered rules (advanced)</span>
          {showTriggered ? <CaretUp size={18} /> : <CaretDown size={18} />}
        </button>
        {showTriggered && (
          <div className="px-4 pb-4 border-t" style={{ borderColor: theme.border }}>
            <TriggeredNotificationManager theme={theme} />
          </div>
        )}
      </div>
    </div>
  );
}
