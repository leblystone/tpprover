import React from 'react';
import { useOutletContext } from 'react-router-dom';
import PushDeliveryTracker from '../../components/admin/PushDeliveryTracker';

export default function AdminCommsNotificationTracker() {
  const { theme } = useOutletContext();

  return (
    <div className="max-w-6xl mx-auto">
      <PushDeliveryTracker theme={theme} />
    </div>
  );
}
