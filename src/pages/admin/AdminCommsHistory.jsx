import React from 'react';
import { useOutletContext } from 'react-router-dom';
import EmailHistory from '../../components/admin/EmailHistory';

export default function AdminCommsHistory({ embedded = false }) {
  const { theme } = useOutletContext();

  return (
    <div className="space-y-4">
      <div className="max-w-5xl mx-auto w-full">
        {!embedded && (
          <div className="mb-4">
            <h1 className="text-2xl font-bold" style={{ color: theme.text }}>
              Send History
            </h1>
          </div>
        )}
        <EmailHistory theme={theme} />
      </div>
    </div>
  );
}
