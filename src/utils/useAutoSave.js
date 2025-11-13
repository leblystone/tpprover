import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Auto-save hook for form data
 * @param {string} storageKey - Unique key for localStorage
 * @param {Object} formData - Current form data
 * @param {Function} setFormData - Function to update form data
 * @param {number} delay - Auto-save delay in milliseconds (default: 2000)
 * @param {Function} onAutoSave - Optional callback for additional auto-save logic
 * @returns {Object} - { isSaving, lastSaved, clearSavedData, markAsSubmitted }
 */
export const useAutoSave = (storageKey, formData, setFormData, delay = 2000, onAutoSave = null) => {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const timeoutRef = useRef(null);
  const previousDataRef = useRef(null);
  const isSubmittedRef = useRef(false);
  const isSavingActiveRef = useRef(false);
  const isLoadingRef = useRef(false);

  // Store setFormData in ref to avoid dependency issues
  const setFormDataRef = useRef(setFormData);
  useEffect(() => {
    setFormDataRef.current = setFormData;
  }, [setFormData]);

  // Load saved data on mount
  useEffect(() => {
    if (isSubmittedRef.current) return; // Don't load if form was just submitted

    isLoadingRef.current = true;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsedData = JSON.parse(saved);
        if (parsedData.data && Object.keys(parsedData.data).length > 0) {
          // Set previous data ref to prevent autosave from triggering
          previousDataRef.current = JSON.parse(JSON.stringify(parsedData.data));
          // Defer state update to avoid React queue issues
          setTimeout(() => {
            setFormDataRef.current(parsedData.data);
            setLastSaved(new Date(parsedData.timestamp));
            isLoadingRef.current = false;
          }, 0);
          return;
        }
      }
    } catch (error) {
      console.warn('Failed to load auto-saved data:', error);
    }
    isLoadingRef.current = false;
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Store onAutoSave in a ref to prevent it from being a dependency
  const onAutoSaveRef = useRef(onAutoSave);
  useEffect(() => {
    onAutoSaveRef.current = onAutoSave;
  }, [onAutoSave]);

  // Auto-save when form data changes
  useEffect(() => {
    if (isSubmittedRef.current) return; // Don't save if form was just submitted
    if (isSavingActiveRef.current) return; // Don't trigger if already saving
    if (isLoadingRef.current) return; // Don't save while loading initial data

    // Skip if data hasn't actually changed
    const currentDataString = JSON.stringify(formData);
    const previousDataString = JSON.stringify(previousDataRef.current);
    if (currentDataString === previousDataString) {
      return;
    }

    // Skip if form is empty/default
    if (!formData || Object.keys(formData).length === 0) {
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set saving state
    isSavingActiveRef.current = true;
    setIsSaving(true);

    // Auto-save after delay
    timeoutRef.current = setTimeout(async () => {
      try {
        const saveData = {
          data: formData,
          timestamp: new Date().toISOString()
        };
        
        localStorage.setItem(storageKey, JSON.stringify(saveData));
        const savedTime = new Date();
        setLastSaved(savedTime);
        // Store a deep copy to prevent reference issues
        previousDataRef.current = JSON.parse(JSON.stringify(formData));
        
        // Call additional auto-save callback if provided (use ref to avoid dependency)
        if (onAutoSaveRef.current && typeof onAutoSaveRef.current === 'function') {
          try {
            await onAutoSaveRef.current(formData);
          } catch (error) {
            console.warn('Additional auto-save callback failed:', error);
          }
        }
        
        // Dispatch autosave event for protocol updates
        if (storageKey.includes('protocol_draft_')) {
          window.dispatchEvent(new CustomEvent('tpp:protocol-autosaved', {
            detail: { storageKey, formData }
          }));
        }
      } catch (error) {
        console.warn('Failed to auto-save data:', error);
      } finally {
        isSavingActiveRef.current = false;
        setIsSaving(false);
        timeoutRef.current = null;
      }
    }, delay);

    return () => {
      // Only clear the timeout on cleanup, don't modify state
      // State will be reset when the timeout completes
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [formData, storageKey, delay]);

  // Clear saved data
  const clearSavedData = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setLastSaved(null);
      previousDataRef.current = null;
    } catch (error) {
      console.warn('Failed to clear auto-saved data:', error);
    }
  }, [storageKey]);

  // Mark as submitted (prevents loading on next mount)
  const markAsSubmitted = useCallback(() => {
    isSubmittedRef.current = true;
    clearSavedData();
  }, [clearSavedData]);

  // Update form data helper
  const updateFormData = useCallback((updates) => {
    if (typeof updates === 'function') {
      setFormData(prev => {
        const newData = updates(prev);
        return newData;
      });
    } else {
      setFormData(prev => ({ ...prev, ...updates }));
    }
  }, [setFormData]);

  return {
    isSaving,
    lastSaved,
    clearSavedData,
    markAsSubmitted,
    updateFormData
  };
};

export default useAutoSave;