import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import TextInput from '../common/inputs/TextInput';
import GlassmorphismDatePicker from '../common/GlassmorphismDatePicker';
import { ShoppingCart, HandCoins } from 'lucide-react';

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
            // Close the modal after successful save
            onClose();
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
                <div className="px-4 py-2.5 rounded-lg flex items-center justify-between mb-2" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, borderLeft: '4px solid #e0ded7' }}>
                    <h4 className="font-bold text-sm tracking-wider uppercase" style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76', letterSpacing: '0.1em' }}>GROUP BUY DETAILS</h4>
                    <ShoppingCart size={20} style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76' }} />
                </div>

                <TextInput
                    label="Group Buy For"
                    value={form.item}
                    onChange={v => setForm({ ...form, item: v })}
                    placeholder="Product Name"
                    theme={theme}
                    outlined={true}
                    customTextColor="#181A18"
                    customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
                />

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium mb-2 block text-center" style={{ color: theme.text }}>Open Date</label>
                        <GlassmorphismDatePicker
                            value={form.openDate}
                            onChange={(dateString) => setForm({ ...form, openDate: dateString })}
                            theme={theme}
                            placeholder="Open Date"
                            compact={true}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-2 block text-center" style={{ color: theme.text }}>Close Date</label>
                        <GlassmorphismDatePicker
                            value={form.closeDate}
                            onChange={(dateString) => setForm({ ...form, closeDate: dateString })}
                            theme={theme}
                            placeholder="Close Date"
                            compact={true}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <TextInput
                        label="Group Buy Host"
                        value={form.vendor}
                        onChange={v => setForm({ ...form, vendor: v })}
                        placeholder="Name"
                        theme={theme}
                        outlined={true}
                        customTextColor="#181A18"
                        customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
                    />
                    <TextInput
                        label="Platform"
                        value={form.location}
                        onChange={v => setForm({ ...form, location: v })}
                        placeholder="e.g Discord, Telegram, etc."
                        theme={theme}
                        outlined={true}
                        customTextColor="#181A18"
                        customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
                    />
                </div>

                {/* VENDOR & PRICING Section Header */}
                <div className="px-4 py-2.5 rounded-lg flex items-center justify-between mb-2" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, borderLeft: '4px solid #e0ded7' }}>
                    <h4 className="font-bold text-sm tracking-wider uppercase" style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76', letterSpacing: '0.1em' }}>VENDOR & PRICING</h4>
                    <HandCoins size={20} style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76' }} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <TextInput
                        label="Vendor"
                        value={form.participants}
                        onChange={v => setForm({ ...form, participants: v })}
                        placeholder="Vendor Name"
                        theme={theme}
                        outlined={true}
                        customTextColor="#181A18"
                        customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
                    />
                    <div>
                        <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" style={{ color: theme.textLight || theme.text }}>
                                <span className="text-sm">$</span>
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={form.price}
                                    onChange={e => setForm({ ...form, price: e.target.value })}
                                    placeholder="0.00"
                                    className="w-full p-3 pl-8 rounded-lg transition-all focus:outline-none"
                                    style={{
                                        border: `1px solid #f0eee7`,
                                        backgroundColor: theme.isDark ? '#1f2937' : theme.cardBackground,
                                        color: '#181A18',
                                        boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = theme.primary;
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = '#f0eee7';
                                    }}
                                />
                                <label 
                                    className="absolute left-3 -top-2.5 px-1 text-xs font-medium transition-all pointer-events-none"
                                    style={{ 
                                        color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76',
                                        backgroundColor: theme.isDark ? '#1f2937' : theme.cardBackground
                                    }}
                                >
                                    Price
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <TextInput
                    label="Notes"
                    value={form.notes}
                    onChange={v => setForm({ ...form, notes: v })}
                    placeholder="Any further group buy details."
                    theme={theme}
                    outlined={true}
                    customTextColor="#181A18"
                    customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
                    multiline={true}
                    rows={3}
                />
            </div>
        </Modal>
    )
}
