import React from 'react';
import { useOutletContext } from 'react-router-dom';
import WorkQueue from '../../components/admin/WorkQueue';

export default function AdminWorkQueue() {
  const { theme } = useOutletContext();
  return (
    <div className="space-y-3">
      <WorkQueue theme={theme} />
    </div>
  );
}
