import React, { useEffect, useState } from 'react';
import { X, Microscope, Loader2, AlertTriangle, Info } from 'lucide-react';
import { analyzeStack } from '../../services/aiResearch';

/**
 * AI Stack Analyzer modal.
 *
 * Shows a summary + flags for the supplied protocols/supplements.
 * The caller is responsible for passing the current stack; the modal
 * doesn't reach into AppContext so it can be re-used from anywhere.
 */
export default function AIAnalyzeStackModal({ open, theme, protocols = [], supplements = [], onClose }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);

    useEffect(() => {
        if (!open) return;
        setResult(null);
        setError(null);
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const r = await analyzeStack({ protocols, supplements });
                if (!cancelled) setResult(r);
            } catch (e) {
                if (!cancelled) setError(e.message || 'Something went wrong.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [open, protocols, supplements]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center p-3"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={onClose}
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
                            <Microscope size={16} style={{ color: theme?.primary || '#7F9E95' }} />
                        </div>
                        <h3 className="font-semibold text-base" style={{ color: theme?.text }}>
                            Analyze Stack
                        </h3>
                    </div>
                    <button onClick={onClose} aria-label="Close" style={{ color: theme?.textLight }}>
                        <X size={16} />
                    </button>
                </div>

                <div className="p-4 space-y-3">
                    <p className="text-[11px]" style={{ color: theme?.textLight }}>
                        Reviewing {protocols.length} protocol(s) and {supplements.length} supplement(s).
                    </p>

                    {loading && (
                        <div
                            className="rounded-xl p-4 inline-flex items-center gap-2"
                            style={{
                                backgroundColor: theme?.background,
                                border: `1px solid ${theme?.border || 'rgba(0,0,0,0.08)'}`,
                            }}
                        >
                            <Loader2 size={14} className="animate-spin" style={{ color: theme?.primary || '#7F9E95' }} />
                            <span className="text-sm" style={{ color: theme?.textLight }}>Running analysis…</span>
                        </div>
                    )}

                    {error && (
                        <div
                            className="rounded-xl p-3 text-xs flex items-start gap-2"
                            style={{
                                backgroundColor: (theme?.error || '#d64545') + '18',
                                color: theme?.error || '#d64545',
                                border: `1px solid ${(theme?.error || '#d64545') + '44'}`,
                            }}
                        >
                            <AlertTriangle size={14} className="mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {result && (
                        <div className="space-y-3">
                            <div
                                className="rounded-xl p-3"
                                style={{
                                    backgroundColor: theme?.background,
                                    border: `1px solid ${theme?.border || 'rgba(0,0,0,0.08)'}`,
                                }}
                            >
                                <p className="text-sm leading-relaxed" style={{ color: theme?.text }}>
                                    {result.summary}
                                </p>
                            </div>

                            {Array.isArray(result.flags) && result.flags.length > 0 && (
                                <ul className="space-y-2">
                                    {result.flags.map((f, i) => (
                                        <li
                                            key={i}
                                            className="rounded-xl p-3 text-sm flex items-start gap-2"
                                            style={{
                                                backgroundColor: (theme?.primary || '#7F9E95') + '10',
                                                border: `1px solid ${(theme?.primary || '#7F9E95') + '33'}`,
                                                color: theme?.text,
                                            }}
                                        >
                                            <Info size={14} className="mt-0.5 flex-shrink-0" style={{ color: theme?.primary || '#7F9E95' }} />
                                            <span>{f.text}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            <p className="text-[10px] text-center" style={{ color: theme?.textLight }}>
                                {result.disclaimer}
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-end gap-2 p-3 border-t" style={{ borderColor: theme?.border || 'rgba(0,0,0,0.08)' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-full font-semibold text-sm active:scale-95"
                        style={{ backgroundColor: theme?.primary || '#7F9E95', color: '#fff' }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
