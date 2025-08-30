import React, { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { themes, defaultThemeName } from '../theme/themes'
import { formatMMDDYYYY } from '../utils/date'
import Modal from '../components/common/Modal'
import TextInput from '../components/common/inputs/TextInput'
import ProtocolEditorModal from '../components/protocols/ProtocolEditorModal'
import { exportToCSV } from '../utils/export'
import { PlusCircle, FileUp } from 'lucide-react'
import ProtocolCard from '../components/protocols/ProtocolCard'
import ProtocolHistoryModal from '../components/protocols/ProtocolHistoryModal';
import StartProtocolWizard from '../components/protocols/StartProtocolWizard';
import { useAppContext } from '../context/AppContext';
import { generateId } from '../utils/string';

export default function Protocols() {
  const { theme } = useOutletContext()
  const { protocols, setProtocols, addProtocol, updateProtocol, deleteProtocol } = useAppContext();
  const [openAdd, setOpenAdd] = useState(false)
  const [editing, setEditing] = useState(null)
  const [startConfirm, setStartConfirm] = useState(null)
  const [historyProtocol, setHistoryProtocol] = useState(null);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0,10))
  const [showImportHint, setShowImportHint] = useState(() => { try { return localStorage.getItem('tpprover_protocols_import_hint') !== 'dismissed' } catch { return true } })
  const [stockpile, setStockpile] = useState([]);
  const [manageConfirm, setManageConfirm] = useState(null);

  const endProtocol = (protocolToEnd) => {
    const today = new Date().toISOString().slice(0, 10);
    const updatedProtocol = { ...protocolToEnd, active: false, endDate: today };
    updateProtocol(updatedProtocol);
    window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Protocol has been ended.', type: 'success' } }));
  };

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

  const isActiveNow = (p) => {
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
  }

  useEffect(() => {
    try { 
      const rawStockpile = localStorage.getItem('tpprover_stockpile');
      if (rawStockpile) setStockpile(JSON.parse(rawStockpile));
    } catch {}
  }, []);
  useEffect(() => {
    if (!showImportHint) return
    const t = setTimeout(() => setShowImportHint(false), 15000)
    return () => clearTimeout(t)
  }, [showImportHint])
  React.useEffect(() => {
    const onOpenNew = () => setOpenAdd(true)
    window.addEventListener('tpp:open_protocol_new', onOpenNew)
    return () => window.removeEventListener('tpp:open_protocol_new', onOpenNew)
  }, [])

  const fileInputRef = React.useRef(null)
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
          const times = timeVal.includes('AM') && timeVal.includes('PM') ? ['Morning','Evening'] : (timeVal.includes('PM') ? ['Evening'] : ['Morning'])
          const dCount = durCountIdx>=0 ? Number(cols[durCountIdx])||0 : 0
          const dUnit = durUnitIdx>=0 ? (cols[durUnitIdx]||'Week') : 'Week'
          const noEnd = noEndIdx>=0 ? /true|1|yes/i.test(cols[noEndIdx]) : false
          rows.push({ id: Date.now()+i, name, purpose, frequency: { count, per, time: times }, duration: { count: dCount, unit: dUnit, noEnd } })
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

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2">
          <div className="relative inline-block group">
            <button aria-label="Import Protocols" className="p-2 rounded-md border" title="Import protocols (CSV/JSON)" onClick={() => fileInputRef.current?.click()} style={{ borderColor: theme.border }}>
              <FileUp className="h-4 w-4" />
            </button>
            {showImportHint && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 rounded-md text-xs shadow-md border hidden group-hover:block" style={{ backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }}>
                Import protocols
                <button className="ml-2" aria-label="Dismiss" onClick={() => { setShowImportHint(false); try { localStorage.setItem('tpprover_protocols_import_hint', 'dismissed') } catch {} }}>×</button>
              </div>
            )}
          </div>
          <button className="px-3 py-2 rounded-md text-sm font-semibold" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }} onClick={() => setOpenAdd(true)}><PlusCircle className="h-4 w-4 inline mr-1"/>Add Protocol</button>
        </div>
      </div>
      <input ref={fileInputRef} type="file" accept=".csv,.json" className="hidden" onChange={onImportFile} />
      <div>
        {protocols.length === 0 ? (
          <p className="text-sm" style={{ color: theme.textLight }}>No protocols yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {protocols.map(p => (
            <ProtocolCard 
              key={p.id}
              item={p}
              theme={theme}
              isActive={p.active === true || isActiveNow(p)}
              onStartClick={(protocol, opts) => {
                if (opts?.manage) {
                  setManageConfirm(protocol);
                } else {
                  setStartConfirm(protocol);
                  setStartDate(protocol.startDate || new Date().toISOString().slice(0,10));
                }
              }}
              onEditClick={setEditing}
              onHistoryClick={setHistoryProtocol}
            />
          ))}
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
          const cleaned = { id: generateId(), ...data, active: false, startDate: data.startDate || '' }
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
                  return end ? end.toISOString().slice(0,10) : p.endDate || null;
              } catch { return p.endDate || null; }
          };

          const newEndDate = computeEndDate(updatedProtocol);
          const finalProtocol = { ...updatedProtocol, endDate: newEndDate };

          updateProtocol(finalProtocol);
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

      <Modal
        open={!!manageConfirm}
        onClose={() => setManageConfirm(null)}
        title={`Manage "${manageConfirm?.protocolName || 'Protocol'}"`}
        theme={theme}
    >
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium" style={{ color: theme.text }}>
                    Start Date
                    <input 
                        type="date" 
                        className="mt-1 p-2 rounded border w-full bg-gray-50" 
                        value={manageConfirm?.startDate || ''} 
                        onChange={e => setManageConfirm(p => ({...p, startDate: e.target.value}))}
                        style={{ borderColor: theme.border }} 
                    />
                </label>
                <p className="text-xs text-gray-500 mt-1">Changing this will reschedule all calendar events for this protocol.</p>
            </div>
            <div className="pt-4 border-t" style={{ borderColor: theme.border }}>
                 <button
                    className="w-full text-left px-3 py-2 rounded-md text-sm text-red-700 bg-red-50 hover:bg-red-100"
                    onClick={() => {
                        endProtocol(manageConfirm);
                        setManageConfirm(null);
                    }}
                >
                    End Protocol Early
                </button>
                <p className="text-xs text-gray-500 mt-1">This will end the protocol as of today and start any washout period.</p>
            </div>
        </div>
         <div className="mt-6 flex justify-end gap-2">
            <button className="px-3 py-2 rounded-md border" style={{ borderColor: theme.border }} onClick={() => setManageConfirm(null)}>Cancel</button>
            <button
                className="px-3 py-2 rounded-md"
                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                onClick={() => {
                    updateProtocol(manageConfirm);
                    setManageConfirm(null);
                }}
            >
                Save Changes
            </button>
        </div>
    </Modal>

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
                    return end ? end.toISOString().slice(0,10) : null;
                } catch { return null; }
            };

            const ensureTimes = (p) => ({
                ...p,
                peptides: (p.peptides || []).map(pep => {
                    const f = pep.frequency || {};
                    const time = Array.isArray(f.time) && f.time.length > 0 ? f.time : ['Morning'];
                    return { ...pep, frequency: { ...f, time } };
                })
            });

            const withTimes = ensureTimes(finalizedProtocol);
            const explicitEnd = computeEndDate(withTimes);
            const toSave = explicitEnd ? { ...withTimes, endDate: explicitEnd } : withTimes;

            updateProtocol(toSave);

            // Close the modal after the update has been queued.
            setStartConfirm(null);
        }}
      />
    </section>
  )
}

const formatFrequency = (freq) => {
  if (!freq) return 'Not set';
  const timeChoice = (() => {
    const times = freq.time || [];
    const hasMorning = times.includes('Morning');
    const hasEvening = times.includes('Evening');
    if (hasMorning && hasEvening) return 'AM/PM';
    if (hasMorning) return 'AM';
    if (hasEvening) return 'PM';
    return '';
  })();
  
  if (freq.type === 'cycle') {
    return `Cycle: ${freq.onDays || 0} on, ${freq.offDays || 0} off (${timeChoice})`;
  }
  return `Every ${freq.count || 1} ${String(freq.per || 'Day')}${freq.count > 1 ? 's' : ''} (${timeChoice})`;
};