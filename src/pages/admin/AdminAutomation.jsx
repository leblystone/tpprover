import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Bot, Zap } from 'lucide-react';
import AdminGhostWorker from './AdminGhostWorker';
import AdminCommsTriggers from './AdminCommsTriggers';
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
          Manage automated systems and triggers
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
      {activeTab === 'triggers' && <AdminCommsTriggers />}
    </div>
  );
}
