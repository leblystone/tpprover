import React, { useEffect, useRef } from 'react';
import { X, Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { themes, defaultThemeName } from '../../theme/themes';

export default function CartDrawer({ open, onClose, onCheckout, loading }) {
  const { items, cartCount, cartTotal, removeItem, updateQty, clearCart } = useCart();
  const theme = themes[defaultThemeName];
  const drawerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`fixed top-0 right-0 z-[9999] h-full w-full max-w-md shadow-2xl transition-transform duration-300 ease-out flex flex-col ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ backgroundColor: theme.background }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: `${theme.text}15` }}>
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" style={{ color: theme.primary }} />
            <h2 className="text-lg font-bold" style={{ color: theme.text }}>Your Cart</h2>
            {cartCount > 0 && (
              <span
                className="ml-1 text-xs font-bold px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: theme.primary }}
              >
                {cartCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-black/5"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" style={{ color: theme.textLight }} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-16">
              <ShoppingBag className="w-12 h-12 opacity-20" style={{ color: theme.textLight }} />
              <p className="text-sm font-medium" style={{ color: theme.textLight }}>Your cart is empty</p>
              <button
                onClick={onClose}
                className="mt-2 text-sm font-semibold underline"
                style={{ color: theme.primary }}
              >
                Continue shopping
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex gap-3 p-3 rounded-xl"
                style={{ backgroundColor: `${theme.text}06` }}
              >
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    style={{ backgroundColor: `${theme.text}10` }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: theme.text }}>{item.name}</p>
                  <p className="text-sm mt-0.5" style={{ color: theme.primary }}>
                    ${item.price.toFixed(2)}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => updateQty(item.id, item.qty - 1)}
                      className="w-7 h-7 flex items-center justify-center rounded-md border transition-colors hover:bg-black/5"
                      style={{ borderColor: `${theme.text}20` }}
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3.5 h-3.5" style={{ color: theme.text }} />
                    </button>
                    <span className="text-sm font-medium w-6 text-center" style={{ color: theme.text }}>
                      {item.qty}
                    </span>
                    <button
                      onClick={() => updateQty(item.id, item.qty + 1)}
                      className="w-7 h-7 flex items-center justify-center rounded-md border transition-colors hover:bg-black/5"
                      style={{ borderColor: `${theme.text}20` }}
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3.5 h-3.5" style={{ color: theme.text }} />
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="ml-auto p-1.5 rounded-md transition-colors hover:bg-red-50"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-6 py-4 border-t space-y-3" style={{ borderColor: `${theme.text}15` }}>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: theme.textLight }}>Subtotal</span>
              <span className="text-lg font-bold" style={{ color: theme.text }}>
                ${cartTotal.toFixed(2)}
              </span>
            </div>
            <p className="text-xs" style={{ color: theme.textLight }}>
              Shipping & taxes calculated at checkout
            </p>
            <button
              onClick={onCheckout}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white shadow-lg transition-all hover:opacity-95 hover:shadow-xl disabled:opacity-60 btn-primary-inset"
              style={{ backgroundColor: theme.primary }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing…
                </span>
              ) : (
                <>
                  Checkout
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            <button
              onClick={clearCart}
              className="w-full text-center text-xs font-medium py-1.5 transition-colors hover:opacity-70"
              style={{ color: theme.textLight }}
            >
              Clear cart
            </button>
          </div>
        )}
      </div>
    </>
  );
}
