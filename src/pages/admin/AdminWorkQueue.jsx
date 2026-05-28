import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import WorkQueue from '../../components/admin/WorkQueue';

export default function AdminWorkQueue() {
  const { theme } = useOutletContext();
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: theme.text }}>
        <ClipboardList size={24} />
        User Reports
      </h1>
      <WorkQueue theme={theme} />
    </div>
  );
}
