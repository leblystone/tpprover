import { generateId } from './string';

/**
 * Migrates calendar notes from old string format to new ID-based array format
 * Old format: { "2026-01-12": "text" } or { "2026-01-12": { text: "text" } }
 * New format: { "2026-01-12": { notes: [{ id: "abc", text: "text", createdAt: "...", updatedAt: "..." }] } }
 */
export function migrateCalendarNotesToIdBased(oldNotes) {
    if (!oldNotes || typeof oldNotes !== 'object') {
        return {};
    }

    const migratedNotes = {};
    
    for (const dateKey in oldNotes) {
        const noteData = oldNotes[dateKey];
        
        // Skip if already in new format (has notes array)
        if (noteData && typeof noteData === 'object' && Array.isArray(noteData.notes)) {
            migratedNotes[dateKey] = noteData;
            continue;
        }
        
        // Extract text from old format
        let text = '';
        if (typeof noteData === 'string') {
            // Very old format: direct string
            text = noteData;
        } else if (noteData && typeof noteData === 'object' && noteData.text) {
            // Old format: { text: "..." }
            text = noteData.text;
        }
        
        // Only create note if there's actual content
        if (text && text.trim()) {
            const now = new Date().toISOString();
            migratedNotes[dateKey] = {
                notes: [{
                    id: generateId(12),
                    text: text.trim(),
                    createdAt: now,
                    updatedAt: now
                }]
            };
        } else {
            // Empty or no text, create empty notes array
            migratedNotes[dateKey] = { notes: [] };
        }
    }
    
    return migratedNotes;
}

/**
 * Add a new note to a specific date
 */
export function addCalendarNote(calendarNotes, dateKey, text) {
    if (!text || !text.trim()) {
        return calendarNotes;
    }
    
    const now = new Date().toISOString();
    const newNote = {
        id: generateId(12),
        text: text.trim(),
        createdAt: now,
        updatedAt: now
    };
    
    const dayData = calendarNotes[dateKey] || { notes: [] };
    
    return {
        ...calendarNotes,
        [dateKey]: {
            ...dayData,
            notes: [...(dayData.notes || []), newNote]
        }
    };
}

/**
 * Update an existing note
 */
export function updateCalendarNote(calendarNotes, dateKey, noteId, newText) {
    const dayData = calendarNotes[dateKey];
    if (!dayData || !dayData.notes) {
        return calendarNotes;
    }
    
    const updatedNotes = dayData.notes.map(note => {
        if (note.id === noteId) {
            return {
                ...note,
                text: newText.trim(),
                updatedAt: new Date().toISOString()
            };
        }
        return note;
    });
    
    return {
        ...calendarNotes,
        [dateKey]: {
            ...dayData,
            notes: updatedNotes
        }
    };
}

/**
 * Delete a note
 */
export function deleteCalendarNote(calendarNotes, dateKey, noteId) {
    const dayData = calendarNotes[dateKey];
    if (!dayData || !dayData.notes) {
        return calendarNotes;
    }
    
    const filteredNotes = dayData.notes.filter(note => note.id !== noteId);
    
    return {
        ...calendarNotes,
        [dateKey]: {
            ...dayData,
            notes: filteredNotes
        }
    };
}

/**
 * Replace all notes for a date with a single note (for backward compatibility with old save behavior)
 * This maintains the "one note per day" UX but uses the new structure
 */
export function replaceCalendarNotesForDate(calendarNotes, dateKey, text) {
    if (!text || !text.trim()) {
        // If empty text, remove all notes for this date
        return {
            ...calendarNotes,
            [dateKey]: { notes: [] }
        };
    }
    
    const now = new Date().toISOString();
    const existingDayData = calendarNotes[dateKey];
    
    // If there's already exactly one note, update it instead of replacing
    if (existingDayData?.notes?.length === 1) {
        return updateCalendarNote(calendarNotes, dateKey, existingDayData.notes[0].id, text);
    }
    
    // Otherwise, replace with new note
    const newNote = {
        id: generateId(12),
        text: text.trim(),
        createdAt: now,
        updatedAt: now
    };
    
    return {
        ...calendarNotes,
        [dateKey]: {
            notes: [newNote]
        }
    };
}

/**
 * Get the primary note text for a date (for backward compatibility)
 * Returns the text of the first note, or empty string
 */
export function getCalendarNoteText(calendarNotes, dateKey) {
    const dayData = calendarNotes[dateKey];
    if (!dayData || !dayData.notes || dayData.notes.length === 0) {
        return '';
    }
    return dayData.notes[0].text || '';
}

/**
 * Get all notes for a date
 */
export function getCalendarNotesForDate(calendarNotes, dateKey) {
    const dayData = calendarNotes[dateKey];
    if (!dayData || !Array.isArray(dayData.notes)) {
        return [];
    }
    return dayData.notes;
}

/**
 * Check if a date has any notes
 */
export function hasCalendarNotes(calendarNotes, dateKey) {
    const dayData = calendarNotes[dateKey];
    return dayData && Array.isArray(dayData.notes) && dayData.notes.length > 0;
}



