import React, { useState } from 'react';
import { formatMMDDYYYY } from '../../utils/date';
import { Play, Calendar, Target, Clock, FileText, Droplet, Repeat, RotateCw, Layers, TrendingUp, Edit as EditIcon, Share2, History } from 'lucide-react';
import ShareModal from '../common/ShareModal';

const formatIndividualFrequency = (freq) => {
    if (!freq) return 'Not set';
    if (freq.type === 'weekly' && freq.days?.length > 0) return `Weekly: ${freq.days.join(', ')}`;
    if (freq.type === 'cycle') return `Cycle: ${freq.onDays || '-'} on / ${freq.offDays || '-'} off`;
    return 'Daily';
};

const formatTitration = (titration) => {
    if (!Array.isArray(titration) || titration.length === 0) return null;
    return titration.map(t => 
        `${t.dose}${t.doseUnit} for ${t.durationCount} ${t.durationUnit}`
    ).join(' → ');
}

export default function ProtocolCard({ item: p, theme, isActive, onStartClick, onEditClick, onHistoryClick, isPublicView = false }) {
    const [isShareModalOpen, setShareModalOpen] = useState(false);
    
    const handleShare = () => {
        setShareModalOpen(true);
    };

    return (
        <>
            <div className="p-4 rounded-lg border content-card shadow-sm flex flex-col" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                <div className="flex-grow">
                    <div className="flex items-start justify-between">
                        <div className="font-semibold text-base">{p.protocolName || 'Unnamed Protocol'}</div>
                        {!isPublicView && isActive && <div className="px-2 py-1 text-xs font-semibold rounded-full flex-shrink-0" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}>Active</div>}
                    </div>
                    
                    <div className="space-y-1 mt-2 text-sm" style={{ color: theme.textLight }}>
                        <div className="flex items-start gap-2"><Target size={14} className="mt-0.5 flex-shrink-0" /><span>{p.purpose || 'No purpose defined'}</span></div>
                    </div>
                    
                    <hr className="my-3" style={{ borderColor: theme.border }} />

                    <div className="space-y-3">
                        {p.peptides?.map((peptide, index) => (
                            <div key={peptide.id || index} className="text-sm p-2 rounded-md bg-gray-50/70">
                                <div className="font-semibold" style={{color: theme.text}}>{peptide.name || 'Unnamed Peptide'}</div>
                                <div className="text-xs space-y-1 mt-1">
                                    {peptide.dosage?.amount > 0 && (<div className="flex items-center gap-1.5"><Droplet size={12} /><span>{peptide.dosage.amount} {peptide.dosage.unit}</span></div>)}
                                    {peptide.frequency && (<div className="flex items-center gap-1.5"><Repeat size={12} /><span>{formatIndividualFrequency(peptide.frequency)}</span></div>)}
                                    {peptide.titration?.length > 0 && (<div className="flex items-start gap-1.5"><TrendingUp size={12} className="mt-0.5" /><span className="text-gray-500">{formatTitration(peptide.titration)}</span></div>)}
                                </div>
                            </div>
                        ))}
                    </div>

                    { (p.notes) && <hr className="my-3" style={{ borderColor: theme.border }} /> }
                    
                    <div className="space-y-2 mt-2 text-sm" style={{ color: theme.textLight }}>
                        {isActive && (
                            <div className="flex items-start gap-2">
                                <Calendar size={14} className="mt-0.5 flex-shrink-0" />
                                <span>{renderDateRange(p)}</span>
                            </div>
                        )}
                        <div className="flex items-start gap-2"><Clock size={14} className="mt-0.5 flex-shrink-0" /><span>{p.duration?.noEnd ? 'Ongoing' : (p.duration?.count && p.duration?.unit ? `${p.duration.count} ${p.duration.unit}${p.duration.count > 1 ? 's' : ''}` : 'Duration not set')}</span></div>
                        {p.washout?.enabled && p.washout?.count > 0 && (<div className="flex items-start gap-2"><RotateCw size={14} className="mt-0.5 flex-shrink-0" /><span>Washout: {p.washout.count} {p.washout.unit}{p.washout.count > 1 ? 's' : ''}</span></div>)}
                        {p.notes && (<div className="flex items-start gap-2"><FileText size={14} className="mt-0.5 flex-shrink-0" /><p className="text-xs italic border-l-2 pl-2" style={{ borderColor: theme.border }}>{p.notes}</p></div>)}
                    </div>
                </div>

                {!isPublicView && (
                    <div className="mt-4 flex items-center gap-2">
                        <button
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-semibold hover:opacity-90 transition-all"
                            style={{ backgroundColor: isActive ? theme.accent : theme.primary, color: isActive ? theme.accentText : theme.textOnPrimary }}
                            onClick={() => onStartClick(p, { manage: isActive })}
                        >
                            <Play size={16} />
                            {isActive ? 'Manage' : 'Start Protocol'}
                        </button>
                        <button data-tour="protocol-share" onClick={handleShare} className="p-2 rounded-md hover-bg-gray-100 flex-shrink-0" aria-label="Share"><Share2 className="h-4 w-4" /></button>
                        <button className="p-2 rounded-md hover-bg-gray-100 flex-shrink-0" aria-label="History" onClick={() => onHistoryClick(p)}><History className="h-4 w-4" /></button>
                        <button className="p-2 rounded-md hover-bg-gray-100 flex-shrink-0" aria-label="Edit" onClick={() => onEditClick(p)}><EditIcon className="h-4 w-4" /></button>
                    </div>
                )}
            </div>

            <ShareModal
                open={isShareModalOpen}
                onClose={() => setShareModalOpen(false)}
                theme={theme}
                title="Protocol"
                shareUrl={`${window.location.origin}/rover/protocols/${p.id}`}
                CardComponent={ProtocolCard}
                cardProps={{ item: p, theme, isPublicView: true }}
                shareData={{ ...p, type: 'protocol' }}
            />
        </>
    );
}

function renderDateRange(p) {
    if (!p?.startDate) return 'Not started'
    const start = new Date(p.startDate)
    // Base end
    let end = p.endDate ? new Date(p.endDate) : null
    if (!end && p.duration && !p.duration.noEnd && p.duration.count > 0 && p.duration.unit) {
        end = new Date(start)
        const unit = String(p.duration.unit).toLowerCase()
        const count = Number(p.duration.count) || 0
        if (unit.includes('day')) end.setDate(end.getDate() + count - 1)
        else if (unit.includes('week')) end.setDate(end.getDate() + (count * 7) - 1)
        else if (unit.includes('month')) { end.setMonth(end.getMonth() + count); end.setDate(end.getDate() - 1) }
    }
    // Guard: never earlier than start
    if (end && end < start) end = new Date(start)
    // Apply washout if enabled
    let washEnd = null
    if (end && p.washout?.enabled && p.washout?.count > 0 && p.washout?.unit) {
        const wStart = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1)
        washEnd = new Date(wStart)
        const wUnit = String(p.washout.unit).toLowerCase()
        const wCount = Number(p.washout.count) || 0
        if (wUnit.includes('day')) washEnd.setDate(washEnd.getDate() + wCount - 1)
        else if (wUnit.includes('week')) washEnd.setDate(washEnd.getDate() + (wCount * 7) - 1)
        else if (wUnit.includes('month')) { washEnd.setMonth(washEnd.getMonth() + wCount); washEnd.setDate(washEnd.getDate() - 1) }
    }
    const displayEnd = washEnd || end
    const startStr = formatMMDDYYYY(start)
    const endStr = displayEnd ? formatMMDDYYYY(displayEnd) : 'Ongoing'
    return `${startStr} - ${endStr}`
}
