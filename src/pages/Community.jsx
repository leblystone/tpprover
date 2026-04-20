import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Users, Plus, Search, Shield, Info } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useTierAccess } from '../utils/useSubscriptionAccess';
import { featureFlags } from '../config/featureFlags';
import CommunityCard from '../components/community/CommunityCard';
import CommunityDetailsModal from '../components/community/CommunityDetailsModal';
import UpgradeModal from '../components/common/UpgradeModal';
import OwnerFilter from '../components/buddy/OwnerFilter';
import { filterByOwner } from '../utils/buddies';
import { trackConversion, EVENTS } from '../services/conversionAnalytics';

/**
 * Community Tracking page.
 *
 * Two tabs:
 *   - My List       → personal tracker (always available)
 *   - Directory     → admin-curated hybrid list (Research sub-section +
 *                     Community sub-section with "user discretion" label)
 *
 * The Directory tab is only shown when ENABLE_COMMUNITY is on AND the
 * user has `hasDirectoryAccess` (Research+ / Founder). Free users see
 * My List only — they can still track communities personally.
 */
export default function Community() {
    const { theme } = useOutletContext();
    const { communities, addCommunity, updateCommunity, deleteCommunity, ownerFilter } = useAppContext();
    const { hasDirectoryAccess } = useTierAccess();

    const [activeTab, setActiveTab] = useState('my'); // 'my' | 'directory'
    const [editing, setEditing] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    const directoryEnabled = featureFlags.ENABLE_COMMUNITY && hasDirectoryAccess;

    // Register a Topbar action button so the "Add community" CTA matches
    // other pages (Vendors, Orders, etc.).
    useEffect(() => {
        window.dispatchEvent(new CustomEvent('tpp:set-topbar-tabs', {
            detail: {
                tabs: [{ value: 'community', label: 'Community' }],
                activeTab: 'community',
                onTabChange: () => {},
                onActionClick: () => {
                    setEditing(null);
                    setModalOpen(true);
                },
                actionLabel: 'Add Community',
            },
        }));
        return () => {
            window.dispatchEvent(new CustomEvent('tpp:clear-topbar-tabs'));
        };
    }, []);

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
                        style={{ backgroundColor: theme.primary, color: theme.white }}
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

    const renderDirectory = () => {
        // v1: directory content comes from Firestore `communityDirectory`
        // collection, populated via admin panel. Until that's wired, show
        // a clear "coming soon / you can still track your own" message.
        return (
            <div
                className="content-section p-6 rounded-2xl"
                style={{
                    backgroundColor: theme.cardBackground || theme.white,
                    border: `1px solid ${theme.border}`,
                }}
            >
                <div className="flex items-center gap-2 mb-3">
                    <Shield size={18} style={{ color: theme.primary }} />
                    <h3 className="text-base font-semibold" style={{ color: theme.text }}>
                        Directory is being seeded
                    </h3>
                </div>
                <p className="text-sm mb-3" style={{ color: theme.textLight }}>
                    We're hand-curating a hybrid list:
                </p>
                <ul className="text-sm space-y-1.5 mb-3 pl-4 list-disc" style={{ color: theme.textLight }}>
                    <li>
                        <strong style={{ color: theme.info }}>Research</strong> — verified research forums,
                        scientific communities, and official resources.
                    </li>
                    <li>
                        <strong style={{ color: theme.warning }}>Community (User Discretion)</strong> — broader
                        enthusiast groups. Clearly labeled so you can decide for yourself.
                    </li>
                </ul>
                <p className="text-xs" style={{ color: theme.textLight }}>
                    Meanwhile, add your own to <strong>My List</strong> — nothing you add is shared.
                </p>
            </div>
        );
    };

    return (
        <section className="page-bg px-2 sm:px-4 md:px-6 lg:px-8 max-w-5xl mx-auto space-y-4 pb-6">
            {/* Tabs */}
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => setActiveTab('my')}
                    className="px-3 py-1.5 rounded-full text-sm font-semibold transition-all active:scale-95"
                    style={{
                        backgroundColor: activeTab === 'my' ? theme.primary : 'transparent',
                        color: activeTab === 'my' ? theme.white : theme.text,
                        border: `1px solid ${activeTab === 'my' ? theme.primary : theme.border}`,
                    }}
                >
                    My List ({Array.isArray(communities) ? communities.length : 0})
                </button>
                {featureFlags.ENABLE_COMMUNITY && (
                    <button
                        type="button"
                        onClick={() => {
                            if (!directoryEnabled) {
                                setShowUpgradeModal(true);
                                return;
                            }
                            setActiveTab('directory');
                        }}
                        className="px-3 py-1.5 rounded-full text-sm font-semibold transition-all active:scale-95"
                        style={{
                            backgroundColor: activeTab === 'directory' ? theme.primary : 'transparent',
                            color: activeTab === 'directory' ? theme.white : theme.text,
                            border: `1px solid ${activeTab === 'directory' ? theme.primary : theme.border}`,
                        }}
                    >
                        Directory {!hasDirectoryAccess && <span className="ml-1 text-[10px] opacity-70">PRO</span>}
                    </button>
                )}
            </div>

            {/* Search bar (My List only) */}
            {activeTab === 'my' && (
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
            )}

            {activeTab === 'my' && <OwnerFilter theme={theme} />}

            {activeTab === 'my' ? renderMyList() : renderDirectory()}

            {/* Safety disclaimer */}
            {activeTab === 'my' && (
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
            )}

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
                theme={theme}
                onClose={() => setShowUpgradeModal(false)}
                actionAttempted="browse the Community Directory"
            />
        </section>
    );
}
