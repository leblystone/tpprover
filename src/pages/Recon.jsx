import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import { themes, defaultThemeName } from '../theme/themes'
import TextInput from '../components/common/inputs/TextInput'
import { Edit, Trash2, PlusCircle, Filter, FileText, Eye, PenTool, Search, Package, Calendar, Beaker, Droplet, Calculator, Save, CheckCircle, History, Pipette, X, TestTube, Droplets, ChevronDown } from 'lucide-react'
import AutoSaveIndicator from '../components/common/AutoSaveIndicator'
import useAutoSave from '../utils/useAutoSave'
import VendorSuggestInput from '../components/vendors/VendorSuggestInput'
import CombinedDosageInput from '../components/common/inputs/CombinedDosageInput'
import ColorSwatchDropdown from '../components/common/inputs/ColorSwatchDropdown'
import { ReconCalculatorPanel } from '../components/recon/ReconCalculatorPanel'
import ReconHelpPanel from '../components/recon/ReconHelpPanel'
import { formatCurrency } from '../utils/currencyUtils'
import { getChromeGradient } from '../utils/recon'
import { PEN_COLORS, penColors } from '../utils/penColors'
import Tabs from '../components/common/Tabs'
import Modal from '../components/common/Modal'
import { calculateRecon } from '../utils/recon'
import { formatMMDDYYYY } from '../utils/date'
import { useAppContext } from '../context/AppContext'
import { appendStockEvent } from '../utils/stockHistory'
import { generateId } from '../utils/string'
import { useSubscriptionAccess } from '../utils/useSubscriptionAccess'
import UpgradeModal from '../components/common/UpgradeModal'
import { saveAppData } from '../services/cloudStorage'
import { useFirebase } from '../context/FirebaseContext'

export default function Recon() {
	const { theme } = useOutletContext()
    const { reconItems, setReconItems, vendors, reconHistory, setReconHistory, stockpile, setStockpile, protocols, orders, supplements, metrics, calendarNotes, scheduledBuys } = useAppContext();
    const { isReadOnly } = useSubscriptionAccess();
    const { firebaseUser } = useFirebase();
	const [searchParams] = useSearchParams()
	const [editingItem, setEditingItem] = useState(null)
	const [showEditModal, setShowEditModal] = useState(false)
	const [viewItem, setViewItem] = useState(null)
    const [historyToDelete, setHistoryToDelete] = useState(null)

    // Autosave for Add/Edit Recon modal
    const [draft, setDraft] = useState({})
    const { isSaving, lastSaved, clearSavedData, updateFormData } = useAutoSave('tpprover_recon_add_draft', draft, setDraft, 1200)
	const [prefill, setPrefill] = useState(null)
	const [draftIdToRemove, setDraftIdToRemove] = useState(null) // Track draft ID to remove when saving
	const [activeTab, setActiveTab] = useState('reconstituted') // reconstituted | history | calculator
	const [searchQuery, setSearchQuery] = useState('')
	const [showHistoryFilters, setShowHistoryFilters] = useState(false)
	const [historyFilters, setHistoryFilters] = useState({ peptide: '', vendor: '' })
	const [showUpgradeModal, setShowUpgradeModal] = useState(false)
	const [isPenTypeDropdownOpen, setIsPenTypeDropdownOpen] = useState(false)
	const penTypeDropdownRef = useRef(null)
	const [penColor, setPenColor] = useState('#9ca3af')
	const getPrimaryActionGradient = useCallback((saving = false) => {
		const secondaryColor = theme?.secondary || '#d1d5db';
		if (saving) {
			return `linear-gradient(135deg, ${secondaryColor} 0%, ${secondaryColor} 100%)`;
		}
		return `linear-gradient(135deg, ${theme?.primary || '#2563eb'} 0%, ${theme?.primaryDark || theme?.primary || '#1d4ed8'} 100%)`;
	}, [theme]);
	const primaryActionDefaultShadow = useMemo(() => (
		theme?.isDark ? '0 4px 10px rgba(0, 0, 0, 0.35)' : '0 4px 12px rgba(15, 23, 42, 0.18)'
	), [theme]);
	const primaryActionHoverShadow = useMemo(() => (
		theme?.isDark ? '0 12px 28px rgba(0, 0, 0, 0.55)' : '0 12px 28px rgba(15, 23, 42, 0.24)'
	), [theme]);
	const terracottaGradient = 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)';
	const terracottaHoverGradient = 'linear-gradient(135deg, #b5684a 0%, #a35a3f 100%)';

	const updateEditingItem = useCallback((updates) => {
		if (!updates) return;
		setEditingItem(prev => ({ ...(prev || {}), ...updates }));
	}, [setEditingItem]);

	useEffect(() => {
		if (showEditModal === true && !editingItem) {
			if (draft && Object.keys(draft).length > 0) {
				setEditingItem({ ...draft });
			} else {
				setEditingItem({ doseUnit: 'mcg' });
			}
		}
	}, [showEditModal, editingItem, draft]);

    useEffect(() => {
		try {
			localStorage.setItem('tpprover_recon_history', JSON.stringify(reconHistory));
		} catch (e) {
			console.error("Failed to save recon history", e);
		}
	}, [reconHistory]);

	// Load prefill data from stockpile and auto-open calculator
	// Only load if it's valid data (has peptide name or peptides array)
	useEffect(() => {
		try {
			const raw = localStorage.getItem('tpprover_recon_prefill')
			if (raw) {
				const data = JSON.parse(raw)
				// Only use prefill if it has valid data (peptide name or peptides array)
				// This prevents stale test data from prefilling the calculator
				const hasValidPrefill = (data.peptide && data.peptide.trim() !== '') || 
				                       (Array.isArray(data.peptides) && data.peptides.length > 0 && data.peptides.some(p => p.name && p.name.trim() !== ''))
				
				if (hasValidPrefill) {
					setPrefill(data)
					// Automatically switch to calculator tab when valid prefill data exists
					setActiveTab('calculator')
					// Show toast to let user know data was loaded
					const peptideName = data.peptide || (data.peptides && data.peptides[0]?.name) || 'peptide'
					window.dispatchEvent(new CustomEvent('tpp:toast', { 
						detail: { message: `✅ Loaded ${peptideName} from stockpile!`, type: 'success' } 
					}));
				} else {
					// Clear invalid/stale prefill data
					localStorage.removeItem('tpprover_recon_prefill')
				}
			}
		} catch {
			// Clear corrupted prefill data
			try { localStorage.removeItem('tpprover_recon_prefill') } catch {}
		}
	}, [])

	// Handle click outside for dropdowns (supports both mouse and touch)
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (penTypeDropdownRef.current && !penTypeDropdownRef.current.contains(event.target)) {
				setIsPenTypeDropdownOpen(false);
			}
		};

		if (isPenTypeDropdownOpen) {
			// Support both mouse and touch events for mobile compatibility
			document.addEventListener('mousedown', handleClickOutside);
			document.addEventListener('touchstart', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
			document.removeEventListener('touchstart', handleClickOutside);
		};
	}, [isPenTypeDropdownOpen]);

	// Sync pen color from editingItem
	useEffect(() => {
		if (editingItem?.penColor) {
			// Find the hex color from the pen color name
			const colorObj = penColors.find(c => c.name.toLowerCase() === editingItem.penColor.toLowerCase());
			if (colorObj) {
				setPenColor(colorObj.hex);
			}
		}
	}, [editingItem?.penColor]);

	const handleSave = (item) => {
		const now = new Date().toISOString();
		const next = editingItem?.id
			? reconItems.map(i => i.id === editingItem.id ? { 
				...i, 
				...item, 
				updatedAt: now 
			} : i)
			: [{ 
				id: generateId(), 
				...item, 
				createdAt: now, 
				updatedAt: now 
			}, ...reconItems]
		setReconItems(next)
		setShowEditModal(false)
	}

	const handleSaveEdit = (editedData) => {
		setReconItems(prev => prev.map(item => item.id === editingItem.id ? { ...item, ...editedData } : item));
		setEditingItem(null);
	};

	// Helper function to remove draft and sync immediately
	const removeDraftAndSync = useCallback(async (draftId) => {
		if (!draftId) return;
		
		// Remove from local state
		const updatedItems = reconItems.filter(item => item.id !== draftId);
		setReconItems(updatedItems);
		
		// Immediately sync to localStorage
		try {
			localStorage.setItem('tpprover_recon_items', JSON.stringify(updatedItems));
		} catch (e) {
			console.error("Failed to save recon items to localStorage", e);
		}
		
		// CRITICAL: Force immediate cloud sync with skipMerge to ensure deletion persists
		// This prevents server data from restoring deleted items
		if (firebaseUser) {
			try {
				const userId = firebaseUser.uid;
				const appData = {
					protocols: protocols || [],
					reconItems: updatedItems,
					reconHistory: reconHistory || [],
					supplements: supplements || [],
					orders: orders || [],
					metrics: metrics || [],
					vendors: vendors || [],
					calendarNotes: calendarNotes || {},
					stockpile: stockpile || [],
					scheduledBuys: scheduledBuys || []
				};
				
				// Force immediate sync with skipMerge to overwrite server data
				const syncResult = await saveAppData(userId, appData, { skipMerge: true });
				if (syncResult) {
					console.log('✅ Draft removed and synced to cloud immediately');
				} else {
					console.error('❌ Failed to sync draft removal to cloud');
				}
			} catch (error) {
				console.error('❌ Error syncing draft removal to cloud:', error);
				// Don't throw - the auto-sync will handle it
			}
		}
	}, [reconItems, setReconItems, firebaseUser, protocols, reconHistory, supplements, orders, metrics, calendarNotes, stockpile, scheduledBuys]);

	const handleDelete = async (id) => {
		// Find the item being deleted for logging
		const itemToDelete = reconItems.find(item => item.id === id);
		
		if (itemToDelete) {
			console.log('🗑️ Deleting recon item:', `${itemToDelete.peptide || 'Unknown'} ${itemToDelete.mg || ''}mg`);
		}
		
		// Record deletion with item snapshot for restore functionality
		const { recordDeletion } = require('../utils/deletionTracking');
		if (itemToDelete) {
			recordDeletion('reconItems', id, itemToDelete);
		} else {
			recordDeletion('reconItems', id);
		}
		
		// Remove from local state
		const updatedItems = reconItems.filter(item => item.id !== id);
		setReconItems(updatedItems);
		setEditingItem(null);
		setShowEditModal(false);
		
		// CRITICAL: Force immediate cloud sync with skipMerge to ensure deletion persists
		// This prevents server data from restoring deleted items
		if (firebaseUser) {
			try {
				const userId = firebaseUser.uid;
				const appData = {
					protocols: protocols || [],
					reconItems: updatedItems, // Use updated items with deletion
					reconHistory: reconHistory || [],
					supplements: supplements || [],
					orders: orders || [],
					metrics: metrics || [],
					vendors: vendors || [],
					calendarNotes: calendarNotes || {},
					stockpile: stockpile || [],
					scheduledBuys: scheduledBuys || []
				};
				
				// Force immediate sync with skipMerge to overwrite server data
				const syncResult = await saveAppData(userId, appData, { skipMerge: true });
				if (syncResult) {
					console.log('✅ Deleted recon item synced to cloud immediately');
				} else {
					console.error('❌ Failed to sync deleted recon item to cloud');
				}
			} catch (error) {
				console.error('❌ Error syncing deleted recon item to cloud:', error);
				// Don't throw - the auto-sync will handle it
			}
		}
	};

	const vendorMap = useMemo(() => vendors.reduce((acc, v) => ({ ...acc, [v.id]: v.name }), {}), [vendors]);

    const adjustStockpileAfterRecon = useCallback((peptidesUsed) => {
        if (!Array.isArray(peptidesUsed) || peptidesUsed.length === 0) {
            console.log('⚠️ adjustStockpileAfterRecon: No peptides provided or empty array');
            return;
        }

        console.log('🔍 adjustStockpileAfterRecon: Processing peptides:', peptidesUsed);

        const usageMap = peptidesUsed.reduce((acc, pep) => {
            if (!pep || !pep.stockpileId) {
                console.log('⚠️ Skipping peptide without stockpileId:', pep);
                return acc;
            }
            const qty = Number(pep.quantityUsed) || 1;
            acc[pep.stockpileId] = (acc[pep.stockpileId] || 0) + qty;
            console.log(`📦 Mapped usage: stockpileId=${pep.stockpileId}, quantityUsed=${qty}`);
            return acc;
        }, {});

        if (Object.keys(usageMap).length === 0) {
            console.warn('⚠️ adjustStockpileAfterRecon: No valid stockpileIds found in peptides');
            return;
        }

        console.log('📊 Usage map:', usageMap);

        setStockpile(prev => {
            let changed = false;
            const updated = prev.map(item => {
                const usedQty = usageMap[item.id];
                if (!usedQty) return item;

                const currentQty = Number(item.quantity) || 0;
                const nextQty = Math.max(0, currentQty - usedQty);

                console.log(`🔄 Updating stockpile item ${item.id}: ${currentQty} -> ${nextQty} (used ${usedQty})`);

                if (nextQty === currentQty) {
                    return item;
                }

                changed = true;

                try {
                    appendStockEvent({
                        type: 'used',
                        name: item.name,
                        mg: item.mg,
                        vendor: item.vendorId ? vendorMap[item.vendorId] : item.vendor,
                        prevQty: currentQty,
                        nextQty
                    });
                } catch (error) {
                    console.warn('Failed to append stock event after recon save:', error);
                }

                return { ...item, quantity: String(nextQty) };
            });

            // Remove items with 0 quantity
            const filtered = updated.filter(item => {
                const qty = Number(item.quantity) || 0;
                if (qty === 0) {
                    console.log(`🗑️ Removing stockpile item with 0 quantity: ${item.name} (${item.id})`);
                    return false;
                }
                return true;
            });

            if (filtered.length !== updated.length) {
                changed = true;
                console.log(`✅ Removed ${updated.length - filtered.length} items with 0 quantity`);
            }

            if (changed) {
                console.log('✅ Stockpile updated successfully');
            } else {
                console.warn('⚠️ No changes made to stockpile');
            }

            return changed ? filtered : prev;
        });
    }, [setStockpile, vendorMap]);

	// Helper functions to extract data from editing item
	const getEditingPeptideName = () => {
		if (!editingItem) return draft.peptide || '';
		if (editingItem.peptide) return editingItem.peptide;
		if (Array.isArray(editingItem.peptides) && editingItem.peptides.length > 0) {
			return editingItem.peptides.map(p => p.name || 'Unnamed').join(' + ');
		}
		return '';
	};

	const getEditingMg = () => {
		if (!editingItem) return draft.mg || '';
		if (editingItem.mg) return editingItem.mg;
		if (Array.isArray(editingItem.peptides) && editingItem.peptides.length > 0) {
			return editingItem.peptides.reduce((sum, p) => sum + (Number(p.mg) || 0), 0);
		}
		return '';
	};

	const getEditingDose = () => {
		if (!editingItem) return draft.dose || '';
		if (editingItem.dose) return editingItem.dose;
		if (Array.isArray(editingItem.peptides) && editingItem.peptides.length > 0) {
			return editingItem.peptides.reduce((sum, p) => {
				const dose = Number(p.dose) || 0;
				return p.doseUnit === 'mg' ? sum + (dose * 1000) : sum + dose;
			}, 0);
		}
		return '';
	};

	const getEditingDoseUnit = () => {
		if (!editingItem) return draft.doseUnit || 'mcg';
		if (editingItem.doseUnit) return editingItem.doseUnit;
		if (Array.isArray(editingItem.peptides) && editingItem.peptides.length > 0) {
			// If all peptides use the same unit, return that unit, otherwise default to mcg
			const units = [...new Set(editingItem.peptides.map(p => p.doseUnit || 'mcg'))];
			return units.length === 1 ? units[0] : 'mcg';
		}
		return 'mcg';
	};

	const handleCalculatorSave = useCallback(async (data) => {
        if (isReadOnly) {
            setShowUpgradeModal(true);
            return;
        }

        const peptides = Array.isArray(data?.peptides) ? data.peptides : [];
        
        // Log peptides to verify stockpileId is present
        console.log('💾 handleCalculatorSave: Received peptides:', peptides.map(p => ({
            name: p.name,
            stockpileId: p.stockpileId,
            quantityUsed: p.quantityUsed
        })));
        
        const peptideNames = peptides.length > 0
            ? peptides.map(p => p.name || 'Unnamed').join(' + ')
            : (data?.peptide || 'Unnamed');

        const totalMg = peptides.reduce((sum, p) => sum + (Number(p.mg) || 0), 0);
        const totalDose = peptides.reduce((sum, p) => {
            const dose = Number(p.dose) || 0;
            return p.doseUnit === 'mg' ? sum + (dose * 1000) : sum + dose;
        }, 0);

        // Use vendorId from data if available, otherwise try to find it from vendor name
        const vendorId = data.vendorId || (data.vendor ? (vendors.find(v => v.name === data.vendor)?.id || null) : null);
        const now = new Date().toISOString();

        const newItem = {
            id: generateId(),
            peptide: peptideNames,
            mg: totalMg,
            dose: totalDose,
            vendor: data.vendor,
            vendorId,
            water: data.water,
            deliveryMethod: data.deliveryMethod,
            penColor: data.penColor,
            cost: data.cost,
            date: now,
            peptides, // Include full peptides array with stockpileId
            notes: '',
            createdAt: now,
            updatedAt: now
        };

        // Calculate updated items (remove draft if present, add new item)
        const draftId = draftIdToRemove;
        setReconItems(prev => {
            const filtered = draftId 
                ? prev.filter(i => i.id !== draftId)
                : prev;
            return [newItem, ...filtered];
        });
        
        // Calculate updated items for cloud sync (use current state)
        const updatedItems = draftId 
            ? [newItem, ...reconItems.filter(i => i.id !== draftId)]
            : [newItem, ...reconItems];
        
        // Adjust stockpile - this will update quantities and remove items with 0
        console.log('🔄 Calling adjustStockpileAfterRecon with peptides:', peptides);
        adjustStockpileAfterRecon(peptides);

        // Clear prefill and draft tracking
        setPrefill(null);
        setDraftIdToRemove(null);
        
        try {
            localStorage.removeItem('tpprover_recon_prefill');
        } catch {}

        setActiveTab('reconstituted');

        // CRITICAL: Force immediate cloud sync to ensure draft is removed and new item is saved
        if (firebaseUser && updatedItems) {
            try {
                const userId = firebaseUser.uid;
                
                const appData = {
                    protocols: protocols || [],
                    reconItems: updatedItems,
                    reconHistory: reconHistory || [],
                    supplements: supplements || [],
                    orders: orders || [],
                    metrics: metrics || [],
                    vendors: vendors || [],
                    calendarNotes: calendarNotes || {},
                    stockpile: stockpile || [],
                    scheduledBuys: scheduledBuys || []
                };
                
                // Force immediate sync with skipMerge to overwrite server data
                const syncResult = await saveAppData(userId, appData, { skipMerge: true });
                if (syncResult) {
                    if (draftId) {
                        console.log('✅ Draft removed and new item synced to cloud immediately');
                    } else {
                        console.log('✅ New item synced to cloud immediately');
                    }
                } else {
                    console.error('❌ Failed to sync to cloud');
                }
            } catch (error) {
                console.error('❌ Error syncing to cloud:', error);
                // Don't throw - the auto-sync will handle it
            }
        }

        window.dispatchEvent(new CustomEvent('tpp:toast', {
            detail: { message: 'Calculation saved successfully!', type: 'success' }
        }));
    }, [isReadOnly, setShowUpgradeModal, vendors, setReconItems, adjustStockpileAfterRecon, setPrefill, setActiveTab, draftIdToRemove, firebaseUser, reconItems, protocols, reconHistory, supplements, orders, metrics, calendarNotes, stockpile, scheduledBuys]);

    const handleCalculatorSaveDraft = useCallback(async (data) => {
        if (isReadOnly) {
            setShowUpgradeModal(true);
            return;
        }

        const peptides = Array.isArray(data?.peptides) ? data.peptides : [];
        
        const peptideNames = peptides.length > 0
            ? peptides.map(p => p.name || 'Unnamed').join(' + ')
            : (data?.peptide || 'Draft');

        const totalMg = peptides.reduce((sum, p) => sum + (Number(p.mg) || 0), 0);
        const totalDose = peptides.reduce((sum, p) => {
            const dose = Number(p.dose) || 0;
            return p.doseUnit === 'mg' ? sum + (dose * 1000) : sum + dose;
        }, 0);

        // Use vendorId from data if available, otherwise try to find it from vendor name
        const vendorId = data.vendorId || (data.vendor ? (vendors.find(v => v.name === data.vendor)?.id || null) : null);
        const now = new Date().toISOString();

        const draftItem = {
            id: `draft_${generateId()}`,
            peptide: peptideNames,
            mg: totalMg,
            dose: totalDose,
            vendor: data.vendor || '',
            vendorId,
            water: data.water || 0,
            deliveryMethod: data.deliveryMethod || 'pipette',
            penColor: data.penColor || '',
            cost: data.cost || '',
            date: now,
            peptides, // Include full peptides array with stockpileId
            notes: '',
            isDraft: true,
            createdAt: now,
            updatedAt: now
        };
        
        setReconItems(prev => {
            // Remove any existing drafts matching this form
            const existingDraftIndex = prev.findIndex(item => item.isDraft && item.peptide === draftItem.peptide);
            const filtered = existingDraftIndex >= 0 
                ? prev.filter((_, idx) => idx !== existingDraftIndex)
                : prev.filter(item => !item.isDraft || item.id !== draftItem.id);
            return [draftItem, ...filtered];
        });

        // Sync to cloud
        if (firebaseUser) {
            try {
                const userId = firebaseUser.uid;
                const updatedItems = [draftItem, ...reconItems.filter(item => !item.isDraft || item.id !== draftItem.id)];
                
                const appData = {
                    protocols: protocols || [],
                    reconItems: updatedItems,
                    reconHistory: reconHistory || [],
                    supplements: supplements || [],
                    orders: orders || [],
                    metrics: metrics || [],
                    vendors: vendors || [],
                    calendarNotes: calendarNotes || {},
                    stockpile: stockpile || [],
                    scheduledBuys: scheduledBuys || []
                };
                
                await saveAppData(userId, appData, { skipMerge: true });
            } catch (error) {
                console.warn('Failed to sync draft to cloud:', error);
            }
        }

        window.dispatchEvent(new CustomEvent('tpp:toast', {
            detail: { message: 'Draft saved successfully!', type: 'success' }
        }));
    }, [isReadOnly, setShowUpgradeModal, vendors, setReconItems, firebaseUser, reconItems, protocols, reconHistory, supplements, orders, metrics, calendarNotes, stockpile, scheduledBuys]);

	const filteredItems = reconItems.filter(i => {
		const vendorName = i.vendorId ? vendorMap[i.vendorId] || '' : (i.vendor || '');
		return (i.peptide || '').toLowerCase().includes(searchQuery.toLowerCase()) || vendorName.toLowerCase().includes(searchQuery.toLowerCase())
	})
	const sortedItems = [...filteredItems].sort((a, b) => new Date(b.date) - new Date(a.date))

	const filteredHistory = reconHistory.filter(i => {
        const matchesSearch = (i.peptide || '').toLowerCase().includes(searchQuery.toLowerCase()) || (i.vendor || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesPeptide = historyFilters.peptide ? (i.peptide || '').toLowerCase().includes(historyFilters.peptide.toLowerCase()) : true;
        const matchesVendor = historyFilters.vendor ? (i.vendor || '').toLowerCase().includes(historyFilters.vendor.toLowerCase()) : true;
        return matchesSearch && matchesPeptide && matchesVendor;
    })
	const sortedHistory = [...filteredHistory].sort((a, b) => new Date(b.usedDate || b.date) - new Date(a.usedDate || a.date));

    const handleMarkAsUsed = async (itemToMove) => {
        // Update local state immediately
        const updatedItems = reconItems.filter(i => i.id !== itemToMove.id);
        const updatedHistory = [{ ...itemToMove, usedDate: new Date().toISOString() }, ...reconHistory];
        
        setReconItems(updatedItems);
        setReconHistory(updatedHistory);
        
        // CRITICAL: Force immediate cloud sync with skipMerge to ensure the change persists
        // This prevents server data from restoring the item back to reconItems
        if (firebaseUser) {
            try {
                const userId = firebaseUser.uid;
                const appData = {
                    protocols: protocols || [],
                    reconItems: updatedItems, // Use updated items with item removed
                    reconHistory: updatedHistory, // Use updated history with item added
                    supplements: supplements || [],
                    orders: orders || [],
                    metrics: metrics || [],
                    vendors: vendors || [],
                    calendarNotes: calendarNotes || {},
                    stockpile: stockpile || [],
                    scheduledBuys: scheduledBuys || []
                };
                
                // Force immediate sync with skipMerge to overwrite server data
                const syncResult = await saveAppData(userId, appData, { skipMerge: true });
                if (syncResult) {
                    console.log('✅ Marked as used - synced to cloud immediately');
                } else {
                    console.error('❌ Failed to sync marked-as-used item to cloud');
                }
            } catch (error) {
                console.error('❌ Error syncing marked-as-used item to cloud:', error);
                // Don't throw - the auto-sync will handle it
            }
        }
    };

    const handleDeleteHistory = async (historyItem) => {
        if (!historyItem) return;

        // Record deletion with item snapshot for restore functionality
        const { recordDeletion } = require('../utils/deletionTracking');
        recordDeletion('reconHistory', historyItem.id, historyItem);

        const updatedHistory = reconHistory.filter(h => h.id !== historyItem.id);
        setReconHistory(updatedHistory);
        setHistoryToDelete(null);
        if (viewItem?.id === historyItem.id) {
            setViewItem(null);
        }

        if (firebaseUser) {
            try {
                const userId = firebaseUser.uid;
                const appData = {
                    protocols: protocols || [],
                    reconItems: reconItems || [],
                    reconHistory: updatedHistory,
                    supplements: supplements || [],
                    orders: orders || [],
                    metrics: metrics || [],
                    vendors: vendors || [],
                    calendarNotes: calendarNotes || {},
                    stockpile: stockpile || [],
                    scheduledBuys: scheduledBuys || []
                };

                const syncResult = await saveAppData(userId, appData, { skipMerge: true });
                if (syncResult) {
                    console.log('✅ Deleted recon history item synced to cloud immediately');
                } else {
                    console.error('❌ Failed to sync recon history deletion to cloud');
                }
            } catch (error) {
                console.error('❌ Error syncing recon history deletion to cloud:', error);
            }
        }

        window.dispatchEvent(new CustomEvent('tpp:toast', {
            detail: { message: 'History entry removed.', type: 'success' }
        }));
    };

	// Set topbar tabs via custom event
	useEffect(() => {
		const updateTabs = () => {
			const isMobile = window.matchMedia('(max-width: 767px)').matches;
		const tabs = isMobile
			? [
				{ value: 'calculator', label: 'Calculator' },
				{ value: 'reconstituted', label: 'IN USE' },
				{ value: 'history', label: 'History' }
			]
			: [
				{ value: 'reconstituted', label: 'IN USE' },
				{ value: 'history', label: 'History' }
			];
			// Ensure we don't get stuck on a hidden tab on desktop
			if (!isMobile && activeTab === 'calculator') {
				setActiveTab('reconstituted');
			}
			window.dispatchEvent(new CustomEvent('tpp:set-topbar-tabs', { 
				detail: { 
					tabs, 
					activeTab, 
					onTabChange: setActiveTab,
					onActionClick: () => setShowEditModal(true),
					actionDisabled: false
				} 
			}));
		};

		updateTabs();
		window.addEventListener('resize', updateTabs);
		
		// Listen for topbar search events for page-specific search
		const handleSearch = (e) => {
			setSearchQuery(e.detail.query);
		};
		window.addEventListener('tpp:recon-search', handleSearch);
		
		return () => {
			window.dispatchEvent(new CustomEvent('tpp:clear-topbar-tabs'));
			window.removeEventListener('resize', updateTabs);
			window.removeEventListener('tpp:recon-search', handleSearch);
		};
	}, [activeTab]);

	return (
		<>
			<ReconHelpPanel theme={theme} />
			
			{/* Calculator Tab - Full width centered on desktop when active */}
			{activeTab === 'calculator' && (
				<div className="flex justify-center">
					<div className="w-full lg:max-w-2xl">
					<ReconCalculatorPanel 
                        theme={theme} 
                        prefill={prefill} 
                        isReadOnly={isReadOnly} 
                        onUpgrade={() => setShowUpgradeModal(true)} 
                        onSave={handleCalculatorSave}
                        onSaveDraft={handleCalculatorSaveDraft}
                    />
					</div>
				</div>
			)}

			<div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${activeTab === 'calculator' ? 'hidden' : ''}`}>
				{/* Desktop: Show calculator in sidebar on other tabs */}
				<div className="order-1 lg:order-2 hidden lg:block">
				<ReconCalculatorPanel 
                    theme={theme} 
                    prefill={prefill} 
                    isReadOnly={isReadOnly} 
                    onUpgrade={() => setShowUpgradeModal(true)} 
                    onSave={handleCalculatorSave}
                    onSaveDraft={handleCalculatorSaveDraft}
                />
				</div>

			{/* Main content area */}
			<div className={`order-2 lg:order-1 lg:col-span-2 ${activeTab === 'calculator' ? 'hidden lg:block' : 'block'}`}>
				
				{activeTab === 'reconstituted' && (
						<div className="space-y-3">
							{/* Empty State - Show when no items */}
							{sortedItems.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-12 px-6 text-center">
									<div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${theme.primary}10` }}>
										<Beaker size={32} style={{ color: theme.primary }} />
									</div>
									<h3 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>No Vials In Use</h3>
									<p className="text-sm mb-6 max-w-md" style={{ color: theme.textLight }}>
										Add current reconstituted peptide vials to track dosages, delivery methods, and usage for research purposes. 
										This helps manage inventory and calculate proper dosing.
									</p>
									<button
										onClick={() => setShowEditModal(true)}
										className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all hover:opacity-90 hover:scale-105"
										style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
									>
										<PlusCircle size={18} />
										Add Your First Vial
									</button>
								</div>
							) : (
								sortedItems.map(item => {
								const isBlend = Array.isArray(item.peptides) && item.peptides.length > 0;
                                const totalMg = isBlend ? item.peptides.reduce((sum, p) => sum + (Number(p.mg) || 0), 0) : item.mg;
                                const totalDoseInMcg = isBlend 
                                    ? item.peptides.reduce((sum, p) => {
                                        const dose = Number(p.dose) || 0;
                                        return p.doseUnit === 'mg' ? sum + (dose * 1000) : sum + dose;
                                    }, 0)
                                    : 0;

                                const summaryDoseUnit = isBlend
                                    ? 'mcg'
                                    : (item.doseUnit || 'mcg');

                                const rawDoseInput = isBlend ? totalDoseInMcg : item.dose;
                                const hasDoseValue = rawDoseInput !== undefined && rawDoseInput !== null && rawDoseInput !== '';
                                const summaryDoseValueNumeric = hasDoseValue ? Number(rawDoseInput) : 0;
                                const displayDoseValue = hasDoseValue ? rawDoseInput : null;

								const calc = calculateRecon({ ...item, mg: totalMg, dose: summaryDoseValueNumeric, doseUnit: summaryDoseUnit });
								
								// Calculate cost per dose: use costPerMg if available, otherwise divide cost by doses per vial
								let costPerDose = null;
								if (item.costPerMg && summaryDoseValueNumeric > 0) {
									// Convert dose to mg for calculation
									let doseInMg = 0;
									if (summaryDoseUnit === 'mg') {
										doseInMg = summaryDoseValueNumeric;
									} else if (summaryDoseUnit === 'mcg') {
										doseInMg = summaryDoseValueNumeric / 1000;
									} else if (summaryDoseUnit === 'sprays') {
										doseInMg = (summaryDoseValueNumeric * 100) / 1000; // 100 mcg per spray
									} else if (summaryDoseUnit === 'mL') {
										const concentration = calc.concentration || 0; // mcg per mL
										const doseMcg = summaryDoseValueNumeric * concentration;
										doseInMg = doseMcg / 1000;
									}
									
									if (doseInMg > 0) {
										const costPerMgNum = Number(item.costPerMg);
										if (!isNaN(costPerMgNum) && costPerMgNum > 0) {
											costPerDose = formatCurrency(costPerMgNum * doseInMg);
										}
									}
								}
								
								// Fall back to dividing cost by doses per vial if costPerMg not available
								if (!costPerDose && item.cost && calc.dosesPerVial > 0) {
									costPerDose = formatCurrency(item.cost / calc.dosesPerVial);
								}
								return (
									<div 
										key={item.id} 
										className={`rounded-lg p-4 shadow-md content-card flex flex-col justify-between widget-card-hover ${item.isDraft ? 'cursor-pointer' : ''}`} 
										style={{ backgroundColor: theme.cardBackground, borderLeft: item.isDraft ? `4px solid ${theme.primary}80` : undefined }}
										onClick={item.isDraft ? () => {
											// Open calculator tab with draft data
											// Ensure peptides array is properly formatted
											const draftPeptides = Array.isArray(item.peptides) && item.peptides.length > 0
												? item.peptides.map(p => ({
													id: p.id || generateId(),
													name: p.name || '',
													mg: p.mg || '',
													dose: p.dose || '',
													doseUnit: p.doseUnit || 'mcg',
													vendor: p.vendor || item.vendor || '',
													stockpileId: p.stockpileId || null,
													quantityUsed: p.quantityUsed || 1
												}))
												: [{ 
													id: generateId(),
													name: item.peptide || '', 
													mg: item.mg || '', 
													dose: item.dose || '', 
													doseUnit: item.doseUnit || 'mcg',
													vendor: item.vendor || '',
													stockpileId: null,
													quantityUsed: 1
												}];
											
											setPrefill({
												peptides: draftPeptides,
												vendor: item.vendor || '',
												water: item.water || 2,
												deliveryMethod: item.deliveryMethod || 'pipette',
												administrationRoute: item.administrationRoute || 'subq',
												penType: item.penType || '',
												penColor: item.penColor || '',
												cost: item.cost || ''
											});
											setDraftIdToRemove(item.id); // Track which draft to remove when saving
											setActiveTab('calculator');
											// Draft will be removed when user saves the calculation
										} : undefined}
									>
										<div>
											<div className="flex justify-between items-start">
												<div>
													<div className="flex items-center gap-2">
														<div className="font-semibold text-base" style={{ color: theme.text }}>{item.name || item.peptide}</div>
														{item.isDraft && (
															<span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: theme.primary + '20', color: theme.primary }}>
																Draft
															</span>
														)}
													</div>
													<div className="text-sm flex items-center gap-2 mt-1" style={{ color: theme.textLight }}><Package size={14} /> {item.vendorId ? vendorMap[item.vendorId] : item.vendor}</div>
												</div>
												<div className="text-xs text-gray-500">{formatMMDDYYYY(item.date)}</div>
											</div>
											
                                            {Array.isArray(item.peptides) && item.peptides.length > 0 ? (
                                                <div className="mt-3 pt-3 border-t space-y-2" style={{ borderColor: theme.border }}>
                                                    {item.peptides.map((p, idx) => (
                                                        <div key={idx} className="text-xs flex justify-between">
                                                            <span>- {p.name}</span>
                                                            <span className="font-semibold">{p.dose} {p.doseUnit || 'mcg'}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : null}

											<div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 pt-3 border-t" style={{ borderColor: theme.border }}>
												<div className="text-sm space-y-2" style={{ color: theme.textLight }}>
													<div className="flex items-center gap-2"><Beaker size={14} /> {totalMg} mg</div>
													<div className="flex items-center gap-2"><Droplet size={14} /> {item.water} mL water</div>
													<div className="flex items-center gap-2"><Droplet size={14} /> {displayDoseValue !== null ? `${displayDoseValue} ${summaryDoseUnit} total dose` : '-'}</div>
												</div>
												<div className="text-sm space-y-2" style={{ color: theme.textLight }}>
													<div><span className="font-medium text-base pr-1" style={{color: theme.text}}>{calc.unitsPerDose ? calc.unitsPerDose.toFixed(0) : '-'}</span> units/dose</div>
													<div><span className="font-medium text-base pr-1" style={{color: theme.text}}>{calc.dosesPerVial || '-'}</span> doses/vial</div>
													<div><span className="font-medium text-base pr-1" style={{color: theme.text}}>{costPerDose || '-'}</span> / dose</div>
												</div>
											</div>
										</div>

										<div className="flex justify-between items-center mt-3 pt-3 border-t" style={{ borderColor: theme.border }}>
											<div className="flex items-center gap-2">
									{item.deliveryMethod === 'pen' && item.penColor ? (
													<div className="flex flex-col gap-1">
														<div 
                                                        className="flex items-center gap-2 text-xs font-semibold px-2 py-1 rounded-full" 
                                                        style={{ 
                                                            background: getChromeGradient(PEN_COLORS[item.penColor] || item.penColor), 
                                                            color: ['Gold', 'Silver', 'Light Pink', 'Light Blue', 'Lime Green', 'Yellow', 'White'].includes(item.penColor) ? theme.text : theme.textOnPrimary 
                                                        }}
                                                    >
															<PenTool size={12} />
															<span>{
                                                                // Handle both name format ("Light Blue") and hex format ("#ADD8E6")
                                                                item.penColor.startsWith('#') 
                                                                    ? Object.keys(PEN_COLORS).find(name => PEN_COLORS[name] === item.penColor) || 'Custom'
                                                                    : item.penColor
                                                            } Pen</span>
														</div>
														{item.penType && (
															<div className="text-xs px-2 py-1 rounded" style={{ backgroundColor: theme.secondary, color: theme.text }}>
																{item.penType === 'other' ? 'Other Pen' : 
																	item.penType === 'savvio' ? 'Savvio' :
																	item.penType === 'novo' ? 'Novo' :
																	item.penType === 'v1' ? 'V1' :
																	item.penType === 'v2' ? 'V2' :
																	item.penType === 'v3' ? 'V3' :
																	item.penType === 'bird-pen' ? 'Bird Pen' :
																	item.penType === 'luxura' ? 'Luxura' :
																	item.penType === 'gansulin' ? 'Gansulin' :
																	item.penType
																}
															</div>
														)}
													</div>
												) : (
                                                    <div className="flex items-center gap-2 text-xs font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: theme.secondary, color: theme.text }}>
                                                        <Pipette size={12} />
                                                        <span>Syringe</span>
                                                    </div>
                                                )}
											</div>
                                            <div className="flex items-center">
											    {item.isDraft ? (
                                                    <button 
                                                        className="p-2 rounded-md text-xs flex items-center gap-1 action-button-hover" 
                                                        style={{ color: theme.primary }} 
                                                        onClick={(e) => {
                                                            e.stopPropagation(); // Prevent card click
                                                            // Prefill calculator with draft data
                                                            // Ensure peptides array is properly formatted
                                                            const draftPeptides = Array.isArray(item.peptides) && item.peptides.length > 0
                                                                ? item.peptides.map(p => ({
                                                                    id: p.id || generateId(),
                                                                    name: p.name || '',
                                                                    mg: p.mg || '',
                                                                    dose: p.dose || '',
                                                                    doseUnit: p.doseUnit || 'mcg',
                                                                    vendor: p.vendor || item.vendor || '',
                                                                    stockpileId: p.stockpileId || null,
                                                                    quantityUsed: p.quantityUsed || 1
                                                                }))
                                                                : [{ 
                                                                    id: generateId(),
                                                                    name: item.peptide || '', 
                                                                    mg: item.mg || '', 
                                                                    dose: item.dose || '', 
                                                                    doseUnit: item.doseUnit || 'mcg',
                                                                    vendor: item.vendor || '',
                                                                    stockpileId: null,
                                                                    quantityUsed: 1
                                                                }];
                                                            
                                                            setPrefill({
                                                                peptides: draftPeptides,
                                                                vendor: item.vendor || '',
                                                                water: item.water || 2,
                                                                deliveryMethod: item.deliveryMethod || 'pipette',
                                                                administrationRoute: item.administrationRoute || 'subq',
                                                                penType: item.penType || '',
                                                                penColor: item.penColor || '',
                                                                cost: item.cost || ''
                                                            });
                                                            setDraftIdToRemove(item.id); // Track which draft to remove when saving
                                                            setActiveTab('calculator');
                                                            // Draft will be removed when user saves the calculation
                                                        }}
                                                    >
                                                        <Calculator size={14} className="icon-hover" /> <span className="text-hover">Continue Draft</span>
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button className="p-2 rounded-md text-xs flex items-center gap-1 action-button-hover" style={{ color: theme.textLight }} onClick={() => handleMarkAsUsed(item)}>
                                                            <CheckCircle size={14} className="icon-hover" /> <span className="text-hover">Vial is Finished</span>
                                                        </button>
                                                        <button className="p-2 rounded-md action-button-hover" style={{ color: theme.primary }} onClick={() => { setEditingItem(item); setShowEditModal(true) }}><Edit className="h-4 w-4 icon-hover" /></button>
                                                    </>
                                                )}
                                            </div>
										</div>

										{item.notes && (
											<div className="mt-3 pt-3 border-t text-xs flex items-start gap-2" style={{ borderColor: theme.border, color: theme.textLight }}>
												<FileText size={14} className="mt-0.5" />
												<p>{item.notes}</p>
											</div>
										)}
									</div>
								)
							})
							)}
						</div>
					)}

					{activeTab === 'history' && (
						<div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="text-sm font-medium" style={{ color: theme.text }}>Reconstitution history</div>
                                <button
                                    onClick={() => setShowHistoryFilters(v => !v)}
                                    className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-semibold action-button-hover"
                                    style={{ backgroundColor: theme.secondary, color: theme.text }}
                                >
                                    <Filter size={14} /> {showHistoryFilters ? 'Hide Filters' : 'Filters'}
                                </button>
                            </div>

							{sortedHistory.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-12 px-6 text-center">
									<div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${theme.primary}10` }}>
										<History size={32} style={{ color: theme.primary }} />
									</div>
									<h3 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>No History Yet</h3>
									<p className="text-sm mb-6 max-w-md" style={{ color: theme.textLight }}>
										Your reconstitution history will appear here once you mark vials as finished. 
										This helps you track past research usage patterns, vendors, and dosing information for future reference.
									</p>
								</div>
							) : (
								<div className="space-y-3">
									{showHistoryFilters && (
										<div className="p-3 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
											<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
												<TextInput label="Peptide" placeholder="Filter by peptide" value={historyFilters.peptide} onChange={v => setHistoryFilters(f => ({ ...f, peptide: v }))} theme={theme} />
												<TextInput label="Vendor" placeholder="Filter by vendor" value={historyFilters.vendor} onChange={v => setHistoryFilters(f => ({ ...f, vendor: v }))} theme={theme} />
											</div>
										</div>
									)}

									{sortedHistory.map(item => {
                                        const usedDate = item.usedDate || item.date;
                                        const vendorName = item.vendorId ? vendorMap[item.vendorId] : item.vendor;
                                        return (
                                            <div
                                                key={`h-${item.id}`}
                                                className="p-4 rounded-lg shadow-sm flex items-center gap-3 justify-between cursor-pointer widget-card-hover"
                                                style={{ backgroundColor: theme.cardBackground, border: `1px solid ${theme.border}` }}
                                                onClick={() => setViewItem(item)}
                                            >
                                                <div className="flex-1 space-y-2">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <div className="font-semibold text-base" style={{ color: theme.text }}>
                                                            {item.peptide || 'Unnamed research vial'}
                                                        </div>
                                                        {vendorName ? (
                                                            <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: theme.primary + '15', color: theme.primary }}>
                                                                {vendorName}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: theme.textLight }}>
                                                        <span className="flex items-center gap-1"><Calendar size={14} /> {usedDate ? formatMMDDYYYY(usedDate) : 'Date unknown'}</span>
                                                        <span className="flex items-center gap-1"><Beaker size={14} /> {item.mg} mg</span>
                                                        {item.water ? <span className="flex items-center gap-1"><Droplet size={14} /> {item.water} mL</span> : null}
                                                        {item.dose ? <span className="flex items-center gap-1"><Pipette size={14} /> {item.dose} {item.doseUnit || 'mcg'}</span> : null}
                                                    </div>
                                                    {item.notes ? (
                                                        <div className="text-xs line-clamp-2" style={{ color: theme.textLight }}>
                                                            {item.notes}
                                                        </div>
                                                    ) : null}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        className="p-2 rounded-md action-button-hover"
                                                        style={{ color: theme.textLight }}
                                                        onClick={(e) => { e.stopPropagation(); setViewItem(item); }}
                                                        title="View details"
                                                    >
                                                        <Eye className="h-4 w-4 icon-hover" />
                                                    </button>
                                                    <button
                                                        className="p-2 rounded-md action-button-hover"
                                                        style={{ color: theme.primary }}
                                                        onClick={(e) => { e.stopPropagation(); setHistoryToDelete(item); }}
                                                        title="Delete entry"
                                                    >
                                                        <Trash2 className="h-4 w-4 icon-hover" />
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })}
								</div>
							)}
						</div>
					)}
				</div>
			</div>

            <Modal open={showEditModal} onClose={() => { setShowEditModal(null); setEditingItem(null); clearSavedData(); }} title={editingItem ? 'Edit Reconstitution' : 'Add Reconstitution'} theme={theme} variant="modern" titleExtra={<AutoSaveIndicator isSaving={isSaving} lastSaved={lastSaved} theme={theme} compact iconOnly={true} />} footer={
				<div className="w-full flex items-center justify-between gap-3">
					{editingItem ? (
						<button
							onClick={() => handleDelete(editingItem.id)}
							className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md active:scale-95"
							style={{
								background: terracottaGradient,
								color: '#ffffff',
								border: 'none'
							}}
							onMouseEnter={(e) => { e.currentTarget.style.background = terracottaHoverGradient; }}
							onMouseLeave={(e) => { e.currentTarget.style.background = terracottaGradient; }}
						>
							Delete
						</button>
					) : <span />}
					<div className="flex items-center gap-2 ml-auto">
						<button
							onClick={() => handleSave(editingItem)}
							className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg active:scale-95"
							style={{
								background: getPrimaryActionGradient(false),
								color: theme?.textOnPrimary || '#ffffff',
								border: 'none',
								boxShadow: primaryActionDefaultShadow
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.transform = 'translateY(-1px)';
								e.currentTarget.style.boxShadow = primaryActionHoverShadow;
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.transform = 'translateY(0)';
								e.currentTarget.style.boxShadow = primaryActionDefaultShadow;
								e.currentTarget.style.background = getPrimaryActionGradient(false);
							}}
						>
							Save
						</button>
					</div>
				</div>
			}>
                <div className="space-y-4">
                    {/* VIAL DETAILS Section Header */}
                    <div 
                        className="px-4 py-2.5 rounded-lg flex items-center justify-between mb-2" 
                        style={{ 
                            backgroundColor: theme.isDark ? '#374151' : theme.secondary, 
                            borderLeft: '4px solid #e0ded7' 
                        }}
                    >
                        <h4 
                            className="font-bold text-sm tracking-wider uppercase" 
                            style={{ 
                                color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76', 
                                letterSpacing: '0.1em' 
                            }}
                        >
                            VIAL DETAILS
                        </h4>
                        <TestTube size={20} style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76' }} />
                    </div>

                    <TextInput 
                        label="Peptide Name" 
                        value={getEditingPeptideName()} 
                        onChange={v => { updateEditingItem({ peptide: v }); updateFormData({ peptide: v }); }} 
                        theme={theme}
                        outlined={true}
                        customTextColor={theme.isDark ? null : "#181A18"}
                        customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
                    />
                    <VendorSuggestInput 
                        label="Vendor" 
                        value={editingItem?.vendorId ? vendorMap[editingItem.vendorId] : (editingItem?.vendor || draft.vendor || '')} 
                        onChange={v => {
                            const selectedVendor = vendors.find(vendor => vendor.name === v);
                            updateEditingItem({ vendor: v, vendorId: selectedVendor ? selectedVendor.id : null });
                            updateFormData({ vendor: v, vendorId: selectedVendor ? selectedVendor.id : null });
                        }} 
                        theme={theme} 
                        outlined={true}
                        customTextColor={theme.isDark ? null : "#181A18"}
                        customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
                    />
                    {/* mg and water in one row */}
                    <div className="grid grid-cols-2 gap-3">
                        <TextInput 
                            label="mg" 
                            type="number" 
                            value={getEditingMg()} 
                            onChange={v => { updateEditingItem({ mg: v }); updateFormData({ mg: v }); }} 
                            theme={theme}
                            outlined={true}
                            customTextColor={theme.isDark ? null : "#181A18"}
                            customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
                        />
                        <TextInput 
                            label="Water (mL)" 
                            type="number" 
                            value={editingItem?.water || draft.water || ''} 
                            onChange={v => { updateEditingItem({ water: v }); updateFormData({ water: v }); }} 
                            theme={theme}
                            outlined={true}
                            customTextColor={theme.isDark ? null : "#181A18"}
                            customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
                        />
                    </div>
                    
                    {/* dose on its own row */}
                    <div>
                        <CombinedDosageInput
                            value={{ amount: getEditingDose() || '', unit: getEditingDoseUnit() || 'mcg' }}
                            onChange={(newValue) => {
                                updateEditingItem({ dose: newValue.amount, doseUnit: newValue.unit });
                                updateFormData({ dose: newValue.amount, doseUnit: newValue.unit });
                                }} 
                            theme={theme}
                            placeholder="e.g., 250"
                            units={['mcg', 'mg', 'mL']}
                            outlined={true}
                            customTextColor={theme.isDark ? null : "#181A18"}
                            customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
                        />
                    </div>

                    {/* DELIVERY METHOD Section Header */}
                            <div 
                        className="px-4 py-2.5 rounded-lg flex items-center justify-between mb-2" 
                                style={{ 
                            backgroundColor: theme.isDark ? '#374151' : theme.secondary, 
                            borderLeft: '4px solid #e0ded7' 
                        }}
                    >
                        <h4 
                            className="font-bold text-sm tracking-wider uppercase" 
                            style={{ 
                                color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76', 
                                letterSpacing: '0.1em' 
                                        }}
                                    >
                            DELIVERY METHOD
                        </h4>
                        <Droplets size={20} style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76' }} />
                    </div>

                    <div>
                        <div className="flex rounded-lg p-1 gap-1" style={{ backgroundColor: theme.isDark ? '#1f2937' : '#f3f4f6' }}>
                            <button 
                                onClick={() => updateEditingItem({ deliveryMethod: 'pipette' })}
                                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                                    (editingItem?.deliveryMethod || 'pipette') === 'pipette' 
                                        ? 'text-white shadow-sm' 
                                        : ''
                                }`}
                                style={(editingItem?.deliveryMethod || 'pipette') === 'pipette' ? { backgroundColor: theme.primary } : { color: theme.text }}
                                onMouseEnter={(e) => {
                                    if ((editingItem?.deliveryMethod || 'pipette') !== 'pipette') {
                                        e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : '#e5e7eb';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if ((editingItem?.deliveryMethod || 'pipette') !== 'pipette') {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                    }
                                }}
                            >
                                <Pipette size={16} /> Syringe
                            </button>
                            <button 
                                onClick={() => updateEditingItem({ deliveryMethod: 'pen' })}
                                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                                    editingItem?.deliveryMethod === 'pen' 
                                        ? 'text-white shadow-sm' 
                                        : ''
                                }`}
                                style={editingItem?.deliveryMethod === 'pen' ? { backgroundColor: theme.primary } : { color: theme.text }}
                                onMouseEnter={(e) => {
                                    if (editingItem?.deliveryMethod !== 'pen') {
                                        e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : '#e5e7eb';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (editingItem?.deliveryMethod !== 'pen') {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                    }
                                }}
                            >
                                <PenTool size={16} /> Pen
                            </button>
                            <button 
                                onClick={() => updateEditingItem({ deliveryMethod: 'nasal' })}
                                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                                    editingItem?.deliveryMethod === 'nasal' 
                                        ? 'text-white shadow-sm' 
                                        : ''
                                }`}
                                style={editingItem?.deliveryMethod === 'nasal' ? { backgroundColor: theme.primary } : { color: theme.text }}
                                onMouseEnter={(e) => {
                                    if (editingItem?.deliveryMethod !== 'nasal') {
                                        e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : '#e5e7eb';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (editingItem?.deliveryMethod !== 'nasal') {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                    }
                                }}
                            >
                                <Droplet size={16} /> Nasal
                            </button>
                        </div>
                        {(editingItem?.deliveryMethod === 'pipette' || !editingItem?.deliveryMethod) && (
                            <div className="mt-3">
                                <div 
                                    className="flex items-center gap-1 p-1 rounded-md" 
                                    style={{ 
                                        backgroundColor: theme.isDark ? '#1f2937' : (theme.cardBackground || '#f9fafb'),
                                        boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'
                                    }}
                                >
                                    <button 
                                        onClick={() => updateEditingItem({ administrationRoute: 'SubQ' })}
                                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                                            (editingItem?.administrationRoute || 'SubQ') === 'SubQ' 
                                                ? 'text-white shadow-sm' 
                                                : ''
                                        }`}
                                        style={(editingItem?.administrationRoute || 'SubQ') === 'SubQ' ? { backgroundColor: theme.primary } : { color: theme.text }}
                                        onMouseEnter={(e) => {
                                            if ((editingItem?.administrationRoute || 'SubQ') !== 'SubQ') {
                                                e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : '#e5e7eb';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if ((editingItem?.administrationRoute || 'SubQ') !== 'SubQ') {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }
                                        }}
                                    >
                                        SubQ
                                    </button>
                                    <button 
                                        onClick={() => updateEditingItem({ administrationRoute: 'IM' })}
                                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                                            editingItem?.administrationRoute === 'IM' 
                                                ? 'text-white shadow-sm' 
                                                : ''
                                        }`}
                                        style={editingItem?.administrationRoute === 'IM' ? { backgroundColor: theme.primary } : { color: theme.text }}
                                        onMouseEnter={(e) => {
                                            if (editingItem?.administrationRoute !== 'IM') {
                                                e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : '#e5e7eb';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (editingItem?.administrationRoute !== 'IM') {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }
                                        }}
                                    >
                                        IM
                                    </button>
                                    <button 
                                        onClick={() => updateEditingItem({ administrationRoute: 'IV' })}
                                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                                            editingItem?.administrationRoute === 'IV' 
                                                ? 'text-white shadow-sm' 
                                                : ''
                                        }`}
                                        style={editingItem?.administrationRoute === 'IV' ? { backgroundColor: theme.primary } : { color: theme.text }}
                                        onMouseEnter={(e) => {
                                            if (editingItem?.administrationRoute !== 'IV') {
                                                e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : '#e5e7eb';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (editingItem?.administrationRoute !== 'IV') {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }
                                        }}
                                    >
                                        IV
                                    </button>
                                </div>
                            </div>
                        )}
                        {editingItem?.deliveryMethod === 'pen' && (
                            <div className="mt-3">
                                <div className="grid grid-cols-2 gap-3">
                                    {/* Pen Type Selection */}
                                    <div className="relative" ref={penTypeDropdownRef}>
                                        <button
                                            type="button"
                                            onClick={() => setIsPenTypeDropdownOpen(prev => !prev)}
                                            onMouseDown={(e) => {
                                              // Prevent any parent blur events on mobile
                                              e.preventDefault();
                                            }}
                                            onTouchStart={(e) => {
                                              // Prevent any parent blur events on touch devices
                                              e.preventDefault();
                                            }}
                                            className="w-full px-3 py-2 text-sm border rounded-md flex items-center justify-between transition-all hover:border-gray-400 touch-manipulation"
                                            style={{
                                                borderColor: isPenTypeDropdownOpen ? theme.primary : theme.border,
                                                backgroundColor: theme.cardBackground,
                                                color: editingItem?.penType ? theme.text : theme.textLight,
                                                WebkitTapHighlightColor: 'transparent'
                                            }}
                                        >
                                            <span>
                                                {editingItem?.penType ? (
                                                    editingItem.penType === 'bird-pen' ? 'Bird Pen' : 
                                                    editingItem.penType === 'v1' ? 'V1' : 
                                                    editingItem.penType === 'v2' ? 'V2' : 
                                                    editingItem.penType === 'v3' ? 'V3' : 
                                                    editingItem.penType.charAt(0).toUpperCase() + editingItem.penType.slice(1)
                                                ) : 'Pen Type'}
                                            </span>
                                            <ChevronDown 
                                                size={16} 
                                                className={`transition-transform duration-200 ${isPenTypeDropdownOpen ? 'rotate-180' : ''}`}
                                                style={{ color: theme.textLight }}
                                            />
                                        </button>
                                        {isPenTypeDropdownOpen && (
                                            <div 
                                                className="absolute z-50 w-full mt-1 rounded-lg shadow-lg border overflow-hidden"
                                            style={{
                                                    backgroundColor: theme.isDark ? '#1f2937' : '#ffffff',
                                                borderColor: theme.border,
                                                    boxShadow: theme.isDark ? '0 4px 6px rgba(0,0,0,0.3)' : '0 4px 6px rgba(0,0,0,0.1)'
                                                }}
                                            >
                                                {[
                                                    { value: '', label: 'Pen Type' },
                                                    { value: 'savvio', label: 'Savvio' },
                                                    { value: 'novo', label: 'Novo' },
                                                    { value: 'v1', label: 'V1' },
                                                    { value: 'v2', label: 'V2' },
                                                    { value: 'v3', label: 'V3' },
                                                    { value: 'bird-pen', label: 'Bird Pen' },
                                                    { value: 'luxura', label: 'Luxura' },
                                                    { value: 'gansulin', label: 'Gansulin' },
                                                    { value: 'other', label: 'Other' }
                                                ].map((option, optIdx) => (
                                                    <React.Fragment key={option.value}>
                                                        {optIdx > 0 && (
                                                            <div 
                                                                className="h-px mx-2"
                                                                style={{ backgroundColor: theme.border }}
                                                            />
                                                        )}
                                                        <button
                                                            type="button"
                                                            onMouseDown={(e) => {
                                                              // Prevent blur events on mobile
                                                              e.preventDefault();
                                                            }}
                                                            onTouchStart={(e) => {
                                                              // Prevent blur events on touch devices
                                                              e.preventDefault();
                                                            }}
                                                            onClick={(e) => {
                                                              e.preventDefault();
                                                              e.stopPropagation();
                                                              updateEditingItem({ penType: option.value });
                                                              setIsPenTypeDropdownOpen(false);
                                                            }}
                                                            className="w-full text-left px-3 py-2 text-sm transition-all touch-manipulation"
                                                            style={{
                                                                color: editingItem?.penType === option.value ? theme.primary : theme.text,
                                                                backgroundColor: 'transparent',
                                                                WebkitTapHighlightColor: 'transparent'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.backgroundColor = theme.primaryLight || `${theme.primary}20`;
                                                                e.currentTarget.style.color = theme.primary;
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.backgroundColor = 'transparent';
                                                                e.currentTarget.style.color = editingItem?.penType === option.value ? theme.primary : theme.text;
                                                            }}
                                                        >
                                                            {option.label}
                                                        </button>
                                                    </React.Fragment>
                                                ))}
                                    </div>
                                        )}
                                    </div>
                                    {/* Pen Color Selection */}
                                    <ColorSwatchDropdown
                                        value={penColor}
                                        onChange={(hex) => {
                                            setPenColor(hex);
                                            // Find color name from hex
                                            const selectedColor = penColors.find(p => p.hex === hex);
                                            if (selectedColor) {
                                                updateEditingItem({ penColor: selectedColor.name });
                                            }
                                        }}
                                        colors={penColors}
                                        theme={theme}
                                        placeholder="Pen Color"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Page Break */}
                    <div className="border-t" style={{ borderColor: theme.border }}></div>

                    <TextInput 
                        label="Notes" 
                        value={editingItem?.notes || ''} 
                        onChange={v => updateEditingItem({ notes: v })} 
                        theme={theme} 
                        multiline
                        outlined={true}
                        customTextColor={theme.isDark ? null : "#181A18"}
                        customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
                    />
                </div>
			</Modal>

            <Modal open={!!viewItem} onClose={() => setViewItem(null)} title="Recon History Details" theme={theme} variant="modern">
				{viewItem && (() => {
					const calc = calculateRecon(viewItem)
                    const usedDate = viewItem.usedDate || viewItem.date;
					const costPerDose = viewItem.cost ? formatCurrency(viewItem.cost / calc.dosesPerVial) : null
					return (
						<div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                <div><div className="text-xs" style={{ color: theme.textLight }}>Used On</div><div className="font-medium">{usedDate ? formatMMDDYYYY(usedDate) : '—'}</div></div>
                                <div><div className="text-xs" style={{ color: theme.textLight }}>Vendor</div><div className="font-medium">{viewItem.vendorId ? vendorMap[viewItem.vendorId] : viewItem.vendor}</div></div>
                                <div><div className="text-xs" style={{ color: theme.textLight }}>mg</div><div className="font-medium">{viewItem.mg}</div></div>
                                <div><div className="text-xs" style={{ color: theme.textLight }}>Water (mL)</div><div className="font-medium">{viewItem.water}</div></div>
                                <div><div className="text-xs" style={{ color: theme.textLight }}>Dose</div><div className="font-medium">{viewItem.dose ? `${viewItem.dose} ${viewItem.doseUnit || 'mcg'}` : '—'}</div></div>
                                <div className="sm:col-span-2"><div className="text-xs" style={{ color: theme.textLight }}>Delivery Method</div><div className="font-medium">{String(viewItem.deliveryMethod || 'pipette').toLowerCase() === 'pen' ? `Pen${viewItem.penColor ? ` (${viewItem.penColor})` : ''}` : 'Syringe'}</div></div>
                                <div><div className="text-xs" style={{ color: theme.textLight }}>Units</div><div>{calc.unitsPerDose ? `${calc.unitsPerDose.toFixed(0)} u` : '-'}</div></div>
                                <div><div className="text-xs" style={{ color: theme.textLight }}>Doses/Vial</div><div>{calc.dosesPerVial || '-'}</div></div>
                                <div><div className="text-xs" style={{ color: theme.textLight }}>Cost/Dose</div><div>{costPerDose || '-'}</div></div>
                                {Array.isArray(viewItem.peptides) && viewItem.peptides.length > 0 ? (
                                    <div className="sm:col-span-2">
                                        <div className="text-xs" style={{ color: theme.textLight }}>Peptides</div>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {viewItem.peptides.map((p, idx) => (
                                                <span key={idx} className="px-2 py-1 text-xs rounded-md" style={{ backgroundColor: theme.secondary, color: theme.text }}>
                                                    {p.name} • {p.dose}{p.doseUnit ? ` ${p.doseUnit}` : ''}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
                                {viewItem.capColor ? (<div className="sm:col-span-2"><div className="text-xs" style={{ color: theme.textLight }}>Cap Color</div><div className="font-medium">{viewItem.capColor}</div></div>) : null}
                                {viewItem.notes ? (<div className="sm:col-span-2"><div className="text-xs" style={{ color: theme.textLight }}>Notes</div><div className="font-medium">{viewItem.notes}</div></div>) : null}
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="text-xs" style={{ color: theme.textLight }}>Permanent removal deletes this log from your research history.</div>
                                <button
                                    className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold action-button-hover"
                                    style={{ backgroundColor: theme.isDark ? '#7f1d1d' : '#fca5a5', color: theme.isDark ? '#fff' : '#7f1d1d' }}
                                    onClick={() => { setHistoryToDelete(viewItem); setViewItem(null); }}
                                >
                                    <Trash2 size={14} /> Delete entry
                                </button>
                            </div>
						</div>
					)
				})()}
			</Modal>

            <Modal
                open={!!historyToDelete}
                onClose={() => setHistoryToDelete(null)}
                title="Delete History Entry"
                theme={theme}
                variant="modern"
            >
                <div className="space-y-3 text-sm" style={{ color: theme.text }}>
                    <p>This will permanently remove this reconstitution log from your research history. Cloud backups will be updated immediately.</p>
                    <p className="text-xs" style={{ color: theme.textLight }}>This action cannot be undone.</p>
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            className="px-4 py-2 rounded-md text-sm font-semibold action-button-hover"
                            style={{ backgroundColor: theme.secondary, color: theme.text }}
                            onClick={() => setHistoryToDelete(null)}
                        >
                            Cancel
                        </button>
                        <button
                            className="px-4 py-2 rounded-md text-sm font-semibold action-button-hover"
                            style={{ background: terracottaGradient, color: '#ffffff' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = terracottaHoverGradient; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = terracottaGradient; }}
                            onClick={() => historyToDelete && handleDeleteHistory(historyToDelete)}
                        >
                            Delete permanently
                        </button>
                    </div>
                </div>
            </Modal>

			<UpgradeModal
				isOpen={showUpgradeModal}
				onClose={() => setShowUpgradeModal(false)}
				theme={theme}
			/>
		</>
	)
}


