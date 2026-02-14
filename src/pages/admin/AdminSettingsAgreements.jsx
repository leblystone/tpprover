import React from 'react';
import { useOutletContext } from 'react-router-dom';
import AgreementTracking from '../../components/admin/AgreementTracking';

export default function AdminSettingsAgreements() {
  const { theme } = useOutletContext();
  return (
    <div className="space-y-4">
      <div className="max-w-5xl mx-auto">
        <AgreementTracking theme={theme} />
      </div>
    </div>
  );
}
