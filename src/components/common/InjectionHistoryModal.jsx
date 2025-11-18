import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, MapPin, MapPinPlus, Clock, PenTool, Calendar, Pipette, Edit, Trash2, Save, Filter } from 'lucide-react';
import { getInjectionHistory, updateInjectionRecord, deleteInjectionRecord } from '../../utils/injectionTracking';
import { isInjectionSiteTrackingEnabled } from '../../utils/injectionSiteSettings';

export default function InjectionHistoryModal({ isOpen, onClose, theme }) {
    const [injectionHistory, setInjectionHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingRecord, setEditingRecord] = useState(null);
    const [editSelectedSite, setEditSelectedSite] = useState('');
    const [editSelectedSide, setEditSelectedSide] = useState('');
    const [editCustomSite, setEditCustomSite] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [dateFilter, setDateFilter] = useState('last3days'); // 'last3days', 'last7days', 'last30days', 'all'

    const loadHistory = () => {
        const history = getInjectionHistory();
        setInjectionHistory(history);
    };

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            loadHistory();
            setLoading(false);
        }
    }, [isOpen]);

    // Filter history based on date filter
    const filteredHistory = useMemo(() => {
        if (dateFilter === 'all') {
            return injectionHistory;
        }

        const now = new Date();
        const cutoffDate = new Date();

        switch (dateFilter) {
            case 'last3days':
                cutoffDate.setDate(now.getDate() - 3);
                break;
            case 'last7days':
                cutoffDate.setDate(now.getDate() - 7);
                break;
            case 'last30days':
                cutoffDate.setDate(now.getDate() - 30);
                break;
            default:
                return injectionHistory;
        }

        cutoffDate.setHours(0, 0, 0, 0);

        return injectionHistory.filter(record => {
            const recordDate = typeof record.timestamp === 'number' 
                ? new Date(record.timestamp) 
                : new Date(record.date || record.timestamp);
            recordDate.setHours(0, 0, 0, 0);
            return recordDate >= cutoffDate;
        });
    }, [injectionHistory, dateFilter]);

    const parseInjectionSite = (site) => {
        if (!site) return { site: '', side: '', custom: '' };
        
        const lowerSite = site.toLowerCase().trim();
        
        // Check if it's a custom site (doesn't match standard patterns)
        if (!lowerSite.includes('left') && !lowerSite.includes('right') && 
            !lowerSite.includes('abdomen') && !lowerSite.includes('arm') && !lowerSite.includes('thigh')) {
            return { site: 'other', side: '', custom: site };
        }
        
        // Parse left/right + site
        const parts = lowerSite.split(' ');
        if (parts.length >= 2) {
            const side = parts[0];
            const siteType = parts.slice(1).join(' ');
            
            if ((side === 'left' || side === 'right') && 
                (siteType.includes('abdomen') || siteType.includes('arm') || siteType.includes('thigh'))) {
                let matchedSite = '';
                if (siteType.includes('abdomen')) matchedSite = 'abdomen';
                else if (siteType.includes('arm')) matchedSite = 'arm';
                else if (siteType.includes('thigh')) matchedSite = 'thigh';
                
                return { site: matchedSite, side: side, custom: '' };
            }
        }
        
        // Fallback to custom
        return { site: 'other', side: '', custom: site };
    };

    const handleEdit = (record) => {
        setEditingRecord(record);
        const parsed = parseInjectionSite(record.injectionSite);
        setEditSelectedSite(parsed.site);
        setEditSelectedSide(parsed.side);
        setEditCustomSite(parsed.custom);
    };

    const handleSaveEdit = () => {
        if (!editingRecord) return;
        
        let injectionSite = '';
        if (editSelectedSite === 'other') {
            injectionSite = editCustomSite.trim();
        } else if (editSelectedSite && editSelectedSide) {
            injectionSite = `${editSelectedSide} ${editSelectedSite}`;
        } else if (editSelectedSite) {
            injectionSite = editSelectedSite;
        }
        
        if (!injectionSite) return;
        
        const updates = {
            injectionSite: injectionSite
        };
        
        if (updateInjectionRecord(editingRecord.id, updates)) {
            loadHistory();
            setEditingRecord(null);
            setEditSelectedSite('');
            setEditSelectedSide('');
            setEditCustomSite('');
        }
    };

    const handleCancelEdit = () => {
        setEditingRecord(null);
        setEditSelectedSite('');
        setEditSelectedSide('');
        setEditCustomSite('');
    };

    const handleDelete = (recordId) => {
        if (deleteInjectionRecord(recordId)) {
            loadHistory();
            setDeleteConfirm(null);
        }
    };

    const formatDate = (dateValue) => {
        const date = typeof dateValue === 'number' ? new Date(dateValue) : new Date(dateValue);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatInjectionSite = (site) => {
        if (!site) return '';
        return site
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    };

    const getDeliveryIcon = (deliveryMethod, color = '#ffffff') => {
        const iconStyle = { color };
        switch (deliveryMethod?.toLowerCase()) {
            case 'pen':
                return <PenTool size={16} style={iconStyle} />;
            case 'syringe':
            case 'injection':
                return <Pipette size={16} style={iconStyle} />;
            default:
                return <Pipette size={16} style={iconStyle} />;
        }
    };

    if (!isOpen) return null;

    const modalContent = (
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
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div 
                    className="px-6 py-4 border-b"
                    style={{ 
                        borderColor: theme.border,
                        background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryDark || theme.primary})`
                    }}
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div 
                                className="w-10 h-10 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                            >
                                <MapPinPlus size={20} style={{ color: theme.textOnPrimary }} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold" style={{ color: theme.textOnPrimary }}>
                                    Research Site History
                                </h3>
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
                    
                    {/* Date Filter */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <Filter size={14} style={{ color: theme.textOnPrimary, opacity: 0.8 }} />
                        <div className="flex gap-1">
                            {[
                                { value: 'last3days', label: 'Last 3 Days' },
                                { value: 'last7days', label: 'Last 7 Days' },
                                { value: 'last30days', label: 'Last 30 Days' },
                                { value: 'all', label: 'All' }
                            ].map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => setDateFilter(option.value)}
                                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                                        dateFilter === option.value 
                                            ? 'text-white' 
                                            : 'bg-white bg-opacity-10 text-white text-opacity-70 hover:bg-opacity-20'
                                    }`}
                                    style={{
                                        backgroundColor: dateFilter === option.value ? 'rgba(255, 255, 255, 0.3)' : undefined,
                                    }}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
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
                    ) : filteredHistory.length === 0 ? (
                        <div className="text-center py-8">
                            <div 
                                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                                style={{ backgroundColor: theme.secondary }}
                            >
                                <MapPin size={24} style={{ color: theme.textLight }} />
                            </div>
                            <h4 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>
                                {injectionHistory.length === 0 ? 'No Research Site History' : 'No Results'}
                            </h4>
                            <p className="text-sm" style={{ color: theme.textLight }}>
                                {injectionHistory.length === 0 
                                    ? 'Complete some injection tasks to see your history here.'
                                    : 'No injection records found for the selected date range.'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredHistory.map((record) => (
                                <div 
                                    key={record.id || record.timestamp}
                                    className="p-4 rounded-lg border"
                                    style={{ 
                                        backgroundColor: theme.secondary,
                                        borderColor: theme.border
                                    }}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3 flex-1">
                                            <div 
                                                className="w-8 h-8 rounded-lg flex items-center justify-center"
                                                style={{ backgroundColor: theme.primary }}
                                            >
                                                {getDeliveryIcon(record.deliveryMethod)}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-semibold" style={{ color: theme.text }}>
                                                    {record.taskName}
                                                </h4>
                                                <div className="flex items-center gap-2 text-sm" style={{ color: theme.textLight }}>
                                                    <Clock size={14} />
                                                    {formatDate(record.timestamp)}
                                                </div>
                                            </div>
                                        </div>
                                        {editingRecord?.id !== record.id && (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleEdit(record)}
                                                    className="p-1.5 rounded hover:bg-opacity-20 transition-all"
                                                    style={{ 
                                                        backgroundColor: theme.primary + '20',
                                                        color: theme.primary
                                                    }}
                                                    title="Edit entry"
                                                >
                                                    <Edit size={14} />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirm(record.id)}
                                                    className="p-1.5 rounded hover:bg-opacity-20 transition-all"
                                                    style={{ 
                                                        backgroundColor: '#ef4444' + '20',
                                                        color: '#ef4444'
                                                    }}
                                                    title="Delete entry"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {editingRecord?.id === record.id ? (
                                        <div className="space-y-3 mt-3 pt-3 border-t" style={{ borderColor: theme.border }}>
                                            <div>
                                                <label className="block text-xs font-medium mb-2" style={{ color: theme.text }}>
                                                    Injection Site
                                                </label>
                                                <div className="flex gap-2 flex-wrap">
                                                    {[
                                                        { value: 'abdomen', label: 'Abdomen' },
                                                        { value: 'arm', label: 'Arm' },
                                                        { value: 'thigh', label: 'Thigh' },
                                                        { value: 'other', label: 'Other' }
                                                    ].map((option) => (
                                                        <button
                                                            key={option.value}
                                                            onClick={() => {
                                                                setEditSelectedSite(option.value);
                                                                if (option.value !== 'other') {
                                                                    setEditCustomSite('');
                                                                }
                                                            }}
                                                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                                                editSelectedSite === option.value 
                                                                    ? 'text-white' 
                                                                    : 'border'
                                                            }`}
                                                            style={{
                                                                backgroundColor: editSelectedSite === option.value ? theme.primary : 'transparent',
                                                                borderColor: editSelectedSite === option.value ? theme.primary : theme.border,
                                                                color: editSelectedSite === option.value ? theme.textOnPrimary : theme.text
                                                            }}
                                                        >
                                                            {option.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Side Selection */}
                                            {(editSelectedSite === 'abdomen' || editSelectedSite === 'arm' || editSelectedSite === 'thigh') && (
                                                <div>
                                                    <div className="flex gap-2">
                                                        {['left', 'right'].map((side) => (
                                                            <button
                                                                key={side}
                                                                onClick={() => setEditSelectedSide(side)}
                                                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all capitalize ${
                                                                    editSelectedSide === side 
                                                                        ? 'text-white' 
                                                                        : 'border'
                                                                }`}
                                                                style={{
                                                                    backgroundColor: editSelectedSide === side ? theme.primary : 'transparent',
                                                                    borderColor: editSelectedSide === side ? theme.primary : theme.border,
                                                                    color: editSelectedSide === side ? theme.textOnPrimary : theme.text
                                                                }}
                                                            >
                                                                {side}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Custom Input */}
                                            {editSelectedSite === 'other' && (
                                                <div>
                                                    <input
                                                        type="text"
                                                        value={editCustomSite}
                                                        onChange={(e) => setEditCustomSite(e.target.value)}
                                                        placeholder="Enter site..."
                                                        className="w-full p-2 rounded border text-xs"
                                                        style={{ 
                                                            borderColor: theme.border, 
                                                            backgroundColor: theme.background,
                                                            color: theme.text 
                                                        }}
                                                        autoFocus
                                                    />
                                                </div>
                                            )}

                                            {/* Action Buttons */}
                                            <div className="flex gap-2 pt-2">
                                                <button
                                                    onClick={handleCancelEdit}
                                                    className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90 border"
                                                    style={{ 
                                                        borderColor: theme.border,
                                                        color: theme.text
                                                    }}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleSaveEdit}
                                                    disabled={!editSelectedSite || (editSelectedSite !== 'other' && !editSelectedSide) || (editSelectedSite === 'other' && !editCustomSite.trim())}
                                                    className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90 flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    style={{ 
                                                        backgroundColor: theme.primary,
                                                        color: theme.textOnPrimary
                                                    }}
                                                >
                                                    <Save size={14} />
                                                    Save
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {(record.injectionSite || record.dose) && (
                                                <div className="flex items-center gap-4 text-sm flex-wrap">
                                                    {record.injectionSite && (
                                                        <div className="flex items-center gap-2">
                                                            <MapPin size={14} style={{ color: theme.primary }} />
                                                            <span className="font-medium" style={{ color: theme.text }}>
                                                                Injection Site:
                                                            </span>
                                                            <span style={{ color: theme.textLight }}>
                                                                {formatInjectionSite(record.injectionSite)}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {record.dose && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium" style={{ color: theme.text }}>
                                                                Dose:
                                                            </span>
                                                            <span style={{ color: theme.textLight }}>
                                                                {record.dose} {record.unit}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Confirmation */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-black bg-opacity-70 backdrop-blur-sm"
                        onClick={() => setDeleteConfirm(null)}
                    />
                    <div 
                        className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
                        style={{ backgroundColor: theme.cardBackground }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <h3 className="text-lg font-bold mb-2" style={{ color: theme.text }}>
                                Delete Entry?
                            </h3>
                            <p className="text-sm mb-6" style={{ color: theme.textLight }}>
                                This action cannot be undone. Are you sure you want to delete this injection record?
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 border"
                                    style={{ 
                                        borderColor: theme.border,
                                        color: theme.text
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDelete(deleteConfirm)}
                                    className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md active:scale-95"
                                    style={{ 
                                        background: 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)',
                                        color: '#ffffff',
                                        border: 'none',
                                        boxShadow: theme?.isDark ? '0 4px 10px rgba(0,0,0,0.35)' : '0 4px 10px rgba(0,0,0,0.15)'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'linear-gradient(135deg, #b5684a 0%, #a35a3f 100%)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)';
                                    }}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    return createPortal(modalContent, document.body);
}
