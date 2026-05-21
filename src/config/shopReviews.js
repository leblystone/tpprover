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
} from 'firebase/firestore';
import { db } from './firebase';

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
        console.error('Failed to load shop reviews:', err);
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [limit]);

  return { reviews, loading, error };
}

export async function saveShopReview(data, existingId = null) {
  const id = existingId || doc(collection(db, COLLECTION)).id;
  const ref = doc(db, COLLECTION, id);

  const payload = {
    authorName: (data.authorName || '').trim(),
    authorLocation: (data.authorLocation || '').trim(),
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
