import React, { useState } from 'react';
import { formatMMDDYYYY, parseDateString, normalizeToMidnight, getLocalTimestamp } from '../../utils/date';
import { Play, CirclePlay, Target, Clock, FileText, Repeat, CalendarClock, RotateCw, Layers, TrendingUp, Edit as EditIcon, Share2, History, Pen, Pipette, Droplets, Hand, NotebookPen, Beaker, MoreVertical, Pause, SkipForward } from 'lucide-react';
import { getCurrentTitrationPhase } from '../../utils/calendarTasks';
import ShareModal from '../common/ShareModal';
import { SHARE_BASE_PATH } from '../../utils/share';
import { getChromeGradient } from '../../utils/recon';
import { penColors } from '../../utils/penColors';
import ProtocolNotesModal from './ProtocolNotesModal';
import { findActiveProtocolHistoryEntry } from '../../utils/protocolHistory';

const formatIndividualFrequency = (freq) => {
    if (!freq) return 'Not set';
    if (freq.type === 'weekly' && freq.days?.length > 0) return `Weekly: ${freq.days.join(', ')}`;
    if (freq.type === 'cycle') {
        const cycleStr = `Cycle: ${freq.onDays || '-'} on / ${freq.offDays || '-'} off`;
        const timeStr = freq.time && Array.isArray(freq.time) && freq.time.length > 0 ? ` ${freq.time.join('/')}` : '';
        return cycleStr + timeStr;
    }
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
        t.durationUnit === 'ongoing'
            ? `${t.dose}${t.doseUnit} ongoing`
            : `${t.dose}${t.doseUnit} for ${t.durationCount} ${t.durationUnit}`
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

const SectionDivider = ({ label, theme, icon }) => (
    <div className="flex items-center gap-2 my-3 opacity-60">
        {icon && <div style={{ color: theme.textLight }}>{icon}</div>}
        <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: theme.textLight }}>
            {label}
        </span>
        <div className="h-[1px] flex-1" style={{ backgroundColor: theme.border }} />
    </div>
);

const ProtocolCard = React.memo(function ProtocolCard({ item: p, theme, isActive, onStartClick, onEditClick, onHistoryClick, isPublicView = false, hasDraftStart = false, compact = false, onUpdateProtocol }) {
    const [isShareModalOpen, setShareModalOpen] = useState(false);
    const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
    const [notesCount, setNotesCount] = useState(0);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
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

    // Close menu when clicking outside
    React.useEffect(() => {
        if (isMenuOpen) {
            const handleClickOutside = (e) => {
                if (!e.target.closest('.protocol-menu-container')) {
                    setIsMenuOpen(false);
                }
            };
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [isMenuOpen]);
    
    const handleShare = () => {
        setShareModalOpen(true);
    };

    // Compact layout for inactive protocols: simple details (mobile-style) on all viewports
    if (compact && !isActive) {
        return (
            <>
                <div 
                    className="p-4 rounded-lg glass-panel-minimal shadow-md flex flex-col widget-card-hover cursor-pointer" 
                    style={{}}
                    onClick={() => !isPublicView && onEditClick(p)}
                >
                    <div className="flex-grow">
                        <div className="font-semibold text-base mb-2" style={{ color: theme.text }}>
                            {p.protocolName || 'Unnamed Protocol'}
                        </div>
                        <div className="text-sm mb-3" style={{ color: theme.textLight }}>
                            <div className="flex items-center gap-1.5">
                                <Target size={14} className="flex-shrink-0" />
                                <span className="line-clamp-2">{p.purpose || 'No purpose defined'}</span>
                            </div>
                        </div>
                    </div>

                    {!isPublicView && (
                        <div className="mt-3 flex items-center justify-center gap-1.5">
                            <button
                                className="px-4 py-1.5 rounded-lg action-button-hover flex items-center justify-center min-w-[60px] transition-all"
                                aria-label={hasDraftStart ? 'Resume Protocol' : 'Start Protocol'}
                                style={{ 
                                    backgroundColor: theme.primary, 
                                    color: '#ffffff',
                                    boxShadow: `0 2px 8px ${theme.primary}30`
                                }}
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent card's onClick from firing
                                    onStartClick(p, { manage: false });
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.boxShadow = `0 4px 12px ${theme.primary}50`;
                                    e.currentTarget.style.opacity = '0.95';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = `0 2px 8px ${theme.primary}30`;
                                    e.currentTarget.style.opacity = '1';
                                }}
                            >
                                <span className="text-xs font-semibold uppercase tracking-wider whitespace-nowrap">{hasDraftStart ? 'RESUME' : 'START'}</span>
                            </button>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent card's onClick from firing
                                    handleShare();
                                }} 
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
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent card's onClick from firing
                                    onHistoryClick(p);
                                }}
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
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent card's onClick from firing
                                    onEditClick(p);
                                }}
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
                    shareUrl={`${window.location.origin}${SHARE_BASE_PATH}/protocols/${p.id}`}
                    CardComponent={ProtocolCard}
                    cardProps={{ item: p, theme, isPublicView: true }}
                    shareData={{ ...p, type: 'protocol' }}
                />
            </>
        );
    }

    return (
        <>
            <div 
                className={`p-4 rounded-lg glass-panel-minimal shadow-md flex flex-col widget-card-hover cursor-pointer transition-all ${isActive ? 'ring-1' : ''}`}
                style={{ 
                    borderColor: isActive ? `${theme.primary}30` : 'transparent'
                }}
                onClick={() => {
                    if (isPublicView) return;
                    // Active protocols: open manage view
                    // Inactive protocols: open edit/details view
                    if (isActive) {
                        onStartClick(p, { manage: true });
                    } else {
                        onEditClick(p);
                    }
                }}
            >
                <div className="flex-grow">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h3 className="font-semibold text-lg leading-tight" style={{ color: theme.text }}>
                                    {p.protocolName || 'Unnamed Protocol'}
                                </h3>
                                {isActive && p.startDate && (
                                    <div className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider opacity-60" style={{ color: theme.textLight }}>
                                        <Clock size={12} />
                                        <span>Active since {formatMMDDYYYY(parseDateString(p.startDate))}</span>
                                    </div>
                                )}
                                {isActive && p.quickStart && (!p.linkedItems || Object.keys(p.linkedItems).length === 0) && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onStartClick(p, { manage: true, tab: 'edit' });
                                        }}
                                        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all hover:scale-105"
                                        style={{ 
                                            backgroundColor: theme.primary + '15',
                                            color: theme.primary,
                                            border: `1px solid ${theme.primary}40`
                                        }}
                                    >
                                        🔗 Link Vials
                                    </button>
                                )}
                            </div>
                        </div>

                        {!isPublicView && (
                            <div className="relative protocol-menu-container">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsMenuOpen(!isMenuOpen);
                                    }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    className="p-1.5 rounded-lg hover:bg-opacity-10 transition-colors"
                                    style={{ color: theme.textLight }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                >
                                    <MoreVertical size={18} />
                                </button>
                                {isMenuOpen && (
                                    <>
                                        <div className="fixed inset-0 z-[100]" onClick={() => setIsMenuOpen(false)} />
                                        <div 
                                            className="absolute right-0 top-full mt-1 rounded-lg shadow-xl z-[101] min-w-[160px] overflow-hidden"
                                            style={{ 
                                                backgroundColor: theme.cardBackground,
                                                border: `1px solid ${theme.border}`,
                                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsMenuOpen(false);
                                                    onStartClick(p, { manage: isActive });
                                                }}
                                                className="hidden md:flex w-full items-center gap-2 px-3 py-2.5 text-sm hover:bg-opacity-10 transition-colors text-left border-b"
                                                style={{ 
                                                    color: theme.text,
                                                    borderColor: theme.border
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                }}
                                            >
                                                <Play size={16} />
                                                <span>{isActive ? 'Manage Protocol' : (hasDraftStart ? 'Resume Draft' : 'Start Research')}</span>
                                            </button>
                                            {isActive && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setIsMenuOpen(false);
                                                        setIsNotesModalOpen(true);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-opacity-10 transition-colors text-left border-b"
                                                    style={{ 
                                                        color: theme.text,
                                                        borderColor: theme.border
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.backgroundColor = 'transparent';
                                                    }}
                                                >
                                                    <NotebookPen size={16} />
                                                    <span>Notes</span>
                                                    {notesCount > 0 && (
                                                        <span 
                                                            className="ml-auto px-1.5 py-0.5 rounded-full text-xs font-bold"
                                                            style={{ 
                                                                backgroundColor: theme.primary, 
                                                                color: theme.textOnPrimary
                                                            }}
                                                        >
                                                            {notesCount}
                                                        </span>
                                                    )}
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsMenuOpen(false);
                                                    handleShare();
                                                }}
                                                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-opacity-10 transition-colors text-left border-b"
                                                style={{ 
                                                    color: theme.text,
                                                    borderColor: theme.border
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                }}
                                            >
                                                <Share2 size={16} />
                                                <span>Share</span>
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsMenuOpen(false);
                                                    onHistoryClick(p);
                                                }}
                                                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-opacity-10 transition-colors text-left border-b"
                                                style={{ 
                                                    color: theme.text,
                                                    borderColor: theme.border
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                }}
                                            >
                                                <History size={16} />
                                                <span>History</span>
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsMenuOpen(false);
                                                    onEditClick(p);
                                                }}
                                                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-opacity-10 transition-colors text-left"
                                                style={{ color: theme.text }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                }}
                                            >
                                                <EditIcon size={16} />
                                                <span>Edit</span>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {isActive ? (
                        /* NEW HIERARCHY FOR ACTIVE CARDS */
                        <>
                            <SectionDivider label="RESEARCH LOG" theme={theme} icon={<FileText size={12} />} />
                            
                            <div className="space-y-3 px-1">
                                {p.purpose && (
                                    <div className="flex items-start gap-2.5">
                                        <Target size={14} className="mt-0.5 opacity-50" style={{ color: theme.textLight }} />
                                        <p className="text-sm leading-relaxed" style={{ color: theme.text }}>
                                            {p.purpose}
                                        </p>
                                    </div>
                                )}
                                
                                {/* Only show date range if protocol has an end date (not ongoing) */}
                                {(() => {
                                    const dateRange = renderDateRange(p, isActive);
                                    const isOngoing = p.duration?.noEnd || (!p.endDate && isActive);
                                    // Hide date range section for ongoing protocols
                                    if (isOngoing || !dateRange) return null;
                                    return (
                                        <div className="flex items-center gap-2.5">
                                            <Clock size={14} className="opacity-50" style={{ color: theme.textLight }} />
                                            <span className="text-sm font-medium" style={{ color: theme.text }}>
                                                {dateRange}
                                            </span>
                                        </div>
                                    );
                                })()}
                            </div>

                            <SectionDivider label="PEPTIDES" theme={theme} icon={<Beaker size={12} />} />
                            
                            <div className="space-y-4 px-1">
                                {p.peptides && p.peptides.length > 0 ? (
                                    p.peptides.map((peptide, index) => (
                                        <div key={peptide.id || index} className="flex items-stretch gap-3">
                                            {/* Colored vertical line instead of square */}
                                            <div 
                                                className="w-1 rounded-full flex-shrink-0" 
                                                style={{ 
                                                    backgroundColor: peptide.capColor || theme.primary,
                                                    opacity: peptide.capColor ? 1 : 0.3
                                                }} 
                                            />
                                            
                                            <div className="flex-1 py-0.5">
                                                {(() => {
                                                    const currentPhase = getCurrentTitrationPhase(p, peptide);
                                                    const hasTitration = peptide.titration && Array.isArray(peptide.titration) && peptide.titration.length > 0;
                                                    // Show current phase dose if in titration, otherwise base dose
                                                    const displayDose = currentPhase ? currentPhase.dose : peptide.dosage?.amount;
                                                    const displayUnit = currentPhase ? currentPhase.unit : peptide.dosage?.unit;
                                                    
                                                    return (
                                                        <>
                                                            <div className="font-semibold text-sm flex items-center gap-2" style={{ color: theme.text }}>
                                                                {peptide.name || 'Unnamed Peptide'}
                                                                {peptide.emoji && <span className="text-base leading-none">{peptide.emoji}</span>}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[12px] mt-0.5" style={{ color: theme.textLight }}>
                                                                {displayDose && (
                                                                    <span>{displayDose} {displayUnit}</span>
                                                                )}
                                                                {(displayDose && peptide.frequency) && (
                                                                    <span className="opacity-30">|</span>
                                                                )}
                                                                {peptide.frequency && (
                                                                    <span>{formatIndividualFrequency(peptide.frequency)}</span>
                                                                )}
                                                            </div>
                                                            {/* Titration phase indicator + controls */}
                                                            {hasTitration && currentPhase && (
                                                                <div className="mt-1.5 space-y-1.5">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <TrendingUp size={10} style={{ color: theme.primary }} />
                                                                        <span className="text-[10px] font-medium" style={{ color: theme.primary }}>
                                                                            Phase {currentPhase.phaseIndex + 1}/{currentPhase.totalPhases}
                                                                        </span>
                                                                        {currentPhase.isHeld ? (
                                                                            <span className="text-[10px] font-medium" style={{ color: '#c87a5c' }}>
                                                                                · HELD
                                                                            </span>
                                                                        ) : currentPhase.daysRemainingInPhase !== null ? (
                                                                            <span className="text-[10px] opacity-60" style={{ color: theme.textLight }}>
                                                                                · {currentPhase.daysRemainingInPhase}d remaining
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-[10px] opacity-60" style={{ color: theme.textLight }}>
                                                                                · maintenance
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {/* Titration controls */}
                                                                    {onUpdateProtocol && isActive && (
                                                                        <div className="flex items-center justify-center gap-1.5">
                                                                            {/* Hold / Resume button */}
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    const isResuming = !!peptide.titrationHeldAt;
                                                                                    const updatedPeptides = p.peptides.map(pep => {
                                                                                        if (pep.id !== peptide.id && pep.name !== peptide.name) return pep;
                                                                                        if (pep.titrationHeldAt) {
                                                                                            // RESUME: Calculate days held and add to offset
                                                                                            const now = new Date();
                                                                                            const heldAt = new Date(pep.titrationHeldAt);
                                                                                            const heldDays = Math.floor((now - heldAt) / (1000 * 60 * 60 * 24));
                                                                                            return {
                                                                                                ...pep,
                                                                                                titrationHeldAt: null,
                                                                                                titrationDaysOffset: (Number(pep.titrationDaysOffset) || 0) - heldDays
                                                                                            };
                                                                                        } else {
                                                                                            // HOLD: Save current date
                                                                                            const today = new Date();
                                                                                            const yyyy = today.getFullYear();
                                                                                            const mm = String(today.getMonth() + 1).padStart(2, '0');
                                                                                            const dd = String(today.getDate()).padStart(2, '0');
                                                                                            return {
                                                                                                ...pep,
                                                                                                titrationHeldAt: `${yyyy}-${mm}-${dd}`
                                                                                            };
                                                                                        }
                                                                                    });
                                                                                    const phaseEvent = {
                                                                                        type: isResuming ? 'resumed' : 'held',
                                                                                        peptideId: peptide.id,
                                                                                        peptideName: peptide.name,
                                                                                        phaseIndex: currentPhase.phaseIndex,
                                                                                        date: getLocalTimestamp()
                                                                                    };
                                                                                    onUpdateProtocol({ ...p, peptides: updatedPeptides }, { phaseEvent });
                                                                                }}
                                                                                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors"
                                                                                style={{
                                                                                    backgroundColor: currentPhase.isHeld 
                                                                                        ? `${theme.success || '#22c55e'}15`
                                                                                        : '#c87a5c28',
                                                                                    color: currentPhase.isHeld 
                                                                                        ? (theme.success || '#22c55e')
                                                                                        : '#c87a5c',
                                                                                    border: `1px solid ${currentPhase.isHeld 
                                                                                        ? (theme.success || '#22c55e') 
                                                                                        : '#c87a5c99'}`
                                                                                }}
                                                                            >
                                                                                {currentPhase.isHeld ? (
                                                                                    <><Play size={8} /> Resume</>
                                                                                ) : (
                                                                                    <><Pause size={8} /> Hold Phase</>
                                                                                )}
                                                                            </button>
                                                                            
                                                                            {/* Skip to Next Phase button - only if not on last phase */}
                                                                            {!currentPhase.isMaintenancePhase && currentPhase.phaseIndex < currentPhase.totalPhases - 1 && (
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        const updatedPeptides = p.peptides.map(pep => {
                                                                                            if (pep.id !== peptide.id && pep.name !== peptide.name) return pep;
                                                                                            return {
                                                                                                ...pep,
                                                                                                titrationHeldAt: null,
                                                                                                titrationDaysOffset: (Number(pep.titrationDaysOffset) || 0) + (currentPhase.daysRemainingInPhase || 0)
                                                                                            };
                                                                                        });
                                                                                        const phaseEvent = {
                                                                                            type: 'next_phase',
                                                                                            peptideId: peptide.id,
                                                                                            peptideName: peptide.name,
                                                                                            phaseIndex: currentPhase.phaseIndex,
                                                                                            date: getLocalTimestamp()
                                                                                        };
                                                                                        onUpdateProtocol({ ...p, peptides: updatedPeptides }, { phaseEvent });
                                                                                    }}
                                                                                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors"
                                                                                    style={{
                                                                                        backgroundColor: `${theme.primary}15`,
                                                                                        color: theme.primary,
                                                                                        border: `1px solid ${theme.primary}30`
                                                                                    }}
                                                                                >
                                                                                    <SkipForward size={8} /> Next Phase
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {hasTitration && !currentPhase && (
                                                                <div className="flex items-center gap-1.5 mt-1">
                                                                    <TrendingUp size={10} style={{ color: theme.primary }} />
                                                                    <span className="text-[10px] font-medium" style={{ color: theme.primary }}>
                                                                        {peptide.titration.length}-phase titration
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs italic opacity-50">No peptides defined</p>
                                )}
                            </div>

                            <SectionDivider label="RESEARCH DATA" theme={theme} icon={<Layers size={12} />} />
                            
                            <div className="grid grid-cols-2 gap-y-3 gap-x-4 px-1 pb-2">
                                {p.duration && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <CalendarClock size={14} className="opacity-50" style={{ color: theme.textLight }} />
                                        <span style={{ color: theme.text }}>
                                            {p.duration?.noEnd ? 'Ongoing' : `${p.duration.count} ${p.duration.unit}`}
                                        </span>
                                    </div>
                                )}
                                
                                {p.washout?.enabled && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <RotateCw size={14} className="opacity-50" style={{ color: theme.textLight }} />
                                        <span style={{ color: theme.text }}>
                                            {p.washout.count} {p.washout.unit} Washout
                                        </span>
                                    </div>
                                )}

                                {(() => {
                                    const deliveryMethods = p.peptides && p.peptides.length > 0 ? [...new Set(p.peptides.map(pep => pep.deliveryMethod || 'pipette'))] : [];
                                    if (deliveryMethods.length === 0) return null;
                                    const iconMap = { pipette: Pipette, pen: Pen, nasal: Droplets, topical: Hand };
                                    const labelMap = { pipette: 'Syringe', pen: 'Pen', nasal: 'Nasal', topical: 'Topical' };
                                    const primary = deliveryMethods[0];
                                    const Icon = iconMap[primary] || Pipette;
                                    return (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Icon size={14} className="opacity-50" />
                                            <span style={{ color: theme.text }}>
                                                {deliveryMethods.length === 1 
                                                    ? (labelMap[primary] || 'Syringe')
                                                    : 'Mixed'
                                                }
                                            </span>
                                        </div>
                                    );
                                })()}
                            </div>

                            {p.notes && (
                                <div className="mt-2 px-3 py-2 rounded-md text-[11px] italic" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', color: theme.textLight }}>
                                    {p.notes}
                                </div>
                            )}

                            {/* Footer - Image Style */}
                            <div className="mt-6 pt-3 border-t relative flex items-center justify-center" style={{ borderColor: theme.border }}>
                                <div 
                                    className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.15em] opacity-40 hover:opacity-100 transition-opacity cursor-pointer mx-auto"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onStartClick(p, { manage: isActive });
                                    }}
                                >
                                    <span>Manage</span>
                                    <TrendingUp size={12} className="rotate-90" />
                                </div>
                                <div className="absolute right-0 flex items-center">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleShare(); }}
                                        className="p-1.5 rounded-full hover:bg-opacity-10 transition-colors"
                                        style={{ color: theme.textLight }}
                                    >
                                        <Share2 size={16} className="opacity-40 hover:opacity-100" />
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        /* ORIGINAL LAYOUT FOR INACTIVE CARDS */
                        <>
                            {p.purpose && (
                                <p className="text-sm mt-0.5 mb-2" style={{ color: theme.textLight }}>
                                    {p.purpose}
                                </p>
                            )}
                            
                            {/* Peptides Section */}
                            {p.peptides && p.peptides.length > 0 && (
                                <div className="mb-2 pb-2 border-b" style={{ borderColor: theme.border }}>
                                    <div className="space-y-1.5">
                                        {p.peptides.map((peptide, index) => (
                                            <div key={peptide.id || index} className="flex items-start gap-2">
                                                <Beaker size={14} style={{ color: theme.textLight }} className="mt-0.5 flex-shrink-0" />
                                                <div className="flex-1">
                                                    <div className="font-medium text-sm" style={{ color: theme.text }}>
                                                        {peptide.name || 'Unnamed Peptide'}
                                                    </div>
                                                    <div className="text-xs space-y-0.5 mt-0.5" style={{ color: theme.textLight }}>
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
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {/* Details Grid */}
                            <div className="grid grid-cols-2 gap-3 text-sm mb-2 pb-2 border-b" style={{ borderColor: theme.border }}>
                                {p.duration && (
                                    <div className="flex items-center gap-2">
                                        <CalendarClock size={14} style={{ color: theme.textLight }} />
                                        <span style={{ color: theme.text }}>
                                            {p.duration?.noEnd ? 'Ongoing' : (p.duration?.count && p.duration?.unit ? `${p.duration.count} ${p.duration.unit}${p.duration.count > 1 ? 's' : ''}` : 'Duration not set')}
                                        </span>
                                    </div>
                                )}
                                {p.washout?.enabled && p.washout?.count > 0 && (
                                    <div className="flex items-center gap-2">
                                        <RotateCw size={14} style={{ color: theme.textLight }} />
                                        <span style={{ color: theme.text }}>
                                            Washout: {p.washout.count} {p.washout.unit}{p.washout.count > 1 ? 's' : ''}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Notes */}
                            {p.notes && (
                                <div className="mb-2">
                                    <div className="flex items-start gap-2">
                                        <FileText size={14} style={{ color: theme.textLight }} className="mt-0.5" />
                                        <span className="text-sm" style={{ color: theme.text }}>
                                            {p.notes}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>


            <ShareModal
                open={isShareModalOpen}
                onClose={() => setShareModalOpen(false)}
                theme={theme}
                title="Protocol"
                shareUrl={`${window.location.origin}${SHARE_BASE_PATH}/protocols/${p.id}`}
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
    // CRITICAL: Use parseDateString instead of new Date() to avoid timezone issues
    const start = parseDateString(p.startDate);
    if (!start) return 'Invalid date';
    const startNormalized = normalizeToMidnight(start);
    
    // Base end
    let end = p.endDate ? parseDateString(p.endDate) : null;
    if (end) end = normalizeToMidnight(end);
    
    if (!end && p.duration && !p.duration.noEnd && p.duration.count > 0 && p.duration.unit) {
        end = new Date(startNormalized)
        const unit = String(p.duration.unit).toLowerCase()
        const count = Number(p.duration.count) || 0
        if (unit.includes('day')) end.setDate(end.getDate() + count - 1)
        else if (unit.includes('week')) end.setDate(end.getDate() + (count * 7) - 1)
        else if (unit.includes('month')) { end.setMonth(end.getMonth() + count); end.setDate(end.getDate() - 1) }
    }
    // Guard: never earlier than start (normalized comparison)
    if (end && normalizeToMidnight(end) < startNormalized) end = new Date(startNormalized)
    // Note: Washout is calculated for reference/reminders but NOT included in protocol date range
    // Washout should be separate from the protocol duration
    const displayEnd = end
    const startStr = formatMMDDYYYY(startNormalized)
    
    // If active and no end date (ongoing): return empty - only "Active since" will show
    // Also check if duration.noEnd is true (even if endDate exists from migration)
    if (isActive && (!displayEnd || p.duration?.noEnd)) {
        return ''
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
