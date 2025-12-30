# Google Play Subscription Product Values

## ⚠️ CRITICAL: Product IDs Must Match Exactly

The product IDs below MUST match exactly what's in your code. They are case-sensitive!

---

## 📅 Monthly Subscription

### Basic Information:
- **Product ID:** `com.thepepplanner.app.monthly`
  - ⚠️ Must be EXACTLY this - no spaces, no typos
- **Name:** `Monthly Research Access` (or any name you prefer)
- **Description:** 
  ```
  Monthly subscription to The Pep Planner - Your complete peptide research management platform. Access all features including protocols, recon tracking, stockpile management, and more.
  ```

### Pricing & Billing:
- **Billing period:** 1 month
- **Price:** Set to $3.99 (or your pricing)
- **Currency:** USD (or your currency)
- **Free trial:** Optional (e.g., 7 days if you want)
- **Grace period:** Optional (default is fine)

### Additional Settings:
- **Subscription status:** Active
- **Base plan:** Default base plan (auto-created)

---

## 📅 Annual Subscription

### Basic Information:
- **Product ID:** `com.thepepplanner.app.annual`
  - ⚠️ Must be EXACTLY this - no spaces, no typos
- **Name:** `Annual Research Access` (or any name you prefer)
- **Description:**
  ```
  Annual subscription to The Pep Planner - Your complete peptide research management platform. Best value with full access to all features for a full year.
  ```

### Pricing & Billing:
- **Billing period:** 1 year (12 months)
- **Price:** Set to $36.99 (or your pricing)
- **Currency:** USD (or your currency)
- **Free trial:** Optional
- **Grace period:** Optional (default is fine)

### Additional Settings:
- **Subscription status:** Active
- **Base plan:** Default base plan (auto-created)

---

## 💎 Lifetime One-Time Purchase

### Basic Information:
- **Product ID:** `com.thepepplanner.app.lifetime`
  - ⚠️ Must be EXACTLY this - no spaces, no typos
- **Name:** `Lifetime Research Access` (or any name you prefer)
- **Description:**
  ```
  One-time payment for lifetime access to The Pep Planner. Never pay again - get all features forever including all future updates and new features.
  ```

### Pricing:
- **Price:** Set to $99.99 (or your pricing)
- **Currency:** USD (or your currency)
- **Type:** One-time purchase (not a subscription)

### Additional Settings:
- **Status:** Active

---

## ✅ Quick Checklist

When creating each product, verify:
- [ ] Product ID matches EXACTLY (case-sensitive)
- [ ] No extra spaces or characters
- [ ] Status is set to "Active"
- [ ] Price matches your pricing strategy
- [ ] Description is clear and accurate

---

## 🔍 Where to Create Each Product

### Subscriptions (Monthly & Annual):
1. Go to **Monetize with Play** → **Products** → **Subscriptions**
2. Click **Create subscription**
3. Enter the values above

### One-Time Purchase (Lifetime):
1. Go to **Monetize with Play** → **Products** → **One-time products**
2. Click **Create product**
3. Enter the values above

---

## ⚠️ Common Mistakes to Avoid

1. **Wrong Product ID:**
   - ❌ `com.thepepplanner.app.Monthly` (wrong case)
   - ❌ `com.thepepplanner.app.monthly ` (extra space)
   - ❌ `com.thepepplanner.monthly` (missing `.app`)
   - ✅ `com.thepepplanner.app.monthly` (correct)

2. **Wrong Product Type:**
   - Monthly/Annual should be **Subscriptions**
   - Lifetime should be **One-time products** (NOT subscriptions)

3. **Forgetting to Activate:**
   - Make sure status is set to **Active** after creating

---

## 📝 Notes

- Product IDs are **permanent** - you can't change them after creation
- You can change prices later if needed
- Descriptions can be updated anytime
- Test subscriptions auto-cancel after 5 minutes (for testing)



