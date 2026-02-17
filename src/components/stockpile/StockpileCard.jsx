import React from 'react';
import { Package, Beaker, Percent, Hash, DollarSign, FileText, ShoppingCart, Edit } from 'lucide-react';

export default function StockpileCard({ 
  item, 
  theme, 
  onEdit, 
  onAddToBuy = () => {},
  showActions = true 
}) {
  if (!item) return null;

  const formatAmount = (amount, unit) => {
    if (!amount && amount !== 0) return 'N/A';
    return `${amount}${unit ? ` ${unit}` : ''}`;
  };

  const formatPrice = (price) => {
    if (!price && price !== 0) return 'N/A';
    return `$${price.toFixed(2)}`;
  };

  const formatPurity = (purity) => {
    if (!purity && purity !== 0) return 'N/A';
    return `${purity}%`;
  };

  const getStatusColor = (amount, minAmount) => {
    if (!amount || amount === 0) return theme.error;
    if (minAmount && amount <= minAmount) return theme.warning;
    return theme.success;
  };

  return (
    <div 
      className="rounded-2xl p-6 transition-all duration-200 cursor-pointer glass-panel-minimal"
      style={{
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
        boxShadow: theme.isDark
          ? '0 4px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
          : '0 2px 16px rgba(0, 0, 0, 0.06), 0 8px 32px rgba(0, 0, 0, 0.04)',
      }}
      onClick={() => onEdit?.(item)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-1" style={{ color: theme.primaryDark }}>
            {item.name}
          </h3>
          {item.vendor && (
            <p className="text-sm" style={{ color: theme.textLight }}>
              from {item.vendor}
            </p>
          )}
        </div>
        
        {showActions && (
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(item);
              }}
              className="p-2 rounded-lg transition-colors"
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              title="Edit item"
            >
              <Edit size={16} style={{ color: theme.textLight }} />
            </button>
          </div>
        )}
      </div>

      {/* Stock Status */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Package size={16} style={{ color: getStatusColor(item.currentAmount, item.minAmount) }} />
          <span className="font-medium" style={{ color: theme.text }}>
            Stock: {formatAmount(item.currentAmount, item.unit)}
          </span>
          {item.minAmount && (
            <span className="text-sm" style={{ color: theme.textLight }}>
              (Min: {formatAmount(item.minAmount, item.unit)})
            </span>
          )}
        </div>
        
        {item.minAmount && (
          <div className="w-full rounded-full h-2" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
            <div
              className="h-2 rounded-full transition-all"
              style={{
                width: `${Math.min((item.currentAmount / item.minAmount) * 100, 100)}%`,
                backgroundColor: getStatusColor(item.currentAmount, item.minAmount)
              }}
            />
          </div>
        )}
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        {item.purity && (
          <div className="flex items-center gap-2">
            <Percent size={14} style={{ color: theme.textLight }} />
            <span style={{ color: theme.text }}>
              Purity: {formatPurity(item.purity)}
            </span>
          </div>
        )}
        
        {item.lotNumber && (
          <div className="flex items-center gap-2">
            <Hash size={14} style={{ color: theme.textLight }} />
            <span style={{ color: theme.text }}>
              Lot: {item.lotNumber}
            </span>
          </div>
        )}
        
        {item.costPerUnit && (
          <div className="flex items-center gap-2">
            <DollarSign size={14} style={{ color: theme.textLight }} />
            <span style={{ color: theme.text }}>
              Cost: {formatPrice(item.costPerUnit)}/{item.unit || 'unit'}
            </span>
          </div>
        )}
        
        {item.location && (
          <div className="flex items-center gap-2">
            <Package size={14} style={{ color: theme.textLight }} />
            <span style={{ color: theme.text }}>
              Location: {item.location}
            </span>
          </div>
        )}
      </div>

      {/* Notes */}
      {item.notes && (
        <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}>
          <div className="flex items-start gap-2">
            <FileText size={14} style={{ color: theme.textLight }} className="mt-0.5" />
            <span className="text-sm" style={{ color: theme.text }}>
              {item.notes}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {showActions && (
        <div className="mt-4 pt-4 flex gap-2" style={{ borderTop: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }} onClick={(e) => e.stopPropagation()}>
          {(item.currentAmount <= (item.minAmount || 0)) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddToBuy?.(item);
              }}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              style={{ 
                backgroundColor: theme.primary,
                color: theme.textOnPrimary 
              }}
            >
              <ShoppingCart size={14} />
              Add to Buy List
            </button>
          )}
        </div>
      )}
    </div>
  );
}
