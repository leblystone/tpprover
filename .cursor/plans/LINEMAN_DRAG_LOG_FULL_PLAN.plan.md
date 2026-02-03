---
name: Lineman Drag Log Full Plan
overview: "Revised plan for the new vertical SaaS app Lineman Drag Log (Belix): project init, WorkLog schema, UI skeleton from reference screenshot (color scheme, bottom sheet, bottom nav, account placement), and full feature checklist—no implementation."
todos: []
isProject: false
---

# Lineman Drag Log – Full Plan (Revised)

This plan is **directions only**. No code or config changes here. It includes your full feature checklist, the UI skeleton from your reference screenshot (color scheme, bottom sheet, bottom nav, tab styling, settings/account placement), and updated WorkLog schema.

**Product name:** Lineman Drag Log (branding: Safety First, industrial modern; “Powered by Belix” in footer/legal).

---

## Pre-build decisions (locked)

**Repo and Firebase:** Nothing crosses over. One **skeletal crossover only** – reuse patterns (auth, single-doc sync, merge, AppContext) to get the base/UI started; do **not** copy the TPPSpendide repo. New repo + new Firebase project for Lineman Drag Log only.

**Brother's Keeper / household:** Option A – Two Firebase Auth users share one Firestore doc. Use a collection like `householdData/{householdId}`; both users have read/write when their `userId` is linked to that `householdId`. Each person has their own login; no shared passwords.

**Billing at launch:** Yes. **Native Android + iOS only** (Google Play + Apple). No web or PWA. Two tiers only: **Free** and **Paid (Top Out Subscription)**. Offer **monthly** and **annual** subs. Not a trial – feature tiers: free gets limited usage (e.g. one full log / limited drag-up entries), then prompt to upgrade to Top Out (unlimited). See "Billing tiers (suggestion)" below for one way to implement the kink.

**OCR:** Google (Cloud Vision) for paystub/term-slip extraction. Extract text only; for pay stubs / anything with PII we do **not** store the image (see "Image policy" below).

**State tax:** Own file (JSON in repo or Cloud Storage) that you update when states change. Strictly **estimates** (e.g. percentage for that year); no exact numbers. Implementation: one source file, read by app or Cloud Function; you update the file periodically.

**Platform:** Native Android and iOS only. Capacitor from day one. **No web or PWA version.**

**Single source of truth for the schema (simple terms):** One file – e.g. `SCHEMA.md` or `workLogSchema.js` – that lists **every** piece of data the app uses: job, dragUpLog, householdData, paystubVault, etc., and what each field is (name, type, meaning). Everyone (you and the AI) builds from that one definition so we don't have "jobs" with 5 fields in one place and 7 in another. One definition = one source of truth. Add this file early and keep it updated as we add features.

**Image policy:** We **do** store certain photos: OSHA cards, first aid certs, flagger certs, termination slips – **as long as they don't contain sensitive PII** (no SSN, no driver's license, no pay stub with personal numbers). For pay stubs or any doc with SSN/license/PII: **OCR only, discard image**; store only extracted text (e.g. hours, gross pay). So: non-PII certs and term slips = OK to store image; pay stubs and anything with SSN/license = never store image, only extracted data.

**Naming:** Use **camelCase** everywhere (Firestore, context, UI keys). CamelCase = first word lowercase, every following word capitalized, e.g. `dragUpLog`, `hotTimeLog`, `householdId`. Keeps the codebase consistent.

**Secrets:** All API keys and Firebase config in env vars only; nothing hardcoded in the repo.

**Scope:** Everything in the full feature checklist is the **base** – it's all on paper. Build order is phased (Phase 1 then Phase 2) to keep the first build shippable, but the list is the full base; adjustments later are fine.

---

## Onboarding (after sign up)

Right after sign up, prompt: **"Who are you?"**

- **The Lineman** – Groundman, Apprentice, or Journeyman (pick one). Drives: Drag Up vs Hot Time, which books, which hours tracker.
- **Brother's Keeper** – Spouse, Assistant, Friend, etc. Drives: linked household, read/write to same data as the lineman; no "Drag Up" as primary action for them.

Save the choice to the user profile (e.g. `userRole`: `lineman` | `keeper`; if lineman, then `linemanType`: `groundman` | `apprentice` | `journeyman`). Use it everywhere so the UI shows the right primary actions and screens.

---

## Billing tiers (suggestion for the "kink")

**Free tier:**  

- One active job at a time (or one "full log" – one current job + limited history).  
- Cap on drag-up / hot-time entries (e.g. last 10 or 30 days of entries visible; or hard cap like 5 drag-ups then prompt to Top Out).  
- When they hit the cap or add a second job, show a prompt: "Top Out – unlock unlimited jobs and full history."

**Paid tier (Top Out Subscription):**  

- Unlimited active jobs and full drag-up/hot-time history.  
- All features (Book 1/2, paystub vault, storm, wallet, Brother's Keeper, FCM, etc.).  
- Monthly and annual options (annual = discount).

You can tune the free cap later (e.g. 1 job + 3 drag-ups vs 30 days); the important part is: free = limited, paid = unlimited, two tiers only, monthly + annual.

---

## Step-by-step: Yours vs Mine (simple terms)

Use this as your task list. **💛 = you (the dev)**. **🍭 = me (the AI)**. Check off as you go.

### Phase 1 – Get the project on your machine

- 💛 **You:** Create a new folder outside TPPSpendide (e.g. `LinemanDragLog` on your Desktop or in a dev folder). **New repo only – nothing crosses over from TPPSpendide.**
- 💛 **You:** Create a brand-new Vite app (Option A – no copy of TPPSpendide). Run `npm create vite@latest LinemanDragLog -- --template react` (or similar) in that folder. **Skeletal crossover once** = we reuse only patterns (auth, sync, merge, AppContext), not copy-paste.
- 🍭 **Me:** Give you the exact list of packages to install (React Router, Firebase, Capacitor, Tailwind, etc.) and a minimal folder structure.
- 💛 **You:** Run `npm install` and any other setup commands I suggest.
- 💛 **You:** Create a new Firebase project in the Firebase Console (e.g. "Lineman Drag Log" / `belix-linemandraglog`), enable Auth (email/password) and Firestore.
- 💛 **You:** Add your Firebase config (or env vars) in the new app – I'll tell you which keys; you paste the values from the Console.
- 💛 **You:** Initialize Capacitor in the project (`npx cap init`) and set `appId` / `appName` for Lineman Drag Log.

### Phase 2 – Auth and data shell

- 🍭 **Me:** Write the auth flow (login, signup, reset password) and Firebase config wiring in the new app, using the same pattern as TPPSpendide.
- 🍭 **Me:** Define the WorkLog schema (Firestore `users` + `userData` doc and all the keys from Section 3) and write `saveUserData` / `loadUserData` (or `saveAppData` / `loadAppData`) plus merge logic.
- 💛 **You:** Deploy Firestore rules (I'll give you the rules file; you run `firebase deploy --only firestore:rules` from the new project).
- 🍭 **Me:** Wire up AppContext so the app loads/saves the WorkLog keys and syncs to Firestore (with optional localStorage and protection window like TPPSpendide).
- 💛 **You:** Point the app's Firebase config to your new project and test: sign up, log in, and confirm one doc per user appears in Firestore.

### Phase 3 – UI skeleton (look and feel)

- 🍭 **Me:** Add the Industrial Sleek theme (charcoal background, teal primary, coral accent) in `src/theme/` and wire it into Tailwind or CSS variables.
- 🍭 **Me:** Build the shell layout: header ("Welcome back" + name, profile circle, badge), bottom nav bar (tabs), and bottom sheet modal component.
- 🍭 **Me:** Apply tab styling (teal when active, grey when not) and card-based content layout so it matches your reference screenshot.
- 💛 **You:** Drop in your logo / assets if you have them; tell me any tweaks to colors or spacing.
- 💛 **You:** Add a "Settings" and "Account" entry in the nav or header; I'll hook up the routes and placeholder pages.

### Phase 4 – Features (we go feature by feature)

For each feature (Drag Up, Hot Time, Books, Paystub Vault, etc.):

- 🍭 **Me:** Propose or implement the screens, components, and Firestore fields for that feature (e.g. Drag Up flow, Hot Time flow, Book 1/2 Lottie, paystub OCR flow with zero image policy).
- 💛 **You:** Test on your device or emulator; report bugs or copy changes (e.g. "make the Drag Up button bigger", "add this label").
- 💛 **You:** Handle anything that only you can do: Firebase Console (new collections/indexes if needed), env vars, signing keys for mobile, app store listings.
- 🍭 **Me:** Adjust code and add the next feature in the order we agreed (see Section 7).

### Phase 5 – Notifications and backend

- 🍭 **Me:** Outline or implement the Cloud Function (cron) that figures out "who's ending shift" and the FCM payload for the "Shift Over?" interactive notification.
- 💛 **You:** Enable Cloud Messaging in Firebase, upload FCM config / service worker if needed, and test push on a real device.
- 💛 **You:** Set up the scheduled job (e.g. Firebase Scheduled Functions) so the cron runs every 15 minutes (or whatever we decide).
- 🍭 **Me:** Wire the app to handle "YES" / "DOUBLE TIME" / "EDIT" from the notification and write the log entry without opening the app (if possible on your stack).

### Phase 6 – Polish and ship

- 🍭 **Me:** Add "Powered by Belix" in the footer and legal screens; Safety First branding where we agreed.
- 💛 **You:** Fill in privacy policy and terms (or paste from a lawyer); I can place them in the right screens.
- 💛 **You:** Run builds (`npm run build`), sync Capacitor (`npx cap sync`), and open Android/iOS to test. **Native Android + iOS only** – no web or PWA deploy.
- 💛 **You:** Submit to Google Play and Apple App Store when ready (you own accounts and signing).
- 💛 **You:** Keep the feature checklist (Section 4) and this Yours/Mine list updated as we complete items.

### Quick reference


| If you need…           | You do (💛)                             | I do (🍭)                                            |
| ---------------------- | --------------------------------------- | ---------------------------------------------------- |
| New repo or folder     | Create it, run npm/create commands      | Tell you what to run and what to put where           |
| Firebase / API keys    | Create project, copy keys, deploy rules | Write code that uses those keys; give you rules text |
| Design or copy changes | Tell me what to change                  | Update theme, layout, and copy in code               |
| New feature            | Ask for it; test it; give feedback      | Implement UI + data + flow for that feature          |
| Bugs                   | Describe what's wrong and where         | Propose or apply fixes                               |
| App store / signing    | Build, sign, upload, submit             | N/A (you own accounts and certs)                     |


---

## 1. UI skeleton (from reference screenshot)

These patterns are **part of the skeleton** to carry over or replicate.

**Color scheme (match screenshot exactly)**  

- **Background:** Deep charcoal / very dark blue (`#1a1a1c` or similar) – dominant.  
- **Primary (teal):** Vibrant teal for primary actions and key UI:  
  - Banners (“Enjoy an ad-free experience…”), “Join Them” buttons, progress cards (e.g. “0 of 3”), selected tab (e.g. “Home”) in bottom nav.
- **Secondary accent (coral / reddish-orange):** Flame/streak icons, vertical markers next to list items (e.g. “Breakfast”), critical actions – use for **Drag Up** and other high-priority actions.  
- **Text:** White and light grey on dark background for contrast.

**Layout and components**  

- **Header / account placement:**  
  - “Welcome back” + user name (e.g. “Lebrock Maldonado”).  
  - Left: circular profile picture.  
  - Right: circular badge (e.g. “0/7”) for setup progress or account completion.
- **Bottom navigation bar:**  
  - Dark bar, 4–5 icons (e.g. Home, Settings, Analytics, Meals, Settings).  
  - Selected tab: teal icon + label; others grey.
- **Tab styling:** Clear active state (teal), inactive (grey); optional labels under icons.  
- **Bottom sheet modals:** Use bottom sheet for forms, filters, and “quick log” flows (e.g. Drag Up, Hot Time, log hours) so the app feels like the reference.  
- **Content:** Card-based layout; rounded cards on dark background (progress cards, “Winners Club”, lists with colored left-edge markers).  
- **Settings and account:** Accessible from header (profile/badge) and/or bottom nav; account/setup progress visible in header badge.

**Theme file:** Define one “Industrial Sleek” theme in `src/theme/` with: `background` (charcoal), `primary` (teal), `accentCoral` (coral for Drag Up / hot actions), plus text and card vars. Use in Tailwind or CSS variables so all screens match the screenshot.

---

## 2. Project initialization (unchanged intent)

- New directory **outside** TPPSpendide (e.g. `LinemanDragLog` or `Belix-LinemanDragLog`).  
- **Option A only:** New Vite + React + React Router + Firebase (Auth, Firestore, Functions, Storage) + Capacitor + Tailwind. Do **not** copy TPPSpendide; reuse only patterns (auth, single-doc sync, merge, AppContext). Skeletal crossover once = patterns only.  
- New Firebase project (e.g. `belix-linemandraglog`).
- **Single source of truth for schema:** Add one file early – e.g. `SCHEMA.md` or `src/config/workLogSchema.js` – that lists every data key (jobs, dragUpLog, householdData, etc.) and each field's name, type, and meaning. Everyone (you and the AI) builds from that file.  
- `capacitor.config.json`: `appId` (e.g. `com.belix.linemandraglog`), `appName`: “Lineman Drag Log”.

---

## 3. WorkLog database schema (Firestore) – extended

**Collections:**  

- `users/{userId}` – profile, `userRole` (lineman | keeper), `linemanType` (groundman | apprentice | journeyman), `householdId` (if linked).  
- `userData/{userId}` – single doc per user (or per household – see below), merge by `updatedAt` + deletion tracking.  
- `householdData/{householdId}` – **shared doc** when Brother's Keeper is used: both the lineman and the keeper have read/write; each user's `userId` is linked to this `householdId` in `users`. One source of truth for the household's jobs, dragUpLog, etc.

**userData top-level keys (extended for full feature set):**


| Key                                                  | Purpose                                                                                                                                     |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `jobs`                                               | Active jobs (employer, local, start date, contract ref, storm flag, shift rules, etc.).                                                     |
| `jobHistory`                                         | Completed jobs / drag-ups / hot time entries.                                                                                               |
| `workNotes`                                          | Date-keyed notes (same shape as calendarNotes: `{ "YYYY-MM-DD": { notes: [...] } }`).                                                       |
| `dragUpLog`                                          | Journeyman/groundsman: each “Drag Up” (jobId, endedAt, location, termSlipScanId?, reason?, labels?).                                        |
| `hotTimeLog`                                         | Apprentice: “Hot Time” entries (jobId, endedAt, location, paystubScanId?).                                                                  |
| `paystubVault`                                       | Paystub records (id, jobId?, capturedAt, **no image stored – zero image policy**; extractedHours, extractedGrossPay only).                  |
| `unionBook`                                          | Book 1 (home local, name, local logo ref) + Book 2 (halls signed, active book, resign dates, in-person vs online rules).                    |
| `apprenticeProgress`                                 | Step, totalHoursToDate, hoursToNextStep, programType (7-step 7k hrs vs 4-step non-union, etc.).                                             |
| `groundsmanProgress`                                 | Books 1–4, 2000 hrs, progress.                                                                                                              |
| `contracts` / `contractRefs`                         | References or links to union hall contracts (for “money follows the man”, rates, hazard pay).                                               |
| `digitalWallet`                                      | Cards/CDL/medical/OSHA/flagger/first aid – item, expiry, reminder on.                                                                       |
| `dues`                                               | Home local, paid/upfront, next due, reminder.                                                                                               |
| `w2ReceivedLog`                                      | Year + “received” flag (no private details).                                                                                                |
| `reimbursementVault`                                 | Storm reimbursements (receipts: **no images stored**; amount, category, date, sentTo, jobId?).                                              |
| `keeperLink`                                         | Brother’s Keeper: linked household id or keeper userId (shared household logic).                                                            |
| `userRole`                                           | `worker`                                                                                                                                    |
| `currentJob`                                         | For FCM: startTime, shiftLength, overtimeThreshold, stormMode, etc. (used by Cloud Function to send “Shift Over?” notification).            |
| `taskCompletion`, `calendarDone`, `deletionTracking` | Same as current pattern.                                                                                                                    |
| `weeklyAuditLog`                                     | Weekly summary for “this week – make edits – done” (for smart logic / push-driven flow).                                                    |
| `lastSiteMemory`                                     | Last job site, location, contract, union, job – for “you’re here” autofill and single Drag Up button.                                       |
| `postDragUpAssessments`                              | Optional: reason, notes, company/person labels (e.g. “took care of their men”, “housing inadequate”, “good company”, “contract fulfilled”). |
| `stateTaxRef`                                        | Backend-updated state/tax areas when user selects state of work (for estimate %, no exact numbers).                                         |
| `globalContractors`                                  | User’s contractor list (for autofill / call info).                                                                                          |


**Image policy:** **Do store** (non-PII): OSHA cards, first aid certs, flagger certs, term slips without SSN/license. **Do not store** (PII): SSN, driver's license, pay stubs. For those: OCR only, discard image. Store non-PII images in Storage; reference path in Firestore. For PII (SSN, license, pay stubs): do **not** store image; store in Firestore only: social security cards, driver’s license, pay stubs, or any image with PII. OCR result only: extracted hours/gross pay (and optionally “reason” from term slip). Reimbursement: store only metadata (amount, category, date); no receipt images if they contain PII.

---

## 4. Full feature checklist (build order and grouping)

Copy this into your tracker; check off as you build. **This is your base – everything below is on paper; phased rollout for build order, but the list is the full base.**

### 4.0 Onboarding (after sign up)

- **Who are you?** Right after sign up, prompt user to select: **The Lineman** (Groundman, Apprentice, Journeyman) OR **Brother's Keeper** (Spouse, Assistant, Friend, etc.). Save to profile (`userRole`, `linemanType`); use everywhere so UI shows the right primary actions and screens.

### 4.1 Core identity and roles

- **Three steps:** Groundsman, Apprentice, Journeyman – user type drives UI (Hot Time vs Drag Up, books, hours).
- **Worker vs Keeper:** Role 1 = actual worker (lineman); Role 2 = Brother’s Keeper (spouse/assistant). Replace all “Spouse/Partner” with “Brother’s Keeper”.
- **Separate Key, Same House:** Unique credentials per person; no shared passwords. “Invite my Lineman” → Keeper creates household → Lineman gets link → creates own login → account linked to same household data.
- **Brother’s Keeper:** Share feature to link lineman account with keeper; shared household logic in Firestore (e.g. `householdId`, `keeperLink`).

### 4.2 Primary actions (journeyman / groundsman vs apprentice)

- **Drag Up button** (journeyman/groundsman): Prominent action – end job, log location, optional term slip photo (OCR only, no image stored). Coral accent.
- **Hot Time** (apprentice): Same idea as Drag Up but for apprentices; separate entry type in `hotTimeLog`.
- **30-second Drag Up:** Snap photo of term slip → OCR reason/termination → app marks out of work, moves to history tab.
- **Animated coin flip (Drag Up or not):** “Coin toss is sacred” – Heads: “Get Back to Work”; Tails: launch Drag Up sequence (auto date, term slip photo, mark job complete). Option to share result with crew (leaving vs staying).
- **Last site memory:** Autofill “you’re here” – this location, this job, this contract, this union – single Drag Up button when needed. Phone location ping once or autofill job site.

### 4.3 Contracts, calls, and pay

- **Contracts / calls:** When user takes a call, store contract ref so they see: pay rate, hall paying out of, per diem, extras. Backend: pull union hall contracts (or AI-sourced references) so contracts are referrable in-app.
- **AI-generated / sourced contracts:** Research path: make union hall contracts readily available (links or summarized terms) for reference when working a local.
- **“Money follows the man”:** In-app explanation for journeyman: pension – does it follow to home local or stay at working local? (Copy + possible link to contract/benefits.)

### 4.4 Hours, books, and programs

- **Hours tracker:** For both groundsman and apprentice (separate progress objects).
- **Apprentice programs:** Pre-filled dropdown – standard 7-step 7,000 hours (vs 4 years), 4-step for non-union/private. Apprentice step tracker with hours to next raise.
- **Groundsman:** 2,000 hours, four books. Books 3 & 4 = no experience (e.g. CDL only); Book 2 = some experience. Book 1 = home local (name, local, logo). Book 2 = halls signed, currently active, resign dates.
- **Book 1 & Book 2 tracker:** Lottie “leather-bound book” – Book 1: home local, name, local, logo; Book 2: how many halls signed, active book. Click Book 2 → details: when they get kicked off that book, resign dates. Resign details: in person vs online, after X months – show in UI.
- **Work history export:** Apprentices and groundsman – export list of hours worked, call time logged, etc.

### 4.5 Paystubs, W-2, and retirement audit

- **First/last paycheck logging:** Journeyman – log first and last pay for job; track hours for benefits/retirement; proof that employer reported correctly.
- **OCR for first/last pay stubs:** Camera → extract hours and gross pay only; **zero image policy** – do not save stub image. Use Lottie during capture/processing to smooth UX (reduce perceived “glitchiness”).
- **W-2 received tracker:** Simple “W-2 received?” per year – yes/no; no private details.

### 4.6 Storm work

- **Storm work:** Enable for all three (groundsman, apprentice, journeyman); design how it’s “exciting” (e.g. storm badge, storm-specific job type).
- **Double time / OT alerts:** “You’re making $X/hr” style alert – especially for storm (and optional hot pay/storm bonus).
- **Storm toggles:** Double time vs time-and-a-half; 24/7 vs 16/8; hot pay / storm bonus; high voltage or hazard pay (per union – pull from contract when possible).
- **Storm reimbursements:** Reimbursement area – who to send to (HR), when. Receipts for hotels, food, flights – **no image storage** (metadata only or user stores elsewhere).
- **Standby vs work hours:** For storm, optional toggle; keep it simple so they don’t have to “whip out the phone” constantly.

### 4.7 Location and tax

- **GPS ping (journeyman):** Notification when entering new city or county – single ping, not full tracking.
- **State / tax autofill:** When selecting state of work, backend provides up-to-date tax areas (updated when states change). Log state income tax for where they’re working – estimate percentage for that year only; no exact numbers.

### 4.8 Digital wallet and credentials

- **Digital wallet:** Checklist of what they might need – cards, CDL, medical, OSHA, flagger, first aid. Each item clickable with expiry; reminders when expiring.
- **Dues:** Paid / paid upfront; reminder when dues expiring; reminder to pay at **their home local** (use their set local, not generic).
- **Journeyman visuals:** Yellow ticket / white ticket (visual indicators in UI).

### 4.9 Map, history, and labels

- **Map visual:** Where they’ve been; filters: all time, this year, last year, last 6 months.
- **Post-drag-up assessment:** Optional reason, notes, company/person labels – e.g. “took care of their men”, “housing inadequate”, “good company”, “contract fulfilled”, “contract fulfilled”, etc. (Like “labels” in Pep Planner.)

### 4.10 Privacy and data

- **Privacy:** We do **not** sell individual user data. We may use/sell **aggregate** insights (e.g. “X% left for reason Y”). Optional “reason for dragging up” can feed aggregate only.
- **Zero image policy:** No storing SSN, license, pay stubs, or any PII images. OCR toggle: “keep extracted text only, discard image.”

### 4.11 Notifications and smart logic

- **Push or text notifications only** (no email for main flows).
- **Interactive push notifications:** Not just reminders – notification is the input. E.g. “Shift Over? [06:00–18:00]” with actions: [ YES – Log 12hrs ], [ NO – I’m on 2.0x ], [ EDIT ].
- **Total smart logic:** Job profile (start time, shift length, OT threshold) drives FCM. Cron (e.g. every 15 min) checks who’s ending shift → send notification. Tapping “YES” writes log in background (no need to open app). Goal: “They don’t have to open the app unless necessary or at end of year.”
- **Weekly audit:** Log of the week for users – “this week, make any edits, done” – even if they mostly use push.

### 4.12 Developer checklist (smart logic)

- **Job profile schema:** `currentJob` (or per-job) with `startTime`, `shiftLength`, `overtimeThreshold` in Firestore.
- **FCM action categories:** “YES”, “DOUBLE TIME”, “EDIT” (and any others) for interactive notifications.
- **Backend auto-calc:** 1.5x and 2.0x hours/totals on backend; user only sees hours.
- **Cloud Function:** Cron that calculates “who should be finishing shift” and sends the interactive notification.

### 4.13 Sharing and growth

- **Share app:** “Share with another lineman.”
- **Share coin flip:** “Share with crew – leaving or staying.”

---

## 5. Skeleton transfer (what to keep)

- **Auth:** Email/password sign up, sign in, reset; optional verify. Branding: Lineman Drag Log, Belix.  
- **Database:** Single doc per user; timestamp merge; deletion tracking.  
- **Global state:** One AppContext with all WorkLog slices; localStorage keyed by user then sync to Firestore; optional protection window for critical writes.  
- **UI skeleton:** Bottom sheet modals, bottom menu bar, tab styling, header with welcome + profile + badge, card layout, settings/account placement – as in reference screenshot.

---

## 6. Visual and branding summary

- **Theme:** Industrial Sleek – deep charcoal background, teal primary, coral for Drag Up/hot actions.  
- **Safety First** + industrial modern aesthetic.  
- **“Powered by Belix”** in footer and legal only.  
- **App name:** Lineman Drag Log.

---

## 7. Implementation order (suggested)

1. Project init + Firebase + Capacitor.
2. Auth + Firestore rules + `userData` with WorkLog keys (including `currentJob`, `keeperLink`, roles).
3. Cloud + AppContext + sync (saveAppData/loadAppData with all new keys).
4. UI skeleton: theme (screenshot colors), bottom nav, bottom sheets, header (welcome, profile, badge), tab styling, settings/account placement.
5. Roles: worker vs keeper; three steps (groundsman, apprentice, journeyman).
6. Drag Up flow + Hot Time flow; last site memory; coin flip (animated).
7. Contracts/calls + “money follows the man” copy.
8. Book 1 & Book 2 (Lottie) + apprentice/groundsman hours + program dropdowns.
9. Paystub vault (OCR, zero image) + W-2 received + first/last pay logging.
10. Storm work toggles + OT/double-time alerts + reimbursements (no images).
11. Digital wallet + dues + yellow/white ticket visuals.
12. Map visual + filters; post-drag-up labels/assessment.
13. Brother’s Keeper invite + shared household + separate logins.
14. GPS ping (journeyman); state/tax autofill (backend).
15. Interactive FCM + cron + weekly audit + “Total smart logic.”

No code or config is changed in TPPSpendide; this plan is directions only for building Lineman Drag Log.