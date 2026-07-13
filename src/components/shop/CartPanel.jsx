import React, { useState, useMemo } from 'react';
import { X, Minus, Plus, Trash2, ArrowRight, Sparkles, Loader } from 'lucide-react';
import { Bag } from '@phosphor-icons/react';
import { useCart } from '../../context/CartContext';
import { themes, defaultThemeName } from '../../theme/themes';
import ShopMarketingConsentCheckbox from './ShopMarketingConsentCheckbox';

const theme = themes[defaultThemeName];

export default function CartPanel({ open, onClose, onCheckout, loading, products = [] }) {
  const { items, cartTotal, removeItem, updateQty, clearCart, addItem } = useCart();
  const [marketingConsent, setMarketingConsent] = useState(false);

  const suggestions = useMemo(() => {
    if (!items.length || !products.length) return [];
    const cartIds = new Set(items.map(i => i.id));
    const relatedIds = new Set();
    items.forEach(item => {
      const p = products.find(p => p.id === item.id);
      if (p?.relatedProductIds?.length) p.relatedProductIds.forEach(rid => { if (!cartIds.has(rid)) relatedIds.add(rid); });
    });
    return products.filter(p => relatedIds.has(p.id) && p.active !== false && (p.stock ?? 1) > 0).slice(0, 3);
  }, [items, products]);

  const handleAddSuggestion = (product) => {
    addItem({
      id: product.id, name: product.name, price: Number(product.price),
      image: typeof product.image === 'string' ? product.image : product.image?.url || null,
      stripePriceId: product.stripePriceId, requiresShipping: product.requiresShipping,
    });
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div
        className={`fixed top-0 right-0 z-[9999] h-full w-full max-w-sm bg-white shadow-2xl transition-transform duration-300 ease-out flex flex-col ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#DDE6DE' }}>
          <div className="flex items-center gap-2">
            <Bag size={20} weight="duotone" style={{ color: theme.primary }} />
            <h2 className="text-base font-bold" style={{ color: theme.text }}>Your Cart</h2>
            {items.length > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: theme.primary }}>{items.length}</span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/5">
            <X className="w-5 h-5" style={{ color: theme.textLight }} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-20">
              <Bag size={48} weight="duotone" style={{ color: theme.textLight, opacity: 0.15 }} />
              <p className="text-sm font-medium" style={{ color: theme.textLight }}>Your cart is empty</p>
              <button onClick={onClose} className="text-sm font-semibold underline" style={{ color: theme.primary }}>
                Continue shopping
              </button>
            </div>
          ) : (
            items.map(item => (
              <div key={item.id} className="flex gap-3 p-3 rounded-xl" style={{ backgroundColor: `${theme.text}05` }}>
                {item.image && (
                  <img src={item.image} alt={item.name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: theme.text }}>{item.name}</p>
                  <p className="text-sm font-bold mt-0.5" style={{ color: theme.primary }}>${item.price.toFixed(2)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <button onClick={() => updateQty(item.id, item.qty - 1)}
                      className="w-7 h-7 flex items-center justify-center rounded-md border hover:bg-black/5"
                      style={{ borderColor: `${theme.text}20` }}>
                      <Minus className="w-3.5 h-3.5" style={{ color: theme.text }} />
                    </button>
                    <span className="text-sm font-medium w-6 text-center" style={{ color: theme.text }}>{item.qty}</span>
                    <button onClick={() => updateQty(item.id, item.qty + 1)}
                      className="w-7 h-7 flex items-center justify-center rounded-md border hover:bg-black/5"
                      style={{ borderColor: `${theme.text}20` }}>
                      <Plus className="w-3.5 h-3.5" style={{ color: theme.text }} />
                    </button>
                    <button onClick={() => removeItem(item.id)} className="ml-auto p-1.5 rounded-md hover:bg-red-50">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && items.length > 0 && (
          <div className="px-5 py-3 border-t" style={{ borderColor: '#DDE6DE' }}>
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5" style={{ color: theme.primary }} />
              <span className="text-xs font-semibold" style={{ color: theme.text }}>People also grab</span>
            </div>
            <div className="space-y-1.5">
              {suggestions.map(s => {
                const img = typeof s.image === 'string' ? s.image : s.image?.url;
                return (
                  <div key={s.id} className="flex items-center gap-2 p-1.5 rounded-lg" style={{ backgroundColor: `${theme.text}04` }}>
                    {img && <img src={img} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: theme.text }}>{s.name}</p>
                      <p className="text-[11px]" style={{ color: theme.primary }}>${Number(s.price).toFixed(2)}</p>
                    </div>
                    <button onClick={() => handleAddSuggestion(s)}
                      className="px-2 py-1 rounded text-[11px] font-semibold text-white flex-shrink-0"
                      style={{ backgroundColor: theme.primary }}>
                      + Add
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-5 py-4 border-t space-y-3" style={{ borderColor: '#DDE6DE' }}>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: theme.textLight }}>Subtotal</span>
              <span className="text-lg font-bold" style={{ color: theme.text }}>${cartTotal.toFixed(2)}</span>
            </div>
            <p className="text-xs" style={{ color: theme.textLight }}>Shipping & taxes calculated at checkout</p>
            <ShopMarketingConsentCheckbox
              checked={marketingConsent}
              onChange={setMarketingConsent}
            />
            <button
              onClick={() => onCheckout?.(marketingConsent)}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white shadow-md hover:opacity-95 disabled:opacity-60"
              style={{ backgroundColor: theme.primary }}>
              {loading ? <Loader className="w-5 h-5 animate-spin" /> : <><span>Checkout</span><ArrowRight className="w-4 h-4" /></>}
            </button>
            <button onClick={clearCart} className="w-full text-center text-xs py-1 hover:opacity-60" style={{ color: theme.textLight }}>
              Clear cart
            </button>
          </div>
        )}
      </div>
    </>
  );
}
