import React, { useState, useMemo } from 'react';
import BottomSheet from '../common/BottomSheet';
import { formatMMDDYYYY } from '../../utils/date';
import { Calendar, Clock, ChevronDown, CalendarCheck, CalendarX, CalendarClock, Package, FlaskConical, Target, Play, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { getProtocolHistoryEntries, findActiveProtocolHistoryEntry } from '../../utils/protocolHistory';
import ProtocolHistoryDetailModal from './ProtocolHistoryDetailModal';
import ProtocolFollowUpModal from './ProtocolFollowUpModal';

export default function ProtocolHistoryModal({ open, onClose, onBack, protocol, theme, onStartProtocol, onRestore, onEdit, protocols }) {
    const { stockpile } = useAppContext();
    const [selectedHistoryEntry, setSelectedHistoryEntry] = useState(null);
    const [followUpProtocol, setFollowUpProtocol] = useState(null);
    const [followUpHistoryId, setFollowUpHistoryId] = useState(null);
    const [hoveredHistoryId, setHoveredHistoryId] = useState(null);
    
    const terracottaGradient = 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)';
    const terracottaHoverGradient = 'linear-gradient(135deg, #b5684a 0%, #a35a3f 100%)';

    // Load history entries for this protocol
    const historyEntries = useMemo(() => {
        if (!protocol?.id) return [];
        const entries = getProtocolHistoryEntries(protocol.id);
        // Sort by timestamp (most recent first) - use updatedAt if available, fallback to createdAt, then startDate
        return entries.sort((a, b) => {
            // Use updatedAt timestamp if available (most accurate for recent changes)
            const aTimestamp = a.updatedAt ? new Date(a.updatedAt) : (a.createdAt ? new Date(a.createdAt) : new Date(a.startDate));
            const bTimestamp = b.updatedAt ? new Date(b.updatedAt) : (b.createdAt ? new Date(b.createdAt) : new Date(b.startDate));
            return bTimestamp.getTime() - aTimestamp.getTime();
        });
    }, [protocol?.id]);

    // Check if protocol is currently active (has active history entry or protocol.active is true)
    const isActiveProtocol = useMemo(() => {
        if (!protocol?.id) return false;
        // Check if protocol has active property
        if (protocol.active === true) return true;
        // Also check if there's an active history entry (no endDate)
        const activeEntry = findActiveProtocolHistoryEntry(protocol.id);
        return !!activeEntry;
    }, [protocol?.id, protocol?.active]);

    // Group history entries by month/year (using endDate for finished, startDate for ongoing)
    const timelineEntries = useMemo(() => {
        const entries = [];
        let currentMonthYear = null;
        
        historyEntries.forEach((entry) => {
            // Use endDate for finished entries, startDate for ongoing
            const dateForGrouping = entry.endDate ? new Date(entry.endDate) : new Date(entry.startDate);
            const month = dateForGrouping.toLocaleDateString('en-US', { month: 'short' });
            const year = dateForGrouping.getFullYear();
            const monthYearKey = `${month} ${year}`;
            
            // Add month/year header if it's a new month
            if (monthYearKey !== currentMonthYear) {
                entries.push({
                    type: 'header',
                    key: monthYearKey,
                    month,
                    year,
                    date: dateForGrouping
                });
                currentMonthYear = monthYearKey;
            }
            
            // Calculate duration
            const startDate = new Date(entry.startDate);
            let durationDays = 0;
            if (entry.endDate) {
                const endDate = new Date(entry.endDate);
                durationDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
            }
            
            // Determine completion status based on planned vs actual duration
            let completionStatus = 'unknown';
            if (entry.endDate) {
                // First check if completionStatus is explicitly set
                if (entry.completionStatus === 'completed' || entry.completionStatus === 'ended_early' || entry.completionStatus === 'rescheduled') {
                    completionStatus = entry.completionStatus;
                } else {
                    // Calculate expected duration from protocol data or protocol object
                    let expectedDurationDays = null;
                    const protocolData = entry.protocolData || {};
                    let duration = protocolData.duration;
                    
                    // Fallback to protocol object if duration not in history entry
                    if (!duration && protocol?.duration) {
                        duration = protocol.duration;
                    }
                    
                    if (duration && !duration.noEnd && duration.count > 0 && duration.unit) {
                        const unit = String(duration.unit).toLowerCase();
                        const count = Number(duration.count) || 0;
                        
                        if (unit.includes('day')) {
                            expectedDurationDays = count;
                        } else if (unit.includes('week')) {
                            expectedDurationDays = count * 7;
                        } else if (unit.includes('month')) {
                            expectedDurationDays = count * 30; // Approximation
                        }
                    }
                    
                    // Compare actual vs expected duration
                    if (expectedDurationDays !== null && durationDays > 0) {
                        const diffDays = durationDays - expectedDurationDays;
                        // Allow 2 day tolerance for "completed on time"
                        if (Math.abs(diffDays) <= 2) {
                            completionStatus = 'completed';
                        } else if (diffDays < -2) {
                            // Ended significantly early
                            completionStatus = 'ended_early';
                        } else {
                            // Went over expected duration
                            completionStatus = 'completed'; // Still consider it completed if it went over
                        }
                    } else {
                        // Fallback to endType if we can't calculate
                        if (entry.endType === 'completed') {
                            completionStatus = 'completed';
                        } else if (entry.endType === 'rescheduled') {
                            completionStatus = 'rescheduled';
                        } else if (entry.endType === 'manual') {
                            // Manual end without duration info - check if it seems early
                            // If duration is very short (1-2 days) and no planned duration, likely a test/quick protocol
                            if (durationDays <= 2) {
                                completionStatus = 'completed'; // Short protocols are likely intentional
                            } else {
                                completionStatus = 'ended_early';
                            }
                        } else {
                            completionStatus = 'ended_early';
                        }
                    }
                }
            }
            
            entries.push({
                type: 'protocol',
                historyEntry: entry,
                durationDays,
                startDate: formatMMDDYYYY(entry.startDate),
                endDate: entry.endDate ? formatMMDDYYYY(entry.endDate) : 'Ongoing',
                completionStatus
            });
        });
        
        return entries;
    }, [historyEntries, protocol]);
    
    // Helper function to get icon for completion status
    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed':
                return CheckCircle2;
            case 'ended_early':
                return XCircle;
            case 'rescheduled':
                return CalendarClock;
            default:
                return FlaskConical;
        }
    };

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
                    bgColor: theme.isDark ? 'rgba(165,182,190,0.22)' : 'rgba(138, 128, 119, 0.16)',
                    textColor: theme.isDark ? theme.accent : theme.text
                };
            case 'rescheduled':
                return {
                    icon: CalendarClock,
                    label: 'Rescheduled',
                    bgColor: theme.isDark ? (theme.warningBg || 'rgba(120, 53, 15, 0.35)') : (theme.warningBg || '#FDF8E8'),
                    textColor: theme.isDark ? theme.warning : (theme.text || '#1E2B2A')
                };
            default:
                return null;
        }
    };

    // Don't render if modal is not open or protocol is missing
    if (!open || !protocol) return null;

    return (
        <>
            <BottomSheet
                open={open}
                onClose={onClose}
                onBack={onBack || onClose}
                title={`History for "${protocol.protocolName || 'Protocol'}"`}
                theme={theme}
                maxHeight="90vh"
            >
                <div className="relative">
                    {timelineEntries.length > 0 ? (
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
                                                        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 z-20 glass-panel-minimal"
                                                        style={{ 
                                                            border: `2px solid ${theme.primary}`,
                                                            boxShadow: `0 4px 12px rgba(0, 0, 0, 0.08), 0 0 0 1px ${theme.primary}20`
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
                                                    className="w-full text-left rounded-xl transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] relative glass-panel-minimal widget-card-hover"
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
                                                                            color: statusBadge.textColor,
                                                                            boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.15), inset 0 1px 2px rgba(0, 0, 0, 0.1)'
                                                                        }}
                                                                    >
                                                                        <StatusIcon size={12} />
                                                                        {statusBadge.label}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            
                                                            {/* Terracotta Follow-Up Assessment Prompt Button */}
                                                            {(() => {
                                                                const hasFollowUp = historyEntry.notes && 
                                                                    Array.isArray(historyEntry.notes) && 
                                                                    historyEntry.notes.some(n => n.type === 'follow_up');
                                                                if (!hasFollowUp && historyEntry.endDate) {
                                                                    return (
                                                                        <div className="mt-2">
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setFollowUpProtocol(protocol);
                                                                                    setFollowUpHistoryId(historyEntry.id);
                                                                                }}
                                                                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                                                                                style={{
                                                                                    background: terracottaGradient,
                                                                                    color: '#ffffff',
                                                                                    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.15), inset 0 1px 2px rgba(0, 0, 0, 0.1), 0 2px 6px rgba(0, 0, 0, 0.10)'
                                                                                }}
                                                                                onMouseEnter={(e) => {
                                                                                    e.currentTarget.style.background = terracottaHoverGradient;
                                                                                }}
                                                                                onMouseLeave={(e) => {
                                                                                    e.currentTarget.style.background = terracottaGradient;
                                                                                }}
                                                                            >
                                                                                <FileText size={12} />
                                                                                Complete Follow-Up
                                                                            </button>
                                                                        </div>
                                                                    );
                                                                }
                                                                return null;
                                                            })()}
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
                    ) : (
                        // Show empty state when no history entries exist
                        <div className="flex flex-col items-center justify-center py-4 px-6 text-center">
                            {/* Chip/Badge */}
                            <div
                                className="px-4 py-2 rounded-full mb-3 max-w-md"
                                    style={{
                                        backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : theme.cardBackground,
                                        border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                                        display: 'inline-block'
                                    }}
                            >
                                <span className="text-sm font-medium text-center" style={{ color: theme.text }}>
                                    {isActiveProtocol 
                                        ? (
                                            <>
                                                You're currently researching!<br />
                                                History will be added once you complete the protocol.
                                            </>
                                        )
                                        : "You haven't researched this one yet!"}
                                </span>
                            </div>
                            
                            {/* CTA Button - matches start protocol button style */}
                            {onStartProtocol && (
                                <button
                                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold transition-all"
                                    style={{ 
                                        backgroundColor: theme.primary, 
                                        color: theme.textOnPrimary || '#ffffff'
                                    }}
                                    onClick={() => {
                                        onStartProtocol(protocol);
                                        onClose();
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                        e.currentTarget.style.boxShadow = `0 4px 12px ${theme.primary}40`;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    <Play size={16} />
                                    <span>Start Protocol</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </BottomSheet>

            {/* Detail Modal */}
            <ProtocolHistoryDetailModal
                open={!!selectedHistoryEntry}
                onClose={() => setSelectedHistoryEntry(null)}
                historyEntry={selectedHistoryEntry}
                theme={theme}
                stockpile={stockpile}
                onRestore={onRestore}
                onEdit={onEdit}
                protocols={protocols}
            />
            
            {/* Follow-Up Modal */}
            {followUpProtocol && (
                <ProtocolFollowUpModal
                    open={!!followUpProtocol}
                    onClose={() => {
                        setFollowUpProtocol(null);
                        setFollowUpHistoryId(null);
                        window.dispatchEvent(new CustomEvent('tpp:protocol-history-updated'));
                    }}
                    protocol={followUpProtocol}
                    historyEntryId={followUpHistoryId}
                    theme={theme}
                    onSave={() => {
                        setFollowUpProtocol(null);
                        setFollowUpHistoryId(null);
                        window.dispatchEvent(new CustomEvent('tpp:protocol-history-updated'));
                    }}
                />
            )}
            
        </>
    );
}
