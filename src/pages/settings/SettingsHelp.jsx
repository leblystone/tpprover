import React, { useState, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
    HelpCircle, Search, ChevronDown, ChevronUp, Mail, ArrowLeft,
    FlaskConical, Rocket, ClipboardList, Boxes, Wrench, Shield,
    LifeBuoy, Calendar, Calculator, ShoppingCart, CreditCard,
    UserPlus, BarChart2, Sparkles, Map, BookOpen, ChevronRight,
    MessageSquare,
} from 'lucide-react';
import { publicFaqCategories, inAppGuides, getAllFaqEntries, appRoadmap } from '../../data/faqContent';

const ICON_MAP = {
    FlaskConical, Rocket, ClipboardList, Boxes, Wrench, Shield,
    LifeBuoy, Calendar, Calculator, ShoppingCart, CreditCard,
    UserPlus, BarChart2, Sparkles,
};

function LucideIcon({ name, size = 16, style }) {
    const Comp = ICON_MAP[name];
    if (!Comp) return null;
    return <Comp size={size} style={style} />;
}

const CATEGORY_ICON_MAP = {
    'About The Pep Planner':          'FlaskConical',
    'Getting Started':                'Rocket',
    'Protocol Tracking & Management': 'ClipboardList',
    'Inventory & Stockpile Management': 'Boxes',
    'Features & Tools':               'Wrench',
    'Data & Security':                'Shield',
    'Support & Help':                 'LifeBuoy',
    'Daily Workflow':                 'Calendar',
    'Recon Calculator':               'Calculator',
    'Inventory & Orders':             'ShoppingCart',
    'Plans, Subscriptions & Data':    'CreditCard',
};

const BORDER = (theme) =>
    `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`;

export default function SettingsHelp() {
    const { theme } = useOutletContext();
    const navigate  = useNavigate();

    const [activeTab,      setActiveTab]      = useState('roadmap');
    const [query,          setQuery]          = useState('');
    const [openKey,        setOpenKey]        = useState(null);
    const [activeCategory, setActiveCategory] = useState(null);

    const searchResults = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return null;
        return getAllFaqEntries().filter((e) =>
            e.question.toLowerCase().includes(q) ||
            e.answer.toLowerCase().includes(q) ||
            (e.group && e.group.toLowerCase().includes(q))
        );
    }, [query]);

    const openContactSupport = () =>
        window.dispatchEvent(new CustomEvent('tpp:open-support-modal'));

    /* ── accordion ── */
    const renderAccordion = (entries, keyPrefix) => (
        <div className="space-y-2">
            {entries.map((entry, i) => {
                const key    = `${keyPrefix}-${i}`;
                const isOpen = openKey === key;
                return (
                    <div
                        key={key}
                        className="content-section rounded-2xl overflow-hidden"
                        style={{ border: BORDER(theme) }}
                    >
                        <button
                            type="button"
                            onClick={() => setOpenKey(isOpen ? null : key)}
                            className="w-full px-4 py-3 flex items-center justify-between text-left transition-colors"
                            style={{
                                backgroundColor: isOpen ? theme.primary : 'transparent',
                                color: isOpen ? (theme.white || '#fff') : theme.text,
                            }}
                        >
                            <span className="font-medium text-sm pr-3">{entry.question}</span>
                            {isOpen
                                ? <ChevronUp size={16} className="flex-shrink-0" />
                                : <ChevronDown size={16} className="flex-shrink-0" />}
                        </button>
                        {isOpen && (
                            <div
                                className="px-4 py-3 border-t text-sm leading-relaxed"
                                style={{
                                    borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                                    color: theme.textLight,
                                }}
                            >
                                {entry.answer}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );

    /* ── category tile grid ── */
    const renderCategoryTiles = (groups) => (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
            {groups.map((g) => {
                const title    = g.title;
                const iconName = CATEGORY_ICON_MAP[title];
                const isActive = activeCategory === title;
                return (
                    <button
                        key={title}
                        type="button"
                        onClick={() => setActiveCategory(isActive ? null : title)}
                        className="content-section flex flex-col items-center gap-1.5 p-3 rounded-2xl text-center active:scale-95 transition-all"
                        style={{
                            border: `1px solid ${isActive ? theme.primary : (theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)')}`,
                            backgroundColor: isActive ? theme.primary : undefined,
                            color: isActive ? (theme.white || '#fff') : theme.text,
                        }}
                    >
                        <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : (theme.primary + '18') }}
                        >
                            <LucideIcon
                                name={iconName}
                                size={16}
                                style={{ color: isActive ? (theme.white || '#fff') : theme.primary }}
                            />
                        </div>
                        <span className="text-[11px] font-semibold leading-tight">{title}</span>
                    </button>
                );
            })}
        </div>
    );

    /* ── section label ── */
    const SectionLabel = ({ icon, label }) => (
        <div className="flex items-center gap-2">
            {React.cloneElement(icon, { size: 14, className: 'opacity-40', style: { color: theme.text } })}
            <span className="text-xs font-bold uppercase tracking-[0.12em] opacity-40" style={{ color: theme.text }}>
                {label}
            </span>
        </div>
    );

    return (
        <section className="page-bg max-w-xl mx-auto space-y-6 pb-10">

            {/* ── Header ── */}
            <div className="flex items-center gap-4 mb-1">
                <button
                    onClick={() => navigate('/app/settings')}
                    className="group p-2 rounded-xl transition-all active:scale-95 shrink-0 glass-button-nav"
                >
                    <ArrowLeft size={18} style={{ color: theme.text }} className="group-hover:-translate-x-1 transition-transform" />
                </button>
                <div className="flex flex-col gap-0.5">
                    <h1 className="text-2xl font-semibold tracking-tight" style={{ color: theme.text }}>Help Center</h1>
                    <div className="flex items-center gap-2">
                        <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }} />
                        <span className="text-[11px] font-bold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                            Guides, FAQ &amp; Walkthrough
                        </span>
                    </div>
                </div>
            </div>

            <div className="h-px w-full opacity-10" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />

            {/* ── Search ── */}
            <div

                    className="content-section flex items-center gap-2 rounded-2xl px-4 py-3"
                    style={{ border: BORDER(theme) }}
                >
                    <Search size={16} style={{ color: theme.textLight }} />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search help articles…"
                        className="flex-1 bg-transparent border-0 outline-none text-sm"
                        style={{ color: theme.text }}
                    />
                    {query && (
                    <button
                        type="button"
                        onClick={() => setQuery('')}
                        className="text-xs px-2 py-1 rounded hover:opacity-80"
                        style={{ color: theme.textLight }}
                    >
                        Clear
                    </button>
                )}
            </div>

            {/* ── Search results ── */}
            {searchResults && (
                <div className="space-y-3">
                    <p className="text-xs uppercase tracking-wide opacity-60" style={{ color: theme.text }}>
                        {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                    </p>
                    {searchResults.length === 0 ? (
                        <div
                            className="content-section p-4 rounded-2xl text-sm"
                            style={{ border: BORDER(theme), color: theme.textLight }}
                        >
                            No results. Try a different term or{' '}
                            <button
                                type="button"
                                onClick={openContactSupport}
                                className="underline"
                                style={{ color: theme.primary }}
                            >
                                contact support
                            </button>.
                        </div>
                    ) : renderAccordion(searchResults, 'search')}
                </div>
            )}

            {/* ── Tabs + content (hidden while searching) ── */}
            {!searchResults && (
                <>
                    {/* Segmented toggle */}
                    <div
                        className="flex items-center w-full rounded-2xl p-1"
                        style={{
                            backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.12), inset 0 1px 2px rgba(0,0,0,0.08)',
                        }}
                    >
                        {[
                            { id: 'roadmap', label: 'How It Works', icon: <Map size={12} /> },
                            { id: 'guides',  label: 'Quick Guides', icon: <BookOpen size={12} /> },
                            { id: 'faq',     label: 'FAQ',          icon: <HelpCircle size={12} /> },
                        ].map((tab) => {
                            const active = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => { setActiveTab(tab.id); setOpenKey(null); setActiveCategory(null); }}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
                                    style={{
                                        backgroundColor: active ? (theme.cardBackground || (theme.isDark ? '#2a3332' : '#fff')) : 'transparent',
                                        color: active ? theme.primary : (theme.isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)'),
                                        boxShadow: active
                                            ? '0 1px 4px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)'
                                            : 'none',
                                    }}
                                >
                                    {tab.icon}{tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* ── How It Works roadmap ── */}
                    {activeTab === 'roadmap' && (
                        <div className="space-y-3">
                            <div className="relative">
                                <div className="absolute left-5 top-6 bottom-6 w-0.5" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />
                                <div className="space-y-3">
                                    {appRoadmap.map((step, i) => (
                                        <RoadmapStep key={i} step={step} theme={theme} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Quick Guides ── */}
                    {activeTab === 'guides' && (
                        <div className="space-y-5">
                            {renderCategoryTiles(inAppGuides)}
                            {inAppGuides
                                .filter((g) => !activeCategory || g.title === activeCategory)
                                .map((group) => (
                                    <div key={group.title} className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-5 h-5 rounded-md flex items-center justify-center"
                                                style={{ backgroundColor: theme.primary + '18' }}
                                            >
                                                <LucideIcon name={CATEGORY_ICON_MAP[group.title]} size={12} style={{ color: theme.primary }} />
                                            </div>
                                            <h2
                                                className="text-xs font-semibold uppercase tracking-wider opacity-60"
                                                style={{ color: theme.text }}
                                            >
                                                {group.title}
                                            </h2>
                                        </div>
                                        {renderAccordion(group.entries, `g-${group.title}`)}
                                    </div>
                                ))}
                        </div>
                    )}

                    {/* ── FAQ ── */}
                    {activeTab === 'faq' && (
                        <div className="space-y-5">
                            {renderCategoryTiles(publicFaqCategories)}
                            {publicFaqCategories
                                .filter((g) => !activeCategory || g.title === activeCategory)
                                .map((group) => (
                                    <div key={group.title} className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-5 h-5 rounded-md flex items-center justify-center"
                                                style={{ backgroundColor: theme.primary + '18' }}
                                            >
                                                <LucideIcon name={CATEGORY_ICON_MAP[group.title]} size={12} style={{ color: theme.primary }} />
                                            </div>
                                            <h2
                                                className="text-xs font-semibold uppercase tracking-wider opacity-60"
                                                style={{ color: theme.text }}
                                            >
                                                {group.title}
                                            </h2>
                                        </div>
                                        {renderAccordion(group.faqs, `f-${group.title}`)}
                                    </div>
                                ))}
                        </div>
                    )}
                </>
            )}

            {/* ── Contact support footer ── */}
            <div className="space-y-3">
                <SectionLabel icon={<MessageSquare />} label="Still need help?" />
                <div
                    className="content-section p-5 rounded-2xl flex items-center justify-between gap-3"
                    style={{ border: BORDER(theme) }}
                >
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{ backgroundColor: theme.primary + '18' }}
                        >
                            <Mail size={18} style={{ color: theme.primary }} />
                        </div>
                        <div>
                            <div className="font-semibold text-sm" style={{ color: theme.text }}>Contact support</div>
                            <div className="text-xs opacity-60" style={{ color: theme.text }}>We usually reply within a day.</div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={openContactSupport}
                        className="px-3 py-1.5 rounded-full text-sm font-semibold active:scale-95 shrink-0"
                        style={{
                            backgroundColor: theme.primary,
                            color: theme.white || '#fff',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.18), 0 1px 2px rgba(0,0,0,0.10)',
                        }}
                    >
                        Contact
                    </button>
                </div>
            </div>

        </section>
    );
}

/* ── Roadmap step ─────────────────────────────────────────────── */
function RoadmapStep({ step, theme }) {
    const [expanded, setExpanded] = useState(false);
    const isGold = step.color !== '#7F9E95';

    return (
        <div className="relative flex gap-4">
            {/* Step node */}
            <div
                className="relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm"
                style={{ backgroundColor: isGold ? '#C8912A' : theme.primary, color: '#fff' }}
            >
                <LucideIcon name={step.icon} size={16} style={{ color: '#fff' }} />
            </div>

            {/* Content card */}
            <div
                className="content-section flex-1 rounded-2xl overflow-hidden"
                style={{ border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}
            >
                <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left"
                >
                    <div>
                        <div
                            className="text-[10px] font-bold uppercase tracking-widest mb-0.5"
                            style={{ color: isGold ? '#C8912A' : theme.primary }}
                        >
                            {step.phase}
                        </div>
                        <div className="text-sm font-semibold" style={{ color: theme.text }}>{step.title}</div>
                    </div>
                    <ChevronRight
                        size={16}
                        className={`flex-shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
                        style={{ color: theme.textLight }}
                    />
                </button>
                {expanded && (
                    <div
                        className="px-4 pb-4 text-sm leading-relaxed border-t"
                        style={{
                            borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                            color: theme.textLight,
                        }}
                    >
                        {step.body}
                    </div>
                )}
            </div>
        </div>
    );
}
