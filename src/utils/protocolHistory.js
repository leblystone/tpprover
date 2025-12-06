import { generateId } from './string';

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
 */
export function saveProtocolHistoryEntry(entry) {
    try {
        const allHistory = getProtocolHistory();
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
            vialsAddedDuring: [],
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
 */
export function addVialToActiveProtocol(protocolId, vialData) {
    const activeEntry = findActiveProtocolHistoryEntry(protocolId);
    if (!activeEntry) {
        console.warn('No active protocol history entry found for:', protocolId);
        return false;
    }
    
    const updatedVialsAdded = [
        ...(activeEntry.vialsAddedDuring || []),
        {
            ...vialData,
            addedDate: new Date().toISOString()
        }
    ];
    
    return updateProtocolHistoryEntry(activeEntry.id, {
        vialsAddedDuring: updatedVialsAdded
    });
}

