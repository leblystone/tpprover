import React from 'react';
import { useOutletContext } from 'react-router-dom';
import PushNotificationBroadcast from '../../components/admin/PushNotificationBroadcast';
import TriggeredNotificationManager from '../../components/admin/TriggeredNotificationManager';

export default function AdminCommsPush() {
  const { theme } = useOutletContext();
  return (
    <div className="space-y-3">
      <PushNotificationBroadcast theme={theme} />
      <TriggeredNotificationManager theme={theme} />
    </div>
  );
}
