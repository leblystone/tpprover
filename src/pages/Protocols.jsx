import React, { useEffect, useState, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import { themes, defaultThemeName } from '../theme/themes'
import { formatMMDDYYYY, getLocalDateString } from '../utils/date'
import Modal from '../components/common/Modal'
import TextInput from '../components/common/inputs/TextInput'
import ProtocolEditorModal from '../components/protocols/ProtocolEditorModal'
import { exportToCSV } from '../utils/export'
import { PlusCircle, Plus, FileText, Clock, ChevronDown, Pipette, Pen, Droplets, CheckCircle, Target, History } from 'lucide-react'
import SearchableDropdown from '../components/common/SearchableDropdown'
import VendorSuggestInput from '../components/vendors/VendorSuggestInput'
import ColorSwatchDropdown from '../components/common/inputs/ColorSwatchDropdown'
import GlassmorphismDatePicker from '../components/common/GlassmorphismDatePicker'
import { penColors } from '../utils/penColors'
import { formatCurrency } from '../utils/currencyUtils'
import ProtocolCard from '../components/protocols/ProtocolCard'
import ProtocolHistoryModal from '../components/protocols/ProtocolHistoryModal';
import StartProtocolWizard from '../components/protocols/StartProtocolWizard';
import ProtocolsHelpPanel from '../components/protocols/ProtocolsHelpPanel';
import EditActiveProtocolVials from '../components/protocols/EditActiveProtocolVials';
import { useAppContext } from '../context/AppContext';
import { generateId } from '../utils/string';
import { useSubscriptionAccess } from '../utils/useSubscriptionAccess';
import UpgradeModal from '../components/common/UpgradeModal';
import Tabs from '../components/common/Tabs';
import { saveProtocolHistoryEntry, updateProtocolHistoryEntry, findActiveProtocolHistoryEntry } from '../utils/protocolHistory';

export default function Protocols() {
  const { theme } = useOutletContext()
  const { protocols, setProtocols, addProtocol, updateProtocol, deleteProtocol, stockpile, setStockpile } = useAppContext();
  const { isReadOnly } = useSubscriptionAccess();
  const [activeTab, setActiveTab] = useState('protocols'); // 'protocols' | 'history'
  const [openAdd, setOpenAdd] = useState(false)
  const [editing, setEditing] = useState(null)
  const [startConfirm, setStartConfirm] = useState(null)
  const [historyProtocol, setHistoryProtocol] = useState(null);
  const [startDate, setStartDate] = useState(() => getLocalDateString())
  const [manageConfirm, setManageConfirm] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
      
      updateProtocolHistoryEntry(activeHistoryEntry.id, {
        endDate: today,
        completionStatus: completionStatus,
        endType: 'manual'
      });
    }
    
    window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Protocol has been ended.', type: 'success' } }));
  };

  // Check and auto-end protocols that have finished organically
  useEffect(() => {
    // Only run this check once per day to avoid excessive updates
    const checkKey = 'tpprover_last_auto_end_check';
    const lastCheck = localStorage.getItem(checkKey);
    const today = getLocalDateString();
    
    // Skip if we already checked today
    if (lastCheck === today) return;
    
    const todayOnly = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    let hasUpdates = false;
    
    protocols.forEach(p => {
      // Skip if already ended or doesn't have startDate
      if (p.active === false || p.endDate || !p.startDate) return;
      
      // Calculate expected end date
      let calculatedEndDate = null;
      const start = new Date(p.startDate);
      const startOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      
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
        }
      }
    });
    
    // Mark that we've checked today
    if (hasUpdates || !lastCheck) {
      localStorage.setItem(checkKey, today);
    }
  }, [protocols, updateProtocol]);

  const projectedDates = React.useMemo(() => {
    if (!startConfirm || !startDate) return { protocolStartDate: null, protocolEndDate: null, washoutStartDate: null, washoutEndDate: null };

    const { duration, washout, peptides } = startConfirm;
    const start = new Date(new Date(startDate).getTime() + new Date(startDate).getTimezoneOffset() * 60000);
    
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
            
            endDate = new Date(start);
            endDate.setDate(endDate.getDate() + totalDays -1);
        }
    }
    
    // Fallback to original duration logic if no cycle is found
    if (!endDate && duration && !duration.noEnd && duration.count > 0 && duration.unit) {
        endDate = new Date(start);
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
      protocolStartDate: formatMMDDYYYY(start),
      protocolEndDate: endDate ? formatMMDDYYYY(endDate) : 'Ongoing',
      washoutStartDate: washoutStartDate ? formatMMDDYYYY(washoutStartDate) : null,
      washoutEndDate: washoutEndDate ? formatMMDDYYYY(washoutEndDate) : null,
    };
}, [startConfirm, startDate]);

  const isActiveNow = React.useCallback((p) => {
    try {
      if (p?.active !== true) return false
      if (!p?.startDate) return false
      const today = new Date()
      const s = new Date(p.startDate)
      if (today < new Date(s.getFullYear(), s.getMonth(), s.getDate())) return false
      // explicit end date wins
      if (p.endDate) {
        const e = new Date(p.endDate)
        return today <= new Date(e.getFullYear(), e.getMonth(), e.getDate())
      }
      const d = p.duration || {}
      if (d.noEnd || !d.count || !d.unit) return true
      const e = new Date(s)
      if (String(d.unit).toLowerCase() === 'day') e.setDate(e.getDate() + Number(d.count))
      else if (String(d.unit).toLowerCase() === 'week') e.setDate(e.getDate() + Number(d.count) * 7)
      else if (String(d.unit).toLowerCase() === 'month') e.setMonth(e.getMonth() + Number(d.count))
      return today <= new Date(e.getFullYear(), e.getMonth(), e.getDate())
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

  const handleEditClick = (protocol) => {
    if (isReadOnly) {
      setShowUpgradeModal(true);
      return;
    }
    setEditing(protocol);
  };

  const handleStartClick = (protocol, opts) => {
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
  };

  // Allow deletion in read-only mode - users can manage their sensitive data
  const handleDeleteClick = (protocol) => {
    deleteProtocol(protocol.id);
  };

  // Set topbar tabs via custom event
  useEffect(() => {
    const tabs = [
      { value: 'protocols', label: 'Protocols' },
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
    const active = [];
    const inactive = [];

    filteredProtocols.forEach(p => {
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

  return (
    <>
      <ProtocolsHelpPanel theme={theme} />
      
      <div className="space-y-4">

        {/* Content based on active tab */}
        {activeTab === 'protocols' && (
          <div>
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
                {organizedProtocols.active.length > 0 && (
                  <div className="space-y-4">
                    <h2 
                      className="text-sm font-semibold uppercase tracking-wider px-1"
                      style={{ color: theme.textLight }}
                    >
                      Active Protocols
                    </h2>
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
                {organizedProtocols.inactive.length > 0 && (
                  <div className="space-y-4">
                    {organizedProtocols.active.length > 0 && (
                      <h2 
                        className="text-sm font-semibold uppercase tracking-wider px-1"
                        style={{ color: theme.textLight }}
                      >
                        Inactive Protocols
                      </h2>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="relative">
            {(() => {
              // Filter for finished protocols - must have BOTH startDate AND endDate
              const finishedProtocols = filteredProtocols.filter(p => {
                // Must have started (has startDate)
                if (!p.startDate) return false;
                
                // Must have ended (has endDate)
                if (!p.endDate) return false;
                
                // If active is explicitly false, it's finished
                if (p.active === false) return true;
                
                // If it has an endDate, check if it's in the past
                const today = new Date();
                const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                const endDate = new Date(p.endDate);
                const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
                
                // If end date is in the past, it's finished
                if (todayOnly > endDateOnly) return true;
                
                // If it has an endDate and active is not explicitly true, consider it finished
                if (p.active !== true) return true;
                
                return false;
              });

              if (finishedProtocols.length === 0) {
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

              // Sort by end date descending (most recent first), then by start date
              const sortedProtocols = [...finishedProtocols].sort((a, b) => {
                const aEnd = a.endDate ? new Date(a.endDate) : new Date(0);
                const bEnd = b.endDate ? new Date(b.endDate) : new Date(0);
                if (bEnd.getTime() !== aEnd.getTime()) {
                  return bEnd.getTime() - aEnd.getTime();
                }
                const aStart = a.startDate ? new Date(a.startDate) : new Date(0);
                const bStart = b.startDate ? new Date(b.startDate) : new Date(0);
                return bStart.getTime() - aStart.getTime();
              });

              // Group protocols by month/year and create timeline entries
              const timelineEntries = [];
              let currentMonthYear = null;
              
              sortedProtocols.forEach((p, index) => {
                if (!p.endDate) return;
                const endDate = new Date(p.endDate);
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
                
                // Add protocol entry
                const startDate = p.startDate ? new Date(p.startDate) : null;
                const endDateObj = p.endDate ? new Date(p.endDate) : null;
                let durationDays = 0;
                if (startDate && endDateObj) {
                  durationDays = Math.ceil((endDateObj - startDate) / (1000 * 60 * 60 * 24)) + 1;
                }
                
                timelineEntries.push({
                  type: 'protocol',
                  protocol: p,
                  durationDays,
                  startDate: startDate ? formatMMDDYYYY(p.startDate) : 'Not started',
                  endDate: endDateObj ? formatMMDDYYYY(p.endDate) : 'Ongoing'
                });
              });

              return (
                <div className="relative pl-8 md:pl-12">
                  {/* Vertical timeline line */}
                  <div 
                    className="absolute left-0 top-0 bottom-0 w-0.5"
                    style={{ 
                      backgroundColor: theme.border || (theme.isDark ? '#374151' : '#e5e7eb'),
                      marginLeft: '1.5rem',
                      zIndex: 1
                    }}
                  />

                  {/* Timeline entries */}
                  <div className="space-y-6">
                    {timelineEntries.map((entry, index) => {
                      if (entry.type === 'header') {
                        // Month/Year header
                        return (
                          <div key={entry.key} className="relative flex items-center">
                            {/* Timeline node for header */}
                            <div 
                              className="absolute left-0 w-4 h-4 rounded-full border-2 -ml-8 md:-ml-12 z-10"
                              style={{ 
                                backgroundColor: theme.cardBackground || theme.background,
                                borderColor: theme.primary,
                                marginLeft: '-1.5rem'
                              }}
                            />
                            
                            {/* Month/Year label */}
                            <h3 
                              className="text-lg font-bold uppercase tracking-wider pl-4"
                              style={{ color: theme.text }}
                            >
                              {entry.month} {entry.year}
                            </h3>
                          </div>
                        );
                      } else {
                        // Protocol entry
                        return (
                          <div key={entry.protocol.id} className="relative pl-4">
                            {/* Timeline node for protocol */}
                            <div 
                              className="absolute left-0 w-3 h-3 rounded-full -ml-8 md:-ml-12 z-10"
                              style={{ 
                                backgroundColor: theme.primary,
                                marginLeft: '-1.5rem',
                                marginTop: '0.5rem',
                                border: `2px solid ${theme.cardBackground || theme.background}`
                              }}
                            />
                            
                            {/* Protocol card */}
                            <button
                              onClick={() => setHistoryProtocol(entry.protocol)}
                              className="w-full text-left p-4 rounded-lg transition-all hover:opacity-90 hover:scale-[1.01] active:scale-[0.99]"
                              style={{ 
                                backgroundColor: theme.cardBackground || (theme.isDark ? '#1f2937' : '#ffffff'),
                                border: `1px solid ${theme.border || (theme.isDark ? '#374151' : '#e5e7eb')}`,
                                boxShadow: theme.isDark 
                                  ? '0 2px 4px rgba(0, 0, 0, 0.3)' 
                                  : '0 2px 4px rgba(0, 0, 0, 0.05)'
                              }}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="font-semibold text-base" style={{ color: theme.text }}>
                                      {entry.protocol.protocolName || entry.protocol.name || 'Unnamed Protocol'}
                                    </span>
                                    {entry.protocol.emoji && (
                                      <span className="text-lg">{entry.protocol.emoji}</span>
                                    )}
                                  </div>
                                  
                                  <div className="flex flex-wrap items-center gap-3 text-sm" style={{ color: theme.textLight }}>
                                    <span className="flex items-center gap-1">
                                      <Clock size={14} />
                                      {entry.startDate} → {entry.endDate}
                                    </span>
                                    {entry.durationDays > 0 && (
                                      <span>
                                        {entry.durationDays} day{entry.durationDays !== 1 ? 's' : ''}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Arrow indicator */}
                                <div className="flex-shrink-0 opacity-50">
                                  <ChevronDown 
                                    size={20} 
                                    className="transform rotate-[-90deg]"
                                    style={{ color: theme.textLight }}
                                  />
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
      </div>

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
                  const start = new Date(p.startDate);
                  let end = null;
                  const cyclePeptide = p.peptides?.find(pep => pep.frequency?.type === 'cycle');
                  if (cyclePeptide) {
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
                          end = new Date(start);
                          end.setDate(end.getDate() + total - 1);
                      }
                  }
                  if (!end && p.duration && !p.duration.noEnd && p.duration.count > 0 && p.duration.unit) {
                      end = new Date(start);
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

      <ProtocolHistoryModal
        open={!!historyProtocol}
        onClose={() => setHistoryProtocol(null)}
        protocol={historyProtocol}
        theme={theme}
      />

      {manageConfirm && manageConfirm.protocolName && (
        <Modal
          open={true}
          onClose={() => {
            setManageConfirm(null);
            setHistoryProtocol(null); // Ensure history modal is also closed
          }}
          title={`Manage "${manageConfirm.protocolName}"`}
          theme={theme}
          variant="modern"
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4">
            {/* PROTOCOL SETTINGS Section Header */}
            <div className="px-4 py-2.5 rounded-lg" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, borderLeft: `4px solid ${theme.primary}` }}>
                <h4 className="font-black text-sm tracking-wide uppercase" style={{ color: theme.isDark ? '#a8b5a0' : theme.primary }}>PROTOCOL SETTINGS</h4>
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
                    <div className="border-t" style={{ borderColor: theme.border }}></div>
                    
                    <div className="px-4 py-2.5 rounded-lg" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, borderLeft: `4px solid ${theme.primary}` }}>
                        <h4 className="font-black text-sm tracking-wide uppercase" style={{ color: theme.isDark ? '#a8b5a0' : theme.primary }}>VIALS & DELIVERY METHODS</h4>
                    </div>

                    <EditActiveProtocolVials
                        protocol={manageConfirm}
                        stockpile={stockpile}
                        setStockpile={setStockpile}
                        theme={theme}
                        onUpdate={(updatedLinkedItems) => {
                            setManageConfirm(p => ({ ...p, linkedItems: updatedLinkedItems }));
                        }}
                    />
                </>
            )}

            {/* Page Break */}
            <div className="border-t" style={{ borderColor: theme.border }}></div>

            <div className="p-3 rounded-lg border" style={{ borderColor: '#fecaca', backgroundColor: '#fef2f2' }}>
                <div className="flex flex-col items-center text-center">
                    <div className="text-sm font-medium mb-0.5" style={{ color: '#dc2626' }}>End Protocol Early</div>
                    <div className="text-xs mb-2" style={{ color: '#991b1b' }}>This will end the protocol as of today and start any washout period.</div>
                    <button
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90"
                        style={{ backgroundColor: '#ef4444', color: '#ffffff' }}
                        onClick={() => {
                            endProtocol(manageConfirm);
                            setManageConfirm(null);
                        }}
                    >
                        End Protocol Now
                    </button>
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="w-full flex items-center gap-3 pt-4 mt-6 border-t" style={{ borderColor: theme.border }}>
            <div className="flex items-center gap-2 flex-1 justify-end">
                <button
                    type="button"
                    onClick={() => setManageConfirm(null)}
                    className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md active:scale-95"
                    style={{ 
                        backgroundColor: theme.cardBackground,
                        color: theme.text,
                        border: `1px solid ${theme.border}`
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = theme.isDark ? '0 6px 12px rgba(0, 0, 0, 0.3)' : '0 6px 12px rgba(0, 0, 0, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = theme.isDark ? '0 2px 4px rgba(0, 0, 0, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.1)';
                    }}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={() => {
                        if (manageConfirm) {
                            updateProtocol(manageConfirm);
                            
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
                    className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg active:scale-95"
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
        </div>
        </Modal>
      )}

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
                    const start = new Date(p.startDate);
                    let end = null;
                    // Prefer cycle if present
                    const cyclePeptide = p.peptides?.find(pep => pep.frequency?.type === 'cycle');
                    if (cyclePeptide) {
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
                            end = new Date(start);
                            // For scheduling days inclusively, ensure exact number of ON days are counted
                            end.setDate(end.getDate() + total - 1);
                        }
                    }
                    if (!end && p.duration && !p.duration.noEnd && p.duration.count > 0 && p.duration.unit) {
                        end = new Date(start);
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
                // Extract vial information from linkedItems
                const vials = [];
                const linkedItems = finalizedProtocol.linkedItems || {};
                Object.entries(linkedItems).forEach(([peptideId, item]) => {
                    if (item.status === 'linked' && item.vialId) {
                        const vial = stockpile.find(v => v.id === item.vialId);
                        if (vial) {
                            vials.push({
                                vialId: vial.id,
                                stockpileId: vial.id,
                                name: vial.name,
                                mg: vial.mg,
                                vendor: vial.vendor,
                                cost: vial.cost,
                                reconstitutionDate: null // Will be set from recon data if available
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

                // Save history entry
                saveProtocolHistoryEntry({
                    protocolId: finalizedProtocol.id,
                    protocolName: finalizedProtocol.protocolName || 'Unnamed Protocol',
                    startDate: finalizedProtocol.startDate,
                    protocolData: {
                        protocolName: finalizedProtocol.protocolName,
                        peptides: finalizedProtocol.peptides,
                        duration: finalizedProtocol.duration,
                        purpose: finalizedProtocol.purpose
                    },
                    vials: vials,
                    reconstitutionData: reconstitutionData
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