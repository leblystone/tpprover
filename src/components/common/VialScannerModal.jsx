import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Flashlight, RotateCcw, Image as ImageIcon, ScanSearch, Check } from 'lucide-react';
import Modal from './Modal';
import { captureVideoFrame, recognizeLabelImage } from '../../utils/labelOCR';

/**
 * Label OCR scanner — point camera at a vial / COA label, capture, read text, prefill.
 * (Google Lens–style text recognition — not barcode/QR.)
 *
 * Props:
 * - open, onClose, theme
 * - onScan(fields) — called when user applies recognized fields
 */
export default function VialScannerModal({ open, onClose, theme, onScan }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('Starting camera…');
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null); // { fields, text, dataUrl }

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((t) => t.stop());
      } catch {
        /* ignore */
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setTorchOn(false);
    setTorchSupported(false);
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    setStatus('Starting camera…');
    setPreview(null);
    stopCamera();

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera is not available in this browser. Use “Upload photo” instead.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => {});
      }

      setStatus('Point at the label, then tap the screen');

      const track = stream.getVideoTracks()?.[0];
      const caps = track?.getCapabilities?.();
      setTorchSupported(!!caps?.torch);
    } catch (err) {
      console.error('Label scanner camera failed:', err);
      const msg =
        err?.name === 'NotAllowedError'
          ? 'Camera permission denied. You can still use Upload photo (no live camera needed).'
          : err?.message || 'Could not start the camera.';
      setError(msg);
      setStatus('Upload a photo of the label instead');
    }
  }, [stopCamera]);

  useEffect(() => {
    if (!open) {
      stopCamera();
      setPreview(null);
      setBusy(false);
      setError(null);
      return undefined;
    }
    const timer = setTimeout(() => startCamera(), 120);
    return () => {
      clearTimeout(timer);
      stopCamera();
    };
  }, [open, startCamera, stopCamera]);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks?.()?.[0];
    if (!track) return;
    try {
      const next = !torchOn;
      await track.applyConstraints({ advanced: [{ torch: next }] });
      setTorchOn(next);
    } catch (e) {
      console.warn('Torch not available:', e);
      setTorchSupported(false);
    }
  };

  const runOcr = async (source, dataUrl) => {
    setBusy(true);
    setError(null);
    setStatus('Reading text from label…');
    try {
      const { text, fields } = await recognizeLabelImage(source);
      if (!text) {
        setError('No text found. Try better lighting, hold steady, or upload a clearer photo.');
        setStatus('Point at the label, then tap the screen');
        setBusy(false);
        return;
      }
      setPreview({
        text,
        fields: fields && !fields.empty ? fields : { rawText: text, source: 'ocr', empty: true },
        dataUrl: dataUrl || null,
      });
      setStatus('Review what we found');
    } catch (err) {
      console.error('Label OCR failed:', err);
      setError(err?.message || 'Could not read text from the image.');
      setStatus('Point at the label, then tap the screen');
    } finally {
      setBusy(false);
    }
  };

  const handleCapture = async () => {
    if (busy) return;
    if (!videoRef.current?.srcObject) {
      setError('Camera isn’t ready. Allow camera access, or use Upload photo.');
      return;
    }
    try {
      const canvas = captureVideoFrame(videoRef.current, { cropCenter: true });
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      await runOcr(canvas, dataUrl);
    } catch (err) {
      setError(err?.message || 'Could not capture frame.');
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
    await runOcr(file, dataUrl);
  };

  const handleApply = () => {
    if (!preview?.fields || preview.fields.empty) {
      setError('Couldn’t pull name / amount / lot from that text. Retake or edit fields manually.');
      return;
    }
    onScan?.(preview.fields);
    stopCamera();
    onClose?.();
  };

  const handleClose = () => {
    stopCamera();
    setPreview(null);
    onClose?.();
  };

  const fieldBits = preview?.fields && !preview.fields.empty
    ? [
        preview.fields.name,
        preview.fields.mg
          ? `${preview.fields.mg}${preview.fields.mgUnit ? ` ${preview.fields.mgUnit}` : ' mg'}`
          : null,
        preview.fields.purity ? `${preview.fields.purity}%` : null,
        preview.fields.batchNumber ? `Lot ${preview.fields.batchNumber}` : null,
        preview.fields.vendor || null,
      ].filter(Boolean)
    : [];

  return (
    <Modal
      open={open}
      onClose={handleClose}
      theme={theme}
      title="Scan Label"
      titleExtra={<ScanSearch size={18} style={{ color: theme?.primary }} />}
      maxWidth="max-w-md"
      noPadding
    >
      <div className="flex flex-col gap-3 p-4">
        {!preview ? (
          <button
            type="button"
            onClick={handleCapture}
            disabled={busy}
            aria-label="Tap to capture and read label"
            className="relative w-full overflow-hidden rounded-xl border-0 p-0 disabled:opacity-80"
            style={{
              backgroundColor: '#000',
              aspectRatio: '3 / 4',
              maxHeight: '55vh',
              border: `1px solid ${theme?.border || 'rgba(255,255,255,0.1)'}`,
              cursor: busy ? 'wait' : 'pointer',
            }}
          >
            <video
              ref={videoRef}
              muted
              playsInline
              autoPlay
              className="absolute inset-0 h-full w-full object-cover pointer-events-none"
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                className="w-[72%] max-w-[260px] aspect-square rounded-2xl"
                style={{
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
                  border: `2px solid ${theme?.primary || '#7f9e95'}`,
                }}
              />
            </div>
            {busy && (
              <div
                className="pointer-events-none absolute inset-0"
                style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
                aria-hidden
              />
            )}
            {status && (
              <div
                className="absolute bottom-3 left-3 right-3 text-center text-xs font-medium px-2 py-1.5 rounded-lg pointer-events-none"
                style={{ backgroundColor: 'rgba(0,0,0,0.55)', color: '#fff' }}
              >
                {busy ? 'Reading text…' : status}
              </div>
            )}
          </button>
        ) : (
          <div className="space-y-2">
            {preview.dataUrl && (
              <img
                src={preview.dataUrl}
                alt="Captured label"
                className="w-full max-h-40 object-contain rounded-xl"
                style={{ backgroundColor: theme?.isDark ? '#111' : '#f3f4f6' }}
              />
            )}
            <div
              className="rounded-xl border px-3 py-2.5"
              style={{
                backgroundColor: theme?.isDark ? `${theme.primary}14` : `${theme.primary}0c`,
                borderColor: theme?.isDark ? `${theme.primary}40` : `${theme.primary}30`,
              }}
            >
              <div className="text-xs font-semibold mb-1" style={{ color: theme?.text }}>
                {fieldBits.length ? 'Detected fields' : 'Text found — couldn’t map fields'}
              </div>
              {fieldBits.length > 0 ? (
                <div className="text-[11px] leading-snug" style={{ color: theme?.textLight }}>
                  {fieldBits.join(' · ')}
                </div>
              ) : null}
              {preview.text && (
                <details className="mt-2">
                  <summary
                    className="text-[11px] cursor-pointer font-medium"
                    style={{ color: theme?.primary }}
                  >
                    Show raw text
                  </summary>
                  <pre
                    className="mt-1 text-[10px] whitespace-pre-wrap max-h-28 overflow-auto rounded-lg p-2"
                    style={{
                      backgroundColor: theme?.isDark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.04)',
                      color: theme?.textLight,
                    }}
                  >
                    {preview.text}
                  </pre>
                </details>
              )}
            </div>
          </div>
        )}

        {error && (
          <div
            className="rounded-lg border px-3 py-2 text-sm"
            style={{
              backgroundColor: theme?.isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.06)',
              borderColor: theme?.isDark ? 'rgba(239,68,68,0.35)' : 'rgba(239,68,68,0.25)',
              color: theme?.isDark ? '#fca5a5' : '#991b1b',
            }}
          >
            {error}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFile}
        />

        {!preview ? (
          <div className="flex items-center gap-2">
            {torchSupported && (
              <button
                type="button"
                onClick={toggleTorch}
                disabled={busy}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold"
                style={{
                  backgroundColor: torchOn ? theme?.primary : theme?.secondary,
                  color: torchOn ? theme?.textOnPrimary || '#fff' : theme?.text,
                  border: `1px solid ${theme?.border}`,
                }}
              >
                <Flashlight size={16} />
                {torchOn ? 'Torch On' : 'Torch'}
              </button>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold"
              style={{
                backgroundColor: theme?.secondary,
                color: theme?.text,
                border: `1px solid ${theme?.border}`,
              }}
            >
              <ImageIcon size={16} />
              Upload photo
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={busy}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold"
              style={{
                backgroundColor: theme?.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                color: theme?.textLight,
                border: `1px solid ${theme?.border}`,
              }}
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setPreview(null);
                setError(null);
                startCamera();
              }}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold"
              style={{
                backgroundColor: theme?.secondary,
                color: theme?.text,
                border: `1px solid ${theme?.border}`,
              }}
            >
              <RotateCcw size={16} />
              Retake
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!fieldBits.length}
              className="flex-[1.4] flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
              style={{
                background: `linear-gradient(135deg, ${theme?.primary} 0%, ${theme?.primaryDark || theme?.primary} 100%)`,
                border: 'none',
              }}
            >
              <Check size={16} />
              Apply fields
            </button>
          </div>
        )}

        <p className="text-[11px] text-center" style={{ color: theme?.textLight }}>
          Tap the camera to capture. Live preview needs camera permission; Upload photo works from your gallery without it.
        </p>
      </div>
    </Modal>
  );
}
