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
    
    // Firebase sync integration
    const { firebaseUser, hasPassword, debouncedSync, loadFromFirebase } = useFirebase();

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
                                // Load Firebase data into state
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
                                console.log('✅ User data loaded from Firebase');
                            }
                        } catch (error) {
                            console.log('📱 Using local data (Firebase sync unavailable):', error.message);
                        }
                    }
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

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [hasPassword, loadFromFirebase]);

    // Auto-sync data to Firebase when it changes
    useEffect(() => {
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
            
            // Only sync if we have some data to sync
            const hasData = Object.values(userData).some(data => 
                Array.isArray(data) ? data.length > 0 : Object.keys(data || {}).length > 0
            );
            
            if (hasData) {
                console.log('🔄 Syncing data to Firebase...');
                debouncedSync(userData);
            }
        }
    }, [firebaseUser, hasPassword, protocols, reconItems, reconHistory, supplements, orders, metrics, vendors, calendarNotes, stockpile, scheduledBuys, debouncedSync]);

    const logout = async () => {
        try {
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
    useEffect(() => { saveData('tpprover_supplements', supplements) }, [supplements]);
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
        setVendors(prev => prev.filter(v => v.id !== vendorId));
    };

    const addSupplement = (newSupplement) => {
        setSupplements(prev => [{...newSupplement, id: Date.now()}, ...prev]);
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
        } catch (error) {
            console.error("Error refreshing data after clear:", error);
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
        hasMockData,
        isLoading,
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
}
