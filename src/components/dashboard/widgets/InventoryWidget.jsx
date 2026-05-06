import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, CaretDoubleUp, CaretDoubleDown, CaretDown } from '@phosphor-icons/react';
import ExpandableTooltip from '../../ui/ExpandableTooltip';
import { WIDGET_TOOLTIPS } from '../../../utils/widgetTooltips';
import { useAppContext } from '../../../context/AppContext';

const InventoryWidget = ({ widget, theme, onOpenStockpileAdd }) => {
  const navigate = useNavigate();
  const { stockpile: stockpileRaw } = useAppContext();
  const stockpile = stockpileRaw || [];

  const handleOpenAddSingle = () => {
    if (onOpenStockpileAdd) {
      onOpenStockpileAdd();
    } else {
      navigate('/app/stockpile', { state: { openAddSingle: true } });
    }
  };
  const terracottaColor = '#c87a5c';
  const darkerSageColor = '#5A7A5A';

  // Group all stockpile items by peptide name, then split into well-stocked vs running-low
  const { topWellStocked, lowestItems } = useMemo(() => {
    if (!stockpile || stockpile.length === 0) return { topWellStocked: [], lowestItems: [] };
    
    // Group by peptide name — sum total mg and total quantity
    const grouped = new Map();
    stockpile.forEach(item => {
      const name = item.name || 'Unknown';
      const mg = Number(item.mg) || 0;
      const quantity = Number(item.quantity) || 0;
      const totalMg = mg * quantity;
      
      if (!grouped.has(name)) {
        grouped.set(name, { name, totalMg: 0, totalQty: 0 });
      }
      const group = grouped.get(name);
      group.totalMg += totalMg;
      group.totalQty += quantity;
    });
    
    // Sort by total quantity descending (most vials = most stocked)
    const sorted = Array.from(grouped.values())
      .filter(g => g.totalQty > 0)
      .sort((a, b) => b.totalQty - a.totalQty);
    
    // If 3 or fewer groups, everything is "well stocked"
    if (sorted.length <= 3) {
      return { topWellStocked: sorted, lowestItems: [] };
    }
    
    // Top 3 = well stocked, remaining bottom 2 = running low (guaranteed no overlap)
    const well = sorted.slice(0, 3);
    const low = sorted.slice(Math.max(3, sorted.length - 2)).sort((a, b) => a.totalQty - b.totalQty);
    
    return { topWellStocked: well, lowestItems: low };
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
      <div className={`px-4 py-3 widget-separator`} style={{ borderColor: theme.isDark ? 'transparent' : 'rgba(47, 59, 58, 0.4)' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold flex items-center gap-2" style={{ color: theme.text }}>
            Stockpile
            <Package size={20} weight="duotone" style={{ color: theme.primary }} />
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
              <CaretDown size={14} weight="bold" />
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Top 3 Well Stocked */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <CaretDoubleUp size={15} weight="bold" style={{ color: darkerSageColor }} />
                <h4 className="text-xs font-semibold" style={{ color: theme.text }}>
                  Well Stocked
                </h4>
              </div>
              {topWellStocked.length === 0 ? (
                <p className="text-xs" style={{ color: theme.textLight }}>No well stocked items</p>
              ) : (
                <ul className="space-y-1.5">
                  {topWellStocked.map((item, idx) => (
                    <li 
                      key={`${item.name}-${idx}`}
                      className="flex items-center justify-between py-2 px-3 text-xs transition-all duration-200"
                      style={{ 
                        backgroundColor: 'transparent',
                        borderLeft: `3px solid ${theme.isDark ? 'rgba(255,255,255,0.12)' : darkerSageColor + '40'}`,
                        boxShadow: idx < topWellStocked.length - 1
                          ? `0 1px 0 ${theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(127, 158, 149, 0.08)'}`
                          : 'none'
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
                <CaretDoubleDown size={15} weight="bold" style={{ color: terracottaColor }} />
                <h4 className="text-xs font-semibold" style={{ color: theme.text }}>
                  Running Low
                </h4>
              </div>
              {lowestItems.length === 0 ? (
                <p className="text-xs" style={{ color: theme.textLight }}>No items found</p>
              ) : (
                <ul className="space-y-1.5">
                  {lowestItems.map((item, idx) => (
                    <li 
                      key={`${item.name}-${idx}`}
                      className="flex items-center justify-between py-2 px-3 text-xs transition-all duration-200"
                      style={{ 
                        backgroundColor: 'transparent',
                        borderLeft: `3px solid ${theme.isDark ? 'rgba(200, 122, 92, 0.35)' : terracottaColor + '40'}`,
                        boxShadow: idx < lowestItems.length - 1
                          ? `0 1px 0 ${theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(127, 158, 149, 0.08)'}`
                          : 'none'
                      }}
                    >
                      <span className="font-medium truncate flex-1" style={{ color: theme.text }}>
                        {item.name}
                      </span>
                      <span className="font-semibold ml-2 whitespace-nowrap" style={{ color: terracottaColor }}>
                        {item.totalMg.toLocaleString()} mg
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
