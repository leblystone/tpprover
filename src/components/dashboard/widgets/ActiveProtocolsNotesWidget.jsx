import React, { useState } from 'react';
import { FlaskConical, Lock, ChevronDown, Zap, CheckCheck } from 'lucide-react';
import ActiveProtocolsNotes from '../ActiveProtocolsNotes';
import ExpandableTooltip from '../../ui/ExpandableTooltip';
import { WIDGET_TOOLTIPS } from '../../../utils/widgetTooltips';

const ActiveProtocolsNotesWidget = ({ widget, theme, protocols, onAddNote, onOpenQuickStart, onOpenFullSetup, isReadOnly = false, onUpgrade }) => {
    const [showStartOptions, setShowStartOptions] = useState(false);
    // Filter active protocols
    const activeProtocols = protocols ? protocols.filter(p => {
        if (p?.active !== true) return false;
        if (!p?.startDate) return false;
        const today = new Date();
        const s = new Date(p.startDate);
        if (today < new Date(s.getFullYear(), s.getMonth(), s.getDate())) return false;
        if (p.endDate) {
            const e = new Date(p.endDate);
            return today <= new Date(e.getFullYear(), e.getMonth(), e.getDate());
        }
        const d = p.duration || {};
        if (d.noEnd || !d.count || !d.unit) return true;
        const e = new Date(s);
        if (String(d.unit).toLowerCase() === 'day') e.setDate(e.getDate() + Number(d.count));
        else if (String(d.unit).toLowerCase() === 'week') e.setDate(e.getDate() + Number(d.count) * 7);
        else if (String(d.unit).toLowerCase() === 'month') e.setMonth(e.getMonth() + Number(d.count));
        return today <= new Date(e.getFullYear(), e.getMonth(), e.getDate());
    }) : [];

    // Show all active protocols (no limit)
    const limitedProtocols = activeProtocols;

    // If no active protocols, show compact version
    if (!limitedProtocols || limitedProtocols.length === 0) {
        return (
            <div className="relative h-full flex flex-col">
                <div className={`px-4 py-3 widget-separator`} style={{ borderColor: theme.isDark ? 'transparent' : 'rgba(47, 59, 58, 0.4)' }}>
                    <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold flex items-center gap-2" style={{ color: theme.text }}>
                            Active Research
                            <FlaskConical size={18} style={{ color: theme.primary }} />
                        </h3>
                        <div className="flex items-center gap-2">
                            <ExpandableTooltip content={WIDGET_TOOLTIPS.active_protocols_notes} theme={theme} />
                        </div>
                    </div>
                </div>
                
                <div className="flex-1 p-2 sm:p-4 flex flex-col items-center justify-center gap-3 min-h-0 overflow-hidden">
                    {!showStartOptions ? (
                        <>
                            <p className="text-sm text-center px-2" style={{ color: theme.textLight }}>
                                No active protocols
                            </p>
                            <button
                                type="button"
                                onClick={() => (onOpenQuickStart || onOpenFullSetup) && setShowStartOptions(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
                                style={{
                                    color: theme.primary,
                                    backgroundColor: theme.isDark ? `${theme.primary}20` : `${theme.primary}15`,
                                    border: `1px solid ${theme.primary}40`
                                }}
                            >
                                Add a Protocol
                                <ChevronDown size={14} />
                            </button>
                        </>
                    ) : (
                        <div className="w-full max-w-[260px] space-y-2 overflow-y-auto">
                            {onOpenQuickStart && (
                                <button
                                    type="button"
                                    onClick={() => { setShowStartOptions(false); onOpenQuickStart(); }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
                                    style={{
                                        color: theme.text,
                                        backgroundColor: theme.isDark ? '#1f2937' : theme.secondary,
                                        border: `1px solid ${theme.border}`
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : 'rgba(0,0,0,0.06)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = theme.isDark ? '#1f2937' : theme.secondary; }}
                                >
                                    <Zap size={18} style={{ color: theme.primary }} fill={theme.primary} />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-sm">Quick Start Protocol</div>
                                        <div className="text-[10px] opacity-60">30 sec, add details later</div>
                                    </div>
                                </button>
                            )}
                            {onOpenFullSetup && (
                                <button
                                    type="button"
                                    onClick={() => { setShowStartOptions(false); onOpenFullSetup(); }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
                                    style={{
                                        color: theme.text,
                                        backgroundColor: theme.isDark ? '#1f2937' : theme.secondary,
                                        border: `1px solid ${theme.border}`
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : 'rgba(0,0,0,0.06)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = theme.isDark ? '#1f2937' : theme.secondary; }}
                                >
                                    <CheckCheck size={18} style={{ color: theme.textLight }} />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-sm">Full Protocol Setup</div>
                                        <div className="text-[10px] opacity-60">Complete details</div>
                                    </div>
                                </button>
                            )}
                        </div>
                    )}
                </div>
                
                {/* Lockout Overlay */}
                {isReadOnly && (
                    <div className="absolute inset-0 backdrop-blur-sm bg-white/70 flex items-center justify-center z-50 rounded-lg">
                        <div className="text-center p-4">
                            <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: `${theme.primary}20` }}>
                                <Lock size={24} style={{ color: theme.primary }} />
                            </div>
                            <p className="text-sm font-semibold mb-2" style={{ color: theme.primaryDark }}>
                                Trial has ended
                            </p>
                            <button
                                onClick={() => {
                                    if (onUpgrade) onUpgrade();
                                    else window.location.href = '/app/account';
                                }}
                                className="px-4 py-2 rounded-lg font-medium action-button-hover text-sm btn-primary-inset"
                                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                            >
                                <span className="text-hover">Upgrade</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="relative h-full">
            <ActiveProtocolsNotes 
                protocols={limitedProtocols} 
                theme={theme} 
                onAddNote={onAddNote}
            />
            
            {/* Lockout Overlay */}
            {isReadOnly && (
                <div className="absolute inset-0 backdrop-blur-sm bg-white/70 flex items-center justify-center z-50 rounded-lg">
                    <div className="text-center p-4">
                        <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: `${theme.primary}20` }}>
                            <Lock size={24} style={{ color: theme.primary }} />
                        </div>
                        <p className="text-sm font-semibold mb-2" style={{ color: theme.primaryDark }}>
                            Trial has ended
                        </p>
                        <button
                            onClick={() => {
                                if (onUpgrade) onUpgrade();
                                else window.location.href = '/app/account';
                            }}
                            className="px-4 py-2 rounded-lg font-medium action-button-hover text-sm btn-primary-inset"
                            style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                        >
                            <span className="text-hover">Upgrade</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActiveProtocolsNotesWidget;

