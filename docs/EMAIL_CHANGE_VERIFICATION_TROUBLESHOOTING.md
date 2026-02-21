# Email change verification – troubleshooting

## How email change works

1. **User** goes to Account → Profile, enters a new email and confirms with password.
2. **App** calls Firebase `verifyBeforeUpdateEmail(newEmail)`, which sends **Firebase’s native verification email** to the **new** address. The account email is **not** updated until the user clicks that link.
3. **App** then calls two Cloud Functions (best-effort, non-blocking):
   - **Old email**: security notification (“your email was changed to …”).
   - **New email**: instructional email (“check your inbox for the verification link from Firebase”).
4. **User** clicks the link in the **Firebase** email → Firebase updates the account email.

So the **only** email that contains the real verification link is the one sent by **Firebase** (from your Auth project). The “instructional” email from Resend does **not** contain the link; it only tells the user to look for Firebase’s email.

## If the user doesn’t receive the verification email

- **Firebase’s email** can go to spam (e.g. Hotmail/Outlook, Yahoo). Ask the user to check spam/junk and to allow/whitelist senders from your Firebase project.
- **Deliverability**: Firebase sends from a default or custom domain; some providers block or filter it.
- **No “pending” state in our app**: We don’t store “pending new email” in Firestore. Firebase holds that state. So we can’t list “pending email changes” in admin; we can only infer from **Email History** that the user started the flow (if our Resend emails were sent).

## Manual check for a specific user (e.g. k_williams_02@hotmail.com)

1. **Admin → Comms → Email History**
2. **Search** for:
   - Their **current** account email (e.g. `k_williams_02@hotmail.com`), and/or  
   - The **new** email they’re trying to change to.
3. **Look for:**
   - **Email Change (Security Alert)** to the **old** email → our notification was sent; the user did start the email change.
   - **Email Change (Verify New Email)** to the **new** email → our instructional email was sent.
4. If those appear but the user never got the **verification link**, the missing piece is **Firebase’s** email (spam/deliverability). Use the **Resend email change verification** option below to send the link via Resend instead.

## Resend the verification link (admin recovery)

When the user didn’t receive Firebase’s email, you can send the **same** verification link via Resend (from your domain), so it’s more likely to land in inbox.

1. **Admin → Comms → Email History**
2. In the **“Resend email change verification”** card:
   - **Current account email**: the user’s existing account email (e.g. `k_williams_02@hotmail.com`).
   - **New email (to verify)**: the new address they want to switch to (must be the same one they requested in the app).
3. Click **“Send verification email”**.

This calls the Cloud Function `resendEmailChangeVerificationLink`, which:

- Looks up the user by **current** email in Firebase Auth.
- Generates the official “verify and change email” link with the Admin SDK.
- Sends one email via Resend to the **new** address containing that link (type: `email_change_verification_resend` in Email History).

The user must click the link in **that** email (or in the original Firebase email if they find it) to complete the change. The link expires per Firebase’s rules (e.g. 24 hours).

## Security notes

- The **old** email is notified when an email change is **requested** (our Resend “Security Alert”).
- The account email is updated **only after** the user clicks the verification link (Firebase enforces this).
- Don’t skip verification for email changes; it protects account recovery and password resets.

## Testing the flow

1. Use a test account and change email to a **new** address (e.g. Gmail, Outlook, Yahoo).
2. Confirm:
   - Old email gets the security notification.
   - New email gets the instructional email (and, when using admin resend, the email with the link).
   - Firebase’s verification email arrives (or use admin resend if it doesn’t).
3. Click the verification link and confirm the account email updates in Account settings.
