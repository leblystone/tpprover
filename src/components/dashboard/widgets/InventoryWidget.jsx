import React, { useMemo } from 'react';
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
      wellStocked: wellStocked.length,
      lowStockItems: lowStock.slice(0, 3) // Show top 3 low stock items
    };
  }, [stockpile]);

  const getStockColor = (count) => {
    if (count === 0) return theme.success;
    if (count <= 2) return theme.warning;
    return theme.error;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b" style={{ borderColor: theme.border }}>
        <h3 className="text-lg font-semibold" style={{ color: theme.text }}>
          Inventory
        </h3>
      </div>
      
      <div className="flex-1 p-6">
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

            {/* Low stock items */}
            {inventoryData.lowStockItems.length > 0 && (
              <div>
                <div className="text-xs font-medium mb-2" style={{ color: theme.textLight }}>
                  Items needing restock:
                </div>
                <div className="space-y-1">
                  {inventoryData.lowStockItems.map((item, index) => (
                    <div 
                      key={index} 
                      className="flex items-center justify-between p-2 rounded text-sm"
                      style={{ backgroundColor: theme.secondary }}
                    >
                      <span style={{ color: theme.text }}>{item.name}</span>
                      <span 
                        className="text-xs px-2 py-1 rounded-full"
                        style={{ 
                          backgroundColor: theme.errorBg || theme.error + '20', 
                          color: theme.error 
                        }}
                      >
                        {item.quantity} left
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryWidget;
