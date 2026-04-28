import React, { useMemo, useEffect } from 'react';
import { ListChecks, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Syringe, Drop, Flask, TestTube, Funnel, Needle, Bandaids,
  BoxingGlove, Biohazard, SprayBottle, FirstAidKit, DropSimple,
  WarningCircle, ClockCountdown, ClipboardText, Package, Storefront, ListChecks as PhListChecks,
} from '@phosphor-icons/react';
import ExpandableTooltip from '../../ui/ExpandableTooltip';
import { WIDGET_TOOLTIPS } from '../../../utils/widgetTooltips';
import { getProtocolHistory } from '../../../utils/protocolHistory';
import { SUPPLY_CATEGORY_CONFIG } from '../../stockpile/SupplyCard';

function isLowStock(item) {
  const qty = parseFloat(item.quantity);
  if (Number.isNaN(qty) || qty < 0) return false;
  if (item.type === 'supply') {
    if (qty <= 0) return true;
    const th = parseFloat(item.lowThreshold);
    if (Number.isFinite(th) && th > 0) return qty <= th;
    return qty <= 1;
  }
  return qty <= 1;
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const end = new Date(dateStr);
  if (isNaN(end)) return null;
  return Math.ceil((end - new Date()) / 86400000);
}

const PRIORITY = { 'out-of-stock': 0, 'low-stock': 1, 'ending-today': 2, 'ending-soon': 3, 'follow-up': 4, 'stockpile-entry': 5, 'vendor': 6 };

function getSupplyIcon(item) {
  if (item.category && SUPPLY_CATEGORY_CONFIG[item.category]) {
    return { Icon: SUPPLY_CATEGORY_CONFIG[item.category].Icon, color: SUPPLY_CATEGORY_CONFIG[item.category].color };
  }
  if (item.type === 'supply') return { Icon: FirstAidKit, color: '#9ca3af' };
  return { Icon: Flask, color: '#8dab98' };
}

const DontForgetWidget = ({
  widget,
  theme,
  vendors = [],
  stockpile = [],
  protocols = [],
  onCompleteVendor,
  onViewAllVendors,
  onOpenFollowUp,
  onEditStockpileItem,
  isReadOnly,
  onUpgrade,
  hideHeader = false,
  onClose,
}) => {
  const navigate = useNavigate();

  const pendingVendors = useMemo(() => vendors.filter(v => v.isStub === true), [vendors]);

  const protocolsNeedingFollowUp = useMemo(() => {
    try {
      return getProtocolHistory()
        .filter(e => e.endDate && !e.notes?.some(n => n.type === 'follow_up'))
        .map(e => ({ id: e.id, protocolId: e.protocolId, name: e.protocolName || 'Unnamed Protocol', endDate: e.endDate, completionStatus: e.completionStatus }));
    } catch { return []; }
  }, []);

  const incompleteStockpileItems = useMemo(() => {
    return stockpile.filter(item => {
      const notes = item.notes || '';
      return notes.includes('Added during protocol start') || notes.includes('Added during protocol edit');
    }).map(item => ({ id: item.id, name: item.name || 'Unnamed Peptide', vendor: item.vendor || 'Unknown Vendor', mg: item.mg || '', quantity: item.quantity || '' }));
  }, [stockpile]);

  const lowStockItems = useMemo(() => stockpile.filter(isLowStock), [stockpile]);

  const protocolsEndingSoon = useMemo(() => {
    return (protocols || [])
      .filter(p => p.active !== false && p.endDate)
      .map(p => ({ ...p, daysLeft: daysUntil(p.endDate) }))
      .filter(p => p.daysLeft != null && p.daysLeft >= 0 && p.daysLeft <= 14)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [protocols]);

  // Build a single flat list sorted by urgency
  const allItems = useMemo(() => {
    const items = [];

    lowStockItems.forEach(item => {
      const qty = parseFloat(item.quantity) || 0;
      const isOut = qty <= 0;
      const { Icon, color } = getSupplyIcon(item);
      items.push({
        id: `lowstock-${item.id}`,
        type: isOut ? 'out-of-stock' : 'low-stock',
        priority: isOut ? PRIORITY['out-of-stock'] : PRIORITY['low-stock'],
        Icon,
        iconColor: isOut ? '#ef4444' : '#f59e0b',
        title: item.name || 'Unknown Item',
        subtitle: isOut ? 'Out of stock — reorder now' : `${qty} ${item.unit || 'vial'}${qty !== 1 ? 's' : ''} left`,
        badge: isOut ? 'Out' : 'Low',
        badgeColor: isOut ? '#ef4444' : '#f59e0b',
        data: item,
      });
    });

    protocolsEndingSoon.forEach(p => {
      const isToday = p.daysLeft === 0;
      items.push({
        id: `ending-${p.id}`,
        type: isToday ? 'ending-today' : 'ending-soon',
        priority: isToday ? PRIORITY['ending-today'] : PRIORITY['ending-soon'],
        Icon: ClockCountdown,
        iconColor: isToday ? '#ef4444' : '#d97706',
        title: p.protocolName || 'Protocol',
        subtitle: isToday ? 'Ends today — plan next cycle' : `${p.daysLeft} day${p.daysLeft !== 1 ? 's' : ''} remaining`,
        badge: isToday ? 'Today' : `${p.daysLeft}d`,
        badgeColor: isToday ? '#ef4444' : '#d97706',
        data: p,
      });
    });

    protocolsNeedingFollowUp.forEach(protocol => {
      items.push({
        id: `protocol-${protocol.id}`,
        type: 'follow-up',
        priority: PRIORITY['follow-up'],
        Icon: ClipboardText,
        iconColor: '#6366f1',
        title: protocol.name,
        subtitle: 'Add follow-up assessment',
        badgeColor: '#6366f1',
        data: protocol,
      });
    });

    incompleteStockpileItems.forEach(item => {
      items.push({
        id: `stockpile-${item.id}`,
        type: 'stockpile-entry',
        priority: PRIORITY['stockpile-entry'],
        Icon: Package,
        iconColor: '#8ea5a0',
        title: item.name,
        subtitle: `Review details — ${item.vendor}`,
        badgeColor: '#8ea5a0',
        data: item,
      });
    });

    pendingVendors.forEach(vendor => {
      items.push({
        id: `vendor-${vendor.id}`,
        type: 'vendor',
        priority: PRIORITY['vendor'],
        Icon: Storefront,
        iconColor: '#b09882',
        title: vendor.name,
        subtitle: 'Complete vendor profile',
        badgeColor: '#b09882',
        data: vendor,
      });
    });

    items.sort((a, b) => a.priority - b.priority);
    return items;
  }, [lowStockItems, protocolsEndingSoon, protocolsNeedingFollowUp, incompleteStockpileItems, pendingVendors]);

  const handleClick = (item) => {
    if (isReadOnly) { onUpgrade?.(); return; }

    if (item.type === 'vendor') {
      onCompleteVendor?.(item.data);
    } else if (item.type === 'follow-up') {
      if (onOpenFollowUp) {
        onOpenFollowUp(item.data.protocolId, item.data.id);
      } else {
        onClose?.();
        navigate('/app/protocols', { state: { openFollowUpHistoryId: item.data.id, openFollowUpProtocolId: item.data.protocolId } });
      }
    } else if (item.type === 'stockpile-entry') {
      if (onEditStockpileItem) { onEditStockpileItem(item.data); }
      else { onClose?.(); navigate('/app/stockpile', { state: { openStockpileId: item.data.id } }); }
    } else if (item.type === 'low-stock' || item.type === 'out-of-stock') {
      onClose?.();
      navigate('/app/stockpile', { state: { openStockpileId: item.data.id } });
    } else if (item.type === 'ending-today' || item.type === 'ending-soon') {
      onClose?.();
      navigate('/app/protocols');
    }
  };

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('tpp:action-item-count', { detail: { count: allItems.length } }));
  }, [allItems.length]);

  const TYPE_LABELS = { 'out-of-stock': 'Reorder', 'low-stock': 'Low Stock', 'ending-today': 'Ending', 'ending-soon': 'Ending', 'follow-up': 'Follow-Up', 'stockpile-entry': 'Review', 'vendor': 'Setup' };

  return (
    <div className="h-full flex flex-col">
      {!hideHeader && (
        <div className="px-4 py-3 widget-separator" style={{ borderColor: theme.isDark ? 'transparent' : 'rgba(47, 59, 58, 0.4)' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold flex items-center gap-2" style={{ color: theme.text }}>
              To-Do
              <ListChecks size={18} style={{ color: theme.primary, opacity: 0.7 }} />
            </h3>
            <div className="flex items-center gap-2">
              {allItems.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${theme.primary}18`, color: theme.primary }}>
                  {allItems.length}
                </span>
              )}
              <ExpandableTooltip content={WIDGET_TOOLTIPS.dont_forget} theme={theme} />
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 p-4 overflow-y-auto min-h-0">
        {allItems.length === 0 ? (
          <div className="flex-1 p-2 sm:p-4 flex flex-col items-center justify-center gap-2 min-h-0">
            <PhListChecks size={32} weight="duotone" style={{ color: theme.primary, opacity: 0.3 }} />
            <p className="text-sm text-center px-2" style={{ color: theme.textLight }}>
              You're all caught up
            </p>
            <p className="text-xs text-center px-2 max-w-[220px]" style={{ color: theme.textLight, opacity: 0.7 }}>
              Low stock alerts, protocol reminders, and action items appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {allItems.map((item) => {
              const { Icon } = item;
              const isUrgent = item.priority <= 1;
              return (
                <button
                  key={item.id}
                  onClick={() => handleClick(item)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 text-left group active:scale-[0.98]"
                  style={{
                    backgroundColor: isUrgent
                      ? `${item.badgeColor}0a`
                      : (theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)'),
                    border: `1px solid ${isUrgent ? `${item.badgeColor}25` : (theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)')}`,
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${item.iconColor}18` }}
                  >
                    <Icon size={20} weight="duotone" color={item.iconColor} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-[13px] truncate" style={{ color: theme.text }} title={item.title}>
                        {item.title}
                      </span>
                    </div>
                    <div className="text-[11px] truncate mt-0.5" style={{ color: theme.textLight, opacity: 0.85 }} title={item.subtitle}>
                      {item.subtitle}
                    </div>
                  </div>

                  {item.badge ? (
                    <span
                      className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg flex-shrink-0"
                      style={{ backgroundColor: `${item.badgeColor}15`, color: item.badgeColor }}
                    >
                      {item.badge}
                    </span>
                  ) : (
                    <span
                      className="text-[9px] font-semibold uppercase tracking-wider px-2 py-1 rounded-lg flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
                      style={{ backgroundColor: `${item.iconColor}12`, color: item.iconColor }}
                    >
                      {TYPE_LABELS[item.type] || 'Action'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DontForgetWidget;
