import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import ExpiredTrialManager from '../../components/admin/ExpiredTrialManager';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Crown, FlaskConical, CheckCircle, AlertCircle, Loader } from 'lucide-react';

const CUTOFF_ISO = '2026-05-05T00:00:00.000Z';

function FounderBackfillCard({ theme }) {
  const [state, setState] = useState('idle'); // idle | running | done | error
  const [result, setResult] = useState(null);
  const [isDryRun, setIsDryRun] = useState(true);

  const run = async (dryRun) => {
    setState('running');
    setIsDryRun(dryRun);
    setResult(null);
    try {
      const fns = getFunctions();
      const migrate = httpsCallable(fns, 'migrateFoundersToTier');
      const stamp  = httpsCallable(fns, 'stampFoundingMembers');

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
    <div className="rounded-xl p-5 space-y-4" style={{ border: `1px solid ${theme?.border || '#e5e7eb'}`, backgroundColor: theme?.cardBackground || '#fff' }}>
      <div className="flex items-center gap-2">
        <Crown size={18} style={{ color: '#C8912A' }} />
        <h2 className="font-semibold text-base" style={{ color: theme?.text }}>Founder Backfill Migration</h2>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'rgba(200,145,42,0.12)', color: '#C8912A' }}>
          Pre-{CUTOFF_ISO.slice(0, 10)}
        </span>
      </div>

      <p className="text-sm" style={{ color: theme?.textLight }}>
        Stamps <code className="text-xs bg-black/5 px-1 rounded">tier: founder</code> and <code className="text-xs bg-black/5 px-1 rounded">isFoundingMember: true</code> on every account created before the Research+ cutoff. Run <strong>Dry Run</strong> first to preview, then <strong>Run Live</strong> to apply.
      </p>

      <div className="flex gap-3">
        <button
          disabled={state === 'running'}
          onClick={() => run(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
          style={{ border: `1px solid ${theme?.border || '#e5e7eb'}`, color: theme?.text }}
        >
          {state === 'running' && isDryRun ? <Loader size={14} className="animate-spin" /> : <FlaskConical size={14} />}
          Dry Run
        </button>

        <button
          disabled={state === 'running'}
          onClick={() => run(false)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
          style={{ backgroundColor: '#C8912A', color: '#fff' }}
        >
          {state === 'running' && !isDryRun ? <Loader size={14} className="animate-spin" /> : <Crown size={14} />}
          Run Live
        </button>
      </div>

      {state === 'done' && result && (
        <div className="rounded-lg p-4 space-y-3 text-sm" style={{ backgroundColor: 'rgba(200,145,42,0.06)', border: '1px solid rgba(200,145,42,0.2)' }}>
          <div className="flex items-center gap-2 font-semibold" style={{ color: '#C8912A' }}>
            <CheckCircle size={15} />
            {result.migrate?.dryRun ? 'Dry run complete — no changes written' : 'Migration applied ✅'}
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1" style={{ color: theme?.text }}>
            <span className="font-medium">Tier migration</span><span />
            <span className="opacity-60">Scanned</span><span>{result.migrate?.scanned ?? '—'}</span>
            <span className="opacity-60">Stamped founder</span><span className="font-semibold" style={{ color: '#C8912A' }}>{result.migrate?.stampedFounder ?? '—'}</span>
            <span className="opacity-60">Already stamped</span><span>{result.migrate?.alreadyStamped ?? '—'}</span>
            <span className="opacity-60">Skipped</span><span>{result.migrate?.skippedFreeOrMissing ?? '—'}</span>
            {result.migrate?.errors?.length > 0 && <><span className="text-red-500">Errors</span><span className="text-red-500">{result.migrate.errors.length}</span></>}

            <span className="font-medium pt-2">Founding member stamp</span><span />
            <span className="opacity-60">Scanned</span><span>{result.stamp?.scanned ?? '—'}</span>
            <span className="opacity-60">Stamped</span><span className="font-semibold" style={{ color: '#C8912A' }}>{result.stamp?.stampedFounding ?? '—'}</span>
            <span className="opacity-60">Already stamped</span><span>{result.stamp?.alreadyStamped ?? '—'}</span>
          </div>
        </div>
      )}

      {state === 'error' && (
        <div className="flex items-center gap-2 text-sm text-red-600 p-3 rounded-lg bg-red-50">
          <AlertCircle size={15} />
          {result?.error || 'An error occurred.'}
        </div>
      )}
    </div>
  );
}

export default function AdminUsersExpiredTrials() {
  const { theme } = useOutletContext();
  return (
    <div className="space-y-3">
      <FounderBackfillCard theme={theme} />
      <ExpiredTrialManager theme={theme} />
    </div>
  );
}
