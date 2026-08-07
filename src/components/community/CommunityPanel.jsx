import React, { useMemo, useState, forwardRef, useImperativeHandle } from 'react';
import { Users, Plus, Search, Info, ChevronRight, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import UpgradeModal from '../common/UpgradeModal';
import CommunityCard from './CommunityCard';
import CommunityDetailsModal from './CommunityDetailsModal';
import OwnerFilter from '../buddy/OwnerFilter';
import { filterByOwner } from '../../utils/buddies';
import { trackConversion, EVENTS } from '../../services/conversionAnalytics';
import { featureFlags } from '../../config/featureFlags';
import { useTierAccess } from '../../utils/useSubscriptionAccess';
import InsightsPremiumWall from '../analytics/InsightsPremiumWall';

/**
 * Community tracking UI (My List + optional Directory).
 * Used from Vendors (top tab) and anywhere else that passes `theme`.
 */
const CommunityPanel = forwardRef(function CommunityPanel({ theme }, ref) {
    const { communities, addCommunity, updateCommunity, deleteCommunity, ownerFilter } = useAppContext();
    const navigate = useNavigate();
    const directoryEnabled = featureFlags.ENABLE_COMMUNITY_DIRECTORY;
    const { hasDirectoryAccess } = useTierAccess();

    const [editing, setEditing] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

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
        const filtered = !q
            ? byOwner
            : byOwner.filter((c) =>
                (c.name || '').toLowerCase().includes(q) ||
                (c.url || '').toLowerCase().includes(q) ||
                (c.notes || '').toLowerCase().includes(q) ||
                (c.platform || '').toLowerCase().includes(q)
            );
        return [...filtered].sort((a, b) => {
            const af = a?.favorited ? 1 : 0;
            const bf = b?.favorited ? 1 : 0;
            if (bf !== af) return bf - af;
            return String(a?.name || '').localeCompare(String(b?.name || ''));
        });
    }, [communities, search, ownerFilter]);

    const handleToggleFavorite = (community) => {
        if (!community?.id) return;
        updateCommunity({
            ...community,
            favorited: !community.favorited,
        });
    };

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
            <div className="grid grid-cols-2 gap-2.5">
                {myList.map((c) => (
                    <motion.div
                        key={c.id}
                        layout
                        transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.7 }}
                    >
                        <CommunityCard
                            community={c}
                            theme={theme}
                            onEdit={(community) => { setEditing(community); setModalOpen(true); }}
                            onToggleFavorite={handleToggleFavorite}
                        />
                    </motion.div>
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
                <span
                    className="inline-flex items-center gap-1.5 shrink-0 text-[11px] font-medium"
                    style={{ color: theme.textLight }}
                    title="Tracked communities are saved to your account only. Nothing you add here is shared publicly or shown to other users."
                >
                    <Info size={14} className="shrink-0" />
                    <span className="hidden sm:inline whitespace-nowrap">Private to you</span>
                </span>
                <div
                    className="w-px h-4 shrink-0"
                    style={{ backgroundColor: theme.border }}
                    aria-hidden
                />
                <Search size={16} className="shrink-0" style={{ color: theme.textLight }} />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search communities..."
                    className="flex-1 min-w-0 bg-transparent border-0 outline-none text-sm"
                    style={{ color: theme.text }}
                />
                {search && (
                    <button
                        type="button"
                        onClick={() => setSearch('')}
                        className="text-xs px-2 py-1 rounded hover:opacity-80 shrink-0"
                        style={{ color: theme.textLight }}
                    >
                        Clear
                    </button>
                )}
            </div>

            {/* Directory entry banner — Research+ for curated directory browse */}
            {directoryEnabled && (
                hasDirectoryAccess ? (
                <button
                    type="button"
                    onClick={() => navigate('/app/community')}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-all active:scale-[0.99]"
                    style={{
                        background: `linear-gradient(135deg, ${theme.primary}18 0%, ${theme.primary}08 100%)`,
                        border: `1px solid ${theme.primary}30`,
                    }}
                >
                    <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: theme.primary, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' }}
                    >
                        <Globe size={16} color="#fff" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold leading-tight" style={{ color: theme.text }}>
                            Browse Community Directory
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: theme.textLight }}>
                            Discover curated forums, groups & channels
                        </p>
                    </div>
                    <ChevronRight size={16} style={{ color: theme.primary }} className="flex-shrink-0 opacity-60" />
                </button>
                ) : (
                    <InsightsPremiumWall
                        variant="card"
                        theme={theme}
                        borderColor={theme.border}
                        sectionTitle="Community Directory"
                        featureBullets={[
                            'Browse curated forums, groups & channels',
                            'Verified listings maintained by the team',
                        ]}
                        onUpgrade={() => setShowUpgradeModal(true)}
                    />
                )
            )}

            <OwnerFilter theme={theme} />

            {renderMyList()}

            <CommunityDetailsModal
                open={modalOpen}
                community={editing}
                theme={theme}
                onClose={() => { setModalOpen(false); setEditing(null); }}
                onSave={handleSave}
                onDelete={handleDelete}
            />
            <UpgradeModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                theme={theme}
            />
        </div>
    );
});

export default CommunityPanel;
