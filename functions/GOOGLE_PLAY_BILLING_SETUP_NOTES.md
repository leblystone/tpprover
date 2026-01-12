# Google Play Billing - Additional Setup Notes

## Required Dependencies

Before deploying, make sure to install the googleapis package:

```bash
cd functions
npm install googleapis
```

## Environment Variables

Set the Google Play service account key in Firebase Functions:

### Option 1: Using Firebase Secrets (Recommended)

```bash
firebase functions:secrets:set GOOGLE_PLAY_SERVICE_ACCOUNT_KEY
# Paste the entire JSON key file contents when prompted
```

### Option 2: Using .env file (for local development)

Create a `.env` file in the `functions` directory:
```
GOOGLE_PLAY_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}'
```

Note: The entire JSON should be on a single line as a string.

## Service Account Setup

1. Go to Google Cloud Console → IAM & Admin → Service Accounts
2. Create or select a service account
3. Download the JSON key file
4. In Google Play Console → Settings → API access → Link the service account
5. Grant permissions:
   - View financial data
   - View app information and download bulk reports

## Testing

1. Add test accounts in Google Play Console → Settings → License Testing
2. Use test products (auto-cancel after 5 minutes for subscriptions)
3. Test on a physical device (emulators may have limitations)

## Important Notes

- The service account must be linked to your Google Play Console account
- The app must be published to at least the internal testing track
- Product IDs must exactly match what's configured in Google Play Console
- All purchases are verified on the backend for security







