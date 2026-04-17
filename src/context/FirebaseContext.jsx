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
    const [userPassword, setUserPassword] = useState(null); // For email/password users
    const [socialEncKey, setSocialEncKey] = useState(null); // For Google/magic-link/passkey users
    const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, error, success

    // The effective encryption key: password takes priority, then social key
    const effectiveKey = userPassword || socialEncKey;

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
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
            
            if (isMounted) {
                setFirebaseUser(user);
                setIsFirebaseLoading(false);
                
                if (!user) {
                    setUserPassword(null);
                    setSocialEncKey(null);
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

    // Store password for email/password users (in memory only)
    const setPassword = (password) => {
        setUserPassword(password);
    };

    // Store social encryption key for Google/magic-link/passkey users (in memory only)
    const setSocialKey = (key) => {
        setSocialEncKey(key);
    };

    // Sync user data to Firebase (encrypted)
    const syncToFirebase = useCallback(async (userData) => {
        if (!firebaseUser || !effectiveKey) {
            console.log('Cannot sync: user not authenticated or encryption key not available');
            return false;
        }

        try {
            setSyncStatus('syncing');
            
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Firebase sync timeout - possibly blocked by firewall/VPN')), 15000)
            );
            
            const syncPromise = saveUserData(firebaseUser.uid, userData, effectiveKey);
            await Promise.race([syncPromise, timeoutPromise]);
            
            setSyncStatus('success');
            setTimeout(() => setSyncStatus('idle'), 2000);
            return true;
        } catch (error) {
            console.error('Sync to Firebase failed:', error);
            
            if (error.message.includes('timeout') || error.message.includes('network')) {
                console.warn('🌐 Sync failed - may be WiFi/VPN related');
                console.log('💡 Data is still saved locally. Try switching to mobile data to sync.');
            }
            
            setSyncStatus('error');
            setTimeout(() => setSyncStatus('idle'), 5000);
            return false;
        }
    }, [firebaseUser, effectiveKey]);

    // Load user data from Firebase (decrypt)
    const loadFromFirebase = useCallback(async () => {
        if (!firebaseUser) {
            if (import.meta.env.DEV) {
                console.log('Cannot load: user not authenticated');
            }
            return null;
        }
        
        if (!effectiveKey) {
            if (import.meta.env.DEV) {
                console.log('⚠️ Encryption key not available - skipping Firebase load');
            }
            return null;
        }

        try {
            setSyncStatus('syncing');
            
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Firebase timeout - possibly blocked by firewall/VPN')), 10000)
            );
            
            const loadPromise = loadUserData(firebaseUser.uid, effectiveKey);
            const userData = await Promise.race([loadPromise, timeoutPromise]);
            
            setSyncStatus('success');
            setTimeout(() => setSyncStatus('idle'), 2000);
            return userData;
        } catch (error) {
            if (import.meta.env.DEV) {
                console.error('Load from Firebase failed:', error);
                
                if (error.message.includes('timeout') || error.message.includes('network')) {
                    console.warn('🌐 Network issue detected - may be WiFi/VPN related');
                    console.log('💡 Try: 1) Switch to mobile data, 2) Disable VPN, 3) Use window.clearAppCache()');
                }
            }
            
            setSyncStatus('error');
            setTimeout(() => setSyncStatus('idle'), 5000);
            return null;
        }
    }, [firebaseUser, effectiveKey]);

    // Auto-sync when data changes (debounced)
    const [syncTimeout, setSyncTimeout] = useState(null);
    
    const debouncedSync = useCallback((userData) => {
        if (syncTimeout) {
            clearTimeout(syncTimeout);
        }
        
        const timeout = setTimeout(() => {
            console.log('⏰ Debounce timer expired - syncing data to Firebase');
            syncToFirebase(userData);
        }, 1000);
        
        setSyncTimeout(timeout);
    }, [syncTimeout, syncToFirebase]);

    const value = {
        firebaseUser,
        isFirebaseLoading,
        userPassword,
        socialEncKey,
        effectiveKey,
        syncStatus,
        setPassword,
        setSocialKey,
        syncToFirebase,
        loadFromFirebase,
        debouncedSync,
        isAuthenticated: !!firebaseUser,
        hasPassword: !!userPassword,
        hasEncKey: !!effectiveKey,
    };

    return (
        <FirebaseContext.Provider value={value}>
            {children}
        </FirebaseContext.Provider>
    );
}
