import { generateId } from './string';
import { getLocalDateString } from './date';

const PROTOCOL_HISTORY_KEY = 'tpprover_protocol_history';

/**
 * Get all protocol history entries
 */
export function getProtocolHistory() {
    try {
        const history = localStorage.getItem(PROTOCOL_HISTORY_KEY);
        return history ? JSON.parse(history) : [];
    } catch (error) {
        console.error('Error loading protocol history:', error);
        return [];
    }
}

/**
 * Get history entries for a specific protocol
 */
export function getProtocolHistoryEntries(protocolId) {
    const allHistory = getProtocolHistory();
    return allHistory.filter(entry => entry.protocolId === protocolId);
}

/**
 * Save a protocol history entry (when protocol starts)
 * Prevents duplicate entries for active protocols
 */
export function saveProtocolHistoryEntry(entry) {
    try {
        const allHistory = getProtocolHistory();
        
        // Check if there's already an active history entry for this protocol
        const existingActiveEntry = findActiveProtocolHistoryEntry(entry.protocolId);
        if (existingActiveEntry) {
            // Update the existing entry instead of creating a duplicate
            console.log('Updating existing active history entry instead of creating duplicate');
            return updateProtocolHistoryEntry(existingActiveEntry.id, {
                protocolName: entry.protocolName,
                startDate: entry.startDate,
                protocolData: entry.protocolData,
                vials: entry.vials || [],
                reconstitutionData: entry.reconstitutionData || null,
                skippedReconstitution: entry.skippedReconstitution || null
            }) ? existingActiveEntry.id : null;
        }
        
        const newEntry = {
            id: generateId(12),
            protocolId: entry.protocolId,
            protocolName: entry.protocolName,
            startDate: entry.startDate,
            endDate: null,
            completionStatus: null,
            protocolData: entry.protocolData,
            vials: entry.vials || [],
            reconstitutionData: entry.reconstitutionData || null,
            skippedReconstitution: entry.skippedReconstitution || null, // Store skipped reconstitution data
            vialsAddedDuring: [],
            notes: [], // Array to store protocol notes (during and follow-up)
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        allHistory.push(newEntry);
        localStorage.setItem(PROTOCOL_HISTORY_KEY, JSON.stringify(allHistory));
        return newEntry.id;
    } catch (error) {
        console.error('Error saving protocol history entry:', error);
        return null;
    }
}

/**
 * Update a protocol history entry (when protocol ends)
 */
export function updateProtocolHistoryEntry(historyId, updates) {
    try {
        const allHistory = getProtocolHistory();
        const index = allHistory.findIndex(entry => entry.id === historyId);
        
        if (index === -1) {
            console.warn('Protocol history entry not found:', historyId);
            return false;
        }
        
        allHistory[index] = {
            ...allHistory[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        localStorage.setItem(PROTOCOL_HISTORY_KEY, JSON.stringify(allHistory));
        return true;
    } catch (error) {
        console.error('Error updating protocol history entry:', error);
        return false;
    }
}

/**
 * Delete a protocol history entry
 */
export function deleteProtocolHistoryEntry(historyId) {
    try {
        const allHistory = getProtocolHistory();
        const index = allHistory.findIndex(entry => entry.id === historyId);
        
        if (index === -1) {
            console.warn('Protocol history entry not found:', historyId);
            return false;
        }
        
        allHistory.splice(index, 1);
        localStorage.setItem(PROTOCOL_HISTORY_KEY, JSON.stringify(allHistory));
        return true;
    } catch (error) {
        console.error('Error deleting protocol history entry:', error);
        return false;
    }
}

/**
 * Find the most recent active history entry for a protocol
 */
export function findActiveProtocolHistoryEntry(protocolId) {
    const entries = getProtocolHistoryEntries(protocolId);
    // Find the most recent entry that hasn't ended yet
    const activeEntries = entries
        .filter(entry => !entry.endDate)
        .sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
    
    return activeEntries.length > 0 ? activeEntries[0] : null;
}

/**
 * Add a vial to the vialsAddedDuring array for an active protocol
 * Prevents duplicate vials from being added multiple times
 */
export function addVialToActiveProtocol(protocolId, vialData) {
    const activeEntry = findActiveProtocolHistoryEntry(protocolId);
    if (!activeEntry) {
        console.warn('No active protocol history entry found for:', protocolId);
        return false;
    }
    
    // Check if this vial is already in vialsAddedDuring to prevent duplicates
    const existingVials = activeEntry.vialsAddedDuring || [];
    const isDuplicate = existingVials.some(vial => 
        vial.vialId === vialData.vialId && 
        vial.stockpileId === vialData.stockpileId
    );
    
    if (isDuplicate) {
        console.log('Vial already added to protocol history, skipping duplicate');
        return true; // Return true since the vial is already tracked
    }
    
    const updatedVialsAdded = [
        ...existingVials,
        {
            ...vialData,
            addedDate: new Date().toISOString()
        }
    ];
    
    return updateProtocolHistoryEntry(activeEntry.id, {
        vialsAddedDuring: updatedVialsAdded
    });
}

/**
 * Migrate existing protocol history entries by ensuring they have IDs and required fields
 * This function scans localStorage for existing entries and assigns IDs without deleting or moving data
 * Safe to run multiple times (idempotent)
 */
export function migrateProtocolHistoryEntries() {
    try {
        const allHistory = getProtocolHistory();
        let migratedCount = 0;
        let updatedEntries = false;
        
        // Check if migration has already been completed
        const migrationKey = 'tpprover_protocol_history_migrated';
        const alreadyMigrated = localStorage.getItem(migrationKey);
        
        if (alreadyMigrated === 'true' && allHistory.every(entry => entry.id)) {
            // All entries already have IDs, skip migration
            return { migrated: 0, total: allHistory.length, skipped: true };
        }
        
        // Process each entry
        const migratedHistory = allHistory.map((entry, index) => {
            // Skip if entry already has an ID
            if (entry.id) {
                return entry;
            }
            
            // Generate ID for entries without one
            const migratedEntry = {
                ...entry, // Preserve all existing data
                id: generateId(12), // Add missing ID
            };
            
            // Ensure required fields exist with sensible defaults
            if (!migratedEntry.protocolId) {
                // Try to infer from protocolName or use a generated ID
                migratedEntry.protocolId = migratedEntry.protocolId || `migrated_${generateId(8)}`;
            }
            
            if (!migratedEntry.createdAt) {
                // Use startDate if available, otherwise current time
                migratedEntry.createdAt = migratedEntry.startDate 
                    ? new Date(migratedEntry.startDate).toISOString()
                    : new Date().toISOString();
            }
            
            if (!migratedEntry.updatedAt) {
                // Use endDate if available, otherwise createdAt
                migratedEntry.updatedAt = migratedEntry.endDate
                    ? new Date(migratedEntry.endDate).toISOString()
                    : migratedEntry.createdAt;
            }
            
            // Ensure arrays exist
            if (!Array.isArray(migratedEntry.vials)) {
                migratedEntry.vials = [];
            }
            
            if (!Array.isArray(migratedEntry.vialsAddedDuring)) {
                migratedEntry.vialsAddedDuring = [];
            }
            
            if (!Array.isArray(migratedEntry.notes)) {
                migratedEntry.notes = [];
            }
            
            migratedCount++;
            updatedEntries = true;
            
            return migratedEntry;
        });
        
        // Save migrated entries back to localStorage
        if (updatedEntries) {
            localStorage.setItem(PROTOCOL_HISTORY_KEY, JSON.stringify(migratedHistory));
            localStorage.setItem(migrationKey, 'true');
            console.log(`✅ Migrated ${migratedCount} protocol history entries (assigned IDs, preserved all data)`);
        }
        
        return {
            migrated: migratedCount,
            total: allHistory.length,
            skipped: !updatedEntries
        };
    } catch (error) {
        console.error('Error migrating protocol history entries:', error);
        return { migrated: 0, total: 0, error: error.message };
    }
}

/**
 * Migrate completion status for existing history entries
 * Recalculates completion status based on planned vs actual duration
 * This fixes previous entries that may have incorrect status
 */
export function migrateProtocolHistoryCompletionStatus() {
    try {
        const allHistory = getProtocolHistory();
        let updatedCount = 0;
        let hasUpdates = false;
        
        // Check if this migration has already been completed
        const migrationKey = 'tpprover_protocol_history_completion_migrated';
        const alreadyMigrated = localStorage.getItem(migrationKey);
        
        if (alreadyMigrated === 'true') {
            // Check if any entries need updating (only update if status seems wrong)
            const needsUpdate = allHistory.some(entry => {
                if (!entry.endDate) return false;
                // If status is explicitly set and seems correct, skip
                if (entry.completionStatus === 'rescheduled') return false;
                // Check if we should recalculate
                return true;
            });
            
            if (!needsUpdate) {
                return { updated: 0, total: allHistory.length, skipped: true };
            }
        }
        
        // Get protocols from localStorage to look up duration if needed
        let protocols = [];
        try {
            const protocolsData = localStorage.getItem('tpprover_protocols');
            if (protocolsData) {
                protocols = JSON.parse(protocolsData);
            }
        } catch (e) {
            console.warn('Could not load protocols for migration:', e);
        }
        
        // Process each entry
        const migratedHistory = allHistory.map((entry) => {
            // Skip entries without endDate (ongoing protocols)
            if (!entry.endDate) {
                return entry;
            }
            
            // Skip if status is explicitly set to rescheduled (don't override)
            if (entry.completionStatus === 'rescheduled') {
                return entry;
            }
            
            // Calculate actual duration
            const startDate = new Date(entry.startDate);
            const endDate = new Date(entry.endDate);
            const durationDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
            
            // Calculate expected duration from protocol data or protocol object
            let expectedDurationDays = null;
            const protocolData = entry.protocolData || {};
            let duration = protocolData.duration;
            
            // Try to find protocol in protocols array if duration not in history entry
            if (!duration && entry.protocolId) {
                const protocol = protocols.find(p => p.id === entry.protocolId);
                if (protocol && protocol.duration) {
                    duration = protocol.duration;
                }
            }
            
            if (duration && !duration.noEnd && duration.count > 0 && duration.unit) {
                const unit = String(duration.unit).toLowerCase();
                const count = Number(duration.count) || 0;
                
                if (unit.includes('day')) {
                    expectedDurationDays = count;
                } else if (unit.includes('week')) {
                    expectedDurationDays = count * 7;
                } else if (unit.includes('month')) {
                    expectedDurationDays = count * 30; // Approximation
                }
            }
            
            // Calculate new completion status
            let newCompletionStatus = entry.completionStatus;
            
            if (expectedDurationDays !== null && durationDays > 0) {
                const diffDays = durationDays - expectedDurationDays;
                // Allow 2 day tolerance for "completed on time"
                if (Math.abs(diffDays) <= 2) {
                    newCompletionStatus = 'completed';
                } else if (diffDays < -2) {
                    // Ended significantly early
                    newCompletionStatus = 'ended_early';
                } else {
                    // Went over expected duration
                    newCompletionStatus = 'completed'; // Still consider it completed if it went over
                }
            } else {
                // Fallback to endType if we can't calculate
                if (entry.endType === 'completed') {
                    newCompletionStatus = 'completed';
                } else if (entry.endType === 'manual') {
                    // Manual end without duration info - check if it seems early
                    // If duration is very short (1-2 days) and no planned duration, likely a test/quick protocol
                    if (durationDays <= 2) {
                        newCompletionStatus = 'completed'; // Short protocols are likely intentional
                    } else {
                        newCompletionStatus = 'ended_early';
                    }
                } else if (entry.endType) {
                    newCompletionStatus = 'ended_early';
                }
            }
            
            // Only update if status changed
            if (newCompletionStatus !== entry.completionStatus) {
                updatedCount++;
                hasUpdates = true;
                return {
                    ...entry,
                    completionStatus: newCompletionStatus,
                    updatedAt: new Date().toISOString()
                };
            }
            
            return entry;
        });
        
        // Save migrated entries back to localStorage
        if (hasUpdates) {
            localStorage.setItem(PROTOCOL_HISTORY_KEY, JSON.stringify(migratedHistory));
            localStorage.setItem(migrationKey, 'true');
            console.log(`✅ Migrated completion status for ${updatedCount} protocol history entries`);
        }
        
        return {
            updated: updatedCount,
            total: allHistory.length,
            skipped: !hasUpdates
        };
    } catch (error) {
        console.error('Error migrating protocol history completion status:', error);
        return { updated: 0, total: 0, error: error.message };
    }
}

/**
 * Scan for protocol history entries in alternative storage locations
 * This checks for entries that might be stored in different keys or formats
 */
export function scanForLegacyProtocolHistory() {
    try {
        const legacyKeys = [
            'tpprover_protocol_history',
            'protocol_history',
            'tpprover_history',
            'protocols_history'
        ];
        
        const foundEntries = [];
        
        legacyKeys.forEach(key => {
            try {
                const data = localStorage.getItem(key);
                if (data) {
                    const parsed = JSON.parse(data);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        foundEntries.push({ key, entries: parsed });
                    }
                }
            } catch (e) {
                // Skip invalid entries
            }
        });
        
        return foundEntries;
    } catch (error) {
        console.error('Error scanning for legacy protocol history:', error);
        return [];
    }
}

/**
 * Create a test protocol history entry with full details for testing purposes
 * This function creates a complete history entry with all fields populated
 */
export function createTestProtocolHistoryEntry(protocolId = 'test_protocol_001') {
    try {
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 30); // Started 30 days ago
        const endDate = new Date(today);
        endDate.setDate(endDate.getDate() - 5); // Ended 5 days ago
        
        const testEntry = {
            id: generateId(12),
            protocolId: protocolId,
            protocolName: 'Test Research Protocol - Growth Hormone Optimization',
            startDate: getLocalDateString(startDate),
            endDate: getLocalDateString(endDate),
            completionStatus: 'completed',
            endType: 'completed',
            protocolData: {
                protocolName: 'Test Research Protocol - Growth Hormone Optimization',
                peptides: [
                    {
                        name: 'BPC-157',
                        dosage: {
                            amount: 250,
                            unit: 'mcg'
                        },
                        frequency: {
                            type: 'regular',
                            count: 1,
                            per: 'Day',
                            time: ['AM', 'PM']
                        }
                    },
                    {
                        name: 'Ipamorelin',
                        dosage: {
                            amount: 200,
                            unit: 'mcg'
                        },
                        frequency: {
                            type: 'cycle',
                            onDays: 5,
                            offDays: 2,
                            time: ['PM']
                        }
                    },
                    {
                        name: 'CJC-1295',
                        dosage: {
                            amount: 100,
                            unit: 'mcg'
                        },
                        frequency: {
                            type: 'regular',
                            count: 1,
                            per: 'Day',
                            time: ['PM']
                        }
                    }
                ],
                duration: {
                    count: 4,
                    unit: 'Week',
                    noEnd: false
                },
                purpose: 'Research protocol for growth hormone optimization and recovery enhancement. Tracking adherence and outcomes for research documentation.'
            },
            vials: [
                {
                    vialId: 'test_vial_001',
                    stockpileId: 'test_vial_001',
                    name: 'BPC-157',
                    mg: 5,
                    vendor: 'Peptide Sciences',
                    cost: 89.99,
                    reconstitutionDate: getLocalDateString(new Date(startDate.getTime() + 1 * 24 * 60 * 60 * 1000))
                },
                {
                    vialId: 'test_vial_002',
                    stockpileId: 'test_vial_002',
                    name: 'Ipamorelin',
                    mg: 2,
                    vendor: 'Core Peptides',
                    cost: 45.00,
                    reconstitutionDate: getLocalDateString(new Date(startDate.getTime() + 2 * 24 * 60 * 60 * 1000))
                },
                {
                    vialId: 'test_vial_003',
                    stockpileId: 'test_vial_003',
                    name: 'CJC-1295',
                    mg: 2,
                    vendor: 'Peptide Sciences',
                    cost: 75.50,
                    reconstitutionDate: getLocalDateString(new Date(startDate.getTime() + 1 * 24 * 60 * 60 * 1000))
                }
            ],
            reconstitutionData: {
                reconStrategy: 'separate',
                date: getLocalDateString(new Date(startDate.getTime() + 1 * 24 * 60 * 60 * 1000)),
                notes: 'Reconstituted with bacteriostatic water. Stored in refrigerator at 2-8°C.'
            },
            vialsAddedDuring: [
                {
                    vialId: 'test_vial_004',
                    stockpileId: 'test_vial_004',
                    name: 'GHRP-6',
                    mg: 2,
                    vendor: 'Core Peptides',
                    cost: 42.00,
                    addedDate: getLocalDateString(new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000)),
                    reconstitutionDate: getLocalDateString(new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000))
                }
            ],
            createdAt: new Date(startDate.getTime()).toISOString(),
            updatedAt: new Date(endDate.getTime()).toISOString()
        };
        
        const allHistory = getProtocolHistory();
        allHistory.push(testEntry);
        localStorage.setItem(PROTOCOL_HISTORY_KEY, JSON.stringify(allHistory));
        
        console.log('✅ Test protocol history entry created:', testEntry);
        return testEntry;
    } catch (error) {
        console.error('Error creating test protocol history entry:', error);
        return null;
    }
}

/**
 * Add a note to a protocol history entry
 * @param {string} historyId - The history entry ID
 * @param {Object} noteData - Note data: { type: 'during' | 'follow_up', content: string, tags?: string[], linkedDate?: string }
 * @returns {boolean} Success status
 */
export function addNoteToProtocolHistory(historyId, noteData) {
    try {
        const allHistory = getProtocolHistory();
        const entry = allHistory.find(e => e.id === historyId);
        
        if (!entry) {
            console.warn('Protocol history entry not found:', historyId);
            return false;
        }
        
        // Ensure notes array exists
        if (!Array.isArray(entry.notes)) {
            entry.notes = [];
        }
        
        const newNote = {
            id: generateId(12),
            type: noteData.type || 'during',
            content: noteData.content || '',
            tags: noteData.tags || [],
            linkedDate: noteData.linkedDate || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        entry.notes.push(newNote);
        entry.updatedAt = new Date().toISOString();
        
        localStorage.setItem(PROTOCOL_HISTORY_KEY, JSON.stringify(allHistory));
        return true;
    } catch (error) {
        console.error('Error adding note to protocol history:', error);
        return false;
    }
}

/**
 * Update a note in a protocol history entry
 * @param {string} historyId - The history entry ID
 * @param {string} noteId - The note ID
 * @param {Object} updates - Updated note data
 * @returns {boolean} Success status
 */
export function updateNoteInProtocolHistory(historyId, noteId, updates) {
    try {
        const allHistory = getProtocolHistory();
        const entry = allHistory.find(e => e.id === historyId);
        
        if (!entry || !Array.isArray(entry.notes)) {
            return false;
        }
        
        const noteIndex = entry.notes.findIndex(n => n.id === noteId);
        if (noteIndex === -1) {
            return false;
        }
        
        entry.notes[noteIndex] = {
            ...entry.notes[noteIndex],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        entry.updatedAt = new Date().toISOString();
        localStorage.setItem(PROTOCOL_HISTORY_KEY, JSON.stringify(allHistory));
        return true;
    } catch (error) {
        console.error('Error updating note in protocol history:', error);
        return false;
    }
}

/**
 * Delete a note from a protocol history entry
 * @param {string} historyId - The history entry ID
 * @param {string} noteId - The note ID
 * @returns {boolean} Success status
 */
export function deleteNoteFromProtocolHistory(historyId, noteId) {
    try {
        const allHistory = getProtocolHistory();
        const entry = allHistory.find(e => e.id === historyId);
        
        if (!entry || !Array.isArray(entry.notes)) {
            return false;
        }
        
        entry.notes = entry.notes.filter(n => n.id !== noteId);
        entry.updatedAt = new Date().toISOString();
        localStorage.setItem(PROTOCOL_HISTORY_KEY, JSON.stringify(allHistory));
        return true;
    } catch (error) {
        console.error('Error deleting note from protocol history:', error);
        return false;
    }
}

/**
 * Get all notes for a protocol (across all history entries)
 * @param {string} protocolId - The protocol ID
 * @returns {Array} Array of notes with history entry context
 */
export function getProtocolNotes(protocolId) {
    try {
        const allHistory = getProtocolHistory();
        const entries = allHistory.filter(e => e.protocolId === protocolId);
        
        const notes = [];
        entries.forEach(entry => {
            if (Array.isArray(entry.notes)) {
                entry.notes.forEach(note => {
                    notes.push({
                        ...note,
                        historyEntryId: entry.id,
                        protocolName: entry.protocolName,
                        startDate: entry.startDate,
                        endDate: entry.endDate
                    });
                });
            }
        });
        
        return notes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
        console.error('Error getting protocol notes:', error);
        return [];
    }
}

/**
 * Get notes for calendar display (notes with linkedDate)
 * @param {string} dateKey - Date key in format YYYY-MM-DD
 * @returns {Array} Array of notes linked to that date
 */
export function getNotesForDate(dateKey) {
    try {
        const allHistory = getProtocolHistory();
        const notes = [];
        
        allHistory.forEach(entry => {
            if (Array.isArray(entry.notes)) {
                entry.notes.forEach(note => {
                    if (note.linkedDate === dateKey) {
                        notes.push({
                            ...note,
                            historyEntryId: entry.id,
                            protocolId: entry.protocolId,
                            protocolName: entry.protocolName
                        });
                    }
                });
            }
        });
        
        return notes;
    } catch (error) {
        console.error('Error getting notes for date:', error);
        return [];
    }
}

