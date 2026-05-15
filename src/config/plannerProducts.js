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
  const constraints = [orderBy('sortOrder', 'asc')];
  if (activeOnly) constraints.unshift(where('active', '==', true));
  const q = query(collection(db, COLLECTION), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data(), image: d.data().image?.url || d.data().image || null }));
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
    image: data.image || null,
    active: data.active ?? true,
    sortOrder: data.sortOrder ?? 0,
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
