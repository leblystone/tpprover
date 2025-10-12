import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, AlertTriangle, Package } from 'lucide-react';

function useLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

const InventoryWidget = ({ widget, theme }) => {
  const navigate = useNavigate();
  const stockpile = useLocal('tpprover_stockpile', []);

  const inventoryData = useMemo(() => {
    const lowStock = stockpile.filter(s => Number(s.quantity) <= 1);
    const outOfStock = stockpile.filter(s => Number(s.quantity) === 0);
    const totalItems = stockpile.length;
    const wellStocked = stockpile.filter(s => Number(s.quantity) > 3);

    return { 
      lowStock: lowStock.length, 
      outOfStock: outOfStock.length,
      totalItems,
      wellStocked: wellStocked.length
    };
  }, [stockpile]);

  const getStockColor = (count) => {
    if (count === 0) return theme.success;
    if (count <= 2) return theme.warning;
    return theme.error;
  };

  const handleClick = () => {
    navigate('/app/stockpile');
  };

  return (
    <div 
      className="h-full flex flex-col cursor-pointer transition-all hover:shadow-lg" 
      onClick={handleClick}
      style={{ borderRadius: '12px' }}
    >
      <div className="px-4 py-3 border-b" style={{ borderColor: theme.border }}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color: theme.text }}>
            Inventory
          </h3>
          <Package size={20} style={{ color: theme.primary }} />
        </div>
      </div>
      
      <div className="flex-1 p-4">
        {inventoryData.totalItems === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Package size={24} style={{ color: theme.textLight }} className="mb-2" />
            <p className="text-sm" style={{ color: theme.textLight }}>
              No inventory tracked
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Main metric */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Archive size={24} style={{ color: getStockColor(inventoryData.lowStock) }} />
              </div>
              
              <div 
                className="text-3xl font-bold mb-1" 
                style={{ color: getStockColor(inventoryData.lowStock) }}
              >
                {inventoryData.lowStock}
              </div>
              
              <div className="text-sm" style={{ color: theme.textLight }}>
                low stock items
              </div>
            </div>

            {/* Stock breakdown */}
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-2 rounded" style={{ backgroundColor: theme.secondary }}>
                <div className="text-lg font-semibold" style={{ color: theme.error }}>
                  {inventoryData.outOfStock}
                </div>
                <div className="text-xs" style={{ color: theme.textLight }}>
                  Out of Stock
                </div>
              </div>
              
              <div className="p-2 rounded" style={{ backgroundColor: theme.secondary }}>
                <div className="text-lg font-semibold" style={{ color: theme.success }}>
                  {inventoryData.wellStocked}
                </div>
                <div className="text-xs" style={{ color: theme.textLight }}>
                  Well Stocked
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryWidget;
