# Next Steps After Products Are Set Up

## ✅ Completed
- [x] Monthly subscription created
- [x] Annual subscription created
- [x] Lifetime one-time purchase created
- [x] All products active

## 📋 Next Steps (In Order)

### Step 1: Set Up Service Account (Required for Backend Verification)

**Why:** Your app needs to verify purchases on the backend for security. This requires a Google Cloud service account.

#### 1a. Create Service Account in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create one if needed)
3. Navigate to **IAM & Admin** → **Service Accounts**
4. Click **Create Service Account**
5. **Name:** `google-play-billing-service` (or any name)
6. **Description:** "Service account for Google Play Billing verification"
7. Click **Create and Continue**
8. **Grant roles:**
   - **Service Account User**
   - **Viewer** (optional)
9. Click **Continue** → **Done**

#### 1b. Link Service Account to Google Play Console

1. Go to **Google Play Console** → **Settings** → **API access**
2. Find your service account in the list (or click **Link service account**)
3. Click **Grant access** (or **Link** if not linked)
4. **Grant permissions:**
   - ✅ **View financial data, orders, and cancellation survey responses**
   - ✅ **View app information and download bulk reports**
5. Click **Invite user** or **Save**

#### 1c. Download Service Account Key

1. Go back to **Google Cloud Console** → **Service Accounts**
2. Click on your service account
3. Go to **Keys** tab
4. Click **Add Key** → **Create new key**
5. Select **JSON** format
6. Click **Create** (JSON file will download)
7. **SAVE THIS FILE SECURELY** - You'll need it for Firebase Functions

#### 1d. Configure in Firebase Functions

1. Open the downloaded JSON key file
2. Copy the **entire contents** (all of it, including braces)
3. Run in terminal:
   ```bash
   firebase functions:secrets:set GOOGLE_PLAY_SERVICE_ACCOUNT_KEY
   ```
4. **Paste the entire JSON contents** when prompted
5. Press Enter to save

---

### Step 2: Install Firebase Functions Dependencies

1. Navigate to functions directory:
   ```bash
   cd functions
   ```

2. Install googleapis package:
   ```bash
   npm install googleapis
   ```

3. Verify installation:
   ```bash
   npm list googleapis
   ```

---

### Step 3: Deploy Firebase Function

1. Make sure you're in the project root directory (not functions folder)
2. Deploy the verifyGooglePlayPurchase function:
   ```bash
   firebase deploy --only functions:verifyGooglePlayPurchase
   ```

3. Wait for deployment to complete
4. Verify in Firebase Console that the function is deployed

---

### Step 4: Set Up Test Accounts

1. Go to **Google Play Console** → **Settings** → **License testing**
2. Add test account email addresses (Gmail accounts that will test purchases)
3. Click **Save**

**Important:** Test accounts won't be charged real money!

---

### Step 5: Test the Purchase Flow

1. Build the app (if not already done):
   ```bash
   npm run mobile:build
   ```

2. Install on a test device:
   - Connect Android device via USB
   - Enable USB debugging
   - Run: `npx cap run android`
   - Or build APK and install manually

3. Test purchase flow:
   - Sign in with a test account (from Step 4)
   - Navigate to subscription page in app
   - Select a subscription plan
   - Complete Google Play purchase flow
   - Verify purchase completes successfully

4. Verify in Firebase:
   - Check Firebase Console → Firestore
   - Verify `userSubscriptions` collection has new document
   - Verify `users` collection has updated subscription data

5. Test all three products:
   - Monthly subscription
   - Annual subscription
   - Lifetime purchase

---

## 🎯 Priority Order

**Do these first (required for purchases to work):**
1. ✅ Service account setup (Steps 1a-1d)
2. ✅ Install googleapis (Step 2)
3. ✅ Deploy Firebase function (Step 3)

**Then do these (for testing):**
4. ✅ Set up test accounts (Step 4)
5. ✅ Test purchase flow (Step 5)

---

## ⚠️ Important Notes

- **Service account is required** - Purchases won't verify without it
- **Test accounts are free** - No real charges during testing
- **Subscriptions in test mode** auto-cancel after 5 minutes
- **Always verify purchases on backend** - Never trust client-side only

---

## 🚀 Quick Start Commands

Once service account is set up:

```bash
# Install dependencies
cd functions
npm install googleapis
cd ..

# Deploy function
firebase deploy --only functions:verifyGooglePlayPurchase
```

---

## 📝 What Each Step Does

1. **Service Account** - Allows your backend to verify purchases with Google Play
2. **googleapis Package** - Provides the library to communicate with Google Play API
3. **Firebase Function** - Backend endpoint that verifies purchases and syncs to Firestore
4. **Test Accounts** - Lets you test without real charges
5. **Testing** - Verifies everything works end-to-end

---

**Ready to start? Begin with Step 1 (Service Account Setup)!**







