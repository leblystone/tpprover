# TPP Data Railroad – Train Stops & Data Transfer Rules

> **Read this rule before building or modifying ANY feature that touches user data.**
> Data in The Pep Planner travels like a train through stops. Each stop picks up new passengers (data fields) but must carry forward everything from previous stops. Dropping data between stops is a bug.

---

## The Railroad (Data Flow)

```
Order Created → Vendor Stub → Auto-Tracking → Delivered
    ↓
Stockpile (On-Hand) → Water Droplet → Recon Calculator (In-Use tab)
    ↓
Protocol Wizard → Link Vial → Recon Entry (tagged with protocolId)
    ↓
Active Protocol → Edit Vials → Protocol Running
    ↓
End Protocol → Assessment (vial usage + follow-up) → Protocol History
```

---

## Unit Types & Behavior

| Unit | Converts? | Can Reconstitute? | Delivery Methods | Notes |
|------|-----------|-------------------|-----------------|-------|
| `vial` | No | Yes (water droplet) | subq, im, iv, nasal | Standard injectable peptide |
| `kit` | Yes → vial (×10) | Yes (after conversion) | subq, im, iv, nasal | 1 kit = 10 vials, converted on save |
| `bottle` | No | **No** (hide water droplet) | topical, oral | Topical compounds (GHK-Cu, Lipo C) |
| `tablets` | No | **No** (hide water droplet) | oral | Oral pills (BPC tablets, 5-amino-1MQ) |

**Rules:**
- Use `src/utils/unitConversion.js` for all unit logic (never hardcode `=== 'kit'` checks)
- Kit is the ONLY unit that converts (×10 to vials)
- Bottle and tablets are stored as-is — never force-convert to `vial`
- Hide the water droplet (recon) button for bottle/tablets — they cannot be reconstituted
- Protocol linking works for ALL unit types

---

## Train Stops – Required Data at Each Stop

### Stop 1: Order

Fields created: `id, date, status, category, vendor, vendorId, tracking, shipDate, deliveryDate, items[], shippingCost, publicOrderNumber, notes, attachments`

Each item: `id, name, mg, mgUnit, quantity, unit, price, costPerMg`

Side effect: If vendor is new → create vendor stub (`isStub: true`) + `DontForgetWidget` will remind user.

### Stop 2: Auto-Tracking

Updates: `status` (Order Placed → Shipped → Delivered), `shipDate`, `deliveryDate`, `statusSource`

### Stop 3: Order → Stockpile (on Delivered)

**Passengers that MUST transfer:**
- `name, mg, mgUnit, quantity, unit, cost, costPerMg, vendor, vendorId`
- `orderId` (link back to order)
- `purchaseDate` (from order.date)
- `notes` ("From order #X")

**Conversion rules:**
- Kit: `quantity × 10`, unit → `'vial'`
- Bottle/tablets: quantity stays as-is, unit stays as-is
- Cost per unit calculated (with optional shipping allocation)

### Stop 4a: Stockpile → Recon (Water Droplet)

**Passengers that MUST transfer:**
- `peptide (name), mg, mgUnit, vendor, vendorId, cost, costPerMg, priceUnit`
- `stockpileId` (link back to stockpile item)
- `orderId` (link back to original order)
- `quantity, unit, quantityUsed, dateAcquired`

**Only available for:** vial and kit (after conversion). Hidden for bottle/tablets.

### Stop 4b: Stockpile → Protocol Wizard (Link Vial)

**Passengers that MUST transfer into `linkedItems`:**
- `vialId` (stockpileId)
- `status` ('linked' | 'skipped' | 'pending')

**Into protocol history vials array:**
- `vialId, stockpileId, name, mg, mgUnit, vendor, cost, orderId, purchaseDate`
- `deliveryMethod` (if applicable)
- `reconstitutionDate` (if recon was done)

### Stop 5: Recon Entry (In-Use Tab)

**Passengers that MUST be present:**
- `protocolId, protocolName` (if created during protocol wizard)
- `stockpileId` (link to stockpile)
- `orderId` (link to original order)
- Reconstitution data: `water, concentration, dosesPerVial, peptides[]`

### Stop 6: Active Protocol

**Passengers preserved in `linkedItems`:**
- Per peptide: `status, vialId, reconId, deliveryMethod`

**When vials are edited (EditActiveProtocolVials):**
- Update `linkedItems` on protocol
- Update `vials` array in protocol history entry (not just `vialsAddedDuring`)

### Stop 7: End Protocol → Assessment

**Single-page assessment collects:**
- Per-vial: `status` ('fully_used' | 'leftover'), optional notes
- Follow-up: rating, tags, free-form notes, linkedDate

**Actions on save:**
- `fully_used` vials: move recon item to history tab, set stockpile quantity to 0
- `leftover` vials: add `leftover: true` + `leftoverFromProtocol` to recon item, keep in In-Use tab
- Save `vialAssessment` to protocol history entry

### Stop 8: Protocol History

**ALL passengers from the journey must be here:**
- Protocol data: name, purpose, peptides, duration, linkedItems
- Vials: name, mg, vendor, cost, vialId, stockpileId, orderId, purchaseDate, deliveryMethod
- Vials added during protocol
- Reconstitution data (date, strategy, peptides)
- Skipped reconstitution with delivery methods
- Vial assessment results (fully_used / leftover per vial)
- Follow-up notes, tags, rating
- Completion status, dates

---

## Cross-Link Navigation

Users should be able to trace data in both directions:

| From | To | How |
|------|----|-----|
| Stockpile item | Source order | `orderId` → navigate to Orders page |
| Stockpile item | Linked protocol | Check `protocol.linkedItems` for matching `vialId` |
| Order | Vendor profile | `vendorId` → open vendor details |
| Recon item | Protocol | `protocolId` → navigate to protocol |
| Protocol history | Source order | `vials[].orderId` → navigate to order |

---

## When Building New Features

1. Check which train stop your feature touches
2. Ensure ALL upstream data passengers are preserved
3. Use `prepareItemForSave()` for all creates/updates (see `USER_DATA_SAVE_PATTERN.md`)
4. Use `src/utils/unitConversion.js` for unit logic — never hardcode unit checks
5. Test with all unit types: vial, kit, bottle, tablets
6. If your feature creates data that downstream stops need, update this document
