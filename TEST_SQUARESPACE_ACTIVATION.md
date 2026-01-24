# 🧪 Testing Squarespace Activation Flow - Simple Instructions

## Step 1: Create Test Document in Firestore

**What you're doing**: Creating a fake "pending subscription" so we can test the activation link without making a real purchase.

### How to do it:

1. **Open Firebase Console**
   - Go to: https://console.firebase.google.com/
   - Click on your project: `tpp-splendide`
   - In the left menu, click **"Firestore Database"**

2. **Create the collection** (if you don't see it):
   - Look at the top of the page - you should see a button that says **"Add collection"** or **"Create collection"** or a **"+"** button
   - If you don't see it, look for a button that says **"Start collection"** or just click anywhere in the empty space
   - When prompted for "Collection ID", type: `pendingSubscriptions` (copy and paste this exactly)
   - Click **"Next"** or **"Create"**

3. **Add the document**:
   - For "Document ID", paste this: `eedc3c1340db7e822eb1eb4a7ab2c8ac1d8c322934cbd00e86e59d21b6084c52`
   - Click **"Add field"** button (you'll do this 10 times)

4. **Add these 10 fields** (one at a time, click "Add field" for each):
   
   Field 1:
   - Field name: `email`
   - Type: Select **"string"** from dropdown
   - Value: `test@example.com` (or use your own email)
   
   Field 2:
   - Field name: `plan`
   - Type: **"string"**
   - Value: `monthly`
   
   Field 3:
   - Field name: `activationToken`
   - Type: **"string"**
   - Value: `eedc3c1340db7e822eb1eb4a7ab2c8ac1d8c322934cbd00e86e59d21b6084c52` (same as Document ID)
   
   Field 4:
   - Field name: `orderId`
   - Type: **"string"**
   - Value: `test-order-123`
   
   Field 5:
   - Field name: `customerName`
   - Type: **"string"**
   - Value: `Test User`
   
   Field 6:
   - Field name: `source`
   - Type: **"string"**
   - Value: `squarespace`
   
   Field 7:
   - Field name: `status`
   - Type: **"string"**
   - Value: `pending`
   
   Field 8:
   - Field name: `createdAt`
   - Type: Select **"timestamp"** from dropdown
   - Value: Click the calendar icon and select "Now" or today's date/time
   
   Field 9:
   - Field name: `expiresAt`
   - Type: **"timestamp"**
   - Value: Click calendar, pick a date 30 days from now
   
   Field 10:
   - Field name: `activatedAt`
   - Type: **"null"** (or just leave it empty)
   - Value: (leave empty)

5. **Save**: Click **"Save"** button at the bottom

**Done!** The collection now exists and you can see it in your list.

## Step 2: Test the Activation Link

**What you're doing**: Testing if the activation page works by clicking a special link.

1. **Copy this link** (the whole thing):
   ```
   https://thepepplanner.com/activate?token=eedc3c1340db7e822eb1eb4a7ab2c8ac1d8c322934cbd00e86e59d21b6084c52
   ```

2. **Paste it in your browser** and press Enter
   - You should see a page that says "Activating your account..."
   - It should automatically log you in
   - You should be redirected to the dashboard

3. **Check if it worked**:
   - Go back to Firebase Console → Firestore Database
   - Look for the `users` collection - you should see a new user with your test email
   - Look for the `userSubscriptions` collection - you should see a subscription granted
   - Look at the `pendingSubscriptions` collection - the status should now say "activated"

**If it worked**: ✅ The activation flow is working!  
**If it didn't work**: The function might not be deployed yet - we'll need to deploy it first.

## What This Tests ✅

- ✅ Activation page loads correctly
- ✅ Activation function works (`activateSquarespaceSubscription`)
- ✅ Account creation (if new user)
- ✅ Subscription granting
- ✅ Auto-login flow
- ✅ Email templates (if email service is working)

## What This Doesn't Test ❌

- ❌ Polling function (API calls to Squarespace)
- ❌ Order processing from Squarespace
- ❌ Email delivery (activation emails)
- ❌ Real Squarespace purchase flow

