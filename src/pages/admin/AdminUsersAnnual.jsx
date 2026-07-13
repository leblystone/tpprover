import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { Gift } from '@phosphor-icons/react';

export default function AdminUsersAnnual() {
  const { theme } = useOutletContext();
  return (
    <div className="flex flex-col h-full items-center justify-center p-6 text-center">
      <Gift size={32} style={{ color: theme.primary, opacity: 0.6 }} />
      <p className="text-sm font-semibold mt-3" style={{ color: theme.text }}>
        Annual codes
      </p>
      <p className="text-xs mt-1 max-w-[200px]" style={{ color: theme.textLight }}>
        Code manager is in the right panel. Select a user from All Users if you need their account details.
      </p>
    </div>
  );
}
