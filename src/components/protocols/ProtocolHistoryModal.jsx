import React from 'react';
import Modal from '../common/Modal';
import { formatMMDDYYYY, getLocalDateString } from '../../utils/date';
import { Calendar, Play, Square, Package, FileText, CheckCircle, XCircle } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

export default function ProtocolHistoryModal({ open, onClose, protocol, theme }) {
    const { stockpile } = useAppContext();
    
    // Don't render if modal is not open or protocol is missing
    if (!open || !protocol) return null;

    // Build comprehensive history events
    const historyEvents = [];
    
    // Start event
    if (protocol.startDate) {
        historyEvents.push({
            date: protocol.startDate,
            event: 'Protocol Started',
            details: `The protocol was initiated on ${formatMMDDYYYY(protocol.startDate)}.`,
            type: 'start',
            icon: Play,
            color: '#10b981' // green
        });
    }
    
    // Vial addition events (from linkedItems)
    const linkedItems = protocol.linkedItems || {};
    Object.entries(linkedItems).forEach(([peptideId, item]) => {
        if (item.status === 'linked' && item.vialId) {
            const vial = stockpile.find(v => v.id === item.vialId);
            if (vial) {
                // Use protocol startDate as fallback for vial addition date
                const eventDate = protocol.startDate || protocol.updatedAt || getLocalDateString();
                historyEvents.push({
                    date: eventDate,
                    event: 'Vial Added',
                    details: `Added ${vial.name}${vial.mg ? ` (${vial.mg}mg)` : ''}${vial.vendor ? ` from ${vial.vendor}` : ''}.`,
                    type: 'vial',
                    icon: Package,
                    color: '#06b6d4', // cyan
                    vial: vial
                });
            }
        }
    });
    
    // Notes events (if protocol has notes field)
    if (protocol.notes) {
        const notesDate = protocol.updatedAt || protocol.startDate || getLocalDateString();
        historyEvents.push({
            date: notesDate,
            event: 'Note Added',
            details: protocol.notes,
            type: 'note',
            icon: FileText,
            color: '#3b82f6' // blue
        });
    }
    
    // End event
    if (protocol.endDate) {
        historyEvents.push({
            date: protocol.endDate,
            event: protocol.endType === 'completed' ? 'Cycle Completed' : 'Protocol Ended Early',
            details: protocol.endType === 'completed' 
                ? `The protocol completed its full cycle on ${formatMMDDYYYY(protocol.endDate)}.`
                : `The protocol was manually ended on ${formatMMDDYYYY(protocol.endDate)}.`,
            type: 'end',
            icon: protocol.endType === 'completed' ? CheckCircle : XCircle,
            endType: protocol.endType,
            color: protocol.endType === 'completed' ? '#10b981' : '#ef4444'
        });
    }
    
    // Sort by date ascending (oldest first)
    historyEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Generate gradient colors for timeline nodes
    const getGradientColor = (index, total) => {
        const colors = [
            '#10b981', // green
            '#06b6d4', // cyan
            '#3b82f6', // blue
            '#6366f1', // indigo
            '#8b5cf6', // purple
            '#a855f7', // purple
            '#ec4899', // pink
            '#10b981'  // back to green
        ];
        return colors[index % colors.length];
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={`History for "${protocol.protocolName || 'Protocol'}"`}
            theme={theme}
            variant="modern"
            maxWidth="max-w-2xl"
        >
            <div className="relative">
                {historyEvents.length > 0 ? (
                    <div className="relative pl-12">
                        {/* Vertical timeline line with gradient */}
                        <div 
                            className="absolute left-6 top-0 bottom-0 w-1 rounded-full"
                            style={{
                                background: historyEvents.length > 1 
                                    ? `linear-gradient(180deg, 
                                        ${getGradientColor(0, historyEvents.length)} 0%, 
                                        ${getGradientColor(Math.floor(historyEvents.length / 2), historyEvents.length)} 50%,
                                        ${getGradientColor(historyEvents.length - 1, historyEvents.length)} 100%)`
                                    : getGradientColor(0, 1),
                                opacity: 0.3
                            }}
                        />
                        
                        <div className="space-y-6">
                            {historyEvents.map((item, index) => {
                                const IconComponent = item.icon;
                                const nodeColor = item.color || getGradientColor(index, historyEvents.length);
                                
                                return (
                                    <div key={index} className="relative">
                                        {/* Timeline connector */}
                                        {index < historyEvents.length - 1 && (
                                            <div 
                                                className="absolute left-6 top-16 w-0.5 h-6"
                                                style={{ 
                                                    backgroundColor: nodeColor,
                                                    opacity: 0.4
                                                }}
                                            />
                                        )}
                                        
                                        <div className="flex items-start gap-4">
                                            {/* Modern circular node with gradient and shadow */}
                                            <div className="relative z-10 flex-shrink-0">
                                                <div 
                                                    className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110"
                                                    style={{
                                                        background: `linear-gradient(135deg, ${nodeColor} 0%, ${nodeColor}dd 100%)`,
                                                        boxShadow: theme.isDark 
                                                            ? `0 6px 12px rgba(0,0,0,0.4), 0 3px 6px ${nodeColor}40, inset 0 1px 0 rgba(255,255,255,0.1)`
                                                            : `0 6px 12px rgba(0,0,0,0.15), 0 3px 6px ${nodeColor}30, inset 0 1px 0 rgba(255,255,255,0.2)`,
                                                        border: `2px solid ${theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.3)'}`
                                                    }}
                                                >
                                                    <IconComponent 
                                                        size={20} 
                                                        style={{ 
                                                            color: '#ffffff',
                                                            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))'
                                                        }} 
                                                    />
                                                </div>
                                            </div>
                                            
                                            {/* Content card with modern styling */}
                                            <div className="flex-1 min-w-0">
                                                <div 
                                                    className="p-4 rounded-xl transition-all hover:shadow-lg" 
                                                    style={{ 
                                                        border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.05)' : theme.border}`,
                                                        backgroundColor: theme.isDark ? '#1f2937' : theme.cardBackground,
                                                        boxShadow: theme.isDark
                                                            ? `0 4px 12px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)`
                                                            : `0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)`
                                                    }}
                                                >
                                                    <div className="flex items-start justify-between gap-3 mb-2">
                                                        <h4 
                                                            className="font-semibold text-sm flex-1" 
                                                            style={{ color: theme.text }}
                                                        >
                                                            {item.event}
                                                        </h4>
                                                        <span 
                                                            className="px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap"
                                                            style={{ 
                                                                backgroundColor: theme.isDark ? '#374151' : '#f3f4f6',
                                                                color: theme.textLight
                                                            }}
                                                        >
                                                            {formatMMDDYYYY(item.date)}
                                                        </span>
                                                    </div>
                                                    <p 
                                                        className="text-sm leading-relaxed" 
                                                        style={{ color: theme.textLight }}
                                                    >
                                                        {item.details}
                                                    </p>
                                                    {item.endType && (
                                                        <div className="mt-3">
                                                            <span 
                                                                className="px-2.5 py-1 rounded-lg text-xs font-medium inline-block"
                                                                style={{ 
                                                                    backgroundColor: item.endType === 'completed' 
                                                                        ? (theme.isDark ? '#065f46' : '#d1fae5')
                                                                        : (theme.isDark ? '#7f1d1d' : '#fee2e2'),
                                                                    color: item.endType === 'completed' 
                                                                        ? (theme.isDark ? '#6ee7b7' : '#065f46')
                                                                        : (theme.isDark ? '#fca5a5' : '#991b1b'),
                                                                    boxShadow: theme.isDark 
                                                                        ? '0 2px 4px rgba(0,0,0,0.2)'
                                                                        : '0 1px 2px rgba(0,0,0,0.05)'
                                                                }}
                                                            >
                                                                {item.endType === 'completed' ? '✓ Cycle Completed' : '⚠ Ended Early'}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
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
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.isDark ? theme.primary + 'dd' : theme.primary + 'cc'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.primary}
                >
                    Close
                </button>
            </div>
        </Modal>
    );
}
