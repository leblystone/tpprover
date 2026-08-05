import { prepareItemForSave } from './userDataSave';

/**
 * Wishlist Wanted vs History helpers.
 * Acquired items stay in `tpprover_wishlist` with `acquiredAt` set so they sync
 * with the existing wishlist key (no new cloud blob).
 */

export function isWishlistAcquired(item) {
  return !!(item && item.acquiredAt);
}

export function splitWishlistWantedAndHistory(items = []) {
  const wanted = [];
  const history = [];
  for (const item of items) {
    if (isWishlistAcquired(item)) history.push(item);
    else wanted.push(item);
  }
  history.sort((a, b) => {
    const ta = Date.parse(a.acquiredAt) || 0;
    const tb = Date.parse(b.acquiredAt) || 0;
    return tb - ta;
  });
  return { wanted, history };
}

function readWishlist() {
  try {
    const raw = localStorage.getItem('tpprover_wishlist');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeWishlist(next) {
  localStorage.setItem('tpprover_wishlist', JSON.stringify(next));
  localStorage.setItem('tpprover_wishlist_lastUpdate', String(Date.now()));
  window.dispatchEvent(new CustomEvent('tpp:wishlist-updated', { detail: { wishlist: next } }));
  return next;
}

/** Mark item acquired → moves to History section. Returns updated list. */
export function markWishlistItemAcquired(item) {
  if (!item?.id) return readWishlist();
  const prev = readWishlist();
  const acquiredAt = new Date().toISOString();
  let found = false;
  const next = prev.map((i) => {
    if (String(i.id) !== String(item.id)) return i;
    found = true;
    return prepareItemForSave({ ...i, ...item, acquiredAt });
  });
  if (!found) {
    next.push(prepareItemForSave({ ...item, acquiredAt }));
  }
  return writeWishlist(next);
}

/** Clear acquiredAt → back to Wanted. Returns updated list. */
export function restoreWishlistItemToWanted(item) {
  if (!item?.id) return readWishlist();
  const prev = readWishlist();
  const next = prev.map((i) => {
    if (String(i.id) !== String(item.id)) return i;
    const { acquiredAt: _drop, ...rest } = { ...i, ...item };
    return prepareItemForSave(rest);
  });
  return writeWishlist(next);
}
