import React, { useState, useEffect } from 'react';
import { FileText, Plus, Trash2, Eye, Save, X } from 'lucide-react';
import NotesModal from '../../notes/NotesModal';

const NotesWidget = ({ widget, theme }) => {
  const [userNotes, setUserNotes] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [newNote, setNewNote] = useState({ title: '', content: '' });

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = () => {
    try {
      const savedNotes = localStorage.getItem('tpprover_user_notes');
      if (savedNotes) {
        setUserNotes(JSON.parse(savedNotes));
      }
    } catch (error) {
      console.error('Failed to load notes:', error);
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
    if (!newNote.content.trim()) return;

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
    setShowAddForm(false);
  };

  const handleDeleteNote = (e, noteId) => {
    e.stopPropagation();
    const updatedNotes = userNotes.filter(note => note.id !== noteId);
    saveNotes(updatedNotes);
  };

  const handleViewAll = () => {
    setShowNotesModal(true);
  };

  const handleCancel = () => {
    setNewNote({ title: '', content: '' });
    setShowAddForm(false);
  };

  // Show only the last 2 notes
  const recentNotes = userNotes.slice(0, 2);

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b" style={{ borderColor: theme.border }}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold" style={{ color: theme.text }}>
            Research Notes
          </h3>
          <FileText size={20} style={{ color: theme.primary }} />
        </div>
      </div>
      
      <div className="flex-1 p-4 flex flex-col min-h-0">
        {showAddForm ? (
          /* Add Note Form */
          <div className="space-y-3">
            <textarea
              placeholder="Write your note..."
              value={newNote.content}
              onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
              className="w-full px-3 py-2 text-sm border rounded-lg resize-none"
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
                disabled={!newNote.content.trim()}
                className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
              >
                <Save size={14} />
                Save
              </button>
              <button
                onClick={handleCancel}
                className="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ backgroundColor: theme.secondary, color: theme.text }}
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ) : (
          /* Notes List or Empty State */
          <div className="flex-1 flex flex-col min-h-0">
            {recentNotes.length > 0 ? (
              <>
                <div className="flex-1 space-y-2 mb-3 overflow-y-auto min-h-0">
                  {recentNotes.map((note) => (
                    <div 
                      key={note.id} 
                      className="group p-2 rounded-lg border hover:shadow-sm transition-all duration-200 cursor-pointer" 
                      style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}
                      onClick={() => setShowNotesModal(true)}
                    >
                      <div className="flex items-start justify-between mb-1">
                        {note.title && note.title !== 'Quick Note' && (
                          <h4 className="font-medium text-xs line-clamp-1" style={{ color: theme.text }}>
                            {note.title}
                          </h4>
                        )}
                        <button
                          onClick={(e) => handleDeleteNote(e, note.id)}
                          className="p-1 rounded hover:bg-red-50 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                          style={{ color: theme.textLight }}
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                      <p className="text-xs mb-1 line-clamp-2" style={{ color: theme.text }}>
                        {note.content}
                      </p>
                      <div className="text-xs" style={{ color: theme.textLight }}>
                        {new Date(note.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* View More Button */}
                {userNotes.length > 2 && (
                  <button
                    onClick={handleViewAll}
                    className="w-full py-1.5 px-2 rounded-lg text-xs font-medium transition-colors mb-2 opacity-75 hover:opacity-100"
                    style={{ color: theme.textLight, backgroundColor: theme.secondary + '20' }}
                  >
                    <Eye size={12} className="inline mr-1" />
                    View More ({userNotes.length - 2} more)
                  </button>
                )}
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <FileText size={32} className="mb-3 opacity-50" style={{ color: theme.textLight }} />
                <p className="text-sm mb-4" style={{ color: theme.textLight }}>
                  No research notes yet
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 flex-shrink-0">
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full py-1.5 px-2 rounded-lg border-2 border-dashed transition-colors hover:bg-gray-50 flex items-center justify-center gap-1"
                style={{ borderColor: theme.border, color: theme.textLight }}
              >
                <Plus size={12} />
                <span className="text-xs">Add Note</span>
              </button>
              
              {userNotes.length > 0 && userNotes.length <= 2 && (
                <button
                  onClick={handleViewAll}
                  className="w-full px-3 py-1 rounded text-xs font-medium transition-colors opacity-75 hover:opacity-100"
                  style={{ color: theme.textLight }}
                >
                  <Eye size={12} className="inline mr-1" />
                  View All ({userNotes.length})
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Notes Modal */}
      <NotesModal 
        isOpen={showNotesModal}
        onClose={() => setShowNotesModal(false)}
        theme={theme}
        notes={userNotes}
        onNotesChange={saveNotes}
      />
    </div>
  );
};

export default NotesWidget;