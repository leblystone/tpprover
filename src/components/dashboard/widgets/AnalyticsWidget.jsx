import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, CheckCircle, DollarSign, Zap, ChevronRight, Archive, FlaskConical, AlertTriangle, Clock, Activity } from 'lucide-react';
import ExpandableTooltip from '../../ui/ExpandableTooltip';
import { WIDGET_TOOLTIPS } from '../../../utils/widgetTooltips';
import { formatCurrency } from '../../../utils/currencyUtils';
import { calculateScheduledTasksForDate } from '../../../utils/calendarTasks';
import { getTaskCompletion, generateTaskId } from '../../../utils/taskCompletion';
import { toKey } from '../../calendar/MonthGrid';
import { useAppContext } from '../../../context/AppContext';

function useLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function countDayTasks(day, protocols, supplements, reconItems, taskCompletion) {
  const dateKey = toKey(day);
  const scheduledData = calculateScheduledTasksForDate(day, protocols, supplements, reconItems);
  let planned = 0, done = 0;
  Object.keys(scheduledData.bySlot || {}).forEach(timeSlot => {
    const slot = scheduledData.bySlot[timeSlot];
    (slot.peptides || []).forEach(pep => {
      const taskId = generateTaskId({ type: 'peptide', name: pep.name || 'Peptide', dose: pep.dose || '', unit: pep.unit || '', time: timeSlot, protocolId: pep.protocolId, peptideId: pep.peptideId });
      planned++;
      const td = taskCompletion[dateKey]?.[timeSlot]?.[taskId];
      if (td === true || (td && typeof td === 'object' && td.completed)) done++;
    });
    (slot.supplements || []).forEach(supp => {
      const taskId = generateTaskId({ type: 'supplement', name: supp.name || 'Supplement', dose: supp.dose || '', unit: supp.unit || '', time: timeSlot });
      planned++;
      const td = taskCompletion[dateKey]?.[timeSlot]?.[taskId];
      if (td === true || (td && typeof td === 'object' && td.completed)) done++;
    });
  });
  return { planned, done };
}

/** Compute how many days until a protocol's end date (negative = already past). Returns null if no-end. */
function protocolDaysLeft(p) {
  if (!p.active || !p.startDate) return null;
  const d = p.duration || {};
  if (d.noEnd || !d.count || !d.unit) return null;
  const start = new Date(p.startDate);
  const end = new Date(start);
  const unit = String(d.unit).toLowerCase();
  if (unit === 'day') end.setDate(end.getDate() + Number(d.count));
  else if (unit === 'week') end.setDate(end.getDate() + Number(d.count) * 7);
  else if (unit === 'month') end.setMonth(end.getMonth() + Number(d.count));
  return Math.ceil((end - new Date()) / 86400000);
}

const AnalyticsWidget = ({ widget, theme }) => {
  const navigate = useNavigate();
  const { protocols: ctxProtocols, supplements: ctxSupplements, reconItems: ctxReconItems, orders: ctxOrders, stockpile: ctxStockpile } = useAppContext();
  const supplements = ctxSupplements || [];
  const reconItems = ctxReconItems || [];
  const orders = ctxOrders || [];
  const stockpile = ctxStockpile || [];
  const protocols = ctxProtocols || [];
  const protocolHistory = useLocal('tpprover_protocol_history', []);
  const [taskCompletion, setTaskCompletion] = useState(() => getTaskCompletion());

  useEffect(() => {
    const refresh = () => setTaskCompletion(getTaskCompletion());
    window.addEventListener('tpp:task-completion-changed', refresh);
    const interval = setInterval(refresh, 5000);
    return () => {
      window.removeEventListener('tpp:task-completion-changed', refresh);
      clearInterval(interval);
    };
  }, []);

  const complianceData = useMemo(() => {
    let planned30 = 0, done30 = 0;
    const last7 = [];

    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const r = countDayTasks(d, protocols, supplements, reconItems, taskCompletion);
      planned30 += r.planned;
      done30 += r.done;
      if (i < 7) {
        last7.push({ date: d, planned: r.planned, done: r.done, completed: r.planned === 0 || r.done === r.planned });
      }
    }
    const pct = planned30 > 0 ? Math.round((done30 / planned30) * 100) : 0;

    // Current streak
    let streak = 0;
    for (let i = 0; i < 90; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const r = countDayTasks(d, protocols, supplements, reconItems, taskCompletion);
      if (r.planned > 0 && r.done === r.planned) streak++;
      else if (r.planned > 0) break;
    }

    // Best streak ever (look back 180 days)
    let bestStreak = 0, runStreak = 0;
    for (let i = 179; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const r = countDayTasks(d, protocols, supplements, reconItems, taskCompletion);
      if (r.planned > 0 && r.done === r.planned) {
        runStreak++;
        if (runStreak > bestStreak) bestStreak = runStreak;
      } else if (r.planned > 0) {
        runStreak = 0;
      }
    }
    bestStreak = Math.max(bestStreak, streak);

    return { pct, streak, bestStreak, hasData: planned30 > 0, last7, dosesLogged30d: done30 };
  }, [protocols, supplements, reconItems, taskCompletion]);

  const spendingData = useMemo(() => {
    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    let lastMonthSpend = 0, totalSpend = 0, last30Spend = 0;
    const ordersWithCosts = new Set();

    // Spend by compound
    const byCompound = {};

    orders.forEach(order => {
      let itemsCost = 0;
      const settings = JSON.parse(localStorage.getItem('tpprover_settings') || '{}');
      const includeShipping = settings.orders?.includeShippingInCosts ?? true;
      const shippingCost = includeShipping ? (parseFloat(order.shippingCost) || 0) : 0;

      if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
          const cost = (parseFloat(item.price) || 0) * (parseInt(item.quantity, 10) || 1);
          itemsCost += cost;
          const name = item.name || 'Other';
          byCompound[name] = (byCompound[name] || 0) + cost;
        });
      } else if (order.cost) {
        itemsCost = parseFloat(String(order.cost).replace(/[^0-9.]/g, '')) || 0;
        const name = order.peptide || 'Other';
        byCompound[name] = (byCompound[name] || 0) + itemsCost;
      }

      const totalCost = itemsCost + shippingCost;
      if (totalCost > 0) {
        ordersWithCosts.add(order.id);
        const orderDate = order.date ? new Date(order.date) : null;
        totalSpend += totalCost;
        if (orderDate && orderDate >= lastMonthStart && orderDate <= lastMonthEnd) lastMonthSpend += totalCost;
        if (orderDate && orderDate >= thirtyDaysAgo) last30Spend += totalCost;
      }
    });

    stockpile.forEach(stockItem => {
      const costPerVial = parseFloat(stockItem.cost) || 0;
      const quantity = parseFloat(stockItem.quantity) || 0;
      const stockItemTotal = costPerVial * quantity;
      if (stockItemTotal > 0 && !(stockItem.orderId && ordersWithCosts.has(stockItem.orderId))) {
        totalSpend += stockItemTotal;
        const purchaseDate = stockItem.purchaseDate ? new Date(stockItem.purchaseDate) : null;
        if (purchaseDate && purchaseDate >= lastMonthStart && purchaseDate <= lastMonthEnd) lastMonthSpend += stockItemTotal;
        if (purchaseDate && purchaseDate >= thirtyDaysAgo) last30Spend += stockItemTotal;
      }
    });

    const avgDailySpend30 = last30Spend / 30;

    const compoundList = Object.entries(byCompound)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    return { lastMonthSpend, totalSpend, avgDailySpend30, compoundList };
  }, [orders, stockpile]);

  const inventoryData = useMemo(() => {
    const stockpileValue = stockpile.reduce((s, item) =>
      s + (parseFloat(item.cost) || 0) * (parseFloat(item.quantity) || 0), 0);
    const lowStockItems = stockpile.filter(s => parseFloat(s.quantity) <= 1 && parseFloat(s.quantity) >= 0);
    return { stockpileValue, lowStockCount: lowStockItems.length, lowStockItems };
  }, [stockpile]);

  const protocolData = useMemo(() => {
    const active = protocols.filter(p => p.active !== false).length;
    const completed = (protocolHistory || []).filter(h => h.endDate && !h.isMock).length;

    // Protocols ending within 14 days
    const endingSoon = protocols
      .filter(p => p.active !== false)
      .map(p => ({ ...p, daysLeft: protocolDaysLeft(p) }))
      .filter(p => p.daysLeft !== null && p.daysLeft >= 0 && p.daysLeft <= 14)
      .sort((a, b) => a.daysLeft - b.daysLeft);

    return { active, completed, endingSoon };
  }, [protocols, protocolHistory]);

  const getComplianceColor = (pct) => {
    if (pct >= 90) return theme.primary;
    if (pct >= 70) return theme.isDark ? 'rgba(217, 167, 60, 0.85)' : '#d97706';
    return theme.isDark ? 'rgba(197, 130, 100, 0.9)' : '#b5684a';
  };

  const subtleBg = theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const cardStyle = {
    backgroundColor: subtleBg,
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.08), inset 0 1px 2px rgba(0,0,0,0.04)',
  };
  const ringClass = 'ring-1 ring-black/[0.04] dark:ring-white/[0.05]';

  const maxCompound = spendingData.compoundList[0]?.[1] || 1;

  // Flat stat row: label left, value right — ultra compact
  const StatRow = ({ icon: Icon, label, value, valueColor, accentColor }) => (
    <div className="flex items-center justify-between gap-2 py-1 px-2 rounded-lg" style={{ backgroundColor: subtleBg }}>
      <div className="flex items-center gap-1.5 min-w-0">
        <Icon size={11} strokeWidth={2} style={{ color: accentColor || theme.primary, flexShrink: 0 }} />
        <span className="text-[10px] font-medium truncate" style={{ color: theme.textLight }}>{label}</span>
      </div>
      <span className="text-[11px] font-bold flex-shrink-0" style={{ color: valueColor || theme.text }}>{value}</span>
    </div>
  );

  return (
    <div
      className="h-full min-h-0 flex flex-col cursor-pointer transition-opacity hover:opacity-95"
      onClick={() => navigate('/app/insights?tab=research')}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate('/app/insights?tab=research'); }}
    >
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 widget-separator" style={{ borderColor: theme.isDark ? 'transparent' : 'rgba(47, 59, 58, 0.4)' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold flex items-center gap-2" style={{ color: theme.text }}>
            Analytics
            <TrendingUp size={18} style={{ color: theme.primary }} />
          </h3>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <ExpandableTooltip content={WIDGET_TOOLTIPS.analytics} theme={theme} />
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-2 flex flex-col gap-2">

        {/* Consistency header + 7-day dots in one row */}
        <div className="rounded-lg px-2 py-1.5" style={{ backgroundColor: subtleBg }}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <CheckCircle size={11} style={{ color: theme.primary }} />
              <span className="text-[10px] font-medium" style={{ color: theme.textLight }}>Consistency</span>
              <span className="text-xs font-bold" style={{ color: getComplianceColor(complianceData.pct) }}>
                {complianceData.hasData ? `${complianceData.pct}%` : '—'}
              </span>
            </div>
            {complianceData.hasData && (
              <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: theme.primary + '15', color: theme.primary }}>
                <Zap size={8} /> {complianceData.streak}d
              </span>
            )}
          </div>
          {complianceData.hasData && (
            <div className="flex items-center justify-between px-1">
              {complianceData.last7.map((day) => {
                const label = ['S','M','T','W','T','F','S'][day.date.getDay()];
                const hasTasks = day.planned > 0;
                const isComplete = day.completed && hasTasks;
                const isPartial = hasTasks && !day.completed && day.done > 0;
                return (
                  <div key={day.date.toISOString()} className="flex flex-col items-center gap-0.5">
                    <span className="text-[8px]" style={{ color: theme.textLight }}>{label}</span>
                    <div style={{
                      width: 7, height: 7, borderRadius: '50%',
                      backgroundColor: !hasTasks ? (theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)')
                        : isComplete ? theme.primary
                        : isPartial ? (theme.isDark ? 'rgba(217,167,60,0.5)' : '#d9770640')
                        : 'transparent',
                      border: !hasTasks ? 'none'
                        : isComplete ? 'none'
                        : `1.5px solid ${theme.isDark ? 'rgba(197,130,100,0.6)' : '#b5684a60'}`
                    }} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Stat rows */}
        <div className="flex flex-col gap-1">
          <StatRow icon={Activity} label="Doses logged (30d)" value={complianceData.hasData ? complianceData.dosesLogged30d : '—'} />
          <StatRow icon={Zap} label="Best streak ever" value={complianceData.bestStreak > 0 ? `${complianceData.bestStreak}d` : '—'} />
          <StatRow icon={DollarSign} label="Spending (30d)" value={formatCurrency(spendingData.lastMonthSpend)} />
          <StatRow icon={TrendingUp} label="Total spent" value={formatCurrency(spendingData.totalSpend)} />
          <StatRow icon={Archive} label="Stockpile value" value={formatCurrency(inventoryData.stockpileValue)} />
          <StatRow icon={DollarSign} label="Avg / day (30d)" value={`${formatCurrency(spendingData.avgDailySpend30)}/d`} />
          <StatRow icon={CheckCircle} label="Completed protocols" value={protocolData.completed} />
          <StatRow
            icon={AlertTriangle}
            label="Low stock items"
            value={inventoryData.lowStockCount}
            valueColor={inventoryData.lowStockCount > 0 ? '#d97706' : undefined}
            accentColor={inventoryData.lowStockCount > 0 ? '#d97706' : undefined}
          />
          {protocolData.endingSoon.slice(0, 1).map(p => (
            <StatRow
              key={p.id}
              icon={Clock}
              label={`Ending soon · ${p.protocolName || 'Protocol'}`}
              value={p.daysLeft === 0 ? 'Today' : `${p.daysLeft}d`}
              valueColor="#d97706"
              accentColor="#d97706"
            />
          ))}
        </div>

        {/* Spend by Compound — slim bars */}
        {spendingData.compoundList.length > 0 && (
          <div className="rounded-lg px-2 py-1.5" style={{ backgroundColor: subtleBg }}>
            <div className="flex items-center gap-1 mb-1.5">
              <FlaskConical size={10} style={{ color: theme.primary }} />
              <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: theme.textLight }}>By Compound</span>
            </div>
            <div className="space-y-1">
              {spendingData.compoundList.slice(0, 3).map(([name, amount]) => (
                <div key={name} className="flex items-center gap-2">
                  <span className="text-[10px] font-medium truncate" style={{ color: theme.text, minWidth: 0, flex: 1 }}>{name}</span>
                  <div className="h-1 rounded-full overflow-hidden flex-shrink-0" style={{ width: 60, backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.round((amount / maxCompound) * 100)}%`, background: `linear-gradient(90deg, ${theme.primaryDark || theme.primary}, ${theme.primaryLight || theme.primary})` }} />
                  </div>
                  <span className="text-[10px] font-semibold flex-shrink-0" style={{ color: theme.primary }}>{formatCurrency(amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* View all */}
        <div className="flex items-center justify-center gap-1">
          <span className="text-[10px]" style={{ color: theme.isDark ? theme.textLight : theme.primary }}>View full analytics</span>
          <ChevronRight size={10} style={{ color: theme.isDark ? theme.textLight : theme.primary }} />
        </div>
      </div>
    </div>
  );
};

export default AnalyticsWidget;
