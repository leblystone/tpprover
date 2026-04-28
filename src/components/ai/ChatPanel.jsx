import React, { useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Send, Sparkles, AlertTriangle, Bookmark, Shield, Loader2, ChevronRight, Square, Pencil, BookOpen, ClipboardList, Layers, AlertCircle } from 'lucide-react';
import { ChatCenteredDots, ClipboardText, Syringe as PhSyringe, FirstAid, HandWaving } from '@phosphor-icons/react';
import aiService, { sendPrompt, getRemainingQuota, setQuotaLimit, AI_DAILY_QUOTA, hasSeenGreeting, markGreetingSeen } from '../../services/aiResearch';
import pipAvatar from '../../assets/PiP.png';
import { generateId } from '../../utils/string';
import { trackConversion, EVENTS } from '../../services/conversionAnalytics';
import { logSideEffect } from '../../utils/sideEffectsLog';

const PIP_PLACEHOLDERS = [
    'Search your data or ask PiP…',
    'Not that kind of PIP. Talk to me…',
    'Data goes here. Soreness stays there…',
    'Ask about stacks, recon math, or protocols…',
    "What's in your stack today?…",
    'Ask PiP anything peptide-related…',
];

const SIDE_EFFECT_OPTIONS = [
    { id: 'none',        label: 'None (Feeling Great)', emoji: '✅' },
    { id: 'pip',         label: 'Physical PIP',         emoji: '💉' },
    { id: 'isr',         label: 'ISR (Redness)',         emoji: '🔴' },
    { id: 'fatigue',     label: 'Fatigue / Lethargy',   emoji: '😴' },
    { id: 'nausea',      label: 'Nausea',               emoji: '🤢' },
    { id: 'headache',    label: 'Headache',              emoji: '🤕' },
    { id: 'other',       label: 'Other (Type it in)',    emoji: '✏️' },
];

const PIP_SESSION_KEY = 'tpprover_pip_session';

function loadSessionMessages() {
    try {
        const raw = sessionStorage.getItem(PIP_SESSION_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

function saveSessionMessages(msgs) {
    try {
        // Only persist serializable fields, cap at last 50 messages
        const slim = msgs.slice(-50).map(({ id, role, content, type, actions, citations, mock, createdAt }) => ({
            id, role, content, type, actions, citations, mock, createdAt,
        }));
        sessionStorage.setItem(PIP_SESSION_KEY, JSON.stringify(slim));
    } catch { /* noop */ }
}

const ChatPanel = forwardRef(function ChatPanel({ theme, onSaveToLibrary, headless = false, userContext, onAction, quotaLimit, showSafetyBanner = true, onQuotaChange, onThinkingChange }, ref) {
    // Sync tier-based quota limit into the service layer
    useEffect(() => {
        if (typeof quotaLimit === 'number' && quotaLimit > 0) setQuotaLimit(quotaLimit);
    }, [quotaLimit]);

    const effectiveQuota = (typeof quotaLimit === 'number' && quotaLimit > 0) ? quotaLimit : AI_DAILY_QUOTA;
    const [messages, setMessages] = useState(() => loadSessionMessages());
    const [input, setInput] = useState('');
    const [thinking, setThinking] = useState(false);
    const [error, setError] = useState(null);
    const cancelledRef = useRef(false);
    const [quotaRemaining, setQuotaRemaining] = useState(() => getRemainingQuota(effectiveQuota));
    const [showGreeting, setShowGreeting] = useState(() => !hasSeenGreeting());
    const [placeholderIdx, setPlaceholderIdx] = useState(() => Math.floor(Math.random() * PIP_PLACEHOLDERS.length));
    const conversationIdRef = useRef(generateId());
    const scrollRef = useRef(null);

    useImperativeHandle(ref, () => ({
        send: (prompt, skipQuota = false) => handleSend(prompt, skipQuota),
        stop: () => handleStop(),
        clear: () => {
            setMessages([]);
            setError(null);
            setShowGreeting(!hasSeenGreeting());
            conversationIdRef.current = generateId();
            try { sessionStorage.removeItem(PIP_SESSION_KEY); } catch { /* noop */ }
        },
    }));

    // Persist messages to sessionStorage on change
    useEffect(() => {
        if (messages.length > 0) saveSessionMessages(messages);
    }, [messages]);

    // Rotate placeholder every 5s
    useEffect(() => {
        if (headless) return;
        const interval = setInterval(() => {
            setPlaceholderIdx(i => (i + 1) % PIP_PLACEHOLDERS.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [headless]);

    // Scroll to bottom — in headless mode scroll the container itself, otherwise scroll inner div
    useEffect(() => {
        if (headless) {
            // Walk up to the nearest scrollable ancestor and scroll it
            const el = scrollRef.current;
            if (!el) return;
            let parent = el.parentElement;
            while (parent) {
                if (parent.scrollHeight > parent.clientHeight && getComputedStyle(parent).overflowY !== 'visible') {
                    parent.scrollTo({ top: parent.scrollHeight, behavior: 'smooth' });
                    break;
                }
                parent = parent.parentElement;
            }
        } else {
            scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [messages, thinking, headless]);

    // Immediately jump to bottom when returning to chat (no animation)
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        if (headless) {
            let parent = el.parentElement;
            while (parent) {
                if (parent.scrollHeight > parent.clientHeight && getComputedStyle(parent).overflowY !== 'visible') {
                    parent.scrollTop = parent.scrollHeight;
                    break;
                }
                parent = parent.parentElement;
            }
        } else {
            el.scrollTop = el.scrollHeight;
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const next = getRemainingQuota(effectiveQuota);
        setQuotaRemaining(next);
        onQuotaChange?.(next);
    }, [effectiveQuota, onQuotaChange]);

    const canSend = useMemo(
        () => !!input.trim() && !thinking,
        [input, thinking]
    );

    const handleDismissGreeting = useCallback(() => {
        markGreetingSeen();
        setShowGreeting(false);
    }, []);

    const handleStop = useCallback(() => {
        cancelledRef.current = true;
        setThinking(false);
        onThinkingChange?.(false);
    }, [onThinkingChange]);

    const handleEditLastMessage = useCallback(() => {
        const lastUserIdx = [...messages].reverse().findIndex(m => m.role === 'user');
        if (lastUserIdx === -1) return;
        const idx = messages.length - 1 - lastUserIdx;
        const lastUserMsg = messages[idx];
        setInput(lastUserMsg.content);
        setMessages(prev => prev.slice(0, idx));
        setError(null);
    }, [messages]);

    const handleSend = async (overridePrompt = null, skipQuota = false) => {
        const prompt = (overridePrompt ?? input).trim();
        if (!prompt || thinking) return;
        if (!skipQuota && quotaRemaining <= 0) return;
        if (!overridePrompt) setInput('');
        setError(null);

        // Dismiss greeting on first user message
        if (showGreeting) handleDismissGreeting();

        const userMsg = {
            id: generateId(),
            role: 'user',
            content: prompt,
            createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, userMsg]);

        cancelledRef.current = false;
        setThinking(true);
        onThinkingChange?.(true);
        try {
            const result = await sendPrompt({
                prompt,
                history: messages,
                conversationId: conversationIdRef.current,
                skipQuota,
                userContext,
            });
            if (cancelledRef.current) return;
            setMessages((prev) => [...prev, result.message]);
            if (!skipQuota) {
                setQuotaRemaining(result.quotaRemaining);
                onQuotaChange?.(result.quotaRemaining);
                trackConversion(EVENTS.AI_PROMPT_SENT, {
                    promptLength: prompt.length,
                    quotaRemaining: result.quotaRemaining,
                });
                if (result.quotaRemaining <= 0) {
                    trackConversion(EVENTS.AI_QUOTA_EXHAUSTED, {});
                    setMessages(prev => [...prev, {
                        id: generateId(),
                        role: 'assistant',
                        content: `Brain fog is real. I've hit my limit for the day — my gears are grinding and my coffee is cold. ☕\n\nI'll be back in the next cycle. Until then, your logs are safe and your stack isn't going anywhere.`,
                        createdAt: new Date().toISOString(),
                    }]);
                }
            }
        } catch (e) {
            if (cancelledRef.current) return;
            setError(e.message || 'Something went wrong.');
        } finally {
            if (!cancelledRef.current) {
                setThinking(false);
                onThinkingChange?.(false);
            }
            cancelledRef.current = false;
        }
    };

    const handleSave = (msg) => {
        if (!onSaveToLibrary || !msg || msg.role !== 'assistant') return;
        const idx = messages.findIndex((m) => m.id === msg.id);
        const prompt = idx > 0 ? messages[idx - 1]?.content : '';
        onSaveToLibrary({
            id: generateId(),
            prompt,
            answer: msg.content,
            citations: msg.citations || [],
            savedAt: new Date().toISOString(),
        });
        trackConversion(EVENTS.AI_LIBRARY_SAVED, { promptLength: (prompt || '').length });
    };

    const handleActionClick = useCallback((action) => {
        if (action.type === 'create_protocol' && action.prefill) {
            onAction?.({ type: 'create_protocol', prefill: action.prefill });
        } else if (action.type === 'side_effect_checkin') {
            // Inject a side effect check-in card as a system message
            const checkinMsg = {
                id: generateId(),
                role: 'assistant',
                type: 'side_effect_checkin',
                content: 'Quick check-in — any side effects today? Just tap one:',
                createdAt: new Date().toISOString(),
            };
            setMessages(prev => [...prev, checkinMsg]);
        }
    }, [onAction]);

    const handleSideEffectSelect = useCallback((option) => {
        // Persist to side effects log (source of truth)
        if (option.id !== 'other') {
            logSideEffect({
                effect: option.id,
                label: option.label,
                source: 'ai_chat',
            });
        }

        const userMsg = {
            id: generateId(),
            role: 'user',
            content: `${option.emoji} ${option.label}`,
            createdAt: new Date().toISOString(),
        };

        let confirmText;
        if (option.id === 'none') {
            confirmText = 'Clean day logged ✓ — no side effects reported. Keep tracking daily so patterns show up over time.';
        } else if (option.id === 'pip') {
            confirmText = 'PIP logged. Common causes: injection speed, needle gauge, or repeating the same site too soon. Try rotating to a fresh site and drawing the plunger slower next time.';
        } else if (option.id === 'other') {
            confirmText = "Got it — type out what you're experiencing and I'll log it properly.";
        } else {
            confirmText = `${option.label} logged and saved. I'll track frequency so we can spot timing patterns. If it persists across multiple sessions, it's worth noting in your protocol log too.`;
        }

        const pipReply = {
            id: generateId(),
            role: 'assistant',
            content: confirmText,
            actions: option.id !== 'none' && option.id !== 'other' ? [{ type: 'side_effect_checkin', label: 'Log another' }] : [],
            createdAt: new Date().toISOString(),
            mock: true,
        };

        setMessages(prev => [...prev, userMsg, pipReply]);

        // Dispatch event for other parts of the app to pick up
        try {
            window.dispatchEvent(new CustomEvent('tpp:side-effect-logged', {
                detail: { effect: option.id, label: option.label, date: new Date().toISOString() },
            }));
        } catch { /* noop */ }
    }, []);

    const primary = theme?.primary || '#7F9E95';

    return (
        <div className="flex flex-col h-full">
            <div
                ref={scrollRef}
                className={`space-y-3 py-4 px-1 ${headless ? '' : 'flex-1 overflow-y-auto'}`}
                style={headless ? {} : { minHeight: 240 }}
            >
                {/* Greeting — always at top, compact once chat starts */}
                <PiPGreeting
                    theme={theme}
                    onDismiss={handleDismissGreeting}
                    onSend={(p) => handleSend(p, true)}
                    compact={messages.length > 0}
                />

                {(() => {
                    const lastUserIdx = [...messages].map((m, i) => m.role === 'user' ? i : -1).filter(i => i !== -1).pop() ?? -1;
                    return messages.map((m, idx) =>
                        m.type === 'side_effect_checkin' ? (
                            <SideEffectCheckin key={m.id} theme={theme} onSelect={handleSideEffectSelect} />
                        ) : (
                            <MessageBubble
                                key={m.id}
                                message={m}
                                theme={theme}
                                onSave={() => handleSave(m)}
                                onEdit={handleEditLastMessage}
                                isLastUser={m.role === 'user' && idx === lastUserIdx}
                                onActionClick={handleActionClick}
                            />
                        )
                    );
                })()}

                {thinking && <ThinkingBubble theme={theme} />}
                {error && (
                    <div
                        className="rounded-xl p-3 text-xs flex items-start gap-2"
                        style={{
                            backgroundColor: (theme?.error || '#d64545') + '18',
                            color: theme?.error || '#d64545',
                            border: `1px solid ${(theme?.error || '#d64545') + '44'}`,
                        }}
                    >
                        <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}
            </div>

            {showSafetyBanner && (
                <SafetyBanner theme={theme} quotaRemaining={quotaRemaining} quotaMax={effectiveQuota} />
            )}

            {!headless && (
                <div className="border-t pt-3" style={{ borderColor: theme?.border || 'rgba(0,0,0,0.08)' }}>
                    <div
                        className="flex items-end gap-2 rounded-2xl p-2"
                        style={{
                            backgroundColor: theme?.background,
                            border: `1px solid ${theme?.border || 'rgba(0,0,0,0.12)'}`,
                        }}
                    >
                        <textarea
                            rows={1}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder={quotaRemaining > 0 ? PIP_PLACEHOLDERS[placeholderIdx] : "PiP's out for the day. Back at midnight ☕"}
                            disabled={quotaRemaining <= 0}
                            className="flex-1 bg-transparent border-0 outline-none text-sm resize-none py-1.5 px-2"
                            style={{ color: theme?.text, maxHeight: 160 }}
                        />
                        {thinking ? (
                            <button
                                type="button"
                                onClick={handleStop}
                                className="p-2 rounded-full transition-transform active:scale-95"
                                style={{ backgroundColor: '#C4714F', color: '#fff' }}
                                aria-label="Stop"
                                title="Stop response"
                            >
                                <Square size={16} fill="currentColor" />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => handleSend()}
                                disabled={!canSend}
                                className="p-2 rounded-full transition-transform active:scale-95 disabled:opacity-40"
                                style={{ backgroundColor: primary, color: '#fff' }}
                                aria-label="Send"
                            >
                                <Send size={16} />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center justify-between mt-1.5 px-1">
                        <p className="text-[10px]" style={{ color: theme?.textLight }}>
                            Enter to send · Shift+Enter for newline
                        </p>
                        <p className="text-[10px]" style={{ color: theme?.textLight }}>
                            {quotaRemaining} / {effectiveQuota} left today
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
});

export default ChatPanel;

// ── First-time greeting ──────────────────────────────────────────────────────

const GREETING_QUESTIONS = [
    { label: "What's a PiP?",    Icon: Sparkles,  prompt: "What's a PiP?" },
    { label: 'What can you do?', Icon: BookOpen,  prompt: 'What can you do?' },
];

const GREETING_ACTIONS = [
    { label: 'Analyze my stack', Icon: Layers,        prompt: 'Analyze my current stack' },
    { label: 'New protocol',     Icon: ClipboardList, prompt: 'Help me set up a new protocol' },
    { label: 'Log side effect',  Icon: AlertCircle,   prompt: 'I want to log a side effect' },
];

function PiPGreeting({ theme, onDismiss, onSend, compact = false }) {
    const primary = theme?.primary || '#7F9E95';

    const handleChip = (prompt) => {
        onDismiss();
        setTimeout(() => onSend?.(prompt), 80);
    };

    if (compact) {
        return (
            <div className="pb-1">
                <div className="rounded-xl px-3 py-2.5" style={{ background: `${primary}0d`, border: `1px solid ${primary}20` }}>
                    <div className="flex flex-wrap gap-1.5">
                        {[...GREETING_QUESTIONS, ...GREETING_ACTIONS].map(c => (
                            <button
                                key={c.label}
                                type="button"
                                onClick={() => handleChip(c.prompt)}
                                className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full transition-all active:scale-95 touch-manipulation border"
                                style={{ backgroundColor: `${primary}12`, color: primary, borderColor: `${primary}30` }}
                            >
                                <c.Icon size={11} />
                                {c.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3 py-2">
            <div
                className="rounded-2xl p-4"
                style={{
                    background: `linear-gradient(135deg, ${primary}12, ${primary}08)`,
                    border: `1px solid ${primary}25`,
                }}
            >
                <div className="flex items-center gap-2 mb-2.5">
                    <img src={pipAvatar} alt="PiP" className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
                    <div>
                        <p className="text-sm font-bold flex items-center gap-1" style={{ color: theme?.text }}>
                            Hey, I'm PiP <HandWaving size={15} weight="bold" color={primary} />
                        </p>
                        <p className="text-[10px]" style={{ color: theme?.textLight }}>Yes, I'm aware of the irony.</p>
                    </div>
                </div>

                <p className="text-xs leading-relaxed mb-3" style={{ color: theme?.text }}>
                    Unlike the other kind of PIP, I won't make your leg sore — I'm just here to keep your logs clean and your stack tighter than a peptide bond.
                </p>

                <div className="space-y-2 mb-3">
                    <div>
                        <p className="text-[9px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: theme?.textLight }}>Ask me</p>
                        <div className="flex flex-wrap gap-1.5">
                            {GREETING_QUESTIONS.map(c => (
                                <button
                                    key={c.label}
                                    type="button"
                                    onClick={() => handleChip(c.prompt)}
                                    className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full transition-all active:scale-95 touch-manipulation border"
                                    style={{ backgroundColor: `${primary}12`, color: primary, borderColor: `${primary}30` }}
                                >
                                    <c.Icon size={11} />
                                    {c.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <p className="text-[9px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: theme?.textLight }}>Quick actions</p>
                        <div className="flex flex-wrap gap-1.5">
                            {GREETING_ACTIONS.map(c => (
                                <button
                                    key={c.label}
                                    type="button"
                                    onClick={() => handleChip(c.prompt)}
                                    className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full transition-all active:scale-95 touch-manipulation border"
                                    style={{ backgroundColor: `${primary}08`, color: theme?.textLight, borderColor: theme?.border || `${primary}20` }}
                                >
                                    <c.Icon size={11} />
                                    {c.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

// ── Safety banner ────────────────────────────────────────────────────────────

function SafetyBanner({ theme, quotaRemaining, quotaMax = AI_DAILY_QUOTA }) {
    const primary = theme?.primary || '#7F9E95';
    return (
        <div
            className="rounded-lg px-3 py-2 flex items-center gap-2"
            style={{
                backgroundColor: `${primary}0d`,
                border: `1px solid ${primary}28`,
            }}
        >
            <Shield size={12} style={{ color: primary }} className="flex-shrink-0" />
            <p className="text-[11px] flex-1 leading-snug" style={{ color: theme?.textLight }}>
                <span className="font-semibold" style={{ color: primary }}>PiP</span>
                {' '}— educational only, not medical advice.
            </p>
            <span
                className="text-[10px] font-bold whitespace-nowrap px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: `${primary}20`, color: primary }}
            >
                {quotaRemaining}/{quotaMax}
            </span>
        </div>
    );
}

// ── Empty state (returning users) ────────────────────────────────────────────

function EmptyState({ theme, onPromptSelect, userContext }) {
    const primary = theme?.primary || '#7F9E95';

    const prompts = useMemo(() => {
        const activeProtocols = (userContext?.protocols || []).filter(p => p.active);
        const firstName = activeProtocols[0]?.name || activeProtocols[0]?.protocolName || null;
        const hasMultiple = activeProtocols.length >= 2;
        const supplies = (userContext?.stockpile || []).filter(s => s.type === 'supply');
        const hasLowSupply = supplies.some(s => (s.quantity || 0) <= 3);

        const all = [
            firstName
                ? { text: `Is my ${firstName} protocol dialed in, or am I leaving gains on the table?`, skipQuota: true }
                : { text: "Walk me through BPC-157 dosing like I've never heard of it.", skipQuota: true },
            hasMultiple
                ? { text: 'Am I doubling up on anything? Check my stack for overlap.', skipQuota: true }
                : { text: "What's the difference between BPC-157 and TB-500 for recovery?", skipQuota: true },
            hasLowSupply
                ? { text: 'Which of my supplies are about to run dry?', skipQuota: true }
                : { text: 'Help me build a protocol for Ipamorelin — start to finish.', skipQuota: true },
            { text: 'Give me the short version on GLP-1 dosing.', skipQuota: true },
        ];

        return all.slice(0, firstName || hasMultiple ? 3 : 3);
    }, [userContext]);

    return (
        <div className="text-center py-5">
            <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center mx-auto mb-2.5"
                style={{ backgroundColor: `${primary}18` }}
            >
                <ChatCenteredDots size={20} weight="bold" style={{ color: primary }} />
            </div>
            <p className="text-sm font-bold" style={{ color: theme?.text }}>
                What's on your mind?
            </p>
            <p className="text-xs mt-0.5 mb-3 leading-relaxed" style={{ color: theme?.textLight }}>
                I'm pixels, not protein — but I know my peptides.
            </p>
            <div className="flex flex-col gap-1.5 items-center">
                {prompts.map((p) => (
                    <button
                        key={p.text}
                        type="button"
                        onClick={() => onPromptSelect?.(p.text)}
                        className="text-[11px] px-3 py-1.5 rounded-full max-w-[280px] text-left transition-all active:scale-95"
                        style={{
                            backgroundColor: theme?.cardBackground || '#fff',
                            color: theme?.textLight,
                            border: `1px solid ${theme?.border || 'rgba(0,0,0,0.08)'}`,
                            WebkitTapHighlightColor: 'transparent',
                        }}
                    >
                        {p.text}
                    </button>
                ))}
            </div>
            <p className="text-[10px] mt-3 opacity-40" style={{ color: theme?.textLight }}>
                These don't touch your quota.
            </p>
        </div>
    );
}

// ── Side effect check-in card ────────────────────────────────────────────────

function SideEffectCheckin({ theme, onSelect }) {
    const primary = theme?.primary || '#7F9E95';
    return (
        <div className="flex justify-start">
            <div
                className="max-w-[90%] rounded-2xl p-3"
                style={{
                    backgroundColor: theme?.cardBackground || theme?.white || '#fff',
                    border: `1px solid ${theme?.border || 'rgba(0,0,0,0.08)'}`,
                }}
            >
                <div className="flex items-center gap-2 mb-2">
                    <FirstAid size={14} weight="duotone" color={primary} />
                    <p className="text-xs font-semibold" style={{ color: theme?.text }}>
                        Quick check-in — any side effects today?
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                    {SIDE_EFFECT_OPTIONS.map(opt => (
                        <button
                            key={opt.id}
                            onClick={() => onSelect(opt)}
                            className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-left text-[11px] transition-all active:scale-[0.97]"
                            style={{
                                backgroundColor: opt.id === 'none'
                                    ? `${primary}10`
                                    : (theme?.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)'),
                                border: `1px solid ${opt.id === 'none' ? `${primary}30` : (theme?.border || 'rgba(0,0,0,0.06)')}`,
                                color: theme?.text,
                            }}
                        >
                            <span>{opt.emoji}</span>
                            <span className="truncate">{opt.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── Action card (protocol creation, etc.) ────────────────────────────────────

function ActionCard({ action, theme, onClick }) {
    const isProtocol = action.type === 'create_protocol';
    const isSideEffect = action.type === 'side_effect_checkin';
    const primary = theme?.primary || '#7F9E95';
    const accent = isProtocol ? '#818cf8' : primary;

    return (
        <button
            onClick={() => onClick(action)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all active:scale-[0.97] mt-2"
            style={{
                backgroundColor: `${accent}10`,
                border: `1px solid ${accent}30`,
            }}
        >
            <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${accent}20` }}
            >
                {isProtocol && <ClipboardText size={14} weight="duotone" color={accent} />}
                {isSideEffect && <FirstAid size={14} weight="duotone" color={accent} />}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: accent }}>{action.label}</p>
                {isProtocol && (
                    <p className="text-[10px]" style={{ color: theme?.textLight }}>Opens pre-filled form — you review before saving</p>
                )}
                {isSideEffect && (
                    <p className="text-[10px]" style={{ color: theme?.textLight }}>Quick tap to log</p>
                )}
            </div>
            <ChevronRight size={14} style={{ color: accent }} className="flex-shrink-0" />
        </button>
    );
}

// ── Simple inline markdown renderer ──────────────────────────────────────────

function renderInline(line) {
    const parts = [];
    const pattern = /(\*\*(.+?)\*\*|_(.+?)_)/g;
    let last = 0, m;
    while ((m = pattern.exec(line)) !== null) {
        if (m.index > last) parts.push(line.slice(last, m.index));
        if (m[0].startsWith('**')) parts.push(<strong key={`b${m.index}`}>{m[2]}</strong>);
        else parts.push(<em key={`i${m.index}`}>{m[3]}</em>);
        last = m.index + m[0].length;
    }
    if (last < line.length) parts.push(line.slice(last));
    return parts;
}

function renderMarkdown(text) {
    if (!text) return null;
    return text.split('\n').map((line, li) => {
        if (!line.trim()) return <br key={li} />;
        // H2/H3 headers → bold label
        if (/^###\s+/.test(line)) {
            const content = line.replace(/^###\s+/, '');
            return <p key={li} className="font-semibold leading-snug mt-2">{renderInline(content)}</p>;
        }
        if (/^##\s+/.test(line)) {
            const content = line.replace(/^##\s+/, '');
            return <p key={li} className="font-bold leading-snug mt-2">{renderInline(content)}</p>;
        }
        // Bullet points
        if (/^[-•*]\s+/.test(line)) {
            const content = line.replace(/^[-•*]\s+/, '');
            return (
                <p key={li} className="leading-relaxed flex gap-1.5">
                    <span className="mt-0.5 shrink-0">•</span>
                    <span>{renderInline(content)}</span>
                </p>
            );
        }
        return <p key={li} className="leading-relaxed">{renderInline(line)}</p>;
    });
}

// ── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message, theme, onSave, onEdit, onActionClick, isLastUser }) {
    const isUser = message.role === 'user';
    const bg = isUser
        ? (theme?.primary || '#7F9E95')
        : (theme?.cardBackground || theme?.white || '#fff');
    const fg = isUser ? '#fff' : theme?.text;

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} group`}>
            <div
                className="max-w-[85%] rounded-2xl p-3 relative"
                style={{
                    backgroundColor: bg,
                    color: fg,
                    border: isUser ? 'none' : `1px solid ${theme?.border || 'rgba(0,0,0,0.08)'}`,
                }}
            >
                <div className="text-sm space-y-0.5">{renderMarkdown(message.content)}</div>

                {/* Edit button on last user message */}
                {isUser && isLastUser && (
                    <button
                        type="button"
                        onClick={onEdit}
                        title="Edit message"
                        className="absolute -bottom-5 right-0 text-[10px] inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: theme?.textLight }}
                    >
                        <Pencil size={10} />
                        Edit
                    </button>
                )}

                {/* Action cards */}
                {!isUser && Array.isArray(message.actions) && message.actions.length > 0 && (
                    <div className="space-y-1 mt-1">
                        {message.actions.map((a, i) => (
                            <ActionCard key={i} action={a} theme={theme} onClick={onActionClick} />
                        ))}
                    </div>
                )}

                {!isUser && Array.isArray(message.citations) && message.citations.length > 0 && (
                    <div
                        className="mt-2 pt-2 border-t space-y-1"
                        style={{ borderColor: theme?.border || 'rgba(0,0,0,0.08)' }}
                    >
                        <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: theme?.textLight }}>
                            Sources
                        </p>
                        {message.citations.map((c) => (
                            <p key={c.id} className="text-[11px]" style={{ color: theme?.textLight }}>
                                · {c.title} — {c.source} ({c.year})
                            </p>
                        ))}
                    </div>
                )}

                {!isUser && !message.type && (
                    <div
                        className="mt-2 pt-2 border-t flex items-center justify-end"
                        style={{ borderColor: theme?.border || 'rgba(0,0,0,0.08)' }}
                    >
                        <button
                            type="button"
                            onClick={onSave}
                            className="text-[11px] inline-flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity"
                            style={{ color: theme?.primary || '#7F9E95' }}
                            title="Save this response to your AI Library"
                        >
                            <Bookmark size={11} />
                            Save to library
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Thinking indicator ───────────────────────────────────────────────────────

function ThinkingBubble({ theme }) {
    return (
        <div className="flex justify-start">
            <div
                className="rounded-2xl px-3 py-2 inline-flex items-center gap-2"
                style={{
                    backgroundColor: theme?.cardBackground || theme?.white,
                    border: `1px solid ${theme?.border || 'rgba(0,0,0,0.08)'}`,
                }}
            >
                <Loader2 size={12} className="animate-spin" style={{ color: theme?.primary || '#7F9E95' }} />
                <span className="text-xs" style={{ color: theme?.textLight }}>
                    Thinking…
                </span>
            </div>
        </div>
    );
}
