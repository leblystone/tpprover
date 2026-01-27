import React, { useMemo } from 'react';
import { Calendar, Pill, Clock, Repeat, ArrowRight } from 'lucide-react';

/**
 * Protocol Summary Card - Shows full protocol overview
 * Start/End dates, total doses, duration, frequency pattern
 */
const VisualSchedulePreview = ({ protocol, startDate, theme }) => {
    
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
        const peptideStats = protocol.peptides.map(peptide => {
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
            
            return {
                name: peptide.name,
                dosage: dosageAmount,
                unit: dosageUnit,
                times: times.join(' & '),
                freqDescription,
                dosesPerWeek
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
                        className="flex items-center justify-between p-2.5 rounded-lg text-xs"
                        style={{ 
                            backgroundColor: theme.isDark ? '#1f2937' : '#f9fafb',
                            border: `1px solid ${theme.border}`
                        }}
                    >
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
