import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  Plus, Edit3, Trash2, X, Link2, Mic, FileText, ExternalLink, ChevronDown,
} from 'lucide-react';
import BottomSheet from '../common/BottomSheet';
import { prepareItemForSave } from '../../utils/userDataSave';
import { recordDeletion } from '../../utils/deletionTracking';

const MAX_VOICE_SECONDS = 90;
const NOTE_KIND = { TEXT: 'text', LINK: 'link', VOICE: 'voice' };

function getActiveProtocols(protocols = []) {
  if (!Array.isArray(protocols) || protocols.length === 0) return [];
  const today = new Date();
  return protocols.filter(p => {
    if (p?.active !== true) return false;
    if (!p?.startDate) return false;
    const s = new Date(p.startDate);
    if (today < new Date(s.getFullYear(), s.getMonth(), s.getDate())) return false;
    if (p.endDate) {
      const e = new Date(p.endDate);
      return today <= new Date(e.getFullYear(), e.getMonth(), e.getDate());
    }
    const d = p.duration || {};
    if (d.noEnd || !d.count || !d.unit) return true;
    const e = new Date(s);
    if (String(d.unit).toLowerCase() === 'day') e.setDate(e.getDate() + Number(d.count));
    else if (String(d.unit).toLowerCase() === 'week') e.setDate(e.getDate() + Number(d.count) * 7);
    else if (String(d.unit).toLowerCase() === 'month') e.setMonth(e.getMonth() + Number(d.count));
    return today <= new Date(e.getFullYear(), e.getMonth(), e.getDate());
  });
}

function withAlpha(hex, alpha) {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return `rgba(128,128,128,${alpha})`;
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6) return `rgba(128,128,128,${alpha})`;
  const n = parseInt(h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function hashToIndex(str, mod) {
  let x = 0;
  for (let i = 0; i < str.length; i++) x = (x + str.charCodeAt(i) * (i + 1)) % 997;
  return x % mod;
}

/** Keep-style pastel tile (light) / muted wash (dark) */
function getKeepTileStyle(noteId, theme) {
  const isDark = theme?.isDark;
  const p = theme?.primary || '#6BA3C8';
  const a = theme?.accent || p;
  const i = hashToIndex(String(noteId), 5);
  if (isDark) {
    const washes = [
      withAlpha(p, 0.14), withAlpha(a, 0.12), withAlpha(p, 0.1),
      'rgba(255,255,255,0.06)', withAlpha(a, 0.08),
    ];
    return { backgroundColor: washes[i], borderColor: 'rgba(255,255,255,0.1)' };
  }
  const lights = [
    withAlpha(p, 0.12), withAlpha(a, 0.14), withAlpha(p, 0.08),
    withAlpha(a, 0.1), withAlpha(p, 0.1),
  ];
  return { backgroundColor: lights[i], borderColor: 'rgba(0,0,0,0.06)' };
}

function formatDateShort(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function normalizeNoteKind(note) {
  if (note?.noteKind === NOTE_KIND.LINK && note?.linkUrl) return NOTE_KIND.LINK;
  if (note?.noteKind === NOTE_KIND.VOICE && note?.audioDataUrl) return NOTE_KIND.VOICE;
  return NOTE_KIND.TEXT;
}

function parseUrlSafe(url) {
  try {
    const u = url.trim();
    if (!u) return null;
    const withProto = /^https?:\/\//i.test(u) ? u : `https://${u}`;
    return new URL(withProto);
  } catch {
    return null;
  }
}

function linkDisplayLine(note) {
  if (normalizeNoteKind(note) !== NOTE_KIND.LINK) return '';
  const t = (note.linkTitle || '').trim();
  if (t) return t;
  const parsed = parseUrlSafe(note.linkUrl || '');
  return parsed ? parsed.hostname.replace(/^www\./, '') : (note.linkUrl || '').slice(0, 40);
}

const CARD_BG = (isDark, cardBg) =>
  isDark ? 'rgba(255,255,255,0.06)' : (cardBg || '#ffffff');
const CARD_BORDER = (isDark) =>
  isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

const emptyDraft = () => ({
  title: '',
  content: '',
  protocolId: '',
  linkUrl: '',
  linkTitle: '',
  audioDataUrl: '',
  audioMimeType: '',
  durationSec: 0,
});

const NotesModal = ({
  isOpen, onClose, theme,
  notes: notesProp, onNotesChange,
  protocols = [],
  initialShowAddForm = false,
  openedForAddOnly = false,
}) => {
  const [userNotes, setUserNotes] = useState([]);
  const [composeKind, setComposeKind] = useState(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [draft, setDraft] = useState(emptyDraft);
  const [editingNote, setEditingNote] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [composeError, setComposeError] = useState('');
  const [recActive, setRecActive] = useState(false);
  const [recSec, setRecSec] = useState(0);
  const menuRef = useRef(null);
  const addBtnRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const tickRef = useRef(null);
  const recSecRef = useRef(0);
  /** When false, MediaRecorder onstop must not write into draft (cancel / close) */
  const voiceApplyRef = useRef(true);

  const activeProtocols = useMemo(() => getActiveProtocols(protocols), [protocols]);

  const protocolDropdownOptions = useMemo(
    () => [
      { value: '', label: 'None' },
      ...activeProtocols.map((p) => ({
        value: p.id,
        label: p.protocolName || p.name || 'Unnamed',
      })),
    ],
    [activeProtocols]
  );

  const stopRecording = useCallback((discardBlob = false) => {
    if (discardBlob) voiceApplyRef.current = false;
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    } catch { /* ignore */ }
    mediaRecorderRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setRecActive(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadNotes();
      setComposeKind(initialShowAddForm ? NOTE_KIND.TEXT : null);
      setAddMenuOpen(false);
      setDraft(emptyDraft());
      setEditingNote(null);
      setConfirmDeleteId(null);
      setComposeError('');
      stopRecording(true);
      setRecSec(0);
      recSecRef.current = 0;
    } else {
      stopRecording(true);
      setAddMenuOpen(false);
      setComposeKind(null);
    }
  }, [isOpen, initialShowAddForm, stopRecording]);

  const loadNotes = () => {
    try {
      if (Array.isArray(notesProp)) { setUserNotes(notesProp); return; }
      const raw = localStorage.getItem('tpprover_user_notes');
      const parsed = raw ? JSON.parse(raw) : [];
      setUserNotes(Array.isArray(parsed) ? parsed : []);
    } catch { setUserNotes([]); }
  };

  useEffect(() => {
    if (isOpen && notesProp != null && Array.isArray(notesProp)) setUserNotes(notesProp);
  }, [isOpen, notesProp]);

  useEffect(() => {
    const reload = () => loadNotes();
    window.addEventListener('tpp:cloud-data-loaded', reload);
    return () => window.removeEventListener('tpp:cloud-data-loaded', reload);
  }, []);

  useEffect(() => {
    if (!addMenuOpen) return;
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setAddMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
    };
  }, [addMenuOpen]);

  const saveNotes = (notes) => {
    try {
      localStorage.setItem('tpprover_user_notes', JSON.stringify(notes));
      setUserNotes(notes);
      onNotesChange?.(notes);
      window.dispatchEvent(new CustomEvent('tpp:user-notes-updated', { detail: { notes } }));
    } catch (e) {
      if (e?.name === 'QuotaExceededError' || /quota/i.test(String(e?.message))) {
        setComposeError('Storage full — shorten the voice memo or remove old notes.');
      }
    }
  };

  const cancelCompose = () => {
    stopRecording(true);
    setRecSec(0);
    recSecRef.current = 0;
    setDraft(emptyDraft());
    setComposeKind(null);
    setComposeError('');
    if (openedForAddOnly) onClose();
  };

  const startVoice = async () => {
    voiceApplyRef.current = true;
    setComposeError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setComposeError('Recording is not supported in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data?.size) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const apply = voiceApplyRef.current;
        voiceApplyRef.current = true;
        if (!apply) {
          stream.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
          return;
        }
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const dur = recSecRef.current;
          setDraft((d) => ({
            ...d,
            audioDataUrl: typeof reader.result === 'string' ? reader.result : '',
            audioMimeType: blob.type || 'audio/webm',
            durationSec: dur,
          }));
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
      mediaRecorderRef.current = mr;
      mr.start(250);
      setRecActive(true);
      setRecSec(0);
      recSecRef.current = 0;
      tickRef.current = setInterval(() => {
        setRecSec((s) => {
          const n = s + 1;
          recSecRef.current = n;
          if (n >= MAX_VOICE_SECONDS) {
            queueMicrotask(() => {
              if (mediaRecorderRef.current?.state === 'recording') {
                mediaRecorderRef.current.stop();
              }
              if (tickRef.current) {
                clearInterval(tickRef.current);
                tickRef.current = null;
              }
              setRecActive(false);
            });
            return MAX_VOICE_SECONDS;
          }
          return n;
        });
      }, 1000);
    } catch {
      setComposeError('Microphone access was denied or unavailable.');
    }
  };

  const finishVoiceRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    setRecActive(false);
  };

  const saveTextNote = () => {
    if (!draft.title.trim() && !draft.content.trim()) return;
    const protocol = activeProtocols.find((p) => p.id === draft.protocolId);
    const note = prepareItemForSave({
      noteKind: NOTE_KIND.TEXT,
      title: draft.title.trim() || 'Untitled',
      content: draft.content.trim(),
      protocolId: draft.protocolId || undefined,
      protocolName: protocol?.protocolName || undefined,
      createdAt: new Date().toISOString(),
    }, { isNew: true });
    saveNotes([note, ...userNotes]);
    cancelCompose();
  };

  const saveLinkNote = () => {
    const parsed = parseUrlSafe(draft.linkUrl);
    if (!parsed) {
      setComposeError('Enter a valid URL.');
      return;
    }
    const protocol = activeProtocols.find((p) => p.id === draft.protocolId);
    const href = parsed.href;
    const note = prepareItemForSave({
      noteKind: NOTE_KIND.LINK,
      linkUrl: href,
      linkTitle: draft.linkTitle.trim() || '',
      title: draft.linkTitle.trim() || parsed.hostname.replace(/^www\./, '') || 'Link',
      content: draft.content.trim(),
      protocolId: draft.protocolId || undefined,
      protocolName: protocol?.protocolName || undefined,
      createdAt: new Date().toISOString(),
    }, { isNew: true });
    saveNotes([note, ...userNotes]);
    cancelCompose();
  };

  const saveVoiceNote = () => {
    if (!draft.audioDataUrl) {
      setComposeError('Record a memo first.');
      return;
    }
    if (draft.audioDataUrl.length > 2_000_000) {
      setComposeError('Clip is too large for sync — try a shorter recording.');
      return;
    }
    const protocol = activeProtocols.find((p) => p.id === draft.protocolId);
    const note = prepareItemForSave({
      noteKind: NOTE_KIND.VOICE,
      title: draft.title.trim() || 'Voice memo',
      content: draft.content.trim(),
      audioDataUrl: draft.audioDataUrl,
      audioMimeType: draft.audioMimeType || 'audio/webm',
      durationSec: draft.durationSec || recSecRef.current || 0,
      protocolId: draft.protocolId || undefined,
      protocolName: protocol?.protocolName || undefined,
      createdAt: new Date().toISOString(),
    }, { isNew: true });
    saveNotes([note, ...userNotes]);
    cancelCompose();
  };

  const handleSaveEdit = () => {
    if (!editingNote) return;
    const kind = normalizeNoteKind(editingNote);
    if (kind === NOTE_KIND.LINK) {
      const parsed = parseUrlSafe(editingNote.linkUrl || '');
      if (!parsed) return;
      const protocol = activeProtocols.find((p) => p.id === editingNote.protocolId);
      const updated = userNotes.map((n) =>
        n.id === editingNote.id
          ? prepareItemForSave({
              ...editingNote,
              linkUrl: parsed.href,
              title: editingNote.linkTitle?.trim() || editingNote.title || parsed.hostname,
              protocolId: editingNote.protocolId || undefined,
              protocolName: protocol?.protocolName || editingNote.protocolName || undefined,
            })
          : n
      );
      saveNotes(updated);
      setEditingNote(null);
      return;
    }
    if (kind === NOTE_KIND.VOICE) {
      if (!editingNote.title?.trim() && !editingNote.content?.trim() && !editingNote.audioDataUrl) return;
      const protocol = activeProtocols.find((p) => p.id === editingNote.protocolId);
      const updated = userNotes.map((n) =>
        n.id === editingNote.id
          ? prepareItemForSave({
              ...editingNote,
              protocolId: editingNote.protocolId || undefined,
              protocolName: protocol?.protocolName || editingNote.protocolName || undefined,
            })
          : n
      );
      saveNotes(updated);
      setEditingNote(null);
      return;
    }
    if (!editingNote.title?.trim() && !editingNote.content?.trim()) return;
    const protocol = activeProtocols.find((p) => p.id === editingNote.protocolId);
    const updated = userNotes.map((n) =>
      n.id === editingNote.id
        ? prepareItemForSave({
            ...editingNote,
            noteKind: NOTE_KIND.TEXT,
            protocolId: editingNote.protocolId || undefined,
            protocolName: protocol?.protocolName || editingNote.protocolName || undefined,
          })
        : n
    );
    saveNotes(updated);
    setEditingNote(null);
  };

  const handleDelete = (id) => {
    const note = userNotes.find((n) => n.id === id);
    if (note) recordDeletion('userNotes', id, note);
    saveNotes(userNotes.filter((n) => n.id !== id));
    setConfirmDeleteId(null);
  };

  const openEdit = useCallback((note) => {
    setEditingNote({
      ...note,
      protocolId: note.protocolId || '',
      linkUrl: note.linkUrl || '',
      linkTitle: note.linkTitle || '',
    });
    setConfirmDeleteId(null);
  }, []);

  const displayTitle = (note) => {
    const k = normalizeNoteKind(note);
    if (k === NOTE_KIND.LINK) return linkDisplayLine(note) || 'Link';
    if (k === NOTE_KIND.VOICE) return note.title?.trim() || 'Voice memo';
    if (note.title && note.title !== 'Untitled') return note.title;
    const line = (note.content || '').trim().split('\n')[0];
    if (line) return line.length > 40 ? `${line.slice(0, 38)}…` : line;
    return 'Untitled';
  };

  const inputStyle = {
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
    border: `1px solid ${CARD_BORDER(theme.isDark)}`,
    color: theme.text,
    outline: 'none',
  };

  const shelfBg = theme.isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)';

  const openComposer = (kind) => {
    setAddMenuOpen(false);
    setDraft(emptyDraft());
    setComposeError('');
    stopRecording(true);
    setRecSec(0);
    recSecRef.current = 0;
    setComposeKind(kind);
  };

  const ComposerShell = ({ title, children, onSave, saveDisabled, saveLabel = 'Save' }) => (
    <div
      className="p-4 rounded-2xl space-y-3 border"
      style={{
        backgroundColor: CARD_BG(theme.isDark, theme.cardBackground),
        borderColor: CARD_BORDER(theme.isDark),
        boxShadow: theme.isDark ? '0 8px 32px rgba(0,0,0,0.35)' : '0 8px 32px rgba(0,0,0,0.06)',
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold" style={{ color: theme.text }}>{title}</span>
        <button type="button" onClick={cancelCompose} className="p-1 rounded-lg" style={{ color: theme.textLight }}>
          <X size={18} />
        </button>
      </div>
      {children}
      {composeError ? (
        <p className="text-xs font-medium" style={{ color: theme.error || '#dc2626' }}>{composeError}</p>
      ) : null}
      <div className="flex gap-2 pt-1">
        <button
          type="button" onClick={cancelCompose}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium"
          style={{
            backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            color: theme.text,
          }}
        >
          Cancel
        </button>
        <button
          type="button" onClick={onSave}
          disabled={saveDisabled}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40"
          style={{ backgroundColor: theme.primary, color: theme.textOnPrimary || '#fff' }}
        >
          {saveLabel}
        </button>
      </div>
    </div>
  );

  const protocolSelect = (value, onChange) =>
    activeProtocols.length > 0 ? (
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: theme.textLight }}>
          Link to protocol (optional)
        </label>
        <div className="relative">
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full appearance-none px-4 py-3 pr-10 rounded-xl text-sm font-medium focus:outline-none transition-all"
            style={{
              backgroundColor: theme.isDark ? '#1f2937' : '#ffffff',
              border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.12)' : (theme.border || 'rgba(0,0,0,0.12)')}`,
              color: value ? theme.text : theme.textLight,
              boxShadow: theme.isDark
                ? '0 2px 8px rgba(0,0,0,0.35)'
                : '0 1px 4px rgba(0,0,0,0.08)',
            }}
          >
            <option value="">None</option>
            {activeProtocols.map((p) => (
              <option key={p.id} value={p.id}>{p.protocolName || p.name || 'Unnamed'}</option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: theme.textLight }}
          />
        </div>
      </div>
    ) : null;

  const renderComposer = () => {
    if (!composeKind) return null;
    if (composeKind === NOTE_KIND.TEXT) {
      return (
        <ComposerShell
          title="New note"
          saveLabel="Save note"
          saveDisabled={!draft.title.trim() && !draft.content.trim()}
          onSave={saveTextNote}
        >
          <input
            type="text"
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            placeholder="Title (optional)"
            className="w-full px-3 py-2.5 rounded-xl text-sm"
            style={inputStyle}
          />
          <textarea
            value={draft.content}
            onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
            placeholder="Write your note…"
            rows={5}
            className="w-full px-3 py-2.5 rounded-xl text-sm resize-none"
            style={inputStyle}
          />
          {protocolSelect(draft.protocolId, (v) => setDraft((d) => ({ ...d, protocolId: v })))}
        </ComposerShell>
      );
    }
    if (composeKind === NOTE_KIND.LINK) {
      return (
        <ComposerShell
          title="Save a link"
          saveLabel="Save link"
          saveDisabled={!parseUrlSafe(draft.linkUrl)}
          onSave={saveLinkNote}
        >
          <input
            type="url"
            value={draft.linkUrl}
            onChange={(e) => setDraft((d) => ({ ...d, linkUrl: e.target.value }))}
            placeholder="https://…"
            className="w-full px-3 py-2.5 rounded-xl text-sm"
            style={inputStyle}
            inputMode="url"
            autoCapitalize="off"
          />
          <input
            type="text"
            value={draft.linkTitle}
            onChange={(e) => setDraft((d) => ({ ...d, linkTitle: e.target.value }))}
            placeholder="Title (optional)"
            className="w-full px-3 py-2.5 rounded-xl text-sm"
            style={inputStyle}
          />
          <textarea
            value={draft.content}
            onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
            placeholder="Memo (optional)"
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl text-sm resize-none"
            style={inputStyle}
          />
          {protocolSelect(draft.protocolId, (v) => setDraft((d) => ({ ...d, protocolId: v })))}
        </ComposerShell>
      );
    }
    return (
      <ComposerShell
        title="Voice memo"
        saveLabel="Save memo"
        saveDisabled={!draft.audioDataUrl}
        onSave={saveVoiceNote}
      >
        <div
          className="flex flex-col items-center gap-3 rounded-xl py-4 px-3 border"
          style={{ borderColor: CARD_BORDER(theme.isDark), backgroundColor: theme.isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)' }}
        >
          {recActive ? (
            <>
              <div className="text-2xl font-mono tabular-nums font-semibold" style={{ color: theme.primary }}>
                {String(Math.floor(recSec / 60)).padStart(2, '0')}:{String(recSec % 60).padStart(2, '0')}
              </div>
              <p className="text-xs" style={{ color: theme.textLight }}>
                Max {MAX_VOICE_SECONDS}s
              </p>
              <button
                type="button"
                onClick={finishVoiceRecording}
                className="px-5 py-2 rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: theme.error || '#dc2626' }}
              >
                Stop
              </button>
            </>
          ) : draft.audioDataUrl ? (
            <>
              <audio controls src={draft.audioDataUrl} className="w-full max-h-10" style={{ maxHeight: 36 }} />
              <button
                type="button"
                onClick={() => { setDraft((d) => ({ ...d, audioDataUrl: '', audioMimeType: '', durationSec: 0 })); setRecSec(0); }}
                className="text-xs font-semibold underline"
                style={{ color: theme.textLight }}
              >
                Re-record
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={startVoice}
              className="flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: theme.primary }}
            >
              <Mic size={18} /> Start recording
            </button>
          )}
        </div>
        <input
          type="text"
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          placeholder="Title (optional)"
          className="w-full px-3 py-2.5 rounded-xl text-sm"
          style={inputStyle}
        />
        <textarea
          value={draft.content}
          onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
          placeholder="Notes (optional)"
          rows={2}
          className="w-full px-3 py-2.5 rounded-xl text-sm resize-none"
          style={inputStyle}
        />
        {protocolSelect(draft.protocolId, (v) => setDraft((d) => ({ ...d, protocolId: v })))}
      </ComposerShell>
    );
  };

  const renderEditor = () => {
    if (!editingNote) return null;
    const kind = normalizeNoteKind(editingNote);
    if (kind === NOTE_KIND.LINK) {
      return (
        <ComposerShell
          title="Edit link"
          saveLabel="Save changes"
          saveDisabled={!parseUrlSafe(editingNote.linkUrl || '')}
          onSave={handleSaveEdit}
        >
          <input
            type="url"
            value={editingNote.linkUrl || ''}
            onChange={(e) => setEditingNote((n) => ({ ...n, linkUrl: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-xl text-sm"
            style={inputStyle}
          />
          <input
            type="text"
            value={editingNote.linkTitle || ''}
            onChange={(e) => setEditingNote((n) => ({ ...n, linkTitle: e.target.value }))}
            placeholder="Title"
            className="w-full px-3 py-2.5 rounded-xl text-sm"
            style={inputStyle}
          />
          <textarea
            value={editingNote.content || ''}
            onChange={(e) => setEditingNote((n) => ({ ...n, content: e.target.value }))}
            rows={4}
            className="w-full px-3 py-2.5 rounded-xl text-sm resize-none"
            style={inputStyle}
          />
          {protocolSelect(editingNote.protocolId, (v) => setEditingNote((n) => ({ ...n, protocolId: v })))}
        </ComposerShell>
      );
    }
    if (kind === NOTE_KIND.VOICE) {
      return (
        <ComposerShell
          title="Edit voice memo"
          saveLabel="Save changes"
          saveDisabled={!editingNote.audioDataUrl}
          onSave={handleSaveEdit}
        >
          {editingNote.audioDataUrl ? (
            <audio controls src={editingNote.audioDataUrl} className="w-full" style={{ maxHeight: 40 }} />
          ) : null}
          <input
            type="text"
            value={editingNote.title || ''}
            onChange={(e) => setEditingNote((n) => ({ ...n, title: e.target.value }))}
            placeholder="Title"
            className="w-full px-3 py-2.5 rounded-xl text-sm"
            style={inputStyle}
          />
          <textarea
            value={editingNote.content || ''}
            onChange={(e) => setEditingNote((n) => ({ ...n, content: e.target.value }))}
            rows={3}
            placeholder="Notes"
            className="w-full px-3 py-2.5 rounded-xl text-sm resize-none"
            style={inputStyle}
          />
          {protocolSelect(editingNote.protocolId, (v) => setEditingNote((n) => ({ ...n, protocolId: v })))}
        </ComposerShell>
      );
    }
    return (
      <ComposerShell
        title="Edit note"
        saveLabel="Save changes"
        saveDisabled={!editingNote.title?.trim() && !editingNote.content?.trim()}
        onSave={handleSaveEdit}
      >
        <input
          type="text"
          value={editingNote.title || ''}
          onChange={(e) => setEditingNote((n) => ({ ...n, title: e.target.value }))}
          className="w-full px-3 py-2.5 rounded-xl text-sm"
          style={inputStyle}
        />
        <textarea
          value={editingNote.content || ''}
          onChange={(e) => setEditingNote((n) => ({ ...n, content: e.target.value }))}
          rows={5}
          className="w-full px-3 py-2.5 rounded-xl text-sm resize-none"
          style={inputStyle}
        />
        {protocolSelect(editingNote.protocolId, (v) => setEditingNote((n) => ({ ...n, protocolId: v })))}
      </ComposerShell>
    );
  };

  const headerAddControl = (
    <div ref={menuRef}>
      <button
        ref={addBtnRef}
        type="button"
        onClick={() => {
          if (!addMenuOpen) {
            const rect = addBtnRef.current?.getBoundingClientRect();
            if (rect) {
              setMenuPos({
                top: rect.bottom + 8,
                right: window.innerWidth - rect.right,
              });
            }
          }
          setAddMenuOpen((o) => !o);
        }}
        className="w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-90"
        style={{
          backgroundColor: theme.primary,
          color: '#fff',
          boxShadow: `inset 0 1px 3px rgba(255,255,255,0.25), inset 0 -2px 4px rgba(0,0,0,0.18)`,
          WebkitTapHighlightColor: 'transparent',
        }}
        aria-expanded={addMenuOpen}
        aria-haspopup="true"
        aria-label="Create note options"
      >
        <Plus size={18} strokeWidth={2.5} />
      </button>

      {addMenuOpen && ReactDOM.createPortal(
        <div
          className="fixed z-[99999] min-w-[11rem] rounded-2xl border py-1.5 shadow-2xl overflow-hidden"
          style={{
            top: menuPos.top,
            right: menuPos.right,
            backgroundColor: theme.isDark ? 'rgba(30,32,36,0.98)' : '#ffffff',
            borderColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            boxShadow: theme.isDark
              ? '0 20px 60px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.06)'
              : '0 16px 48px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.04)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          {[
            { k: NOTE_KIND.TEXT, label: 'Note', Icon: FileText },
            { k: NOTE_KIND.LINK, label: 'Link', Icon: Link2 },
            { k: NOTE_KIND.VOICE, label: 'Voice memo', Icon: Mic },
          ].map(({ k, label, Icon }) => (
            <button
              key={k}
              type="button"
              onClick={() => openComposer(k)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-semibold transition-colors"
              style={{ color: theme.text }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: withAlpha(theme.primary, 0.14) }}
              >
                <Icon size={15} strokeWidth={2} style={{ color: theme.primary }} />
              </span>
              {label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );

  const showGrid = !composeKind && !editingNote;

  return (
    <BottomSheet
      open={isOpen}
      onClose={onClose}
      onBack={composeKind ? cancelCompose : editingNote ? () => setEditingNote(null) : undefined}
      title="Research Notes"
      titleExtra={showGrid ? headerAddControl : undefined}
      theme={theme}
      maxHeight="90vh"
    >
      <div className="space-y-3 pb-4 px-0.5" style={{ backgroundColor: shelfBg }}>

        {composeKind && renderComposer()}
        {editingNote && !composeKind && renderEditor()}

        {showGrid && (
          <>
            {userNotes.length > 0 && (
              <div className="flex items-center justify-between px-1 pt-0.5 pb-1">
                <span className="text-xs font-semibold" style={{ color: theme.textLight }}>
                  {userNotes.length} {userNotes.length === 1 ? 'item' : 'items'}
                </span>
              </div>
            )}

            {userNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <p className="text-sm font-medium mb-1" style={{ color: theme.text }}>Nothing here yet</p>
                <p className="text-xs mb-8 max-w-[220px] leading-relaxed" style={{ color: theme.textLight }}>
                  Capture text, save a link, or record a quick voice memo.
                </p>
                <div className="flex items-center justify-center gap-4">
                  {[
                    { k: NOTE_KIND.TEXT, label: 'Note', Icon: FileText },
                    { k: NOTE_KIND.LINK, label: 'Link', Icon: Link2 },
                    { k: NOTE_KIND.VOICE, label: 'Voice', Icon: Mic },
                  ].map(({ k, label, Icon }) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => openComposer(k)}
                      className="flex flex-col items-center gap-2.5 transition-transform active:scale-[0.96]"
                    >
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center border"
                        style={{
                          backgroundColor: withAlpha(theme.primary, theme.isDark ? 0.18 : 0.1),
                          borderColor: withAlpha(theme.primary, theme.isDark ? 0.25 : 0.18),
                          boxShadow: `0 4px 14px ${withAlpha(theme.primary, 0.18)}`,
                        }}
                      >
                        <Icon size={24} strokeWidth={1.75} style={{ color: theme.primary }} />
                      </div>
                      <span className="text-xs font-semibold" style={{ color: theme.textLight }}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div
                className="columns-2 gap-3 [column-fill:_balance] px-0.5"
                style={{ columnGap: '0.75rem' }}
              >
                {userNotes.map((note) => {
                  const isDeleting = confirmDeleteId === note.id;
                  const kind = normalizeNoteKind(note);
                  const tile = getKeepTileStyle(note.id, theme);
                  const href = kind === NOTE_KIND.LINK ? (parseUrlSafe(note.linkUrl)?.href || note.linkUrl) : null;

                  return (
                    <div key={note.id} className="break-inside-avoid mb-3">
                      <div
                        className="rounded-xl border p-3 text-left relative transition-shadow hover:shadow-md"
                        style={{
                          backgroundColor: tile.backgroundColor,
                          borderColor: tile.borderColor,
                          boxShadow: theme.isDark ? '0 2px 12px rgba(0,0,0,0.25)' : '0 2px 10px rgba(0,0,0,0.06)',
                        }}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {kind === NOTE_KIND.LINK && <Link2 size={14} style={{ color: theme.primary, flexShrink: 0 }} />}
                            {kind === NOTE_KIND.VOICE && <Mic size={14} style={{ color: theme.primary, flexShrink: 0 }} />}
                            {kind === NOTE_KIND.TEXT && <FileText size={14} style={{ color: theme.primary, opacity: 0.7, flexShrink: 0 }} />}
                            <span className="text-sm font-semibold leading-snug line-clamp-2" style={{ color: theme.text }}>
                              {displayTitle(note)}
                            </span>
                          </div>
                          <div className="flex gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => openEdit(note)}
                              className="p-1 rounded-md"
                              style={{ color: theme.textLight }}
                              title="Edit"
                            >
                              <Edit3 size={14} strokeWidth={2} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(isDeleting ? null : note.id)}
                              className="p-1 rounded-md"
                              style={{ color: isDeleting ? (theme.error || '#dc2626') : theme.textLight }}
                              title="Delete"
                            >
                              <Trash2 size={14} strokeWidth={2} />
                            </button>
                          </div>
                        </div>

                        {kind === NOTE_KIND.LINK && href && (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold mb-2 break-all"
                            style={{ color: theme.primary }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {href.replace(/^https?:\/\//, '').slice(0, 48)}
                            {(href.replace(/^https?:\/\//, '').length > 48) ? '…' : ''}
                            <ExternalLink size={12} className="shrink-0 opacity-80" />
                          </a>
                        )}

                        {kind === NOTE_KIND.VOICE && note.audioDataUrl && (
                          <audio
                            controls
                            src={note.audioDataUrl}
                            className="w-full mb-2"
                            style={{ maxHeight: 36 }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}

                        {note.content ? (
                          <p className="text-xs leading-relaxed line-clamp-6 whitespace-pre-wrap mb-2" style={{ color: theme.text, opacity: 0.88 }}>
                            {note.content}
                          </p>
                        ) : null}

                        {note.protocolName && (
                          <span
                            className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md mb-1"
                            style={{
                              backgroundColor: withAlpha(theme.primary, theme.isDark ? 0.2 : 0.12),
                              color: theme.primary,
                            }}
                          >
                            {note.protocolName}
                          </span>
                        )}

                        <p className="text-[10px] font-medium mt-1" style={{ color: theme.textLight }}>
                          {formatDateShort(note.createdAt)}
                        </p>

                        {isDeleting && (
                          <div
                            className="mt-2 pt-2 flex items-center justify-between gap-2"
                            style={{ borderTop: `1px solid ${CARD_BORDER(theme.isDark)}` }}
                          >
                            <span className="text-[11px]" style={{ color: theme.textLight }}>Delete?</span>
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 rounded-lg text-[11px] font-semibold"
                                style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: theme.text }}
                              >
                                No
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(note.id)}
                                className="px-2 py-1 rounded-lg text-[11px] font-bold text-white"
                                style={{ backgroundColor: theme.error || '#dc2626' }}
                              >
                                Yes
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </BottomSheet>
  );
};

export default NotesModal;
