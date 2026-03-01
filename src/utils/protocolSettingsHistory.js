/**
 * Protocol settings history — version scheduling-relevant fields so edits apply "this + future" only.
 * Past dates render from settingsHistory snapshots; activity feed logs each change.
 */

import { generateId } from './string';

/**
 * Extract scheduling-relevant fields from a protocol for comparison or snapshot.
 * Used for hasSchedulingChanges and for building history segments.
 */
function getSchedulingRelevant(protocol) {
    if (!protocol) return null;
    const blendMode = (protocol.blendMode || protocol.protocolType || '').toLowerCase();
    const peptides = (Array.isArray(protocol.peptides) ? protocol.peptides : []).map(pep => ({
        id: pep.id,
        name: pep.name,
        dosage: pep.dosage != null ? { ...(typeof pep.dosage === 'object' ? pep.dosage : { amount: pep.dosage, unit: 'mcg' }) } : undefined,
        frequency: pep.frequency != null ? { ...pep.frequency } : undefined,
        titration: Array.isArray(pep.titration) ? pep.titration.map(t => ({ ...t })) : undefined,
        dosageScheduleType: pep.dosageScheduleType,
        unitValue: pep.unitValue
    }));
    return { blendMode, peptides };
}

/**
 * Deep compare scheduling-relevant parts of two protocols.
 * @param {Object} oldProtocol
 * @param {Object} newProtocol
 * @returns {boolean} true if peptides or blendMode differ
 */
export function hasSchedulingChanges(oldProtocol, newProtocol) {
    const a = getSchedulingRelevant(oldProtocol);
    const b = getSchedulingRelevant(newProtocol);
    if (!a || !b) return false;
    return JSON.stringify(a) !== JSON.stringify(b);
}

/**
 * Build a settings history segment (closed segment with effectiveFrom and effectiveTo).
 * @param {Object} protocol - protocol with peptides and blendMode
 * @param {string} effectiveFrom - YYYY-MM-DD
 * @param {string} effectiveTo - YYYY-MM-DD
 * @returns {Object} segment for settingsHistory array
 */
export function buildSettingsSnapshot(protocol, effectiveFrom, effectiveTo) {
    const peptides = Array.isArray(protocol.peptides)
        ? JSON.parse(JSON.stringify(protocol.peptides))
        : [];
    const blendMode = (protocol.blendMode || protocol.protocolType || 'separate').toLowerCase();
    return {
        id: generateId(12),
        effectiveFrom: String(effectiveFrom || ''),
        effectiveTo: String(effectiveTo || ''),
        peptides,
        blendMode: blendMode === 'blended' ? 'blended' : 'separate'
    };
}

/**
 * Format a single peptide's frequency for display (e.g. "Mon/Wed/Fri", "AM", "every 3 days")
 */
function formatFrequency(freq) {
    if (!freq) return '';
    const type = (freq.type || '').toLowerCase();
    const time = Array.isArray(freq.time) && freq.time.length ? freq.time.join('/') : (freq.time || 'AM');
    if (type === 'daily') return `Daily ${time}`;
    if (type === 'weekly' && Array.isArray(freq.days) && freq.days.length) return `${freq.days.join('/')} ${time}`;
    if (type === 'cycle') {
        const on = Number(freq.onDays) || 0;
        const off = Number(freq.offDays) || 0;
        if (on && off >= 0) return `Every ${on + off} days ${time}`;
        return `Cycle ${time}`;
    }
    if (type === 'custom') {
        const d = Number(freq.customDays) || 1;
        return `Every ${d} day(s) ${time}`;
    }
    return time;
}

/**
 * Format dose for display
 */
function formatDose(pep) {
    if (pep.dosageScheduleType === 'titration' && Array.isArray(pep.titration) && pep.titration.length) {
        const phases = pep.titration.map((ph, i) => `${ph.dose || ''} ${(ph.doseUnit || 'mcg').trim()}`).filter(Boolean);
        return phases.length ? phases.join(' → ') : 'Titration';
    }
    const amt = pep.dosage?.amount ?? pep.dosage ?? '';
    const un = (pep.dosage?.unit || 'mcg').trim();
    if (pep.unitValue && String(pep.unitValue).trim()) return `${pep.unitValue} units`;
    return `${amt} ${un}`.trim();
}

/**
 * Diff two protocols' scheduling-relevant fields and produce a human-readable summary + changes list.
 * @param {Object} oldProtocol
 * @param {Object} newProtocol
 * @returns {{ summary: string, changes: Array<{ field: string, peptideName: string, from: string, to: string }> }}
 */
export function diffProtocolSettings(oldProtocol, newProtocol) {
    const changes = [];
    const oldPeps = Array.isArray(oldProtocol?.peptides) ? oldProtocol.peptides : [];
    const newPeps = Array.isArray(newProtocol?.peptides) ? newProtocol.peptides : [];
    const blendOld = (oldProtocol?.blendMode || oldProtocol?.protocolType || '').toLowerCase();
    const blendNew = (newProtocol?.blendMode || newProtocol?.protocolType || '').toLowerCase();

    if (blendOld !== blendNew) {
        changes.push({
            field: 'Protocol type',
            peptideName: '',
            from: blendOld || 'separate',
            to: blendNew || 'separate'
        });
    }

    const maxLen = Math.max(oldPeps.length, newPeps.length);
    for (let i = 0; i < maxLen; i++) {
        const oldP = oldPeps[i] || {};
        const newP = newPeps[i] || {};
        const name = newP.name || oldP.name || `Peptide ${i + 1}`;

        if ((oldP.name || '') !== (newP.name || '')) {
            changes.push({ field: 'Name', peptideName: name, from: oldP.name || '—', to: newP.name || '—' });
        }

        const doseOld = formatDose(oldP);
        const doseNew = formatDose(newP);
        if (doseOld !== doseNew) {
            changes.push({ field: 'Dose', peptideName: name, from: doseOld || '—', to: doseNew || '—' });
        }

        const freqOld = formatFrequency(oldP.frequency);
        const freqNew = formatFrequency(newP.frequency);
        if (freqOld !== freqNew) {
            changes.push({ field: 'Schedule', peptideName: name, from: freqOld || '—', to: freqNew || '—' });
        }

        const typeOld = oldP.dosageScheduleType || 'fixed';
        const typeNew = newP.dosageScheduleType || 'fixed';
        if (typeOld !== typeNew) {
            changes.push({ field: 'Dose type', peptideName: name, from: typeOld, to: typeNew });
        }
    }

    // Build one-liner summary: first change or "X settings updated"
    let summary = 'Protocol settings updated.';
    if (changes.length === 1) {
        const c = changes[0];
        const label = c.peptideName ? `${c.peptideName}: ` : '';
        summary = `${label}${c.field} changed from ${c.from} to ${c.to}.`;
    } else if (changes.length > 1) {
        const first = changes[0];
        const label = first.peptideName ? `${first.peptideName} ` : '';
        summary = `${label}${first.field}: ${first.from} → ${first.to}`;
        if (changes.length > 2) summary += ` (+${changes.length - 1} more)`;
        else if (changes.length === 2) summary += `; ${changes[1].field}: ${changes[1].from} → ${changes[1].to}`;
    }

    return { summary, changes };
}
