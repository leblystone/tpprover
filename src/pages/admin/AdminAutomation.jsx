import React from 'react';
import { useOutletContext } from 'react-router-dom';
import AdminGhostWorker from './AdminGhostWorker';

export default function AdminAutomation() {
  const { theme } = useOutletContext();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: theme.text }}>
          Automation
        </h1>
        <p className="text-sm mt-1" style={{ color: theme.textLight }}>
          AI-powered support automation and pending responses
        </p>
      </div>

      <AdminGhostWorker />
    </div>
  );
}
