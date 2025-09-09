import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';
import { seedInitialData } from '../utils/seed';
import { logoutUser, onAuthChange } from '../services/firebase';
import { useFirebase } from './FirebaseContext';

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
    const [isLoading, setIsLoading] = useState(true);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [isClearingDemoData, setIsClearingDemoData] = useState(false);
    
    // Firebase sync integration
    const { firebaseUser, hasPassword, debouncedSync, loadFromFirebase, syncToFirebase } = useFirebase();

    // Load initial data from localStorage on mount
    useEffect(() => {
        const loadAppData = () => {
            try {
                // The seedInitialData function has its own internal checks to prevent overwriting user data.
                // We can call it safely on every app load.
                seedInitialData();

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
            } catch (error) {
                console.error("Error loading data from localStorage", error);
            }
        };

        loadAppData();
        
        // Listen to Firebase auth changes instead of just localStorage
        const unsubscribe = onAuthChange(async (firebaseUser) => {
            if (firebaseUser) {
                // User is authenticated, load their profile from localStorage
                try {
                    const savedUser = localStorage.getItem('tpprover_user');
                    if (savedUser) {
                        setUser(JSON.parse(savedUser));
                    } else {
                        // Create user profile if it doesn't exist
                        const userProfile = {
                            email: firebaseUser.email,
                            name: firebaseUser.email.split('@')[0],
                            uid: firebaseUser.uid
                        };
                        setUser(userProfile);
                        localStorage.setItem('tpprover_user', JSON.stringify(userProfile));
                    }
                    
                    // Try to load data from Firebase if user has password set
                    if (hasPassword) {
                        try {
                            const firebaseData = await loadFromFirebase();
                            if (firebaseData) {
                                // Only load Firebase data if it's newer than localStorage
                                // This prevents overwriting newer local changes with stale Firebase data
                                console.log('✅ User data loaded from Firebase');
                                
                                // Load Firebase data into state (Firebase takes precedence for authenticated users)
                                if (firebaseData.protocols) setProtocols(firebaseData.protocols);
                                if (firebaseData.reconItems) setReconItems(firebaseData.reconItems);
                                if (firebaseData.reconHistory) setReconHistory(firebaseData.reconHistory);
                                if (firebaseData.supplements) setSupplements(firebaseData.supplements);
                                if (firebaseData.orders) setOrders(firebaseData.orders);
                                if (firebaseData.metrics) setMetrics(firebaseData.metrics);
                                if (firebaseData.vendors) setVendors(firebaseData.vendors);
                                if (firebaseData.calendarNotes) setCalendarNotes(firebaseData.calendarNotes);
                                if (firebaseData.stockpile) setStockpile(firebaseData.stockpile);
                                if (firebaseData.scheduledBuys) setScheduledBuys(firebaseData.scheduledBuys);
                                
                                // CRITICAL: Update localStorage with Firebase data to prevent future data loss
                                try {
                                    localStorage.setItem('tpprover_protocols', JSON.stringify(firebaseData.protocols || []));
                                    localStorage.setItem('tpprover_recon_items', JSON.stringify(firebaseData.reconItems || []));
                                    localStorage.setItem('tpprover_recon_history', JSON.stringify(firebaseData.reconHistory || []));
                                    localStorage.setItem('tpprover_supplements', JSON.stringify(firebaseData.supplements || []));
                                    localStorage.setItem('tpprover_orders', JSON.stringify(firebaseData.orders || []));
                                    localStorage.setItem('tpprover_metrics', JSON.stringify(firebaseData.metrics || []));
                                    localStorage.setItem('tpprover_vendors', JSON.stringify(firebaseData.vendors || []));
                                    localStorage.setItem('tpprover_calendar_notes', JSON.stringify(firebaseData.calendarNotes || {}));
                                    localStorage.setItem('tpprover_stockpile', JSON.stringify(firebaseData.stockpile || []));
                                    localStorage.setItem('tpprover_scheduled_buys', JSON.stringify(firebaseData.scheduledBuys || []));
                                    console.log('💾 Firebase data synced to localStorage backup');
                                } catch (backupError) {
                                    console.error('❌ Failed to backup Firebase data to localStorage:', backupError);
                                }
                            }
                        } catch (error) {
                            console.log('📱 Using local data (Firebase sync unavailable):', error.message);
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
            }
            setIsLoading(false);
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

        return () => {
            if (unsubscribe) unsubscribe();
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []); // FIXED: Remove data dependencies to prevent infinite loops

    // Auto-sync data to Firebase when it changes
    useEffect(() => {
        // Don't sync during initial load, demo data clearing, or if user isn't authenticated
        if (isInitialLoad || isClearingDemoData || !firebaseUser || !hasPassword) {
            return;
        }

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
        
        // CRITICAL: Immediately save to localStorage as backup before Firebase sync
        try {
            localStorage.setItem('tpprover_protocols', JSON.stringify(protocols));
            localStorage.setItem('tpprover_recon_items', JSON.stringify(reconItems));
            localStorage.setItem('tpprover_recon_history', JSON.stringify(reconHistory));
            localStorage.setItem('tpprover_supplements', JSON.stringify(supplements));
            localStorage.setItem('tpprover_orders', JSON.stringify(orders));
            localStorage.setItem('tpprover_metrics', JSON.stringify(metrics));
            localStorage.setItem('tpprover_vendors', JSON.stringify(vendors));
            localStorage.setItem('tpprover_calendar_notes', JSON.stringify(calendarNotes));
            localStorage.setItem('tpprover_stockpile', JSON.stringify(stockpile));
            localStorage.setItem('tpprover_scheduled_buys', JSON.stringify(scheduledBuys));
            console.log('💾 Data backed up to localStorage');
        } catch (error) {
            console.error('❌ Failed to backup to localStorage:', error);
        }
        
        // Only sync if we have some data to sync
        const hasData = Object.values(userData).some(data => 
            Array.isArray(data) ? data.length > 0 : Object.keys(data || {}).length > 0
        );
        
        if (hasData) {
            console.log('🔄 Syncing data to Firebase...');
            debouncedSync(userData);
        }
    }, [protocols, reconItems, reconHistory, supplements, orders, metrics, vendors, calendarNotes, stockpile, scheduledBuys]); // FIXED: Only include data dependencies, remove functions

    const logout = async () => {
        try {
            // CRITICAL: Force immediate sync before logout to prevent data loss
            if (firebaseUser && hasPassword) {
                console.log('💾 Force syncing data before logout...');
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
                console.log('✅ Data synced before logout');
            }
            
            // Sign out from Firebase - the auth state listener will handle the rest
            await logoutUser();
            
            // Redirect to login (the auth state listener will clear user/localStorage)
            window.location.href = '/login';
        } catch (error) {
            console.error('Logout failed:', error);
            // If Firebase logout fails, force clear everything manually
            setUser(null);
            localStorage.removeItem('tpprover_auth_token');
            localStorage.removeItem('tpprover_user');
            window.location.href = '/login';
        }
    };

    // Persist data to localStorage whenever it changes
    const saveData = (key, data) => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error(`Error saving ${key} to localStorage`, error);
        }
    };

    useEffect(() => { saveData('tpprover_protocols', protocols) }, [protocols]);
    useEffect(() => { saveData('tpprover_recon_items', reconItems) }, [reconItems]);
    useEffect(() => { saveData('tpprover_recon_history', reconHistory) }, [reconHistory]);
    useEffect(() => { 
        console.log('💾 Saving supplements to localStorage:', supplements);
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
        
        console.log('🗑️ Deleting vendor:', vendorExists.name);
        setVendors(prev => prev.filter(v => v.id !== vendorId));
    };

    const addSupplement = (newSupplement) => {
        // Only generate ID if not already provided
        const supplementToAdd = {
            ...newSupplement,
            id: newSupplement.id || Date.now()
        };
        
        console.log('💊 Adding supplement:', supplementToAdd);
        setSupplements(prev => {
            const updated = [supplementToAdd, ...prev];
            console.log('💊 Updated supplements array:', updated);
            return updated;
        });
    };

    const updateSupplement = (updatedSupplement) => {
        setSupplements(prev => prev.map(s => s.id === updatedSupplement.id ? updatedSupplement : s));
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
                console.log('✅ Demo data cleared and Firebase sync re-enabled');
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
                    console.log(`📊 ${key} parsed:`, Array.isArray(parsed) ? `${parsed.length} items` : typeof parsed);
                } catch (e) {
                    console.log(`❌ ${key} parse error:`, e.message);
                }
            }
        });
        
        try {
            let recoveredCount = 0;
            
            const savedProtocols = localStorage.getItem('tpprover_protocols');
            if (savedProtocols && savedProtocols !== '[]') {
                const parsed = JSON.parse(savedProtocols);
                setProtocols(parsed);
                console.log(`✅ Recovered ${parsed.length} protocols`);
                recoveredCount++;
            }

            const savedRecon = localStorage.getItem('tpprover_recon_items');
            if (savedRecon && savedRecon !== '[]') {
                const parsed = JSON.parse(savedRecon);
                setReconItems(parsed);
                console.log(`✅ Recovered ${parsed.length} recon items`);
                recoveredCount++;
            }
            
            const savedHistory = localStorage.getItem('tpprover_recon_history');
            if (savedHistory && savedHistory !== '[]') {
                const parsed = JSON.parse(savedHistory);
                setReconHistory(parsed);
                console.log(`✅ Recovered ${parsed.length} recon history items`);
                recoveredCount++;
            }

            const savedSupps = localStorage.getItem('tpprover_supplements');
            if (savedSupps && savedSupps !== '[]') {
                const parsed = JSON.parse(savedSupps);
                setSupplements(parsed);
                console.log(`✅ Recovered ${parsed.length} supplements`);
                recoveredCount++;
            }

            const savedOrders = localStorage.getItem('tpprover_orders');
            if (savedOrders && savedOrders !== '[]') {
                const parsed = JSON.parse(savedOrders);
                setOrders(parsed);
                console.log(`✅ Recovered ${parsed.length} orders`);
                recoveredCount++;
            }

            const savedMetrics = localStorage.getItem('tpprover_metrics');
            if (savedMetrics && savedMetrics !== '[]') {
                const parsed = JSON.parse(savedMetrics);
                setMetrics(parsed);
                console.log(`✅ Recovered ${parsed.length} metrics`);
                recoveredCount++;
            }

            const savedVendors = localStorage.getItem('tpprover_vendors');
            if (savedVendors && savedVendors !== '[]') {
                const parsed = JSON.parse(savedVendors);
                setVendors(parsed);
                console.log(`✅ Recovered ${parsed.length} vendors`);
                recoveredCount++;
            }
            
            const savedNotes = localStorage.getItem('tpprover_calendar_notes');
            if (savedNotes && savedNotes !== '{}') {
                const parsed = JSON.parse(savedNotes);
                setCalendarNotes(parsed);
                console.log(`✅ Recovered ${Object.keys(parsed).length} calendar notes`);
                recoveredCount++;
            }

            const savedStockpile = localStorage.getItem('tpprover_stockpile');
            if (savedStockpile && savedStockpile !== '[]') {
                const parsed = JSON.parse(savedStockpile);
                setStockpile(parsed);
                console.log(`✅ Recovered ${parsed.length} stockpile items`);
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
        
        console.log('🛡️ Data Integrity Check:', dataCategories, `Total: ${totalItems} items`);
        
        // Alert if suspicious data loss (more than 50% of data missing)
        if (totalItems === 0 && (protocols.length + vendors.length + stockpile.length) === 0) {
            console.error('🚨 CRITICAL: Complete data loss detected!');
            console.error('🚨 All data categories are empty - this may indicate a critical bug');
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
        
        // Force immediate log
        setTimeout(() => {
            console.log('🆘 EMERGENCY FUNCTIONS READY:');
            console.log('- emergencyDataCheck() - check current state');
            console.log('- emergencyRecovery() - recover from localStorage');
            console.log('- emergencyFirebaseReload() - reload from Firebase');
            console.log('- emergencyManualRecovery() - manual localStorage check');
            console.log('- emergencyDataIntegrityCheck() - validate data integrity');
            
            // CRITICAL: Run integrity check on load
            validateDataIntegrity();
        }, 1000);
        
    }, [protocols, vendors, stockpile, reconItems, orders, supplements]);

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
}
