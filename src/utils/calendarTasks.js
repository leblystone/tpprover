/**
 * Shared utility for calculating scheduled tasks for a given date
 * This ensures Dashboard and Calendar use the exact same logic
 */

import { toKey } from '../components/calendar/MonthGrid';
import { calculateRecon } from './recon';

// Helper to safely parse YYYY-MM-DD strings into local time dates
function parseDateString(dateString) {
    if (!dateString) return null;
    if (dateString instanceof Date) return dateString;
    if (typeof dateString !== 'string') return new Date(dateString);
    const parts = dateString.split('-');
    if (parts.length !== 3) return new Date(dateString); // Fallback for other formats
    const [year, month, day] = parts.map(Number);
    return new Date(year, month - 1, day);
}

// Helper to normalize a date to midnight in local time
// CRITICAL: This ensures we're always working with the correct calendar day
function normalizeToMidnight(date) {
    if (!date) return null;
    // Extract year/month/day in local time to avoid any timezone conversion issues
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    // Create new date with all time components explicitly set to 0
    const normalized = new Date(year, month, day, 0, 0, 0, 0);
    return normalized;
}

// Helper to calculate day difference between two dates
function getDayDifference(date1, date2) {
    const normalized1 = normalizeToMidnight(date1);
    const normalized2 = normalizeToMidnight(date2);
    if (!normalized1 || !normalized2) return null;
    return Math.floor((normalized2 - normalized1) / (1000 * 60 * 60 * 24));
}

/**
 * Get the correct dose and unit for a peptide on a specific date, accounting for titration schedules
 * @param {Object} protocol - The protocol object with startDate
 * @param {Object} peptide - The peptide object with dosage and optional titration array
 * @param {Date|string} targetDate - The date to calculate dose for
 * @returns {Object} { dose, unit } - The dose amount and unit for the target date
 */
function getTitrationDoseForDate(protocol, peptide, targetDate) {
    // If no titration array or it's empty, use fixed dose
    if (!peptide.titration || !Array.isArray(peptide.titration) || peptide.titration.length === 0) {
        return {
            dose: peptide.dosage?.amount || '',
            unit: peptide.dosage?.unit || ''
        };
    }

    // Calculate days elapsed since protocol start
    const protocolStart = parseDateString(protocol.startDate);
    const target = parseDateString(targetDate);
    
    if (!protocolStart || !target) {
        // Can't calculate, use fixed dose
        return {
            dose: peptide.dosage?.amount || '',
            unit: peptide.dosage?.unit || ''
        };
    }

    const daysElapsed = getDayDifference(protocolStart, target);
    if (daysElapsed < 0) {
        // Target date is before protocol start
        return { dose: '', unit: '' };
    }

    // Walk through titration phases to find which one applies
    let cumulativeDays = 0;
    for (let i = 0; i < peptide.titration.length; i++) {
        const phase = peptide.titration[i];
        const isLastPhase = i === peptide.titration.length - 1;
        const durationCount = Number(phase.durationCount) || 0;
        const durationUnit = String(phase.durationUnit || 'day').toLowerCase();
        
        // Convert duration to days (support 'days' and 'day', 'weeks' and 'week')
        let phaseDays = durationCount;
        if (durationUnit.includes('week')) {
            phaseDays = durationCount * 7;
        } else if (durationUnit.includes('month')) {
            phaseDays = durationCount * 30; // Approximate
        }
        // If duration is 0: last phase = maintenance (infinite); otherwise treat as 1 day so we don't get stuck on phase 1
        if (phaseDays <= 0) {
            if (isLastPhase) {
                return { dose: phase.dose || '', unit: phase.doseUnit || '' };
            }
            phaseDays = 1;
        }
        
        // Check if target date falls within this phase
        if (daysElapsed < cumulativeDays + phaseDays) {
            return {
                dose: phase.dose || '',
                unit: phase.doseUnit || ''
            };
        }
        
        cumulativeDays += phaseDays;
    }

    // Past all phases, use the last phase as maintenance dose
    const lastPhase = peptide.titration[peptide.titration.length - 1];
    return {
        dose: lastPhase.dose || '',
        unit: lastPhase.doseUnit || ''
    };
}

// Helper to get protocol date windows
function getWindows(p) {
    try {
        if (!p?.startDate) return { start: null, end: null };
        const startDt = parseDateString(p.startDate);
        let endDt = null;
        
        // FIX: If duration is set to "no end" (ongoing), ignore endDate entirely
        // Previously, protocols saved endDate = startDate even when "Ongoing" was selected,
        // which caused scheduling to only work on day 1
        const isOngoing = p.duration?.noEnd === true;
        
        if (isOngoing) {
            // Ongoing protocol - no end date, runs forever
            endDt = null;
        } else if (p.endDate) {
            endDt = parseDateString(p.endDate);
        } else if (p.duration && Number(p.duration.count) > 0) {
            if (startDt) {
                endDt = new Date(startDt);
                const unit = String(p.duration.unit || 'week').toLowerCase();
                const count = Number(p.duration.count) || 0;
                if (unit.includes('day')) endDt.setDate(endDt.getDate() + count - 1);
                else if (unit.includes('week')) endDt.setDate(endDt.getDate() + (count * 7) - 1);
                else if (unit.includes('month')) { endDt.setMonth(endDt.getMonth() + count); endDt.setDate(endDt.getDate() - 1); }
            }
        }
        return { start: startDt, end: endDt };
    } catch {
        return { start: null, end: null };
    }
}

// Normalize peptides helper
function getNormalizedPeptides(p) {
    const basePeptides = (Array.isArray(p.peptides) && p.peptides.length > 0)
        ? p.peptides
        : [{ name: p.name || p.peptide, dosage: p.dosage, frequency: p.frequency }];
    return basePeptides.map(pep => {
        const f = pep?.frequency || {};
        const type = f.type || 'daily';
        const time = Array.isArray(f.time) && f.time.length > 0 ? f.time : ['AM'];
        return { ...pep, frequency: { ...f, type, time } };
    });
}

/**
 * Get the current titration phase for a peptide based on today's date
 * Returns { phaseIndex, phase, dose, unit, daysIntoPhase, daysRemainingInPhase, totalPhases }
 * or null if no titration
 */
export function getCurrentTitrationPhase(protocol, peptide, targetDate = new Date()) {
    if (!peptide?.titration || !Array.isArray(peptide.titration) || peptide.titration.length === 0) {
        return null;
    }

    const protocolStart = parseDateString(protocol?.startDate);
    const target = targetDate instanceof Date ? targetDate : parseDateString(targetDate);
    
    if (!protocolStart || !target) return null;

    const daysElapsed = getDayDifference(protocolStart, target);
    if (daysElapsed < 0) return null;

    let cumulativeDays = 0;
    for (let i = 0; i < peptide.titration.length; i++) {
        const phase = peptide.titration[i];
        const isLastPhase = i === peptide.titration.length - 1;
        const durationCount = Number(phase.durationCount) || 0;
        const durationUnit = String(phase.durationUnit || 'day').toLowerCase();
        
        let phaseDays = durationCount;
        if (durationUnit.includes('week')) phaseDays = durationCount * 7;
        else if (durationUnit.includes('month')) phaseDays = durationCount * 30;
        
        if (phaseDays <= 0) {
            if (isLastPhase) {
                return {
                    phaseIndex: i,
                    phase,
                    dose: phase.dose || '',
                    unit: phase.doseUnit || '',
                    daysIntoPhase: daysElapsed - cumulativeDays,
                    daysRemainingInPhase: null, // maintenance - no end
                    totalPhases: peptide.titration.length,
                    isMaintenancePhase: true
                };
            }
            phaseDays = 1;
        }
        
        if (daysElapsed < cumulativeDays + phaseDays) {
            return {
                phaseIndex: i,
                phase,
                dose: phase.dose || '',
                unit: phase.doseUnit || '',
                daysIntoPhase: daysElapsed - cumulativeDays,
                daysRemainingInPhase: (cumulativeDays + phaseDays) - daysElapsed,
                totalPhases: peptide.titration.length,
                isMaintenancePhase: false
            };
        }
        
        cumulativeDays += phaseDays;
    }

    // Past all phases - maintenance on last phase
    const lastPhase = peptide.titration[peptide.titration.length - 1];
    return {
        phaseIndex: peptide.titration.length - 1,
        phase: lastPhase,
        dose: lastPhase.dose || '',
        unit: lastPhase.doseUnit || '',
        daysIntoPhase: daysElapsed - cumulativeDays,
        daysRemainingInPhase: null,
        totalPhases: peptide.titration.length,
        isMaintenancePhase: true
    };
}

/**
 * Calculate scheduled tasks for a specific date
 * Uses the exact same logic as Calendar.jsx
 * 
 * @param {Date} date - The date to calculate tasks for
 * @param {Array} protocols - Array of protocol objects
 * @param {Array} supplements - Array of supplement objects
 * @param {Array} reconItems - Array of reconstitution items
 * @returns {Object} Tasks organized by time slot: { AM: { peptides: [], supplements: [] }, PM: { ... } }
 */
export function calculateScheduledTasksForDate(date, protocols = [], supplements = [], reconItems = []) {
    const result = {
        bySlot: {}
    };

    // CRITICAL: Normalize date to midnight FIRST to avoid timezone/day boundary issues
    // This ensures we're always working with the correct calendar day
    const dateNormalized = normalizeToMidnight(date);
    if (!dateNormalized) {
        console.warn('⚠️ calculateScheduledTasksForDate: Invalid date provided', date);
        return result;
    }
    
    // Use normalized date for all calculations to ensure consistency
    const dayKey = dateNormalized.toLocaleDateString('en-US', { weekday: 'short' });
    const dateKey = toKey(dateNormalized);

    // Add supplements
    const daySupps = supplements.filter(s => !s.days || s.days.length === 0 || s.days.includes(dayKey));
    for (const s of daySupps) {
        const slots = Array.isArray(s.schedule) && s.schedule.length > 0 
            ? s.schedule 
            : (s.schedule === 'PM' ? ['PM'] : s.schedule === 'AM' ? ['AM'] : ['AM']);
        for (const slot of slots) {
            if (!result.bySlot[slot]) {
                result.bySlot[slot] = { peptides: [], supplements: [] };
            }
            result.bySlot[slot].supplements.push({
                name: s.name || 'Supplement',
                delivery: s.delivery || 'oral',
                deliveryMethod: s.deliveryMethod || s.delivery || 'oral',
                dose: s.dose,
                unit: s.unit || '',
                id: s.id
            });
        }
    }

    // Add protocols/peptides
    for (const p of protocols) {
        const { start: ps, end: pe } = getWindows(p);
        const psOnly = ps ? normalizeToMidnight(ps) : null;
        const peOnly = pe ? normalizeToMidnight(pe) : null;
        // FIX: If no start date exists, protocol should NOT be scheduled
        // Previously (!null) evaluated to true, allowing ghost protocols through
        if (!psOnly) continue;
        const inRange = (psOnly <= dateNormalized) && (!peOnly || peOnly >= dateNormalized);
        const active = p.active !== false;

        if (!inRange || !active) continue;

        const isBlended = (p.blendMode || '').toLowerCase() === 'blended' && Array.isArray(p.peptides) && p.peptides.length > 1;
        
        // Find matching recon item
        const protocolPeptideNames = getNormalizedPeptides(p).map(pep => (pep.name || '').toLowerCase().trim()).sort();
        const reconItem = reconItems.find(r => {
            if (!r.peptides || r.peptides.length === 0) return false;
            const reconPeptideNames = r.peptides.map(pep => (pep.name || '').toLowerCase().trim()).sort();
            if (protocolPeptideNames.length === 0 || reconPeptideNames.length === 0) return false;
            return protocolPeptideNames.length === reconPeptideNames.length && 
                   protocolPeptideNames.every((val, index) => val === reconPeptideNames[index]);
        });

        if (isBlended) {
            const peptides = getNormalizedPeptides(p);
            if (peptides.length === 0) continue;

            const freq = peptides[0].frequency || {};
            let isScheduledToday = false;

            if (!ps) continue;
            // ps from getWindows is already normalized, so use it directly
            const protocolStartDate = ps;
            if (!protocolStartDate || !dateNormalized) continue;

            switch (freq.type) {
                case 'daily':
                    isScheduledToday = true;
                    break;
                case 'weekly':
                    const dayName = dateNormalized.toLocaleDateString('en-US', { weekday: 'short' });
                    if (freq.days?.includes(dayName)) {
                        isScheduledToday = true;
                    }
                    break;
                case 'cycle':
                    const on = Number(freq.onDays) || 0;
                    const off = Number(freq.offDays) || 0;
                    if (on > 0 && off >= 0) {
                        const cycleLen = on + off;
                        // CRITICAL: Calculate day difference using normalized dates
                        // dayDiff = 0 means it's the start day (first "on" day)
                        const dayDiff = getDayDifference(protocolStartDate, dateNormalized);
                        if (dayDiff !== null && dayDiff >= 0) {
                            // dayInCycle ranges from 0 to (cycleLen - 1)
                            // 0 to (on-1) are "on" days, on to (cycleLen-1) are "off" days
                            const dayInCycle = dayDiff % cycleLen;
                            if (dayInCycle < on) {
                                isScheduledToday = true;
                            }
                        }
                    }
                    break;
                case 'custom':
                    const customDays = Number(freq.customDays) || 1;
                    if (customDays > 0) {
                        const dayDiff = getDayDifference(protocolStartDate, dateNormalized);
                        if (dayDiff !== null && dayDiff >= 0 && dayDiff % customDays === 0) {
                            isScheduledToday = true;
                        }
                    }
                    break;
                default:
                    break;
            }

            if (isScheduledToday) {
                const times = freq.time || ['AM'];
                const firstPeptide = peptides[0];
                
                // Build dose display accounting for titration
                const doseParts = peptides.map(pep => {
                    const titrationResult = getTitrationDoseForDate(p, pep, dateNormalized);
                    return `${pep.name} ${titrationResult.dose} ${titrationResult.unit || 'mcg'}`;
                });
                const additionalUnits = peptides.find(pep => pep.unitValue)?.unitValue || '';
                
                let dose = doseParts.join(' + ');
                let unit = '';
                
                // Priority: Protocol Manual unitValue > Recon Manual units > Calculated > Titration/Default dose/unit
                if (additionalUnits && additionalUnits.trim() !== '') {
                    // User manually entered units in protocol - HIGHEST priority
                    dose = `${additionalUnits} units`;
                    unit = '';
                } else if (reconItem) {
                    // Check for manual units in recon item first
                    if (reconItem.units && reconItem.units.trim() !== '') {
                        // User manually entered units in recon modal - SECOND priority
                        dose = `${reconItem.units} units`;
                        unit = '';
                    } else {
                        // No manual override, use calculated units if available
                        const totalDoseInMcg = reconItem.peptides.reduce((sum, pep) => {
                            const dose = Number(pep.dose) || 0;
                            return pep.doseUnit === 'mg' ? sum + (dose * 1000) : sum + dose;
                        }, 0);
                        const totalMg = reconItem.peptides.reduce((sum, pep) => sum + (Number(pep.mg) || 0), 0);
                        // Get first peptide's unit for calculation context
                        const firstPepUnit = peptides[0]?.dosage?.unit || 'mcg';
                        const calc = calculateRecon({ 
                            ...reconItem, 
                            mg: totalMg, 
                            dose: totalDoseInMcg,
                            doseUnit: firstPepUnit // FIX: Pass doseUnit for proper calculation
                        });
                        if (calc.unitsPerDose > 0) {
                            dose = `${calc.unitsPerDose.toFixed(0)} units`;
                            unit = '';
                        }
                        // else: keep default dose (doseParts.join)
                    }
                }

                // Extract unit from dose if not set
                if (!unit) {
                    if (dose.includes('units')) unit = 'units';
                    else if (dose.includes('mcg')) unit = 'mcg';
                    else if (dose.includes('mg')) unit = 'mg';
                }

                // CRITICAL: Match Calendar's EXACT logic for blended protocols
                // Calendar uses: reconItem > firstPeptide (NO linkedItems check for blended)
                // See Calendar.jsx line 615-618
                const deliveryMethod = reconItem?.deliveryMethod || firstPeptide?.deliveryMethod || firstPeptide?.delivery || 'injection';
                const penColor = reconItem?.penColor || firstPeptide?.penColor;
                const penType = reconItem?.penType || firstPeptide?.penType;

                times.forEach(t => {
                    if (!result.bySlot[t]) {
                        result.bySlot[t] = { peptides: [], supplements: [] };
                    }
                    const peptideData = {
                        name: p.protocolName || 'Blended Protocol',
                        dose: dose,
                        unit: unit,
                        deliveryMethod: deliveryMethod,
                        delivery: firstPeptide?.delivery || 'injection',
                        penColor: penColor,
                        penType: penType,
                        protocolId: p.id,
                        peptideId: `${p.id}-blended`
                    };
                    if (!result.bySlot[t].peptides.some(item => 
                        item.name === peptideData.name && 
                        item.protocolId === peptideData.protocolId &&
                        item.peptideId === peptideData.peptideId
                    )) {
                        result.bySlot[t].peptides.push(peptideData);
                    }
                });
            }
        } else {
            // Separate peptides
            getNormalizedPeptides(p).forEach(pep => {
                const freq = pep.frequency || {};
                let isScheduledToday = false;

                if (!ps) return;
                const protocolStartDate = normalizeToMidnight(ps);
                if (!protocolStartDate || !dateNormalized) return;

                switch (freq.type) {
                    case 'daily':
                        isScheduledToday = true;
                        break;
                    case 'weekly':
                        const dayName = dateNormalized.toLocaleDateString('en-US', { weekday: 'short' });
                        if (freq.days?.includes(dayName)) {
                            isScheduledToday = true;
                        }
                        break;
                    case 'cycle':
                        const on = Number(freq.onDays) || 0;
                        const off = Number(freq.offDays) || 0;
                        if (on > 0) {
                            const cycleLen = on + off;
                            const dayDiff = getDayDifference(protocolStartDate, dateNormalized);
                            if (dayDiff !== null && dayDiff >= 0) {
                                const dayInCycle = dayDiff % cycleLen;
                                if (dayInCycle < on) {
                                    isScheduledToday = true;
                                }
                            }
                        }
                        break;
                    case 'custom':
                        const customDays = Number(freq.customDays) || 1;
                        if (customDays > 0) {
                            const dayDiff = getDayDifference(protocolStartDate, dateNormalized);
                            if (dayDiff !== null && dayDiff >= 0 && dayDiff % customDays === 0) {
                                isScheduledToday = true;
                            }
                        }
                        break;
                    default:
                        break;
                }

                if (isScheduledToday) {
                    const times = freq.time || ['AM'];
                    
                    // Get dose/unit accounting for titration schedule
                    const titrationResult = getTitrationDoseForDate(p, pep, dateNormalized);
                    let dose = titrationResult.dose;
                    let unit = titrationResult.unit;
                    const additionalUnits = pep.unitValue || '';

                    // Priority: Protocol Manual unitValue > Recon Manual units > Calculated > Titration/Default dose/unit
                    if (additionalUnits && additionalUnits.trim() !== '') {
                        // User manually entered units in protocol - HIGHEST priority
                        dose = `${additionalUnits} units`;
                        unit = '';
                    } else if (reconItem) {
                        // Check for manual units in recon item first
                        if (reconItem.units && reconItem.units.trim() !== '') {
                            // User manually entered units in recon modal - SECOND priority
                            dose = `${reconItem.units} units`;
                            unit = '';
                        } else {
                            // No manual override, use calculated units if available
                            const calc = calculateRecon({
                                mg: reconItem.mg,
                                water: reconItem.water,
                                dose: pep.dosage?.unit === 'mg' ? (pep.dosage?.amount || 0) * 1000 : pep.dosage?.amount,
                                doseUnit: unit || 'mcg' // FIX: Pass doseUnit for proper calculation
                            });
                            if (calc.unitsPerDose > 0) {
                                dose = `${calc.unitsPerDose.toFixed(0)} units`;
                                unit = '';
                            } else {
                                // No calculation available, use titration/default dose/unit
                                dose = `${dose} ${unit}`;
                                unit = '';
                            }
                        }
                    } else {
                        // No recon item, use titration/default dose/unit
                        dose = `${dose} ${unit}`;
                        unit = '';
                    }

                    // Get delivery method from multiple sources
                    const peptideId = pep.id || `peptide-${getNormalizedPeptides(p).indexOf(pep)}`;
                    const linkedItem = p.linkedItems?.[peptideId] || {};
                    const linkedDeliveryMethod = linkedItem.deliveryMethod || {};
                    
                    const deliveryMethod = linkedDeliveryMethod.deliveryMethod || reconItem?.deliveryMethod || pep.deliveryMethod;
                    const penColor = linkedDeliveryMethod.penColor || reconItem?.penColor || pep.penColor;
                    const penType = linkedDeliveryMethod.penType || reconItem?.penType || pep.penType;
                    const administrationRoute = linkedDeliveryMethod.administrationRoute || reconItem?.administrationRoute || pep.injectionType;

                    times.forEach(t => {
                        if (!result.bySlot[t]) {
                            result.bySlot[t] = { peptides: [], supplements: [] };
                        }
                        const peptideData = {
                            name: pep.name || 'Peptide',
                            dose: dose,
                            unit: unit,
                            deliveryMethod: deliveryMethod,
                            delivery: pep.delivery || 'injection',
                            penColor: penColor,
                            penType: penType,
                            protocolId: p.id,
                            peptideId: peptideId,
                            administrationRoute: administrationRoute
                        };
                        if (!result.bySlot[t].peptides.some(item => 
                            item.name === peptideData.name && 
                            item.protocolId === peptideData.protocolId &&
                            item.peptideId === peptideData.peptideId
                        )) {
                            result.bySlot[t].peptides.push(peptideData);
                        }
                    });
                }
            });
        }
    }

    return result;
}

