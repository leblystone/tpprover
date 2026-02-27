import React, { createContext, useState, useEffect, useContext, useMemo, useCallback, useRef } from 'react';
import { ensurePublicOrderNumbers } from '../utils/orderNumbers';
import { logoutUser, onAuthChange } from '../services/firebase';
import { useFirebase } from './FirebaseContext';
import { isNative, isAndroid } from '../utils/platform';
import { 
  saveAppData, loadAppData, saveUserPreferences, loadUserPreferences,
  loadUserSubscription, saveUserState, loadUserState,
  migrateLocalStorageToCloud, clearLocalStorageData, hasUserData,
  subscribeToUserState, subscribeToAppData, subscribeToUserSubscription, mergeWithTimestamps,
  mergeInjectionHistory, mergeInjectionStats, mergeWaterTracker,
  mergeTaskCompletion,
  saveCloudSnapshot, shouldCreateVisitBackup, markVisitBackupDone
} from '../services/cloudStorage';
import { loadNotificationSettingsFromFirestore, loadSettings, saveSettings, getDefaultSettings } from '../utils/settingsHelpers';
import { initializeDeletionTracking, getDeletionTracking, mergeDeletionTracking, recordDeletion } from '../utils/deletionTracking';
import { createInitialAgreementsForExistingUser, hasAnyAgreementData } from '../services/agreementTracking';
import { clearAllUserData, verifyUserDataCleared } from '../utils/clearUserData';
import { defaultThemeName } from '../theme/themes';
import { generateId } from '../utils/string';
import { prepareItemForSave } from '../utils/userDataSave';
import { safeParseLocalStorage, sanitizeForLocalStorage } from '../utils/dataValidation';
import { addToSyncQueue, clearSyncQueue } from '../utils/syncQueue';
import { cleanupTestProtocolHistory } from '../utils/protocolHistory';
import { migrateBlendedProtocolFrequencies } from '../utils/blendedProtocolMigration';
import { runAllMigrations, cleanupGarbageTimestamps } from '../utils/localStorageMigration';
import { runDataFixups } from '../utils/dataFixups';

/**
 * ⚠️ IMPORTANT: READ BEFORE MODIFYING
 * 
 * This file handles user data saving and syncing across devices.
 * ALL changes that touch user data MUST follow the app's standardized pattern.
 * 
 * 📖 READ: USER_DATA_SAVE_PATTERN.md (in project root)
 * 📖 READ: CONTRIBUTING.md (in project root)
 * 
 * Key requirements:
 * - Use prepareItemForSave() from src/utils/userDataSave.js for all creates/updates
 * - Ensure every item has id and updatedAt timestamps
 * - Follow the "three steps" pattern: state → localStorage → cloud sync
 * - Use timestamp-based merging to prevent data loss on multi-device sync
 * 
 * Violating this pattern causes data loss, sync bugs, and cross-device conflicts.
 */
import { registerAppDataGetter } from '../utils/safeReload';
import { reportSyncError } from '../utils/syncErrorReporting';
import { 
    migrateCalendarNotesToIdBased, 
    replaceCalendarNotesForDate, 
    addCalendarNote as addCalendarNoteUtil,
    updateCalendarNote as updateCalendarNoteUtil,
    deleteCalendarNote as deleteCalendarNoteUtil,
    getCalendarNoteText,
    getCalendarNotesForDate,
    hasCalendarNotes
} from '../utils/calendarNotesMigration';

const AppContext = createContext();

export function useAppContext() {
    return useContext(AppContext);
}

export function AppProvider({ children }) {
    const [protocols, setProtocols] = useState([]);
    const [reconItems, setReconItems] = useState([]);
    const [reconHistory, setReconHistory] = useState([]);
    const [supplements, setSupplements] = useState([]);
    const [orders, setOrders] = useState([]);
    const [metrics, setMetrics] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [calendarNotes, setCalendarNotes] = useState({});
    const [stockpile, setStockpile] = useState([]);
    const [scheduledBuys, setScheduledBuys] = useState([]);
    const [user, setUser] = useState(null);
    const [subscription, setSubscription] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    // Bump when wishlist is updated (localStorage-only) so sync effect runs
    const [wishlistSyncTrigger, setWishlistSyncTrigger] = useState(0);
    
    // Native app bypass - disable loading state immediately
    useEffect(() => {
        if (isNative()) {
            setIsLoading(false);
        }
    }, []);
    
    // Real-time sync control
    const isApplyingRemoteUpdateRef = useRef(false);
    const lastRemoteUpdateTimeRef = useRef(0);
    // Generate a unique session ID for this browser tab to prevent protection window from blocking cross-device syncs
    const sessionIdRef = useRef((() => {
        const stored = sessionStorage.getItem('tpprover_session_id');
        if (stored) return stored;
        const newId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('tpprover_session_id', newId);
        return newId;
    })());
    // Protection window refs for scheduledBuys (uses unified 30s window)
    const lastLocalScheduledBuysUpdateRef = useRef((() => {
        try {
            const stored = localStorage.getItem('tpprover_scheduledBuys_lastUpdate');
            const timestamp = stored ? parseInt(stored, 10) : 0;
            // Use unified protection window
            if (Date.now() - timestamp < PROTECTION_WINDOW_MS) {
                console.log('🔒 Restoring scheduledBuys protection from localStorage, age:', Date.now() - timestamp, 'ms');
                return timestamp;
            }
            return 0;
        } catch {
            return 0;
        }
    })());
    
    // Protection window for vendors (uses unified 30s window)
    const lastLocalVendorsUpdateRef = useRef((() => {
        try {
            const stored = localStorage.getItem('tpprover_vendors_lastUpdate');
            const timestamp = stored ? parseInt(stored, 10) : 0;
            // Use unified protection window
            if (Date.now() - timestamp < PROTECTION_WINDOW_MS) {
                console.log('🔒 Restoring vendors protection from localStorage, age:', Date.now() - timestamp, 'ms');
                return timestamp;
            }
            return 0;
        } catch {
            return 0;
        }
    })());
    
    // Protection window for supplements (uses unified 30s window)
    const lastLocalSupplementsUpdateRef = useRef((() => {
        try {
            const stored = localStorage.getItem('tpprover_supplements_lastUpdate');
            const timestamp = stored ? parseInt(stored, 10) : 0;
            if (Date.now() - timestamp < PROTECTION_WINDOW_MS) {
                console.log('🔒 Restoring supplements protection from localStorage, age:', Date.now() - timestamp, 'ms');
                return timestamp;
            }
            return 0;
        } catch {
            return 0;
        }
    })());
    // Protection window for orders (uses unified 30s window)
    const lastLocalOrdersUpdateRef = useRef((() => {
        try {
            const stored = localStorage.getItem('tpprover_orders_lastUpdate');
            const timestamp = stored ? parseInt(stored, 10) : 0;
            if (Date.now() - timestamp < PROTECTION_WINDOW_MS) {
                console.log('🔒 Restoring orders protection from localStorage, age:', Date.now() - timestamp, 'ms');
                return timestamp;
            }
            return 0;
        } catch { return 0; }
    })());
    
    // Protection window for metrics (uses unified 30s window)
    const lastLocalMetricsUpdateRef = useRef((() => {
        try {
            const stored = localStorage.getItem('tpprover_metrics_lastUpdate');
            const timestamp = stored ? parseInt(stored, 10) : 0;
            if (Date.now() - timestamp < PROTECTION_WINDOW_MS) {
                console.log('🔒 Restoring metrics protection from localStorage, age:', Date.now() - timestamp, 'ms');
                return timestamp;
            }
            return 0;
        } catch { return 0; }
    })());
    
    // Protection window for stockpile (uses unified 30s window)
    const lastLocalStockpileUpdateRef = useRef((() => {
        try {
            const stored = localStorage.getItem('tpprover_stockpile_lastUpdate');
            const timestamp = stored ? parseInt(stored, 10) : 0;
            if (Date.now() - timestamp < PROTECTION_WINDOW_MS) {
                console.log('🔒 Restoring stockpile protection from localStorage, age:', Date.now() - timestamp, 'ms');
                return timestamp;
            }
            return 0;
        } catch { return 0; }
    })());
    
    // Protection window for calendarNotes (uses unified 30s window)
    const lastLocalCalendarNotesUpdateRef = useRef((() => {
        try {
            const stored = localStorage.getItem('tpprover_calendarNotes_lastUpdate');
            const timestamp = stored ? parseInt(stored, 10) : 0;
            if (Date.now() - timestamp < PROTECTION_WINDOW_MS) {
                console.log('🔒 Restoring calendarNotes protection from localStorage, age:', Date.now() - timestamp, 'ms');
                return timestamp;
            }
            return 0;
        } catch { return 0; }
    })());
    
    // UNIFIED PROTECTION WINDOW: 30 seconds for all data types
    // Prevents remote updates from overwriting recent local changes
    // Consistent across protocols, orders, vendors, scheduledBuys, and all other data
    const PROTECTION_WINDOW_MS = 30000; // 30 seconds standard
    
    const lastLocalProtocolsUpdateRef = useRef((() => {
        try {
            const stored = localStorage.getItem('tpprover_protocols_lastUpdate');
            const timestamp = stored ? parseInt(stored, 10) : 0;
            if (Date.now() - timestamp < PROTECTION_WINDOW_MS) {
                return timestamp;
            }
            return 0;
        } catch {
            return 0;
        }
    })());
    
    // Wrapped setters that auto-set protection timestamps for data types exposed directly to pages
    // Pages call setOrders/setMetrics/setStockpile/setCalendarNotes via context -
    // these wrappers ensure the protection window is activated on every local write.
    const setOrdersWithProtection = useCallback((updater) => {
        setOrders(updater);
        const now = Date.now();
        lastLocalOrdersUpdateRef.current = now;
        try { localStorage.setItem('tpprover_orders_lastUpdate', String(now)); } catch (e) { /* ignore */ }
    }, []);
    
    const setMetricsWithProtection = useCallback((updater) => {
        setMetrics(updater);
        const now = Date.now();
        lastLocalMetricsUpdateRef.current = now;
        try { localStorage.setItem('tpprover_metrics_lastUpdate', String(now)); } catch (e) { /* ignore */ }
    }, []);
    
    const setStockpileWithProtection = useCallback((updater) => {
        setStockpile(updater);
        const now = Date.now();
        lastLocalStockpileUpdateRef.current = now;
        try { localStorage.setItem('tpprover_stockpile_lastUpdate', String(now)); } catch (e) { /* ignore */ }
    }, []);
    
    const setCalendarNotesWithProtection = useCallback((updater) => {
        setCalendarNotes(updater);
        const now = Date.now();
        lastLocalCalendarNotesUpdateRef.current = now;
        try { localStorage.setItem('tpprover_calendarNotes_lastUpdate', String(now)); } catch (e) { /* ignore */ }
    }, []);
    
    // Track in-progress deletions to prevent race conditions
    const deletingSupplementsRef = useRef(new Set());
    
    // Debounce timer for auto-sync (500ms - balances speed and efficiency)
    const autoSyncTimerRef = useRef(null);
    const AUTOSYNC_DEBOUNCE_MS = 500;
    
    // Flag to prevent auto-save until after initial Firestore load (prevents stale cache from overwriting fresh cloud data)
    const hasLoadedFromFirestoreRef = useRef(false);
    
    // Flag to prevent saveData/auto-sync writes during logout (prevents empty state from being saved)
    const isLoggingOutRef = useRef(false);
    
    // 🚀 INSTANT LOAD: Load localStorage data IMMEDIATELY on mount (before Firebase Auth)
    // SECURITY: Validate user ownership before loading to prevent data bleeding
    useEffect(() => {
        // Initialize deletion tracking system
        initializeDeletionTracking();
        
        // Clean up test/mock protocol history entries
        cleanupTestProtocolHistory();
        
        // Set flag to prevent welcome modal interference during initial load
        sessionStorage.setItem('tpp_initial_data_loading', 'true');
        
        try {
            // CRITICAL SECURITY CHECK: Verify data ownership before loading (case-insensitive)
            const lastUserEmail = (localStorage.getItem('tpprover_last_user_email') || '').toLowerCase();
            const currentUserData = localStorage.getItem('tpprover_user');
            
            // SAFETY: If no user tracking email exists, skip instant load
            // This prevents loading old data after logout before new login completes
            if (!lastUserEmail) {
                console.log('⏸️ No user tracking email found - skipping instant load');
                console.log('  Data will load from cloud after authentication');
                return;
            }
            
            // If we have user data, check if there's a mismatch
            if (currentUserData) {
                try {
                    const parsedUser = JSON.parse(currentUserData);
                    const storedEmail = (parsedUser.email || '').toLowerCase();
                    // If last user email doesn't match the stored user, this is stale data
                    if (lastUserEmail && storedEmail && lastUserEmail !== storedEmail) {
                        console.log('🚨 SECURITY: Stale user data detected during instant load');
                        console.log('  Last user:', lastUserEmail);
                        console.log('  Stored user:', parsedUser.email);
                        console.log('  ⚠️ Skipping instant load to prevent data bleeding');
                        
                        // Clear the stale data immediately
                        clearAllUserData();
                        localStorage.removeItem('tpprover_last_user_email');
                        
                        // Skip loading any data - let auth handler load fresh data
                        return;
                    }
                } catch (e) {
                    console.warn('⚠️ Could not parse user data during security check:', e);
                }
            }
            
            // Safe to load data - no user mismatch detected
            const savedProtocols = localStorage.getItem('tpprover_protocols');
            if (savedProtocols) setProtocols(migrateBlendedProtocolFrequencies(JSON.parse(savedProtocols)));

            const savedRecon = safeParseLocalStorage('tpprover_recon_items', []);
            if (savedRecon.length) setReconItems(savedRecon);
            
            const savedReconHistory = safeParseLocalStorage('tpprover_recon_history', []);
            if (savedReconHistory.length) setReconHistory(savedReconHistory);
            
            const savedSupplements = safeParseLocalStorage('tpprover_supplements', []);
            if (savedSupplements.length) setSupplements(savedSupplements);

            const savedOrders = localStorage.getItem('tpprover_orders');
            if (savedOrders) setOrders(ensurePublicOrderNumbers(JSON.parse(savedOrders)));

            const savedMetrics = localStorage.getItem('tpprover_metrics');
            if (savedMetrics) setMetrics(JSON.parse(savedMetrics));

            const savedVendors = localStorage.getItem('tpprover_vendors');
            if (savedVendors) setVendors(JSON.parse(savedVendors));
            
            const savedNotes = localStorage.getItem('tpprover_calendar_notes');
            if (savedNotes) {
                const parsed = JSON.parse(savedNotes);
                // Migrate old format to new ID-based format
                const migrated = migrateCalendarNotesToIdBased(parsed);
                setCalendarNotes(migrated);
                // Save migrated data back to localStorage
                try {
                    localStorage.setItem('tpprover_calendar_notes', JSON.stringify(migrated));
                } catch (e) {
                    console.error('Failed to save migrated calendar notes:', e);
                }
            }

            const savedStockpile = localStorage.getItem('tpprover_stockpile');
            if (savedStockpile) setStockpile(JSON.parse(savedStockpile));

            const savedScheduledBuys = localStorage.getItem('tpprover_scheduled_buys');
            if (savedScheduledBuys) {
                const parsed = JSON.parse(savedScheduledBuys);
                setScheduledBuys(parsed);
            }
        } catch (error) {
            console.error('❌ Failed to load localStorage data on mount:', error);
        } finally {
            // Clear flag after 500ms to allow welcome modal to check
            setTimeout(() => {
                sessionStorage.removeItem('tpp_initial_data_loading');
            }, 500);
        }
    }, []); // Run ONCE on mount, no dependencies
    
    // Listen for scheduledBuys updates from child components
    useEffect(() => {
        const handleScheduledBuysUpdate = (event) => {
            if (event.detail?.scheduledBuys) {
                console.log('📥 AppContext received scheduledBuys update event');
                console.log('📦 Data received:', JSON.parse(JSON.stringify(event.detail.scheduledBuys)));
                
                // CRITICAL: Mark that a local update just happened to prevent Firebase from overwriting
                const now = Date.now();
                lastLocalScheduledBuysUpdateRef.current = now;
                
                // Also persist to localStorage so it survives page refresh
                try {
                    localStorage.setItem('tpprover_scheduledBuys_lastUpdate', String(now));
                } catch (e) {
                    console.error('Failed to save scheduledBuys timestamp:', e);
                }
                
                // Ensure we're setting the complete data
                const newScheduledBuys = event.detail.scheduledBuys.map(buy => ({...buy}));
                setScheduledBuys(newScheduledBuys);
                
                console.log('✅ AppContext state updated with scheduledBuys');
                console.log('🔒 Firebase overwrite protection active for 15 seconds (survives refresh)');
            }
        };
        
        window.addEventListener('tpp:scheduled-buys-updated', handleScheduledBuysUpdate);
        
        return () => {
            window.removeEventListener('tpp:scheduled-buys-updated', handleScheduledBuysUpdate);
        };
    }, []);
    
    // Firebase sync integration
    const { firebaseUser, hasPassword, debouncedSync, loadFromFirebase, syncToFirebase } = useFirebase();

    // Load initial data from cloud storage
    useEffect(() => {
        const loadUserDataFromCloud = async () => {
            try {
                // CRITICAL: Don't interfere with active signup/login processes
                const signupInProgress = sessionStorage.getItem('tpp_signup_in_progress');
                const loginInProgress = sessionStorage.getItem('tpp_login_in_progress');
                if (signupInProgress === 'true' || loginInProgress === 'true') {
                    console.log('⏸️ Initial cloud load: Signup/login in progress, skipping');
                    return;
                }
                
                // CRITICAL: Check if demo data was just seeded (within last 15 seconds)
                // This prevents overwriting freshly seeded data with empty cloud data
                const hasSeededTimestamp = localStorage.getItem('tpprover_demo_seeded_at');
                if (hasSeededTimestamp) {
                    const seededAt = parseInt(hasSeededTimestamp, 10);
                    const timeSinceSeeded = Date.now() - seededAt;
                    if (timeSinceSeeded < 15000) { // 15 seconds
                        console.log(`⏸️ Initial cloud load: Demo data was just seeded ${Math.round(timeSinceSeeded/1000)}s ago, skipping to preserve it`);
                        return;
                    }
                }
                
                // Only load if we have a Firebase user
                if (!firebaseUser) {
                    return;
                }

                const userId = firebaseUser.uid;

                // Detect account switch and prevent data bleeding
                try {
                    const currentEmail = (firebaseUser.email || '').toLowerCase();
                    const lastEmail = (localStorage.getItem('tpprover_last_user_email') || '').toLowerCase();
                    
                    if (lastEmail && lastEmail !== currentEmail) {
                        console.log('🛡️ Account switch detected. Clearing local user data to prevent bleed.');
                        console.log(`  Previous user: ${lastEmail}`);
                        console.log(`  New user: ${currentEmail}`);
                        
                        // CRITICAL: Clear all user data AND React state immediately
                        clearAllUserData();
                        
                        // Clear React state to prevent UI from showing old data
                        setProtocols([]);
                        setReconItems([]);
                        setReconHistory([]);
                        setSupplements([]);
                        setOrders([]);
                        setMetrics([]);
                        setVendors([]);
                        setCalendarNotes({});
                        setStockpile([]);
                        setScheduledBuys([]);
                        setSubscription(null);
                        
                        // Ensure demo can seed for brand new account
                        try { localStorage.removeItem('tpprover_has_seeded'); } catch {}
                        try { localStorage.removeItem('tpprover_demo_data_cleared'); } catch {}
                        
                        console.log('✅ Account data cleared for new user (localStorage + React state)');
                    }
                    // Track current email for future comparisons
                    try { localStorage.setItem('tpprover_last_user_email', currentEmail); } catch {}
                } catch (e) {
                    console.warn('⚠️ Account switch check failed:', e);
                }

                // Check if user has data in cloud storage
                const hasCloudData = await hasUserData(userId);
                
                // Check user preferences from cloud storage
                const cloudPreferences = await loadUserPreferences(userId);
                const hasThemeInCloud = cloudPreferences?.theme;
                
                // Load notification/reminder settings from Firestore and merge with localStorage
                try {
                    const firestoreSettings = await loadNotificationSettingsFromFirestore();
                    if (firestoreSettings) {
                        // Get current localStorage settings
                        const currentSettings = loadSettings() || getDefaultSettings();
                        
                        // Merge Firestore settings with localStorage (Firestore takes precedence for notifications)
                        const mergedSettings = {
                            ...currentSettings,
                            notifications: {
                                ...currentSettings.notifications,
                                ...firestoreSettings.notifications
                            },
                            region: {
                                ...currentSettings.region,
                                ...firestoreSettings.region
                            }
                        };
                        
                        // Save merged settings back to localStorage
                        saveSettings(mergedSettings);
                    }
                } catch (settingsError) {
                    console.warn('⚠️ Failed to load notification settings from Firestore:', settingsError);
                    // Don't block app load if settings sync fails
                }
                
                // Check if this is a recently created account (within last 24 hours)
                // This catches accounts created just before the theme reset fix was deployed
                const savedUser = localStorage.getItem('tpprover_user');
                let isRecentlyCreated = false;
                if (savedUser) {
                    try {
                        const parsedUser = JSON.parse(savedUser);
                        if (parsedUser.createdAt) {
                            const createdAt = new Date(parsedUser.createdAt).getTime();
                            const hoursSinceCreation = (Date.now() - createdAt) / (1000 * 60 * 60);
                            isRecentlyCreated = hoursSinceCreation < 24; // Within last 24 hours
                        }
                    } catch (e) {
                        console.warn('⚠️ Failed to parse user createdAt:', e);
                    }
                }
                
                if (!hasCloudData) {
                    // New user - decide between migrating existing local data vs fresh demo seed
                    const currentEmail = (firebaseUser.email || '').toLowerCase();
                    const lastEmail = (localStorage.getItem('tpprover_last_user_email') || '').toLowerCase();

                    const hasLocalData = Object.keys(localStorage).some(key => 
                        key.startsWith('tpprover_') && 
                        !['tpprover_auth_token', 'tpprover_user', 'tpprover_last_user_email', 'tpprover_theme', 'tpprover_settings'].includes(key)
                    );

                    const canMigrateSafely = hasLocalData && lastEmail && lastEmail === currentEmail;

                    if (canMigrateSafely) {
                        console.log('🔄 Migrating existing local data for same account to cloud...');
                        await migrateLocalStorageToCloud(userId);
                        // Clear local cache after migration
                        clearLocalStorageData();
                    } else {
                        // Brand new user - reset theme to default (sage) for new accounts
                        console.log('🎨 New account detected - resetting theme to default (sage)');
                        try {
                            localStorage.setItem('tpprover_theme', defaultThemeName);
                            console.log('✅ Theme reset to default:', defaultThemeName);
                        } catch (error) {
                            console.error('❌ Failed to reset theme for new account:', error);
                        }
                        // Demo data is now seeded by Login.jsx directly to Firestore
                        // No need to seed here, just wait for data to load from cloud
                    }
                } else if (isRecentlyCreated && !hasThemeInCloud) {
                    // Account created recently (within 24 hours) but no theme in cloud storage
                    // This catches accounts created just before the fix was deployed
                    // Reset theme to default if it's not already sage
                    const currentTheme = localStorage.getItem('tpprover_theme');
                    if (currentTheme && currentTheme !== defaultThemeName) {
                        console.log('🎨 Recently created account detected without theme in cloud - resetting to default (sage)');
                        try {
                            localStorage.setItem('tpprover_theme', defaultThemeName);
                            console.log('✅ Theme reset to default for recently created account:', defaultThemeName);
                        } catch (error) {
                            console.error('❌ Failed to reset theme for recently created account:', error);
                        }
                    }
                }

                // Check for old recovery snapshots and clean up if data is safe in cloud
                try {
                    const existingSnapshot = localStorage.getItem('tpprover_recovery_snapshot');
                    if (existingSnapshot) {
                        const parsed = JSON.parse(existingSnapshot);
                        // If snapshot is marked as synced, check if 48h has passed
                        if (parsed.syncedToCloud && parsed.syncedAt) {
                            const timeSinceSync = Date.now() - new Date(parsed.syncedAt).getTime();
                            if (timeSinceSync > 48 * 60 * 60 * 1000) { // 48 hours
                                // Verify cloud still has data before deleting
                                const cloudCheck = await loadAppData(userId);
                                const hasCloudData = cloudCheck && (
                                    (cloudCheck.protocols?.length > 0) ||
                                    (cloudCheck.orders?.length > 0) ||
                                    (cloudCheck.stockpile?.length > 0)
                                );
                                if (hasCloudData) {
                                    localStorage.removeItem('tpprover_recovery_snapshot');
                                    console.log('🧹 Old recovery snapshot cleaned up on app load (data confirmed in cloud)');
                                }
                            }
                        }
                    }
                } catch (snapshotCheckError) {
                    console.warn('Failed to check recovery snapshot:', snapshotCheckError);
                }

                // Load app data from cloud
                const cloudAppData = await loadAppData(userId);

                // Always restore task completion / calendar pins from cloud when available.
                // Pins are stored in localStorage; after logout we clear it, so they must be
                // restored from cloud on re-login. Doing this here ensures pins come back even
                // when other cloud data is "empty" (isCloudEmpty would otherwise skip restore).
                if (cloudAppData) {
                    if (cloudAppData.taskCompletion != null) {
                        localStorage.setItem('tpprover_task_completion', JSON.stringify(cloudAppData.taskCompletion));
                    }
                    if (cloudAppData.calendarDone != null) {
                        localStorage.setItem('tpprover_calendar_done', JSON.stringify(cloudAppData.calendarDone));
                    }
                }

                // Check if data has been updated since last login
                if (cloudAppData && cloudAppData.lastUpdated) {
                    const lastLogin = localStorage.getItem('tpprover_last_login_timestamp');
                    const cloudLastUpdated = new Date(cloudAppData.lastUpdated).getTime();
                    const lastToastShown = localStorage.getItem('tpprover_update_toast_last_shown');
                    const now = Date.now();
                    const THIRTY_MINUTES = 30 * 60 * 1000; // 30 minutes in milliseconds
                    
                    let shouldShowToast = false;
                    
                    if (lastLogin) {
                        // Existing user - check if data is newer than last login
                        const lastLoginTime = parseInt(lastLogin, 10);
                        if (cloudLastUpdated > lastLoginTime) {
                            // Data has been updated - check 30-minute cooldown
                            shouldShowToast = !lastToastShown || 
                                (now - parseInt(lastToastShown, 10)) >= THIRTY_MINUTES;
                        }
                    } else {
                        // New login - always show toast if cloud data exists
                        shouldShowToast = true;
                    }
                    
                    if (shouldShowToast) {
                        // Small delay to ensure UI is ready
                        setTimeout(() => {
                            window.dispatchEvent(new CustomEvent('tpp:toast', { 
                                detail: { 
                                    message: 'Research has been updated since last login.', 
                                    type: 'success',
                                    duration: 4000
                                } 
                            }));
                            // Update the timestamp when toast is shown
                            localStorage.setItem('tpprover_update_toast_last_shown', now.toString());
                        }, 1000);
                    }
                    
                    // Update last login timestamp
                    localStorage.setItem('tpprover_last_login_timestamp', Date.now().toString());
                } else if (!cloudAppData) {
                    // First time login or no cloud data - set timestamp
                    localStorage.setItem('tpprover_last_login_timestamp', Date.now().toString());
                }
                
                // 🧹 Clean garbage serverTimestamp() sentinels from localStorage BEFORE merging
                // This MUST run before the initial merge so garbage timestamps don't cause
                // local data to incorrectly win over server data from other devices
                cleanupGarbageTimestamps();
                
                // Check if cloud data is actually empty (all arrays empty, no real data)
                const isCloudEmpty = cloudAppData && (
                    (!cloudAppData.protocols || cloudAppData.protocols.length === 0) &&
                    (!cloudAppData.orders || cloudAppData.orders.length === 0) &&
                    (!cloudAppData.stockpile || cloudAppData.stockpile.length === 0) &&
                    (!cloudAppData.vendors || cloudAppData.vendors.length === 0) &&
                    (!cloudAppData.reconItems || cloudAppData.reconItems.length === 0) &&
                    (!cloudAppData.supplements || cloudAppData.supplements.length === 0) &&
                    (!cloudAppData.metrics || cloudAppData.metrics.length === 0) &&
                    (!cloudAppData.scheduledBuys || cloudAppData.scheduledBuys.length === 0) &&
                    (!cloudAppData.wishlist || cloudAppData.wishlist.length === 0) &&
                    (!cloudAppData.userNotes || cloudAppData.userNotes.length === 0) &&
                    (!cloudAppData.userGoals || cloudAppData.userGoals.length === 0) &&
                    (!cloudAppData.waterTracker || Object.keys(cloudAppData.waterTracker).length === 0) &&
                    (!cloudAppData.calendarNotes || Object.keys(cloudAppData.calendarNotes).length === 0)
                );
                
                // Load from localStorage to check if we have local data
                const localProtocols = localStorage.getItem('tpprover_protocols');
                const localOrders = localStorage.getItem('tpprover_orders');
                const localStockpile = localStorage.getItem('tpprover_stockpile');
                const hasLocalData = localProtocols || localOrders || localStockpile;
                
                if (cloudAppData && !isCloudEmpty) {
                    // Cloud has real data - use it (with timestamp merging if local exists)
                    if (hasLocalData) {
                        // Get and merge deletion tracking first
                        const localDeletionTracking = getDeletionTracking();
                        const cloudDeletionTracking = cloudAppData.deletionTracking || {};
                        const mergedDeletionTracking = mergeDeletionTracking(localDeletionTracking, cloudDeletionTracking);
                        
                        // Restore merged deletion tracking to localStorage
                        try {
                            localStorage.setItem('tpprover_deletion_tracking', JSON.stringify(mergedDeletionTracking));
                        } catch (e) {
                            console.warn('⚠️ Failed to save merged deletion tracking:', e);
                        }
                        
                        // Merge cloud with local using timestamps to prevent data loss
                        const mergedProtocols = localProtocols ? mergeWithTimestamps(
                            JSON.parse(localProtocols),
                            cloudAppData.protocols || [],
                            'protocols',
                            mergedDeletionTracking.protocols
                        ) : (cloudAppData.protocols || []);
                        
                        const timeSinceProtocolsUpdateMerge = Date.now() - lastLocalProtocolsUpdateRef.current;
                        
                        const mergedOrders = localOrders ? mergeWithTimestamps(
                            ensurePublicOrderNumbers(JSON.parse(localOrders)),
                            cloudAppData.orders || [],
                            'orders',
                            mergedDeletionTracking.orders
                        ) : (cloudAppData.orders || []);
                        
                        const mergedStockpile = localStockpile ? mergeWithTimestamps(
                            JSON.parse(localStockpile),
                            cloudAppData.stockpile || [],
                            'stockpile',
                            mergedDeletionTracking.stockpile
                        ) : (cloudAppData.stockpile || []);
                        
                        if (timeSinceProtocolsUpdateMerge >= PROTECTION_WINDOW_MS) {
                            setProtocols(migrateBlendedProtocolFrequencies(mergedProtocols));
                        }
                        setOrders(mergedOrders);
                        setStockpile(mergedStockpile);
                        
                        // Merge other data types too
                        const localRecon = localStorage.getItem('tpprover_recon_items');
                        const localReconHistory = localStorage.getItem('tpprover_recon_history');
                        const localSupplements = localStorage.getItem('tpprover_supplements');
                        const localMetrics = localStorage.getItem('tpprover_metrics');
                        const localVendors = localStorage.getItem('tpprover_vendors');
                        const localScheduledBuys = localStorage.getItem('tpprover_scheduled_buys');
                                
                        if (localRecon) {
                            setReconItems(mergeWithTimestamps(
                                JSON.parse(localRecon),
                                cloudAppData.reconItems || [],
                                'reconItems',
                                mergedDeletionTracking.reconItems
                            ));
                        } else if (cloudAppData.reconItems) {
                            setReconItems(cloudAppData.reconItems);
                        }
                        
                        if (localReconHistory) {
                            setReconHistory(mergeWithTimestamps(
                                JSON.parse(localReconHistory),
                                cloudAppData.reconHistory || [],
                                'reconHistory',
                                mergedDeletionTracking.reconHistory
                            ));
                        } else if (cloudAppData.reconHistory) {
                            setReconHistory(cloudAppData.reconHistory);
                        }
                        
                        if (localSupplements) {
                            setSupplements(mergeWithTimestamps(
                                JSON.parse(localSupplements),
                                cloudAppData.supplements || [],
                                'supplements',
                                mergedDeletionTracking.supplements
                            ));
                        } else if (cloudAppData.supplements) {
                            setSupplements(cloudAppData.supplements);
                        }
                        
                        if (localMetrics) {
                            setMetrics(mergeWithTimestamps(
                                JSON.parse(localMetrics),
                                cloudAppData.metrics || [],
                                'metrics',
                                mergedDeletionTracking.metrics
                            ));
                        } else if (cloudAppData.metrics) {
                            setMetrics(cloudAppData.metrics);
                        }
                        
                        if (localVendors) {
                            setVendors(mergeWithTimestamps(
                                JSON.parse(localVendors),
                                cloudAppData.vendors || [],
                                'vendors',
                                mergedDeletionTracking.vendors
                            ));
                        } else if (cloudAppData.vendors) {
                            setVendors(cloudAppData.vendors);
                        }
                        
                        // Check unified protection window before merging scheduledBuys
                        const timeSinceScheduledBuysUpdate = Date.now() - lastLocalScheduledBuysUpdateRef.current;
                        if (timeSinceScheduledBuysUpdate < PROTECTION_WINDOW_MS && localScheduledBuys) {
                            // In protection window - prefer local data, skip merge
                            console.log('🔒 Initial load: Using local scheduledBuys (in unified protection window)');
                            setScheduledBuys(JSON.parse(localScheduledBuys));
                        } else if (localScheduledBuys) {
                            setScheduledBuys(mergeWithTimestamps(
                                JSON.parse(localScheduledBuys),
                                cloudAppData.scheduledBuys || [],
                                'scheduledBuys',
                                mergedDeletionTracking.scheduledBuys
                            ));
                        } else if (cloudAppData.scheduledBuys) {
                            setScheduledBuys(cloudAppData.scheduledBuys);
                        }
                        
                        // Protocol history - merge with timestamps
                        const localProtocolHistory = localStorage.getItem('tpprover_protocol_history');
                        if (localProtocolHistory) {
                            const mergedHistory = mergeWithTimestamps(
                                JSON.parse(localProtocolHistory),
                                cloudAppData.protocolHistory || [],
                                'protocolHistory',
                                mergedDeletionTracking.protocolHistory
                            );
                            localStorage.setItem('tpprover_protocol_history', JSON.stringify(mergedHistory));
                        } else if (cloudAppData.protocolHistory) {
                            localStorage.setItem('tpprover_protocol_history', JSON.stringify(cloudAppData.protocolHistory));
                        }
                        
                        // Stockpile history - merge with timestamps (synced cross-device)
                        const localStockpileHistory = localStorage.getItem('tpprover_stockpile_history');
                        if (localStockpileHistory) {
                            const mergedStockHistory = mergeWithTimestamps(
                                JSON.parse(localStockpileHistory),
                                cloudAppData.stockpileHistory || [],
                                'stockpileHistory',
                                mergedDeletionTracking.stockpileHistory
                            );
                            localStorage.setItem('tpprover_stockpile_history', JSON.stringify(mergedStockHistory));
                        } else if (cloudAppData.stockpileHistory) {
                            localStorage.setItem('tpprover_stockpile_history', JSON.stringify(cloudAppData.stockpileHistory));
                        }
                        
                        // Wishlist - merge with timestamps (synced cross-device)
                        const localWishlist = localStorage.getItem('tpprover_wishlist');
                        if (localWishlist) {
                            const mergedWishlist = mergeWithTimestamps(
                                JSON.parse(localWishlist),
                                cloudAppData.wishlist || [],
                                'wishlist',
                                mergedDeletionTracking.wishlist
                            );
                            localStorage.setItem('tpprover_wishlist', JSON.stringify(mergedWishlist));
                        } else if (cloudAppData.wishlist && cloudAppData.wishlist.length > 0) {
                            localStorage.setItem('tpprover_wishlist', JSON.stringify(cloudAppData.wishlist));
                        }
                        
                        // User notes - merge with timestamps
                        const localUserNotes = localStorage.getItem('tpprover_user_notes');
                        if (localUserNotes) {
                            const mergedUserNotes = mergeWithTimestamps(
                                JSON.parse(localUserNotes),
                                cloudAppData.userNotes || [],
                                'userNotes',
                                mergedDeletionTracking.userNotes
                            );
                            localStorage.setItem('tpprover_user_notes', JSON.stringify(mergedUserNotes));
                        } else if (cloudAppData.userNotes && cloudAppData.userNotes.length > 0) {
                            localStorage.setItem('tpprover_user_notes', JSON.stringify(cloudAppData.userNotes));
                        }
                        
                        // User goals - merge with timestamps
                        const localUserGoals = localStorage.getItem('tpprover_user_goals');
                        if (localUserGoals) {
                            const mergedUserGoals = mergeWithTimestamps(
                                JSON.parse(localUserGoals),
                                cloudAppData.userGoals || [],
                                'goals',
                                mergedDeletionTracking.goals
                            );
                            localStorage.setItem('tpprover_user_goals', JSON.stringify(mergedUserGoals));
                        } else if (cloudAppData.userGoals && cloudAppData.userGoals.length > 0) {
                            localStorage.setItem('tpprover_user_goals', JSON.stringify(cloudAppData.userGoals));
                        }
                        
                        // Water tracker - merge by date (newer lastUpdated wins)
                        const localWaterTracker = localStorage.getItem('tpprover_water_tracker');
                        if (localWaterTracker) {
                            try {
                                const mergedWater = mergeWaterTracker(
                                    JSON.parse(localWaterTracker),
                                    cloudAppData.waterTracker || {}
                                );
                                localStorage.setItem('tpprover_water_tracker', JSON.stringify(mergedWater));
                            } catch (e) {
                                if (cloudAppData.waterTracker && Object.keys(cloudAppData.waterTracker).length > 0) {
                                    localStorage.setItem('tpprover_water_tracker', JSON.stringify(cloudAppData.waterTracker));
                                }
                            }
                        } else if (cloudAppData.waterTracker && Object.keys(cloudAppData.waterTracker).length > 0) {
                            localStorage.setItem('tpprover_water_tracker', JSON.stringify(cloudAppData.waterTracker));
                        }
                        
                        // Calendar notes - merge objects
                        const localNotes = localStorage.getItem('tpprover_calendar_notes');
                        if (localNotes) {
                            const localNotesObj = migrateCalendarNotesToIdBased(JSON.parse(localNotes));
                            const cloudNotesObj = migrateCalendarNotesToIdBased(cloudAppData.calendarNotes || {});
                            setCalendarNotes({ ...cloudNotesObj, ...localNotesObj });
                        } else if (cloudAppData.calendarNotes) {
                            setCalendarNotes(migrateCalendarNotesToIdBased(cloudAppData.calendarNotes));
                        }
                        
                        // Task completion data - merge objects (prefer local for recent completions)
                        const localTaskCompletion = localStorage.getItem('tpprover_task_completion');
                        const localCalendarDone = localStorage.getItem('tpprover_calendar_done');
                        if (cloudAppData.taskCompletion || cloudAppData.calendarDone) {
                            // Merge cloud with local (local takes precedence)
                            if (localTaskCompletion) {
                                const localTaskData = JSON.parse(localTaskCompletion);
                                const cloudTaskData = cloudAppData.taskCompletion || {};
                                // Merge: cloud data as base, local data overwrites
                                const merged = { ...cloudTaskData };
                                Object.keys(localTaskData).forEach(date => {
                                    if (!merged[date]) merged[date] = {};
                                    Object.keys(localTaskData[date] || {}).forEach(timeSlot => {
                                        if (!merged[date][timeSlot]) merged[date][timeSlot] = {};
                                        merged[date][timeSlot] = {
                                            ...(merged[date][timeSlot] || {}),
                                            ...(localTaskData[date][timeSlot] || {})
                                        };
                                    });
                                });
                                localStorage.setItem('tpprover_task_completion', JSON.stringify(merged));
                            } else if (cloudAppData.taskCompletion) {
                                localStorage.setItem('tpprover_task_completion', JSON.stringify(cloudAppData.taskCompletion));
                            }
                            
                            if (localCalendarDone) {
                                const localDoneData = JSON.parse(localCalendarDone);
                                const cloudDoneData = cloudAppData.calendarDone || {};
                                const merged = { ...cloudDoneData, ...localDoneData };
                                localStorage.setItem('tpprover_calendar_done', JSON.stringify(merged));
                            } else if (cloudAppData.calendarDone) {
                                localStorage.setItem('tpprover_calendar_done', JSON.stringify(cloudAppData.calendarDone));
                            }
                        }
                } else {
                        // No local data, just use cloud
                    const timeSinceProtocolsNoLocal = Date.now() - lastLocalProtocolsUpdateRef.current;
                    if (cloudAppData.protocols && timeSinceProtocolsNoLocal >= PROTECTION_WINDOW_MS) {
                        setProtocols(migrateBlendedProtocolFrequencies(cloudAppData.protocols));
                    }
                    if (cloudAppData.reconItems) setReconItems(cloudAppData.reconItems);
                    if (cloudAppData.reconHistory) setReconHistory(cloudAppData.reconHistory);
                    if (cloudAppData.supplements) setSupplements(cloudAppData.supplements);
                    if (cloudAppData.orders) setOrders(cloudAppData.orders);
                    if (cloudAppData.metrics) setMetrics(cloudAppData.metrics);
                    if (cloudAppData.vendors) setVendors(cloudAppData.vendors);
                    if (cloudAppData.calendarNotes) setCalendarNotes(migrateCalendarNotesToIdBased(cloudAppData.calendarNotes));
                    if (cloudAppData.stockpile) setStockpile(cloudAppData.stockpile);
                        if (cloudAppData.scheduledBuys) setScheduledBuys(cloudAppData.scheduledBuys);
                        
                        // Restore protocol history from cloud (merge with local to respect deletions)
                        if (cloudAppData.protocolHistory) {
                            const localProtocolHist = safeParseLocalStorage('tpprover_protocol_history', []);
                            const mergedProtocolHist = mergeWithTimestamps(
                                localProtocolHist,
                                cloudAppData.protocolHistory,
                                'protocolHistory',
                                getDeletionTracking().protocolHistory
                            );
                            localStorage.setItem('tpprover_protocol_history', JSON.stringify(mergedProtocolHist));
                        }
                        // Restore stockpile history from cloud (merge with local to respect deletions)
                        if (cloudAppData.stockpileHistory && cloudAppData.stockpileHistory.length > 0) {
                            const localStockHist = safeParseLocalStorage('tpprover_stockpile_history', []);
                            const mergedStockHist = mergeWithTimestamps(
                                localStockHist,
                                cloudAppData.stockpileHistory,
                                'stockpileHistory',
                                getDeletionTracking().stockpileHistory
                            );
                            localStorage.setItem('tpprover_stockpile_history', JSON.stringify(mergedStockHist));
                        }
                        // Restore wishlist from cloud
                        if (cloudAppData.wishlist && cloudAppData.wishlist.length > 0) {
                            localStorage.setItem('tpprover_wishlist', JSON.stringify(cloudAppData.wishlist));
                        }
                        // Restore user notes, goals, water tracker from cloud
                        if (cloudAppData.userNotes && cloudAppData.userNotes.length > 0) {
                            localStorage.setItem('tpprover_user_notes', JSON.stringify(cloudAppData.userNotes));
                        }
                        if (cloudAppData.userGoals && cloudAppData.userGoals.length > 0) {
                            localStorage.setItem('tpprover_user_goals', JSON.stringify(cloudAppData.userGoals));
                        }
                        if (cloudAppData.waterTracker && Object.keys(cloudAppData.waterTracker).length > 0) {
                            localStorage.setItem('tpprover_water_tracker', JSON.stringify(cloudAppData.waterTracker));
                        }
                        
                        // Restore task completion data from cloud (merge with local to prevent data loss)
                        if (cloudAppData.taskCompletion) {
                            const localTaskCompletion = safeParseLocalStorage('tpprover_task_completion', {});
                            const merged = mergeTaskCompletion(localTaskCompletion, cloudAppData.taskCompletion);
                            localStorage.setItem('tpprover_task_completion', JSON.stringify(merged));
                        }
                        if (cloudAppData.calendarDone) {
                            const localCalendarDone = safeParseLocalStorage('tpprover_calendar_done', {});
                            const merged = mergeTaskCompletion(localCalendarDone, cloudAppData.calendarDone);
                            localStorage.setItem('tpprover_calendar_done', JSON.stringify(merged));
                        }
                    }
                } else if (hasLocalData) {
                    // Cloud is empty or doesn't exist, but we have local data - use local (RECOVERY)
                    console.log('🔄 Cloud data empty but local data found - recovering from localStorage');
                    console.log('🔄 This preserves user data that was saved locally but not synced to cloud');
                    
                    // Load all data from localStorage to preserve user's work
                    if (localProtocols) {
                        const parsed = migrateBlendedProtocolFrequencies(JSON.parse(localProtocols));
                        setProtocols(parsed);
                        console.log(`✅ Recovered ${parsed.length} protocols from localStorage`);
                    }

                    const savedRecon = localStorage.getItem('tpprover_recon_items');
                    if (savedRecon) {
                        const parsed = JSON.parse(savedRecon);
                        setReconItems(parsed);
                        console.log(`✅ Recovered ${parsed.length} recon items from localStorage`);
                    }
                    
                    const savedHistory = localStorage.getItem('tpprover_recon_history');
                    if (savedHistory) {
                        const parsed = JSON.parse(savedHistory);
                        setReconHistory(parsed);
                        console.log(`✅ Recovered ${parsed.length} recon history items from localStorage`);
                    }

                    const savedSupps = localStorage.getItem('tpprover_supplements');
                    if (savedSupps) {
                        const parsed = JSON.parse(savedSupps);
                        setSupplements(parsed);
                        console.log(`✅ Recovered ${parsed.length} supplements from localStorage`);
                    }

                    if (localOrders) {
                        const parsed = ensurePublicOrderNumbers(JSON.parse(localOrders));
                        setOrders(parsed);
                        console.log(`✅ Recovered ${parsed.length} orders from localStorage`);
                    }

                    const savedMetrics = localStorage.getItem('tpprover_metrics');
                    if (savedMetrics) {
                        const parsed = JSON.parse(savedMetrics);
                        setMetrics(parsed);
                        console.log(`✅ Recovered ${parsed.length} metrics from localStorage`);
                    }

                    const savedVendors = localStorage.getItem('tpprover_vendors');
                    if (savedVendors) {
                        const parsed = JSON.parse(savedVendors);
                        setVendors(parsed);
                        console.log(`✅ Recovered ${parsed.length} vendors from localStorage`);
                    }
                    
                    const savedNotes = localStorage.getItem('tpprover_calendar_notes');
                    if (savedNotes) {
                        const parsed = JSON.parse(savedNotes);
                        const migrated = migrateCalendarNotesToIdBased(parsed);
                        setCalendarNotes(migrated);
                        console.log(`✅ Recovered calendar notes from localStorage`);
                    }

                    if (localStockpile) {
                        const parsed = JSON.parse(localStockpile);
                        setStockpile(parsed);
                        console.log(`✅ Recovered ${parsed.length} stockpile items from localStorage`);
                    }

                    const savedScheduledBuys = localStorage.getItem('tpprover_scheduled_buys');
                    if (savedScheduledBuys) {
                        const parsed = JSON.parse(savedScheduledBuys);
                        setScheduledBuys(parsed);
                        console.log(`✅ Recovered ${parsed.length} scheduled buys from localStorage`);
                    }
                    
                    // CRITICAL: Create recovery snapshot BEFORE attempting sync
                    // This preserves data even if sync fails or corrupts something
                    const savedProtocolHistory = localStorage.getItem('tpprover_protocol_history');
                    const recoveredData = {
                        protocols: localProtocols ? JSON.parse(localProtocols) : [],
                        reconItems: savedRecon ? JSON.parse(savedRecon) : [],
                        reconHistory: savedHistory ? JSON.parse(savedHistory) : [],
                        supplements: savedSupps ? JSON.parse(savedSupps) : [],
                        orders: localOrders ? ensurePublicOrderNumbers(JSON.parse(localOrders)) : [],
                        metrics: savedMetrics ? JSON.parse(savedMetrics) : [],
                        vendors: savedVendors ? JSON.parse(savedVendors) : [],
                        calendarNotes: savedNotes ? JSON.parse(savedNotes) : {},
                        stockpile: localStockpile ? JSON.parse(localStockpile) : [],
                        scheduledBuys: savedScheduledBuys ? JSON.parse(savedScheduledBuys) : [],
                        protocolHistory: savedProtocolHistory ? JSON.parse(savedProtocolHistory) : []
                    };
                    
                    // Save recovery snapshot with timestamp
                    try {
                        const recoverySnapshot = {
                            data: recoveredData,
                            timestamp: new Date().toISOString(),
                            userId: userId,
                            reason: 'auto_recovery_from_empty_cloud'
                        };
                        localStorage.setItem('tpprover_recovery_snapshot', JSON.stringify(recoverySnapshot));
                        console.log('💾 Recovery snapshot saved before sync attempt');
                    } catch (snapshotError) {
                        console.error('❌ Failed to save recovery snapshot:', snapshotError);
                    }
                    
                    // CRITICAL: Force immediate sync to cloud to preserve this data
                    // This ensures the recovered data gets saved to cloud so it's available on other devices
                    setTimeout(async () => {
                        try {
                            console.log('🔄 Force syncing recovered data to cloud...');
                            
                            const syncResult = await saveAppData(userId, recoveredData, { skipMerge: true });
                            if (syncResult) {
                                console.log('✅ Recovered data successfully synced to cloud!');
                                
                                // Verify data is actually in cloud before deleting snapshot
                                setTimeout(async () => {
                                    try {
                                        const verifyCloudData = await loadAppData(userId);
                                        const hasRealCloudData = verifyCloudData && (
                                            (verifyCloudData.protocols?.length > 0) ||
                                            (verifyCloudData.orders?.length > 0) ||
                                            (verifyCloudData.stockpile?.length > 0) ||
                                            (verifyCloudData.vendors?.length > 0)
                                        );
                                        
                                        if (hasRealCloudData) {
                                            // Data is confirmed in cloud - safe to delete snapshot
                                            // But keep it for 48 hours as extra safety net
                                            const snapshot = localStorage.getItem('tpprover_recovery_snapshot');
                                            if (snapshot) {
                                                try {
                                                    const parsed = JSON.parse(snapshot);
                                                    // Mark snapshot as "synced" but keep for 48h
                                                    parsed.syncedToCloud = true;
                                                    parsed.syncedAt = new Date().toISOString();
                                                    localStorage.setItem('tpprover_recovery_snapshot', JSON.stringify(parsed));
                                                    console.log('✅ Snapshot marked as synced - will be cleaned up after 48h');
                                                    
                                                    // Clean up after 48 hours
                                                    setTimeout(() => {
                                                        const currentSnapshot = localStorage.getItem('tpprover_recovery_snapshot');
                                                        if (currentSnapshot) {
                                                            try {
                                                                const currentParsed = JSON.parse(currentSnapshot);
                                                                if (currentParsed.syncedToCloud && currentParsed.syncedAt) {
                                                                    const timeSinceSync = Date.now() - new Date(currentParsed.syncedAt).getTime();
                                                                    if (timeSinceSync > 48 * 60 * 60 * 1000) { // 48 hours
                                                                        localStorage.removeItem('tpprover_recovery_snapshot');
                                                                        console.log('🧹 Recovery snapshot cleaned up (data confirmed in cloud for 48h)');
                                                                    }
                                                                }
                                                            } catch (e) {
                                                                // Ignore cleanup errors
                                                            }
                                                        }
                                                    }, 48 * 60 * 60 * 1000);
                                                } catch (e) {
                                                    console.error('Failed to mark snapshot as synced:', e);
                                                }
                                            }
                                        } else {
                                            console.warn('⚠️ Sync reported success but cloud data not verified - keeping snapshot');
                                        }
                                    } catch (verifyError) {
                                        console.error('Failed to verify cloud data:', verifyError);
                                        // Keep snapshot if verification fails
                                    }
                                }, 3000); // Wait 3 seconds for cloud to update
                            } else {
                                console.error('❌ Failed to sync recovered data to cloud - snapshot preserved indefinitely');
                                // Snapshot stays forever until user manually recovers or sync succeeds
                            }
                        } catch (error) {
                            console.error('❌ Error syncing recovered data:', error);
                            console.error('💾 Recovery snapshot is still available in localStorage');
                    }
                    }, 2000); // Wait 2 seconds for state to settle
                } else {
                    // No data anywhere - new user
                    console.log('📭 No data found in cloud or localStorage');
                }

                // Load subscription from cloud
                const cloudSubscription = await loadUserSubscription(userId);
                if (cloudSubscription && !cloudSubscription.id?.includes('lab_access') && !cloudSubscription.id?.includes('demo') && !cloudSubscription.id?.includes('test') && cloudSubscription.status !== 'lab_access') {
                    setSubscription(cloudSubscription);
                }

                // 🩹 Retroactive data fixups — repair existing entries affected by past bugs.
                // Runs after merge so localStorage has the latest data; bumps updatedAt
                // on patched items so normal auto-sync pushes corrections to cloud.
                try {
                    const fixupResults = runDataFixups();
                    if (fixupResults.totalPatched > 0) {
                        console.log(`🩹 Data fixups applied: ${fixupResults.totalPatched} items repaired`);
                    }
                } catch (fixupError) {
                    console.warn('⚠️ Data fixups failed (non-fatal):', fixupError);
                }

                // 🔄 Run localStorage → cloud migrations (non-destructive)
                // This syncs any data that exists in localStorage but not yet in cloud
                setTimeout(async () => {
                    try {
                        await runAllMigrations({
                            saveAppData,
                            loadAppData,
                            firebaseUser
                        });
                    } catch (error) {
                        console.error('❌ Migration error:', error);
                        // Non-fatal - user can continue using app
                    }
                }, 3000); // Wait 3 seconds for initial data load to complete

                // Load user state from cloud (NO localStorage sync)
                const cloudUserState = await loadUserState(userId);
                if (cloudUserState) {
                    // User state is now ONLY in cloud, no localStorage sync
                }

            } catch (error) {
                console.error("❌ Error loading data from cloud storage:", error);
            }
        };

        loadUserDataFromCloud();

        // Listen to Firebase auth changes instead of just localStorage
        const unsubscribe = onAuthChange(async (firebaseUser) => {
            try {
            // CRITICAL: Don't interfere with active signup/login processes
            const signupInProgress = sessionStorage.getItem('tpp_signup_in_progress');
            const loginInProgress = sessionStorage.getItem('tpp_login_in_progress');
            if (signupInProgress === 'true' || loginInProgress === 'true') {
                console.log('⏸️ AppContext: Signup/login in progress, skipping auth change handling');
                return; // Let Login.jsx handle everything
            }
            
            if (firebaseUser) {
                // User is authenticated, load their profile from localStorage
                try {
                    // Declare parsedUser at function level so it's available throughout
                    let parsedUser = null;
                    
                    const savedUser = localStorage.getItem('tpprover_user');
                    if (savedUser) {
                        parsedUser = JSON.parse(savedUser);
                        setUser(parsedUser);
                        
                        // Check if user needs initial agreement data (for existing users only)
                        // Only run migration for users who don't have agreement data AND are not new signups
                        if (!hasAnyAgreementData()) {
                            // Check if this is a new signup by looking for recent user creation
                            const userCreatedAt = parsedUser.createdAt;
                            const isNewUser = userCreatedAt && (Date.now() - new Date(userCreatedAt).getTime()) < 60000; // Within last minute
                            
                            if (!isNewUser) {
                                console.log('📝 Creating initial agreement data for existing user');
                                try {
                                    // Get account creation date from Firebase user metadata or user object
                                    const accountCreationDate = firebaseUser?.metadata?.creationTime || parsedUser.createdAt;
                                    await createInitialAgreementsForExistingUser(parsedUser.email, accountCreationDate);
                                } catch (error) {
                                    console.error('Failed to create initial agreements:', error);
                                }
                            } else {
                                console.log('📝 New user detected, skipping migration - agreements should be recorded during signup');
                            }
                        }
                        
                        // CRITICAL SECURITY: Check if user changed and clear data if needed (case-insensitive)
                        const lastUserEmail = (localStorage.getItem('tpprover_last_user_email') || '').toLowerCase();
                        const currentEmail = (parsedUser.email || '').toLowerCase();
                        if (lastUserEmail && lastUserEmail !== currentEmail) {
                            console.log('🚨 SECURITY: User changed in auth listener!');
                            console.log('  Previous user:', lastUserEmail);
                            console.log('  Current user:', currentEmail);
                            
                            // Clear ALL user-specific data from localStorage
                            clearAllUserData();
                            verifyUserDataCleared();
                            
                            // CRITICAL: Also clear React state to prevent data bleeding in UI
                            console.log('🧹 Clearing React state for new user...');
                            setProtocols([]);
                            setReconItems([]);
                            setReconHistory([]);
                            setSupplements([]);
                            setOrders([]);
                            setMetrics([]);
                            setVendors([]);
                            setCalendarNotes({});
                            setStockpile([]);
                            setScheduledBuys([]);
                            setSubscription(null);
                            
                            console.log('✅ Confirmed: Account data cleared for new user (localStorage + React state)');
                        }
                        
                        // Update last user email (store lowercase for consistent comparison)
                        localStorage.setItem('tpprover_last_user_email', currentEmail);
                    } else {
                        // Create user profile if it doesn't exist
                        const userProfile = {
                            email: firebaseUser.email,
                            name: firebaseUser.email.split('@')[0],
                            uid: firebaseUser.uid
                        };
                        setUser(userProfile);
                        localStorage.setItem('tpprover_user', JSON.stringify(userProfile));
                        localStorage.setItem('tpprover_last_user_email', (userProfile.email || '').toLowerCase());
                        
                        // Set parsedUser for use below (CRITICAL: must be set before isNewUser check)
                        parsedUser = userProfile;
                        
                        // Check if user needs initial agreement data (for existing users only)
                        // Only run migration for users who don't have agreement data AND are not new signups
                        if (!hasAnyAgreementData()) {
                            // Check if this is a new signup by looking for recent user creation
                            const userCreatedAt = userProfile.createdAt;
                            const isNewUser = userCreatedAt && (Date.now() - new Date(userCreatedAt).getTime()) < 60000; // Within last minute
                            
                            if (!isNewUser) {
                                console.log('📝 Creating initial agreement data for existing user');
                                try {
                                    // Get account creation date from Firebase user metadata
                                    const accountCreationDate = firebaseUser?.metadata?.creationTime || userProfile.createdAt;
                                    await createInitialAgreementsForExistingUser(userProfile.email, accountCreationDate);
                                } catch (error) {
                                    console.error('Failed to create initial agreements:', error);
                                }
                            } else {
                                console.log('📝 New user detected, skipping migration - agreements should be recorded during signup');
                            }
                        }
                    }
                    
                    // Try to load data from Firebase if user has password set
                    // CRITICAL FIX: Also attempt sync if localStorage is empty (cache cleared scenario)
                    const hasEmptyLocalStorage = !localStorage.getItem('tpprover_protocols') || 
                                                safeParseLocalStorage('tpprover_protocols', []).length === 0;
                    
                    // CRITICAL: If user has empty localStorage but no password, they need to re-enter password
                    if (hasEmptyLocalStorage && !hasPassword) {
                        console.log('🔐 New device/browser detected - need password for data sync');
                        
                        // Show helpful message in console
                        
                        // Set a flag so the login page can show a helpful message
                        localStorage.setItem('tpp_need_password_for_sync', 'true');
                    }
                    
                    // CRITICAL FIX: Check if this is a brand new signup with demo data
                    // If demo data was just seeded, don't overwrite it with empty Firebase data!
                    const hasSeededDemoData = localStorage.getItem('tpprover_has_seeded') === 'true';
                    const isNewUser = parsedUser && parsedUser.createdAt && (Date.now() - new Date(parsedUser.createdAt).getTime()) < 60000; // Within last minute
                    
                    if (hasPassword || hasEmptyLocalStorage) {
                        try {
                            // CRITICAL: Skip Firebase sync for brand new users with demo data
                            // This prevents overwriting freshly seeded demo data with empty Firebase data
                            if (isNewUser && hasSeededDemoData && !hasEmptyLocalStorage) {
                                console.log('⏩ Skipping Firebase sync for new user with demo data');
                                console.log('   Demo data will be synced to cloud on next state change');
                                // Don't sync - let demo data remain in localStorage
                                // It will automatically sync to Firebase via the auto-sync useEffect
                            } else {
                                // CRITICAL FIX: Add timeout to prevent infinite loading
                                const firebaseDataPromise = loadFromFirebase();
                                const timeoutPromise = new Promise((_, reject) => 
                                    setTimeout(() => reject(new Error('Firebase sync timeout')), 10000)
                                );
                                
                                const firebaseData = await Promise.race([firebaseDataPromise, timeoutPromise]);
                                if (firebaseData) {
                                    // Load Firebase data if available, especially when localStorage is empty
                                    
                                    // Load Firebase data into state (Firebase takes precedence for authenticated users)
                                    // Skip protocols if we recently updated locally (e.g. just started a protocol)
                                    const timeSinceProtocolsUpdate = Date.now() - lastLocalProtocolsUpdateRef.current;
                                    if (timeSinceProtocolsUpdate >= PROTECTION_WINDOW_MS && firebaseData.protocols) {
                                        setProtocols(migrateBlendedProtocolFrequencies(firebaseData.protocols));
                                    }
                                    if (firebaseData.reconItems) setReconItems(firebaseData.reconItems);
                                    if (firebaseData.reconHistory) setReconHistory(firebaseData.reconHistory);
                                    
                                    // Clean up contaminated supplements from Firebase data
                                    let cleanedSupplements = firebaseData.supplements || [];
                                    if (firebaseData.supplements) {
                                        cleanedSupplements = firebaseData.supplements.filter(sup => {
                                            const isContaminated = sup.dose && (
                                                sup.dose.includes('Research dosages typically') ||
                                                sup.dose.includes('Clinical dosages range') ||
                                                sup.dose.includes('Investigational dosages') ||
                                                sup.dose.includes('mcg daily') ||
                                                sup.dose.includes('mg weekly') ||
                                                sup.name === '5-Amino-1MQ' ||
                                                sup.name === '5-AMINO-1MQ' ||
                                                sup.name === '5AMINO1MQ'
                                            );
                                            if (isContaminated) {
                                            }
                                            return !isContaminated;
                                        });
                                        setSupplements(cleanedSupplements);
                                    }
                                    if (firebaseData.orders) setOrders(firebaseData.orders);
                                    if (firebaseData.metrics) setMetrics(firebaseData.metrics);
                                    if (firebaseData.vendors) {
                                        // Migrate old 'group' category to 'groupbuy' for consistency
                                        const migratedVendors = firebaseData.vendors.map(vendor => {
                                            if (vendor.type === 'group') {
                                                return { ...vendor, type: 'groupbuy' };
                                            }
                                            return vendor;
                                        });
                                        setVendors(migratedVendors);
                                    }
                                    if (firebaseData.calendarNotes) setCalendarNotes(migrateCalendarNotesToIdBased(firebaseData.calendarNotes));
                                    if (firebaseData.stockpile) setStockpile(firebaseData.stockpile);
                                    if (firebaseData.scheduledBuys) {
                                        // Check if we recently made a local update (within last 15 seconds)
                                        // This protects local edits from being overwritten, even across page refreshes
                                        const timeSinceLocalUpdate = Date.now() - lastLocalScheduledBuysUpdateRef.current;
                                        if (timeSinceLocalUpdate < 15000) {
                                            console.log('⏸️ Skipping Firebase scheduledBuys update - recent local change detected (' + Math.round(timeSinceLocalUpdate/1000) + 's ago)');
                                            return;
                                        }
                                        
                                        // Filter out mock scheduled buys if sample data was cleared
                                        const sampleDataCleared = localStorage.getItem('tpprover_sample_data_cleared') === 'true';
                                        const filteredScheduledBuys = sampleDataCleared 
                                            ? firebaseData.scheduledBuys.filter(buy => !buy.isMock)
                                            : firebaseData.scheduledBuys;
                                        console.log('🔄 Firebase scheduledBuys update applied');
                                        setScheduledBuys(filteredScheduledBuys);
                                    }
                                    
                                    // CRITICAL: Update localStorage with Firebase data to prevent future data loss
                                    try {
                                        if (timeSinceProtocolsUpdate >= PROTECTION_WINDOW_MS) {
                                            localStorage.setItem('tpprover_protocols', JSON.stringify(firebaseData.protocols || []));
                                        }
                                        localStorage.setItem('tpprover_recon_items', JSON.stringify(firebaseData.reconItems || []));
                                        localStorage.setItem('tpprover_recon_history', JSON.stringify(firebaseData.reconHistory || []));
                                        localStorage.setItem('tpprover_supplements', JSON.stringify(cleanedSupplements || []));
                                        localStorage.setItem('tpprover_orders', JSON.stringify(firebaseData.orders || []));
                                        localStorage.setItem('tpprover_metrics', JSON.stringify(firebaseData.metrics || []));
                                        localStorage.setItem('tpprover_vendors', JSON.stringify(firebaseData.vendors || []));
                                        localStorage.setItem('tpprover_calendar_notes', JSON.stringify(firebaseData.calendarNotes || {}));
                                        localStorage.setItem('tpprover_stockpile', JSON.stringify(firebaseData.stockpile || []));
                                        
                                        // Merge injection history/stats from cloud and persist (pin history)
                                        if (firebaseData.injectionHistory || firebaseData.injectionStats) {
                                            const localHist = safeParseLocalStorage('tpprover_injection_history', []);
                                            const localStats = safeParseLocalStorage('tpprover_injection_stats', {});
                                            const mergedHist = mergeInjectionHistory(localHist, firebaseData.injectionHistory || []);
                                            const mergedStats = mergeInjectionStats(localStats, firebaseData.injectionStats || {});
                                            localStorage.setItem('tpprover_injection_history', JSON.stringify(mergedHist));
                                            localStorage.setItem('tpprover_injection_stats', JSON.stringify(mergedStats));
                                        }
                                        
                                        // Only backup scheduledBuys if not in unified protection window
                                        const timeSinceScheduledBuysUpdate = Date.now() - lastLocalScheduledBuysUpdateRef.current;
                                        if (timeSinceScheduledBuysUpdate >= PROTECTION_WINDOW_MS) {
                                            // Filter out mock scheduled buys when saving to localStorage if sample data was cleared
                                            const sampleDataCleared = localStorage.getItem('tpprover_sample_data_cleared') === 'true';
                                            const filteredScheduledBuys = sampleDataCleared && firebaseData.scheduledBuys
                                                ? firebaseData.scheduledBuys.filter(buy => !buy.isMock)
                                                : (firebaseData.scheduledBuys || []);
                                            localStorage.setItem('tpprover_scheduled_buys', JSON.stringify(filteredScheduledBuys));
                                        } else {
                                            console.log('🔒 Skipping localStorage backup for scheduledBuys - in protection window');
                                        }
                                    } catch (backupError) {
                                        console.error('❌ Failed to backup Firebase data to localStorage:', backupError);
                                    }
                                }
                            }
                        } catch (error) {
                            
                            // If Firebase sync failed and we have empty localStorage, provide recovery option
                            if (hasEmptyLocalStorage) {
                                console.warn('🚨 CRITICAL: Empty localStorage detected with failed Firebase sync!');
                                console.log('- window.recoverDataFromFirebase() - manual recovery function');
                                console.log('- Check if you need to re-enter your password');
                                
                                // Make recovery function globally available
                                window.recoverDataFromFirebase = async () => {
                                    try {
                                        const firebaseData = await loadFromFirebase();
                                        if (firebaseData) {
                                            window.location.reload();
                                        } else {
                                            console.error('❌ No data found in Firebase');
                                        }
                                    } catch (err) {
                                        console.error('❌ Manual recovery failed:', err);
                                    }
                                };
                                
                                // CRITICAL: Add emergency recovery for stuck loading
                                window.emergencyRecovery = () => {
                                    
                                    // Clear potentially corrupted auth state
                                    localStorage.removeItem('tpprover_auth_token');
                                    
                                    // Force reload to reset app state
                                    window.location.href = '/login';
                                };
                                
                                // Add data backup recovery
                                window.restoreDataBackup = () => {
                                    try {
                                        const backup = localStorage.getItem('tpprover_data_backup');
                                        if (backup) {
                                            const backupData = JSON.parse(backup);
                                            
                                            Object.keys(backupData).forEach(key => {
                                                if (backupData[key]) {
                                                    localStorage.setItem(key, JSON.stringify(backupData[key]));
                                                }
                                            });
                                            
                                            window.location.reload();
                                        } else {
                                        }
                                    } catch (err) {
                                        console.error('❌ Backup restore failed:', err);
                                    }
                                };
                                
                                // Make supplement cleanup function globally available
                                window.cleanupContaminatedSupplements = () => {
                                    try {
                                        const savedSupps = localStorage.getItem('tpprover_supplements');
                                        if (savedSupps) {
                                            const supplements = JSON.parse(savedSupps);
                                            const cleanedSupplements = supplements.filter(sup => {
                                                const isContaminated = sup.dose && (
                                                    sup.dose.includes('Research dosages typically') ||
                                                    sup.dose.includes('Clinical dosages range') ||
                                                    sup.dose.includes('Investigational dosages') ||
                                                    sup.dose.includes('mcg daily') ||
                                                    sup.dose.includes('mg weekly') ||
                                                    sup.name === '5-Amino-1MQ' ||
                                                    sup.name === '5-AMINO-1MQ' ||
                                                    sup.name === '5AMINO1MQ'
                                                );
                                                if (isContaminated) {
                                                }
                                                return !isContaminated;
                                            });
                                            localStorage.setItem('tpprover_supplements', JSON.stringify(cleanedSupplements));
                                            window.location.reload();
                                        } else {
                                        }
                                    } catch (err) {
                                        console.error('❌ Cleanup failed:', err);
                                    }
                                };
                            }
                        }
                    }
                    
                    // Mark initial load as complete
                    setIsInitialLoad(false);
                } catch (e) {
                    console.error("Failed to load user profile", e);
                    setUser(null);
                }
            } else {
                // User is not authenticated, clear everything
                isLoggingOutRef.current = true; // Prevent saveData/auto-sync from persisting empty state
                setUser(null);

                // Last-chance sync: push ALL user data to cloud before clearing.
                // When the app logs out spontaneously we don't run the intentional logout flow, so
                // we use the previous userId from localStorage and save any unsynced data now.
                try {
                    const prevUserRaw = localStorage.getItem('tpprover_user');
                    if (prevUserRaw) {
                        const prevUser = JSON.parse(prevUserRaw);
                        const userId = prevUser?.uid || prevUser?.id;
                        if (userId) {
                            // Build full userData payload from localStorage (same as auto-sync)
                            const toSave = {
                                protocols: safeParseLocalStorage('tpprover_protocols', []),
                                reconItems: safeParseLocalStorage('tpprover_recon_items', []),
                                reconHistory: safeParseLocalStorage('tpprover_recon_history', []),
                                supplements: safeParseLocalStorage('tpprover_supplements', []),
                                orders: safeParseLocalStorage('tpprover_orders', []),
                                metrics: safeParseLocalStorage('tpprover_metrics', []),
                                vendors: safeParseLocalStorage('tpprover_vendors', []),
                                calendarNotes: safeParseLocalStorage('tpprover_calendar_notes', {}),
                                stockpile: safeParseLocalStorage('tpprover_stockpile', []),
                                scheduledBuys: safeParseLocalStorage('tpprover_scheduled_buys', []),
                                taskCompletion: safeParseLocalStorage('tpprover_task_completion', {}),
                                calendarDone: safeParseLocalStorage('tpprover_calendar_done', {}),
                                protocolHistory: safeParseLocalStorage('tpprover_protocol_history', []),
                                wishlist: safeParseLocalStorage('tpprover_wishlist', []),
                                userNotes: safeParseLocalStorage('tpprover_user_notes', []),
                                userGoals: safeParseLocalStorage('tpprover_user_goals', []),
                                waterTracker: safeParseLocalStorage('tpprover_water_tracker', {}),
                                injectionHistory: safeParseLocalStorage('tpprover_injection_history', []),
                                injectionStats: safeParseLocalStorage('tpprover_injection_stats', {}),
                                stockpileHistory: safeParseLocalStorage('tpprover_stockpile_history', []),
                                deletionTracking: getDeletionTracking()
                            };
                            // Only sync if there's actual data (not all empty)
                            const hasData = Object.values(toSave).some(v =>
                                (Array.isArray(v) && v.length > 0) ||
                                (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length > 0)
                            );
                            if (hasData) {
                                await Promise.race([
                                    saveAppData(userId, toSave, { skipMerge: false }),
                                    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000))
                                ]).catch((err) => console.warn('⚠️ Last-chance full sync failed:', err));
                            }
                        }
                    }
                } catch (e) {
                    console.warn('⚠️ Last-chance full sync failed:', e);
                }

                // CRITICAL: Clear all auth-related data on logout
                localStorage.removeItem('tpprover_auth_token');
                localStorage.removeItem('tpprover_user');
                localStorage.removeItem('tpprover_last_user_email'); // Clear user tracking to prevent data bleeding

                // CRITICAL: Also clear all user data and React state to prevent bleeding
                clearAllUserData();
                setProtocols([]);
                setReconItems([]);
                setReconHistory([]);
                setSupplements([]);
                setOrders([]);
                setMetrics([]);
                setVendors([]);
                setCalendarNotes({});
                setStockpile([]);
                setScheduledBuys([]);
                setSubscription(null);
            }
        } catch (error) {
            console.error("Critical error in auth change handler:", error);
        } finally {
            // Don't override loading state for native apps (already handled above)
            if (!isNative()) {
                setIsLoading(false);
                setIsInitialLoad(false);
            } else {
            }
        }
        });

        // Sync data when app goes to background or tab is about to close.
        // Uses BOTH visibilitychange (reliable on web) AND Capacitor appStateChange
        // (reliable on iOS/Android native) to cover all platforms.
        const doBackgroundSync = () => {
            if (!firebaseUser || !hasPassword || isLoggingOutRef.current) return;
            try {
                const taskCompletion = safeParseLocalStorage('tpprover_task_completion', {});
                const calendarDone = safeParseLocalStorage('tpprover_calendar_done', {});
                const protocolHistory = safeParseLocalStorage('tpprover_protocol_history', []);
                const injectionHistory = safeParseLocalStorage('tpprover_injection_history', []);
                const injectionStats = safeParseLocalStorage('tpprover_injection_stats', {});
                const wishlist = safeParseLocalStorage('tpprover_wishlist', []);
                const userNotes = safeParseLocalStorage('tpprover_user_notes', []);
                const userGoals = safeParseLocalStorage('tpprover_user_goals', []);
                const waterTracker = safeParseLocalStorage('tpprover_water_tracker', {});
                const stockpileHistory = safeParseLocalStorage('tpprover_stockpile_history', []);
                const deletionTracking = getDeletionTracking();
                
                const userData = {
                    protocols, reconItems, reconHistory, supplements, orders,
                    metrics, vendors, calendarNotes, stockpile, scheduledBuys,
                    taskCompletion, calendarDone, protocolHistory,
                    injectionHistory, injectionStats,
                    wishlist, userNotes, userGoals, waterTracker,
                    stockpileHistory, deletionTracking
                };
                
                syncToFirebase(userData).catch(console.error);
            } catch (error) {
                console.error('Failed to sync on background:', error);
            }
        };

        // Web: visibilitychange fires when user switches tabs, minimizes, or closes
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') doBackgroundSync();
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Native (iOS/Android): Capacitor appStateChange fires reliably when app goes to background
        let capacitorListener = null;
        if (isNative()) {
            import('@capacitor/app').then(({ App }) => {
                App.addListener('appStateChange', ({ isActive }) => {
                    if (!isActive) doBackgroundSync();
                }).then(listener => {
                    capacitorListener = listener;
                });
            }).catch(() => {
                // Capacitor App plugin not available, visibilitychange will handle it
            });
        }

        return () => {
            if (unsubscribe) unsubscribe();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (capacitorListener) capacitorListener.remove();
        };
    }, [firebaseUser, hasPassword]); // Re-run when Firebase auth initializes or password becomes available to load cloud data

    // When wishlist, user notes, goals, or water tracker are updated (localStorage-only), trigger sync
    // Also retry sync when browser comes back online after a failed sync
    useEffect(() => {
        const bumpSync = (event) => {
            // Prevent cloud-echo loops: only local/user edits should trigger auto-sync bumps.
            if (event?.detail?.source === 'cloud-sync') return;
            setWishlistSyncTrigger((n) => n + 1);
        };
        const handleOnline = () => {
            // Only bump if there's a pending sync
            const pending = localStorage.getItem('tpprover_sync_pending');
            if (pending) {
                console.log('🌐 Back online with pending sync — retrying...');
                bumpSync();
            }
        };
        window.addEventListener('tpp:wishlist-updated', bumpSync);
        window.addEventListener('tpp:user-notes-updated', bumpSync);
        window.addEventListener('tpp:user-goals-updated', bumpSync);
        window.addEventListener('tpp:water-tracker-updated', bumpSync);
        window.addEventListener('tpp:stockpile-history-updated', bumpSync);
        window.addEventListener('online', handleOnline);
        return () => {
            window.removeEventListener('tpp:wishlist-updated', bumpSync);
            window.removeEventListener('tpp:user-notes-updated', bumpSync);
            window.removeEventListener('tpp:user-goals-updated', bumpSync);
            window.removeEventListener('tpp:water-tracker-updated', bumpSync);
            window.removeEventListener('tpp:stockpile-history-updated', bumpSync);
            window.removeEventListener('online', handleOnline);
        };
    }, []);

    // Auto-sync data to cloud storage when it changes (DEBOUNCED for efficiency)
    useEffect(() => {
        // Don't sync during initial load, remote updates, logout, or if user isn't authenticated
        if (isInitialLoad || isApplyingRemoteUpdateRef.current || isLoggingOutRef.current || !firebaseUser) {
            return;
        }
        
        // CRITICAL: Skip auto-sync until after initial Firestore load
        // This prevents stale localStorage cache from overwriting fresh cloud data
        // (e.g., phone opens with yesterday's cache, auto-saves before listener updates)
        if (!hasLoadedFromFirestoreRef.current) {
            return;
        }

        // Clear existing timer
        if (autoSyncTimerRef.current) {
            clearTimeout(autoSyncTimerRef.current);
        }

        // Start new debounce timer (500ms)
        autoSyncTimerRef.current = setTimeout(() => {
            // CRITICAL: Re-check guards at execution time (state may have changed during debounce)
            if (isLoggingOutRef.current || isApplyingRemoteUpdateRef.current) return;
            
            const userId = firebaseUser.uid;
            
            // Read ALL data fresh from localStorage at execution time, not from the
            // React state closure (which was captured when the useEffect fired).
            // localStorage is always up-to-date because saveData runs synchronously on state change.
            const userData = {
                protocols: safeParseLocalStorage('tpprover_protocols', []),
                reconItems: safeParseLocalStorage('tpprover_recon_items', []),
                reconHistory: safeParseLocalStorage('tpprover_recon_history', []),
                supplements: safeParseLocalStorage('tpprover_supplements', []),
                orders: safeParseLocalStorage('tpprover_orders', []),
                metrics: safeParseLocalStorage('tpprover_metrics', []),
                vendors: safeParseLocalStorage('tpprover_vendors', []),
                calendarNotes: safeParseLocalStorage('tpprover_calendar_notes', {}),
                stockpile: safeParseLocalStorage('tpprover_stockpile', []),
                scheduledBuys: safeParseLocalStorage('tpprover_scheduled_buys', []),
                taskCompletion: safeParseLocalStorage('tpprover_task_completion', {}),
                calendarDone: safeParseLocalStorage('tpprover_calendar_done', {}),
                deletionTracking: getDeletionTracking(),
                protocolHistory: safeParseLocalStorage('tpprover_protocol_history', []),
                wishlist: safeParseLocalStorage('tpprover_wishlist', []),
                userNotes: safeParseLocalStorage('tpprover_user_notes', []),
                userGoals: safeParseLocalStorage('tpprover_user_goals', []),
                waterTracker: safeParseLocalStorage('tpprover_water_tracker', {}),
                injectionHistory: safeParseLocalStorage('tpprover_injection_history', []),
                injectionStats: safeParseLocalStorage('tpprover_injection_stats', {}),
                stockpileHistory: safeParseLocalStorage('tpprover_stockpile_history', [])
            };
            
            // Only sync if we have some data to sync
            const hasData = Object.values(userData).some(data => 
                Array.isArray(data) ? data.length > 0 : Object.keys(data || {}).length > 0
            );
            
            if (hasData) {
                // Queue the sync operation to prevent overlaps
                addToSyncQueue(
                    async () => {
                        try {
                            const result = await saveAppData(userId, userData);
                            if (!result) {
                                throw new Error('saveAppData returned false');
                            }
                            
                            // Verify data is actually in cloud and update snapshot if exists
                            setTimeout(async () => {
                                try {
                                    const verifyCloudData = await loadAppData(userId);
                                    const hasRealCloudData = verifyCloudData && (
                                        (verifyCloudData.protocols?.length > 0) ||
                                        (verifyCloudData.orders?.length > 0) ||
                                        (verifyCloudData.stockpile?.length > 0) ||
                                        (verifyCloudData.vendors?.length > 0)
                                    );
                                    if (hasRealCloudData) {
                                        // If there's a recovery snapshot, mark it as synced
                                        const snapshot = localStorage.getItem('tpprover_recovery_snapshot');
                                        if (snapshot) {
                                            try {
                                                const parsed = JSON.parse(snapshot);
                                                parsed.syncedToCloud = true;
                                                parsed.syncedAt = new Date().toISOString();
                                                localStorage.setItem('tpprover_recovery_snapshot', JSON.stringify(parsed));
                                                console.log('✅ Recovery snapshot marked as synced after successful sync');
                                            } catch (e) {
                                                // Ignore snapshot update errors
                                            }
                                        }
                                    }
                                } catch (verifyError) {
                                    console.error('Failed to verify sync:', verifyError);
                                }
                            }, 3000);
                            
                            return result;
                        } catch (error) {
                            console.error('❌ Failed to save app data to cloud:', error);
                            // Retry once
                            try {
                                console.log('🔄 Retrying cloud sync...');
                                const retryResult = await saveAppData(userId, userData);
                                if (retryResult) {
                                    console.log('✅ Retry successful');
                                }
                                return retryResult;
                            } catch (retryError) {
                                console.error('❌ Retry also failed:', retryError);
                                throw retryError;
                            }
                        }
                    },
                    { type: 'auto-sync', userId, dataTypes: Object.keys(userData) }
                ).then(() => {
                    // Clear dirty flag on success
                    try { localStorage.removeItem('tpprover_sync_pending'); } catch (e) {}
                    // Notify other tabs that data was saved
                    try { window.dispatchEvent(new Event('tpp:sync-complete')); } catch (e) {}

                    // Create a visit backup once per session (fire-and-forget)
                    if (shouldCreateVisitBackup()) {
                        markVisitBackupDone();
                        saveCloudSnapshot(userId, userData, 'visit').catch(() => {});
                    }
                }).catch(error => {
                    // Already logged in the queue, just log final failure
                    console.error('❌ Auto-sync failed after retry:', error.message);
                    reportSyncError('sync_failed', { source: 'auto-sync' });
                    // Set dirty flag so next app load retries the sync
                    try { localStorage.setItem('tpprover_sync_pending', Date.now().toString()); } catch (e) {}
                });
                
                // Also sync to Firebase for backup (if user has password)
                if (hasPassword) {
                    debouncedSync(userData);
                }
            } else {
                // No data to sync - skip. Empty-init for new users is handled
                // by the initial Firestore load path, not the auto-sync.
                // SAFETY: Never push empty arrays to cloud from auto-sync, as
                // state may be temporarily empty during startup or logout.
                console.log('⏸️ Auto-sync: no data to sync, skipping');
            }
        }, AUTOSYNC_DEBOUNCE_MS);

        // Cleanup timer on unmount
        return () => {
            if (autoSyncTimerRef.current) {
                clearTimeout(autoSyncTimerRef.current);
            }
        };
    }, [protocols, reconItems, reconHistory, supplements, orders, metrics, vendors, calendarNotes, stockpile, scheduledBuys, wishlistSyncTrigger, firebaseUser, hasPassword]); // wishlistSyncTrigger: bump when wishlist (localStorage) changes

    // Retry sync when user taps "Tap to retry" in SyncStatusIndicator
    useEffect(() => {
        const handleRetrySync = () => {
            if (isLoggingOutRef.current || !firebaseUser?.uid) return;
            const userId = firebaseUser.uid;
            const userData = {
                protocols: safeParseLocalStorage('tpprover_protocols', []),
                reconItems: safeParseLocalStorage('tpprover_recon_items', []),
                reconHistory: safeParseLocalStorage('tpprover_recon_history', []),
                supplements: safeParseLocalStorage('tpprover_supplements', []),
                orders: safeParseLocalStorage('tpprover_orders', []),
                metrics: safeParseLocalStorage('tpprover_metrics', []),
                vendors: safeParseLocalStorage('tpprover_vendors', []),
                calendarNotes: safeParseLocalStorage('tpprover_calendar_notes', {}),
                stockpile: safeParseLocalStorage('tpprover_stockpile', []),
                scheduledBuys: safeParseLocalStorage('tpprover_scheduled_buys', []),
                taskCompletion: safeParseLocalStorage('tpprover_task_completion', {}),
                calendarDone: safeParseLocalStorage('tpprover_calendar_done', {}),
                deletionTracking: getDeletionTracking(),
                protocolHistory: safeParseLocalStorage('tpprover_protocol_history', []),
                wishlist: safeParseLocalStorage('tpprover_wishlist', []),
                userNotes: safeParseLocalStorage('tpprover_user_notes', []),
                userGoals: safeParseLocalStorage('tpprover_user_goals', []),
                waterTracker: safeParseLocalStorage('tpprover_water_tracker', {}),
                injectionHistory: safeParseLocalStorage('tpprover_injection_history', []),
                injectionStats: safeParseLocalStorage('tpprover_injection_stats', {}),
                stockpileHistory: safeParseLocalStorage('tpprover_stockpile_history', [])
            };
            addToSyncQueue(
                async () => {
                    const result = await saveAppData(userId, userData);
                    if (!result) throw new Error('saveAppData returned false');
                    return result;
                },
                { type: 'retry-sync', userId }
            ).then(() => {
                try { localStorage.removeItem('tpprover_sync_pending'); } catch (e) {}
                try { window.dispatchEvent(new Event('tpp:sync-complete')); } catch (e) {}
            }).catch(() => {});
        };
        window.addEventListener('tpp:retry-sync', handleRetrySync);
        return () => window.removeEventListener('tpp:retry-sync', handleRetrySync);
    }, [firebaseUser?.uid]);

    const logout = async () => {
        try {
            // CRITICAL: Set logout flag FIRST to prevent saveData/auto-sync from writing empty state
            isLoggingOutRef.current = true;
            
            // CRITICAL: Force immediate sync before logout to prevent data loss
            if (firebaseUser && hasPassword) {
                const injectionHistory = safeParseLocalStorage('tpprover_injection_history', []);
                const injectionStats = safeParseLocalStorage('tpprover_injection_stats', {});
                const taskCompletion = safeParseLocalStorage('tpprover_task_completion', {});
                const calendarDone = safeParseLocalStorage('tpprover_calendar_done', {});
                const userData = {
                    protocols,
                    reconItems,
                    reconHistory,
                    supplements,
                    orders,
                    metrics,
                    vendors,
                    calendarNotes,
                    stockpile,
                    scheduledBuys,
                    injectionHistory,
                    injectionStats,
                    taskCompletion,
                    calendarDone
                };

                // Use syncToFirebase directly (not debounced) for immediate sync
                await syncToFirebase(userData);
            }
            
            // Sign out from Firebase
            await logoutUser();
            
            // CRITICAL: Clear sync queue to prevent operations after logout
            clearSyncQueue();
            
            // CRITICAL: Clear ALL user-specific localStorage data
            clearAllUserData();
            
            // CRITICAL: Explicitly clear user tracking to prevent data bleeding
            localStorage.removeItem('tpprover_last_user_email');
            localStorage.removeItem('tpprover_user');
            localStorage.removeItem('tpprover_auth_token');
            
            // Reset Firestore load flag to prevent auto-save before next login's initial load
            hasLoadedFromFirestoreRef.current = false;
            
            verifyUserDataCleared();
            
            // Clear app state
            setUser(null);
            setProtocols([]);
            setReconItems([]);
            setReconHistory([]);
            setSupplements([]);
            setOrders([]);
            setMetrics([]);
            setVendors([]);
            setCalendarNotes({});
            setStockpile([]);
            setScheduledBuys([]);
            setSubscription(null);
            
            // Redirect to login
            window.location.href = '/login';
        } catch (error) {
            console.error('Logout failed:', error);
            // If Firebase logout fails, force clear everything manually
            clearAllUserData();
            setUser(null);
            window.location.href = '/login';
        }
    };

    // Persist data to localStorage whenever it changes
    const saveData = (key, data) => {
        try {
            // CRITICAL: Skip all writes during logout to prevent empty state from being persisted
            if (isLoggingOutRef.current) return;
            
            // CRITICAL SAFETY CHECK: Never save empty arrays that could overwrite existing data
            if (Array.isArray(data) && data.length === 0) {
                // Check if there's existing data in localStorage before overwriting with empty array
                const existingData = localStorage.getItem(key);
                if (existingData && existingData !== '[]') {
                    return;
                }
            }
            
            const sanitized = sanitizeForLocalStorage(data);
            localStorage.setItem(key, JSON.stringify(sanitized));
        } catch (error) {
            // Handle localStorage quota exceeded — critical for long-term users with lots of data
            if (error instanceof DOMException && (
                error.name === 'QuotaExceededError' ||
                error.code === 22 || // Legacy browsers
                error.code === 1014 // Firefox
            )) {
                console.error(`⚠️ localStorage QUOTA EXCEEDED saving ${key}. Attempting cleanup...`);
                
                // Try to free space by removing non-critical cached data
                const cleanupKeys = [
                    'tpprover_recovery_snapshot',     // Large snapshot, recoverable from cloud
                    'tpprover_last_cloud_data',       // Cached cloud data
                    'tpprover_demo_data_cleared',     // Flags
                    'tpprover_demo_banner_dismissed',
                    'tpprover_sample_data_cleared',
                ];
                let freedSpace = false;
                for (const cleanupKey of cleanupKeys) {
                    const item = localStorage.getItem(cleanupKey);
                    if (item && item.length > 100) {
                        localStorage.removeItem(cleanupKey);
                        freedSpace = true;
                    }
                }
                
                // Retry the save after cleanup
                if (freedSpace) {
                    try {
                        const sanitized = sanitizeForLocalStorage(data);
                        localStorage.setItem(key, JSON.stringify(sanitized));
                        console.log(`✅ Successfully saved ${key} after localStorage cleanup`);
                        return;
                    } catch (retryError) {
                        // Still failing — notify the user
                    }
                }
                
                // If we still can't save, warn the user
                window.dispatchEvent(new CustomEvent('tpp:toast', {
                    detail: {
                        message: 'This device is running low on storage. Your data is safely backed up. Try clearing some space on this device.',
                        type: 'warning',
                        duration: 8000
                    }
                }));
            } else {
                console.error(`Error saving ${key} to localStorage`, error);
            }
        }
    };

    useEffect(() => { saveData('tpprover_protocols', protocols) }, [protocols]);
    useEffect(() => { saveData('tpprover_recon_items', reconItems) }, [reconItems]);
    useEffect(() => { saveData('tpprover_recon_history', reconHistory) }, [reconHistory]);
    useEffect(() => { 
        saveData('tpprover_supplements', supplements);
    }, [supplements]);
    useEffect(() => { saveData('tpprover_orders', orders) }, [orders]);

    // MULTI-TAB COORDINATION: Use BroadcastChannel to notify other tabs when data changes.
    // When another tab saves data, this tab reloads fresh state from localStorage
    // to prevent two tabs from having divergent state that could overwrite each other.
    useEffect(() => {
        if (typeof BroadcastChannel === 'undefined') return; // Not supported in all browsers
        
        const channel = new BroadcastChannel('tpp_data_sync');
        
        // Listen for changes from other tabs
        const handleMessage = (event) => {
            if (event.data?.type === 'data-saved' && event.data?.sessionId !== sessionIdRef.current) {
                console.log('📡 BroadcastChannel: other tab saved data, reloading from localStorage');
                // Reload state-managed data from localStorage
                const freshProtocols = safeParseLocalStorage('tpprover_protocols', []);
                const freshReconItems = safeParseLocalStorage('tpprover_recon_items', []);
                const freshReconHistory = safeParseLocalStorage('tpprover_recon_history', []);
                const freshSupplements = safeParseLocalStorage('tpprover_supplements', []);
                const freshOrders = safeParseLocalStorage('tpprover_orders', []);
                const freshMetrics = safeParseLocalStorage('tpprover_metrics', []);
                const freshVendors = safeParseLocalStorage('tpprover_vendors', []);
                const freshCalendarNotes = safeParseLocalStorage('tpprover_calendar_notes', {});
                const freshStockpile = safeParseLocalStorage('tpprover_stockpile', []);
                const freshScheduledBuys = safeParseLocalStorage('tpprover_scheduled_buys', []);
                
                // Only update if the other tab actually has data (prevent blank overwrites)
                if (freshProtocols.length > 0 || freshOrders.length > 0 || freshStockpile.length > 0 || freshVendors.length > 0) {
                    isApplyingRemoteUpdateRef.current = true;
                    setProtocols(freshProtocols);
                    setReconItems(freshReconItems);
                    setReconHistory(freshReconHistory);
                    setSupplements(freshSupplements);
                    setOrders(freshOrders);
                    setMetrics(freshMetrics);
                    setVendors(freshVendors);
                    setCalendarNotes(freshCalendarNotes);
                    setStockpile(freshStockpile);
                    setScheduledBuys(freshScheduledBuys);
                    setTimeout(() => { isApplyingRemoteUpdateRef.current = false; }, 1000);
                }
            }
        };
        
        channel.addEventListener('message', handleMessage);
        
        // Notify other tabs when this tab saves data (hook into saveData)
        const originalSaveData = saveData;
        const notifyOtherTabs = () => {
            try {
                channel.postMessage({ type: 'data-saved', sessionId: sessionIdRef.current, timestamp: Date.now() });
            } catch (e) {
                // BroadcastChannel may be closed
            }
        };
        
        // Listen for the auto-sync completing to broadcast
        const handleSyncComplete = () => notifyOtherTabs();
        window.addEventListener('tpp:sync-complete', handleSyncComplete);
        
        return () => {
            channel.removeEventListener('message', handleMessage);
            window.removeEventListener('tpp:sync-complete', handleSyncComplete);
            channel.close();
        };
    }, []);

    // Global tracking sync - runs periodically to update order status from tracking
    useEffect(() => {
        // Only import and run tracking sync if we have orders
        if (!orders || orders.length === 0) return;

        let syncInterval;
        let isSyncing = false;
        const lastSyncRef = { time: 0 };

        const runTrackingSync = async () => {
            // Prevent concurrent syncs and throttle to at most once per 5 minutes
            const now = Date.now();
            if (isSyncing || (now - lastSyncRef.time) < 5 * 60 * 1000) return;

            isSyncing = true;
            lastSyncRef.time = now;

            try {
                // Dynamically import to avoid circular dependencies
                const { syncAllOrdersFromTracking } = await import('../utils/trackingStatusSync');
                const ordersWithTracking = orders.filter(o => o?.tracking && o.tracking.trim() !== '');
                
                if (ordersWithTracking.length === 0) return;

                const updatedOrders = await syncAllOrdersFromTracking(orders);

                if (updatedOrders.length > 0) {
                    // Update orders state - AppContext will handle saving
                    updatedOrders.forEach(updatedOrder => {
                        const originalOrder = orders.find(o => o.id === updatedOrder.id);
                        if (originalOrder && originalOrder.status !== updatedOrder.status) {
                            setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
                            
                            // Show toast notification
                            if (updatedOrder.status === 'Shipped') {
                                window.dispatchEvent(new CustomEvent('tpp:toast', { 
                                    detail: { 
                                        message: `🚚 Order #${updatedOrder.publicOrderNumber || updatedOrder.id} is now in transit!`, 
                                        type: 'info',
                                        duration: 4000
                                    } 
                                }));
                            } else if (updatedOrder.status === 'Delivered') {
                                window.dispatchEvent(new CustomEvent('tpp:toast', { 
                                    detail: { 
                                        message: `📦 Order #${updatedOrder.publicOrderNumber || updatedOrder.id} has been delivered!`, 
                                        type: 'success',
                                        duration: 5000
                                    } 
                                }));
                            }
                        }
                    });
                }
            } catch (error) {
                console.error('❌ Global tracking sync error:', error);
            } finally {
                isSyncing = false;
            }
        };

        // Run sync 10 seconds after mount, then every 10 minutes
        const initialTimeout = setTimeout(runTrackingSync, 10000);
        syncInterval = setInterval(runTrackingSync, 10 * 60 * 1000);

        return () => {
            clearTimeout(initialTimeout);
            if (syncInterval) clearInterval(syncInterval);
        };
    }, [orders, setOrders]);
    useEffect(() => { saveData('tpprover_metrics', metrics) }, [metrics]);
    useEffect(() => { saveData('tpprover_vendors', vendors) }, [vendors]);
    useEffect(() => { saveData('tpprover_calendar_notes', calendarNotes) }, [calendarNotes]);
    useEffect(() => { saveData('tpprover_stockpile', stockpile) }, [stockpile]);
    useEffect(() => { saveData('tpprover_scheduled_buys', scheduledBuys) }, [scheduledBuys]);

    // Define update functions
    const updateProtocol = (updatedProtocol) => {
        const index = protocols.findIndex(p => p.id === updatedProtocol.id);
        if (index > -1) {
            const newProtocols = [...protocols];
            newProtocols[index] = prepareItemForSave(updatedProtocol);
            setProtocols(newProtocols);
            
            // Dispatch event for Dashboard and Calendar to refresh their task calculations
            try {
                window.dispatchEvent(new CustomEvent('tpp:protocol-changed', { 
                    detail: { protocolId: updatedProtocol.id, timestamp: Date.now() } 
                }));
            } catch (e) {
                console.warn('⚠️ Failed to dispatch protocol-changed event:', e);
            }
            
            const now = Date.now();
            lastLocalProtocolsUpdateRef.current = now;
            try {
                localStorage.setItem('tpprover_protocols_lastUpdate', String(now));
                sessionStorage.setItem('tpprover_protocols_lastUpdate_session', sessionIdRef.current);
            } catch (e) {
                console.warn('⚠️ Failed to save protocols protection timestamp:', e);
            }
        }
    };

    /**
     * Update protocol AND force immediate cloud sync with skipMerge.
     * Use when starting a protocol to prevent real-time listener from overwriting with stale data.
     */
    const updateProtocolWithForceSync = async (updatedProtocol) => {
        const index = protocols.findIndex(p => p.id === updatedProtocol.id);
        if (index === -1) {
            console.warn('📋 [PROTOCOL-SYNC] updateProtocolWithForceSync: protocol not found', updatedProtocol.id);
            return;
        }
        const newProtocols = [...protocols];
        newProtocols[index] = prepareItemForSave(updatedProtocol);
        const activeCount = newProtocols.filter(p => p.active).length;
        setProtocols(newProtocols);
        
        // Dispatch event for Dashboard and Calendar to refresh their task calculations
        try {
            window.dispatchEvent(new CustomEvent('tpp:protocol-changed', { 
                detail: { protocolId: updatedProtocol.id, timestamp: Date.now() } 
            }));
        } catch (e) {
            console.warn('⚠️ Failed to dispatch protocol-changed event:', e);
        }
        
        const now = Date.now();
        lastLocalProtocolsUpdateRef.current = now;
        lastRemoteUpdateTimeRef.current = now;
        // Block auto-sync from firing a duplicate save while we force-sync
        isApplyingRemoteUpdateRef.current = true;
        try {
            localStorage.setItem('tpprover_protocols_lastUpdate', String(now));
            sessionStorage.setItem('tpprover_protocols_lastUpdate_session', sessionIdRef.current);
        } catch (e) {
            console.warn('⚠️ Failed to save protocols protection timestamp:', e);
        }
        if (firebaseUser) {
            try {
                const userId = firebaseUser.uid;
                // Only sync protocol-related data. saveAppData with merge:true
                // leaves all other Firestore fields (supplements, orders, etc.) untouched.
                const protocolHistory = safeParseLocalStorage('tpprover_protocol_history', []);
                const deletionTracking = getDeletionTracking();
                const appData = {
                    protocols: newProtocols,
                    protocolHistory: protocolHistory || [],
                    deletionTracking
                };
                // Use skipMerge: false to enable intelligent timestamp-based merging
                // This prevents conflicts when multiple devices save simultaneously
                const syncResult = await saveAppData(userId, appData, { skipMerge: false });
                if (syncResult) {
                    // Refresh skip window AFTER save completes to cover listener echoes
                    lastRemoteUpdateTimeRef.current = Date.now();
                } else {
                    console.error('📋 [PROTOCOL-SYNC] Force sync FAILED');
                }
            } catch (error) {
                console.error('📋 [PROTOCOL-SYNC] Force sync error:', error);
            }
        }
        // Release auto-sync block after enough time for listener echoes to settle
        setTimeout(() => {
            isApplyingRemoteUpdateRef.current = false;
        }, 3000);
    };
    
    const addProtocol = (newProtocol) => {
        const withTimestamp = prepareItemForSave(
            { ...newProtocol },
            { isNew: true }
        );
        setProtocols(prev => [withTimestamp, ...prev]);
        const now = Date.now();
        lastLocalProtocolsUpdateRef.current = now;
        try {
            localStorage.setItem('tpprover_protocols_lastUpdate', String(now));
            sessionStorage.setItem('tpprover_protocols_lastUpdate_session', sessionIdRef.current);
        } catch (e) {
            console.warn('⚠️ Failed to save protocols protection timestamp:', e);
        }
    }

    const deleteProtocol = async (protocolId) => {
        // Find the protocol being deleted for logging
        const protocolToDelete = protocols.find(p => p.id === protocolId);
        
        if (protocolToDelete) {
            console.log('🗑️ Deleting protocol:', protocolToDelete.name || 'Unknown');
        }
        
        // Record deletion with item snapshot for restore functionality
        if (protocolToDelete) {
            recordDeletion('protocols', protocolId, protocolToDelete);
        } else {
            recordDeletion('protocols', protocolId);
        }
        
        // Remove from local state
        const updatedProtocols = protocols.filter(p => p.id !== protocolId);
        setProtocols(updatedProtocols);
        const now = Date.now();
        lastLocalProtocolsUpdateRef.current = now;
        try {
            localStorage.setItem('tpprover_protocols_lastUpdate', String(now));
        } catch (e) {
            console.warn('⚠️ Failed to save protocols protection timestamp:', e);
        }
        
        // CRITICAL: Force immediate cloud sync with skipMerge to ensure deletion persists.
        // Only send protocol-related data. saveAppData with merge:true leaves all
        // other Firestore fields (supplements, orders, injections, etc.) untouched.
        if (firebaseUser) {
            try {
                const userId = firebaseUser.uid;
                const protocolHistory = safeParseLocalStorage('tpprover_protocol_history', []);
                const deletionTracking = getDeletionTracking();
                const appData = {
                    protocols: updatedProtocols,
                    protocolHistory: protocolHistory || [],
                    deletionTracking
                };
                
                // Force immediate sync with skipMerge to overwrite server protocol data
                const syncResult = await saveAppData(userId, appData, { skipMerge: true });
                if (syncResult) {
                    console.log('✅ Deleted protocol synced to cloud immediately');
                } else {
                    console.error('❌ Failed to sync deleted protocol to cloud');
                }
            } catch (error) {
                console.error('❌ Error syncing deleted protocol to cloud:', error);
                // Don't throw - the auto-sync will handle it
            }
        }
    }

    const addVendor = (newVendor) => {
        if (!newVendor) return;

        const hasMeaningfulDetails = (vendor) => {
            if (!vendor) return false;
            const hasContacts = Array.isArray(vendor.contacts) && vendor.contacts.some(c => c?.value && c.value.trim().length > 0);
            const hasNotes = !!(vendor.notes && vendor.notes.trim().length > 0);
            const hasLabels = Array.isArray(vendor.labels) && vendor.labels.length > 0;
            const hasPayments = vendor.payments && Object.values(vendor.payments).some(Boolean);
            const hasRating = typeof vendor.rating === 'number' && vendor.rating > 0;
            return hasContacts || hasNotes || hasLabels || hasPayments || hasRating;
        };

        setVendors(prev => {
            const list = Array.isArray(prev) ? prev : [];
            const normalizedName = (newVendor.name || '').trim().toLowerCase();

            const existingIndexById = newVendor.id != null
                ? list.findIndex(v => v && String(v.id) === String(newVendor.id))
                : -1;

            let existingIndex = existingIndexById;

            if (existingIndex === -1 && normalizedName) {
                existingIndex = list.findIndex(v => (v?.name || '').trim().toLowerCase() === normalizedName);
            }

            const targetId = newVendor.id != null
                ? newVendor.id
                : (existingIndex !== -1 && list[existingIndex]?.id != null
                    ? list[existingIndex].id
                    : generateId());

            if (existingIndex !== -1) {
                const existingVendor = list[existingIndex] || {};
                const mergedVendor = prepareItemForSave({
                    ...existingVendor,
                    ...newVendor,
                    id: existingVendor.id != null ? existingVendor.id : targetId,
                    createdAt: existingVendor.createdAt || new Date().toISOString()
                });
                if (newVendor.isStub === undefined) {
                    mergedVendor.isStub = !hasMeaningfulDetails(mergedVendor);
                }
                if (newVendor.needsCompletion === undefined) {
                    mergedVendor.needsCompletion = mergedVendor.isStub;
                }

                // CRITICAL: Update protection window timestamp to prevent real-time listener from overwriting
                lastLocalVendorsUpdateRef.current = Date.now();
                try {
                    localStorage.setItem('tpprover_vendors_lastUpdate', String(Date.now()));
                } catch (e) {
                    console.warn('⚠️ Failed to save vendors protection timestamp:', e);
                }

                return list.map((vendor, index) => index === existingIndex ? mergedVendor : vendor);
            }

            const createdVendor = prepareItemForSave(
                { ...newVendor, id: targetId },
                { isNew: true }
            );
            if (createdVendor.isStub === undefined) {
                createdVendor.isStub = !hasMeaningfulDetails(createdVendor);
            }
            if (createdVendor.needsCompletion === undefined) {
                createdVendor.needsCompletion = createdVendor.isStub;
            }

            // CRITICAL: Update protection window timestamp to prevent real-time listener from overwriting
            lastLocalVendorsUpdateRef.current = Date.now();
            try {
                localStorage.setItem('tpprover_vendors_lastUpdate', String(Date.now()));
            } catch (e) {
                console.warn('⚠️ Failed to save vendors protection timestamp:', e);
            }

            return [createdVendor, ...list];
        });
    };

    const updateVendor = (updatedVendor) => {
        const vendorWithTimestamp = prepareItemForSave(updatedVendor);
        
        // Update protection window timestamp to prevent real-time listener from overwriting
        lastLocalVendorsUpdateRef.current = Date.now();
        try {
            localStorage.setItem('tpprover_vendors_lastUpdate', String(Date.now()));
        } catch (e) {
            console.warn('⚠️ Failed to save vendors protection timestamp:', e);
        }
        
        setVendors(prev => prev.map(v => v.id === vendorWithTimestamp.id ? vendorWithTimestamp : v));
    };

    const deleteVendor = async (vendorId) => {
        if (vendorId == null) {
            console.error('🚨 SAFETY: Cannot delete vendor - no ID provided');
            return;
        }

        // Find the vendor being deleted for logging
        const list = Array.isArray(vendors) ? vendors : [];
        const targetId = String(vendorId);
        
        const vendorToDelete = list.find(vendor => {
            if (!vendor) return false;
            
            // Try multiple matching strategies
            const vendorIdStr = String(vendor.id);
            const vendorIdNum = Number(vendor.id);
            const targetIdNum = Number(vendorId);
            
            // Match by string comparison
            if (vendor.id != null && vendorIdStr === targetId) {
                return true;
            }
            
            // Match by number comparison
            if (vendor.id != null && !isNaN(vendorIdNum) && !isNaN(targetIdNum) && vendorIdNum === targetIdNum) {
                return true;
            }

            // Fallback: match stubs without IDs by normalized name
            if (vendor.id == null && typeof vendorId === 'object' && vendorId.name) {
                const nameA = (vendor.name || '').trim().toLowerCase();
                const nameB = (vendorId.name || '').trim().toLowerCase();
                if (nameA && nameA === nameB) {
                    return true;
                }
            }

            return false;
        });

        if (vendorToDelete) {
            console.log('🗑️ Deleting vendor:', vendorToDelete.name || 'Unknown');
            // Record deletion with item snapshot for restore functionality
            const vendorIdToRecord = vendorToDelete.id || vendorId;
            if (vendorIdToRecord) {
                recordDeletion('vendors', String(vendorIdToRecord), vendorToDelete);
            }
            
            // Clean up orphan vendorId references in orders and stockpile
            // Keep the vendor name string so display isn't broken, just clear the dead vendorId
            const deadVendorId = String(vendorIdToRecord);
            const vendorName = vendorToDelete.name || '';
            
            setOrders(prev => {
                const needsUpdate = prev.some(o => o.vendorId != null && String(o.vendorId) === deadVendorId);
                if (!needsUpdate) return prev;
                return prev.map(o => {
                    if (o.vendorId != null && String(o.vendorId) === deadVendorId) {
                        return prepareItemForSave({ ...o, vendorId: null, vendor: o.vendor || vendorName });
                    }
                    return o;
                });
            });
            
            setStockpile(prev => {
                const needsUpdate = prev.some(s => s.vendorId != null && String(s.vendorId) === deadVendorId);
                if (!needsUpdate) return prev;
                return prev.map(s => {
                    if (s.vendorId != null && String(s.vendorId) === deadVendorId) {
                        return prepareItemForSave({ ...s, vendorId: null, vendor: s.vendor || vendorName });
                    }
                    return s;
                });
            });
        }

        setVendors(prev => {
            const list = Array.isArray(prev) ? prev : [];
            const targetId = String(vendorId);
            
            console.log('🔍 Attempting to delete vendor:', vendorId);
            console.log('🔍 Current vendor list IDs:', list.map(v => ({ id: v?.id, name: v?.name })));

            const indexToRemove = list.findIndex(vendor => {
                if (!vendor) return false;
                
                // Try multiple matching strategies
                const vendorIdStr = String(vendor.id);
                const vendorIdNum = Number(vendor.id);
                const targetIdNum = Number(vendorId);
                
                // Match by string comparison
                if (vendor.id != null && vendorIdStr === targetId) {
                    console.log('✅ Match found by string ID:', vendor.id);
                    return true;
                }
                
                // Match by number comparison
                if (vendor.id != null && !isNaN(vendorIdNum) && !isNaN(targetIdNum) && vendorIdNum === targetIdNum) {
                    console.log('✅ Match found by number ID:', vendor.id);
                    return true;
                }

                // Fallback: match stubs without IDs by normalized name
                if (vendor.id == null && typeof vendorId === 'object' && vendorId.name) {
                    const nameA = (vendor.name || '').trim().toLowerCase();
                    const nameB = (vendorId.name || '').trim().toLowerCase();
                    if (nameA && nameA === nameB) {
                        console.log('✅ Match found by name:', vendor.name);
                        return true;
                    }
                }

                return false;
            });

            if (indexToRemove === -1) {
                console.warn('⚠️ SAFETY: Vendor not found for deletion:', vendorId);
                console.warn('⚠️ Available vendors:', list);
                return list;
            }

            console.log('✅ Deleting vendor at index:', indexToRemove, list[indexToRemove]);
            return list.filter((_, index) => index !== indexToRemove);
        });

        // CRITICAL: Force immediate cloud sync with skipMerge to ensure deletion persists
        // This prevents server data from restoring deleted items
        if (firebaseUser) {
            try {
                const userId = firebaseUser.uid;
                // Calculate updated vendors list (same logic as setState above)
                const currentList = Array.isArray(vendors) ? vendors : [];
                const updatedVendors = currentList.filter((vendor, index) => {
                    if (!vendor) return false;
                    
                    const vendorIdStr = String(vendor.id);
                    const vendorIdNum = Number(vendor.id);
                    const targetIdNum = Number(vendorId);
                    
                    // Match by string comparison
                    if (vendor.id != null && vendorIdStr === targetId) {
                        return false; // Exclude this vendor
                    }
                    
                    // Match by number comparison
                    if (vendor.id != null && !isNaN(vendorIdNum) && !isNaN(targetIdNum) && vendorIdNum === targetIdNum) {
                        return false; // Exclude this vendor
                    }
                    
                    // Fallback: match stubs without IDs by normalized name
                    if (vendor.id == null && typeof vendorId === 'object' && vendorId.name) {
                        const nameA = (vendor.name || '').trim().toLowerCase();
                        const nameB = (vendorId.name || '').trim().toLowerCase();
                        if (nameA && nameA === nameB) {
                            return false; // Exclude this vendor
                        }
                    }
                    
                    return true; // Keep this vendor
                });
                
                const appData = {
                    protocols: protocols || [],
                    reconItems: reconItems || [],
                    reconHistory: reconHistory || [],
                    supplements: supplements || [],
                    orders: orders || [],
                    metrics: metrics || [],
                    vendors: updatedVendors, // Use updated vendors with deletion
                    calendarNotes: calendarNotes || {},
                    stockpile: stockpile || [],
                    scheduledBuys: scheduledBuys || []
                };
                
                // Force immediate sync with skipMerge to overwrite server data
                const syncResult = await saveAppData(userId, appData, { skipMerge: true });
                if (syncResult) {
                    console.log('✅ Deleted vendor synced to cloud immediately');
                } else {
                    console.error('❌ Failed to sync deleted vendor to cloud');
                }
            } catch (error) {
                console.error('❌ Error syncing deleted vendor to cloud:', error);
                // Don't throw - the auto-sync will handle it
            }
        }
    };

    const addSupplement = (newSupplement) => {
        const supplementToAdd = prepareItemForSave(newSupplement, { isNew: !newSupplement.id });
        setSupplements(prev => [supplementToAdd, ...prev]);
        const now = Date.now();
        lastLocalSupplementsUpdateRef.current = now;
        try { localStorage.setItem('tpprover_supplements_lastUpdate', String(now)); } catch (e) { /* ignore */ }
    };

    const updateSupplement = async (updatedSupplement) => {
        // Handle delete flag - use deleteSupplement for proper cloud sync
        if (updatedSupplement._delete) {
            await deleteSupplement(updatedSupplement.id);
            return;
        }
        
        // Remove _delete flag if it exists and update normally
        const { _delete, ...cleanSupplement } = updatedSupplement;
        
        // Ensure the updated supplement has id and updatedAt for sync
        const supplementWithTimestamp = prepareItemForSave(cleanSupplement);
        
        // Update local state
        const updatedSupplements = supplements.map(s => s.id === supplementWithTimestamp.id ? supplementWithTimestamp : s);
        setSupplements(updatedSupplements);
        
        // CRITICAL: Set protection window to prevent real-time listener from overwriting our update
        const now = Date.now();
        lastLocalSupplementsUpdateRef.current = now;
        try {
            localStorage.setItem('tpprover_supplements_lastUpdate', String(now));
        } catch (e) { /* ignore */ }
        lastRemoteUpdateTimeRef.current = now;
        isApplyingRemoteUpdateRef.current = true;
        
        // CRITICAL: Force immediate cloud sync with skipMerge to ensure updates persist
        // This prevents the merge logic from preferring stale server data
        if (firebaseUser) {
            try {
                const userId = firebaseUser.uid;
                const appData = {
                    protocols: protocols || [],
                    reconItems: reconItems || [],
                    reconHistory: reconHistory || [],
                    supplements: updatedSupplements, // Use updated supplements with changes
                    orders: orders || [],
                    metrics: metrics || [],
                    vendors: vendors || [],
                    calendarNotes: calendarNotes || {},
                    stockpile: stockpile || [],
                    scheduledBuys: scheduledBuys || []
                };
                
                // Use skipMerge: false for timestamp-based merging
                const syncResult = await saveAppData(userId, appData, { skipMerge: false });
                if (syncResult) {
                    console.log('✅ Updated supplement synced to cloud with timestamp merge');
                } else {
                    console.error('❌ Failed to sync updated supplement to cloud');
                }
                
                // Reset flag after a delay to allow sync to complete
                setTimeout(() => {
                    isApplyingRemoteUpdateRef.current = false;
                }, 2000);
            } catch (error) {
                console.error('❌ Error syncing updated supplement to cloud:', error);
                isApplyingRemoteUpdateRef.current = false;
                // Don't throw - the auto-sync will handle it
            }
        } else {
            isApplyingRemoteUpdateRef.current = false;
        }
    };

    const deleteSupplement = async (supplementId) => {
        // Guard: Prevent simultaneous deletions of the same item
        if (deletingSupplementsRef.current.has(supplementId)) {
            console.log('⚠️ Supplement deletion already in progress for:', supplementId);
            return;
        }
        
        // Mark as in-progress
        deletingSupplementsRef.current.add(supplementId);
        
        // CRITICAL: Set protection window BEFORE deletion to block real-time listener from restoring
        const now = Date.now();
        lastLocalSupplementsUpdateRef.current = now;
        try {
            localStorage.setItem('tpprover_supplements_lastUpdate', String(now));
        } catch (e) { /* ignore */ }
        
        try {
            // Use functional state update to always work with latest state
            // This prevents race conditions when multiple deletions happen quickly
            let supplementToDelete = null;
            let updatedSupplements = null;
            
            setSupplements(prev => {
                // Find the supplement being deleted for logging
                supplementToDelete = prev.find(s => s.id === supplementId);
                
                if (supplementToDelete) {
                    console.log('🗑️ Deleting supplement:', supplementToDelete.name || 'Unknown');
                }
                
                // Record deletion with item snapshot for restore functionality
                if (supplementToDelete) {
                    recordDeletion('supplements', supplementId, supplementToDelete);
                } else {
                    recordDeletion('supplements', supplementId);
                }
                
                // Remove from state using functional update
                updatedSupplements = prev.filter(s => s.id !== supplementId);
                return updatedSupplements;
            });
            
            // Wait a brief moment to ensure state update completes
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // CRITICAL: Force immediate cloud sync with skipMerge to ensure deletion persists
            // This prevents server data from restoring deleted items
            if (firebaseUser && updatedSupplements !== null) {
                try {
                    const userId = firebaseUser.uid;
                    const appData = {
                        protocols: protocols || [],
                        reconItems: reconItems || [],
                        reconHistory: reconHistory || [],
                        supplements: updatedSupplements, // Use updated supplements with deletion
                        orders: orders || [],
                        metrics: metrics || [],
                        vendors: vendors || [],
                        calendarNotes: calendarNotes || {},
                        stockpile: stockpile || [],
                        scheduledBuys: scheduledBuys || []
                    };
                    
                    // Use skipMerge: false for timestamp-based merging with deletion tracking
                    const syncResult = await saveAppData(userId, appData, { skipMerge: false });
                    if (syncResult) {
                        console.log('✅ Deleted supplement synced to cloud with timestamp merge');
                    } else {
                        console.error('❌ Failed to sync deleted supplement to cloud');
                    }
                } catch (error) {
                    console.error('❌ Error syncing deleted supplement to cloud:', error);
                    // Don't throw - the auto-sync will handle it
                }
            }
        } finally {
            // Remove from in-progress set
            deletingSupplementsRef.current.delete(supplementId);
        }
    };

    // Legacy function for backward compatibility - replaces all notes for a date with single note
    const updateCalendarNote = (dateKey, text) => {
        setCalendarNotes(prev => replaceCalendarNotesForDate(prev, dateKey, text));
        const now = Date.now();
        lastLocalCalendarNotesUpdateRef.current = now;
        try { localStorage.setItem('tpprover_calendarNotes_lastUpdate', String(now)); } catch (e) { /* ignore */ }
    };

    // New ID-based note management functions
    const addCalendarNoteWithId = (dateKey, text) => {
        setCalendarNotes(prev => addCalendarNoteUtil(prev, dateKey, text));
        const now = Date.now();
        lastLocalCalendarNotesUpdateRef.current = now;
        try { localStorage.setItem('tpprover_calendarNotes_lastUpdate', String(now)); } catch (e) { /* ignore */ }
    };

    const updateCalendarNoteById = (dateKey, noteId, text) => {
        setCalendarNotes(prev => updateCalendarNoteUtil(prev, dateKey, noteId, text));
        const now = Date.now();
        lastLocalCalendarNotesUpdateRef.current = now;
        try { localStorage.setItem('tpprover_calendarNotes_lastUpdate', String(now)); } catch (e) { /* ignore */ }
    };

    const deleteCalendarNoteById = (dateKey, noteId) => {
        setCalendarNotes(prev => deleteCalendarNoteUtil(prev, dateKey, noteId));
        const now = Date.now();
        lastLocalCalendarNotesUpdateRef.current = now;
        try { localStorage.setItem('tpprover_calendarNotes_lastUpdate', String(now)); } catch (e) { /* ignore */ }
    };

    // Real-time cross-browser sync listener
    useEffect(() => {
        if (!firebaseUser) {
            return;
        }

        const userId = firebaseUser.uid;

        // Sample data state listener with debounce
        let sampleDataTimeoutId = null;
        const stateUnsubscribe = subscribeToUserState(userId, async (remoteState) => {
            try {
                if (!remoteState) return;
        
                // Prevent processing if we're already handling an update
                if (isApplyingRemoteUpdateRef.current) {
                    console.log('⏸️ Skipping sample data sync - already processing an update');
                    return;
                }

                // Debounce rapid-fire updates
                if (sampleDataTimeoutId) {
                    clearTimeout(sampleDataTimeoutId);
                }

                sampleDataTimeoutId = setTimeout(async () => {
        try {
                        const sampleDataClearedRemote = remoteState.sampleDataCleared === true || remoteState.demoDataCleared === true;
                        const remoteTimestampIso = remoteState.sampleDataClearedAt || remoteState.demoDataClearedAt || null;
                        const remoteTimestamp = remoteTimestampIso ? Date.parse(remoteTimestampIso) : 0;

                        const localFlag = localStorage.getItem('tpprover_sample_data_cleared') === 'true';
                        const localTimestampIso = localStorage.getItem('tpprover_sample_data_cleared_at');
                        const localTimestamp = localTimestampIso ? Date.parse(localTimestampIso) : 0;

                        // Only apply if remote is newer AND we're not already in sync
                        if (sampleDataClearedRemote && (!localFlag || remoteTimestamp > localTimestamp)) {
                            console.log('🔄 Remote sample data cleared detected - syncing locally');
                            isApplyingRemoteUpdateRef.current = true;
                            lastRemoteUpdateTimeRef.current = Date.now();
                            
                            try {
                                const { clearMockData } = await import('../utils/seed');
                                clearMockData();
                            } catch (error) {
                                console.error('❌ Failed to clear mock data:', error);
                            }

                            const timestampIso = remoteTimestampIso || new Date().toISOString();
                            localStorage.setItem('tpprover_sample_data_cleared', 'true');
                            localStorage.setItem('tpprover_sample_data_cleared_at', timestampIso);
                            localStorage.setItem('tpprover_sample_banner_dismissed', 'true');

                            // Reload fresh data from Firestore (source of truth) instead of localStorage
                            const freshData = await loadAppData(userId);
                            if (freshData) {
                                // Filter out ALL mock items since sample data was cleared
                                // CRITICAL: Still merge to protect any unsaved local changes
                                if (freshData.protocols) {
                                    const timeSinceProtocolsSample = Date.now() - lastLocalProtocolsUpdateRef.current;
                                    if (timeSinceProtocolsSample >= PROTECTION_WINDOW_MS) {
                                        const filtered = freshData.protocols.filter(p => !p.isMock);
                                        const localProtocols = protocols || [];
                                        const mergedProtocols = mergeWithTimestamps(
                                            localProtocols,
                                            filtered,
                                            'protocols',
                                            getDeletionTracking().protocols
                                        );
                                        setProtocols(migrateBlendedProtocolFrequencies(mergedProtocols));
                                    }
                                }
                                if (freshData.reconItems) {
                                    // Check skip window for reconItems
                                    const reconItemsLastUpdate = parseInt(localStorage.getItem('tpprover_reconItems_lastUpdate') || '0');
                                    const timeSinceReconUpdate = Date.now() - reconItemsLastUpdate;
                                    const RECON_SKIP_WINDOW_MS = 3000;
                                    
                                    if (timeSinceReconUpdate >= RECON_SKIP_WINDOW_MS) {
                                        const filtered = freshData.reconItems.filter(r => !r.isMock);
                                        // Merge with local reconItems instead of overwriting
                                        const localReconItems = reconItems || [];
                                        const mergedReconItems = mergeWithTimestamps(
                                            localReconItems,
                                            filtered,
                                            'reconItems',
                                            getDeletionTracking().reconItems
                                        );
                                        setReconItems(mergedReconItems);
                                    }
                                }
                                if (freshData.reconHistory) {
                                    // Check skip window for reconHistory too
                                    const reconItemsLastUpdate = parseInt(localStorage.getItem('tpprover_reconItems_lastUpdate') || '0');
                                    const timeSinceReconUpdate = Date.now() - reconItemsLastUpdate;
                                    const RECON_SKIP_WINDOW_MS = 3000;
                                    
                                    if (timeSinceReconUpdate >= RECON_SKIP_WINDOW_MS) {
                                        // Merge with local reconHistory instead of overwriting
                                        const localReconHistory = reconHistory || [];
                                        const mergedReconHistory = mergeWithTimestamps(
                                            localReconHistory,
                                            freshData.reconHistory,
                                            'reconHistory',
                                            getDeletionTracking().reconHistory
                                        );
                                        setReconHistory(mergedReconHistory);
                                    }
                                }
                                if (freshData.supplements) {
                                    const timeSinceSupplementsSample = Date.now() - lastLocalSupplementsUpdateRef.current;
                                    if (timeSinceSupplementsSample >= PROTECTION_WINDOW_MS) {
                                        const filtered = freshData.supplements.filter(s => !s.isMock);
                                        // Merge with local supplements instead of overwriting
                                        const localSupplements = supplements || [];
                                        const mergedSupplements = mergeWithTimestamps(
                                            localSupplements,
                                            filtered,
                                            'supplements',
                                            getDeletionTracking().supplements
                                        );
                                        setSupplements(mergedSupplements);
                                    }
                                }
                                if (freshData.orders) {
                                    const timeSinceOrdersSample = Date.now() - lastLocalOrdersUpdateRef.current;
                                    if (timeSinceOrdersSample >= PROTECTION_WINDOW_MS) {
                                        const filtered = freshData.orders.filter(o => !o.isMock);
                                        const localOrders = orders || [];
                                        const mergedOrders = mergeWithTimestamps(
                                            localOrders,
                                            filtered,
                                            'orders',
                                            getDeletionTracking().orders
                                        );
                                        setOrders(mergedOrders);
                                    }
                                }
                                if (freshData.metrics) {
                                    const timeSinceMetricsSample = Date.now() - lastLocalMetricsUpdateRef.current;
                                    if (timeSinceMetricsSample >= PROTECTION_WINDOW_MS) {
                                        const filtered = freshData.metrics.filter(m => !m.isMock);
                                        const localMetrics = metrics || [];
                                        const mergedMetrics = mergeWithTimestamps(
                                            localMetrics,
                                            filtered,
                                            'metrics',
                                            getDeletionTracking().metrics
                                        );
                                        setMetrics(mergedMetrics);
                                    } else {
                                        console.log('🔒 Skipping metrics update from sample-data listener - in protection window');
                                    }
                                }
                                if (freshData.vendors) {
                                    // Check unified protection window before applying vendor updates
                                    const timeSinceUpdate = Date.now() - lastLocalVendorsUpdateRef.current;
                                    if (timeSinceUpdate >= PROTECTION_WINDOW_MS) {
                                        const filtered = freshData.vendors.filter(v => !v.isMock);
                                        // Merge with local vendors instead of overwriting
                                        const localVendors = vendors || [];
                                        const mergedVendors = mergeWithTimestamps(
                                            localVendors,
                                            filtered,
                                            'vendors',
                                            getDeletionTracking().vendors
                                        );
                                        setVendors(mergedVendors);
                                    } else {
                                        console.log('🔒 Skipping vendors update from sample data clear - in protection window');
                                    }
                                }
                                // CRITICAL: Merge task completion data from cloud (needed for streak)
                                // Uses timestamp-aware per-task merge to prevent data loss
                                if (freshData.taskCompletion) {
                                    const timeSinceTaskUpdate = Date.now() - (parseInt(localStorage.getItem('tpprover_task_completion_lastUpdate'), 10) || 0);
                                    if (timeSinceTaskUpdate >= PROTECTION_WINDOW_MS) {
                                        const localTaskCompletion = safeParseLocalStorage('tpprover_task_completion', {});
                                        const merged = mergeTaskCompletion(localTaskCompletion, freshData.taskCompletion);
                                        localStorage.setItem('tpprover_task_completion', JSON.stringify(merged));
                                        window.dispatchEvent(new CustomEvent('tpp:task-completion-changed', {
                                            detail: { source: 'cloud-sync' }
                                        }));
                                    } else {
                                        console.log('🔒 Skipping taskCompletion update - in protection window');
                                    }
                                }
                                if (freshData.calendarDone) {
                                    const localCalendarDone = safeParseLocalStorage('tpprover_calendar_done', {});
                                    const merged = mergeTaskCompletion(localCalendarDone, freshData.calendarDone);
                                    localStorage.setItem('tpprover_calendar_done', JSON.stringify(merged));
                                }
                                // Merge injection history/stats from cloud (pin history)
                                if (freshData.injectionHistory || freshData.injectionStats) {
                                    const localHist = safeParseLocalStorage('tpprover_injection_history', []);
                                    const localStats = safeParseLocalStorage('tpprover_injection_stats', {});
                                    const mergedHist = mergeInjectionHistory(localHist, freshData.injectionHistory || []);
                                    const mergedStats = mergeInjectionStats(localStats, freshData.injectionStats || {});
                                    localStorage.setItem('tpprover_injection_history', JSON.stringify(mergedHist));
                                    localStorage.setItem('tpprover_injection_stats', JSON.stringify(mergedStats));
                                }
                                if (freshData.calendarNotes) {
                                    const timeSinceCalendarNotesSample = Date.now() - lastLocalCalendarNotesUpdateRef.current;
                                    if (timeSinceCalendarNotesSample >= PROTECTION_WINDOW_MS) {
                                        setCalendarNotes(migrateCalendarNotesToIdBased(freshData.calendarNotes));
                                    } else {
                                        console.log('🔒 Skipping calendarNotes update from sample-data listener - in protection window');
                                    }
                                }
                                if (freshData.stockpile) {
                                    const timeSinceStockpileSample = Date.now() - lastLocalStockpileUpdateRef.current;
                                    if (timeSinceStockpileSample >= PROTECTION_WINDOW_MS) {
                                        const filtered = freshData.stockpile.filter(s => !s.isMock);
                                        const localStockpile = stockpile || [];
                                        const mergedStockpile = mergeWithTimestamps(
                                            localStockpile,
                                            filtered,
                                            'stockpile',
                                            getDeletionTracking().stockpile
                                        );
                                        setStockpile(mergedStockpile);
                                    } else {
                                        console.log('🔒 Skipping stockpile update from sample-data listener - in protection window');
                                    }
                                }
                                if (freshData.scheduledBuys) {
                                    // Check unified protection window before applying
                                    const timeSinceUpdate = Date.now() - lastLocalScheduledBuysUpdateRef.current;
                                    if (timeSinceUpdate >= PROTECTION_WINDOW_MS) {
                                        const filtered = freshData.scheduledBuys.filter(buy => !buy.isMock);
                                        setScheduledBuys(filtered);
                                    } else {
                                        console.log('🔒 Skipping scheduledBuys update from sample data clear - in unified protection window');
                                    }
                                }
                                if (freshData.protocolHistory) {
                                    const filtered = freshData.protocolHistory.filter(h => !h.isMock);
                                    const localProtocolHist = safeParseLocalStorage('tpprover_protocol_history', []);
                                    const mergedProtocolHist = mergeWithTimestamps(
                                        localProtocolHist,
                                        filtered,
                                        'protocolHistory',
                                        getDeletionTracking().protocolHistory
                                    );
                                    localStorage.setItem('tpprover_protocol_history', JSON.stringify(mergedProtocolHist));
                                }
                                if (freshData.stockpileHistory) {
                                    const localStockHist = safeParseLocalStorage('tpprover_stockpile_history', []);
                                    const mergedStockHist = mergeWithTimestamps(
                                        localStockHist,
                                        freshData.stockpileHistory,
                                        'stockpileHistory',
                                        getDeletionTracking().stockpileHistory
                                    );
                                    localStorage.setItem('tpprover_stockpile_history', JSON.stringify(mergedStockHist));
                                }
                                if (freshData.userGoals) {
                                    const localGoals = safeParseLocalStorage('tpprover_user_goals', []);
                                    const mergedGoals = mergeWithTimestamps(localGoals, freshData.userGoals, 'goals', getDeletionTracking().goals);
                                    localStorage.setItem('tpprover_user_goals', JSON.stringify(mergedGoals));
                                    window.dispatchEvent(new CustomEvent('tpp:user-goals-updated', { detail: { goals: mergedGoals, source: 'cloud-sync' } }));
                                }
                                if (freshData.userNotes) {
                                    const localNotes = safeParseLocalStorage('tpprover_user_notes', []);
                                    const mergedNotes = mergeWithTimestamps(localNotes, freshData.userNotes, 'userNotes', getDeletionTracking().userNotes);
                                    localStorage.setItem('tpprover_user_notes', JSON.stringify(mergedNotes));
                                    window.dispatchEvent(new CustomEvent('tpp:user-notes-updated', { detail: { notes: mergedNotes, source: 'cloud-sync' } }));
                                }
                                if (freshData.wishlist) {
                                    const localWishlist = safeParseLocalStorage('tpprover_wishlist', []);
                                    const mergedWishlist = mergeWithTimestamps(localWishlist, freshData.wishlist, 'wishlist', getDeletionTracking().wishlist);
                                    localStorage.setItem('tpprover_wishlist', JSON.stringify(mergedWishlist));
                                    window.dispatchEvent(new CustomEvent('tpp:wishlist-updated', { detail: { wishlist: mergedWishlist, source: 'cloud-sync' } }));
                                }
                                if (freshData.waterTracker && Object.keys(freshData.waterTracker).length > 0) {
                                    const localWater = safeParseLocalStorage('tpprover_water_tracker', {});
                                    const mergedWater = mergeWaterTracker(localWater, freshData.waterTracker);
                                    localStorage.setItem('tpprover_water_tracker', JSON.stringify(mergedWater));
                                    window.dispatchEvent(new CustomEvent('tpp:water-tracker-updated', { detail: { waterData: mergedWater, source: 'cloud-sync' } }));
                                }
                            }
                            
                            setTimeout(() => {
                                isApplyingRemoteUpdateRef.current = false;
                            }, 2000); // Longer timeout to prevent re-triggering
                        }
                    } catch (error) {
                        console.error('❌ Error processing sample data sync:', error);
                        isApplyingRemoteUpdateRef.current = false;
                    }
                }, 500); // Debounce 500ms
            } catch (error) {
                console.error('❌ Error in sample data sync listener:', error);
                isApplyingRemoteUpdateRef.current = false;
            }
        });

        // App data listener (debounced to prevent rapid updates)
        let updateTimeoutId = null;
        const dataUnsubscribe = subscribeToAppData(userId, (remoteData) => {
            try {
                if (!remoteData) return;
                
                // Prevent processing if we're already handling an update
                if (isApplyingRemoteUpdateRef.current) {
                    return;
                }

                // UNIFIED SYNC: Debounce updates to prevent rapid-fire state changes (1 second)
                if (updateTimeoutId) {
                    clearTimeout(updateTimeoutId);
                }

                updateTimeoutId = setTimeout(async () => {
                    try {
                        const now = Date.now();
                        // UNIFIED SYNC: Prevent update loops with 5-second skip window
                        // Ignores listener echoes from our own saves (force-sync + auto-sync round-trip)
                        const timeSinceLastUpdate = now - lastRemoteUpdateTimeRef.current;
                        const SKIP_WINDOW_MS = 5000; // 5 seconds — covers force-sync + auto-sync echo
                        if (timeSinceLastUpdate < SKIP_WINDOW_MS) {
                            return;
                        }

                        lastRemoteUpdateTimeRef.current = now;
                        isApplyingRemoteUpdateRef.current = true;

                        // Reload from cloud storage
                        const freshData = await loadAppData(userId);
                const sampleDataCleared = localStorage.getItem('tpprover_sample_data_cleared') === 'true';
                        
                        if (freshData) {
                            // Filter out mock items if sample data was cleared
                            // CRITICAL: Merge all data types instead of overwriting to prevent data loss
                            if (freshData.protocols) {
                                // Check unified protection window before applying protocol updates
                                const timeSinceProtocolsUpdate = Date.now() - lastLocalProtocolsUpdateRef.current;
                                if (timeSinceProtocolsUpdate >= PROTECTION_WINDOW_MS) {
                                    const filtered = sampleDataCleared 
                                        ? freshData.protocols.filter(p => !p.isMock)
                                        : freshData.protocols;
                                    const localProtocols = protocols || [];
                                    const mergedProtocols = mergeWithTimestamps(
                                        localProtocols,
                                        filtered,
                                        'protocols',
                                        getDeletionTracking().protocols
                                    );
                                    setProtocols(migrateBlendedProtocolFrequencies(mergedProtocols));
                                }
                            }
                            if (freshData.reconItems) {
                                // Check if we just saved reconItems locally (skip window to prevent overwrites)
                                const reconItemsLastUpdate = parseInt(localStorage.getItem('tpprover_reconItems_lastUpdate') || '0');
                                const timeSinceReconUpdate = Date.now() - reconItemsLastUpdate;
                                const RECON_SKIP_WINDOW_MS = 1000; // 1 second
                                
                                if (timeSinceReconUpdate >= RECON_SKIP_WINDOW_MS) {
                                    const filtered = sampleDataCleared 
                                        ? freshData.reconItems.filter(r => !r.isMock)
                                        : freshData.reconItems;
                                    // Merge with local reconItems instead of overwriting
                                    const localReconItems = reconItems || [];
                                    const mergedReconItems = mergeWithTimestamps(
                                        localReconItems,
                                        filtered,
                                        'reconItems',
                                        getDeletionTracking().reconItems
                                    );
                                    setReconItems(mergedReconItems);
                                }
                            }
                            if (freshData.reconHistory) {
                                // Check skip window for reconHistory too
                                const reconItemsLastUpdate = parseInt(localStorage.getItem('tpprover_reconItems_lastUpdate') || '0');
                                const timeSinceReconUpdate = Date.now() - reconItemsLastUpdate;
                                const RECON_SKIP_WINDOW_MS = 1000;
                                
                                if (timeSinceReconUpdate >= RECON_SKIP_WINDOW_MS) {
                                    // Merge with local reconHistory instead of overwriting
                                    const localReconHistory = reconHistory || [];
                                    const mergedReconHistory = mergeWithTimestamps(
                                        localReconHistory,
                                        freshData.reconHistory,
                                        'reconHistory',
                                        getDeletionTracking().reconHistory
                                    );
                                    setReconHistory(mergedReconHistory);
                                }
                            }
                            if (freshData.supplements) {
                                // Check unified protection window before applying supplement updates
                                const timeSinceSupplementsUpdate = Date.now() - lastLocalSupplementsUpdateRef.current;
                                if (timeSinceSupplementsUpdate >= PROTECTION_WINDOW_MS) {
                                    const filtered = sampleDataCleared 
                                        ? freshData.supplements.filter(s => !s.isMock)
                                        : freshData.supplements;
                                    // Merge with local supplements instead of overwriting
                                    const localSupplements = supplements || [];
                                    const mergedSupplements = mergeWithTimestamps(
                                        localSupplements,
                                        filtered,
                                        'supplements',
                                        getDeletionTracking().supplements
                                    );
                                    setSupplements(mergedSupplements);
                                }
                            }
                            if (freshData.orders) {
                                const timeSinceOrdersUpdate = Date.now() - lastLocalOrdersUpdateRef.current;
                                if (timeSinceOrdersUpdate >= PROTECTION_WINDOW_MS) {
                                    const filtered = sampleDataCleared 
                                        ? freshData.orders.filter(o => !o.isMock)
                                        : freshData.orders;
                                    const localOrders = orders || [];
                                    const mergedOrders = mergeWithTimestamps(
                                        localOrders,
                                        filtered,
                                        'orders',
                                        getDeletionTracking().orders
                                    );
                                    setOrders(mergedOrders);
                                }
                            }
                            if (freshData.metrics) {
                                const timeSinceMetricsUpdate = Date.now() - lastLocalMetricsUpdateRef.current;
                                if (timeSinceMetricsUpdate >= PROTECTION_WINDOW_MS) {
                                    const filtered = sampleDataCleared 
                                        ? freshData.metrics.filter(m => !m.isMock)
                                        : freshData.metrics;
                                    const localMetrics = metrics || [];
                                    const mergedMetrics = mergeWithTimestamps(
                                        localMetrics,
                                        filtered,
                                        'metrics',
                                        getDeletionTracking().metrics
                                    );
                                    setMetrics(mergedMetrics);
                                }
                            }
                            if (freshData.vendors) {
                                // Check unified protection window before applying vendor updates
                                const timeSinceUpdate = Date.now() - lastLocalVendorsUpdateRef.current;
                                if (timeSinceUpdate >= PROTECTION_WINDOW_MS) {
                                    const filtered = sampleDataCleared 
                                        ? freshData.vendors.filter(v => !v.isMock)
                                        : freshData.vendors;
                                    // Merge with local vendors instead of overwriting
                                    const localVendors = vendors || [];
                                    const mergedVendors = mergeWithTimestamps(
                                        localVendors,
                                        filtered,
                                        'vendors',
                                        getDeletionTracking().vendors
                                    );
                                    setVendors(mergedVendors);
                                } else {
                                    console.log('🔒 Skipping vendors update from remote sync - in protection window');
                                }
                            }
                            if (freshData.calendarNotes) {
                                const timeSinceCalendarNotesUpdate = Date.now() - lastLocalCalendarNotesUpdateRef.current;
                                if (timeSinceCalendarNotesUpdate >= PROTECTION_WINDOW_MS) {
                                    setCalendarNotes(migrateCalendarNotesToIdBased(freshData.calendarNotes));
                                } else {
                                    console.log('🔒 Skipping calendarNotes update from remote sync - in protection window');
                                }
                            }
                            if (freshData.stockpile) {
                                const timeSinceStockpileUpdate = Date.now() - lastLocalStockpileUpdateRef.current;
                                if (timeSinceStockpileUpdate >= PROTECTION_WINDOW_MS) {
                                    const filtered = sampleDataCleared 
                                        ? freshData.stockpile.filter(s => !s.isMock)
                                        : freshData.stockpile;
                                    const localStockpile = stockpile || [];
                                    const mergedStockpile = mergeWithTimestamps(
                                        localStockpile,
                                        filtered,
                                        'stockpile',
                                        getDeletionTracking().stockpile
                                    );
                                    setStockpile(mergedStockpile);
                                } else {
                                    console.log('🔒 Skipping stockpile update from remote sync - in protection window');
                                }
                            }
                            if (freshData.scheduledBuys) {
                                // Check unified protection window before applying
                                const timeSinceUpdate = Date.now() - lastLocalScheduledBuysUpdateRef.current;
                                if (timeSinceUpdate >= PROTECTION_WINDOW_MS) {
                                    const filtered = sampleDataCleared 
                                        ? freshData.scheduledBuys.filter(buy => !buy.isMock)
                                        : freshData.scheduledBuys;
                                    setScheduledBuys(filtered);
                                } else {
                                    console.log('🔒 Skipping scheduledBuys from remote update - in unified protection window');
                                }
                            }
                            if (freshData.protocolHistory) {
                                const filtered = sampleDataCleared 
                                    ? freshData.protocolHistory.filter(h => !h.isMock)
                                    : freshData.protocolHistory;
                                const localProtocolHist = safeParseLocalStorage('tpprover_protocol_history', []);
                                const mergedProtocolHist = mergeWithTimestamps(
                                    localProtocolHist,
                                    filtered,
                                    'protocolHistory',
                                    getDeletionTracking().protocolHistory
                                );
                                localStorage.setItem('tpprover_protocol_history', JSON.stringify(mergedProtocolHist));
                            }
                            // Merge stockpile history from cloud
                            if (freshData.stockpileHistory) {
                                const localStockHistory = safeParseLocalStorage('tpprover_stockpile_history', []);
                                const mergedStockHistory = mergeWithTimestamps(
                                    localStockHistory,
                                    freshData.stockpileHistory || [],
                                    'stockpileHistory',
                                    getDeletionTracking().stockpileHistory
                                );
                                localStorage.setItem('tpprover_stockpile_history', JSON.stringify(mergedStockHistory));
                            }
                            // Merge user goals from cloud (cross-device sync)
                            if (freshData.userGoals) {
                                const localGoals = safeParseLocalStorage('tpprover_user_goals', []);
                                const mergedGoals = mergeWithTimestamps(localGoals, freshData.userGoals, 'goals', getDeletionTracking().goals);
                                localStorage.setItem('tpprover_user_goals', JSON.stringify(mergedGoals));
                                window.dispatchEvent(new CustomEvent('tpp:user-goals-updated', { detail: { goals: mergedGoals, source: 'cloud-sync' } }));
                            }
                            // Merge user notes from cloud (cross-device sync)
                            if (freshData.userNotes) {
                                const localNotes = safeParseLocalStorage('tpprover_user_notes', []);
                                const mergedNotes = mergeWithTimestamps(localNotes, freshData.userNotes, 'userNotes', getDeletionTracking().userNotes);
                                localStorage.setItem('tpprover_user_notes', JSON.stringify(mergedNotes));
                                window.dispatchEvent(new CustomEvent('tpp:user-notes-updated', { detail: { notes: mergedNotes, source: 'cloud-sync' } }));
                            }
                            // Merge wishlist from cloud (cross-device sync)
                            if (freshData.wishlist) {
                                const localWishlist = safeParseLocalStorage('tpprover_wishlist', []);
                                const mergedWishlist = mergeWithTimestamps(localWishlist, freshData.wishlist, 'wishlist', getDeletionTracking().wishlist);
                                localStorage.setItem('tpprover_wishlist', JSON.stringify(mergedWishlist));
                                window.dispatchEvent(new CustomEvent('tpp:wishlist-updated', { detail: { wishlist: mergedWishlist, source: 'cloud-sync' } }));
                            }
                            // Merge water tracker from cloud (cross-device sync)
                            if (freshData.waterTracker && Object.keys(freshData.waterTracker).length > 0) {
                                const localWater = safeParseLocalStorage('tpprover_water_tracker', {});
                                const mergedWater = mergeWaterTracker(localWater, freshData.waterTracker);
                                localStorage.setItem('tpprover_water_tracker', JSON.stringify(mergedWater));
                                window.dispatchEvent(new CustomEvent('tpp:water-tracker-updated', { detail: { waterData: mergedWater, source: 'cloud-sync' } }));
                            }
                            // CRITICAL: Merge task completion data from cloud (needed for streak)
                            // Uses timestamp-aware per-task merge to prevent data loss
                            if (freshData.taskCompletion) {
                                const localTaskCompletion = safeParseLocalStorage('tpprover_task_completion', {});
                                const merged = mergeTaskCompletion(localTaskCompletion, freshData.taskCompletion);
                                localStorage.setItem('tpprover_task_completion', JSON.stringify(merged));
                                window.dispatchEvent(new CustomEvent('tpp:task-completion-changed', {
                                    detail: { source: 'cloud-sync' }
                                }));
                            }
                            if (freshData.calendarDone) {
                                const localCalendarDone = safeParseLocalStorage('tpprover_calendar_done', {});
                                const merged = mergeTaskCompletion(localCalendarDone, freshData.calendarDone);
                                localStorage.setItem('tpprover_calendar_done', JSON.stringify(merged));
                            }
                            // Merge injection history/stats from cloud (pin history)
                            if (freshData.injectionHistory || freshData.injectionStats) {
                                const localHist = safeParseLocalStorage('tpprover_injection_history', []);
                                const localStats = safeParseLocalStorage('tpprover_injection_stats', {});
                                const mergedHist = mergeInjectionHistory(localHist, freshData.injectionHistory || []);
                                const mergedStats = mergeInjectionStats(localStats, freshData.injectionStats || {});
                                localStorage.setItem('tpprover_injection_history', JSON.stringify(mergedHist));
                                localStorage.setItem('tpprover_injection_stats', JSON.stringify(mergedStats));
                            }
            }
            
            // Mark that we've successfully loaded from Firestore
            // This enables auto-save to prevent stale cache overwrites
            if (!hasLoadedFromFirestoreRef.current) {
                hasLoadedFromFirestoreRef.current = true;
                
                // Notify widgets that cloud data has landed in localStorage
                window.dispatchEvent(new CustomEvent('tpp:cloud-data-loaded'));
                
                // 🩹 Run retroactive data fixups after listener delivers data
                setTimeout(() => {
                    try {
                        const fixupResults = runDataFixups();
                        if (fixupResults.totalPatched > 0) {
                            console.log(`🩹 Data fixups applied (listener path): ${fixupResults.totalPatched} items repaired`);
                        }
                    } catch (fixupError) {
                        console.warn('⚠️ Data fixups failed (non-fatal):', fixupError);
                    }
                }, 2000);
                
                // CATCH-UP SYNC: Check if a previous sync failed (dirty flag) or if
                // localStorage has newer data than what's in the cloud (e.g., offline edits).
                try {
                    const syncPending = localStorage.getItem('tpprover_sync_pending');
                    const localLastUpdate = parseInt(localStorage.getItem('tpprover_protocols_lastUpdate') || '0', 10);
                    const needsCatchUp = syncPending || (localLastUpdate > 0 && Date.now() - localLastUpdate < 60000);
                    if (needsCatchUp) {
                        console.log('🔄 Catch-up sync: pending sync detected, triggering full sync');
                        // Small delay to let the listener finish applying remote data first
                        setTimeout(() => {
                            if (!isLoggingOutRef.current) {
                                setWishlistSyncTrigger(n => n + 1); // Bump to trigger auto-sync
                            }
                        }, 3000);
                    }
                } catch (e) {
                    console.warn('⚠️ Catch-up sync check failed:', e);
                }
            }
            
            setTimeout(() => {
                            isApplyingRemoteUpdateRef.current = false;
                        }, 500);
        } catch (error) {
                        console.error('❌ Error applying remote app data:', error);
                        reportSyncError('merge_error', { source: 'listener-apply' });
                        isApplyingRemoteUpdateRef.current = false;
                    }
                }, 1000); // 1 second debounce
            } catch (error) {
                console.error('❌ Error in app data sync listener:', error);
                reportSyncError('merge_error', { source: 'listener' });
            }
        });

        return () => {
            if (typeof stateUnsubscribe === 'function') stateUnsubscribe();
            if (typeof dataUnsubscribe === 'function') dataUnsubscribe();
            if (updateTimeoutId) clearTimeout(updateTimeoutId);
        };
    }, [firebaseUser]);

    // CRITICAL: Enhanced data recovery function with detailed logging
    const recoverDataFromLocalStorage = () => {
        console.log('🚨 EMERGENCY DATA RECOVERY - CHECKING ALL SOURCES...');
        
        // First, check what's actually in localStorage
        const allLocalStorageKeys = Object.keys(localStorage).filter(key => key.startsWith('tpprover_'));
        console.log('📋 Available localStorage keys:', allLocalStorageKeys);
        
        allLocalStorageKeys.forEach(key => {
            const data = localStorage.getItem(key);
            console.log(`🔍 ${key}:`, data ? `${data.length} characters` : 'null/empty');
            if (data && data !== '[]' && data !== '{}') {
                try {
                    const parsed = JSON.parse(data);
                } catch (e) {
                }
            }
        });
        
        try {
            let recoveredCount = 0;
            
            const savedProtocols = localStorage.getItem('tpprover_protocols');
            if (savedProtocols && savedProtocols !== '[]') {
                const parsed = migrateBlendedProtocolFrequencies(JSON.parse(savedProtocols));
                setProtocols(parsed);
                recoveredCount++;
            }

            const savedRecon = localStorage.getItem('tpprover_recon_items');
            if (savedRecon && savedRecon !== '[]') {
                const parsed = JSON.parse(savedRecon);
                setReconItems(parsed);
                recoveredCount++;
            }
            
            const savedHistory = localStorage.getItem('tpprover_recon_history');
            if (savedHistory && savedHistory !== '[]') {
                const parsed = JSON.parse(savedHistory);
                setReconHistory(parsed);
                recoveredCount++;
            }

            const savedSupps = localStorage.getItem('tpprover_supplements');
            if (savedSupps && savedSupps !== '[]') {
                const parsed = JSON.parse(savedSupps);
                setSupplements(parsed);
                recoveredCount++;
            }

            const savedOrders = localStorage.getItem('tpprover_orders');
            if (savedOrders && savedOrders !== '[]') {
                const parsed = JSON.parse(savedOrders);
                setOrders(ensurePublicOrderNumbers(parsed));
                recoveredCount++;
            }

            const savedMetrics = localStorage.getItem('tpprover_metrics');
            if (savedMetrics && savedMetrics !== '[]') {
                const parsed = JSON.parse(savedMetrics);
                setMetrics(parsed);
                recoveredCount++;
            }

            const savedVendors = localStorage.getItem('tpprover_vendors');
            if (savedVendors && savedVendors !== '[]') {
                const parsed = JSON.parse(savedVendors);
                setVendors(parsed);
                recoveredCount++;
            }
            
            const savedNotes = localStorage.getItem('tpprover_calendar_notes');
            if (savedNotes && savedNotes !== '{}') {
                const parsed = JSON.parse(savedNotes);
                const migrated = migrateCalendarNotesToIdBased(parsed);
                setCalendarNotes(migrated);
                recoveredCount++;
            }

            const savedStockpile = localStorage.getItem('tpprover_stockpile');
            if (savedStockpile && savedStockpile !== '[]') {
                const parsed = JSON.parse(savedStockpile);
                setStockpile(parsed);
                recoveredCount++;
            }

            const savedScheduledBuys = localStorage.getItem('tpprover_scheduled_buys');
            if (savedScheduledBuys && savedScheduledBuys !== '[]') {
                const parsed = JSON.parse(savedScheduledBuys);
                setScheduledBuys(parsed);
                console.log(`✅ Recovered ${parsed.length} scheduled buys`);
                recoveredCount++;
            }
            
            console.log(`🎯 RECOVERY COMPLETE: Recovered ${recoveredCount} data categories`);
            return recoveredCount > 0;
        } catch (error) {
            console.error('❌ RECOVERY FAILED:', error);
            return false;
        }
    };

    // CRITICAL: Data protection system to prevent mass data loss
    const validateDataIntegrity = () => {
        const dataCategories = {
            protocols: protocols.length,
            vendors: vendors.length, 
            stockpile: stockpile.length,
            reconItems: reconItems.length,
            orders: orders.length,
            supplements: supplements.length
        };
        
        const totalItems = Object.values(dataCategories).reduce((sum, count) => sum + count, 0);
        
        // Only warn if we have a logged-in user with existing data that becomes empty
        // Don't warn for new users or during initial load
        if (totalItems === 0 && user && !isLoading && localStorage.getItem('tpprover_user_has_data') === 'true') {
            console.warn('🚨 CRITICAL: Complete data loss detected!');
            console.warn('🚨 All data categories are empty - this may indicate a critical bug');
            return false;
        }
        
        return true;
    };

    // EMERGENCY: Force Firebase data reload
    const forceFirebaseReload = async () => {
        console.log('🔥 FORCE LOADING FROM FIREBASE...');
        if (!firebaseUser || !hasPassword) {
            console.log('❌ Not authenticated for Firebase reload');
            return false;
        }
        
        try {
            const firebaseData = await loadFromFirebase();
            if (firebaseData) {
                console.log('🔥 Firebase data found:', Object.keys(firebaseData));
                
                const timeSinceProtocolsUpdate = Date.now() - lastLocalProtocolsUpdateRef.current;
                if (firebaseData.protocols && timeSinceProtocolsUpdate >= PROTECTION_WINDOW_MS) {
                    setProtocols(migrateBlendedProtocolFrequencies(firebaseData.protocols));
                    console.log(`🔥 Loaded ${firebaseData.protocols.length} protocols from Firebase`);
                } else if (firebaseData.protocols && timeSinceProtocolsUpdate < PROTECTION_WINDOW_MS) {
                    console.log('⏸️ Skipping Firebase protocols in force reload - recent local change');
                }
                if (firebaseData.reconItems) {
                    setReconItems(firebaseData.reconItems);
                    console.log(`🔥 Loaded ${firebaseData.reconItems.length} recon items from Firebase`);
                }
                if (firebaseData.vendors) {
                    setVendors(firebaseData.vendors);
                    console.log(`🔥 Loaded ${firebaseData.vendors.length} vendors from Firebase`);
                }
                if (firebaseData.stockpile) {
                    setStockpile(firebaseData.stockpile);
                    console.log(`🔥 Loaded ${firebaseData.stockpile.length} stockpile items from Firebase`);
                }
                if (firebaseData.orders) {
                    setOrders(firebaseData.orders);
                    console.log(`🔥 Loaded ${firebaseData.orders.length} orders from Firebase`);
                }
                
                return true;
            } else {
                console.log('❌ No Firebase data found');
                return false;
            }
        } catch (error) {
            console.error('❌ Firebase reload failed:', error);
            return false;
        }
    };


    const value = {
        protocols,
        reconItems,
        reconHistory,
        supplements,
        orders,
        metrics,
        vendors,
        calendarNotes,
        stockpile,
        scheduledBuys,
        user,
        subscription,
        setSubscription,
        logout,
        setUser,
        setProtocols,
        setReconItems,
        setReconHistory,
        setSupplements,
        setOrders: setOrdersWithProtection,
        setMetrics: setMetricsWithProtection,
        setVendors,
        setCalendarNotes: setCalendarNotesWithProtection,
        setStockpile: setStockpileWithProtection,
        setScheduledBuys,
        updateProtocol,
        updateProtocolWithForceSync,
        addProtocol,
        deleteProtocol,
        addVendor,
        updateVendor,
        deleteVendor,
        addSupplement,
        updateSupplement,
        deleteSupplement,
        updateCalendarNote,
        addCalendarNoteWithId,
        updateCalendarNoteById,
        deleteCalendarNoteById,
        getCalendarNoteText,
        getCalendarNotesForDate,
        hasCalendarNotes,
        recoverDataFromLocalStorage,
        forceFirebaseReload,
        isLoading,
    };

    // EMERGENCY: Expose recovery functions globally for console access
    React.useEffect(() => {
        // Direct assignment to ensure they're available
        window.emergencyRecovery = recoverDataFromLocalStorage;
        window.emergencyFirebaseReload = forceFirebaseReload;
        window.emergencyDataIntegrityCheck = validateDataIntegrity;
        
        // Comprehensive data check function
        window.emergencyDataCheck = () => {
            console.log('🚨 EMERGENCY DATA CHECK - CURRENT STATE');
            console.log('App State:');
            console.log('- Protocols:', protocols?.length || 0);
            console.log('- Vendors:', vendors?.length || 0);
            console.log('- Stockpile:', stockpile?.length || 0);
            console.log('- Recon Items:', reconItems?.length || 0);
            console.log('- Orders:', orders?.length || 0);
            console.log('- Supplements:', supplements?.length || 0);
            
            console.log('\n📋 LocalStorage Analysis:');
            const keys = Object.keys(localStorage).filter(k => k.startsWith('tpprover_'));
            console.log('Available keys:', keys);
            
            keys.forEach(key => {
                const data = localStorage.getItem(key);
                if (data) {
                    try {
                        const parsed = JSON.parse(data);
                        const count = Array.isArray(parsed) ? parsed.length : Object.keys(parsed).length;
                        console.log(`✅ ${key}: ${data.length} chars, ${count} items`);
                    } catch (e) {
                        console.log(`❌ ${key}: ${data.length} chars, parse error`);
                    }
                } else {
                    console.log(`⚠️ ${key}: empty`);
                }
            });
            
            return { protocols, vendors, stockpile, reconItems, orders, supplements };
        };
        
        // Manual recovery function that doesn't rely on state
        window.emergencyManualRecovery = () => {
            console.log('🚨 MANUAL RECOVERY ATTEMPT');
            const keys = ['tpprover_protocols', 'tpprover_vendors', 'tpprover_stockpile', 'tpprover_recon_items', 'tpprover_orders'];
            
            keys.forEach(key => {
                const data = localStorage.getItem(key);
                if (data && data !== '[]' && data !== '{}') {
                    console.log(`Found data in ${key}:`, data.substring(0, 100) + '...');
                }
            });
        };
        
        // Run integrity check on load
        setTimeout(() => {
            validateDataIntegrity();
        }, 1000);
        
    }, [protocols, vendors, stockpile, reconItems, orders, supplements]);

    // Register data getter for safe reload utility
    useEffect(() => {
        // Get task completion data from localStorage
        const getTaskCompletionData = () => {
            try {
                return {
                    taskCompletion: safeParseLocalStorage('tpprover_task_completion', {}),
                    calendarDone: safeParseLocalStorage('tpprover_calendar_done', {}),
                    protocolHistory: safeParseLocalStorage('tpprover_protocol_history', [])
                };
            } catch {
                return { taskCompletion: {}, calendarDone: {}, protocolHistory: [] };
            }
        };

        // Register function that returns all current app data
        registerAppDataGetter(() => {
            const { taskCompletion, calendarDone, protocolHistory } = getTaskCompletionData();
            const deletionTracking = getDeletionTracking();

            return {
                protocols: protocols || [],
                reconItems: reconItems || [],
                reconHistory: reconHistory || [],
                supplements: supplements || [],
                orders: orders || [],
                metrics: metrics || [],
                vendors: vendors || [],
                calendarNotes: calendarNotes || {},
                stockpile: stockpile || [],
                scheduledBuys: scheduledBuys || [],
                taskCompletion,
                calendarDone,
                protocolHistory,
                deletionTracking
            };
        });
    }, [protocols, reconItems, reconHistory, supplements, orders, metrics, vendors, calendarNotes, stockpile, scheduledBuys]);

    // Subscription state is managed by server-side webhooks only.
    // Do NOT write subscription data back to Firestore from the client
    // to avoid overwriting fresher webhook data with stale local state.
    
    // Listen for subscription changes from custom events (e.g., from Account page, lifetime redemption)
    // CRITICAL: This ensures subscription is refreshed immediately after lifetime grant
    useEffect(() => {
        let isRefreshing = false; // Prevent concurrent refreshes
        
        const handleSubscriptionUpdate = async (e) => {
            if (e.detail && e.detail.subscription !== undefined && firebaseUser && !isRefreshing) {
                isRefreshing = true;
                const userId = firebaseUser.uid;
                console.log('🔄 Subscription update event received:', e.detail.subscription);
                
                try {
                    // Use the subscription from the event directly (it's already the latest from Firebase Function)
                    setSubscription(e.detail.subscription);
                    console.log('✅ Subscription state updated from event');
                } catch (err) {
                    console.error('⚠️ Failed to save subscription:', err);
                } finally {
                    isRefreshing = false;
                }
            }
        };

        window.addEventListener('subscription:updated', handleSubscriptionUpdate);

        return () => {
            window.removeEventListener('subscription:updated', handleSubscriptionUpdate);
        };
    }, [firebaseUser]);

    // Android: check for interrupted purchases when app resumes
    useEffect(() => {
        if (!firebaseUser || !isAndroid()) return;
        let listener = null;
        import('@capacitor/app').then(({ App }) => {
            App.addListener('appStateChange', async ({ isActive }) => {
                if (isActive) {
                    try {
                        const { queryPurchases, restorePurchases } = await import('../services/payment/googlePlayBillingService');
                        const purchases = await queryPurchases();
                        const unacknowledged = purchases.filter(p => !p.isAcknowledged);
                        if (unacknowledged.length > 0) {
                            console.log(`🔄 Found ${unacknowledged.length} unacknowledged purchase(s), restoring...`);
                            await restorePurchases({ userId: firebaseUser.uid, userEmail: firebaseUser.email });
                        }
                    } catch (err) {
                        console.warn('⚠️ Error checking interrupted purchases:', err);
                    }
                }
            }).then(l => { listener = l; });
        }).catch(() => {});
        return () => { if (listener) listener.remove(); };
    }, [firebaseUser]);

    // Real-time Firestore listener for server-side subscription changes (webhooks)
    useEffect(() => {
        if (!firebaseUser) return;
        const unsubscribe = subscribeToUserSubscription(firebaseUser.uid, (serverSub) => {
            if (serverSub && serverSub.status) {
                setSubscription(prev => {
                    // Only update if the server data is newer
                    const serverTime = serverSub.lastUpdated?.seconds || 0;
                    const localTime = prev?.lastUpdated?.seconds || 0;
                    if (serverTime >= localTime || !prev) {
                        return serverSub;
                    }
                    return prev;
                });
            }
        });
        return () => unsubscribe();
    }, [firebaseUser]);

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
}
