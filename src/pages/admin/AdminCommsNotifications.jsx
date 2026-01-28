import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Bell, Smartphone } from 'lucide-react';
import AdminCommsPush from './AdminCommsPush';
import AdminCommsInApp from './AdminCommsInApp';
import Tabs from '../../components/common/Tabs';

export default function AdminCommsNotifications() {
  const { theme } = useOutletContext();
  const [activeTab, setActiveTab] = useState('push');

  const tabs = [
    {
      value: 'push',
      label: 'Push Notifications',
      icon: Bell,
    },
    {
      value: 'in-app',
      label: 'In-App Notifications',
      icon: Smartphone,
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: theme.text }}>
          Notifications
        </h1>
        <p className="text-sm mt-1" style={{ color: theme.textLight }}>
          Manage push and in-app notifications
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

      {activeTab === 'push' && <AdminCommsPush />}
      {activeTab === 'in-app' && <AdminCommsInApp />}
    </div>
  );
}
