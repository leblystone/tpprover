import React from 'react';
import { useOutletContext } from 'react-router-dom';
import EmailTriggerManager from '../../components/admin/EmailTriggerManager';

export default function AdminCommsTriggers() {
  const { theme } = useOutletContext();
  return (
    <div className="space-y-3">
      <EmailTriggerManager theme={theme} />
    </div>
  );
}
