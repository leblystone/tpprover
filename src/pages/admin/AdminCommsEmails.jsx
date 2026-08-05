import React from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { EnvelopeSimple, Lightning, ClockCounterClockwise } from '@phosphor-icons/react';
import EmailTemplateManager from '../../components/admin/EmailTemplateManager';
import EmailTriggerManager from '../../components/admin/EmailTriggerManager';
import AdminCommsHistory from './AdminCommsHistory';

const VIEWS = [
  { id: 'templates', label: 'Templates', icon: EnvelopeSimple },
  { id: 'triggers', label: 'Triggers', icon: Lightning },
  { id: 'history', label: 'Send History', icon: ClockCounterClockwise },
];

function resolveView(raw) {
  if (raw === 'history' || raw === 'triggers' || raw === 'templates') return raw;
  return 'templates';
}

export default function AdminCommsEmails() {
  const { theme } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = resolveView(searchParams.get('view'));

  const switchView = (next) => {
    setSearchParams(next === 'templates' ? {} : { view: next }, { replace: true });
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
          aria-label="Email view"
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

      {view === 'templates' && (
        <div className="max-w-5xl mx-auto w-full">
          <EmailTemplateManager theme={theme} />
        </div>
      )}
      {view === 'triggers' && (
        <div className="max-w-5xl mx-auto w-full">
          <EmailTriggerManager theme={theme} />
        </div>
      )}
      {view === 'history' && <AdminCommsHistory embedded />}
    </div>
  );
}
