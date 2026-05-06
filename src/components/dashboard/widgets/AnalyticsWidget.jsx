import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendUp, CheckCircle, CurrencyDollar, Lightning, CaretRight, Archive, Flask, Warning, Clock, Pulse } from '@phosphor-icons/react';
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
            <TrendUp size={20} weight="duotone" style={{ color: theme.primary }} />
          </h3>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <ExpandableTooltip content={WIDGET_TOOLTIPS.analytics} theme={theme} />
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="flex-1 min-h-0 p-4 flex flex-col gap-3">

        {/* Research Consistency */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CheckCircle size={15} weight="bold" style={{ color: theme.primary }} />
              <span className="text-xs font-medium" style={{ color: theme.textLight }}>Research Consistency</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <span className="text-base font-bold" style={{ color: getComplianceColor(complianceData.pct) }}>
                  {complianceData.hasData ? `${complianceData.pct}%` : '—'}
                </span>
                {complianceData.hasData && <span className="text-[9px]" style={{ color: theme.textLight }}>30d</span>}
              </span>
              {complianceData.hasData && (
                <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: theme.primary + '15', color: theme.primary }}>
                  <Lightning size={9} weight="fill" /> {complianceData.streak}d streak
                </span>
              )}
            </div>
          </div>
          {complianceData.hasData && (
            <div className="rounded-xl px-2.5 py-2" style={{ backgroundColor: theme.isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.03)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.12), inset 0 1px 2px rgba(0,0,0,0.06)' }}>
              <div className="flex items-center justify-between">
                {complianceData.last7.map((day) => {
                  const label = ['S','M','T','W','T','F','S'][day.date.getDay()];
                  const hasTasks = day.planned > 0;
                  const isComplete = day.completed && hasTasks;
                  const isPartial = hasTasks && !day.completed && day.done > 0;
                  return (
                    <div key={day.date.toISOString()} className="flex flex-col items-center gap-0.5">
                      <span className="text-[9px] font-medium" style={{ color: theme.textLight }}>{label}</span>
                      <div style={{
                        width: 9, height: 9, borderRadius: '50%',
                        backgroundColor: !hasTasks ? (theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)')
                          : isComplete ? theme.primary
                          : isPartial ? (theme.isDark ? 'rgba(217,167,60,0.5)' : '#d9770640')
                          : 'transparent',
                        border: !hasTasks ? 'none'
                          : isComplete ? 'none'
                          : `2px solid ${theme.isDark ? 'rgba(197,130,100,0.6)' : '#b5684a60'}`
                      }} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 3-col stat grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className={`rounded-xl p-2 flex flex-col gap-1 ${ringClass}`} style={cardStyle}>
            <div className="flex items-center gap-1">
              <div className="p-0.5 rounded" style={{ backgroundColor: `${theme.primary}15`, color: theme.primary }}>
                <Pulse size={11} weight="bold" />
              </div>
              <span className="text-[9px] font-semibold uppercase tracking-wider leading-tight" style={{ color: theme.textLight }}>Doses (30d)</span>
            </div>
            <span className="text-sm font-bold" style={{ color: theme.text }}>
              {complianceData.hasData ? complianceData.dosesLogged30d : '—'}
            </span>
          </div>

          <div className={`rounded-xl p-2 flex flex-col gap-1 ${ringClass}`} style={cardStyle}>
            <div className="flex items-center gap-1">
              <div className="p-0.5 rounded" style={{ backgroundColor: `${theme.primary}15`, color: theme.primary }}>
                <Lightning size={11} weight="bold" />
              </div>
              <span className="text-[9px] font-semibold uppercase tracking-wider leading-tight" style={{ color: theme.textLight }}>Best Streak</span>
            </div>
            <span className="text-sm font-bold" style={{ color: theme.text }}>
              {complianceData.bestStreak > 0 ? `${complianceData.bestStreak}d` : '—'}
            </span>
          </div>

          <div className={`rounded-xl p-2 flex flex-col gap-1 ${ringClass}`} style={cardStyle}>
            <div className="flex items-center gap-1">
              <div className="p-0.5 rounded" style={{ backgroundColor: `${theme.primary}15`, color: theme.primary }}>
                <CurrencyDollar size={11} weight="bold" />
              </div>
              <span className="text-[9px] font-semibold uppercase tracking-wider leading-tight" style={{ color: theme.textLight }}>Spend (30d)</span>
            </div>
            <span className="text-sm font-bold truncate" style={{ color: theme.text }}>
              {formatCurrency(spendingData.lastMonthSpend)}
            </span>
          </div>

          <div className={`rounded-xl p-2 flex flex-col gap-1 ${ringClass}`} style={cardStyle}>
            <div className="flex items-center gap-1">
              <div className="p-0.5 rounded" style={{ backgroundColor: `${theme.primary}15`, color: theme.primary }}>
                <TrendUp size={11} weight="bold" />
              </div>
              <span className="text-[9px] font-semibold uppercase tracking-wider leading-tight" style={{ color: theme.textLight }}>Total Spent</span>
            </div>
            <span className="text-sm font-bold truncate" style={{ color: theme.text }}>
              {formatCurrency(spendingData.totalSpend)}
            </span>
          </div>

          <div className={`rounded-xl p-2 flex flex-col gap-1 ${ringClass}`} style={cardStyle}>
            <div className="flex items-center gap-1">
              <div className="p-0.5 rounded" style={{ backgroundColor: `${theme.primary}15`, color: theme.primary }}>
                <Archive size={11} weight="bold" />
              </div>
              <span className="text-[9px] font-semibold uppercase tracking-wider leading-tight" style={{ color: theme.textLight }}>Stockpile</span>
            </div>
            <span className="text-sm font-bold truncate" style={{ color: theme.text }}>
              {formatCurrency(inventoryData.stockpileValue)}
            </span>
          </div>

          <div className={`rounded-xl p-2 flex flex-col gap-1 ${ringClass}`} style={cardStyle}>
            <div className="flex items-center gap-1">
              <div className="p-0.5 rounded" style={{ backgroundColor: `${theme.primary}15`, color: theme.primary }}>
                <CurrencyDollar size={11} weight="bold" />
              </div>
              <span className="text-[9px] font-semibold uppercase tracking-wider leading-tight" style={{ color: theme.textLight }}>Avg / Day</span>
            </div>
            <span className="text-sm font-bold truncate" style={{ color: theme.text }}>
              {formatCurrency(spendingData.avgDailySpend30)}
            </span>
          </div>

          <div className={`rounded-xl p-2 flex flex-col gap-1 ${ringClass}`} style={cardStyle}>
            <div className="flex items-center gap-1">
              <div className="p-0.5 rounded" style={{ backgroundColor: `${theme.primary}15`, color: theme.primary }}>
                <CheckCircle size={11} weight="bold" />
              </div>
              <span className="text-[9px] font-semibold uppercase tracking-wider leading-tight" style={{ color: theme.textLight }}>Completed</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold" style={{ color: theme.text }}>{protocolData.completed}</span>
              <span className="text-[9px]" style={{ color: theme.textLight }}>protocols</span>
            </div>
          </div>

          <div className={`rounded-xl p-2 flex flex-col gap-1 ${ringClass}`} style={cardStyle}>
            <div className="flex items-center gap-1">
              <div className="p-0.5 rounded" style={{ backgroundColor: inventoryData.lowStockCount > 0 ? '#d9770618' : `${theme.primary}15`, color: inventoryData.lowStockCount > 0 ? '#d97706' : theme.primary }}>
                <Warning size={11} weight="bold" />
              </div>
              <span className="text-[9px] font-semibold uppercase tracking-wider leading-tight" style={{ color: theme.textLight }}>Low Stock</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold" style={{ color: inventoryData.lowStockCount > 0 ? '#d97706' : theme.text }}>
                {inventoryData.lowStockCount}
              </span>
              <span className="text-[9px]" style={{ color: theme.textLight }}>items</span>
            </div>
          </div>

          <div className={`rounded-xl p-2 flex flex-col gap-1 ${ringClass}`} style={cardStyle}>
            <div className="flex items-center gap-1">
              <div className="p-0.5 rounded" style={{ backgroundColor: `${theme.primary}15`, color: theme.primary }}>
                <Flask size={11} weight="bold" />
              </div>
              <span className="text-[9px] font-semibold uppercase tracking-wider leading-tight" style={{ color: theme.textLight }}>Active</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold" style={{ color: theme.text }}>{protocolData.active}</span>
              <span className="text-[9px]" style={{ color: theme.textLight }}>protocols</span>
            </div>
          </div>
        </div>

        {/* Ending Soon */}
        {protocolData.endingSoon.length > 0 && (
          <div className={`rounded-xl p-2.5 ${ringClass}`} style={cardStyle}>
            <div className="flex items-center gap-1.5 mb-2">
              <div className="p-1 rounded-md" style={{ backgroundColor: '#d9770618', color: '#d97706' }}>
                <Clock size={12} weight="bold" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: theme.textLight }}>Ending Soon</span>
            </div>
            <div className="space-y-1">
              {protocolData.endingSoon.slice(0, 2).map(p => (
                <div key={p.id} className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium truncate" style={{ color: theme.text }}>{p.protocolName || 'Protocol'}</span>
                  <span className="text-[10px] font-semibold flex-shrink-0 px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: p.daysLeft <= 3 ? '#d9770625' : `${theme.primary}15`, color: p.daysLeft <= 3 ? '#d97706' : theme.primary }}>
                    {p.daysLeft === 0 ? 'Today' : `${p.daysLeft}d`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* View all */}
        <div className="flex items-center justify-center gap-1 pt-1">
          <span className="text-xs" style={{ color: theme.isDark ? theme.textLight : theme.primary }}>
            View full analytics
          </span>
          <CaretRight size={12} weight="bold" style={{ color: theme.isDark ? theme.textLight : theme.primary }} />
        </div>
      </div>
    </div>
  );
};

export default AnalyticsWidget;
