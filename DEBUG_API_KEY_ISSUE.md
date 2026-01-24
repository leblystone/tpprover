# 🔍 Debug API Key Issue

**Updated:** January 23, 2026 @ 2:10 PM  
**Status:** Added debug logging to diagnose secret version issue

---

## 🚨 CURRENT ISSUE

The API key keeps being rejected even though:
- ✅ Key is valid (tested manually and works)
- ✅ Secret is set in Firebase (version 2)
- ✅ Functions redeployed multiple times
- ❌ New instances STILL get "API key not valid" error

**This suggests a secret versioning/binding issue.**

---

## 🔍 WHAT I JUST DID

### Added Debug Logging
I added code to log the API key format (securely) so we can see WHICH key the function is actually receiving:

```javascript
// Shows first 10 and last 4 characters only
logger.info(`🔑 Using Gemini API key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
```

### Redeployed Function
```
✅ Version 1.0.2 deployed
✅ Debug logging active
✅ Ready to test
```

---

## 🧪 TEST NOW & CHECK LOGS

### Step 1: Test in Admin Panel
1. Go to Dashboard → Ghost Worker
2. Copy any ticket ID
3. Paste and click "🧪 Test"
4. Wait for error

### Step 2: Check Logs Immediately
Run this command:
```powershell
firebase functions:log
```

### Step 3: Look For This Line
```
🔑 Using Gemini API key: AIzaSyAZ46...Cjc
```

---

## 🎯 WHAT TO LOOK FOR

### If Log Shows OLD Key:
```
🔑 Using Gemini API key: AIzaSyC_dP...5YY
                         ^^^^^^^^^^^
                         OLD KEY!
```
**Problem:** Function bound to old secret version  
**Fix:** Need to force rebind to new version

### If Log Shows NEW Key:
```
🔑 Using Gemini API key: AIzaSyAZ46...Cjc
                         ^^^^^^^^^^^
                         NEW KEY!
```
**Problem:** The NEW key itself is invalid  
**Fix:** Need a different API key from Google

### If Log Shows NO Key:
```
❌ GEMINI_API_KEY is not set!
```
**Problem:** Secret not being injected  
**Fix:** Secret configuration issue

---

## 📋 COMPARISON

### Old Key (INVALID):
```
AIzaSyC_dPbftqSXN9ZVX-zX0VgjpQCRK9y35YY
^^^^^^^^^^ First 10 chars
                                      ^^^^ Last 4 chars
Full: AIzaSyC_dP...35YY
```

### New Key (SHOULD BE VALID):
```
AIzaSyAZ46TcMZuLh51bYfIs-s2UIqN3qJguCjc
^^^^^^^^^^ First 10 chars
                                      ^^^^ Last 4 chars
Full: AIzaSyAZ46...Cjc
```

---

## 🔧 NEXT STEPS BASED ON RESULTS

### Scenario A: Function Using Old Key
If logs show `AIzaSyC_dP...35YY`:

**Option 1: Delete old secret version**
```powershell
# Force use of latest version
firebase functions:secrets:destroy GEMINI_API_KEY@1
```

**Option 2: Set secret to "latest"**
Update function config to explicitly use latest version

**Option 3: Redeploy ALL functions**
```powershell
firebase deploy --only functions
```
Wait 10 minutes for quota reset, then deploy

---

### Scenario B: Function Using New Key (But Still Invalid)
If logs show `AIzaSyAZ46...Cjc`:

**The new key is bad!** Need to:
1. Go to https://aistudio.google.com/app/apikey
2. Create a BRAND NEW key
3. Test it manually first:
   ```javascript
   // Use test script we created earlier
   ```
4. Set as secret:
   ```powershell
   firebase functions:secrets:set GEMINI_API_KEY
   ```
5. Redeploy

---

### Scenario C: No Key Found
If logs show `GEMINI_API_KEY is not set!`:

**Secret binding failed!** Need to:
1. Verify secret exists:
   ```powershell
   firebase functions:secrets:access GEMINI_API_KEY
   ```
2. Check function configuration in `ghostWorker.js`:
   ```javascript
   secrets: ['GEMINI_API_KEY', 'ANTHROPIC_API_KEY']
   ```
3. Redeploy with explicit binding

---

## 🎯 IMMEDIATE ACTION

**Run this test sequence:**

1. **Test Ghost Worker** (Dashboard → Ghost Worker → Paste ID → Test)
2. **Immediately run:**
   ```powershell
   firebase functions:log
   ```
3. **Copy the output** and paste it here
4. **Look for the 🔑 line** showing the API key

**I need to see that log line to diagnose the exact issue!**

---

## 💡 WHY THIS IS WEIRD

Normally, when you:
1. Set a new secret version
2. Redeploy a function
3. New instances start

They should automatically use the LATEST secret version. But for some reason, new instances are still getting the OLD key, which suggests:

- Secret version pinning issue
- Cache issue in Google Secret Manager
- Function configuration not updated
- Deployment not fully completing

The debug log will tell us EXACTLY what's happening.

---

## 🚀 READY TO DEBUG

**Test now and share the logs!**

Look for this line:
```
🔑 Using Gemini API key: AIzaSy...????
```

That will tell us everything we need to know!

---

**Debug logging active - test and check logs!** 🔍
