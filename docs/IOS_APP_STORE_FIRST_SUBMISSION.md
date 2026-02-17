# 📱 iOS App Store: First-Time Submission Guide

**App:** The Pep Planner  
**Bundle ID:** `com.thepepplanner.app`  
**Version (example):** 1.0.25 (build 25)

This guide walks you from building in Xcode through first submission to Apple.

---

## Before you start

- [ ] **Apple Developer account** ($99/year) — [developer.apple.com](https://developer.apple.com)
- [ ] **Mac with Xcode** (latest from Mac App Store)
- [ ] **iOS screenshots** in `store-assets/screenshots/app-store/` (or ready to upload)
- [ ] **Store copy** in `store-assets/store-listing-copy.md` (App Store section)

---

## Part 1: Build the app in Xcode

### 1.1 Build web app and sync to iOS

In the project root (Terminal):

```bash
cd /Users/lemaldonado/Desktop/TPPSpendide
npm run mobile:build
```

This runs `npm run build` then `npx cap sync`, so the latest web app is inside `ios/App/`.

### 1.2 Open the project in Xcode

```bash
npm run mobile:open:ios
```

Or: open **`ios/App/App.xcworkspace`** in Xcode (use the `.xcworkspace`, not `.xcodeproj`).

### 1.3 Select the App target and a real device destination

- In the toolbar: click the scheme (e.g. **App**) and the device dropdown.
- Choose **Any iOS Device (arm64)** — or a connected iPhone.  
  You cannot Archive for the App Store when the destination is a simulator.

### 1.4 Signing & Capabilities

1. In the left sidebar, click the **App** project (blue icon), then select the **App** target.
2. Open the **Signing & Capabilities** tab.
3. Check **Automatically manage signing**.
4. **Team:** Select your Apple Developer team.  
   - If you see “Add an account…”, add your Apple ID and choose your team.
5. **Bundle Identifier** should be `com.thepepplanner.app`.  
   - It must match exactly what you’ll use in App Store Connect (see Part 2).
6. Fix any red errors (e.g. “Failed to register bundle identifier”).  
   - Often solved by selecting the correct Team or creating the App ID in the Apple Developer portal.

### 1.5 Create an Archive

1. Menu: **Product → Archive**.
2. Wait for the build. When it finishes, the **Organizer** window opens (Window → Organizer if it doesn’t).
3. In Organizer, select the new archive (e.g. **App**, version 1.0.25).

### 1.6 Distribute to App Store Connect

1. Click **Distribute App**.
2. Choose **App Store Connect** → **Next**.
3. **Upload** → **Next**.
4. Leave options as default (e.g. “Upload your app’s symbols”, “Manage Version and Build Number” if you want Xcode to manage it) → **Next**.
5. Select the correct **distribution certificate** and **provisioning profile** (or let Xcode fix them) → **Next**.
6. Review and click **Upload**.
7. Wait until you see “Upload Successful”.

You can close Xcode for the next part. The build will appear in App Store Connect in a few minutes (sometimes up to ~15).

---

## Part 2: App Store Connect (first-time app setup)

Go to [App Store Connect](https://appstoreconnect.apple.com) and sign in.

### 2.1 Create the app (only once)

1. **Apps** → **+** (or “Add App”).
2. Fill in:
   - **Platforms:** iOS (check).
   - **Name:** The Pep Planner
   - **Primary Language:** English (or your choice).
   - **Bundle ID:** Select **com.thepepplanner.app**.  
     - If it’s not in the list, create it first in [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list) → Identifiers → **+** → App IDs → App → Bundle ID: `com.thepepplanner.app`.
   - **SKU:** e.g. `the-pep-planner-ios` (internal, never shown to users).
   - **User Access:** Full Access (or as needed).
3. Click **Create**.

### 2.2 Prepare the version (e.g. 1.0.25)

1. In your app’s page, under **iOS App**, click the **+** next to “iOS App” or the version number to add a new version.
2. **Version:** Must match **Marketing Version** in Xcode (e.g. `1.0.25`).
3. Fill in **What’s New in This Version** (e.g. “Initial release of The Pep Planner.”).

### 2.3 Add the build

1. In the same version screen, find **Build**.
2. Click **+** (or “Select a build”).
3. After processing, your uploaded build (e.g. 1.0.25 (25)) appears. Select it and **Done**.  
   - If it’s missing, wait a few more minutes and refresh; check that the archive was uploaded successfully in Xcode Organizer.

### 2.4 Screenshots

1. In the version page, find **App Store Screenshots**.
2. For **iPhone 6.7" Display** (required for iPhone 14 Pro Max and similar):
   - Add at least one screenshot (up to 10).  
   - Size: 1290 × 2796 px (or 1284 × 2778 for notched).
3. You can add more sizes (e.g. 6.5") later; 6.7" is the one most people need first.

### 2.5 Promotional Text (optional)

- **Promotional Text:** Optional; can be updated anytime without a new version. You can leave blank for first submission.

### 2.6 Description, keywords, and metadata

Use the text from **`store-assets/store-listing-copy.md`** (App Store section):

- **Subtitle:** 30 characters max (e.g. “Research Protocol Management”).
- **Description:** Paste the full App Store description from the doc.
- **Keywords:** 100 characters max, comma-separated, no spaces (e.g. `peptide,research,protocol,calculator,reconstitution,tracking,inventory,management,laboratory,scheduling`).
- **Support URL:** Your support or contact page (required).
- **Marketing URL:** Optional.

### 2.7 App icon, category, and age rating

- **App Icon:** 1024×1024 (already in your assets). Upload if the field is empty.
- **Category:** e.g. **Medical**, **Productivity**, or **Education** (primary + optional secondary).
- **Age Rating:** Click **Edit** and answer the questionnaire. For a research/organization app it’s often **4+** or **12+** depending on content.

### 2.8 Pricing and availability

- **Price:** Free (or choose a price).
- **Availability:** Choose countries/regions (e.g. “Make this app available in all territories”).

### 2.9 App Privacy (required)

- **App Privacy:** If not done, click **Get Started** or **Edit**.
  - Indicate what data you collect (e.g. account, usage). For “research only” and optional cloud backup, you may have minimal or no data collection; say so.
  - Save. You may get a **Privacy Policy URL** requirement; use your site’s privacy page.

### 2.10 Version release and review information

- **Version Release:** Usually “Manually release this version” so you can release after approval.
- **Review information:**
  - **Contact:** First name, last name, phone, email (Apple may call).
  - **Demo account:** If the app requires login, provide a test account and password; add notes if needed.
  - **Notes:** Optional notes for the reviewer (e.g. “Research-only app; no medical advice.”).
- **Attachment:** Only if Apple asks for extra materials.

---

## Part 3: Submit for review

1. Confirm every required field has a checkmark (no warnings blocking submission).
2. Click **Add for Review** (or **Submit for Review**).
3. Answer any export compliance / content rights / advertising questions (typically “No” for encryption, etc., unless you use custom encryption).
4. Click **Submit to App Review**.

You’ll get an email when status changes (e.g. “In Review”, “Approved”, or “Rejected” with feedback).

---

## Quick checklist

- [ ] `npm run mobile:build` and open `ios/App/App.xcworkspace` in Xcode
- [ ] Signing & Capabilities: Team set, Bundle ID `com.thepepplanner.app`
- [ ] Product → Archive → Distribute App → App Store Connect → Upload
- [ ] App Store Connect: App created with same Bundle ID
- [ ] New version (e.g. 1.0.25) → Build selected → Screenshots added
- [ ] Description, subtitle, keywords, support URL, icon, category, age rating
- [ ] Pricing, availability, App Privacy, review contact (and demo account if needed)
- [ ] Submit for Review

---

## If something goes wrong

- **“No accounts with App Store Connect access”**  
  Sign in in Xcode: Xcode → Settings → Accounts → **+** → Apple ID. Then pick that team in Signing & Capabilities.

- **“Failed to register bundle identifier”**  
  Create the App ID in [developer.apple.com](https://developer.apple.com/account/resources/identifiers/list) with Bundle ID `com.thepepplanner.app`, then try again.

- **Build doesn’t appear in App Store Connect**  
  Wait 5–15 minutes. Check Organizer for “Upload Successful”. Ensure the version number in Connect matches the app’s Marketing Version.

- **Rejected for “Guideline X”**  
  Read the resolution center message and adjust app or metadata (e.g. privacy, permissions, description). Resubmit after fixing.

---

**Good luck with your first submission.**
