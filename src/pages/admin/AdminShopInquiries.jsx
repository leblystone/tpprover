import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth, functions } from '../../config/firebase';
import { httpsCallable } from 'firebase/functions';
import { themes } from '../../theme/themes';
import { CircleNotch, ArrowsClockwise, Envelope, FloppyDisk, CaretDown } from '@phosphor-icons/react';
import CustomDropdown from '../../components/common/inputs/CustomDropdown';
import { gmailComposeUrl } from '../../utils/gmailCompose';

const theme = themes.sage;

const TYPE_LABELS = {
  'group-discount': 'Group Discount',
  custom: 'Custom Order',
  wholesale: 'Wholesale',
};

const STATUS_OPTIONS = [
  { value: 'new', label: 'New ? not reviewed' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'waiting_on_customer', label: 'Waiting on customer' },
  { value: 'completed', label: 'Completed' },
  { value: 'closed', label: 'Closed / declined' },
];

const STATUS_STYLES = {
  new: { bg: '#FEF3C7', color: '#92400E' },
  contacted: { bg: '#DBEAFE', color: '#1E40AF' },
  in_progress: { bg: '#E0E7FF', color: '#3730A3' },
  waiting_on_customer: { bg: '#FCE7F3', color: '#9D174D' },
  waiting: { bg: '#FCE7F3', color: '#9D174D' },
  completed: { bg: '#D1FAE5', color: '#065F46' },
  closed: { bg: '#F3F4F6', color: '#4B5563' },
};

const FIELD_LABELS = {
  name: 'Name',
  email: 'Email',
  plannerSize: 'Planner size',
  plannerSizeLabel: 'Size (display)',
  plannerSizeCustom: 'Custom size',
  briefDetails: 'Brief details',
  quantity: 'Quantity',
  groupName: 'Group name',
  platform: 'Platform',
  groupSize: 'Group size',
  message: 'Message',
  organization: 'Organization',
  businessName: 'Business name',
  contactName: 'Contact name',
  phone: 'Phone',
  products: 'Products',
  branding: 'Branding interest',
  newsUpdates: 'News & updates signup',
};

const HIDDEN_DETAIL_KEYS = new Set([
  'id',
  'type',
  'status',
  'source',
  'createdAt',
  'updatedAt',
  'lastContactedAt',
  'adminNotes',
  'imagePath',
  'imagePaths',
  'imageFileName',
  'imageFileNames',
  'setupFeeAck',
  'personalizationAgree',
  'adminNotifiedAt',
]);

function formatDate(ts) {
  if (!ts) return '?';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function statusLabel(status) {
  return STATUS_OPTIONS.find((o) => o.value === status)?.label || status || 'New';
}

function StatusBadge({ status }) {
  const key = status || 'new';
  const style = STATUS_STYLES[key] || STATUS_STYLES.new;
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {statusLabel(key).split('?')[0].trim()}
    </span>
  );
}

function renderFieldValue(key, val) {
  if (key === 'imageUrl' || key === 'imageUrls') {
    const urls = Array.isArray(val) ? val : val ? [val] : [];
    if (!urls.length) return '?';
    return (
      <span className="flex flex-col gap-1">
        {urls.map((url, i) => (
          <a
            key={url}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline break-all"
            style={{ color: theme.primary }}
          >
            View image {urls.length > 1 ? i + 1 : ''}
          </a>
        ))}
      </span>
    );
  }
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (Array.isArray(val)) return val.join(', ');
  return String(val ?? '?');
}

const WORKFLOW_STEPS = [
  'New submissions appear with status New',
  'Email the customer (opens Gmail as contact@) — click Mark contacted',
  'Move through In progress or Waiting on customer',
  'Use Close / decline to remove open items you will not pursue',
  'Set Completed when the order or deal is done',
];

const WORKFLOW_HELP_OPEN_KEY = 'tpp_admin_shop_inquiries_workflow_open';

export default function AdminShopInquiries() {
  const [searchParams] = useSearchParams();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('open');
  const [selected, setSelected] = useState(null);
  const [draftStatus, setDraftStatus] = useState('new');
  const [draftNotes, setDraftNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [workflowOpen, setWorkflowOpen] = useState(() => {
    try {
      const stored = localStorage.getItem(WORKFLOW_HELP_OPEN_KEY);
      return stored === null ? true : stored === '1';
    } catch {
      return true;
    }
  });

  const toggleWorkflow = () => {
    setWorkflowOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(WORKFLOW_HELP_OPEN_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const fetchInquiries = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'inquiries'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setInquiries(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Failed to load inquiries:', err);
      window.dispatchEvent(
        new CustomEvent('tpp:toast', {
          detail: { type: 'error', message: `Could not load inquiries: ${err.message}` },
        })
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  useEffect(() => {
    if (!selected) return;
    setDraftStatus(selected.status || 'new');
    setDraftNotes(selected.adminNotes || '');
  }, [selected?.id]);

  const openCount = useMemo(
    () => inquiries.filter((i) => !['completed', 'closed'].includes(i.status || 'new')).length,
    [inquiries]
  );

  const filtered = useMemo(() => {
    let list = inquiries;
    if (typeFilter !== 'all') list = list.filter((i) => i.type === typeFilter);
    if (statusFilter === 'open') {
      list = list.filter((i) => !['completed', 'closed'].includes(i.status || 'new'));
    } else if (statusFilter !== 'all') {
      list = list.filter((i) => (i.status || 'new') === statusFilter);
    }
    return list;
  }, [inquiries, typeFilter, statusFilter]);

  const selectInquiry = (inq) => {
    setSelected(inq);
    setDraftStatus(inq.status || 'new');
    setDraftNotes(inq.adminNotes || '');
    setSaveError('');
  };

  useEffect(() => {
    const inquiryId = searchParams.get('inquiry');
    if (!inquiryId || !inquiries.length) return;
    const match = inquiries.find((i) => i.id === inquiryId);
    if (match && match.id !== selected?.id) selectInquiry(match);
  }, [searchParams, inquiries, selected?.id]);

  const patchLocal = (id, patch) => {
    setInquiries((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    setSelected((prev) => (prev?.id === id ? { ...prev, ...patch } : prev));
  };

  const saveInquiry = async ({ markContacted = false, statusOverride } = {}) => {
    if (!selected) return;
    const status = statusOverride ?? draftStatus;
    const notes = draftNotes.trim();

    if (!auth.currentUser) {
      const msg = 'Not signed in — refresh the admin page and log in again.';
      setSaveError(msg);
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { type: 'error', message: msg } }));
      return;
    }

    setSaving(true);
    setSaveError('');
    try {
      const updateFn = httpsCallable(functions, 'adminUpdateShopInquiry');
      await updateFn({
        inquiryId: selected.id,
        status,
        adminNotes: notes,
        markContacted: !!markContacted,
      });

      if (statusOverride) setDraftStatus(status);
      patchLocal(selected.id, {
        status,
        adminNotes: notes,
        ...(markContacted || status === 'contacted' ? { lastContactedAt: new Date() } : {}),
      });
      const toastMsg = markContacted
        ? 'Marked as contacted'
        : status === 'closed'
          ? 'Inquiry closed / declined'
          : status === 'completed'
            ? 'Marked completed'
            : 'Inquiry saved';
      window.dispatchEvent(
        new CustomEvent('tpp:toast', {
          detail: { type: 'success', message: toastMsg },
        })
      );
    } catch (err) {
      console.error('saveInquiry:', err);
      const code = err?.code || '';
      let msg = err?.message || 'Save failed';

      if (code === 'functions/not-found' || msg.includes('not-found')) {
        try {
          const patch = {
            status,
            adminNotes: notes,
            updatedAt: serverTimestamp(),
          };
          if (markContacted || status === 'contacted') {
            patch.lastContactedAt = serverTimestamp();
          }
          await updateDoc(doc(db, 'inquiries', selected.id), patch);
          if (statusOverride) setDraftStatus(status);
          patchLocal(selected.id, {
            status,
            adminNotes: notes,
            ...(markContacted || status === 'contacted' ? { lastContactedAt: new Date() } : {}),
          });
          window.dispatchEvent(
            new CustomEvent('tpp:toast', { detail: { type: 'success', message: 'Inquiry updated' } })
          );
          return;
        } catch (fallbackErr) {
          msg = fallbackErr?.message || msg;
        }
      }

      if (code === 'functions/unauthenticated' || code === 'permission-denied') {
        msg = 'Session expired or not authorized — log out and sign in to admin again.';
      }

      setSaveError(msg);
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { type: 'error', message: msg } }));
    } finally {
      setSaving(false);
    }
  };

  const detailEntries = selected
    ? Object.entries(selected).filter(([k]) => !HIDDEN_DETAIL_KEYS.has(k))
    : [];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: theme.text }}>
            Shop Inquiries
          </h1>
          <p className="text-sm mt-1" style={{ color: theme.textLight }}>
            Track custom orders, wholesale, and group discounts ? status, notes, and who you have replied to.
          </p>
          {openCount > 0 && (
            <p className="text-xs mt-2 font-semibold" style={{ color: theme.primary }}>
              {openCount} open {openCount === 1 ? 'request' : 'requests'} need attention
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={fetchInquiries}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium"
          style={{ borderColor: theme.border, color: theme.text }}
        >
          <ArrowsClockwise size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <span className="text-[10px] font-bold uppercase tracking-wide self-center mr-1" style={{ color: theme.textLight }}>
          Type
        </span>
        {['all', 'custom', 'group-discount', 'wholesale'].map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTypeFilter(key)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide"
            style={{
              backgroundColor: typeFilter === key ? theme.primary : `${theme.text}08`,
              color: typeFilter === key ? '#fff' : theme.textLight,
            }}
          >
            {key === 'all' ? 'All' : TYPE_LABELS[key] || key}
          </button>
        ))}
      </div>

      <div
        className="mb-4 rounded-xl border text-xs leading-relaxed overflow-hidden"
        style={{ borderColor: theme.border, backgroundColor: `${theme.primary}08`, color: theme.textLight }}
      >
        <button
          type="button"
          onClick={toggleWorkflow}
          aria-expanded={workflowOpen}
          className="w-full flex items-center justify-between gap-2 p-4 text-left transition-opacity hover:opacity-90"
        >
          <span className="font-bold uppercase tracking-wide text-[10px]" style={{ color: theme.text }}>
            How to work inquiries
          </span>
          <CaretDown
            size={14}
            weight="bold"
            className={`flex-shrink-0 transition-transform duration-200 ${workflowOpen ? 'rotate-180' : ''}`}
            style={{ color: theme.textLight }}
            aria-hidden
          />
        </button>
        {workflowOpen && (
          <div className="px-4 pb-4 pt-0 border-t" style={{ borderColor: theme.border }}>
            <ol className="list-decimal list-inside space-y-1 mt-3">
              {WORKFLOW_STEPS.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className="mt-2 text-[11px] italic">
              You also get an email alert with a link here — use admin as your source of truth for status.
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <span className="text-[10px] font-bold uppercase tracking-wide self-center mr-1" style={{ color: theme.textLight }}>
          Status
        </span>
        {[
          { key: 'open', label: 'Open' },
          { key: 'all', label: 'All' },
          ...STATUS_OPTIONS.map((o) => ({ key: o.value, label: o.label.split('?')[0].trim() })),
        ].map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setStatusFilter(key)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: statusFilter === key ? theme.primary : `${theme.text}08`,
              color: statusFilter === key ? '#fff' : theme.textLight,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <CircleNotch size={28} className="animate-spin" style={{ color: theme.primary }} />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center py-16 text-sm" style={{ color: theme.textLight }}>
          No inquiries match this filter.
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2 max-h-[70vh] overflow-y-auto">
            {filtered.map((inq) => (
              <button
                key={inq.id}
                type="button"
                onClick={() => selectInquiry(inq)}
                className="w-full text-left p-4 rounded-xl border transition-all"
                style={{
                  borderColor: selected?.id === inq.id ? theme.primary : theme.border,
                  backgroundColor: theme.cardBackground,
                }}
              >
                <div className="flex justify-between items-start gap-2 mb-2">
                  <StatusBadge status={inq.status} />
                  <span className="text-xs flex-shrink-0" style={{ color: theme.textLight }}>
                    {formatDate(inq.createdAt)}
                  </span>
                </div>
                <p className="text-xs font-bold uppercase tracking-wide mb-0.5" style={{ color: theme.primary }}>
                  {TYPE_LABELS[inq.type] || inq.type}
                </p>
                <p className="text-sm font-semibold truncate" style={{ color: theme.text }}>
                  {inq.name || inq.contactName || inq.businessName || inq.groupName || '?'}
                </p>
                <p className="text-xs truncate" style={{ color: theme.textLight }}>
                  {inq.email}
                </p>
                {inq.adminNotes && (
                  <p className="text-[11px] mt-2 line-clamp-2 italic" style={{ color: theme.textLight }}>
                    Note: {inq.adminNotes}
                  </p>
                )}
              </button>
            ))}
          </div>

          <div
            className="rounded-xl border p-5 lg:sticky lg:top-4 h-fit max-h-[80vh] overflow-y-auto"
            style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}
          >
            {selected ? (
              <div className="space-y-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <StatusBadge status={draftStatus} />
                    <span className="text-xs font-bold uppercase tracking-wide" style={{ color: theme.primary }}>
                      {TYPE_LABELS[selected.type] || selected.type}
                    </span>
                  </div>
                  <p className="text-lg font-bold" style={{ color: theme.text }}>
                    {selected.name || selected.contactName || selected.businessName || selected.groupName || '?'}
                  </p>
                  <a
                    href={gmailComposeUrl({
                      to: selected.email,
                      subject: `Re: ${TYPE_LABELS[selected.type] || 'Shop'} inquiry`,
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm mt-1 underline"
                    style={{ color: theme.primary }}
                  >
                    <Envelope size={14} />
                    {selected.email}
                  </a>
                  <p className="text-xs mt-2" style={{ color: theme.textLight }}>
                    Submitted {formatDate(selected.createdAt)}
                    {selected.lastContactedAt && (
                      <> ? Last contacted {formatDate(selected.lastContactedAt)}</>
                    )}
                  </p>
                </div>

                <div className="p-4 rounded-xl border space-y-3" style={{ borderColor: theme.border }}>
                  <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: theme.textLight }}>
                    Workflow
                  </p>
                  <CustomDropdown
                    label="Status"
                    value={draftStatus}
                    onChange={setDraftStatus}
                    options={STATUS_OPTIONS}
                    placeholder="Status"
                    theme={theme}
                    outlined
                  />
                  <textarea
                    value={draftNotes}
                    onChange={(e) => setDraftNotes(e.target.value)}
                    rows={4}
                    placeholder="Internal notes ? proofs sent, invoice #, follow-up date?"
                    className="w-full px-3 py-2 rounded-lg border text-sm resize-none focus:outline-none focus:ring-2"
                    style={{ borderColor: theme.border, color: theme.text }}
                  />
                  {saveError && (
                    <p className="text-xs rounded-lg px-3 py-2" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>
                      {saveError}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => saveInquiry()}
                      className="flex items-center justify-center gap-2 min-w-[100px] px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide text-white transition-all duration-150 ease-out hover:scale-[1.02] active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100"
                      style={{
                        backgroundColor: saving ? `${theme.primary}88` : theme.primary,
                        '--tw-ring-color': theme.primary,
                      }}
                    >
                      {saving ? (
                        <CircleNotch size={14} className="animate-spin" />
                      ) : (
                        <FloppyDisk size={14} />
                      )}
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => saveInquiry({ markContacted: true, statusOverride: 'contacted' })}
                      className="px-4 py-2 rounded-lg border text-xs font-bold uppercase tracking-wide transition-all duration-150 ease-out hover:scale-[1.02] active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                      style={{ borderColor: theme.border, color: theme.text, '--tw-ring-color': theme.primary }}
                    >
                      Mark contacted
                    </button>
                    <button
                      type="button"
                      disabled={saving || draftStatus === 'closed'}
                      onClick={() => saveInquiry({ statusOverride: 'closed' })}
                      className="px-4 py-2 rounded-lg border text-xs font-bold uppercase tracking-wide transition-all duration-150 ease-out hover:scale-[1.02] active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                      style={{
                        borderColor: '#D1D5DB',
                        color: '#4B5563',
                        backgroundColor: draftStatus === 'closed' ? '#F3F4F6' : '#F9FAFB',
                        '--tw-ring-color': theme.primary,
                      }}
                      title="Close this inquiry — removes it from the Open list"
                    >
                      Close / decline
                    </button>
                  </div>
                </div>

                {(selected.setupFeeAck || selected.personalizationAgree) && (
                  <div className="text-xs space-y-1" style={{ color: theme.textLight }}>
                    {selected.setupFeeAck && <p>Setup fee agreed: Yes</p>}
                    {selected.personalizationAgree && <p>Personalization policy agreed: Yes</p>}
                  </div>
                )}

                <dl className="space-y-3 text-sm border-t pt-4" style={{ borderColor: theme.border }}>
                  <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: theme.textLight }}>
                    Submission details
                  </p>
                  {detailEntries.map(([key, val]) => (
                    <div key={key}>
                      <dt className="text-[10px] font-bold uppercase tracking-wide mb-0.5" style={{ color: theme.textLight }}>
                        {FIELD_LABELS[key] || key}
                      </dt>
                      <dd className="whitespace-pre-wrap" style={{ color: theme.text }}>
                        {renderFieldValue(key, val)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : (
              <p className="text-sm py-8 text-center" style={{ color: theme.textLight }}>
                Select an inquiry to update status and notes.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
