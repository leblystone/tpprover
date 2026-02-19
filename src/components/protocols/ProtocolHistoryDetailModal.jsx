import React, { useState, useMemo } from 'react';
import BottomSheet from '../common/BottomSheet';
import { formatMMDDYYYY } from '../../utils/date';
import { Package, Calendar, CalendarCheck, CalendarX, Clock, DollarSign, FlaskConical, Trash2, FileText, Filter, Edit3, Star, RotateCcw, CheckCircle2, AlertCircle, Pill, Link2, Truck, Store, Droplets, Play, Plus, StickyNote, ClipboardCheck, CircleDot } from 'lucide-react';
import { deleteProtocolHistoryEntry, restoreProtocolHistoryEntry, getProtocolHistory } from '../../utils/protocolHistory';
import ProtocolFollowUpModal from './ProtocolFollowUpModal';
import CustomDropdown from '../common/inputs/CustomDropdown';

export default function ProtocolHistoryDetailModal({ open, onClose, historyEntry, theme, stockpile, onRestore, onEdit, protocols }) {
    const [showFollowUpModal, setShowFollowUpModal] = useState(false);
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [protocol, setProtocol] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [noteFilter, setNoteFilter] = useState('during');
    
    React.useEffect(() => {
        const handleHistoryUpdate = () => {
            setRefreshKey(prev => prev + 1);
        };
        window.addEventListener('tpp:protocol-history-updated', handleHistoryUpdate);
        return () => window.removeEventListener('tpp:protocol-history-updated', handleHistoryUpdate);
    }, []);
    
    const currentHistoryEntry = React.useMemo(() => {
        if (!historyEntry?.id) return historyEntry;
        try {
            const allHistory = getProtocolHistory();
            return allHistory.find(e => e.id === historyEntry.id) || historyEntry;
        } catch {
            return historyEntry;
        }
    }, [historyEntry, refreshKey]);
    
    React.useEffect(() => {
        if (currentHistoryEntry?.protocolId) {
            try {
                const allProtocols = protocols || JSON.parse(localStorage.getItem('tpprover_protocols') || '[]');
                const foundProtocol = allProtocols.find(p => p.id === currentHistoryEntry.protocolId);
                setProtocol(foundProtocol || { id: currentHistoryEntry.protocolId, protocolName: currentHistoryEntry.protocolName || 'Unnamed Protocol' });
            } catch (e) {
                setProtocol({ id: currentHistoryEntry.protocolId, protocolName: currentHistoryEntry.protocolName || 'Unnamed Protocol' });
            }
        }
    }, [currentHistoryEntry, protocols]);
    
    const followUpNote = useMemo(() => {
        if (!currentHistoryEntry || !Array.isArray(currentHistoryEntry.notes)) return null;
        return currentHistoryEntry.notes.find(n => n.type === 'follow_up');
    }, [currentHistoryEntry?.notes, refreshKey]);
    
    const filteredNotes = useMemo(() => {
        if (!currentHistoryEntry || !Array.isArray(currentHistoryEntry.notes)) return [];
        if (noteFilter === 'all') return currentHistoryEntry.notes;
        return currentHistoryEntry.notes.filter(note => note.type === noteFilter);
    }, [currentHistoryEntry?.notes, noteFilter]);

    const canRestore = useMemo(() => {
        if (!currentHistoryEntry?.endDate || !currentHistoryEntry?.protocolId) return false;
        const allProtocols = protocols || [];
        return allProtocols.some(p => p.id === currentHistoryEntry.protocolId);
    }, [currentHistoryEntry, protocols]);

    const timelineEvents = useMemo(() => {
        if (!currentHistoryEntry) return [];
        const ev = [];
        const he = currentHistoryEntry;
        const lin = he.lineage || {};

        if (he.startDate) {
            ev.push({ date: he.startDate, sort: 0, type: 'start', icon: Play, color: '#10b981', label: 'Protocol started' });
        }

        if (he.vials?.length > 0) {
            he.vials.forEach((v, i) => {
                const pepLin = Object.values(lin).find(l => l.vial?.stockpileId === v.vialId || l.vial?.stockpileId === v.stockpileId);
                const vendor = pepLin?.vendor?.name || pepLin?.vial?.vendor || v.vendor;
                const mg = pepLin?.vial?.mg || v.mg;
                ev.push({
                    date: he.startDate,
                    sort: 1 + i,
                    type: 'link',
                    icon: Link2,
                    color: '#6366f1',
                    label: `Linked ${mg ? mg + 'mg ' : ''}${v.name || 'peptide'}${vendor ? ' from ' + vendor : ''}`
                });
            });
        }

        if (Object.keys(lin).length > 0) {
            Object.values(lin).forEach(l => {
                if (l.recon?.date) {
                    const water = l.recon.water ? `${l.recon.water}mL BAC` : '';
                    ev.push({
                        date: l.recon.date,
                        sort: 0,
                        type: 'recon',
                        icon: Droplets,
                        color: '#0ea5e9',
                        label: `Reconstituted ${l.peptideName || 'peptide'}${water ? ' — ' + water : ''}`
                    });
                }
            });
        }

        const allLinked = he.protocolData?.linkedItems || {};
        Object.values(allLinked).forEach(item => {
            if (item.vialHistory?.length > 0) {
                item.vialHistory.forEach(hv => {
                    if (hv.usedAt) {
                        ev.push({
                            date: hv.usedAt,
                            sort: 3,
                            type: 'vial_finished',
                            icon: CircleDot,
                            color: '#f97316',
                            label: `Finished ${hv.mg ? hv.mg + 'mg ' : ''}${hv.name || 'vial'}${hv.vendor ? ' from ' + hv.vendor : ''}`
                        });
                    }
                });
            }
        });

        if (he.vialsAddedDuring?.length > 0) {
            he.vialsAddedDuring.forEach(v => {
                ev.push({
                    date: v.addedDate || he.endDate || he.startDate,
                    sort: 0,
                    type: 'add_vial',
                    icon: Plus,
                    color: '#8b5cf6',
                    label: `Added ${v.mg ? v.mg + 'mg ' : ''}${v.name || 'peptide'}${v.vendor ? ' from ' + v.vendor : ''}`
                });
            });
        }

        if (he.notes?.length > 0) {
            he.notes.forEach(n => {
                const snippet = n.content ? (n.content.length > 35 ? '"' + n.content.slice(0, 35) + '..."' : '"' + n.content + '"') : '';
                if (n.type === 'follow_up') {
                    ev.push({
                        date: n.createdAt || n.linkedDate || he.endDate,
                        sort: 10,
                        type: 'follow_up',
                        icon: Star,
                        color: '#f59e0b',
                        label: `Follow-up assessment added${snippet ? ' ' + snippet : ''}`
                    });
                } else {
                    ev.push({
                        date: n.createdAt || n.linkedDate,
                        sort: 0,
                        type: 'note',
                        icon: StickyNote,
                        color: '#a78bfa',
                        label: `Added note${snippet ? ' ' + snippet : ''}`
                    });
                }
            });
        }

        if (he.endDate) {
            const endLabel = he.endType === 'completed' ? 'Protocol completed' : he.endType === 'manual' ? 'Protocol manually ended' : 'Protocol ended';
            ev.push({ date: he.endDate, sort: 5, type: 'end', icon: CalendarX, color: '#ef4444', label: endLabel });
        }

        if (he.vialAssessment && Object.keys(he.vialAssessment).length > 0) {
            const count = Object.keys(he.vialAssessment).length;
            ev.push({
                date: he.endDate || he.startDate,
                sort: 6,
                type: 'assessment',
                icon: ClipboardCheck,
                color: '#10b981',
                label: `Vial assessment completed (${count} vial${count !== 1 ? 's' : ''})`
            });
        }

        ev.sort((a, b) => {
            const da = new Date(a.date || 0);
            const db = new Date(b.date || 0);
            if (da.getTime() !== db.getTime()) return da - db;
            return (a.sort || 0) - (b.sort || 0);
        });

        return ev;
    }, [currentHistoryEntry]);
    
    if (!open || !currentHistoryEntry) return null;
    
    const terracottaGradient = 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)';
    const terracottaHoverGradient = 'linear-gradient(135deg, #b5684a 0%, #a35a3f 100%)';
    
    const handleEditFollowUp = () => {
        if (followUpNote) {
            setEditingNoteId(followUpNote.id);
        }
        setShowFollowUpModal(true);
    };
    
    const handleFollowUpClose = () => {
        setShowFollowUpModal(false);
        setEditingNoteId(null);
        window.dispatchEvent(new CustomEvent('tpp:protocol-history-updated'));
    };
    
    const handleDelete = () => {
        if (window.confirm('Are you sure you want to delete this history entry? This action cannot be undone.')) {
            if (deleteProtocolHistoryEntry(currentHistoryEntry.id)) {
                window.dispatchEvent(new CustomEvent('tpp:toast', { 
                    detail: { message: 'History entry deleted successfully.', type: 'success' } 
                }));
                window.dispatchEvent(new CustomEvent('tpp:protocol-history-updated'));
                onClose();
            } else {
                window.dispatchEvent(new CustomEvent('tpp:toast', { 
                    detail: { message: 'Failed to delete history entry.', type: 'error' } 
                }));
            }
        }
    };

    const handleRestore = () => {
        if (!window.confirm('Restore this protocol? It will become active again.')) return;
        
        const restored = restoreProtocolHistoryEntry(currentHistoryEntry.id);
        if (restored) {
            if (onRestore) {
                onRestore(currentHistoryEntry.protocolId, restored);
            }
            window.dispatchEvent(new CustomEvent('tpp:toast', { 
                detail: { message: 'Protocol restored and reactivated!', type: 'success' } 
            }));
            window.dispatchEvent(new CustomEvent('tpp:protocol-history-updated'));
            onClose();
        } else {
            window.dispatchEvent(new CustomEvent('tpp:toast', { 
                detail: { message: 'Failed to restore protocol.', type: 'error' } 
            }));
        }
    };

    const handleEdit = () => {
        if (onEdit && protocol) {
            onEdit(protocol);
            onClose();
        }
    };

    const { protocolData, startDate, endDate, completionStatus, vials, reconstitutionData, skippedReconstitution, vialsAddedDuring, notes, vialAssessment, endType, lineage } = currentHistoryEntry;

    const linkedItems = protocolData?.linkedItems || {};

    const getStatusInfo = () => {
        switch (completionStatus) {
            case 'completed':
                return { icon: CalendarCheck, color: '#10b981', label: 'Completed on Time', bgColor: theme.isDark ? '#3c4e3a' : '#607c5c', textColor: '#dcfce7' };
            case 'ended_early':
                return { icon: CalendarX, color: '#ef4444', label: 'Ended Early', bgColor: theme.isDark ? '#6D2B2C' : '#A14D4D', textColor: '#fee2e2' };
            case 'rescheduled':
                return { icon: Clock, color: '#f59e0b', label: 'Rescheduled', bgColor: theme.isDark ? '#78350f' : '#fef3c7', textColor: theme.isDark ? '#fcd34d' : '#92400e' };
            default:
                return { icon: Clock, color: theme.textLight, label: 'Unknown', bgColor: theme.secondary, textColor: theme.textLight };
        }
    };

    const getEndTypeLabel = () => {
        switch (endType) {
            case 'completed': return 'Auto-Completed';
            case 'manual': return 'Manually Ended';
            default: return null;
        }
    };

    const statusInfo = getStatusInfo();
    const StatusIcon = statusInfo.icon;
    const endTypeLabel = getEndTypeLabel();

    const getDuration = () => {
        if (!startDate) return 'N/A';
        if (!endDate) return 'Ongoing';
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    };

    const formatDeliveryMethod = (dm) => {
        if (!dm) return null;
        const method = dm.deliveryMethod === 'pipette' ? 'Syringe' :
                       dm.deliveryMethod === 'pen' ? 'Pen' :
                       dm.deliveryMethod === 'nasal' ? 'Nasal' :
                       dm.deliveryMethod || 'Not specified';
        return method;
    };

    const StatusBadge = ({ info, endLabel }) => (
        <div className="flex items-center gap-2 flex-wrap">
            <div
                className="px-2.5 py-1 rounded-lg flex items-center gap-1.5"
                style={{
                    backgroundColor: info.bgColor,
                    color: info.textColor,
                    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.15), inset 0 1px 2px rgba(0, 0, 0, 0.1)'
                }}
            >
                <StatusIcon size={14} />
                <span className="font-medium text-xs">{info.label}</span>
            </div>
            {endLabel && (
                <div
                    className="px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider"
                    style={{
                        backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                        color: theme.textLight
                    }}
                >
                    {endLabel}
                </div>
            )}
        </div>
    );

    const footerContent = (
        <div className="flex items-center justify-between w-full">
            <button
                onClick={handleDelete}
                className="p-2 rounded-lg transition-all active:scale-95 flex items-center gap-1.5 text-xs font-medium"
                style={{ 
                    background: terracottaGradient,
                    color: '#ffffff',
                    border: 'none',
                    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.15), inset 0 1px 2px rgba(0, 0, 0, 0.1), 0 2px 6px rgba(0, 0, 0, 0.10)'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = terracottaHoverGradient; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = terracottaGradient; }}
            >
                <Trash2 size={14} />
                Delete
            </button>
            <div className="flex items-center gap-2">
                {onEdit && protocol && (
                    <button
                        onClick={handleEdit}
                        className="px-3 py-2 rounded-lg text-xs font-semibold transition-all active:scale-95 flex items-center gap-1.5"
                        style={{ 
                            backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                            color: theme.text,
                            border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`
                        }}
                    >
                        <Edit3 size={14} />
                        Edit Protocol
                    </button>
                )}
                {canRestore && onRestore && (
                    <button
                        onClick={handleRestore}
                        className="px-3 py-2 rounded-lg text-xs font-semibold transition-all active:scale-95 flex items-center gap-1.5 btn-primary-inset"
                        style={{ 
                            backgroundColor: theme.primary,
                            color: theme.textOnPrimary
                        }}
                    >
                        <RotateCcw size={14} />
                        Restore Protocol
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <BottomSheet
            open={open}
            onClose={onClose}
            onBack={onClose}
            title={`Protocol Details - ${formatMMDDYYYY(startDate)}`}
            theme={theme}
            maxHeight="90vh"
            footer={footerContent}
        >
            <div className="space-y-6">
                {/* Timeline / Date Range - kept compact */}
                <div className="md:hidden">
                    <div className="p-3 rounded-lg content-section">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Calendar size={16} style={{ color: theme.primary }} />
                                <span className="text-xs font-medium uppercase tracking-wider" style={{ color: theme.textLight }}>Date Range</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Clock size={14} style={{ color: theme.primary }} />
                                <span className="text-xs font-medium" style={{ color: theme.textLight }}>Duration:</span>
                                <span className="text-sm font-semibold" style={{ color: theme.text }}>{getDuration()}</span>
                            </div>
                        </div>
                        <div className="mb-3">
                            <div className="flex items-center gap-3">
                                <div className="text-sm font-semibold" style={{ color: theme.text }}>{formatMMDDYYYY(startDate)}</div>
                                {endDate && (
                                    <>
                                        <div className="flex-1 h-px" style={{ backgroundColor: theme.border }}></div>
                                        <div className="text-sm font-semibold" style={{ color: theme.text }}>{formatMMDDYYYY(endDate)}</div>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center justify-center mt-2 pt-2" style={{ borderTop: `1px solid ${theme.border}` }}>
                            <StatusBadge info={statusInfo} endLabel={endTypeLabel} />
                        </div>
                    </div>
                </div>
                <div className="hidden md:grid grid-cols-3 gap-4">
                    <div className="p-3 rounded-lg content-section">
                        <div className="flex items-center gap-2 mb-1.5">
                            <Calendar size={16} style={{ color: theme.primary }} />
                            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: theme.textLight }}>Start Date</span>
                        </div>
                        <div className="text-sm font-semibold" style={{ color: theme.text }}>{formatMMDDYYYY(startDate)}</div>
                    </div>
                    {endDate && (
                        <div className="p-4 rounded-lg content-section">
                            <div className="flex items-center gap-2 mb-1.5">
                                <Calendar size={16} style={{ color: theme.primary }} />
                                <span className="text-xs font-medium uppercase tracking-wider" style={{ color: theme.textLight }}>End Date</span>
                            </div>
                            <div className="text-sm font-semibold" style={{ color: theme.text }}>{formatMMDDYYYY(endDate)}</div>
                        </div>
                    )}
                    <div className="p-3 rounded-lg content-section">
                        <div className="flex items-center gap-2 mb-1.5">
                            <Clock size={16} style={{ color: theme.primary }} />
                            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: theme.textLight }}>Duration</span>
                        </div>
                        <div className="text-sm font-semibold mb-2" style={{ color: theme.text }}>{getDuration()}</div>
                        <div className="flex items-center justify-end mt-1.5 pt-1.5" style={{ borderTop: `1px solid ${theme.border}` }}>
                            <StatusBadge info={statusInfo} endLabel={endTypeLabel} />
                        </div>
                    </div>
                </div>

                {/* ─── ACTIVITY TIMELINE ─── */}
                {timelineEvents.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2.5 mb-3">
                            <Clock size={26} style={{ color: theme.primary }} />
                            <div className="flex flex-col gap-0.5">
                                <h4 className="text-base font-semibold tracking-wide" style={{ color: theme.text }}>Activity Timeline</h4>
                                <div className="flex items-center gap-2 ml-0.5">
                                    <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
                                    <span className="text-[10px] font-medium uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>Protocol Lifecycle</span>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 rounded-lg content-section">
                            <div className="relative">
                                <div
                                    className="absolute left-[9px] top-2 bottom-2 w-px"
                                    style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
                                />
                                <div className="space-y-0">
                                    {timelineEvents.map((ev, idx) => {
                                        const Icon = ev.icon;
                                        const isLast = idx === timelineEvents.length - 1;
                                        return (
                                            <div key={idx} className={`relative flex items-start gap-3 ${isLast ? '' : 'pb-3'}`}>
                                                <div
                                                    className="relative z-10 flex-shrink-0 w-[20px] h-[20px] rounded-full flex items-center justify-center"
                                                    style={{
                                                        backgroundColor: ev.color + '20',
                                                        border: `1.5px solid ${ev.color}50`
                                                    }}
                                                >
                                                    <Icon size={10} style={{ color: ev.color }} />
                                                </div>
                                                <div className="flex-1 min-w-0 pt-px">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <span className="text-xs leading-snug" style={{ color: theme.text }}>{ev.label}</span>
                                                        {ev.date && (
                                                            <span className="text-[10px] flex-shrink-0 tabular-nums" style={{ color: theme.textLight }}>
                                                                {formatMMDDYYYY(ev.date)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── PROTOCOL INFO ─── */}
                {protocolData && (
                    <div>
                        <div className="flex items-center gap-2.5 mb-3">
                            <FlaskConical size={26} style={{ color: theme.primary }} />
                            <div className="flex flex-col gap-0.5">
                                <h4 className="text-base font-semibold tracking-wide" style={{ color: theme.text }}>Protocol Info</h4>
                                <div className="flex items-center gap-2 ml-0.5">
                                    <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
                                    <span className="text-[10px] font-medium uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>Name & Purpose</span>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 rounded-lg content-section space-y-3">
                            {protocolData.protocolName && (
                                <div className="text-sm font-semibold" style={{ color: theme.text }}>{protocolData.protocolName}</div>
                            )}
                            {protocolData.purpose && (
                                <div className="text-xs" style={{ color: theme.textLight }}>{protocolData.purpose}</div>
                            )}
                            <div className="flex flex-wrap gap-x-6 gap-y-2">
                                {protocolData.duration && !protocolData.duration.noEnd && (
                                    <div>
                                        <div className="text-[10px] font-medium uppercase tracking-wider mb-0.5" style={{ color: theme.textLight }}>Planned</div>
                                        <div className="text-sm font-semibold" style={{ color: theme.text }}>{protocolData.duration.count} {protocolData.duration.unit}</div>
                                    </div>
                                )}
                                {protocolData.peptides && protocolData.peptides.length > 0 && (
                                    <div>
                                        <div className="text-[10px] font-medium uppercase tracking-wider mb-0.5" style={{ color: theme.textLight }}>Peptides</div>
                                        <div className="text-sm font-semibold" style={{ color: theme.text }}>{protocolData.peptides.length}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── PEPTIDES — DOSAGE & SCHEDULE ─── */}
                {protocolData?.peptides && protocolData.peptides.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2.5 mb-3">
                            <Pill size={26} style={{ color: theme.primary }} />
                            <div className="flex flex-col gap-0.5">
                                <h4 className="text-base font-semibold tracking-wide" style={{ color: theme.text }}>Peptide(s)</h4>
                                <div className="flex items-center gap-2 ml-0.5">
                                    <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
                                    <span className="text-[10px] font-medium uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>Dosage & Schedule</span>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {protocolData.peptides.map((pep, idx) => {
                                const formatFrequency = (freq) => {
                                    if (!freq) return null;
                                    if (typeof freq === 'string') return freq;
                                    const parts = [];
                                    if (freq.type) parts.push(freq.type.replace(/_/g, ' '));
                                    if (freq.days && Array.isArray(freq.days) && freq.days.length > 0) parts.push(freq.days.join(', '));
                                    if (freq.onDays && freq.offDays) parts.push(`${freq.onDays} on / ${freq.offDays} off`);
                                    if (freq.time && typeof freq.time === 'string') parts.push(freq.time);
                                    return parts.length > 0 ? parts.join(' - ') : freq.type || 'Custom';
                                };
                                const formatTime = (t) => {
                                    if (!t) return null;
                                    if (typeof t === 'string') return t;
                                    if (typeof t === 'object') return JSON.stringify(t);
                                    return String(t);
                                };
                                const freqLabel = formatFrequency(pep.frequency);
                                const doseLabel = pep.dosage ? `${pep.dosage.amount} ${pep.dosage.unit}` : null;
                                const subtitle = [doseLabel, freqLabel].filter(Boolean).join(' · ');

                                return (
                                    <div key={idx} className="p-3 rounded-lg content-section">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="font-medium text-sm" style={{ color: theme.text }}>{pep.name || 'Unnamed'}</div>
                                            {doseLabel && (
                                                <div className="px-2 py-0.5 rounded-md text-[10px] font-semibold" style={{ backgroundColor: theme.primary + '15', color: theme.primary }}>
                                                    {doseLabel}
                                                </div>
                                            )}
                                        </div>
                                        {subtitle && (
                                            <div className="text-xs mb-1" style={{ color: theme.textLight }}>{subtitle}</div>
                                        )}
                                        {(pep.count || pep.per || pep.time || pep.schedule) && (
                                            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs mt-1" style={{ color: theme.textLight }}>
                                                {(pep.count || pep.per) && (
                                                    <span>{pep.count || ''}{pep.per ? `x per ${pep.per}` : ''}</span>
                                                )}
                                                {pep.time && <span>{formatTime(pep.time)}</span>}
                                                {pep.schedule && Array.isArray(pep.schedule) && (
                                                    <span>{pep.schedule.join(', ')}</span>
                                                )}
                                                {pep.schedule && typeof pep.schedule === 'string' && (
                                                    <span>{pep.schedule}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ─── VIALS ─── */}
                {((vials && vials.length > 0) || (vialsAddedDuring && vialsAddedDuring.length > 0)) && (
                    <div>
                        <div className="flex items-center gap-2.5 mb-3">
                            <Package size={26} style={{ color: theme.primary }} />
                            <div className="flex flex-col gap-0.5">
                                <h4 className="text-base font-semibold tracking-wide" style={{ color: theme.text }}>Vials</h4>
                                <div className="flex items-center gap-2 ml-0.5">
                                    <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
                                    <span className="text-[10px] font-medium uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>Stockpile & Assessment</span>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {vials && vials.length > 0 && vials.map((vial, index) => {
                                const stockpileItem = stockpile?.find(s => s.id === vial.vialId || s.id === vial.stockpileId);
                                const assessment = vialAssessment?.[vial.vialId];
                                const pepLineage = lineage ? Object.values(lineage).find(l => l.vial?.stockpileId === vial.vialId || l.vial?.stockpileId === vial.stockpileId) : null;
                                const orderInfo = pepLineage?.order;
                                const vendorInfo = pepLineage?.vendor || (pepLineage?.vial ? { name: pepLineage.vial.vendor } : null);
                                return (
                                    <div key={`v-${index}`} className="p-3 rounded-lg content-section">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <div className="font-medium text-sm" style={{ color: theme.text }}>
                                                {vial.name || stockpileItem?.name || 'Unknown Peptide'}
                                            </div>
                                            {assessment && (
                                                <div
                                                    className="px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1"
                                                    style={{
                                                        backgroundColor: assessment.status === 'fully_used'
                                                            ? (theme.isDark ? '#22543d' : '#d1fae5')
                                                            : (theme.isDark ? '#78350f' : '#fef3c7'),
                                                        color: assessment.status === 'fully_used'
                                                            ? (theme.isDark ? '#86efac' : '#065f46')
                                                            : (theme.isDark ? '#fcd34d' : '#92400e'),
                                                        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)'
                                                    }}
                                                >
                                                    {assessment.status === 'fully_used' ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                                                    {assessment.status === 'fully_used' ? 'Used' : 'Leftover'}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-3 text-xs" style={{ color: theme.textLight }}>
                                            {(pepLineage?.vial?.mg || vial.mg) && <span className="flex items-center gap-1"><FlaskConical size={11} />{pepLineage?.vial?.mg || vial.mg}mg</span>}
                                            {(vendorInfo?.name || vial.vendor) && <span className="flex items-center gap-1"><Store size={11} />{vendorInfo?.name || vial.vendor}</span>}
                                            {(pepLineage?.vial?.cost || vial.cost) && <span className="flex items-center gap-1"><DollarSign size={11} />${Number(pepLineage?.vial?.cost || vial.cost).toFixed(2)}</span>}
                                            {vial.reconstitutionDate && <span>Recon: {formatMMDDYYYY(vial.reconstitutionDate)}</span>}
                                        </div>
                                        {orderInfo && (
                                            <div className="flex flex-wrap gap-3 text-xs mt-1.5 pt-1.5" style={{ color: theme.textLight, borderTop: `1px solid ${theme.border}` }}>
                                                <span className="flex items-center gap-1"><Truck size={11} />Order {orderInfo.orderNumber || orderInfo.id?.slice(-6)}</span>
                                                {orderInfo.date && <span>{formatMMDDYYYY(orderInfo.date)}</span>}
                                                {orderInfo.tracking && <span className="truncate max-w-[120px]">Track: {orderInfo.tracking}</span>}
                                                {orderInfo.status && (
                                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-medium uppercase" style={{ backgroundColor: theme.primary + '15', color: theme.primary }}>
                                                        {orderInfo.status}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        {assessment?.notes && (
                                            <div className="mt-1 text-xs italic" style={{ color: theme.textLight }}>{assessment.notes}</div>
                                        )}
                                    </div>
                                );
                            })}
                            {/* Finished vials from vialHistory */}
                            {(() => {
                                const allFinished = Object.values(linkedItems).flatMap(item =>
                                    (item.vialHistory || []).map(hv => hv)
                                ).filter(hv => hv.usedAt);
                                if (allFinished.length === 0) return null;
                                return (
                                    <>
                                        <div className="text-[10px] font-medium uppercase tracking-wider mt-2 ml-1" style={{ color: theme.textLight }}>Finished during protocol</div>
                                        {allFinished.map((hv, idx) => (
                                            <div key={`hv-${idx}`} className="p-3 rounded-lg content-section" style={{ opacity: 0.55 }}>
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <div className="font-medium text-sm line-through" style={{ color: theme.textLight }}>
                                                        {hv.name || 'Unknown Peptide'}
                                                    </div>
                                                    <div className="px-2 py-0.5 rounded-md text-[10px] font-semibold" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: theme.textLight }}>
                                                        Used
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-3 text-xs" style={{ color: theme.textLight }}>
                                                    {hv.mg && <span className="flex items-center gap-1"><FlaskConical size={11} />{hv.mg}mg</span>}
                                                    {hv.vendor && <span className="flex items-center gap-1"><Store size={11} />{hv.vendor}</span>}
                                                    {hv.cost && <span className="flex items-center gap-1"><DollarSign size={11} />${Number(hv.cost).toFixed(2)}</span>}
                                                    {hv.usedAt && <span>Finished: {formatMMDDYYYY(hv.usedAt)}</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                );
                            })()}

                            {vialsAddedDuring && vialsAddedDuring.length > 0 && (
                                <>
                                    <div className="text-[10px] font-medium uppercase tracking-wider mt-2 ml-1" style={{ color: theme.textLight }}>Added during protocol</div>
                                    {vialsAddedDuring.map((vial, index) => {
                                        const stockpileItem = stockpile?.find(s => s.id === vial.vialId || s.id === vial.stockpileId);
                                        return (
                                            <div key={`va-${index}`} className="p-3 rounded-lg content-section">
                                                <div className="font-medium text-sm mb-0.5" style={{ color: theme.text }}>
                                                    {vial.name || stockpileItem?.name || 'Unknown Peptide'}
                                                </div>
                                                <div className="flex flex-wrap gap-3 text-xs" style={{ color: theme.textLight }}>
                                                    {vial.mg && <span className="flex items-center gap-1"><FlaskConical size={11} />{vial.mg}mg</span>}
                                                    {vial.vendor && <span>{vial.vendor}</span>}
                                                    {vial.addedDate && <span>Added: {formatMMDDYYYY(vial.addedDate)}</span>}
                                                    {vial.reconstitutionDate && <span>Recon: {formatMMDDYYYY(vial.reconstitutionDate)}</span>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* ─── DELIVERY & RECONSTITUTION ─── */}
                {(Object.keys(linkedItems).length > 0 || reconstitutionData || (skippedReconstitution && Object.keys(skippedReconstitution).length > 0)) && (
                    <div>
                        <div className="flex items-center gap-2.5 mb-3">
                            <Link2 size={26} style={{ color: theme.primary }} />
                            <div className="flex flex-col gap-0.5">
                                <h4 className="text-base font-semibold tracking-wide" style={{ color: theme.text }}>Delivery & Recon</h4>
                                <div className="flex items-center gap-2 ml-0.5">
                                    <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
                                    <span className="text-[10px] font-medium uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>Methods & Documentation</span>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {Object.entries(linkedItems).map(([peptideId, item]) => {
                                const peptide = protocolData?.peptides?.find(p => (p.id || `peptide-${protocolData.peptides.indexOf(p)}`) === peptideId);
                                const deliveryMethod = item.deliveryMethod;
                                if (!deliveryMethod && item.status !== 'linked' && item.status !== 'skipped') return null;
                                const statusLabel = item.status === 'linked' ? 'Linked' : item.status === 'skipped' ? 'Skipped Recon' : item.status || 'N/A';
                                const deliveryLabel = formatDeliveryMethod(deliveryMethod);
                                const routeLabel = deliveryMethod?.administrationRoute?.toUpperCase();
                                const infoLine = [deliveryLabel, routeLabel].filter(Boolean).join(' · ');
                                const pepLineage = lineage?.[peptideId];
                                const reconSnapshot = pepLineage?.recon;
                                return (
                                    <div key={peptideId} className="p-3 rounded-lg content-section">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <div className="font-medium text-sm" style={{ color: theme.text }}>{peptide?.name || 'Peptide'}</div>
                                            <div className="px-2 py-0.5 rounded-md text-[10px] font-semibold" style={{ backgroundColor: theme.primary + '15', color: theme.primary }}>{statusLabel}</div>
                                        </div>
                                        {infoLine && <div className="text-xs" style={{ color: theme.textLight }}>{infoLine}</div>}
                                        {deliveryMethod?.penType && (
                                            <div className="text-xs mt-0.5" style={{ color: theme.textLight }}>
                                                Pen: {deliveryMethod.penType === 'bird-pen' ? 'Bird Pen' : deliveryMethod.penType.charAt(0).toUpperCase() + deliveryMethod.penType.slice(1)}
                                                {deliveryMethod.penColor ? ` (${deliveryMethod.penColor})` : ''}
                                            </div>
                                        )}
                                        {reconSnapshot && (
                                            <div className="flex flex-wrap gap-3 text-xs mt-1.5 pt-1.5" style={{ color: theme.textLight, borderTop: `1px solid ${theme.border}` }}>
                                                {reconSnapshot.water && <span className="flex items-center gap-1"><Droplets size={11} />{reconSnapshot.water}mL BAC water</span>}
                                                {reconSnapshot.concentration && <span>{reconSnapshot.concentration}</span>}
                                                {reconSnapshot.reconStrategy && <span className="capitalize">{reconSnapshot.reconStrategy}</span>}
                                                {reconSnapshot.date && <span>Recon: {formatMMDDYYYY(reconSnapshot.date)}</span>}
                                            </div>
                                        )}
                                        {item.documentation && Array.isArray(item.documentation) && item.documentation.length > 0 && (
                                            <div className="text-xs mt-0.5" style={{ color: theme.textLight }}>
                                                {item.documentation.length} file{item.documentation.length !== 1 ? 's' : ''} attached
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {reconstitutionData && (
                                <div className="p-3 rounded-lg content-section">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <div className="font-medium text-sm" style={{ color: theme.text }}>Reconstitution</div>
                                        {reconstitutionData.reconStrategy && (
                                            <div className="px-2 py-0.5 rounded-md text-[10px] font-semibold" style={{ backgroundColor: theme.primary + '15', color: theme.primary }}>
                                                {reconstitutionData.reconStrategy === 'separate' ? 'Separate' : 'Blended'}
                                            </div>
                                        )}
                                    </div>
                                    {reconstitutionData.date && (
                                        <div className="text-xs" style={{ color: theme.textLight }}>Reconstituted: {formatMMDDYYYY(reconstitutionData.date)}</div>
                                    )}
                                </div>
                            )}
                            {skippedReconstitution && Object.entries(skippedReconstitution).map(([peptideId, data]) => (
                                <div key={`sr-${peptideId}`} className="p-3 rounded-lg content-section">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <div className="font-medium text-sm" style={{ color: theme.text }}>{data.peptideName || 'Unknown'}</div>
                                        <div className="px-2 py-0.5 rounded-md text-[10px] font-semibold" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: theme.textLight }}>Skipped</div>
                                    </div>
                                    {data.deliveryMethod && (
                                        <div className="text-xs" style={{ color: theme.textLight }}>
                                            {formatDeliveryMethod(data.deliveryMethod)}
                                            {data.deliveryMethod.administrationRoute ? ` · ${data.deliveryMethod.administrationRoute.toUpperCase()}` : ''}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ─── FOLLOW-UP & NOTES ─── */}
                <div>
                    <div className="flex items-center gap-2.5 mb-3">
                        <Star size={26} style={{ color: theme.primary }} />
                        <div className="flex flex-col gap-0.5">
                            <h4 className="text-base font-semibold tracking-wide" style={{ color: theme.text }}>Assessment</h4>
                            <div className="flex items-center gap-2 ml-0.5">
                                <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
                                <span className="text-[10px] font-medium uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>Follow-Up & Notes</span>
                            </div>
                        </div>
                    </div>

                    {followUpNote ? (
                        <div className="mb-3">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: theme.textLight }}>Follow-Up</span>
                                <button
                                    onClick={handleEditFollowUp}
                                    className="px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all flex items-center gap-1 btn-primary-inset"
                                    style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                                >
                                    <Edit3 size={11} />
                                    Edit
                                </button>
                            </div>
                            <div
                                className="p-4 rounded-lg content-section"
                                style={{ borderLeft: `3px solid ${theme.primary}` }}
                            >
                                {followUpNote.rating && (
                                    <div className="mb-2 flex items-center gap-2">
                                        <div className="flex items-center gap-0.5">
                                            {[1, 2, 3, 4, 5].map(n => (
                                                <Star key={n} size={16} style={{ fill: followUpNote.rating >= n ? theme.primary : 'none', color: followUpNote.rating >= n ? theme.primary : (theme.isDark ? '#4b5563' : theme.border), strokeWidth: 1.5 }} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {followUpNote.content && (
                                    <p className="text-sm whitespace-pre-wrap mb-2" style={{ color: theme.text }}>{followUpNote.content}</p>
                                )}
                                {followUpNote.tags && followUpNote.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {followUpNote.tags.map(tagId => (
                                            <span key={tagId} className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: theme.primary + '20', color: theme.primary }}>
                                                {tagId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                {followUpNote.linkedDate && (
                                    <div className="mt-2 text-xs flex items-center gap-1" style={{ color: theme.textLight }}>
                                        <Calendar size={12} />
                                        Linked: {formatMMDDYYYY(followUpNote.linkedDate)}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="mb-3 flex justify-center">
                            <button
                                onClick={handleEditFollowUp}
                                className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 btn-primary-inset"
                                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                            >
                                <Edit3 size={16} />
                                Add Follow-Up Assessment
                            </button>
                        </div>
                    )}

                    {Array.isArray(notes) && notes.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: theme.textLight }}>Notes ({notes.length})</span>
                                <div className="flex items-center gap-2">
                                    {!followUpNote && (
                                        <button
                                            onClick={handleEditFollowUp}
                                            className="px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all flex items-center gap-1 btn-primary-inset"
                                            style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                                        >
                                            <Edit3 size={11} />
                                            Follow-Up
                                        </button>
                                    )}
                                    <div className="flex items-center gap-1.5">
                                        <Filter size={12} style={{ color: theme.textLight }} />
                                        <div className="w-36">
                                            <CustomDropdown
                                                value={noteFilter}
                                                onChange={setNoteFilter}
                                                options={[
                                                    { value: 'all', label: 'All Notes' },
                                                    { value: 'during', label: 'During Protocol' },
                                                    { value: 'follow_up', label: 'Follow-Up' }
                                                ]}
                                                theme={theme}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        <div className="space-y-2">
                            {filteredNotes.length === 0 ? (
                                <div className="text-center py-4 text-sm" style={{ color: theme.textLight }}>
                                    No {noteFilter === 'all' ? '' : noteFilter === 'during' ? 'during protocol ' : 'follow-up '}notes found.
                                </div>
                            ) : (
                                filteredNotes.map((note) => (
                                    <div
                                        key={note.id}
                                        className="p-4 rounded-lg content-section"
                                        style={{ borderLeft: `4px solid ${note.type === 'follow_up' ? theme.primary : theme.accent}` }}
                                    >
                                        <div className="flex items-start justify-between gap-2 mb-1.5">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: note.type === 'follow_up' ? theme.primary + '20' : theme.accent + '20', color: note.type === 'follow_up' ? theme.primary : theme.accent }}>
                                                        {note.type === 'follow_up' ? 'Follow-Up' : 'During Protocol'}
                                                    </span>
                                                    <span className="text-xs" style={{ color: theme.textLight }}>{formatMMDDYYYY(note.createdAt)}</span>
                                                    {note.linkedDate && (
                                                        <span className="text-xs flex items-center gap-1" style={{ color: theme.textLight }}>
                                                            <Calendar size={12} />{formatMMDDYYYY(note.linkedDate)}
                                                        </span>
                                                    )}
                                                    {note.rating && (
                                                        <span className="text-xs flex items-center gap-1" style={{ color: theme.textLight }}>
                                                            {[1, 2, 3, 4, 5].slice(0, note.rating).map(n => (
                                                                <Star key={n} size={12} style={{ fill: theme.primary, color: theme.primary }} />
                                                            ))}
                                                        </span>
                                                    )}
                                                </div>
                                                {note.content && (
                                                    <p className="text-sm whitespace-pre-wrap" style={{ color: theme.text }}>{note.content}</p>
                                                )}
                                                {note.tags && note.tags.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                        {note.tags.map(tagId => (
                                                            <span key={tagId} className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: theme.primary + '20', color: theme.primary }}>
                                                                {tagId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                    )}
                </div>
            </div>

            {/* Follow-Up Modal */}
            {protocol && (
                <ProtocolFollowUpModal
                    open={showFollowUpModal}
                    onClose={handleFollowUpClose}
                    protocol={protocol}
                    historyEntryId={currentHistoryEntry.id}
                    theme={theme}
                    onSave={() => {
                        setRefreshKey(prev => prev + 1);
                        handleFollowUpClose();
                    }}
                    existingNoteId={editingNoteId}
                />
            )}
        </BottomSheet>
    );
}
