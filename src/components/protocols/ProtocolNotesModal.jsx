import React, { useState, useEffect } from 'react';
import BottomSheet from '../common/BottomSheet';
import { FileText, Plus, Edit3, Trash2, Calendar, X } from 'lucide-react';
import { formatMMDDYYYY, getLocalDateString } from '../../utils/date';
import { addNoteToProtocolHistory, updateNoteInProtocolHistory, deleteNoteFromProtocolHistory, findActiveProtocolHistoryEntry } from '../../utils/protocolHistory';
import GlassmorphismDatePicker from '../common/GlassmorphismDatePicker';
import { generateId } from '../../utils/string';

const NOTE_TAGS = [
    { id: 'progress', label: 'Progress Update' },
    { id: 'side_effects', label: 'Side Effects' },
    { id: 'adjustment', label: 'Dosage Adjustment' },
    { id: 'observation', label: 'Observation' },
    { id: 'question', label: 'Question' }
];

function getLinkedResearchNotes(protocolId) {
    try {
        const raw = localStorage.getItem('tpprover_user_notes');
        const all = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(all) || !protocolId) return [];
        return all
            .filter(n => n && n.protocolId === protocolId)
            .map(n => ({
                id: n.id,
                content: [n.title && n.title !== 'Untitled' ? n.title : null, n.content].filter(Boolean).join('\n'),
                createdAt: n.createdAt,
                tags: [],
                _source: 'research'
            }));
    } catch {
        return [];
    }
}

export default function ProtocolNotesModal({ open, onClose, protocol, theme }) {
    const [notes, setNotes] = useState([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingNote, setEditingNote] = useState(null);
    const [newNote, setNewNote] = useState({ 
        content: '', 
        tags: [], 
        linkedDate: getLocalDateString() 
    });
    const [showLinkedDate, setShowLinkedDate] = useState(false);
    const [historyEntryId, setHistoryEntryId] = useState(null);

    useEffect(() => {
        if (open && protocol) {
            loadNotes();
        }
    }, [open, protocol]);

    useEffect(() => {
        if (!open || !protocol?.id) return;
        const onUserNotesUpdated = () => loadNotes();
        window.addEventListener('tpp:user-notes-updated', onUserNotesUpdated);
        return () => window.removeEventListener('tpp:user-notes-updated', onUserNotesUpdated);
    }, [open, protocol?.id]);

    const loadNotes = () => {
        if (!protocol?.id) return;
        
        const activeEntry = findActiveProtocolHistoryEntry(protocol.id);
        const protocolNotes = (activeEntry?.notes || []).map(n => ({ ...n, _source: 'protocol' }));
        const linkedResearch = getLinkedResearchNotes(protocol.id);
        const merged = [...protocolNotes, ...linkedResearch].sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        if (activeEntry) {
            setHistoryEntryId(activeEntry.id);
        } else {
            setHistoryEntryId(null);
        }
        setNotes(merged);
    };

    const handleTagToggle = (tagId, isEditing = false) => {
        if (isEditing && editingNote) {
            setEditingNote({
                ...editingNote,
                tags: editingNote.tags.includes(tagId)
                    ? editingNote.tags.filter(id => id !== tagId)
                    : [...editingNote.tags, tagId]
            });
        } else {
            setNewNote({
                ...newNote,
                tags: newNote.tags.includes(tagId)
                    ? newNote.tags.filter(id => id !== tagId)
                    : [...newNote.tags, tagId]
            });
        }
    };

    const handleAddNote = () => {
        if (!newNote.content.trim() && newNote.tags.length === 0) {
            setShowAddForm(false);
            return;
        }

        if (!historyEntryId) {
            window.dispatchEvent(new CustomEvent('tpp:toast', { 
                detail: { message: 'Protocol must be started to add notes.', type: 'error' } 
            }));
            return;
        }

        const noteData = {
            type: 'during',
            content: newNote.content.trim(),
            tags: newNote.tags,
            linkedDate: showLinkedDate ? newNote.linkedDate : null
        };

        if (addNoteToProtocolHistory(historyEntryId, noteData)) {
            window.dispatchEvent(new CustomEvent('tpp:toast', { 
                detail: { message: 'Note added successfully.', type: 'success' } 
            }));
            window.dispatchEvent(new CustomEvent('tpp:protocol-history-updated'));
            loadNotes();
            setNewNote({ content: '', tags: [], linkedDate: getLocalDateString() });
            setShowLinkedDate(false);
            setShowAddForm(false);
        } else {
            window.dispatchEvent(new CustomEvent('tpp:toast', { 
                detail: { message: 'Failed to add note.', type: 'error' } 
            }));
        }
    };

    const handleEditNote = (note) => {
        setEditingNote({ ...note });
    };

    const handleSaveEdit = () => {
        if (!editingNote || !historyEntryId) return;

        if (!editingNote.content.trim() && editingNote.tags.length === 0) {
            handleDeleteNote(editingNote.id);
            return;
        }

        const updates = {
            content: editingNote.content.trim(),
            tags: editingNote.tags,
            linkedDate: editingNote.showLinkedDate ? editingNote.linkedDate : null
        };

        if (updateNoteInProtocolHistory(historyEntryId, editingNote.id, updates)) {
            window.dispatchEvent(new CustomEvent('tpp:toast', { 
                detail: { message: 'Note updated successfully.', type: 'success' } 
            }));
            window.dispatchEvent(new CustomEvent('tpp:protocol-history-updated'));
            loadNotes();
            setEditingNote(null);
        } else {
            window.dispatchEvent(new CustomEvent('tpp:toast', { 
                detail: { message: 'Failed to update note.', type: 'error' } 
            }));
        }
    };

    const handleDeleteNote = (noteId) => {
        if (!historyEntryId) return;

        if (window.confirm('Are you sure you want to delete this note?')) {
            if (deleteNoteFromProtocolHistory(historyEntryId, noteId)) {
                window.dispatchEvent(new CustomEvent('tpp:toast', { 
                    detail: { message: 'Note deleted successfully.', type: 'success' } 
                }));
                window.dispatchEvent(new CustomEvent('tpp:protocol-history-updated'));
                loadNotes();
                if (editingNote?.id === noteId) {
                    setEditingNote(null);
                }
            } else {
                window.dispatchEvent(new CustomEvent('tpp:toast', { 
                    detail: { message: 'Failed to delete note.', type: 'error' } 
                }));
            }
        }
    };

    const handleClose = () => {
        setShowAddForm(false);
        setEditingNote(null);
        setNewNote({ content: '', tags: [], linkedDate: getLocalDateString() });
        setShowLinkedDate(false);
        onClose();
    };

    if (!open || !protocol) return null;

    return (
        <BottomSheet
            open={open}
            onClose={handleClose}
            title={`Protocol Notes: ${protocol.protocolName || 'Unnamed Protocol'}`}
            theme={theme}
            maxHeight="90vh"
        >
            <div className="space-y-4">
                {/* Add Note Button */}
                {!showAddForm && !editingNote && (
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="w-full p-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                        style={{ 
                            backgroundColor: theme.primary, 
                            color: theme.textOnPrimary 
                        }}
                    >
                        <Plus size={18} />
                        Add Note
                    </button>
                )}

                {/* Add Note Form */}
                {showAddForm && (
                    <div className="p-4 rounded-lg space-y-4" style={{
                        backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : theme.cardBackground,
                        border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`
                    }}>
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold" style={{ color: theme.text }}>New Note</h3>
                            <button
                                onClick={() => {
                                    setShowAddForm(false);
                                    setNewNote({ content: '', tags: [], linkedDate: getLocalDateString() });
                                    setShowLinkedDate(false);
                                }}
                                className="p-1 rounded hover:bg-opacity-20"
                                style={{ color: theme.textLight }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <textarea
                            value={newNote.content}
                            onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                            placeholder="Add your note here..."
                            className="w-full p-3 rounded-lg text-sm resize-none"
                            rows={4}
                            style={{
                                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
                                border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                                color: theme.text
                            }}
                        />

                        <div>
                            <label className="block text-xs font-semibold mb-2" style={{ color: theme.textLight }}>
                                Tags
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {NOTE_TAGS.map(tag => (
                                    <button
                                        key={tag.id}
                                        type="button"
                                        onClick={() => handleTagToggle(tag.id)}
                                        className="px-2 py-1 rounded text-xs font-medium transition-all"
                                        style={{
                                            backgroundColor: newNote.tags.includes(tag.id)
                                                ? theme.primary
                                                : (theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)'),
                                            color: newNote.tags.includes(tag.id)
                                                ? theme.textOnPrimary
                                                : theme.text,
                                            border: `1px solid ${newNote.tags.includes(tag.id) ? theme.primary : theme.border}`
                                        }}
                                    >
                                        {tag.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="flex items-center gap-2 text-xs font-semibold mb-2" style={{ color: theme.text }}>
                                <input
                                    type="checkbox"
                                    checked={showLinkedDate}
                                    onChange={(e) => setShowLinkedDate(e.target.checked)}
                                    className="rounded"
                                    style={{ accentColor: theme.primary }}
                                />
                                <Calendar size={14} />
                                <span>Show in calendar</span>
                            </label>
                            {showLinkedDate && (
                                <div className="mt-2">
                                    <GlassmorphismDatePicker
                                        value={newNote.linkedDate}
                                        onChange={(date) => setNewNote({ ...newNote, linkedDate: date })}
                                        theme={theme}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => {
                                    setShowAddForm(false);
                                    setNewNote({ content: '', tags: [], linkedDate: getLocalDateString() });
                                    setShowLinkedDate(false);
                                }}
                                className="px-3 py-1.5 rounded-lg text-sm font-medium"
                                style={{ 
                                    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
                                    color: theme.text
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddNote}
                                className="px-3 py-1.5 rounded-lg text-sm font-medium"
                                style={{ 
                                    backgroundColor: theme.primary, 
                                    color: theme.textOnPrimary 
                                }}
                            >
                                Save Note
                            </button>
                        </div>
                    </div>
                )}

                {/* Edit Note Form */}
                {editingNote && (
                    <div className="p-4 rounded-lg space-y-4" style={{
                        backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : theme.cardBackground,
                        border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`
                    }}>
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold" style={{ color: theme.text }}>Edit Note</h3>
                            <button
                                onClick={() => setEditingNote(null)}
                                className="p-1 rounded hover:bg-opacity-20"
                                style={{ color: theme.textLight }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <textarea
                            value={editingNote.content || ''}
                            onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                            placeholder="Add your note here..."
                            className="w-full p-3 rounded-lg text-sm resize-none"
                            rows={4}
                            style={{
                                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
                                border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                                color: theme.text
                            }}
                        />

                        <div>
                            <label className="block text-xs font-semibold mb-2" style={{ color: theme.textLight }}>
                                Tags
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {NOTE_TAGS.map(tag => (
                                    <button
                                        key={tag.id}
                                        type="button"
                                        onClick={() => handleTagToggle(tag.id, true)}
                                        className="px-2 py-1 rounded text-xs font-medium transition-all"
                                        style={{
                                            backgroundColor: editingNote.tags?.includes(tag.id)
                                                ? theme.primary
                                                : (theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)'),
                                            color: editingNote.tags?.includes(tag.id)
                                                ? theme.textOnPrimary
                                                : theme.text,
                                            border: `1px solid ${editingNote.tags?.includes(tag.id) ? theme.primary : theme.border}`
                                        }}
                                    >
                                        {tag.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="flex items-center gap-2 text-xs font-semibold mb-2" style={{ color: theme.text }}>
                                <input
                                    type="checkbox"
                                    checked={editingNote.showLinkedDate || false}
                                    onChange={(e) => setEditingNote({ 
                                        ...editingNote, 
                                        showLinkedDate: e.target.checked 
                                    })}
                                    className="rounded"
                                    style={{ accentColor: theme.primary }}
                                />
                                <Calendar size={14} />
                                <span>Show in calendar</span>
                            </label>
                            {editingNote.showLinkedDate && (
                                <div className="mt-2">
                                    <GlassmorphismDatePicker
                                        value={editingNote.linkedDate || getLocalDateString()}
                                        onChange={(date) => setEditingNote({ ...editingNote, linkedDate: date })}
                                        theme={theme}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setEditingNote(null)}
                                className="px-3 py-1.5 rounded-lg text-sm font-medium"
                                style={{ 
                                    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
                                    color: theme.text
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                className="px-3 py-1.5 rounded-lg text-sm font-medium"
                                style={{ 
                                    backgroundColor: theme.primary, 
                                    color: theme.textOnPrimary 
                                }}
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                )}

                {/* Notes List */}
                {!showAddForm && !editingNote && (
                    <div className="space-y-3">
                        {notes.length === 0 ? (
                            <div className="text-center py-8" style={{ color: theme.textLight }}>
                                <FileText size={48} className="mx-auto mb-3 opacity-50" />
                                <p>No notes yet. Add your first note to track progress!</p>
                            </div>
                        ) : (
                            notes.map((note) => {
                                const isResearchNote = note._source === 'research';
                                return (
                                    <div
                                        key={note.id}
                                        className="p-4 rounded-lg"
                                        style={{
                                            backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : theme.cardBackground,
                                            border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`
                                        }}
                                    >
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <div className="flex-1">
                                                <div className="text-xs mb-1 flex items-center gap-2 flex-wrap" style={{ color: theme.textLight }}>
                                                    <span>{formatMMDDYYYY(note.createdAt)}</span>
                                                    {isResearchNote && (
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: theme.primary + '25', color: theme.primary }}>
                                                            From Research Notes
                                                        </span>
                                                    )}
                                                </div>
                                                {note.content && (
                                                    <p className="text-sm mt-2 whitespace-pre-wrap" style={{ color: theme.text }}>
                                                        {note.content}
                                                    </p>
                                                )}
                                                {!isResearchNote && note.tags && note.tags.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                                        {note.tags.map(tagId => {
                                                            const tag = NOTE_TAGS.find(t => t.id === tagId);
                                                            return tag ? (
                                                                <span
                                                                    key={tagId}
                                                                    className="px-2 py-0.5 rounded text-xs font-medium"
                                                                    style={{
                                                                        backgroundColor: theme.primary + '20',
                                                                        color: theme.primary
                                                                    }}
                                                                >
                                                                    {tag.label}
                                                                </span>
                                                            ) : null;
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                            {!isResearchNote && (
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => handleEditNote({ ...note, showLinkedDate: !!note.linkedDate })}
                                                        className="p-1.5 rounded hover:bg-opacity-20 transition-all"
                                                        style={{ color: theme.textLight }}
                                                        title="Edit note"
                                                    >
                                                        <Edit3 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteNote(note.id)}
                                                        className="p-1.5 rounded hover:bg-opacity-20 transition-all"
                                                        style={{ color: theme.textLight }}
                                                        title="Delete note"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>

            {/* Footer */}
            {!showAddForm && !editingNote && (
                <div className="flex justify-end pt-4 mt-4" style={{
                    borderTop: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : theme.border}`
                }}>
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 rounded-lg font-medium"
                        style={{ 
                            backgroundColor: theme.primary, 
                            color: theme.textOnPrimary 
                        }}
                    >
                        Close
                    </button>
                </div>
            )}
        </BottomSheet>
    );
}



