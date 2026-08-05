import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { CaretDown, CaretUp, PaperPlaneTilt } from '@phosphor-icons/react';
import PushNotificationBroadcast from '../../components/admin/PushNotificationBroadcast';
import NotificationTemplateEditor from '../../components/admin/NotificationTemplateEditor';

export default function AdminCommsPush() {
  const { theme } = useOutletContext();
  const [showBroadcast, setShowBroadcast] = useState(false);

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6">
      <NotificationTemplateEditor theme={theme} inline />

      <section className="space-y-3">
        <button
          type="button"
          onClick={() => setShowBroadcast((v) => !v)}
          className="w-full text-sm font-bold flex items-center gap-2 pb-1 border-b text-left"
          style={{ color: theme.text, borderColor: theme.border }}
        >
          <PaperPlaneTilt size={16} weight="duotone" style={{ color: theme.primary }} />
          One-off broadcast
          <span className="ml-auto">
            {showBroadcast ? (
              <CaretUp size={16} weight="duotone" style={{ color: theme.textLight }} />
            ) : (
              <CaretDown size={16} weight="duotone" style={{ color: theme.textLight }} />
            )}
          </span>
        </button>
        {showBroadcast && <PushNotificationBroadcast theme={theme} />}
      </section>
    </div>
  );
}
