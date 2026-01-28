import React, { useState, useMemo } from 'react';
import Modal from '../common/Modal';
import CustomDropdown from '../common/inputs/CustomDropdown';
import { generateId } from '../../utils/string';
import { Upload, ArrowRight, ArrowLeft, CheckCircle, AlertCircle, FileText } from 'lucide-react';

const FIELD_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'mg', label: 'mg' },
  { value: 'quantity', label: 'Quantity' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'cost', label: 'Cost' },
  { value: 'skip', label: 'Skip' }
];

export default function CSVImportModal({ open, onClose, theme, onSave }) {
  const [step, setStep] = useState(1); // 1: Upload, 2: Map, 3: Review
  const [csvFile, setCsvFile] = useState(null);
  const [rawCsvData, setRawCsvData] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [mappedData, setMappedData] = useState([]);

  // Auto-detect likely column matches
  const autoDetectMapping = (headers) => {
    const mapping = {};
    headers.forEach(header => {
      const lowerHeader = header.toLowerCase();
      if (lowerHeader.includes('name') || lowerHeader.includes('peptide') || lowerHeader.includes('compound')) {
        mapping[header] = 'name';
      } else if (lowerHeader.includes('mg') || lowerHeader.includes('amount') || lowerHeader.includes('weight')) {
        mapping[header] = 'mg';
      } else if (lowerHeader.includes('qty') || lowerHeader.includes('quantity') || lowerHeader.includes('vials') || lowerHeader.includes('count')) {
        mapping[header] = 'quantity';
      } else if (lowerHeader.includes('vendor') || lowerHeader.includes('source') || lowerHeader.includes('supplier')) {
        mapping[header] = 'vendor';
      } else if (lowerHeader.includes('cost') || lowerHeader.includes('price') || lowerHeader.includes('$')) {
        mapping[header] = 'cost';
      } else {
        mapping[header] = 'skip';
      }
    });
    return mapping;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { message: 'CSV file is empty', type: 'error' } 
        }));
        return;
      }

      // Detect delimiter
      const firstLine = lines[0];
      let delimiter = ',';
      if (firstLine.includes('\t')) delimiter = '\t';
      else if (firstLine.includes('|')) delimiter = '|';

      // Parse headers
      const headers = firstLine.split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
      setCsvHeaders(headers);

      // Parse data rows
      const data = lines.slice(1).map((line, index) => {
        const parts = line.split(delimiter).map(p => p.trim().replace(/^"|"$/g, ''));
        const row = { id: generateId(), _rowIndex: index };
        headers.forEach((header, idx) => {
          row[header] = parts[idx] || '';
        });
        return row;
      }).filter(row => Object.values(row).some(v => v && v !== '' && v !== '_rowIndex')); // Remove completely empty rows

      setRawCsvData(data);

      // Auto-detect mapping
      const autoMapping = autoDetectMapping(headers);
      setColumnMapping(autoMapping);

      // Move to mapping step
      setStep(2);
    };
    reader.readAsText(file);
  };

  const handleMappingChange = (csvColumn, appField) => {
    setColumnMapping(prev => ({
      ...prev,
      [csvColumn]: appField
    }));
  };

  // Apply mapping and create mapped data
  const applyMapping = () => {
    const mapped = rawCsvData.map(row => {
      const mappedRow = {
        id: row.id,
        name: '',
        mg: '',
        quantity: '',
        vendor: '',
        cost: ''
      };

      Object.keys(columnMapping).forEach(csvColumn => {
        const appField = columnMapping[csvColumn];
        if (appField !== 'skip' && row[csvColumn]) {
          mappedRow[appField] = row[csvColumn];
        }
      });

      return mappedRow;
    });

    setMappedData(mapped);
    setStep(3);
  };

  // Validate mapping
  const mappingValid = useMemo(() => {
    const requiredFields = ['name', 'mg', 'quantity'];
    return requiredFields.every(field => 
      Object.values(columnMapping).includes(field)
    );
  }, [columnMapping]);

  // Get valid rows for review
  const validRows = useMemo(() => {
    return mappedData.filter(row => {
      const name = (row.name || '').trim();
      const mg = (row.mg || '').trim();
      const quantity = (row.quantity || '').trim();
      return name && mg && quantity;
    });
  }, [mappedData]);

  const invalidRows = useMemo(() => {
    return mappedData.filter(row => {
      const name = (row.name || '').trim();
      const mg = (row.mg || '').trim();
      const quantity = (row.quantity || '').trim();
      return !name || !mg || !quantity;
    });
  }, [mappedData]);

  const handleImport = () => {
    if (validRows.length === 0) {
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'No valid rows to import', type: 'error' } 
      }));
      return;
    }

    const itemsToAdd = validRows.map(row => ({
      id: generateId(),
      name: (row.name || '').trim(),
      mg: (row.mg || '').trim(),
      quantity: (row.quantity || '').trim(),
      vendor: (row.vendor || '').trim() || '',
      cost: (row.cost || '').trim() || '',
      unit: 'vial',
      mgUnit: 'mg',
      vendorId: null,
      purity: '',
      capColor: '',
      batchNumber: '',
      date: '',
      documentation: []
    }));

    onSave(itemsToAdd);
    onClose();
    
    // Reset state
    setStep(1);
    setCsvFile(null);
    setRawCsvData([]);
    setCsvHeaders([]);
    setColumnMapping({});
    setMappedData([]);
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setCsvFile(null);
      setRawCsvData([]);
      setCsvHeaders([]);
      setColumnMapping({});
    } else if (step === 3) {
      setStep(2);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`CSV Import - Step ${step} of 3`}
      theme={theme}
      maxWidth="900px"
      footer={
        <div className="w-full flex items-center justify-between">
          <div className="text-sm" style={{ color: theme.textLight }}>
            {step === 1 && 'Upload your CSV file to begin'}
            {step === 2 && (mappingValid ? '✅ Mapping complete' : '⚠️ Map required fields: Name, mg, Quantity')}
            {step === 3 && (
              <span>
                ✅ {validRows.length} vial{validRows.length !== 1 ? 's' : ''} will be imported
                {invalidRows.length > 0 && ` • ${invalidRows.length} row${invalidRows.length !== 1 ? 's' : ''} skipped`}
              </span>
            )}
          </div>
          <div className="flex gap-3">
            {step > 1 && (
              <button
                onClick={handleBack}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                style={{
                  backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                  color: theme.text,
                  border: `1px solid ${theme.border}`
                }}
              >
                <ArrowLeft size={16} />
                Back
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                color: theme.text,
                border: `1px solid ${theme.border}`
              }}
            >
              Cancel
            </button>
            {step === 2 && (
              <button
                onClick={applyMapping}
                disabled={!mappingValid}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                style={{
                  backgroundColor: mappingValid ? theme.primary : theme.secondary,
                  color: mappingValid ? theme.textOnPrimary : theme.text
                }}
              >
                Next: Review
                <ArrowRight size={16} />
              </button>
            )}
            {step === 3 && (
              <button
                onClick={handleImport}
                disabled={validRows.length === 0}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: validRows.length > 0 ? theme.primary : theme.secondary,
                  color: validRows.length > 0 ? theme.textOnPrimary : theme.text
                }}
              >
                Import {validRows.length} Vial{validRows.length !== 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4 min-h-[400px]">
        {/* Step 1: Upload CSV */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-sm mb-4" style={{ color: theme.textLight }}>
              Upload a CSV file with your peptide data. Supported formats: .csv, .txt
            </div>

            <label
              className="block w-full px-6 py-12 border-2 border-dashed rounded-lg text-center cursor-pointer transition-all hover:border-solid"
              style={{
                borderColor: csvFile ? theme.primary : theme.border,
                backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)'
              }}
            >
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Upload size={40} className="mx-auto mb-3" style={{ color: theme.primary }} />
              <div className="text-base font-medium mb-1" style={{ color: theme.text }}>
                {csvFile ? csvFile.name : 'Drop CSV file or click to browse'}
              </div>
              <div className="text-xs" style={{ color: theme.textLight }}>
                {csvFile ? `${rawCsvData.length} rows detected` : 'Supported: .csv, .txt files'}
              </div>
            </label>

            {rawCsvData.length > 0 && (
              <div className="p-3 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)' }}>
                <div className="text-sm font-semibold mb-2" style={{ color: theme.text }}>
                  Preview (first 3 rows):
                </div>
                <div className="text-xs font-mono space-y-1" style={{ color: theme.textLight }}>
                  {rawCsvData.slice(0, 3).map((row, idx) => (
                    <div key={idx} className="truncate">
                      {Object.values(row).filter(v => v !== row.id && v !== row._rowIndex).join(' | ')}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Map Columns */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="text-sm mb-4" style={{ color: theme.textLight }}>
              Map your CSV columns to our app fields. Required fields: Name, mg, Quantity
            </div>

            <div className="border rounded-lg overflow-hidden" style={{ borderColor: theme.border }}>
              <div className="grid grid-cols-2 gap-4 p-4 font-semibold text-sm border-b" style={{ borderColor: theme.border, backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)' }}>
                <div style={{ color: theme.text }}>Your CSV Column</div>
                <div style={{ color: theme.text }}>Our App Field</div>
              </div>
              <div className="divide-y" style={{ borderColor: theme.border }}>
                {csvHeaders.map((header, index) => (
                  <div key={index} className="grid grid-cols-2 gap-4 p-4 items-center">
                    <div className="text-sm font-medium" style={{ color: theme.text }}>
                      "{header}"
                    </div>
                    <div>
                      <CustomDropdown
                        value={columnMapping[header] || 'skip'}
                        onChange={(value) => handleMappingChange(header, value)}
                        options={FIELD_OPTIONS}
                        theme={theme}
                        placeholder="Select field..."
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {!mappingValid && (
              <div className="p-3 rounded-lg flex items-center gap-2" style={{ backgroundColor: theme.isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)', border: `1px solid ${theme.isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)'}` }}>
                <AlertCircle size={16} style={{ color: '#ef4444' }} />
                <span className="text-sm" style={{ color: theme.text }}>
                  Please map all required fields: Name, mg, and Quantity
                </span>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Review & Confirm */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="text-sm mb-4" style={{ color: theme.textLight }}>
              Review your data before importing. Invalid rows will be skipped.
            </div>

            {invalidRows.length > 0 && (
              <div className="p-3 rounded-lg flex items-center gap-2" style={{ backgroundColor: theme.isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)', border: `1px solid ${theme.isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)'}` }}>
                <AlertCircle size={16} style={{ color: '#ef4444' }} />
                <span className="text-sm" style={{ color: theme.text }}>
                  ⚠️ {invalidRows.length} row{invalidRows.length !== 1 ? 's' : ''} have missing data and will be skipped
                </span>
              </div>
            )}

            <div className="border rounded-lg overflow-x-auto max-h-[400px] overflow-y-auto" style={{ borderColor: theme.border }}>
              <table className="w-full text-sm">
                <thead className="sticky top-0">
                  <tr style={{ backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)' }}>
                    <th className="px-3 py-2 text-left font-semibold" style={{ color: theme.text }}>Name</th>
                    <th className="px-3 py-2 text-left font-semibold" style={{ color: theme.text }}>mg</th>
                    <th className="px-3 py-2 text-left font-semibold" style={{ color: theme.text }}>Qty</th>
                    <th className="px-3 py-2 text-left font-semibold" style={{ color: theme.text }}>Vendor</th>
                    <th className="px-3 py-2 text-left font-semibold" style={{ color: theme.text }}>Cost</th>
                    <th className="px-3 py-2 text-left font-semibold" style={{ color: theme.text }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mappedData.slice(0, 20).map((row) => {
                    const isValid = validRows.some(vr => vr.id === row.id);
                    return (
                      <tr 
                        key={row.id} 
                        className="border-t" 
                        style={{ 
                          borderColor: theme.border,
                          backgroundColor: !isValid ? (theme.isDark ? 'rgba(239, 68, 68, 0.05)' : 'rgba(239, 68, 68, 0.02)') : 'transparent'
                        }}
                      >
                        <td className="px-3 py-2" style={{ color: theme.text }}>{row.name || '—'}</td>
                        <td className="px-3 py-2" style={{ color: theme.text }}>{row.mg || '—'}</td>
                        <td className="px-3 py-2" style={{ color: theme.text }}>{row.quantity || '—'}</td>
                        <td className="px-3 py-2" style={{ color: theme.text }}>{row.vendor || '—'}</td>
                        <td className="px-3 py-2" style={{ color: theme.text }}>{row.cost || '—'}</td>
                        <td className="px-3 py-2">
                          {isValid ? (
                            <CheckCircle size={14} style={{ color: '#10b981' }} />
                          ) : (
                            <AlertCircle size={14} style={{ color: '#ef4444' }} />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {mappedData.length > 20 && (
              <div className="text-xs text-center" style={{ color: theme.textLight }}>
                Showing first 20 rows. {mappedData.length - 20} more row{mappedData.length - 20 !== 1 ? 's' : ''} will be processed.
              </div>
            )}

            <div className="p-3 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)' }}>
              <div className="text-sm font-semibold mb-2" style={{ color: theme.text }}>Summary:</div>
              <ul className="text-sm space-y-1" style={{ color: theme.textLight }}>
                <li>• {validRows.length} vial{validRows.length !== 1 ? 's' : ''} will be imported</li>
                {invalidRows.length > 0 && (
                  <li>• {invalidRows.length} row{invalidRows.length !== 1 ? 's' : ''} skipped (missing required fields)</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
