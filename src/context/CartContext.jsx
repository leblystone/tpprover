import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { trackShopEvent, EVENTS } from '../services/shopAnalytics';

const STORAGE_KEY = 'tpp_cart_v1';

const CartContext = createContext(null);

function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD': {
      const existing = state.find((i) => i.id === action.item.id);
      if (existing) {
        return state.map((i) =>
          i.id === action.item.id ? { ...i, qty: i.qty + (action.item.qty || 1) } : i
        );
      }
      return [...state, { ...action.item, qty: action.item.qty || 1 }];
    }
    case 'REMOVE':
      return state.filter((i) => i.id !== action.id);
    case 'UPDATE_QTY':
      return state
        .map((i) => (i.id === action.id ? { ...i, qty: action.qty } : i))
        .filter((i) => i.qty > 0);
    case 'CLEAR':
      return [];
    default:
      return state;
  }
}

function cartValueFromItems(items) {
  return items.reduce((sum, i) => sum + (Number(i.price) || 0) * (i.qty || 0), 0);
}

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(cartReducer, [], loadCart);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (_) {}
  }, [items]);

  const cartCount = items.reduce((sum, i) => sum + i.qty, 0);
  const cartTotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  const addItem = (item) => {
    dispatch({ type: 'ADD', item });
    const qty = item.qty || 1;
    const nextItems = (() => {
      const existing = items.find((i) => i.id === item.id);
      if (existing) {
        return items.map((i) =>
          i.id === item.id ? { ...i, qty: i.qty + qty } : i
        );
      }
      return [...items, { ...item, qty }];
    })();
    trackShopEvent(EVENTS.ADD_TO_CART, {
      productId: item.id,
      slug: item.slug || '',
      name: item.name || '',
      qty: String(qty),
      cartValue: String(cartValueFromItems(nextItems)),
    });
  };

  const removeItem = (id) => {
    const removed = items.find((i) => i.id === id);
    dispatch({ type: 'REMOVE', id });
    if (removed) {
      const nextItems = items.filter((i) => i.id !== id);
      trackShopEvent(EVENTS.REMOVE_FROM_CART, {
        productId: id,
        slug: removed.slug || '',
        name: removed.name || '',
        cartValue: String(cartValueFromItems(nextItems)),
      });
    }
  };

  const updateQty = (id, qty) => {
    const existing = items.find((i) => i.id === id);
    if (existing && qty <= 0) {
      removeItem(id);
      return;
    }
    dispatch({ type: 'UPDATE_QTY', id, qty });
  };

  const clearCart = () => dispatch({ type: 'CLEAR' });

  return (
    <CartContext.Provider value={{ items, cartCount, cartTotal, addItem, removeItem, updateQty, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

const EMPTY_CART = {
  items: [], cartCount: 0, cartTotal: 0,
  addItem: () => {}, removeItem: () => {}, updateQty: () => {}, clearCart: () => {},
};

export function useCart() {
  const ctx = useContext(CartContext);
  return ctx || EMPTY_CART;
}
