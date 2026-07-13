/**
 * Shop / planner order emails — always use admin emailTemplates + generateEmailHTML.
 */
const { logger } = require('firebase-functions');
const {
  loadEmailTemplate,
  generateEmailHTML,
  sendEmailWithQueue,
} = require('./emailService');
const {
  buildMarketingUnsubscribeUrl,
  buildMarketingUnsubscribeFooterHtml,
  appendMarketingUnsubscribeFooter,
} = require('./marketingContacts');

const SHOP_BASE = process.env.SHOP_BASE_URL || process.env.BASE_URL || 'https://thepepplanner.app';

const DEFAULTS = {
  shopOrderConfirmation: {
    subject: "Order confirmed! We're prepping your PEP Planner",
    heading: 'Order Confirmed!',
    greeting: 'Hi %CUSTOMERNAME%,',
    mainMessage:
      "Thank you for your order! We're getting everything ready. Your order details are below.",
    ctaText: 'Track Your Order',
    ctaLink: '%ORDERSTATUSURL%',
    showFeatures: false,
    features: [],
  },
  shopOrderOwner: {
    subject: 'New shop order: %CUSTOMERNAME% — %ORDERTOTAL%',
    heading: 'New Planner Shop Order',
    greeting: 'A new order just came in.',
    mainMessage: 'Fulfill this order from Admin → Shop Orders.',
    ctaText: 'View in Admin',
    ctaLink: 'https://thepepplanner.app/admin/shop/orders',
    showFeatures: false,
    features: [],
  },
  shopDigitalDownload: {
    subject: 'Your PEP Planner PDF download is ready',
    heading: 'Your Download Is Ready',
    greeting: 'Hi %CUSTOMERNAME%,',
    mainMessage:
      'Thanks for your purchase! Open your download page below when you are ready — your PDF stays available for 90 days.',
    ctaText: 'View Order Confirmation',
    ctaLink: '%ORDERSTATUSURL%',
    postCtaNote: 'Best on iPad/tablet with GoodNotes or Notability — not intended for printing.',
    showFeatures: false,
    features: [],
  },
  shopOrderShipped: {
    subject: 'Your PEP Planner order has shipped!',
    heading: 'Your Order Has Shipped!',
    greeting: 'Hi %CUSTOMERNAME%,',
    mainMessage: 'Great news — your PEP Planner order is on its way!',
    ctaText: 'Track Your Order',
    ctaLink: '%ORDERSTATUSURL%',
    showFeatures: false,
    features: [],
  },
  shopOrderDelivered: {
    subject: 'Your PEP Planner order was delivered!',
    heading: 'Delivered!',
    greeting: 'Hi %CUSTOMERNAME%,',
    mainMessage: 'Your PEP Planner order has been delivered. We hope you love it!',
    ctaText: 'View Your Order',
    ctaLink: '%ORDERSTATUSURL%',
    showFeatures: false,
    features: [],
  },
  shopAbandonedCart: {
    subject: 'You left something in your cart!',
    heading: 'Did You Forget Something?',
    greeting: 'Hey %CUSTOMERNAME%,',
    mainMessage:
      "We noticed you started checkout but didn't finish. Your PEP Planner is still waiting for you!",
    ctaText: 'Return to Shop',
    ctaLink: 'https://thepepplanner.app/shop',
    postCtaNote: 'If you had any trouble checking out, reply to this email and we will help.',
    showFeatures: false,
    features: [],
  },
  shopReviewRequest: {
    subject: 'Loving your PEP Planner? Leave a review!',
    heading: 'Loving Your PEP Planner?',
    greeting: 'Hi %CUSTOMERNAME%,',
    mainMessage:
      'We hope you are enjoying your PEP Planner! Your feedback helps other planners find their perfect match.',
    ctaText: 'Review on Etsy',
    ctaLink: 'https://www.etsy.com/shop/ThePepPlanner',
    postCtaNote: 'Thank you for supporting The Pep Planner!',
    showFeatures: false,
    features: [],
  },
  shopReviewInvite: {
    subject: 'Write your PEP Planner review — verified purchase',
    heading: 'Share Your Experience',
    greeting: 'Hi %CUSTOMERNAME%,',
    mainMessage:
      'Thanks for ordering from The Pep Planner! Tap below to leave a verified review on our shop. Your link is tied to your order email.',
    ctaText: 'Write your review',
    ctaLink: '%REVIEWURL%',
    postCtaNote: 'Did not request this? You can ignore this email.',
    showFeatures: false,
    features: [],
  },
  shopBackInStock: {
    subject: '%PRODUCTNAME% is back in stock!',
    heading: 'Back in Stock!',
    greeting: 'Hi %CUSTOMERNAME%,',
    mainMessage:
      'Good news — %PRODUCTNAME% is available again. You asked us to let you know, so here it is before it sells out.',
    ctaText: 'Shop Now',
    ctaLink: '%SHOPURL%',
    postCtaNote: 'Thanks for waiting — we are glad you are still interested.',
    showFeatures: false,
    features: [],
  },
  /** Shop promo blast — pass metadata: { includeMarketingUnsubscribe: true } to sendShopTemplatedEmail */
  shopMarketingPromo: {
    subject: 'News from The Pep Planner shop',
    heading: 'From The Pep Planner',
    greeting: 'Hi %CUSTOMERNAME%,',
    mainMessage: '%PROMOBODY%',
    ctaText: 'Visit the Shop',
    ctaLink: '%SHOPURL%',
    showFeatures: false,
    features: [],
  },
};

function tableWrap(inner) {
  return `<table style="width:100%;border-collapse:collapse;margin:20px 0;border-radius:8px;overflow:hidden">${inner}</table>`;
}

function buildOrderItemsTableHtml(lineItems) {
  if (!lineItems?.length) return '';
  const rows = lineItems
    .map(
      (li) => `<tr>
      <td style="padding:10px 14px;border-bottom:1px solid #eee;font-size:14px;color:#333">${li.name || 'Item'}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #eee;text-align:center;font-size:14px">${li.quantity || 1}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #eee;text-align:right;font-size:14px">$${((li.amountTotal || 0) / 100).toFixed(2)}</td>
    </tr>`
    )
    .join('');
  return tableWrap(`
    <thead><tr style="background:#f5f5f0">
      <th style="padding:10px 14px;text-align:left;font-size:12px;color:#666;text-transform:uppercase">Item</th>
      <th style="padding:10px 14px;text-align:center;font-size:12px;color:#666;text-transform:uppercase">Qty</th>
      <th style="padding:10px 14px;text-align:right;font-size:12px;color:#666;text-transform:uppercase">Total</th>
    </tr></thead>
    <tbody>${rows}</tbody>`);
}

function buildOrderTotalHtml(totalFormatted) {
  return `<div style="background:#f9f9f6;border-radius:8px;padding:16px 20px;margin:16px 0;text-align:right">
    <span style="font-size:16px;font-weight:700;color:#333">Total: ${totalFormatted}</span>
  </div>`;
}

function buildShippingBlockHtml(addressLines) {
  if (!addressLines) return '';
  return `<div style="border-top:1px solid #eee;margin-top:20px;padding-top:16px;text-align:left">
    <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#333">Shipping To</p>
    <p style="color:#555;line-height:1.6;margin:0;font-size:14px">${addressLines}</p>
    <p style="color:#888;font-size:13px;margin-top:12px">We will ship your order soon and email you when it is on the way.</p>
  </div>`;
}

function buildDigitalNoteHtml() {
  return `<p style="font-size:14px;color:#555;line-height:1.6;margin:16px 0;text-align:center">Check your inbox for PDF download link(s). You can also download from your order confirmation page.</p>`;
}

function normalizeDownloadPageUrl(delivery) {
  const base = SHOP_BASE.replace(/\/$/, '');
  const token = delivery?.token || '';
  if (token) return `${base}/downloads/${token}`;
  const url = String(delivery?.downloadUrl || '');
  if (url.includes('firebasestorage.googleapis.com')) return '';
  if (url.includes('/downloads/')) return url;
  return url;
}

function buildDownloadLinksTableHtml(deliveries) {
  if (!deliveries?.length) return '';
  const rows = deliveries
    .map((d) => {
      const pageUrl = normalizeDownloadPageUrl(d);
      if (!pageUrl) return '';
      return `<tr>
      <td style="padding:12px 14px;border-bottom:1px solid #eee;font-size:15px;color:#333">${d.productName}</td>
      <td style="padding:12px 14px;border-bottom:1px solid #eee;text-align:right">
        <a href="${pageUrl}" style="display:inline-block;background:#344E41;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">Open download page</a>
      </td>
    </tr>`;
    })
    .filter(Boolean)
    .join('');
  return tableWrap(`
    <thead><tr style="background:#f5f5f0">
      <th style="padding:10px 14px;text-align:left;font-size:12px;color:#666;text-transform:uppercase">Product</th>
      <th style="padding:10px 14px;text-align:right;font-size:12px;color:#666;text-transform:uppercase">Download</th>
    </tr></thead>
    <tbody>${rows}</tbody>`);
}

function buildTrackingBlockHtml(carrier, trackingNumber) {
  return `<div style="text-align:left;margin:16px 0;font-size:14px;color:#555">
    <p style="margin:0 0 6px"><strong>Carrier:</strong> ${carrier || '—'}</p>
    <p style="margin:0"><strong>Tracking:</strong> ${trackingNumber || '—'}</p>
  </div>`;
}

function buildReviewLinksHtml() {
  return `<div style="text-align:center;margin:20px 0">
    <a href="https://www.etsy.com/shop/ThePepPlanner" style="display:inline-block;background:#f56400;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:0 8px 8px 0">Review on Etsy</a>
    <a href="https://g.page/r/ThePepPlanner/review" style="display:inline-block;background:#4285f4;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:0 0 8px 0">Review on Google</a>
  </div>`;
}

function applyTemplateVars(text, variables = {}) {
  if (!text) return text;
  let result = text;
  Object.entries(variables).forEach(([key, value]) => {
    const replacement = value != null ? String(value) : '';
    result = result.replace(new RegExp(`%${key.toUpperCase()}%`, 'g'), replacement);
  });
  return result;
}

async function sendShopTemplatedEmail(templateKey, to, variables, {
  bodyHtml = '',
  emailType,
  recipientName,
  metadata,
  priority,
  forceShopDownloadBody = false,
} = {}) {
  const fallback = DEFAULTS[templateKey];
  if (!fallback) throw new Error(`Unknown shop email template: ${templateKey}`);

  const custom = await loadEmailTemplate(templateKey);
  const merged = { ...fallback, ...(custom || {}) };

  if (templateKey === 'shopDigitalDownload') {
    merged.ctaLink = variables.orderStatusUrl || `${SHOP_BASE}/shop`;
    merged.ctaText = 'View order confirmation';
    if (forceShopDownloadBody && bodyHtml) {
      merged.bodyHtml = bodyHtml;
    } else if (merged.bodyHtml?.includes('firebasestorage.googleapis.com')) {
      logger.warn('shopDigitalDownload: ignoring Firestore bodyHtml with Storage URL');
      merged.bodyHtml = bodyHtml || '';
    }
  }
  const vars = {
    customerName: variables.customerName || 'there',
    orderStatusUrl: variables.orderStatusUrl || `${SHOP_BASE}/shop`,
    orderTotal: variables.orderTotal || '',
    sessionId: variables.sessionId || '',
    reviewUrl: variables.reviewUrl || variables.orderStatusUrl || `${SHOP_BASE}/shop/reviews`,
    productName: variables.productName || '',
    shopUrl: variables.shopUrl || `${SHOP_BASE}/shop`,
    userEmail: to,
    userName: variables.customerName || 'there',
    ...variables,
  };
  const subject = applyTemplateVars(merged.subject || fallback.subject, vars);

  let html = generateEmailHTML(
    { ...merged, bodyHtml },
    vars
  );

  if (metadata?.includeMarketingUnsubscribe && to) {
    html = appendMarketingUnsubscribeFooter(html, to);
  }

  return sendEmailWithQueue(to, subject, html, {
    type: emailType || templateKey,
    recipientName: recipientName || variables.customerName || null,
    logToHistory: true,
    sentBy: 'system',
    metadata,
    priority,
  });
}

module.exports = {
  SHOP_BASE,
  normalizeDownloadPageUrl,
  buildOrderItemsTableHtml,
  buildOrderTotalHtml,
  buildShippingBlockHtml,
  buildDigitalNoteHtml,
  buildDownloadLinksTableHtml,
  buildTrackingBlockHtml,
  buildReviewLinksHtml,
  sendShopTemplatedEmail,
  DEFAULTS,
};

module.exports.buildMarketingUnsubscribeUrl = buildMarketingUnsubscribeUrl;
module.exports.buildMarketingUnsubscribeFooterHtml = buildMarketingUnsubscribeFooterHtml;
module.exports.appendMarketingUnsubscribeFooter = appendMarketingUnsubscribeFooter;
