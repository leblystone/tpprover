import React from 'react';
import Modal from '../common/Modal';
import { formatMMDDYYYY } from '../../utils/date';
import { Calendar } from 'lucide-react';

export default function ProtocolHistoryModal({ open, onClose, protocol, theme }) {
    if (!protocol) return null;

    const historyEvents = [
        ...(protocol.startDate ? [{
            date: protocol.startDate,
            event: 'Protocol Started',
            details: `The protocol was initiated on ${formatMMDDYYYY(protocol.startDate)}.`,
        }] : []),
        ...(protocol.endDate ? [{
            date: protocol.endDate,
            event: 'Protocol Ended',
            details: `The protocol was concluded on ${formatMMDDYYYY(protocol.endDate)}.`,
        }] : []),
    ].sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort descending

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={`History for "${protocol.protocolName || 'Protocol'}"`}
            theme={theme}
            footer={
                <button
                    className="px-3 py-2 rounded-md border"
                    style={{ borderColor: theme.border }}
                    onClick={onClose}
                >
                    Close
                </button>
            }
        >
            <div className="space-y-4">
                {historyEvents.length > 0 ? (
                    historyEvents.map((item, index) => (
                        <div key={index} className="flex items-start gap-4">
                            <div className="flex-shrink-0 mt-1">
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                                    <Calendar size={16} className="text-gray-500" />
                                </span>
                            </div>
                            <div>
                                <p className="font-semibold" style={{ color: theme.text }}>{item.event}</p>
                                <p className="text-sm text-gray-500">{formatMMDDYYYY(item.date)}</p>
                                <p className="text-sm mt-1" style={{ color: theme.textLight }}>{item.details}</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <p style={{ color: theme.textLight }}>No history events recorded for this protocol yet.</p>
                )}
            </div>
        </Modal>
    );
}
