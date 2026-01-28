import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { MessageSquare, Ticket, Mail, ClipboardList } from 'lucide-react';
import AdminFeedback from './AdminFeedback';
import AdminContact from './AdminContact';
import AdminWorkQueue from './AdminWorkQueue';
import Tabs from '../../components/common/Tabs';

export default function AdminSupport() {
  const { theme } = useOutletContext();
  const [activeTab, setActiveTab] = useState('feedback');

  const tabs = [
    {
      value: 'feedback',
      label: 'Feedback & Tickets',
      icon: MessageSquare,
    },
    {
      value: 'contact',
      label: 'Contact',
      icon: Mail,
    },
    {
      value: 'work-queue',
      label: 'Work Queue',
      icon: ClipboardList,
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: theme.text }}>
          Support
        </h1>
        <p className="text-sm mt-1" style={{ color: theme.textLight }}>
          Manage feedback, tickets, contact submissions, and work queue
        </p>
      </div>

      <Tabs
        value={activeTab}
        onChange={setActiveTab}
        theme={theme}
        stretch
        options={tabs.map(tab => ({
          label: tab.label,
          value: tab.value,
        }))}
      />

      {activeTab === 'feedback' && <AdminFeedback />}
      {activeTab === 'contact' && <AdminContact />}
      {activeTab === 'work-queue' && <AdminWorkQueue />}
    </div>
  );
}
