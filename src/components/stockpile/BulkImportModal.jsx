import React, { useState, useMemo, useEffect } from 'react';
import BottomSheet from '../common/BottomSheet';
import { generateId } from '../../utils/string';
import { PlusCircle, X, FileText, Clipboard, Upload, CheckCircle, AlertTriangle } from 'lucide-react';

export default function BulkImportModal({ open, onClose, theme, onSave }) {
  const [activeTab, setActiveTab] = useState('manual'); // 'manual' | 'paste' | 'csv'
  const [manualRows, setManualRows] = useState([{ id: generateId(), name: '', mg: '', quantity: '', vendor: '', cost: '' }]);
  const [pasteText, setPasteText] = useState('');
  const [parsedPasteData, setParsedPasteData] = useState([]);
  const [csvFile, setCsvFile] = useState(null);
  const [parsedCsvData, setParsedCsvData] = useState([]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setActiveTab('manual');
      setManualRows([{ id: generateId(), name: '', mg: '', quantity: '', vendor: '', cost: '' }]);
      setPasteText('');
      setParsedPasteData([]);
      setCsvFile(null);
      setParsedCsvData([]);
    }
  }, [open]);

  // Get current data based on active tab
  const currentData = useMemo(() => {
    if (activeTab === 'manual') return manualRows;
    if (activeTab === 'paste') return parsedPasteData;
    if (activeTab === 'csv') return parsedCsvData;
    return [];
  }, [activeTab, manualRows, parsedPasteData, parsedCsvData]);

  // Validate and count valid rows
  const validRows = useMemo(() => {
    return currentData.filter(row => {
      const name = (row.name || '').trim();
      const mg = (row.mg || '').trim();
      const quantity = (row.quantity || '').trim();
      return name && mg && quantity;
    });
  }, [currentData]);

  const handleAddRow = () => {
    setManualRows([...manualRows, { id: generateId(), name: '', mg: '', quantity: '', vendor: '', cost: '' }]);
  };

  const handleRemoveRow = (rowId) => {
    if (manualRows.length > 1) {
      setManualRows(manualRows.filter(r => r.id !== rowId));
    }
  };

  const handleManualRowChange = (rowId, field, value) => {
    setManualRows(manualRows.map(r => 
      r.id === rowId ? { ...r, [field]: value } : r
    ));
  };

  const handleParsePaste = () => {
    if (!pasteText.trim()) return;
    
    // Try to detect delimiter (tab, comma, or pipe)
    const lines = pasteText.trim().split('\n');
    const firstLine = lines[0];
    let delimiter = '\t';
    if (firstLine.includes(',')) delimiter = ',';
    else if (firstLine.includes('|')) delimiter = '|';
    
    const parsed = lines.map((line, index) => {
      const parts = line.split(delimiter).map(p => p.trim());
      return {
        id: generateId(),
        name: parts[0] || '',
        mg: parts[1] || '',
        quantity: parts[2] || '',
        vendor: parts[3] || '',
        cost: parts[4] || ''
      };
    }).filter(row => row.name || row.mg || row.quantity); // Remove completely empty rows
    
    setParsedPasteData(parsed);
  };

  const handleCsvFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setCsvFile(file);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
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
        
        // Skip header row if it looks like headers
        const startIndex = firstLine.toLowerCase().includes('name') || 
                          firstLine.toLowerCase().includes('peptide') ? 1 : 0;
        
        const parsed = lines.slice(startIndex).map((line) => {
          const parts = line.split(delimiter).map(p => p.trim().replace(/^"|"$/g, ''));
          return {
            id: generateId(),
            name: parts[0] || '',
            mg: parts[1] || '',
            quantity: parts[2] || '',
            vendor: parts[3] || '',
            cost: parts[4] || ''
          };
        }).filter(row => row.name || row.mg || row.quantity);
        
        setParsedCsvData(parsed);
      } catch (error) {
        console.error('Error parsing CSV:', error);
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { message: 'Couldn\'t read that file. Please make sure it\'s a valid CSV.', type: 'error' } 
        }));
      }
    };
    reader.onerror = () => {
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Failed to read CSV file', type: 'error' } 
      }));
    };
    reader.readAsText(file);
  };

  const handleSave = () => {
    if (validRows.length === 0) {
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Please add at least one valid vial entry', type: 'error' } 
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
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Bulk Import Vials"
      theme={theme}
      maxHeight="90vh"
      footer={
        <div className="w-full space-y-3">
          {/* Validation Message - Centered */}
          <div className="text-center">
            <div className="text-sm flex items-center justify-center gap-1.5" style={{ color: theme.textLight }}>
              {validRows.length > 0 ? (
                <><CheckCircle size={14} style={{ color: '#10b981' }} /> <span>{validRows.length} vial{validRows.length !== 1 ? 's' : ''} will be added</span></>
              ) : (
                <><AlertTriangle size={14} style={{ color: '#f59e0b' }} /> <span>No valid entries yet</span></>
              )}
            </div>
          </div>
          
          {/* Action Buttons - Bottom Aligned */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                color: theme.text,
                border: `1px solid ${theme.border}`
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={validRows.length === 0}
              className="flex-1 px-4 py-3 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: validRows.length > 0 ? theme.primary : theme.secondary,
                color: validRows.length > 0 ? theme.textOnPrimary : theme.text
              }}
            >
              Add to Stockpile
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 pb-4">
        {/* Tabs - Mobile Optimized */}
        <div className="flex gap-1 border-b overflow-x-auto" style={{ borderColor: theme.border }}>
          <button
            onClick={() => setActiveTab('manual')}
            className="px-3 py-2 text-xs sm:text-sm font-medium transition-all relative whitespace-nowrap flex-shrink-0"
            style={{
              color: activeTab === 'manual' ? theme.primary : theme.textLight,
              borderBottom: activeTab === 'manual' ? `2px solid ${theme.primary}` : '2px solid transparent'
            }}
          >
            <div className="flex items-center gap-1.5">
              <FileText size={14} />
              <span className="hidden sm:inline">Manual Entry</span>
              <span className="sm:hidden">Manual</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className="px-3 py-2 text-xs sm:text-sm font-medium transition-all relative whitespace-nowrap flex-shrink-0"
            style={{
              color: activeTab === 'paste' ? theme.primary : theme.textLight,
              borderBottom: activeTab === 'paste' ? `2px solid ${theme.primary}` : '2px solid transparent'
            }}
          >
            <div className="flex items-center gap-1.5">
              <Clipboard size={14} />
              <span className="hidden sm:inline">Paste from Excel</span>
              <span className="sm:hidden">Paste</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('csv')}
            className="px-3 py-2 text-xs sm:text-sm font-medium transition-all relative whitespace-nowrap flex-shrink-0"
            style={{
              color: activeTab === 'csv' ? theme.primary : theme.textLight,
              borderBottom: activeTab === 'csv' ? `2px solid ${theme.primary}` : '2px solid transparent'
            }}
          >
            <div className="flex items-center gap-1.5">
              <Upload size={14} />
              <span className="hidden sm:inline">Import CSV</span>
              <span className="sm:hidden">CSV</span>
            </div>
          </button>
        </div>

        {/* Tab Content */}
        <div className="min-h-[300px]">
          {activeTab === 'manual' && (
            <div className="space-y-4">
              {/* Tip - Below Manual Tab */}
              <div 
                className="text-xs text-center py-2 px-3 rounded-lg" 
                style={{ 
                  backgroundColor: `${theme.info || theme.primary}10`,
                  color: theme.textLight
                }}
              >
                <p className="leading-relaxed">
                  Add multiple vials at once.<br />
                  Name, Amount (mg), and Quantity are required.
                </p>
              </div>

              {/* Table Header */}
              <div className="grid grid-cols-12 gap-2 pb-2 border-b font-semibold text-xs uppercase tracking-wide" style={{ borderColor: theme.border, color: theme.textLight }}>
                <div className="col-span-5">Name</div>
                <div className="col-span-2">mg</div>
                <div className="col-span-2">Qty</div>
                <div className="col-span-2">Vendor</div>
                <div className="col-span-1"></div>
              </div>

              {/* Table Rows */}
              <div className="space-y-3 max-h-[350px] overflow-y-auto" style={{ overflowX: 'hidden' }}>
                {manualRows.map((row, index) => (
                  <div key={row.id} className="grid grid-cols-12 gap-2 items-center" style={{ minWidth: 0 }}>
                    <div className="col-span-5" style={{ minWidth: 0 }}>
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => handleManualRowChange(row.id, 'name', e.target.value)}
                        placeholder="e.g., Semaglutide"
                        className="w-full px-3 py-2 text-sm rounded-lg border outline-none transition-all"
                        style={{
                          backgroundColor: theme.inputBackground || (theme.isDark ? 'rgba(255,255,255,0.06)' : '#fff'),
                          borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : theme.border,
                          color: theme.text
                        }}
                      />
                    </div>
                    <div className="col-span-2" style={{ minWidth: 0 }}>
                      <input
                        type="text"
                        value={row.mg}
                        onChange={(e) => handleManualRowChange(row.id, 'mg', e.target.value)}
                        placeholder="10"
                        className="w-full px-3 py-2 text-sm rounded-lg border outline-none transition-all"
                        style={{
                          backgroundColor: theme.inputBackground || (theme.isDark ? 'rgba(255,255,255,0.06)' : '#fff'),
                          borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : theme.border,
                          color: theme.text
                        }}
                      />
                    </div>
                    <div className="col-span-2" style={{ minWidth: 0 }}>
                      <input
                        type="text"
                        value={row.quantity}
                        onChange={(e) => handleManualRowChange(row.id, 'quantity', e.target.value)}
                        placeholder="2"
                        className="w-full px-3 py-2 text-sm rounded-lg border outline-none transition-all"
                        style={{
                          backgroundColor: theme.inputBackground || (theme.isDark ? 'rgba(255,255,255,0.06)' : '#fff'),
                          borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : theme.border,
                          color: theme.text
                        }}
                      />
                    </div>
                    <div className="col-span-2" style={{ minWidth: 0 }}>
                      <input
                        type="text"
                        value={row.vendor}
                        onChange={(e) => handleManualRowChange(row.id, 'vendor', e.target.value)}
                        placeholder="Vendor"
                        className="w-full px-3 py-2 text-sm rounded-lg border outline-none transition-all"
                        style={{
                          backgroundColor: theme.inputBackground || (theme.isDark ? 'rgba(255,255,255,0.06)' : '#fff'),
                          borderColor: theme.border,
                          color: theme.text
                        }}
                      />
                    </div>
                    <div className="col-span-1 flex justify-center" style={{ minWidth: 0 }}>
                      {manualRows.length > 1 ? (
                        <button
                          onClick={() => handleRemoveRow(row.id)}
                          className="p-1.5 rounded-lg hover:opacity-70 transition-all flex-shrink-0"
                          style={{ 
                            color: theme.textLight,
                            backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'
                          }}
                        >
                          <X size={16} />
                        </button>
                      ) : (
                        <div style={{ width: '24px' }}></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleAddRow}
                className="w-full px-4 py-2.5 rounded-lg text-sm font-medium border transition-all flex items-center justify-center gap-2"
                style={{
                  backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                  borderColor: theme.border,
                  color: theme.primary
                }}
              >
                <PlusCircle size={16} />
                Add Row
              </button>
            </div>
          )}

          {activeTab === 'paste' && (
            <div className="space-y-4">
              {/* Tip - Matching Manual Entry Styling */}
              <div 
                className="text-xs text-center py-2 px-3 rounded-lg" 
                style={{ 
                  backgroundColor: `${theme.info || theme.primary}10`,
                  color: theme.textLight
                }}
              >
                <p className="leading-relaxed mb-2">
                  Paste your data from Excel (tab or comma separated).
                </p>
                <div className="font-mono text-xs leading-relaxed text-center">
                  Semaglutide    10    2    Vendor X    45
                </div>
              </div>
              
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Semaglutide    10    2    Vendor X    45&#10;BPC-157        5     3    Vendor Y    60"
                className="w-full px-3 py-2 rounded-lg border font-mono text-sm outline-none resize-none"
                rows={8}
                style={{
                  backgroundColor: theme.inputBackground || (theme.isDark ? 'rgba(255,255,255,0.06)' : '#fff'),
                  borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : theme.border,
                  color: theme.text
                }}
              />

              <button
                onClick={handleParsePaste}
                disabled={!pasteText.trim()}
                className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: pasteText.trim() ? theme.primary : theme.secondary,
                  color: pasteText.trim() ? theme.textOnPrimary : theme.text
                }}
              >
                Convert to Table
              </button>

              {parsedPasteData.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-semibold" style={{ color: theme.text }}>
                    Preview ({parsedPasteData.length} rows detected):
                  </div>
                  <div className="border rounded-lg overflow-x-auto" style={{ borderColor: theme.border }}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)' }}>
                          <th className="px-3 py-2 text-left font-semibold" style={{ color: theme.text }}>Name</th>
                          <th className="px-3 py-2 text-left font-semibold" style={{ color: theme.text }}>mg</th>
                          <th className="px-3 py-2 text-left font-semibold" style={{ color: theme.text }}>Qty</th>
                          <th className="px-3 py-2 text-left font-semibold" style={{ color: theme.text }}>Vendor</th>
                          <th className="px-3 py-2 text-left font-semibold" style={{ color: theme.text }}>Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedPasteData.map((row, index) => (
                          <tr key={row.id} className="border-t" style={{ borderColor: theme.border }}>
                            <td className="px-3 py-2" style={{ color: theme.text }}>{row.name || '—'}</td>
                            <td className="px-3 py-2" style={{ color: theme.text }}>{row.mg || '—'}</td>
                            <td className="px-3 py-2" style={{ color: theme.text }}>{row.quantity || '—'}</td>
                            <td className="px-3 py-2" style={{ color: theme.text }}>{row.vendor || '—'}</td>
                            <td className="px-3 py-2" style={{ color: theme.text }}>{row.cost || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'csv' && (
            <div className="space-y-4">
              {/* Tip - Matching Manual Entry Styling */}
              <div 
                className="text-xs text-center py-2 px-3 rounded-lg" 
                style={{ 
                  backgroundColor: `${theme.info || theme.primary}10`,
                  color: theme.textLight
                }}
              >
                <p className="leading-relaxed">
                  Upload a CSV file. Supported formats: .csv, .txt
                </p>
              </div>

              <label
                className="block w-full px-6 py-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-all hover:border-solid"
                style={{
                  borderColor: csvFile ? theme.primary : theme.border,
                  backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)'
                }}
              >
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleCsvFileChange}
                  className="hidden"
                />
                <Upload size={32} className="mx-auto mb-2" style={{ color: theme.primary }} />
                <div className="text-sm font-medium" style={{ color: theme.text }}>
                  {csvFile ? csvFile.name : 'Drop CSV file or click to browse'}
                </div>
              </label>

              {parsedCsvData.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-semibold" style={{ color: theme.text }}>
                    Preview ({parsedCsvData.length} rows detected):
                  </div>
                  <div className="border rounded-lg overflow-x-auto max-h-[300px] overflow-y-auto" style={{ borderColor: theme.border }}>
                    <table className="w-full text-sm">
                      <thead className="sticky top-0">
                        <tr style={{ backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)' }}>
                          <th className="px-3 py-2 text-left font-semibold" style={{ color: theme.text }}>Name</th>
                          <th className="px-3 py-2 text-left font-semibold" style={{ color: theme.text }}>mg</th>
                          <th className="px-3 py-2 text-left font-semibold" style={{ color: theme.text }}>Qty</th>
                          <th className="px-3 py-2 text-left font-semibold" style={{ color: theme.text }}>Vendor</th>
                          <th className="px-3 py-2 text-left font-semibold" style={{ color: theme.text }}>Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedCsvData.map((row, index) => (
                          <tr key={row.id} className="border-t" style={{ borderColor: theme.border }}>
                            <td className="px-3 py-2" style={{ color: theme.text }}>{row.name || '—'}</td>
                            <td className="px-3 py-2" style={{ color: theme.text }}>{row.mg || '—'}</td>
                            <td className="px-3 py-2" style={{ color: theme.text }}>{row.quantity || '—'}</td>
                            <td className="px-3 py-2" style={{ color: theme.text }}>{row.vendor || '—'}</td>
                            <td className="px-3 py-2" style={{ color: theme.text }}>{row.cost || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
