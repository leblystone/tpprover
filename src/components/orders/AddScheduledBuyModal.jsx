import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import TextInput from '../common/inputs/TextInput';

export default function AddScheduledBuyModal({ open, onClose, theme, buy, onSave }) {
    const [form, setForm] = useState({ item: '', openDate: '', closeDate: '', vendor: '', notes: '' });

    useEffect(() => {
        if (open) {
            if (buy) {
                setForm({ 
                    item: '', 
                    openDate: new Date().toISOString().slice(0, 10), 
                    closeDate: new Date().toISOString().slice(0, 10), 
                    vendor: '', 
                    notes: '',
                    ...buy 
                });
            } else {
                setForm({ item: '', openDate: new Date().toISOString().slice(0, 10), closeDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), vendor: '', notes: '' });
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
                <TextInput label="Item / Peptide" value={form.item} onChange={v => setForm({ ...form, item: v })} theme={theme} placeholder="e.g., Sema, Gluta, etc." />
                <div className="grid grid-cols-2 gap-4">
                    <TextInput label="Open Buy Date" type="date" value={form.openDate} onChange={v => setForm({ ...form, openDate: v })} theme={theme} />
                    <TextInput label="Payment Closing Date" type="date" value={form.closeDate} onChange={v => setForm({ ...form, closeDate: v })} theme={theme} />
                </div>
                <TextInput label="Vendor (Optional)" value={form.vendor} onChange={v => setForm({ ...form, vendor: v })} theme={theme} placeholder="Vendor Name" />
                <TextInput label="Notes" value={form.notes} onChange={v => setForm({ ...form, notes: v })} theme={theme} placeholder="Optional notes..." />
            </div>
        </Modal>
    )
}
