import React, { useState, useEffect } from 'react';
import { FileText, Plus, Trash2 } from 'lucide-react';

const NotesWidget = ({ widget, theme }) => {
  const [userNotes, setUserNotes] = useState([]);

  useEffect(() => {
    try {
      const savedNotes = localStorage.getItem('tpprover_user_notes');
      if (savedNotes) {
        setUserNotes(JSON.parse(savedNotes));
      }
    } catch (error) {
      console.error('Failed to load user notes from localStorage:', error);
    }
  }, []);

  const handleAddNote = () => {
    window.dispatchEvent(new CustomEvent('tpp:open_glossary', { detail: { tab: 'notes' } }));
  };

  const handleDeleteNote = (e, id) => {
    e.stopPropagation();
    const updatedNotes = userNotes.filter(n => n.id !== id);
    setUserNotes(updatedNotes);
    localStorage.setItem('tpprover_user_notes', JSON.stringify(updatedNotes));
  };

  const recentNotes = userNotes.slice(0, 4); // Show up to 4 recent notes

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
          {/* Recent Notes List */}
          {recentNotes.length > 0 ? (
            <div className="flex-1 overflow-y-auto space-y-2">
              {recentNotes.map((note) => (
                <div key={note.id} className="p-2 rounded border hover:shadow-sm transition-all duration-200" style={{ borderColor: theme.border, backgroundColor: theme.background }}>
                  <div className="flex items-start justify-between mb-1">
                    {note.title && note.title !== 'Untitled' && note.title !== 'Quick Note' && (
                      <h4 className="font-medium text-sm line-clamp-1" style={{ color: theme.text }}>
                        {note.title}
                      </h4>
                    )}
                    <button
                      onClick={(e) => handleDeleteNote(e, note.id)}
                      className="p-1 rounded hover:bg-red-50 hover:text-red-600 transition-colors flex-shrink-0"
                      style={{ color: theme.textLight }}
                      title="Delete note"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <p className="text-xs line-clamp-2 mb-1" style={{ color: theme.textLight }}>
                    {note.content}
                  </p>
                  <div className="text-xs opacity-60" style={{ color: theme.textLight }}>
                    {new Date(note.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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

        {/* Bottom Action Button - matching other widgets */}
        <div className="pt-3 border-t" style={{ borderColor: theme.border }}>
          <button
            onClick={handleAddNote}
            className="w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
          >
            <Plus size={16} />
            Add Note
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotesWidget;