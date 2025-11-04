import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';
import { seedInitialData } from '../utils/seed';
import { logoutUser, onAuthChange } from '../services/firebase';
import { useFirebase } from './FirebaseContext';
import { isNative } from '../utils/platform';
import { 
  saveAppData, loadAppData, saveUserPreferences, loadUserPreferences,
  saveUserSubscription, loadUserSubscription, saveUserState, loadUserState,
  migrateLocalStorageToCloud, clearLocalStorageData, hasUserData
} from '../services/cloudStorage';
import { createInitialAgreementsForExistingUser, hasAnyAgreementData } from '../services/agreementTracking';
import { clearAllUserData, verifyUserDataCleared } from '../utils/clearUserData';

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
    const [isClearingDemoData, setIsClearingDemoData] = useState(false);
    
    // 🚀 INSTANT LOAD: Load localStorage data IMMEDIATELY on mount (before Firebase Auth)
    useEffect(() => {
        // Set flag to prevent welcome modal interference during initial load
        sessionStorage.setItem('tpp_initial_data_loading', 'true');
        
        try {
            const savedProtocols = localStorage.getItem('tpprover_protocols');
            if (savedProtocols) setProtocols(JSON.parse(savedProtocols));

            const savedRecon = localStorage.getItem('tpprover_recon_items');
            if (savedRecon) setReconItems(JSON.parse(savedRecon));
            
            const savedReconHistory = localStorage.getItem('tpprover_recon_history');
            if (savedReconHistory) setReconHistory(JSON.parse(savedReconHistory));
            
            const savedSupplements = localStorage.getItem('tpprover_supplements');
            if (savedSupplements) setSupplements(JSON.parse(savedSupplements));

            const savedOrders = localStorage.getItem('tpprover_orders');
            if (savedOrders) setOrders(JSON.parse(savedOrders));

            const savedMetrics = localStorage.getItem('tpprover_metrics');
            if (savedMetrics) setMetrics(JSON.parse(savedMetrics));

            const savedVendors = localStorage.getItem('tpprover_vendors');
            if (savedVendors) setVendors(JSON.parse(savedVendors));
            
            const savedNotes = localStorage.getItem('tpprover_calendar_notes');
            if (savedNotes) setCalendarNotes(JSON.parse(savedNotes));

            const savedStockpile = localStorage.getItem('tpprover_stockpile');
            if (savedStockpile) setStockpile(JSON.parse(savedStockpile));

            const savedScheduledBuys = localStorage.getItem('tpprover_scheduled_buys');
            if (savedScheduledBuys) setScheduledBuys(JSON.parse(savedScheduledBuys));
        } catch (error) {
            console.error('❌ Failed to load localStorage data on mount:', error);
        } finally {
            // Clear flag after 500ms to allow welcome modal to check
            setTimeout(() => {
                sessionStorage.removeItem('tpp_initial_data_loading');
            }, 500);
        }
    }, []); // Run ONCE on mount, no dependencies
    
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
                
                // CRITICAL: Check if demo data was cleared on another platform
                const userState = await loadUserState(userId);
                const demoDataClearedInCloud = userState?.demoDataCleared === true;
                const demoDataClearedLocally = localStorage.getItem('tpprover_demo_data_cleared') === 'true';
                
                if (demoDataClearedInCloud && !demoDataClearedLocally) {
                    console.log('🔄 Demo data was cleared on another platform - syncing local data');
                    // Clear demo data locally to match cloud state
                    const { clearMockData } = await import('../utils/seed');
                    clearMockData();
                    localStorage.setItem('tpprover_demo_data_cleared', 'true');
                    localStorage.setItem('tpprover_demo_banner_dismissed', 'true');
                }
                
                if (!hasCloudData) {
                    // New user - decide between migrating existing local data vs fresh demo seed
                    const currentEmail = (firebaseUser.email || '').toLowerCase();
                    const lastEmail = (localStorage.getItem('tpprover_last_user_email') || '').toLowerCase();

                    const hasLocalData = Object.keys(localStorage).some(key => 
                        key.startsWith('tpprover_') && 
                        !['tpprover_auth_token', 'tpprover_user', 'tpprover_last_user_email'].includes(key)
                    );

                    const canMigrateSafely = hasLocalData && lastEmail && lastEmail === currentEmail;

                    if (canMigrateSafely) {
                        console.log('🔄 Migrating existing local data for same account to cloud...');
                        await migrateLocalStorageToCloud(userId);
                        // Clear local cache after migration
                        clearLocalStorageData();
                    } else {
                        // Brand new user - demo data is now seeded by Login.jsx directly to Firestore
                        // No need to seed here, just wait for data to load from cloud
                    }
                }

                // Load app data from cloud
                const cloudAppData = await loadAppData(userId);
                if (cloudAppData) {
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
                    
                    // Check if account is completely empty and needs demo data seeded
                    const totalItems = (cloudAppData.protocols?.length || 0) + 
                                      (cloudAppData.orders?.length || 0) + 
                                      (cloudAppData.vendors?.length || 0) + 
                                      (cloudAppData.supplements?.length || 0);
                    
                    if (totalItems === 0) {
                        console.log('📭 Account has 0 items - auto-seeding demo data to Firestore...');
                        try {
                            const { seedDemoDataToCloud } = await import('../services/demoDataSeeder');
                            const seeded = await seedDemoDataToCloud(userId, null);
                            
                            if (seeded) {
                                console.log('✅ Demo data auto-seeded for empty account');
                                console.log('🔄 Reloading data from Firestore...');
                                
                                // Reload data from Firestore after seeding
                                await new Promise(resolve => setTimeout(resolve, 500));
                                const freshData = await loadAppData(userId);
                                
                                if (freshData) {
                                    if (freshData.protocols) setProtocols(freshData.protocols);
                                    if (freshData.reconItems) setReconItems(freshData.reconItems);
                                    if (freshData.reconHistory) setReconHistory(freshData.reconHistory);
                                    if (freshData.supplements) setSupplements(freshData.supplements);
                                    if (freshData.orders) setOrders(freshData.orders);
                                    if (freshData.metrics) setMetrics(freshData.metrics);
                                    if (freshData.vendors) setVendors(freshData.vendors);
                                    if (freshData.calendarNotes) setCalendarNotes(freshData.calendarNotes);
                                    if (freshData.stockpile) setStockpile(freshData.stockpile);
                                    if (freshData.scheduledBuys) setScheduledBuys(freshData.scheduledBuys);
                                    console.log('✅ Fresh demo data loaded into app state');
                                }
                            }
                        } catch (seedError) {
                            console.error('❌ Failed to auto-seed demo data:', seedError);
                        }
                    }
                } else {
                    // No cloud data found, load from localStorage as fallback
                    const savedProtocols = localStorage.getItem('tpprover_protocols');
                    if (savedProtocols) setProtocols(JSON.parse(savedProtocols));

                    const savedRecon = localStorage.getItem('tpprover_recon_items');
                    if (savedRecon) setReconItems(JSON.parse(savedRecon));
                    
                    const savedHistory = localStorage.getItem('tpprover_recon_history');
                    if (savedHistory) setReconHistory(JSON.parse(savedHistory));

                    const savedSupps = localStorage.getItem('tpprover_supplements');
                    if (savedSupps) setSupplements(JSON.parse(savedSupps));

                    const savedOrders = localStorage.getItem('tpprover_orders');
                    if (savedOrders) setOrders(JSON.parse(savedOrders));

                    const savedMetrics = localStorage.getItem('tpprover_metrics');
                    if (savedMetrics) setMetrics(JSON.parse(savedMetrics));

                    const savedVendors = localStorage.getItem('tpprover_vendors');
                    if (savedVendors) setVendors(JSON.parse(savedVendors));
                    
                    const savedNotes = localStorage.getItem('tpprover_calendar_notes');
                    if (savedNotes) setCalendarNotes(JSON.parse(savedNotes));

                    const savedStockpile = localStorage.getItem('tpprover_stockpile');
                    if (savedStockpile) setStockpile(JSON.parse(savedStockpile));

                    const savedScheduledBuys = localStorage.getItem('tpprover_scheduled_buys');
                    if (savedScheduledBuys) setScheduledBuys(JSON.parse(savedScheduledBuys));
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
        
        // Listen for demo data seeding events
        const handleDemoDataSeeded = () => {
            console.log('🔄 Demo data seeded - reloading from localStorage');
            // Reload all data from localStorage
            try {
                const savedProtocols = localStorage.getItem('tpprover_protocols');
                if (savedProtocols) setProtocols(JSON.parse(savedProtocols));

                const savedRecon = localStorage.getItem('tpprover_recon_items');
                if (savedRecon) setReconItems(JSON.parse(savedRecon));
                
                const savedHistory = localStorage.getItem('tpprover_recon_history');
                if (savedHistory) setReconHistory(JSON.parse(savedHistory));

                const savedSupps = localStorage.getItem('tpprover_supplements');
                if (savedSupps) setSupplements(JSON.parse(savedSupps));

                const savedOrders = localStorage.getItem('tpprover_orders');
                if (savedOrders) setOrders(JSON.parse(savedOrders));

                const savedMetrics = localStorage.getItem('tpprover_metrics');
                if (savedMetrics) setMetrics(JSON.parse(savedMetrics));

                const savedVendors = localStorage.getItem('tpprover_vendors');
                if (savedVendors) setVendors(JSON.parse(savedVendors));
                
                const savedNotes = localStorage.getItem('tpprover_calendar_notes');
                if (savedNotes) setCalendarNotes(JSON.parse(savedNotes));

                const savedStockpile = localStorage.getItem('tpprover_stockpile');
                if (savedStockpile) setStockpile(JSON.parse(savedStockpile));

                const savedScheduledBuys = localStorage.getItem('tpprover_scheduled_buys');
                if (savedScheduledBuys) setScheduledBuys(JSON.parse(savedScheduledBuys));
                
                console.log('✅ Demo data loaded into AppContext state');
            } catch (error) {
                console.error('❌ Error reloading demo data:', error);
            }
        };

        window.addEventListener('demo-data-seeded', handleDemoDataSeeded);

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
                            
                            console.log('✅ Confirmed: Account data cleared for new user');
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
                                    if (firebaseData.scheduledBuys) setScheduledBuys(firebaseData.scheduledBuys);
                                    
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
                                        localStorage.setItem('tpprover_scheduled_buys', JSON.stringify(firebaseData.scheduledBuys || []));
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
                const userData = {
                    protocols, reconItems, reconHistory, supplements, orders, 
                    metrics, vendors, calendarNotes, stockpile, scheduledBuys
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
        
        // Listen for demo data cleared event
        const handleDemoDataCleared = () => {

            // Instead of full reload, just clear demo data and refresh state
            try {
                // Import and call clearMockData directly
                import('../utils/seed').then(({ clearMockData }) => {
                    clearMockData();

                    // Refresh the hasMockData calculation without full reload
                    // Force a re-render by updating a state variable
                    setIsClearingDemoData(true);

                    // Re-enable sync after brief delay
                    setTimeout(() => {
                        setIsClearingDemoData(false);
                    }, 500);
                });
            } catch (error) {
                console.error('❌ Error during demo data clearing:', error);
                setIsClearingDemoData(false);
            }
        };
        window.addEventListener('demo-data-cleared', handleDemoDataCleared);

        return () => {
            if (unsubscribe) unsubscribe();
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('demo-data-cleared', handleDemoDataCleared);
            window.removeEventListener('demo-data-seeded', handleDemoDataSeeded);
        };
    }, [firebaseUser]); // Re-run when Firebase auth initializes to load cloud data

    // Auto-sync data to cloud storage when it changes
    useEffect(() => {
        // Don't sync during initial load, demo data clearing, or if user isn't authenticated
        if (isInitialLoad || isClearingDemoData || !firebaseUser) {
            return;
        }

        const userId = firebaseUser.uid;
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
        
        // Only sync if we have some data to sync
        const hasData = Object.values(userData).some(data => 
            Array.isArray(data) ? data.length > 0 : Object.keys(data || {}).length > 0
        );
        
        if (hasData) {
            // Save to cloud storage
            saveAppData(userId, userData);
            
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
            newProtocols[index] = updatedProtocol;
            setProtocols(newProtocols);
        }
    };
    
    const addProtocol = (newProtocol) => {
        setProtocols(prev => [newProtocol, ...prev]);
    }

    const deleteProtocol = (protocolId) => {
        setProtocols(prev => prev.filter(p => p.id !== protocolId));
    }

    const addVendor = (newVendor) => {
        setVendors(prev => [newVendor, ...prev]);
    };

    const updateVendor = (updatedVendor) => {
        setVendors(prev => prev.map(v => v.id === updatedVendor.id ? updatedVendor : v));
    };

    const deleteVendor = (vendorId) => {
        // SAFETY CHECK: Prevent accidental mass deletion
        if (!vendorId) {
            console.error('🚨 SAFETY: Cannot delete vendor - no ID provided');
            return;
        }
        
        // SAFETY CHECK: Confirm vendor exists before deletion
        const vendorExists = vendors.find(v => v.id === vendorId);
        if (!vendorExists) {
            console.warn('⚠️ SAFETY: Vendor not found for deletion:', vendorId);
            return;
        }
        
        setVendors(prev => prev.filter(v => v.id !== vendorId));
    };

    const addSupplement = (newSupplement) => {
        // Only generate ID if not already provided
        const supplementToAdd = {
            ...newSupplement,
            id: newSupplement.id || Date.now()
        };
        
        setSupplements(prev => [supplementToAdd, ...prev]);
    };

    const updateSupplement = (updatedSupplement) => {
        // Handle delete flag
        if (updatedSupplement._delete) {
            setSupplements(prev => prev.filter(s => s.id !== updatedSupplement.id));
            return;
        }
        
        // Remove _delete flag if it exists and update normally
        const { _delete, ...cleanSupplement } = updatedSupplement;
        setSupplements(prev => prev.map(s => s.id === cleanSupplement.id ? cleanSupplement : s));
    };

    const deleteSupplement = (supplementId) => {
        setSupplements(prev => prev.filter(s => s.id !== supplementId));
    };

    const updateCalendarNote = (dateKey, text) => {
        setCalendarNotes(prev => ({...prev, [dateKey]: text}));
    };

    const refreshDataAfterClear = () => {
        // Prevent Firebase sync during demo data clearing
        setIsClearingDemoData(true);
        
        // Reload all data from localStorage after clearing mock data
        try {
            const savedProtocols = localStorage.getItem('tpprover_protocols');
            setProtocols(savedProtocols ? JSON.parse(savedProtocols) : []);

            const savedRecon = localStorage.getItem('tpprover_recon_items');
            setReconItems(savedRecon ? JSON.parse(savedRecon) : []);
            
            const savedHistory = localStorage.getItem('tpprover_recon_history');
            setReconHistory(savedHistory ? JSON.parse(savedHistory) : []);

            const savedSupps = localStorage.getItem('tpprover_supplements');
            setSupplements(savedSupps ? JSON.parse(savedSupps) : []);

            const savedOrders = localStorage.getItem('tpprover_orders');
            setOrders(savedOrders ? JSON.parse(savedOrders) : []);

            const savedMetrics = localStorage.getItem('tpprover_metrics');
            setMetrics(savedMetrics ? JSON.parse(savedMetrics) : []);

            const savedVendors = localStorage.getItem('tpprover_vendors');
            setVendors(savedVendors ? JSON.parse(savedVendors) : []);
            
            const savedNotes = localStorage.getItem('tpprover_calendar_notes');
            setCalendarNotes(savedNotes ? JSON.parse(savedNotes) : {});

            const savedStockpile = localStorage.getItem('tpprover_stockpile');
            setStockpile(savedStockpile ? JSON.parse(savedStockpile) : []);

            const savedScheduledBuys = localStorage.getItem('tpprover_scheduled_buys');
            setScheduledBuys(savedScheduledBuys ? JSON.parse(savedScheduledBuys) : []);
            
            // Re-enable Firebase sync after a short delay
            setTimeout(() => {
                setIsClearingDemoData(false);
            }, 1000);
        } catch (error) {
            console.error("Error refreshing data after clear:", error);
            setIsClearingDemoData(false);
        }
    };

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
                setOrders(parsed);
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

    const hasMockData = useMemo(() => {
        const allData = [...protocols, ...orders, ...vendors, ...supplements, ...reconItems, ...stockpile, ...metrics];
        const hasArrayMockData = allData.some(item => item.isMock === true);
        
        // Also check calendar notes for mock data
        const hasCalendarMockData = Object.values(calendarNotes).some(note => 
            typeof note === 'object' && note.isMock === true
        );
        
        return hasArrayMockData || hasCalendarMockData;
    }, [protocols, orders, vendors, supplements, reconItems, stockpile, metrics, calendarNotes]);

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
        refreshDataAfterClear,
        recoverDataFromLocalStorage,
        forceFirebaseReload,
        hasMockData,
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
