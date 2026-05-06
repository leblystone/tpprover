import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Edit3, Trash2, X, ExternalLink, ChevronDown,
  Sparkles, Clipboard,
} from 'lucide-react';
import { BookOpen, FileText, LinkSimple, Microphone } from '@phosphor-icons/react';
import BottomSheet from '../common/BottomSheet';

/** Phosphor duotone back paths default to opacity 0.2 — lift slightly so two-tone shows on light UI. */
const PHOSPHOR_DUOTONE_VISIBLE = '[&>path:first-of-type]:opacity-[0.42]';
import { prepareItemForSave } from '../../utils/userDataSave';
import { recordDeletion } from '../../utils/deletionTracking';

const MAX_VOICE_SECONDS = 90;
const NOTE_KIND = { TEXT: 'text', LINK: 'link', VOICE: 'voice' };

function NoteKindIcon({ kind, size, color }) {
  if (kind === NOTE_KIND.TEXT) {
    return <FileText size={size} weight="duotone" color={color} className={PHOSPHOR_DUOTONE_VISIBLE} />;
  }
  if (kind === NOTE_KIND.LINK) {
    return <LinkSimple size={size} weight="duotone" color={color} className={PHOSPHOR_DUOTONE_VISIBLE} />;
  }
  return <Microphone size={size} weight="duotone" color={color} className={PHOSPHOR_DUOTONE_VISIBLE} />;
}

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

/** Cycle note cards through 4 clearly distinct tiers of the user's primary color */
function getKeepTileStyle(idx, theme) {
  const isDark = theme?.isDark;
  const p = theme?.primary || '#6BA3C8';
  const tier = idx % 4;

  if (isDark) {
    const alphas  = [0.12, 0.22, 0.34, 0.48];
    const borders = [0.18, 0.28, 0.4,  0.55];
    return {
      backgroundColor: withAlpha(p, alphas[tier]),
      borderColor: withAlpha(p, borders[tier]),
    };
  }

  // Light: pale tint → light sage → medium sage → clearly pigmented
  const alphas  = [0.12, 0.24, 0.38, 0.52];
  const borders = [0.16, 0.28, 0.42, 0.58];
  return {
    backgroundColor: withAlpha(p, alphas[tier]),
    borderColor: withAlpha(p, borders[tier]),
  };
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

/* ─── ComposerShell lives OUTSIDE NotesModal so its identity is stable ───
   Defining it inside would cause React to remount it (and all children,
   including <input>s) on every state change → inputs lose focus. */
const ComposerShell = ({ theme, title, children, onSave, onCancel, saveDisabled, saveLabel = 'Save', error }) => (
  <motion.div
    initial={{ opacity: 0, y: 18, scale: 0.97 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: 12, scale: 0.97 }}
    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
    className="p-4 rounded-2xl space-y-3 border"
    style={{
      backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.82)',
      borderColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)',
      backdropFilter: 'blur(18px)',
      WebkitBackdropFilter: 'blur(18px)',
      boxShadow: theme.isDark
        ? '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)'
        : '0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)',
    }}
  >
    <div className="flex items-center justify-between">
      <span className="text-sm font-bold tracking-tight" style={{ color: theme.text }}>{title}</span>
      <motion.button
        type="button"
        onClick={onCancel}
        whileTap={{ scale: 0.88 }}
        className="w-7 h-7 flex items-center justify-center rounded-full"
        style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', color: theme.textLight }}
      >
        <X size={14} strokeWidth={2.5} />
      </motion.button>
    </div>
    {children}
    <AnimatePresence>
      {error ? (
        <motion.p
          key="err"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="text-xs font-medium overflow-hidden"
          style={{ color: theme.error || '#dc2626' }}
        >
          {error}
        </motion.p>
      ) : null}
    </AnimatePresence>
    <div className="flex gap-2 pt-1">
      <motion.button
        type="button" onClick={onCancel}
        whileTap={{ scale: 0.96 }}
        className="flex-1 py-2.5 text-sm font-medium"
        style={{ color: theme.textLight, background: 'none' }}
      >
        Cancel
      </motion.button>
      <motion.button
        type="button" onClick={onSave}
        disabled={saveDisabled}
        whileTap={saveDisabled ? {} : { scale: 0.96 }}
        className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-35"
        style={{
          backgroundColor: theme.primary,
          color: theme.textOnPrimary || '#fff',
          boxShadow: saveDisabled ? 'none' : `inset 0 1px 3px rgba(255,255,255,0.25), inset 0 -2px 4px rgba(0,0,0,0.18)`,
        }}
      >
        {saveLabel}
      </motion.button>
    </div>
  </motion.div>
);

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
  const audioUploadRef = useRef(null);
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

  const handleAudioUpload = (e) => {
    const file = e.target.files?.[0];
    if (!audioUploadRef.current) return;
    audioUploadRef.current.value = '';
    if (!file) return;
    if (file.size > 2_000_000) {
      setComposeError('File is too large (max ~2 MB). Try a shorter clip.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setDraft((d) => ({
        ...d,
        audioDataUrl: ev.target.result,
        audioMimeType: file.type || 'audio/mpeg',
        durationSec: 0,
        title: d.title || file.name.replace(/\.[^.]+$/, ''),
      }));
      setComposeError('');
    };
    reader.readAsDataURL(file);
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

  // ComposerShell is defined outside this component (above) to keep a stable identity.

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
              backgroundColor: theme.isDark ? (theme.cardBackground || 'rgba(255,255,255,0.07)') : (theme.cardBackground || '#ffffff'),
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
          theme={theme} onCancel={cancelCompose} error={composeError}
          title="New note"
          saveLabel="Save note"
          saveDisabled={!draft.title.trim() && !draft.content.trim()}
          onSave={saveTextNote}
        >
          <input
            type="text"
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            placeholder="Research Note Title"
            className="w-full px-3 py-2.5 rounded-xl text-sm"
            style={inputStyle}
          />
          <textarea
            value={draft.content}
            onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
            placeholder="Tell me about your research..."
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
          theme={theme} onCancel={cancelCompose} error={composeError}
          title="Save a link"
          saveLabel="Save link"
          saveDisabled={!parseUrlSafe(draft.linkUrl)}
          onSave={saveLinkNote}
        >
          <div
            className="flex items-center gap-0 rounded-xl overflow-hidden"
            style={{
              border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
              backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
            }}
          >
            <input
              type="url"
              value={draft.linkUrl}
              onChange={(e) => setDraft((d) => ({ ...d, linkUrl: e.target.value }))}
              placeholder="https://…"
              className="flex-1 min-w-0 px-3 py-2.5 text-sm bg-transparent outline-none"
              style={{ color: draft.linkUrl ? theme.text : theme.textLight }}
              inputMode="url"
              autoCapitalize="off"
            />
            <motion.button
              type="button"
              whileTap={{ scale: 0.93 }}
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  if (text?.trim()) {
                    setDraft((d) => ({ ...d, linkUrl: text.trim() }));
                    setComposeError('');
                  }
                } catch {
                  setComposeError('Clipboard access denied — paste manually.');
                }
              }}
              className="flex items-center gap-1 px-3 py-2.5 text-[11px] font-semibold shrink-0 border-l"
              style={{
                backgroundColor: withAlpha(theme.primary, theme.isDark ? 0.12 : 0.07),
                color: theme.primary,
                borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
              }}
            >
              <Clipboard size={11} strokeWidth={2} />
              Paste
            </motion.button>
          </div>
          <input
            type="text"
            value={draft.linkTitle}
            onChange={(e) => setDraft((d) => ({ ...d, linkTitle: e.target.value }))}
            placeholder="Link Title"
            className="w-full px-3 py-2.5 rounded-xl text-sm"
            style={inputStyle}
          />
          <textarea
            value={draft.content}
            onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
            placeholder="What's this link?"
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
        theme={theme} onCancel={cancelCompose} error={composeError}
        title="Voice memo"
        saveLabel="Save memo"
        saveDisabled={!draft.audioDataUrl}
        onSave={saveVoiceNote}
      >
        <div
          className="flex flex-col items-center gap-4 rounded-2xl py-6 px-3"
          style={{
            background: theme.isDark
              ? `linear-gradient(145deg, rgba(255,255,255,0.04), rgba(0,0,0,0.15))`
              : `linear-gradient(145deg, rgba(255,255,255,0.9), rgba(0,0,0,0.02))`,
            border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
          }}
        >
          <AnimatePresence mode="wait">
            {recActive ? (
              <motion.div
                key="recording"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                className="flex flex-col items-center gap-3"
              >
                {/* Pulsing rings — each starts at its natural size and expands outward */}
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <motion.span
                    animate={{ scale: [1, 2.1], opacity: [0.45, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
                    className="absolute inset-0 rounded-full"
                    style={{ backgroundColor: withAlpha(theme.error || '#dc2626', 0.4), willChange: 'transform, opacity' }}
                  />
                  <motion.span
                    animate={{ scale: [1, 1.7], opacity: [0.35, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut', delay: 0.4 }}
                    className="absolute inset-0 rounded-full"
                    style={{ backgroundColor: withAlpha(theme.error || '#dc2626', 0.3), willChange: 'transform, opacity' }}
                  />
                  <div
                    className="relative w-14 h-14 rounded-full flex items-center justify-center z-10"
                    style={{ backgroundColor: theme.error || '#dc2626', boxShadow: `0 4px 20px ${withAlpha(theme.error || '#dc2626', 0.55)}` }}
                  >
                    <Microphone size={22} weight="duotone" color="#fff" className={PHOSPHOR_DUOTONE_VISIBLE} />
                  </div>
                </div>
                <motion.div
                  key={recSec}
                  initial={{ scale: 1.15, opacity: 0.7 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-3xl font-mono tabular-nums font-bold tracking-tight"
                  style={{ color: theme.text }}
                >
                  {String(Math.floor(recSec / 60)).padStart(2, '0')}:{String(recSec % 60).padStart(2, '0')}
                </motion.div>
                <p className="text-[11px] font-medium" style={{ color: theme.textLight }}>
                  Recording • max {MAX_VOICE_SECONDS}s
                </p>
                <motion.button
                  type="button"
                  onClick={finishVoiceRecording}
                  whileTap={{ scale: 0.93 }}
                  className="px-6 py-2.5 rounded-full text-sm font-bold text-white"
                  style={{
                    backgroundColor: theme.error || '#dc2626',
                    boxShadow: `0 4px 14px ${withAlpha(theme.error || '#dc2626', 0.4)}`,
                  }}
                >
                  Stop Recording
                </motion.button>
              </motion.div>
            ) : draft.audioDataUrl ? (
              <motion.div
                key="recorded"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full flex flex-col items-center gap-3"
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: withAlpha(theme.primary, 0.15),
                    border: `1px solid ${withAlpha(theme.primary, 0.25)}`,
                  }}
                >
                  <Microphone size={20} weight="duotone" color={theme.primary} className={PHOSPHOR_DUOTONE_VISIBLE} />
                </div>
                <p className="text-xs font-semibold" style={{ color: theme.textLight }}>Memo recorded ✓</p>
                <audio controls src={draft.audioDataUrl} className="w-full" style={{ maxHeight: 32 }} />
                <motion.button
                  type="button"
                  onClick={() => { setDraft((d) => ({ ...d, audioDataUrl: '', audioMimeType: '', durationSec: 0 })); setRecSec(0); }}
                  whileTap={{ scale: 0.93 }}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full"
                  style={{
                    color: theme.textLight,
                    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
                  }}
                >
                  Re-record
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center gap-4 w-full"
              >
                <motion.button
                  type="button"
                  onClick={startVoice}
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.93 }}
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{
                    background: `linear-gradient(145deg, ${theme.primary}, ${withAlpha(theme.primary, 0.75)})`,
                    boxShadow: `0 8px 24px ${withAlpha(theme.primary, 0.45)}, inset 0 1px 0 rgba(255,255,255,0.2)`,
                  }}
                >
                  <Microphone size={26} weight="duotone" color="#fff" className={PHOSPHOR_DUOTONE_VISIBLE} />
                </motion.button>
                <p className="text-xs font-semibold" style={{ color: theme.textLight }}>Tap to record</p>

                <div className="flex items-center gap-2 w-full px-2">
                  <div className="flex-1 h-px" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }} />
                  <span className="text-[11px] font-semibold" style={{ color: theme.textLight }}>or</span>
                  <div className="flex-1 h-px" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }} />
                </div>

                <input
                  ref={audioUploadRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={handleAudioUpload}
                />
                <motion.button
                  type="button"
                  onClick={() => audioUploadRef.current?.click()}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold w-full justify-center"
                  style={{
                    backgroundColor: withAlpha(theme.primary, theme.isDark ? 0.14 : 0.08),
                    border: `1px solid ${withAlpha(theme.primary, 0.2)}`,
                    color: theme.primary,
                  }}
                >
                  <ExternalLink size={14} strokeWidth={2} />
                  Upload audio file
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <input
          type="text"
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          placeholder="Memo Title"
          className="w-full px-3 py-2.5 rounded-xl text-sm"
          style={inputStyle}
        />
        <textarea
          value={draft.content}
          onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
          placeholder="What's this voice memo?"
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
          theme={theme} onCancel={() => setEditingNote(null)} error={composeError}
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
          theme={theme} onCancel={() => setEditingNote(null)} error={composeError}
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
        theme={theme} onCancel={() => setEditingNote(null)} error={composeError}
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
          color: theme.textOnPrimary || '#fff',
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
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -8 }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="fixed z-[99999] min-w-[12rem] rounded-2xl border py-1.5 overflow-hidden"
          style={{
            top: menuPos.top,
            right: menuPos.right,
            backgroundColor: theme.isDark ? 'rgba(24,26,30,0.96)' : 'rgba(255,255,255,0.96)',
            borderColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)',
            boxShadow: theme.isDark
              ? '0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.07)'
              : '0 20px 52px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.04)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            transformOrigin: 'top right',
          }}
        >
          {[
            { k: NOTE_KIND.TEXT, label: 'Text note' },
            { k: NOTE_KIND.LINK, label: 'Save a link' },
            { k: NOTE_KIND.VOICE, label: 'Voice memo' },
          ].map(({ k, label }, i) => (
            <motion.button
              key={k}
              type="button"
              onClick={() => openComposer(k)}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              whileTap={{ scale: 0.97 }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-semibold"
              style={{ color: theme.text }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: `linear-gradient(145deg, ${withAlpha(theme.primary, 0.2)}, ${withAlpha(theme.primary, 0.08)})`,
                  border: `1px solid ${withAlpha(theme.primary, 0.18)}`,
                }}
              >
                <NoteKindIcon kind={k} size={15} color={theme.primary} />
              </span>
              {label}
            </motion.button>
          ))}
        </motion.div>,
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
      title={<>Research Notes <BookOpen size={24} weight="duotone" color={theme.primary} className={PHOSPHOR_DUOTONE_VISIBLE} style={{ opacity: 0.8, display: 'inline', verticalAlign: 'middle', marginLeft: 2 }} /></>}
      titleExtra={showGrid && userNotes.length > 0 ? (
        <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{
          backgroundColor: withAlpha(theme.primary, theme.isDark ? 0.18 : 0.1),
          color: theme.primary,
        }}>
          {userNotes.length} {userNotes.length === 1 ? 'item' : 'items'}
        </span>
      ) : undefined}
      theme={theme}
      maxHeight="90vh"
    >
      <div className="space-y-3 pb-4 px-0.5" style={{ backgroundColor: shelfBg }}>

        {composeKind && renderComposer()}
        {editingNote && !composeKind && renderEditor()}

        {showGrid && (
          <>

            {userNotes.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="relative flex flex-col items-center justify-center py-10 px-4 text-center overflow-hidden"
              >
                {/* Background orbs */}
                <motion.div
                  animate={{ scale: [1, 1.15, 1], opacity: [0.18, 0.28, 0.18] }}
                  transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute top-0 left-1/4 w-32 h-32 rounded-full pointer-events-none"
                  style={{ background: `radial-gradient(circle, ${withAlpha(theme.primary, 0.55)} 0%, transparent 70%)`, filter: 'blur(20px)' }}
                />
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.12, 0.22, 0.12] }}
                  transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                  className="absolute bottom-2 right-1/4 w-28 h-28 rounded-full pointer-events-none"
                  style={{ background: `radial-gradient(circle, ${withAlpha(theme.accent || theme.primary, 0.5)} 0%, transparent 70%)`, filter: 'blur(18px)' }}
                />

                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18 }}
                  className="text-base font-bold mb-1.5 tracking-tight"
                  style={{ color: theme.text }}
                >
                  Your research vault
                </motion.p>
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.24 }}
                  className="text-xs mb-8 max-w-[210px] leading-relaxed"
                  style={{ color: theme.textLight }}
                >
                  Capture notes, save links, or record voice memos — all in one place.
                </motion.p>

                <div className="flex items-center justify-center gap-4">
                  {[
                    { k: NOTE_KIND.TEXT, label: 'Note' },
                    { k: NOTE_KIND.LINK, label: 'Link' },
                    { k: NOTE_KIND.VOICE, label: 'Voice' },
                  ].map(({ k, label }, i) => (
                    <motion.button
                      key={k}
                      type="button"
                      onClick={() => openComposer(k)}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.08, type: 'spring', stiffness: 340, damping: 26 }}
                      whileHover={{ scale: 1.07, y: -3 }}
                      whileTap={{ scale: 0.93 }}
                      className="flex flex-col items-center gap-2.5"
                    >
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center"
                        style={{
                          background: theme.isDark
                            ? `linear-gradient(145deg, ${withAlpha(theme.primary, 0.22)}, ${withAlpha(theme.primary, 0.1)})`
                            : `linear-gradient(145deg, ${withAlpha(theme.primary, 0.15)}, ${withAlpha(theme.primary, 0.06)})`,
                          border: `1px solid ${withAlpha(theme.primary, theme.isDark ? 0.28 : 0.2)}`,
                          backdropFilter: 'blur(10px)',
                          WebkitBackdropFilter: 'blur(10px)',
                          boxShadow: `0 6px 20px ${withAlpha(theme.primary, 0.2)}, inset 0 1px 0 ${withAlpha('#fff', 0.15)}`,
                        }}
                      >
                        <NoteKindIcon kind={k} size={26} color={theme.primary} />
                      </div>
                      <span className="text-xs font-semibold" style={{ color: theme.textLight }}>{label}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <>
                {/* Quick-add bar — compact row, always visible when notes exist */}
                <div className="flex items-center justify-center gap-2 px-1 py-1 mb-3">
                  {[
                    { k: NOTE_KIND.TEXT, label: 'Note' },
                    { k: NOTE_KIND.LINK, label: 'Link' },
                    { k: NOTE_KIND.VOICE, label: 'Voice' },
                  ].map(({ k, label }) => (
                    <motion.button
                      key={k}
                      type="button"
                      onClick={() => openComposer(k)}
                      whileHover={{ scale: 1.05, y: -1 }}
                      whileTap={{ scale: 0.93 }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl flex-1 justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${theme.primary}, ${withAlpha(theme.primary, 0.78)})`,
                        boxShadow: `inset 0 1px 3px rgba(255,255,255,0.28), inset 0 -2px 4px rgba(0,0,0,0.2)`,
                        color: theme.textOnPrimary || '#fff',
                      }}
                    >
                      <NoteKindIcon kind={k} size={13} color={theme.textOnPrimary || '#fff'} />
                      <span className="text-[11px] font-bold tracking-wide" style={{ color: theme.textOnPrimary || '#fff' }}>{label}</span>
                    </motion.button>
                  ))}
                </div>

                <div
                  className="columns-2 gap-3 [column-fill:_balance] px-0.5"
                  style={{ columnGap: '0.75rem' }}
                >
                {userNotes.map((note, idx) => {
                  const isDeleting = confirmDeleteId === note.id;
                  const kind = normalizeNoteKind(note);
                  const tile = getKeepTileStyle(idx, theme);
                  const href = kind === NOTE_KIND.LINK ? (parseUrlSafe(note.linkUrl)?.href || note.linkUrl) : null;

                  const kindMeta = {
                    [NOTE_KIND.TEXT]: { label: 'Note' },
                    [NOTE_KIND.LINK]: { label: 'Link' },
                    [NOTE_KIND.VOICE]: { label: 'Voice' },
                  }[kind];

                  return (
                    <motion.div
                      key={note.id}
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 28, delay: idx * 0.04 }}
                      className="break-inside-avoid mb-3"
                    >
                      <motion.div
                        whileHover={{ y: -3, boxShadow: theme.isDark ? '0 12px 32px rgba(0,0,0,0.45)' : '0 12px 28px rgba(0,0,0,0.12)' }}
                        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                        className="rounded-2xl border p-3 text-left relative"
                        style={{
                          background: theme.isDark
                            ? `linear-gradient(145deg, ${tile.backgroundColor} 0%, ${withAlpha(theme.primary, 0.06)} 100%)`
                            : `linear-gradient(160deg, rgba(255,255,255,0.72) 0%, ${tile.backgroundColor} 100%)`,
                          borderColor: tile.borderColor,
                          backdropFilter: 'blur(14px)',
                          WebkitBackdropFilter: 'blur(14px)',
                          boxShadow: theme.isDark
                            ? `0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.07)`
                            : `0 4px 14px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.9)`,
                        }}
                      >
                        {/* Kind badge */}
                        <div className="flex items-center justify-between gap-1 mb-2">
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: withAlpha(theme.primary, theme.isDark ? 0.22 : 0.12),
                              color: theme.primary,
                            }}
                          >
                            <NoteKindIcon kind={kind} size={9} color={theme.primary} />
                            {kindMeta.label.toUpperCase()}
                          </span>
                          <div className="flex gap-0.5 shrink-0">
                            <motion.button
                              type="button"
                              onClick={() => openEdit(note)}
                              whileTap={{ scale: 0.85 }}
                              className="w-6 h-6 flex items-center justify-center rounded-full"
                              style={{ color: theme.textLight, backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
                              title="Edit"
                            >
                              <Edit3 size={11} strokeWidth={2.2} />
                            </motion.button>
                            <motion.button
                              type="button"
                              onClick={() => setConfirmDeleteId(isDeleting ? null : note.id)}
                              whileTap={{ scale: 0.85 }}
                              className="w-6 h-6 flex items-center justify-center rounded-full"
                              style={{
                                color: isDeleting ? (theme.error || '#dc2626') : theme.textLight,
                                backgroundColor: isDeleting
                                  ? withAlpha(theme.error || '#dc2626', 0.12)
                                  : theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                              }}
                              title="Delete"
                            >
                              <Trash2 size={11} strokeWidth={2.2} />
                            </motion.button>
                          </div>
                        </div>

                        <span className="text-sm font-semibold leading-snug line-clamp-2 block mb-1.5" style={{ color: theme.text }}>
                          {displayTitle(note)}
                        </span>

                        {kind === NOTE_KIND.LINK && href && (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold mb-2 break-all rounded-md px-2 py-1"
                            style={{
                              color: theme.primary,
                              backgroundColor: withAlpha(theme.primary, 0.1),
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {href.replace(/^https?:\/\//, '').slice(0, 40)}
                            {(href.replace(/^https?:\/\//, '').length > 40) ? '…' : ''}
                            <ExternalLink size={10} className="shrink-0 opacity-80" />
                          </a>
                        )}

                        {kind === NOTE_KIND.VOICE && note.audioDataUrl && (
                          <audio
                            controls
                            src={note.audioDataUrl}
                            className="w-full mb-2"
                            style={{ maxHeight: 32 }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}

                        {note.content ? (
                          <p className="text-xs leading-relaxed line-clamp-5 whitespace-pre-wrap mb-2" style={{ color: theme.text, opacity: 0.8 }}>
                            {note.content}
                          </p>
                        ) : null}

                        {note.protocolName && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full mb-1"
                            style={{
                              backgroundColor: withAlpha(theme.accent || theme.primary, theme.isDark ? 0.2 : 0.1),
                              color: theme.accent || theme.primary,
                            }}
                          >
                            <Sparkles size={8} strokeWidth={2.5} />
                            {note.protocolName}
                          </span>
                        )}

                        <p className="text-[10px] font-medium mt-1.5" style={{ color: theme.textLight, opacity: 0.7 }}>
                          {formatDateShort(note.createdAt)}
                        </p>

                        <AnimatePresence>
                          {isDeleting && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.18 }}
                              className="mt-2 pt-2 flex items-center justify-between gap-2 overflow-hidden"
                              style={{ borderTop: `1px solid ${CARD_BORDER(theme.isDark)}` }}
                            >
                              <span className="text-[11px] font-medium" style={{ color: theme.textLight }}>Remove this?</span>
                              <div className="flex gap-1.5">
                                <motion.button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  whileTap={{ scale: 0.93 }}
                                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
                                  style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: theme.text }}
                                >
                                  Cancel
                                </motion.button>
                                <motion.button
                                  type="button"
                                  onClick={() => handleDelete(note.id)}
                                  whileTap={{ scale: 0.93 }}
                                  className="px-2.5 py-1 rounded-full text-[11px] font-bold text-white"
                                  style={{ backgroundColor: theme.error || '#dc2626' }}
                                >
                                  Delete
                                </motion.button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    </motion.div>
                  );
                })}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </BottomSheet>
  );
};

export default NotesModal;
