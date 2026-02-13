import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Bot, Zap, ClipboardList } from 'lucide-react';
import AdminGhostWorker from './AdminGhostWorker';
import AdminCommsTriggers from './AdminCommsTriggers';
import GhostWorkerWorkQueue from '../../components/admin/GhostWorkerWorkQueue';
import Tabs from '../../components/common/Tabs';

export default function AdminAutomation() {
  const { theme } = useOutletContext();
  const [activeTab, setActiveTab] = useState('ghost-worker');

  const tabs = [
    {
      value: 'ghost-worker',
      label: 'Ghost Worker',
      icon: Bot,
    },
    {
      value: 'work-queue',
      label: 'Work Queue',
      icon: ClipboardList,
    },
    {
      value: 'triggers',
      label: 'Triggers',
      icon: Zap,
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: theme.text }}>
          Automation
        </h1>
        <p className="text-sm mt-1" style={{ color: theme.textLight }}>
          Manage AI-powered automation, pending responses, and notification triggers
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

      {activeTab === 'ghost-worker' && <AdminGhostWorker />}
      {activeTab === 'work-queue' && <GhostWorkerWorkQueue theme={theme} />}
      {activeTab === 'triggers' && <AdminCommsTriggers />}
    </div>
  );
}
