import React, { useRef, useState, useCallback } from 'react';
import BottomSheet from '../common/BottomSheet';
import TextInput from '../common/inputs/TextInput';
import GlassmorphismDatePicker from '../common/GlassmorphismDatePicker';
import { FilePdf, Image as ImageIcon, CheckCircle, Circle, WarningCircle, SpinnerGap } from '@phosphor-icons/react';
import { parseLabReportFile, draftToLabFields } from '../../utils/labReportOCR';
import { addLabResult } from '../../utils/labResults';

/**
 * Scan / upload lab PDF or photo → review drafts → confirm save.
 * Nothing is written until the user confirms selected rows.
 */
export default function LabScanReviewModal({ open, onClose, theme, onSaved }) {
  const fileRef = useRef(null);
  const [phase, setPhase] = useState('pick'); // pick | processing | review | error
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [source, setSource] = useState('');
  const [drafts, setDrafts] = useState([]);
  const [rawPreview, setRawPreview] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = useCallback(() => {
    setPhase('pick');
    setError('');
    setFileName('');
    setSource('');
    setDrafts([]);
    setRawPreview('');
    setSaving(false);
    if (fileRef.current) fileRef.current.value = '';
  }, []);

  const handleClose = () => {
    reset();
    onClose?.();
  };

  const runFile = async (file) => {
    if (!file) return;
    setPhase('processing');
    setError('');
    setFileName(file.name || 'report');
    try {
      const result = await parseLabReportFile(file);
      setSource(result.source || '');
      setRawPreview(result.rawPreview || '');
      setDrafts(result.drafts || []);
      if (!result.drafts?.length) {
        setError(
          result.rawPreview
            ? 'We read the file but couldn’t match curated lab markers. Try a clearer PDF, or log values manually.'
            : 'No readable text found. If this is a scanned PDF, try a photo of the results page instead.'
        );
        setPhase('error');
      } else {
        setPhase('review');
      }
    } catch (e) {
      console.error('Lab scan failed', e);
      setError(e?.message || 'Couldn’t read that file.');
      setPhase('error');
    }
  };

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) runFile(file);
  };

  const updateDraft = (id, patch) => {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  };

  const selectedCount = drafts.filter((d) => d.selected).length;

  const confirmSave = async () => {
    const chosen = drafts.filter((d) => d.selected);
    if (!chosen.length) return;
    setSaving(true);
    try {
      for (const d of chosen) {
        const fields = draftToLabFields(d);
        if (!fields.markerName || !Number.isFinite(fields.value)) continue;
        addLabResult(fields);
      }
      window.dispatchEvent(
        new CustomEvent('tpp:toast', {
          detail: {
            message: `Saved ${chosen.length} lab ${chosen.length === 1 ? 'value' : 'values'} — verify anytime in Lab Logs`,
            type: 'success',
          },
        })
      );
      onSaved?.(chosen.length);
      handleClose();
    } catch (e) {
      console.error(e);
      setError('Save failed. Try again.');
      setPhase('error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={handleClose}
      title="Scan Lab Report"
      theme={theme}
      maxHeight="92vh"
      fitContent={phase === 'pick' || phase === 'processing'}
      footer={
        phase === 'review' ? (
          <div className="w-full flex flex-col gap-2">
            <p className="text-[11px] text-center leading-snug" style={{ color: theme.textLight }}>
              OCR can misread — only save what you’ve verified. Not medical advice.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={reset}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{
                  backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                  color: theme.text,
                }}
              >
                Choose another file
              </button>
              <button
                type="button"
                onClick={confirmSave}
                disabled={!selectedCount || saving}
                className="flex-[1.4] py-2.5 rounded-xl text-sm font-semibold disabled:opacity-45 active:scale-[0.98] btn-primary-inset"
                style={{
                  background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryDark || theme.primary} 100%)`,
                  color: theme.textOnPrimary || '#fff',
                  border: 'none',
                }}
              >
                {saving ? 'Saving…' : `Confirm & save (${selectedCount})`}
              </button>
            </div>
          </div>
        ) : phase === 'error' ? (
          <div className="w-full flex gap-2">
            <button
              type="button"
              onClick={reset}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{ backgroundColor: `${theme.primary}18`, color: theme.primary }}
            >
              Try again
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                color: theme.text,
              }}
            >
              Close
            </button>
          </div>
        ) : null
      }
    >
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,image/*,.pdf,.png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={onFileChange}
      />

      {phase === 'pick' && (
        <div className="space-y-4">
          <p className="text-xs leading-snug" style={{ color: theme.textLight }}>
            Upload a lab PDF or photo. We’ll draft matching markers — you review and confirm before anything is saved.
          </p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full rounded-2xl border-2 border-dashed p-6 flex flex-col items-center gap-3 active:scale-[0.99] transition-transform"
            style={{
              borderColor: `${theme.primary}55`,
              backgroundColor: theme.isDark ? `${theme.primary}12` : `${theme.primary}0d`,
            }}
          >
            <div className="flex items-center gap-3">
              <span
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${theme.primary}22`, color: theme.primary }}
              >
                <FilePdf size={26} weight="duotone" />
              </span>
              <span
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${theme.primary}22`, color: theme.primary }}
              >
                <ImageIcon size={26} weight="duotone" />
              </span>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold" style={{ color: theme.text }}>
                Choose PDF or photo
              </p>
              <p className="text-[11px] mt-1" style={{ color: theme.textLight }}>
                Whole reports welcome · text PDFs work best
              </p>
            </div>
          </button>
        </div>
      )}

      {phase === 'processing' && (
        <div className="py-10 flex flex-col items-center gap-3 text-center">
          <SpinnerGap size={36} weight="bold" className="animate-spin" style={{ color: theme.primary }} />
          <p className="text-sm font-semibold" style={{ color: theme.text }}>
            Reading {fileName || 'report'}…
          </p>
          <p className="text-[11px]" style={{ color: theme.textLight }}>
            Extracting text and matching markers
          </p>
        </div>
      )}

      {phase === 'error' && (
        <div className="py-6 flex flex-col items-center gap-3 text-center px-2">
          <WarningCircle size={36} weight="duotone" style={{ color: theme.error || '#c4714f' }} />
          <p className="text-sm font-semibold" style={{ color: theme.text }}>
            Couldn’t extract lab values
          </p>
          <p className="text-xs leading-snug" style={{ color: theme.textLight }}>
            {error}
          </p>
        </div>
      )}

      {phase === 'review' && (
        <div className="space-y-3">
          <div
            className="rounded-xl px-3 py-2.5"
            style={{
              backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              border: `1px solid ${theme.border}`,
            }}
          >
            <p className="text-xs font-semibold" style={{ color: theme.text }}>
              Review extracted values
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: theme.textLight }}>
              {fileName}
              {source ? ` · ${source === 'pdf' ? 'PDF text' : source === 'ocr' ? 'Photo OCR' : source}` : ''}
              {' · '}
              {drafts.length} matched
            </p>
          </div>

          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: theme.textLight }}>
            Confirm each entry
          </p>

          <ul className="space-y-2 max-h-[46vh] overflow-y-auto pr-0.5">
            {drafts.map((d) => (
              <li
                key={d.id}
                className="rounded-xl p-3 border"
                style={{
                  borderColor: d.selected ? `${theme.primary}55` : theme.border,
                  backgroundColor: theme.isDark ? 'rgba(0,0,0,0.2)' : '#fff',
                  opacity: d.selected ? 1 : 0.55,
                }}
              >
                <button
                  type="button"
                  onClick={() => updateDraft(d.id, { selected: !d.selected })}
                  className="flex items-center gap-2 w-full text-left mb-2"
                >
                  {d.selected ? (
                    <CheckCircle size={20} weight="fill" style={{ color: theme.primary }} />
                  ) : (
                    <Circle size={20} weight="regular" style={{ color: theme.textLight }} />
                  )}
                  <span className="text-sm font-bold" style={{ color: theme.text }}>
                    {d.markerName}
                  </span>
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <TextInput
                    label="Value"
                    value={String(d.value ?? '')}
                    onChange={(v) => updateDraft(d.id, { value: v })}
                    theme={theme}
                    outlined
                    customTextColor={theme.isDark ? null : '#181A18'}
                  />
                  <TextInput
                    label="Unit"
                    value={d.unit || ''}
                    onChange={(v) => updateDraft(d.id, { unit: v })}
                    theme={theme}
                    outlined
                    customTextColor={theme.isDark ? null : '#181A18'}
                  />
                </div>
                <div className="mt-2">
                  <GlassmorphismDatePicker
                    outlined
                    label="Date"
                    value={d.date || ''}
                    onChange={(dateString) => updateDraft(d.id, { date: dateString })}
                    theme={theme}
                    placeholder="Date"
                    customTextColor={theme.isDark ? null : '#181A18'}
                  />
                </div>
              </li>
            ))}
          </ul>

          {rawPreview ? (
            <details className="text-[10px]" style={{ color: theme.textLight }}>
              <summary className="cursor-pointer font-semibold">Extracted text preview</summary>
              <pre className="mt-1 whitespace-pre-wrap max-h-24 overflow-y-auto opacity-80">{rawPreview}</pre>
            </details>
          ) : null}
        </div>
      )}
    </BottomSheet>
  );
}
