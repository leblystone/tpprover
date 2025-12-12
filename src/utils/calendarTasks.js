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

// Helper to get protocol date windows
function getWindows(p) {
    try {
        if (!p?.startDate) return { start: null, end: null };
        const startDt = parseDateString(p.startDate);
        let endDt = null;
        if (p.endDate) {
            endDt = parseDateString(p.endDate);
        } else if (p.duration && p.duration.noEnd !== true && Number(p.duration.count) > 0) {
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
        const inRange = (!psOnly || psOnly <= dateNormalized) && (!peOnly || peOnly >= dateNormalized);
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
            const protocolStartDate = normalizeToMidnight(ps);
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
                const firstPeptide = peptides[0];
                
                // Build dose display
                const doseParts = peptides.map(pep => 
                    `${pep.name} ${pep.dosage?.amount || ''} ${pep.dosage?.unit || 'mcg'}`
                );
                const additionalUnits = peptides.find(pep => pep.unitValue)?.unitValue || '';
                
                let dose = doseParts.join(' + ');
                let unit = '';
                
                if (reconItem) {
                    const totalDoseInMcg = reconItem.peptides.reduce((sum, pep) => {
                        const dose = Number(pep.dose) || 0;
                        return pep.doseUnit === 'mg' ? sum + (dose * 1000) : sum + dose;
                    }, 0);
                    const totalMg = reconItem.peptides.reduce((sum, pep) => sum + (Number(pep.mg) || 0), 0);
                    const calc = calculateRecon({ ...reconItem, mg: totalMg, dose: totalDoseInMcg });
                    if (calc.unitsPerDose > 0) {
                        if (additionalUnits) {
                            // Use pipe format to match Calendar display: "15 units | 15 units" (if both present)
                            dose = `${calc.unitsPerDose.toFixed(0)} units | ${additionalUnits} units`;
                        } else {
                            dose = `${calc.unitsPerDose.toFixed(0)} units`;
                        }
                        unit = '';
                    } else if (additionalUnits) {
                        // Use pipe format to match Calendar display: "600 mcg | 15 units"
                        dose = `${dose} | ${additionalUnits} units`;
                        unit = '';
                    }
                } else if (additionalUnits) {
                    // Use pipe format to match Calendar display: "600 mcg | 15 units"
                    dose = `${dose} | ${additionalUnits} units`;
                    unit = '';
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
                    let dose = pep.dosage?.amount || '';
                    let unit = pep.dosage?.unit || '';
                    const additionalUnits = pep.unitValue || '';

                    if (reconItem) {
                        const calc = calculateRecon({
                            mg: reconItem.mg,
                            water: reconItem.water,
                            dose: pep.dosage?.unit === 'mg' ? (pep.dosage?.amount || 0) * 1000 : pep.dosage?.amount
                        });
                        if (calc.unitsPerDose > 0) {
                            if (additionalUnits) {
                                // Use pipe format to match Calendar display: "15 units | 15 units" (if both present)
                                dose = `${calc.unitsPerDose.toFixed(0)} units | ${additionalUnits} units`;
                            } else {
                                dose = `${calc.unitsPerDose.toFixed(0)} units`;
                            }
                            unit = '';
                        } else if (additionalUnits) {
                            // Use pipe format to match Calendar display: "600 mcg | 15 units"
                            dose = `${dose} ${unit} | ${additionalUnits} units`;
                            unit = '';
                        } else {
                            // Simple case: just dose and unit
                            dose = `${dose} ${unit}`;
                            unit = '';
                        }
                    } else if (additionalUnits) {
                        // Use pipe format to match Calendar display: "600 mcg | 15 units"
                        dose = `${dose} ${unit} | ${additionalUnits} units`;
                        unit = '';
                    } else {
                        // Simple case: just dose and unit
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

