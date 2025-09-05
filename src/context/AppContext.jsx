import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';
import { seedInitialData } from '../utils/seed';

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
        
        try {
            const authToken = localStorage.getItem('tpprover_auth_token');
            if (authToken) {
                setUser({ token: authToken });
            }
        } catch (e) {
            console.error("Failed to parse auth token", e);
            setUser(null);
            localStorage.removeItem('tpprover_auth_token');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const logout = () => {
        setUser(null);
        localStorage.removeItem('tpprover_auth_token');
        localStorage.removeItem('tpprover_user');
        // The ProtectedRoute will now redirect to /login
        // We might need to navigate explicitly if the component doesn't re-render automatically
        window.location.href = '/login';
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

    const hasMockData = useMemo(() => {
        const allData = [...protocols, ...orders, ...vendors, ...supplements, ...reconItems];
        return allData.some(item => item.isMock === true);
    }, [protocols, orders, vendors, supplements, reconItems]);

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
        hasMockData,
        isLoading,
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
}
