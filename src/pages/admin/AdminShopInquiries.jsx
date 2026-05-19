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
import { db } from '../../config/firebase';
import { themes } from '../../theme/themes';
import { Loader, RefreshCw, Mail, Save } from 'lucide-react';
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
  'Email the customer (opens Gmail as contact@) ? click Mark contacted',
  'Move through In progress or Waiting on customer',
  'Set Completed or Closed when done',
];

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
    setSaving(true);
    try {
      const patch = {
        status,
        adminNotes: draftNotes.trim(),
        updatedAt: serverTimestamp(),
      };
      if (markContacted || status === 'contacted') {
        patch.lastContactedAt = serverTimestamp();
      }
      await updateDoc(doc(db, 'inquiries', selected.id), patch);
      if (statusOverride) setDraftStatus(status);
      patchLocal(selected.id, {
        status,
        adminNotes: draftNotes.trim(),
        ...(markContacted || status === 'contacted' ? { lastContactedAt: new Date() } : {}),
      });
      window.dispatchEvent(
        new CustomEvent('tpp:toast', {
          detail: { type: 'success', message: 'Inquiry updated' },
        })
      );
    } catch (err) {
      console.error(err);
      window.dispatchEvent(
        new CustomEvent('tpp:toast', {
          detail: { type: 'error', message: `Save failed: ${err.message}` },
        })
      );
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
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
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
        className="mb-4 p-4 rounded-xl border text-xs leading-relaxed"
        style={{ borderColor: theme.border, backgroundColor: `${theme.primary}08`, color: theme.textLight }}
      >
        <p className="font-bold uppercase tracking-wide text-[10px] mb-2" style={{ color: theme.text }}>
          How to work inquiries
        </p>
        <ol className="list-decimal list-inside space-y-1">
          {WORKFLOW_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p className="mt-2 text-[11px] italic">
          You also get an email alert with a link here ? use admin as your source of truth for status.
        </p>
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
          <Loader size={28} className="animate-spin" style={{ color: theme.primary }} />
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
                  {inq.name || inq.groupName || '?'}
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
                  <p className="text-lg font-bold" style={{ color: theme.text }}>
                    {selected.name || selected.groupName || '?'}
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
                    <Mail size={14} />
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
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => saveInquiry()}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide text-white disabled:opacity-50"
                      style={{ backgroundColor: theme.primary }}
                    >
                      <Save size={14} />
                      {saving ? 'Saving?' : 'Save'}
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => saveInquiry({ markContacted: true, statusOverride: 'contacted' })}
                      className="px-4 py-2 rounded-lg border text-xs font-bold uppercase tracking-wide disabled:opacity-50"
                      style={{ borderColor: theme.border, color: theme.text }}
                    >
                      Mark contacted
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
