import React, { useState } from 'react';
import { formatMMDDYYYY } from '../../utils/date';
import { Play, CirclePlay, Target, Clock, FileText, Repeat, CalendarClock, RotateCw, Layers, TrendingUp, Edit as EditIcon, Share2, History, Pen, Pipette, NotebookPen } from 'lucide-react';
import ShareModal from '../common/ShareModal';
import { getChromeGradient } from '../../utils/recon';
import { penColors } from '../../utils/penColors';
import ProtocolNotesModal from './ProtocolNotesModal';
import { findActiveProtocolHistoryEntry } from '../../utils/protocolHistory';

const formatIndividualFrequency = (freq) => {
    if (!freq) return 'Not set';
    if (freq.type === 'weekly' && freq.days?.length > 0) return `Weekly: ${freq.days.join(', ')}`;
    if (freq.type === 'cycle') return `Cycle: ${freq.onDays || '-'} on / ${freq.offDays || '-'} off`;
    if (freq.type === 'custom') {
        const customDays = freq.customDays || '';
        return customDays ? `Every ${customDays} days` : 'Every X days';
    }
    if (freq.type === 'daily') {
        if (freq.time && Array.isArray(freq.time) && freq.time.length > 0) {
            return `Daily: ${freq.time.join(', ')}`;
        }
        return 'Daily';
    }
    return 'Daily';
};

const formatTitration = (titration) => {
    if (!Array.isArray(titration) || titration.length === 0) return null;
    return titration.map(t => 
        `${t.dose}${t.doseUnit} for ${t.durationCount} ${t.durationUnit}`
    ).join(' → ');
}

const formatPenType = (penType) => {
    const penTypes = {
        'savvio': '🖊️ Savvio',
        'novo': '🖊️ Novo',
        'v1': '🖊️ V1',
        'v2': '🖊️ V2',
        'v3': '🖊️ V3',
        'bird-pen': '🖊️ Bird Pen',
        'luxura': '🖊️ Luxura',
        'gansulin': '🖊️ Gansulin',
        'other': '✏️ Other (see notes)'
    };
    return penTypes[penType] || `🖊️ ${penType}`;
}

const ProtocolCard = React.memo(function ProtocolCard({ item: p, theme, isActive, onStartClick, onEditClick, onHistoryClick, isPublicView = false, hasDraftStart = false, compact = false }) {
    const [isShareModalOpen, setShareModalOpen] = useState(false);
    const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
    const [notesCount, setNotesCount] = useState(0);
    const terracottaGradient = 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)';
    const terracottaShadow = theme.isDark ? '0 2px 6px rgba(0, 0, 0, 0.4)' : '0 2px 6px rgba(0, 0, 0, 0.12)';
    
    // Load notes count for active protocols
    React.useEffect(() => {
        if (isActive && p?.id) {
            const activeEntry = findActiveProtocolHistoryEntry(p.id);
            if (activeEntry && Array.isArray(activeEntry.notes)) {
                setNotesCount(activeEntry.notes.length);
            } else {
                setNotesCount(0);
            }
        }
    }, [isActive, p?.id]);
    
    // Listen for notes updates
    React.useEffect(() => {
        const handleNotesUpdate = () => {
            if (isActive && p?.id) {
                const activeEntry = findActiveProtocolHistoryEntry(p.id);
                if (activeEntry && Array.isArray(activeEntry.notes)) {
                    setNotesCount(activeEntry.notes.length);
                }
            }
        };
        
        window.addEventListener('tpp:protocol-history-updated', handleNotesUpdate);
        return () => window.removeEventListener('tpp:protocol-history-updated', handleNotesUpdate);
    }, [isActive, p?.id]);
    
    const handleShare = () => {
        setShareModalOpen(true);
    };

    // Compact layout for inactive protocols (mobile only)
    if (compact && !isActive) {
        return (
            <>
                <div className="p-4 rounded-lg content-card shadow-md flex flex-col widget-card-hover" style={{ backgroundColor: theme.cardBackground }}>
                    <div className="flex-grow">
                        <div className="font-semibold text-base mb-2" style={{ color: theme.text }}>
                            {p.protocolName || 'Unnamed Protocol'}
                        </div>
                        
                        {/* Mobile compact view */}
                        <div className="md:hidden text-sm mb-3" style={{ color: theme.textLight }}>
                            <div className="flex items-center gap-1.5">
                                <Target size={14} className="flex-shrink-0" />
                                <span className="line-clamp-2">{p.purpose || 'No purpose defined'}</span>
                            </div>
                        </div>

                        {/* Desktop full details view */}
                        <div className="hidden md:block">
                            <div className="space-y-1 mt-2 text-sm" style={{ color: theme.textLight }}>
                                <div className="flex items-start gap-2"><Target size={14} className="mt-0.5 flex-shrink-0" /><span>{p.purpose || 'No purpose defined'}</span></div>
                            </div>
                            
                            <hr className="my-3" style={{ borderColor: theme.border }} />

                            {p.peptides && p.peptides.length > 0 && (
                                <div className="space-y-2">
                                    {/* Header row */}
                                    <div className="grid grid-cols-2 gap-3 text-xs font-semibold mb-1" style={{ color: theme.textLight }}>
                                        <div>Peptides</div>
                                        <div>Dosage / Frequency</div>
                                    </div>
                                    {/* Peptide rows */}
                                    {p.peptides.map((peptide, index) => (
                                        <div key={peptide.id || index} className="grid grid-cols-2 gap-3 text-sm">
                                            <div className="font-medium" style={{color: theme.text}}>
                                                {peptide.name || 'Unnamed Peptide'}
                                            </div>
                                            <div className="space-y-1 text-xs" style={{ color: theme.isDark ? theme.textLight : theme.text }}>
                                                {peptide.dosage?.amount > 0 && (
                                                    <div>
                                                        {peptide.dosage.amount} {peptide.dosage.unit}
                                                        {peptide.unitValue && ` (${peptide.unitValue} units)`}
                                                    </div>
                                                )}
                                                {peptide.frequency && (
                                                    <div className="flex items-center gap-1.5">
                                                        <CalendarClock size={12} className="flex-shrink-0" />
                                                        <span>{formatIndividualFrequency(peptide.frequency)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="space-y-2 mt-3 text-sm" style={{ color: theme.textLight }}>
                                {p.duration && (
                                    <div className="flex items-start gap-2">
                                        <CalendarClock size={14} className="mt-0.5 flex-shrink-0" />
                                        <span>{p.duration?.noEnd ? 'Ongoing' : (p.duration?.count && p.duration?.unit ? `${p.duration.count} ${p.duration.unit}${p.duration.count > 1 ? 's' : ''}` : 'Duration not set')}</span>
                                    </div>
                                )}
                                {p.washout?.enabled && p.washout?.count > 0 && (
                                    <div className="flex items-start gap-2">
                                        <RotateCw size={14} className="mt-0.5 flex-shrink-0" />
                                        <span>Washout: {p.washout.count} {p.washout.unit}{p.washout.count > 1 ? 's' : ''}</span>
                                    </div>
                                )}
                                {p.notes && (
                                    <div className="flex items-start gap-2">
                                        <FileText size={14} className="mt-0.5 flex-shrink-0" />
                                        <p className="text-xs italic border-l-2 pl-2 break-words" style={{ borderColor: theme.border, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                            {p.notes}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {!isPublicView && (
                        <div className="mt-3 flex items-center justify-center gap-1.5">
                            <button
                                className="p-2 rounded-md action-button-hover"
                                aria-label={hasDraftStart ? 'Resume Protocol' : 'Start Protocol'}
                                style={{ backgroundColor: theme.primaryDark, color: theme.textOnPrimary }}
                                onClick={() => onStartClick(p, { manage: false })}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.boxShadow = `0 4px 12px ${theme.primaryDark}40`;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                <Play className="h-4 w-4" />
                            </button>
                            <button 
                                onClick={handleShare} 
                                className="p-2 rounded-md action-button-hover" 
                                aria-label="Share"
                                style={{ color: theme.textLight }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : '#f3f4f6';
                                    e.currentTarget.style.color = theme.primary;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.color = theme.textLight;
                                }}
                            >
                                <Share2 className="h-4 w-4" />
                            </button>
                            <button 
                                className="p-2 rounded-md action-button-hover" 
                                aria-label="History" 
                                onClick={() => onHistoryClick(p)}
                                style={{ color: theme.textLight }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : '#f3f4f6';
                                    e.currentTarget.style.color = theme.primary;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.color = theme.textLight;
                                }}
                            >
                                <History className="h-4 w-4" />
                            </button>
                            <button 
                                className="p-2 rounded-md action-button-hover" 
                                aria-label="Edit" 
                                onClick={() => onEditClick(p)}
                                style={{ color: theme.textLight }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : '#f3f4f6';
                                    e.currentTarget.style.color = theme.primary;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.color = theme.textLight;
                                }}
                            >
                                <EditIcon className="h-4 w-4" />
                            </button>
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

    return (
        <>
            <div className="p-4 rounded-lg content-card shadow-md flex flex-col widget-card-hover" style={{ backgroundColor: theme.cardBackground }}>
                <div className="flex-grow">
                    <div className="flex items-start justify-between">
                        <div className="font-semibold text-base">{p.protocolName || 'Unnamed Protocol'}</div>
                        {!isPublicView && isActive && (
                            <div
                                className="px-2 py-1 text-xs font-semibold rounded-full flex-shrink-0 shadow-sm"
                                style={{
                                    background: terracottaGradient,
                                    color: '#ffffff',
                                    boxShadow: terracottaShadow
                                }}
                            >
                                Active
                            </div>
                        )}
                    </div>
                    
                    <div className="space-y-1 mt-2 text-sm" style={{ color: theme.textLight }}>
                        <div className="flex items-start gap-2"><Target size={14} className="mt-0.5 flex-shrink-0" /><span>{p.purpose || 'No purpose defined'}</span></div>
                    </div>
                    
                    <hr className="my-3" style={{ borderColor: theme.border }} />

                    {p.peptides && p.peptides.length > 0 && (
                        <div className="space-y-2">
                            {/* Header row */}
                            <div className="grid grid-cols-2 gap-3 text-xs font-semibold mb-1" style={{ color: theme.textLight }}>
                                <div>Peptides</div>
                                <div>Dosage / Frequency</div>
                            </div>
                            {/* Peptide rows */}
                            {p.peptides.map((peptide, index) => (
                                <div key={peptide.id || index} className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="font-medium" style={{color: theme.text}}>
                                        {peptide.name || 'Unnamed Peptide'}
                                    </div>
                                    <div className="space-y-1 text-xs" style={{ color: theme.isDark ? theme.textLight : theme.text }}>
                                        {peptide.dosage?.amount > 0 && (
                                            <div>
                                                {peptide.dosage.amount} {peptide.dosage.unit}
                                                {peptide.unitValue && ` (${peptide.unitValue} units)`}
                                            </div>
                                        )}
                                        {peptide.frequency && (
                                            <div className="flex items-center gap-1.5">
                                                <CalendarClock size={12} className="flex-shrink-0" />
                                                <span>{formatIndividualFrequency(peptide.frequency)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    { (p.notes) && <hr className="my-3" style={{ borderColor: theme.border }} /> }
                    
                    <div className="space-y-2 mt-2 text-sm" style={{ color: theme.textLight }}>
                        {isActive && (() => {
                            const deliveryMethods = p.peptides && p.peptides.length > 0 ? [...new Set(p.peptides.map(pep => pep.deliveryMethod || 'syringe'))] : [];
                            const penPeptides = p.peptides ? p.peptides.filter(pep => (pep.deliveryMethod || 'syringe') === 'pen') : [];
                            
                            return (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex items-start gap-2">
                                        <CirclePlay size={14} className="mt-0.5 flex-shrink-0" />
                                        <span>{renderDateRange(p, isActive)}</span>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {deliveryMethods.length > 0 ? (
                                            deliveryMethods.map(method => (
                                                <div key={method} className="flex items-start gap-2">
                                                    {method === 'pen' ? <Pen size={14} className="mt-0.5 flex-shrink-0" /> : <Pipette size={14} className="mt-0.5 flex-shrink-0" />}
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-sm font-medium">
                                                            {method === 'pen' ? 'Pen Delivery' : 'Syringe Delivery'}
                                                        </span>
                                                        {method === 'pen' && penPeptides.map((pep, idx) => (
                                                            <div key={idx} className="flex items-center gap-2 text-xs">
                                                                {pep.penType && (
                                                                    <span className="px-2 py-1 rounded" style={{ backgroundColor: theme.secondary, color: theme.text }}>
                                                                        {pep.penType === 'other' ? 'Other' : 
                                                                            pep.penType === 'savvio' ? 'Savvio' :
                                                                            pep.penType === 'novo' ? 'Novo' :
                                                                            pep.penType === 'v1' ? 'V1' :
                                                                            pep.penType === 'v2' ? 'V2' :
                                                                            pep.penType === 'v3' ? 'V3' :
                                                                            pep.penType === 'bird-pen' ? 'Bird Pen' :
                                                                            pep.penType === 'luxura' ? 'Luxura' :
                                                                            pep.penType === 'gansulin' ? 'Gansulin' :
                                                                            pep.penType
                                                                        }
                                                                    </span>
                                                                )}
                                                                {pep.penColor && (() => {
                                                                    const colorInfo = penColors.find(c => c.name === pep.penColor);
                                                                    if (colorInfo) {
                                                                        return (
                                                                            <div 
                                                                                className="w-4 h-4 rounded-full border-2" 
                                                                                style={{ 
                                                                                    background: getChromeGradient(colorInfo.hex),
                                                                                    borderColor: colorInfo.hex
                                                                                }}
                                                                                title={`${pep.penColor} Pen`}
                                                                            />
                                                                        );
                                                                    }
                                                                    return null;
                                                                })()}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <span>-</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}
                        {isActive && (() => {
                            // Find cycle frequency from peptides
                            const cyclePeptide = p.peptides?.find(pep => pep.frequency?.type === 'cycle');
                            const cycleInfo = cyclePeptide?.frequency ? formatIndividualFrequency(cyclePeptide.frequency) : null;
                            
                            return (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex items-start gap-2">
                                        <CalendarClock size={14} className="mt-0.5 flex-shrink-0" />
                                        <span>{p.duration?.noEnd ? 'Ongoing' : (p.duration?.count && p.duration?.unit ? `${p.duration.count} ${p.duration.unit}${p.duration.count > 1 ? 's' : ''}` : 'Duration not set')}</span>
                                    </div>
                                    {cycleInfo && (
                                        <div className="flex items-start gap-2">
                                            <Repeat size={14} className="mt-0.5 flex-shrink-0" />
                                            <span>{cycleInfo}</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                        {p.washout?.enabled && p.washout?.count > 0 && (<div className="flex items-start gap-2"><RotateCw size={14} className="mt-0.5 flex-shrink-0" /><span>Washout: {p.washout.count} {p.washout.unit}{p.washout.count > 1 ? 's' : ''}</span></div>)}
                        {p.notes && (
                            <div className="flex items-start gap-2">
                                <FileText size={14} className="mt-0.5 flex-shrink-0" />
                                <p className="text-xs italic border-l-2 pl-2 break-words" style={{ borderColor: theme.border, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                    {p.notes}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {!isPublicView && (
                    <div className="mt-4 flex items-center gap-2">
                        <button
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-semibold action-button-hover"
                            style={{ backgroundColor: isActive ? theme.accent : theme.primaryDark, color: isActive ? theme.accentText : theme.textOnPrimary }}
                            onClick={() => onStartClick(p, { manage: isActive })}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = `0 4px 12px ${isActive ? theme.accent + '40' : theme.primaryDark + '40'}`;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            <Play size={16} className="icon-hover" />
                            <span className="text-hover">
                                {isActive ? 'Manage' : (hasDraftStart ? 'Drafted Start' : 'Start Protocol')}
                            </span>
                        </button>
                        {isActive && (
                            <button 
                                className="p-2 rounded-md flex-shrink-0 action-button-hover relative" 
                                aria-label="Notes" 
                                onClick={() => setIsNotesModalOpen(true)}
                                style={{ color: theme.textLight }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : '#f3f4f6';
                                    e.currentTarget.style.color = theme.primary;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.color = theme.textLight;
                                }}
                            >
                                <NotebookPen className="h-4 w-4 icon-hover" />
                                {notesCount > 0 && (
                                    <span 
                                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-xs font-bold flex items-center justify-center"
                                        style={{ 
                                            backgroundColor: theme.primary, 
                                            color: theme.textOnPrimary,
                                            fontSize: '10px'
                                        }}
                                    >
                                        {notesCount}
                                    </span>
                                )}
                            </button>
                        )}
                        <button 
                            data-tour="protocol-share" 
                            onClick={handleShare} 
                            className="p-2 rounded-md flex-shrink-0 action-button-hover" 
                            aria-label="Share"
                            style={{ color: theme.textLight }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : '#f3f4f6';
                                e.currentTarget.style.color = theme.primary;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = theme.textLight;
                            }}
                        >
                            <Share2 className="h-4 w-4 icon-hover" />
                        </button>
                        <button 
                            className="p-2 rounded-md flex-shrink-0 action-button-hover" 
                            aria-label="History" 
                            onClick={() => onHistoryClick(p)}
                            style={{ color: theme.textLight }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : '#f3f4f6';
                                e.currentTarget.style.color = theme.primary;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = theme.textLight;
                            }}
                        >
                            <History className="h-4 w-4 icon-hover" />
                        </button>
                        <button 
                            className="p-2 rounded-md flex-shrink-0 action-button-hover" 
                            aria-label="Edit" 
                            onClick={() => onEditClick(p)}
                            style={{ color: theme.textLight }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : '#f3f4f6';
                                e.currentTarget.style.color = theme.primary;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = theme.textLight;
                            }}
                        >
                            <EditIcon className="h-4 w-4 icon-hover" />
                        </button>
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
            
            {isActive && (
                <ProtocolNotesModal
                    open={isNotesModalOpen}
                    onClose={() => setIsNotesModalOpen(false)}
                    protocol={p}
                    theme={theme}
                />
            )}
        </>
    );
});

function renderDateRange(p, isActive) {
    if (!p?.startDate) {
        // If inactive with no history (no start date): blank
        if (!isActive) return ''
        return 'Not started'
    }
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
    
    // If active and no end date: "date started - Current"
    if (isActive && !displayEnd) {
        return `${startStr} - Current`
    }
    
    // If inactive with no history (no end date): blank
    if (!isActive && !displayEnd) {
        return ''
    }
    
    // If inactive with history (has end date): "date - date"
    // If active with end date: "date - date"
    const endStr = formatMMDDYYYY(displayEnd)
    return `${startStr} - ${endStr}`
}

export default ProtocolCard;
