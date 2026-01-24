import React from 'react';
import { useOutletContext } from 'react-router-dom';
import ImprovementsTracker from '../../components/admin/ImprovementsTracker';

export default function AdminImprovements() {
  const { theme } = useOutletContext();
  return (
    <div className="space-y-3">
      <ImprovementsTracker theme={theme} />
    </div>
  );
}
