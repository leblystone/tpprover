import React from 'react';
import { FlaskConical, Lock } from 'lucide-react';
import ActiveProtocolsNotes from '../ActiveProtocolsNotes';
import ExpandableTooltip from '../../ui/ExpandableTooltip';
import { WIDGET_TOOLTIPS } from '../../../utils/widgetTooltips';

const ActiveProtocolsNotesWidget = ({ widget, theme, protocols, onAddNote, isReadOnly = false, onUpgrade }) => {
    const { maxItems = 3 } = widget.settings;
    
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

    // Limit items based on settings
    const limitedProtocols = activeProtocols.slice(0, maxItems);

    // If no active protocols, show compact version
    if (!limitedProtocols || limitedProtocols.length === 0) {
        return (
            <div className="relative h-full flex flex-col">
                <div className={`px-4 py-3 ${theme.isDark ? '' : 'border-b'}`} style={{ borderColor: theme.isDark ? 'transparent' : theme.border }}>
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: theme.text }}>
                            Active Protocols
                            <FlaskConical size={18} style={{ color: theme.primary }} />
                        </h3>
                        <div className="flex items-center gap-2">
                            <ExpandableTooltip content={WIDGET_TOOLTIPS.active_protocols_notes} theme={theme} />
                        </div>
                    </div>
                </div>
                
                <div className="flex-1 p-4 flex flex-col items-center justify-center">
                    <p className="text-sm text-center" style={{ color: theme.textLight }}>
                        No active protocols
                    </p>
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
                                className="px-4 py-2 rounded-lg font-medium action-button-hover text-sm"
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
                            className="px-4 py-2 rounded-lg font-medium action-button-hover text-sm"
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

