import React from 'react';
import { useOutletContext } from 'react-router-dom';
import SecurityManager from '../../components/admin/SecurityManager';

export default function AdminSettingsSecurity() {
  const { theme } = useOutletContext();
  return (
    <div className="space-y-3">
      <SecurityManager theme={theme} />
    </div>
  );
}
