import React, { useEffect, useState } from 'react';
import { X, Microscope, Loader2, AlertTriangle, CheckCircle2, TriangleAlert, Info, Lightbulb, CalendarClock, Clock } from 'lucide-react';
import { analyzeStack } from '../../services/aiResearch';

const SECTION_CONFIG = {
    synergy:    { Icon: CheckCircle2,  color: '#4ac586', bg: 'rgba(74,197,134,0.09)',  border: 'rgba(74,197,134,0.30)' },
    overlap:    { Icon: AlertTriangle, color: '#d64545', bg: 'rgba(214,69,69,0.09)',   border: 'rgba(214,69,69,0.30)' },
    caution:    { Icon: TriangleAlert, color: '#e4a72f', bg: 'rgba(228,167,47,0.09)',  border: 'rgba(228,167,47,0.30)' },
    timing:     { Icon: Clock,         color: '#e4a72f', bg: 'rgba(228,167,47,0.09)',  border: 'rgba(228,167,47,0.30)' },
    suggestion: { Icon: Lightbulb,     color: '#7F9E95', bg: 'rgba(127,158,149,0.09)', border: 'rgba(127,158,149,0.28)' },
    followup:   { Icon: CalendarClock, color: '#7F9E95', bg: 'rgba(127,158,149,0.09)', border: 'rgba(127,158,149,0.28)' },
    note:       { Icon: Info,          color: '#7F9E95', bg: 'rgba(127,158,149,0.09)', border: 'rgba(127,158,149,0.28)' },
};

function SectionCard({ section, theme }) {
    const cfg = SECTION_CONFIG[section.type] || SECTION_CONFIG.note;
    const { Icon, color, bg, border } = cfg;

    // Support bold markers in body text (**text**)
    const renderBody = (text) => {
        if (!text) return null;
        const paragraphs = text.split('\n\n');
        return paragraphs.map((para, pi) => {
            const parts = para.split(/\*\*(.+?)\*\*/g);
            return (
                <p key={pi} className={pi > 0 ? 'mt-2' : ''} style={{ color: theme?.text, lineHeight: 1.55 }}>
                    {parts.map((part, i) =>
                        i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                    )}
                </p>
            );
        });
    };

    return (
        <div
            className="rounded-xl p-3"
            style={{ backgroundColor: bg, border: `1px solid ${border}` }}
        >
            <div className="flex items-center gap-1.5 mb-1.5">
                <Icon size={13} style={{ color, flexShrink: 0 }} />
                <span className="text-xs font-semibold" style={{ color }}>{section.title}</span>
            </div>
            <div className="text-[13px]">{renderBody(section.body)}</div>
        </div>
    );
}

/**
 * PiP Stack Analyzer modal.
 * Renders knowledge-based sections: synergy, overlap, suggestions, follow-up, timing.
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
                className="w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col"
                style={{
                    backgroundColor: theme?.cardBackground || theme?.white || '#fff',
                    border: `1px solid ${theme?.border || 'rgba(0,0,0,0.08)'}`,
                    maxHeight: '88vh',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{ borderColor: theme?.border || 'rgba(0,0,0,0.08)' }}>
                    <div className="flex items-center gap-2">
                        <div
                            className="w-7 h-7 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: (theme?.primary || '#7F9E95') + '18' }}
                        >
                            <Microscope size={14} style={{ color: theme?.primary || '#7F9E95' }} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-sm leading-tight" style={{ color: theme?.text }}>Stack Analysis</h3>
                            <p className="text-[10px] leading-tight mt-0.5" style={{ color: theme?.textLight }}>
                                {protocols.length} protocol{protocols.length !== 1 ? 's' : ''}{supplements.length > 0 ? ` · ${supplements.length} supplement${supplements.length !== 1 ? 's' : ''}` : ''}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} aria-label="Close" className="p-1" style={{ color: theme?.textLight }}>
                        <X size={15} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loading && (
                        <div className="flex items-center gap-2 py-4">
                            <Loader2 size={14} className="animate-spin" style={{ color: theme?.primary || '#7F9E95' }} />
                            <span className="text-sm" style={{ color: theme?.textLight }}>Analyzing your stack…</span>
                        </div>
                    )}

                    {error && (
                        <div
                            className="rounded-xl p-3 text-xs flex items-start gap-2"
                            style={{
                                backgroundColor: 'rgba(214,69,69,0.09)',
                                color: '#d64545',
                                border: '1px solid rgba(214,69,69,0.30)',
                            }}
                        >
                            <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {result && (
                        <>
                            {/* Summary — compound names appear here only */}
                            <p className="text-[11px] font-medium pb-1" style={{ color: theme?.textLight }}>
                                {result.summary}
                            </p>

                            {/* Section cards */}
                            {Array.isArray(result.sections) && result.sections.map((s, i) => (
                                <SectionCard key={i} section={s} theme={theme} />
                            ))}

                            <p className="text-[10px] text-center pt-1" style={{ color: theme?.textLight }}>
                                {result.disclaimer}
                            </p>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end px-3 py-2.5 border-t flex-shrink-0" style={{ borderColor: theme?.border || 'rgba(0,0,0,0.08)' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-full font-semibold text-sm active:scale-95"
                        style={{ backgroundColor: theme?.primary || '#7F9E95', color: '#fff' }}
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
