import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, doc, setDoc, deleteDoc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from './firebase';

export const PRODUCT_CATEGORIES = {
  planner: 'Planners',
  accessory: 'Accessories',
  digital: 'Digital',
};

const COLLECTION = 'shopProducts';

// ── Firestore reads ──────────────────────────────────────────────

export async function fetchShopProducts(activeOnly = true) {
  // Use single-field orderBy only (avoids composite index requirement).
  // Active filtering is done client-side so we don't need a compound index.
  const q = query(collection(db, COLLECTION), orderBy('sortOrder', 'asc'));
  const snap = await getDocs(q);
  const all = snap.docs.map((d) => {
    const data = d.data();
    // Normalise the images array. New products store data.images[].
    // Legacy products only have data.image / data.hoverImage — promote them.
    let images = [];
    if (Array.isArray(data.images) && data.images.length > 0) {
      images = data.images.map((img) => (typeof img === 'string' ? img : img?.url || null)).filter(Boolean);
    } else {
      const main = data.image?.url || data.image || null;
      const hover = data.hoverImage?.url || data.hoverImage || null;
      if (main) images.push(main);
      if (hover) images.push(hover);
    }
    return {
      id: d.id,
      ...data,
      images,
      image: images[0] || null,
      hoverImage: images[1] || null,
    };
  });
  return activeOnly ? all.filter((p) => p.active === true) : all;
}

export async function fetchAllShopProducts() {
  return fetchShopProducts(false);
}

// ── React hook for the public Shop page ──────────────────────────

export function useShopProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const items = await fetchShopProducts(true);
        if (!cancelled) setProducts(items);
      } catch (err) {
        console.error('Failed to load shop products:', err);
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { products, loading, error };
}

// ── Helper exports (same API as before) ──────────────────────────

export function getProductsByCategory(products, category) {
  return products.filter((p) => p.category === category);
}

export function getProductById(products, id) {
  return products.find((p) => p.id === id) || null;
}

export function cartHasPhysicalItems(cartItems) {
  return cartItems.some((ci) => ci.requiresShipping !== false);
}

// ── Helpers ──────────────────────────────────────────────────────

export function generateSlug(name) {
  return (name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ── Admin CRUD operations ────────────────────────────────────────

export async function saveShopProduct(data, existingId = null) {
  const id = existingId || doc(collection(db, COLLECTION)).id;
  const ref = doc(db, COLLECTION, id);
  const payload = {
    name: data.name || '',
    category: data.category || 'planner',
    size: data.size || null,
    price: Number(data.price) || 0,
    stripePriceId: data.stripePriceId || '',
    requiresShipping: data.requiresShipping ?? true,
    description: data.description || '',
    images: Array.isArray(data.images) ? data.images.filter(Boolean) : [],
    image: (Array.isArray(data.images) && data.images[0]) ? data.images[0] : (data.image || null),
    hoverImage: (Array.isArray(data.images) && data.images[1]) ? data.images[1] : (data.hoverImage || null),
    active: data.active ?? true,
    sortOrder: data.sortOrder ?? 0,
    stock: Number(data.stock) || 0,
    sku: data.sku || '',
    slug: data.slug || generateSlug(data.name),
    platformIds: {
      etsy: data.platformIds?.etsy || '',
      tiktok: data.platformIds?.tiktok || '',
    },
    relatedProductIds: Array.isArray(data.relatedProductIds) ? data.relatedProductIds : [],
    restockThreshold: Number(data.restockThreshold) || 5,
    updatedAt: serverTimestamp(),
    ...(!existingId ? { createdAt: serverTimestamp() } : {}),
  };
  await setDoc(ref, payload, { merge: true });
  return id;
}

export async function deleteShopProduct(id) {
  await deleteDoc(doc(db, COLLECTION, id));
}

export async function toggleProductActive(id, currentActive) {
  await updateDoc(doc(db, COLLECTION, id), { active: !currentActive, updatedAt: serverTimestamp() });
}

export async function reorderProducts(orderedIds) {
  const batch = writeBatch(db);
  orderedIds.forEach((id, index) => {
    batch.update(doc(db, COLLECTION, id), { sortOrder: index });
  });
  await batch.commit();
}
