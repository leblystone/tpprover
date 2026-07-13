import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { Clock } from '@phosphor-icons/react';

export default function AdminUsersExpiredTrials() {
  const { theme } = useOutletContext();
  return (
    <div className="flex flex-col h-full items-center justify-center p-6 text-center">
      <Clock size={32} style={{ color: theme.warning, opacity: 0.7 }} />
      <p className="text-sm font-semibold mt-3" style={{ color: theme.text }}>
        Expired trials
      </p>
      <p className="text-xs mt-1 max-w-[220px]" style={{ color: theme.textLight }}>
        Bulk extend and founder backfill tools are in the right panel. Pick a user under All Users for full account fixes.
      </p>
    </div>
  );
}
