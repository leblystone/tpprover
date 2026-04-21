import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Bot, Lock, MessageCircle, BookOpen, Sparkles } from 'lucide-react';
import { featureFlags } from '../config/featureFlags';
import { useTierAccess } from '../utils/useSubscriptionAccess';
import ChatPanel from '../components/ai/ChatPanel';
import LibraryPanel from '../components/ai/LibraryPanel';
import { loadLibrary, persistLibrary } from '../services/aiResearch';

/**
 * AI Research page (Research+ Wave).
 *
 * Two tabs: Chat (prompt / response) and Library (saved answers).
 * Gated by ENABLE_AI_RESEARCH flag AND hasAIAccess tier check.
 */
export default function AIResearch() {
    const { theme } = useOutletContext();
    const { hasAIAccess, tier } = useTierAccess();

    const [activeTab, setActiveTab] = useState('chat');
    const [library, setLibrary] = useState(() => loadLibrary());

    const enabled     = featureFlags.ENABLE_AI_RESEARCH;
    const allowed     = enabled && hasAIAccess;
    const keepsakeMode = enabled && !hasAIAccess && library.length > 0;

    useEffect(() => { persistLibrary(library); }, [library]);

    const handleSaveToLibrary = useCallback((entry) => {
        setLibrary((prev) => [entry, ...prev]);
        window.dispatchEvent(new CustomEvent('tpp:toast', {
            detail: { message: 'Saved to AI library', type: 'success' },
        }));
    }, []);

    const handleDeleteFromLibrary = useCallback((id) => {
        setLibrary((prev) => prev.filter((e) => e.id !== id));
    }, []);

    const border = `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`;

    return (
        <section className="page-bg max-w-2xl mx-auto space-y-5 pb-10">

            {/* ── Header ── */}
            <div className="flex items-center gap-4 mb-1">
                <div
                    className="p-3 rounded-2xl shrink-0"
                    style={{ backgroundColor: theme.primary + '18' }}
                >
                    <Bot size={26} style={{ color: theme.primary }} />
                </div>
                <div className="flex flex-col gap-0.5">
                    <h1 className="text-2xl font-semibold tracking-tight" style={{ color: theme.text }}>
                        AI Research
                    </h1>
                    <div className="flex items-center gap-2">
                        <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }} />
                        <span className="text-[11px] font-bold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                            Ask · Cite · Save
                        </span>
                    </div>
                </div>
            </div>

            <div className="h-px w-full opacity-10" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />

            {!allowed && !keepsakeMode ? (
                /* ── Locked ── */
                <div className="content-section p-6 rounded-2xl flex items-start gap-4" style={{ border }}>
                    <Lock size={22} style={{ color: theme.primary }} className="mt-0.5 shrink-0" />
                    <div>
                        <h2 className="font-semibold text-base mb-1" style={{ color: theme.text }}>
                            {enabled ? 'Research+ required' : 'Coming soon'}
                        </h2>
                        <p className="text-sm leading-relaxed" style={{ color: theme.textLight }}>
                            {enabled
                                ? `AI Research is part of the Research+ tier (you're on ${tier || 'the free plan'}). Upgrade to ask research questions, get citation-backed answers, and build a personal library.`
                                : 'AI Research is still being wired up. Founders and Research+ members get first access once it goes live.'}
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    {/* ── Keepsake notice ── */}
                    {keepsakeMode && (
                        <div className="content-section p-4 rounded-2xl flex items-start gap-3" style={{ border }}>
                            <Sparkles size={16} style={{ color: theme.primary }} className="mt-0.5 shrink-0" />
                            <div>
                                <p className="font-semibold text-sm" style={{ color: theme.text }}>Library is read-only</p>
                                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: theme.textLight }}>
                                    Your saved AI answers are preserved as keepsakes. Upgrade to Research+ to resume chatting and saving new items.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ── Tab pills ── */}
                    <div className="flex items-center gap-2">
                        {(keepsakeMode
                            ? [{ id: 'library', label: `Library${library.length ? ` · ${library.length}` : ''}`, icon: BookOpen }]
                            : [
                                { id: 'chat', label: 'Chat', icon: MessageCircle },
                                { id: 'library', label: `Library${library.length ? ` · ${library.length}` : ''}`, icon: BookOpen },
                            ]
                        ).map(({ id, label, icon: Icon }) => {
                            const active = activeTab === id;
                            return (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => !keepsakeMode && setActiveTab(id)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold active:scale-95 transition-all"
                                    style={{
                                        backgroundColor: active ? theme.primary : 'transparent',
                                        color: active ? (theme.white || '#fff') : theme.text,
                                        border: `1px solid ${active ? theme.primary : (theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)')}`,
                                    }}
                                >
                                    <Icon size={14} />
                                    {label}
                                </button>
                            );
                        })}
                    </div>

                    {/* ── Chat / Library panel ── */}
                    <div
                        className="content-section rounded-2xl overflow-hidden"
                        style={{ border, minHeight: 420, display: 'flex', flexDirection: 'column' }}
                    >
                        {!keepsakeMode && activeTab === 'chat' ? (
                            <ChatPanel theme={theme} onSaveToLibrary={handleSaveToLibrary} />
                        ) : (
                            <LibraryPanel
                                theme={theme}
                                library={library}
                                onDelete={handleDeleteFromLibrary}
                                readOnly={keepsakeMode}
                            />
                        )}
                    </div>
                </>
            )}
        </section>
    );
}
