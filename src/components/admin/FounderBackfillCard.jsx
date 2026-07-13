import React, { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Crown, CircleNotch, CheckCircle, WarningCircle } from '@phosphor-icons/react';

const CUTOFF_ISO = '2026-05-05T00:00:00.000Z';

export default function FounderBackfillCard({ theme }) {
  const [state, setState] = useState('idle');
  const [result, setResult] = useState(null);
  const [isDryRun, setIsDryRun] = useState(true);

  const run = async (dryRun) => {
    setState('running');
    setIsDryRun(dryRun);
    setResult(null);
    try {
      const fns = getFunctions();
      const migrate = httpsCallable(fns, 'migrateFoundersToTier');
      const stamp = httpsCallable(fns, 'stampFoundingMembers');

      const [migrateRes, stampRes] = await Promise.all([
        migrate({ dryRun, cutoffIso: CUTOFF_ISO }),
        stamp({ dryRun, cutoffIso: CUTOFF_ISO }),
      ]);

      setResult({ migrate: migrateRes.data, stamp: stampRes.data });
      setState('done');
    } catch (err) {
      setResult({ error: err.message });
      setState('error');
    }
  };

  return (
    <div
      className="rounded-xl p-5 space-y-4"
      style={{ border: `1px solid ${theme?.border || '#e5e7eb'}`, backgroundColor: theme?.cardBackground || '#fff' }}
    >
      <div className="flex items-center gap-2">
        <Crown size={18} style={{ color: '#C8912A' }} />
        <h2 className="font-semibold text-base" style={{ color: theme?.text }}>
          Founder Backfill Migration
        </h2>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ backgroundColor: 'rgba(200,145,42,0.12)', color: '#C8912A' }}
        >
          Pre-{CUTOFF_ISO.slice(0, 10)}
        </span>
      </div>

      <p className="text-sm" style={{ color: theme?.textLight }}>
        Stamps founder tier on accounts created before the Research+ cutoff. Run dry run first.
      </p>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => run(true)}
          disabled={state === 'running'}
          className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
          style={{ backgroundColor: theme?.background, border: `1px solid ${theme?.border}`, color: theme?.text }}
        >
          {state === 'running' && isDryRun ? <CircleNotch size={14} className="inline animate-spin" /> : null} Dry Run
        </button>
        <button
          type="button"
          onClick={() => run(false)}
          disabled={state === 'running'}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: '#C8912A' }}
        >
          {state === 'running' && !isDryRun ? <CircleNotch size={14} className="inline animate-spin" /> : null} Run Live
        </button>
      </div>

      {state === 'done' && result && !result.error && (
        <div className="text-xs space-y-1 p-3 rounded-lg" style={{ backgroundColor: theme?.success + '15', color: theme?.success }}>
          <CheckCircle size={14} className="inline mr-1" />
          Complete — check function logs for counts.
        </div>
      )}
      {state === 'error' && (
        <div className="text-xs p-3 rounded-lg flex gap-2" style={{ backgroundColor: theme?.error + '15', color: theme?.error }}>
          <WarningCircle size={14} className="flex-shrink-0" />
          {result?.error || 'Failed'}
        </div>
      )}
    </div>
  );
}
