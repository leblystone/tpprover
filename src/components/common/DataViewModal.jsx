// DataViewModal - Shows all user data in a readable format when trial expires
import React, { useMemo, useState, useEffect } from 'react';
import { X, FileText, Package, FlaskConical, ShoppingCart, Users, Download, Eye, Target, Calendar, BarChart3, Clock, BookOpen } from 'lucide-react';
import Modal from './Modal';
import { exportUserDataToCSV, exportUserDataToPDF } from '../../utils/export';

export default function DataViewModal({ open, onClose, theme, userData }) {
  const { 
    protocols, orders, stockpile, vendors, reconItems, supplements, 
    reconHistory, metrics, scheduledBuys, calendarNotes, glossary 
  } = userData;
  const [selectedProtocol, setSelectedProtocol] = useState(null);
  const [selectedStockpile, setSelectedStockpile] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [selectedSupplement, setSelectedSupplement] = useState(null);
  const [selectedReconHistory, setSelectedReconHistory] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [selectedScheduledBuy, setSelectedScheduledBuy] = useState(null);
  const [selectedCalendarNote, setSelectedCalendarNote] = useState(null);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [selectedProtocolHistory, setSelectedProtocolHistory] = useState(null);
  const [selectedGlossary, setSelectedGlossary] = useState(null);
  const [selectedReconItem, setSelectedReconItem] = useState(null);

  // Load additional data from localStorage if not provided
  const [goals, setGoals] = useState([]);
  const [protocolHistory, setProtocolHistory] = useState([]);

  useEffect(() => {
    if (open) {
      // Load goals
      try {
        const savedGoals = JSON.parse(localStorage.getItem('tpprover_user_goals') || '[]');
        setGoals(savedGoals);
      } catch (e) {
        setGoals([]);
      }

      // Load protocol history
      try {
        const savedHistory = JSON.parse(localStorage.getItem('tpprover_protocol_history') || '[]');
        setProtocolHistory(savedHistory);
      } catch (e) {
        setProtocolHistory([]);
      }
    }
  }, [open]);

  // Calculate data summary
  const dataSummary = useMemo(() => {
    const calendarNoteCount = calendarNotes && typeof calendarNotes === 'object' && !Array.isArray(calendarNotes)
      ? Object.keys(calendarNotes).length
      : (Array.isArray(calendarNotes) ? calendarNotes.length : 0);
    
    return {
      protocols: protocols?.length || 0,
      orders: orders?.length || 0,
      stockpile: stockpile?.length || 0,
      vendors: vendors?.length || 0,
      reconItems: reconItems?.length || 0,
      supplements: supplements?.length || 0,
      reconHistory: reconHistory?.length || 0,
      metrics: metrics?.length || 0,
      scheduledBuys: scheduledBuys?.length || 0,
      calendarNotes: calendarNoteCount,
      goals: goals?.length || 0,
      protocolHistory: protocolHistory?.length || 0,
      glossary: glossary?.length || 0,
    };
  }, [protocols, orders, stockpile, vendors, reconItems, supplements, reconHistory, metrics, scheduledBuys, calendarNotes, goals, protocolHistory, glossary]);

  const totalItems = Object.values(dataSummary).reduce((sum, count) => sum + count, 0);

  const getAllData = () => {
    // Convert calendarNotes object to array if needed
    const calendarNotesArray = calendarNotes && typeof calendarNotes === 'object' && !Array.isArray(calendarNotes)
      ? Object.entries(calendarNotes).map(([date, note]) => ({ date, note: typeof note === 'string' ? note : JSON.stringify(note) }))
      : (calendarNotes || []);

    return {
      protocols: protocols || [],
      orders: orders || [],
      stockpile: stockpile || [],
      supplements: supplements || [],
      vendors: vendors || [],
      reconItems: reconItems || [],
      reconHistory: reconHistory || [],
      metrics: metrics || [],
      scheduledBuys: scheduledBuys || [],
      calendarNotes: calendarNotesArray,
      goals: goals || [],
      protocolHistory: protocolHistory || [],
      glossary: glossary || [],
    };
  };

  const handleExportCSV = () => {
    const data = getAllData();
    exportUserDataToCSV(data);
    
    window.dispatchEvent(new CustomEvent('tpp:toast', { 
      detail: { message: 'Data exported successfully as CSV!', type: 'success' } 
    }));
  };

  const handleExportPDF = async () => {
    try {
      const data = getAllData();
      await exportUserDataToPDF(data, null, theme);
      
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Data exported successfully as PDF!', type: 'success' } 
      }));
    } catch (error) {
      console.error('PDF export error:', error);
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'PDF export failed. Please try again.', type: 'error' } 
      }));
    }
  };

  const DataSection = ({ icon: Icon, title, items, renderItem, onItemClick }) => {
    if (!items || items.length === 0) return null;

    return (
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon size={14} style={{ color: theme.primary }} />
          <h3 className="font-semibold text-xs uppercase tracking-wide" style={{ color: theme.primaryDark }}>
            {title} ({items.length})
          </h3>
        </div>
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {items.map((item, idx) => (
            <div 
              key={idx}
              className={`p-2 rounded-lg text-xs transition-all ${onItemClick ? 'cursor-pointer hover:opacity-80' : ''}`}
              style={{ 
                backgroundColor: theme?.isDark ? 'rgba(240, 238, 231, 0.05)' : '#f9fafb',
                border: `1px solid ${theme?.border}`
              }}
              onClick={() => onItemClick && onItemClick(item)}
            >
              {renderItem(item)}
            </div>
          ))}
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
        <div className="flex items-center justify-between w-full gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-1 rounded-full font-medium" style={{ 
              backgroundColor: theme.primary + '15', 
              color: theme.primary 
            }}>
              {totalItems} items
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90 flex items-center gap-1.5 border"
              style={{
                borderColor: theme.border,
                color: theme.text
              }}
            >
              <Download size={14} />
              CSV
            </button>
            <button
              onClick={handleExportPDF}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90 flex items-center gap-1.5"
              style={{
                backgroundColor: theme.primary,
                color: theme.textOnPrimary || '#ffffff'
              }}
            >
              <Download size={14} />
              PDF
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
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
      <div className="space-y-3">
        <DataSection
          icon={FlaskConical}
          title="Protocols"
          items={protocols}
          onItemClick={(p) => setSelectedProtocol(p)}
          renderItem={(p) => (
            <>
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm" style={{ color: theme.text }}>
                  {p.protocolName || p.name || 'Unnamed Protocol'}
                </div>
                <Eye size={12} style={{ color: theme.primary }} />
              </div>
              {p.peptides && p.peptides.length > 0 && (
                <div className="text-[10px] mt-0.5" style={{ color: theme.textLight }}>
                  {p.peptides.length} peptide{p.peptides.length !== 1 ? 's' : ''}
                </div>
              )}
            </>
          )}
        />

        <DataSection
          icon={Package}
          title="Stockpile"
          items={stockpile}
          onItemClick={(s) => setSelectedStockpile(s)}
          renderItem={(s) => (
            <>
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm" style={{ color: theme.text }}>{s.name}</div>
                <Eye size={12} style={{ color: theme.primary }} />
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: theme.textLight }}>
                {s.quantity} {s.unit} • {s.mg}mg
              </div>
            </>
          )}
        />

        <DataSection
          icon={ShoppingCart}
          title="Orders"
          items={orders}
          onItemClick={(o) => setSelectedOrder(o)}
          renderItem={(o) => (
            <>
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm" style={{ color: theme.text }}>{o.item || 'Order'}</div>
                <Eye size={12} style={{ color: theme.primary }} />
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: theme.textLight }}>
                {o.vendor} • {o.status}
              </div>
            </>
          )}
        />

        <DataSection
          icon={Users}
          title="Vendors"
          items={vendors}
          onItemClick={(v) => setSelectedVendor(v)}
          renderItem={(v) => (
            <>
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm" style={{ color: theme.text }}>{v.name}</div>
                <Eye size={12} style={{ color: theme.primary }} />
              </div>
              {v.website && (
                <div className="text-[10px] mt-0.5" style={{ color: theme.textLight }}>
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
          onItemClick={(s) => setSelectedSupplement(s)}
          renderItem={(s) => (
            <>
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm" style={{ color: theme.text }}>{s.name}</div>
                <Eye size={12} style={{ color: theme.primary }} />
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: theme.textLight }}>
                {s.type}
              </div>
            </>
          )}
        />

        <DataSection
          icon={Clock}
          title="Reconstitution History"
          items={reconHistory}
          onItemClick={(r) => setSelectedReconHistory(r)}
          renderItem={(r) => (
            <>
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm" style={{ color: theme.text }}>{r.name || r.peptide || 'Reconstitution'}</div>
                <Eye size={12} style={{ color: theme.primary }} />
              </div>
              {r.date && (
                <div className="text-[10px] mt-0.5" style={{ color: theme.textLight }}>
                  {new Date(r.date).toLocaleDateString()}
                </div>
              )}
            </>
          )}
        />

        <DataSection
          icon={BarChart3}
          title="Metrics"
          items={metrics}
          onItemClick={(m) => setSelectedMetric(m)}
          renderItem={(m) => (
            <>
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm" style={{ color: theme.text }}>{m.name || 'Metric'}</div>
                <Eye size={12} style={{ color: theme.primary }} />
              </div>
              {m.date && (
                <div className="text-[10px] mt-0.5" style={{ color: theme.textLight }}>
                  {new Date(m.date).toLocaleDateString()} • {m.value} {m.unit || ''}
                </div>
              )}
            </>
          )}
        />

        <DataSection
          icon={ShoppingCart}
          title="Scheduled Buys"
          items={scheduledBuys}
          onItemClick={(sb) => setSelectedScheduledBuy(sb)}
          renderItem={(sb) => (
            <>
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm" style={{ color: theme.text }}>{sb.item || 'Scheduled Buy'}</div>
                <Eye size={12} style={{ color: theme.primary }} />
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: theme.textLight }}>
                {sb.vendor} • {sb.scheduledDate ? new Date(sb.scheduledDate).toLocaleDateString() : 'No date'}
              </div>
            </>
          )}
        />

        <DataSection
          icon={Calendar}
          title="Calendar Notes"
          items={calendarNotes && typeof calendarNotes === 'object' && !Array.isArray(calendarNotes)
            ? Object.entries(calendarNotes).map(([date, note]) => ({ date, note: typeof note === 'string' ? note : JSON.stringify(note) }))
            : (Array.isArray(calendarNotes) ? calendarNotes : [])}
          onItemClick={(cn) => setSelectedCalendarNote(cn)}
          renderItem={(cn) => (
            <>
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm" style={{ color: theme.text }}>
                  {cn.date ? new Date(cn.date).toLocaleDateString() : 'Note'}
                </div>
                <Eye size={12} style={{ color: theme.primary }} />
              </div>
              <div className="text-[10px] mt-0.5 line-clamp-2" style={{ color: theme.textLight }}>
                {cn.note || ''}
              </div>
            </>
          )}
        />

        <DataSection
          icon={Target}
          title="Goals"
          items={goals}
          onItemClick={(g) => setSelectedGoal(g)}
          renderItem={(g) => (
            <>
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm flex items-center gap-2" style={{ color: theme.text }}>
                  {g.title || 'Goal'}
                  {g.completed && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: theme.success + '20', color: theme.success }}>
                      ✓
                    </span>
                  )}
                </div>
                <Eye size={12} style={{ color: theme.primary }} />
              </div>
              {g.targetDate && (
                <div className="text-[10px] mt-0.5" style={{ color: theme.textLight }}>
                  Target: {new Date(g.targetDate).toLocaleDateString()}
                </div>
              )}
            </>
          )}
        />

        <DataSection
          icon={FlaskConical}
          title="Protocol History"
          items={protocolHistory}
          onItemClick={(ph) => setSelectedProtocolHistory(ph)}
          renderItem={(ph) => (
            <>
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm" style={{ color: theme.text }}>
                  {ph.protocolName || 'Protocol History'}
                </div>
                <Eye size={12} style={{ color: theme.primary }} />
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: theme.textLight }}>
                {ph.startDate ? `Started: ${new Date(ph.startDate).toLocaleDateString()}` : ''}
                {ph.endDate ? ` • Ended: ${new Date(ph.endDate).toLocaleDateString()}` : ' • Active'}
                {ph.notes && ph.notes.length > 0 && ` • ${ph.notes.length} note${ph.notes.length !== 1 ? 's' : ''}`}
              </div>
            </>
          )}
        />

        <DataSection
          icon={BookOpen}
          title="Glossary"
          items={glossary}
          onItemClick={(g) => setSelectedGlossary(g)}
          renderItem={(g) => (
            <>
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm" style={{ color: theme.text }}>{g.term || 'Term'}</div>
                <Eye size={12} style={{ color: theme.primary }} />
              </div>
              <div className="text-[10px] mt-0.5 line-clamp-2" style={{ color: theme.textLight }}>
                {g.definition || ''}
              </div>
            </>
          )}
        />

        {totalItems === 0 && (
          <div className="text-center py-8">
            <FileText size={32} className="mx-auto mb-2" style={{ color: theme.textLight, opacity: 0.5 }} />
            <p className="text-xs" style={{ color: theme.textLight }}>
              No data found
            </p>
          </div>
        )}
      </div>

      {/* Protocol Detail Modal - Render outside main modal */}
      {selectedProtocol && (
        <ProtocolDetailModal
          open={!!selectedProtocol}
          onClose={() => setSelectedProtocol(null)}
          protocol={selectedProtocol}
          theme={theme}
        />
      )}

      {/* Stockpile Detail Modal - Render outside main modal */}
      {selectedStockpile && (
        <StockpileDetailModal
          open={!!selectedStockpile}
          onClose={() => setSelectedStockpile(null)}
          stockpile={selectedStockpile}
          theme={theme}
        />
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          open={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          order={selectedOrder}
          theme={theme}
        />
      )}

      {/* Vendor Detail Modal */}
      {selectedVendor && (
        <VendorDetailModal
          open={!!selectedVendor}
          onClose={() => setSelectedVendor(null)}
          vendor={selectedVendor}
          theme={theme}
        />
      )}

      {/* Supplement Detail Modal */}
      {selectedSupplement && (
        <SupplementDetailModal
          open={!!selectedSupplement}
          onClose={() => setSelectedSupplement(null)}
          supplement={selectedSupplement}
          theme={theme}
        />
      )}

      {/* Recon History Detail Modal */}
      {selectedReconHistory && (
        <ReconHistoryDetailModal
          open={!!selectedReconHistory}
          onClose={() => setSelectedReconHistory(null)}
          reconHistory={selectedReconHistory}
          theme={theme}
        />
      )}

      {/* Metric Detail Modal */}
      {selectedMetric && (
        <MetricDetailModal
          open={!!selectedMetric}
          onClose={() => setSelectedMetric(null)}
          metric={selectedMetric}
          theme={theme}
        />
      )}

      {/* Scheduled Buy Detail Modal */}
      {selectedScheduledBuy && (
        <ScheduledBuyDetailModal
          open={!!selectedScheduledBuy}
          onClose={() => setSelectedScheduledBuy(null)}
          scheduledBuy={selectedScheduledBuy}
          theme={theme}
        />
      )}

      {/* Calendar Note Detail Modal */}
      {selectedCalendarNote && (
        <CalendarNoteDetailModal
          open={!!selectedCalendarNote}
          onClose={() => setSelectedCalendarNote(null)}
          calendarNote={selectedCalendarNote}
          theme={theme}
        />
      )}

      {/* Goal Detail Modal */}
      {selectedGoal && (
        <GoalDetailModal
          open={!!selectedGoal}
          onClose={() => setSelectedGoal(null)}
          goal={selectedGoal}
          theme={theme}
        />
      )}

      {/* Protocol History Detail Modal */}
      {selectedProtocolHistory && (
        <ProtocolHistoryDetailModal
          open={!!selectedProtocolHistory}
          onClose={() => setSelectedProtocolHistory(null)}
          protocolHistory={selectedProtocolHistory}
          theme={theme}
        />
      )}

      {/* Glossary Detail Modal */}
      {selectedGlossary && (
        <GlossaryDetailModal
          open={!!selectedGlossary}
          onClose={() => setSelectedGlossary(null)}
          glossary={selectedGlossary}
          theme={theme}
        />
      )}
    </Modal>
  );
}

// Separate component for protocol detail modal to avoid nesting issues
function ProtocolDetailModal({ open, onClose, protocol, theme }) {
  // Format duration for display
  const formatDuration = (duration) => {
    if (!duration) return 'Not set';
    if (typeof duration === 'string') return duration;
    if (typeof duration === 'object') {
      if (duration.noEnd) return 'Ongoing';
      if (duration.count && duration.unit) {
        const unit = String(duration.unit).toLowerCase();
        return `${duration.count} ${unit}${duration.count !== '1' ? 's' : ''}`;
      }
    }
    return 'Not set';
  };

  // Format washout for display
  const formatWashout = (washout) => {
    if (!washout || washout.enabled === false) return 'No';
    if (washout.count && washout.unit) {
      const unit = String(washout.unit).toLowerCase();
      return `${washout.count} ${unit}${washout.count !== '1' ? 's' : ''}`;
    }
    return washout.enabled ? 'Yes' : 'No';
  };

  // Format frequency for display
  const formatFrequency = (frequency) => {
    if (!frequency) return 'Not set';
    if (typeof frequency === 'string') return frequency;
    if (typeof frequency === 'object') {
      const type = frequency.type || 'daily';
      if (type === 'daily') {
        const times = Array.isArray(frequency.time) ? frequency.time.join(', ') : (frequency.time || '');
        return times ? `Daily (${times})` : 'Daily';
      }
      if (type === 'weekly' && frequency.days) {
        const days = Array.isArray(frequency.days) ? frequency.days.join(', ') : frequency.days;
        return `Weekly (${days})`;
      }
      if (type === 'cycle') {
        return `Cycle: ${frequency.onDays || '-'} on / ${frequency.offDays || '-'} off`;
      }
      if (type === 'custom') {
        return frequency.customDays ? `Every ${frequency.customDays} days` : 'Custom';
      }
      return type;
    }
    return String(frequency);
  };

  // Format dosage for display
  const formatDosage = (dosage) => {
    if (!dosage) return 'Not set';
    if (typeof dosage === 'string') return dosage;
    if (typeof dosage === 'number') return String(dosage);
    if (typeof dosage === 'object') {
      // Handle {amount, unit} structure
      if (dosage.amount !== undefined && dosage.amount !== null && dosage.unit) {
        return `${dosage.amount} ${dosage.unit}`;
      }
      if (dosage.amount !== undefined && dosage.amount !== null) {
        return String(dosage.amount);
      }
      if (dosage.unit) {
        return dosage.unit;
      }
      // If it's an object but we can't format it, return empty
      return '';
    }
    return String(dosage);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      onBack={onClose}
      title="Protocol Details"
      theme={theme}
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-bold mb-3" style={{ color: theme.primaryDark }}>
            {protocol.protocolName || protocol.name || 'Unnamed Protocol'}
          </h3>
        </div>

        {/* Protocol Info - Two Column Layout */}
        <div className="grid grid-cols-2 gap-3">
          {protocol.duration && (
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wide block mb-1" style={{ color: theme.textLight }}>
                Duration
              </span>
              <p className="text-xs" style={{ color: theme.text }}>
                {formatDuration(protocol.duration)}
              </p>
            </div>
          )}

          {protocol.washout && (
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wide block mb-1" style={{ color: theme.textLight }}>
                Washout
              </span>
              <p className="text-xs" style={{ color: theme.text }}>
                {formatWashout(protocol.washout)}
              </p>
            </div>
          )}

          {protocol.startDate && (
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wide block mb-1" style={{ color: theme.textLight }}>
                Start Date
              </span>
              <p className="text-xs" style={{ color: theme.text }}>
                {new Date(protocol.startDate).toLocaleDateString()}
              </p>
            </div>
          )}

          {protocol.endDate && (
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wide block mb-1" style={{ color: theme.textLight }}>
                End Date
              </span>
              <p className="text-xs" style={{ color: theme.text }}>
                {new Date(protocol.endDate).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        {protocol.notes && (
          <div className="pt-2 border-t" style={{ borderColor: theme.border }}>
            <span className="text-[10px] font-semibold uppercase tracking-wide block mb-1" style={{ color: theme.textLight }}>
              Notes
            </span>
            <p className="text-xs whitespace-pre-wrap" style={{ color: theme.text }}>
              {protocol.notes}
            </p>
          </div>
        )}

        {/* Peptides */}
        {protocol.peptides && protocol.peptides.length > 0 && (
          <div className="mt-4 pt-4 border-t" style={{ borderColor: theme.border }}>
            <h4 className="text-xs font-bold mb-3 uppercase tracking-wide" style={{ color: theme.primaryDark }}>
              Peptides ({protocol.peptides.length})
            </h4>
            <div className="space-y-2">
              {protocol.peptides.map((pep, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg"
                  style={{
                    backgroundColor: theme?.isDark ? 'rgba(240, 238, 231, 0.05)' : '#f9fafb',
                    border: `1px solid ${theme?.border}`
                  }}
                >
                  <div className="font-medium mb-2 text-xs" style={{ color: theme.text }}>
                    {pep.name || `Peptide ${idx + 1}`}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {pep.dosage && (
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wide block mb-0.5" style={{ color: theme.textLight }}>
                          Dosage
                        </span>
                        <p className="text-xs" style={{ color: theme.text }}>
                          {formatDosage(pep.dosage)}
                        </p>
                      </div>
                    )}
                    {pep.frequency && (
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wide block mb-0.5" style={{ color: theme.textLight }}>
                          Frequency
                        </span>
                        <p className="text-xs" style={{ color: theme.text }}>
                          {formatFrequency(pep.frequency)}
                        </p>
                      </div>
                    )}
                    {pep.deliveryMethod && (
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wide block mb-0.5" style={{ color: theme.textLight }}>
                          Delivery
                        </span>
                        <p className="text-xs" style={{ color: theme.text }}>
                          {pep.deliveryMethod}
                        </p>
                      </div>
                    )}
                    {pep.administrationRoute && (
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wide block mb-0.5" style={{ color: theme.textLight }}>
                          Route
                        </span>
                        <p className="text-xs" style={{ color: theme.text }}>
                          {pep.administrationRoute}
                        </p>
                      </div>
                    )}
                  </div>
                  {pep.notes && (
                    <div className="text-xs mt-2 pt-2 border-t" style={{ borderColor: theme.border, color: theme.textLight }}>
                      {pep.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// Separate component for stockpile detail modal to avoid nesting issues
function StockpileDetailModal({ open, onClose, stockpile, theme }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      onBack={onClose}
      title="Stockpile Details"
      theme={theme}
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-bold mb-3" style={{ color: theme.primaryDark }}>
            {stockpile.name || 'Stockpile Item'}
          </h3>
        </div>

        {/* Stockpile Info - Two Column Layout */}
        <div className="grid grid-cols-2 gap-3">
          {stockpile.peptide && (
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wide block mb-1" style={{ color: theme.textLight }}>
                Peptide
              </span>
              <p className="text-xs" style={{ color: theme.text }}>
                {stockpile.peptide}
              </p>
            </div>
          )}

          {stockpile.quantity !== undefined && stockpile.quantity !== null && (
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wide block mb-1" style={{ color: theme.textLight }}>
                Quantity
              </span>
              <p className="text-xs" style={{ color: theme.text }}>
                {stockpile.quantity} {stockpile.unit || ''}
              </p>
            </div>
          )}

          {stockpile.mg !== undefined && stockpile.mg !== null && (
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wide block mb-1" style={{ color: theme.textLight }}>
                Milligrams
              </span>
              <p className="text-xs" style={{ color: theme.text }}>
                {stockpile.mg}mg
              </p>
            </div>
          )}

          {stockpile.vendor && (
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wide block mb-1" style={{ color: theme.textLight }}>
                Vendor
              </span>
              <p className="text-xs" style={{ color: theme.text }}>
                {stockpile.vendor}
              </p>
            </div>
          )}

          {stockpile.batch && (
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wide block mb-1" style={{ color: theme.textLight }}>
                Batch
              </span>
              <p className="text-xs" style={{ color: theme.text }}>
                {stockpile.batch}
              </p>
            </div>
          )}

          {stockpile.expiration && (
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wide block mb-1" style={{ color: theme.textLight }}>
                Expiration
              </span>
              <p className="text-xs" style={{ color: theme.text }}>
                {new Date(stockpile.expiration).toLocaleDateString()}
              </p>
            </div>
          )}

          {stockpile.location && (
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wide block mb-1" style={{ color: theme.textLight }}>
                Location
              </span>
              <p className="text-xs" style={{ color: theme.text }}>
                {stockpile.location}
              </p>
            </div>
          )}
        </div>

        {stockpile.notes && (
          <div className="pt-2 border-t" style={{ borderColor: theme.border }}>
            <span className="text-[10px] font-semibold uppercase tracking-wide block mb-1" style={{ color: theme.textLight }}>
              Notes
            </span>
            <p className="text-xs whitespace-pre-wrap" style={{ color: theme.text }}>
              {stockpile.notes}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

// Order Detail Modal
function OrderDetailModal({ open, onClose, order, theme }) {
  return (
    <Modal open={open} onClose={onClose} onBack={onClose} title="Order Details" theme={theme} maxWidth="max-w-xl">
      <div className="space-y-4">
        <h3 className="text-base font-bold mb-3" style={{ color: theme.primaryDark }}>{order.item || 'Order'}</h3>
        <div className="grid grid-cols-2 gap-3">
          {order.vendor && <DetailField label="Vendor" value={order.vendor} theme={theme} />}
          {order.status && <DetailField label="Status" value={order.status} theme={theme} />}
          {order.orderDate && <DetailField label="Order Date" value={new Date(order.orderDate).toLocaleDateString()} theme={theme} />}
          {order.shippedDate && <DetailField label="Shipped Date" value={new Date(order.shippedDate).toLocaleDateString()} theme={theme} />}
          {order.deliveredDate && <DetailField label="Delivered Date" value={new Date(order.deliveredDate).toLocaleDateString()} theme={theme} />}
          {order.trackingNumber && <DetailField label="Tracking Number" value={order.trackingNumber} theme={theme} />}
          {order.cost !== undefined && <DetailField label="Cost" value={`$${order.cost}`} theme={theme} />}
          {order.quantity !== undefined && <DetailField label="Quantity" value={order.quantity} theme={theme} />}
        </div>
        {order.notes && <DetailNotes notes={order.notes} theme={theme} />}
      </div>
    </Modal>
  );
}

// Vendor Detail Modal
function VendorDetailModal({ open, onClose, vendor, theme }) {
  return (
    <Modal open={open} onClose={onClose} onBack={onClose} title="Vendor Details" theme={theme} maxWidth="max-w-xl">
      <div className="space-y-4">
        <h3 className="text-base font-bold mb-3" style={{ color: theme.primaryDark }}>{vendor.name}</h3>
        <div className="grid grid-cols-2 gap-3">
          {vendor.type && <DetailField label="Type" value={vendor.type} theme={theme} />}
          {vendor.website && <DetailField label="Website" value={vendor.website} theme={theme} />}
          {vendor.email && <DetailField label="Email" value={vendor.email} theme={theme} />}
          {vendor.phone && <DetailField label="Phone" value={vendor.phone} theme={theme} />}
          {vendor.rating !== undefined && <DetailField label="Rating" value={vendor.rating} theme={theme} />}
          {vendor.paymentMethods && <DetailField label="Payment Methods" value={Array.isArray(vendor.paymentMethods) ? vendor.paymentMethods.join(', ') : vendor.paymentMethods} theme={theme} />}
          {vendor.shippingMethods && <DetailField label="Shipping Methods" value={Array.isArray(vendor.shippingMethods) ? vendor.shippingMethods.join(', ') : vendor.shippingMethods} theme={theme} />}
        </div>
        {vendor.notes && <DetailNotes notes={vendor.notes} theme={theme} />}
      </div>
    </Modal>
  );
}

// Supplement Detail Modal
function SupplementDetailModal({ open, onClose, supplement, theme }) {
  return (
    <Modal open={open} onClose={onClose} onBack={onClose} title="Supplement Details" theme={theme} maxWidth="max-w-xl">
      <div className="space-y-4">
        <h3 className="text-base font-bold mb-3" style={{ color: theme.primaryDark }}>{supplement.name}</h3>
        <div className="grid grid-cols-2 gap-3">
          {supplement.type && <DetailField label="Type" value={supplement.type} theme={theme} />}
          {supplement.brand && <DetailField label="Brand" value={supplement.brand} theme={theme} />}
          {supplement.dosage && <DetailField label="Dosage" value={supplement.dosage} theme={theme} />}
          {supplement.frequency && <DetailField label="Frequency" value={supplement.frequency} theme={theme} />}
          {supplement.purpose && <DetailField label="Purpose" value={supplement.purpose} theme={theme} />}
        </div>
        {supplement.notes && <DetailNotes notes={supplement.notes} theme={theme} />}
      </div>
    </Modal>
  );
}

// Recon History Detail Modal
function ReconHistoryDetailModal({ open, onClose, reconHistory, theme }) {
  return (
    <Modal open={open} onClose={onClose} onBack={onClose} title="Reconstitution History Details" theme={theme} maxWidth="max-w-xl">
      <div className="space-y-4">
        <h3 className="text-base font-bold mb-3" style={{ color: theme.primaryDark }}>{reconHistory.name || reconHistory.peptide || 'Reconstitution'}</h3>
        <div className="grid grid-cols-2 gap-3">
          {reconHistory.date && <DetailField label="Date" value={new Date(reconHistory.date).toLocaleDateString()} theme={theme} />}
          {reconHistory.reconItem && <DetailField label="Recon Item" value={reconHistory.reconItem} theme={theme} />}
          {reconHistory.amount !== undefined && <DetailField label="Amount" value={reconHistory.amount} theme={theme} />}
        </div>
        {reconHistory.notes && <DetailNotes notes={reconHistory.notes} theme={theme} />}
      </div>
    </Modal>
  );
}

// Metric Detail Modal
function MetricDetailModal({ open, onClose, metric, theme }) {
  return (
    <Modal open={open} onClose={onClose} onBack={onClose} title="Metric Details" theme={theme} maxWidth="max-w-xl">
      <div className="space-y-4">
        <h3 className="text-base font-bold mb-3" style={{ color: theme.primaryDark }}>{metric.name || 'Metric'}</h3>
        <div className="grid grid-cols-2 gap-3">
          {metric.date && <DetailField label="Date" value={new Date(metric.date).toLocaleDateString()} theme={theme} />}
          {metric.value !== undefined && <DetailField label="Value" value={`${metric.value} ${metric.unit || ''}`} theme={theme} />}
        </div>
        {metric.notes && <DetailNotes notes={metric.notes} theme={theme} />}
      </div>
    </Modal>
  );
}

// Scheduled Buy Detail Modal
function ScheduledBuyDetailModal({ open, onClose, scheduledBuy, theme }) {
  return (
    <Modal open={open} onClose={onClose} onBack={onClose} title="Scheduled Buy Details" theme={theme} maxWidth="max-w-xl">
      <div className="space-y-4">
        <h3 className="text-base font-bold mb-3" style={{ color: theme.primaryDark }}>{scheduledBuy.item || 'Scheduled Buy'}</h3>
        <div className="grid grid-cols-2 gap-3">
          {scheduledBuy.vendor && <DetailField label="Vendor" value={scheduledBuy.vendor} theme={theme} />}
          {scheduledBuy.scheduledDate && <DetailField label="Scheduled Date" value={new Date(scheduledBuy.scheduledDate).toLocaleDateString()} theme={theme} />}
          {scheduledBuy.quantity !== undefined && <DetailField label="Quantity" value={scheduledBuy.quantity} theme={theme} />}
          {scheduledBuy.cost !== undefined && <DetailField label="Cost" value={`$${scheduledBuy.cost}`} theme={theme} />}
        </div>
        {scheduledBuy.notes && <DetailNotes notes={scheduledBuy.notes} theme={theme} />}
      </div>
    </Modal>
  );
}

// Calendar Note Detail Modal
function CalendarNoteDetailModal({ open, onClose, calendarNote, theme }) {
  return (
    <Modal open={open} onClose={onClose} onBack={onClose} title="Calendar Note Details" theme={theme} maxWidth="max-w-xl">
      <div className="space-y-4">
        <h3 className="text-base font-bold mb-3" style={{ color: theme.primaryDark }}>
          {calendarNote.date ? new Date(calendarNote.date).toLocaleDateString() : 'Note'}
        </h3>
        {calendarNote.note && (
          <div className="pt-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide block mb-2" style={{ color: theme.textLight }}>Note</span>
            <p className="text-xs whitespace-pre-wrap" style={{ color: theme.text }}>{calendarNote.note}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

// Goal Detail Modal
function GoalDetailModal({ open, onClose, goal, theme }) {
  return (
    <Modal open={open} onClose={onClose} onBack={onClose} title="Goal Details" theme={theme} maxWidth="max-w-xl">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold" style={{ color: theme.primaryDark }}>{goal.title || 'Goal'}</h3>
          {goal.completed && (
            <span className="text-[10px] px-2 py-1 rounded-full" style={{ backgroundColor: theme.success + '20', color: theme.success }}>
              Completed
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {goal.targetDate && <DetailField label="Target Date" value={new Date(goal.targetDate).toLocaleDateString()} theme={theme} />}
          {goal.createdAt && <DetailField label="Created" value={new Date(goal.createdAt).toLocaleDateString()} theme={theme} />}
          {goal.archived && <DetailField label="Archived" value={goal.archived ? 'Yes' : 'No'} theme={theme} />}
          {goal.archivedAt && <DetailField label="Archived Date" value={new Date(goal.archivedAt).toLocaleDateString()} theme={theme} />}
        </div>
      </div>
    </Modal>
  );
}

// Protocol History Detail Modal
function ProtocolHistoryDetailModal({ open, onClose, protocolHistory, theme }) {
  return (
    <Modal open={open} onClose={onClose} onBack={onClose} title="Protocol History Details" theme={theme} maxWidth="max-w-xl">
      <div className="space-y-4">
        <h3 className="text-base font-bold mb-3" style={{ color: theme.primaryDark }}>{protocolHistory.protocolName || 'Protocol History'}</h3>
        <div className="grid grid-cols-2 gap-3">
          {protocolHistory.startDate && <DetailField label="Start Date" value={new Date(protocolHistory.startDate).toLocaleDateString()} theme={theme} />}
          {protocolHistory.endDate && <DetailField label="End Date" value={new Date(protocolHistory.endDate).toLocaleDateString()} theme={theme} />}
        </div>
        {protocolHistory.notes && protocolHistory.notes.length > 0 && (
          <div className="pt-2 border-t" style={{ borderColor: theme.border }}>
            <span className="text-[10px] font-semibold uppercase tracking-wide block mb-2" style={{ color: theme.textLight }}>Notes ({protocolHistory.notes.length})</span>
            <div className="space-y-2">
              {protocolHistory.notes.map((note, idx) => (
                <div key={idx} className="p-2 rounded" style={{ backgroundColor: theme?.isDark ? 'rgba(240, 238, 231, 0.05)' : '#f9fafb' }}>
                  <p className="text-xs mb-1" style={{ color: theme.textLight }}>
                    {note.type === 'during' ? 'During Protocol' : 'Follow-up'} • {note.createdAt ? new Date(note.createdAt).toLocaleDateString() : ''}
                  </p>
                  <p className="text-xs whitespace-pre-wrap" style={{ color: theme.text }}>{note.content}</p>
                  {note.tags && note.tags.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {note.tags.map((tag, tagIdx) => (
                        <span key={tagIdx} className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: theme.primary + '20', color: theme.primary }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// Glossary Detail Modal
function GlossaryDetailModal({ open, onClose, glossary, theme }) {
  return (
    <Modal open={open} onClose={onClose} onBack={onClose} title="Glossary Entry Details" theme={theme} maxWidth="max-w-xl">
      <div className="space-y-4">
        <h3 className="text-base font-bold mb-3" style={{ color: theme.primaryDark }}>{glossary.term || 'Term'}</h3>
        <div className="grid grid-cols-2 gap-3">
          {glossary.category && <DetailField label="Category" value={glossary.category} theme={theme} />}
        </div>
        {glossary.definition && (
          <div className="pt-2 border-t" style={{ borderColor: theme.border }}>
            <span className="text-[10px] font-semibold uppercase tracking-wide block mb-2" style={{ color: theme.textLight }}>Definition</span>
            <p className="text-xs whitespace-pre-wrap" style={{ color: theme.text }}>{glossary.definition}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

// Helper component for detail fields
function DetailField({ label, value, theme }) {
  return (
    <div>
      <span className="text-[10px] font-semibold uppercase tracking-wide block mb-1" style={{ color: theme.textLight }}>{label}</span>
      <p className="text-xs" style={{ color: theme.text }}>{value}</p>
    </div>
  );
}

// Helper component for notes
function DetailNotes({ notes, theme }) {
  return (
    <div className="pt-2 border-t" style={{ borderColor: theme.border }}>
      <span className="text-[10px] font-semibold uppercase tracking-wide block mb-1" style={{ color: theme.textLight }}>Notes</span>
      <p className="text-xs whitespace-pre-wrap" style={{ color: theme.text }}>{notes}</p>
    </div>
  );
}
