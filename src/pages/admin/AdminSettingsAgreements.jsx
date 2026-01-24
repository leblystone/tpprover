import React from 'react';
import { useOutletContext } from 'react-router-dom';
import AgreementTracking from '../../components/admin/AgreementTracking';

export default function AdminSettingsAgreements() {
  const { theme } = useOutletContext();
  return (
    <div className="space-y-3">
      <AgreementTracking theme={theme} />
    </div>
  );
}
