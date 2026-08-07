import { getCurrentTitrationPhase } from './calendarTasks';
import { calculateRecon } from './recon';

/**
 * Resolve mass dose + syringe/pen units for protocol dosage display.
 * Units are critical for pipette/pen delivery — mass (mcg/mg) alone is not enough.
 *
 * Priority for units:
 * Fixed dose: peptide.unitValue → recon.units / unitsPerDose → calculate from recon + dose
 * Titration: always calculate from recon vial + *current phase* dose (static units are wrong across phases)
 */

function isUsingTitration(peptide) {
  return (
    peptide?.dosageScheduleType !== 'fixed' &&
    Array.isArray(peptide?.titration) &&
    peptide.titration.length > 0
  );
}

function stripEmoji(str) {
  return String(str || '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function findMatchingReconItem(protocol, reconItems = [], peptide = null) {
  if (!Array.isArray(reconItems) || reconItems.length === 0) return null;

  // Prefer recon linked on the peptide during start/manage vials
  if (peptide?.id && protocol?.linkedItems) {
    const linked = protocol.linkedItems[peptide.id];
    if (linked?.reconId) {
      const byLinkedId = reconItems.find((r) => r.id === linked.reconId);
      if (byLinkedId) return byLinkedId;
    }
  }
  // Also try index-based peptide id keys used in wizards
  if (protocol?.linkedItems && peptide) {
    const idx = (protocol.peptides || []).indexOf(peptide);
    const altKey = idx >= 0 ? `peptide-${idx}` : null;
    const linked =
      (peptide.id && protocol.linkedItems[peptide.id]) ||
      (altKey && protocol.linkedItems[altKey]) ||
      null;
    if (linked?.reconId) {
      const byLinkedId = reconItems.find((r) => r.id === linked.reconId);
      if (byLinkedId) return byLinkedId;
    }
  }

  const byProtocolId = reconItems.find((r) => r.protocolId && r.protocolId === protocol?.id);
  if (byProtocolId) return byProtocolId;

  // Single-peptide: match recon that contains this peptide name (ignore emoji)
  if (peptide?.name) {
    const target = stripEmoji(peptide.name);
    if (target) {
      const byPepName = reconItems.find((r) => {
        const names = Array.isArray(r.peptides)
          ? r.peptides.map((pep) => stripEmoji(pep.name))
          : [stripEmoji(r.name)];
        return names.some((n) => n && (n === target || n.includes(target) || target.includes(n)));
      });
      if (byPepName) return byPepName;
    }
  }

  const protocolNames = (protocol?.peptides || [])
    .map((pep) => stripEmoji(pep.name))
    .filter(Boolean)
    .sort();
  if (protocolNames.length === 0) return null;

  return (
    reconItems.find((r) => {
      if (!r.peptides || r.peptides.length === 0) return false;
      const reconNames = r.peptides
        .map((pep) => stripEmoji(pep.name))
        .filter(Boolean)
        .sort();
      return (
        protocolNames.length === reconNames.length &&
        protocolNames.every((val, index) => val === reconNames[index])
      );
    }) || null
  );
}

function resolveUnitsLabel(protocol, peptide, { usingTitration, massAmount, massUnit, reconItems }) {
  const reconItem = findMatchingReconItem(protocol, reconItems, peptide);

  // Fixed-dose: prefer explicit unitValue / stored recon units (those match the fixed dose)
  if (!usingTitration) {
    const manual = peptide?.unitValue != null ? String(peptide.unitValue).trim() : '';
    if (manual !== '') return `${manual} units`;

    if (reconItem) {
      if (reconItem.units && String(reconItem.units).trim() !== '') {
        return `${String(reconItem.units).trim()} units`;
      }
      if (Number(reconItem.unitsPerDose) > 0) {
        return `${Math.round(Number(reconItem.unitsPerDose))} units`;
      }
    }
  }

  // Titration (and fixed fallback): compute draw units from vial + current mass dose
  if (!reconItem) return null;

  // Prefer protocol/current phase dose; fall back to dose stored on the recon itself
  let doseValue = Number(massAmount);
  let doseUnit = massUnit || 'mcg';
  if (!(doseValue > 0)) {
    const rp = Array.isArray(reconItem.peptides) ? reconItem.peptides[0] : null;
    const fallbackDose = rp?.dose ?? reconItem.dose;
    doseValue = Number(fallbackDose);
    doseUnit = (rp?.doseUnit || reconItem.doseUnit || doseUnit || 'mcg').trim() || 'mcg';
  }
  if (!(doseValue > 0)) return null;

  const totalMg =
    Array.isArray(reconItem.peptides) && reconItem.peptides.length > 0
      ? reconItem.peptides.reduce((sum, pep) => sum + (Number(pep.mg) || 0), 0)
      : Number(reconItem.mg) || 0;
  const water = Number(reconItem.water) || 0;
  if (!(totalMg > 0) || !(water > 0)) return null;

  const calc = calculateRecon({
    mg: totalMg,
    water,
    dose: doseValue,
    doseUnit,
    iuConversionFactor: reconItem.peptides?.[0]?.iuConversionFactor || 0.001,
  });
  if (calc.unitsPerDose > 0) {
    return `${Math.round(calc.unitsPerDose)} units`;
  }
  return null;
}

/**
 * @returns {{
 *   massLabel: string|null,
 *   unitsLabel: string|null,
 *   primary: string,
 *   secondary: string|null,
 *   combined: string|null,
 * }}
 */
export function getPeptideDoseDisplay(protocol, peptide, { reconItems = [] } = {}) {
  if (!peptide) {
    return { massLabel: null, unitsLabel: null, primary: '—', secondary: null, combined: null };
  }

  const usingTitration = isUsingTitration(peptide);
  const cp = usingTitration ? getCurrentTitrationPhase(protocol, peptide) : null;

  let massAmount = null;
  let massUnit = 'mcg';
  if (cp && (cp.dose != null && cp.dose !== '')) {
    massAmount = cp.dose;
    massUnit = (cp.unit || cp.doseUnit || 'mcg').trim() || 'mcg';
  } else if (peptide?.dosage?.amount != null && peptide.dosage.amount !== '') {
    massAmount = peptide.dosage.amount;
    massUnit = (peptide.dosage.unit || 'mcg').trim() || 'mcg';
  }

  const massLabel =
    massAmount != null && massAmount !== '' ? `${massAmount} ${massUnit}` : null;

  const unitsLabel = resolveUnitsLabel(protocol, peptide, {
    usingTitration,
    massAmount,
    massUnit,
    reconItems,
  });

  // Units first when present — that's what users draw
  const primary = unitsLabel || massLabel || '—';
  const secondary = unitsLabel && massLabel ? massLabel : null;
  const combined =
    unitsLabel && massLabel
      ? `${unitsLabel} · ${massLabel}`
      : unitsLabel || massLabel || null;

  return { massLabel, unitsLabel, primary, secondary, combined };
}
