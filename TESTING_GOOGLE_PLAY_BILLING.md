# Testing Google Play Billing

## ✅ Completed Setup
- [x] All 3 products created in Google Play Console
- [x] Service account configured
- [x] Firebase Functions deployed
- [x] Backend verification ready

## 📋 Next Steps: Testing

### Step 1: Add Test Accounts

1. Go to **Google Play Console** → **Settings** → **License testing**
2. Click **Add email addresses**
3. Add your Gmail account(s) that will test purchases
4. Click **Save**

**Important:** 
- Test accounts won't be charged real money
- Subscriptions in test mode auto-cancel after 5 minutes
- You can test all purchase flows safely

### Step 2: Build and Install App on Test Device

1. **Build the app:**
   ```bash
   npm run mobile:build
   ```

2. **Connect Android device:**
   - Enable USB debugging on device
   - Connect via USB cable

3. **Install app:**
   ```bash
   npx cap run android
   ```
   Or build APK manually and install

### Step 3: Test Purchase Flow

1. **Sign in** with your test account (from Step 1)
2. **Navigate** to subscription page in app
3. **Select a plan** (Monthly, Annual, or Lifetime)
4. **Complete** Google Play purchase flow
5. **Verify** purchase completes successfully

### Step 4: Verify in Firebase

1. Go to **Firebase Console** → **Firestore**
2. Check **`userSubscriptions`** collection:
   - Should have new document with your user ID
   - Should show subscription details
   - Should have `paymentProvider: 'googleplay'`
3. Check **`users`** collection:
   - User document should have updated subscription data

### Step 5: Test All Products

Test each product:
- [ ] Monthly subscription
- [ ] Annual subscription
- [ ] Lifetime purchase

---

## 🎯 What to Look For

### Successful Purchase:
- ✅ Google Play purchase dialog appears
- ✅ Purchase completes without errors
- ✅ App shows success message
- ✅ Subscription appears in Firestore
- ✅ User has access to premium features

### If Something Fails:
- Check Firebase Functions logs:
  ```bash
  firebase functions:log
  ```
- Look for errors in the logs
- Verify service account has correct permissions
- Check that product IDs match exactly

---

## 🐛 Common Issues

### "Purchase verification failed"
- Check Firebase Functions logs
- Verify service account key is correct
- Check service account permissions in Google Play Console

### "Product not found"
- Verify product IDs match exactly
- Check products are set to "Active" in Google Play Console
- Make sure you're testing with the version that has billing library

### "Billing client not ready"
- Make sure app is running on Android device (not emulator)
- Check Google Play Services is installed and updated
- Verify billing library is in build.gradle

---

## ✅ Success Checklist

After testing, you should have:
- [ ] All 3 products tested successfully
- [ ] Purchases verified in Firebase
- [ ] Subscriptions syncing to Firestore correctly
- [ ] No errors in Firebase Functions logs
- [ ] Users getting premium access after purchase

---

**Ready to test? Start with Step 1 (Add Test Accounts)!**








