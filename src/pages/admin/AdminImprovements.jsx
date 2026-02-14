import React from 'react';
import { useOutletContext } from 'react-router-dom';
import ImprovementsTracker from '../../components/admin/ImprovementsTracker';

export default function AdminImprovements() {
  const { theme } = useOutletContext();
  return (
    <div className="space-y-4">
      <div className="max-w-6xl mx-auto">
        <ImprovementsTracker theme={theme} />
      </div>
    </div>
  );
}
