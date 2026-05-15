import React, { useState, useMemo, useCallback } from 'react';
import { ShoppingCart, Plus, Check, BookOpen, Package, Download, Loader } from 'lucide-react';
import LandingHeader from '../components/layout/LandingHeader';
import LandingFooter from '../components/layout/LandingFooter';
import CartDrawer from '../components/shop/CartDrawer';
import { themes, defaultThemeName } from '../theme/themes';
import { usePageSEO } from '../utils/pageSEO';
import { useCart } from '../context/CartContext';
import { useShopProducts, PRODUCT_CATEGORIES, getProductsByCategory } from '../config/plannerProducts';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getStripePromise } from '../config/stripe';

const CATEGORY_ICONS = {
  planner: BookOpen,
  accessory: Package,
  digital: Download,
};

const SIZE_OPTIONS = [
  { value: 'all', label: 'All Sizes' },
  { value: '7x10', label: '7\u00d710' },
  { value: '5x7', label: '5\u00d77' },
];

function ProductCard({ product, onAdd, justAdded }) {
  const theme = themes[defaultThemeName];
  const added = justAdded === product.id;

  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
      style={{ backgroundColor: theme.background, border: `1px solid ${theme.text}10` }}
    >
      <div
        className="aspect-[4/3] w-full flex items-center justify-center"
        style={{ backgroundColor: `${theme.primary}08` }}
      >
        {product.image ? (
          <img
            src={typeof product.image === 'string' ? product.image : product.image?.url}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
              if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <div
          className={`w-full h-full items-center justify-center ${product.image ? 'hidden' : 'flex'}`}
          style={{ backgroundColor: `${theme.primary}08` }}
        >
          {React.createElement(CATEGORY_ICONS[product.category] || BookOpen, {
            className: 'w-12 h-12 opacity-30',
            style: { color: theme.primary },
          })}
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-sm font-bold leading-snug" style={{ color: theme.text }}>
          {product.name}
        </h3>
        <p className="text-xs mt-1 flex-1" style={{ color: theme.textLight }}>
          {product.description}
        </p>

        <div className="flex items-center justify-between mt-4">
          <span className="text-lg font-bold" style={{ color: theme.primary }}>
            ${Number(product.price).toFixed(2)}
          </span>
          <button
            onClick={() => onAdd(product)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${added ? 'text-white' : 'text-white hover:opacity-90'}`}
            style={{ backgroundColor: added ? '#22c55e' : theme.primary }}
          >
            {added ? (
              <>
                <Check className="w-4 h-4" />
                Added
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Add to Cart
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="flex flex-col rounded-2xl overflow-hidden animate-pulse">
      <div className="aspect-[4/3] w-full bg-gray-200" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="flex items-center justify-between mt-4">
          <div className="h-5 bg-gray-200 rounded w-16" />
          <div className="h-8 bg-gray-200 rounded w-28" />
        </div>
      </div>
    </div>
  );
}

export default function Shop() {
  usePageSEO();
  const theme = themes[defaultThemeName];
  const { items, cartCount, addItem } = useCart();
  const { products, loading: productsLoading } = useShopProducts();

  const [activeCategory, setActiveCategory] = useState('planner');
  const [sizeFilter, setSizeFilter] = useState('all');
  const [cartOpen, setCartOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const filteredProducts = useMemo(() => {
    let list = getProductsByCategory(products, activeCategory);
    if (sizeFilter !== 'all' && activeCategory === 'planner') {
      list = list.filter((p) => p.size === sizeFilter);
    }
    return list;
  }, [products, activeCategory, sizeFilter]);

  const handleAddToCart = useCallback((product) => {
    addItem({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      image: typeof product.image === 'string' ? product.image : product.image?.url || null,
      stripePriceId: product.stripePriceId,
      requiresShipping: product.requiresShipping,
    });
    setJustAdded(product.id);
    setTimeout(() => setJustAdded(null), 1500);
  }, [addItem]);

  const handleCheckout = useCallback(async () => {
    if (items.length === 0) return;
    setCheckoutLoading(true);

    try {
      const functions = getFunctions();
      const createSession = httpsCallable(functions, 'createPhysicalCheckoutSession');

      const lineItems = items.map((item) => ({
        priceId: item.stripePriceId,
        quantity: item.qty,
        requiresShipping: item.requiresShipping !== false,
      }));

      const { data } = await createSession({ lineItems });

      if (data.url) {
        window.location.href = data.url;
      } else if (data.id) {
        const stripe = await getStripePromise();
        if (stripe) {
          await stripe.redirectToCheckout({ sessionId: data.id });
        }
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Something went wrong starting checkout. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  }, [items]);

  const categoryKeys = Object.keys(PRODUCT_CATEGORIES);

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.background }}>
      <LandingHeader />

      {/* Hero */}
      <section className="pt-12 pb-6 md:pt-20 md:pb-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div
            className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase"
            style={{ color: theme.primary, backgroundColor: `${theme.primary}14` }}
          >
            <BookOpen className="w-4 h-4" aria-hidden />
            The Pep Planner Shop
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-3" style={{ color: theme.primaryDark }}>
            Planners built for research
          </h1>
          <p className="text-base md:text-lg max-w-xl mx-auto leading-relaxed" style={{ color: theme.textLight }}>
            Physical planners, accessories, and digital downloads — everything you need to track your research offline.
          </p>
        </div>
      </section>

      {/* Category tabs + cart badge */}
      <div className="sticky top-0 z-40 border-b" style={{ backgroundColor: theme.background, borderColor: `${theme.text}10` }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex gap-1 overflow-x-auto py-3 -mb-px">
            {categoryKeys.map((key) => {
              const Icon = CATEGORY_ICONS[key] || BookOpen;
              const active = activeCategory === key;
              return (
                <button
                  key={key}
                  onClick={() => { setActiveCategory(key); setSizeFilter('all'); }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${active ? 'text-white shadow-sm' : ''}`}
                  style={active ? { backgroundColor: theme.primary } : { color: theme.textLight }}
                >
                  <Icon className="w-4 h-4" />
                  {PRODUCT_CATEGORIES[key]}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setCartOpen(true)}
            className="relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ml-2"
            style={{ color: theme.primary, backgroundColor: `${theme.primary}10` }}
          >
            <ShoppingCart className="w-4.5 h-4.5" />
            Cart
            {cartCount > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 flex items-center justify-center rounded-full text-[11px] font-bold text-white px-1"
                style={{ backgroundColor: theme.primary }}
              >
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Size filter (planners only) */}
      {activeCategory === 'planner' && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-1">
          <div className="flex gap-2">
            {SIZE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSizeFilter(opt.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${sizeFilter === opt.value ? 'text-white' : ''}`}
                style={
                  sizeFilter === opt.value
                    ? { backgroundColor: theme.primary }
                    : { color: theme.textLight, backgroundColor: `${theme.text}08` }
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Product grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-16">
        {productsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((n) => <ProductSkeleton key={n} />)}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-sm" style={{ color: theme.textLight }}>No products found in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAdd={handleAddToCart}
                justAdded={justAdded}
              />
            ))}
          </div>
        )}
      </section>

      <LandingFooter />

      {/* Cart drawer */}
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={handleCheckout}
        loading={checkoutLoading}
      />
    </div>
  );
}
