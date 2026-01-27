import React from 'react';
import { useOutletContext } from 'react-router-dom';
import ExpiredTrialManager from '../../components/admin/ExpiredTrialManager';

export default function AdminUsersExpiredTrials() {
  const { theme } = useOutletContext();
  return (
    <div className="space-y-3">
      <ExpiredTrialManager theme={theme} />
    </div>
  );
}
