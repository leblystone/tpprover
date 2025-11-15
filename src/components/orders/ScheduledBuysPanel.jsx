import React, { useState, useEffect } from 'react';
import { PlusCircle, Edit, Trash2, Building } from 'lucide-react';
import { formatMMDDYYYY } from '../../utils/date';
import Modal from '../common/Modal';
import TextInput from '../common/inputs/TextInput';
import { generateId } from '../../utils/string';
import { useAppContext } from '../../context/AppContext';
import AddScheduledBuyModal from './AddScheduledBuyModal';
import { saveAppData } from '../../services/cloudStorage';
import { useFirebase } from '../../context/FirebaseContext';

export default function ScheduledBuysPanel({ theme }) {
    const { scheduledBuys, setScheduledBuys, protocols, reconItems, reconHistory, supplements, orders, metrics, vendors, calendarNotes, stockpile } = useAppContext();
    const { firebaseUser } = useFirebase();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBuy, setEditingBuy] = useState(null);

    useEffect(() => {
        // Bump listeners when data changes
        try {
            const now = String(Date.now())
            localStorage.setItem('tpprover_orders_bump', now)
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new StorageEvent('storage', { key: 'tpprover_orders_bump', newValue: now }))
                window.dispatchEvent(new StorageEvent('storage', { key: 'tpprover_calendar_bump', newValue: now }))
            }
        } catch {}
    }, [scheduledBuys]);

    const handleSave = (buy) => {
        const now = new Date().toISOString();
        if (buy.id) {
            setScheduledBuys(prev => prev.map(b => b.id === buy.id ? { 
                ...buy, 
                updatedAt: now 
            } : b));
        } else {
            setScheduledBuys(prev => [...prev, { 
                ...buy, 
                id: generateId(), 
                createdAt: now, 
                updatedAt: now 
            }]);
        }
        setIsModalOpen(false);
        setEditingBuy(null);
    };

    const handleDelete = async (id) => {
        // Find the scheduled buy being deleted for logging
        const buyToDelete = scheduledBuys.find(b => b.id === id);
        
        if (buyToDelete) {
            console.log('🗑️ Deleting scheduled buy:', buyToDelete.item || buyToDelete.name || 'Unknown');
        }
        
        // Remove from local state
        const updatedBuys = scheduledBuys.filter(b => b.id !== id);
        setScheduledBuys(updatedBuys);
        
        // CRITICAL: Force immediate cloud sync with skipMerge to ensure deletion persists
        // This prevents server data from restoring deleted items
        if (firebaseUser) {
            try {
                const userId = firebaseUser.uid;
                const appData = {
                    protocols: protocols || [],
                    reconItems: reconItems || [],
                    reconHistory: reconHistory || [],
                    supplements: supplements || [],
                    orders: orders || [],
                    metrics: metrics || [],
                    vendors: vendors || [],
                    calendarNotes: calendarNotes || {},
                    stockpile: stockpile || [],
                    scheduledBuys: updatedBuys // Use updated scheduled buys with deletion
                };
                
                // Force immediate sync with skipMerge to overwrite server data
                const syncResult = await saveAppData(userId, appData, { skipMerge: true });
                if (syncResult) {
                    console.log('✅ Deleted scheduled buy synced to cloud immediately');
                } else {
                    console.error('❌ Failed to sync deleted scheduled buy to cloud');
                }
            } catch (error) {
                console.error('❌ Error syncing deleted scheduled buy to cloud:', error);
                // Don't throw - the auto-sync will handle it
            }
        }
    };

    const handleDeleteFromModal = (id) => {
        handleDelete(id);
        setIsModalOpen(false);
        setEditingBuy(null);
    };

    const handleOpenModal = (buy = null) => {
        setEditingBuy(buy);
        setIsModalOpen(true);
    };

    return (
        <div className="rounded-lg border p-4 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>Scheduled Buys</h2>
                <button
                    className="px-3 py-2 rounded-md text-sm font-semibold flex items-center gap-2"
                    style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                    onClick={() => handleOpenModal()}
                >
                    <PlusCircle size={14} /> Add
                </button>
            </div>
            <div className="space-y-2">
                {scheduledBuys.length > 0 ? (
                    scheduledBuys.sort((a, b) => new Date(a.openDate) - new Date(b.openDate)).map(buy => (
                        <div key={buy.id} className="p-3 rounded-md border flex items-center justify-between" style={{ borderColor: theme.border, backgroundColor: theme.background }}>
                            <div>
                                <div className="font-semibold" style={{ color: theme.text }}>{buy.item}</div>
                                <div className="text-xs text-gray-500">
                                    {formatMMDDYYYY(buy.openDate)} - {formatMMDDYYYY(buy.closeDate)}
                                </div>
                                {buy.vendor && <div className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Building size={12}/> {buy.vendor}</div>}
                                {buy.notes && <p className="text-xs text-gray-400 mt-1 italic">"{buy.notes}"</p>}
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleOpenModal(buy)} className="p-1 hover:bg-gray-200 rounded-full"><Edit size={14} /></button>
                                <button onClick={() => handleDelete(buy.id)} className="p-1 hover:bg-red-100 rounded-full"><Trash2 size={14} className="text-red-500" /></button>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No scheduled buys.</p>
                )}
            </div>

            <AddScheduledBuyModal
                open={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingBuy(null); }}
                theme={theme}
                buy={editingBuy}
                onSave={handleSave}
                onDelete={handleDeleteFromModal}
            />
        </div>
    );
}
