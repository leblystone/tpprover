import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Bell, ChevronRight, ChevronLeft, Loader, BookOpen } from 'lucide-react';
import ShopHeader from '../components/shop/ShopHeader';
import LandingFooter from '../components/layout/LandingFooter';
import CartPanel from '../components/shop/CartPanel';
import QtyPicker from '../components/shop/QtyPicker';
import { themes, defaultThemeName } from '../theme/themes';
import { useCart } from '../context/CartContext';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getStripePromise } from '../config/stripe';
import { getProductSpecs } from '../config/plannerProducts';

const theme = themes[defaultThemeName];

// Generates a unique-per-product fallback so no two pages share identical meta text
function autoDescription(product) {
  if (!product?.name) return '';
  const size = product.size === '7x10' ? '7×10' : product.size === '5x7' ? '5×7' : product.size;
  const sizeStr = size ? ` in ${size}` : '';
  return `The ${product.name} is a Pep Planner${sizeStr} designed for peptide research tracking. ` +
    `Log GLP-1 protocols, Semaglutide and Tirzepatide injection schedules, reconstitution dates, and your full peptide stockpile. ` +
    `Made for researchers who want organized, reliable records in one dedicated planner.`;
}

const PLANNER_CONTENT = [
  'Protocol Management Pages', 'Injection Logging', 'Reconstitution Date Tracking',
  'Peptide Stockpile Organizer', 'Research Schedule & Calendar', 'GLP-1 Dose Tracking',
  'Vial Tracking & Notes', 'Progress & Measurement Log',
];

function useSEO(product, slug) {
  useEffect(() => {
    if (!product) return;
    const title = `${product.name} | The PEP Planner`;
    const desc = (product.description || autoDescription(product)).slice(0, 160);
    const canonical = `https://thepepplanner.app/shop/products/${slug}`;
    const imageUrl = typeof product.image === 'string' ? product.image : product.image?.url;

    document.title = title;
    const setMeta = (attr, key, content) => {
      const el = document.querySelector(`meta[${attr}="${key}"]`);
      if (el) el.setAttribute('content', content);
    };
    setMeta('name', 'description', desc);
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', desc);
    setMeta('property', 'og:url', canonical);
    setMeta('property', 'og:type', 'product');
    if (imageUrl) setMeta('property', 'og:image', imageUrl);
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) { link = document.createElement('link'); link.setAttribute('rel', 'canonical'); document.head.appendChild(link); }
    link.setAttribute('href', canonical);
    return () => { document.title = 'The PEP Planner'; };
  }, [product, slug]);
}

function useJsonLd(product, slug) {
  useEffect(() => {
    if (!product) return;
    const imageUrl = typeof product.image === 'string' ? product.image : product.image?.url;
    const stock = product.stock ?? null;
    const inStock = stock === null || stock > 0;
    const ld = {
      '@context': 'https://schema.org', '@type': 'Product',
      name: product.name, image: imageUrl || '',
      description: product.description || autoDescription(product),
      sku: product.sku || '',
      brand: { '@type': 'Brand', name: 'The PEP Planner' },
      offers: { '@type': 'Offer', price: String(product.price), priceCurrency: 'USD',
        availability: `https://schema.org/${inStock ? 'InStock' : 'OutOfStock'}`,
        url: `https://thepepplanner.app/shop/products/${slug}` },
    };
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(ld);
    document.head.appendChild(script);
    return () => { try { document.head.removeChild(script); } catch {} };
  }, [product, slug]);
}

function NotifyMeForm({ product }) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim() || submitting) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'notifyMeRequests'), {
        email: email.trim().toLowerCase(), productId: product.id, productName: product.name, createdAt: serverTimestamp(),
      });
      setSubmitted(true);
    } catch {}
    finally { setSubmitting(false); }
  };
  if (submitted) return <div className="p-3 rounded-lg text-sm text-center font-medium" style={{ backgroundColor: `${theme.primary}10`, color: theme.primary }}>You're on the list — we'll email you when it's back!</div>;
  return (
    <form onSubmit={submit} className="flex gap-2">
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
        placeholder="your@email.com" className="flex-1 px-3 py-2.5 rounded-lg border text-sm"
        style={{ borderColor: `${theme.text}20`, color: theme.text }} />
      <button type="submit" disabled={submitting}
        className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: theme.primary }}>
        {submitting ? <Loader className="w-4 h-4 animate-spin" /> : 'Notify Me'}
      </button>
    </form>
  );
}

function UpsellCard({ product, onAdd }) {
  const [added, setAdded] = useState(false);
  const imageUrl = typeof product.image === 'string' ? product.image : product.image?.url;
  const handleAdd = () => {
    onAdd(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: '#E8EFE9', backgroundColor: '#FAFCFA' }}>
      <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
        {imageUrl ? <img src={imageUrl} alt={product.name} className="w-full h-full object-cover" />
          : <BookOpen className="w-6 h-6 m-auto mt-4 opacity-20" style={{ color: theme.primary }} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: theme.text }}>{product.name}</p>
        <p className="text-sm font-bold" style={{ color: theme.primary }}>${Number(product.price).toFixed(2)}</p>
      </div>
      <button onClick={handleAdd}
        className="flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold text-white transition-all active:scale-95"
        style={{ backgroundColor: added ? '#22c55e' : theme.primary }}>
        {added ? <><Check className="w-3.5 h-3.5" />Added</> : <><Plus className="w-3.5 h-3.5" />Add</>}
      </button>
    </div>
  );
}

export default function ShopProduct() {
  const { slug } = useParams();
  const { addItem, cartCount, items, updateQty, removeItem } = useCart();
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('description');
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [carouselDir, setCarouselDir] = useState(1); // 1 = forward, -1 = backward

  useEffect(() => {
    let cancelled = false;
    async function fetchProduct() {
      setLoading(true); setNotFound(false);
      try {
        const q = query(collection(db, 'shopProducts'), where('slug', '==', slug), where('active', '==', true), limit(1));
        const snap = await getDocs(q);
        if (cancelled) return;
        if (snap.empty) { setNotFound(true); return; }
        const p = { id: snap.docs[0].id, ...snap.docs[0].data() };
        setProduct(p);
        setCarouselIdx(0);
        // load related products
        if (p.relatedProductIds?.length) {
          const all = await getDocs(query(collection(db, 'shopProducts'), where('active', '==', true)));
          const related = all.docs
            .filter(d => p.relatedProductIds.includes(d.id))
            .map(d => ({ id: d.id, ...d.data(), image: d.data().image?.url || d.data().image || null }));
          if (!cancelled) setRelatedProducts(related);
        }
      } catch (err) {
        console.error('Failed to load product:', err);
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchProduct();
    return () => { cancelled = true; };
  }, [slug]);

  useSEO(product, slug);
  useJsonLd(product, slug);

  const stock = product?.stock ?? null;
  const isOut = stock !== null && stock <= 0;
  const isLow = stock !== null && stock > 0 && stock <= 5;

  const cartItem = product ? items.find(i => i.id === product.id) : null;
  const cartQty = cartItem?.qty ?? 0;

  const handleAdd = useCallback((p = product) => {
    if (!p || (p.id === product?.id && isOut)) return;
    addItem({ id: p.id, name: p.name, price: Number(p.price),
      image: typeof p.image === 'string' ? p.image : p.image?.url || null,
      stripePriceId: p.stripePriceId, requiresShipping: p.requiresShipping });
    if (p.id === product?.id) { setJustAdded(true); setTimeout(() => setJustAdded(false), 1800); }
  }, [product, isOut, addItem]);

  const handleCheckout = useCallback(async () => {
    if (items.length === 0) return;
    setCheckoutLoading(true);
    try {
      const fn = getFunctions();
      const createSession = httpsCallable(fn, 'createPhysicalCheckoutSession');
      const lineItems = items.map(item => ({ priceId: item.stripePriceId, quantity: item.qty, requiresShipping: item.requiresShipping !== false }));
      const { data } = await createSession({ lineItems });
      if (data.url) window.location.href = data.url;
      else if (data.id) { const stripe = await getStripePromise(); if (stripe) await stripe.redirectToCheckout({ sessionId: data.id }); }
    } catch (err) { console.error(err); alert('Checkout error. Please try again.'); }
    finally { setCheckoutLoading(false); }
  }, [items]);

  const imageUrl = product ? (typeof product.image === 'string' ? product.image : product.image?.url) : null;

  // Build slide array — prefer images[] array, fall back to image + hoverImage
  // Each slide: { url, alt }
  const slides = product
    ? (product.images?.length > 0
        ? product.images
            .map((img, i) => ({
              url: typeof img === 'string' ? img : img?.url,
              alt: img?.alt || `${product.name}${i === 0 ? '' : ` - image ${i + 1}`}`,
            }))
            .filter(s => s.url)
        : [product.image, product.hoverImage]
            .filter(Boolean)
            .map((img, i) => ({
              url: typeof img === 'string' ? img : img?.url,
              alt: `${product.name}${i === 0 ? '' : ` - image ${i + 1}`}`,
            })))
    : [];

  const description = product ? (product.description || autoDescription(product)) : '';
  const sizeNote = product?.size ? `Available in ${product.size === '7x10' ? '7×10' : product.size === '5x7' ? '5×7' : product.size}.` : null;
  const isPlanner = product?.category === 'planner';
  const specRows = product ? getProductSpecs(product) : [];
  const productTabs = isPlanner
    ? [
        ['description', 'Description'],
        ['content', 'Inside Content'],
        ['specs', 'Specs'],
      ]
    : [
        ['description', 'Description'],
        ['specs', 'Specs'],
      ];

  useEffect(() => {
    if (!product || isPlanner) return;
    setActiveTab((tab) => (tab === 'content' ? 'description' : tab));
  }, [product?.id, isPlanner]);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#f0eee7' }}>
      <ShopHeader cartCount={cartCount} onCartOpen={() => setCartOpen(true)} />

      <main className="flex-1">
        {loading ? (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
              <div className="aspect-[3/4] bg-gray-100 animate-pulse" />
              <div className="space-y-4 animate-pulse pt-2">
                <div className="h-7 bg-gray-100 rounded w-3/4" />
                <div className="h-6 bg-gray-100 rounded w-24" />
                <div className="h-4 bg-gray-50 rounded w-full" />
                <div className="h-4 bg-gray-50 rounded w-5/6" />
                <div className="h-12 bg-gray-100 rounded-lg w-full mt-6" />
              </div>
            </div>
          </div>
        ) : notFound || !product ? (
          <div className="max-w-2xl mx-auto px-4 py-24 text-center">
            <p className="text-5xl font-bold mb-3" style={{ color: theme.text }}>404</p>
            <p className="text-base mb-6" style={{ color: theme.textLight }}>This product couldn't be found.</p>
            <Link to="/shop" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: theme.primary }}>
              <ShoppingBag className="w-4 h-4" />Back to Shop
            </Link>
          </div>
        ) : (
          <>
            {/* ── Main product section — sits on cream, details are carded ── */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
              {/* Breadcrumb */}
              <nav className="flex items-center gap-1.5 text-xs mb-6" style={{ color: theme.textLight }}>
                <Link to="/shop" className="hover:underline font-medium" style={{ color: theme.primary }}>Shop</Link>
                <ChevronRight className="w-3 h-3" />
                <span style={{ color: theme.text }}>{product.name}</span>
              </nav>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 lg:gap-14">
                {/* ── Carousel ── */}
                <div className="relative select-none">
                  {/* Track */}
                  <div className={`aspect-[3/4] overflow-hidden relative ${isOut ? 'opacity-60' : ''}`}
                    style={{ backgroundColor: '#f0eee7' }}>
                    {slides.length > 0 ? slides.map((slide, i) => (
                      <img
                        key={slide.url}
                        src={slide.url}
                        alt={slide.alt}
                        draggable={false}
                        onContextMenu={(e) => e.preventDefault()}
                        className="absolute inset-0 w-full h-full object-contain select-none"
                        style={{
                          transition: 'transform 0.5s cubic-bezier(0.4,0,0.2,1), opacity 0.5s ease',
                          transform: i === carouselIdx
                            ? 'translateX(0) scale(1)'
                            : i < carouselIdx
                              ? `translateX(${carouselDir < 0 ? '100%' : '-100%'}) scale(0.96)`
                              : `translateX(${carouselDir < 0 ? '-100%' : '100%'}) scale(0.96)`,
                          opacity: i === carouselIdx ? 1 : 0,
                          pointerEvents: 'none',
                          zIndex: i === carouselIdx ? 1 : 0,
                        }}
                      />
                    )) : (
                      <BookOpen className="w-16 h-16 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10" style={{ color: theme.primary }} />
                    )}
                    {/* Right-click shield — pointer-events:none so arrows/dots still work */}
                    <div
                      className="absolute inset-0 z-20"
                      onContextMenu={(e) => e.preventDefault()}
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    />
                  </div>

                  {/* Prev / Next arrows — only if multiple slides */}
                  {slides.length > 1 && (
                    <>
                      <button
                        onClick={() => { setCarouselDir(-1); setCarouselIdx(i => (i - 1 + slides.length) % slides.length); }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm shadow flex items-center justify-center transition-opacity hover:bg-white"
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="w-5 h-5" style={{ color: theme.text }} />
                      </button>
                      <button
                        onClick={() => { setCarouselDir(1); setCarouselIdx(i => (i + 1) % slides.length); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm shadow flex items-center justify-center transition-opacity hover:bg-white"
                        aria-label="Next image"
                      >
                        <ChevronRight className="w-5 h-5" style={{ color: theme.text }} />
                      </button>
                    </>
                  )}

                  {/* Dot indicators */}
                  {slides.length > 1 && (
                    <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
                      {slides.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => { setCarouselDir(i > carouselIdx ? 1 : -1); setCarouselIdx(i); }}
                          className="rounded-full transition-all"
                          style={{
                            width: i === carouselIdx ? 20 : 6,
                            height: 6,
                            backgroundColor: i === carouselIdx ? theme.primary : `${theme.text}30`,
                          }}
                          aria-label={`Go to image ${i + 1}`}
                        />
                      ))}
                    </div>
                  )}

                  {isOut && (
                    <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-400 text-white">Sold Out</div>
                  )}
                </div>

                {/* Details — white card */}
                <div className="flex flex-col rounded-2xl p-6 md:p-8 shadow-sm" style={{ backgroundColor: '#ffffff' }}>
                  <h1 className="text-2xl md:text-3xl font-bold leading-tight" style={{ color: theme.text }}>
                    {product.name}
                  </h1>

                  <div className="flex flex-wrap items-center gap-3 mt-3">
                    <p className="text-2xl font-bold" style={{ color: theme.primaryDark }}>
                      ${Number(product.price).toFixed(2)}
                    </p>
                    {isLow && !isOut && (
                      <span
                        className="px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide"
                        style={{ backgroundColor: '#FDF6F0', color: '#C4622D' }}
                      >
                        Only {stock} left
                      </span>
                    )}
                  </div>

                  <div className="mt-5 pt-5 border-t space-y-3" style={{ borderColor: '#E8EFE9' }}>
                    <p className="text-sm font-bold" style={{ color: theme.primaryDark }}>Welcome to Your New Research Tool!</p>
                    {sizeNote && (
                      <p className="text-sm font-medium" style={{ color: theme.text }}>{sizeNote}</p>
                    )}
                  </div>

                  <div className="mt-6 space-y-3">
                    {isOut ? (
                      <>
                        <button disabled className="w-full py-3.5 rounded-xl text-sm font-semibold cursor-not-allowed"
                          style={{ backgroundColor: `${theme.text}10`, color: theme.textLight }}>
                          Sold Out
                        </button>
                        <NotifyMeForm product={product} />
                      </>
                    ) : cartQty > 0 ? (
                      <QtyPicker
                        qty={cartQty}
                        onInc={() => handleAdd()}
                        onDec={() => cartQty <= 1 ? removeItem(product.id) : updateQty(product.id, cartQty - 1)}
                      />
                    ) : (
                      <button onClick={() => handleAdd()}
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold tracking-wide uppercase text-white hover:opacity-95 active:scale-[0.98] transition-all"
                        style={{
                          backgroundColor: theme.primary,
                          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -3px 0 rgba(0,0,0,0.15), 0 3px 10px rgba(0,0,0,0.14)',
                        }}>
                        Add to Cart
                      </button>
                    )}
                  </div>

                </div>
              </div>
            </div>

            {/* ── Upsell / Related Products ── */}
            {relatedProducts.length > 0 && (
              <div className="border-t" style={{ borderColor: '#E8EFE9' }}>
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                  <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: theme.primary }}>Add to Your Order</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {relatedProducts.map(rp => <UpsellCard key={rp.id} product={rp} onAdd={handleAdd} />)}
                  </div>
                </div>
              </div>
            )}

            {/* ── Tabs: Description / Inside Content / Specs ── */}
            <div className="border-t" style={{ borderColor: '#E8EFE9' }}>
              <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div
                  className={`grid border-b mb-6 w-full ${isPlanner ? 'grid-cols-3' : 'grid-cols-2'}`}
                  style={{ borderColor: '#E8EFE9' }}
                >
                  {productTabs.map(([key, label]) => (
                    <button key={key} type="button" onClick={() => setActiveTab(key)}
                      className="py-3 px-1 sm:px-3 text-[11px] sm:text-sm font-semibold border-b-2 transition-colors -mb-px text-center leading-tight"
                      style={activeTab === key
                        ? { borderColor: theme.primary, color: theme.primary }
                        : { borderColor: 'transparent', color: theme.textLight }}>
                      {label}
                    </button>
                  ))}
                </div>

                {activeTab === 'description' && (
                  <div className="max-w-2xl">
                    <p className="text-sm leading-relaxed" style={{ color: theme.textLight }}>
                      {description}
                    </p>
                  </div>
                )}

                {isPlanner && activeTab === 'content' && (
                  <div className="max-w-2xl">
                    <p className="text-sm font-semibold mb-4" style={{ color: theme.text }}>What's inside every Pep Planner:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {PLANNER_CONTENT.map((item) => (
                        <div key={item} className="flex items-center gap-2.5 text-sm" style={{ color: theme.textLight }}>
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: theme.primary }} />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'specs' && (
                  <div className="max-w-sm">
                    {specRows.length === 0 ? (
                      <p className="text-sm" style={{ color: theme.textLight }}>No specs listed yet.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <tbody>
                          {specRows.map(([label, value]) => (
                            <tr key={label} className="border-b" style={{ borderColor: '#E8EFE9' }}>
                              <td className="py-2.5 pr-6 font-semibold" style={{ color: theme.text }}>{label}</td>
                              <td className="py-2.5" style={{ color: theme.textLight }}>{value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      <LandingFooter />

      <CartPanel
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={handleCheckout}
        loading={checkoutLoading}
        products={[product, ...relatedProducts].filter(Boolean)}
      />
    </div>
  );
}
