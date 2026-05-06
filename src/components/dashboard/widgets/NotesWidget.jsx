import React, { useState, useEffect } from 'react';
import { NotePencil, Plus, Trash, CaretDown } from '@phosphor-icons/react';
import NotesModal from '../../notes/NotesModal';
import { recordDeletion } from '../../../utils/deletionTracking';
import ExpandableTooltip from '../../ui/ExpandableTooltip';
import { WIDGET_TOOLTIPS } from '../../../utils/widgetTooltips';

const NotesWidget = ({ widget, theme, protocols = [] }) => {
  const [userNotes, setUserNotes] = useState([]);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [openNotesForAdd, setOpenNotesForAdd] = useState(false);

  useEffect(() => {
    loadNotes();
    const reload = () => loadNotes();
    window.addEventListener('tpp:cloud-data-loaded', reload);
    window.addEventListener('tpp:user-notes-updated', reload);
    return () => {
      window.removeEventListener('tpp:cloud-data-loaded', reload);
      window.removeEventListener('tpp:user-notes-updated', reload);
    };
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
      window.dispatchEvent(new CustomEvent('tpp:user-notes-updated', { detail: { notes } }));
    } catch (error) {
      console.error('Failed to save notes:', error);
    }
  };

  const openAddNoteSheet = () => {
    setOpenNotesForAdd(true);
    setShowNotesModal(true);
  };

  const handleViewAll = () => {
    setOpenNotesForAdd(false);
    setShowNotesModal(true);
  };

  const handleCloseNotesSheet = () => {
    setShowNotesModal(false);
    setOpenNotesForAdd(false);
  };

  const handleDeleteNote = (e, noteId) => {
    e.stopPropagation();
    const noteToDelete = userNotes.find(note => note.id === noteId);
    if (noteToDelete) {
      recordDeletion('userNotes', noteId, noteToDelete);
    } else {
      recordDeletion('userNotes', noteId);
    }
    const updatedNotes = userNotes.filter(note => note.id !== noteId);
    saveNotes(updatedNotes);
  };

  // Show only the last 2 notes
  const recentNotes = userNotes.slice(0, 2);

  return (
    <div className="h-full flex flex-col widget-card-hover">
      <div className={`px-4 py-3 widget-separator`} style={{ borderColor: theme.isDark ? 'transparent' : 'rgba(47, 59, 58, 0.4)' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold flex items-center gap-2" style={{ color: theme.text }}>
            Research Notes
            <NotePencil size={22} weight="duotone" style={{ color: theme.isDark ? '#f07268' : theme.primary }} className="icon-hover" />
          </h3>
          <div className="flex items-center gap-2">
            <ExpandableTooltip content={WIDGET_TOOLTIPS.notes} theme={theme} />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); openAddNoteSheet(); }}
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
          </div>
        </div>
      </div>
      
      <div className="flex-1 p-4 flex flex-col min-h-0">
          <div className="flex-1 flex flex-col min-h-0">
            {recentNotes.length > 0 ? (
              <>
                <div className="flex-1 space-y-1.5 mb-3 overflow-y-auto min-h-0">
                  {recentNotes.map((note, index) => (
                    <div
                      key={note.id}
                      className="group py-2.5 px-3 transition-all duration-200 cursor-pointer"
                      style={{
                        backgroundColor: 'transparent',
                        borderLeft: `3px solid ${theme.isDark ? 'rgba(255,255,255,0.12)' : theme.primary + '40'}`,
                        boxShadow: index < recentNotes.length - 1
                          ? `0 1px 0 ${theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(127, 158, 149, 0.08)'}`
                          : 'none'
                      }}
                      onClick={handleViewAll}
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
                          <Trash size={10} weight="bold" />
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
              </>
            ) : (
              <div className="flex-1 p-2 sm:p-4 flex flex-col items-center justify-center gap-3 min-h-0">
                <p className="text-sm text-center px-2" style={{ color: theme.textLight }}>
                  No research notes yet
                </p>
                <button
                  type="button"
                  onClick={openAddNoteSheet}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
                  style={{
                    color: theme.primary,
                    backgroundColor: theme.isDark ? `${theme.primary}20` : `${theme.primary}15`,
                    border: `1px solid ${theme.primary}40`
                  }}
                >
                  Add Note
                  <CaretDown size={14} weight="bold" />
                </button>
              </div>
            )}
          </div>
      </div>

      {userNotes.length > 0 && (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleViewAll(); }}
          className="mt-3 text-sm text-center hover:underline transition-all duration-200 flex-shrink-0 cursor-pointer touch-manipulation px-4 pb-3"
          style={{ color: theme.primary, WebkitTapHighlightColor: 'transparent' }}
        >
          View All
        </button>
      )}

      {/* Notes Bottom Sheet */}
      <NotesModal 
        isOpen={showNotesModal}
        onClose={handleCloseNotesSheet}
        theme={theme}
        notes={userNotes}
        onNotesChange={saveNotes}
        protocols={protocols}
        initialShowAddForm={openNotesForAdd}
        openedForAddOnly={openNotesForAdd}
      />
    </div>
  );
};

export default NotesWidget;