import React, { useMemo, useState } from 'react';
import Modal from '../common/Modal';
import CustomDropdown from '../common/inputs/CustomDropdown';
import {
  Upload,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import {
  parseCSV,
  looksLikeShotsy,
  mapShotsyRows,
  mapPeppediaRows,
  autoDetectPeppediaMapping,
  PEPPEDIA_FIELD_OPTIONS,
  mergeShotsyIntoLocalStorage,
  mergePeppediaIntoLocalStorage,
  totalImportCount,
} from '../../utils/thirdPartyImport';

const APPS = [
  {
    id: 'shotsy',
    name: 'Shot tracker CSV',
    blurb: 'Best for GLP-1 / injection logs — shots, sites, weight, water, and day notes.',
  },
  {
    id: 'peppedia',
    name: 'Inventory & journal CSV',
    blurb: 'Best for vial inventory, journal notes, and metrics. You’ll map columns so we get the fields right.',
  },
];

const emptyState = () => ({
  step: 1,
  selectedApp: null,
  csvFile: null,
  headers: [],
  rows: [],
  columnMapping: {},
  preview: null,
  importing: false,
});

export default function ThirdPartyImportModal({ open, onClose, theme }) {
  const [state, setState] = useState(emptyState);
  const { step, selectedApp, csvFile, headers, rows, columnMapping, preview, importing } = state;

  const reset = () => setState(emptyState());

  const handleClose = () => {
    reset();
    onClose?.();
  };

  const selectApp = (appId) => {
    setState((s) => ({
      ...emptyState(),
      step: 2,
      selectedApp: appId,
    }));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const name = (file.name || '').toLowerCase();
    if (!name.endsWith('.csv')) {
      window.dispatchEvent(
        new CustomEvent('tpp:toast', {
          detail: { message: 'Please upload a .csv file.', type: 'error' },
        })
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result || '';
        const { headers: hdrs, rows: parsedRows } = parseCSV(String(text));

        if (selectedApp === 'shotsy' && !looksLikeShotsy(hdrs)) {
          window.dispatchEvent(
            new CustomEvent('tpp:toast', {
              detail: {
                message:
                  'This CSV doesn’t look like a shot-tracker export. Make sure you exported a CSV from your other app’s settings or data screen.',
                type: 'error',
                duration: 5000,
              },
            })
          );
        }

        if (selectedApp === 'shotsy') {
          const mapped = mapShotsyRows(parsedRows);
          setState((s) => ({
            ...s,
            csvFile: file,
            headers: hdrs,
            rows: parsedRows,
            preview: {
              injectionHistory: mapped.injectionHistory.length,
              metrics: mapped.metrics.length,
              waterTracker: Object.keys(mapped.waterTracker).length,
              userNotes: mapped.userNotes.length,
              _mapped: mapped,
            },
            step: 3,
          }));
        } else {
          const autoMap = autoDetectPeppediaMapping(hdrs);
          setState((s) => ({
            ...s,
            csvFile: file,
            headers: hdrs,
            rows: parsedRows,
            columnMapping: autoMap,
            preview: null,
            step: 3,
          }));
        }
      } catch (err) {
        console.error('CSV parse failed:', err);
        window.dispatchEvent(
          new CustomEvent('tpp:toast', {
            detail: {
              message: err?.message || 'Could not read that CSV. Please try again.',
              type: 'error',
            },
          })
        );
      }
    };
    reader.readAsText(file);
  };

  const peppediaMappingValid = useMemo(() => {
    if (selectedApp !== 'peppedia') return true;
    const values = Object.values(columnMapping);
    const hasStock = values.includes('name') && (values.includes('quantity') || values.includes('mg'));
    const hasNotes = values.includes('noteContent') || values.includes('noteTitle');
    const hasMetrics = values.includes('metricValue');
    return hasStock || hasNotes || hasMetrics;
  }, [selectedApp, columnMapping]);

  const applyPeppediaMapping = () => {
    const mapped = mapPeppediaRows(rows, columnMapping);
    setState((s) => ({
      ...s,
      preview: {
        stockpile: mapped.stockpile.length,
        userNotes: mapped.userNotes.length,
        metrics: mapped.metrics.length,
        _mapped: mapped,
      },
      step: 4,
    }));
  };

  const goToConfirmShotsy = () => {
    setState((s) => ({ ...s, step: 4 }));
  };

  const handleImport = () => {
    if (!preview?._mapped || importing) return;
    setState((s) => ({ ...s, importing: true }));

    try {
      let counts;
      if (selectedApp === 'shotsy') {
        counts = mergeShotsyIntoLocalStorage(preview._mapped);
      } else {
        counts = mergePeppediaIntoLocalStorage(preview._mapped);
      }

      const total = totalImportCount(counts);
      window.dispatchEvent(
        new CustomEvent('tpp:toast', {
          detail: {
            message:
              total > 0
                ? `Imported ${total} item${total === 1 ? '' : 's'} from another peptide app. Refreshing…`
                : 'Nothing new to import — your existing data already covers these rows.',
            type: total > 0 ? 'success' : 'info',
            duration: 4000,
          },
        })
      );

      handleClose();
      if (total > 0) {
        setTimeout(() => window.location.reload(), 1200);
      }
    } catch (err) {
      console.error('Third-party import failed:', err);
      setState((s) => ({ ...s, importing: false }));
      window.dispatchEvent(
        new CustomEvent('tpp:toast', {
          detail: { message: 'Import failed. Please try again.', type: 'error' },
        })
      );
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setState(emptyState());
    } else if (step === 3) {
      setState((s) => ({
        ...s,
        step: 2,
        csvFile: null,
        headers: [],
        rows: [],
        columnMapping: {},
        preview: null,
      }));
    } else if (step === 4) {
      setState((s) => ({ ...s, step: 3 }));
    }
  };

  const appLabel =
    selectedApp === 'shotsy'
      ? 'Shot tracker'
      : selectedApp === 'peppedia'
        ? 'Inventory & journal'
        : '';

  const countLines = (obj) => {
    if (!obj) return [];
    return Object.entries(obj)
      .filter(([k]) => !k.startsWith('_'))
      .map(([k, v]) => {
        const label =
          k === 'injectionHistory'
            ? 'Injections'
            : k === 'waterTracker'
              ? 'Water days'
              : k === 'userNotes'
                ? 'Notes'
                : k === 'stockpile'
                  ? 'Stockpile items'
                  : k === 'metrics'
                    ? 'Metrics'
                    : k;
        return { label, count: v };
      });
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      onBack={step > 1 ? handleBack : undefined}
      title={
        step === 1
          ? 'Import from Another App'
          : `Import from ${appLabel} — Step ${step} of 4`
      }
      theme={theme}
      maxWidth="640px"
      footer={
        <div className="w-full flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs" style={{ color: theme.textLight }}>
            {step === 1 && 'Choose where your data is coming from'}
            {step === 2 && 'Upload the CSV you exported from the other app'}
            {step === 3 &&
              selectedApp === 'shotsy' &&
              (preview ? (
                <span className="flex items-center gap-1">
                  <CheckCircle size={14} style={{ color: '#10b981' }} /> Ready to review
                </span>
              ) : (
                'Parsing…'
              ))}
            {step === 3 &&
              selectedApp === 'peppedia' &&
              (peppediaMappingValid ? (
                <span className="flex items-center gap-1">
                  <CheckCircle size={14} style={{ color: '#10b981' }} /> Mapping looks good
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <AlertTriangle size={14} style={{ color: '#f59e0b' }} /> Map at least Name+Qty, a note, or a metric
                </span>
              ))}
            {step === 4 && 'Your existing Pep Planner data stays — we only add new rows'}
          </div>
          <div className="flex gap-2">
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5"
                style={{
                  backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                }}
              >
                <ArrowLeft size={14} />
                Back
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="px-3 py-2 rounded-lg text-sm font-medium"
              style={{
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                color: theme.text,
                border: `1px solid ${theme.border}`,
              }}
            >
              Cancel
            </button>
            {step === 3 && selectedApp === 'shotsy' && (
              <button
                type="button"
                onClick={goToConfirmShotsy}
                disabled={!preview}
                className="px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50"
                style={{
                  backgroundColor: theme.primary,
                  color: theme.textOnPrimary || '#fff',
                }}
              >
                Next: Confirm
                <ArrowRight size={14} />
              </button>
            )}
            {step === 3 && selectedApp === 'peppedia' && (
              <button
                type="button"
                onClick={applyPeppediaMapping}
                disabled={!peppediaMappingValid}
                className="px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50"
                style={{
                  backgroundColor: peppediaMappingValid ? theme.primary : theme.secondary,
                  color: peppediaMappingValid ? theme.textOnPrimary || '#fff' : theme.text,
                }}
              >
                Next: Confirm
                <ArrowRight size={14} />
              </button>
            )}
            {step === 4 && (
              <button
                type="button"
                onClick={handleImport}
                disabled={importing || totalImportCount(preview) === 0}
                className="px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{
                  backgroundColor: theme.primary,
                  color: theme.textOnPrimary || '#fff',
                }}
              >
                {importing ? 'Importing…' : 'Import data'}
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4 min-h-[280px]">
        {/* Step 1 — choose app */}
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm" style={{ color: theme.textLight }}>
              Moving from another peptide app? Upload a CSV export and we’ll bring your data into Pep Planner.
            </p>
            <div className="grid gap-3">
              {APPS.map((app) => (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => selectApp(app.id)}
                  className="text-left p-4 rounded-2xl border transition-all active:scale-[0.99]"
                  style={{
                    borderColor: theme.border,
                    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                    color: theme.text,
                  }}
                >
                  <div className="font-semibold text-sm mb-1">{app.name}</div>
                  <div className="text-xs opacity-70 leading-relaxed">{app.blurb}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 — upload CSV */}
        {step === 2 && (
          <div className="space-y-4">
            <div
              className="p-3 rounded-xl text-xs leading-relaxed"
              style={{
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                color: theme.text,
              }}
            >
              {selectedApp === 'shotsy' ? (
                <>
                  In your other peptide app, open Settings (or Manage My Data) → Export, save the <strong>CSV</strong>, then upload it here.
                </>
              ) : (
                <>
                  Export a <strong>CSV</strong> from your other peptide app, then upload it here. You’ll match columns on the next step.
                </>
              )}
            </div>

            <label
              className="block w-full px-6 py-10 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all hover:border-solid"
              style={{
                borderColor: csvFile ? theme.primary : theme.border,
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
              }}
            >
              <input type="file" accept=".csv,text/csv" onChange={handleFileUpload} className="hidden" />
              <Upload size={36} className="mx-auto mb-3" style={{ color: theme.primary }} />
              <div className="text-sm font-medium mb-1" style={{ color: theme.text }}>
                {csvFile ? csvFile.name : 'Tap to choose your CSV'}
              </div>
              <div className="text-xs" style={{ color: theme.textLight }}>
                CSV files only — the same kind you open in Excel or Google Sheets
              </div>
            </label>
          </div>
        )}

        {/* Step 3 — Shotsy preview / Peppedia mapping */}
        {step === 3 && selectedApp === 'shotsy' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm" style={{ color: theme.text }}>
              <FileText size={16} style={{ color: theme.primary }} />
              <span className="font-medium truncate">{csvFile?.name}</span>
              <span className="text-xs opacity-60">· {rows.length} rows</span>
            </div>
            <p className="text-xs" style={{ color: theme.textLight }}>
              We auto-matched common shot-tracker columns. Here’s what we’ll bring over:
            </p>
            <div className="grid grid-cols-2 gap-2">
              {countLines(preview).map(({ label, count }) => (
                <div
                  key={label}
                  className="p-3 rounded-xl border"
                  style={{ borderColor: theme.border, color: theme.text }}
                >
                  <div className="text-lg font-semibold">{count}</div>
                  <div className="text-[10px] uppercase tracking-wider opacity-60">{label}</div>
                </div>
              ))}
            </div>
            {rows.length > 0 && (
              <div
                className="p-3 rounded-xl border text-xs font-mono space-y-1 max-h-32 overflow-auto"
                style={{ borderColor: theme.border, color: theme.textLight }}
              >
                <div className="font-sans font-semibold mb-1" style={{ color: theme.text }}>
                  Sample rows
                </div>
                {rows.slice(0, 3).map((row, idx) => (
                  <div key={idx} className="truncate">
                    {[row['Date (UTC)'] || row.Date || row.date, row.Shot || row.shot, row.Site || row.site]
                      .filter(Boolean)
                      .join(' · ') || Object.values(row).filter((v) => typeof v === 'string' && v).slice(0, 3).join(' · ')}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 3 && selectedApp === 'peppedia' && (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: theme.textLight }}>
              Match each CSV column to a Pep Planner field. Skip anything you don’t need.
            </p>
            <div className="border rounded-xl overflow-hidden" style={{ borderColor: theme.border }}>
              <div
                className="grid grid-cols-2 gap-3 p-3 text-xs font-semibold uppercase tracking-wider border-b"
                style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }}
              >
                <div>Your CSV column</div>
                <div>Pep Planner field</div>
              </div>
              <div className="divide-y max-h-72 overflow-auto" style={{ borderColor: theme.border }}>
                {headers.map((header) => (
                  <div key={header} className="grid grid-cols-2 gap-3 p-3 items-center">
                    <div className="text-sm font-medium truncate" style={{ color: theme.text }} title={header}>
                      {header || '(empty)'}
                    </div>
                    <CustomDropdown
                      value={columnMapping[header] || 'skip'}
                      onChange={(val) =>
                        setState((s) => ({
                          ...s,
                          columnMapping: { ...s.columnMapping, [header]: val },
                        }))
                      }
                      options={PEPPEDIA_FIELD_OPTIONS}
                      theme={theme}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 4 — confirm */}
        {step === 4 && (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: theme.textLight }}>
              Ready to merge this into your account. Duplicates are skipped automatically.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {countLines(preview).map(({ label, count }) => (
                <div
                  key={label}
                  className="p-3 rounded-xl border"
                  style={{ borderColor: theme.border, color: theme.text }}
                >
                  <div className="text-lg font-semibold">{count}</div>
                  <div className="text-[10px] uppercase tracking-wider opacity-60">{label}</div>
                </div>
              ))}
            </div>
            <div
              className="p-3 rounded-xl text-xs leading-relaxed"
              style={{
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                color: theme.text,
              }}
            >
              After import, the app refreshes so your dashboard, stockpile, notes, and metrics all pick up the new data.
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
