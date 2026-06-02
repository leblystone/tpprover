/**
 * Research Notes helpers — PiP chat saves land in tpprover_user_notes.
 */
import { generateId } from './string';
import { prepareItemForSave } from './userDataSave';

export const NOTE_KIND_PIP = 'pip';

function loadUserNotes() {
    try {
        const raw = localStorage.getItem('tpprover_user_notes');
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function persistUserNotes(notes) {
    localStorage.setItem('tpprover_user_notes', JSON.stringify(notes));
    window.dispatchEvent(new CustomEvent('tpp:user-notes-updated', { detail: { notes } }));
}

/**
 * Save a PiP Q&A pair into Research Notes as a "P.i.P chat" entry.
 * @param {{ prompt?: string, answer: string, citations?: unknown[] }} entry
 */
export function savePipChatToResearchNotes({ prompt = '', answer, citations = [] }) {
    if (!answer || !String(answer).trim()) return null;

    const trimmedPrompt = String(prompt || '').trim();
    const trimmedAnswer = String(answer).trim();
    const title = trimmedPrompt
        ? trimmedPrompt.slice(0, 72) + (trimmedPrompt.length > 72 ? '…' : '')
        : 'PiP response';

    const contentParts = [];
    if (trimmedPrompt) {
        contentParts.push(`You asked:\n${trimmedPrompt}`);
    }
    contentParts.push(`PiP:\n${trimmedAnswer}`);
    if (Array.isArray(citations) && citations.length > 0) {
        contentParts.push(
            citations.map((c) => `· ${c.title || 'Source'} — ${c.source || ''} ${c.year || ''}`.trim()).join('\n')
        );
    }

    const note = prepareItemForSave({
        noteKind: NOTE_KIND_PIP,
        source: 'pip_chat',
        title,
        content: contentParts.join('\n\n'),
        pipPrompt: trimmedPrompt || undefined,
        pipAnswer: trimmedAnswer,
        createdAt: new Date().toISOString(),
    }, { isNew: true });

    const existing = loadUserNotes();
    const next = [note, ...existing];
    persistUserNotes(next);

    window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: 'Saved to Research Notes', type: 'success' },
    }));

    return note;
}
