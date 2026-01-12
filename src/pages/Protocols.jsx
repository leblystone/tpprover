import React, { useEffect, useState, useCallback } from 'react'
import { useOutletContext, useLocation } from 'react-router-dom'
import { themes, defaultThemeName } from '../theme/themes'
import { formatMMDDYYYY, getLocalDateString, parseDateString, normalizeToMidnight } from '../utils/date'
import BottomSheet from '../components/common/BottomSheet'
import Modal from '../components/common/Modal'
import TextInput from '../components/common/inputs/TextInput'
import ProtocolEditorModal from '../components/protocols/ProtocolEditorModal'
import { exportToCSV } from '../utils/export'
import { PlusCircle, Plus, FileText, Clock, ChevronDown, Pipette, Pen, Droplets, CalendarCheck, Target, History, CalendarX, Bell, SunDim, SunMedium, Sun, Moon, Calendar, Sunset, MoonStar, ClockPlus, Settings, TestTubes, Filter, CheckCircle2, XCircle, List, FlaskConical, BookOpenCheck, Edit as EditIcon, Share2, NotebookPen } from 'lucide-react'
import SearchableDropdown from '../components/common/SearchableDropdown'
import VendorSuggestInput from '../components/vendors/VendorSuggestInput'
import ColorSwatchDropdown from '../components/common/inputs/ColorSwatchDropdown'
import GlassmorphismDatePicker from '../components/common/GlassmorphismDatePicker'
import { penColors } from '../utils/penColors'
import { formatCurrency } from '../utils/currencyUtils'
import ProtocolCard from '../components/protocols/ProtocolCard'
import ProtocolHistoryModal from '../components/protocols/ProtocolHistoryModal';
import ProtocolHistoryDetailModal from '../components/protocols/ProtocolHistoryDetailModal';
import StartProtocolWizard from '../components/protocols/StartProtocolWizard';
import ProtocolsTipsBanner from '../components/protocols/ProtocolsTipsBanner';
import EditActiveProtocolVials from '../components/protocols/EditActiveProtocolVials';
import ProtocolFollowUpModal from '../components/protocols/ProtocolFollowUpModal';
import ShareModal from '../components/common/ShareModal';
import ProtocolNotesModal from '../components/protocols/ProtocolNotesModal';
import { useAppContext } from '../context/AppContext';
import { generateId } from '../utils/string';
import { useSubscriptionAccess } from '../utils/useSubscriptionAccess';
import UpgradeModal from '../components/common/UpgradeModal';
import Tabs from '../components/common/Tabs';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { saveProtocolHistoryEntry, updateProtocolHistoryEntry, findActiveProtocolHistoryEntry, migrateProtocolHistoryEntries, migrateProtocolHistoryCompletionStatus, addVialToActiveProtocol, getProtocolHistory } from '../utils/protocolHistory';
import CustomDropdown from '../components/common/inputs/CustomDropdown';
import { loadSettings, saveSettings, getDefaultSettings, syncNotificationSettingsToFirestore } from '../utils/settingsHelpers';
import pwaNotificationService from '../services/pwaNotifications';
import { Capacitor } from '@capacitor/core';

export default function Protocols() {
  const { theme } = useOutletContext()
  const location = useLocation()
  const { protocols, setProtocols, addProtocol, updateProtocol, deleteProtocol, stockpile, setStockpile } = useAppContext();
  const { isReadOnly } = useSubscriptionAccess();
  const [activeTab, setActiveTab] = useState('protocols'); // 'protocols' | 'history' | 'reminders'
  const [openAdd, setOpenAdd] = useState(false)
  const [editing, setEditing] = useState(null)
  const [startConfirm, setStartConfirm] = useState(null)
  const [historyProtocol, setHistoryProtocol] = useState(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [hoveredHistoryId, setHoveredHistoryId] = useState(null);
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState(null);
  const [startDate, setStartDate] = useState(() => getLocalDateString())
  const [manageConfirm, setManageConfirm] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [followUpProtocol, setFollowUpProtocol] = useState(null);
  const [followUpHistoryId, setFollowUpHistoryId] = useState(null);
  const [showProtocolEndedConfirm, setShowProtocolEndedConfirm] = useState(false);
  const [endedProtocolName, setEndedProtocolName] = useState(null);
  const [timeModalOpen, setTimeModalOpen] = useState({ am: false, pm: false });
  const [customTimeInput, setCustomTimeInput] = useState({ am: '', pm: '' });
  const [protocolFilter, setProtocolFilter] = useState('all'); // 'all' | 'active' | 'inactive'
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Listen for history updates to refresh the modal
  useEffect(() => {
    const handleHistoryUpdate = () => {
      setHistoryRefreshKey(prev => prev + 1);
    };
    
    window.addEventListener('tpp:protocol-history-updated', handleHistoryUpdate);
    return () => {
      window.removeEventListener('tpp:protocol-history-updated', handleHistoryUpdate);
    };
  }, []);

  // Migrate existing protocol history entries on mount (assign IDs, preserve all data)
  useEffect(() => {
    const migrationResult = migrateProtocolHistoryEntries();
    if (migrationResult.migrated > 0) {
      console.log(`📋 Protocol history migration: ${migrationResult.migrated} entries updated with IDs`);
    }
  }, []);

  // Migrate completion status for existing history entries (recalculate based on planned vs actual duration)
  useEffect(() => {
    const statusMigrationResult = migrateProtocolHistoryCompletionStatus();
    if (statusMigrationResult.updated > 0) {
      console.log(`📋 Completion status migration: ${statusMigrationResult.updated} entries updated`);
    }
  }, [protocols]); // Include protocols in dependency to ensure we have protocol data for lookup

  // Listen for autosave events to update protocol cards in real-time
  useEffect(() => {
    const handleProtocolAutosaved = (event) => {
      const { storageKey, formData } = event.detail;
      
      // Only handle autosave events for existing protocols (not new ones)
      if (storageKey.includes('protocol_draft_') && formData.id) {
        // Update the protocol in the main protocols array
        updateProtocol(formData);
      }
    };

    window.addEventListener('tpp:protocol-autosaved', handleProtocolAutosaved);
    return () => window.removeEventListener('tpp:protocol-autosaved', handleProtocolAutosaved);
  }, [updateProtocol]);

  // Handle direct navigation to specific protocol (from search)
  useEffect(() => {
    if (location.state?.openProtocolId) {
      const protocolToOpen = protocols.find(p => p.id === location.state.openProtocolId);
      if (protocolToOpen) {
        setEditing(protocolToOpen);
        // Clear state after use
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, protocols]);

  // Check for pending follow-ups when page loads
  useEffect(() => {
    const checkPendingFollowUps = () => {
      try {
        const pending = JSON.parse(localStorage.getItem('tpprover_pending_followups') || '[]');
        if (pending.length > 0 && !followUpProtocol) {
          // Show the first pending follow-up
          const firstPending = pending[0];
          const protocol = protocols.find(p => p.id === firstPending.protocolId);
          if (protocol) {
            setFollowUpProtocol(protocol);
            setFollowUpHistoryId(firstPending.historyId);
            // Remove this one from the queue
            const remaining = pending.slice(1);
            localStorage.setItem('tpprover_pending_followups', JSON.stringify(remaining));
          } else {
            // Protocol not found, remove from queue
            const remaining = pending.slice(1);
            localStorage.setItem('tpprover_pending_followups', JSON.stringify(remaining));
          }
        }
      } catch (e) {
        console.error('Failed to check pending follow-ups:', e);
      }
    };

    // Check after a short delay to allow page to load
    const timer = setTimeout(checkPendingFollowUps, 500);
    return () => clearTimeout(timer);
  }, [protocols, followUpProtocol]);

  const endProtocol = (protocolToEnd) => {
    const today = getLocalDateString();
    const updatedProtocol = { ...protocolToEnd, active: false, endDate: today, endType: 'manual' };
    updateProtocol(updatedProtocol);
    
    // Update history entry
    const activeHistoryEntry = findActiveProtocolHistoryEntry(protocolToEnd.id);
    if (activeHistoryEntry) {
      // Determine completion status
      const expectedEndDate = updatedProtocol.endDate || updatedProtocol.expectedEndDate;
      let completionStatus = 'ended_early';
      
      if (expectedEndDate) {
        const expected = new Date(expectedEndDate);
        const actual = new Date(today);
        const diffDays = Math.abs(actual - expected) / (1000 * 60 * 60 * 24);
        // If ended within 2 days of expected, consider it completed on time
        if (diffDays <= 2 && actual <= expected) {
          completionStatus = 'completed';
        }
      }
      
      // Update history entry with current protocol state (including any vials added during)
      // Also capture current linkedItems for skipped reconstitution and delivery methods
      const skippedReconstitution = {};
      const linkedItems = protocolToEnd.linkedItems || {};
      Object.entries(linkedItems).forEach(([peptideId, item]) => {
        if (item.status === 'skipped' && item.deliveryMethod) {
          const peptide = protocolToEnd.peptides?.find(p => (p.id || `peptide-${protocolToEnd.peptides.indexOf(p)}`) === peptideId);
          skippedReconstitution[peptideId] = {
            peptideName: peptide?.name || 'Unknown',
            deliveryMethod: item.deliveryMethod
          };
        }
      });
      
      // Update protocolData with current linkedItems to preserve all data
      const updatedProtocolData = {
        ...(activeHistoryEntry.protocolData || {}),
        linkedItems: linkedItems // Save complete linkedItems for reference
      };
      
      updateProtocolHistoryEntry(activeHistoryEntry.id, {
        endDate: today,
        completionStatus: completionStatus,
        endType: 'manual',
        protocolData: updatedProtocolData,
        skippedReconstitution: Object.keys(skippedReconstitution).length > 0 ? skippedReconstitution : null
      });
      
      // Show follow-up modal
      setFollowUpProtocol(protocolToEnd);
      setFollowUpHistoryId(activeHistoryEntry.id);
    } else {
      // Protocol ended but no history entry - still show toast
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Protocol has been ended.', type: 'success' } }));
    }
  };
  
  const handleFollowUpClose = () => {
    // Store protocol name before clearing
    const protocolName = followUpProtocol?.protocolName || followUpProtocol?.name || 'Protocol';
    setEndedProtocolName(protocolName);
    setFollowUpProtocol(null);
    setFollowUpHistoryId(null);
    window.dispatchEvent(new CustomEvent('tpp:protocol-history-updated'));
    // Show confirmation modal
    setShowProtocolEndedConfirm(true);
  };

  // Check and auto-end protocols that have finished organically
  useEffect(() => {
    // Only run this check once per day to avoid excessive updates
    const checkKey = 'tpprover_last_auto_end_check';
    const lastCheck = localStorage.getItem(checkKey);
    const today = getLocalDateString();
    
    // Skip if we already checked today
    if (lastCheck === today) return;
    
    // Use centralized date normalization
    const todayOnly = normalizeToMidnight(new Date());
    let hasUpdates = false;
    const autoCompletedProtocols = [];
    
    protocols.forEach(p => {
      // Skip if already ended or doesn't have startDate
      if (p.active === false || p.endDate || !p.startDate) return;
      
      // Calculate expected end date
      // CRITICAL: Use centralized date parsing to avoid timezone issues
      let calculatedEndDate = null;
      const start = parseDateString(p.startDate);
      const startOnly = normalizeToMidnight(start);
      
      if (p.duration && !p.duration.noEnd && p.duration.count > 0 && p.duration.unit) {
        calculatedEndDate = new Date(startOnly);
        const unit = String(p.duration.unit).toLowerCase();
        const count = Number(p.duration.count) || 0;
        
        if (unit.includes('day')) {
          calculatedEndDate.setDate(calculatedEndDate.getDate() + count - 1);
        } else if (unit.includes('week')) {
          calculatedEndDate.setDate(calculatedEndDate.getDate() + (count * 7) - 1);
        } else if (unit.includes('month')) {
          calculatedEndDate.setMonth(calculatedEndDate.getMonth() + count);
          calculatedEndDate.setDate(calculatedEndDate.getDate() - 1);
        }
        
        // If today is past the calculated end date, mark as finished
        if (calculatedEndDate && todayOnly > calculatedEndDate) {
          const endDateString = getLocalDateString(calculatedEndDate);
          updateProtocol({ ...p, active: false, endDate: endDateString, endType: 'completed' });
          hasUpdates = true;
          
          // Update history entry for this protocol
          const activeHistoryEntry = findActiveProtocolHistoryEntry(p.id);
          if (activeHistoryEntry) {
            // Update protocolData with current linkedItems to preserve all data
            const linkedItems = p.linkedItems || {};
            const updatedProtocolData = {
              ...(activeHistoryEntry.protocolData || {}),
              linkedItems: linkedItems
            };
            
            // Capture skipped reconstitution data
            const skippedReconstitution = {};
            Object.entries(linkedItems).forEach(([peptideId, item]) => {
              if (item.status === 'skipped' && item.deliveryMethod) {
                const peptide = p.peptides?.find(pep => (pep.id || `peptide-${p.peptides.indexOf(pep)}`) === peptideId);
                skippedReconstitution[peptideId] = {
                  peptideName: peptide?.name || 'Unknown',
                  deliveryMethod: item.deliveryMethod
                };
              }
            });
            
            updateProtocolHistoryEntry(activeHistoryEntry.id, {
              endDate: endDateString,
              completionStatus: 'completed',
              endType: 'completed',
              protocolData: updatedProtocolData,
              skippedReconstitution: Object.keys(skippedReconstitution).length > 0 ? skippedReconstitution : null
            });
            
            // Track this protocol for follow-up
            autoCompletedProtocols.push({
              protocolId: p.id,
              historyId: activeHistoryEntry.id,
              protocolName: p.protocolName || 'Unnamed Protocol'
            });
          }
        }
      }
    });
    
    // Mark that we've checked today
    if (hasUpdates || !lastCheck) {
      localStorage.setItem(checkKey, today);
      
      // Store auto-completed protocols for follow-up prompts
      if (autoCompletedProtocols.length > 0) {
        const existingPending = JSON.parse(localStorage.getItem('tpprover_pending_followups') || '[]');
        const updated = [...existingPending, ...autoCompletedProtocols];
        localStorage.setItem('tpprover_pending_followups', JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('tpp:protocol-history-updated'));
      }
    }
  }, [protocols, updateProtocol]);

  // 🔧 MIGRATION: Fix endDate for ALL existing protocols (active & inactive) - runs once
  useEffect(() => {
    const migrationKey = 'tpprover_enddate_migration_v2';
    console.log('🔧 Migration check - already run?', localStorage.getItem(migrationKey));
    console.log('🔧 Protocols available:', protocols.length);
    
    // FORCE RUN FOR DEBUGGING - remove this later
    if (localStorage.getItem(migrationKey)) {
      console.log('⚠️ Migration was marked as done, but forcing re-run for debugging');
      localStorage.removeItem(migrationKey);
    }
    
    if (!protocols || protocols.length === 0) {
      console.log('⚠️ No protocols available yet, skipping migration');
      return;
    }
    
    let migratedCount = 0;
    console.log('🔧 Starting migration loop through', protocols.length, 'protocols');
    protocols.forEach((p, index) => {
      console.log(`🔍 [${index}] Checking protocol:`, { 
        name: p.name || p.protocolName, 
        startDate: p.startDate,
        currentEndDate: p.endDate,
        hasPeptides: p.peptides?.length,
        duration: p.duration,
        peptideFrequencies: p.peptides?.map(pep => ({ name: pep.name, type: pep.frequency?.type, onDays: pep.frequency?.onDays, offDays: pep.frequency?.offDays }))
      });
      if (!p?.startDate) {
        console.log(`  ⏭️ Skipping - no startDate`);
        return;
      }
      
      // Recalculate endDate using centralized date utilities
      const start = parseDateString(p.startDate);
      if (!start) {
        console.log(`  ⏭️ Skipping - couldn't parse startDate`);
        return;
      }
      const startNormalized = normalizeToMidnight(start);
      let newEndDate = null;
      
      // Check for cycle-based peptides
      const cyclePeptide = p.peptides?.find(pep => pep.frequency?.type === 'cycle');
      console.log('🔄 Found cycle peptide?', cyclePeptide?.name, cyclePeptide?.frequency);
      
      // SPECIAL CASE: Ongoing cycles - calculate far-future endDate for scheduling
      if (cyclePeptide && p.duration?.noEnd) {
        const onDays = Number(cyclePeptide.frequency.onDays) || 0;
        const offDays = Number(cyclePeptide.frequency.offDays) || 0;
        console.log('🔄 Ongoing cycle detected!', { onDays, offDays });
        
        if (onDays > 0) {
          // For ongoing cycles, schedule 1 year ahead for calendar purposes
          const end = new Date(startNormalized);
          end.setFullYear(end.getFullYear() + 1);
          newEndDate = getLocalDateString(end);
          console.log('🔄 Calculated ongoing cycle endDate (1 year ahead):', newEndDate);
        }
      }
      // Regular cycle with set duration
      else if (cyclePeptide && p.duration && p.duration.count > 0 && p.duration.unit && !p.duration.noEnd) {
        const onDays = Number(cyclePeptide.frequency.onDays) || 0;
        const offDays = Number(cyclePeptide.frequency.offDays) || 0;
        console.log('🔄 Cycle params:', { onDays, offDays, duration: p.duration });
        
        if (onDays > 0) {
          const durationInDays = (() => {
            const count = Number(p.duration.count);
            const unit = String(p.duration.unit).toLowerCase();
            if (unit.includes('day')) return count;
            if (unit.includes('week')) return count * 7;
            if (unit.includes('month')) return count * 30;
            return 0;
          })();
          
          const fullCycles = Math.floor(durationInDays / onDays);
          const remainingOn = durationInDays % onDays;
          let total = fullCycles * (onDays + offDays);
          if (remainingOn > 0) total += remainingOn;
          else if (fullCycles > 0) total -= offDays;
          
          const end = new Date(startNormalized);
          end.setDate(end.getDate() + total - 1);
          newEndDate = getLocalDateString(end);
          console.log('🔄 Calculated cycle endDate:', newEndDate, 'from', durationInDays, 'duration days');
        }
      }
      
      // Fallback to standard duration calculation
      if (!newEndDate && p.duration && !p.duration.noEnd && p.duration.count > 0 && p.duration.unit) {
        const end = new Date(startNormalized);
        const unit = String(p.duration.unit).toLowerCase();
        const count = Number(p.duration.count) || 0;
        
        if (unit.includes('day')) end.setDate(end.getDate() + count - 1);
        else if (unit.includes('week')) end.setDate(end.getDate() + (count * 7) - 1);
        else if (unit.includes('month')) {
          end.setMonth(end.getMonth() + count);
          end.setDate(end.getDate() - 1);
        }
        newEndDate = getLocalDateString(end);
        console.log('📅 Calculated standard endDate:', newEndDate);
      }
      
      // Update if endDate changed
      if (newEndDate && newEndDate !== p.endDate) {
        console.log('✅ Updating protocol:', p.name, 'from', p.endDate, 'to', newEndDate);
        updateProtocol({ ...p, endDate: newEndDate });
        migratedCount++;
      } else {
        console.log('  ℹ️ No update needed - endDate already correct or no new endDate calculated');
      }
    });
    
    localStorage.setItem(migrationKey, 'true');
    console.log(`✅ Migration complete: ${migratedCount} protocol(s) updated`);
    if (migratedCount > 0) {
      console.log(`✅ Migrated ${migratedCount} protocol(s) with corrected endDates`);
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: `Fixed ${migratedCount} protocol date${migratedCount > 1 ? 's' : ''}!`, type: 'success' } 
      }));
    }
  }, [protocols, updateProtocol]);

  const projectedDates = React.useMemo(() => {
    if (!startConfirm || !startDate) return { protocolStartDate: null, protocolEndDate: null, washoutStartDate: null, washoutEndDate: null };

    const { duration, washout, peptides } = startConfirm;
    // CRITICAL: Use centralized date parsing to avoid timezone issues
    const start = parseDateString(startDate);
    if (!start) return { protocolStartDate: null, protocolEndDate: null, washoutStartDate: null, washoutEndDate: null };
    
    const startNormalized = normalizeToMidnight(start);
    let endDate = null;

    // Prioritize cycle-based calculation if available
    const cyclePeptide = peptides?.find(p => p.frequency?.type === 'cycle');
    if (cyclePeptide && duration?.count > 0 && duration?.unit) {
        const onDays = Number(cyclePeptide.frequency.onDays) || 0;
        const offDays = Number(cyclePeptide.frequency.offDays) || 0;
        
        if (onDays > 0) {
            const durationInDays = (() => {
                const count = Number(duration.count);
                if (duration.unit.toLowerCase().includes('day')) return count;
                if (duration.unit.toLowerCase().includes('week')) return count * 7;
                if (duration.unit.toLowerCase().includes('month')) return count * 30; // Approximation
                return 0;
            })();

            const fullCycles = Math.floor(durationInDays / onDays);
            const remainingOnDays = durationInDays % onDays;
            
            let totalDays = fullCycles * (onDays + offDays);
            if (remainingOnDays > 0) {
                totalDays += remainingOnDays;
            } else if (fullCycles > 0) {
                totalDays -= offDays; // Don't add last washout period if it ends on a full cycle
            }
            
            endDate = new Date(startNormalized);
            endDate.setDate(endDate.getDate() + totalDays - 1);
        }
    }
    
    // Fallback to original duration logic if no cycle is found
    if (!endDate && duration && !duration.noEnd && duration.count > 0 && duration.unit) {
        endDate = new Date(startNormalized);
        const count = Number(duration.count);
        if (duration.unit.toLowerCase().includes('day')) endDate.setDate(endDate.getDate() + count - 1);
        else if (duration.unit.toLowerCase().includes('week')) endDate.setDate(endDate.getDate() + (count * 7) - 1);
        else if (duration.unit.toLowerCase().includes('month')) {
          endDate.setMonth(endDate.getMonth() + count);
          endDate.setDate(endDate.getDate() - 1);
        }
    }

    let washoutStartDate = null;
    let washoutEndDate = null;
    if (endDate && washout && washout.enabled && washout.count > 0 && washout.unit) {
        washoutStartDate = new Date(endDate);
        washoutStartDate.setDate(washoutStartDate.getDate() + 1);

        washoutEndDate = new Date(washoutStartDate);
        const washoutCount = Number(washout.count);
        if(washout.unit.toLowerCase().includes('day')) washoutEndDate.setDate(washoutEndDate.getDate() + washoutCount - 1);
        else if(washout.unit.toLowerCase().includes('week')) washoutEndDate.setDate(washoutEndDate.getDate() + (washoutCount * 7) - 1);
        else if(washout.unit.toLowerCase().includes('month')) {
          washoutEndDate.setMonth(washoutEndDate.getMonth() + washoutCount);
          washoutEndDate.setDate(washoutEndDate.getDate() - 1);
        }
    }
    
    return {
      protocolStartDate: formatMMDDYYYY(startNormalized),
      protocolEndDate: endDate ? formatMMDDYYYY(endDate) : 'Ongoing',
      washoutStartDate: washoutStartDate ? formatMMDDYYYY(washoutStartDate) : null,
      washoutEndDate: washoutEndDate ? formatMMDDYYYY(washoutEndDate) : null,
    };
}, [startConfirm, startDate]);

  const isActiveNow = React.useCallback((p) => {
    try {
      if (p?.active !== true) return false
      if (!p?.startDate) return false
      const today = normalizeToMidnight(new Date());
      const s = parseDateString(p.startDate);
      if (!s) return false;
      const startNormalized = normalizeToMidnight(s);
      if (today < startNormalized) return false
      // explicit end date wins
      if (p.endDate) {
        const e = parseDateString(p.endDate);
        if (!e) return false;
        const endNormalized = normalizeToMidnight(e);
        return today <= endNormalized;
      }
      const d = p.duration || {}
      if (d.noEnd || !d.count || !d.unit) return true
      const e = new Date(startNormalized)
      if (String(d.unit).toLowerCase() === 'day') e.setDate(e.getDate() + Number(d.count))
      else if (String(d.unit).toLowerCase() === 'week') e.setDate(e.getDate() + Number(d.count) * 7)
      else if (String(d.unit).toLowerCase() === 'month') e.setMonth(e.getMonth() + Number(d.count))
      return today <= normalizeToMidnight(e)
    } catch { return false }
  }, [])

  React.useEffect(() => {
    const onOpenNew = () => setOpenAdd(true)
    window.addEventListener('tpp:open_protocol_new', onOpenNew)
    return () => window.removeEventListener('tpp:open_protocol_new', onOpenNew)
  }, [])

  const onImportFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      let rows = []
      if (file.name.toLowerCase().endsWith('.json')) {
        rows = JSON.parse(text)
      } else {
        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
        if (lines.length <= 1) throw new Error('empty-csv')
        const delimiter = lines[0].includes('\t') ? '\t' : ','
        const split = (s) => s.split(new RegExp(`${delimiter}`))
        const header = split(lines[0]).map(h => h.trim().toLowerCase())
        const find = (alts) => header.findIndex(h => alts.some(a => h.includes(a)))
        const nameIdx = find(['name','peptide','protocol'])
        const purposeIdx = find(['purpose','goal','desc'])
        const countIdx = find(['count','times','#'])
        const perIdx = find(['per','period','day','week','month'])
        const timeIdx = find(['time','slot','am','pm'])
        const durCountIdx = find(['duration','dur count','duration count'])
        const durUnitIdx = find(['dur unit','duration unit','unit'])
        const noEndIdx = find(['no end','open'])
        for (let i=1;i<lines.length;i++) {
          const cols = split(lines[i]).map(c => c.trim())
          const name = nameIdx>=0 ? cols[nameIdx] : cols[0]
          const purpose = purposeIdx>=0 ? cols[purposeIdx] : ''
          const count = countIdx>=0 ? Number(cols[countIdx])||1 : 1
          const per = perIdx>=0 ? (cols[perIdx]||'Day') : 'Day'
          const timeVal = (timeIdx>=0 ? cols[timeIdx] : 'AM').toUpperCase()
          const times = timeVal.includes('AM') && timeVal.includes('PM') ? ['AM','PM'] : (timeVal.includes('PM') ? ['PM'] : ['AM'])
          const dCount = durCountIdx>=0 ? Number(cols[durCountIdx])||0 : 0
          const dUnit = durUnitIdx>=0 ? (cols[durUnitIdx]||'Week') : 'Week'
          const noEnd = noEndIdx>=0 ? /true|1|yes/i.test(cols[noEndIdx]) : false
          rows.push({ id: generateId(), name, purpose, frequency: { count, per, time: times }, duration: { count: dCount, unit: dUnit, noEnd } })
        }
      }
      if (rows.length > 0) {
        setProtocols(prev => [...rows, ...prev])
        window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: `Imported ${rows.length} peptides`, type: 'success' } }))
      }
    } catch (err) {
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Import failed. Use CSV/JSON with name, purpose, count, per, time, duration.', type: 'error' } }))
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleAddClick = useCallback(() => {
    if (isReadOnly) {
      setShowUpgradeModal(true);
      return;
    }
    setOpenAdd(true);
  }, [isReadOnly]);

  const handleEditClick = useCallback((protocol) => {
    if (isReadOnly) {
      setShowUpgradeModal(true);
      return;
    }
    setEditing(protocol);
  }, [isReadOnly]);

  const handleStartClick = useCallback((protocol, opts) => {
    if (isReadOnly) {
      setShowUpgradeModal(true);
      return;
    }
    if (opts?.manage) {
      setManageConfirm(protocol);
    } else {
      setStartConfirm(protocol);
      setStartDate(protocol.startDate || getLocalDateString());
    }
  }, [isReadOnly]);

  // Allow deletion in read-only mode - users can manage their sensitive data
  const handleDeleteClick = (protocol) => {
    deleteProtocol(protocol.id);
  };

  // Load reminder settings
  const [reminderSettings, setReminderSettings] = useState(() => {
    const settings = loadSettings();
    const defaults = getDefaultSettings();
    return {
      amEnabled: settings?.notifications?.researchRemindersAM ?? defaults.notifications.researchRemindersAM ?? false,
      amTime: settings?.notifications?.researchReminderTimeAM ?? defaults.notifications.researchReminderTimeAM ?? '08:00',
      pmEnabled: settings?.notifications?.researchRemindersPM ?? defaults.notifications.researchRemindersPM ?? false,
      pmTime: settings?.notifications?.researchReminderTimePM ?? defaults.notifications.researchReminderTimePM ?? '18:00'
    };
  });

  // Push notification status
  const [pushNotificationStatus, setPushNotificationStatus] = useState({
    supported: false,
    enabled: false,
    loading: false
  });

  // Check push notification status on mount and when settings change
  useEffect(() => {
    const updatePushStatus = () => {
      const status = pwaNotificationService.getStatus();
      const isNative = Capacitor.isNativePlatform();
      const settings = loadSettings();
      
      const pushEnabled = status.enabled || settings?.notifications?.push === true;
      
      setPushNotificationStatus({
        supported: status.supported || isNative,
        enabled: pushEnabled,
        loading: false
      });
    };

    updatePushStatus();

    const handleEnabled = () => updatePushStatus();
    const handleDisabled = () => updatePushStatus();
    
    // Listen for settings changes (when user toggles push in settings page)
    const handleSettingsChange = () => {
      updatePushStatus();
    };
    window.addEventListener('storage', handleSettingsChange);

    window.addEventListener('pwa-notifications-enabled', handleEnabled);
    window.addEventListener('pwa-notifications-disabled', handleDisabled);

    // Also check periodically for changes
    const interval = setInterval(updatePushStatus, 2000);

    return () => {
      window.removeEventListener('pwa-notifications-enabled', handleEnabled);
      window.removeEventListener('pwa-notifications-disabled', handleDisabled);
      window.removeEventListener('storage', handleSettingsChange);
      clearInterval(interval);
    };
  }, []);

  // Sync reminder enabled state with push notification status
  useEffect(() => {
    if (!pushNotificationStatus.enabled && reminderSettings.enabled) {
      // If push is disabled but reminders are enabled, disable reminders
      setReminderSettings(prev => ({ ...prev, enabled: false }));
      const settings = loadSettings();
      const defaults = getDefaultSettings();
      const updatedSettings = {
        ...defaults,
        ...settings,
        notifications: {
          ...defaults.notifications,
          ...(settings?.notifications || {}),
          researchReminders: false
        }
      };
      saveSettings(updatedSettings);
      syncNotificationSettingsToFirestore();
    }
  }, [pushNotificationStatus.enabled]);

  // Update reminder settings
  const updateReminderSetting = async (key, value) => {
    // If enabling research reminders (AM or PM), check if push notifications are enabled
    if ((key === 'amEnabled' || key === 'pmEnabled') && value === true && !pushNotificationStatus.enabled) {
      // Clear cooldown period to allow permission request
      // User is actively trying to enable notifications, so override the 15-day cooldown
      localStorage.removeItem('tpprover_notification_prompt_last_shown');
      sessionStorage.removeItem('tpprover_notification_dismissed_this_session');
      
      // Set flag to bypass cooldown in NotificationPermissionPrompt
      localStorage.setItem('tpprover_user_requesting_permissions', 'true');
      
      // Request push notification permissions
      setPushNotificationStatus(prev => ({ ...prev, loading: true }));
      
      try {
        let permissionGranted = false;
        
        if (Capacitor.isNativePlatform()) {
          // Native app - use Capacitor
          try {
            const { LocalNotifications } = await import('@capacitor/local-notifications');
            const result = await LocalNotifications.requestPermissions();
            permissionGranted = result.display === 'granted';
            
            // Also request push notification permissions if available
            try {
              const { PushNotifications } = await import('@capacitor/push-notifications');
              
              // Add listener BEFORE registering to catch token immediately
              PushNotifications.addListener('registration', async (token) => {
                try {
                  const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
                  const { db } = await import('../config/firebase');
                  const user = JSON.parse(localStorage.getItem('tpprover_user') || 'null');
                  const userId = user.uid || user.email?.toLowerCase();
                  
                  if (userId) {
                    const userRef = doc(db, 'users', userId);
                    await setDoc(userRef, {
                      fcmToken: token.value,
                      pushToken: token.value, // Backward compatibility
                      notificationSettings: {
                        push: true,
                        pushEnabled: true,
                        researchRemindersAM: reminderSettings.amEnabled,
                        researchReminderTimeAM: reminderSettings.amTime,
                        researchRemindersPM: reminderSettings.pmEnabled,
                        researchReminderTimePM: reminderSettings.pmTime,
                        lastUpdated: serverTimestamp()
                      },
                      deviceInfo: {
                        platform: Capacitor.getPlatform(),
                        isNative: true,
                        lastUpdated: serverTimestamp()
                      }
                    }, { merge: true });
                    console.log('✅ FCM token saved to Firestore');
                  }
                } catch (error) {
                  console.error('Failed to save FCM token:', error);
                }
              });
              
              const pushResult = await PushNotifications.requestPermissions();
              if (pushResult.receive === 'granted') {
                await PushNotifications.register();
              }
            } catch (e) {
              console.warn('Push notifications not available:', e);
            }
          } catch (error) {
            throw new Error('Failed to request native notification permissions');
          }
        } else {
          // PWA - use browser API
          await pwaNotificationService.enable();
          // Safety check for Notification API (not available on native apps)
          permissionGranted = typeof window !== 'undefined' && 'Notification' in window && typeof Notification !== 'undefined'
            ? Notification.permission === 'granted'
            : false;
        }
        
        if (permissionGranted) {
          // Clear the bypass flag since permission was granted
          localStorage.removeItem('tpprover_user_requesting_permissions');
          
          // Enable push notifications in settings
          const currentSettings = loadSettings();
          const defaults = getDefaultSettings();
          const updatedSettings = {
            ...defaults,
            ...currentSettings,
            notifications: {
              ...defaults.notifications,
              ...(currentSettings?.notifications || {}),
              push: true,
              [key]: true, // Enable the specific reminder (amEnabled or pmEnabled)
              [`researchReminderTime${key === 'amEnabled' ? 'AM' : 'PM'}`]: reminderSettings[key === 'amEnabled' ? 'amTime' : 'pmTime']
            }
          };
          saveSettings(updatedSettings);
          
          // Update push status
          setPushNotificationStatus(prev => ({ ...prev, enabled: true, loading: false }));
          
          // Update reminder settings
          const newSettings = { ...reminderSettings, [key]: true };
          setReminderSettings(newSettings);
          
          // Sync to Firestore
          await syncNotificationSettingsToFirestore();
          
          // Show success message
          window.dispatchEvent(new CustomEvent('tpp:toast', { 
            detail: { 
              message: '🎉 Push notifications enabled! Research reminders are now active.', 
              type: 'success' 
            } 
          }));
        } else {
          // Clear the bypass flag if permission was denied
          localStorage.removeItem('tpprover_user_requesting_permissions');
          throw new Error('Permission was not granted');
        }
      } catch (error) {
        console.error('Failed to enable push notifications:', error);
        // Clear the bypass flag on error
        localStorage.removeItem('tpprover_user_requesting_permissions');
        setPushNotificationStatus(prev => ({ ...prev, loading: false }));
        
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { 
            message: 'Failed to enable notifications. Please enable them in your device settings.', 
            type: 'error' 
          } 
        }));
        
        // Don't enable reminders if push failed
        return;
      }
    } else {
      // Normal update (not enabling reminders, or push is already enabled)
      const newSettings = { ...reminderSettings, [key]: value };
      setReminderSettings(newSettings);
      
      // Update localStorage
      const currentSettings = loadSettings();
      const defaults = getDefaultSettings();
      
      // Map reminder settings to notification settings
      const notificationUpdates = {};
      if (key === 'amEnabled') {
        notificationUpdates.researchRemindersAM = value;
      } else if (key === 'pmEnabled') {
        notificationUpdates.researchRemindersPM = value;
      } else if (key === 'amTime') {
        notificationUpdates.researchReminderTimeAM = value;
      } else if (key === 'pmTime') {
        notificationUpdates.researchReminderTimePM = value;
      }
      
      const updatedSettings = {
        ...defaults,
        ...currentSettings,
        notifications: {
          ...defaults.notifications,
          ...(currentSettings?.notifications || {}),
          ...notificationUpdates,
          researchRemindersAM: newSettings.amEnabled,
          researchReminderTimeAM: newSettings.amTime,
          researchRemindersPM: newSettings.pmEnabled,
          researchReminderTimePM: newSettings.pmTime
        }
      };
      saveSettings(updatedSettings);
      
      // Sync to Firestore
      await syncNotificationSettingsToFirestore();
    }
  };

  // Set topbar tabs via custom event
  useEffect(() => {
    const tabs = [
      { value: 'protocols', label: 'Protocols' },
      { value: 'reminders', label: 'Reminders' },
      { value: 'history', label: 'History' }
    ];
    window.dispatchEvent(new CustomEvent('tpp:set-topbar-tabs', { 
      detail: { 
        tabs, 
        activeTab, 
        onTabChange: setActiveTab,
        onActionClick: handleAddClick,
        actionDisabled: isReadOnly
      } 
    }));
    
    // Listen for topbar search events for page-specific search
    const handleSearch = (e) => {
      setSearchQuery(e.detail.query);
    };
    window.addEventListener('tpp:protocols-search', handleSearch);
    
    return () => {
      window.dispatchEvent(new CustomEvent('tpp:clear-topbar-tabs'));
      window.removeEventListener('tpp:protocols-search', handleSearch);
    };
  }, [activeTab, isReadOnly, handleAddClick]);

  const filteredProtocols = React.useMemo(() => {
    if (!searchQuery) return protocols;
    const query = searchQuery.toLowerCase();
    return protocols.filter(p => {
      const protocolName = (p.protocolName || p.name || '').toLowerCase();
      return protocolName.includes(query);
    });
  }, [protocols, searchQuery]);

  // Organize protocols: active first, then inactive (alphabetically sorted)
  const organizedProtocols = React.useMemo(() => {
    // Ensure filteredProtocols is always an array
    const protocolsToOrganize = Array.isArray(filteredProtocols) ? filteredProtocols : [];
    const active = [];
    const inactive = [];

    protocolsToOrganize.forEach(p => {
      const isActive = p.active === true || isActiveNow(p);
      if (isActive) {
        active.push(p);
      } else {
        inactive.push(p);
      }
    });

    // Sort both groups alphabetically by name
    const sortByName = (a, b) => {
      const nameA = (a.name || a.protocolName || '').toLowerCase();
      const nameB = (b.name || b.protocolName || '').toLowerCase();
      return nameA.localeCompare(nameB);
    };

    active.sort(sortByName);
    inactive.sort(sortByName);

    return { active, inactive };
  }, [filteredProtocols, isActiveNow]);

  // Check for draft start protocol data
  const hasDraftStart = React.useCallback((protocolId) => {
    try {
      const storageKey = `tpprover_start_protocol_draft_${protocolId}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsedData = JSON.parse(saved);
        return parsedData.data && Object.keys(parsedData.data).length > 0;
      }
    } catch (e) {
      return false;
    }
    return false;
  }, []);

  // Memoize dropdown options to prevent blank dropdown on first render
  // Ensure organizedProtocols is always defined with safe defaults
  const protocolFilterOptions = React.useMemo(() => {
    const activeCount = organizedProtocols?.active?.length ?? 0;
    const inactiveCount = organizedProtocols?.inactive?.length ?? 0;
    const totalCount = activeCount + inactiveCount;
    
    return [
      { 
        value: 'all', 
        label: `All Protocols (${totalCount})`,
        icon: <List size={16} style={{ color: theme.textLight }} />
      },
      { 
        value: 'active', 
        label: `Active Only (${activeCount})`,
        icon: <CheckCircle2 size={16} style={{ color: theme.primary }} />
      },
      { 
        value: 'inactive', 
        label: `Inactive Only (${inactiveCount})`,
        icon: <XCircle size={16} style={{ color: '#6b7280' }} />
      }
    ];
  }, [organizedProtocols?.active?.length, organizedProtocols?.inactive?.length, theme.textLight, theme.primary]);

  return (
    <>
      <ProtocolsTipsBanner theme={theme} />
      
      <div className="space-y-4">

        {/* Content based on active tab */}
        {activeTab === 'protocols' && (
          <div>
            {/* Filter Dropdown */}
            {protocols.length > 0 && (
              <div className="mb-6">
                <CustomDropdown
                  value={protocolFilter}
                  onChange={setProtocolFilter}
                  options={protocolFilterOptions}
                  theme={theme}
                  placeholder="Filter protocols..."
                  outlined={true}
                  customShadow={true}
                />
              </div>
            )}

            {filteredProtocols.length === 0 ? (
              searchQuery ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${theme.primary}10` }}>
                    <FileText size={32} style={{ color: theme.primary }} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>No Results Found</h3>
                  <p className="text-sm" style={{ color: theme.textLight }}>
                    No protocols match your search query.
                  </p>
                </div>
              ) : protocols.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${theme.primary}10` }}>
                    <FileText size={32} style={{ color: theme.primary }} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>No Protocols Yet</h3>
                  <p className="text-sm mb-6 max-w-md" style={{ color: theme.textLight }}>
                    Create a protocol to track supplement schedules, dosing cycles, and timing for research purposes. 
                    Protocols help maintain consistency and track adherence to research plans.
                  </p>
                  {!isReadOnly && (
                    <button
                      onClick={handleAddClick}
                      className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all hover:opacity-90 hover:scale-105"
                      style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                    >
                      <PlusCircle size={18} />
                      Create Your First Protocol
                    </button>
                  )}
                </div>
              ) : null
            ) : (
              <div className="space-y-6">
                {/* Active Protocols Section */}
                {(protocolFilter === 'all' || protocolFilter === 'active') && organizedProtocols.active.length > 0 && (
                  <div className="space-y-4">
                    {protocolFilter === 'all' && (
                      <h2 
                        className="text-sm font-semibold uppercase tracking-wider px-1"
                        style={{ color: theme.textLight }}
                      >
                        Active Protocols
                      </h2>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {organizedProtocols.active.map(p => (
                        <ProtocolCard 
                          key={p.id}
                          item={p}
                          theme={theme}
                          isActive={true}
                          onStartClick={handleStartClick}
                          onEditClick={handleEditClick}
                          onHistoryClick={setHistoryProtocol}
                          hasDraftStart={hasDraftStart(p.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Inactive Protocols Section */}
                {(protocolFilter === 'all' || protocolFilter === 'inactive') && organizedProtocols.inactive.length > 0 && (
                  <div className="space-y-4">
                    {protocolFilter === 'all' && organizedProtocols.active.length > 0 && (
                      <h2 
                        className="text-sm font-semibold uppercase tracking-wider px-1"
                        style={{ color: theme.textLight }}
                      >
                        Inactive Protocols
                      </h2>
                    )}
                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      {organizedProtocols.inactive.map(p => (
                        <ProtocolCard 
                          key={p.id}
                          item={p}
                          theme={theme}
                          isActive={false}
                          onStartClick={handleStartClick}
                          onEditClick={handleEditClick}
                          onHistoryClick={setHistoryProtocol}
                          hasDraftStart={hasDraftStart(p.id)}
                          compact={true}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* No results based on filter */}
                {((protocolFilter === 'active' && organizedProtocols.active.length === 0) ||
                  (protocolFilter === 'inactive' && organizedProtocols.inactive.length === 0)) && (
                  <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${theme.primary}10` }}>
                      <FileText size={32} style={{ color: theme.primary }} />
                    </div>
                    <h3 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>
                      No {protocolFilter === 'active' ? 'Active' : 'Inactive'} Protocols
                    </h3>
                    <p className="text-sm" style={{ color: theme.textLight }}>
                      {protocolFilter === 'active' 
                        ? 'Start a protocol to see it here.' 
                        : 'Inactive protocols will appear here once you end them.'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="relative">
            {(() => {
              // Helper function to get status badge info
              const getStatusBadge = (status) => {
                switch (status) {
                  case 'completed':
                    return {
                      icon: CalendarCheck,
                      label: 'Completed',
                      bgColor: theme.isDark ? '#3c4e3a' : '#607c5c',
                      textColor: '#dcfce7'
                    };
                  case 'ended_early':
                    return {
                      icon: CalendarX,
                      label: 'Ended Early',
                      bgColor: theme.isDark ? '#6D2B2C' : '#A14D4D',
                      textColor: '#fee2e2'
                    };
                  case 'rescheduled':
                    return {
                      icon: Clock,
                      label: 'Rescheduled',
                      bgColor: theme.isDark ? '#78350f' : '#fef3c7',
                      textColor: theme.isDark ? '#fcd34d' : '#92400e'
                    };
                  default:
                    return null;
                }
              };

              // Get all history entries from localStorage (these have timestamps)
              const allHistoryEntries = getProtocolHistory();
              
              // Filter for finished history entries (must have endDate)
              const finishedHistoryEntries = allHistoryEntries.filter(entry => {
                return entry.endDate && entry.protocolId;
              });

              if (finishedHistoryEntries.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${theme.primary}10` }}>
                      <Clock size={32} style={{ color: theme.primary }} />
                    </div>
                    <h3 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>Protocol History</h3>
                    <p className="text-sm mb-6 max-w-md" style={{ color: theme.textLight }}>
                      Track protocol completion history.
                    </p>
                    <p className="text-xs" style={{ color: theme.textLight }}>No completed protocols yet.</p>
                  </div>
                );
              }

              // Sort by timestamp (most recent first) - use updatedAt if available, fallback to createdAt, then endDate
              const sortedHistoryEntries = [...finishedHistoryEntries].sort((a, b) => {
                // Use updatedAt timestamp if available (most accurate for recent changes)
                const aTimestamp = a.updatedAt ? new Date(a.updatedAt) : (a.createdAt ? new Date(a.createdAt) : new Date(a.endDate));
                const bTimestamp = b.updatedAt ? new Date(b.updatedAt) : (b.createdAt ? new Date(b.createdAt) : new Date(b.endDate));
                return bTimestamp.getTime() - aTimestamp.getTime();
              });

              // Group history entries by month/year and create timeline entries
              const timelineEntries = [];
              let currentMonthYear = null;
              
              sortedHistoryEntries.forEach((entry, index) => {
                if (!entry.endDate) return;
                const endDate = new Date(entry.endDate);
                const month = endDate.toLocaleDateString('en-US', { month: 'short' });
                const year = endDate.getFullYear();
                const monthYearKey = `${month} ${year}`;
                
                // Add month/year header if it's a new month
                if (monthYearKey !== currentMonthYear) {
                  timelineEntries.push({
                    type: 'header',
                    key: monthYearKey,
                    month,
                    year,
                    date: endDate
                  });
                  currentMonthYear = monthYearKey;
                }
                
                // Find the protocol object for this history entry
                const protocol = protocols.find(p => p.id === entry.protocolId);
                
                // Add history entry
                const startDate = entry.startDate ? new Date(entry.startDate) : null;
                const endDateObj = entry.endDate ? new Date(entry.endDate) : null;
                let durationDays = 0;
                if (startDate && endDateObj) {
                  durationDays = Math.ceil((endDateObj - startDate) / (1000 * 60 * 60 * 24)) + 1;
                }
                
                // Determine completion status
                const completionStatus = entry.completionStatus || 'unknown';
                
                timelineEntries.push({
                  type: 'protocol',
                  historyEntry: entry,
                  protocol: protocol,
                  durationDays,
                  startDate: startDate ? formatMMDDYYYY(entry.startDate) : 'Not started',
                  endDate: endDateObj ? formatMMDDYYYY(entry.endDate) : 'Ongoing',
                  completionStatus: completionStatus
                });
              });

              // Helper function to get icon for completion status
              const getStatusIcon = (status) => {
                switch (status) {
                  case 'completed':
                    return CheckCircle2;
                  case 'ended_early':
                    return XCircle;
                  case 'rescheduled':
                    return Clock;
                  default:
                    return FlaskConical;
                }
              };

              return (
                <div className="relative">
                  {/* Timeline entries */}
                  <div className="space-y-3">
                    {timelineEntries.map((entry, index) => {
                      if (entry.type === 'header') {
                        // Month/Year header - simplified without timeline node
                        return (
                          <div key={entry.key} className="relative flex items-center mb-3 mt-4 first:mt-0">
                            <h3 
                              className="text-sm font-semibold uppercase tracking-wider"
                              style={{ color: theme.textLight }}
                            >
                              {entry.month} {entry.year}
                            </h3>
                          </div>
                        );
                      } else {
                        // Protocol entry
                        const historyEntry = entry.historyEntry;
                        const protocol = entry.protocol;
                        const statusBadge = getStatusBadge(entry.completionStatus);
                        const StatusIcon = statusBadge?.icon;
                        const TimelineIcon = getStatusIcon(entry.completionStatus);
                        const isHovered = hoveredHistoryId === historyEntry.id;
                        
                        return (
                          <div 
                            key={historyEntry.id} 
                            className="relative group"
                            onMouseEnter={() => setHoveredHistoryId(historyEntry.id)}
                            onMouseLeave={() => setHoveredHistoryId(null)}
                          >
                            {/* Floating icon node - only visible on hover */}
                            {isHovered && (
                              <div 
                                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 z-20"
                                style={{ 
                                  backgroundColor: theme.isDark ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                                  backdropFilter: 'blur(10px)',
                                  border: `2px solid ${theme.primary}`,
                                  boxShadow: theme.isDark 
                                    ? '0 4px 12px rgba(0, 0, 0, 0.4)' 
                                    : '0 4px 12px rgba(0, 0, 0, 0.1)'
                                }}
                              >
                                <TimelineIcon 
                                  size={18} 
                                  style={{ color: theme.primary }}
                                />
                              </div>
                            )}
                            
                            {/* Protocol card with glassmorphism */}
                            <button
                              onClick={() => setSelectedHistoryEntry(historyEntry)}
                              className="w-full text-left rounded-xl transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden"
                              style={{ 
                                backgroundColor: theme.isDark 
                                  ? 'rgba(31, 41, 55, 0.6)' 
                                  : 'rgba(255, 255, 255, 0.7)',
                                backdropFilter: 'blur(20px)',
                                WebkitBackdropFilter: 'blur(20px)',
                                border: `1px solid ${theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`,
                                boxShadow: theme.isDark 
                                  ? '0 4px 16px rgba(0, 0, 0, 0.3)' 
                                  : '0 4px 16px rgba(0, 0, 0, 0.08)'
                              }}
                            >
                              <div className="flex gap-4 p-4">
                                {/* Main content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1.5">
                                    {protocol?.emoji && (
                                      <span className="text-xl">{protocol.emoji}</span>
                                    )}
                                    <span className="font-semibold text-base" style={{ color: theme.text }}>
                                      {historyEntry.protocolName || protocol?.protocolName || protocol?.name || 'Unnamed Protocol'}
                                    </span>
                                  </div>
                                  
                                  {/* Status badge - inline */}
                                  {statusBadge && StatusIcon && (
                                    <div className="inline-block mt-1.5">
                                      <span 
                                        className="px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 w-fit"
                                        style={{ 
                                          backgroundColor: statusBadge.bgColor,
                                          color: statusBadge.textColor
                                        }}
                                      >
                                        <StatusIcon size={12} />
                                        {statusBadge.label}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Sidebar with dates and duration */}
                                <div className="flex-shrink-0 w-32 text-right space-y-0.5 border-l pl-4" style={{ borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)' }}>
                                  <div className="text-xs font-medium uppercase tracking-wide" style={{ color: theme.textLight }}>
                                    {entry.startDate}
                                  </div>
                                  <div className="text-xs" style={{ color: theme.textLight }}>
                                    →
                                  </div>
                                  <div className="text-xs font-medium uppercase tracking-wide" style={{ color: theme.textLight }}>
                                    {entry.endDate}
                                  </div>
                                  {entry.durationDays > 0 && (
                                    <div className="pt-1.5 mt-1.5 border-t" style={{ borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)' }}>
                                      <div className="text-xs font-semibold" style={{ color: theme.text }}>
                                        {entry.durationDays} day{entry.durationDays !== 1 ? 's' : ''}
                                      </div>
                                    </div>
                                  )}
                                  <div className="pt-1.5 flex justify-end">
                                    <ChevronDown 
                                      size={16} 
                                      className="transform rotate-[-90deg] opacity-50"
                                      style={{ color: theme.textLight }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </button>
                          </div>
                        );
                      }
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'reminders' && (
          <div className="space-y-4">
            {/* Research Reminders Section Header */}
            <div className="flex items-center gap-4 mb-3">
              <Bell size={32} style={{ color: theme.primary }} />
              <div className="flex flex-col gap-0.5">
                <h4 className="text-lg font-black tracking-wide" style={{ color: theme.text }}>Research Reminders</h4>
                <div className="flex items-center gap-2 ml-1">
                  <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                    Notifications
                  </span>
                </div>
              </div>
            </div>
            
            {/* Reminders Cards Container - Two columns on desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* AM Reminders Section */}
                <div className="space-y-4 p-4 rounded-lg" style={{ backgroundColor: theme.isDark ? '#1f2937' : '#ffffff', border: `1px solid ${theme.border}` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium mb-1" style={{ color: theme.text }}>
                        Morning Reminders (AM)
                      </div>
                      <div className="text-xs" style={{ color: theme.textLight }}>
                        Receive a notification in the morning if you have research tasks scheduled
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                      <input 
                        type="checkbox" 
                        checked={reminderSettings.amEnabled && pushNotificationStatus.enabled} 
                        onChange={e => updateReminderSetting('amEnabled', e.target.checked)} 
                        disabled={pushNotificationStatus.loading || !pushNotificationStatus.supported}
                        className="sr-only peer" 
                      />
                      <div 
                        className={`w-11 h-6 rounded-full peer peer-focus:ring-2 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`}
                        style={{ 
                          backgroundColor: (reminderSettings.amEnabled && pushNotificationStatus.enabled) ? theme.primary : '#d1d5db',
                          opacity: (pushNotificationStatus.loading || !pushNotificationStatus.supported) ? 0.5 : 1
                        }}
                      />
                    </label>
                  </div>

                  {reminderSettings.amEnabled && pushNotificationStatus.enabled ? (
                    <div className="space-y-2 mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:items-center">
                        <div>
                          <div className="text-xs mb-1" style={{ color: theme.textLight }}>
                            Reminder Time
                          </div>
                          <div className="text-lg font-semibold" style={{ color: theme.text }}>
                            {(() => {
                              const [hour24, minute] = reminderSettings.amTime.split(':').map(Number);
                              const hour12 = hour24 === 0 ? 12 : hour24;
                              return `${hour12}:${String(minute).padStart(2, '0')} AM`;
                            })()}
                          </div>
                        </div>
                        <div className="flex md:justify-end">
                          <button
                            onClick={() => {
                              setCustomTimeInput(prev => ({ ...prev, am: reminderSettings.amTime }));
                              setTimeModalOpen(prev => ({ ...prev, am: true }));
                            }}
                            className="w-full md:w-auto px-4 py-2 rounded-lg text-sm font-medium border transition-all hover:opacity-80"
                            style={{
                              borderColor: theme.border,
                              backgroundColor: theme.cardBackground,
                              color: theme.primary
                            }}
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="mt-4 p-3 rounded-lg text-sm text-center"
                      style={{ 
                        backgroundColor: theme.isDark ? '#1f2937' : '#f9fafb',
                        color: theme.textLight,
                        border: `1px solid ${theme.border}`
                      }}
                    >
                      <span style={{ color: theme.textLight }}>No reminders set!</span>
                    </div>
                  )}
                </div>

                {/* PM Reminders Section */}
                <div className="space-y-4 p-4 rounded-lg" style={{ backgroundColor: theme.isDark ? '#1f2937' : '#ffffff', border: `1px solid ${theme.border}` }}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium mb-1" style={{ color: theme.text }}>
                      Evening Reminders (PM)
                    </div>
                    <div className="text-xs" style={{ color: theme.textLight }}>
                      Receive a notification in the evening if you have research tasks scheduled
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input 
                      type="checkbox" 
                      checked={reminderSettings.pmEnabled && pushNotificationStatus.enabled} 
                      onChange={e => updateReminderSetting('pmEnabled', e.target.checked)} 
                      disabled={pushNotificationStatus.loading || !pushNotificationStatus.supported}
                      className="sr-only peer" 
                    />
                    <div 
                      className={`w-11 h-6 rounded-full peer peer-focus:ring-2 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`}
                      style={{ 
                        backgroundColor: (reminderSettings.pmEnabled && pushNotificationStatus.enabled) ? theme.primary : '#d1d5db',
                        opacity: (pushNotificationStatus.loading || !pushNotificationStatus.supported) ? 0.5 : 1
                      }}
                    />
                  </label>
                </div>

                {reminderSettings.pmEnabled && pushNotificationStatus.enabled ? (
                  <div className="space-y-2 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:items-center">
                      <div>
                        <div className="text-xs mb-1" style={{ color: theme.textLight }}>
                          Reminder Time
                        </div>
                        <div className="text-lg font-semibold" style={{ color: theme.text }}>
                          {(() => {
                            const [hour24, minute] = reminderSettings.pmTime.split(':').map(Number);
                            const hour12 = hour24 === 12 ? 12 : hour24 - 12;
                            return `${hour12}:${String(minute).padStart(2, '0')} PM`;
                          })()}
                        </div>
                      </div>
                      <div className="flex md:justify-end">
                        <button
                          onClick={() => {
                            setCustomTimeInput(prev => ({ ...prev, pm: reminderSettings.pmTime }));
                            setTimeModalOpen(prev => ({ ...prev, pm: true }));
                          }}
                          className="w-full md:w-auto px-4 py-2 rounded-lg text-sm font-medium border transition-all hover:opacity-80"
                          style={{
                            borderColor: theme.border,
                            backgroundColor: theme.cardBackground,
                            color: theme.primary
                          }}
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="mt-4 p-3 rounded-lg text-sm text-center"
                    style={{ 
                      backgroundColor: theme.isDark ? '#1f2937' : '#f9fafb',
                      color: theme.textLight,
                      border: `1px solid ${theme.border}`
                    }}
                  >
                    <span style={{ color: theme.textLight }}>No reminders set!</span>
                  </div>
                )}
                </div>
              </div>
          </div>
        )}
      </div>

      {/* Time Selection Modal for AM */}
      <Modal
        open={timeModalOpen.am}
        onClose={() => setTimeModalOpen(prev => ({ ...prev, am: false }))}
        title="Schedule Reminder (AM)"
        theme={theme}
        variant="modern"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          {/* Suggested Times */}
          <div className="space-y-2">
            {[
              { icon: SunDim, time: '07:00', label: '7:00 AM' },
              { icon: SunMedium, time: '09:30', label: '9:30 AM' },
              { icon: Sun, time: '11:00', label: '11:00 AM' }
            ].map((option) => {
              const Icon = option.icon;
              const isSelected = reminderSettings.amTime === option.time;
              return (
                <button
                  key={option.time}
                  onClick={() => {
                    updateReminderSetting('amTime', option.time);
                    setTimeModalOpen(prev => ({ ...prev, am: false }));
                  }}
                  className="w-full px-4 py-3 rounded-lg text-left border transition-all flex items-center gap-3"
                  style={{
                    borderColor: isSelected ? theme.primary : theme.border,
                    backgroundColor: isSelected ? `${theme.primary}10` : theme.cardBackground,
                    color: theme.text
                  }}
                >
                  <Icon size={20} style={{ color: isSelected ? theme.primary : theme.textLight }} />
                  <span className="flex-1 font-medium">{option.label}</span>
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.primary }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Page Break */}
          <div className="border-t my-4" style={{ borderColor: theme.border }} />

          {/* Custom Time Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium block flex items-center gap-2" style={{ color: theme.text }}>
              <ClockPlus size={16} />
              Pick your own time
            </label>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={customTimeInput.am || reminderSettings.amTime}
                onChange={(e) => {
                  setCustomTimeInput(prev => ({ ...prev, am: e.target.value }));
                }}
                className="flex-1 px-3 py-2 rounded-lg border text-sm"
                style={{
                  borderColor: theme.border,
                  backgroundColor: theme.cardBackground,
                  color: theme.text
                }}
              />
              <button
                onClick={() => {
                  if (customTimeInput.am) {
                    updateReminderSetting('amTime', customTimeInput.am);
                    setTimeModalOpen(prev => ({ ...prev, am: false }));
                  }
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{ backgroundColor: theme.primary }}
              >
                Set
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Time Selection Modal for PM */}
      <Modal
        open={timeModalOpen.pm}
        onClose={() => setTimeModalOpen(prev => ({ ...prev, pm: false }))}
        title="Schedule Reminder (PM)"
        theme={theme}
        variant="modern"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          {/* Suggested Times */}
          <div className="space-y-2">
            {[
              { icon: Sun, time: '13:00', label: '1:00 PM' },
              { icon: Sunset, time: '17:30', label: '5:30 PM' },
              { icon: MoonStar, time: '20:00', label: '8:00 PM' }
            ].map((option) => {
              const Icon = option.icon;
              const isSelected = reminderSettings.pmTime === option.time;
              return (
                <button
                  key={option.time}
                  onClick={() => {
                    updateReminderSetting('pmTime', option.time);
                    setTimeModalOpen(prev => ({ ...prev, pm: false }));
                  }}
                  className="w-full px-4 py-3 rounded-lg text-left border transition-all flex items-center gap-3"
                  style={{
                    borderColor: isSelected ? theme.primary : theme.border,
                    backgroundColor: isSelected ? `${theme.primary}10` : theme.cardBackground,
                    color: theme.text
                  }}
                >
                  <Icon size={20} style={{ color: isSelected ? theme.primary : theme.textLight }} />
                  <span className="flex-1 font-medium">{option.label}</span>
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.primary }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Page Break */}
          <div className="border-t my-4" style={{ borderColor: theme.border }} />

          {/* Custom Time Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium block flex items-center gap-2" style={{ color: theme.text }}>
              <ClockPlus size={16} />
              Pick your own time
            </label>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={customTimeInput.pm || reminderSettings.pmTime}
                onChange={(e) => {
                  setCustomTimeInput(prev => ({ ...prev, pm: e.target.value }));
                }}
                className="flex-1 px-3 py-2 rounded-lg border text-sm"
                style={{
                  borderColor: theme.border,
                  backgroundColor: theme.cardBackground,
                  color: theme.text
                }}
              />
              <button
                onClick={() => {
                  if (customTimeInput.pm) {
                    updateReminderSetting('pmTime', customTimeInput.pm);
                    setTimeModalOpen(prev => ({ ...prev, pm: false }));
                  }
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{ backgroundColor: theme.primary }}
              >
                Set
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <ProtocolEditorModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        theme={theme}
        onSave={(data) => {
          setOpenAdd(false)
          // New protocols should not be active until explicitly started
          const now = new Date().toISOString();
          const cleaned = { 
            id: generateId(), 
            ...data, 
            active: false, 
            startDate: data.startDate || '',
            createdAt: now,
            updatedAt: now
          }
          addProtocol(cleaned);
        }}
      />

      <ProtocolEditorModal
        open={!!editing}
        onClose={() => setEditing(null)}
        theme={theme}
        protocol={editing}
        onSave={(data) => {
          const updatedProtocol = { ...editing, ...data };
          
          // Re-calculate end-date if start date or duration changes
          const computeEndDate = (p) => {
              try {
                  if (!p?.startDate) return p.endDate || null;
                  // CRITICAL: Use centralized date parsing
                  const start = parseDateString(p.startDate);
                  if (!start) return p.endDate || null;
                  const startNormalized = normalizeToMidnight(start);
                  let end = null;
                  const cyclePeptide = p.peptides?.find(pep => pep.frequency?.type === 'cycle');
                  
                  // SPECIAL CASE: Ongoing cycles - calculate far-future endDate for scheduling
                  if (cyclePeptide && p.duration?.noEnd) {
                      const onDays = Number(cyclePeptide.frequency.onDays) || 0;
                      const offDays = Number(cyclePeptide.frequency.offDays) || 0;
                      if (onDays > 0) {
                          // For ongoing cycles, schedule 1 year ahead for calendar purposes
                          end = new Date(startNormalized);
                          end.setFullYear(end.getFullYear() + 1);
                      }
                  }
                  // Regular cycle with set duration
                  else if (cyclePeptide) {
                      const onDays = Number(cyclePeptide.frequency.onDays) || 0;
                      const offDays = Number(cyclePeptide.frequency.offDays) || 0;
                      if (onDays > 0 && p.duration && p.duration.count > 0 && p.duration.unit) {
                          const durationInDays = (() => {
                              const count = Number(p.duration.count);
                              const unit = String(p.duration.unit).toLowerCase();
                              if (unit.includes('day')) return count;
                              if (unit.includes('week')) return count * 7;
                              if (unit.includes('month')) return count * 30;
                              return 0;
                          })();
                          const fullCycles = Math.floor(durationInDays / onDays);
                          const remainingOn = durationInDays % onDays;
                          let total = fullCycles * (onDays + offDays);
                          if (remainingOn > 0) total += remainingOn; else if (fullCycles > 0) total -= offDays;
                          end = new Date(startNormalized);
                          end.setDate(end.getDate() + total - 1);
                      }
                  }
                  if (!end && p.duration && !p.duration.noEnd && p.duration.count > 0 && p.duration.unit) {
                      end = new Date(startNormalized);
                      const unit = String(p.duration.unit).toLowerCase();
                      const count = Number(p.duration.count) || 0;
                      if (unit.includes('day')) end.setDate(end.getDate() + count - 1);
                      else if (unit.includes('week')) end.setDate(end.getDate() + (count * 7) - 1);
                      else if (unit.includes('month')) { end.setMonth(end.getMonth() + count); end.setDate(end.getDate() - 1); }
                  }
                  return end ? getLocalDateString(end) : p.endDate || null;
              } catch { return p.endDate || null; }
          };

          const newEndDate = computeEndDate(updatedProtocol);
          const finalProtocol = { ...updatedProtocol, endDate: newEndDate };

          // Update protocol
          updateProtocol(finalProtocol);
          
          // Save to protocol draft for real-time sync with tasks/calendar
          try {
            const draftKey = `tpprover_protocol_draft_${finalProtocol.id}`;
            localStorage.setItem(draftKey, JSON.stringify({
              data: finalProtocol,
              timestamp: new Date().toISOString()
            }));
            
            // Emit event so Dashboard, TasksWidget, and Calendar pick up the changes immediately
            window.dispatchEvent(new CustomEvent('tpp:protocol-autosaved', {
              detail: { storageKey: draftKey, formData: finalProtocol }
            }));
            
            // Trigger calendar and dashboard refresh
            window.dispatchEvent(new CustomEvent('tpp:calendar-sync', { detail: { protocolUpdated: true } }));
            window.dispatchEvent(new CustomEvent('tpp:task-completion-changed', { detail: { protocolUpdated: true } }));
          } catch (e) {
            console.warn('Failed to save protocol draft:', e);
          }
          
          setEditing(null); 
        }}
        onDelete={(toDel) => {
          if (!toDel) return
          deleteProtocol(toDel.id);
          setEditing(null)
        }}
      />

      <ProtocolFollowUpModal
        open={!!followUpProtocol}
        onClose={handleFollowUpClose}
        protocol={followUpProtocol}
        historyEntryId={followUpHistoryId}
        theme={theme}
        onSave={handleFollowUpClose}
      />

      {/* Protocol Ended Confirmation Modal */}
      <ConfirmationModal
        open={showProtocolEndedConfirm}
        onClose={() => {
          setShowProtocolEndedConfirm(false);
          setEndedProtocolName(null);
        }}
        onConfirm={() => {
          setShowProtocolEndedConfirm(false);
          setEndedProtocolName(null);
        }}
        title="Protocol Ended"
        message={`${endedProtocolName || 'Protocol'} has been ended successfully.`}
        confirmText="OK"
        cancelText=""
        type="primary"
        theme={theme}
        hideIcon={true}
      />

      <ProtocolHistoryModal
        open={!!historyProtocol}
        onClose={() => setHistoryProtocol(null)}
        protocol={historyProtocol}
        theme={theme}
        onStartProtocol={handleStartClick}
        key={`${historyProtocol?.id}-${historyRefreshKey}`} // Force re-render when history is updated
      />

      <ProtocolHistoryDetailModal
        open={!!selectedHistoryEntry}
        onClose={() => setSelectedHistoryEntry(null)}
        historyEntry={selectedHistoryEntry}
        theme={theme}
        stockpile={stockpile}
      />

      {manageConfirm && manageConfirm.protocolName && (
        <BottomSheet
          open={true}
          onClose={() => {
            setManageConfirm(null);
            setHistoryProtocol(null); // Ensure history modal is also closed
          }}
          title={`Manage "${manageConfirm.protocolName}"`}
          theme={theme}
          maxHeight="90vh"
          footer={
            <div className="w-full flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => setManageConfirm(null)}
                    className="text-sm font-medium transition-opacity hover:opacity-70"
                    style={{ 
                        backgroundColor: theme.isDark ? '#374151' : '#f3f4f6',
                        color: theme.text,
                        padding: '10px 20px',
                        borderRadius: '8px',
                        border: 'none'
                    }}
                >
                    Cancel
                </button>
                <div className="flex-1" />
                <button
                    type="button"
                    onClick={() => {
                            if (manageConfirm) {
                                updateProtocol(manageConfirm);
                                
                                // Update history entry with current linkedItems (for complete data preservation)
                                try {
                                    const activeHistoryEntry = findActiveProtocolHistoryEntry(manageConfirm.id);
                                    if (activeHistoryEntry) {
                                        // Extract skipped reconstitution data from linkedItems
                                        const skippedReconstitution = {};
                                        const linkedItems = manageConfirm.linkedItems || {};
                                        Object.entries(linkedItems).forEach(([peptideId, item]) => {
                                            if (item.status === 'skipped' && item.deliveryMethod) {
                                                const peptide = manageConfirm.peptides?.find(p => (p.id || `peptide-${manageConfirm.peptides.indexOf(p)}`) === peptideId);
                                                skippedReconstitution[peptideId] = {
                                                    peptideName: peptide?.name || 'Unknown',
                                                    deliveryMethod: item.deliveryMethod
                                                };
                                            }
                                        });
                                        
                                        // Update history entry with complete linkedItems and skipped reconstitution
                                        const updatedProtocolData = {
                                            ...(activeHistoryEntry.protocolData || {}),
                                            linkedItems: linkedItems // Save complete linkedItems for reference
                                        };
                                        
                                        updateProtocolHistoryEntry(activeHistoryEntry.id, {
                                            protocolData: updatedProtocolData,
                                            skippedReconstitution: Object.keys(skippedReconstitution).length > 0 ? skippedReconstitution : null
                                        });
                                    }
                                } catch (e) {
                                    console.warn('Failed to update protocol history with linkedItems:', e);
                                }
                                
                                // Save to protocol draft for real-time sync with tasks/calendar
                                try {
                                    const draftKey = `tpprover_protocol_draft_${manageConfirm.id}`;
                                    localStorage.setItem(draftKey, JSON.stringify({
                                        data: manageConfirm,
                                        timestamp: new Date().toISOString()
                                    }));
                                    
                                    // Emit event so TasksWidget and Calendar pick up the changes immediately
                                    window.dispatchEvent(new CustomEvent('tpp:protocol-autosaved', {
                                        detail: { storageKey: draftKey, formData: manageConfirm }
                                    }));
                                } catch (e) {
                                    console.warn('Failed to save protocol draft:', e);
                                }
                                
                                window.dispatchEvent(new CustomEvent('tpp:toast', { 
                                    detail: { message: 'Protocol updated successfully!', type: 'success' } 
                                }));
                            }
                            setManageConfirm(null);
                            setHistoryProtocol(null); // Ensure history modal is also closed
                        }}
                    className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg active:scale-95 whitespace-nowrap min-w-fit"
                    style={{ 
                        background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryDark || theme.primary} 100%)`,
                        color: theme.textOnPrimary || '#ffffff',
                        border: 'none'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = theme.isDark ? '0 10px 25px rgba(0, 0, 0, 0.5)' : '0 10px 25px rgba(0, 0, 0, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = theme.isDark ? '0 4px 6px rgba(0, 0, 0, 0.3)' : '0 4px 6px rgba(0, 0, 0, 0.1)';
                    }}
                >
                    Save Changes
                </button>
            </div>
        }
        >
          <div className="space-y-4">
            {/* Action Bar - Quick Actions */}
            <div className="flex items-center gap-2 pb-3 border-b" style={{ borderColor: theme.border }}>
              <button
                onClick={() => {
                  setManageConfirm(null);
                  handleEditClick(manageConfirm);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 active:scale-95"
                style={{
                  backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  color: theme.text,
                  border: `1px solid ${theme.border}`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
                }}
              >
                <EditIcon size={16} />
                <span>Edit</span>
              </button>
              
              <button
                onClick={() => setIsNotesModalOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 active:scale-95"
                style={{
                  backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  color: theme.text,
                  border: `1px solid ${theme.border}`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
                }}
              >
                <NotebookPen size={16} />
                <span>Notes</span>
              </button>
              
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 active:scale-95"
                style={{
                  backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  color: theme.text,
                  border: `1px solid ${theme.border}`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
                }}
              >
                <Share2 size={16} />
                <span>Share</span>
              </button>
              
              <button
                onClick={() => {
                  setManageConfirm(null);
                  setHistoryProtocol(manageConfirm);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 active:scale-95"
                style={{
                  backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  color: theme.text,
                  border: `1px solid ${theme.border}`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
                }}
              >
                <History size={16} />
                <span>History</span>
              </button>
            </div>
            
            {/* PROTOCOL SETTINGS Section Header */}
            <div className="flex items-center gap-4 mb-3">
              <Settings size={32} style={{ color: theme.primary }} />
              <div className="flex flex-col gap-0.5">
                <h4 className="text-lg font-black tracking-wide" style={{ color: theme.text }}>Protocol Settings</h4>
                <div className="flex items-center gap-2 ml-1">
                  <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                    Schedule Configuration
                  </span>
                </div>
              </div>
            </div>

            <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: theme.text }}>
                    Start Date
                </label>
                <GlassmorphismDatePicker
                    value={manageConfirm?.startDate || ''}
                    onChange={(dateString) => setManageConfirm(p => ({...p, startDate: dateString}))}
                    theme={theme}
                    placeholder="Select start date"
                />
                <p className="text-xs mt-1" style={{ color: theme.textLight }}>Changing this will reschedule all calendar events for this protocol.</p>
            </div>

            {/* Edit Vials and Delivery Methods Section */}
            {manageConfirm?.active && manageConfirm?.linkedItems && (
                <>
                    <div className="flex items-center gap-4 mb-3 pt-1">
                      <TestTubes size={32} style={{ color: theme.primary }} />
                      <div className="flex flex-col gap-0.5">
                        <h4 className="text-lg font-black tracking-wide" style={{ color: theme.text }}>Vials & Delivery Methods</h4>
                        <div className="flex items-center gap-2 ml-1">
                          <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
                          <span className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                            Active Inventory
                          </span>
                        </div>
                      </div>
                    </div>

                    <EditActiveProtocolVials
                        protocol={manageConfirm}
                        stockpile={stockpile}
                        setStockpile={setStockpile}
                        theme={theme}
                        onUpdate={(updatedLinkedItems) => {
                            const previousLinkedItems = manageConfirm?.linkedItems || {};
                            setManageConfirm(p => {
                                const updated = { ...p, linkedItems: updatedLinkedItems };
                                
                                // Save vials added during active protocol to history
                                try {
                                    // Check if any new vials were added
                                    Object.entries(updatedLinkedItems).forEach(([peptideId, item]) => {
                                        const previousItem = previousLinkedItems[peptideId];
                                        // If a vial was just linked that wasn't linked before
                                        if (item.status === 'linked' && item.vialId && 
                                            (!previousItem || previousItem.status !== 'linked' || previousItem.vialId !== item.vialId)) {
                                            const vial = stockpile.find(v => v.id === item.vialId);
                                            if (vial) {
                                                addVialToActiveProtocol(p.id, {
                                                    vialId: vial.id,
                                                    stockpileId: vial.id,
                                                    name: vial.name,
                                                    mg: vial.mg,
                                                    vendor: vial.vendor,
                                                    cost: vial.cost || 0
                                                });
                                            }
                                        }
                                    });
                                } catch (e) {
                                    console.warn('Could not save vial to protocol history:', e);
                                }
                                
                                return updated;
                            });
                        }}
                    />
                </>
            )}

            {/* Page Break */}
            <div className="border-t" style={{ borderColor: theme.border }}></div>

            <div className="p-3 rounded-lg border" style={{ borderColor: '#fecaca', backgroundColor: '#fef2f2' }}>
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <div className="text-sm font-semibold mb-0.5" style={{ color: '#dc2626' }}>End protocol early?</div>
                        <div className="text-xs" style={{ color: '#991b1b' }}>Ends today and starts washout period if applicable.</div>
                    </div>
                    <button
                        className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90 active:scale-95 ml-3"
                        style={{ backgroundColor: '#ef4444', color: '#ffffff' }}
                        onClick={() => {
                            endProtocol(manageConfirm);
                            setManageConfirm(null);
                        }}
                    >
                        End Now
                    </button>
                </div>
            </div>
        </div>
        </BottomSheet>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (deleteConfirm) {
            deleteProtocol(deleteConfirm.id);
            setManageConfirm(null);
            setDeleteConfirm(null);
            window.dispatchEvent(new CustomEvent('tpp:toast', { 
              detail: { message: 'Protocol deleted successfully', type: 'success' } 
            }));
          }
        }}
        title="Delete Protocol?"
        message={`Are you sure you want to delete "${deleteConfirm?.protocolName || deleteConfirm?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="delete"
        theme={theme}
      />

      <StartProtocolWizard 
        open={!!startConfirm}
        onClose={() => setStartConfirm(null)}
        protocol={startConfirm}
        stockpile={stockpile}
        setStockpile={setStockpile}
        theme={theme}
        onStart={(finalizedProtocol) => {
            // Compute and persist explicit endDate based on duration/cycle for reliable calendar sync
            const computeEndDate = (p) => {
                try {
                    if (!p?.startDate) return null;
                    // CRITICAL: Use centralized date parsing
                    const start = parseDateString(p.startDate);
                    if (!start) return null;
                    const startNormalized = normalizeToMidnight(start);
                    let end = null;
                    // Prefer cycle if present
                    const cyclePeptide = p.peptides?.find(pep => pep.frequency?.type === 'cycle');
                    
                    // SPECIAL CASE: Ongoing cycles - calculate far-future endDate for scheduling
                    if (cyclePeptide && p.duration?.noEnd) {
                        const onDays = Number(cyclePeptide.frequency.onDays) || 0;
                        const offDays = Number(cyclePeptide.frequency.offDays) || 0;
                        if (onDays > 0) {
                            // For ongoing cycles, schedule 1 year ahead for calendar purposes
                            end = new Date(startNormalized);
                            end.setFullYear(end.getFullYear() + 1);
                        }
                    }
                    // Regular cycle with set duration
                    else if (cyclePeptide) {
                        const onDays = Number(cyclePeptide.frequency.onDays) || 0;
                        const offDays = Number(cyclePeptide.frequency.offDays) || 0;
                        if (onDays > 0 && p.duration && p.duration.count > 0 && p.duration.unit) {
                            const durationInDays = (() => {
                                const count = Number(p.duration.count);
                                const unit = String(p.duration.unit).toLowerCase();
                                if (unit.includes('day')) return count;
                                if (unit.includes('week')) return count * 7;
                                if (unit.includes('month')) return count * 30; // approx
                                return 0;
                            })();
                            const fullCycles = Math.floor(durationInDays / onDays);
                            const remainingOn = durationInDays % onDays;
                            let total = fullCycles * (onDays + offDays);
                            if (remainingOn > 0) total += remainingOn; else if (fullCycles > 0) total -= offDays;
                            end = new Date(startNormalized);
                            // For scheduling days inclusively, ensure exact number of ON days are counted
                            end.setDate(end.getDate() + total - 1);
                        }
                    }
                    if (!end && p.duration && !p.duration.noEnd && p.duration.count > 0 && p.duration.unit) {
                        end = new Date(startNormalized);
                        const unit = String(p.duration.unit).toLowerCase();
                        const count = Number(p.duration.count) || 0;
                        // Inclusive end: 5 days means start..start+4
                        if (unit.includes('day')) end.setDate(end.getDate() + count - 1);
                        else if (unit.includes('week')) end.setDate(end.getDate() + (count * 7) - 1);
                        else if (unit.includes('month')) { end.setMonth(end.getMonth() + count); end.setDate(end.getDate() - 1); }
                    }
                    return end ? getLocalDateString(end) : null;
                } catch { return null; }
            };

            const ensureTimes = (p) => ({
                ...p,
                peptides: (p.peptides || []).map(pep => {
                    const f = pep.frequency || {};
                    const time = Array.isArray(f.time) && f.time.length > 0 ? f.time : ['AM'];
                    return { ...pep, frequency: { ...f, time } };
                })
            });

            const withTimes = ensureTimes(finalizedProtocol);
            const explicitEnd = computeEndDate(withTimes);
            const toSave = explicitEnd ? { ...withTimes, endDate: explicitEnd } : withTimes;

            updateProtocol(toSave);

            // Save protocol history entry
            try {
                // Extract vial information from linkedItems and track skipped reconstitution
                const vials = [];
                const skippedReconstitution = {};
                const linkedItems = finalizedProtocol.linkedItems || {};
                Object.entries(linkedItems).forEach(([peptideId, item]) => {
                    if (item.status === 'skipped' && item.deliveryMethod) {
                        // Track skipped reconstitution with delivery method info
                        const peptide = finalizedProtocol.peptides?.find(p => (p.id || `peptide-${finalizedProtocol.peptides.indexOf(p)}`) === peptideId);
                        skippedReconstitution[peptideId] = {
                            peptideName: peptide?.name || 'Unknown',
                            deliveryMethod: item.deliveryMethod
                        };
                    } else if (item.status === 'linked' && item.vialId) {
                        const vial = stockpile.find(v => v.id === item.vialId);
                        if (vial) {
                            vials.push({
                                vialId: vial.id,
                                stockpileId: vial.id,
                                name: vial.name,
                                mg: vial.mg,
                                vendor: vial.vendor,
                                cost: vial.cost,
                                reconstitutionDate: null, // Will be set from recon data if available
                                deliveryMethod: item.deliveryMethod || null // Include delivery method if set
                            });
                        }
                    }
                });

                // Try to find the most recent reconstitution data for this protocol
                let reconstitutionData = null;
                try {
                    const reconItems = JSON.parse(localStorage.getItem('tpprover_recon_items') || '[]');
                    // Find recon items that match this protocol name
                    const matchingRecon = reconItems
                        .filter(item => item.name && item.name.includes(finalizedProtocol.protocolName))
                        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
                    
                    if (matchingRecon.length > 0) {
                        const latestRecon = matchingRecon[0];
                        reconstitutionData = {
                            date: latestRecon.date,
                            reconStrategy: latestRecon.reconStrategy,
                            peptides: latestRecon.peptides
                        };
                        
                        // Update vial reconstitution dates from recon data
                        if (latestRecon.peptides) {
                            latestRecon.peptides.forEach(reconPep => {
                                const vial = vials.find(v => v.vialId === reconPep.stockpileId || v.name === reconPep.name);
                                if (vial) {
                                    vial.reconstitutionDate = latestRecon.date;
                                }
                            });
                        }
                    }
                } catch (e) {
                    console.warn('Failed to load reconstitution data for history:', e);
                }

                // Save history entry with all linkedItems data for complete reference
                saveProtocolHistoryEntry({
                    protocolId: finalizedProtocol.id,
                    protocolName: finalizedProtocol.protocolName || 'Unnamed Protocol',
                    startDate: finalizedProtocol.startDate,
                    protocolData: {
                        protocolName: finalizedProtocol.protocolName,
                        peptides: finalizedProtocol.peptides,
                        duration: finalizedProtocol.duration,
                        purpose: finalizedProtocol.purpose,
                        linkedItems: finalizedProtocol.linkedItems || {} // Save complete linkedItems for reference
                    },
                    vials: vials,
                    reconstitutionData: reconstitutionData,
                    skippedReconstitution: Object.keys(skippedReconstitution).length > 0 ? skippedReconstitution : null
                });
            } catch (error) {
                console.error('Failed to save protocol history:', error);
            }

            // Trigger dashboard and calendar refresh
            window.dispatchEvent(new CustomEvent('tpp:calendar-sync', { detail: { protocolUpdated: true } }));
            window.dispatchEvent(new CustomEvent('tpp:task-completion-changed', { detail: { protocolStarted: true } }));

            // Close the modal after the update has been queued.
            setStartConfirm(null);
        }}
      />

      <UpgradeModal 
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        actionAttempted="modify protocols"
        theme={theme}
      />

      {/* Notes Modal for active protocols */}
      {manageConfirm && (
        <ProtocolNotesModal
          open={isNotesModalOpen}
          onClose={() => setIsNotesModalOpen(false)}
          protocol={manageConfirm}
          theme={theme}
        />
      )}

      {/* Share Modal */}
      {manageConfirm && (
        <ShareModal
          open={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          theme={theme}
          title="Protocol"
          shareUrl={`${window.location.origin}/rover/protocols/${manageConfirm.id}`}
          CardComponent={ProtocolCard}
          cardProps={{ item: manageConfirm, theme, isPublicView: true }}
          shareData={{ ...manageConfirm, type: 'protocol' }}
        />
      )}
    </>
  )
}

const formatFrequency = (freq) => {
  if (!freq) return 'Not set';
  const timeChoice = (() => {
    const times = freq.time || [];
    const hasAM = times.includes('AM');
    const hasPM = times.includes('PM');
    if (hasAM && hasPM) return 'AM/PM';
    if (hasAM) return 'AM';
    if (hasPM) return 'PM';
    return '';
  })();
  
  if (freq.type === 'cycle') {
    return `Cycle: ${freq.onDays || 0} on, ${freq.offDays || 0} off (${timeChoice})`;
  }
  return `Every ${freq.count || 1} ${String(freq.per || 'Day')}${freq.count > 1 ? 's' : ''} (${timeChoice})`;
};