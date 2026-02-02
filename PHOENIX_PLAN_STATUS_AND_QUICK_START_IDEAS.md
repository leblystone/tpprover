# 🔥 Phoenix Plan – Status & Quick Start Ideas

**Last updated:** January 31, 2026

---

## 📍 Where We Stand

### ✅ **DONE (Phases 1–3 + Wizard Accordion)**

| Item | Status | Notes |
|------|--------|-------|
| **Phase 1: Protocol Editor Accordion** | ✅ Done | Optional sections, hints, no “Step 1, 2, 3” |
| **Phase 1: Wizard Accordion** | ✅ Done | Stages killed; single-page accordion (`WIZARD_ACCORDION_COMPLETE.md`) |
| **Phase 1: Skip Buttons** | ✅ Done | “Start without vials”, “Skip All – Track Manually”, “Skip – I’ll do this later” |
| **Phase 1: Visual Calendar Preview** | ✅ Done | In wizard and Quick Start modal |
| **Phase 2: Quick Start Modal** | ✅ Done | `QuickStartProtocolModal.jsx` – name, dosage, time, date → active protocol in ~30 sec |
| **Phase 2: Quick Start Placement** | ✅ Done | “+ Protocol” dropdown (Quick Start / Full Setup) + empty state (Quick Start + Full Setup) |
| **Phase 2: “Link Vials Later”** | ✅ Done | “🔗 Link Vials” badge on quick-started protocols; opens manage → edit |
| **Phase 3: Protocol IDs** | ❌ Not done | P-XXXXXX on cards not implemented; decision: not adding (no product IDs on cards). |
| **Phase 2: Stockpile → Protocol Suggestions** | ❌ Not done | “You have a Semaglutide protocol. Link these vials?” when adding vials to stockpile |
| **Phase 3: Stockpile IDs (V-XXXXXX)** | ❌ Not done | Visible vial IDs for support refs |
| **Phase 3: Better Empty States** | Partial | Protocols has Quick Start; others have single CTA only |
| **Phase 3: Smart Defaults / Advanced Toggle** | ❌ Not done | Stockpile/form “Show advanced” |
| **Phase 4: Bulk Import / CSV** | ❌ Not done | Planned for later |

---

## 🎯 Quick Start Protocol – What & Why

**What:** A **Quick Start** path so users can create and **start** a protocol in ~30 seconds with minimal fields (name, dosage, time, start date). No vials, no full editor.

**Why (from Phoenix plan):**
- **Cold start:** New users see an empty app; long flows feel like “installing software” and get abandoned.
- **Time-to-value:** Quick Start gets them to “I’ve started a protocol” in ~30 sec instead of 5–10 min.
- **Progressive detail:** They can add vials/details later via “🔗 Link Vials” on the card; same protocol, no “upgrade” conversion.
- **Two entry points:** Quick Start (fast) vs Full Setup (complete), so both new and power users are served.

**Where it lives:**
- **Modal:** `src/components/protocols/QuickStartProtocolModal.jsx`
- **Entry points:** Protocols page “+ Protocol” dropdown + empty state (“Quick Start (30 sec)” + “Full Setup”)
- **Badge:** Protocol cards show “🔗 Link Vials” when `quickStart: true` and no vials linked

---

## 🔧 What’s Left / Kinks

1. **Stockpile → Protocol suggestion**  
   When user adds vials to stockpile, suggest: “You have a [Name] protocol. Link these vials?” [Yes / No]. Not implemented.

2. **Protocol ID (P-XXXXXX) on cards** – Not implemented; decision: not adding (no product IDs on cards).  
   Plan says visible; code search didn’t show it in `ProtocolCard.jsx`. Worth confirming or re-adding.

3. **Stockpile IDs (V-XXXXXX)**  
   Plan: show last 6 of vial id on stockpile cards for support. Not done.

4. **Dashboard “Active Research” widget – no Quick Start**  
   When there are no active protocols, widget shows “No active protocols” and an “eye” to go to Protocols. Per plan, only the Protocol Status widget should prompt; adding a small “Quick Start” link/button there would align with “quick start from empty state” without cluttering other widgets.

5. **Welcome / one-time modal**  
   Plan mentioned optional one-time “Get started in 30 seconds: [Quick Start]” for new users. Not implemented; could be a nice addition later.

---

## 🚀 Other Areas for Quick Start (New Users, Empty State)

Same idea as Quick Start Protocol: **minimal steps so new users feel they’ve “done something” fast** and don’t bounce.

| Area | Current empty state | Quick Start idea | Why |
|------|---------------------|-------------------|-----|
| **Stockpile** | “Add Your First Peptide” → full add form | **Quick Add Vial** modal: Name, mg, quantity (e.g. 3 fields). Optional: vendor/cost. “Add to stockpile” → done. Full form still available. | Same “30 sec win” as protocols; they see one vial in stockpile immediately. |
| **Orders** | “Add First Domestic/International Order” → full order form | **Quick Add Order**: Vendor (or “I’ll add later”), status = Ordered, maybe one line item (name + quantity). Rest optional. | Gets first order on the map; details later. |
| **Vendors** | “Add First Domestic/International Vendor” | **Quick Add Vendor**: Name + one contact (email or phone). Type from tab. Rest optional. | One vendor in the list fast; full details when they’re ready. |
| **Goals** | “No goals yet. Use New Goal…” | **Quick Goal**: One field – e.g. “What are you tracking?” (weight, energy, etc.) → one goal created with default cadence. | Instant “I have a goal” without full goal form. |
| **Recon** | Empty state when no items | **Quick Recon**: “Reconstitute one vial” – pick from stockpile (or “I’ll add to stockpile first”), one peptide, one vial. Minimal calc. | First recon done quickly; full flow later. |
| **Dashboard (first visit)** | Customizable widgets, some empty | **First-time hint:** One dismissible tip: “Start here: add a protocol in 30 seconds” with link to Protocols + Quick Start. | Directs empty-state users to the existing Quick Start. |

**Suggested priority for new users (empty-state focus):**
1. **Quick Add Vial (Stockpile)** – protocols often assume some stockpile; one quick vial reduces “I have nothing” feeling.
2. **Dashboard “Start here” hint** – cheap win; points to existing Quick Start.
3. **Quick Add Vendor** – many users have “that one vendor”; one field + contact gets them started.
4. **Quick Add Order** – then **Quick Add Vial** can feel more connected (“this order became this vial”).

---

## ✅ Summary

- **Phoenix core is in place:** Quick Start Protocol, accordion wizard, skip buttons, Link Vials later, placement in dropdown + empty state.
- **Remaining:** Stockpile→protocol suggestion, visible Protocol/Vial IDs (if desired), optional one-time welcome/Quick Start prompt, and “better empty states” as Quick Start–style shortcuts in Stockpile, Orders, Vendors, Goals, Recon, and dashboard.
- **Quick Start concept:** Minimal required fields, instant “I did something,” add details later. Reusing that pattern in 1–2 other high-impact empty states (e.g. Stockpile, dashboard hint) will help new users the most.
