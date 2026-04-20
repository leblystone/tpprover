import React, { useState, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { HelpCircle, Search, ChevronDown, ChevronUp, Mail, ArrowLeft } from 'lucide-react';
import { publicFaqCategories, inAppGuides, getAllFaqEntries } from '../../data/faqContent';

/**
 * In-app Help Center.
 *
 * Two tabs:
 *   - Quick Guides: task-focused walkthroughs specific to using the app
 *     (from `inAppGuides` in faqContent.js)
 *   - FAQ: the full public FAQ content
 *
 * Plus a search bar across both sources and a "Contact Support" shortcut.
 */
export default function SettingsHelp() {
  const { theme } = useOutletContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('guides'); // 'guides' | 'faq'
  const [query, setQuery] = useState('');
  const [openKey, setOpenKey] = useState(null);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return getAllFaqEntries().filter((e) => {
      return (
        e.question.toLowerCase().includes(q) ||
        e.answer.toLowerCase().includes(q) ||
        (e.group && e.group.toLowerCase().includes(q))
      );
    });
  }, [query]);

  const openContactSupport = () => {
    // SupportModal listens for this event in the app shell.
    window.dispatchEvent(new CustomEvent('tpp:open-support-modal'));
  };

  const renderAccordion = (entries, keyPrefix) => (
    <div className="space-y-2">
      {entries.map((entry, i) => {
        const key = `${keyPrefix}-${i}`;
        const isOpen = openKey === key;
        return (
          <div
            key={key}
            className="rounded-xl overflow-hidden"
            style={{
              backgroundColor: theme.cardBackground || theme.white,
              border: `1px solid ${theme.border}`,
            }}
          >
            <button
              type="button"
              onClick={() => setOpenKey(isOpen ? null : key)}
              className="w-full px-4 py-3 flex items-center justify-between text-left transition-colors"
              style={{
                backgroundColor: isOpen ? theme.primary : 'transparent',
                color: isOpen ? theme.white : theme.text,
              }}
            >
              <span className="font-medium text-sm pr-3">{entry.question}</span>
              {isOpen ? (
                <ChevronUp size={18} className="flex-shrink-0" />
              ) : (
                <ChevronDown size={18} className="flex-shrink-0" />
              )}
            </button>
            {isOpen && (
              <div
                className="px-4 py-3 border-t text-sm leading-relaxed"
                style={{ borderColor: theme.border, color: theme.textLight }}
              >
                {entry.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <section className="page-bg max-w-3xl mx-auto space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/app/settings')}
          className="p-2 rounded-full transition-colors hover:opacity-80"
          style={{ color: theme.text }}
          aria-label="Back to settings"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="p-3 rounded-2xl" style={{ backgroundColor: theme.primary }}>
          <HelpCircle size={28} style={{ color: '#FFFFFF' }} />
        </div>
        <div className="flex flex-col">
          <h1 className="text-xl font-bold" style={{ color: theme.text }}>
            Help Center
          </h1>
          <p className="text-xs opacity-60" style={{ color: theme.text }}>
            Quick guides, FAQ, and support
          </p>
        </div>
      </div>

      {/* Search */}
      <div
        className="flex items-center gap-2 rounded-xl px-3 py-2.5"
        style={{
          backgroundColor: theme.cardBackground || theme.white,
          border: `1px solid ${theme.border}`,
        }}
      >
        <Search size={16} style={{ color: theme.textLight }} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search help articles..."
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

      {/* Search results */}
      {searchResults && (
        <div>
          <div className="text-xs uppercase tracking-wide mb-2 opacity-60" style={{ color: theme.text }}>
            {searchResults.length} result{searchResults.length === 1 ? '' : 's'}
          </div>
          {searchResults.length === 0 ? (
            <div
              className="p-4 rounded-xl text-sm"
              style={{
                backgroundColor: theme.cardBackground || theme.white,
                border: `1px solid ${theme.border}`,
                color: theme.textLight,
              }}
            >
              No results. Try a different term or{' '}
              <button
                type="button"
                onClick={openContactSupport}
                className="underline"
                style={{ color: theme.primary }}
              >
                contact support
              </button>
              .
            </div>
          ) : (
            renderAccordion(searchResults, 'search')
          )}
        </div>
      )}

      {/* Tabs + content (hidden when searching) */}
      {!searchResults && (
        <>
          <div className="flex items-center gap-2">
            {[
              { id: 'guides', label: 'Quick Guides' },
              { id: 'faq', label: 'FAQ' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setOpenKey(null);
                }}
                className="px-3 py-1.5 rounded-full text-sm font-semibold transition-all active:scale-95"
                style={{
                  backgroundColor: activeTab === tab.id ? theme.primary : 'transparent',
                  color: activeTab === tab.id ? theme.white : theme.text,
                  border: `1px solid ${activeTab === tab.id ? theme.primary : theme.border}`,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'guides' && (
            <div className="space-y-5">
              {inAppGuides.map((group) => (
                <div key={group.title} className="space-y-2">
                  <h2
                    className="text-sm font-semibold uppercase tracking-wide opacity-70"
                    style={{ color: theme.text }}
                  >
                    {group.title}
                  </h2>
                  {renderAccordion(group.entries, `g-${group.title}`)}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'faq' && (
            <div className="space-y-5">
              {publicFaqCategories.map((group) => (
                <div key={group.title} className="space-y-2">
                  <h2
                    className="text-sm font-semibold uppercase tracking-wide opacity-70"
                    style={{ color: theme.text }}
                  >
                    {group.title}
                  </h2>
                  {renderAccordion(group.faqs, `f-${group.title}`)}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Contact footer */}
      <div
        className="p-4 rounded-2xl flex items-center justify-between gap-3"
        style={{
          backgroundColor: theme.cardBackground || theme.white,
          border: `1px solid ${theme.border}`,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: theme.primary + '15' }}
          >
            <Mail size={18} style={{ color: theme.primary }} />
          </div>
          <div>
            <div className="text-sm font-semibold" style={{ color: theme.text }}>
              Still stuck?
            </div>
            <div className="text-xs opacity-60" style={{ color: theme.text }}>
              We usually reply within a day.
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={openContactSupport}
          className="px-3 py-1.5 rounded-full text-sm font-semibold transition-all active:scale-95"
          style={{ backgroundColor: theme.primary, color: theme.white }}
        >
          Contact Support
        </button>
      </div>
    </section>
  );
}
