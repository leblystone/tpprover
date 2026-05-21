/** Normalize listing / review text for fuzzy product matching */
export function normalizeReviewText(value) {
  return (value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function productThemeKey(productName) {
  return normalizeReviewText(
    (productName || '')
      .replace(/\bpep\s*planner\b/gi, ' ')
      .replace(/\bthe\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * Product-specific match only — avoids counting all 65 Etsy generic listing reviews on every planner.
 */
export function reviewMatchesProduct(review, product) {
  if (!product || !review) return false;

  const reviewProduct = normalizeReviewText(review.productName);
  const productName = normalizeReviewText(product.name);

  // Star-only or unnamed — show on /shop/reviews only, not every product page
  if (!reviewProduct) return false;

  if (reviewProduct === productName) return true;
  if (reviewProduct.includes(productName) || productName.includes(reviewProduct)) return true;

  const theme = productThemeKey(product.name);
  if (theme.length >= 3 && reviewProduct.includes(theme)) return true;

  if (product.category === 'planner' && product.size === '7x10') {
    if (
      reviewProduct.includes('7x10')
      || reviewProduct.includes('7 x 10')
      || reviewProduct.includes('research planner glp1 tracker 7x10')
    ) {
      return true;
    }
  }

  if (product.category === 'digital') {
    if (
      reviewProduct.includes('goodnotes')
      || reviewProduct.includes('hyperlinked')
      || reviewProduct.includes('digital planner')
      || reviewProduct.includes('pdf')
    ) {
      return true;
    }
  }

  if (product.category === 'accessory') {
    const isTabProduct = productName.includes('tab') || productName.includes('divider');
    const isBookmarkProduct = productName.includes('bookmark');
    if (isTabProduct && (reviewProduct.includes('tab') || reviewProduct.includes('divider'))) {
      return true;
    }
    if (isBookmarkProduct && reviewProduct.includes('bookmark')) return true;
  }

  const aliases = Array.isArray(product.reviewAliases) ? product.reviewAliases : [];
  if (aliases.some((alias) => {
    const a = normalizeReviewText(alias);
    return a && (reviewProduct === a || reviewProduct.includes(a) || a.includes(reviewProduct));
  })) {
    return true;
  }

  return false;
}

export function filterReviewsForProduct(reviews, product) {
  if (!product || !Array.isArray(reviews)) return [];
  return reviews.filter((r) => reviewMatchesProduct(r, product));
}

export function averageRating(reviews) {
  if (!reviews?.length) return null;
  const sum = reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0);
  return (sum / reviews.length).toFixed(1);
}

/** Counts by import source for honest shop-wide totals */
export function getShopReviewStats(reviews) {
  const list = Array.isArray(reviews) ? reviews : [];
  const website = list.filter((r) => r.source === 'website').length;
  const etsy = list.filter((r) => r.source === 'etsy').length;
  const other = list.length - website - etsy;
  return {
    total: list.length,
    website,
    etsy,
    other,
    expectedTotal: 110,
    expectedWebsite: 45,
    expectedEtsy: 65,
  };
}
