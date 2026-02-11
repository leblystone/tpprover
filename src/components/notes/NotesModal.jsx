import React, { useState, useEffect } from 'react';
import { FileText, Plus, Edit3, Trash2, X, Save } from 'lucide-react';
import Modal from '../common/Modal';
import { generateId } from '../../utils/string';
import { prepareItemForSave } from '../../utils/userDataSave';
import { recordDeletion } from '../../utils/deletionTracking';

const NotesModal = ({ isOpen, onClose, theme }) => {
  const [userNotes, setUserNotes] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [newNote, setNewNote] = useState({ title: '', content: '' });

  useEffect(() => {
    if (isOpen) {
      loadNotes();
    }
  }, [isOpen]);

  const loadNotes = () => {
    try {
      const savedNotes = localStorage.getItem('tpprover_user_notes');
      if (savedNotes) {
        setUserNotes(JSON.parse(savedNotes));
      }
    } catch (error) {
      console.error('Failed to load user notes:', error);
    }
  };

  const saveNotes = (notes) => {
    try {
      localStorage.setItem('tpprover_user_notes', JSON.stringify(notes));
      setUserNotes(notes);
      window.dispatchEvent(new CustomEvent('tpp:user-notes-updated', { detail: { notes } }));
    } catch (error) {
      console.error('Failed to save notes:', error);
    }
  };

  const handleAddNote = () => {
    if (newNote.title.trim() || newNote.content.trim()) {
      const note = prepareItemForSave(
        {
          title: newNote.title.trim() || 'Untitled',
          content: newNote.content.trim(),
          createdAt: new Date().toISOString()
        },
        { isNew: true }
      );

      const updatedNotes = [note, ...userNotes];
      saveNotes(updatedNotes);
      setNewNote({ title: '', content: '' });
      setShowAddForm(false);
    }
  };

  const handleEditNote = (note) => {
    setEditingNote({ ...note });
  };

  const handleSaveEdit = () => {
    if (editingNote.title.trim() || editingNote.content.trim()) {
      const updatedNotes = userNotes.map(note =>
        note.id === editingNote.id
          ? prepareItemForSave({ ...editingNote })
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
    setNewNote({ title: '', content: '' });
    setShowAddForm(false);
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Research Notes"
      theme={theme}
      maxWidth="2xl"
    >
      <div className="p-6 max-h-96 overflow-y-auto">
        {/* Add New Note Section */}
        <div className="mb-6">
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full p-4 border-2 border-dashed rounded-lg hover:border-solid transition-all duration-200 group"
              style={{ borderColor: theme.border }}
            >
              <div className="flex items-center justify-center gap-2" style={{ color: theme.textLight }}>
                <Plus size={20} className="group-hover:scale-110 transition-transform" />
                <span className="text-base font-medium">Add new note</span>
              </div>
            </button>
          ) : (
            <div className="p-4 border-2 rounded-lg" style={{ borderColor: theme.primary, backgroundColor: theme.cardBackground }}>
              <div className="space-y-3">
                <input
                  type="text"
                  value={newNote.title}
                  onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                  placeholder="Note title (optional)"
                  className="w-full text-lg font-medium bg-transparent border-none focus:outline-none"
                  style={{ color: theme.text }}
                  autoFocus
                />
                <textarea
                  value={newNote.content}
                  onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                  placeholder="What's on your mind?"
                  rows={4}
                  className="w-full text-base bg-transparent border-none focus:outline-none resize-none"
                  style={{ color: theme.text }}
                />
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={handleAddNote}
                    className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                    style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                  >
                    <Save size={16} />
                    Save Note
                  </button>
                  <button
                    onClick={handleCancelAdd}
                    className="px-4 py-2 rounded-lg text-sm border"
                    style={{ color: theme.text, borderColor: theme.border }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Notes List */}
        {userNotes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userNotes.map((note) => (
              <div key={note.id} className="group">
                {editingNote && editingNote.id === note.id ? (
                  <div className="p-4 border-2 rounded-lg" style={{ borderColor: theme.primary, backgroundColor: theme.cardBackground }}>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editingNote.title}
                        onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
                        className="w-full text-lg font-medium bg-transparent border-none focus:outline-none"
                        style={{ color: theme.text }}
                      />
                      <textarea
                        value={editingNote.content}
                        onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                        rows={4}
                        className="w-full text-base bg-transparent border-none focus:outline-none resize-none"
                        style={{ color: theme.text }}
                      />
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          onClick={handleSaveEdit}
                          className="px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1"
                          style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                        >
                          <Save size={14} />
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1.5 rounded text-sm border"
                          style={{ color: theme.text, borderColor: theme.border }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg border hover:shadow-md transition-all duration-200" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                    <div className="flex items-start justify-between mb-2">
                      {note.title && note.title !== 'Untitled' && (
                        <h3 className="text-lg font-semibold line-clamp-1" style={{ color: theme.text }}>
                          {note.title}
                        </h3>
                      )}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEditNote(note)}
                          className="p-1.5 rounded hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          style={{ color: theme.textLight }}
                          title="Edit note"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="p-1.5 rounded hover:bg-red-50 hover:text-red-600 transition-colors"
                          style={{ color: theme.textLight }}
                          title="Delete note"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <p className="text-base mb-3 whitespace-pre-wrap" style={{ color: theme.text }}>
                      {note.content}
                    </p>
                    <div className="text-sm" style={{ color: theme.textLight }}>
                      <div>Created: {new Date(note.createdAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</div>
                      {note.updatedAt !== note.createdAt && (
                        <div>Updated: {new Date(note.updatedAt).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText size={48} className="mx-auto mb-4 opacity-50" style={{ color: theme.textLight }} />
            <h3 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>
              No notes yet
            </h3>
            <p className="text-base" style={{ color: theme.textLight }}>
              Start by adding your first research note above
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default NotesModal;
