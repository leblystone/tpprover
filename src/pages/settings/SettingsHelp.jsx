import React, { useState, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
    HelpCircle, Search, ChevronDown, ChevronUp, Mail, ArrowLeft,
    FlaskConical, Rocket, ClipboardList, Boxes, Wrench, Shield,
    LifeBuoy, Calendar, Calculator, ShoppingCart, CreditCard,
    UserPlus, BarChart2, Sparkles, Map, BookOpen, ChevronRight,
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
    'Inventory & Stockpile Management':'Boxes',
    'Features & Tools':               'Wrench',
    'Data & Security':                'Shield',
    'Support & Help':                 'LifeBuoy',
    'Daily Workflow':                 'Calendar',
    'Recon Calculator':               'Calculator',
    'Inventory & Orders':             'ShoppingCart',
    'Plans, Subscriptions & Data':    'CreditCard',
};

/**
 * In-app Help Center.
 *
 * Three tabs:
 *   - How It Works: visual roadmap of the app's core workflow
 *   - Quick Guides: task-focused walkthroughs
 *   - FAQ:          public FAQ content with icon-tile category nav
 */
export default function SettingsHelp() {
    const { theme } = useOutletContext();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('roadmap'); // 'roadmap' | 'guides' | 'faq'
    const [query, setQuery] = useState('');
    const [openKey, setOpenKey] = useState(null);
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

    const openContactSupport = () => {
        window.dispatchEvent(new CustomEvent('tpp:open-support-modal'));
    };

    const renderAccordion = (entries, keyPrefix) => (
        <div className="space-y-2">
            {entries.map((entry, i) => {
                const key = `${keyPrefix}-${i}`;
                const isOpen = openKey === key;
                return (
                    <div key={key} className="rounded-xl overflow-hidden" style={{ backgroundColor: theme.cardBackground || theme.white, border: `1px solid ${theme.border}` }}>
                        <button
                            type="button"
                            onClick={() => setOpenKey(isOpen ? null : key)}
                            className="w-full px-4 py-3 flex items-center justify-between text-left transition-colors"
                            style={{ backgroundColor: isOpen ? theme.primary : 'transparent', color: isOpen ? theme.white : theme.text }}
                        >
                            <span className="font-medium text-sm pr-3">{entry.question}</span>
                            {isOpen ? <ChevronUp size={16} className="flex-shrink-0" /> : <ChevronDown size={16} className="flex-shrink-0" />}
                        </button>
                        {isOpen && (
                            <div className="px-4 py-3 border-t text-sm leading-relaxed" style={{ borderColor: theme.border, color: theme.textLight }}>
                                {entry.answer}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );

    /* ── Category tile grid ── */
    const renderCategoryTiles = (groups, keyField) => (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
            {groups.map((g) => {
                const title = g.title;
                const iconName = CATEGORY_ICON_MAP[title];
                const isActive = activeCategory === title;
                return (
                    <button
                        key={title}
                        type="button"
                        onClick={() => setActiveCategory(isActive ? null : title)}
                        className="flex flex-col items-center gap-1.5 p-3 rounded-2xl text-center active:scale-95 transition-all"
                        style={{
                            backgroundColor: isActive ? theme.primary : (theme.cardBackground || theme.white),
                            border: `1px solid ${isActive ? theme.primary : theme.border}`,
                            color: isActive ? (theme.white || '#fff') : theme.text,
                        }}
                    >
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : (theme.primary + '18') }}>
                            <LucideIcon name={iconName} size={16} style={{ color: isActive ? (theme.white || '#fff') : theme.primary }} />
                        </div>
                        <span className="text-[11px] font-semibold leading-tight">{title}</span>
                    </button>
                );
            })}
        </div>
    );

    return (
        <section className="page-bg max-w-3xl mx-auto space-y-5 pb-8">

            {/* Header */}
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => navigate('/app/settings')} className="p-2 rounded-full hover:opacity-80" style={{ color: theme.text }} aria-label="Back">
                    <ArrowLeft size={20} />
                </button>
                <div className="p-3 rounded-2xl" style={{ backgroundColor: theme.primary }}>
                    <HelpCircle size={28} style={{ color: '#FFFFFF' }} />
                </div>
                <div>
                    <h1 className="text-xl font-bold" style={{ color: theme.text }}>Help Center</h1>
                    <p className="text-xs opacity-60" style={{ color: theme.text }}>Guides, FAQ, and roadmap</p>
                </div>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ backgroundColor: theme.cardBackground || theme.white, border: `1px solid ${theme.border}` }}>
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
                    <button type="button" onClick={() => setQuery('')} className="text-xs px-2 py-1 rounded hover:opacity-80" style={{ color: theme.textLight }}>Clear</button>
                )}
            </div>

            {/* Search results */}
            {searchResults && (
                <div>
                    <div className="text-xs uppercase tracking-wide mb-2 opacity-60" style={{ color: theme.text }}>
                        {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                    </div>
                    {searchResults.length === 0 ? (
                        <div className="p-4 rounded-xl text-sm" style={{ backgroundColor: theme.cardBackground || theme.white, border: `1px solid ${theme.border}`, color: theme.textLight }}>
                            No results. Try a different term or{' '}
                            <button type="button" onClick={openContactSupport} className="underline" style={{ color: theme.primary }}>contact support</button>.
                        </div>
                    ) : renderAccordion(searchResults, 'search')}
                </div>
            )}

            {/* Tabs + content */}
            {!searchResults && (
                <>
                    {/* Tab pills */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {[
                            { id: 'roadmap', label: 'How It Works', icon: <Map size={12} /> },
                            { id: 'guides',  label: 'Quick Guides', icon: <BookOpen size={12} /> },
                            { id: 'faq',     label: 'FAQ',          icon: <HelpCircle size={12} /> },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => { setActiveTab(tab.id); setOpenKey(null); setActiveCategory(null); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold active:scale-95"
                                style={{
                                    backgroundColor: activeTab === tab.id ? theme.primary : 'transparent',
                                    color: activeTab === tab.id ? (theme.white || '#fff') : theme.text,
                                    border: `1px solid ${activeTab === tab.id ? theme.primary : theme.border}`,
                                }}
                            >
                                {tab.icon}{tab.label}
                            </button>
                        ))}
                    </div>

                    {/* ── How It Works roadmap ── */}
                    {activeTab === 'roadmap' && (
                        <div className="space-y-3">
                            <p className="text-xs" style={{ color: theme.textLight }}>
                                A step-by-step walkthrough of how The Pep Planner works — from setup to advanced research.
                            </p>
                            <div className="relative">
                                {/* Connecting line */}
                                <div className="absolute left-5 top-6 bottom-6 w-0.5" style={{ backgroundColor: theme.border }} />
                                <div className="space-y-3">
                                    {appRoadmap.map((step, i) => (
                                        <RoadmapStep key={i} step={step} index={i} theme={theme} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Quick Guides ── */}
                    {activeTab === 'guides' && (
                        <div className="space-y-5">
                            {renderCategoryTiles(inAppGuides, 'title')}
                            {inAppGuides
                                .filter((g) => !activeCategory || g.title === activeCategory)
                                .map((group) => (
                                    <div key={group.title} className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ backgroundColor: theme.primary + '18' }}>
                                                <LucideIcon name={CATEGORY_ICON_MAP[group.title]} size={12} style={{ color: theme.primary }} />
                                            </div>
                                            <h2 className="text-xs font-semibold uppercase tracking-wider opacity-70" style={{ color: theme.text }}>{group.title}</h2>
                                        </div>
                                        {renderAccordion(group.entries, `g-${group.title}`)}
                                    </div>
                                ))}
                        </div>
                    )}

                    {/* ── FAQ ── */}
                    {activeTab === 'faq' && (
                        <div className="space-y-5">
                            {renderCategoryTiles(publicFaqCategories, 'title')}
                            {publicFaqCategories
                                .filter((g) => !activeCategory || g.title === activeCategory)
                                .map((group) => (
                                    <div key={group.title} className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ backgroundColor: theme.primary + '18' }}>
                                                <LucideIcon name={CATEGORY_ICON_MAP[group.title]} size={12} style={{ color: theme.primary }} />
                                            </div>
                                            <h2 className="text-xs font-semibold uppercase tracking-wider opacity-70" style={{ color: theme.text }}>{group.title}</h2>
                                        </div>
                                        {renderAccordion(group.faqs, `f-${group.title}`)}
                                    </div>
                                ))}
                        </div>
                    )}
                </>
            )}

            {/* Contact footer */}
            <div className="p-4 rounded-2xl flex items-center justify-between gap-3" style={{ backgroundColor: theme.cardBackground || theme.white, border: `1px solid ${theme.border}` }}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: theme.primary + '15' }}>
                        <Mail size={18} style={{ color: theme.primary }} />
                    </div>
                    <div>
                        <div className="text-sm font-semibold" style={{ color: theme.text }}>Still stuck?</div>
                        <div className="text-xs opacity-60" style={{ color: theme.text }}>We usually reply within a day.</div>
                    </div>
                </div>
                <button type="button" onClick={openContactSupport} className="px-3 py-1.5 rounded-full text-sm font-semibold active:scale-95" style={{ backgroundColor: theme.primary, color: theme.white }}>
                    Contact Support
                </button>
            </div>
        </section>
    );
}

/* ── Roadmap step card ─────────────────────────────────────────── */
function RoadmapStep({ step, index, theme }) {
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
                className="flex-1 rounded-2xl overflow-hidden"
                style={{ backgroundColor: theme.cardBackground || theme.white, border: `1px solid ${theme.border}` }}
            >
                <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left"
                >
                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: isGold ? '#C8912A' : theme.primary }}>
                            {step.phase}
                        </div>
                        <div className="text-sm font-semibold" style={{ color: theme.text }}>{step.title}</div>
                    </div>
                    <ChevronRight size={16} className={`flex-shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} style={{ color: theme.textLight }} />
                </button>
                {expanded && (
                    <div className="px-4 pb-4 text-sm leading-relaxed border-t" style={{ borderColor: theme.border, color: theme.textLight }}>
                        {step.body}
                    </div>
                )}
            </div>
        </div>
    );
}
