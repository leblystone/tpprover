import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Plus, Edit3, Trash2 } from 'lucide-react';
import BottomSheet from '../common/BottomSheet';
import TextInput from '../common/inputs/TextInput';
import { prepareItemForSave } from '../../utils/userDataSave';
import { recordDeletion } from '../../utils/deletionTracking';

function getActiveProtocols(protocols = []) {
  if (!Array.isArray(protocols) || protocols.length === 0) return [];
  const today = new Date();
  return protocols.filter(p => {
    if (p?.active !== true) return false;
    if (!p?.startDate) return false;
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
}

const NotesModal = ({ isOpen, onClose, theme, notes: notesProp, onNotesChange, protocols = [], initialShowAddForm = false, openedForAddOnly = false }) => {
  const [userNotes, setUserNotes] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [newNote, setNewNote] = useState({ title: '', content: '', protocolId: '', protocolName: '' });

  const activeProtocols = useMemo(() => getActiveProtocols(protocols), [protocols]);

  useEffect(() => {
    if (isOpen) {
      loadNotes();
      setShowAddForm(!!initialShowAddForm);
    }
  }, [isOpen, initialShowAddForm]);

  const loadNotes = () => {
    try {
      if (Array.isArray(notesProp)) {
        setUserNotes(notesProp);
        return;
      }
      const raw = localStorage.getItem('tpprover_user_notes');
      const parsed = raw ? JSON.parse(raw) : [];
      setUserNotes(Array.isArray(parsed) ? parsed : []);
    } catch (error) {
      console.error('Failed to load user notes:', error);
      setUserNotes([]);
    }
  };

  useEffect(() => {
    if (isOpen && notesProp != null && Array.isArray(notesProp)) {
      setUserNotes(notesProp);
    }
  }, [isOpen, notesProp]);

  useEffect(() => {
    const reload = () => { loadNotes(); };
    window.addEventListener('tpp:cloud-data-loaded', reload);
    return () => window.removeEventListener('tpp:cloud-data-loaded', reload);
  }, []);

  const saveNotes = (notes) => {
    try {
      localStorage.setItem('tpprover_user_notes', JSON.stringify(notes));
      setUserNotes(notes);
      onNotesChange?.(notes);
      window.dispatchEvent(new CustomEvent('tpp:user-notes-updated', { detail: { notes } }));
    } catch (error) {
      console.error('Failed to save notes:', error);
    }
  };

  const handleAddNote = () => {
    if (newNote.title.trim() || newNote.content.trim()) {
      const protocol = activeProtocols.find(p => p.id === newNote.protocolId);
      const note = prepareItemForSave(
        {
          title: newNote.title.trim() || 'Untitled',
          content: newNote.content.trim(),
          protocolId: newNote.protocolId || undefined,
          protocolName: (protocol && protocol.protocolName) || newNote.protocolName || undefined,
          createdAt: new Date().toISOString()
        },
        { isNew: true }
      );
      const updatedNotes = [note, ...userNotes];
      saveNotes(updatedNotes);
      setNewNote({ title: '', content: '', protocolId: '', protocolName: '' });
      setShowAddForm(false);
    }
  };

  const handleEditNote = (note) => {
    setEditingNote({
      ...note,
      protocolId: note.protocolId || '',
      protocolName: note.protocolName || ''
    });
  };

  const handleSaveEdit = () => {
    if (editingNote && (editingNote.title.trim() || editingNote.content.trim())) {
      const protocol = activeProtocols.find(p => p.id === editingNote.protocolId);
      const updatedNotes = userNotes.map(note =>
        note.id === editingNote.id
          ? prepareItemForSave({
              ...editingNote,
              protocolId: editingNote.protocolId || undefined,
              protocolName: (protocol && protocol.protocolName) || editingNote.protocolName || undefined
            })
          : note
      );
      saveNotes(updatedNotes);
      setEditingNote(null);
    }
  };

  const handleDeleteNote = (id) => {
    const noteToDelete = userNotes.find(note => note.id === id);
    if (noteToDelete) {
      recordDeletion('userNotes', id, noteToDelete);
    }
    const updatedNotes = userNotes.filter(note => note.id !== id);
    saveNotes(updatedNotes);
  };

  const handleCancelEdit = () => {
    setEditingNote(null);
  };

  const handleCancelAdd = () => {
    setNewNote({ title: '', content: '', protocolId: '', protocolName: '' });
    setShowAddForm(false);
    if (openedForAddOnly) onClose();
  };

  const renderProtocolSelect = (value, onChange, label = 'Assign to protocol') => (
    <div className="space-y-1">
      <label className="text-xs font-medium" style={{ color: theme.textLight }}>{label}</label>
      <select
        value={value || ''}
        onChange={(e) => {
          const id = e.target.value || '';
          const protocol = activeProtocols.find(p => p.id === id);
          onChange(id, (protocol && protocol.protocolName) || '');
        }}
        className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2"
        style={{
          borderColor: theme.border,
          backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : (theme.inputBackground || theme.cardBackground || '#fff'),
          color: theme.text
        }}
      >
        <option value="">None</option>
        {activeProtocols.map(p => (
          <option key={p.id} value={p.id}>{p.protocolName || p.name || 'Unnamed Protocol'}</option>
        ))}
      </select>
    </div>
  );

  const addFormContent = (
    <div className="space-y-4">
      <div className="flex items-center gap-4 mb-4">
        <FileText size={32} style={{ color: theme.primary }} />
        <div className="flex flex-col gap-0.5 flex-1">
          <h4 className="text-lg font-semibold tracking-wide" style={{ color: theme.text }}>Research Note</h4>
          <div className="flex items-center gap-2 ml-1">
            <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }} />
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
              Note Details
            </span>
          </div>
        </div>
      </div>
      <TextInput
        label="Title (optional)"
        value={newNote.title}
        onChange={v => setNewNote(prev => ({ ...prev, title: v }))}
        placeholder="Note title"
        theme={theme}
        outlined={true}
        customTextColor={theme.isDark ? null : '#181A18'}
        customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
      />
      <TextInput
        label="Content"
        value={newNote.content}
        onChange={v => setNewNote(prev => ({ ...prev, content: v }))}
        placeholder="What's on your mind?"
        theme={theme}
        outlined={true}
        multiline={true}
        rows={4}
        customTextColor={theme.isDark ? null : '#181A18'}
        customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
      />
      {activeProtocols.length > 0 && renderProtocolSelect(
        newNote.protocolId,
        (id, name) => setNewNote(prev => ({ ...prev, protocolId: id, protocolName: name }))
      )}
    </div>
  );

  const editFormContent = editingNote && (
    <div className="space-y-4">
      <div className="flex items-center gap-4 mb-4">
        <FileText size={32} style={{ color: theme.primary }} />
        <div className="flex flex-col gap-0.5 flex-1">
          <h4 className="text-lg font-semibold tracking-wide" style={{ color: theme.text }}>Edit Note</h4>
          <div className="flex items-center gap-2 ml-1">
            <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }} />
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
              Note Details
            </span>
          </div>
        </div>
      </div>
      <TextInput
        label="Title (optional)"
        value={editingNote.title}
        onChange={v => setEditingNote(prev => ({ ...prev, title: v }))}
        placeholder="Note title"
        theme={theme}
        outlined={true}
        customTextColor={theme.isDark ? null : '#181A18'}
        customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
      />
      <TextInput
        label="Content"
        value={editingNote.content}
        onChange={v => setEditingNote(prev => ({ ...prev, content: v }))}
        placeholder="What's on your mind?"
        theme={theme}
        outlined={true}
        multiline={true}
        rows={4}
        customTextColor={theme.isDark ? null : '#181A18'}
        customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
      />
      {activeProtocols.length > 0 && renderProtocolSelect(
        editingNote.protocolId,
        (id, name) => setEditingNote(prev => ({ ...prev, protocolId: id, protocolName: name }))
      )}
    </div>
  );

  const headerAddButton = (
    <button
      type="button"
      onClick={() => setShowAddForm(true)}
      className="rounded-full flex items-center justify-center transition-colors touch-manipulation hover:opacity-90"
      style={{
        color: '#ffffff',
        backgroundColor: theme.primary,
        width: 28,
        height: 28,
        padding: 0,
        border: 'none',
        boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.15)',
        WebkitTapHighlightColor: 'transparent'
      }}
      aria-label="Add note"
    >
      <Plus size={14} strokeWidth={3.5} style={{ color: '#ffffff' }} />
    </button>
  );

  return (
    <BottomSheet
      open={isOpen}
      onClose={onClose}
      onBack={showAddForm ? handleCancelAdd : undefined}
      title="Research Notes"
      titleExtra={!showAddForm && !editingNote ? headerAddButton : undefined}
      theme={theme}
      maxHeight="90vh"
      footer={
        showAddForm ? (
          <div className="flex items-center gap-2 w-full">
            <button
              type="button"
              onClick={handleCancelAdd}
              className="px-3 py-2 rounded-md border flex-1"
              style={{ borderColor: theme.border, color: theme.text }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddNote}
              disabled={!newNote.title?.trim() && !newNote.content?.trim()}
              className="px-4 py-2.5 rounded-md flex-1 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: theme.primary, color: theme.textOnPrimary || '#ffffff' }}
            >
              Save Note
            </button>
          </div>
        ) : editingNote ? (
          <div className="flex items-center gap-2 w-full">
            <button
              type="button"
              onClick={handleCancelEdit}
              className="px-3 py-2 rounded-md border flex-1"
              style={{ borderColor: theme.border, color: theme.text }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={!editingNote.title?.trim() && !editingNote.content?.trim()}
              className="px-4 py-2.5 rounded-md flex-1 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: theme.primary, color: theme.textOnPrimary || '#ffffff' }}
            >
              Save
            </button>
          </div>
        ) : null
      }
    >
      <div className="p-4 pb-6 space-y-6 overflow-y-auto max-h-[70vh]">
        {showAddForm ? (
          addFormContent
        ) : (
          <>
            {/* Notes List */}
            {userNotes.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {userNotes.map((note) => (
              <div key={note.id} className="group">
                {editingNote && editingNote.id === note.id ? (
                  <div className="p-4 border-2 rounded-lg" style={{ borderColor: theme.primary, backgroundColor: theme.cardBackground }}>
                    {editFormContent}
                  </div>
                ) : (
                  <div className="p-4 rounded-lg border hover:shadow-md transition-all duration-200" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0 flex-1">
                        {note.title && note.title !== 'Untitled' && (
                          <h3 className="text-base font-semibold line-clamp-1" style={{ color: theme.text }}>
                            {note.title}
                          </h3>
                        )}
                        {note.protocolName && (
                          <p className="text-xs mt-0.5" style={{ color: theme.primary }}>
                            {note.protocolName}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditNote(note)}
                          className="p-1.5 rounded transition-colors"
                          style={{ color: theme.textLight }}
                          title="Edit note"
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'; e.currentTarget.style.color = theme.primary; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = theme.textLight; }}
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(note.id)}
                          className="p-1.5 rounded transition-colors"
                          style={{ color: theme.textLight }}
                          title="Delete note"
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(220,38,38,0.15)' : 'rgba(220,38,38,0.08)'; e.currentTarget.style.color = theme.error || '#dc2626'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = theme.textLight; }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm mb-3 whitespace-pre-wrap line-clamp-4" style={{ color: theme.text }}>
                      {note.content}
                    </p>
                    <div className="text-xs" style={{ color: theme.textLight }}>
                      {new Date(note.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                      {note.updatedAt && note.updatedAt !== note.createdAt && (
                        <> · Updated {new Date(note.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-center px-2" style={{ color: theme.textLight }}>
              No notes yet
            </p>
            <p className="text-xs mt-1" style={{ color: theme.textLight, opacity: 0.8 }}>
              Tap Add above to create a note and optionally assign it to an active protocol
            </p>
          </div>
        )}
          </>
        )}
      </div>
    </BottomSheet>
  );
};

export default NotesModal;
