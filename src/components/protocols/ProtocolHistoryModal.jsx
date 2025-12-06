import React, { useState, useMemo } from 'react';
import Modal from '../common/Modal';
import { formatMMDDYYYY } from '../../utils/date';
import { Calendar, Clock, ChevronDown, CheckCircle, XCircle } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { getProtocolHistoryEntries } from '../../utils/protocolHistory';
import ProtocolHistoryDetailModal from './ProtocolHistoryDetailModal';

export default function ProtocolHistoryModal({ open, onClose, protocol, theme }) {
    const { stockpile } = useAppContext();
    const [selectedHistoryEntry, setSelectedHistoryEntry] = useState(null);

    // Load history entries for this protocol
    const historyEntries = useMemo(() => {
        if (!protocol?.id) return [];
        const entries = getProtocolHistoryEntries(protocol.id);
        // Sort by start date descending (most recent first)
        return entries.sort((a, b) => {
            const aDate = new Date(a.startDate);
            const bDate = new Date(b.startDate);
            return bDate.getTime() - aDate.getTime();
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
            
            // Determine completion status
            let completionStatus = 'unknown';
            if (entry.endDate) {
                if (entry.completionStatus === 'completed') {
                    completionStatus = 'completed';
                } else if (entry.completionStatus === 'ended_early') {
                    completionStatus = 'ended_early';
                } else if (entry.completionStatus === 'rescheduled') {
                    completionStatus = 'rescheduled';
                } else {
                    // Infer from endType if available
                    completionStatus = entry.endType === 'completed' ? 'completed' : 'ended_early';
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
    }, [historyEntries]);

    const getStatusBadge = (status) => {
        switch (status) {
            case 'completed':
                return {
                    icon: CheckCircle,
                    label: 'Completed',
                    bgColor: theme.isDark ? '#065f46' : '#d1fae5',
                    textColor: theme.isDark ? '#6ee7b7' : '#065f46'
                };
            case 'ended_early':
                return {
                    icon: XCircle,
                    label: 'Ended Early',
                    bgColor: theme.isDark ? '#7f1d1d' : '#fee2e2',
                    textColor: theme.isDark ? '#fca5a5' : '#991b1b'
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
                                                                    {entry.historyEntry.protocolName || protocol.protocolName || 'Unnamed Protocol'}
                                                                </span>
                                                                {statusBadge && StatusIcon && (
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
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                            <div 
                                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                                style={{ 
                                    background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primary}dd 100%)`,
                                    boxShadow: theme.isDark 
                                        ? `0 6px 12px rgba(0,0,0,0.4), 0 3px 6px ${theme.primary}40`
                                        : `0 6px 12px rgba(0,0,0,0.15), 0 3px 6px ${theme.primary}30`
                                }}
                            >
                                <Calendar size={28} style={{ color: '#ffffff' }} />
                            </div>
                            <p className="text-sm" style={{ color: theme.textLight }}>
                                No history events recorded for this protocol yet.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end pt-4 mt-6" style={{ 
                    borderTop: theme.isDark ? '1px solid #374151' : `1px solid ${theme.border}`
                }}>
                    <button
                        className="px-4 py-2 rounded-lg font-medium transition-all"
                        style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                        onClick={onClose}
                    >
                        Close
                    </button>
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
