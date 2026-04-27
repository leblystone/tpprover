import React, { useState, useEffect, useCallback } from 'react';
import BottomSheet from '../common/BottomSheet';
import { NoteBlank } from '@phosphor-icons/react';

const STORAGE_KEY = 'tpprover_protocol_notes';

function loadAllNotes() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
        return {};
    }
}

function saveNote(protocolId, text) {
    const all = loadAllNotes();
    if (text.trim()) {
        all[protocolId] = { text: text.trim(), updatedAt: new Date().toISOString() };
    } else {
        delete all[protocolId];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('tpp:protocol-notes-updated'));
}

export function getProtocolNote(protocolId) {
    return loadAllNotes()[protocolId]?.text || '';
}

export default function ProtocolNotesSheet({ open, onClose, theme, protocol }) {
    const [text, setText] = useState('');
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (open && protocol?.id) {
            setText(getProtocolNote(protocol.id));
            setSaved(false);
        }
    }, [open, protocol?.id]);

    const handleSave = useCallback(() => {
        if (!protocol?.id) return;
        saveNote(protocol.id, text);
        setSaved(true);
        setTimeout(() => onClose?.(), 600);
    }, [protocol?.id, text, onClose]);

    const primary = theme?.primary || '#7F9E95';

    return (
        <BottomSheet
            open={open}
            onClose={onClose}
            title={`Notes — ${protocol?.protocolName || 'Protocol'}`}
            theme={theme}
            fitContent
            seamlessContent={false}
        >
            <div className="px-4 pb-6 pt-2 space-y-4">
                {saved ? (
                    <div className="flex flex-col items-center gap-3 py-6">
                        <NoteBlank size={40} weight="duotone" style={{ color: primary }} />
                        <p className="text-base font-bold" style={{ color: theme?.text }}>Saved!</p>
                    </div>
                ) : (
                    <>
                        <textarea
                            rows={5}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Add notes about this protocol — observations, tweaks, reminders…"
                            className="w-full rounded-xl px-3.5 py-3 text-sm border outline-none resize-none transition-colors"
                            style={{
                                backgroundColor: theme?.cardBackground || '#fff',
                                borderColor: theme?.border || 'rgba(0,0,0,0.12)',
                                color: theme?.text,
                            }}
                            autoFocus
                        />
                        <button
                            type="button"
                            onClick={handleSave}
                            className="w-full rounded-xl py-3 text-sm font-bold text-white active:scale-[0.98] transition-all"
                            style={{ backgroundColor: primary, boxShadow: `0 2px 8px ${primary}40` }}
                        >
                            Save Note
                        </button>
                    </>
                )}
            </div>
        </BottomSheet>
    );
}
