import React, { useState, useRef } from 'react';
import { Bell, Check } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';
import { themes, defaultThemeName } from '../../theme/themes';

const theme = themes[defaultThemeName];

/**
 * Sold-out notify CTA: button morphs in-place into email input, then confirmation.
 */
export default function NotifyButton({ product, compact = true }) {
  const [phase, setPhase] = useState('idle'); // idle | input | busy | done
  const [email, setEmail] = useState('');
  const inputRef = useRef(null);

  const activate = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    setPhase('input');
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  const cancel = () => {
    setPhase('idle');
    setEmail('');
  };

  const submit = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!email.trim() || phase === 'busy') return;
    setPhase('busy');
    try {
      const subscribe = httpsCallable(functions, 'subscribeNotifyMe');
      await subscribe({
        email: email.trim(),
        productId: product.id,
        productName: product.name,
      });
      setPhase('done');
    } catch {
      setPhase('input');
    }
  };

  const textClass = compact
    ? 'text-[10px] font-bold tracking-[0.15em] uppercase'
    : 'text-sm font-semibold';
  const slotHeight = compact ? '2.5rem' : '3.25rem';

  return (
    <div className="notify-slot w-full" style={{ minHeight: slotHeight }} onClick={(e) => e.stopPropagation()}>
      {phase === 'done' ? (
        <div
          className={`notify-confirm w-full h-full rounded-lg flex items-center justify-center gap-1.5 border ${textClass}`}
          style={{
            minHeight: slotHeight,
            borderColor: `${theme.primary}50`,
            color: theme.primary,
            backgroundColor: `${theme.primary}12`,
          }}
        >
          <Check size={compact ? 11 : 14} strokeWidth={3} aria-hidden />
          We&apos;ll notify you!
        </div>
      ) : phase === 'input' || phase === 'busy' ? (
        <form
          onSubmit={submit}
          className="notify-slide-in flex w-full h-full rounded-lg overflow-hidden border"
          style={{ minHeight: slotHeight, borderColor: `${theme.primary}70` }}
        >
          <input
            ref={inputRef}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') cancel();
            }}
            required
            placeholder="your@email.com"
            className={`flex-1 min-w-0 px-2.5 bg-transparent outline-none ${compact ? 'text-[11px] py-2' : 'text-sm py-2.5'}`}
            style={{ color: theme.text }}
          />
          <button
            type="submit"
            disabled={phase === 'busy'}
            className={`px-3 font-bold tracking-wide uppercase text-white disabled:opacity-50 shrink-0 ${compact ? 'text-[10px]' : 'text-sm'}`}
            style={{ backgroundColor: theme.primary }}
          >
            {phase === 'busy' ? '…' : 'Go'}
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={activate}
          className={`w-full h-full rounded-lg border transition-colors ${textClass}`}
          style={{
            minHeight: slotHeight,
            borderColor: `${theme.text}30`,
            color: theme.textLight,
            background: 'transparent',
          }}
        >
          <Bell className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} inline mr-1.5`} />
          Notify Me
        </button>
      )}
    </div>
  );
}

export const NOTIFY_BUTTON_KEYFRAMES = `
@keyframes notifySlideIn {
  from { opacity: 0; transform: scale(0.97); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes notifyConfirm {
  0%   { opacity: 0; transform: scale(0.92); }
  55%  { opacity: 1; transform: scale(1.03); }
  100% { opacity: 1; transform: scale(1); }
}
.notify-slide-in { animation: notifySlideIn 0.18s cubic-bezier(0.22,1,0.36,1) forwards; }
.notify-confirm  { animation: notifyConfirm 0.28s cubic-bezier(0.22,1,0.36,1) forwards; }
`;
