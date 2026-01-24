import React from 'react';
import { useOutletContext } from 'react-router-dom';
import EmailTemplateManager from '../../components/admin/EmailTemplateManager';

export default function AdminCommsEmails() {
  const { theme } = useOutletContext();
  return (
    <div className="space-y-3">
      <EmailTemplateManager theme={theme} />
    </div>
  );
}
