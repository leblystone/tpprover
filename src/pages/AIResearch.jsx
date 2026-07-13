import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
    ArrowCounterClockwise,
    BookOpen,
    ChatCenteredDots,
    MagnifyingGlass,
    PaperPlaneTilt,
} from '@phosphor-icons/react';
import { Lock, Sparkles } from 'lucide-react';
import { featureFlags } from '../config/featureFlags';
import { useTierAccess } from '../utils/useSubscriptionAccess';
import ChatPanel from '../components/ai/ChatPanel';
import LibraryPanel from '../components/ai/LibraryPanel';
import { getRemainingQuota, savePipChatToResearchNotes } from '../services/aiResearch';
import { loadPipNotes, deletePipNote } from '../utils/researchNotes';
import pipAvatar from '../assets/PiP.png';

const INPUT_PLACEHOLDERS = [
    'Search your data or ask PiP…',
    'Not that kind of PIP. Talk to me…',
    'Ask about dosing, stacks, or protocols…',
    'Data goes here. Soreness stays there…',
];

const PIP_TERRACOTTA = '#8B6347';
const PIP_GOLD = '#C4925A';

function DesktopMidnightCountdown({ theme }) {
    const [timeLeft, setTimeLeft] = useState(() => {
        const now = new Date();
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        return Math.max(0, Math.floor((midnight - now) / 1000));
    });
    useEffect(() => {
        const id = setInterval(() => {
            const now = new Date();
            const midnight = new Date(now);
            midnight.setHours(24, 0, 0, 0);
            setTimeLeft(Math.max(0, Math.floor((midnight - now) / 1000)));
        }, 1000);
        return () => clearInterval(id);
    }, []);
    const h = Math.floor(timeLeft / 3600);
    const m = Math.floor((timeLeft % 3600) / 60);
    const s = timeLeft % 60;
    const fmt = (n) => String(n).padStart(2, '0');
    return (
        <span className="text-[10px] font-semibold tabular-nums" style={{ color: theme?.textLight, opacity: 0.5 }}>
            ☕ back in {h > 0 ? `${h}h ` : ''}{fmt(m)}:{fmt(s)}
        </span>
    );
}

/**
 * AI Research page — desktop layout aligned with mobile Ask PiP (SearchAIModal).
 */
export default function AIResearch() {
    const { theme, protocols, stockpile, supplements } = useOutletContext();
    const { hasAIAccess, tier, aiDailyQuota } = useTierAccess();

    const userContext = useMemo(() => {
        let protocolHistory = [];
        try {
            const raw = localStorage.getItem('tpprover_protocol_history');
            protocolHistory = raw ? JSON.parse(raw) : [];
        } catch { /* noop */ }
        return {
            protocols: protocols || [],
            stockpile: stockpile || [],
            supplements: supplements || [],
            protocolHistory: Array.isArray(protocolHistory) ? protocolHistory.slice(0, 20) : [],
        };
    }, [protocols, stockpile, supplements]);

    const [activeTab, setActiveTab] = useState('chat');
    const [library, setLibrary] = useState(() => loadPipNotes());
    const [input, setInput] = useState('');
    const [placeholderIdx, setPlaceholderIdx] = useState(0);
    const [sessionKey, setSessionKey] = useState(0);
    const [quotaRemaining, setQuotaRemaining] = useState(() => getRemainingQuota(aiDailyQuota));
    const [pipThinking, setPipThinking] = useState(false);

    const chatRef = useRef(null);
    const scrollRef = useRef(null);

    const enabled = featureFlags.ENABLE_AI_RESEARCH;
    const allowed = enabled && hasAIAccess;
    const keepsakeMode = enabled && !hasAIAccess && library.length > 0;

    useEffect(() => {
        const refresh = () => setLibrary(loadPipNotes());
        window.addEventListener('tpp:user-notes-updated', refresh);
        return () => window.removeEventListener('tpp:user-notes-updated', refresh);
    }, []);

    useEffect(() => {
        setQuotaRemaining(getRemainingQuota(aiDailyQuota));
    }, [aiDailyQuota]);

    useEffect(() => {
        const interval = setInterval(() => {
            setPlaceholderIdx((i) => (i + 1) % INPUT_PLACEHOLDERS.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleSaveToResearchNotes = useCallback((entry) => {
        savePipChatToResearchNotes(entry);
    }, []);

    const handleDeleteFromLibrary = useCallback((id) => {
        deletePipNote(id);
    }, []);

    const handleSend = useCallback(() => {
        const q = input.trim();
        if (!q || pipThinking) return;
        chatRef.current?.send(q, false);
        setInput('');
        setTimeout(() => {
            scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
        }, 120);
    }, [input, pipThinking]);

    const handleNewChat = useCallback(() => {
        try {
            sessionStorage.removeItem('tpprover_pip_session');
        } catch { /* noop */ }
        setSessionKey((k) => k + 1);
        setInput('');
    }, []);

    const cardBg = theme.isDark
        ? 'linear-gradient(180deg, rgba(18,22,30,0.98) 0%, rgba(14,18,25,0.99) 100%)'
        : 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(249,250,251,0.99) 100%)';
    const cardBorder = theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
    const cardShadow = theme.isDark
        ? '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)'
        : '0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.85)';

    return (
        <section className="page-bg flex flex-col min-h-[calc(100dvh-8rem)] max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-6">

            {/* Header — matches mobile Ask PiP */}
            <div className="flex items-center justify-between gap-4 pt-2 pb-4 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                    <img src={pipAvatar} alt="PiP" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                    <div className="min-w-0">
                        <h1 className="text-base font-bold leading-tight pip-twinkle">Ask PiP</h1>
                        <p className="text-xs truncate" style={{ color: theme.textLight, opacity: 0.75 }}>
                            Search your data or ask your research assistant
                        </p>
                    </div>
                </div>
                {allowed && activeTab === 'chat' && (
                    <button
                        type="button"
                        onClick={handleNewChat}
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-opacity hover:opacity-80"
                        style={{
                            backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                            color: theme.textLight,
                        }}
                        title="New conversation"
                    >
                        <ArrowCounterClockwise size={14} weight="bold" />
                    </button>
                )}
            </div>

            {!allowed && !keepsakeMode ? (
                <div
                    className="rounded-2xl p-6 flex items-start gap-4"
                    style={{
                        background: cardBg,
                        border: `1px solid ${cardBorder}`,
                        boxShadow: cardShadow,
                    }}
                >
                    <Lock size={22} style={{ color: PIP_TERRACOTTA }} className="mt-0.5 shrink-0" />
                    <div>
                        <h2 className="font-semibold text-base mb-1" style={{ color: theme.text }}>
                            {enabled ? 'Research+ required' : 'Coming soon'}
                        </h2>
                        <p className="text-sm leading-relaxed" style={{ color: theme.textLight }}>
                            {enabled
                                ? `Ask PiP is part of Research+ (you're on ${tier || 'the free plan'}). Upgrade to ask research questions, get citation-backed answers, and build a personal library.`
                                : 'Ask PiP is still being wired up. Founders and Research+ members get first access once it goes live.'}
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    {keepsakeMode && (
                        <div
                            className="rounded-2xl p-4 flex items-start gap-3 mb-4"
                            style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
                        >
                            <Sparkles size={16} style={{ color: PIP_TERRACOTTA }} className="mt-0.5 shrink-0" />
                            <div>
                                <p className="font-semibold text-sm" style={{ color: theme.text }}>Library is read-only</p>
                                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: theme.textLight }}>
                                    Your saved AI answers are preserved. Upgrade to Research+ to resume chatting.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="flex items-center gap-2 mb-4 shrink-0">
                        {(keepsakeMode
                            ? [{ id: 'library', label: `Library${library.length ? ` · ${library.length}` : ''}`, icon: BookOpen }]
                            : [
                                { id: 'chat', label: 'Chat', icon: ChatCenteredDots },
                                { id: 'library', label: `Library${library.length ? ` · ${library.length}` : ''}`, icon: BookOpen },
                            ]
                        ).map(({ id, label, icon: Icon }) => {
                            const active = activeTab === id;
                            return (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => !keepsakeMode && setActiveTab(id)}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold active:scale-95 transition-all"
                                    style={{
                                        background: active
                                            ? `linear-gradient(135deg, ${PIP_TERRACOTTA}, ${PIP_GOLD})`
                                            : theme.isDark
                                                ? 'rgba(255,255,255,0.06)'
                                                : 'rgba(255,255,255,0.9)',
                                        color: active ? '#fff' : theme.text,
                                        border: active
                                            ? 'none'
                                            : `1px solid ${cardBorder}`,
                                        boxShadow: active
                                            ? 'inset 0 1px 1px rgba(255,255,255,0.2), 0 2px 8px rgba(139,99,71,0.25)'
                                            : 'none',
                                    }}
                                >
                                    <Icon size={15} weight={active ? 'bold' : 'regular'} />
                                    {label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Main panel */}
                    <div
                        className="flex flex-col flex-1 min-h-0 rounded-2xl overflow-hidden"
                        style={{
                            background: cardBg,
                            border: `1px solid ${cardBorder}`,
                            boxShadow: cardShadow,
                            minHeight: keepsakeMode ? 420 : 'min(72vh, 720px)',
                        }}
                    >
                        {!keepsakeMode && activeTab === 'chat' ? (
                            <>
                                <div
                                    ref={scrollRef}
                                    className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 py-3"
                                >
                                    <ChatPanel
                                        key={sessionKey}
                                        ref={chatRef}
                                        theme={theme}
                                        onSaveToLibrary={handleSaveToResearchNotes}
                                        headless
                                        userContext={userContext}
                                        quotaLimit={aiDailyQuota}
                                        showSafetyBanner={false}
                                        onQuotaChange={setQuotaRemaining}
                                        onThinkingChange={setPipThinking}
                                    />
                                </div>

                                {/* Bottom input — mobile DM style */}
                                <div
                                    className="flex-shrink-0 px-4 sm:px-5 pt-2 pb-4"
                                    style={{
                                        borderTop: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                                    }}
                                >
                                    <div
                                        className="flex items-center gap-2 rounded-2xl px-3 py-2.5"
                                        style={{
                                            backgroundColor: theme.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
                                            border: `1px solid ${theme.border || cardBorder}`,
                                        }}
                                    >
                                        <MagnifyingGlass
                                            size={16}
                                            weight="bold"
                                            className="flex-shrink-0"
                                            style={{ color: theme.textLight }}
                                        />
                                        <input
                                            type="text"
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSend();
                                                }
                                            }}
                                            placeholder={
                                                quotaRemaining > 0
                                                    ? INPUT_PLACEHOLDERS[placeholderIdx]
                                                    : "PiP's out for the day. Back at midnight ☕"
                                            }
                                            disabled={quotaRemaining <= 0}
                                            className="flex-1 bg-transparent border-0 outline-none text-sm min-w-0"
                                            style={{ color: theme.text }}
                                        />
                                        {pipThinking ? (
                                            <button
                                                type="button"
                                                onClick={() => chatRef.current?.stop()}
                                                className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
                                                style={{ background: '#C4714F', color: '#fff' }}
                                                title="Stop"
                                            >
                                                <span
                                                    style={{
                                                        width: 10,
                                                        height: 10,
                                                        background: '#fff',
                                                        borderRadius: 2,
                                                        display: 'block',
                                                    }}
                                                />
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={handleSend}
                                                disabled={!input.trim() || quotaRemaining <= 0}
                                                className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-30"
                                                style={{
                                                    background: `linear-gradient(135deg, ${PIP_TERRACOTTA}, ${PIP_GOLD})`,
                                                    color: '#fff',
                                                    boxShadow: input.trim()
                                                        ? 'inset 0 1px 1px rgba(255,255,255,0.18)'
                                                        : 'none',
                                                }}
                                                title="Ask PiP"
                                            >
                                                <PaperPlaneTilt size={15} weight="bold" />
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between mt-2 px-0.5">
                                        <span className="text-[10px]" style={{ color: theme.textLight, opacity: 0.45 }}>
                                            Educational only · not medical advice
                                        </span>
                                        {quotaRemaining > 0 ? (
                                            <span
                                                className="text-[10px] font-semibold tabular-nums"
                                                style={{ color: theme.textLight, opacity: 0.5 }}
                                            >
                                                {quotaRemaining}/{aiDailyQuota}
                                            </span>
                                        ) : (
                                            <DesktopMidnightCountdown theme={theme} />
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                                <LibraryPanel
                                    theme={theme}
                                    library={library}
                                    onDelete={handleDeleteFromLibrary}
                                    readOnly={keepsakeMode}
                                />
                            </div>
                        )}
                    </div>
                </>
            )}
        </section>
    );
}
