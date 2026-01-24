import React from 'react';
import { useOutletContext } from 'react-router-dom';
import InAppNotificationManager from '../../components/admin/InAppNotificationManager';

export default function AdminCommsInApp() {
  const { theme } = useOutletContext();
  return (
    <div className="space-y-3">
      <InAppNotificationManager theme={theme} />
    </div>
  );
}
