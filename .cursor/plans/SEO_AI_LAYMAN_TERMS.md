# SEO & AI suggestions for The Pep Planner — in plain English

**What we're doing:** Making it easier for Google and for AI assistants (like ChatGPT, Perplexity) to find your app and recommend it when people search for things like "peptide planner app" or "best peptide tracker."

---

## 1. Give each page its own title and description

**In plain English:** Right now, every page on your site (About, Features, Blog, FAQ, etc.) shows the same title and description as the homepage. So when Google or an AI looks at your "About" page, it still sees "The Pep Planner - Peptide Research Protocol Management" — like every other page.

**What we'll do:** When someone is on /about, the browser tab and the description Google/AI see will say something like "About – The Pep Planner" and a short line about what the About page is. Same idea for Features, FAQ, Blog, etc. Each page gets its own short, clear label.

**Why it matters:** Search engines and AIs use those labels to understand what each page is. Different labels per page = better understanding = better chance to show up when people search or ask for peptide apps.

---

## 2. Use the words people actually search for

**In plain English:** Your site already says things like "peptide research protocol management." That's accurate, but a lot of people (and the phrases AIs are trained on) search for things like "peptide planner app," "peptide tracker," "GLP-1 tracker," "semaglutide tracker," "peptide dosing app."

**What we'll do:** Add those kinds of phrases in a natural way in:
- The short description Google shows (meta description)
- The list of keywords
- The structured data that AIs read (JSON-LD)

We’ll also update the app’s short description in the manifest so it’s clearly about peptides, not just “research management.”

**Why it matters:** If your site uses the same words people type (or that AIs associate with peptide apps), Google and AI assistants are more likely to show or recommend The Pep Planner.

---

## 3. Add “structured data” for your FAQ page

**In plain English:** "Structured data" is a standard way of saying "this page is a list of questions and answers." Google can show those Q&As directly in search results. AI assistants can read them and use them to summarize your app.

**What we'll do:** Mark your FAQ page as a proper Q&A page using the format Google and AIs understand (FAQPage schema). We’ll use the same questions and answers you already show on the FAQ page.

**Why it matters:** Your FAQ can show up as rich snippets in Google, and AIs get a clear, factual summary of your app to use when someone asks "what’s a good peptide app" or "how does The Pep Planner work."

---

## 4. Don’t block AI crawlers

**In plain English:** Some sites add rules that tell AI bots (e.g. ChatGPT’s crawler) not to read their pages. Your site doesn’t block them — which is what we want.

**What we'll do:** Keep it that way. If you ever add special rules for bots, we’ll make sure your public pages (home, about, features, FAQ, etc.) stay allowed so AIs can still index and recommend your app.

**Why it matters:** If AI crawlers can’t read your site, they can’t recommend The Pep Planner when people ask for peptide apps.

---

## 5. Small cleanup: sitemap and robots.txt

**In plain English:**
- **Sitemap:** You already have a list of your main pages (sitemap). We might just refresh the “last updated” date when you deploy so crawlers know the site is current.
- **robots.txt:** You have a line that says "wait 1 second between requests" (Crawl-delay). Google ignores it, and Bing doesn’t use it anymore. We’ll remove it so it doesn’t slow other crawlers for no reason.

**Why it matters:** Cleaner, simpler rules = fewer surprises and no unnecessary delays for crawlers.

---

## 6. Optional: a proper “share image”

**In plain English:** When someone shares your link (or when an AI shows your app), the preview often uses an image. Right now that’s your logo. If we add a proper “card” image (e.g. 1200×630) with your app name and a short tagline, previews will look better everywhere (chat, social, AI answers).

**What we'll do (optional):** Create or add one image at that size and set it as the default share image in your HTML.

**Why it matters:** Better-looking previews make your app look more professional when it’s recommended or shared.

---

## One-sentence summary

We’ll give each important page its own title and description, use the words people and AIs actually search for, mark your FAQ so Google and AIs can use it, keep AI crawlers allowed, do a small robots/sitemap cleanup, and optionally add a nicer share image — so Google and AI assistants can find and recommend The Pep Planner when people look for peptide apps.
