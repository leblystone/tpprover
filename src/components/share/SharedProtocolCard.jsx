import React from 'react';
import { Clock, RotateCw, CalendarClock, TrendingUp, Repeat } from 'lucide-react';
import logo from '../../assets/tpp_logo.png';
import { getPurposeIconComponent } from '../../utils/protocolPurposeIcons';
import { getProtocolColor } from '../../utils/protocolColors';

const getT = (theme) => ({
    border: theme?.border  || '#DDE6DE',
    text:   theme?.text    || '#1E2B2A',
    muted:  theme?.textLight || '#5C6E6C',
    bg:     theme?.secondary || '#F5F8F6',
    card:   theme?.cardBackground || '#ffffff',
});

const fmt = {
    frequency: (freq) => {
        if (!freq) return null;
        if (freq.type === 'daily') return 'Daily';
        if (freq.type === 'weekly' && freq.days?.length) return freq.days.join(', ');
        if (freq.type === 'cycle') return `${freq.onDays}d on · ${freq.offDays}d off`;
        if (freq.type === 'custom' && freq.customDays) return `Every ${freq.customDays}d`;
        return null;
    },
    duration: (p) => {
        if (p.duration?.noEnd) return 'Ongoing';
        if (p.duration?.count && p.duration?.unit) return `${p.duration.count} ${p.duration.unit}s`;
        return null;
    },
    phaseLen: (phase) => {
        if (phase.durationUnit === 'ongoing') return '∞';
        if (!phase.durationCount) return '';
        const u = phase.durationUnit === 'weeks' ? 'wk' : phase.durationUnit === 'months' ? 'mo' : 'd';
        return `${phase.durationCount}${u}`;
    },
};

const hexToRgb = (hex) => {
    const h = (hex || '#7F9E95').replace('#', '');
    if (h.length !== 6) return '127, 158, 149';
    return `${parseInt(h.slice(0,2),16)}, ${parseInt(h.slice(2,4),16)}, ${parseInt(h.slice(4,6),16)}`;
};

export default function SharedProtocolCard({ item: p, theme }) {
    if (!p) return null;
    const T = getT(theme);
    const accent = p.protocolColor || getProtocolColor(p.id);
    const accentRgb = hexToRgb(accent);
    const duration = fmt.duration(p);

    return (
        <div
            className="rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
            style={{ fontFamily: 'Poppins, sans-serif', minWidth: 300, backgroundColor: T.card }}
        >
            {/* ─── Hero header with gradient wash ─── */}
            <div
                className="relative px-5 pt-5 pb-4 overflow-hidden"
                style={{
                    background: `linear-gradient(145deg, rgba(${accentRgb}, 0.14) 0%, rgba(${accentRgb}, 0.04) 60%, ${T.card} 100%)`,
                }}
            >
                {/* Decorative circle */}
                <div
                    className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
                    style={{ background: `radial-gradient(circle, rgba(${accentRgb}, 0.18) 0%, transparent 70%)` }}
                />

                {/* Logo + brand row */}
                <div className="flex items-center gap-2 mb-3">
                    <img src={logo} alt="TPP" className="h-6 w-6 rounded-full shadow-sm object-cover" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.18em] opacity-50" style={{ color: T.text }}>
                        The Pep Planner
                    </span>
                </div>

                {/* Protocol name */}
                <h1 className="font-black text-2xl leading-tight tracking-tight mb-1" style={{ color: T.text }}>
                    {p.protocolName || 'Research Protocol'}
                </h1>

                {/* Purpose badge */}
                {p.purpose && (() => {
                    const PurposeIcon = getPurposeIconComponent(p.purposeIcon);
                    return (
                        <div
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                            style={{
                                backgroundColor: `rgba(${accentRgb}, 0.12)`,
                                border: `1px solid rgba(${accentRgb}, 0.25)`,
                            }}
                        >
                            <PurposeIcon size={11} strokeWidth={2} style={{ color: accent }} />
                            <span className="text-[10px] font-semibold" style={{ color: accent }}>
                                {p.purpose}
                            </span>
                        </div>
                    );
                })()}

                {/* Meta chips */}
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {duration && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-semibold opacity-60" style={{ color: T.text }}>
                            <CalendarClock size={9} />
                            {duration}
                        </span>
                    )}
                    {p.peptides?.[0]?.frequency && fmt.frequency(p.peptides[0].frequency) && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-semibold opacity-60" style={{ color: T.text }}>
                            <Repeat size={9} />
                            {fmt.frequency(p.peptides[0].frequency)}
                        </span>
                    )}
                    {p.washout?.enabled && p.washout?.count > 0 && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-semibold opacity-60" style={{ color: T.text }}>
                            <RotateCw size={9} />
                            {p.washout.count} {p.washout.unit} washout
                        </span>
                    )}
                </div>
            </div>

            {/* ─── Peptide sections ─── */}
            <div className="px-5 pb-4 space-y-3">
                {p.peptides && p.peptides.length > 0 && p.peptides.map((peptide, index) => {
                    const hasTitration = Array.isArray(peptide.titration) && peptide.titration.length > 0;
                    const freqLabel = fmt.frequency(peptide.frequency);
                    const maxDose = hasTitration
                        ? Math.max(...peptide.titration.map(ph => parseFloat(ph.dose) || 0), 1)
                        : 1;

                    return (
                        <div key={peptide.id || index}>
                            {p.peptides.length > 1 && (
                                <div className="flex items-center gap-1.5 mb-2">
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accent }} />
                                    <span className="text-[11px] font-bold opacity-70" style={{ color: T.text }}>
                                        {peptide.name}
                                    </span>
                                </div>
                            )}

                            {hasTitration ? (
                                <div
                                    className="rounded-xl px-3 pt-3 pb-2.5"
                                    style={{ backgroundColor: T.bg, border: `1px solid ${T.border}` }}
                                >
                                    <div className="flex items-center gap-1.5 mb-3">
                                        <TrendingUp size={10} style={{ color: accent }} />
                                        <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: accent, opacity: 0.85 }}>
                                            Titration
                                        </span>
                                        <span className="text-[9px] opacity-40 ml-auto" style={{ color: T.muted }}>
                                            {peptide.titration.length} phases
                                        </span>
                                    </div>

                                    {/* Bar chart */}
                                    <div className="flex items-end gap-[3px]" style={{ height: 52 }}>
                                        {peptide.titration.map((phase, idx) => {
                                            const dose = parseFloat(phase.dose) || 0;
                                            const heightPct = Math.max(12, (dose / maxDose) * 100);
                                            const isLast = idx === peptide.titration.length - 1;
                                            const opacity = 0.35 + (idx / Math.max(peptide.titration.length - 1, 1)) * 0.65;
                                            return (
                                                <div key={idx} className="flex-1 flex flex-col items-center justify-end">
                                                    <div
                                                        className="w-full rounded-t-md"
                                                        style={{
                                                            height: `${heightPct}%`,
                                                            backgroundColor: accent,
                                                            opacity,
                                                            boxShadow: isLast ? `0 -2px 8px rgba(${accentRgb}, 0.4)` : 'none',
                                                        }}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Dose + duration labels */}
                                    <div className="flex gap-[3px] mt-1.5">
                                        {peptide.titration.map((phase, idx) => (
                                            <div key={idx} className="flex-1 flex flex-col items-center">
                                                <span className="text-[8px] font-black tabular-nums leading-none text-center w-full truncate" style={{ color: T.text }}>
                                                    {phase.dose}
                                                    <span style={{ fontSize: 6, fontWeight: 600, opacity: 0.6 }}>{phase.doseUnit || 'mg'}</span>
                                                </span>
                                                <span className="text-[7px] leading-none text-center w-full truncate mt-0.5" style={{ color: T.muted, opacity: 0.55 }}>
                                                    {fmt.phaseLen(phase)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {freqLabel && (
                                        <div className="mt-2 flex items-center gap-1 opacity-40" style={{ color: T.muted }}>
                                            <Clock size={7} />
                                            <span className="text-[8px]">{freqLabel}</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div
                                    className="rounded-xl px-3 py-2.5 flex items-center justify-between"
                                    style={{ backgroundColor: T.bg, border: `1px solid ${T.border}` }}
                                >
                                    <div>
                                        <div className="text-[9px] font-bold uppercase tracking-widest opacity-40 mb-0.5" style={{ color: T.text }}>Dose</div>
                                        <span className="text-xl font-black tabular-nums" style={{ color: accent }}>
                                            {peptide.dosage?.amount || '—'}
                                            <span className="text-[11px] font-semibold opacity-60 ml-0.5">{peptide.dosage?.unit || 'mg'}</span>
                                        </span>
                                    </div>
                                    {freqLabel && (
                                        <div
                                            className="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold"
                                            style={{ backgroundColor: `rgba(${accentRgb}, 0.1)`, color: accent }}
                                        >
                                            {freqLabel}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}

                {p.notes && p.notes.trim() && (
                    <p className="text-[10px] leading-relaxed italic px-1 opacity-50" style={{ color: T.muted }}>
                        "{p.notes}"
                    </p>
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
