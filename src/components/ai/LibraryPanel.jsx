import React, { useMemo, useState } from 'react';
import { BookOpen, Search, Trash2, Copy, Check, Calendar } from 'lucide-react';

/**
 * AI Library panel — saved prompt/answer pairs with citation snapshots.
 *
 * Read-only on downgrade (the caller controls this via `readOnly`).
 */
export default function LibraryPanel({ theme, library = [], onDelete, readOnly = false }) {
    const [query, setQuery] = useState('');
    const [copiedId, setCopiedId] = useState(null);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return library;
        return library.filter((e) =>
            (e.prompt || '').toLowerCase().includes(q) ||
            (e.answer || '').toLowerCase().includes(q)
        );
    }, [library, query]);

    const handleCopy = async (entry) => {
        try {
            await navigator.clipboard.writeText(`Q: ${entry.prompt}\n\nA: ${entry.answer}`);
            setCopiedId(entry.id);
            setTimeout(() => setCopiedId(null), 1800);
        } catch {
            // ignore
        }
    };

    if (library.length === 0) {
        return (
            <div className="text-center py-10">
                <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                    style={{ backgroundColor: (theme?.primary || '#7F9E95') + '18' }}
                >
                    <BookOpen size={22} style={{ color: theme?.primary || '#7F9E95' }} />
                </div>
                <p className="text-sm font-semibold" style={{ color: theme?.text }}>
                    Your library is empty
                </p>
                <p className="text-xs mt-1 max-w-xs mx-auto" style={{ color: theme?.textLight }}>
                    Save answers from the Chat tab to build a personal research library. Saved items stay available even if you downgrade.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div
                className="flex items-center gap-2 rounded-xl px-3 py-2"
                style={{
                    backgroundColor: theme?.cardBackground || theme?.white,
                    border: `1px solid ${theme?.border || 'rgba(0,0,0,0.08)'}`,
                }}
            >
                <Search size={14} style={{ color: theme?.textLight }} />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search your library..."
                    className="flex-1 bg-transparent border-0 outline-none text-sm"
                    style={{ color: theme?.text }}
                />
            </div>

            <div className="space-y-3">
                {filtered.map((entry) => (
                    <article
                        key={entry.id}
                        className="rounded-2xl p-4"
                        style={{
                            backgroundColor: theme?.cardBackground || theme?.white,
                            border: `1px solid ${theme?.border || 'rgba(0,0,0,0.08)'}`,
                        }}
                    >
                        <div className="flex items-start justify-between gap-3 mb-2">
                            <p className="text-sm font-semibold" style={{ color: theme?.text }}>
                                {entry.prompt || 'Untitled'}
                            </p>
                            <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                    type="button"
                                    onClick={() => handleCopy(entry)}
                                    className="p-1.5 rounded-full hover:opacity-80"
                                    aria-label="Copy"
                                    style={{ color: theme?.textLight }}
                                >
                                    {copiedId === entry.id ? <Check size={14} /> : <Copy size={14} />}
                                </button>
                                {!readOnly && (
                                    <button
                                        type="button"
                                        onClick={() => onDelete?.(entry.id)}
                                        className="p-1.5 rounded-full hover:opacity-80"
                                        aria-label="Remove from library"
                                        style={{ color: theme?.error || '#d64545' }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: theme?.text }}>
                            {entry.answer}
                        </p>

                        {Array.isArray(entry.citations) && entry.citations.length > 0 && (
                            <div className="mt-3 pt-2 border-t" style={{ borderColor: theme?.border || 'rgba(0,0,0,0.08)' }}>
                                <p className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color: theme?.textLight }}>
                                    Sources
                                </p>
                                <ul className="space-y-0.5">
                                    {entry.citations.map((c) => (
                                        <li key={c.id} className="text-[11px]" style={{ color: theme?.textLight }}>
                                            · {c.title} — {c.source} ({c.year})
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="mt-2 flex items-center gap-1 text-[10px]" style={{ color: theme?.textLight }}>
                            <Calendar size={10} />
                            <time>{new Date(entry.savedAt || Date.now()).toLocaleDateString()}</time>
                        </div>
                    </article>
                ))}

                {filtered.length === 0 && (
                    <p className="text-xs text-center py-6" style={{ color: theme?.textLight }}>
                        No library entries match that search.
                    </p>
                )}
            </div>
        </div>
    );
}
