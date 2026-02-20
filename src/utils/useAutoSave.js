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
    // Use requestAnimationFrame for non-blocking load
    requestAnimationFrame(() => {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsedData = JSON.parse(saved);
          if (parsedData.data && Object.keys(parsedData.data).length > 0) {
            // Set previous data ref to prevent autosave from triggering
            previousDataRef.current = JSON.parse(JSON.stringify(parsedData.data));
            // Use another RAF to ensure UI is responsive
            requestAnimationFrame(() => {
              setFormDataRef.current(parsedData.data);
              setLastSaved(new Date(parsedData.timestamp));
              isLoadingRef.current = false;
            });
            return;
          }
        }
      } catch (error) {
        console.warn('Failed to load auto-saved data:', error);
      }
      isLoadingRef.current = false;
    });
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Store onAutoSave in a ref to prevent it from being a dependency
  const onAutoSaveRef = useRef(onAutoSave);
  useEffect(() => {
    onAutoSaveRef.current = onAutoSave;
  }, [onAutoSave]);

  // Auto-save when form data changes (debounced)
  useEffect(() => {
    if (isSubmittedRef.current) return;
    if (isLoadingRef.current) return;

    const currentDataString = JSON.stringify(formData);
    const previousDataString = JSON.stringify(previousDataRef.current);
    if (currentDataString === previousDataString) {
      return;
    }

    if (!formData || Object.keys(formData).length === 0) {
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setIsSaving(true);

    timeoutRef.current = setTimeout(async () => {
      try {
        const saveData = {
          data: formData,
          timestamp: new Date().toISOString()
        };
        
        localStorage.setItem(storageKey, JSON.stringify(saveData));
        const savedTime = new Date();
        setLastSaved(savedTime);
        previousDataRef.current = JSON.parse(JSON.stringify(formData));
        
        if (onAutoSaveRef.current && typeof onAutoSaveRef.current === 'function') {
          try {
            await onAutoSaveRef.current(formData);
          } catch (error) {
            console.warn('Additional auto-save callback failed:', error);
          }
        }
        
        if (storageKey.includes('protocol_draft_')) {
          window.dispatchEvent(new CustomEvent('tpp:protocol-autosaved', {
            detail: { storageKey, formData }
          }));
        }
      } catch (error) {
        console.warn('Failed to auto-save data:', error);
      } finally {
        setIsSaving(false);
        timeoutRef.current = null;
      }
    }, delay);

    return () => {
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