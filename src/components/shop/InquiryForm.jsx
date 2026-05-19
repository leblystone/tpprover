/**
 * Reusable inquiry form — writes to Firestore `inquiries` collection.
 * Fields are driven by the `fields` prop array.
 */
import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { themes, defaultThemeName } from '../../theme/themes';
import { Check } from 'lucide-react';

const theme = themes[defaultThemeName];

/**
 * @param {string}   type       Inquiry type key stored in Firestore (e.g. 'custom', 'wholesale')
 * @param {Array}    fields     [{name, label, type: 'text'|'email'|'tel'|'number'|'textarea'|'select', options?, required?}]
 * @param {string}   [cta]      Button label
 * @param {string}   [successMsg]
 */
export default function InquiryForm({ type, fields, cta = 'Send Inquiry', successMsg = "We got it! We'll be in touch within 1–2 business days." }) {
  const [values, setValues] = useState(() => Object.fromEntries(fields.map(f => [f.name, ''])));
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const set = (name, val) => setValues(v => ({ ...v, [name]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await addDoc(collection(db, 'inquiries'), {
        type,
        ...values,
        createdAt: serverTimestamp(),
      });
      setDone(true);
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
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
        <p className="text-sm font-semibold max-w-xs" style={{ color: theme.text }}>{successMsg}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map(f => (
        <div key={f.name}>
          <label className="block text-[11px] font-bold tracking-[0.1em] uppercase mb-1.5" style={{ color: theme.textLight }}>
            {f.label}{f.required && <span className="ml-0.5 text-red-400">*</span>}
          </label>
          {f.type === 'textarea' ? (
            <textarea
              value={values[f.name]}
              onChange={e => set(f.name, e.target.value)}
              required={f.required}
              rows={4}
              placeholder={f.placeholder}
              className="w-full px-4 py-3 rounded-lg border bg-white text-sm resize-none focus:outline-none focus:ring-2"
              style={{ borderColor: `${theme.text}20`, color: theme.text, focusRingColor: theme.primary }}
            />
          ) : f.type === 'select' ? (
            <select
              value={values[f.name]}
              onChange={e => set(f.name, e.target.value)}
              required={f.required}
              className="w-full px-4 py-3 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: `${theme.text}20`, color: values[f.name] ? theme.text : theme.textLight }}
            >
              <option value="">Select…</option>
              {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input
              type={f.type || 'text'}
              value={values[f.name]}
              onChange={e => set(f.name, e.target.value)}
              required={f.required}
              placeholder={f.placeholder}
              className="w-full px-4 py-3 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: `${theme.text}20`, color: theme.text }}
            />
          )}
        </div>
      ))}

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
