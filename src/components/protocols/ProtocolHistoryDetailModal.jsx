import React, { useState, useMemo } from 'react';
import BottomSheet from '../common/BottomSheet';
import { formatMMDDYYYY } from '../../utils/date';
import { Package, Calendar, CalendarCheck, CalendarX, Clock, DollarSign, FlaskConical, Trash2, FileText, Filter, Edit3, Star, RotateCcw, CheckCircle2, AlertCircle, Pill, Link2 } from 'lucide-react';
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

    const { protocolData, startDate, endDate, completionStatus, vials, reconstitutionData, skippedReconstitution, vialsAddedDuring, notes, vialAssessment, endType } = currentHistoryEntry;

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

    return (
        <BottomSheet
            open={open}
            onClose={onClose}
            onBack={onClose}
            title={`Protocol Details - ${formatMMDDYYYY(startDate)}`}
            theme={theme}
            maxHeight="90vh"
        >
            <div className="space-y-4">
                {/* Mobile: Combined date card */}
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

                {/* Desktop: Separate cards */}
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

                {/* Protocol Summary */}
                {protocolData && (
                    <div>
                        <h3 className="text-sm font-semibold mb-2" style={{ color: theme.text }}>Protocol Summary</h3>
                        <div className="p-4 rounded-lg content-section">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    {protocolData.protocolName && (
                                        <div>
                                            <div className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: theme.textLight }}>Name</div>
                                            <div className="text-sm font-semibold" style={{ color: theme.text }}>{protocolData.protocolName}</div>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    {protocolData.duration && !protocolData.duration.noEnd && (
                                        <div>
                                            <div className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: theme.textLight }}>Planned Duration</div>
                                            <div className="text-sm font-semibold" style={{ color: theme.text }}>{protocolData.duration.count} {protocolData.duration.unit}</div>
                                        </div>
                                    )}
                                    {protocolData.purpose && (
                                        <div>
                                            <div className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: theme.textLight }}>Purpose</div>
                                            <div className="text-sm" style={{ color: theme.text }}>{protocolData.purpose}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {protocolData.peptides && protocolData.peptides.length > 0 && (
                                <div className="mt-3">
                                    <div className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: theme.textLight }}>Peptides ({protocolData.peptides.length})</div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {protocolData.peptides.map((pep, idx) => (
                                            <div key={idx} className="text-sm" style={{ color: theme.text }}>
                                                • {pep.name || 'Unnamed'}
                                                {pep.dosage && (
                                                    <span className="ml-2" style={{ color: theme.textLight }}>({pep.dosage.amount} {pep.dosage.unit})</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Dosage Schedule */}
                {protocolData?.peptides && protocolData.peptides.some(p => p.dosage || p.schedule || p.frequency || p.per || p.time) && (
                    <div>
                        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: theme.text }}>
                            <Pill size={16} />
                            Dosage Schedule
                        </h3>
                        <div className="space-y-2">
                            {protocolData.peptides.map((pep, idx) => {
                                const hasDoseInfo = pep.dosage || pep.schedule || pep.frequency || pep.per || pep.time || pep.count;
                                if (!hasDoseInfo) return null;

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

                                return (
                                    <div key={idx} className="p-3 rounded-lg content-section">
                                        <div className="font-medium text-sm mb-1.5" style={{ color: theme.text }}>{pep.name || 'Unnamed'}</div>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs" style={{ color: theme.textLight }}>
                                            {pep.dosage && (
                                                <div><span className="font-medium" style={{ color: theme.text }}>Dose:</span> {pep.dosage.amount} {pep.dosage.unit}</div>
                                            )}
                                            {pep.frequency && (
                                                <div><span className="font-medium" style={{ color: theme.text }}>Frequency:</span> {formatFrequency(pep.frequency)}</div>
                                            )}
                                            {(pep.count || pep.per) && (
                                                <div><span className="font-medium" style={{ color: theme.text }}>Schedule:</span> {pep.count || ''}{pep.per ? `x per ${pep.per}` : ''}</div>
                                            )}
                                            {pep.time && (
                                                <div><span className="font-medium" style={{ color: theme.text }}>Time:</span> {formatTime(pep.time)}</div>
                                            )}
                                            {pep.schedule && Array.isArray(pep.schedule) && (
                                                <div className="col-span-2">
                                                    <span className="font-medium" style={{ color: theme.text }}>Schedule:</span>{' '}
                                                    {pep.schedule.join(', ')}
                                                </div>
                                            )}
                                            {pep.schedule && typeof pep.schedule === 'string' && (
                                                <div><span className="font-medium" style={{ color: theme.text }}>Schedule:</span> {pep.schedule}</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Vials Used Section */}
                {vials && vials.length > 0 && (
                    <div>
                        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: theme.text }}>
                            <Package size={16} />
                            Vials Used
                        </h3>
                        <div className="space-y-2">
                            {vials.map((vial, index) => {
                                const stockpileItem = stockpile?.find(s => s.id === vial.vialId || s.id === vial.stockpileId);
                                const assessment = vialAssessment?.[vial.vialId];
                                return (
                                    <div key={index} className="p-4 rounded-lg content-section">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="font-medium mb-1" style={{ color: theme.text }}>
                                                    {vial.name || stockpileItem?.name || 'Unknown Peptide'}
                                                </div>
                                                <div className="flex flex-wrap gap-3 text-xs" style={{ color: theme.textLight }}>
                                                    {vial.mg && (
                                                        <span className="flex items-center gap-1"><FlaskConical size={12} />{vial.mg}mg</span>
                                                    )}
                                                    {vial.vendor && <span>{vial.vendor}</span>}
                                                    {vial.cost && (
                                                        <span className="flex items-center gap-1"><DollarSign size={12} />${Number(vial.cost).toFixed(2)}</span>
                                                    )}
                                                </div>
                                                {vial.reconstitutionDate && (
                                                    <div className="mt-2 text-xs" style={{ color: theme.textLight }}>Reconstituted: {formatMMDDYYYY(vial.reconstitutionDate)}</div>
                                                )}
                                            </div>
                                            {assessment && (
                                                <div
                                                    className="px-2 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1"
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
                                        {assessment?.notes && (
                                            <div className="mt-1.5 text-xs italic" style={{ color: theme.textLight }}>
                                                {assessment.notes}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Vials Added During Protocol */}
                {vialsAddedDuring && vialsAddedDuring.length > 0 && (
                    <div>
                        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: theme.text }}>
                            <Package size={16} />
                            Vials Added During Protocol
                        </h3>
                        <div className="space-y-2">
                            {vialsAddedDuring.map((vial, index) => {
                                const stockpileItem = stockpile?.find(s => s.id === vial.vialId || s.id === vial.stockpileId);
                                return (
                                    <div key={index} className="p-4 rounded-lg content-section">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="font-medium mb-1" style={{ color: theme.text }}>
                                                    {vial.name || stockpileItem?.name || 'Unknown Peptide'}
                                                </div>
                                                <div className="flex flex-wrap gap-3 text-xs" style={{ color: theme.textLight }}>
                                                    {vial.mg && (<span className="flex items-center gap-1"><FlaskConical size={12} />{vial.mg}mg</span>)}
                                                    {vial.vendor && <span>{vial.vendor}</span>}
                                                </div>
                                                {vial.addedDate && (
                                                    <div className="mt-2 text-xs" style={{ color: theme.textLight }}>Added: {formatMMDDYYYY(vial.addedDate)}</div>
                                                )}
                                                {vial.reconstitutionDate && (
                                                    <div className="mt-1 text-xs" style={{ color: theme.textLight }}>Reconstituted: {formatMMDDYYYY(vial.reconstitutionDate)}</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Linked Items / Delivery Methods */}
                {Object.keys(linkedItems).length > 0 && (
                    <div>
                        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: theme.text }}>
                            <Link2 size={16} />
                            Linked Items & Delivery
                        </h3>
                        <div className="space-y-2">
                            {Object.entries(linkedItems).map(([peptideId, item]) => {
                                const peptide = protocolData?.peptides?.find(p => (p.id || `peptide-${protocolData.peptides.indexOf(p)}`) === peptideId);
                                const deliveryMethod = item.deliveryMethod;
                                if (!deliveryMethod && item.status !== 'linked' && item.status !== 'skipped') return null;
                                return (
                                    <div key={peptideId} className="p-3 rounded-lg content-section">
                                        <div className="font-medium text-sm mb-1" style={{ color: theme.text }}>
                                            {peptide?.name || 'Peptide'}
                                        </div>
                                        <div className="space-y-0.5 text-xs" style={{ color: theme.textLight }}>
                                            <div>
                                                <span className="font-medium" style={{ color: theme.text }}>Status:</span>{' '}
                                                {item.status === 'linked' ? 'Linked to Stockpile' : item.status === 'skipped' ? 'Skipped Recon' : item.status || 'N/A'}
                                            </div>
                                            {deliveryMethod && (
                                                <>
                                                    <div>
                                                        <span className="font-medium" style={{ color: theme.text }}>Delivery:</span>{' '}
                                                        {formatDeliveryMethod(deliveryMethod)}
                                                    </div>
                                                    {deliveryMethod.administrationRoute && (
                                                        <div>
                                                            <span className="font-medium" style={{ color: theme.text }}>Route:</span>{' '}
                                                            {deliveryMethod.administrationRoute.toUpperCase()}
                                                        </div>
                                                    )}
                                                    {deliveryMethod.penType && (
                                                        <div>
                                                            <span className="font-medium" style={{ color: theme.text }}>Pen Type:</span>{' '}
                                                            {deliveryMethod.penType === 'bird-pen' ? 'Bird Pen' : deliveryMethod.penType.charAt(0).toUpperCase() + deliveryMethod.penType.slice(1)}
                                                        </div>
                                                    )}
                                                    {deliveryMethod.penColor && (
                                                        <div>
                                                            <span className="font-medium" style={{ color: theme.text }}>Pen Color:</span>{' '}
                                                            {deliveryMethod.penColor}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                            {item.documentation && Array.isArray(item.documentation) && item.documentation.length > 0 && (
                                                <div className="mt-1">
                                                    <span className="font-medium" style={{ color: theme.text }}>Documentation:</span>{' '}
                                                    {item.documentation.length} file{item.documentation.length !== 1 ? 's' : ''} attached
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Reconstitution Data */}
                {reconstitutionData && (
                    <div>
                        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: theme.text }}>
                            <FlaskConical size={16} />
                            Reconstitution Details
                        </h3>
                        <div className="p-4 rounded-lg content-section">
                            {reconstitutionData.reconStrategy && (
                                <div className="mb-1.5 text-sm" style={{ color: theme.text }}>
                                    <span className="font-medium">Strategy:</span>{' '}
                                    <span style={{ color: theme.textLight }}>{reconstitutionData.reconStrategy === 'separate' ? 'Separate' : 'Blended'}</span>
                                </div>
                            )}
                            {reconstitutionData.date && (
                                <div className="text-sm" style={{ color: theme.text }}>
                                    <span className="font-medium">Reconstituted:</span>{' '}
                                    <span style={{ color: theme.textLight }}>{formatMMDDYYYY(reconstitutionData.date)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Skipped Reconstitution Data */}
                {skippedReconstitution && Object.keys(skippedReconstitution).length > 0 && (
                    <div>
                        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: theme.text }}>
                            <FlaskConical size={16} />
                            Skipped Reconstitution
                        </h3>
                        <div className="space-y-2">
                            {Object.entries(skippedReconstitution).map(([peptideId, data]) => (
                                <div key={peptideId} className="p-4 rounded-lg content-section">
                                    <div className="font-medium mb-1.5" style={{ color: theme.text }}>{data.peptideName || 'Unknown Peptide'}</div>
                                    {data.deliveryMethod && (
                                        <div className="space-y-1 text-sm" style={{ color: theme.textLight }}>
                                            <div>
                                                <span className="font-medium">Delivery Method:</span>{' '}
                                                {formatDeliveryMethod(data.deliveryMethod)}
                                            </div>
                                            {data.deliveryMethod.administrationRoute && (
                                                <div><span className="font-medium">Route:</span> {data.deliveryMethod.administrationRoute.toUpperCase()}</div>
                                            )}
                                            {data.deliveryMethod.penType && (
                                                <div>
                                                    <span className="font-medium">Pen Type:</span>{' '}
                                                    {data.deliveryMethod.penType === 'bird-pen' ? 'Bird Pen' : data.deliveryMethod.penType.charAt(0).toUpperCase() + data.deliveryMethod.penType.slice(1)}
                                                </div>
                                            )}
                                            {data.deliveryMethod.penColor && (
                                                <div><span className="font-medium">Pen Color:</span> {data.deliveryMethod.penColor}</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Follow-Up Assessment Section */}
                {followUpNote ? (
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: theme.text }}>
                                <FileText size={16} />
                                Follow-Up Assessment
                            </h3>
                            <button
                                onClick={handleEditFollowUp}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 btn-primary-inset"
                                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                            >
                                <Edit3 size={14} />
                                Edit Assessment
                            </button>
                        </div>
                        <div
                            className="p-4 rounded-lg content-section"
                            style={{ border: `2px solid ${theme.primary}`, borderLeft: `4px solid ${theme.primary}` }}
                        >
                            {followUpNote.rating && (
                                <div className="mb-2 flex items-center justify-center gap-2">
                                    <span className="text-sm font-medium" style={{ color: theme.text }}>Protocol Rating:</span>
                                    <div className="flex items-center gap-1">
                                        {[1, 2, 3, 4, 5].map(n => (
                                            <Star key={n} size={18} style={{ fill: followUpNote.rating >= n ? theme.primary : 'none', color: followUpNote.rating >= n ? theme.primary : (theme.isDark ? '#4b5563' : theme.border), strokeWidth: 1.5 }} />
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
                                    Linked to calendar: {formatMMDDYYYY(followUpNote.linkedDate)}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: theme.text }}>
                                <FileText size={16} />
                                Follow-Up Assessment
                            </h3>
                            <div className="px-2.5 py-1 rounded-lg flex items-center gap-1.5" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)', color: theme.textLight }}>
                                <span className="font-medium text-xs">No Follow-Up</span>
                            </div>
                        </div>
                        <div className="flex justify-center">
                            <button
                                onClick={handleEditFollowUp}
                                className="px-6 py-3 rounded-lg text-base font-semibold transition-all flex items-center gap-2 btn-primary-inset"
                                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                            >
                                <Edit3 size={18} />
                                Add Follow-Up Assessment
                            </button>
                        </div>
                    </div>
                )}

                {/* Notes Section */}
                {Array.isArray(notes) && notes.length > 0 && (
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: theme.text }}>
                                <FileText size={16} />
                                Notes ({notes.length})
                            </h3>
                            <div className="flex items-center gap-2">
                                {!followUpNote && (
                                    <button
                                        onClick={handleEditFollowUp}
                                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 mr-2 btn-primary-inset"
                                        style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                                    >
                                        <Edit3 size={14} />
                                        Add Follow-Up
                                    </button>
                                )}
                                <div className="flex items-center gap-2">
                                    <Filter size={14} style={{ color: theme.textLight }} />
                                    <div className="w-40">
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

            {/* Footer Action Bar */}
            <div className="flex items-center justify-between pt-3 mt-4" style={{
                borderTop: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : theme.border}`
            }}>
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
