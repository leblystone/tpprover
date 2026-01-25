import React from 'react';
import { useOutletContext } from 'react-router-dom';
import GhostWorkerWorkQueue from '../../components/admin/GhostWorkerWorkQueue';

export default function AdminWorkQueue() {
  const { theme } = useOutletContext();
  return (
    <div className="space-y-3">
      <GhostWorkerWorkQueue theme={theme} />
    </div>
  );
}
