import React from 'react';
import { Target, Clock, FileText, RotateCw, Info, TrendingUp, ArrowRight } from 'lucide-react';
import logo from '../../assets/tpp_logo.png';

// Modern theme colors - matching app aesthetic
const shareTheme = {
    primary: '#7F9E95',        // Sage green matching app
    primaryDark: '#5F7F76',
    border: '#DDE6DE',
    text: '#2F3B3A',
    textLight: '#6B7D7A',
    accent: '#8ca68c'
};

export default function SharedProtocolCard({ item: p, theme }) {
    if (!p) return null;

    const formatDuration = () => {
        if (p.duration?.noEnd) return 'Ongoing';
        if (p.duration?.count && p.duration?.unit) {
            return `${p.duration.count} ${p.duration.unit}${p.duration.count !== 1 ? 's' : ''}`;
        }
        return 'Not specified';
    };

    const formatFrequency = (freq) => {
        if (!freq) return 'Not set';
        if (freq.type === 'daily') {
            if (freq.time && Array.isArray(freq.time) && freq.time.length > 0) {
                return `Daily: ${freq.time.join(', ')}`;
            }
            return 'Daily';
        }
        if (freq.type === 'weekly' && freq.days?.length > 0) {
            return `Weekly: ${freq.days.join(', ')}`;
        }
        if (freq.type === 'cycle') {
            const cycleStr = `Cycle: ${freq.onDays || '-'} on / ${freq.offDays || '-'} off`;
            const timeStr = freq.time && Array.isArray(freq.time) && freq.time.length > 0 ? ` ${freq.time.join('/')}` : '';
            return cycleStr + timeStr;
        }
        if (freq.type === 'custom') {
            return freq.customDays ? `Every ${freq.customDays} days` : 'Custom';
        }
        return 'Not set';
    };

    return (
        <div className="p-6 rounded-2xl bg-white w-full max-w-md shadow-xl" style={{ fontFamily: 'Poppins, sans-serif' }}>
            {/* Header */}
            <div className="flex items-start justify-between mb-5 pb-4 border-b" style={{ borderColor: shareTheme.border }}>
                <div className="flex items-center gap-3">
                    <img src={logo} alt="The Pep Planner" className="h-10 w-10 rounded-full shadow-sm object-cover" />
                    <div>
                        <h1 className="font-bold text-xl tracking-tight" style={{ color: shareTheme.text }}>
                            {p.protocolName || 'Research Protocol'}
                        </h1>
                        <p className="text-xs opacity-60 mt-0.5" style={{ color: shareTheme.text }}>Research Protocol</p>
                    </div>
                </div>
            </div>

            {/* Content Sections */}
            <div className="space-y-4">
                {/* Protocol Overview */}
                <div className="relative pl-3">
                    <div 
                        className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full"
                        style={{ backgroundColor: shareTheme.accent, opacity: 0.4 }}
                    />
                    <div className="space-y-2.5">
                        {p.purpose && (
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-widest mb-1 opacity-60 flex items-center" style={{ color: shareTheme.text }}>
                                    <Target size={10} style={{ color: shareTheme.accent, marginRight: '6px' }} />
                                    Purpose
                                </div>
                                <p className="text-xs font-semibold" style={{ color: shareTheme.text }}>{p.purpose}</p>
                            </div>
                        )}
                        <div>
                            <div className="text-[10px] font-bold uppercase tracking-widest mb-1 opacity-60 flex items-center" style={{ color: shareTheme.text }}>
                                <Clock size={10} style={{ color: shareTheme.accent, marginRight: '6px' }} />
                                Duration
                            </div>
                            <p className="text-xs font-semibold" style={{ color: shareTheme.text }}>{formatDuration()}</p>
                        </div>
                        {p.washout?.enabled && p.washout?.count > 0 && (
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-widest mb-1 opacity-60 flex items-center" style={{ color: shareTheme.text }}>
                                    <RotateCw size={10} style={{ color: shareTheme.accent, marginRight: '6px' }} />
                                    Washout Period
                                </div>
                                <p className="text-xs font-semibold" style={{ color: shareTheme.text }}>
                                    {p.washout.count} {p.washout.unit}{p.washout.count !== 1 ? 's' : ''}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Peptides */}
                {p.peptides && p.peptides.length > 0 && (
                    <div className="relative pl-3">
                        <div 
                            className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full"
                            style={{ backgroundColor: shareTheme.accent, opacity: 0.4 }}
                        />
                        <div className="text-[10px] font-bold uppercase tracking-widest mb-2 opacity-60 flex items-center" style={{ color: shareTheme.text }}>
                            <Info size={10} style={{ color: shareTheme.accent, marginRight: '6px' }} />
                            Included Peptides
                        </div>
                        <div className="space-y-2">
                            {p.peptides.map((peptide, index) => {
                                const hasTitration = Array.isArray(peptide.titration) && peptide.titration.length > 0;
                                return (
                                    <div
                                        key={peptide.id || index}
                                        className="p-2.5 rounded-xl bg-gray-50"
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold" style={{ color: shareTheme.text }}>
                                                {peptide.name || 'Unnamed Peptide'}
                                            </span>
                                            {!hasTitration && peptide.dosage?.amount > 0 && (
                                                <span className="text-[10px] font-semibold opacity-70" style={{ color: shareTheme.text }}>
                                                    {peptide.dosage.amount} {peptide.dosage.unit}
                                                    {peptide.frequency && (
                                                        <span className="ml-1 opacity-60">
                                                            • {formatFrequency(peptide.frequency)}
                                                        </span>
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                        {hasTitration && (
                                            <div
                                                className="mt-2 pt-2 border-t flex items-center gap-1 flex-wrap"
                                                style={{ borderColor: `${shareTheme.border}80` }}
                                            >
                                                <div className="flex items-center gap-1 mb-1.5 w-full">
                                                    <TrendingUp size={10} style={{ color: shareTheme.primary }} />
                                                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: shareTheme.primary }}>
                                                        Titration
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1 flex-wrap">
                                                    {peptide.titration.map((phase, phaseIdx) => (
                                                        <React.Fragment key={phaseIdx}>
                                                            <div
                                                                className="px-2 py-1 rounded text-[10px] font-medium"
                                                                style={{
                                                                    backgroundColor: `${shareTheme.primary}15`,
                                                                    color: shareTheme.text,
                                                                    border: `1px solid ${shareTheme.primary}30`
                                                                }}
                                                            >
                                                                <span className="font-bold">{phase.dose} {phase.doseUnit || 'mcg'}</span>
                                                                {(phase.durationCount && phase.durationUnit) && (
                                                                    <span className="opacity-60"> · {phase.durationCount} {phase.durationUnit}</span>
                                                                )}
                                                            </div>
                                                            {phaseIdx < peptide.titration.length - 1 && (
                                                                <ArrowRight size={10} style={{ color: shareTheme.textLight, opacity: 0.5 }} />
                                                            )}
                                                        </React.Fragment>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {hasTitration && peptide.frequency && (
                                            <div className="text-[10px] opacity-60 mt-1" style={{ color: shareTheme.text }}>
                                                {formatFrequency(peptide.frequency)}
                                            </div>
                                        )}
                                        {!hasTitration && peptide.frequency && (
                                            <div className="text-[10px] opacity-60 mt-1" style={{ color: shareTheme.text }}>
                                                {formatFrequency(peptide.frequency)}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Notes */}
                {p.notes && p.notes.trim() && (
                    <div className="relative pl-3">
                        <div 
                            className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full"
                            style={{ backgroundColor: shareTheme.accent, opacity: 0.4 }}
                        />
                        <div className="text-[10px] font-bold uppercase tracking-widest mb-1.5 opacity-60 flex items-center" style={{ color: shareTheme.text }}>
                            <FileText size={10} style={{ color: shareTheme.accent, marginRight: '6px' }} />
                            Protocol Notes
                        </div>
                        <p 
                            className="text-[11px] leading-relaxed italic opacity-70"
                            style={{ color: shareTheme.text }}
                        >
                            {p.notes}
                        </p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t text-center" style={{ borderColor: shareTheme.border }}>
                <p className="text-xs font-bold mb-1" style={{ color: shareTheme.primary }}>The Pep Planner</p>
                <p className="text-[10px] opacity-60 mb-2" style={{ color: shareTheme.text }}>Organize Your Research</p>
                <p className="text-[9px] font-semibold px-2 py-1 rounded bg-red-50 text-red-700 inline-block">
                    For Research & Informational Purposes Only
                </p>
            </div>
        </div>
    );
}
