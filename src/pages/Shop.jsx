import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { BookOpen, Package, Download, X, Check } from 'lucide-react';
import CartPanel from '../components/shop/CartPanel';
import CartBadge from '../components/shop/CartBadge';
import QtyPicker from '../components/shop/QtyPicker';
import NotifyButton, { NOTIFY_BUTTON_KEYFRAMES } from '../components/shop/NotifyButton';
import ShopHeader from '../components/shop/ShopHeader';
import { Link, useNavigate } from 'react-router-dom';
import LandingFooter from '../components/layout/LandingFooter';
import { themes, defaultThemeName } from '../theme/themes';
import { useCart } from '../context/CartContext';
import { useShopProducts, getProductsByCategory } from '../config/plannerProducts';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import { usePageSEO } from '../utils/pageSEO';
import useShopPageView from '../utils/useShopPageView';
import { trackShopCheckoutStarted } from '../services/shopAnalytics';
import RecentReviewsCarousel from '../components/shop/RecentReviewsCarousel';
import ProductReviewsSection from '../components/shop/ProductReviewsSection';

const theme = themes[defaultThemeName];

// Warm cream background — must match the cream baked into the product photos exactly
const SHOP_BG = '#f0eee7';

const ADDED_CHIP_KEYFRAMES = `
@keyframes chipFloat {
  0%   { opacity: 0; transform: translateX(-50%) translateY(0px) scale(0.85); }
  18%  { opacity: 1; transform: translateX(-50%) translateY(-10px) scale(1); }
  65%  { opacity: 1; transform: translateX(-50%) translateY(-14px) scale(1); }
  100% { opacity: 0; transform: translateX(-50%) translateY(-22px) scale(0.95); }
}
.added-chip { animation: chipFloat 1.4s cubic-bezier(0.22,1,0.36,1) forwards; }
`;

// â”€â”€â”€ Quick View Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function QuickViewModal({ product, onClose, onAdd }) {
  const { items, updateQty, removeItem } = useCart();
  const cartItem = items.find(i => i.id === product.id);
  const qty = cartItem?.qty ?? 0;
  const [imgIdx, setImgIdx] = useState(0);
  const [chipKey, setChipKey] = useState(null);
  const overlayRef = useRef(null);

  const stock = product.stock ?? null;
  const isOut = stock !== null && stock <= 0;
  const isLow = stock !== null && stock > 0 && stock <= 5;

  const imgs = product.images?.length > 0
    ? product.images.map(i => i?.url || i).filter(Boolean)
    : [product.image?.url || product.image, product.hoverImage?.url || product.hoverImage].filter(Boolean);

  // close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleAdd = () => {
    onAdd(product);
    setChipKey(Date.now());
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col sm:flex-row"
        style={{ backgroundColor: '#ffffff', maxHeight: '90vh' }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-black/10"
          aria-label="Close"
        >
          <X size={16} style={{ color: theme.textLight }} />
        </button>

        {/* Image */}
        <div className="w-full sm:w-5/12 flex-shrink-0 relative aspect-[3/4] sm:aspect-auto"
          style={{ backgroundColor: SHOP_BG }}>
          {imgs.length > 0 ? (
            <>
              <img
                src={imgs[imgIdx]}
                alt={product.name}
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                className="w-full h-full object-contain select-none"
                style={{ minHeight: 220 }}
              />
              {imgs.length > 1 && (
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                  {imgs.map((_, i) => (
                    <button key={i} onClick={() => setImgIdx(i)}
                      className="rounded-full transition-all"
                      style={{
                        width: i === imgIdx ? 16 : 5, height: 5,
                        backgroundColor: i === imgIdx ? theme.primary : `${theme.text}30`,
                      }} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center opacity-20">
              <BookOpen className="w-12 h-12" style={{ color: theme.primary }} />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 flex flex-col p-6 overflow-y-auto">
          <p className="text-[10px] font-bold tracking-[0.15em] uppercase mb-1" style={{ color: theme.textLight }}>
            {product.category}
          </p>
          <h2 className="text-lg font-bold leading-snug" style={{ color: theme.text }}>{product.name}</h2>
          <p className="text-xl font-bold mt-1 mb-4" style={{ color: theme.primaryDark }}>
            ${Number(product.price).toFixed(2)}
          </p>

          {isLow && !isOut && (
            <p className="text-xs font-semibold mb-3" style={{ color: '#C4622D' }}>Only {stock} left</p>
          )}

          <style>{ADDED_CHIP_KEYFRAMES}{NOTIFY_BUTTON_KEYFRAMES}</style>
          <div className="relative mt-auto">
            {chipKey && (
              <span key={chipKey}
                className="added-chip pointer-events-none absolute -top-1 left-1/2 z-20 px-3 py-1 rounded-full text-[10px] font-bold tracking-wide text-white whitespace-nowrap"
                style={{ backgroundColor: theme.primary }}>
                <span className="inline-flex items-center gap-1"><Check size={11} strokeWidth={3} aria-hidden />Added!</span>
              </span>
            )}
            {isOut ? (
              <button disabled className="w-full py-3 rounded-xl text-sm font-semibold cursor-not-allowed"
                style={{ backgroundColor: `${theme.text}10`, color: theme.textLight }}>
                Sold Out
              </button>
            ) : qty > 0 ? (
              <QtyPicker
                qty={qty}
                onInc={handleAdd}
                onDec={() => qty <= 1 ? removeItem(product.id) : updateQty(product.id, qty - 1)}
              />
            ) : (
              <button onClick={handleAdd}
                className="w-full py-3 rounded-xl text-sm font-bold tracking-wide uppercase text-white transition-all hover:opacity-95 active:scale-[0.98]"
                style={{
                  backgroundColor: theme.primary,
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -3px 0 rgba(0,0,0,0.15)',
                }}>
                Add to Cart
              </button>
            )}
          </div>

          <ProductReviewsSection product={product} compact maxReviews={3} className="border-0 !py-4 -mx-2" />

          {product.slug && (
            <Link
              to={`/shop/products/${product.slug}`}
              onClick={onClose}
              className="block text-center text-xs font-semibold mt-3 hover:underline transition-opacity hover:opacity-70"
              style={{ color: theme.textLight }}
            >
              View full details →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ Product Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ProductCard({ product, onAdd }) {
  const { items, updateQty, removeItem } = useCart();
  const cartItem = items.find(i => i.id === product.id);
  const qty = cartItem?.qty ?? 0;

  const stock = product.stock ?? null;
  const isOut = stock !== null && stock <= 0;
  const isLow = stock !== null && stock > 0 && stock <= 5;
  const [hovered, setHovered] = useState(false);
  const [chipKey, setChipKey] = useState(null);
  const [quickView, setQuickView] = useState(false);

  const handleInc = () => {
    onAdd(product);
    setChipKey(Date.now());
  };
  const handleDec = () => {
    if (qty <= 1) removeItem(product.id);
    else updateQty(product.id, qty - 1);
  };

  const imgs = product.images?.length > 0 ? product.images : [product.image, product.hoverImage].filter(Boolean);
  const mainImgObj = imgs[0] || null;
  const hoverImgObj = imgs[1] || null;
  const mainImg = mainImgObj?.url || mainImgObj || null;
  const hoverImg = hoverImgObj?.url || hoverImgObj || null;
  const mainAlt = mainImgObj?.alt || product.name;
  const hoverAlt = hoverImgObj?.alt || product.name;
  const displayImg = hovered && hoverImg ? hoverImg : mainImg;

  const IconEl = { planner: BookOpen, accessory: Package, digital: Download }[product.category] || BookOpen;

  return (
    <div className="group flex flex-col cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>

      {/* Image — portrait 3:4, no border, background matches page */}
      <div className="relative w-full overflow-hidden" style={{ paddingBottom: '133%', background: SHOP_BG }}>
        {isOut && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <span className="px-5 py-2 text-xs font-bold tracking-[0.2em] uppercase border" style={{ color: '#999', borderColor: '#99999940', backgroundColor: 'rgba(240,238,231,0.85)' }}>
              Sold Out
            </span>
          </div>
        )}

        {/* Image layer: zoom on hover, fade on image swap */}
        {displayImg ? (
          <>
            {/* Main image — always mounted */}
            <img
              src={mainImg}
              alt={mainAlt}
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
              className="absolute inset-0 w-full h-full object-contain select-none"
              style={{
                transform: hovered ? 'scale(1.07)' : 'scale(1)',
                transition: 'transform 0.45s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.3s ease',
                opacity: hovered && hoverImg ? 0 : 1,
              }}
            />
            {/* Hover image — fades in on top */}
            {hoverImg && (
              <img
                src={hoverImg}
                alt={hoverAlt}
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                className="absolute inset-0 w-full h-full object-contain select-none"
                style={{
                  transform: hovered ? 'scale(1.07)' : 'scale(1.02)',
                  transition: 'transform 0.45s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.3s ease',
                  opacity: hovered ? 1 : 0,
                }}
              />
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-20">
            <IconEl className="w-12 h-12" style={{ color: theme.primary }} />
          </div>
        )}

        {/* Clickable overlay (preserves link without wrapping images) */}
        {product.slug && (
          <Link to={`/shop/products/${product.slug}`} className="absolute inset-0 z-10" aria-label={product.name} />
        )}

        {/* Quick View — desktop only, slides up on hover */}
        {!isOut && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setQuickView(true); }}
            className="hidden lg:block absolute bottom-0 left-0 right-0 z-20 py-2 text-[10px] font-bold tracking-[0.15em] uppercase text-white transition-all duration-300"
            style={{
              backgroundColor: `${theme.primary}ee`,
              transform: hovered ? 'translateY(0)' : 'translateY(100%)',
              opacity: hovered ? 1 : 0,
            }}
          >
            Quick View
          </button>
        )}
      </div>

      {quickView && (
        <QuickViewModal
          product={product}
          onClose={() => setQuickView(false)}
          onAdd={(p) => { onAdd(p); setChipKey(Date.now()); }}
        />
      )}

      {/* Name — ALL CAPS, centered, tight tracking */}
      <div className="pt-3 pb-1 text-center">
        {product.slug ? (
          <Link to={`/shop/products/${product.slug}`}>
            <h3 className="text-[10px] font-bold tracking-[0.15em] uppercase leading-tight hover:opacity-60 transition-opacity"
              style={{ color: theme.text }}>
              {product.name}
            </h3>
          </Link>
        ) : (
          <h3 className="text-[10px] font-bold tracking-[0.15em] uppercase leading-tight"
            style={{ color: theme.text }}>
            {product.name}
          </h3>
        )}
        <p className="text-[11px] mt-0.5 font-medium" style={{ color: theme.textLight }}>
          ${Number(product.price).toFixed(2)}
        </p>
        {isLow && !isOut && (
          <p className="text-[10px] mt-0.5 font-semibold tracking-wide" style={{ color: '#C4622D' }}>
            Only {stock} left
          </p>
        )}
      </div>

      {/* CTA — stepper if in cart, add button if not, notify if out */}
      <style>{ADDED_CHIP_KEYFRAMES}{NOTIFY_BUTTON_KEYFRAMES}</style>
      <div className="relative mt-auto pt-1.5">
        {/* Floating "Added!" chip */}
        {chipKey && (
          <span
            key={chipKey}
            className="added-chip pointer-events-none absolute -top-1 left-1/2 z-20 px-3 py-1 rounded-full text-[10px] font-bold tracking-wide text-white whitespace-nowrap"
            style={{ backgroundColor: theme.primary, boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}
            onAnimationEnd={() => setChipKey(null)}
          >
            <span className="inline-flex items-center gap-1"><Check size={11} strokeWidth={3} aria-hidden />Added!</span>
          </span>
        )}

        {isOut ? (
          <NotifyButton product={product} />
        ) : qty > 0 ? (
          <QtyPicker qty={qty} onInc={handleInc} onDec={handleDec} compact />
        ) : (
          <button
            onClick={() => { onAdd(product); setChipKey(Date.now()); }}
            className="w-full py-2.5 rounded-lg text-[10px] font-bold tracking-[0.15em] uppercase transition-all active:scale-[0.98] text-white"
            style={{
              backgroundColor: theme.primary,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -2px 0 rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.12)',
            }}>
            Add to Cart
          </button>
        )}
      </div>
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="flex flex-col animate-pulse">
      <div className="w-full" style={{ paddingBottom: '133%', background: '#DDD9D2', borderRadius: 0 }} />
      <div className="pt-3 space-y-1.5">
        <div className="h-2.5 rounded bg-stone-300 w-3/4 mx-auto" />
        <div className="h-2 rounded bg-stone-200 w-1/4 mx-auto" />
        <div className="h-8 mt-2 bg-stone-300" />
      </div>
    </div>
  );
}

// â”€â”€â”€ Category Filter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CATEGORY_LABELS = { all: 'ALL', planner: 'PLANNERS', accessory: 'ACCESSORIES', digital: 'DIGITAL' };

// â”€â”€â”€ Main Shop Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function Shop() {
  usePageSEO();
  useShopPageView('home');
  const { items, cartCount, cartTotal, addItem } = useCart();
  const { products, loading: productsLoading, error } = useShopProducts();

  const [activeCategory, setActiveCategory] = useState('all');
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  React.useEffect(() => {
    document.title = 'Shop — PEP Planners, Accessories & Digital Downloads | The Pep Planner';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Shop physical PEP Planners, planner tabs, bookmarks, and digital downloads. Research planners built for tracking peptide protocols.');
  }, []);

  const filteredProducts = useMemo(() => {
    return activeCategory === 'all' ? products : getProductsByCategory(products, activeCategory);
  }, [products, activeCategory]);

  const handleAddToCart = useCallback((product) => {
    addItem({
      id: product.id, name: product.name, slug: product.slug, price: Number(product.price),
      image: product.image || null,
      stripePriceId: product.stripePriceId, requiresShipping: product.requiresShipping,
    });
  }, [addItem]);

  const handleCheckout = useCallback(async (marketingConsent = false) => {
    if (items.length === 0) return;

    const missingPrice = items.filter((item) => !item.stripePriceId);
    if (missingPrice.length > 0) {
      alert(
        `“${missingPrice[0].name}” is missing a Stripe price ID. Add it in Admin → Shop Products, then try again.`
      );
      return;
    }

    setCheckoutLoading(true);
    trackShopCheckoutStarted(items, cartTotal);
    try {
      const createSession = httpsCallable(functions, 'createPhysicalCheckoutSession');
      const lineItems = items.map((item) => ({
        priceId: item.stripePriceId,
        quantity: item.qty,
        requiresShipping: item.requiresShipping !== false,
      }));

      const timeoutMs = 45000;
      const { data } = await Promise.race([
        createSession({ lineItems, marketingConsent: marketingConsent === true }),
        new Promise((_, reject) => {
          setTimeout(
            () => reject(new Error('Checkout timed out. Check your connection and try again.')),
            timeoutMs
          );
        }),
      ]);

      if (data?.url) {
        window.location.assign(data.url);
        return;
      }

      throw new Error('No checkout URL returned. Please try again.');
    } catch (err) {
      console.error('Checkout error:', err);
      const msg =
        err?.message ||
        err?.details ||
        'Something went wrong starting checkout. Please try again.';
      alert(String(msg).replace(/^FirebaseError:\s*/i, ''));
      setCheckoutLoading(false);
    }
  }, [items, cartTotal]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: SHOP_BG }}>
      <ShopHeader cartCount={cartCount} onCartOpen={() => setCartOpen(true)} />

      {/* Category toggle */}
      <div className="sticky top-[60px] lg:top-[68px] z-40 bg-white border-b" style={{ borderColor: '#DDE6DE' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-5 flex items-center justify-center h-14">
          <div
            className="inline-flex p-1 rounded-xl border w-full max-w-md sm:max-w-lg"
            role="tablist"
            aria-label="Shop categories"
            style={{ backgroundColor: '#EFF2EE', borderColor: '#DDE6DE' }}
          >
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
              const active = activeCategory === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveCategory(key)}
                  className="flex-1 py-2 px-1 sm:px-2 rounded-lg text-[10px] sm:text-[11px] font-bold tracking-[0.12em] uppercase whitespace-nowrap transition-all duration-200"
                  style={
                    active
                      ? {
                          color: '#FFFFFF',
                          backgroundColor: '#7F9E95',
                          boxShadow: '0 1px 4px rgba(47,59,58,0.14)',
                        }
                      : {
                          color: '#6B7D7A',
                          backgroundColor: 'transparent',
                        }
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Product grid — no card borders, products "float" on cream bg */}
      <main className="max-w-6xl mx-auto px-5 sm:px-8 lg:px-10 py-8 pb-10">
        {productsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
            {[1,2,3,4,5,6,7,8].map(n => <ProductSkeleton key={n} />)}
          </div>
        ) : error ? (
          <div className="text-center py-24">
            <p className="text-sm text-red-400">Couldn't load products — please refresh.</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-[11px] font-bold tracking-[0.15em] uppercase" style={{ color: '#9B958D' }}>
              {products.length === 0 ? 'Products coming soon' : 'Nothing in this category yet'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
            {filteredProducts.map(product => (
              <ProductCard key={product.id} product={product} onAdd={handleAddToCart} />
            ))}
          </div>
        )}
      </main>

      <RecentReviewsCarousel fadeColor={SHOP_BG} />

      <LandingFooter />

      <CartPanel
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={handleCheckout}
        loading={checkoutLoading}
        products={products}
      />
    </div>
  );
}
