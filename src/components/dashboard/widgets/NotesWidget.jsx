import React, { useState, useEffect } from 'react';
import { FileText, Plus, Edit3, Trash2, Eye } from 'lucide-react';

const NotesWidget = ({ theme }) => {
  const [userNotes, setUserNotes] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);

  // Load notes from localStorage
  useEffect(() => {
    try {
      const savedNotes = localStorage.getItem('tpprover_user_notes');
      if (savedNotes) {
        setUserNotes(JSON.parse(savedNotes));
      }
    } catch (error) {
      console.error('Failed to load notes:', error);
    }
  }, []);

  const handleAddNote = () => {
    const title = document.getElementById('widget-note-title')?.value.trim();
    const content = document.getElementById('widget-note-content')?.value.trim();
    
    if (title || content) {
      const newNote = {
        id: Date.now().toString(),
        title: title || 'Quick Note',
        content: content || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const updatedNotes = [newNote, ...userNotes];
      setUserNotes(updatedNotes);
      localStorage.setItem('tpprover_user_notes', JSON.stringify(updatedNotes));
      
      // Clear form
      if (document.getElementById('widget-note-title')) {
        document.getElementById('widget-note-title').value = '';
      }
      if (document.getElementById('widget-note-content')) {
        document.getElementById('widget-note-content').value = '';
      }
      setShowAddForm(false);
    }
  };

  const handleDeleteNote = (noteId) => {
    const updatedNotes = userNotes.filter(n => n.id !== noteId);
    setUserNotes(updatedNotes);
    localStorage.setItem('tpprover_user_notes', JSON.stringify(updatedNotes));
  };

  const openFullGlossary = () => {
    // Open glossary modal with Notes tab
    window.dispatchEvent(new CustomEvent('tpp:open_glossary', { 
      detail: { tab: 'notes' } 
    }));
  };

  // Show max 3 recent notes in widget
  const recentNotes = userNotes.slice(0, 3);

  return (
    <div className="space-y-4">
      {/* Quick Add Section */}
      <div className="space-y-3">
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full p-3 border-2 border-dashed rounded-lg hover:border-solid transition-all duration-200 group"
            style={{ 
              borderColor: theme.border,
              color: theme.textLight
            }}
          >
            <div className="flex items-center gap-2 justify-center">
              <Plus size={16} className="group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium">Quick note...</span>
            </div>
          </button>
        ) : (
          <div className="p-3 border-2 rounded-lg" style={{ borderColor: theme.primary, backgroundColor: theme.cardBackground }}>
            <div className="space-y-2">
              <input
                id="widget-note-title"
                type="text"
                placeholder="Note title (optional)"
                className="w-full text-sm bg-transparent border-none focus:outline-none"
                style={{ color: theme.text }}
                autoFocus
              />
              <textarea
                id="widget-note-content"
                placeholder="What's on your mind?"
                rows={2}
                className="w-full text-sm bg-transparent border-none focus:outline-none resize-none"
                style={{ color: theme.text }}
              />
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleAddNote}
                  className="px-3 py-1 rounded text-sm font-medium"
                  style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                >
                  Save
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1 rounded text-sm"
                  style={{ color: theme.text }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Notes */}
      {recentNotes.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium" style={{ color: theme.text }}>
              Recent Notes
            </h4>
            {userNotes.length > 3 && (
              <button
                onClick={openFullGlossary}
                className="text-xs hover:underline"
                style={{ color: theme.primary }}
              >
                View all ({userNotes.length})
              </button>
            )}
          </div>
          
          <div className="space-y-2">
            {recentNotes.map((note) => (
              <div
                key={note.id}
                className="group p-2 rounded border hover:shadow-sm transition-all duration-200"
                style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {note.title && note.title !== 'Quick Note' && (
                      <h5 className="text-sm font-medium mb-1 truncate" style={{ color: theme.text }}>
                        {note.title}
                      </h5>
                    )}
                    <p className="text-xs line-clamp-2" style={{ color: theme.textLight }}>
                      {note.content}
                    </p>
                    <div className="text-xs mt-1" style={{ color: theme.textLight, opacity: 0.7 }}>
                      {new Date(note.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1 rounded hover:bg-red-50 hover:text-red-600 transition-colors"
                      style={{ color: theme.textLight }}
                      title="Delete note"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {userNotes.length === 0 && !showAddForm && (
        <div className="text-center py-6">
          <FileText size={24} className="mx-auto mb-2" style={{ color: theme.textLight }} />
          <p className="text-sm mb-3" style={{ color: theme.textLight }}>
            No notes yet
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="text-sm hover:underline"
            style={{ color: theme.primary }}
          >
            Create your first note
          </button>
        </div>
      )}

      {/* Footer Actions */}
      {userNotes.length > 0 && (
        <div className="pt-2 border-t" style={{ borderColor: theme.border }}>
          <button
            onClick={openFullGlossary}
            className="w-full text-sm text-center hover:underline flex items-center justify-center gap-1"
            style={{ color: theme.primary }}
          >
            <Eye size={12} />
            Open full notes
          </button>
        </div>
      )}
    </div>
  );
};

export default NotesWidget;
