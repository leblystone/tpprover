import React, { useState } from 'react';
import { X, Sparkles, Loader2, AlertTriangle } from 'lucide-react';
import { prefillProtocol } from '../../services/aiResearch';

/**
 * Ask the AI for a starter protocol. Caller receives the suggested
 * prefill via `onApply(prefill)` and is expected to hydrate the
 * editor form with those fields. The disclaimer is always shown.
 */
export default function AIPrefillModal({ open, theme, onClose, onApply }) {
    const [compound, setCompound] = useState('');
    const [goal, setGoal] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);

    if (!open) return null;

    const handleGenerate = async () => {
        setError(null);
        setResult(null);
        if (!compound.trim()) {
            setError('Enter a compound name (e.g. BPC-157).');
            return;
        }
        setLoading(true);
        try {
            const r = await prefillProtocol({ compound: compound.trim(), goal: goal.trim() });
            setResult(r);
        } catch (e) {
            setError(e.message || 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    const handleApply = () => {
        if (result?.prefill) onApply?.(result.prefill);
        handleClose();
    };

    const handleClose = () => {
        setCompound('');
        setGoal('');
        setResult(null);
        setError(null);
        onClose?.();
    };

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center p-3"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={handleClose}
        >
            <div
                className="w-full max-w-md rounded-2xl shadow-xl overflow-hidden"
                style={{
                    backgroundColor: theme?.cardBackground || theme?.white || '#fff',
                    border: `1px solid ${theme?.border || 'rgba(0,0,0,0.08)'}`,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: theme?.border || 'rgba(0,0,0,0.08)' }}>
                    <div className="flex items-center gap-2">
                        <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: (theme?.primary || '#7F9E95') + '18' }}
                        >
                            <Sparkles size={16} style={{ color: theme?.primary || '#7F9E95' }} />
                        </div>
                        <h3 className="font-semibold text-base" style={{ color: theme?.text }}>
                            AI Protocol Pre-fill
                        </h3>
                    </div>
                    <button onClick={handleClose} aria-label="Close" style={{ color: theme?.textLight }}>
                        <X size={16} />
                    </button>
                </div>

                <div className="p-4 space-y-3">
                    <label className="block">
                        <span className="block text-xs font-semibold mb-1" style={{ color: theme?.textLight }}>
                            Compound
                        </span>
                        <input
                            value={compound}
                            onChange={(e) => setCompound(e.target.value)}
                            placeholder="e.g. BPC-157"
                            autoFocus
                            className="w-full px-3 py-2 rounded-lg text-sm"
                            style={{
                                backgroundColor: theme?.background,
                                color: theme?.text,
                                border: `1px solid ${theme?.border || 'rgba(0,0,0,0.12)'}`,
                            }}
                        />
                    </label>

                    <label className="block">
                        <span className="block text-xs font-semibold mb-1" style={{ color: theme?.textLight }}>
                            Goal (optional)
                        </span>
                        <input
                            value={goal}
                            onChange={(e) => setGoal(e.target.value)}
                            placeholder="Tendon recovery, sleep, lean mass..."
                            className="w-full px-3 py-2 rounded-lg text-sm"
                            style={{
                                backgroundColor: theme?.background,
                                color: theme?.text,
                                border: `1px solid ${theme?.border || 'rgba(0,0,0,0.12)'}`,
                            }}
                        />
                    </label>

                    {error && (
                        <div
                            className="rounded-xl p-2.5 text-xs flex items-start gap-2"
                            style={{
                                backgroundColor: (theme?.error || '#d64545') + '18',
                                color: theme?.error || '#d64545',
                                border: `1px solid ${(theme?.error || '#d64545') + '44'}`,
                            }}
                        >
                            <AlertTriangle size={12} className="mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {result && (
                        <div
                            className="rounded-xl p-3 space-y-2"
                            style={{
                                backgroundColor: (theme?.primary || '#7F9E95') + '10',
                                border: `1px solid ${(theme?.primary || '#7F9E95') + '33'}`,
                            }}
                        >
                            <p className="text-xs font-semibold" style={{ color: theme?.primary }}>
                                Suggested pre-fill
                            </p>
                            <div>
                                <p className="text-[11px] uppercase tracking-wider" style={{ color: theme?.textLight }}>Name</p>
                                <p className="text-sm font-medium" style={{ color: theme?.text }}>{result.prefill.protocolName}</p>
                            </div>
                            {result.prefill.purpose && (
                                <div>
                                    <p className="text-[11px] uppercase tracking-wider" style={{ color: theme?.textLight }}>Purpose</p>
                                    <p className="text-sm" style={{ color: theme?.text }}>{result.prefill.purpose}</p>
                                </div>
                            )}
                            {result.prefill.notes && (
                                <div>
                                    <p className="text-[11px] uppercase tracking-wider" style={{ color: theme?.textLight }}>Notes</p>
                                    <p className="text-xs" style={{ color: theme?.textLight }}>{result.prefill.notes}</p>
                                </div>
                            )}
                            <p className="text-[10px]" style={{ color: theme?.textLight }}>{result.disclaimer}</p>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-end gap-2 p-3 border-t" style={{ borderColor: theme?.border || 'rgba(0,0,0,0.08)' }}>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="px-3 py-1.5 rounded-full text-sm font-medium"
                        style={{ color: theme?.textLight }}
                    >
                        Cancel
                    </button>
                    {result ? (
                        <button
                            type="button"
                            onClick={handleApply}
                            className="px-4 py-1.5 rounded-full font-semibold text-sm active:scale-95"
                            style={{ backgroundColor: theme?.primary || '#7F9E95', color: '#fff' }}
                        >
                            Apply to editor
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleGenerate}
                            disabled={loading || !compound.trim()}
                            className="px-4 py-1.5 rounded-full font-semibold text-sm active:scale-95 disabled:opacity-50 inline-flex items-center gap-1.5"
                            style={{ backgroundColor: theme?.primary || '#7F9E95', color: '#fff' }}
                        >
                            {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                            Generate
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
