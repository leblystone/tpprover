import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

const defaultData = {
  enabled: true,
  cap: 100,
  totalGranted: 0,
  remaining: 100,
  discountPercent: 25,
  isFounder: false,
  founderNumber: null,
  founderLockedRate: null,
  couponConfigured: false,
  lifetimePriceConfigured: false,
};

const FounderOfferContext = createContext({
  ...defaultData,
  loading: true,
  error: null,
  lastFetched: null,
  founderActive: false,
  refresh: () => {},
});

export function FounderOfferProvider({ children }) {
  const [state, setState] = useState({
    loading: true,
    error: null,
    data: defaultData,
    lastFetched: null,
  });

  const fetchStatus = useCallback(async () => {
    // Skip function call in development if function isn't available
    // This prevents CORS errors during local development
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const skipFunctionCall = isDev && !process.env.VITE_ENABLE_FOUNDER_FUNCTION;
    
    if (!functions || skipFunctionCall) {
      console.info('ℹ️ Using default founder pricing (function not available in dev mode)');
      setState((prev) => ({
        ...prev,
        loading: false,
        error: null,
        data: defaultData,
        lastFetched: Date.now(),
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));

    try {
      const callable = httpsCallable(functions, 'getFounderOfferStatus');
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Function call timeout')), 5000)
      );
      
      const response = await Promise.race([callable(), timeoutPromise]);
      const payload = response?.data || {};

      // If the function returned an error, use defaults but log it
      if (payload.success === false) {
        console.warn('⚠️ Founder offer status returned error, using defaults:', payload.message || payload.error);
        setState({
          loading: false,
          error: null, // Don't show error to user - just use defaults
          data: {
            ...defaultData,
            ...payload, // Include any partial data if available
          },
          lastFetched: Date.now(),
        });
        return;
      }

      setState({
        loading: false,
        error: null,
        data: {
          ...defaultData,
          ...payload,
        },
        lastFetched: Date.now(),
      });
    } catch (error) {
      // Check if this is a function not found or CORS error (function not deployed)
      const isFunctionNotDeployed = 
        error.code === 'functions/not-found' ||
        error.code === 'functions/internal' ||
        error.message?.includes('CORS') ||
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('timeout');
      
      if (isFunctionNotDeployed) {
        console.info('ℹ️ Founder offer function not available yet, using defaults. Deploy functions to enable dynamic pricing.');
      } else {
        console.error('❌ Failed to load founder offer status:', error);
        console.error('❌ Error details:', {
          code: error.code,
          message: error.message,
          details: error.details
        });
      }
      
      // Always use defaults on error - don't block the app
      // This allows the app to work even if the function isn't deployed
      setState({
        loading: false,
        error: null, // Don't show error - just use defaults silently
        data: defaultData,
        lastFetched: Date.now(),
      });
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const value = useMemo(() => {
    const data = state.data || defaultData;
    const founderActive = data.enabled && (data.isFounder || (data.remaining ?? 0) > 0);

    return {
      ...data,
      loading: state.loading,
      error: state.error,
      lastFetched: state.lastFetched,
      founderActive,
      refresh: fetchStatus,
    };
  }, [state, fetchStatus]);

  return (
    <FounderOfferContext.Provider value={value}>
      {children}
    </FounderOfferContext.Provider>
  );
}

export function useFounderOffer() {
  return useContext(FounderOfferContext);
}

