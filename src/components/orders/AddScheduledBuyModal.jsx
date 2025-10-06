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
        <Modal open={open} onClose={onClose} title={buy ? 'Edit Scheduled Buy' : 'Add Scheduled Buy'} theme={theme} footer={
            <>
                <button onClick={onClose} className="px-3 py-2 rounded-md border" style={{ borderColor: theme.border }}>Cancel</button>
                <button onClick={handleSave} className="px-3 py-2 rounded-md" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}>Save</button>
            </>
        }>
            <div className="space-y-4">
                <TextInput 
                    label="Group Buy For:" 
                    value={form.item} 
                    onChange={v => setForm({ ...form, item: v })} 
                    theme={theme} 
                    placeholder="Product Name" 
                />
                
                <div className="grid grid-cols-2 gap-4">
                    <TextInput 
                        label="Open Date" 
                        type="date" 
                        value={form.openDate} 
                        onChange={v => setForm({ ...form, openDate: v })} 
                        theme={theme} 
                    />
                    <TextInput 
                        label="Close Date" 
                        type="date" 
                        value={form.closeDate} 
                        onChange={v => setForm({ ...form, closeDate: v })} 
                        theme={theme} 
                    />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                <TextInput 
                    label="Group Buy Host" 
                    value={form.vendor} 
                    onChange={v => setForm({ ...form, vendor: v })} 
                    theme={theme} 
                    placeholder="Name" 
                />
                    <TextInput 
                        label="Platform" 
                        value={form.location} 
                        onChange={v => setForm({ ...form, location: v })} 
                        theme={theme} 
                        placeholder="e.g Discord, Telegram, ect." 
                    />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <TextInput 
                        label="Vendor" 
                        value={form.participants} 
                        onChange={v => setForm({ ...form, participants: v })} 
                        theme={theme} 
                        placeholder="Vendor Name" 
                    />
                    <TextInput 
                        label="Price" 
                        value={form.price} 
                        onChange={v => setForm({ ...form, price: v })} 
                        theme={theme} 
                        placeholder="$" 
                    />
                </div>
                
                <TextInput 
                    label="Notes" 
                    value={form.notes} 
                    onChange={v => setForm({ ...form, notes: v })} 
                    theme={theme} 
                    placeholder="Any further group buy details." 
                />
            </div>
        </Modal>
    )
}
