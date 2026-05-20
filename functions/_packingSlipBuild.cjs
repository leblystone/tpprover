/** @returns {string} full HTML document for 4x6 packing slip */
function buildPackingSlipHtmlBody(order, orderId, escapeHtml, getPackingSlipLogoSrc) {
  const formatAddrLines = (addr, nameOverride) => {
    const a = addr || {};
    const name = nameOverride || order.customerName || order.shippingName || '';
    const line1 = a.line1 || a.street1 || '';
    const line2 = a.line2 || a.street2 || '';
    const cityLine = [a.city, a.state, a.zip || a.postal_code].filter(Boolean).join(', ');
    const country = a.country && a.country !== 'US' ? a.country : '';
    return [name, line1, line2, cityLine, country].filter(Boolean);
  };

  const addrBlockHtml = (lines, phone) => {
    const body = lines.length
      ? lines.map((l) => `<div class="addr-line">${escapeHtml(l)}</div>`).join('')
      : '<div class="addr-line muted">—</div>';
    const phoneLine = phone ? `<div class="addr-line">Tel: ${escapeHtml(phone)}</div>` : '';
    return body + phoneLine;
  };

  const shipAddr = order.shippingAddress || {};
  const billAddr = order.billingAddress || shipAddr;
  const shipName = order.shippingName || order.customerName || '';
  const phone = order.customerPhone || order.phone || '';

  const items = Array.isArray(order.items) ? order.items : [];
  const totalQty = items.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0);

  const orderDate = order.createdAt?.toDate?.()
    ? order.createdAt.toDate().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

  const ordNum = order.squarespaceOrderNumber || order.squarespaceOrderId
    ? `#${String(order.squarespaceOrderNumber || order.squarespaceOrderId).replace(/^#/, '')}`
    : `#${String(orderId).slice(-8).toUpperCase()}`;

  const shippingMethod = order.shippingMethod
    || (order.labelCarrier ? `${order.labelCarrier} shipping` : '')
    || 'Standard shipping';

  const itemRows = items.length ? items.map((i) => {
    const title = escapeHtml(i.name || i.title || 'Item');
    const sub = [i.sku, i.variant].filter(Boolean).map(escapeHtml).join(' · ');
    const subHtml = sub ? `<div class="item-sub">${sub}</div>` : '';
    const qty = i.quantity || 1;
    return `
      <tr>
        <td class="item-desc">
          <div class="item-title">${title}</div>
          ${subHtml}
        </td>
        <td class="item-qty">x ${qty}</td>
      </tr>`;
  }).join('') : `
      <tr>
        <td class="item-desc muted" colspan="2">No line items</td>
      </tr>`;

  const notesText = order.giftMessage || order.privateNotes || '';
  const notesSection = notesText ? `
    <section class="notes">
      <div class="notes-label">Notes</div>
      <div class="notes-body">${escapeHtml(notesText)}</div>
    </section>
  ` : '';

  const trackingSection = order.trackingNumber ? `
    <section class="notes tracking">
      <div class="notes-label">Tracking</div>
      <div class="notes-body">${escapeHtml(order.trackingNumber)}${order.labelCarrier ? ` · ${escapeHtml(order.labelCarrier)}` : ''}</div>
    </section>
  ` : '';

  const companyName = process.env.FROM_NAME || 'The PEP Planner';
  const companyEmail = process.env.FROM_EMAIL || 'contact@thepepplanner.com';
  const companyPhone = process.env.FROM_PHONE || '';
  const contactLine = [companyEmail, companyPhone].filter(Boolean).join(' / ');

  const logoSrc = getPackingSlipLogoSrc();
  const billHtml = addrBlockHtml(formatAddrLines(billAddr, order.customerName), phone);
  const shipHtml = addrBlockHtml(formatAddrLines(shipAddr, shipName), phone);

  const slipBody = `
  <div class="slip">
    <div class="logo-wrap">
      <img class="logo" src="${logoSrc}" alt="${escapeHtml(companyName)}" />
    </div>

    <div class="title-row">
      <span class="doc-title">Packing Slip</span>
      <span class="doc-date">${escapeHtml(orderDate)}</span>
    </div>
    <hr class="rule" />

    <div class="cols-3">
      <div class="col">
        <div class="col-head">Bill to</div>
        ${billHtml}
      </div>
      <div class="col">
        <div class="col-head">Ship to</div>
        ${shipHtml}
      </div>
      <div class="col col-order">
        <div class="meta-row"><span class="meta-label">Order</span><span class="meta-val">${escapeHtml(ordNum)}</span></div>
        <div class="meta-row"><span class="meta-label">Shipping</span><span class="meta-val">${escapeHtml(shippingMethod)}</span></div>
        <div class="meta-row"><span class="meta-label">Items</span><span class="meta-val">${totalQty}</span></div>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th>Item Description</th>
          <th>Qty</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    ${notesSection}
    ${trackingSection}

    <footer class="footer">
      <div class="footer-thanks">Happy Researching!!</div>
      <div class="footer-brand">${escapeHtml(companyName)}</div>
      ${contactLine ? `<div class="footer-line">${escapeHtml(contactLine)}</div>` : ''}
      <div class="footer-url">thepepplanner.com</div>
    </footer>
  </div>`;

  const styles = `
    @page { size: 4in 6in; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 4in; height: 6in; overflow: hidden; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      background: #fff;
      color: #111;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .slip {
      width: 4in;
      height: 6in;
      padding: 0.12in 0.14in 0.1in;
      display: flex;
      flex-direction: column;
      page-break-after: always;
      break-after: page;
    }
    .slip:last-child { page-break-after: auto; break-after: auto; }
    .logo-wrap { text-align: center; flex-shrink: 0; margin-bottom: 4px; }
    .logo { width: 0.78in; height: 0.78in; object-fit: contain; }
    .title-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 11px;
      font-weight: 700;
      margin-bottom: 4px;
      flex-shrink: 0;
    }
    .doc-date { font-size: 9px; font-weight: 400; color: #444; }
    .rule { border: none; border-top: 1px solid #111; margin-bottom: 5px; flex-shrink: 0; }
    .cols-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 0.85fr;
      gap: 4px;
      margin-bottom: 6px;
      flex-shrink: 0;
    }
    .col-head {
      font-size: 8px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 2px;
      color: #111;
    }
    .addr-line { font-size: 8.5px; line-height: 1.35; color: #222; }
    .addr-line:first-of-type { font-weight: 700; }
    .muted { color: #888; font-style: italic; }
    .col-order .meta-row {
      display: flex;
      justify-content: space-between;
      gap: 2px;
      font-size: 8px;
      line-height: 1.35;
      margin-bottom: 2px;
    }
    .meta-label { color: #444; flex-shrink: 0; }
    .meta-val { font-weight: 700; text-align: right; word-break: break-word; }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      flex-shrink: 0;
      margin-bottom: 4px;
    }
    .items-table thead th {
      font-size: 8px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      text-align: left;
      padding-bottom: 2px;
      border-bottom: 1px solid #111;
    }
    .items-table thead th:last-child { text-align: right; width: 26px; }
    .items-table td {
      font-size: 9px;
      padding: 4px 0;
      border-bottom: 1px dotted #bbb;
      vertical-align: top;
    }
    .item-title { font-weight: 700; font-size: 9px; line-height: 1.25; }
    .item-sub { font-size: 7.5px; color: #555; margin-top: 1px; line-height: 1.2; }
    .item-qty { text-align: right; font-weight: 700; white-space: nowrap; width: 26px; font-size: 9px; }
    .notes { margin-bottom: 4px; flex-shrink: 0; }
    .notes-label { font-size: 8px; font-weight: 700; margin-bottom: 2px; }
    .notes-body { font-size: 8.5px; line-height: 1.35; color: #333; }
    .footer {
      margin-top: auto;
      text-align: center;
      padding-top: 4px;
      flex-shrink: 0;
    }
    .footer-thanks { font-size: 13px; font-weight: 800; margin-bottom: 4px; letter-spacing: 0.02em; }
    .footer-brand { font-size: 9px; font-weight: 700; margin-bottom: 2px; }
    .footer-line { font-size: 8px; color: #444; line-height: 1.35; }
    .footer-url { font-size: 8px; color: #666; margin-top: 2px; }
    @media print { .no-print { display: none !important; } }
    @media screen {
      html, body { height: auto; overflow: visible; }
      body {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 16px 0 24px;
        background: #e8e8e8;
      }
      .slip { box-shadow: 0 2px 12px rgba(0,0,0,0.15); }
    }
    .no-print { display: block; text-align: center; margin-top: 12px; width: 4in; }
  `;

  return { slipBody, styles, ordNum };
}

module.exports = { buildPackingSlipHtmlBody };
