import React from 'react';
import { useOutletContext } from 'react-router-dom';
import VersionManager from '../../components/admin/VersionManager';

export default function AdminSettingsVersion() {
  const { theme } = useOutletContext();
  return (
    <div className="space-y-3">
      <VersionManager theme={theme} />
    </div>
  );
}
