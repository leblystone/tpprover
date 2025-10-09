import React from 'react';
import Modal from '../common/Modal';
import { formatMMDDYYYY } from '../../utils/date';
import { Calendar, Play, Square } from 'lucide-react';

export default function ProtocolHistoryModal({ open, onClose, protocol, theme }) {
    if (!protocol) return null;

    const historyEvents = [
        ...(protocol.startDate ? [{
            date: protocol.startDate,
            event: 'Protocol Started',
            details: `The protocol was initiated on ${formatMMDDYYYY(protocol.startDate)}.`,
            type: 'start',
            icon: Play
        }] : []),
        ...(protocol.endDate ? [{
            date: protocol.endDate,
            event: 'Protocol Ended',
            details: `The protocol was concluded on ${formatMMDDYYYY(protocol.endDate)}.`,
            type: 'end',
            icon: Square
        }] : []),
    ].sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort descending

    const getEventColor = (type) => {
        return type === 'start' ? theme.primary : '#ef4444';
    };

    const getEventBackground = (type) => {
        return type === 'start' ? theme.secondary : '#fef2f2';
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={`History for "${protocol.protocolName || 'Protocol'}"`}
            theme={theme}
            variant="modern"
            maxWidth="max-w-lg"
        >
            <div className="space-y-4">
                {historyEvents.length > 0 ? (
                    historyEvents.map((item, index) => {
                        const IconComponent = item.icon;
                        const eventColor = getEventColor(item.type);
                        const eventBackground = getEventBackground(item.type);
                        
                        return (
                            <div key={index} className="relative">
                                {/* Timeline connector */}
                                {index < historyEvents.length - 1 && (
                                    <div 
                                        className="absolute left-6 top-12 w-0.5 h-8"
                                        style={{ backgroundColor: theme.border }}
                                    ></div>
                                )}
                                
                                <div className="flex items-start gap-4">
                                    {/* Icon with colored background */}
                                    <div className="flex-shrink-0">
                                        <div 
                                            className="flex h-12 w-12 items-center justify-center rounded-full"
                                            style={{ backgroundColor: eventBackground }}
                                        >
                                            <IconComponent size={20} style={{ color: eventColor }} />
                                        </div>
                                    </div>
                                    
                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="p-4 rounded-lg border" style={{ 
                                            borderColor: theme.border, 
                                            backgroundColor: theme.cardBackground 
                                        }}>
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-semibold text-sm" style={{ color: theme.text }}>
                                                    {item.event}
                                                </h4>
                                                <span 
                                                    className="px-2 py-1 rounded text-xs font-medium"
                                                    style={{ 
                                                        backgroundColor: eventBackground, 
                                                        color: eventColor 
                                                    }}
                                                >
                                                    {formatMMDDYYYY(item.date)}
                                                </span>
                                            </div>
                                            <p className="text-sm" style={{ color: theme.textLight }}>
                                                {item.details}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center py-8 px-6 text-center">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: theme.secondary }}>
                            <Calendar size={24} style={{ color: theme.primary }} />
                        </div>
                        <p className="text-sm" style={{ color: theme.textLight }}>
                            No history events recorded for this protocol yet.
                        </p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-4 mt-6 border-t" style={{ borderColor: theme.border }}>
                <button
                    className="px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90"
                    style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                    onClick={onClose}
                >
                    Close
                </button>
            </div>
        </Modal>
    );
}
