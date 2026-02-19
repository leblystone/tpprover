import React from 'react';
import { useOutletContext } from 'react-router-dom';
import EmailHistory from '../../components/admin/EmailHistory';

export default function AdminCommsHistory() {
  const { theme } = useOutletContext();
  return (
    <div className="space-y-4">
      <div className="max-w-5xl mx-auto">
        <EmailHistory theme={theme} />
      </div>
    </div>
  );
}
