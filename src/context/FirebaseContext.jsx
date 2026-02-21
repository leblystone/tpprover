import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { onAuthChange, loadUserData, saveUserData } from '../services/firebase.js';
import { auth } from '../config/firebase.js';

const FirebaseContext = createContext();

export function useFirebase() {
    return useContext(FirebaseContext);
}

export function FirebaseProvider({ children }) {
    const [firebaseUser, setFirebaseUser] = useState(null);
    const [isFirebaseLoading, setIsFirebaseLoading] = useState(true);
    const [userPassword, setUserPassword] = useState(null); // For encryption
    const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, error, success

    // Listen to Firebase Auth changes
    useEffect(() => {
        let timeoutId = null;
        let isMounted = true;
        
        // Fallback to prevent infinite loading even if listener fails to fire in native webviews.
        timeoutId = setTimeout(() => {
            if (isMounted) {
                const currentUser = auth?.currentUser ?? null;
                setFirebaseUser(currentUser);
                setIsFirebaseLoading(false);
            }
        }, 15000);
        
        const unsubscribe = onAuthChange((user) => {
            // Clear timeout since auth state changed
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
            
            if (isMounted) {
                setFirebaseUser(user);
                setIsFirebaseLoading(false);
                
                if (!user) {
                    // User logged out, clear password
                    setUserPassword(null);
                }
            }
        });

        return () => {
            isMounted = false;
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            unsubscribe();
        };
    }, []);

    // Store user password for encryption (in memory only)
    const setPassword = (password) => {
        setUserPassword(password);
    };

    // Sync user data to Firebase (encrypted)
    const syncToFirebase = useCallback(async (userData) => {
        if (!firebaseUser || !userPassword) {
            console.log('Cannot sync: user not authenticated or password not available');
            return false;
        }

        try {
            setSyncStatus('syncing');
            
            // CRITICAL FIX: Add timeout for sync operations to prevent hanging on WiFi issues
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Firebase sync timeout - possibly blocked by firewall/VPN')), 15000)
            );
            
            const syncPromise = saveUserData(firebaseUser.uid, userData, userPassword);
            await Promise.race([syncPromise, timeoutPromise]);
            
            setSyncStatus('success');
            
            // Clear success status after 2 seconds
            setTimeout(() => setSyncStatus('idle'), 2000);
            return true;
        } catch (error) {
            console.error('Sync to Firebase failed:', error);
            
            // Provide specific guidance for WiFi/VPN issues
            if (error.message.includes('timeout') || error.message.includes('network')) {
                console.warn('🌐 Sync failed - may be WiFi/VPN related');
                console.log('💡 Data is still saved locally. Try switching to mobile data to sync.');
            }
            
            setSyncStatus('error');
            setTimeout(() => setSyncStatus('idle'), 5000);
            return false;
        }
    }, [firebaseUser, userPassword]);

    // Load user data from Firebase (decrypt)
    const loadFromFirebase = useCallback(async () => {
        if (!firebaseUser) {
            if (import.meta.env.DEV) {
                console.log('Cannot load: user not authenticated');
            }
            return null;
        }
        
        // Fail fast if password is required but not available
        if (!userPassword) {
            // Only log in development - don't spam console
            if (import.meta.env.DEV) {
                console.log('⚠️ Password not available - skipping Firebase load');
            }
            return null; // Return null immediately instead of attempting decrypt
        }

        try {
            setSyncStatus('syncing');
            
            // CRITICAL FIX: Add timeout and better error handling for WiFi/VPN issues
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Firebase timeout - possibly blocked by firewall/VPN')), 10000) // Reduced from 15s to 10s
            );
            
            const loadPromise = loadUserData(firebaseUser.uid, userPassword);
            const userData = await Promise.race([loadPromise, timeoutPromise]);
            
            setSyncStatus('success');
            setTimeout(() => setSyncStatus('idle'), 2000);
            return userData;
        } catch (error) {
            // Only log errors in development mode
            if (import.meta.env.DEV) {
                console.error('Load from Firebase failed:', error);
                
                // Provide specific error messages for common WiFi/VPN issues
                if (error.message.includes('timeout') || error.message.includes('network')) {
                    console.warn('🌐 Network issue detected - may be WiFi/VPN related');
                    console.log('💡 Try: 1) Switch to mobile data, 2) Disable VPN, 3) Use window.clearAppCache()');
                }
            }
            
            setSyncStatus('error');
            setTimeout(() => setSyncStatus('idle'), 5000);
            return null;
        }
    }, [firebaseUser, userPassword]);

    // Auto-sync when data changes (debounced)
    const [syncTimeout, setSyncTimeout] = useState(null);
    
    const debouncedSync = useCallback((userData) => {
        if (syncTimeout) {
            clearTimeout(syncTimeout);
        }
        
        const timeout = setTimeout(() => {
            console.log('⏰ Debounce timer expired - syncing data to Firebase');
            syncToFirebase(userData);
        }, 1000); // Wait 1 second after last change (reduced from 2 seconds)
        
        setSyncTimeout(timeout);
    }, [syncTimeout, syncToFirebase]);

    const value = {
        firebaseUser,
        isFirebaseLoading,
        userPassword,
        syncStatus,
        setPassword,
        syncToFirebase,
        loadFromFirebase,
        debouncedSync,
        isAuthenticated: !!firebaseUser,
        hasPassword: !!userPassword
    };

    return (
        <FirebaseContext.Provider value={value}>
            {children}
        </FirebaseContext.Provider>
    );
}
