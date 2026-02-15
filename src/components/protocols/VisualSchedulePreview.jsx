import React, { useMemo } from 'react';
import { Calendar, Pill, Clock, Repeat, ArrowRight, TrendingUp, Check, Pause, Play, SkipForward } from 'lucide-react';
import { getCurrentTitrationPhase } from '../../utils/calendarTasks';

/**
 * Protocol Summary Card - Shows full protocol overview
 * Start/End dates, total doses, duration, frequency pattern
 */
const VisualSchedulePreview = ({ protocol, startDate, theme, onUpdateProtocol }) => {
    
    // Calculate protocol stats
    const stats = useMemo(() => {
        if (!protocol?.peptides?.length) return null;
        
        // Get duration - handle various storage formats
        const duration = protocol.duration || {};
        const durationCount = Number(duration.count) || Number(duration.value) || Number(duration.length) || 0;
        const durationUnit = duration.unit || duration.type || 'weeks';
        const noEnd = duration.noEnd === true || duration.indefinite === true || durationCount === 0;
        
        // Parse start date safely
        let parsedStartDate;
        if (startDate) {
            // Handle YYYY-MM-DD format
            if (typeof startDate === 'string' && startDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const [year, month, day] = startDate.split('-').map(Number);
                parsedStartDate = new Date(year, month - 1, day);
            } else {
                parsedStartDate = new Date(startDate);
            }
        } else {
            parsedStartDate = new Date();
        }
        
        // Calculate end date
        let endDate = null;
        let durationWeeks = 0;
        
        if (!noEnd && durationCount > 0) {
            endDate = new Date(parsedStartDate);
            
            const unitLower = (durationUnit || '').toLowerCase();
            if (unitLower === 'days' || unitLower === 'day') {
                endDate.setDate(endDate.getDate() + durationCount);
                durationWeeks = Math.ceil(durationCount / 7);
            } else if (unitLower === 'weeks' || unitLower === 'week') {
                endDate.setDate(endDate.getDate() + (durationCount * 7));
                durationWeeks = durationCount;
            } else if (unitLower === 'months' || unitLower === 'month') {
                endDate.setMonth(endDate.getMonth() + durationCount);
                durationWeeks = durationCount * 4;
            } else {
                // Default to weeks
                endDate.setDate(endDate.getDate() + (durationCount * 7));
                durationWeeks = durationCount;
            }
        }
        
        // Calculate doses per week per peptide
        let weeklyDoses = 0;
        const peptideStats = protocol.peptides.map((peptide, index) => {
            const freq = peptide.frequency || { type: 'daily', time: ['AM'] };
            const times = Array.isArray(freq.time) ? freq.time : (freq.time ? [freq.time] : ['AM']);
            const timesPerDay = times.length;
            
            let daysPerWeek = 0;
            let freqDescription = '';
            
            switch (freq.type) {
                case 'daily':
                    daysPerWeek = 7;
                    freqDescription = 'Every day';
                    break;
                case 'weekly':
                    const activeDays = freq.days || [];
                    daysPerWeek = activeDays.length || 7;
                    freqDescription = daysPerWeek === 7 ? 'Every day' : `${daysPerWeek}x per week`;
                    break;
                case 'cycle':
                    const onDays = Number(freq.onDays) || 0;
                    const offDays = Number(freq.offDays) || 0;
                    const cycleLength = onDays + offDays;
                    daysPerWeek = cycleLength > 0 ? Math.round((onDays / cycleLength) * 7) : 7;
                    freqDescription = `${onDays} on, ${offDays} off`;
                    break;
                case 'custom':
                    const interval = Number(freq.customDays) || 1;
                    daysPerWeek = Math.round(7 / interval);
                    freqDescription = `Every ${interval} days`;
                    break;
                default:
                    daysPerWeek = 7;
                    freqDescription = 'Every day';
            }
            
            const dosesPerWeek = daysPerWeek * timesPerDay;
            weeklyDoses += dosesPerWeek;
            
            // Handle dosage as object or simple value
            const dosageAmount = typeof peptide.dosage === 'object' && peptide.dosage !== null
                ? (peptide.dosage.amount || peptide.dosage.value || '')
                : (peptide.dosage || '');
            const dosageUnit = typeof peptide.dosage === 'object' && peptide.dosage !== null
                ? (peptide.dosage.unit || peptide.dosageUnit || 'mcg')
                : (peptide.dosageUnit || 'mcg');
            
            // Include titration data if present
            const hasTitration = Array.isArray(peptide.titration) && peptide.titration.length > 0;
            const currentPhaseInfo = hasTitration ? getCurrentTitrationPhase(protocol, peptide) : null;
            
            return {
                name: peptide.name,
                peptideId: peptide.id,
                peptideIndex: index,
                dosage: currentPhaseInfo ? currentPhaseInfo.dose : dosageAmount,
                unit: currentPhaseInfo ? currentPhaseInfo.unit : dosageUnit,
                times: times.join(' & '),
                freqDescription,
                dosesPerWeek,
                hasTitration,
                titration: hasTitration ? peptide.titration : null,
                currentPhaseInfo,
                isHeld: !!peptide.titrationHeldAt
            };
        });
        
        // Calculate total doses
        const totalDoses = noEnd ? null : weeklyDoses * durationWeeks;
        
        return {
            startDate: parsedStartDate,
            endDate,
            noEnd,
            durationWeeks,
            durationCount,
            durationUnit,
            weeklyDoses,
            totalDoses,
            peptideStats
        };
    }, [protocol, startDate]);
    
    if (!stats) return null;
    
    const formatDate = (date) => {
        if (!date) return 'Ongoing';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };
    
    return (
        <div className="space-y-4">
            {/* Timeline Header */}
            <div className="flex items-center gap-3">
                {/* Start */}
                <div className="text-center min-w-[80px]">
                    <div className="text-[10px] uppercase font-medium mb-0.5" style={{ color: theme.textLight }}>Start</div>
                    <div className="text-xs font-bold" style={{ color: theme.text }}>
                        {formatDate(stats.startDate)}
                    </div>
                </div>
                
                {/* Timeline bar */}
                <div className="flex-1 relative py-3">
                    {/* Track */}
                    <div className="h-0.5 rounded-full" style={{ backgroundColor: theme.border }} />
                    {/* Filled portion */}
                    <div 
                        className="absolute top-3 left-0 h-0.5 rounded-full"
                        style={{ 
                            backgroundColor: theme.primary,
                            width: stats.noEnd ? '40%' : '100%'
                        }}
                    />
                    {/* Start dot */}
                    <div 
                        className="absolute top-1.5 left-0 w-3 h-3 rounded-full border-2"
                        style={{ 
                            backgroundColor: theme.cardBackground,
                            borderColor: theme.primary
                        }}
                    />
                    {/* End dot */}
                    <div 
                        className="absolute top-1.5 right-0 w-3 h-3 rounded-full"
                        style={{ 
                            backgroundColor: stats.noEnd ? theme.border : theme.primary
                        }}
                    />
                    {/* Duration label below line */}
                    {!stats.noEnd && (
                        <div 
                            className="absolute top-5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[10px] font-medium"
                            style={{ 
                                backgroundColor: theme.cardBackground,
                                color: theme.primary,
                                border: `1px solid ${theme.primary}30`
                            }}
                        >
                            {stats.durationCount} {stats.durationUnit}
                        </div>
                    )}
                </div>
                
                {/* End */}
                <div className="text-center min-w-[80px]">
                    <div className="text-[10px] uppercase font-medium mb-0.5" style={{ color: theme.textLight }}>End</div>
                    <div className="text-xs font-bold" style={{ color: stats.noEnd ? theme.textLight : theme.text }}>
                        {stats.noEnd ? 'Ongoing' : formatDate(stats.endDate)}
                    </div>
                </div>
            </div>
            
            {/* Peptide Details */}
            <div className="space-y-2">
                {stats.peptideStats.map((pep, idx) => (
                    <div 
                        key={idx}
                        className="rounded-lg text-xs overflow-hidden"
                        style={{ 
                            backgroundColor: theme.isDark ? '#1f2937' : '#f9fafb',
                            border: `1px solid ${theme.border}`
                        }}
                    >
                        <div className="flex items-center justify-between p-2.5">
                            <div>
                                <div className="font-semibold" style={{ color: theme.text }}>{pep.name}</div>
                                <div style={{ color: theme.textLight }}>
                                    {pep.dosage} {pep.unit} • {pep.times}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-medium" style={{ color: theme.primary }}>{pep.freqDescription}</div>
                                <div style={{ color: theme.textLight }}>{pep.dosesPerWeek}/week</div>
                            </div>
                        </div>
                        
                        {/* Titration Schedule */}
                        {pep.hasTitration && pep.titration && (
                            <div 
                                className="px-2.5 pb-2.5 pt-1 border-t"
                                style={{ borderColor: `${theme.border}80` }}
                            >
                                <div className="flex items-center gap-1 mb-1.5">
                                    <TrendingUp size={10} style={{ color: theme.primary }} />
                                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: theme.primary }}>
                                        Titration Schedule
                                    </span>
                                    {pep.currentPhaseInfo && (
                                        <span className="text-[10px] font-medium ml-auto" style={{ color: pep.isHeld ? '#c87a5c' : theme.textLight }}>
                                            {pep.isHeld ? (
                                                <>Phase {pep.currentPhaseInfo.phaseIndex + 1}/{pep.currentPhaseInfo.totalPhases} · HELD</>
                                            ) : (
                                                <>
                                                    Phase {pep.currentPhaseInfo.phaseIndex + 1}/{pep.currentPhaseInfo.totalPhases}
                                                    {pep.currentPhaseInfo.daysRemainingInPhase !== null && (
                                                        <> · {pep.currentPhaseInfo.daysRemainingInPhase}d left</>
                                                    )}
                                                </>
                                            )}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 flex-wrap">
                                    {pep.titration.map((phase, phaseIdx) => {
                                        const isCurrentPhase = pep.currentPhaseInfo?.phaseIndex === phaseIdx;
                                        const isCompletedPhase = pep.currentPhaseInfo && phaseIdx < pep.currentPhaseInfo.phaseIndex;
                                        const isNextPhase = !isCurrentPhase && !isCompletedPhase;
                                        const isHoldPhase = isCurrentPhase && pep.isHeld;
                                        const terracotta = '#c87a5c';
                                        return (
                                            <React.Fragment key={phaseIdx}>
                                                <div 
                                                    className="px-2 py-1 rounded text-[10px] font-medium relative"
                                                    style={{ 
                                                        backgroundColor: isCurrentPhase && !pep.isHeld
                                                            ? `${theme.primary}30`
                                                            : isCompletedPhase 
                                                                ? `${theme.success || '#22c55e'}15`
                                                                : isHoldPhase
                                                                    ? `${terracotta}28`
                                                                    : isNextPhase
                                                                        ? `${theme.primary}08`
                                                                        : `${theme.primary}08`,
                                                        color: isCompletedPhase 
                                                            ? (theme.success || '#22c55e')
                                                            : isHoldPhase
                                                                ? terracotta
                                                                : isNextPhase
                                                                    ? theme.text
                                                                    : (isCurrentPhase ? theme.text : theme.text),
                                                        border: isCurrentPhase && !pep.isHeld
                                                            ? `2px solid ${theme.primary}` 
                                                            : isCompletedPhase
                                                                ? `1px solid ${theme.success || '#22c55e'}40`
                                                                : isHoldPhase
                                                                    ? `1px solid ${terracotta}99`
                                                                    : isNextPhase
                                                                        ? `1px solid ${theme.primary}15`
                                                                        : `1px solid ${theme.primary}15`,
                                                        opacity: isHoldPhase || isCurrentPhase || isCompletedPhase ? 1 : 0.6
                                                    }}
                                                >
                                                    {isCompletedPhase && (
                                                        <Check size={8} className="inline mr-0.5" style={{ color: theme.success || '#22c55e' }} />
                                                    )}
                                                    {isHoldPhase && (
                                                        <Pause size={8} className="inline mr-0.5" style={{ color: terracotta }} />
                                                    )}
                                                    <span className="font-bold">{phase.dose} {phase.doseUnit || 'mcg'}</span>
                                                    {(phase.durationUnit === 'ongoing') ? (
                                                        <span className="opacity-60"> · Ongoing</span>
                                                    ) : (phase.durationCount && phase.durationUnit) ? (
                                                        <span className="opacity-60"> · {phase.durationCount} {phase.durationUnit}</span>
                                                    ) : null}
                                                </div>
                                                {phaseIdx < pep.titration.length - 1 && (
                                                    <ArrowRight 
                                                        size={10} 
                                                        style={{ 
                                                            color: isCompletedPhase ? (theme.success || '#22c55e') : theme.textLight, 
                                                            opacity: isCompletedPhase ? 0.6 : 0.3 
                                                        }} 
                                                    />
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                                
                                {/* Titration Controls */}
                                {onUpdateProtocol && protocol.active && pep.currentPhaseInfo && (
                                    <div className="flex items-center gap-2 mt-2 pt-2 border-t" style={{ borderColor: `${theme.border}60` }}>
                                        {/* Hold / Resume */}
                                        <button
                                            onClick={() => {
                                                const updatedPeptides = protocol.peptides.map((peptide, pidx) => {
                                                    if (pidx !== pep.peptideIndex) return peptide;
                                                    if (peptide.titrationHeldAt) {
                                                        // RESUME
                                                        const now = new Date();
                                                        const heldAt = new Date(peptide.titrationHeldAt);
                                                        const heldDays = Math.floor((now - heldAt) / (1000 * 60 * 60 * 24));
                                                        return {
                                                            ...peptide,
                                                            titrationHeldAt: null,
                                                            titrationDaysOffset: (Number(peptide.titrationDaysOffset) || 0) - heldDays
                                                        };
                                                    } else {
                                                        // HOLD
                                                        const today = new Date();
                                                        const yyyy = today.getFullYear();
                                                        const mm = String(today.getMonth() + 1).padStart(2, '0');
                                                        const dd = String(today.getDate()).padStart(2, '0');
                                                        return {
                                                            ...peptide,
                                                            titrationHeldAt: `${yyyy}-${mm}-${dd}`
                                                        };
                                                    }
                                                });
                                                onUpdateProtocol({ ...protocol, peptides: updatedPeptides });
                                            }}
                                            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors cursor-pointer"
                                            style={{
                                                backgroundColor: pep.isHeld 
                                                    ? `${theme.success || '#22c55e'}15`
                                                    : '#c87a5c28',
                                                color: pep.isHeld 
                                                    ? (theme.success || '#22c55e')
                                                    : '#c87a5c',
                                                border: `1px solid ${pep.isHeld 
                                                    ? (theme.success || '#22c55e') 
                                                    : '#c87a5c99'}`
                                            }}
                                        >
                                            {pep.isHeld ? (
                                                <><Play size={9} /> Resume Titration</>
                                            ) : (
                                                <><Pause size={9} /> Hold Phase</>
                                            )}
                                        </button>
                                        
                                        {/* Skip to Next Phase */}
                                        {!pep.currentPhaseInfo.isMaintenancePhase && pep.currentPhaseInfo.phaseIndex < pep.currentPhaseInfo.totalPhases - 1 && (
                                            <button
                                                onClick={() => {
                                                    const updatedPeptides = protocol.peptides.map((peptide, pidx) => {
                                                        if (pidx !== pep.peptideIndex) return peptide;
                                                        return {
                                                            ...peptide,
                                                            titrationHeldAt: null,
                                                            titrationDaysOffset: (Number(peptide.titrationDaysOffset) || 0) + (pep.currentPhaseInfo.daysRemainingInPhase || 0)
                                                        };
                                                    });
                                                    onUpdateProtocol({ ...protocol, peptides: updatedPeptides });
                                                }}
                                                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors cursor-pointer"
                                                style={{
                                                    backgroundColor: `${theme.primary}15`,
                                                    color: theme.primary,
                                                    border: `1px solid ${theme.primary}30`
                                                }}
                                            >
                                                <SkipForward size={9} /> Next Phase
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
            
            {/* Info footer */}
            <div 
                className="text-xs text-center p-2 rounded"
                style={{ 
                    backgroundColor: `${theme.info || theme.primary}10`,
                    color: theme.textLight
                }}
            >
                Tasks will appear on your Dashboard & Calendar
            </div>
        </div>
    );
};

export default VisualSchedulePreview;
