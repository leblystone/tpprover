import React from 'react';
import { useOutletContext } from 'react-router-dom';
import AccountDeletionHistory from '../../components/admin/AccountDeletionHistory';

export default function AdminSettingsDeletions() {
  const { theme } = useOutletContext();
  return (
    <div className="space-y-3">
      <AccountDeletionHistory theme={theme} />
    </div>
  );
}
