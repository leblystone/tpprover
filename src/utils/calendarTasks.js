/**
 * Shared utility for calculating scheduled tasks for a given date
 * This ensures Dashboard and Calendar use the exact same logic
 */

import { toKey } from '../components/calendar/MonthGrid';
import { applyScheduleOverridesToBySlot } from './taskScheduleOverrides';
import { calculateRecon } from './recon';

// Helper to safely parse YYYY-MM-DD strings into local time dates
// Must handle: string dates, Date objects, Firebase Timestamps, numbers
function parseDateString(dateString) {
    if (!dateString) return null;
    if (dateString instanceof Date) return dateString;
    if (typeof dateString === 'object' && typeof dateString.toDate === 'function') {
        return dateString.toDate();
    }
    if (typeof dateString !== 'string') {
        try { return new Date(dateString); } catch { return null; }
    }
    const parts = dateString.split('-');
    if (parts.length !== 3) return new Date(dateString);
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
// Calculate effective days elapsed accounting for titration hold/offset
// titrationHeldAt: ISO date string when hold was activated (null = not held)
// titrationDaysOffset: number of days to shift the titration schedule (negative = slow down, positive = speed up)
function getEffectiveTitrationDays(protocol, peptide, targetDate) {
    const protocolStart = parseDateString(protocol?.startDate);
    const target = targetDate instanceof Date ? targetDate : parseDateString(targetDate);
    
    if (!protocolStart || !target) return null;
    
    let daysElapsed = getDayDifference(protocolStart, target);
    if (daysElapsed < 0) return null;
    
    // Apply days offset (from skip/hold resume adjustments)
    const offset = Number(peptide.titrationDaysOffset) || 0;
    daysElapsed += offset;
    
    // If currently held, freeze at the held date
    if (peptide.titrationHeldAt) {
        const heldAt = parseDateString(peptide.titrationHeldAt);
        if (heldAt) {
            const heldDays = getDayDifference(protocolStart, heldAt);
            if (heldDays !== null && heldDays >= 0) {
                daysElapsed = heldDays + offset;
            }
        }
    }
    
    return Math.max(0, daysElapsed);
}

// Convert phase duration to days (ongoing = 0 so last phase continues indefinitely)
function getPhaseDurationInDays(phase) {
    const durationUnit = String(phase.durationUnit || 'day').toLowerCase();
    if (durationUnit === 'ongoing') return 0;
    const durationCount = Number(phase.durationCount) || 0;
    let phaseDays = durationCount;
    if (durationUnit.includes('week')) phaseDays = durationCount * 7;
    else if (durationUnit.includes('month')) phaseDays = durationCount * 30;
    return phaseDays;
}

function getTitrationDoseForDate(protocol, peptide, targetDate) {
    // If user selected fixed dose, or no titration array / empty, use fixed dose
    const useFixedDose = peptide.dosageScheduleType === 'fixed' || !peptide.titration || !Array.isArray(peptide.titration) || peptide.titration.length === 0;
    if (useFixedDose) {
        return {
            dose: peptide.dosage?.amount || '',
            unit: peptide.dosage?.unit || ''
        };
    }

    const daysElapsed = getEffectiveTitrationDays(protocol, peptide, targetDate);
    if (daysElapsed === null) {
        return {
            dose: peptide.dosage?.amount || '',
            unit: peptide.dosage?.unit || ''
        };
    }

    // Walk through titration phases to find which one applies
    let cumulativeDays = 0;
    for (let i = 0; i < peptide.titration.length; i++) {
        const phase = peptide.titration[i];
        const isLastPhase = i === peptide.titration.length - 1;
        let phaseDays = getPhaseDurationInDays(phase);
        
        if (phaseDays <= 0) {
            if (isLastPhase) {
                return { dose: phase.dose || '', unit: phase.doseUnit || '' };
            }
            phaseDays = 1;
        }
        
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
        
        const isOngoing = p.duration?.noEnd === true;
        const wasStopped = p.active === false && p.endDate;
        
        if (wasStopped) {
            endDt = parseDateString(p.endDate);
        } else if (isOngoing) {
            endDt = null;
        } else if (p.endDate) {
            const candidateEnd = parseDateString(p.endDate);
            // If the stored endDate predates the startDate the protocol was restarted with
            // a new startDate but endDate was never recalculated — treat it as stale and
            // fall through to the duration calculation below.
            if (candidateEnd && startDt && normalizeToMidnight(candidateEnd) >= normalizeToMidnight(startDt)) {
                endDt = candidateEnd;
            }
            // else: stale endDate — fall through to duration-based calculation
        }
        if (!endDt && !isOngoing && p.duration && Number(p.duration.count) > 0) {
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

/**
 * Get the protocol settings effective for a given date (for "this + future" edit behavior).
 * If the protocol has settingsHistory and the date falls within a closed segment, returns
 * a protocol-like object with peptides and blendMode from that segment; otherwise returns the protocol.
 * @param {Object} protocol
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {Object} protocol with effective peptides/blendMode for that date
 */
function getEffectiveSettings(protocol, dateStr) {
    const history = protocol?.settingsHistory;
    if (!Array.isArray(history) || history.length === 0) return protocol;
    const segment = history.find(
        seg => seg.effectiveFrom && seg.effectiveTo &&
        dateStr >= seg.effectiveFrom && dateStr <= seg.effectiveTo
    );
    if (!segment) return protocol;
    return {
        ...protocol,
        peptides: segment.peptides ?? protocol.peptides,
        blendMode: segment.blendMode ?? protocol.blendMode
    };
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
    if (peptide.dosageScheduleType === 'fixed') return null;
    if (!peptide?.titration || !Array.isArray(peptide.titration) || peptide.titration.length === 0) {
        return null;
    }

    const daysElapsed = getEffectiveTitrationDays(protocol, peptide, targetDate);
    if (daysElapsed === null) return null;

    const isHeld = !!peptide.titrationHeldAt;

    let cumulativeDays = 0;
    for (let i = 0; i < peptide.titration.length; i++) {
        const phase = peptide.titration[i];
        const isLastPhase = i === peptide.titration.length - 1;
        let phaseDays = getPhaseDurationInDays(phase);
        
        if (phaseDays <= 0) {
            if (isLastPhase) {
                return {
                    phaseIndex: i,
                    phase,
                    dose: phase.dose || '',
                    unit: phase.doseUnit || '',
                    daysIntoPhase: daysElapsed - cumulativeDays,
                    daysRemainingInPhase: null,
                    totalPhases: peptide.titration.length,
                    isMaintenancePhase: true,
                    isHeld
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
                isMaintenancePhase: false,
                isHeld
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
        isMaintenancePhase: true,
        isHeld
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

    // Add supplements (respect startDate/endDate and day-of-week)
    const daySupps = supplements.filter(s => {
        // Free-plan hold: paused supplements should not generate scheduled tasks.
        if (s?.heldByFreePlan === true) return false;
        if (s?.active === false) return false;
        if (s.startDate) {
            const start = parseDateString(s.startDate);
            if (start && dateNormalized < normalizeToMidnight(start)) return false;
        }
        if (s.endDate) {
            const end = parseDateString(s.endDate);
            if (end && dateNormalized > normalizeToMidnight(end)) return false;
        }
        if (s.days && s.days.length > 0 && !s.days.includes(dayKey)) return false;
        return true;
    });
    for (const s of daySupps) {
        const rawSlots = Array.isArray(s.schedule) && s.schedule.length > 0 
            ? s.schedule 
            : (s.schedule === 'PM' ? ['PM'] : s.schedule === 'AM' ? ['AM'] : ['AM']);
        // Deduplicate time slots so a malformed schedule like ['AM','AM'] doesn't double-push
        const slots = [...new Set(rawSlots)];
        for (const slot of slots) {
            if (!result.bySlot[slot]) {
                result.bySlot[slot] = { peptides: [], supplements: [] };
            }
            // Guard: don't add the same supplement id twice in the same slot
            if (s.id && result.bySlot[slot].supplements.some(item => item.id === s.id)) {
                continue;
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

    // Add protocols/peptides — only explicitly active protocols generate tasks
    for (const p of protocols) {
        if (p.active !== true) continue;

        const { start: ps, end: pe } = getWindows(p);
        const psOnly = ps ? normalizeToMidnight(ps) : null;
        const peOnly = pe ? normalizeToMidnight(pe) : null;
        if (!psOnly) continue;
        const inRange = (psOnly <= dateNormalized) && (!peOnly || peOnly >= dateNormalized);

        if (!inRange) continue;

        const ep = getEffectiveSettings(p, dateKey);
        const isBlended = (ep.blendMode || '').toLowerCase() === 'blended' && Array.isArray(ep.peptides) && ep.peptides.length > 1;
        
        // Find matching recon item
        const protocolPeptideNames = getNormalizedPeptides(ep).map(pep => (pep.name || '').toLowerCase().trim()).sort();
        const reconItem = reconItems.find(r => {
            if (!r.peptides || r.peptides.length === 0) return false;
            const reconPeptideNames = r.peptides.map(pep => (pep.name || '').toLowerCase().trim()).sort();
            if (protocolPeptideNames.length === 0 || reconPeptideNames.length === 0) return false;
            return protocolPeptideNames.length === reconPeptideNames.length && 
                   protocolPeptideNames.every((val, index) => val === reconPeptideNames[index]);
        });

        if (isBlended) {
            const peptides = getNormalizedPeptides(ep);
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
                case 'as_needed':
                    // PRN — never auto-schedule daily tasks
                    isScheduledToday = false;
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
                    const titrationResult = getTitrationDoseForDate(ep, pep, dateNormalized);
                    return `${pep.name} ${titrationResult.dose} ${titrationResult.unit || 'mcg'}`;
                });
                const anyUsingTitration = peptides.some(pep => (pep.titration && pep.titration.length > 0) && pep.dosageScheduleType !== 'fixed');
                const additionalUnits = !anyUsingTitration ? (peptides.find(pep => pep.unitValue)?.unitValue || '') : '';
                
                let dose = doseParts.join(' + ');
                let unit = '';
                
                // Only use unitValue when protocol is in fixed-dose mode; when titration is selected use titration dose/unit only
                // Priority: Protocol Manual unitValue > Recon Manual units > Calculated > Titration/Default dose/unit
                if (additionalUnits && additionalUnits.trim() !== '') {
                    // User manually entered units in protocol - HIGHEST priority
                    dose = `${additionalUnits} units`;
                    unit = '';
                } else if (!anyUsingTitration && reconItem) {
                    // Only use recon units when all peptides in fixed-dose mode
                    if (reconItem.units && reconItem.units.trim() !== '') {
                        dose = `${reconItem.units} units`;
                        unit = '';
                    } else {
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
                // Also fall back to current p.peptides[0] in case ep came from a history snapshot
                const firstCurrentPeptide = p.peptides?.[0];
                const deliveryMethod = reconItem?.deliveryMethod || firstPeptide?.deliveryMethod || firstPeptide?.delivery || firstCurrentPeptide?.deliveryMethod || 'pipette';
                const penColor = reconItem?.penColor || firstPeptide?.penColor || firstCurrentPeptide?.penColor;
                const penType = reconItem?.penType || firstPeptide?.penType || firstCurrentPeptide?.penType;

                times.forEach(t => {
                    if (!result.bySlot[t]) {
                        result.bySlot[t] = { peptides: [], supplements: [] };
                    }
                    const peptideData = {
                        name: ep.protocolName || p.protocolName || 'Blended Protocol',
                        dose: dose,
                        unit: unit,
                        deliveryMethod: deliveryMethod,
                        delivery: firstPeptide?.delivery || 'pipette',
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
            getNormalizedPeptides(ep).forEach(pep => {
                const freq = pep.frequency || {};
                let isScheduledToday = false;

                if (!ps) return;
                const protocolStartDate = normalizeToMidnight(ps);
                if (!protocolStartDate || !dateNormalized) return;

                switch (freq.type) {
                    case 'daily':
                        isScheduledToday = true;
                        break;
                    case 'as_needed':
                        isScheduledToday = false;
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
                    const titrationResult = getTitrationDoseForDate(ep, pep, dateNormalized);
                    let dose = titrationResult.dose;
                    let unit = titrationResult.unit;
                    const useFixedDoseForUnits = pep.dosageScheduleType === 'fixed' || !pep.titration || pep.titration.length === 0;
                    const additionalUnits = useFixedDoseForUnits ? (pep.unitValue || '') : '';

                    // Only use unitValue when peptide is in fixed-dose mode; when titration is selected use titration dose/unit only
                    // Priority: Protocol Manual unitValue > Recon Manual units > Calculated > Titration/Default dose/unit
                    if (additionalUnits && additionalUnits.trim() !== '') {
                        // User manually entered units in protocol - HIGHEST priority
                        dose = `${additionalUnits} units`;
                        unit = '';
                    } else if (useFixedDoseForUnits && reconItem) {
                        // Only use recon units when in fixed-dose mode; titration uses dose/unit from titration phases only
                        if (reconItem.units && reconItem.units.trim() !== '') {
                            dose = `${reconItem.units} units`;
                            unit = '';
                        } else {
                            const calc = calculateRecon({
                                mg: reconItem.mg,
                                water: reconItem.water,
                                dose: pep.dosage?.amount || 0,
                                doseUnit: pep.dosage?.unit || 'mcg'
                            });
                            if (calc.unitsPerDose > 0) {
                                dose = `${calc.unitsPerDose.toFixed(0)} units`;
                                unit = '';
                            } else {
                                dose = `${dose} ${unit}`;
                                unit = '';
                            }
                        }
                    } else {
                        // Titration mode or no recon: use titration/default dose/unit
                        dose = `${dose} ${unit}`;
                        unit = '';
                    }

                    // Get delivery method from multiple sources
                    const peptideId = pep.id || `peptide-${getNormalizedPeptides(ep).indexOf(pep)}`;
                    const linkedItem = p.linkedItems?.[peptideId] || {};
                    const linkedDeliveryMethod = linkedItem.deliveryMethod || {};

                    // Look up current (non-historical) peptide definition by id or name.
                    // ep.peptides may come from a settingsHistory snapshot that pre-dates
                    // when penColor/penType were set on the protocol, so we always prefer
                    // the live p.peptides definition for display fields.
                    const currentProtocolPep = p.peptides?.find(pp =>
                        pep.id ? pp.id === pep.id : pp.name === pep.name
                    );

                    const deliveryMethod = linkedDeliveryMethod.deliveryMethod || reconItem?.deliveryMethod || pep.deliveryMethod || currentProtocolPep?.deliveryMethod;
                    // pen color: current protocol definition is source-of-truth (matches protocol card),
                    // then fall back to linkedItems (skipped-vial wizard config) → recon → ep snapshot
                    const penColor = currentProtocolPep?.penColor || pep.penColor || linkedDeliveryMethod.penColor || reconItem?.penColor;
                    const penType = linkedDeliveryMethod.penType || reconItem?.penType || pep.penType || currentProtocolPep?.penType;
                    const administrationRoute = linkedDeliveryMethod.administrationRoute || reconItem?.administrationRoute || pep.injectionType || currentProtocolPep?.injectionType;

                    times.forEach(t => {
                        if (!result.bySlot[t]) {
                            result.bySlot[t] = { peptides: [], supplements: [] };
                        }
                        const peptideData = {
                            name: pep.name || 'Peptide',
                            dose: dose,
                            unit: unit,
                            deliveryMethod: deliveryMethod,
                            delivery: pep.delivery || 'pipette',
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

    return {
        ...result,
        bySlot: applyScheduleOverridesToBySlot(dateKey, result.bySlot),
    };
}

