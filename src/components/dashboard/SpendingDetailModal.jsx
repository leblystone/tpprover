import React, { useMemo, useState, useEffect, useRef } from 'react';
import { DollarSign, ChevronDown } from 'lucide-react';
import BottomSheet from '../common/BottomSheet';
import SearchableDropdown from '../common/SearchableDropdown';
import { formatCurrency } from '../../utils/currencyUtils';
import { buildSpendLines, filterSpendLines, getUniqueVendorsAndPeptides } from '../../utils/spendingUtils';

function useLocal(key, fallback, refreshWhen) {
  const [value, setValue] = useState(fallback);
  const fallbackRef = useRef(fallback);
  fallbackRef.current = fallback;
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      setValue(raw ? JSON.parse(raw) : fallbackRef.current);
    } catch {
      setValue(fallbackRef.current);
    }
  }, [key, refreshWhen]);
  return value;
}

export default function SpendingDetailModal({ open, onClose, theme }) {
  const orders = useLocal('tpprover_orders', [], open);
  const stockpile = useLocal('tpprover_stockpile', [], open);
  const settings = useLocal('tpprover_settings', {}, open);

  const [vendorFilter, setVendorFilter] = useState('');
  const [peptideFilter, setPeptideFilter] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState('all');
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  const dateRangeRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dateRangeRef.current && !dateRangeRef.current.contains(e.target)) setDateRangeOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const allLines = useMemo(
    () => buildSpendLines(orders, stockpile, settings),
    [orders, stockpile, settings]
  );

  const { vendors, peptides } = useMemo(
    () => getUniqueVendorsAndPeptides(allLines),
    [allLines]
  );

  const vendorOptions = useMemo(
    () => [{ value: '', label: 'All vendors' }, ...vendors.map((v) => ({ value: v, label: v }))],
    [vendors]
  );
  const peptideOptions = useMemo(
    () => [{ value: '', label: 'All peptides' }, ...peptides.map((p) => ({ value: p, label: p }))],
    [peptides]
  );
  const dateRangeLabels = { all: 'All time', last30: 'Last 30 days', last90: 'Last 90 days', lastMonth: 'Last month' };

  const filteredLines = useMemo(
    () =>
      filterSpendLines(allLines, {
        vendor: vendorFilter || undefined,
        peptide: peptideFilter || undefined,
        dateRange: dateRangeFilter,
      }),
    [allLines, vendorFilter, peptideFilter, dateRangeFilter]
  );

  const filteredTotal = useMemo(
    () => filteredLines.reduce((sum, l) => sum + l.amount, 0),
    [filteredLines]
  );

  const byVendor = useMemo(() => {
    const map = filteredLines.reduce((acc, l) => {
      const v = l.vendor || 'Unknown';
      acc[v] = (acc[v] || 0) + l.amount;
      return acc;
    }, {});
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [filteredLines]);

  const byPeptide = useMemo(() => {
    const map = filteredLines.reduce((acc, l) => {
      const p = l.peptide || 'Unknown';
      acc[p] = (acc[p] || 0) + l.amount;
      return acc;
    }, {});
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [filteredLines]);

  const maxVendor = Math.max(1, ...byVendor.map(([, v]) => v));
  const maxPeptide = Math.max(1, ...byPeptide.map(([, v]) => v));

  const perOrderRows = useMemo(() => {
    const orderMap = new Map();
    let stockpileTotal = 0;
    filteredLines.forEach((l) => {
      if (l.source === 'order' && l.orderId) {
        const cur = orderMap.get(l.orderId) || { date: l.date, vendor: l.vendor, total: 0 };
        cur.total += l.amount;
        orderMap.set(l.orderId, cur);
      } else if (l.source === 'stockpile') {
        stockpileTotal += l.amount;
      }
    });
    const rows = Array.from(orderMap.entries()).map(([orderId, { date, vendor, total }]) => ({
      orderId,
      date,
      vendor: vendor || 'Unknown',
      total,
    }));
    rows.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const out = rows.slice(0, 15);
    if (stockpileTotal > 0) {
      out.push({ orderId: '_stockpile', date: null, vendor: 'Stockpile / Manual', total: stockpileTotal });
    }
    return out;
  }, [filteredLines]);

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Spending breakdown"
      theme={theme}
      maxHeight="90vh"
      footer={
        <div className="w-full p-4 pt-2" style={{ borderColor: theme.border, borderTopWidth: '1px' }}>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-xl font-semibold text-white transition-opacity hover:opacity-90 btn-primary-inset"
            style={{ backgroundColor: theme.primary }}
          >
            Close
          </button>
        </div>
      }
    >
      <div className="space-y-4 pb-2">
        {/* Filters - one compact row, protocol-style dropdowns */}
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-stretch">
          <div className="min-w-0">
            <SearchableDropdown
              options={vendorOptions}
              value={vendorFilter}
              onChange={setVendorFilter}
              placeholder="All vendors"
              theme={theme}
              idleMessage="Type to search vendors"
              emptyMessage="No vendors match"
            />
          </div>
          <div className="min-w-0">
            <SearchableDropdown
              options={peptideOptions}
              value={peptideFilter}
              onChange={setPeptideFilter}
              placeholder="All peptides"
              theme={theme}
              idleMessage="Type to search peptides"
              emptyMessage="No peptides match"
            />
          </div>
          <div className="relative flex-shrink-0" ref={dateRangeRef}>
            <button
              type="button"
              onClick={() => setDateRangeOpen((o) => !o)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-sm min-w-[100px]"
              style={{
                borderColor: theme.border,
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : (theme.inputBackground || '#fff'),
                color: theme.text,
                boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)',
              }}
            >
              <span className="truncate">{dateRangeLabels[dateRangeFilter] || dateRangeFilter}</span>
              <ChevronDown size={14} style={{ color: theme.textLight, flexShrink: 0 }} />
            </button>
            {dateRangeOpen && (
              <div
                className="absolute top-full right-0 mt-1 z-50 rounded-lg shadow-lg border overflow-hidden"
                style={{
                  backgroundColor: theme.isDark ? theme.cardBackground : '#ffffff',
                  borderColor: theme.border,
                  minWidth: '100%',
                  boxShadow: theme.isDark ? '0 4px 6px rgba(0,0,0,0.3)' : '0 4px 6px rgba(0,0,0,0.1)',
                }}
                data-dropdown-container
              >
                {['all', 'last30', 'last90', 'lastMonth'].map((key, idx) => (
                  <button
                    key={key}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onTouchStart={(e) => e.preventDefault()}
                    onClick={() => {
                      setDateRangeFilter(key);
                      setDateRangeOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm transition-all touch-manipulation"
                    style={{
                      color: dateRangeFilter === key ? theme.primary : theme.text,
                      backgroundColor: 'transparent',
                      WebkitTapHighlightColor: 'transparent',
                      borderTop: idx > 0 ? `1px solid ${theme.border}` : undefined,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = theme.primaryLight || `${theme.primary}20`;
                      e.currentTarget.style.color = theme.primary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = dateRangeFilter === key ? theme.primary : theme.text;
                    }}
                  >
                    {dateRangeLabels[key]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Filtered total */}
        <div className="p-4 rounded-lg border flex items-center justify-between" style={{ borderColor: theme.border, backgroundColor: theme.secondary }}>
          <span className="text-sm font-medium" style={{ color: theme.text }}>Total (filtered)</span>
          <span className="text-lg font-semibold flex items-center gap-1" style={{ color: theme.primary }}>
            <DollarSign size={20} />
            {formatCurrency(filteredTotal)}
          </span>
        </div>

        {/* By Vendor */}
        <div>
          <h4 className="text-sm font-semibold mb-2" style={{ color: theme.text }}>By vendor</h4>
          {byVendor.length === 0 ? (
            <p className="text-xs" style={{ color: theme.textLight }}>No data for current filters.</p>
          ) : (
            <div className="space-y-1.5">
              {byVendor.map(([name, val]) => (
                <div key={name}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="truncate pr-2" style={{ color: theme.text }}>{name}</span>
                    <span style={{ color: theme.text }}>{formatCurrency(val)}</span>
                  </div>
                  <div
                    className="h-2 rounded overflow-hidden"
                    style={{ backgroundColor: theme.border }}
                  >
                    <div
                      className="h-2 rounded"
                      style={{
                        width: `${(val / maxVendor) * 100}%`,
                        backgroundColor: theme.primary,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* By Peptide */}
        <div>
          <h4 className="text-sm font-semibold mb-2" style={{ color: theme.text }}>By peptide</h4>
          {byPeptide.length === 0 ? (
            <p className="text-xs" style={{ color: theme.textLight }}>No data for current filters.</p>
          ) : (
            <div className="space-y-1.5">
              {byPeptide.map(([name, val]) => (
                <div key={name}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="truncate pr-2" style={{ color: theme.text }}>{name}</span>
                    <span style={{ color: theme.text }}>{formatCurrency(val)}</span>
                  </div>
                  <div
                    className="h-2 rounded overflow-hidden"
                    style={{ backgroundColor: theme.border }}
                  >
                    <div
                      className="h-2 rounded"
                      style={{
                        width: `${(val / maxPeptide) * 100}%`,
                        backgroundColor: theme.primary,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Per Order */}
        {perOrderRows.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2" style={{ color: theme.text }}>Per order</h4>
            <div className="max-h-48 overflow-y-auto rounded border text-xs" style={{ borderColor: theme.border }}>
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: theme.secondary, color: theme.textLight }}>
                    <th className="text-left py-2 px-2 font-medium">Date</th>
                    <th className="text-left py-2 px-2 font-medium">Vendor</th>
                    <th className="text-right py-2 px-2 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {perOrderRows.map((row, i) => (
                    <tr key={row.orderId} style={{ borderTop: i > 0 ? `1px solid ${theme.border}` : undefined }}>
                      <td className="py-1.5 px-2" style={{ color: theme.text }}>{row.date || '—'}</td>
                      <td className="py-1.5 px-2 truncate max-w-[120px]" style={{ color: theme.text }}>{row.vendor}</td>
                      <td className="py-1.5 px-2 text-right font-medium" style={{ color: theme.text }}>{formatCurrency(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
