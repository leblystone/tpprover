# SEO & AI plan — exact changes (extreme detail)

This document lists every file change: what is being **removed**, **added**, or **changed**, with the exact wording so you can rephrase anything for a more human tone.

---

## 1. Per-page title and description (new code + route wiring)

### 1.1 NEW FILE: `src/utils/pageSEO.js`

**Action:** ADD (entire file is new)

**Exact content to add:**

```javascript
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Path -> { title, description } for public pages.
 * These are used as the browser tab title and the meta description for search/AI.
 * Edit the strings below to sound more human or on-brand.
 */
export const PAGE_SEO = {
  '/': {
    title: 'The Pep Planner - Peptide Research Protocol Tracking and Management',
    description: 'Peptide and GLP-1 tracking app: semaglutide, tirzepatide, and weight loss tracking. Track protocols, stockpile, dosing, and reconstitution. Free trial.'
  },
  '/about': {
    title: 'About - The Pep Planner',
    description: 'Learn about The Pep Planner: peptide and GLP1 tracking app for semaglutide, tirzepatide, weight loss tracking, protocols, stockpile, and orders.'
  },
  '/features': {
    title: 'Features - The Pep Planner',
    description: 'GLP tracking, semaglutide and tirzepatide tracking, weight loss tracking, reconstitution calculator, protocol and stockpile management. See what The Pep Planner can do.'
  },
  '/pricing': {
    title: 'Pricing - The Pep Planner',
    description: 'Pricing and plans for The Pep Planner. Free trial, monthly, annual, and lifetime options.'
  },
  '/blog': {
    title: 'Blog & Resources - The Pep Planner',
    description: 'Guides and tips for peptide research, GLP-1 tracking, semaglutide, tirzepatide, weight loss tracking, and protocol management.'
  },
  '/resources': {
    title: 'Resources - The Pep Planner',
    description: 'Guides and tips for peptide research, GLP-1 tracking, semaglutide, tirzepatide, weight loss tracking, and protocol management.'
  },
  '/faq': {
    title: 'FAQ - The Pep Planner',
    description: 'FAQ: GLP1 tracking, semaglutide and tirzepatide, weight loss tracking, protocols, stockpile, pricing, and support.'
  },
  '/privacy': {
    title: 'Privacy Policy - The Pep Planner',
    description: 'Privacy policy for The Pep Planner. How we collect, use, and protect your data.'
  },
  '/terms': {
    title: 'Terms of Service - The Pep Planner',
    description: 'Terms of service for The Pep Planner.'
  },
  '/cancellation-policy': {
    title: 'Cancellation Policy - The Pep Planner',
    description: 'Cancellation and refund policy for The Pep Planner subscriptions.'
  }
};

/**
 * Updates document.title and the meta description tag when the route changes.
 * Call this from a component that renders on every public page (e.g. each public page, or a shared layout).
 */
export function usePageSEO() {
  const { pathname } = useLocation();
  const seo = PAGE_SEO[pathname];

  useEffect(() => {
    if (!seo) return;
    document.title = seo.title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', seo.description);
  }, [pathname, seo]);
}
```

**What you can rephrase:** Every `title` and `description` in `PAGE_SEO`. These are the exact strings that will show in the browser tab and in search/AI snippets. Change any of them to sound more human or on-brand.

---

### 1.2 CHANGES: Public pages — call `usePageSEO()`

**Action:** ADD one line (and one import) to each of these components so they set the page title and meta description when they mount.

**Files and exact edits:**

| File | Add at top (with other imports) | Add inside the component (after hooks like useState), before return |
|------|----------------------------------|-----------------------------------------------------------------------|
| `src/pages/Landing.jsx` | `import { usePageSEO } from '../utils/pageSEO';` | `usePageSEO();` |
| `src/pages/About.jsx` | `import { usePageSEO } from '../utils/pageSEO';` | `usePageSEO();` |
| `src/pages/Features.jsx` | `import { usePageSEO } from '../utils/pageSEO';` | `usePageSEO();` |
| `src/pages/Pricing.jsx` | `import { usePageSEO } from '../utils/pageSEO';` | `usePageSEO();` |
| `src/pages/Blog.jsx` | `import { usePageSEO } from '../utils/pageSEO';` | `usePageSEO();` |
| `src/pages/FAQ.jsx` | `import { usePageSEO } from '../utils/pageSEO';` | `usePageSEO();` |
| `src/pages/Privacy.jsx` | `import { usePageSEO } from '../utils/pageSEO';` | `usePageSEO();` |
| `src/pages/Terms.jsx` | `import { usePageSEO } from '../utils/pageSEO';` | `usePageSEO();` |
| `src/pages/CancellationPolicy.jsx` | `import { usePageSEO } from '../utils/pageSEO';` | `usePageSEO();` |

**Note:** For `/` (homepage), the content is rendered by `LandingWrapper` → `Landing`. So the import and `usePageSEO()` go in `Landing.jsx`. For `/resources`, the same component as `/blog` is used (`Blog.jsx`), so when pathname is `/resources`, we need that path in `PAGE_SEO` (already there) and `Blog.jsx` will set the title/description for both `/blog` and `/resources` based on pathname (the hook reads `pathname` from the router). So we only add the hook in `Blog.jsx` once; it will set the correct title for both `/blog` and `/resources` because `pageSEO.js` has entries for both.

**What you can rephrase:** Nothing in this step; it’s just wiring. Wording to rephrase is in `PAGE_SEO` in `pageSEO.js` (see 1.1).

---

## 2. Keyword tuning in `index.html`

**Scope:** All suggested copy in this plan includes: **GLP tracking**, **GLP1 tracking**, **GLP-1 tracker**, **semaglutide**, **tirzepatide**, **weight loss tracking**, plus peptide planner app, reconstitution calculator, and related terms. Rephrase any of it for a more human tone.

All edits below are in **`index.html`** (project root). The file is the single HTML shell; these meta tags and JSON-LD are what crawlers and AIs see for every URL until the React app runs and `usePageSEO` updates title/description on the client.

---

### 2.1 CHANGE: Meta keywords (line 34)

**Current (exact):**
```html
<meta name="keywords" content="peptide research, protocol management, health optimization, supplement tracking, biohacking, research protocols, peptide tracking, health research, protocol planner, research management" />
```

**New (suggested — you can rephrase or add/remove keywords):**
```html
<meta name="keywords" content="peptide planner app, peptide tracker, GLP tracking, GLP1 tracking, GLP-1 tracker, semaglutide tracker, tirzepatide tracker, weight loss tracking, semaglutide, tirzepatide, peptide research, protocol management, peptide dosing, reconstitution calculator, health optimization, supplement tracking, biohacking, research protocols, peptide tracking, protocol planner, research management" />
```

**What changed:** Added phrases: `peptide planner app`, `peptide tracker`, `GLP tracking`, `GLP1 tracking`, `GLP-1 tracker`, `semaglutide tracker`, `tirzepatide tracker`, `weight loss tracking`, `semaglutide`, `tirzepatide`, `peptide dosing`, `reconstitution calculator`. You can trim or reword any of these.

---

### 2.2 CHANGE: Meta description (line 33)

**Current (exact):**
```html
<meta name="description" content="Professional peptide research protocol management tool. Track protocols, manage stockpiles, organize orders, and optimize your health research with advanced analytics and cloud sync." />
```

**New (suggested — rephrase as you like):**
```html
<meta name="description" content="Peptide and GLP-1 tracking app: semaglutide, tirzepatide, weight loss tracking. Track protocols, stockpile, dosing, reconstitution. Free trial." />
```

**What changed:** Shorter, and includes “peptide planner app” and “reconstitution calculator.” You can keep it longer or make it more conversational.

---

### 2.3 CHANGE: First JSON-LD block — `keywords` (inside the WebApplication script, last line of that block)

**Current (exact):**
```json
"keywords": "peptide research, protocol management, health optimization, supplement tracking, biohacking, research protocols, peptide tracking, health research, protocol planner, research management"
```

**New (suggested):**
```json
"keywords": "peptide planner app, peptide tracker, GLP tracking, GLP1 tracking, GLP-1 tracker, semaglutide tracker, tirzepatide tracker, weight loss tracking, semaglutide, tirzepatide, peptide research, protocol management, peptide dosing, reconstitution calculator, health optimization, supplement tracking, biohacking, research protocols, protocol planner, research management"
```

**What changed:** Same as 2.1 — includes GLP tracking, GLP1 tracking, semaglutide, tirzepatide, weight loss tracking, and related terms. You can rephrase or shorten.

---

### 2.4 CHANGE: First JSON-LD block — `description` (WebApplication)

**Current (exact):**
```json
"description": "Professional peptide research protocol management tool with advanced analytics, cloud sync, and comprehensive tracking features for health optimization research."
```

**New (suggested):**
```json
"description": "Peptide and GLP-1 tracking app for semaglutide, tirzepatide, and weight loss tracking. Track protocols, stockpile, dosing, reconstitution. Web, iOS, and Android."
```

**What changed:** More concrete and includes “peptide planner app” and “GLP-1.” You can make it more formal or more casual.

---

### 2.5 CHANGE: Second JSON-LD block — SoftwareApplication `description`

**Current (exact):**
```json
"description": "Professional peptide research protocol management and health optimization tool"
```

**New (suggested):**
```json
"description": "Peptide and GLP1 tracking app: semaglutide, tirzepatide, weight loss tracking, protocols, stockpile, dosing, reconstitution. Web, iOS, Android."
```

**What changed:** Shorter and includes “peptide planner” and “tracker.” Rephrase as you like.

---

### 2.6 CHANGE: Third JSON-LD block — Organization `description`

**Current (exact):**
```json
"description": "Professional peptide research protocol management platform"
```

**New (suggested):**
```json
"description": "The Pep Planner: peptide and GLP-1 tracking app for semaglutide, tirzepatide, weight loss tracking, and research protocols."
```

**What changed:** Adds “peptide planner app.” You can keep “professional” or other wording if you prefer.

---

### 2.7 OPTIONAL: Open Graph and Twitter description (lines 44, 55)

**Current (exact):**
- og:description: `"Professional peptide research protocol management tool. Track protocols, manage stockpiles, organize orders, and optimize your health research."`
- twitter:description: `"Professional peptide research protocol management tool. Track protocols, manage stockpiles, and optimize your health research."`

**New (suggested — same as meta description for consistency):**
- og:description: `"Peptide and GLP-1 tracking app: semaglutide, tirzepatide, weight loss tracking. Track protocols, stockpile, dosing, reconstitution. Free trial."`
- twitter:description: same as above (or one line shorter if you want).

**What changed:** Aligns share preview text with the main description and “peptide planner app.” Rephrase to match your voice.

---

## 3. Manifest description

**File:** `public/manifest.json`  
**Line:** 4

**Current (exact):**
```json
"description": "Professional Research Management Tool with Advanced Analytics and Security",
```

**New (suggested):**
```json
"description": "Peptide and GLP-1 tracking app: semaglutide, tirzepatide, weight loss tracking. Protocols, stockpile, dosing, reconstitution. Web, iOS, Android.",
```

**What changed:** Makes it clearly about peptides and “peptide planner app”; you can rephrase for tone.

---

## 4. robots.txt — REMOVE one block

**File:** `public/robots.txt`

**Action:** REMOVE these two lines (at the end of the file):

**Exact lines to remove:**
```
# Crawl-delay (optional, helps prevent server overload)
Crawl-delay: 1
```

**After removal:** The file should end with:
```
Sitemap: https://thepepplanner.app/sitemap.xml
```
(with a blank line after it is fine). No other changes.

**Why:** Google ignores Crawl-delay; Bing no longer uses it. Removing it avoids slowing other crawlers for no benefit.

---

## 5. FAQ structured data (no code change)

**File:** `src/pages/FAQ.jsx`

**Current state:** The FAQ page already builds a `FAQPage` schema from `faqCategories` and injects it with a `<script type="application/ld+json">` and `dangerouslySetInnerHTML`. So no **new** FAQ schema is required.

**Optional:** If you want to tweak how questions/answers are summarized for search/AI, you would edit the `question` and `answer` strings inside the `faqCategories` array in `FAQ.jsx` (lines 28–182). Those same strings are used for the schema. So any rephrasing there will show both on the page and in the structured data.

---

## 6. Sitemap (optional)

**File:** `public/sitemap.xml`

**Action:** Optional. When you deploy, you can update the `lastmod` date for the URLs you changed so crawlers know the site is fresh. No wording changes; only dates if you want (e.g. set to today’s date in YYYY-MM-DD).

---

## 7. Share image (optional, no exact content)

**Current:** In `index.html`, `og:image` and `twitter:image` point to `https://thepepplanner.app/tpp_logo.png`. If that image is not 1200×630, link previews may not look ideal.

**Suggestion:** Add a new image (e.g. 1200×630) that shows the app name and a short tagline, save it in `public/` (e.g. `og-image.png`), then in `index.html` change:
- `og:image` and `og:image:width` / `og:image:height`
- `twitter:image`  
to point to that new file. No exact wording to rephrase here; only asset and URL.

---

## 8. Will this work for AI search? + suggestions

**Short answer:** Yes, this plan is solid and will help. It won’t “guarantee” you show up in ChatGPT, Perplexity, or Google AI Overview, but it does the right things to improve your chances.

**Why it helps AI search:**
- **Per-page title/description** — AIs that crawl your site see what each page is about.
- **Keyword-rich, clear copy** — GLP-1, semaglutide, tirzepatide, weight loss tracking, etc. match how people ask and how AIs are trained.
- **Structured data (JSON-LD)** — Many systems use schema (WebApplication, FAQPage) to understand and summarize your app.
- **FAQ page** — Q&A is exactly what AIs use to answer “what’s a good peptide/GLP-1 tracker?” type questions.
- **No blocking of AI crawlers** — Your robots.txt doesn’t block GPTBot, PerplexityBot, etc., so they can index your public pages.

**Reality check:** There’s no “submit your site to AI search” like Google Search Console. AI answers come from crawls, licensing, and training data. This plan makes your site clear and crawlable so that when AIs do read it, they have good signals. You can’t force inclusion, but you’re doing the right prep.

**Suggestions to go further (optional):**
- **Explicitly allow AI crawlers** — In `robots.txt` you could add a block like `User-agent: GPTBot` / `Allow: /` (and similar for others) so it’s obvious you want to be indexed. Not required if you’re not blocking them, but some teams like to state it.
- **Plain-language “About this app” content** — A short paragraph on the About or a dedicated page that says in simple sentences: “The Pep Planner is an app that helps you track peptide and GLP-1 research protocols, semaglutide and tirzepatide dosing, stockpile, and weight loss tracking. It runs on web, iOS, and Android.” That kind of text is easy for AIs to quote and summarize.
- **Keep copy readable** — Use the new keywords naturally. If descriptions sound stuffed or robotic, both users and AIs get less value; a human pass on the final wording is worth it.
- **Google Search Console** — Submit your sitemap and use GSC. Google’s index feeds into some AI experiences; healthy indexing there can indirectly help.

**Bottom line:** The plan is okay and will work for both traditional search and AI search in the sense that it gives the right signals. Add the optional steps above if you want to go a bit further; otherwise you’re in good shape to implement as-is.

---

## Summary table (what to rephrase)

| Location | What you can rephrase |
|----------|------------------------|
| `src/utils/pageSEO.js` (NEW) | Every `title` and `description` in `PAGE_SEO` for `/`, `/about`, `/features`, `/pricing`, `/blog`, `/resources`, `/faq`, `/privacy`, `/terms`, `/cancellation-policy`. |
| `index.html` | Meta keywords, meta description, og/twitter descriptions, and the three JSON-LD `description` and `keywords` strings. |
| `public/manifest.json` | The single `description` string. |
| `src/pages/FAQ.jsx` | Optional: the `question` and `answer` text in `faqCategories` (used for both the page and the FAQ schema). |

Everything else in this plan is either **new code** (pageSEO.js and the `usePageSEO()` calls), **removal** (Crawl-delay in robots.txt), or **optional** (sitemap dates, share image). You can adjust any of the suggested wording above to sound more human or more on-brand before or after implementation.
