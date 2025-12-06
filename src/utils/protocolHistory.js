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

