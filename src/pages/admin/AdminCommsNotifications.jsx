import React from 'react';
import { useOutletContext } from 'react-router-dom';
import AdminCommsPush from './AdminCommsPush';

export default function AdminCommsNotifications() {
  const { theme } = useOutletContext();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: theme.text }}>
          Push Notifications
        </h1>
        <p className="text-sm mt-1" style={{ color: theme.textLight }}>
          Edit every automated FCM push below — saves apply to all users on the next send.
        </p>
      </div>
      <AdminCommsPush />
    </div>
  );
}
