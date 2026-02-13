import React from 'react';
import { useOutletContext } from 'react-router-dom';
import EmailTriggerManager from '../../components/admin/EmailTriggerManager';

export default function AdminCommsTriggers() {
  const { theme } = useOutletContext();
  return (
    <div className="space-y-4">
      <div className="max-w-5xl mx-auto">
        <EmailTriggerManager theme={theme} />
      </div>
    </div>
  );
}
