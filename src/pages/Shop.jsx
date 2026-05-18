import React, { useState, useMemo, useCallback } from 'react';
import { ShoppingBag, Bell, AlertTriangle, Check, Plus, BookOpen, Package, Download } from 'lucide-react';
import CartPanel from '../components/shop/CartPanel';
import { Link, useNavigate } from 'react-router-dom';
import LandingFooter from '../components/layout/LandingFooter';
import { themes, defaultThemeName } from '../theme/themes';
import { useCart } from '../context/CartContext';
import { useShopProducts, getProductsByCategory } from '../config/plannerProducts';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getStripePromise } from '../config/stripe';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import logo from '../assets/tpp_logo.png';

const theme = themes[defaultThemeName];

// Warm cream background that matches the "floating" planner photo style
const SHOP_BG = '#EDE9E3';

// ─── Shop Header (logo left · nav center · LOGIN CART right) ──────────────────
function ShopHeader({ cartCount, onCartOpen }) {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [['/', 'THE APP'], ['/shop', 'SHOP'], ['/pricing', 'PRICING'], ['/faq', 'FAQ']];

  return (
    <>
      <header className="sticky top-0 z-[105] bg-white border-b" style={{ borderColor: '#DDE6DE' }}>
        <div className="w-full px-5 md:max-w-7xl md:mx-auto">

          {/* Mobile row */}
          <div className="flex lg:hidden items-center justify-between h-[60px]">
            <button
              onClick={() => setMobileOpen(o => !o)}
              aria-label="Menu"
              className="flex flex-col justify-center gap-[6px] w-9 h-9"
            >
              <span style={{ display:'block', width:20, height:1.5, borderRadius:1, backgroundColor:theme.text,
                transform: mobileOpen ? 'translateY(3.75px) rotate(45deg)' : 'none', transition:'transform 0.2s' }} />
              <span style={{ display:'block', width:20, height:1.5, borderRadius:1, backgroundColor:theme.text,
                transform: mobileOpen ? 'translateY(-3.75px) rotate(-45deg)' : 'none', transition:'transform 0.2s' }} />
            </button>

            <button onClick={() => navigate('/')} className="absolute left-1/2 -translate-x-1/2">
              <img src={logo} alt="The Pep Planner" className="h-11 w-11 object-contain"
                style={{ filter:'drop-shadow(0 2px 6px rgba(0,0,0,0.12))' }} />
            </button>

            <div className="flex items-center gap-1">
              <button onClick={() => navigate('/login?trial=true')}
                className="px-3 py-1.5 rounded text-[11px] font-bold tracking-wide uppercase text-white"
                style={{ backgroundColor: theme.primary }}>
                Sign Up
              </button>
              <button onClick={onCartOpen}
                className="relative p-2"
                style={{ color: theme.text }}>
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1"
                    style={{ backgroundColor: theme.primary }}>
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Desktop row */}
          <div className="hidden lg:flex items-center h-[68px] relative">
            {/* Logo — left */}
            <button onClick={() => navigate('/')} className="flex-shrink-0 mr-10">
              <img src={logo} alt="The Pep Planner" className="h-[52px] w-[52px] object-contain"
                style={{ filter:'drop-shadow(0 3px 8px rgba(0,0,0,0.13))' }} />
            </button>

            {/* Nav — center */}
            <nav className="flex items-center gap-8 flex-1">
              {navLinks.map(([path, label]) => (
                <Link key={path} to={path}
                  className="text-[11px] font-bold tracking-[0.13em] transition-opacity hover:opacity-60"
                  style={{ color: theme.text, textDecoration: path === '/shop' ? 'underline' : 'none', textUnderlineOffset: 4 }}>
                  {label}
                </Link>
              ))}
            </nav>

            {/* Right — login + cart */}
            <div className="flex items-center gap-5">
              <button onClick={() => navigate('/login')}
                className="text-[11px] font-bold tracking-[0.13em] uppercase transition-opacity hover:opacity-60"
                style={{ color: theme.text }}>
                LOGIN
              </button>
              <button onClick={onCartOpen}
                className="relative flex items-center gap-2 text-[11px] font-bold tracking-[0.13em] uppercase transition-opacity hover:opacity-70"
                style={{ color: theme.text }}>
                <ShoppingBag className="w-[18px] h-[18px]" />
                CART
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 left-3.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1"
                    style={{ backgroundColor: theme.primary }}>
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 top-[60px] z-[103] bg-black/20" onClick={() => setMobileOpen(false)} />
          <div className="fixed top-[60px] left-0 bottom-0 z-[104] w-60 bg-white shadow-2xl flex flex-col">
            <nav className="flex-1 py-5 px-4 space-y-0.5">
              {navLinks.map(([path, label]) => (
                <Link key={path} to={path} onClick={() => setMobileOpen(false)}
                  className="block px-3 py-3 text-[11px] font-bold tracking-widest uppercase"
                  style={{ color: theme.text }}>
                  {label}
                </Link>
              ))}
            </nav>
            <div className="p-4 border-t space-y-2" style={{ borderColor: theme.border }}>
              <button onClick={() => { setMobileOpen(false); navigate('/login?trial=true'); }}
                className="w-full py-2.5 rounded text-[11px] font-bold tracking-wide uppercase text-white"
                style={{ backgroundColor: theme.primary }}>
                Sign Up Free
              </button>
              <button onClick={() => { setMobileOpen(false); navigate('/login'); }}
                className="w-full py-2.5 rounded text-[11px] font-bold tracking-wide uppercase border"
                style={{ color: theme.primary, borderColor: theme.primary }}>
                Login
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ─── Notify Me ────────────────────────────────────────────────────────────────
function NotifyMe({ product }) {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim() || busy) return;
    setBusy(true);
    try {
      await addDoc(collection(db, 'notifyMeRequests'), {
        email: email.trim().toLowerCase(), productId: product.id,
        productName: product.name, createdAt: serverTimestamp(),
      });
      setDone(true);
    } catch {}
    finally { setBusy(false); }
  };

  if (done) return (
    <p className="text-[11px] text-center py-2 font-semibold tracking-wide" style={{ color: theme.primary }}>
      We'll notify you!
    </p>
  );

  return (
    <form onSubmit={submit} className="flex gap-1 mt-2">
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
        placeholder="your@email.com"
        className="flex-1 px-2 py-1.5 rounded border text-[11px] bg-transparent"
        style={{ borderColor: `${theme.text}25`, color: theme.text }} />
      <button type="submit" disabled={busy}
        className="px-2.5 py-1.5 rounded text-[11px] font-bold tracking-wide uppercase text-white disabled:opacity-50"
        style={{ backgroundColor: theme.primary }}>
        {busy ? '…' : 'Go'}
      </button>
    </form>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────
// Floating style: no card border/shadow, cream background, portrait image,
// hover swaps to hoverImage on desktop.
function ProductCard({ product, onAdd, justAdded }) {
  const added = justAdded === product.id;
  const stock = product.stock ?? null;
  const isOut = stock !== null && stock <= 0;
  const isLow = stock !== null && stock > 0 && stock <= 5;
  const [showNotify, setShowNotify] = useState(false);
  const [hovered, setHovered] = useState(false);

  const mainImg = product.image || null;
  const hoverImg = product.hoverImage || null;
  const displayImg = hovered && hoverImg ? hoverImg : mainImg;

  const IconEl = { planner: BookOpen, accessory: Package, digital: Download }[product.category] || BookOpen;

  return (
    <div className="group flex flex-col cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>

      {/* Image — portrait 3:4, no border, background matches page */}
      <div className="relative w-full overflow-hidden" style={{ paddingBottom: '133%', background: SHOP_BG }}>
        {isLow && !isOut && (
          <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500 text-white shadow">
            <AlertTriangle className="w-2.5 h-2.5" />Only {stock} left!
          </div>
        )}
        {isOut && (
          <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-500 text-white tracking-wide uppercase">
            Sold Out
          </div>
        )}

        {product.slug ? (
          <Link to={`/shop/products/${product.slug}`} className="absolute inset-0">
            {displayImg ? (
              <img
                src={displayImg}
                alt={product.name}
                className="absolute inset-0 w-full h-full object-contain"
                style={{ transition: 'opacity 0.25s ease' }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center opacity-20">
                <IconEl className="w-12 h-12" style={{ color: theme.primary }} />
              </div>
            )}
          </Link>
        ) : (
          <div className="absolute inset-0">
            {displayImg ? (
              <img
                src={displayImg}
                alt={product.name}
                className="absolute inset-0 w-full h-full object-contain"
                style={{ transition: 'opacity 0.25s ease' }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center opacity-20">
                <IconEl className="w-12 h-12" style={{ color: theme.primary }} />
              </div>
            )}
          </div>
        )}
      </div>

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
      </div>

      {/* CTA button */}
      <div className="mt-1.5">
        {isOut ? (
          <>
            <button
              onClick={() => setShowNotify(v => !v)}
              className="w-full py-2.5 text-[10px] font-bold tracking-[0.15em] uppercase border transition-colors"
              style={{ borderColor: `${theme.text}30`, color: theme.textLight, background: 'transparent' }}>
              <Bell className="w-3 h-3 inline mr-1.5" />Notify Me
            </button>
            {showNotify && <NotifyMe product={product} />}
          </>
        ) : (
          <button
            onClick={() => onAdd(product)}
            className="w-full py-2.5 text-[10px] font-bold tracking-[0.15em] uppercase transition-all active:scale-[0.98] text-white"
            style={{ backgroundColor: added ? '#22c55e' : theme.primary }}>
            {added ? (
              <><Check className="w-3 h-3 inline mr-1" />Added!</>
            ) : (
              <>Add to Cart</>
            )}
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

// ─── Category Filter ──────────────────────────────────────────────────────────
const CATEGORY_LABELS = { all: 'ALL', planner: 'PLANNERS', accessory: 'ACCESSORIES', digital: 'DIGITAL' };

// ─── Main Shop Page ───────────────────────────────────────────────────────────
export default function Shop() {
  const { items, cartCount, addItem } = useCart();
  const { products, loading: productsLoading, error } = useShopProducts();

  const [activeCategory, setActiveCategory] = useState('all');
  const [sizeFilter, setSizeFilter] = useState('all');
  const [cartOpen, setCartOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  React.useEffect(() => {
    document.title = 'Shop — PEP Planners, Accessories & Digital Downloads | The Pep Planner';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Shop physical PEP Planners, planner tabs, bookmarks, and digital downloads. Research planners built for tracking peptide protocols.');
  }, []);

  const filteredProducts = useMemo(() => {
    let list = activeCategory === 'all' ? products : getProductsByCategory(products, activeCategory);
    if (sizeFilter !== 'all' && activeCategory === 'planner') list = list.filter(p => p.size === sizeFilter);
    return list;
  }, [products, activeCategory, sizeFilter]);

  const handleAddToCart = useCallback((product) => {
    addItem({
      id: product.id, name: product.name, price: Number(product.price),
      image: product.image || null,
      stripePriceId: product.stripePriceId, requiresShipping: product.requiresShipping,
    });
    setJustAdded(product.id);
    setTimeout(() => setJustAdded(null), 1800);
  }, [addItem]);

  const handleCheckout = useCallback(async () => {
    if (items.length === 0) return;
    setCheckoutLoading(true);
    try {
      const functions = getFunctions();
      const createSession = httpsCallable(functions, 'createPhysicalCheckoutSession');
      const lineItems = items.map(item => ({ priceId: item.stripePriceId, quantity: item.qty, requiresShipping: item.requiresShipping !== false }));
      const { data } = await createSession({ lineItems });
      if (data.url) { window.location.href = data.url; }
      else if (data.id) {
        const stripe = await getStripePromise();
        if (stripe) await stripe.redirectToCheckout({ sessionId: data.id });
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Something went wrong starting checkout. Please try again.');
    } finally { setCheckoutLoading(false); }
  }, [items]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: SHOP_BG }}>
      <ShopHeader cartCount={cartCount} onCartOpen={() => setCartOpen(true)} />

      {/* Category nav bar — tight, all caps, minimal */}
      <div className="sticky top-[60px] lg:top-[68px] z-40 bg-white border-b" style={{ borderColor: '#DDE6DE' }}>
        <div className="max-w-6xl mx-auto px-5 flex items-center justify-between h-11 overflow-x-auto gap-4">
          <div className="flex items-center gap-0">
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
              const active = activeCategory === key;
              return (
                <button key={key}
                  onClick={() => { setActiveCategory(key); setSizeFilter('all'); }}
                  className="px-4 h-11 text-[10px] font-bold tracking-[0.15em] uppercase transition-all whitespace-nowrap border-b-2"
                  style={active
                    ? { color: theme.text, borderBottomColor: theme.text }
                    : { color: '#9B958D', borderBottomColor: 'transparent' }}>
                  {label}
                </button>
              );
            })}
          </div>

          {activeCategory === 'planner' && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {[['all','All Sizes'],['7x10','7×10'],['5x7','5×7']].map(([val, label]) => (
                <button key={val} onClick={() => setSizeFilter(val)}
                  className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase whitespace-nowrap transition-all"
                  style={sizeFilter === val
                    ? { backgroundColor: theme.primary, color: '#fff' }
                    : { color: '#9B958D', backgroundColor: `${theme.text}08` }}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Product grid — no card borders, products "float" on cream bg */}
      <main className="max-w-6xl mx-auto px-5 sm:px-8 lg:px-10 py-10 pb-28">
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
              <ProductCard key={product.id} product={product} onAdd={handleAddToCart} justAdded={justAdded} />
            ))}
          </div>
        )}
      </main>

      <LandingFooter />

      <CartPanel
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={handleCheckout}
        checkoutLoading={checkoutLoading}
      />
    </div>
  );
}
