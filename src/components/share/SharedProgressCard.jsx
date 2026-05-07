import React from 'react';
import { TrendingUp, Clock } from 'lucide-react';
import logo from '../../assets/tpp_logo.png';
import { parseDateString } from '../../utils/date';
import { ProtocolPurposeGlyph } from '../../utils/protocolPurposeIcons';
import { getProtocolAccentHex } from '../../utils/protocolColors';

const getT = (theme) => ({
    border: theme?.border     || '#DDE6DE',
    text:   theme?.text       || '#1E2B2A',
    muted:  theme?.textLight  || '#5C6E6C',
    bg:     theme?.secondary  || '#F5F8F6',
    card:   theme?.cardBackground || '#ffffff',
});

const fmtDate = (d) => d ? `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}` : '';

const fmtFreq = (freq) => {
    if (!freq) return null;
    if (freq.type === 'daily') return 'Daily';
    if (freq.type === 'custom' && freq.customDays) return `Every ${freq.customDays}d`;
    if (freq.type === 'cycle') return `${freq.onDays}d on · ${freq.offDays}d off`;
    if (freq.type === 'weekly' && freq.days?.length) return freq.days.join(', ');
    return null;
};

const hexToRgb = (hex) => {
    const h = (hex || '#7F9E95').replace('#', '');
    if (h.length !== 6) return '127, 158, 149';
    return `${parseInt(h.slice(0,2),16)}, ${parseInt(h.slice(2,4),16)}, ${parseInt(h.slice(4,6),16)}`;
};

const SEGMENTS = [
    { label: '30d', start: 0,   end: 30 },
    { label: '60d', start: 30,  end: 60 },
    { label: '90d', start: 60,  end: 90 },
    { label: '6mo', start: 90,  end: 180 },
    { label: '1yr', start: 180, end: 365 },
];

export default function SharedProgressCard({ item: p, theme }) {
    if (!p) return null;

    const accent = getProtocolAccentHex(p);
    const accentRgb = hexToRgb(accent);
    const primaryPeptide = p.peptides?.[0];
    const hasTitration = Array.isArray(primaryPeptide?.titration) && primaryPeptide.titration.length > 0;

    const startDate = p.startDate ? parseDateString(p.startDate) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysActive = startDate ? Math.max(0, Math.floor((today - startDate) / 86400000)) : 0;

    let doseValue = null;
    let doseUnit = 'mg';
    let phaseIndex = null;
    let totalPhases = null;

    if (hasTitration) {
        const phases = primaryPeptide.titration;
        totalPhases = phases.length;
        let dayOffset = 0;
        let found = phases[phases.length - 1];
        let foundIdx = phases.length - 1;

        for (let i = 0; i < phases.length; i++) {
            const ph = phases[i];
            if (ph.durationUnit === 'ongoing') { found = ph; foundIdx = i; break; }
            const count = parseInt(ph.durationCount) || 0;
            const unit = ph.durationUnit || 'weeks';
            const phaseDays = unit === 'days' ? count : unit === 'weeks' ? count * 7 : count * 30;
            dayOffset += phaseDays;
            if (daysActive < dayOffset) { found = ph; foundIdx = i; break; }
        }

        doseValue = found?.dose ?? null;
        doseUnit = found?.doseUnit || 'mg';
        phaseIndex = foundIdx + 1;
    } else if (primaryPeptide?.dosage?.amount) {
        doseValue = primaryPeptide.dosage.amount;
        doseUnit = primaryPeptide.dosage.unit || 'mg';
    }

    const T = getT(theme);
    const freqLabel = fmtFreq(primaryPeptide?.frequency);
    const tileStyle = { backgroundColor: `rgba(${accentRgb}, 0.07)`, border: `1px solid rgba(${accentRgb}, 0.16)` };
    const labelStyle = { color: accent, opacity: 0.7 };

    return (
        <div
            className="rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
            style={{ fontFamily: 'Poppins, sans-serif', minWidth: 300, backgroundColor: T.card }}
        >
            {/* ─── Gradient header ─── */}
            <div
                className="relative px-5 pt-5 pb-4 overflow-hidden"
                style={{ background: `linear-gradient(145deg, rgba(${accentRgb}, 0.14) 0%, rgba(${accentRgb}, 0.04) 60%, ${T.card} 100%)` }}
            >
                <div
                    className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
                    style={{ background: `radial-gradient(circle, rgba(${accentRgb}, 0.18) 0%, transparent 70%)` }}
                />

                <div className="flex items-center gap-2 mb-3">
                    <img src={logo} alt="TPP" className="h-6 w-6 rounded-full shadow-sm object-cover" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.18em] opacity-50" style={{ color: T.text }}>
                        The Pep Planner
                    </span>
                </div>

                <h1 className="font-black text-2xl leading-tight tracking-tight mb-1" style={{ color: T.text }}>
                    {p.protocolName || 'Research Protocol'}
                </h1>

                {p.purpose && (() => (
                        <div
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                            style={{ backgroundColor: `rgba(${accentRgb}, 0.12)`, border: `1px solid rgba(${accentRgb}, 0.25)` }}
                        >
                            <ProtocolPurposeGlyph protocol={p} size={11} style={{ color: accent }} />
                            <span className="text-[10px] font-semibold" style={{ color: accent }}>{p.purpose}</span>
                        </div>
                ))()}
            </div>

            {/* ─── Stats row ─── */}
            <div className="px-5 pb-4">
                <div className="flex gap-2 mt-3 mb-4">
                    {/* Days Active */}
                    <div className="flex-1 p-3 rounded-xl" style={tileStyle}>
                        <div className="text-[7.5px] font-bold uppercase tracking-[0.18em] mb-1.5" style={{ color: accent, opacity: 0.65 }}>Days Active</div>
                        <div className="text-[24px] font-black leading-none tabular-nums" style={{ color: accent }}>{daysActive}</div>
                        {startDate && (
                            <div className="text-[8px] mt-1.5 opacity-35" style={{ color: T.text }}>since {fmtDate(startDate)}</div>
                        )}
                    </div>

                    {/* Current Dose */}
                    {doseValue !== null && (
                        <div className="flex-1 p-3 rounded-xl" style={tileStyle}>
                            <div className="text-[7.5px] font-bold uppercase tracking-[0.18em] mb-1.5" style={{ color: accent, opacity: 0.65 }}>Current Dose</div>
                            <div className="flex items-baseline gap-0.5">
                                <span className="text-[24px] font-black leading-none tabular-nums" style={{ color: T.text }}>{doseValue}</span>
                                <span className="text-[11px] font-semibold opacity-45" style={{ color: T.text }}>{doseUnit}</span>
                            </div>
                            {freqLabel && (
                                <div className="text-[8px] mt-1.5 opacity-35" style={{ color: T.text }}>{freqLabel}</div>
                            )}
                        </div>
                    )}

                    {/* Phase */}
                    {hasTitration && phaseIndex && totalPhases && (
                        <div className="flex-1 p-3 rounded-xl" style={tileStyle}>
                            <div className="text-[7.5px] font-bold uppercase tracking-[0.18em] mb-1.5" style={{ color: accent, opacity: 0.65 }}>Phase</div>
                            <div className="flex items-baseline gap-0.5">
                                <span className="text-[24px] font-black leading-none tabular-nums" style={{ color: T.text }}>{phaseIndex}</span>
                                <span className="text-[11px] font-semibold opacity-35" style={{ color: T.text }}>/{totalPhases}</span>
                            </div>
                            <div className="text-[8px] mt-1.5 opacity-35" style={{ color: T.text }}>titration</div>
                        </div>
                    )}
                </div>

                {/* Titration track */}
                {hasTitration && totalPhases && (
                    <div className="rounded-xl px-3 py-2.5 mb-3" style={{ backgroundColor: `rgba(${accentRgb}, 0.07)`, border: `1px solid rgba(${accentRgb}, 0.16)`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.45)' }}>
                        <div className="flex items-center gap-1.5 mb-2">
                            <TrendingUp size={9} style={{ color: accent }} />
                            <span className="text-[8px] font-bold uppercase tracking-[0.18em]" style={{ color: accent, opacity: 0.65 }}>Titration Progress</span>
                        </div>
                        <div className="flex gap-[3px] h-[6px]">
                            {primaryPeptide.titration.map((_, idx) => {
                                const isPast = idx < phaseIndex - 1;
                                const isCurr = idx === phaseIndex - 1;
                                return (
                                    <div
                                        key={idx}
                                        className="h-full flex-1 rounded-full"
                                        style={{
                                            backgroundColor: isPast || isCurr ? accent : `rgba(${accentRgb}, 0.15)`,
                                            opacity: isPast ? 0.45 : 1,
                                            boxShadow: isCurr ? `0 0 5px rgba(${accentRgb}, 0.5)` : 'none',
                                        }}
                                    />
                                );
                            })}
                        </div>
                        <div className="flex justify-between mt-1.5">
                            <span className="text-[7px] opacity-30" style={{ color: T.muted }}>Start</span>
                            <span className="text-[7px] opacity-70 font-semibold" style={{ color: accent }}>Phase {phaseIndex} of {totalPhases}</span>
                            <span className="text-[7px] opacity-30" style={{ color: T.muted }}>End</span>
                        </div>
                    </div>
                )}

                {/* Milestone track */}
                {!hasTitration && (
                    <div className="rounded-xl px-3 py-2.5 mb-3" style={{ backgroundColor: `rgba(${accentRgb}, 0.07)`, border: `1px solid rgba(${accentRgb}, 0.16)`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.45)' }}>
                        <div className="flex items-center gap-1.5 mb-2">
                            <Clock size={9} style={{ color: accent }} />
                            <span className="text-[8px] font-bold uppercase tracking-[0.18em]" style={{ color: accent, opacity: 0.65 }}>Duration Milestones</span>
                        </div>
                        <div className="flex gap-[3px] h-[6px]">
                            {SEGMENTS.map((seg) => {
                                const isPast = daysActive >= seg.end;
                                const isCurr = !isPast && daysActive >= seg.start;
                                const fillPct = isCurr
                                    ? Math.max(5, Math.min(100, Math.round(((daysActive - seg.start) / (seg.end - seg.start)) * 100)))
                                    : 0;
                                return (
                                    <div
                                        key={seg.label}
                                        className="h-full flex-1 rounded-full overflow-hidden relative"
                                        style={{ backgroundColor: isPast ? accent : `rgba(${accentRgb}, 0.15)`, opacity: isPast ? 0.55 : 1 }}
                                    >
                                        {isCurr && (
                                            <div
                                                className="absolute inset-y-0 left-0 rounded-full"
                                                style={{ width: `${fillPct}%`, backgroundColor: accent, boxShadow: `0 0 4px rgba(${accentRgb}, 0.5)` }}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex mt-1.5">
                            {SEGMENTS.map((seg) => {
                                const isPast = daysActive >= seg.end;
                                const isCurr = !isPast && daysActive >= seg.start;
                                return (
                                    <span
                                        key={seg.label}
                                        className="flex-1 text-center text-[7px] font-medium"
                                        style={{ color: isCurr ? accent : T.muted, opacity: isPast ? 0.45 : isCurr ? 1 : 0.3, fontWeight: isCurr ? 700 : 500 }}
                                    >
                                        {seg.label}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* ─── Footer ─── */}
            <div
                className="px-5 py-2.5 flex items-center justify-center"
                style={{ backgroundColor: 'transparent' }}
            >
                <p className="text-[8px] opacity-30 font-semibold" style={{ color: T.text }}>For Research &amp; Informational Purposes Only</p>
            </div>
        </div>
    );
}
