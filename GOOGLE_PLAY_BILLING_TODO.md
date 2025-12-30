# Google Play Billing - Setup Todo List

## ✅ Code Implementation (COMPLETED)
- [x] Created Google Play Billing configuration
- [x] Implemented native Android plugin
- [x] Created service layer
- [x] Created backend verification function
- [x] Updated Android build.gradle with billing library

## 📋 Setup Steps (YOUR ACTION ITEMS)

### Step 1: Upload APK to Google Play Console
**Status:** ⚠️ REQUIRED FIRST - This is why you're getting the error

- [ ] Build a release APK or AAB (Android App Bundle)
  ```bash
  npm run mobile:build
  cd android
  ./gradlew bundleRelease
  ```
  - APK location: `android/app/build/outputs/bundle/release/app-release.aab`
  - Or APK: `android/app/build/outputs/apk/release/app-release.apk`

- [ ] Go to Google Play Console → Your App → **Test and release** → **Internal testing**
- [ ] Click **Create new release**
- [ ] Upload the AAB/APK file
- [ ] Fill in release notes (can be minimal like "Initial release for subscription setup")
- [ ] Click **Save** (you don't need to publish to production, just save it)
- [ ] **Wait for Google Play to process** (usually 5-15 minutes)

**Why this is needed:** Google Play requires at least one APK/AAB upload before you can create in-app products or subscriptions. This is a platform requirement.

---

### Step 2: Create Subscription Products in Google Play Console
**Status:** ⏳ Waiting for Step 1

Once your APK is uploaded and processed:

- [ ] Go to **Monetize with Play** → **Products** → **Subscriptions**
- [ ] Click **Create subscription**

#### Monthly Subscription:
- [ ] Product ID: `com.thepepplanner.app.monthly` (MUST match exactly)
- [ ] Name: "Monthly Research Access" (or your preferred name)
- [ ] Description: "Monthly subscription to The Pep Planner"
- [ ] Billing period: 1 month
- [ ] Price: Set to $3.99 (or your pricing)
- [ ] Free trial: Optional (e.g., 7 days)
- [ ] Click **Save**

#### Annual Subscription:
- [ ] Product ID: `com.thepepplanner.app.annual` (MUST match exactly)
- [ ] Name: "Annual Research Access" (or your preferred name)
- [ ] Description: "Annual subscription to The Pep Planner"
- [ ] Billing period: 1 year
- [ ] Price: Set to $36.99 (or your pricing)
- [ ] Free trial: Optional
- [ ] Click **Save**

---

### Step 3: Create One-Time Purchase (Lifetime)
**Status:** ⏳ Waiting for Step 1

- [ ] Go to **Monetize with Play** → **Products** → **One-time products**
- [ ] Click **Create product**

#### Lifetime Purchase:
- [ ] Product ID: `com.thepepplanner.app.lifetime` (MUST match exactly)
- [ ] Name: "Lifetime Research Access" (or your preferred name)
- [ ] Description: "One-time payment for lifetime access to The Pep Planner"
- [ ] Price: Set to $99.99 (or your pricing)
- [ ] Click **Save**

---

### Step 4: Set Up Service Account for Backend Verification
**Status:** ⏳ Can be done in parallel with Steps 1-3

#### 4a. Create Service Account in Google Cloud Console:
- [ ] Go to [Google Cloud Console](https://console.cloud.google.com/)
- [ ] Select your project (or create one if needed)
- [ ] Navigate to **IAM & Admin** → **Service Accounts**
- [ ] Click **Create Service Account**
- [ ] Name: `google-play-billing-service` (or any name)
- [ ] Description: "Service account for Google Play Billing verification"
- [ ] Click **Create and Continue**
- [ ] Grant roles:
  - [ ] **Service Account User**
  - [ ] **Viewer** (optional, for viewing project)
- [ ] Click **Continue** → **Done**

#### 4b. Link Service Account to Google Play Console:
- [ ] Go to **Google Play Console** → **Settings** → **API access**
- [ ] Find your service account in the list
- [ ] Click **Grant access** (or **Link** if not linked)
- [ ] Grant permissions:
  - [x] **View financial data, orders, and cancellation survey responses**
  - [x] **View app information and download bulk reports**
- [ ] Click **Invite user** or **Save**

#### 4c. Download Service Account Key:
- [ ] Go back to **Google Cloud Console** → **Service Accounts**
- [ ] Click on your service account
- [ ] Go to **Keys** tab
- [ ] Click **Add Key** → **Create new key**
- [ ] Select **JSON** format
- [ ] Click **Create** (JSON file will download)
- [ ] **SAVE THIS FILE SECURELY** - You'll need it for Firebase Functions

#### 4d. Configure Firebase Functions:
- [ ] Open the downloaded JSON key file
- [ ] Copy the entire contents
- [ ] Run in terminal:
  ```bash
  firebase functions:secrets:set GOOGLE_PLAY_SERVICE_ACCOUNT_KEY
  ```
- [ ] Paste the entire JSON contents when prompted
- [ ] Press Enter to save

---

### Step 5: Install Firebase Functions Dependencies
**Status:** ⏳ Can be done now

- [ ] Navigate to functions directory:
  ```bash
  cd functions
  ```
- [ ] Install googleapis package:
  ```bash
  npm install googleapis
  ```
- [ ] Verify installation:
  ```bash
  npm list googleapis
  ```

---

### Step 6: Deploy Firebase Functions
**Status:** ⏳ After Steps 4 and 5

- [ ] Make sure you're in the project root directory
- [ ] Deploy the verifyGooglePlayPurchase function:
  ```bash
  firebase deploy --only functions:verifyGooglePlayPurchase
  ```
- [ ] Wait for deployment to complete
- [ ] Verify in Firebase Console that the function is deployed

---

### Step 7: Configure Test Accounts
**Status:** ⏳ Before testing

- [ ] Go to **Google Play Console** → **Settings** → **License testing**
- [ ] Add test account email addresses (Gmail accounts that will test purchases)
- [ ] Click **Save**
- [ ] **Important:** Test accounts won't be charged real money

---

### Step 8: Build and Test Android App
**Status:** ⏳ After all previous steps

#### 8a. Build the App:
- [ ] Build the app:
  ```bash
  npm run mobile:build
  ```
- [ ] Sync Capacitor:
  ```bash
  npx cap sync android
  ```

#### 8b. Test on Device:
- [ ] Connect Android device via USB
- [ ] Enable USB debugging on device
- [ ] Install app:
  ```bash
  npx cap run android
  ```
  Or build APK and install manually

#### 8c. Test Purchase Flow:
- [ ] Sign in with a test account (from Step 7)
- [ ] Navigate to subscription page in app
- [ ] Select a subscription plan
- [ ] Complete Google Play purchase flow
- [ ] Verify purchase completes successfully
- [ ] Check Firebase Console → Firestore:
  - [ ] Verify `userSubscriptions` collection has new document
  - [ ] Verify `users` collection has updated subscription data
- [ ] Test all three products: Monthly, Annual, Lifetime

---

### Step 9: Monitor and Verify
**Status:** ⏳ After testing

- [ ] Check Firebase Functions logs for any errors:
  ```bash
  firebase functions:log
  ```
- [ ] Verify purchases appear in Google Play Console:
  - [ ] Go to **Monetize with Play** → **Financial reports**
  - [ ] Check for test purchases
- [ ] Test subscription renewal (for monthly/annual):
  - [ ] Wait for test subscription period to renew
  - [ ] Verify renewal is processed correctly

---

### Step 10: Production Release
**Status:** ⏳ After thorough testing

- [ ] Remove test accounts from license testing (or keep for future testing)
- [ ] Create production release in Google Play Console
- [ ] Upload production AAB
- [ ] Submit for review
- [ ] Monitor for any issues after release

---

## 🔴 Common Issues & Solutions

### Issue: "Upload a new APK" error when creating subscriptions
**Solution:** You must upload at least one APK/AAB to Google Play Console first. See Step 1.

### Issue: Service account not linked
**Solution:** Make sure you've linked the service account in Google Play Console → Settings → API access

### Issue: Purchase verification fails
**Solution:** 
- Check that service account key is properly set in Firebase Functions secrets
- Verify service account has correct permissions in Google Play Console
- Check Firebase Functions logs for detailed error messages

### Issue: Product ID mismatch
**Solution:** Product IDs in Google Play Console MUST exactly match:
- `com.thepepplanner.app.monthly`
- `com.thepepplanner.app.annual`
- `com.thepepplanner.app.lifetime`

### Issue: Plugin not found error
**Solution:** 
- Make sure you've run `npx cap sync android` after code changes
- Rebuild the app: `npm run mobile:build`

---

## 📝 Notes

- **Product IDs are case-sensitive** - Make sure they match exactly
- **Test purchases** don't charge real money when using test accounts
- **Subscriptions** in test mode auto-cancel after 5 minutes
- **Service account key** should never be committed to version control
- **Always verify purchases on the backend** - Never trust client-side only

---

## ✅ Completion Checklist

Once all steps are complete, you should have:
- [ ] Subscriptions created in Google Play Console
- [ ] One-time product (lifetime) created
- [ ] Service account configured and linked
- [ ] Firebase Functions deployed with googleapis
- [ ] Test purchases working successfully
- [ ] Subscriptions syncing to Firestore correctly
- [ ] No errors in Firebase Functions logs

---

**Current Status:** Waiting for APK upload (Step 1) to proceed with subscription creation.



