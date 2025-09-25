import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Auto-save hook for form data
 * @param {string} storageKey - Unique key for localStorage
 * @param {Object} formData - Current form data
 * @param {Function} setFormData - Function to update form data
 * @param {number} delay - Auto-save delay in milliseconds (default: 2000)
 * @returns {Object} - { isSaving, lastSaved, clearSavedData, markAsSubmitted }
 */
export const useAutoSave = (storageKey, formData, setFormData, delay = 2000) => {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const timeoutRef = useRef(null);
  const previousDataRef = useRef(null);
  const isSubmittedRef = useRef(false);

  // Load saved data on mount
  useEffect(() => {
    if (isSubmittedRef.current) return; // Don't load if form was just submitted

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsedData = JSON.parse(saved);
        if (parsedData.data && Object.keys(parsedData.data).length > 0) {
          setFormData(parsedData.data);
          setLastSaved(new Date(parsedData.timestamp));
        }
      }
    } catch (error) {
      console.warn('Failed to load auto-saved data:', error);
    }
  }, [storageKey, setFormData]);

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
    setIsSaving(true);

    // Auto-save after delay
    timeoutRef.current = setTimeout(() => {
      try {
        const saveData = {
          data: formData,
          timestamp: new Date().toISOString()
        };
        
        localStorage.setItem(storageKey, JSON.stringify(saveData));
        setLastSaved(new Date());
        previousDataRef.current = formData;
      } catch (error) {
        console.warn('Failed to auto-save data:', error);
      } finally {
        setIsSaving(false);
      }
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setIsSaving(false);
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