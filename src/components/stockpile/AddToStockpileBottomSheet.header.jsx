import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useSubscriptionAccess } from '../../utils/useSubscriptionAccess';
import useAutoSave from '../../utils/useAutoSave';
import BottomSheet from '../common/BottomSheet';
import TextInput from '../common/inputs/TextInput';
import VendorSuggestInput from '../vendors/VendorSuggestInput';
import AutoSaveIndicator from '../common/AutoSaveIndicator';
import GlassmorphismDatePicker from '../common/GlassmorphismDatePicker';
import DocumentationUpload from '../common/DocumentationUpload';
import ConfirmationModal from '../ui/ConfirmationModal';
import { prepareItemForSave } from '../../utils/userDataSave';
import { generateId } from '../../utils/string';
import { TestTube, PackageOpen, ChevronDown, ChevronRight, ImageUp } from 'lucide-react';

export default function AddToStockpileBottomSheet({ open, onClose, theme, onUpgrade }) {
  const { vendors, addVendor, setStockpile } = useAppContext();
  const { isReadOnly } = useSubscriptionAccess();
  const [form, setForm] = useState({ name: '', mg: '', quantity: '', vendor: '', vendorId: null, purity: '', capColor: '', batchNumber: '', date: '', cost: '', priceUnit: 'vial', documentation: [], mgUnit: 'mg', unit: 'vial' });
  const [isAmountFocused, setIsAmountFocused] = useState(false);
  const [isQuantityFocused, setIsQuantityFocused] = useState(false);
  const [isPriceFocused, setIsPriceFocused] = useState(false);
  const [isAmountUnitDropdownOpen, setIsAmountUnitDropdownOpen] = useState(false);
  const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);
  const [isPriceUnitDropdownOpen, setIsPriceUnitDropdownOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSavingToStockpile, setIsSavingToStockpile] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);

  const { isSaving, lastSaved, clearSavedData, markAsSubmitted, updateFormData } = useAutoSave(
    'tpprover_stockpile_form_draft',
    form,
    setForm,
    2000,
    async () => {}
  );

  const getPrimaryActionGradient = (saving) => {
    const secondaryColor = theme?.secondary || '#d1d5db';
    if (saving) return `linear-gradient(135deg, ${secondaryColor} 0%, ${secondaryColor} 100%)`;
    return `linear-gradient(135deg, ${theme?.primary} 0%, ${theme?.primaryDark || theme?.primary} 100%)`;
  };
  const primaryActionDefaultShadow = theme?.isDark ? '0 4px 6px rgba(0, 0, 0, 0.3)' : '0 4px 6px rgba(0, 0, 0, 0.1)';

  const handleClose = () => {
    setShowAdvanced(false);
    const hasData = form && (form.name || form.mg || form.vendor || form.quantity);
    if (hasData && !isSavingToStockpile) {
      setShowCloseConfirmation(true);
      return;
    }
    clearSavedData();
    onClose();
  };

  const handleConfirmClose = () => {
    clearSavedData();
    setShowCloseConfirmation(false);
    setShowAdvanced(false);
    onClose();
  };

  useEffect(() => {
    if (!isAmountUnitDropdownOpen && !isUnitDropdownOpen && !isPriceUnitDropdownOpen) return;
    const handleClickOutside = (event) => {
      const isClickInside = event.target.closest('[data-dropdown-container]');
      if (!isClickInside) {
        setIsAmountUnitDropdownOpen(false);
        setIsUnitDropdownOpen(false);
        setIsPriceUnitDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isAmountUnitDropdownOpen, isUnitDropdownOpen, isPriceUnitDropdownOpen]);

  return (
    <>
      <ConfirmationModal
        open={showCloseConfirmation}
        onClose={() => setShowCloseConfirmation(false)}
        onConfirm={handleConfirmClose}
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to close without saving?"
        confirmText="Close Without Saving"
        cancelText="Cancel"
        type="warning"
        theme={theme}
      />
