import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Bot, Lock, MessageCircle, BookOpen } from 'lucide-react';
import { featureFlags } from '../config/featureFlags';
import { useTierAccess } from '../utils/useSubscriptionAccess';
import ChatPanel from '../components/ai/ChatPanel';
import LibraryPanel from '../components/ai/LibraryPanel';
import { loadLibrary, persistLibrary } from '../services/aiResearch';

/**
 * AI Research page (Research+ Wave).
 *
 * Two tabs:
 *   - Chat    → live prompt/response with daily quota + safety banner
 *   - Library → saved answers (remains read-only on downgrade)
 *
 * Gated by `ENABLE_AI_RESEARCH` flag AND `hasAIAccess` tier check.
 */
export default function AIResearch() {
    const { theme } = useOutletContext();
    const { hasAIAccess, tier } = useTierAccess();

    const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'library'
    const [library, setLibrary] = useState(() => loadLibrary());

    const enabled = featureFlags.ENABLE_AI_RESEARCH;
    const allowed = enabled && hasAIAccess;
    // Keepsake policy: soft-downgraded users can still *view* library
    // entries they saved while they were on Research+. Saving/deleting is
    // disabled until they upgrade again.
    const keepsakeMode = enabled && !hasAIAccess && library.length > 0;

    useEffect(() => {
        persistLibrary(library);
    }, [library]);

    const handleSaveToLibrary = useCallback((entry) => {
        setLibrary((prev) => [entry, ...prev]);
        window.dispatchEvent(new CustomEvent('tpp:toast', {
            detail: { message: 'Saved to AI library', type: 'success' },
        }));
    }, []);

    const handleDeleteFromLibrary = useCallback((id) => {
        setLibrary((prev) => prev.filter((e) => e.id !== id));
    }, []);

    return (
        <div
            className="min-h-screen w-full px-4 py-6 md:px-8 md:py-8"
            style={{ backgroundColor: theme?.background }}
        >
            <div className="max-w-3xl mx-auto space-y-4">
                <Header theme={theme} />

                {!allowed && !keepsakeMode ? (
                    <LockedCard theme={theme} enabled={enabled} tier={tier} />
                ) : (
                    <>
                        {keepsakeMode && (
                            <LockedCard theme={theme} enabled={enabled} tier={tier} keepsake />
                        )}

                        <Tabs
                            theme={theme}
                            activeTab={keepsakeMode ? 'library' : activeTab}
                            onChange={keepsakeMode ? () => {} : setActiveTab}
                            libraryCount={library.length}
                            hideChat={keepsakeMode}
                        />

                        <section
                            className="rounded-2xl p-3 md:p-4"
                            style={{
                                backgroundColor: theme?.cardBackground || theme?.white,
                                border: `1px solid ${theme?.border || 'rgba(0,0,0,0.08)'}`,
                                minHeight: 420,
                                display: 'flex',
                                flexDirection: 'column',
                            }}
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
                        </section>
                    </>
                )}
            </div>
        </div>
    );
}

function Header({ theme }) {
    return (
        <header className="flex items-center gap-3">
            <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: (theme?.primary || '#7F9E95') + '18' }}
            >
                <Bot size={20} style={{ color: theme?.primary || '#7F9E95' }} />
            </div>
            <div>
                <h1 className="text-xl md:text-2xl font-semibold" style={{ color: theme?.text }}>
                    AI Research
                </h1>
                <p className="text-sm" style={{ color: theme?.textLight }}>
                    Ask questions with citations. Save answers to your library.
                </p>
            </div>
        </header>
    );
}

function Tabs({ theme, activeTab, onChange, libraryCount, hideChat = false }) {
    const tabs = hideChat
        ? [{ id: 'library', label: `Library${libraryCount ? ` · ${libraryCount}` : ''}`, icon: BookOpen }]
        : [
            { id: 'chat', label: 'Chat', icon: MessageCircle },
            { id: 'library', label: `Library${libraryCount ? ` · ${libraryCount}` : ''}`, icon: BookOpen },
        ];
    return (
        <div className="flex items-center gap-2">
            {tabs.map(({ id, label, icon: Icon }) => {
                const active = activeTab === id;
                return (
                    <button
                        key={id}
                        type="button"
                        onClick={() => onChange(id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold active:scale-95"
                        style={{
                            backgroundColor: active ? (theme?.primary || '#7F9E95') : 'transparent',
                            color: active ? (theme?.white || '#fff') : (theme?.text),
                            border: `1px solid ${active ? (theme?.primary || '#7F9E95') : (theme?.border || 'rgba(0,0,0,0.12)')}`,
                        }}
                    >
                        <Icon size={14} />
                        {label}
                    </button>
                );
            })}
        </div>
    );
}

function LockedCard({ theme, enabled, tier, keepsake = false }) {
    const title = keepsake
        ? 'Library is read-only'
        : enabled ? 'Research+ required' : 'Coming soon';
    const body = keepsake
        ? 'Your saved AI answers are preserved as keepsakes. Upgrade to Research+ to resume chatting and saving new items.'
        : enabled
            ? `AI Research is part of the Research+ tier (you're on ${tier || 'the free plan'}). Upgrade to ask research questions, get citation-backed answers, and build a personal library.`
            : 'AI Research is still being wired up. Founders and Research+ members get first access once it goes live.';

    return (
        <div
            className="rounded-2xl p-6 flex items-start gap-3"
            style={{
                backgroundColor: theme?.cardBackground || theme?.white,
                border: `1px solid ${theme?.border || 'rgba(0,0,0,0.08)'}`,
            }}
        >
            <Lock size={20} style={{ color: theme?.primary || '#7F9E95' }} className="mt-0.5" />
            <div>
                <h2 className="font-semibold text-base" style={{ color: theme?.text }}>
                    {title}
                </h2>
                <p className="text-sm mt-1" style={{ color: theme?.textLight }}>
                    {body}
                </p>
            </div>
        </div>
    );
}
