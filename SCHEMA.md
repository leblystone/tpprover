# PEP Planner – Data Schema (Single Source of Truth)

> **Code is authoritative.** This document describes the current app. It is derived from the codebase. If you find a mismatch between this file and the code (e.g. `cloudStorage.js`, `AppContext.jsx`, components), the code is correct. **Do not change the code or this doc without confirming with the user first;** recommend updating this doc to match the code and ask for approval.

Derived from `src/services/cloudStorage.js`, `src/context/AppContext.jsx`, and components. See [USER_DATA_SAVE_PATTERN.md](USER_DATA_SAVE_PATTERN.md) for save/sync behavior.

---

## Overview

This file is the single source of truth for PEP Planner data: Firestore collections, the main app document keys, and entity shapes. Use it when adding or changing data. All synced user data lives in the main app document (`userData/{userId}`) and is merged with timestamps; see USER_DATA_SAVE_PATTERN.md for the three-step save pattern.

---

## Firestore collections

| Collection | Purpose |
|------------|---------|
| `userData` | Main app data per user (protocols, orders, stockpile, etc.). One doc per `userId`. Written by `cloudStorage.saveAppData` / `loadAppData`. |
| `users` | Auth/profile: email, displayName, createdAt, lastActive, subscription fields, etc. |
| `userSubscriptions` | Stripe/subscription data per user. |
| `userPreferences` | Theme, settings, etc. (optional separate store). |
| `userState` | Onboarding, demo-data flags, etc. |
| `userdata` | Legacy encrypted user data (password-derived); may coexist with `userData`. |
| `inviteCodes` | Invite code definitions and usage. |
| `config` | App config (e.g. `emailWhitelist`, `featureFlags`). |
| `announcements` | Admin announcements. |
| `analytics` | Usage/counts (e.g. `usage`, `userCount`, `founderCount`). |
| `feedback` | User feedback submissions. |
| `notifications` | User-facing notifications. |
| `supportTickets` | Support tickets; subcollection `messages` per ticket. |
| `adminMessages` | Admin broadcast messages. |
| `lifetimeAccess` | Per-user lifetime access grants. |
| `lifetimeAccessPreGrants` | Pre-granted lifetime by email. |
| `lifetimeCodes` | Lifetime access codes. |
| `annualCodes` | Annual subscription codes. |
| `user_agreements` | User agreement acceptance records. |

---

## Main app document (userData)

The blob saved per user at `userData/{userId}`. Every key below is in `timestampedData` in `cloudStorage.js` (saveAppData) and is loaded by `loadAppData`. All array items should have `id` and `updatedAt` (use `prepareItemForSave` from `src/utils/userDataSave.js`).

| Key | Type | Description |
|-----|------|-------------|
| `protocols` | array | User's protocols (see Entity: Protocol). |
| `reconItems` | array | Reconstitution calculator items. |
| `reconHistory` | array | Reconstitution history entries. |
| `supplements` | array | Supplement entries. |
| `orders` | array | Orders (see Entity: Order). |
| `metrics` | array | Metrics entries. |
| `vendors` | array | Vendor list (id, name, etc.). |
| `stockpile` | array | Stockpile items (see Entity: Stockpile item). |
| `scheduledBuys` | array | Scheduled buy entries. |
| `protocolHistory` | array | Historical protocol records. |
| `wishlist` | array | Wishlist items. |
| `calendarNotes` | object | Date-keyed calendar notes (see Entity: Calendar note). |
| `userNotes` | array | Free-form user notes. |
| `userGoals` | array | User goals. |
| `waterTracker` | object | Date-keyed water intake (see Entity: WaterTracker). |
| `taskCompletion` | object | Date → timeSlot → taskId → boolean. |
| `calendarDone` | object | Same shape as taskCompletion for calendar tasks. |
| `injectionHistory` | array | Injection records (see Entity: Injection record). |
| `injectionStats` | object | `{ global: { totalInjections, sites, lastInjection }, tasks: {} }`. |
| `deletionTracking` | object | Tracks deleted item ids per type for merge (e.g. protocols, orders, stockpile). |

Doc also gets `userId`, `lastUpdated` (server timestamp), and `version` when saved.

---

## Entity shapes

### Protocol

- **protocolName** (string) – Display name.
- **purpose** (string) – Optional purpose/notes.
- **protocolType** (string) – e.g. `'separate'` \| `'blended'`.
- **peptides** (array) – Each: `id`, `name`, `frequency` (e.g. `{ type: 'daily', time: ['AM'], customReminder: false, reminderTime: null }`), `unitValue`, etc.
  - **frequency.customReminder** (boolean) – If true, this peptide has its own push notification time.
  - **frequency.reminderTime** (string|null) – HH:mm format, e.g. `'07:30'`. Used when customReminder is true.
- **duration** (object) – `count`, `unit` (e.g. `'weeks'`), `noEnd`.
- **washout** (object) – `enabled`, `duration`, `unit`.
- **notes** (string).
- **active** (boolean) – Whether protocol is currently active.
- **id**, **updatedAt** – Required on every item (sync).

### Order

- **date** (string, ISO or date string).
- **status** (string) – e.g. `'Order Placed'`, `'Shipped'`, `'Delivered'`.
- **category** / **type** (string) – e.g. domestic, groupbuy.
- **vendor** (string or vendor id).
- **tracking** (string) – Tracking number.
- **shipDate**, **deliveryDate** (string, optional).
- **items** (array) – Each: price, quantity, etc.
- **shippingCost** (number).
- **orderNumber** (string, optional, for display).
- **id**, **updatedAt** – Required on every item.

### Stockpile item

- **name** (string) – Peptide/product name.
- **mg** (string/number) – Mg per vial.
- **quantity** (string/number) – Number of vials/units.
- **vendor** (string).
- **cost** (string/number).
- **unit** (string) – e.g. `'vial'`.
- **id**, **updatedAt** – Required on every item.

### Calendar note (per date)

- **calendarNotes** is an object: `{ [dateKey]: { notes: [ ... ] } }`.
- Each **note** in `notes`: `id`, `updatedAt` or `createdAt`, and content fields (e.g. text).

### Injection record

- **id** (string).
- **timestamp** or **date** (number/string) – When the injection occurred.
- Other fields (site, peptide, etc.) as used by injection tracking.

### TaskCompletion / calendarDone

- Nested object: `{ [date]: { [timeSlot]: { [taskId]: boolean } } }`.
- Used for daily task completion and calendar task completion.

### WaterTracker (per date)

- **waterTracker** is an object: `{ [dateKey]: { glasses, goal, unit, lastUpdated } }`.

### UserNote / UserGoal

- Array items with `id`, `updatedAt`, and content fields as used by notes/goals components.

---

## Local-only (not in userData)

These are not part of the synced `userData` blob. See USER_DATA_SAVE_PATTERN.md for the full list.

- **Dashboard layout** – `tpprover_dashboard_layout` (localStorage). Does not sync across devices.
- Other UI/preference keys under `tpprover_*` that are not listed in the "Synced" section of USER_DATA_SAVE_PATTERN.md.
