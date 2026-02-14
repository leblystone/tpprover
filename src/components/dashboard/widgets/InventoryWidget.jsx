import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ChevronsUp, ChevronsDown, ChevronDown } from 'lucide-react';
import ExpandableTooltip from '../../ui/ExpandableTooltip';
import { WIDGET_TOOLTIPS } from '../../../utils/widgetTooltips';

function useLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

const InventoryWidget = ({ widget, theme, onOpenStockpileAdd }) => {
  const navigate = useNavigate();
  const stockpile = useLocal('tpprover_stockpile', []);

  const handleOpenAddSingle = () => {
    if (onOpenStockpileAdd) {
      onOpenStockpileAdd();
    } else {
      navigate('/app/stockpile', { state: { openAddSingle: true } });
    }
  };
  const terracottaColor = '#c87a5c';
  const darkerSageColor = '#5A7A5A';

  // Calculate top 3 well stocked (grouped by peptide name, total mg on hand)
  const topWellStocked = useMemo(() => {
    if (!stockpile || stockpile.length === 0) return [];
    
    // Group by peptide name and calculate total mg
    const grouped = new Map();
    stockpile.forEach(item => {
      const name = item.name || 'Unknown';
      const mg = Number(item.mg) || 0;
      const quantity = Number(item.quantity) || 0;
      const totalMg = mg * quantity;
      
      if (!grouped.has(name)) {
        grouped.set(name, { name, totalMg: 0 });
      }
      const group = grouped.get(name);
      group.totalMg += totalMg;
    });
    
    // Sort by total mg descending and take top 3
    return Array.from(grouped.values())
      .sort((a, b) => b.totalMg - a.totalMg)
      .slice(0, 3);
  }, [stockpile]);

  // Calculate lowest 2 items (sorted by quantity, showing individual items)
  // Exclude out of stock items (quantity = 0) and items with quantity <= 1
  const lowestItems = useMemo(() => {
    if (!stockpile || stockpile.length === 0) return [];
    
    // Filter to only include items with quantity > 1, then sort by quantity ascending and take lowest 2
    return [...stockpile]
      .filter(item => {
        const quantity = Number(item.quantity) || 0;
        return quantity > 1;
      })
      .sort((a, b) => {
        const qtyA = Number(a.quantity) || 0;
        const qtyB = Number(b.quantity) || 0;
        return qtyA - qtyB;
      })
      .slice(0, 2)
      .map(item => ({
        name: item.name || 'Unknown',
        mg: Number(item.mg) || 0,
        quantity: Number(item.quantity) || 0
      }));
  }, [stockpile]);

  const handleClick = () => {
    navigate('/app/stockpile');
  };

  return (
    <div 
      className="h-full flex flex-col cursor-pointer widget-card-hover" 
      onClick={stockpile.length > 0 ? handleClick : undefined}
      style={{ borderRadius: '12px' }}
    >
      <div className={`px-4 py-3 ${theme.isDark ? '' : 'border-b'}`} style={{ borderColor: theme.isDark ? 'transparent' : theme.border }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold flex items-center gap-2" style={{ color: theme.text }}>
            Stockpile
            <Package size={18} style={{ color: theme.primary }} />
          </h3>
          <div className="flex items-center gap-2">
            <ExpandableTooltip content={WIDGET_TOOLTIPS.inventory} theme={theme} />
          </div>
        </div>
      </div>
      
      <div className="flex-1 p-3 overflow-y-auto">
        {stockpile.length === 0 ? (
          <div
            className="flex-1 p-2 sm:p-4 flex flex-col items-center justify-center gap-3 min-h-0 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-center px-2" style={{ color: theme.textLight }}>
              Inventory is empty!
            </p>
            <button
              type="button"
              onClick={handleOpenAddSingle}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
              style={{
                color: theme.primary,
                backgroundColor: theme.isDark ? `${theme.primary}20` : `${theme.primary}15`,
                border: `1px solid ${theme.primary}40`
              }}
            >
              Add Your Stockpile
              <ChevronDown size={14} />
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Top 3 Well Stocked */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <ChevronsUp size={15} style={{ color: darkerSageColor }} />
                <h4 className="text-xs font-semibold" style={{ color: theme.text }}>
                  Well Stocked
                </h4>
              </div>
              {topWellStocked.length === 0 ? (
                <p className="text-xs" style={{ color: theme.textLight }}>No well stocked items</p>
              ) : (
                <ul className="space-y-1">
                  {topWellStocked.map((item, idx) => (
                    <li 
                      key={`${item.name}-${idx}`}
                      className="flex items-center justify-between py-1 px-1.5 rounded text-xs"
                      style={{ 
                        backgroundColor: idx % 2 === 0 ? theme.secondary : theme.background 
                      }}
                    >
                      <span className="font-medium truncate flex-1" style={{ color: theme.text }}>
                        {item.name}
                      </span>
                      <span className="font-semibold ml-2 whitespace-nowrap" style={{ color: darkerSageColor }}>
                        {item.totalMg.toLocaleString()} mg
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Lowest 2 Items */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <ChevronsDown size={15} style={{ color: terracottaColor }} />
                <h4 className="text-xs font-semibold" style={{ color: theme.text }}>
                  Running Low
                </h4>
              </div>
              {lowestItems.length === 0 ? (
                <p className="text-xs" style={{ color: theme.textLight }}>No items found</p>
              ) : (
                <ul className="space-y-1">
                  {lowestItems.map((item, idx) => (
                    <li 
                      key={`${item.name}-${item.mg}-${idx}`}
                      className="flex items-center justify-between py-1 px-1.5 rounded text-xs"
                      style={{ 
                        backgroundColor: idx % 2 === 0 ? theme.secondary : theme.background 
                      }}
                    >
                      <span className="font-medium truncate flex-1" style={{ color: theme.text }}>
                        {item.name}
                      </span>
                      <span className="font-semibold ml-2 whitespace-nowrap" style={{ color: terracottaColor }}>
                        {item.mg} mg
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryWidget;
