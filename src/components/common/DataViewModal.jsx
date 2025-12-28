// DataViewModal - Shows all user data in a readable format when trial expires
import React, { useMemo } from 'react';
import { X, FileText, Package, FlaskConical, ShoppingCart, Users, Download } from 'lucide-react';
import Modal from './Modal';
import { exportToCSV } from '../../utils/export';

export default function DataViewModal({ open, onClose, theme, userData }) {
  const { protocols, orders, stockpile, vendors, reconItems, supplements } = userData;

  // Calculate data summary
  const dataSummary = useMemo(() => ({
    protocols: protocols?.length || 0,
    orders: orders?.length || 0,
    stockpile: stockpile?.length || 0,
    vendors: vendors?.length || 0,
    reconItems: reconItems?.length || 0,
    supplements: supplements?.length || 0,
  }), [protocols, orders, stockpile, vendors, reconItems, supplements]);

  const totalItems = Object.values(dataSummary).reduce((sum, count) => sum + count, 0);

  const handleExport = () => {
    const allData = [
      ...(protocols || []).map(d => ({ type: 'protocol', ...d })),
      ...(orders || []).map(d => ({ type: 'order', ...d })),
      ...(stockpile || []).map(d => ({ type: 'stockpile', ...d })),
      ...(supplements || []).map(d => ({ type: 'supplement', ...d })),
      ...(vendors || []).map(d => ({ type: 'vendor', ...d })),
      ...(reconItems || []).map(d => ({ type: 'recon_item', ...d })),
    ];
    
    exportToCSV(allData, `tpprover-data-${new Date().toISOString().slice(0,10)}.csv`);
    
    window.dispatchEvent(new CustomEvent('tpp:toast', { 
      detail: { message: 'Data exported successfully!', type: 'success' } 
    }));
  };

  const DataSection = ({ icon: Icon, title, items, renderItem }) => {
    if (!items || items.length === 0) return null;

    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Icon size={18} style={{ color: theme.primary }} />
          <h3 className="font-semibold text-sm" style={{ color: theme.primaryDark }}>
            {title} ({items.length})
          </h3>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {items.slice(0, 10).map((item, idx) => (
            <div 
              key={idx}
              className="p-3 rounded-lg text-sm"
              style={{ 
                backgroundColor: theme?.isDark ? 'rgba(240, 238, 231, 0.05)' : '#f9fafb',
                border: `1px solid ${theme?.border}`
              }}
            >
              {renderItem(item)}
            </div>
          ))}
          {items.length > 10 && (
            <p className="text-xs text-center py-2" style={{ color: theme.textLight }}>
              ... and {items.length - 10} more items
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Your Research Data"
      theme={theme}
      maxWidth="max-w-3xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <p className="text-xs" style={{ color: theme.textLight }}>
            {totalItems} total items
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleExport}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 flex items-center gap-2"
              style={{
                backgroundColor: theme.primary,
                color: theme.textOnPrimary || '#ffffff'
              }}
            >
              <Download size={16} />
              Export All Data
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
              style={{
                backgroundColor: theme.secondary || '#e5e7eb',
                color: theme.text
              }}
            >
              Close
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div 
          className="rounded-lg p-4 text-center"
          style={{
            backgroundColor: theme?.isDark ? 'rgba(186, 166, 142, 0.1)' : 'rgba(186, 166, 142, 0.15)',
            border: `1px solid ${theme?.isDark ? 'rgba(186, 166, 142, 0.2)' : 'rgba(165, 148, 127, 0.3)'}`
          }}
        >
          <p className="text-sm font-semibold mb-2" style={{ color: theme.text }}>
            Your data is always yours
          </p>
          <p className="text-xs" style={{ color: theme.textLight }}>
            Review your research data below or export it as CSV.
          </p>
        </div>

        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          <DataSection
            icon={FlaskConical}
            title="Protocols"
            items={protocols}
            renderItem={(p) => (
              <>
                <div className="font-medium" style={{ color: theme.text }}>{p.name}</div>
                <div className="text-xs mt-1" style={{ color: theme.textLight }}>
                  {p.dosage} • {p.frequency}
                </div>
              </>
            )}
          />

          <DataSection
            icon={Package}
            title="Stockpile"
            items={stockpile}
            renderItem={(s) => (
              <>
                <div className="font-medium" style={{ color: theme.text }}>{s.name}</div>
                <div className="text-xs mt-1" style={{ color: theme.textLight }}>
                  {s.quantity} {s.unit} • {s.mg}mg
                </div>
              </>
            )}
          />

          <DataSection
            icon={ShoppingCart}
            title="Orders"
            items={orders}
            renderItem={(o) => (
              <>
                <div className="font-medium" style={{ color: theme.text }}>{o.item || 'Order'}</div>
                <div className="text-xs mt-1" style={{ color: theme.textLight }}>
                  {o.vendor} • {o.status}
                </div>
              </>
            )}
          />

          <DataSection
            icon={Users}
            title="Vendors"
            items={vendors}
            renderItem={(v) => (
              <>
                <div className="font-medium" style={{ color: theme.text }}>{v.name}</div>
                {v.website && (
                  <div className="text-xs mt-1" style={{ color: theme.textLight }}>
                    {v.website}
                  </div>
                )}
              </>
            )}
          />

          <DataSection
            icon={FileText}
            title="Supplements"
            items={supplements}
            renderItem={(s) => (
              <>
                <div className="font-medium" style={{ color: theme.text }}>{s.name}</div>
                <div className="text-xs mt-1" style={{ color: theme.textLight }}>
                  {s.type}
                </div>
              </>
            )}
          />

          {totalItems === 0 && (
            <div className="text-center py-12">
              <FileText size={48} className="mx-auto mb-4" style={{ color: theme.textLight, opacity: 0.5 }} />
              <p className="text-sm" style={{ color: theme.textLight }}>
                No data found
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

