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

  // Store setFormData in ref to avoid dependency issues
  const setFormDataRef = useRef(setFormData);
  useEffect(() => {
    setFormDataRef.current = setFormData;
  }, [setFormData]);

  // Load saved data on mount
  useEffect(() => {
    if (isSubmittedRef.current) return; // Don't load if form was just submitted

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsedData = JSON.parse(saved);
        if (parsedData.data && Object.keys(parsedData.data).length > 0) {
          // Set previous data ref to prevent autosave from triggering
          previousDataRef.current = parsedData.data;
          setFormDataRef.current(parsedData.data);
          setLastSaved(new Date(parsedData.timestamp));
        }
      }
    } catch (error) {
      console.warn('Failed to load auto-saved data:', error);
    }
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

    // Skip if data hasn't actually changed
    if (JSON.stringify(formData) === JSON.stringify(previousDataRef.current)) {
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
        previousDataRef.current = formData;
        
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
      // Only clear timeout and reset state if we're canceling an active save
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        // Only reset saving state if we were in the process of saving
        // This prevents the cleanup from causing unnecessary re-renders
        if (isSavingActiveRef.current) {
          isSavingActiveRef.current = false;
          setIsSaving(false);
        }
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