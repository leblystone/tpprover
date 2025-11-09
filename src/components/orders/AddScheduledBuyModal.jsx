import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import TextInput from '../common/inputs/TextInput';

export default function AddScheduledBuyModal({ open, onClose, theme, buy, onSave, onDelete }) {
    const [form, setForm] = useState({
        item: '',
        openDate: '',
        closeDate: '',
        vendor: '',
        location: '',
        participants: '',
        price: '',
        notes: '',
        id: undefined
    });
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (open) {
            if (buy) {
                setForm({
                    item: '',
                    openDate: new Date().toISOString().slice(0, 10),
                    closeDate: new Date().toISOString().slice(0, 10),
                    vendor: '',
                    location: '',
                    participants: '',
                    price: '',
                    notes: '',
                    id: undefined,
                    ...buy 
                });
            } else {
                setForm({
                    item: '',
                    openDate: new Date().toISOString().slice(0, 10),
                    closeDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
                    vendor: '',
                    location: '',
                    participants: '',
                    price: '',
                    notes: '',
                    id: undefined
                });
            }
        }
    }, [buy, open]);

    const payloadWithId = () => ({
        ...form,
        id: form.id || buy?.id
    });

    const handleSave = async () => {
        if (!onSave || isSaving) return;
        setIsSaving(true);
        try {
            await Promise.resolve(onSave(payloadWithId()));
        } catch (error) {
            console.error('Failed to save scheduled buy:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!onDelete || isDeleting) return;
        const targetId = form.id || buy?.id;
        if (!targetId) return;
        setIsDeleting(true);
        try {
            await Promise.resolve(onDelete(targetId));
        } catch (error) {
            console.error('Failed to delete scheduled buy:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    const getSaveBackground = (saving) => {
        const secondaryColor = theme?.secondary || '#d1d5db';
        if (saving) {
            return `linear-gradient(135deg, ${secondaryColor} 0%, ${secondaryColor} 100%)`;
        }
        return `linear-gradient(135deg, ${theme?.primary} 0%, ${theme?.primaryDark || theme?.primary} 100%)`;
    };

    const defaultSaveShadow = theme.isDark ? '0 4px 6px rgba(0, 0, 0, 0.3)' : '0 4px 6px rgba(0, 0, 0, 0.1)';
    const savingTextColor = theme?.text || '#111827';
    const saveTextColor = isSaving ? savingTextColor : (theme?.textOnPrimary || '#ffffff');

    const canDelete = Boolean(onDelete && (form.id || buy?.id));

    return (
        <Modal 
            open={open} 
            onClose={onClose} 
            title={buy ? 'Edit Scheduled Buy' : 'Add Scheduled Buy'} 
            theme={theme}
            variant="modern"
            maxWidth="max-w-2xl"
            footer={
                <div className="w-full flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <button 
                            type="button"
                            onClick={onClose} 
                            className="px-4 py-2 rounded-lg border font-medium transition-all hover:bg-gray-50" 
                            style={{ borderColor: theme.border, color: theme.text }}
                        >
                            Cancel
                        </button>
                        {canDelete && (
                            <button 
                                type="button"
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md active:scale-95 disabled:opacity-75 disabled:cursor-not-allowed"
                                style={{
                                    background: 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)',
                                    color: '#ffffff',
                                    border: 'none'
                                }}
                                onMouseEnter={(e) => {
                                    if (isDeleting) return;
                                    e.currentTarget.style.background = 'linear-gradient(135deg, #b5684a 0%, #a35a3f 100%)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)';
                                }}
                            >
                                {isDeleting ? 'Deleting…' : 'Delete'}
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            type="button"
                            onClick={handleSave} 
                            disabled={isSaving}
                            className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:shadow-none"
                            style={{ 
                                background: getSaveBackground(isSaving),
                                color: saveTextColor,
                                border: 'none',
                                boxShadow: isSaving ? 'none' : defaultSaveShadow
                            }}
                            onMouseEnter={(e) => {
                                if (isSaving) return;
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = theme.isDark ? '0 10px 25px rgba(0, 0, 0, 0.5)' : '0 10px 25px rgba(0, 0, 0, 0.15)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = isSaving ? 'none' : defaultSaveShadow;
                                e.currentTarget.style.background = getSaveBackground(isSaving);
                            }}
                        >
                            {isSaving ? 'Saving…' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            }
        >
            <div className="space-y-3">
                {/* GROUP BUY DETAILS Section Header */}
                <div className="px-4 py-2.5 rounded-lg" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, borderLeft: `4px solid ${theme.primary}` }}>
                    <h4 className="font-black text-sm tracking-wide uppercase" style={{ color: theme.isDark ? '#a8b5a0' : theme.primary }}>GROUP BUY DETAILS</h4>
                </div>

                <div>
                    <label className="text-sm font-medium mb-2 block" style={{ color: theme.text }}>Group Buy For</label>
                    <input
                        type="text"
                        value={form.item}
                        onChange={e => setForm({ ...form, item: e.target.value })}
                        placeholder="Product Name"
                        className="w-full px-3 py-2 rounded-lg text-sm transition-all focus:outline-none"
                        style={{
                            border: theme.isDark ? 'none' : `1px solid ${theme.border}`,
                            backgroundColor: theme.isDark ? '#1f2937' : theme.cardBackground,
                            color: theme.text,
                            boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium mb-2 block" style={{ color: theme.text }}>Open Date</label>
                        <input
                            type="date"
                            value={form.openDate}
                            onChange={e => setForm({ ...form, openDate: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg text-sm transition-all focus:outline-none"
                            style={{
                                border: theme.isDark ? 'none' : `1px solid ${theme.border}`,
                                backgroundColor: theme.isDark ? '#1f2937' : theme.cardBackground,
                                color: theme.text,
                                boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.05)'
                            }}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-2 block" style={{ color: theme.text }}>Close Date</label>
                        <input
                            type="date"
                            value={form.closeDate}
                            onChange={e => setForm({ ...form, closeDate: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg text-sm transition-all focus:outline-none"
                            style={{
                                border: theme.isDark ? 'none' : `1px solid ${theme.border}`,
                                backgroundColor: theme.isDark ? '#1f2937' : theme.cardBackground,
                                color: theme.text,
                                boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.05)'
                            }}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium mb-2 block" style={{ color: theme.text }}>Group Buy Host</label>
                        <input
                            type="text"
                            value={form.vendor}
                            onChange={e => setForm({ ...form, vendor: e.target.value })}
                            placeholder="Name"
                            className="w-full px-3 py-2 rounded-lg text-sm transition-all focus:outline-none"
                            style={{
                                border: theme.isDark ? 'none' : `1px solid ${theme.border}`,
                                backgroundColor: theme.isDark ? '#1f2937' : theme.cardBackground,
                                color: theme.text,
                                boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.05)'
                            }}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-2 block" style={{ color: theme.text }}>Platform</label>
                        <input
                            type="text"
                            value={form.location}
                            onChange={e => setForm({ ...form, location: e.target.value })}
                            placeholder="e.g Discord, Telegram, etc."
                            className="w-full px-3 py-2 rounded-lg text-sm transition-all focus:outline-none"
                            style={{
                                border: theme.isDark ? 'none' : `1px solid ${theme.border}`,
                                backgroundColor: theme.isDark ? '#1f2937' : theme.cardBackground,
                                color: theme.text,
                                boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.05)'
                            }}
                        />
                    </div>
                </div>

                {/* VENDOR & PRICING Section Header */}
                <div className="px-4 py-2.5 rounded-lg" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, borderLeft: `4px solid ${theme.primary}` }}>
                    <h4 className="font-black text-sm tracking-wide uppercase" style={{ color: theme.isDark ? '#a8b5a0' : theme.primary }}>VENDOR & PRICING</h4>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium mb-2 block" style={{ color: theme.text }}>Vendor</label>
                        <input
                            type="text"
                            value={form.participants}
                            onChange={e => setForm({ ...form, participants: e.target.value })}
                            placeholder="Vendor Name"
                            className="w-full px-3 py-2 rounded-lg text-sm transition-all focus:outline-none"
                            style={{
                                border: theme.isDark ? 'none' : `1px solid ${theme.border}`,
                                backgroundColor: theme.isDark ? '#1f2937' : theme.cardBackground,
                                color: theme.text,
                                boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.05)'
                            }}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-2 block" style={{ color: theme.text }}>Price</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-gray-500 text-sm">$</span>
                            </div>
                            <input
                                type="text"
                                value={form.price}
                                onChange={e => setForm({ ...form, price: e.target.value })}
                                placeholder="0.00"
                                className="w-full pl-7 pr-3 py-2 rounded-lg text-sm transition-all focus:outline-none"
                                style={{
                                    border: theme.isDark ? 'none' : `1px solid ${theme.border}`,
                                    backgroundColor: theme.isDark ? '#1f2937' : theme.cardBackground,
                                    color: theme.text,
                                    boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.05)'
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Page Break */}
                <div className="border-t" style={{ borderColor: theme.border }}></div>

                <div>
                    <label className="text-sm font-medium mb-2 block" style={{ color: theme.text }}>Notes</label>
                    <textarea
                        value={form.notes}
                        onChange={e => setForm({ ...form, notes: e.target.value })}
                        placeholder="Any further group buy details."
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg text-sm transition-all resize-none focus:outline-none"
                        style={{
                            border: theme.isDark ? 'none' : `1px solid ${theme.border}`,
                            backgroundColor: theme.isDark ? '#1f2937' : theme.cardBackground,
                            color: theme.text,
                            boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                    />
                </div>
            </div>
        </Modal>
    )
}
