import React, { createContext, useState, useEffect, useContext } from 'react';
import { onAuthChange, loadUserData, saveUserData } from '../services/firebase.js';

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
        const unsubscribe = onAuthChange((user) => {
            setFirebaseUser(user);
            setIsFirebaseLoading(false);
            
            if (!user) {
                // User logged out, clear password
                setUserPassword(null);
            }
        });

        return unsubscribe;
    }, []);

    // Store user password for encryption (in memory only)
    const setPassword = (password) => {
        setUserPassword(password);
    };

    // Sync user data to Firebase (encrypted)
    const syncToFirebase = async (userData) => {
        if (!firebaseUser || !userPassword) {
            console.log('Cannot sync: user not authenticated or password not available');
            return false;
        }

        try {
            setSyncStatus('syncing');
            await saveUserData(firebaseUser.uid, userData, userPassword);
            setSyncStatus('success');
            
            // Clear success status after 2 seconds
            setTimeout(() => setSyncStatus('idle'), 2000);
            return true;
        } catch (error) {
            console.error('Sync to Firebase failed:', error);
            setSyncStatus('error');
            setTimeout(() => setSyncStatus('idle'), 5000);
            return false;
        }
    };

    // Load user data from Firebase (decrypt)
    const loadFromFirebase = async () => {
        if (!firebaseUser || !userPassword) {
            console.log('Cannot load: user not authenticated or password not available');
            return null;
        }

        try {
            setSyncStatus('syncing');
            const userData = await loadUserData(firebaseUser.uid, userPassword);
            setSyncStatus('success');
            setTimeout(() => setSyncStatus('idle'), 2000);
            return userData;
        } catch (error) {
            console.error('Load from Firebase failed:', error);
            setSyncStatus('error');
            setTimeout(() => setSyncStatus('idle'), 5000);
            return null;
        }
    };

    // Auto-sync when data changes (debounced)
    const [syncTimeout, setSyncTimeout] = useState(null);
    
    const debouncedSync = (userData) => {
        if (syncTimeout) {
            clearTimeout(syncTimeout);
        }
        
        const timeout = setTimeout(() => {
            syncToFirebase(userData);
        }, 2000); // Wait 2 seconds after last change
        
        setSyncTimeout(timeout);
    };

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
