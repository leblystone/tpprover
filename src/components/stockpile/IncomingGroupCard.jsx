import React from 'react';
import {
  Package,
  Flask,
  Storefront,
  ShoppingCart,
  Truck,
  CaretRight,
} from '@phosphor-icons/react';
import { getUnitLabel } from '../../utils/unitConversion';
import {
  PURPOSE_ICON_WEIGHT,
  getPurposeIconComponent,
  getPurposeIconColor,
  inferPurposeIconFromCompound,
} from '../../utils/protocolPurposeIcons';

/**
 * IncomingGroupCard — Peptides-aligned card for undelivered order groups.
 * Tap opens the linked order.
 */
export default function IncomingGroupCard({
  group,
  theme,
  onViewOrder,
  orders,
  itemIndex = 1,
  totalFromOrder = 1,
}) {
  const getFirstOrderId = () => {
    if (!orders || !group.name) return null;
    const nonDeliveredOrders = orders.filter((o) => {
      const status = (o.status || '').toLowerCase();
      return !status.includes('delivered');
    });

    for (const order of nonDeliveredOrders) {
      if (!order.items) continue;
      const matchesName = (itemName, targetName) => {
        const normalizedItemName = itemName || '';
        if (targetName === 'Unknown') {
          return normalizedItemName === '' || normalizedItemName === 'Unknown';
        }
        return normalizedItemName === targetName;
      };

      const hasItem = order.items.some((item) => matchesName(item.name, group.name));
      if (hasItem) return order.id;
    }
    return null;
  };

  const firstOrderId = getFirstOrderId();
  const linkedOrder = orders?.find((o) => o.id === firstOrderId) || null;
  const isLiveTracking =
    linkedOrder?.tracking && String(linkedOrder.tracking).trim() && !linkedOrder.manualTracking;

  const unitLabel = (group.unit || 'mg').toUpperCase();
  const amountValue = group.totalMg > 0 ? group.totalMg : group.totalVials;
  const amountUnit = group.totalMg > 0 ? unitLabel : getUnitLabel('vial', group.totalVials);
  const chipText = isLiveTracking ? 'In Transit' : 'En Route';

  const purposeIconId = inferPurposeIconFromCompound(group.name) || 'research';
  const PurposeIcon = getPurposeIconComponent(purposeIconId);
  const purposeColor = getPurposeIconColor(purposeIconId);

  const borderSubtle = theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const chipBorder = theme.isDark ? 'rgba(107, 142, 107, 0.5)' : 'rgba(85, 119, 85, 0.4)';
  const chipColor = theme.isDark ? '#6b8e6b' : '#557755';

  const handleCardClick = () => {
    if (firstOrderId && onViewOrder) onViewOrder(firstOrderId);
  };

  const vendorLines = Object.values(group.variants || {})
    .sort((a, b) => String(a.mg).localeCompare(String(b.mg)))
    .flatMap((variant) =>
      Object.entries(variant.vendors || {})
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([vendor, vendorData]) => {
          const legacyMgTotal = typeof vendorData !== 'object';
          const count = legacyMgTotal
            ? Math.max(1, Math.round((Number(vendorData) || 0) / (Number(variant.mg) || 1)))
            : (vendorData.count ?? 0);
          const displayUnit = legacyMgTotal ? 'vial' : (variant.containerUnit || 'vial');
          const containerLabel = getUnitLabel(displayUnit, count);
          const mgLabel = `${variant.mg} ${variant.unit || 'mg'}`;
          return {
            key: `${variant.mg}-${vendor}`,
            count,
            containerLabel,
            mgLabel,
            vendor: vendor || 'Unknown',
          };
        })
    );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      className="group relative rounded-2xl cursor-pointer transition-shadow duration-200 active:scale-[0.99] touch-manipulation"
      style={{
        backgroundColor: theme.isDark ? theme.cardBackground : (theme?.cardBackground || '#fff'),
        boxShadow: theme.isDark
          ? '0 2px 12px rgba(0, 0, 0, 0.35)'
          : '0 1px 8px rgba(0, 0, 0, 0.05), 0 4px 16px rgba(0, 0, 0, 0.03)',
        border: `1px solid ${borderSubtle}`,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div className="relative p-3.5 sm:p-4">
        {/* Header */}
        <div className="flex items-start gap-2.5 min-w-0">
          <span
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${purposeColor}22` }}
            aria-hidden
          >
            <PurposeIcon size={24} weight={PURPOSE_ICON_WEIGHT} style={{ color: purposeColor }} />
          </span>

          <div className="flex-1 min-w-0">
            <h3
              className="text-base font-semibold truncate leading-snug"
              style={{ color: theme.text, fontFamily: 'Poppins, sans-serif', letterSpacing: '-0.01em' }}
              title={group.name}
            >
              {group.name}
            </h3>
            {totalFromOrder > 1 && (
              <p className="text-[11px] font-medium mt-0.5 opacity-60" style={{ color: theme.text }}>
                Item {itemIndex} of {totalFromOrder}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <div className="flex items-baseline gap-1 leading-none">
              <span
                className="text-xl font-black tracking-tight"
                style={{ color: theme.primary, fontFamily: 'Poppins, sans-serif' }}
              >
                {amountValue}
              </span>
              <span
                className="text-[10px] font-bold uppercase tracking-wide opacity-70"
                style={{ color: theme.text, fontFamily: 'Poppins, sans-serif' }}
              >
                {amountUnit}
              </span>
            </div>
            <div
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider border"
              style={{
                fontFamily: 'Poppins, sans-serif',
                backgroundColor: 'transparent',
                borderColor: chipBorder,
                color: chipColor,
              }}
            >
              {isLiveTracking && <Truck size={12} weight="duotone" style={{ color: chipColor }} />}
              {chipText}
            </div>
            {isLiveTracking && (
              <div className="flex items-center gap-1 text-[10px]" style={{ color: theme.textLight }}>
                <span>ETA: Pending</span>
              </div>
            )}
          </div>
        </div>

        {/* Body — quantity + vendor lines */}
        {vendorLines.length > 0 && (
          <div
            className="mt-3 pt-3 space-y-2.5"
            style={{ borderTop: `1px solid ${borderSubtle}` }}
          >
            {vendorLines.map((line) => (
              <div
                key={line.key}
                className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0 text-sm"
                style={{ color: theme.text, fontFamily: 'Poppins, sans-serif' }}
              >
                <Package size={20} weight="duotone" style={{ color: theme.primary, flexShrink: 0 }} />
                <span className="font-semibold">{line.count} {line.containerLabel}</span>
                <span style={{ opacity: 0.35 }}>·</span>
                <Flask size={20} weight="duotone" style={{ color: theme.primary, flexShrink: 0, opacity: 0.85 }} />
                <span className="font-medium opacity-80">{line.mgLabel} each</span>
                <span style={{ opacity: 0.35 }}>·</span>
                <Storefront size={20} weight="duotone" style={{ color: theme.primary, flexShrink: 0, opacity: 0.8 }} />
                <span className="font-semibold truncate">{line.vendor}</span>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div
          className="flex justify-center mt-3 pt-2.5"
          style={{ borderTop: `1px solid ${borderSubtle}` }}
        >
          <div className="flex items-center gap-2 opacity-55 group-hover:opacity-90 transition-opacity">
            <ShoppingCart size={20} weight="duotone" style={{ color: theme.primary }} />
            <span
              className="text-sm font-semibold tracking-wide"
              style={{ color: theme.text, fontFamily: 'Poppins, sans-serif' }}
            >
              View order
            </span>
            <CaretRight
              size={18}
              weight="duotone"
              style={{ color: theme.primary }}
              className="group-hover:translate-x-0.5 transition-transform"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
