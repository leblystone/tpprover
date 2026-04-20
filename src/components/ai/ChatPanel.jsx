import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Send, Sparkles, AlertTriangle, Bookmark, Shield, Info, Loader2 } from 'lucide-react';
import aiService, { sendPrompt, getRemainingQuota, AI_DAILY_QUOTA } from '../../services/aiResearch';
import { generateId } from '../../utils/string';
import { trackConversion, EVENTS } from '../../services/conversionAnalytics';

/**
 * AI Research chat panel.
 *
 * Simple conversational UI with:
 *   - Streaming-feel "thinking" indicator (currently deterministic mock)
 *   - Daily quota badge
 *   - Per-message "Save to Library" action
 *   - Clear, non-prescriptive safety disclaimer at the top
 */
export default function ChatPanel({ theme, onSaveToLibrary }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [thinking, setThinking] = useState(false);
    const [error, setError] = useState(null);
    const [quotaRemaining, setQuotaRemaining] = useState(() => getRemainingQuota());
    const conversationIdRef = useRef(generateId());
    const scrollRef = useRef(null);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages, thinking]);

    const canSend = useMemo(
        () => !!input.trim() && !thinking && quotaRemaining > 0,
        [input, thinking, quotaRemaining]
    );

    const handleSend = async () => {
        if (!canSend) return;
        const prompt = input.trim();
        setInput('');
        setError(null);

        const userMsg = {
            id: generateId(),
            role: 'user',
            content: prompt,
            createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, userMsg]);

        setThinking(true);
        try {
            const result = await sendPrompt({
                prompt,
                history: messages,
                conversationId: conversationIdRef.current,
            });
            setMessages((prev) => [...prev, result.message]);
            setQuotaRemaining(result.quotaRemaining);
            trackConversion(EVENTS.AI_PROMPT_SENT, {
                promptLength: prompt.length,
                quotaRemaining: result.quotaRemaining,
            });
            if (result.quotaRemaining <= 0) {
                trackConversion(EVENTS.AI_QUOTA_EXHAUSTED, {});
            }
        } catch (e) {
            setError(e.message || 'Something went wrong.');
        } finally {
            setThinking(false);
        }
    };

    const handleSave = (msg) => {
        if (!onSaveToLibrary || !msg || msg.role !== 'assistant') return;
        // Find the matching user prompt (previous message)
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

    return (
        <div className="flex flex-col h-full">
            <SafetyBanner theme={theme} quotaRemaining={quotaRemaining} />

            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto space-y-3 py-4 px-1"
                style={{ minHeight: 240 }}
            >
                {messages.length === 0 && !thinking && <EmptyState theme={theme} />}

                {messages.map((m) => (
                    <MessageBubble
                        key={m.id}
                        message={m}
                        theme={theme}
                        onSave={() => handleSave(m)}
                    />
                ))}

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
                        placeholder={quotaRemaining > 0 ? 'Ask a research question...' : 'Daily quota reached — resets at midnight.'}
                        disabled={quotaRemaining <= 0}
                        className="flex-1 bg-transparent border-0 outline-none text-sm resize-none py-1.5 px-2"
                        style={{ color: theme?.text, maxHeight: 160 }}
                    />
                    <button
                        type="button"
                        onClick={handleSend}
                        disabled={!canSend}
                        className="p-2 rounded-full transition-transform active:scale-95 disabled:opacity-40"
                        style={{ backgroundColor: theme?.primary || '#7F9E95', color: '#fff' }}
                        aria-label="Send"
                    >
                        {thinking ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    </button>
                </div>
                <div className="flex items-center justify-between mt-1.5 px-1">
                    <p className="text-[10px]" style={{ color: theme?.textLight }}>
                        Enter to send · Shift+Enter for newline
                    </p>
                    <p className="text-[10px]" style={{ color: theme?.textLight }}>
                        {quotaRemaining} / {AI_DAILY_QUOTA} left today
                    </p>
                </div>
            </div>
        </div>
    );
}

function SafetyBanner({ theme, quotaRemaining }) {
    return (
        <div
            className="rounded-xl p-3 flex items-start gap-2 text-xs"
            style={{
                backgroundColor: (theme?.primary || '#7F9E95') + '10',
                border: `1px solid ${(theme?.primary || '#7F9E95') + '33'}`,
                color: theme?.textLight,
            }}
        >
            <Shield size={14} style={{ color: theme?.primary || '#7F9E95' }} className="mt-0.5 flex-shrink-0" />
            <div className="flex-1">
                <p>
                    Research assistant — educational only, not medical advice. Responses cite sources; verify with primary literature.
                </p>
            </div>
            <span
                className="text-[10px] font-semibold whitespace-nowrap px-2 py-0.5 rounded-full"
                style={{ backgroundColor: (theme?.primary || '#7F9E95') + '22', color: theme?.primary || '#7F9E95' }}
            >
                {quotaRemaining} left
            </span>
        </div>
    );
}

function EmptyState({ theme }) {
    const prompts = [
        'What does the literature say about BPC-157 for tendon repair?',
        'How is GLP-1 typically dosed in research settings?',
        'Compare the half-lives of Ipamorelin and CJC-1295.',
    ];
    return (
        <div className="text-center py-6">
            <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                style={{ backgroundColor: (theme?.primary || '#7F9E95') + '18' }}
            >
                <Sparkles size={22} style={{ color: theme?.primary || '#7F9E95' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: theme?.text }}>
                Ask the AI research assistant
            </p>
            <p className="text-xs mt-1 mb-3" style={{ color: theme?.textLight }}>
                Try one of these to get started:
            </p>
            <div className="flex flex-col gap-1.5 items-center">
                {prompts.map((p) => (
                    <span
                        key={p}
                        className="text-[11px] px-3 py-1.5 rounded-full max-w-xs"
                        style={{
                            backgroundColor: theme?.cardBackground || theme?.white,
                            color: theme?.textLight,
                            border: `1px solid ${theme?.border || 'rgba(0,0,0,0.08)'}`,
                        }}
                    >
                        {p}
                    </span>
                ))}
            </div>
        </div>
    );
}

function MessageBubble({ message, theme, onSave }) {
    const isUser = message.role === 'user';
    const bg = isUser
        ? (theme?.primary || '#7F9E95')
        : (theme?.cardBackground || theme?.white || '#fff');
    const fg = isUser ? '#fff' : theme?.text;

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div
                className="max-w-[85%] rounded-2xl p-3"
                style={{
                    backgroundColor: bg,
                    color: fg,
                    border: isUser ? 'none' : `1px solid ${theme?.border || 'rgba(0,0,0,0.08)'}`,
                }}
            >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>

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

                {!isUser && (
                    <div
                        className="mt-2 pt-2 border-t flex items-center justify-between"
                        style={{ borderColor: theme?.border || 'rgba(0,0,0,0.08)' }}
                    >
                        {message.mock && (
                            <span className="text-[10px] inline-flex items-center gap-1" style={{ color: theme?.textLight }}>
                                <Info size={10} /> Mock response (preview)
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={onSave}
                            className="text-[11px] inline-flex items-center gap-1 ml-auto hover:underline"
                            style={{ color: theme?.primary || '#7F9E95' }}
                        >
                            <Bookmark size={11} />
                            Save
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

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
