# Gemini Task: TPP Accounts Flow (New User + Frustration User)

Use this script to run account flows for **The Pep Planner** in a browser. Replace `BASE_URL` with the app URL (e.g. `https://thepepplanner.app` or `http://localhost:5173`).

---

## 1. New user flow (signup)

1. **Open signup page**
   - Navigate to: `BASE_URL/login?signup=true`
   - Confirm the page shows signup (e.g. "Create account" / signup form, not login).

2. **Validation (client-side)**
   - Leave email empty → Submit → Expect error like "Email is required" or validation message.
   - Enter invalid email (e.g. `notanemail`) → Expect "Please enter a valid email address" or similar.
   - Enter valid email (e.g. `newuser+test@example.com`).
   - Enter weak password (e.g. `123`) → Expect password requirements (e.g. min 6 chars, uppercase, lowercase, number).
   - Enter password that doesn’t match Confirm → Expect "Passwords do not match".
   - Fix: use a valid password meeting rules (e.g. 6+ chars, one uppercase, one lowercase, one number) and matching Confirm.

3. **Complete signup**
   - Accept Terms/Privacy if modals appear.
   - Submit signup.
   - Expect: redirect to `/app/dashboard` (or main app) and no persistent error toast.

4. **Post-signup**
   - Confirm you are logged in (e.g. dashboard visible, no redirect back to login).

---

## 2. Frustration user flow (login problems + forgot password)

1. **Wrong password**
   - Navigate to: `BASE_URL/login`
   - Enter an email that exists in the app (or use a known test account).
   - Enter a wrong password → Submit.
   - Expect error like "Incorrect password" and a "Forgot password?" link or button.

2. **Forgot password**
   - On the login page, click "Forgot password?" (or equivalent).
   - Enter email → Submit.
   - Expect: message that a reset email was sent (or that the request was received).
   - (Optional) If you have access to the inbox: open reset link; confirm it goes to `BASE_URL/reset-password?token=...` and the reset form loads. Do not complete reset unless in a test environment.

3. **Invalid / empty credentials**
   - On `BASE_URL/login`, submit with empty email → Expect validation/error.
   - Submit with valid email but empty password → Expect error (e.g. "Please enter your password" or "Password is required").
   - Enter invalid email format → Expect email validation error.

4. **Recovery path**
   - After seeing "Incorrect password", click "Forgot password?" and complete the request; confirm user is guided to reset, not left without an option.

---

## 3. Quick checklist (for Gemini to report)

- [ ] New user: `BASE_URL/login?signup=true` loads signup form.
- [ ] New user: Validation blocks invalid email, weak password, and mismatched passwords.
- [ ] New user: Valid signup + terms acceptance leads to app (e.g. `/app/dashboard`).
- [ ] Frustration: Wrong password shows clear error and "Forgot password?".
- [ ] Frustration: Forgot password flow sends/requests reset and (if applicable) reset page loads.
- [ ] Frustration: Empty or invalid credentials show validation/error messages.

---

## 4. One-liner URLs for Gemini

- **Signup:** `BASE_URL/login?signup=true`
- **Login:** `BASE_URL/login`
- **Reset password (with token):** `BASE_URL/reset-password?token=RESET_TOKEN`

Replace `BASE_URL` with the actual app URL before running.
