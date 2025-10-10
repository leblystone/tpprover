import React, { useState, useEffect } from 'react';
import { X, MapPin, Clock, PenTool, Calendar, Pipette } from 'lucide-react';
import { getInjectionHistory } from '../../utils/injectionTracking';
import { isInjectionSiteTrackingEnabled } from '../../utils/injectionSiteSettings';

export default function InjectionHistoryModal({ isOpen, onClose, theme }) {
    const [injectionHistory, setInjectionHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            const history = getInjectionHistory();
            setInjectionHistory(history);
            setLoading(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getDeliveryIcon = (deliveryMethod) => {
        switch (deliveryMethod?.toLowerCase()) {
            case 'pen':
                return <PenTool size={16} />;
            case 'syringe':
            case 'injection':
                return <Pipette size={16} />;
            default:
                return <Pipette size={16} />;
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-sm"
                onClick={onClose}
            />
            
            {/* Modal */}
            <div 
                className="relative w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-2xl overflow-hidden"
                style={{ backgroundColor: theme.cardBackground }}
            >
                {/* Header */}
                <div 
                    className="px-6 py-4 border-b flex items-center justify-between"
                    style={{ 
                        borderColor: theme.border,
                        background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryDark || theme.primary})`
                    }}
                >
                    <div className="flex items-center gap-3">
                        <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                        >
                            <MapPin size={20} style={{ color: theme.textOnPrimary }} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold" style={{ color: theme.textOnPrimary }}>
                                Research Site History
                            </h3>
                            <p className="text-sm opacity-90" style={{ color: theme.textOnPrimary }}>
                                {injectionHistory.length} injection{injectionHistory.length !== 1 ? 's' : ''} recorded
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-all"
                        style={{ color: theme.textOnPrimary }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="text-sm" style={{ color: theme.textLight }}>
                                Loading research site history...
                            </div>
                        </div>
                    ) : !isInjectionSiteTrackingEnabled() ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.primary + '20' }}>
                                <Pipette size={24} style={{ color: theme.primary }} />
                            </div>
                            <h4 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>
                                Injection Site Tracking Disabled
                            </h4>
                            <p className="text-sm mb-4" style={{ color: theme.textLight }}>
                                Injection site tracking is currently disabled in your settings. 
                                Enable it in Settings → App Preferences to track injection sites.
                            </p>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
                                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                            >
                                Close
                            </button>
                        </div>
                    ) : injectionHistory.length === 0 ? (
                        <div className="text-center py-8">
                            <div 
                                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                                style={{ backgroundColor: theme.secondary }}
                            >
                                <MapPin size={24} style={{ color: theme.textLight }} />
                            </div>
                            <h4 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>
                                No Research Site History
                            </h4>
                            <p className="text-sm" style={{ color: theme.textLight }}>
                                Complete some injection tasks to see your history here.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {injectionHistory.map((record, index) => (
                                <div 
                                    key={index}
                                    className="p-4 rounded-lg border"
                                    style={{ 
                                        backgroundColor: theme.secondary,
                                        borderColor: theme.border
                                    }}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div 
                                                className="w-8 h-8 rounded-lg flex items-center justify-center"
                                                style={{ backgroundColor: theme.primary }}
                                            >
                                                {getDeliveryIcon(record.deliveryMethod)}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold" style={{ color: theme.text }}>
                                                    {record.taskName}
                                                </h4>
                                                <div className="flex items-center gap-2 text-sm" style={{ color: theme.textLight }}>
                                                    <Clock size={14} />
                                                    {formatDate(record.timestamp)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        {record.dose && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="font-medium" style={{ color: theme.text }}>
                                                    Dose:
                                                </span>
                                                <span style={{ color: theme.textLight }}>
                                                    {record.dose} {record.unit}
                                                </span>
                                            </div>
                                        )}
                                        
                                        {record.penColor && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="font-medium" style={{ color: theme.text }}>
                                                    Pen Color:
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <div 
                                                        className="w-4 h-4 rounded-full border border-gray-300"
                                                        style={{ backgroundColor: record.penColor }}
                                                    />
                                                    <span style={{ color: theme.textLight }}>
                                                        {record.penColor}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {record.penType && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="font-medium" style={{ color: theme.text }}>
                                                    Pen Type:
                                                </span>
                                                <span style={{ color: theme.textLight }}>
                                                    {record.penType.toUpperCase()}
                                                </span>
                                            </div>
                                        )}
                                        
                                        {record.injectionSite && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <MapPin size={14} style={{ color: theme.primary }} />
                                                <span className="font-medium" style={{ color: theme.text }}>
                                                    Injection Site:
                                                </span>
                                                <span style={{ color: theme.textLight }}>
                                                    {record.injectionSite}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
