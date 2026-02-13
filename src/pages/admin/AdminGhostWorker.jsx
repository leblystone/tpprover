import React from 'react';
import { useOutletContext } from 'react-router-dom';
import GhostWorkerDashboard from '../../components/admin/GhostWorkerDashboard';

export default function AdminGhostWorker() {
  const { theme } = useOutletContext();
  return (
    <div className="space-y-4">
      <div className="max-w-5xl mx-auto">
        <GhostWorkerDashboard theme={theme} />
      </div>
    </div>
  );
}
