import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import TextInput from '../common/inputs/TextInput';

export default function AddScheduledBuyModal({ open, onClose, theme, buy, onSave }) {
    const [form, setForm] = useState({ 
        item: '', 
        openDate: '', 
        closeDate: '', 
        vendor: '', 
        location: '',
        participants: '',
        price: '',
        notes: '' 
    });

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
                    notes: '' 
                });
            }
        }
    }, [buy, open]);

    const handleSave = () => {
        onSave(form);
    };

    return (
        <Modal 
            open={open} 
            onClose={onClose} 
            title={buy ? 'Edit Scheduled Buy' : 'Add Scheduled Buy'} 
            theme={theme}
            variant="modern"
            maxWidth="max-w-2xl"
            footer={
                <>
                    <button onClick={onClose} className="px-4 py-2 rounded-lg border font-medium transition-all" style={{ borderColor: theme.border, color: theme.text }}>Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 rounded-lg font-medium transition-all" style={{ backgroundColor: theme.primary, color: '#ffffff' }}>Save</button>
                </>
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
