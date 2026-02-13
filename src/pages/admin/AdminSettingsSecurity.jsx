import React from 'react';
import { useOutletContext } from 'react-router-dom';
import SecurityManager from '../../components/admin/SecurityManager';

export default function AdminSettingsSecurity() {
  const { theme } = useOutletContext();
  return (
    <div className="space-y-4">
      <div className="max-w-4xl mx-auto">
        <SecurityManager theme={theme} />
      </div>
    </div>
  );
}
