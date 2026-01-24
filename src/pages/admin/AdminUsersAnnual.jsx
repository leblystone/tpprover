import React from 'react';
import { useOutletContext } from 'react-router-dom';
import AnnualCodeManager from '../../components/admin/AnnualCodeManager';

export default function AdminUsersAnnual() {
  const { theme } = useOutletContext();
  return (
    <div className="space-y-3">
      <AnnualCodeManager theme={theme} />
    </div>
  );
}
