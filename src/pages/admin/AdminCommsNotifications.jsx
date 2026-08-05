import React from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { Bell, ChartLine } from '@phosphor-icons/react';
import AdminCommsPush from './AdminCommsPush';
import PushDeliveryTracker from '../../components/admin/PushDeliveryTracker';

const VIEWS = [
  { id: 'tracker', label: 'Tracking', icon: ChartLine },
  { id: 'content', label: 'Templates & Broadcast', icon: Bell },
];

function resolveView(raw) {
  if (raw === 'content') return 'content';
  return 'tracker';
}

export default function AdminCommsNotifications() {
  const { theme } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = resolveView(searchParams.get('view'));

  const switchView = (next) => {
    setSearchParams(next === 'tracker' ? {} : { view: next }, { replace: true });
  };

  return (
    <div className="space-y-4">
      <div className="max-w-5xl mx-auto w-full">
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
                <Icon size={20} weight="duotone" />
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
