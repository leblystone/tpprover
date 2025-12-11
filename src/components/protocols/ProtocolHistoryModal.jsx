import React, { useState, useMemo } from 'react';
import Modal from '../common/Modal';
import { formatMMDDYYYY } from '../../utils/date';
import { Calendar, Clock, ChevronDown, CalendarCheck, CalendarX, Package, FlaskConical, Target, Play } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { getProtocolHistoryEntries } from '../../utils/protocolHistory';
import ProtocolHistoryDetailModal from './ProtocolHistoryDetailModal';

export default function ProtocolHistoryModal({ open, onClose, protocol, theme, onStartProtocol }) {
    const { stockpile } = useAppContext();
    const [selectedHistoryEntry, setSelectedHistoryEntry] = useState(null);

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

    // Group history entries by month/year
    const timelineEntries = useMemo(() => {
        const entries = [];
        let currentMonthYear = null;
        
        historyEntries.forEach((entry) => {
            const startDate = new Date(entry.startDate);
            const month = startDate.toLocaleDateString('en-US', { month: 'short' });
            const year = startDate.getFullYear();
            const monthYearKey = `${month} ${year}`;
            
            // Add month/year header if it's a new month
            if (monthYearKey !== currentMonthYear) {
                entries.push({
                    type: 'header',
                    key: monthYearKey,
                    month,
                    year,
                    date: startDate
                });
                currentMonthYear = monthYearKey;
            }
            
            // Calculate duration
            const endDate = entry.endDate ? new Date(entry.endDate) : null;
            let durationDays = 0;
            if (endDate) {
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
                type: 'entry',
                historyEntry: entry,
                durationDays,
                startDate: formatMMDDYYYY(entry.startDate),
                endDate: entry.endDate ? formatMMDDYYYY(entry.endDate) : 'Ongoing',
                completionStatus
            });
        });
        
        return entries;
    }, [historyEntries, protocol]);

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

    // Don't render if modal is not open or protocol is missing
    if (!open || !protocol) return null;

    return (
        <>
            <Modal
                open={open}
                onClose={onClose}
                onBack={onClose}
                title={`History for "${protocol.protocolName || 'Protocol'}"`}
                theme={theme}
                variant="modern"
                maxWidth="max-w-3xl"
            >
                <div className="relative">
                    {timelineEntries.length > 0 ? (
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
                                        const statusBadge = getStatusBadge(entry.completionStatus);
                                        const StatusIcon = statusBadge?.icon;
                                        
                                        return (
                                            <div key={entry.historyEntry.id} className="relative pl-4">
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
                                                    onClick={() => setSelectedHistoryEntry(entry.historyEntry)}
                                                    className="w-full text-left p-4 rounded-lg transition-all hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] relative"
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
                                                                    {entry.historyEntry.protocolName || protocol.protocolName || 'Unnamed Protocol'}
                                                                </span>
                                                                {protocol?.emoji && (
                                                                    <span className="text-lg">{protocol.emoji}</span>
                                                                )}
                                                            </div>
                                                            
                                                            <div className="flex flex-wrap items-center gap-3 text-sm" style={{ color: theme.textLight }}>
                                                                <span className="flex items-center gap-1">
                                                                    <Clock size={14} />
                                                                    {entry.startDate} → {entry.endDate}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Duration and arrow indicator - upper right */}
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            {entry.durationDays > 0 && (
                                                                <span className="text-sm font-medium" style={{ color: theme.textLight }}>
                                                                    {entry.durationDays} day{entry.durationDays !== 1 ? 's' : ''}
                                                                </span>
                                                            )}
                                                            <div className="opacity-50">
                                                                <ChevronDown 
                                                                    size={20} 
                                                                    className="transform rotate-[-90deg]"
                                                                    style={{ color: theme.textLight }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Status badge - bottom right */}
                                                    {statusBadge && StatusIcon && (
                                                        <div className="absolute bottom-2 right-2">
                                                            <span 
                                                                className="px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1"
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
                                className="px-4 py-2 rounded-full mb-3"
                                style={{
                                    backgroundColor: theme.isDark ? '#1f2937' : theme.cardBackground,
                                    border: `1px solid ${theme.border}`,
                                    display: 'inline-block'
                                }}
                            >
                                <span className="text-sm font-medium" style={{ color: theme.text }}>
                                    You haven't researched this one yet!
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
            </Modal>

            {/* Detail Modal */}
            <ProtocolHistoryDetailModal
                open={!!selectedHistoryEntry}
                onClose={() => setSelectedHistoryEntry(null)}
                historyEntry={selectedHistoryEntry}
                theme={theme}
                stockpile={stockpile}
            />
            
        </>
    );
}
