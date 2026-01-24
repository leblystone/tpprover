import React from 'react';
import { useOutletContext } from 'react-router-dom';
import GhostWorkerDashboard from '../../components/admin/GhostWorkerDashboard';

export default function AdminGhostWorker() {
  const { theme } = useOutletContext();
  return (
    <div className="space-y-3">
      <GhostWorkerDashboard theme={theme} />
    </div>
  );
}
