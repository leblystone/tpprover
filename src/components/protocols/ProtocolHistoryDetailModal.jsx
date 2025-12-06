import React from 'react';
import Modal from '../common/Modal';
import { formatMMDDYYYY } from '../../utils/date';
import { Package, Calendar, CheckCircle, XCircle, Clock, DollarSign, FlaskConical } from 'lucide-react';

export default function ProtocolHistoryDetailModal({ open, onClose, historyEntry, theme, stockpile }) {
    if (!open || !historyEntry) return null;

    const { protocolData, startDate, endDate, completionStatus, vials, reconstitutionData, vialsAddedDuring } = historyEntry;

    const getStatusInfo = () => {
        switch (completionStatus) {
            case 'completed':
                return {
                    icon: CheckCircle,
                    color: '#10b981',
                    label: 'Completed on Time',
                    bgColor: theme.isDark ? '#065f46' : '#d1fae5',
                    textColor: theme.isDark ? '#6ee7b7' : '#065f46'
                };
            case 'ended_early':
                return {
                    icon: XCircle,
                    color: '#ef4444',
                    label: 'Ended Early',
                    bgColor: theme.isDark ? '#7f1d1d' : '#fee2e2',
                    textColor: theme.isDark ? '#fca5a5' : '#991b1b'
                };
            case 'rescheduled':
                return {
                    icon: Clock,
                    color: '#f59e0b',
                    label: 'Rescheduled',
                    bgColor: theme.isDark ? '#78350f' : '#fef3c7',
                    textColor: theme.isDark ? '#fcd34d' : '#92400e'
                };
            default:
                return {
                    icon: Clock,
                    color: theme.textLight,
                    label: 'Unknown',
                    bgColor: theme.secondary,
                    textColor: theme.textLight
                };
        }
    };

    const statusInfo = getStatusInfo();
    const StatusIcon = statusInfo.icon;

    // Calculate duration
    const getDuration = () => {
        if (!startDate) return 'N/A';
        if (!endDate) return 'Ongoing';
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 for inclusive
        return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={`Protocol Details - ${formatMMDDYYYY(startDate)}`}
            theme={theme}
            variant="modern"
            maxWidth="max-w-3xl"
        >
            <div className="space-y-6">
                {/* Status Badge */}
                <div className="flex items-center justify-center">
                    <div
                        className="px-4 py-2 rounded-lg flex items-center gap-2"
                        style={{
                            backgroundColor: statusInfo.bgColor,
                            color: statusInfo.textColor
                        }}
                    >
                        <StatusIcon size={18} />
                        <span className="font-semibold text-sm">{statusInfo.label}</span>
                    </div>
                </div>

                {/* Timeline Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div
                        className="p-4 rounded-lg"
                        style={{
                            backgroundColor: theme.isDark ? '#1f2937' : theme.cardBackground,
                            border: `1px solid ${theme.border}`
                        }}
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <Calendar size={16} style={{ color: theme.primary }} />
                            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: theme.textLight }}>
                                Start Date
                            </span>
                        </div>
                        <div className="text-sm font-semibold" style={{ color: theme.text }}>
                            {formatMMDDYYYY(startDate)}
                        </div>
                    </div>

                    {endDate && (
                        <div
                            className="p-4 rounded-lg"
                            style={{
                                backgroundColor: theme.isDark ? '#1f2937' : theme.cardBackground,
                                border: `1px solid ${theme.border}`
                            }}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <Calendar size={16} style={{ color: theme.primary }} />
                                <span className="text-xs font-medium uppercase tracking-wider" style={{ color: theme.textLight }}>
                                    End Date
                                </span>
                            </div>
                            <div className="text-sm font-semibold" style={{ color: theme.text }}>
                                {formatMMDDYYYY(endDate)}
                            </div>
                        </div>
                    )}

                    <div
                        className="p-4 rounded-lg"
                        style={{
                            backgroundColor: theme.isDark ? '#1f2937' : theme.cardBackground,
                            border: `1px solid ${theme.border}`
                        }}
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <Clock size={16} style={{ color: theme.primary }} />
                            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: theme.textLight }}>
                                Duration
                            </span>
                        </div>
                        <div className="text-sm font-semibold" style={{ color: theme.text }}>
                            {getDuration()}
                        </div>
                    </div>
                </div>

                {/* Vials Used Section */}
                {vials && vials.length > 0 && (
                    <div>
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: theme.text }}>
                            <Package size={16} />
                            Vials Used
                        </h3>
                        <div className="space-y-2">
                            {vials.map((vial, index) => {
                                const stockpileItem = stockpile?.find(s => s.id === vial.vialId || s.id === vial.stockpileId);
                                return (
                                    <div
                                        key={index}
                                        className="p-4 rounded-lg"
                                        style={{
                                            backgroundColor: theme.isDark ? '#1f2937' : theme.cardBackground,
                                            border: `1px solid ${theme.border}`
                                        }}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="font-medium mb-1" style={{ color: theme.text }}>
                                                    {vial.name || stockpileItem?.name || 'Unknown Peptide'}
                                                </div>
                                                <div className="flex flex-wrap gap-3 text-xs" style={{ color: theme.textLight }}>
                                                    {vial.mg && (
                                                        <span className="flex items-center gap-1">
                                                            <FlaskConical size={12} />
                                                            {vial.mg}mg
                                                        </span>
                                                    )}
                                                    {vial.vendor && (
                                                        <span>{vial.vendor}</span>
                                                    )}
                                                    {vial.cost && (
                                                        <span className="flex items-center gap-1">
                                                            <DollarSign size={12} />
                                                            ${Number(vial.cost).toFixed(2)}
                                                        </span>
                                                    )}
                                                </div>
                                                {vial.reconstitutionDate && (
                                                    <div className="mt-2 text-xs" style={{ color: theme.textLight }}>
                                                        Reconstituted: {formatMMDDYYYY(vial.reconstitutionDate)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Vials Added During Protocol */}
                {vialsAddedDuring && vialsAddedDuring.length > 0 && (
                    <div>
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: theme.text }}>
                            <Package size={16} />
                            Vials Added During Protocol
                        </h3>
                        <div className="space-y-2">
                            {vialsAddedDuring.map((vial, index) => {
                                const stockpileItem = stockpile?.find(s => s.id === vial.vialId || s.id === vial.stockpileId);
                                return (
                                    <div
                                        key={index}
                                        className="p-4 rounded-lg"
                                        style={{
                                            backgroundColor: theme.isDark ? '#1f2937' : theme.cardBackground,
                                            border: `1px solid ${theme.border}`
                                        }}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="font-medium mb-1" style={{ color: theme.text }}>
                                                    {vial.name || stockpileItem?.name || 'Unknown Peptide'}
                                                </div>
                                                <div className="flex flex-wrap gap-3 text-xs" style={{ color: theme.textLight }}>
                                                    {vial.mg && (
                                                        <span className="flex items-center gap-1">
                                                            <FlaskConical size={12} />
                                                            {vial.mg}mg
                                                        </span>
                                                    )}
                                                    {vial.vendor && (
                                                        <span>{vial.vendor}</span>
                                                    )}
                                                </div>
                                                {vial.addedDate && (
                                                    <div className="mt-2 text-xs" style={{ color: theme.textLight }}>
                                                        Added: {formatMMDDYYYY(vial.addedDate)}
                                                    </div>
                                                )}
                                                {vial.reconstitutionDate && (
                                                    <div className="mt-1 text-xs" style={{ color: theme.textLight }}>
                                                        Reconstituted: {formatMMDDYYYY(vial.reconstitutionDate)}
                                                    </div>
                                                )}
                                            </div>
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
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: theme.text }}>
                            <FlaskConical size={16} />
                            Reconstitution Details
                        </h3>
                        <div
                            className="p-4 rounded-lg"
                            style={{
                                backgroundColor: theme.isDark ? '#1f2937' : theme.cardBackground,
                                border: `1px solid ${theme.border}`
                            }}
                        >
                            {reconstitutionData.reconStrategy && (
                                <div className="mb-2 text-sm" style={{ color: theme.text }}>
                                    <span className="font-medium">Strategy:</span>{' '}
                                    <span style={{ color: theme.textLight }}>
                                        {reconstitutionData.reconStrategy === 'separate' ? 'Separate' : 'Blended'}
                                    </span>
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

                {/* Protocol Summary */}
                {protocolData && (
                    <div>
                        <h3 className="text-sm font-semibold mb-3" style={{ color: theme.text }}>
                            Protocol Summary
                        </h3>
                        <div
                            className="p-4 rounded-lg"
                            style={{
                                backgroundColor: theme.isDark ? '#1f2937' : theme.cardBackground,
                                border: `1px solid ${theme.border}`
                            }}
                        >
                            {protocolData.protocolName && (
                                <div className="mb-2">
                                    <span className="text-xs font-medium uppercase tracking-wider" style={{ color: theme.textLight }}>
                                        Name:
                                    </span>
                                    <div className="text-sm font-semibold mt-1" style={{ color: theme.text }}>
                                        {protocolData.protocolName}
                                    </div>
                                </div>
                            )}
                            {protocolData.duration && !protocolData.duration.noEnd && (
                                <div className="mb-2">
                                    <span className="text-xs font-medium uppercase tracking-wider" style={{ color: theme.textLight }}>
                                        Planned Duration:
                                    </span>
                                    <div className="text-sm mt-1" style={{ color: theme.text }}>
                                        {protocolData.duration.count} {protocolData.duration.unit}
                                    </div>
                                </div>
                            )}
                            {protocolData.peptides && protocolData.peptides.length > 0 && (
                                <div>
                                    <span className="text-xs font-medium uppercase tracking-wider" style={{ color: theme.textLight }}>
                                        Compounds ({protocolData.peptides.length}):
                                    </span>
                                    <div className="mt-2 space-y-1">
                                        {protocolData.peptides.map((pep, idx) => (
                                            <div key={idx} className="text-sm" style={{ color: theme.text }}>
                                                • {pep.name || 'Unnamed'}
                                                {pep.dosage && (
                                                    <span className="ml-2" style={{ color: theme.textLight }}>
                                                        ({pep.dosage.amount} {pep.dosage.unit})
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
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
    );
}

