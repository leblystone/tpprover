import React from 'react';
import { motion } from 'framer-motion';
import { Clock, RotateCw, CalendarClock, Repeat, Zap, Sparkles, Layers } from 'lucide-react';
import logo from '../../assets/tpp_logo.png';
import { resolveProtocolPurposeIcon } from '../../utils/protocolPurposeIcons';
import { getProtocolAccentHex } from '../../utils/protocolColors';

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

const isLightColor = (hex) => {
    const h = (hex || '#7F9E95').replace('#', '');
    if (h.length !== 6) return false;
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luminance > 0.62;
};

const barSpring = { type: 'spring', stiffness: 380, damping: 28, mass: 0.85 };

// Animated bar for titration chart — glass cap + spring physics
function TitrationBar({ heightPct, accent, accentRgb, isActive, delay }) {
    return (
        <div className="flex-1 flex flex-col items-center justify-end h-full min-h-0">
            <motion.div
                className="w-full rounded-t-md relative overflow-hidden"
                initial={{ height: '0%', opacity: 0 }}
                animate={{ height: `${heightPct}%`, opacity: 1 }}
                transition={{ ...barSpring, delay }}
                style={{
                    backgroundColor: accent,
                    minHeight: 5,
                    boxShadow: isActive
                        ? `0 -6px 18px rgba(${accentRgb}, 0.45), inset 0 1px 0 rgba(255,255,255,0.35), 0 0 0 1px rgba(255,255,255,0.2)`
                        : `0 -3px 10px rgba(${accentRgb}, 0.2), inset 0 1px 0 rgba(255,255,255,0.2)`,
                }}
            >
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.08) 35%, transparent 70%)',
                    }}
                />
                {isActive && (
                    <>
                        <motion.div
                            className="absolute inset-0 rounded-t-md"
                            animate={{ opacity: [0.35, 0, 0.35] }}
                            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                            style={{ background: `linear-gradient(180deg, rgba(255,255,255,0.25), transparent)` }}
                        />
                        <motion.div
                            className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white"
                            animate={{ scale: [1, 1.4, 1], opacity: [0.9, 0.5, 0.9] }}
                            transition={{ duration: 1.4, repeat: Infinity }}
                            style={{ boxShadow: '0 0 6px rgba(255,255,255,0.9)' }}
                        />
                    </>
                )}
            </motion.div>
        </div>
    );
}

export default function SharedProtocolCard({ item: p, theme }) {
    if (!p) return null;
    const T = getT(theme);
    const accent = getProtocolAccentHex(p);
    const accentRgb = hexToRgb(accent);
    const accentIsLight = isLightColor(accent);
    const heroText = accentIsLight ? '#111827' : '#FFFFFF';
    const duration = fmt.duration(p);
    const isDark = theme?.isDark ?? false;

    return (
        <div
            className="rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
            style={{
                fontFamily: 'Poppins, sans-serif',
                minWidth: 300,
                backgroundColor: T.card,
                boxShadow: `0 24px 64px rgba(${accentRgb}, 0.2), 0 8px 24px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.65)`,
            }}
        >
            {/* ─── Hero: full-bleed gradient + glass overlay ─── */}
            <div
                className="relative overflow-hidden"
                style={{
                    background: `linear-gradient(135deg, rgba(${accentRgb}, ${accentIsLight ? '0.88' : '0.95'}) 0%, rgba(${accentRgb}, ${accentIsLight ? '0.66' : '0.7'}) 50%, rgba(${accentRgb}, ${accentIsLight ? '0.5' : '0.5'}) 100%)`,
                    padding: '20px 20px 24px',
                }}
            >
                {/* Contrast veil for very light protocol colors */}
                {accentIsLight && (
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.08) 60%, rgba(0,0,0,0.04) 100%)' }}
                    />
                )}
                {/* Mesh noise overlay for texture */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        backgroundImage: `radial-gradient(ellipse at 80% 0%, rgba(255,255,255,0.25) 0%, transparent 60%),
                                          radial-gradient(ellipse at 10% 100%, rgba(255,255,255,0.12) 0%, transparent 50%)`,
                    }}
                />
                {/* Glowing orb top-right */}
                <div
                    className="absolute -top-10 -right-10 w-44 h-44 rounded-full pointer-events-none"
                    style={{
                        background: `radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 65%)`,
                        filter: 'blur(2px)',
                    }}
                />

                {/* Logo + brand */}
                <div className="relative flex items-center gap-2 mb-4">
                    <div
                        className="w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)' }}
                    >
                        <img src={logo} alt="TPP" className="h-5 w-5 rounded-full object-cover" />
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: accentIsLight ? 'rgba(17,24,39,0.78)' : 'rgba(255,255,255,0.75)' }}>
                        The Pep Planner
                    </span>
                </div>

                {/* Protocol name */}
                <motion.h1
                    className="relative font-black leading-none tracking-tight mb-2"
                    style={{
                        fontSize: 28,
                        color: heroText,
                        textShadow: accentIsLight ? '0 1px 1px rgba(255,255,255,0.18)' : `0 2px 12px rgba(${accentRgb}, 0.4)`,
                    }}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    {p.protocolName || 'Research Protocol'}
                </motion.h1>

                {/* Purpose badge — glassmorphism pill */}
                {p.purpose && (() => {
                    const PurposeIcon = resolveProtocolPurposeIcon(p);
                    return (
                        <div
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full mb-3"
                            style={{
                                backgroundColor: accentIsLight ? 'rgba(255,255,255,0.46)' : 'rgba(255,255,255,0.2)',
                                backdropFilter: 'blur(12px)',
                                border: accentIsLight ? '1px solid rgba(255,255,255,0.58)' : '1px solid rgba(255,255,255,0.35)',
                            }}
                        >
                            <PurposeIcon size={11} strokeWidth={2.5} style={{ color: heroText }} />
                            <span className="text-[11px] font-bold" style={{ color: heroText }}>
                                {p.purpose}
                            </span>
                        </div>
                    );
                })()}

                {/* Meta chips row */}
                <div className="relative flex flex-wrap gap-2 mt-1">
                    {duration && (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full"
                            style={{ backgroundColor: accentIsLight ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)', color: accentIsLight ? 'rgba(17,24,39,0.92)' : 'rgba(255,255,255,0.9)' }}>
                            <CalendarClock size={9} />
                            {duration}
                        </span>
                    )}
                    {p.peptides?.[0]?.frequency && fmt.frequency(p.peptides[0].frequency) && (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full"
                            style={{ backgroundColor: accentIsLight ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)', color: accentIsLight ? 'rgba(17,24,39,0.92)' : 'rgba(255,255,255,0.9)' }}>
                            <Repeat size={9} />
                            {fmt.frequency(p.peptides[0].frequency)}
                        </span>
                    )}
                    {p.washout?.enabled && p.washout?.count > 0 && (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full"
                            style={{ backgroundColor: accentIsLight ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)', color: accentIsLight ? 'rgba(17,24,39,0.92)' : 'rgba(255,255,255,0.9)' }}>
                            <RotateCw size={9} />
                            {p.washout.count}{p.washout.unit?.[0]} washout
                        </span>
                    )}
                </div>
            </div>

            {/* ─── Peptide sections ─── */}
            <div className="px-4 pb-2 pt-4 space-y-3">
                {p.peptides && p.peptides.length > 0 && p.peptides.map((peptide, index) => {
                    const hasTitration = Array.isArray(peptide.titration) && peptide.titration.length > 0;
                    const freqLabel = fmt.frequency(peptide.frequency);
                    const maxDose = hasTitration
                        ? Math.max(...peptide.titration.map(ph => parseFloat(ph.dose) || 0), 1)
                        : 1;

                    return (
                        <div key={peptide.id || index}>
                            {/* Peptide name label (multi-peptide) */}
                            {p.peptides.length > 1 && (
                                <div className="flex items-center gap-2 mb-2.5">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: accent }} />
                                    <span className="text-[12px] font-bold" style={{ color: T.text, opacity: 0.8 }}>
                                        {peptide.name}
                                    </span>
                                </div>
                            )}

                            {hasTitration ? (
                                /* ── Glass titration “deck” — gamified phase track ── */
                                <motion.div
                                    className="rounded-2xl overflow-hidden"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                                    style={{
                                        background: isDark
                                            ? `linear-gradient(160deg, rgba(${accentRgb}, 0.22) 0%, rgba(255,255,255,0.04) 45%, rgba(${accentRgb}, 0.08) 100%)`
                                            : `linear-gradient(160deg, rgba(${accentRgb}, 0.14) 0%, rgba(255,255,255,0.55) 40%, rgba(${accentRgb}, 0.06) 100%)`,
                                        border: `1px solid rgba(${accentRgb}, 0.28)`,
                                        backdropFilter: 'blur(14px)',
                                        WebkitBackdropFilter: 'blur(14px)',
                                        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -1px 0 rgba(${accentRgb}, 0.12), 0 8px 32px rgba(${accentRgb}, 0.12)`,
                                    }}
                                >
                                    {/* Panel header */}
                                    <div className="flex items-center justify-between px-4 pt-4 pb-2">
                                        <div className="flex items-center gap-2.5">
                                            <motion.div
                                                className="w-7 h-7 rounded-lg flex items-center justify-center"
                                                style={{
                                                    backgroundColor: `rgba(${accentRgb}, 0.22)`,
                                                    border: '1px solid rgba(255,255,255,0.25)',
                                                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
                                                }}
                                                whileHover={{ scale: 1.05 }}
                                            >
                                                <Layers size={13} strokeWidth={2.5} style={{ color: accent }} />
                                            </motion.div>
                                            <div>
                                                <span className="text-[11px] font-black uppercase tracking-[0.18em] block leading-tight" style={{ color: accent }}>
                                                    Titration
                                                </span>
                                                <span className="text-[9px] font-semibold opacity-40" style={{ color: T.text }}>Phase roadmap</span>
                                            </div>
                                        </div>
                                        <motion.span
                                            className="inline-flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-full"
                                            style={{
                                                backgroundColor: 'rgba(255,255,255,0.38)',
                                                border: '1px solid rgba(255,255,255,0.55)',
                                                color: accent,
                                                backdropFilter: 'blur(10px)',
                                                WebkitBackdropFilter: 'blur(10px)',
                                                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
                                            }}
                                            initial={{ scale: 0.92, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ delay: 0.3, type: 'spring', stiffness: 420, damping: 24 }}
                                        >
                                            <Sparkles size={11} strokeWidth={2.5} />
                                            {peptide.titration.length} phases
                                        </motion.span>
                                    </div>

                                    {/* Glass chart well + baseline */}
                                    <div
                                        className="mx-3 mb-2 rounded-xl px-4 pt-4 pb-0"
                                        style={{
                                            background: isDark
                                                ? 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(255,255,255,0.03) 100%)'
                                                : 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.08) 100%)',
                                            border: `1px solid rgba(${accentRgb}, 0.15)`,
                                            boxShadow: 'inset 0 2px 12px rgba(0,0,0,0.06), inset 0 -1px 0 rgba(255,255,255,0.4)',
                                        }}
                                    >
                                        <div className="flex items-end gap-[5px]" style={{ height: 96 }}>
                                            {peptide.titration.map((phase, idx) => {
                                                const dose = parseFloat(phase.dose) || 0;
                                                const heightPct = Math.max(10, (dose / maxDose) * 100);
                                                const isLast = idx === peptide.titration.length - 1;
                                                return (
                                                    <TitrationBar
                                                        key={idx}
                                                        heightPct={heightPct}
                                                        accent={accent}
                                                        accentRgb={accentRgb}
                                                        isActive={isLast}
                                                        delay={0.12 + idx * 0.08}
                                                    />
                                                );
                                            })}
                                        </div>
                                        {/* Baseline rail */}
                                        <div
                                            className="h-[3px] rounded-full mt-1.5 mb-2"
                                            style={{
                                                background: `linear-gradient(90deg, transparent, rgba(${accentRgb}, 0.35) 20%, rgba(${accentRgb}, 0.35) 80%, transparent)`,
                                                opacity: 0.6,
                                            }}
                                        />
                                    </div>

                                    {/* Phase checkpoint dots */}
                                    <div className="flex justify-center gap-2 px-4 pb-1.5">
                                        {peptide.titration.map((_, idx) => {
                                            const isLast = idx === peptide.titration.length - 1;
                                            return (
                                                <motion.div
                                                    key={idx}
                                                    className="rounded-full"
                                                    style={{
                                                        width: isLast ? 9 : 6,
                                                        height: isLast ? 9 : 6,
                                                        backgroundColor: isLast ? accent : `rgba(${accentRgb}, 0.25)`,
                                                        boxShadow: isLast
                                                            ? `0 0 12px rgba(${accentRgb}, 0.65), 0 0 0 2px rgba(255,255,255,0.5)`
                                                            : 'none',
                                                    }}
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{ delay: 0.2 + idx * 0.06, type: 'spring', stiffness: 500, damping: 18 }}
                                                />
                                            );
                                        })}
                                    </div>

                                    {/* Dose labels — staggered */}
                                    <div className="flex gap-[3px] px-4 pb-3">
                                        {peptide.titration.map((phase, idx) => (
                                            <motion.div
                                                key={idx}
                                                className="flex-1 flex flex-col items-center"
                                                initial={{ opacity: 0, y: 4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.35 + idx * 0.05, duration: 0.35 }}
                                            >
                                                <span className="text-[10px] font-black tabular-nums leading-none text-center w-full truncate" style={{ color: T.text }}>
                                                    {phase.dose}<span style={{ fontSize: 7, opacity: 0.5 }}>{phase.doseUnit || 'mg'}</span>
                                                </span>
                                                <span className="text-[8px] leading-none text-center w-full truncate mt-1" style={{ color: T.muted, opacity: 0.5 }}>
                                                    {fmt.phaseLen(phase)}
                                                </span>
                                            </motion.div>
                                        ))}
                                    </div>

                                    {freqLabel && (
                                        <motion.div
                                            className="flex items-center gap-1.5 px-4 pb-3.5"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 0.55 }}
                                            transition={{ delay: 0.55 }}
                                            style={{ color: T.muted }}
                                        >
                                            <Clock size={10} strokeWidth={2.5} />
                                            <span className="text-[10px] font-semibold">{freqLabel}</span>
                                        </motion.div>
                                    )}
                                </motion.div>
                            ) : (
                                /* ── Single dose glass tile ── */
                                <motion.div
                                    className="rounded-2xl px-4 py-3 flex items-center justify-between"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                                    style={{
                                        background: isDark
                                            ? `linear-gradient(145deg, rgba(${accentRgb}, 0.18) 0%, rgba(${accentRgb}, 0.06) 100%)`
                                            : `linear-gradient(145deg, rgba(${accentRgb}, 0.1) 0%, rgba(${accentRgb}, 0.03) 100%)`,
                                        border: `1px solid rgba(${accentRgb}, 0.22)`,
                                        backdropFilter: 'blur(14px)',
                                        WebkitBackdropFilter: 'blur(14px)',
                                        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.35), 0 6px 24px rgba(${accentRgb}, 0.08)`,
                                    }}
                                >
                                    <div>
                                        <div className="text-[9px] font-bold uppercase tracking-[0.18em] mb-1.5" style={{ color: accent, opacity: 0.65 }}>Dose</div>
                                        <span className="text-[30px] font-black tabular-nums leading-none" style={{ color: accent }}>
                                            {peptide.dosage?.amount || '—'}
                                            <span className="text-[13px] font-semibold opacity-55 ml-1">{peptide.dosage?.unit || 'mg'}</span>
                                        </span>
                                    </div>
                                    {freqLabel && (
                                        <div
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
                                            style={{
                                                backgroundColor: `rgba(${accentRgb}, 0.15)`,
                                                border: `1px solid rgba(${accentRgb}, 0.25)`,
                                            }}
                                        >
                                            <Zap size={11} style={{ color: accent }} />
                                            <span className="text-[11px] font-bold" style={{ color: accent }}>{freqLabel}</span>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </div>
                    );
                })}

                {p.notes && p.notes.trim() && (
                    <p className="text-[11px] leading-relaxed italic px-1 opacity-45" style={{ color: T.muted }}>
                        "{p.notes}"
                    </p>
                )}
            </div>

            {/* ─── Footer ─── */}
            <div className="px-5 py-3 flex items-center justify-center">
                <p className="text-[9px] opacity-30 font-semibold" style={{ color: T.text }}>For Research &amp; Informational Purposes Only</p>
            </div>
        </div>
    );
}
