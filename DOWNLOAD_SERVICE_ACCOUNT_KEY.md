# How to Download Service Account JSON Key

## Step-by-Step Instructions

### Step 1: Go to Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Make sure you're signed in with the same Google account used for Google Play Console
3. Select your project from the dropdown at the top (or create a new project if needed)

### Step 2: Navigate to Service Accounts

1. In the left sidebar, click **IAM & Admin**
2. Click **Service Accounts**
3. You should see a list of service accounts (or it might be empty if you haven't created one yet)

### Step 3: Create Service Account (If You Haven't Already)

If you don't see any service accounts:

1. Click **Create Service Account** (blue button at the top)
2. **Service account name:** `google-play-billing-service` (or any name you prefer)
3. **Service account ID:** Will auto-fill (you can change it if needed)
4. **Description:** "Service account for Google Play Billing verification"
5. Click **Create and Continue**
6. **Grant roles:**
   - Type "Service Account User" in the search box
   - Select it from the dropdown
   - Click **Continue**
7. Click **Done** (you can skip the optional step)

### Step 4: Download the JSON Key

1. **Click on your service account** in the list (the one you just created or an existing one)
2. Go to the **Keys** tab (at the top of the service account details page)
3. Click **Add Key** → **Create new key**
4. **Key type:** Select **JSON** (this is important!)
5. Click **Create**
6. **The JSON file will automatically download** to your computer

### Step 5: Find the Downloaded File

The file will be named something like:
- `your-project-name-xxxxx-xxxxx.json`
- Or `google-play-billing-service-xxxxx.json`

**Common download locations:**
- **Windows:** `C:\Users\YourUsername\Downloads\`
- **Mac:** `~/Downloads/`
- **Check your browser's download folder**

### Step 6: Open and Copy the JSON Key

1. **Open the JSON file** in a text editor (Notepad, VS Code, etc.)
2. **Select ALL the contents** (Ctrl+A or Cmd+A)
3. **Copy it** (Ctrl+C or Cmd+C)

The file will look something like this:
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "xxxxx",
  "private_key": "-----BEGIN PRIVATE KEY-----\nxxxxx\n-----END PRIVATE KEY-----\n",
  "client_email": "your-service-account@your-project.iam.gserviceaccount.com",
  "client_id": "xxxxx",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

### Step 7: Save to Firebase Functions Secrets

1. Open your terminal/command prompt
2. Make sure you're in your project root directory (not the functions folder)
3. Run:
   ```bash
   firebase functions:secrets:set GOOGLE_PLAY_SERVICE_ACCOUNT_KEY
   ```
4. **Paste the entire JSON contents** when prompted (Ctrl+V or Cmd+V)
5. Press **Enter** to save

---

## Visual Guide

### In Google Cloud Console:

```
IAM & Admin
  └── Service Accounts
      └── [Your Service Account Name]
          └── Keys tab
              └── Add Key
                  └── Create new key
                      └── Select JSON
                          └── Create (downloads automatically)
```

---

## Troubleshooting

### Can't find Service Accounts?
- Make sure you're in the correct Google Cloud project
- Check that you have the right permissions
- Try refreshing the page

### File didn't download?
- Check your browser's download settings
- Check if pop-ups are blocked
- Look in your browser's download history

### Can't see the Keys tab?
- Make sure you clicked on the service account name (not just the checkbox)
- The Keys tab should be visible at the top of the service account details page

### JSON file looks wrong?
- Make sure you selected **JSON** format (not P12)
- The file should start with `{` and contain "type": "service_account"

---

## Security Notes

⚠️ **Important:**
- **Never commit this JSON file to version control** (Git)
- **Never share it publicly**
- **Keep it secure** - it has access to your Google Play account
- **If compromised, delete it and create a new one**

---

## Quick Checklist

- [ ] Created service account in Google Cloud Console
- [ ] Clicked on the service account
- [ ] Went to Keys tab
- [ ] Clicked Add Key → Create new key
- [ ] Selected JSON format
- [ ] Clicked Create (file downloaded)
- [ ] Opened JSON file
- [ ] Copied entire contents
- [ ] Ready to paste into Firebase Functions secrets

---

**Once you have the JSON file downloaded and opened, let me know and we'll configure it in Firebase Functions!**








