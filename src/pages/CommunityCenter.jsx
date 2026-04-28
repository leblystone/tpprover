import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { SiReddit, SiDiscord, SiTelegram, SiFacebook, SiX, SiYoutube } from 'react-icons/si';
import { Globe, MoreHorizontal, Search, Users, Send, ChevronRight, ArrowLeft, ExternalLink } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useTierAccess } from '../utils/useSubscriptionAccess';
import InsightsPremiumWall from '../components/analytics/InsightsPremiumWall';

const PLATFORMS = [
    { value: 'all',      label: 'All',      icon: null },
    { value: 'reddit',   label: 'Reddit',   icon: SiReddit },
    { value: 'discord',  label: 'Discord',  icon: SiDiscord },
    { value: 'telegram', label: 'Telegram', icon: SiTelegram },
    { value: 'facebook', label: 'Facebook', icon: SiFacebook },
    { value: 'twitter',  label: 'X',        icon: SiX },
    { value: 'youtube',  label: 'YouTube',  icon: SiYoutube },
    { value: 'forum',    label: 'Forum',    icon: Globe },
    { value: 'other',    label: 'Other',    icon: MoreHorizontal },
];

// Placeholder — will be replaced by Supabase-backed curated list
const CURATED_COMMUNITIES = [];

export default function CommunityCenter() {
    const { theme } = useOutletContext();
    const { communities, addCommunity } = useAppContext();
    const navigate = useNavigate();
    const { hasDirectoryAccess } = useTierAccess();

    const [search, setSearch] = useState('');
    const [platformFilter, setPlatformFilter] = useState('all');

    // Wire up Topbar title (no tabs — single view)
    useEffect(() => {
        window.dispatchEvent(new CustomEvent('tpp:set-topbar-tabs', {
            detail: {
                tabs: [],
                activeTab: null,
                onTabChange: null,
                pageTitle: 'Community Directory',
                onActionClick: null,
                actionLabel: null,
            },
        }));
        return () => {
            window.dispatchEvent(new CustomEvent('tpp:set-topbar-tabs', {
                detail: { tabs: [], activeTab: null, onTabChange: null, pageTitle: null, onActionClick: null, actionLabel: null },
            }));
        };
    }, []);

    if (!hasDirectoryAccess) {
        return (
            <section className="page-bg px-4 pb-10 pt-4">
                <button
                    type="button"
                    onClick={() => navigate('/app/vendors?tab=community')}
                    className="flex items-center gap-1.5 text-sm font-medium opacity-60 hover:opacity-100 transition-opacity mb-4"
                    style={{ color: theme.primary }}
                >
                    <ArrowLeft size={16} />
                    Back to Community
                </button>
                <div className="max-w-lg mx-auto">
                    <InsightsPremiumWall
                        variant="full"
                        theme={theme}
                        sectionTitle="Community Directory"
                        featureBullets={[
                            'Browse curated forums & channels',
                            'Save entries to your private Community list',
                        ]}
                        onUpgrade={() => navigate('/app/account/subscription')}
                    />
                </div>
            </section>
        );
    }

    const filtered = CURATED_COMMUNITIES.filter((c) => {
        const matchesPlatform = platformFilter === 'all' || c.platform === platformFilter;
        const q = search.trim().toLowerCase();
        const matchesSearch = !q ||
            (c.name || '').toLowerCase().includes(q) ||
            (c.description || '').toLowerCase().includes(q);
        return matchesPlatform && matchesSearch;
    });

    const savedIds = new Set((communities || []).map((c) => c.directoryId).filter(Boolean));

    const handleSaveToMyList = (entry) => {
        addCommunity({
            name: entry.name,
            platform: entry.platform,
            handle: entry.handle || '',
            url: entry.url || '',
            notes: entry.description || '',
            directoryId: entry.id,
        });
    };

    return (
        <section className="page-bg px-2 sm:px-4 md:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto space-y-4 pb-6">

                {/* Back breadcrumb */}
                <button
                    type="button"
                    onClick={() => navigate('/app/vendors?tab=community')}
                    className="flex items-center gap-1.5 text-sm font-medium opacity-60 hover:opacity-100 transition-opacity pt-1"
                    style={{ color: theme.primary }}
                >
                    <ArrowLeft size={14} />
                    Back to My Communities
                </button>

                {/* Header card */}
                <div
                    className="rounded-2xl p-5 flex items-start gap-4"
                    style={{
                        background: `linear-gradient(135deg, ${theme.primary}18 0%, ${theme.primary}08 100%)`,
                        border: `1px solid ${theme.primary}25`,
                    }}
                >
                    <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: theme.primary, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' }}
                    >
                        <Users size={24} color="#fff" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-bold mb-0.5" style={{ color: theme.text }}>
                            Community Directory
                        </h2>
                        <p className="text-sm leading-relaxed" style={{ color: theme.textLight }}>
                            A curated collection of research forums, groups, and channels submitted
                            by TPP users and reviewed by our team. Save any to your private list.
                        </p>
                    </div>
                </div>

                {/* Search + platform filter row */}
                <div className="space-y-2">
                    <div
                        className="flex items-center gap-2 rounded-xl px-3 py-2"
                        style={{ backgroundColor: theme.cardBackground || theme.white, border: `1px solid ${theme.border}` }}
                    >
                        <Search size={16} style={{ color: theme.textLight }} />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search the directory…"
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

                    {/* Platform chips */}
                    <div className="flex gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
                        {PLATFORMS.map((p) => {
                            const active = platformFilter === p.value;
                            const Icon = p.icon;
                            return (
                                <button
                                    key={p.value}
                                    type="button"
                                    onClick={() => setPlatformFilter(p.value)}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all active:scale-95"
                                    style={{
                                        backgroundColor: active ? theme.primary : (theme.cardBackground || theme.white),
                                        color: active ? '#fff' : theme.textLight,
                                        border: `1px solid ${active ? theme.primary : theme.border}`,
                                        boxShadow: active ? 'inset 0 2px 4px rgba(0,0,0,0.15)' : 'none',
                                    }}
                                >
                                    {Icon && <Icon size={11} />}
                                    {p.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Directory listing */}
                {filtered.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {filtered.map((entry) => {
                            const plat = PLATFORMS.find((p) => p.value === entry.platform) || PLATFORMS[PLATFORMS.length - 1];
                            const PlatIcon = plat.icon;
                            const alreadySaved = savedIds.has(entry.id);
                            return (
                                <div
                                    key={entry.id}
                                    className="rounded-2xl p-4 flex flex-col gap-3 transition-all duration-200"
                                    style={{
                                        backgroundColor: theme.cardBackground || theme.white,
                                        border: `1px solid ${theme.border}`,
                                    }}
                                >
                                    <div className="flex items-start gap-3">
                                        <div
                                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                            style={{ backgroundColor: `${theme.primary}15` }}
                                        >
                                            {PlatIcon && <PlatIcon size={20} style={{ color: theme.primary }} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-sm leading-tight" style={{ color: theme.text }}>
                                                {entry.name}
                                            </h3>
                                            {entry.handle && (
                                                <p className="text-xs mt-0.5 opacity-60" style={{ color: theme.textLight }}>
                                                    {entry.handle}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {entry.description && (
                                        <p className="text-xs leading-relaxed" style={{ color: theme.textLight }}>
                                            {entry.description}
                                        </p>
                                    )}

                                    <div className="flex items-center gap-2 pt-1">
                                        {entry.url && (
                                            <a
                                                href={entry.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 text-xs font-medium opacity-70 hover:opacity-100 transition-opacity"
                                                style={{ color: theme.primary }}
                                            >
                                                <ExternalLink size={12} />
                                                Visit
                                            </a>
                                        )}
                                        <div className="flex-1" />
                                        <button
                                            type="button"
                                            onClick={() => !alreadySaved && handleSaveToMyList(entry)}
                                            disabled={alreadySaved}
                                            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-default"
                                            style={{
                                                backgroundColor: alreadySaved ? 'transparent' : theme.primary,
                                                color: alreadySaved ? theme.textLight : '#fff',
                                                border: alreadySaved ? `1px solid ${theme.border}` : 'none',
                                                boxShadow: alreadySaved ? 'none' : 'inset 0 2px 4px rgba(0,0,0,0.15)',
                                            }}
                                        >
                                            {alreadySaved ? 'Saved ✓' : '+ Save to My List'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* Empty state */
                    <div
                        className="rounded-2xl p-10 flex flex-col items-center justify-center text-center"
                        style={{ backgroundColor: theme.cardBackground || theme.white, border: `1px solid ${theme.border}` }}
                    >
                        <div
                            className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                            style={{ backgroundColor: `${theme.primary}10` }}
                        >
                            <Users size={32} style={{ color: theme.primary }} />
                        </div>
                        <h3 className="text-base font-semibold mb-2" style={{ color: theme.text }}>
                            Directory coming soon
                        </h3>
                        <p className="text-sm max-w-xs leading-relaxed mb-6" style={{ color: theme.textLight }}>
                            We're hand-curating the first batch of communities. In the meantime,
                            submit your favorites and we'll review them for inclusion.
                        </p>
                        <button
                            type="button"
                            onClick={() => navigate('/app/vendors?tab=community')}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all active:scale-95"
                            style={{
                                backgroundColor: theme.primary,
                                color: '#fff',
                                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
                            }}
                        >
                            <Send size={14} />
                            Submit a Community
                        </button>
                    </div>
                )}

                {/* Submit CTA (when there are results) */}
                {filtered.length > 0 && (
                    <button
                        type="button"
                        onClick={() => navigate('/app/vendors?tab=community')}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all active:scale-[0.99]"
                        style={{
                            backgroundColor: theme.cardBackground || theme.white,
                            border: `1px solid ${theme.border}`,
                            color: theme.textLight,
                        }}
                    >
                        <div className="flex items-center gap-2">
                            <Send size={14} style={{ color: theme.primary }} />
                            <span>Know a great community? Submit it for review</span>
                        </div>
                        <ChevronRight size={14} />
                    </button>
                )}

            </div>
        </section>
    );
}
