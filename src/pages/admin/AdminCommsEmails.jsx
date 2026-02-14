import React from 'react';
import { useOutletContext } from 'react-router-dom';
import EmailTemplateManager from '../../components/admin/EmailTemplateManager';

export default function AdminCommsEmails() {
  const { theme } = useOutletContext();
  return (
    <div className="space-y-4">
      <div className="max-w-5xl mx-auto">
        <EmailTemplateManager theme={theme} />
      </div>
    </div>
  );
}
