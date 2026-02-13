# Backup URL Strategy - The Pep Planner

## Why This Matters

When your custom domain (thepepplanner.app) has issues (SSL minting, DNS, transfer), the app can appear down even though the site is still live on Firebase.

**Backup URL that always works:** https://tpp-splendide.web.app

---

## Recommended Strategy (No Redirect)

Do NOT set up a redirect from thepepplanner.app to tpp-splendide.web.app when things break. When the custom domain is broken, the request often never reaches your server (DNS/SSL fails first), so a redirect cannot run. The goal is to make the backup URL known, not to redirect.

---

## Where to Publish the Backup URL

1. **App Store and Google Play** - In the app description or support URL, add: "Web app also at: https://tpp-splendide.web.app"

2. **Social / Bio** - Optional one-time post: "If thepepplanner.app does not load, use: https://tpp-splendide.web.app"

3. **Support / Help** - In your FAQ or contact page (once site is back): "If you cannot access thepepplanner.app, try: https://tpp-splendide.web.app"

4. **Inside the App** - In Settings or Help, add a line: "Web version: https://tpp-splendide.web.app" so logged-in users can use it if the custom domain is down.

5. **Google Search Console** - Add a property for https://tpp-splendide.web.app so you can request indexing for the backup URL too.

---

## When Custom Domain Is Down

1. Use the backup URL yourself: https://tpp-splendide.web.app (login and app work the same)
2. Tell users: post or email "If thepepplanner.app is not loading, use https://tpp-splendide.web.app"
3. Fix the custom domain (DNS/SSL) in Squarespace/Porkbun and Firebase; wait for propagation.

---

## Summary

- Do: Use thepepplanner.app as main URL and publish tpp-splendide.web.app as backup in app stores, support, and social.
- Do not: Redirect thepepplanner.app to the Firebase URL when down (redirect often will not work when the domain is broken).

**Backup URL:** https://tpp-splendide.web.app

---

## Minting Certificate (SSL) and Site Not Found

When Firebase shows "Minting certificate" for thepepplanner.app, the custom domain is not fully active yet. During this time you may see "Site Not Found" or "Connection not private" on thepepplanner.app. The backup URL (tpp-splendide.web.app) works immediately. SSL usually finishes within 24-48 hours; use the backup URL until then.
