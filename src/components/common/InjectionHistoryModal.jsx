import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, Clock, PenTool, Pipette, Trash2, Edit, X, Check } from 'lucide-react';
import BottomSheet from './BottomSheet';
import ConfirmationModal from '../ui/ConfirmationModal';
import { getInjectionHistory, deleteInjectionRecord, updateInjectionRecord } from '../../utils/injectionTracking';
import { isInjectionSiteTrackingEnabled } from '../../utils/injectionSiteSettings';

export default function InjectionHistoryModal({ isOpen, onClose, theme }) {
    const [injectionHistory, setInjectionHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [dateFilter, setDateFilter] = useState('last7days');
    
    // Edit state
    const [editingId, setEditingId] = useState(null);
    const [editSite, setEditSite] = useState('');
    const [editSide, setEditSide] = useState('');
    const [editCustom, setEditCustom] = useState('');

    const loadHistory = () => {
        const history = getInjectionHistory();
        setInjectionHistory(history);
    };

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            loadHistory();
            setLoading(false);
        } else {
            // Reset edit state when modal closes
            setEditingId(null);
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
        
        if (!lowerSite.includes('left') && !lowerSite.includes('right') && 
            !lowerSite.includes('abdomen') && !lowerSite.includes('arm') && !lowerSite.includes('thigh')) {
            return { site: 'other', side: '', custom: site };
        }
        
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
        
        return { site: 'other', side: '', custom: site };
    };

    const handleEdit = (record) => {
        const parsed = parseInjectionSite(record.injectionSite);
        setEditingId(record.id);
        setEditSite(parsed.site);
        setEditSide(parsed.side);
        setEditCustom(parsed.custom);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditSite('');
        setEditSide('');
        setEditCustom('');
    };

    const handleSaveEdit = () => {
        if (!editingId) return;
        
        let injectionSite = '';
        if (editSite === 'other') {
            injectionSite = editCustom.trim();
        } else if (editSite && editSide) {
            injectionSite = `${editSide} ${editSite}`;
        } else if (editSite) {
            injectionSite = editSite;
        }
        
        if (!injectionSite) return;
        
        if (updateInjectionRecord(editingId, { injectionSite })) {
            loadHistory();
            handleCancelEdit();
        }
    };

    const isEditValid = () => {
        if (editSite === 'other') return editCustom.trim().length > 0;
        if (editSite === 'abdomen' || editSite === 'arm' || editSite === 'thigh') return editSide.length > 0;
        return false;
    };

    const handleDelete = (recordId) => {
        if (deleteInjectionRecord(recordId)) {
            loadHistory();
            setDeleteConfirmId(null);
        }
    };

    const formatDate = (dateValue) => {
        const date = typeof dateValue === 'number' ? new Date(dateValue) : new Date(dateValue);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDateShort = (dateValue) => {
        const date = typeof dateValue === 'number' ? new Date(dateValue) : new Date(dateValue);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    };

    const formatInjectionSite = (site) => {
        if (!site) return '';
        return site
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    };

    const getDeliveryIcon = (deliveryMethod) => {
        switch (deliveryMethod?.toLowerCase()) {
            case 'pen':
                return <PenTool size={14} style={{ color: theme.textLight }} />;
            case 'syringe':
            case 'injection':
            default:
                return <Pipette size={14} style={{ color: theme.textLight }} />;
        }
    };

    const filterOptions = [
        { value: 'last3days', label: '3 Days' },
        { value: 'last7days', label: '7 Days' },
        { value: 'last30days', label: '30 Days' },
        { value: 'all', label: 'All' }
    ];

    const siteOptions = [
        { value: 'abdomen', label: 'Abdomen' },
        { value: 'arm', label: 'Arm' },
        { value: 'thigh', label: 'Thigh' },
        { value: 'other', label: 'Other' }
    ];

    return (
        <>
            <BottomSheet
                open={isOpen}
                onClose={onClose}
                title="Injection Site History"
                theme={theme}
                maxHeight="85vh"
            >
                {/* Date Filter Pills */}
                <div className="flex gap-1.5 mb-4 flex-wrap">
                    {filterOptions.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => setDateFilter(option.value)}
                            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                            style={{
                                backgroundColor: dateFilter === option.value ? theme.primary : theme.secondary,
                                color: dateFilter === option.value ? '#ffffff' : theme.textLight,
                            }}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-sm" style={{ color: theme.textLight }}>
                            Loading...
                        </div>
                    </div>
                ) : !isInjectionSiteTrackingEnabled() ? (
                    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${theme.primary}15` }}>
                            <Pipette size={32} style={{ color: theme.primary }} />
                        </div>
                        <h3 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>Tracking Disabled</h3>
                        <p className="text-sm" style={{ color: theme.textLight }}>
                            Enable injection site tracking in Settings → App Preferences.
                        </p>
                    </div>
                ) : filteredHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${theme.primary}15` }}>
                            <MapPin size={32} style={{ color: theme.primary }} />
                        </div>
                        <h3 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>
                            {injectionHistory.length === 0 ? 'No History Yet' : 'No Results'}
                        </h3>
                        <p className="text-sm" style={{ color: theme.textLight }}>
                            {injectionHistory.length === 0 
                                ? 'Complete injection tasks to see your site history here.'
                                : 'No records found for the selected time range.'}
                        </p>
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {filteredHistory.map((record) => (
                            <li
                                key={record.id || record.timestamp}
                                className="p-3 rounded-lg border transition-colors"
                                style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}
                            >
                                {editingId === record.id ? (
                                    /* Edit Mode */
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="font-semibold text-sm" style={{ color: theme.text }}>
                                                    {record.taskName}
                                                </span>
                                                <span className="ml-2 text-xs" style={{ color: theme.textLight }}>
                                                    {formatDateShort(record.timestamp)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={handleCancelEdit}
                                                    className="p-1.5 rounded-lg transition-colors"
                                                    style={{ color: theme.textLight }}
                                                    title="Cancel"
                                                >
                                                    <X size={16} />
                                                </button>
                                                <button
                                                    onClick={handleSaveEdit}
                                                    disabled={!isEditValid()}
                                                    className="p-1.5 rounded-lg transition-colors disabled:opacity-40"
                                                    style={{ color: theme.primary }}
                                                    title="Save"
                                                >
                                                    <Check size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {/* Site Selection */}
                                        <div className="flex gap-1.5 flex-wrap">
                                            {siteOptions.map((option) => (
                                                <button
                                                    key={option.value}
                                                    onClick={() => {
                                                        setEditSite(option.value);
                                                        if (option.value === 'other') setEditSide('');
                                                    }}
                                                    className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                                                    style={{
                                                        backgroundColor: editSite === option.value ? theme.primary : 'transparent',
                                                        color: editSite === option.value ? '#ffffff' : theme.text,
                                                        border: `1px solid ${editSite === option.value ? theme.primary : theme.border}`
                                                    }}
                                                >
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Side Selection */}
                                        {(editSite === 'abdomen' || editSite === 'arm' || editSite === 'thigh') && (
                                            <div className="flex gap-1.5">
                                                {['left', 'right'].map((side) => (
                                                    <button
                                                        key={side}
                                                        onClick={() => setEditSide(side)}
                                                        className="px-2.5 py-1 rounded-full text-xs font-medium transition-all capitalize"
                                                        style={{
                                                            backgroundColor: editSide === side ? theme.primary : 'transparent',
                                                            color: editSide === side ? '#ffffff' : theme.text,
                                                            border: `1px solid ${editSide === side ? theme.primary : theme.border}`
                                                        }}
                                                    >
                                                        {side}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {/* Custom Input */}
                                        {editSite === 'other' && (
                                            <input
                                                type="text"
                                                value={editCustom}
                                                onChange={(e) => setEditCustom(e.target.value)}
                                                placeholder="Enter custom site..."
                                                className="w-full px-3 py-2 rounded-lg border text-sm"
                                                style={{ 
                                                    borderColor: theme.border, 
                                                    backgroundColor: theme.background,
                                                    color: theme.text 
                                                }}
                                                autoFocus
                                            />
                                        )}
                                    </div>
                                ) : (
                                    /* View Mode */
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div 
                                                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                                                style={{ backgroundColor: theme.secondary }}
                                            >
                                                {getDeliveryIcon(record.deliveryMethod)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-sm truncate" style={{ color: theme.text }}>
                                                    {record.taskName}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs mt-0.5" style={{ color: theme.textLight }}>
                                                    {record.injectionSite && (
                                                        <span className="flex items-center gap-1">
                                                            <MapPin size={10} />
                                                            {formatInjectionSite(record.injectionSite)}
                                                        </span>
                                                    )}
                                                    {record.dose && (
                                                        <span>• {record.dose} {record.unit}</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1 text-xs mt-0.5" style={{ color: theme.textLight, opacity: 0.7 }}>
                                                    <Clock size={10} />
                                                    {formatDate(record.timestamp)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); handleEdit(record); }}
                                                className="p-2 rounded-lg transition-colors touch-manipulation"
                                                style={{ color: theme.textLight }}
                                                title="Edit site"
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)';
                                                    e.currentTarget.style.color = theme.primary;
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                    e.currentTarget.style.color = theme.textLight;
                                                }}
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(record.id); }}
                                                className="p-2 rounded-lg transition-colors touch-manipulation"
                                                style={{ color: theme.textLight }}
                                                title="Delete record"
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(220,38,38,0.2)' : 'rgba(220,38,38,0.1)';
                                                    e.currentTarget.style.color = theme.error || '#DC2626';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                    e.currentTarget.style.color = theme.textLight;
                                                }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </BottomSheet>

            <ConfirmationModal
                open={!!deleteConfirmId}
                onClose={() => setDeleteConfirmId(null)}
                onConfirm={() => deleteConfirmId && handleDelete(deleteConfirmId)}
                title="Delete Record?"
                message="This action cannot be undone. Are you sure you want to delete this injection record?"
                confirmText="Delete"
                cancelText="Cancel"
                type="delete"
                theme={theme}
            />
        </>
    );
}
