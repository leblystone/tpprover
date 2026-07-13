import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db, functions } from '../../config/firebase';
import { httpsCallable } from 'firebase/functions';
import {
  CircleNotch, ArrowsClockwise, Copy, Download, EnvelopeSimple,
  MagnifyingGlass, Check, UsersThree, Prohibit, CheckCircle,
} from '@phosphor-icons/react';
import {
  buildShopMarketingContacts,
  mergeMarketingPrefs,
  filterMarketingContacts,
  MARKETING_SOURCE_LABELS,
  PROMO_STATUS_LABELS,
  downloadMarketingCsv,
} from '../../utils/shopMarketingContacts';
import { gmailComposeUrl } from '../../utils/gmailCompose';

const SOURCE_TABS = [
  { id: 'all', label: 'All' },
  { id: 'site', label: 'Site checkout' },
  { id: 'squarespace', label: 'Squarespace' },
  { id: 'manual', label: 'Manual' },
  { id: 'other', label: 'Other' },
];

const PROMO_TABS = [
  { id: 'all', label: 'All contacts' },
  { id: 'subscribed', label: 'Subscribed' },
  { id: 'opted_out', label: 'Opted out' },
  { id: 'no_consent', label: 'No consent' },
];

const PAGE_SIZE = 50;

function toast(type, message) {
  window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { type, message } }));
}

function formatMoney(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((cents || 0) / 100);
}

function formatDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function optOutDetail(contact) {
  if (contact.promoStatus !== 'opted_out') return null;
  const reason = contact.optOutReason || 'Opted out';
  const when = formatDate(contact.marketingOptOutAt);
  const via = contact.unsubscribeSource === 'email_link'
    ? 'email link'
    : contact.unsubscribeSource === 'web_form'
      ? 'unsubscribe page'
      : contact.unsubscribeSource === 'admin'
        ? 'admin'
        : null;
  return [reason, when !== '—' ? when : null, via ? `via ${via}` : null].filter(Boolean).join(' · ');
}

function SelectCheckbox({ checked, onClick, theme }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      className="w-5 h-5 rounded-sm border-2 relative flex items-center justify-center flex-shrink-0 transition-all hover:scale-110"
      style={{
        borderColor: checked ? (theme.primaryDark || theme.primary) : `${theme.primaryLight || theme.primary}60`,
        backgroundColor: checked ? theme.primary : 'transparent',
        borderRadius: 4,
      }}
    >
      {checked && <Check size={14} weight="bold" className="absolute text-white" style={{ top: -3, right: -3 }} />}
    </button>
  );
}

export default function AdminShopMarketing() {
  const { theme } = useOutletContext();
  const [orders, setOrders] = useState([]);
  const [prefs, setPrefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sourceTab, setSourceTab] = useState('all');
  const [promoTab, setPromoTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [checkedEmails, setCheckedEmails] = useState(new Set());
  const [copied, setCopied] = useState(false);
  const [updatingEmail, setUpdatingEmail] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersSnap, prefsSnap] = await Promise.all([
        getDocs(query(collection(db, 'physicalOrders'), orderBy('createdAt', 'desc'))),
        getDocs(collection(db, 'shopMarketingContacts')),
      ]);
      setOrders(ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setPrefs(prefsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Failed to load marketing data:', err);
      toast('error', 'Failed to load marketing contacts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const allContacts = useMemo(
    () => mergeMarketingPrefs(buildShopMarketingContacts(orders), prefs),
    [orders, prefs],
  );

  const filtered = useMemo(
    () => filterMarketingContacts(allContacts, { source: sourceTab, promo: promoTab, search: searchQuery }),
    [allContacts, sourceTab, promoTab, searchQuery],
  );

  useEffect(() => { setPage(1); }, [sourceTab, promoTab, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return {
      total: allContacts.length,
      subscribed: allContacts.filter((c) => c.promoStatus === 'subscribed').length,
      optedOut: allContacts.filter((c) => c.promoStatus === 'opted_out').length,
      site: allContacts.filter((c) => c.sources.includes('site')).length,
      squarespace: allContacts.filter((c) => c.sources.includes('squarespace')).length,
      manual: allContacts.filter((c) => c.sources.includes('manual')).length,
      newThisMonth: allContacts.filter((c) => c.firstOrderAt >= monthStart).length,
    };
  }, [allContacts]);

  const updatePromoOptIn = async (contact, marketingOptIn) => {
    setUpdatingEmail(contact.email);
    try {
      const fn = httpsCallable(functions, 'updateShopMarketingOptIn');
      await fn({
        email: contact.displayEmail || contact.email,
        marketingOptIn,
        reason: marketingOptIn ? undefined : 'Admin opt-out from marketing tab',
      });
      await loadData();
      toast('success', marketingOptIn ? 'Marked as subscribed' : 'Opted out of promos');
    } catch (err) {
      toast('error', err.message || 'Failed to update');
    } finally {
      setUpdatingEmail(null);
    }
  };

  const toggleCheck = (email) => {
    setCheckedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };

  const toggleAllVisible = () => {
    const visible = paginated.map((c) => c.email);
    const allChecked = visible.every((e) => checkedEmails.has(e));
    setCheckedEmails((prev) => {
      const next = new Set(prev);
      visible.forEach((e) => (allChecked ? next.delete(e) : next.add(e)));
      return next;
    });
  };

  const copyEmails = async (contacts) => {
    const list = contacts.map((c) => c.displayEmail || c.email);
    if (!list.length) {
      toast('warning', 'No emails to copy');
      return;
    }
    try {
      await navigator.clipboard.writeText(list.join(', '));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast('success', `Copied ${list.length} email${list.length === 1 ? '' : 's'}`);
    } catch {
      toast('error', 'Could not copy to clipboard');
    }
  };

  const selectedContacts = filtered.filter((c) => checkedEmails.has(c.email));
  const subscribedContacts = filtered.filter((c) => c.promoStatus === 'subscribed');
  const exportSet = selectedContacts.length
    ? selectedContacts
    : promoTab === 'subscribed'
      ? subscribedContacts
      : filtered;

  const promoBadgeStyle = (status) => {
    if (status === 'subscribed') return { backgroundColor: `${theme.primary}18`, color: theme.primaryDark || theme.primary };
    if (status === 'opted_out') return { backgroundColor: '#F5E6DF', color: '#8B5A42' };
    if (status === 'declined') return { backgroundColor: '#f3f4f6', color: '#6b7280' };
    return { backgroundColor: '#fef9e7', color: '#92400e' };
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-normal tracking-tight" style={{ color: theme.text }}>Marketing</h1>
          <p className="text-sm mt-1" style={{ color: theme.textLight }}>
            Customer emails from shop orders — Squarespace imports, site checkout, and manual orders.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => loadData()}
            disabled={loading}
            className="p-2 rounded-full transition-colors hover:bg-black/5 disabled:opacity-40"
            title="Refresh"
            style={{ color: theme.textLight }}
          >
            <ArrowsClockwise size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={() => copyEmails(subscribedContacts.length ? subscribedContacts : exportSet.filter((c) => c.promoStatus === 'subscribed'))}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded border transition-colors hover:bg-black/[0.03]"
            style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.cardBackground }}
          >
            <Copy size={16} />
            Copy subscribed
          </button>
          <button
            type="button"
            onClick={() => copyEmails(exportSet)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded border transition-colors hover:bg-black/[0.03]"
            style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.cardBackground }}
          >
            <Copy size={16} />
            {copied ? 'Copied!' : selectedContacts.length ? `Copy ${selectedContacts.length} selected` : 'Copy all visible'}
          </button>
          <button
            type="button"
            onClick={() => {
              downloadMarketingCsv(exportSet);
              toast('success', `Exported ${exportSet.length} contact${exportSet.length === 1 ? '' : 's'}`);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded border transition-colors hover:bg-black/[0.03]"
            style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.cardBackground }}
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total contacts', value: stats.total, icon: UsersThree },
          { label: 'Subscribed', value: stats.subscribed },
          { label: 'Opted out', value: stats.optedOut },
          { label: 'New this month', value: stats.newThisMonth },
        ].map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-lg border px-4 py-3"
            style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}
          >
            <div className="flex items-center gap-2 text-xs mb-1" style={{ color: theme.textLight }}>
              {Icon && <Icon size={14} />}
              {label}
            </div>
            <div className="text-xl font-semibold tabular-nums" style={{ color: theme.text }}>{value}</div>
          </div>
        ))}
      </div>

      <div className="relative max-w-md">
        <MagnifyingGlass
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: theme.textLight }}
        />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search email or name…"
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border"
          style={{ borderColor: theme.border, backgroundColor: theme.cardBackground, color: theme.text }}
        />
      </div>

      <div className="border-b flex flex-wrap items-center gap-6" style={{ borderColor: theme.border }}>
        {PROMO_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setPromoTab(tab.id)}
            className="pb-3 text-sm border-b-2 -mb-px transition-colors"
            style={{
              color: promoTab === tab.id ? theme.text : theme.textLight,
              borderColor: promoTab === tab.id ? theme.text : 'transparent',
              fontWeight: promoTab === tab.id ? 500 : 400,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="border-b flex flex-wrap items-center gap-6" style={{ borderColor: theme.border }}>
        {SOURCE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSourceTab(tab.id)}
            className="pb-3 text-sm border-b-2 -mb-px transition-colors"
            style={{
              color: sourceTab === tab.id ? theme.text : theme.textLight,
              borderColor: sourceTab === tab.id ? theme.text : 'transparent',
              fontWeight: sourceTab === tab.id ? 500 : 400,
            }}
          >
            {tab.label}
            {tab.id === 'all' && stats.total > 0 && (
              <span className="ml-1.5 text-xs tabular-nums" style={{ color: theme.textLight }}>{stats.total}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2" style={{ color: theme.textLight }}>
          <CircleNotch size={22} className="animate-spin" />
          Loading contacts…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-sm" style={{ color: theme.textLight }}>
          No contacts match this filter.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden" style={{ borderColor: theme.border }}>
          <div className="hidden md:grid grid-cols-[36px_1.3fr_1fr_64px_88px_100px_120px_130px] gap-2 px-4 py-2.5 text-xs border-b"
            style={{ borderColor: theme.border, color: theme.textLight, backgroundColor: `${theme.text}04` }}
          >
            <div>
              <SelectCheckbox
                checked={paginated.length > 0 && paginated.every((c) => checkedEmails.has(c.email))}
                onClick={toggleAllVisible}
                theme={theme}
              />
            </div>
            <div>Email</div>
            <div>Name</div>
            <div className="text-right">Orders</div>
            <div className="text-right">Spent</div>
            <div>Last order</div>
            <div>Promo status</div>
            <div>Actions</div>
          </div>

          <div className="divide-y" style={{ borderColor: theme.border }}>
            {paginated.map((contact) => (
              <div
                key={contact.email}
                className="flex flex-col md:grid md:grid-cols-[36px_1.3fr_1fr_64px_88px_100px_120px_130px] gap-2 px-4 py-3 md:items-center hover:bg-black/[0.02] transition-colors"
              >
                <div className="flex items-center gap-2 md:block">
                  <SelectCheckbox
                    checked={checkedEmails.has(contact.email)}
                    onClick={() => toggleCheck(contact.email)}
                    theme={theme}
                  />
                  <span className="md:hidden text-xs font-medium truncate" style={{ color: theme.text }}>
                    {contact.displayEmail || contact.email}
                  </span>
                </div>
                <div className="hidden md:block min-w-0">
                  <a
                    href={gmailComposeUrl({ to: contact.displayEmail || contact.email })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium truncate hover:underline block"
                    style={{ color: theme.primary }}
                  >
                    {contact.displayEmail || contact.email}
                  </a>
                </div>
                <div className="text-sm truncate" style={{ color: theme.text }}>
                  {contact.name || '—'}
                </div>
                <div className="text-sm tabular-nums md:text-right" style={{ color: theme.text }}>
                  <span className="md:hidden text-xs mr-1" style={{ color: theme.textLight }}>Orders:</span>
                  {contact.orderCount}
                </div>
                <div className="text-sm tabular-nums md:text-right font-medium" style={{ color: theme.text }}>
                  <span className="md:hidden text-xs mr-1 font-normal" style={{ color: theme.textLight }}>Spent:</span>
                  {formatMoney(contact.totalSpentCents)}
                </div>
                <div className="text-xs" style={{ color: theme.textLight }}>
                  <span className="md:hidden mr-1">Last:</span>
                  {formatDate(contact.lastOrderAt)}
                </div>
                <div className="flex flex-col gap-0.5 items-start">
                  <span
                    className="inline-block px-2 py-0.5 text-[10px] rounded-full font-medium"
                    style={promoBadgeStyle(contact.promoStatus)}
                  >
                    {PROMO_STATUS_LABELS[contact.promoStatus] || contact.promoStatus}
                  </span>
                  {optOutDetail(contact) && (
                    <span className="text-[10px] leading-tight max-w-[140px]" style={{ color: theme.textLight }}>
                      {optOutDetail(contact)}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {contact.promoStatus !== 'opted_out' ? (
                    <button
                      type="button"
                      disabled={updatingEmail === contact.email}
                      onClick={() => updatePromoOptIn(contact, false)}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded border disabled:opacity-50"
                      style={{ borderColor: theme.border, color: '#8B5A42' }}
                    >
                      {updatingEmail === contact.email ? <CircleNotch size={12} className="animate-spin" /> : <Prohibit size={12} />}
                      Opt out
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={updatingEmail === contact.email}
                      onClick={() => updatePromoOptIn(contact, true)}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded border disabled:opacity-50"
                      style={{ borderColor: theme.border, color: theme.primary }}
                    >
                      {updatingEmail === contact.email ? <CircleNotch size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                      Resubscribe
                    </button>
                  )}
                </div>
                <div className="md:col-span-8 flex gap-2 pt-1 md:pt-0 md:hidden">
                  <a
                    href={gmailComposeUrl({ to: contact.displayEmail || contact.email })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold"
                    style={{ color: theme.primary }}
                  >
                    <EnvelopeSimple size={14} />
                    Email in Gmail
                  </a>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t text-xs" style={{ borderColor: theme.border, color: theme.textLight }}>
              <span>
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 rounded border disabled:opacity-40"
                  style={{ borderColor: theme.border, color: theme.text }}
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1 rounded border disabled:opacity-40"
                  style={{ borderColor: theme.border, color: theme.text }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
