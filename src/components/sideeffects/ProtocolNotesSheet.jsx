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

export default function ProtocolNotesSheet({ open, onClose, theme, protocol, protocols = [] }) {
    const [text, setText] = useState('');
    const [saved, setSaved] = useState(false);
    const [linkedProtocol, setLinkedProtocol] = useState(null);

    useEffect(() => {
        if (open) {
            const proto = protocol?.id ? protocol : null;
            setLinkedProtocol(proto);
            setText(proto?.id ? getProtocolNote(proto.id) : '');
            setSaved(false);
        }
    }, [open, protocol]);

    // Reload note text when user picks a different protocol
    useEffect(() => {
        if (linkedProtocol?.id) {
            setText(getProtocolNote(linkedProtocol.id));
        } else {
            setText('');
        }
    }, [linkedProtocol?.id]);

    const handleSave = useCallback(() => {
        if (linkedProtocol?.id) {
            saveNote(linkedProtocol.id, text);
        }
        setSaved(true);
        setTimeout(() => onClose?.(), 600);
    }, [linkedProtocol, text, onClose]);

    const primary = theme?.primary || '#7F9E95';
    const sheetTitle = linkedProtocol?.protocolName
        ? `Notes — ${linkedProtocol.protocolName}`
        : 'Protocol Notes';

    return (
        <BottomSheet
            open={open}
            onClose={onClose}
            title={sheetTitle}
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
                        {/* Protocol picker */}
                        {protocols.length > 0 && (
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: theme?.textLight }}>Protocol</p>
                                <select
                                    value={linkedProtocol?.id || ''}
                                    onChange={(e) => {
                                        const found = protocols.find(p => p.id === e.target.value);
                                        setLinkedProtocol(found || null);
                                    }}
                                    className="w-full rounded-xl px-3.5 py-2.5 text-sm border outline-none transition-colors appearance-none"
                                    style={{
                                        backgroundColor: theme?.cardBackground || '#fff',
                                        borderColor: theme?.border || 'rgba(0,0,0,0.12)',
                                        color: theme?.text,
                                    }}
                                >
                                    <option value="">— Select a protocol —</option>
                                    {protocols.map(p => (
                                        <option key={p.id} value={p.id}>{p.protocolName}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <textarea
                            rows={5}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder={linkedProtocol ? `Notes for ${linkedProtocol.protocolName} — observations, tweaks, reminders…` : 'Select a protocol above to add notes…'}
                            className="w-full rounded-xl px-3.5 py-3 text-sm border outline-none resize-none transition-colors"
                            style={{
                                backgroundColor: theme?.cardBackground || '#fff',
                                borderColor: theme?.border || 'rgba(0,0,0,0.12)',
                                color: theme?.text,
                            }}
                        />
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={!linkedProtocol?.id}
                            className="w-full rounded-xl py-3 text-sm font-bold text-white active:scale-[0.98] transition-all disabled:opacity-40"
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
