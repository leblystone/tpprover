import React, { useMemo, useState, forwardRef, useImperativeHandle } from 'react';
import { Users, Plus, Search, Info } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import CommunityCard from './CommunityCard';
import CommunityDetailsModal from './CommunityDetailsModal';
import OwnerFilter from '../buddy/OwnerFilter';
import { filterByOwner } from '../../utils/buddies';
import { trackConversion, EVENTS } from '../../services/conversionAnalytics';

/**
 * Community tracking UI (My List + optional Directory).
 * Used from Vendors (top tab) and anywhere else that passes `theme`.
 */
const CommunityPanel = forwardRef(function CommunityPanel({ theme }, ref) {
    const { communities, addCommunity, updateCommunity, deleteCommunity, ownerFilter } = useAppContext();

    const [editing, setEditing] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [search, setSearch] = useState('');

    useImperativeHandle(ref, () => ({
        openAddModal: () => {
            setEditing(null);
            setModalOpen(true);
        },
    }));

    const myList = useMemo(() => {
        if (!Array.isArray(communities)) return [];
        const byOwner = filterByOwner(communities, ownerFilter);
        const q = search.trim().toLowerCase();
        if (!q) return byOwner;
        return byOwner.filter((c) =>
            (c.name || '').toLowerCase().includes(q) ||
            (c.url || '').toLowerCase().includes(q) ||
            (c.notes || '').toLowerCase().includes(q) ||
            (c.platform || '').toLowerCase().includes(q)
        );
    }, [communities, search, ownerFilter]);

    const handleSave = (data) => {
        if (data.id) {
            updateCommunity(data);
        } else {
            addCommunity(data);
            trackConversion(EVENTS.COMMUNITY_ADDED, { hasUrl: Boolean(data.url) });
        }
        setModalOpen(false);
        setEditing(null);
    };

    const handleDelete = (community) => {
        if (!community?.id) return;
        if (!window.confirm(`Remove "${community.name}" from your list?`)) return;
        deleteCommunity(community.id);
        setModalOpen(false);
        setEditing(null);
    };

    const renderMyList = () => {
        if (myList.length === 0) {
            return (
                <div
                    className="content-section flex flex-col items-center justify-center py-12 px-6 text-center"
                    style={{ backgroundColor: theme.cardBackground || theme.white, border: `1px solid ${theme.border}`, borderRadius: '1rem' }}
                >
                    <div
                        className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                        style={{ backgroundColor: `${theme.primary}10` }}
                    >
                        <Users size={32} style={{ color: theme.primary }} />
                    </div>
                    <h3 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>
                        Track your first community
                    </h3>
                    <p className="text-sm max-w-sm mb-4" style={{ color: theme.textLight }}>
                        Keep a personal index of the forums, subreddits, and chats you follow. Private to your account.
                    </p>
                    <button
                        type="button"
                        onClick={() => { setEditing(null); setModalOpen(true); }}
                        className="px-4 py-2 rounded-full font-semibold text-sm inline-flex items-center gap-1.5 active:scale-95"
                        style={{ backgroundColor: theme.primary, color: '#ffffff', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2), inset 0 1px 2px rgba(0,0,0,0.12)' }}
                    >
                        <Plus size={14} />
                        Add Community
                    </button>
                </div>
            );
        }
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {myList.map((c) => (
                    <CommunityCard
                        key={c.id}
                        community={c}
                        theme={theme}
                        onEdit={(community) => { setEditing(community); setModalOpen(true); }}
                        onDelete={(community) => handleDelete(community)}
                    />
                ))}
            </div>
        );
    };


    return (
        <div className="max-w-5xl mx-auto space-y-4 pb-6">
            <div
                className="flex items-center gap-2 rounded-xl px-3 py-2"
                style={{
                    backgroundColor: theme.cardBackground || theme.white,
                    border: `1px solid ${theme.border}`,
                }}
            >
                <Search size={16} style={{ color: theme.textLight }} />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search your communities..."
                    className="flex-1 bg-transparent border-0 outline-none text-sm"
                    style={{ color: theme.text }}
                />
                {search && (
                    <button
                        type="button"
                        onClick={() => setSearch('')}
                        className="text-xs px-2 py-1 rounded hover:opacity-80"
                        style={{ color: theme.textLight }}
                    >
                        Clear
                    </button>
                )}
            </div>

            <OwnerFilter theme={theme} />

            {renderMyList()}

            <div
                className="flex items-start gap-2 text-xs p-3 rounded-xl"
                style={{
                    backgroundColor: theme.cardBackground || theme.white,
                    border: `1px solid ${theme.border}`,
                    color: theme.textLight,
                }}
            >
                <Info size={14} className="flex-shrink-0 mt-0.5" />
                <span>
                    Tracked communities are saved to your account only. Nothing you add here is shared
                    publicly or shown to other users.
                </span>
            </div>

            <CommunityDetailsModal
                open={modalOpen}
                community={editing}
                theme={theme}
                onClose={() => { setModalOpen(false); setEditing(null); }}
                onSave={handleSave}
                onDelete={handleDelete}
            />
        </div>
    );
});

export default CommunityPanel;
