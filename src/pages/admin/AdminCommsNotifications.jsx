import React, { useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { Bell, ChartLine } from '@phosphor-icons/react';
import AdminCommsPush from './AdminCommsPush';
import PushDeliveryTracker from '../../components/admin/PushDeliveryTracker';

const VIEWS = [
  { id: 'tracker', label: 'Tracker', icon: ChartLine },
  { id: 'content', label: 'Templates & Broadcast', icon: Bell },
];

export default function AdminCommsNotifications() {
  const { theme } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const initial = searchParams.get('view') === 'content' ? 'content' : 'tracker';
  const [view, setView] = useState(initial);

  const switchView = (next) => {
    setView(next);
    setSearchParams(next === 'content' ? { view: 'content' } : {}, { replace: true });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: theme.text }}>
            Notifications
          </h1>
          <p className="text-sm mt-1" style={{ color: theme.textLight }}>
            {view === 'tracker'
              ? 'Delivery log — type, trigger, UID, and status. No message contents.'
              : 'Edit automated FCM templates and send one-off broadcasts.'}
          </p>
        </div>

        <div
          className="flex w-full rounded-xl border p-1 gap-1"
          style={{
            borderColor: theme.border,
            backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : '#e8eaed',
          }}
          role="tablist"
          aria-label="Notifications view"
        >
          {VIEWS.map(({ id, label, icon: Icon }) => {
            const active = view === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => switchView(id)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: active ? theme.primary : 'transparent',
                  color: active ? '#fff' : theme.text,
                }}
              >
                <Icon size={15} weight={active ? 'fill' : 'regular'} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {view === 'tracker' ? (
        <PushDeliveryTracker theme={theme} embedded />
      ) : (
        <AdminCommsPush />
      )}
    </div>
  );
}
