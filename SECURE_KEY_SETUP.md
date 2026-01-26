# 🔐 Secure API Key Setup Guide

**IMPORTANT**: Never hardcode API keys in your codebase! Always use Firebase Secrets Manager.

---

## ✅ Proper Setup Process

### Step 1: Set Firebase Secrets

Open PowerShell in the `functions/` directory and run:

```powershell
cd functions

# Set Gemini API key
firebase functions:secrets:set GEMINI_API_KEY
# When prompted, paste your NEW Gemini key (starts with AIzaSy...)

# Set Anthropic API key
firebase functions:secrets:set ANTHROPIC_API_KEY
# When prompted, paste your NEW Anthropic key (starts with sk-ant-api03-)

# Set Telegram bot token
firebase functions:secrets:set TELEGRAM_BOT_TOKEN
# When prompted, paste your NEW Telegram token (format: 1234567890:ABC...)

# Set Stripe secret key
firebase functions:secrets:set STRIPE_SECRET_KEY
# When prompted, paste your NEW Stripe key (starts with sk_live_...)
```

---

### Step 2: Verify Secrets Are Set

```powershell
# Check each secret is properly stored
firebase functions:secrets:access GEMINI_API_KEY
firebase functions:secrets:access ANTHROPIC_API_KEY
firebase functions:secrets:access TELEGRAM_BOT_TOKEN
firebase functions:secrets:access STRIPE_SECRET_KEY
```

You should see the actual key values displayed (this confirms they're stored).

---

### Step 3: Redeploy Functions

```powershell
# Deploy all functions with the new secrets
firebase deploy --only functions
```

Wait for deployment to complete (~5 minutes).

---

### Step 4: Test Everything Works

1. **Test Ghost Worker**: Go to Admin Panel → Ghost Worker → Test with a ticket ID
2. **Test Telegram**: Check that bot messages come through
3. **Test Stripe**: Verify payment processing works (use test mode first!)

---

## 🔒 Security Best Practices

### ✅ DO:
- Use Firebase Secrets Manager for ALL API keys
- Use environment variables (.env files) for local development
- Add `.env*` to `.gitignore`
- Use placeholders in documentation (e.g., `YOUR_API_KEY_HERE`)
- Review commits before pushing (`git diff --cached`)

### ❌ DON'T:
- Hardcode API keys in source code
- Put keys in documentation files
- Share keys in chat/email/Slack
- Commit `.env` files to git
- Use production keys in test code

---

## 📁 Where Keys Should Be

### Production (Firebase):
```
Firebase Console → Functions → Secrets
- GEMINI_API_KEY
- ANTHROPIC_API_KEY
- TELEGRAM_BOT_TOKEN
- STRIPE_SECRET_KEY
```

### Local Development:
```
functions/.env (NOT committed to git)
GEMINI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
TELEGRAM_BOT_TOKEN=your_token_here
STRIPE_SECRET_KEY=your_key_here
```

---

## 🔧 How Functions Access Secrets

Your Cloud Functions automatically access secrets via environment variables:

```javascript
// In your Cloud Function code
const geminiKey = process.env.GEMINI_API_KEY;
const claudeKey = process.env.ANTHROPIC_API_KEY;
const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
const stripeKey = process.env.STRIPE_SECRET_KEY;
```

You NEVER need to hardcode these values!

---

## 🚨 If You Ever Need to Rotate Keys

```powershell
# Update a secret
firebase functions:secrets:set GEMINI_API_KEY
# Enter new key when prompted

# Redeploy to use the new key
firebase deploy --only functions
```

---

## ✅ Verification Checklist

- [ ] Set GEMINI_API_KEY in Firebase Secrets
- [ ] Set ANTHROPIC_API_KEY in Firebase Secrets
- [ ] Set TELEGRAM_BOT_TOKEN in Firebase Secrets
- [ ] Set STRIPE_SECRET_KEY in Firebase Secrets
- [ ] Verified all secrets are accessible
- [ ] Redeployed Cloud Functions
- [ ] Tested Ghost Worker
- [ ] Tested Telegram notifications
- [ ] Tested payment processing
- [ ] Confirmed no keys in source code
- [ ] Confirmed .gitignore includes .env*

---

**Remember: NEVER share API keys via chat, email, or commit them to git!**
