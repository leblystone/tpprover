import { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { WEBSITE_REVIEWS_SEED } from '../data/websiteReviewsSeed';
import { ETSY_REVIEWS_SEED } from '../data/etsyReviewsSeed';
import { filterReviewsForProduct, averageRating, getShopReviewStats } from '../utils/reviewProductMatch';
import { db } from './firebase';

export { filterReviewsForProduct, averageRating, getShopReviewStats };

const COLLECTION = 'shopReviews';

function normalizeReview(docSnap) {
  const data = docSnap.data();
  const createdAt = data.createdAt?.toDate?.() || null;
  return {
    id: docSnap.id,
    ...data,
    rating: Math.min(5, Math.max(1, Number(data.rating) || 5)),
    photos: Array.isArray(data.photos) ? data.photos.filter(Boolean) : [],
    active: data.active !== false,
    verifiedPurchase: data.verifiedPurchase === true,
    createdAt,
    createdAtMs: createdAt ? createdAt.getTime() : 0,
  };
}

export async function fetchShopReviews({ activeOnly = true } = {}) {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  let list = snap.docs.map(normalizeReview);
  if (activeOnly) list = list.filter((r) => r.active);
  return list;
}

export async function fetchAllShopReviews() {
  return fetchShopReviews({ activeOnly: false });
}

export async function fetchRecentShopReviews(limit = 5) {
  const all = await fetchShopReviews({ activeOnly: true });
  return all.slice(0, limit);
}

export function useShopReviews(limit = null) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const items = limit != null ? await fetchRecentShopReviews(limit) : await fetchShopReviews();
        if (!cancelled) setReviews(items);
      } catch (err) {
        if (err?.code !== 'permission-denied') {
          console.error('Failed to load shop reviews:', err);
        }
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [limit]);

  return { reviews, loading, error };
}

/** Reviews matched to a single product (name, category, Etsy aliases). */
export function useProductReviews(product) {
  const { reviews, loading, error } = useShopReviews();
  const matched = product
    ? filterReviewsForProduct(reviews, product)
    : [];
  return {
    reviews: matched,
    loading,
    error,
    count: matched.length,
    average: averageRating(matched),
  };
}

export async function saveShopReview(data, existingId = null) {
  const id = existingId || doc(collection(db, COLLECTION)).id;
  const ref = doc(db, COLLECTION, id);

  const payload = {
    authorName: (data.authorName || '').trim(),
    authorLocation: (data.authorLocation || '').trim(),
    productName: (data.productName || '').trim(),
    body: (data.body || '').trim(),
    rating: Math.min(5, Math.max(1, Number(data.rating) || 5)),
    source: data.source || 'website',
    sourceUrl: (data.sourceUrl || '').trim(),
    photos: Array.isArray(data.photos) ? data.photos.filter(Boolean) : [],
    active: data.active !== false,
    updatedAt: serverTimestamp(),
  };

  if (data.createdAt) {
    const d = data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt);
    if (!Number.isNaN(d.getTime())) payload.createdAt = d;
  } else if (!existingId) {
    payload.createdAt = serverTimestamp();
  }

  await setDoc(ref, payload, { merge: true });
  return id;
}

export async function deleteShopReview(id) {
  await deleteDoc(doc(db, COLLECTION, id));
}

export async function toggleShopReviewActive(id, currentActive) {
  await updateDoc(doc(db, COLLECTION, id), {
    active: !currentActive,
    updatedAt: serverTimestamp(),
  });
}

export const WEBSITE_REVIEWS_SEED_VERSION = 'website-squarespace-2025-v2';

/** True if Firestore rows are missing or product names don't match the seed file. */
export function websiteReviewsNeedResync(existingReviews) {
  const byId = Object.fromEntries((existingReviews || []).map((r) => [r.id, r]));
  for (const row of WEBSITE_REVIEWS_SEED) {
    const doc = byId[row.seedId];
    if (!doc) return true;
    const expectedProduct = (row.productName || '').trim();
    const storedProduct = (doc.productName || '').trim();
    if (storedProduct !== expectedProduct) return true;
    if (doc.seedImport !== WEBSITE_REVIEWS_SEED_VERSION) return true;
  }
  return false;
}

/** Import / re-sync Squarespace website reviews. Fixed doc IDs — safe to re-run. */
export async function importWebsiteReviewsSeed() {
  const batch = writeBatch(db);
  const now = serverTimestamp();

  WEBSITE_REVIEWS_SEED.forEach((row) => {
    const ref = doc(db, COLLECTION, row.seedId);
    const created = Timestamp.fromDate(new Date(`${row.createdAt}T12:00:00`));
    batch.set(
      ref,
      {
        authorName: row.authorName,
        authorLocation: '',
        productName: (row.productName || '').trim(),
        body: row.body || '',
        rating: row.rating,
        source: 'website',
        sourceUrl: '',
        photos: [],
        active: true,
        seedImport: WEBSITE_REVIEWS_SEED_VERSION,
        createdAt: created,
        updatedAt: now,
      },
      { merge: true }
    );
  });

  await batch.commit();
  return WEBSITE_REVIEWS_SEED.length;
}

export const ETSY_REVIEWS_SEED_VERSION = 'etsy-thepepplannerco-2025-v1';
const ETSY_SOURCE_URL = 'https://www.etsy.com/shop/ThePepPlannerCo/reviews';

export function etsyReviewsNeedResync(existingReviews) {
  const byId = Object.fromEntries((existingReviews || []).map((r) => [r.id, r]));
  for (const row of ETSY_REVIEWS_SEED) {
    const doc = byId[row.seedId];
    if (!doc) return true;
    const expectedProduct = (row.productName || '').trim();
    const storedProduct = (doc.productName || '').trim();
    if (storedProduct !== expectedProduct) return true;
    if (doc.seedImport !== ETSY_REVIEWS_SEED_VERSION) return true;
  }
  return false;
}

/** Import / re-sync Etsy shop reviews. Fixed doc IDs — safe to re-run. */
export async function importEtsyReviewsSeed() {
  const batch = writeBatch(db);
  const now = serverTimestamp();

  ETSY_REVIEWS_SEED.forEach((row) => {
    const ref = doc(db, COLLECTION, row.seedId);
    const created = Timestamp.fromDate(new Date(`${row.createdAt}T12:00:00`));
    batch.set(
      ref,
      {
        authorName: row.authorName,
        authorLocation: '',
        productName: (row.productName || '').trim(),
        body: row.body || '',
        rating: row.rating,
        source: 'etsy',
        sourceUrl: ETSY_SOURCE_URL,
        photos: [],
        active: true,
        seedImport: ETSY_REVIEWS_SEED_VERSION,
        createdAt: created,
        updatedAt: now,
      },
      { merge: true }
    );
  });

  await batch.commit();
  return ETSY_REVIEWS_SEED.length;
}
