import React, { useState, useEffect } from 'react';
import { FileText, Plus, Trash2, Eye, Save, X, Clock, Check } from 'lucide-react';
import NotesModal from '../../notes/NotesModal';
import useAutoSave from '../../../utils/useAutoSave';

const NotesWidget = ({ widget, theme }) => {
  const [userNotes, setUserNotes] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [newNote, setNewNote] = useState({ title: '', content: '' });
  
  // Auto-save functionality for the note form
  const { saveStatus, triggerSave } = useAutoSave(
    newNote,
    (data) => {
      // Only auto-save if there's actual content
      if (data.title.trim() || data.content.trim()) {
        localStorage.setItem('tpprover_note_draft', JSON.stringify(data));
      }
    },
    800 // 800ms delay
  );

  useEffect(() => {
    loadNotes();
    loadDraft();
  }, []);

  const loadDraft = () => {
    try {
      const savedDraft = localStorage.getItem('tpprover_note_draft');
      if (savedDraft) {
        setNewNote(JSON.parse(savedDraft));
      }
    } catch (error) {
      console.error('Failed to load note draft:', error);
    }
  };

  const clearDraft = () => {
    localStorage.removeItem('tpprover_note_draft');
  };

  const loadNotes = () => {
    try {
      const savedNotes = localStorage.getItem('tpprover_user_notes');
      if (savedNotes) {
        setUserNotes(JSON.parse(savedNotes));
      }
    } catch (error) {
      console.error('Failed to load user notes from localStorage:', error);
    }
  };

  const saveNotes = (notes) => {
    try {
      localStorage.setItem('tpprover_user_notes', JSON.stringify(notes));
      setUserNotes(notes);
    } catch (error) {
      console.error('Failed to save notes:', error);
    }
  };

  const handleAddNote = () => {
    if (newNote.title.trim() || newNote.content.trim()) {
      const note = {
        id: Date.now().toString(),
        title: newNote.title.trim() || 'Quick Note',
        content: newNote.content.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const updatedNotes = [note, ...userNotes];
      saveNotes(updatedNotes);
      setNewNote({ title: '', content: '' });
      clearDraft();
      setShowAddForm(false);
    }
  };

  const handleDeleteNote = (e, id) => {
    e.stopPropagation();
    const updatedNotes = userNotes.filter(n => n.id !== id);
    saveNotes(updatedNotes);
  };

  const handleCancelAdd = () => {
    setNewNote({ title: '', content: '' });
    setShowAddForm(false);
  };

  const handleViewAll = () => {
    setShowNotesModal(true);
  };

  const handleModalClose = () => {
    setShowNotesModal(false);
    loadNotes(); // Refresh notes when modal closes
  };

  const recentNotes = userNotes.slice(0, 3); // Show up to 3 recent notes to make room for add form

  return (
    <div className="h-full flex flex-col">
      {/* Consistent Header */}
      <div className="px-4 py-3 border-b" style={{ borderColor: theme.border }}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold" style={{ color: theme.text }}>
            Research Notes
          </h3>
          <FileText size={20} style={{ color: theme.primary }} />
        </div>
      </div>
      
      <div className="flex-1 p-3 flex flex-col overflow-hidden">
        {/* Content Area - grows to fill available space */}
        <div className="flex-1 space-y-3 min-h-0">
          {/* Recent Notes List - Matching Modal Style */}
          {recentNotes.length > 0 ? (
            <div className="flex-1 overflow-y-auto space-y-3">
              {recentNotes.map((note) => (
                <div key={note.id} className="group p-3 rounded-lg border hover:shadow-md transition-all duration-200" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                  <div className="flex items-start justify-between mb-2">
                    {note.title && note.title !== 'Untitled' && note.title !== 'Quick Note' && (
                      <h4 className="font-semibold text-sm line-clamp-1" style={{ color: theme.text }}>
                        {note.title}
                      </h4>
                    )}
                    <button
                      onClick={(e) => handleDeleteNote(e, note.id)}
                      className="p-1 rounded hover:bg-red-50 hover:text-red-600 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                      style={{ color: theme.textLight }}
                      title="Delete note"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <p className="text-sm mb-2 whitespace-pre-wrap line-clamp-3" style={{ color: theme.text }}>
                    {note.content}
                  </p>
                  <div className="text-xs" style={{ color: theme.textLight }}>
                    {new Date(note.createdAt).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center">
              <div>
                <FileText size={32} className="mx-auto mb-3 opacity-50" style={{ color: theme.textLight }} />
                <p className="text-sm" style={{ color: theme.textLight }}>
                  No notes yet
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Add Note Form - appears when showAddForm is true */}
        {showAddForm && (
          <div className="pt-3 border-t space-y-2" style={{ borderColor: theme.border }}>
            <input
              type="text"
              placeholder="Note title (optional)"
              value={newNote.title}
              onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
              className="w-full px-2 py-1 text-sm border rounded"
              style={{ 
                borderColor: theme.border, 
                backgroundColor: theme.background,
                color: theme.text
              }}
            />
            <textarea
              placeholder="Write your note..."
              value={newNote.content}
              onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
              className="w-full px-2 py-1 text-sm border rounded resize-none"
              rows="3"
              style={{ 
                borderColor: theme.border, 
                backgroundColor: theme.background,
                color: theme.text
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddNote}
                className="flex-1 px-2 py-1 rounded text-sm font-medium transition-colors flex items-center justify-center gap-1"
                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
              >
                <Save size={14} />
                Save
              </button>
              <button
                onClick={handleCancelAdd}
                className="px-2 py-1 rounded text-sm font-medium transition-colors"
                style={{ backgroundColor: theme.secondary, color: theme.text }}
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Bottom Action Buttons */}
        {!showAddForm && (
          <div className="pt-3 border-t space-y-2" style={{ borderColor: theme.border }}>
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
            >
              <Plus size={16} />
              Add Note
            </button>
            
            {userNotes.length > 0 && (
              <button
                onClick={handleViewAll}
                className="w-full px-2 py-1 rounded text-xs font-medium transition-colors opacity-75 hover:opacity-100"
                style={{ color: theme.textLight }}
              >
                <Eye size={12} className="inline mr-1" />
                View All ({userNotes.length})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Notes Modal */}
      {showNotesModal && (
        <NotesModal 
          isOpen={showNotesModal}
          onClose={handleModalClose}
          theme={theme}
        />
      )}
    </div>
  );
};

export default NotesWidget;