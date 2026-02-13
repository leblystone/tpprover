import React from 'react';
import { useOutletContext } from 'react-router-dom';
import VersionManager from '../../components/admin/VersionManager';

export default function AdminSettingsVersion() {
  const { theme } = useOutletContext();
  return (
    <div className="space-y-4">
      <div className="max-w-4xl mx-auto">
        <VersionManager theme={theme} />
      </div>
    </div>
  );
}
