/**
 * Reusable inquiry form — writes to Firestore `inquiries` collection.
 * Fields are driven by the `fields` prop array.
 */
import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { themes, defaultThemeName } from '../../theme/themes';
import { Check } from 'lucide-react';
import { uploadInquiryImage } from '../../utils/storageUtils';
import CustomDropdown from '../common/inputs/CustomDropdown';

const theme = themes[defaultThemeName];

function initialValue(field) {
  if (field.type === 'checkbox') return false;
  if (field.type === 'file') return field.maxFiles > 1 ? [] : null;
  return '';
}

function fileListFor(field, values) {
  const raw = values[field.name];
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function normalizeOptions(options = []) {
  return options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
}

function isFieldVisible(field, values) {
  if (!field.showWhen) return true;
  return values[field.showWhen.field] === field.showWhen.equals;
}

/**
 * @param {string}   type       Inquiry type key stored in Firestore (e.g. 'custom', 'wholesale')
 * @param {Array}    fields     Field config (text, email, textarea, select, checkbox, file)
 * @param {string}   [cta]      Button label
 * @param {string}   [successMsg]
 */
export default function InquiryForm({ type, fields, cta = 'Send Inquiry', successMsg = "We got it! We'll be in touch within 1–2 business days." }) {
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((f) => [f.name, initialValue(f)])));
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const set = (name, val) => {
    setValues((v) => {
      const next = { ...v, [name]: val };
      if (name === 'plannerSize' && val !== 'custom') next.plannerSizeCustom = '';
      return next;
    });
    if (fieldErrors[name]) setFieldErrors((e) => ({ ...e, [name]: '' }));
  };

  const scrollToField = (fieldName) => {
    requestAnimationFrame(() => {
      document.querySelector(`[data-inquiry-field="${fieldName}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const validate = () => {
    const errors = {};
    fields.forEach((f) => {
      if (!isFieldVisible(f, values)) return;
      if (f.type === 'checkbox') {
        if (f.required && !values[f.name]) {
          errors[f.name] = 'Please check this box to continue';
        }
        return;
      }
      if (f.type === 'file') {
        const files = fileListFor(f, values);
        const invalid = files.find((file) => !file.type?.startsWith('image/'));
        if (invalid) errors[f.name] = 'Only image files are allowed';
        return;
      }

      const val = values[f.name]?.trim?.() ?? String(values[f.name] ?? '').trim();
      if (f.required && !val) {
        errors[f.name] = `${f.label} is required`;
      } else if (f.type === 'email' && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        errors[f.name] = 'Enter a valid email address';
      }
    });
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const errors = validate();
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      scrollToField(Object.keys(errors)[0]);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const payload = {
        type,
        status: 'new',
        source: typeof window !== 'undefined' ? window.location.pathname : '',
      };

      for (const f of fields) {
        if (!isFieldVisible(f, values)) continue;
        if (f.type === 'file') continue;
        if (f.type === 'checkbox') {
          if (values[f.name]) payload[f.name] = true;
          continue;
        }
        const val = values[f.name]?.trim?.() ?? '';
        if (val) payload[f.name] = val;
      }

      if (payload.plannerSize === 'custom' && payload.plannerSizeCustom) {
        payload.plannerSizeLabel = payload.plannerSizeCustom;
      } else if (payload.plannerSize) {
        const sizeField = fields.find((f) => f.name === 'plannerSize');
        const opt = normalizeOptions(sizeField?.options).find((o) => o.value === payload.plannerSize);
        payload.plannerSizeLabel = opt?.label || payload.plannerSize;
      }

      const fileField = fields.find((f) => f.type === 'file');
      const filesToUpload = fileField ? fileListFor(fileField, values) : [];
      if (filesToUpload.length) {
        try {
          const uploads = await Promise.all(filesToUpload.map((file) => uploadInquiryImage(file)));
          payload.imageUrls = uploads.map((u) => u.url);
          payload.imagePaths = uploads.map((u) => u.path);
          payload.imageFileNames = uploads.map((u) => u.fileName);
          if (uploads.length === 1) {
            payload.imageUrl = uploads[0].url;
            payload.imagePath = uploads[0].path;
            payload.imageFileName = uploads[0].fileName;
          }
        } catch (uploadErr) {
          console.error(uploadErr);
          setError('Could not upload your images. Try smaller files or submit without images.');
          setBusy(false);
          return;
        }
      }

      await addDoc(collection(db, 'inquiries'), {
        ...payload,
        createdAt: serverTimestamp(),
      });
      setDone(true);
    } catch (err) {
      console.error(err);
      const code = err?.code || '';
      setError(
        code === 'permission-denied'
          ? 'Could not submit — please refresh and try again. If this persists, contact support.'
          : 'Something went wrong. Please try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: `${theme.primary}18` }}>
          <Check className="w-6 h-6" style={{ color: theme.primary }} />
        </div>
        <p className="text-sm font-semibold max-w-xs whitespace-pre-line" style={{ color: theme.text }}>{successMsg}</p>
      </div>
    );
  }

  const inputBorder = (name) => (fieldErrors[name] ? '#f87171' : `${theme.text}20`);

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {fields.map((f) => {
        if (!isFieldVisible(f, values)) return null;
        return (
        <div key={f.name} data-inquiry-field={f.name}>
          <label className="block text-[11px] font-bold tracking-[0.1em] uppercase mb-1.5" style={{ color: theme.textLight }}>
            {f.label}
            {f.required && <span className="ml-0.5 text-red-400">*</span>}
          </label>

          {f.hint && f.type !== 'checkbox' && (
            <p className="text-xs mb-2 leading-relaxed" style={{ color: theme.textLight }}>{f.hint}</p>
          )}

          {f.description && f.type === 'checkbox' && (
            <p className="text-xs mb-3 leading-relaxed" style={{ color: theme.textLight }}>{f.description}</p>
          )}

          {f.type === 'textarea' ? (
            <textarea
              value={values[f.name]}
              onChange={(e) => set(f.name, e.target.value)}
              rows={4}
              placeholder={f.placeholder}
              className="w-full px-4 py-3 rounded-lg border bg-white text-sm resize-none focus:outline-none focus:ring-2"
              style={{ borderColor: inputBorder(f.name), color: theme.text }}
            />
          ) : f.type === 'select' ? (
            <CustomDropdown
              value={values[f.name]}
              onChange={(v) => set(f.name, v)}
              options={normalizeOptions(f.options)}
              placeholder={f.placeholder || 'Select…'}
              theme={theme}
              outlined
              customShadow
            />
          ) : f.type === 'checkbox' ? (
            <label className="flex gap-3 cursor-pointer items-start">
              <input
                type="checkbox"
                checked={!!values[f.name]}
                onChange={(e) => set(f.name, e.target.checked)}
                className="mt-1 w-4 h-4 flex-shrink-0 rounded border"
                style={{ accentColor: theme.primary }}
              />
              <span className="text-xs leading-relaxed" style={{ color: theme.text }}>
                {f.checkboxLabel || f.label}
              </span>
            </label>
          ) : f.type === 'file' ? (
            (() => {
              const maxFiles = f.maxFiles ?? 1;
              const files = fileListFor(f, values);
              const atMax = files.length >= maxFiles;

              const addFiles = (picked) => {
                if (!picked.length) return;
                const nonImages = picked.filter((file) => !file.type?.startsWith('image/'));
                if (nonImages.length) {
                  setFieldErrors((e) => ({ ...e, [f.name]: 'Only image files are allowed' }));
                  return;
                }
                const room = maxFiles - files.length;
                if (room <= 0) {
                  setFieldErrors((e) => ({ ...e, [f.name]: `You can upload up to ${maxFiles} images` }));
                  return;
                }
                const next = [...files, ...picked.slice(0, room)];
                set(f.name, maxFiles > 1 ? next : next[0] ?? null);
                if (picked.length > room) {
                  setFieldErrors((e) => ({ ...e, [f.name]: `You can upload up to ${maxFiles} images` }));
                }
              };

              const removeFile = (index) => {
                const next = files.filter((_, i) => i !== index);
                set(f.name, maxFiles > 1 ? next : next[0] ?? null);
              };

              return (
                <div className="space-y-2">
                  {files.length > 0 && (
                    <ul className="space-y-1.5">
                      {files.map((file, index) => (
                        <li
                          key={`${file.name}-${file.size}-${index}`}
                          className="flex items-center justify-between gap-2 text-xs rounded-lg px-3 py-2 border"
                          style={{ borderColor: `${theme.text}15`, color: theme.text }}
                        >
                          <span className="truncate">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="flex-shrink-0 font-semibold uppercase tracking-wide text-[10px]"
                            style={{ color: '#ef4444' }}
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {!atMax && (
                    <input
                      type="file"
                      accept={f.accept || 'image/*'}
                      multiple={maxFiles > 1}
                      onChange={(e) => {
                        addFiles(Array.from(e.target.files || []));
                        e.target.value = '';
                      }}
                      className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:uppercase file:tracking-wide file:text-white file:cursor-pointer hover:file:opacity-90"
                      style={{ color: theme.text }}
                    />
                  )}
                  {maxFiles > 1 && (
                    <p className="text-[11px]" style={{ color: theme.textLight }}>
                      {files.length}/{maxFiles} images selected
                    </p>
                  )}
                </div>
              );
            })()
          ) : (
            <input
              type={f.type || 'text'}
              value={values[f.name]}
              onChange={(e) => set(f.name, e.target.value)}
              placeholder={f.placeholder}
              className="w-full px-4 py-3 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: inputBorder(f.name), color: theme.text }}
            />
          )}

          {fieldErrors[f.name] && (
            <p className="mt-1 text-[11px] font-medium" style={{ color: '#ef4444' }}>
              {fieldErrors[f.name]}
            </p>
          )}
        </div>
        );
      })}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="w-full py-3.5 rounded-lg text-[11px] font-bold tracking-[0.15em] uppercase text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{
          backgroundColor: theme.primary,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -2px 0 rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.12)',
        }}
      >
        {busy ? 'Sending…' : cta}
      </button>
    </form>
  );
}
