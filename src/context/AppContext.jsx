import React, { createContext, useState, useEffect, useContext, useMemo, useCallback, useRef } from 'react';
import { ensurePublicOrderNumbers } from '../utils/orderNumbers';
import { logoutUser, onAuthChange } from '../services/firebase';
import { useFirebase } from './FirebaseContext';
import { isNative } from '../utils/platform';
import { 
  saveAppData, loadAppData, saveUserPreferences, loadUserPreferences,
  saveUserSubscription, loadUserSubscription, saveUserState, loadUserState,
  migrateLocalStorageToCloud, clearLocalStorageData, hasUserData,
  subscribeToUserState, subscribeToAppData, mergeWithTimestamps
} from '../services/cloudStorage';
import { initializeDeletionTracking, getDeletionTracking, mergeDeletionTracking } from '../utils/deletionTracking';
import { createInitialAgreementsForExistingUser, hasAnyAgreementData } from '../services/agreementTracking';
import { clearAllUserData, verifyUserDataCleared } from '../utils/clearUserData';
import { defaultThemeName } from '../theme/themes';

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
    
    // Native app bypass - disable loading state immediately
    useEffect(() => {
        if (isNative()) {
            setIsLoading(false);
        }
    }, []);
    
    // Real-time sync control
    const isApplyingRemoteUpdateRef = useRef(false);
    const lastRemoteUpdateTimeRef = useRef(0);
    const lastLocalScheduledBuysUpdateRef = useRef(0);
    
    // 🚀 INSTANT LOAD: Load localStorage data IMMEDIATELY on mount (before Firebase Auth)
    // SECURITY: Validate user ownership before loading to prevent data bleeding
    useEffect(() => {
        // Initialize deletion tracking system
        initializeDeletionTracking();
        
        // Set flag to prevent welcome modal interference during initial load
        sessionStorage.setItem('tpp_initial_data_loading', 'true');
        
        try {
            // CRITICAL SECURITY CHECK: Verify data ownership before loading
            const lastUserEmail = localStorage.getItem('tpprover_last_user_email');
            const currentUserData = localStorage.getItem('tpprover_user');
            
            // If we have user data, check if there's a mismatch
            if (currentUserData) {
                try {
                    const parsedUser = JSON.parse(currentUserData);
                    
                    // If last user email doesn't match the stored user, this is stale data
                    if (lastUserEmail && parsedUser.email && lastUserEmail !== parsedUser.email) {
                        console.log('🚨 SECURITY: Stale user data detected during instant load');
                        console.log('  Last user:', lastUserEmail);
                        console.log('  Stored user:', parsedUser.email);
                        console.log('  ⚠️ Skipping instant load to prevent data bleeding');
                        
                        // Clear the stale data immediately
                        clearAllUserData();
                        
                        // Skip loading any data - let auth handler load fresh data
                        return;
                    }
                } catch (e) {
                    console.warn('⚠️ Could not parse user data during security check:', e);
                }
            }
            
            // Safe to load data - no user mismatch detected
            const savedProtocols = localStorage.getItem('tpprover_protocols');
            if (savedProtocols) setProtocols(JSON.parse(savedProtocols));

            const savedRecon = localStorage.getItem('tpprover_recon_items');
            if (savedRecon) setReconItems(JSON.parse(savedRecon));
            
            const savedReconHistory = localStorage.getItem('tpprover_recon_history');
            if (savedReconHistory) setReconHistory(JSON.parse(savedReconHistory));
            
            const savedSupplements = localStorage.getItem('tpprover_supplements');
            if (savedSupplements) setSupplements(JSON.parse(savedSupplements));

            const savedOrders = localStorage.getItem('tpprover_orders');
            if (savedOrders) setOrders(ensurePublicOrderNumbers(JSON.parse(savedOrders)));

            const savedMetrics = localStorage.getItem('tpprover_metrics');
            if (savedMetrics) setMetrics(JSON.parse(savedMetrics));

            const savedVendors = localStorage.getItem('tpprover_vendors');
            if (savedVendors) setVendors(JSON.parse(savedVendors));
            
            const savedNotes = localStorage.getItem('tpprover_calendar_notes');
            if (savedNotes) setCalendarNotes(JSON.parse(savedNotes));

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
                
                // Ensure we're setting the complete data
                const newScheduledBuys = event.detail.scheduledBuys.map(buy => ({...buy}));
                setScheduledBuys(newScheduledBuys);
                
                console.log('✅ AppContext state updated with scheduledBuys');
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
                        clearAllUserData();
                        // Ensure demo can seed for brand new account
                        try { localStorage.removeItem('tpprover_has_seeded'); } catch {}
                        try { localStorage.removeItem('tpprover_demo_data_cleared'); } catch {}
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
                
                // Check if data has been updated since last login
                if (cloudAppData && cloudAppData.lastUpdated) {
                    const lastLogin = localStorage.getItem('tpprover_last_login_timestamp');
                    const cloudLastUpdated = new Date(cloudAppData.lastUpdated).getTime();
                    
                    if (lastLogin) {
                        const lastLoginTime = parseInt(lastLogin, 10);
                        // If cloud data is newer than last login, show update notification
                        if (cloudLastUpdated > lastLoginTime) {
                            // Small delay to ensure UI is ready
                            setTimeout(() => {
                                window.dispatchEvent(new CustomEvent('tpp:toast', { 
                                    detail: { 
                                        message: 'Research has been updated since last login.', 
                                        type: 'success',
                                        duration: 4000
                                    } 
                                }));
                            }, 1000);
                        }
                    }
                    
                    // Update last login timestamp
                    localStorage.setItem('tpprover_last_login_timestamp', Date.now().toString());
                } else if (!cloudAppData) {
                    // First time login or no cloud data - set timestamp
                    localStorage.setItem('tpprover_last_login_timestamp', Date.now().toString());
                }
                
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
                        
                        setProtocols(mergedProtocols);
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
                        
                        if (localScheduledBuys) {
                            setScheduledBuys(mergeWithTimestamps(
                                JSON.parse(localScheduledBuys),
                                cloudAppData.scheduledBuys || [],
                                'scheduledBuys',
                                mergedDeletionTracking.scheduledBuys
                            ));
                        } else if (cloudAppData.scheduledBuys) {
                            setScheduledBuys(cloudAppData.scheduledBuys);
                        }
                        
                        // Calendar notes - merge objects
                        const localNotes = localStorage.getItem('tpprover_calendar_notes');
                        if (localNotes) {
                            const localNotesObj = JSON.parse(localNotes);
                            const cloudNotesObj = cloudAppData.calendarNotes || {};
                            setCalendarNotes({ ...cloudNotesObj, ...localNotesObj });
                        } else if (cloudAppData.calendarNotes) {
                            setCalendarNotes(cloudAppData.calendarNotes);
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
                        if (cloudAppData.protocols) setProtocols(cloudAppData.protocols);
                        if (cloudAppData.reconItems) setReconItems(cloudAppData.reconItems);
                        if (cloudAppData.reconHistory) setReconHistory(cloudAppData.reconHistory);
                        if (cloudAppData.supplements) setSupplements(cloudAppData.supplements);
                        if (cloudAppData.orders) setOrders(cloudAppData.orders);
                        if (cloudAppData.metrics) setMetrics(cloudAppData.metrics);
                        if (cloudAppData.vendors) setVendors(cloudAppData.vendors);
                        if (cloudAppData.calendarNotes) setCalendarNotes(cloudAppData.calendarNotes);
                        if (cloudAppData.stockpile) setStockpile(cloudAppData.stockpile);
                        if (cloudAppData.scheduledBuys) setScheduledBuys(cloudAppData.scheduledBuys);
                        
                        // Restore task completion data from cloud
                        if (cloudAppData.taskCompletion) {
                            localStorage.setItem('tpprover_task_completion', JSON.stringify(cloudAppData.taskCompletion));
                        }
                        if (cloudAppData.calendarDone) {
                            localStorage.setItem('tpprover_calendar_done', JSON.stringify(cloudAppData.calendarDone));
                        }
                    }
                } else if (hasLocalData) {
                    // Cloud is empty or doesn't exist, but we have local data - use local (RECOVERY)
                    console.log('🔄 Cloud data empty but local data found - recovering from localStorage');
                    console.log('🔄 This preserves user data that was saved locally but not synced to cloud');
                    
                    // Load all data from localStorage to preserve user's work
                    if (localProtocols) {
                        const parsed = JSON.parse(localProtocols);
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
                        setCalendarNotes(parsed);
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
                        scheduledBuys: savedScheduledBuys ? JSON.parse(savedScheduledBuys) : []
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
                                    await createInitialAgreementsForExistingUser(parsedUser.email);
                                } catch (error) {
                                    console.error('Failed to create initial agreements:', error);
                                }
                            } else {
                                console.log('📝 New user detected, skipping migration - agreements should be recorded during signup');
                            }
                        }
                        
                        // CRITICAL SECURITY: Check if user changed and clear data if needed
                        const lastUserEmail = localStorage.getItem('tpprover_last_user_email');
                        if (lastUserEmail && lastUserEmail !== parsedUser.email) {
                            console.log('🚨 SECURITY: User changed in auth listener!');
                            console.log('  Previous user:', lastUserEmail);
                            console.log('  Current user:', parsedUser.email);
                            
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
                        
                        // Update last user email
                        localStorage.setItem('tpprover_last_user_email', parsedUser.email);
                    } else {
                        // Create user profile if it doesn't exist
                        const userProfile = {
                            email: firebaseUser.email,
                            name: firebaseUser.email.split('@')[0],
                            uid: firebaseUser.uid
                        };
                        setUser(userProfile);
                        localStorage.setItem('tpprover_user', JSON.stringify(userProfile));
                        localStorage.setItem('tpprover_last_user_email', userProfile.email);
                        
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
                                    await createInitialAgreementsForExistingUser(userProfile.email);
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
                                                JSON.parse(localStorage.getItem('tpprover_protocols') || '[]').length === 0;
                    
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
                                    if (firebaseData.protocols) setProtocols(firebaseData.protocols);
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
                                    if (firebaseData.calendarNotes) setCalendarNotes(firebaseData.calendarNotes);
                                    if (firebaseData.stockpile) setStockpile(firebaseData.stockpile);
                                    if (firebaseData.scheduledBuys) {
                                        // Check if we recently made a local update (within last 5 seconds)
                                        const timeSinceLocalUpdate = Date.now() - lastLocalScheduledBuysUpdateRef.current;
                                        if (timeSinceLocalUpdate < 5000) {
                                            console.log('⏸️ Skipping Firebase scheduledBuys update - recent local change detected');
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
                                        localStorage.setItem('tpprover_protocols', JSON.stringify(firebaseData.protocols || []));
                                        localStorage.setItem('tpprover_recon_items', JSON.stringify(firebaseData.reconItems || []));
                                        localStorage.setItem('tpprover_recon_history', JSON.stringify(firebaseData.reconHistory || []));
                                        localStorage.setItem('tpprover_supplements', JSON.stringify(cleanedSupplements || []));
                                        localStorage.setItem('tpprover_orders', JSON.stringify(firebaseData.orders || []));
                                        localStorage.setItem('tpprover_metrics', JSON.stringify(firebaseData.metrics || []));
                                        localStorage.setItem('tpprover_vendors', JSON.stringify(firebaseData.vendors || []));
                                        localStorage.setItem('tpprover_calendar_notes', JSON.stringify(firebaseData.calendarNotes || {}));
                                        localStorage.setItem('tpprover_stockpile', JSON.stringify(firebaseData.stockpile || []));
                                        // Filter out mock scheduled buys when saving to localStorage if sample data was cleared
                                        const sampleDataCleared = localStorage.getItem('tpprover_sample_data_cleared') === 'true';
                                        const filteredScheduledBuys = sampleDataCleared && firebaseData.scheduledBuys
                                            ? firebaseData.scheduledBuys.filter(buy => !buy.isMock)
                                            : (firebaseData.scheduledBuys || []);
                                        localStorage.setItem('tpprover_scheduled_buys', JSON.stringify(filteredScheduledBuys));
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
                setUser(null);
                localStorage.removeItem('tpprover_auth_token');
                localStorage.removeItem('tpprover_user');
                localStorage.removeItem('tpprover_last_user_email'); // Clear user tracking
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

        // Add beforeunload handler to sync data when user closes browser/tab
        const handleBeforeUnload = (event) => {
            if (firebaseUser && hasPassword) {
                // Try to sync data before page unload
                // Get task completion data from localStorage
                const taskCompletion = JSON.parse(localStorage.getItem('tpprover_task_completion') || '{}');
                const calendarDone = JSON.parse(localStorage.getItem('tpprover_calendar_done') || '{}');
                
                const userData = {
                    protocols, reconItems, reconHistory, supplements, orders, 
                    metrics, vendors, calendarNotes, stockpile, scheduledBuys,
                    taskCompletion, calendarDone
                };
                
                // Use navigator.sendBeacon for reliable data sending during page unload
                try {
                    syncToFirebase(userData).catch(console.error);
                } catch (error) {
                    console.error('Failed to sync on page unload:', error);
                }
            }
        };
        
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            if (unsubscribe) unsubscribe();
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [firebaseUser, hasPassword]); // Re-run when Firebase auth initializes or password becomes available to load cloud data

    // Auto-sync data to cloud storage when it changes
    useEffect(() => {
        // Don't sync during initial load, remote updates, or if user isn't authenticated
        if (isInitialLoad || isApplyingRemoteUpdateRef.current || !firebaseUser) {
            return;
        }

        const userId = firebaseUser.uid;
        
        // Get task completion data from localStorage
        const taskCompletion = JSON.parse(localStorage.getItem('tpprover_task_completion') || '{}');
        const calendarDone = JSON.parse(localStorage.getItem('tpprover_calendar_done') || '{}');
        
        // Get deletion tracking to include in sync
        const deletionTracking = getDeletionTracking();
        
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
            taskCompletion,
            calendarDone,
            deletionTracking
        };
        
        // DEBUG: Log scheduledBuys being synced (only in development, and only once per session)
        if (process.env.NODE_ENV === 'development' && scheduledBuys && scheduledBuys.length > 0) {
            const logKey = 'tpprover_scheduledBuys_sync_logged';
            if (!sessionStorage.getItem(logKey)) {
                console.log('🔄 Auto-sync preparing to send scheduledBuys to Firebase:', scheduledBuys.length, 'items');
                sessionStorage.setItem(logKey, 'true');
            }
        }
        
        // Only sync if we have some data to sync
        const hasData = Object.values(userData).some(data => 
            Array.isArray(data) ? data.length > 0 : Object.keys(data || {}).length > 0
        );
        
        if (hasData) {
            // Save to cloud storage with error handling and retry logic
            const syncToCloud = async () => {
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
                } catch (error) {
                    console.error('❌ Failed to save app data to cloud:', error);
                    console.error('❌ Error details:', {
                        userId,
                        hasData: true,
                        errorMessage: error.message,
                        errorCode: error.code,
                        errorStack: error.stack
                    });
                    
                    // Silent retry - no user notification
                    setTimeout(async () => {
                        try {
                            console.log('🔄 Retrying cloud sync silently...');
                            const retryResult = await saveAppData(userId, userData);
                            if (retryResult) {
                                // Verify data is actually in cloud after retry
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
                                            console.log('✅ Retry verified - data confirmed in cloud');
                                            // If there's a recovery snapshot, mark it as synced
                                            const snapshot = localStorage.getItem('tpprover_recovery_snapshot');
                                            if (snapshot) {
                                                try {
                                                    const parsed = JSON.parse(snapshot);
                                                    parsed.syncedToCloud = true;
                                                    parsed.syncedAt = new Date().toISOString();
                                                    localStorage.setItem('tpprover_recovery_snapshot', JSON.stringify(parsed));
                                                    console.log('✅ Recovery snapshot marked as synced after retry');
                                                } catch (e) {
                                                    // Ignore snapshot update errors
                                                }
                                            }
                                        } else {
                                            console.warn('⚠️ Retry reported success but cloud data not verified');
                                        }
                                    } catch (verifyError) {
                                        console.error('Failed to verify retry sync:', verifyError);
                                    }
                                }, 3000);
                            } else {
                                console.error('❌ Retry failed - saveAppData returned false');
                            }
                        } catch (retryError) {
                            console.error('❌ Retry also failed:', retryError);
                        }
                    }, 3000);
                }
            };
            
            // Execute sync
            syncToCloud();
            
            // Also sync to Firebase for backup (if user has password)
            if (hasPassword) {
                debouncedSync(userData);
            }
        } else {
            // If no data, still try to save empty arrays to cloud for new users
            const emptyData = {
                protocols: protocols || [],
                reconItems: reconItems || [],
                reconHistory: reconHistory || [],
                supplements: supplements || [],
                orders: orders || [],
                metrics: metrics || [],
                vendors: vendors || [],
                calendarNotes: calendarNotes || {},
                stockpile: stockpile || [],
                scheduledBuys: scheduledBuys || []
            };
            saveAppData(userId, emptyData);
        }
    }, [protocols, reconItems, reconHistory, supplements, orders, metrics, vendors, calendarNotes, stockpile, scheduledBuys, firebaseUser, hasPassword]); // FIXED: Only include data dependencies, remove functions

    const logout = async () => {
        try {
            // CRITICAL: Force immediate sync before logout to prevent data loss
            if (firebaseUser && hasPassword) {
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
                    scheduledBuys
                };
                
                // Use syncToFirebase directly (not debounced) for immediate sync
                await syncToFirebase(userData);
            }
            
            // Sign out from Firebase
            await logoutUser();
            
            // CRITICAL: Clear ALL user-specific localStorage data
            clearAllUserData();
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
            // CRITICAL SAFETY CHECK: Never save empty arrays that could overwrite existing data
            if (Array.isArray(data) && data.length === 0) {
                // Check if there's existing data in localStorage before overwriting with empty array
                const existingData = localStorage.getItem(key);
                if (existingData && existingData !== '[]') {
                    return;
                }
            }
            
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error(`Error saving ${key} to localStorage`, error);
        }
    };

    useEffect(() => { saveData('tpprover_protocols', protocols) }, [protocols]);
    useEffect(() => { saveData('tpprover_recon_items', reconItems) }, [reconItems]);
    useEffect(() => { saveData('tpprover_recon_history', reconHistory) }, [reconHistory]);
    useEffect(() => { 
        saveData('tpprover_supplements', supplements);
    }, [supplements]);
    useEffect(() => { saveData('tpprover_orders', orders) }, [orders]);
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
            newProtocols[index] = {
                ...updatedProtocol,
                updatedAt: new Date().toISOString()
            };
            setProtocols(newProtocols);
        }
    };
    
    const addProtocol = (newProtocol) => {
        const now = new Date().toISOString();
        setProtocols(prev => [{
            ...newProtocol,
            createdAt: newProtocol.createdAt || now,
            updatedAt: now
        }, ...prev]);
    }

    const deleteProtocol = async (protocolId) => {
        // Find the protocol being deleted for logging
        const protocolToDelete = protocols.find(p => p.id === protocolId);
        
        if (protocolToDelete) {
            console.log('🗑️ Deleting protocol:', protocolToDelete.name || 'Unknown');
        }
        
        // Remove from local state
        const updatedProtocols = protocols.filter(p => p.id !== protocolId);
        setProtocols(updatedProtocols);
        
        // CRITICAL: Force immediate cloud sync with skipMerge to ensure deletion persists
        // This prevents server data from restoring deleted items
        if (firebaseUser) {
            try {
                const userId = firebaseUser.uid;
                const appData = {
                    protocols: updatedProtocols, // Use updated protocols with deletion
                    reconItems: reconItems || [],
                    reconHistory: reconHistory || [],
                    supplements: supplements || [],
                    orders: orders || [],
                    metrics: metrics || [],
                    vendors: vendors || [],
                    calendarNotes: calendarNotes || {},
                    stockpile: stockpile || [],
                    scheduledBuys: scheduledBuys || []
                };
                
                // Force immediate sync with skipMerge to overwrite server data
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
                    : Date.now());

            const now = new Date().toISOString();

            if (existingIndex !== -1) {
                const existingVendor = list[existingIndex] || {};
                const mergedVendor = {
                    ...existingVendor,
                    ...newVendor,
                    id: existingVendor.id != null ? existingVendor.id : targetId,
                    updatedAt: now,
                    createdAt: existingVendor.createdAt || now
                };

                if (newVendor.isStub === undefined) {
                    mergedVendor.isStub = !hasMeaningfulDetails(mergedVendor);
                }
                if (newVendor.needsCompletion === undefined) {
                    mergedVendor.needsCompletion = mergedVendor.isStub;
                }

                return list.map((vendor, index) => index === existingIndex ? mergedVendor : vendor);
            }

            const createdVendor = { 
                ...newVendor, 
                id: targetId,
                createdAt: now,
                updatedAt: now
            };
            if (createdVendor.isStub === undefined) {
                createdVendor.isStub = !hasMeaningfulDetails(createdVendor);
            }
            if (createdVendor.needsCompletion === undefined) {
                createdVendor.needsCompletion = createdVendor.isStub;
            }

            return [createdVendor, ...list];
        });
    };

    const updateVendor = (updatedVendor) => {
        setVendors(prev => prev.map(v => v.id === updatedVendor.id ? updatedVendor : v));
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
        // Only generate ID if not already provided
        const supplementToAdd = {
            ...newSupplement,
            id: newSupplement.id || Date.now()
        };
        
        setSupplements(prev => [supplementToAdd, ...prev]);
    };

    const updateSupplement = async (updatedSupplement) => {
        // Handle delete flag - use deleteSupplement for proper cloud sync
        if (updatedSupplement._delete) {
            await deleteSupplement(updatedSupplement.id);
            return;
        }
        
        // Remove _delete flag if it exists and update normally
        const { _delete, ...cleanSupplement } = updatedSupplement;
        
        // Ensure the updated supplement has a fresh timestamp
        const supplementWithTimestamp = {
            ...cleanSupplement,
            updatedAt: new Date().toISOString()
        };
        
        // Update local state
        const updatedSupplements = supplements.map(s => s.id === supplementWithTimestamp.id ? supplementWithTimestamp : s);
        setSupplements(updatedSupplements);
        
        // CRITICAL: Set flag to prevent real-time listener from overwriting our update
        lastRemoteUpdateTimeRef.current = Date.now();
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
                
                // Use skipMerge to force overwrite server data with our update
                const syncResult = await saveAppData(userId, appData, { skipMerge: true });
                if (syncResult) {
                    console.log('✅ Updated supplement synced to cloud immediately');
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
        // Find the supplement being deleted for logging
        const supplementToDelete = supplements.find(s => s.id === supplementId);
        
        if (supplementToDelete) {
            console.log('🗑️ Deleting supplement:', supplementToDelete.name || 'Unknown');
        }
        
        // Remove from local state
        const updatedSupplements = supplements.filter(s => s.id !== supplementId);
        setSupplements(updatedSupplements);
        
        // CRITICAL: Force immediate cloud sync with skipMerge to ensure deletion persists
        // This prevents server data from restoring deleted items
        if (firebaseUser) {
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
                
                // Force immediate sync with skipMerge to overwrite server data
                const syncResult = await saveAppData(userId, appData, { skipMerge: true });
                if (syncResult) {
                    console.log('✅ Deleted supplement synced to cloud immediately');
                } else {
                    console.error('❌ Failed to sync deleted supplement to cloud');
                }
            } catch (error) {
                console.error('❌ Error syncing deleted supplement to cloud:', error);
                // Don't throw - the auto-sync will handle it
            }
        }
    };

    const updateCalendarNote = (dateKey, text) => {
        setCalendarNotes(prev => ({...prev, [dateKey]: text}));
    };

    // Real-time cross-browser sync listener
    useEffect(() => {
        if (!firebaseUser) {
            return;
        }

        console.log('🔄 Setting up real-time sync listeners for user:', firebaseUser.uid);
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
                                if (freshData.protocols) {
                                    const filtered = freshData.protocols.filter(p => !p.isMock);
                                    setProtocols(filtered);
                                }
                                if (freshData.reconItems) {
                                    const filtered = freshData.reconItems.filter(r => !r.isMock);
                                    setReconItems(filtered);
                                }
                                if (freshData.reconHistory) setReconHistory(freshData.reconHistory);
                                if (freshData.supplements) {
                                    const filtered = freshData.supplements.filter(s => !s.isMock);
                                    setSupplements(filtered);
                                }
                                if (freshData.orders) {
                                    const filtered = freshData.orders.filter(o => !o.isMock);
                                    setOrders(filtered);
                                }
                                if (freshData.metrics) {
                                    const filtered = freshData.metrics.filter(m => !m.isMock);
                                    setMetrics(filtered);
                                }
                                if (freshData.vendors) {
                                    const filtered = freshData.vendors.filter(v => !v.isMock);
                                    setVendors(filtered);
                                }
                                if (freshData.calendarNotes) setCalendarNotes(freshData.calendarNotes);
                                if (freshData.stockpile) {
                                    const filtered = freshData.stockpile.filter(s => !s.isMock);
                                    setStockpile(filtered);
                                }
                                if (freshData.scheduledBuys) {
                                    const filtered = freshData.scheduledBuys.filter(buy => !buy.isMock);
                                    setScheduledBuys(filtered);
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
                    console.log('⏸️ Skipping app data sync - already processing an update');
                    return;
                }

                // Debounce updates to prevent rapid-fire state changes
                if (updateTimeoutId) {
                    clearTimeout(updateTimeoutId);
                }

                updateTimeoutId = setTimeout(async () => {
                    try {
                        const now = Date.now();
                        // Prevent update loops - ignore if we just sent an update
                        if (now - lastRemoteUpdateTimeRef.current < 2000) {
                            return;
                        }

                        lastRemoteUpdateTimeRef.current = now;
                        isApplyingRemoteUpdateRef.current = true;

                        // Reload from cloud storage
                        const freshData = await loadAppData(userId);
                const sampleDataCleared = localStorage.getItem('tpprover_sample_data_cleared') === 'true';
                        
                        if (freshData) {
                            // Filter out mock items if sample data was cleared
                            if (freshData.protocols) {
                const filtered = sampleDataCleared 
                                    ? freshData.protocols.filter(p => !p.isMock)
                                    : freshData.protocols;
                                setProtocols(filtered);
                            }
                            if (freshData.reconItems) {
                                const filtered = sampleDataCleared 
                                    ? freshData.reconItems.filter(r => !r.isMock)
                                    : freshData.reconItems;
                                setReconItems(filtered);
                            }
                            if (freshData.reconHistory) setReconHistory(freshData.reconHistory);
                            if (freshData.supplements) {
                                const filtered = sampleDataCleared 
                                    ? freshData.supplements.filter(s => !s.isMock)
                                    : freshData.supplements;
                                setSupplements(filtered);
                            }
                            if (freshData.orders) {
                                const filtered = sampleDataCleared 
                                    ? freshData.orders.filter(o => !o.isMock)
                                    : freshData.orders;
                                setOrders(filtered);
                            }
                            if (freshData.metrics) {
                                const filtered = sampleDataCleared 
                                    ? freshData.metrics.filter(m => !m.isMock)
                                    : freshData.metrics;
                                setMetrics(filtered);
                            }
                            if (freshData.vendors) {
                                const filtered = sampleDataCleared 
                                    ? freshData.vendors.filter(v => !v.isMock)
                                    : freshData.vendors;
                                setVendors(filtered);
                            }
                            if (freshData.calendarNotes) setCalendarNotes(freshData.calendarNotes);
                            if (freshData.stockpile) {
                                const filtered = sampleDataCleared 
                                    ? freshData.stockpile.filter(s => !s.isMock)
                                    : freshData.stockpile;
                                setStockpile(filtered);
                            }
                            if (freshData.scheduledBuys) {
                                const filtered = sampleDataCleared 
                                    ? freshData.scheduledBuys.filter(buy => !buy.isMock)
                                    : freshData.scheduledBuys;
                setScheduledBuys(filtered);
                            }
            }
            
            setTimeout(() => {
                            isApplyingRemoteUpdateRef.current = false;
                        }, 500);
        } catch (error) {
                        console.error('❌ Error applying remote app data:', error);
                        isApplyingRemoteUpdateRef.current = false;
                    }
                }, 1000); // 1 second debounce
            } catch (error) {
                console.error('❌ Error in app data sync listener:', error);
            }
        });

        return () => {
            console.log('🔄 Cleaning up real-time sync listeners');
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
                const parsed = JSON.parse(savedProtocols);
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
                setCalendarNotes(parsed);
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
                
                if (firebaseData.protocols) {
                    setProtocols(firebaseData.protocols);
                    console.log(`🔥 Loaded ${firebaseData.protocols.length} protocols from Firebase`);
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
        setOrders,
        setMetrics,
        setVendors,
        setCalendarNotes,
        setStockpile,
        setScheduledBuys,
        updateProtocol,
        addProtocol,
        deleteProtocol,
        addVendor,
        updateVendor,
        deleteVendor,
        addSupplement,
        updateSupplement,
        deleteSupplement,
        updateCalendarNote,
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

    // Listen for subscription changes and save to cloud storage
    useEffect(() => {
        if (subscription && firebaseUser) {
            const userId = firebaseUser.uid;
            saveUserSubscription(userId, subscription);
        }
    }, [subscription, firebaseUser]);
    
    // Listen for subscription changes from custom events (e.g., from Account page)
    useEffect(() => {
        const handleSubscriptionUpdate = async (e) => {
            if (e.detail && e.detail.subscription !== undefined && firebaseUser) {
                const userId = firebaseUser.uid;
                setSubscription(e.detail.subscription);
                await saveUserSubscription(userId, e.detail.subscription);
            }
        };

        window.addEventListener('subscription:updated', handleSubscriptionUpdate);

        return () => {
            window.removeEventListener('subscription:updated', handleSubscriptionUpdate);
        };
    }, [firebaseUser]);

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
}
