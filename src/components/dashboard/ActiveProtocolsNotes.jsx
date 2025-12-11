import React, { useState, useEffect, useMemo } from 'react';
import { FlaskConical, Plus, FileText, X } from 'lucide-react';
import Modal from '../common/Modal';
import TextInput from '../common/inputs/TextInput';
import { findActiveProtocolHistoryEntry, addNoteToProtocolHistory, saveProtocolHistoryEntry } from '../../utils/protocolHistory';
import { formatMMDDYYYY, getLocalDateString } from '../../utils/date';

const NOTE_TAGS = [
    { id: 'progress', label: 'Progress', color: '#10b981' },
    { id: 'side_effects', label: 'Side Effects', color: '#ef4444' },
    { id: 'adjustment', label: 'Adjustment', color: '#f59e0b' },
    { id: 'observation', label: 'Observation', color: '#3b82f6' },
    { id: 'question', label: 'Question', color: '#8b5cf6' }
];

export default function ActiveProtocolsNotes({ protocols = [], theme, onAddNote }) {
    const [selectedProtocol, setSelectedProtocol] = useState(null);
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [noteContent, setNoteContent] = useState('');
    const [selectedTags, setSelectedTags] = useState([]);
    const [protocolsWithNotes, setProtocolsWithNotes] = useState([]);

    // Filter to only active protocols
    const activeProtocols = useMemo(() => {
        return protocols.filter(p => {
            if (p?.active !== true) return false;
            if (!p?.startDate) return false;
            const today = new Date();
            const s = new Date(p.startDate);
            if (today < new Date(s.getFullYear(), s.getMonth(), s.getDate())) return false;
            if (p.endDate) {
                const e = new Date(p.endDate);
                return today <= new Date(e.getFullYear(), e.getMonth(), e.getDate());
            }
            const d = p.duration || {};
            if (d.noEnd || !d.count || !d.unit) return true;
            const e = new Date(s);
            if (String(d.unit).toLowerCase() === 'day') e.setDate(e.getDate() + Number(d.count));
            else if (String(d.unit).toLowerCase() === 'week') e.setDate(e.getDate() + Number(d.count) * 7);
            else if (String(d.unit).toLowerCase() === 'month') e.setMonth(e.getMonth() + Number(d.count));
            return today <= new Date(e.getFullYear(), e.getMonth(), e.getDate());
        });
    }, [protocols]);

    // Load notes count for each active protocol
    useEffect(() => {
        const protocolsWithData = activeProtocols.map(protocol => {
            const activeEntry = findActiveProtocolHistoryEntry(protocol.id);
            const notes = activeEntry?.notes || [];
            const duringNotes = notes.filter(n => n.type === 'during');
            const latestNote = duringNotes.length > 0 
                ? duringNotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
                : null;
            
            return {
                ...protocol,
                notesCount: duringNotes.length,
                latestNote
            };
        });
        setProtocolsWithNotes(protocolsWithData);
    }, [activeProtocols]);

    const handleAddNoteClick = (protocol) => {
        setSelectedProtocol(protocol);
        setNoteContent('');
        setSelectedTags([]);
        setShowNoteModal(true);
    };

    const handleTagToggle = (tagId) => {
        setSelectedTags(prev => 
            prev.includes(tagId)
                ? prev.filter(id => id !== tagId)
                : [...prev, tagId]
        );
    };

    const handleSaveNote = () => {
        if (!selectedProtocol || (!noteContent.trim() && selectedTags.length === 0)) {
            return;
        }

        let activeEntry = findActiveProtocolHistoryEntry(selectedProtocol.id);
        
        // If no history entry exists but protocol is active, create one
        if (!activeEntry && selectedProtocol.active && selectedProtocol.startDate) {
            const protocolName = selectedProtocol.name || selectedProtocol.protocolName || 'Unnamed Protocol';
            const historyId = saveProtocolHistoryEntry({
                protocolId: selectedProtocol.id,
                protocolName: protocolName,
                startDate: selectedProtocol.startDate,
                protocolData: {
                    protocolName: protocolName,
                    peptides: selectedProtocol.peptides || [],
                    duration: selectedProtocol.duration || {},
                    purpose: selectedProtocol.purpose || '',
                    linkedItems: selectedProtocol.linkedItems || {}
                },
                vials: [],
                reconstitutionData: null,
                skippedReconstitution: null
            });
            
            if (historyId) {
                // Reload the entry
                activeEntry = findActiveProtocolHistoryEntry(selectedProtocol.id);
                window.dispatchEvent(new CustomEvent('tpp:protocol-history-updated'));
            }
        }
        
        if (!activeEntry) {
            window.dispatchEvent(new CustomEvent('tpp:toast', { 
                detail: { message: 'Protocol must be started to add notes.', type: 'error' } 
            }));
            setShowNoteModal(false);
            return;
        }

        const noteData = {
            type: 'during',
            content: noteContent.trim(),
            tags: selectedTags,
            linkedDate: getLocalDateString() // Automatically link to today's date so it appears in calendar
        };

        if (addNoteToProtocolHistory(activeEntry.id, noteData)) {
            window.dispatchEvent(new CustomEvent('tpp:toast', { 
                detail: { message: 'Note added successfully.', type: 'success' } 
            }));
            window.dispatchEvent(new CustomEvent('tpp:protocol-history-updated'));
            
            // Refresh notes count
            const updatedEntry = findActiveProtocolHistoryEntry(selectedProtocol.id);
            const notes = updatedEntry?.notes || [];
            const duringNotes = notes.filter(n => n.type === 'during');
            const latestNote = duringNotes.length > 0 
                ? duringNotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
                : null;
            
            setProtocolsWithNotes(prev => prev.map(p => 
                p.id === selectedProtocol.id 
                    ? { ...p, notesCount: duringNotes.length, latestNote }
                    : p
            ));
            
            setShowNoteModal(false);
            setNoteContent('');
            setSelectedTags([]);
            if (onAddNote) onAddNote(selectedProtocol.id);
        } else {
            window.dispatchEvent(new CustomEvent('tpp:toast', { 
                detail: { message: 'Failed to add note.', type: 'error' } 
            }));
        }
    };

    if (activeProtocols.length === 0) {
        return (
            <div className="h-full flex flex-col p-4 rounded-xl content-card w-full" style={{ backgroundColor: theme.white }}>
                <h3 className="text-base font-semibold mb-3 border-b pb-2 flex-shrink-0" style={{ color: theme.primaryDark || theme.text, borderColor: theme.border }}>
                    Peptide Observations
                </h3>
                <div className="flex-1 flex items-center justify-center">
                    <p className="text-sm text-center" style={{ color: theme.textLight }}>
                        No active protocols. Start a protocol to add observations.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="h-full flex flex-col p-4 rounded-xl content-card w-full" style={{ backgroundColor: theme.white }}>
                <h3 className="text-base font-semibold mb-3 border-b pb-2 flex-shrink-0 flex items-center gap-2" style={{ color: theme.primaryDark || theme.text, borderColor: theme.border }}>
                    <FlaskConical size={18} style={{ color: theme.primary }} />
                    <span>Peptide Observations</span>
                </h3>
                
                <div className="flex-1 overflow-y-auto min-h-0 space-y-2">
                    {protocolsWithNotes.map((protocol) => {
                        const protocolName = protocol.name || protocol.protocolName || 'Unnamed Protocol';
                        return (
                            <div 
                                key={protocol.id} 
                                className="p-3 rounded-lg border transition-all hover:opacity-80 cursor-pointer"
                                style={{ borderColor: theme.border }}
                                onClick={() => handleAddNoteClick(protocol)}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-sm mb-1 truncate" style={{ color: theme.text }}>
                                            {protocolName}
                                        </div>
                                        {protocol.latestNote && (
                                            <div className="text-xs mb-2 line-clamp-2" style={{ color: theme.textLight }}>
                                                {protocol.latestNote.content}
                                            </div>
                                        )}
                                        <div className="flex items-center gap-3 text-xs" style={{ color: theme.textLight }}>
                                            {protocol.notesCount > 0 && (
                                                <span className="flex items-center gap-1">
                                                    <FileText size={12} />
                                                    {protocol.notesCount} note{protocol.notesCount !== 1 ? 's' : ''}
                                                </span>
                                            )}
                                            {protocol.latestNote && (
                                                <span>{formatMMDDYYYY(protocol.latestNote.createdAt)}</span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleAddNoteClick(protocol);
                                        }}
                                        className="p-1.5 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
                                        style={{ 
                                            backgroundColor: theme.primary,
                                            color: '#ffffff'
                                        }}
                                        title="Add note"
                                    >
                                        <Plus size={14} strokeWidth={3} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Add Note Modal */}
            <Modal
                open={showNoteModal}
                onClose={() => {
                    setShowNoteModal(false);
                    setNoteContent('');
                    setSelectedTags([]);
                }}
                title={`Add Observation: ${selectedProtocol?.name || selectedProtocol?.protocolName || 'Protocol'}`}
                theme={theme}
                maxWidth="max-w-2xl"
                variant="modern"
            >
                <div className="space-y-4">
                    <TextInput
                        label="Research Note"
                        value={noteContent}
                        onChange={setNoteContent}
                        placeholder="Record observations, progress, side effects, or adjustments..."
                        theme={theme}
                        outlined={true}
                        multiline={true}
                        rows={5}
                        customTextColor={theme.isDark ? null : "#181A18"}
                        customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
                    />

                    <div>
                        <label className="block text-xs font-semibold mb-2" style={{ color: theme.textLight }}>
                            Tags (optional)
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {NOTE_TAGS.map(tag => (
                                <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() => handleTagToggle(tag.id)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                                    style={{
                                        backgroundColor: selectedTags.includes(tag.id)
                                            ? tag.color
                                            : (theme.isDark ? '#374151' : '#f3f4f6'),
                                        color: selectedTags.includes(tag.id)
                                            ? '#ffffff'
                                            : theme.text,
                                        border: `1px solid ${selectedTags.includes(tag.id) ? tag.color : theme.border}`
                                    }}
                                >
                                    {tag.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: theme.border }}>
                        <button
                            onClick={() => {
                                setShowNoteModal(false);
                                setNoteContent('');
                                setSelectedTags([]);
                            }}
                            className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 border"
                            style={{ 
                                borderColor: theme.border,
                                color: theme.text
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSaveNote}
                            disabled={!noteContent.trim() && selectedTags.length === 0}
                            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ 
                                backgroundColor: theme.primary,
                                color: theme.textOnPrimary || '#ffffff',
                                border: 'none',
                                boxShadow: theme?.isDark ? '0 4px 10px rgba(0,0,0,0.35)' : '0 4px 10px rgba(0,0,0,0.15)'
                            }}
                        >
                            Save Note
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}

