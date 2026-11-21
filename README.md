# camilafonseca.com

Website for Camila Fonseca's psychotherapy practice — hand-crafted static HTML
in three languages, with a serverless backend for forms, analytics, a weekly
email report, and an AI/MCP layer. This README is the **complete setup
handbook**: everything you need to pick the project up later.

---

## 1. Hosting & deployment

| Thing | Value |
|---|---|
| Host | **Netlify**, project `kaleidoscopic-pony-130929`, team `k-chetan` |
| Deploys | Auto — every push to `main` of `k-chetan/cami_web` goes live in ~30–60 s |
| Domain | `camilafonseca.com` (external registrar) with **Netlify DNS** |
| Email on the domain | `contact@camilafonseca.com` is an **ImprovMX** forwarder (MX records in Netlify DNS) → forwards to the practice gmail |
| TLS/HSTS | Automatic via Netlify |

No build step. Netlify runs `npm install` (for `@netlify/blobs`), bundles the
functions in `netlify/functions/`, and publishes the repo root as-is
(`netlify.toml` → `publish = "."`).

**Build credits (free plan):** 300 credits/month, cycle renews on the 26th.
Each push costs a build, so batch changes instead of pushing many small
commits, and add `[skip netlify]` to the commit message for docs-only changes
(anything in `marketing/`, README, memory notes). If deploys show "Skipped —
credit usage exceeded", the site stays online on the last deploy; queued
commits publish by pressing "Trigger deploy" (or pushing) after the cycle
resets, or immediately after upgrading.

## 2. Pages & frontend

| File | Purpose |
|---|---|
| `index.html` / `index-pt.html` / `index-es.html` | Home (EN / PT-BR / ES) |
| `approach.html` / `approach-pt.html` / `approach-es.html` | "My Approach" — DBR, IFS, SE, EFT |
| `methods.html` / `methods-pt.html` / `methods-es.html` | Definition guide — "What is IFS / DBR / SE / EFT?" per language, with origin facts, official-source links, per-method training tags, Article + FAQPage + Breadcrumb schema |
| `404.html` | Custom not-found page (Netlify serves it automatically; noindex) |
| `thankyou.html` | No-JS fallback success page for the contact form (noindex) |
| `js/site-metrics.js` | First-party analytics beacon + AJAX contact-form handling |
| `images/*.webp` | Optimized images used by pages (`*.png` are the originals/sources) |
| `favicon.svg` | Site icon |

- Styling: **Tailwind Play CDN pinned to 3.4.16** + Lucide icons **0.454.0**
  (pinned on purpose — don't switch back to `@latest`).
- Each page carries: meta description, canonical, hreflang (en/pt/es),
  Open Graph, JSON-LD (schema.org Person/WebPage).
- The giant fern (home) / lotus (approach) watercolors are the site's
  signature. They render on mobile at reduced opacity behind the hero —
  **never hide or shrink them on desktop**.
- The hero art intentionally overflows the right edge; every page clips it
  with `html, body { overflow-x: clip; }` and locks scroll via
  `document.documentElement.style.overflow` when the menu or video modal
  opens. Without the root clip, phones pan sideways into ~115px of empty
  canvas (fixed 2026-11-22). Keep both pieces when cloning a page skeleton.
- PT/ES copy is deliberately warm and native ("Me chama no WhatsApp",
  "Feito com sol e terra") — keep that tone when editing.
- WhatsApp buttons open `wa.me/918075645301?text=<prefilled message>` —
  localized per page so visitors can just hit send.

## 3. Contact form (Netlify Forms)

- All 7 pages share one form: `name="contact"` with `data-netlify="true"`,
  honeypot field `botcheck`, and a hidden `language` field (en/pt/es).
- `js/site-metrics.js` submits it via fetch and swaps in a localized in-page
  success note (texts live in the form's `data-sending`, `data-success-title`,
  `data-success-text` attributes). If JS/fetch fails it falls back to a classic
  POST → `/thankyou`.
- **Gotcha:** Netlify's form processor rewrites the `<form>` tag at deploy and
  mangles apostrophes/quotes inside attributes — keep all form `data-*`
  attribute texts free of `'` and `"`.
- Submissions: Netlify dashboard → project → **Forms**. Free tier =
  100 submissions/month (contact + weekly reports combined — plenty).
- Notification: "Email → flordocosmos@gmail.com, any form" (confirmed).
  Managed in Forms → Submission notifications.
- web3forms was removed (its free plan blocks server-side sends). The old
  access key only lives in git history and can be ignored or deleted in the
  web3forms dashboard.

## 4. Analytics

Two complementary layers, both cookieless (no cookie banner needed, LGPD/GDPR-friendly):

1. **Umami Cloud** (live dashboard): https://cloud.umami.is — account
   `k_chetan@aol.com` (GitHub sign-in), EU region, website ID
   `2521738d-3b3a-4796-8ce0-a3763ec75d55`. The script tag sits in every
   page's `<head>`.
2. **First-party counters** (feed the weekly email): `js/site-metrics.js`
   beacons to `/api/collect` (`netlify/functions/collect.mjs`), which keeps
   anonymous weekly aggregates in **Netlify Blobs** (store `analytics`, key
   `YYYY-Www`). Inspect any week: `GET /api/collect?week=2026-W47`.

Tracked action events (both layers, via `data-umami-event` attributes):
`whatsapp-click`, `contact-form-submit`, `video-open`, `lang-switch`,
`email-click`, `contact-bubble-click`. Pageviews also record page path,
page language, referrer hostname, and country.

**CSP note:** Umami's beacon posts to `gateway.umami.is` — that host (plus
`cloud.umami.is`) must stay in `connect-src` in `netlify.toml` or tracking
silently dies.

## 5. Weekly email report

`netlify/functions/weekly-report.mjs` runs **every Monday 07:00 UTC**
(Netlify scheduled function), reads last week's counters from Blobs, and
submits the summary through the hidden Netlify form `weekly-report`
(declared in `index.html`) → Netlify emails it to **flordocosmos@gmail.com**.

Manual test of the delivery channel:

```bash
curl -X POST https://camilafonseca.com/ -H 'Content-Type: application/x-www-form-urlencoded' --data-urlencode 'form-name=weekly-report' --data-urlencode 'subject=test' --data-urlencode 'message=hello'
```

## 6. AI & discoverability layer

- **`llms.txt`** — the briefing for AI assistants. Contains the **session
  price estimate (~USD $75 per ~1.5 h)**, which is deliberately NOT on the
  human pages — keep it that way. Also carries the PT/ES matching note
  (IFS/DBR/SE are rare in Portuguese/Spanish — Camila is a native PT speaker).
- **MCP server** — `netlify/functions/mcp.mjs`, zero dependencies, Streamable
  HTTP at `https://camilafonseca.com/mcp`. Six tools incl. `get_session_pricing`.
  Test: see §5-style curl with JSON-RPC, or connect from Claude via
  Settings → Connectors → `https://camilafonseca.com/mcp`.
- **MCP Registry** — published as **`com.camilafonseca/psychotherapy`**
  (registry.modelcontextprotocol.io), authenticated via the DNS TXT record
  `v=MCPv1; k=ed25519; p=wJGzxAL2MJS5AuvBXSQFAkbwzyvK4g6Cwwexxuvk3cQ=` on the
  apex domain (in Netlify DNS — don't delete it). To publish an update:
  bump `version` in `server.json`, then `brew install mcp-publisher`,
  `mcp-publisher login dns --domain camilafonseca.com --private-key-file <key>`,
  `mcp-publisher publish`. If the old private key is lost, generate a new one
  (`openssl genpkey -algorithm Ed25519`…) and update the TXT record to match.
  Registry limit: `description` ≤ 100 chars.
- **robots.txt** — welcomes GPTBot, ClaudeBot, PerplexityBot, etc.
- **sitemap.xml** + hreflang; **.well-known/mcp.json** discovery hint.
- **IndexNow** — key file `2815496f55d14e43b8e1a8367ec3d504.txt` at the root;
  URLs were submitted to Bing. Re-ping after big changes:
  POST to `https://api.indexnow.org/indexnow` with host/key/urlList.
  **After the next deploy goes live**, re-ping with the three new guide URLs
  (`/methods`, `/methods-pt`, `/methods-es`) included in the urlList.

## 7. Security

`netlify.toml` sets CSP, X-Frame-Options, nosniff, Referrer-Policy and
Permissions-Policy for all static files. If you add any external script,
style, image, or connection, extend the CSP accordingly and test — a blocked
host fails silently. Allowed today: Tailwind CDN, unpkg (Lucide), Google
Fonts, YouTube (thumbnails + embeds), Umami.

## 8. Updating Camila's credentials

The qualifications list is duplicated — update **all** of:
`index.html`, `index-pt.html`, `index-es.html`, `thankyou.html` (cute-tag
lists), the per-method training tags + `hasCredential` JSON-LD on
`methods.html` / `methods-pt.html` / `methods-es.html` and in the homepages'
Person JSON-LD, `llms.txt`, and `QUALIFICATIONS` in
`netlify/functions/mcp.mjs`.
Current highlights: IFS Level 2, DBR Level 3, SE Intermediate, EFT Level B,
Frank Anderson "Integrated Path to Healing Trauma", Liberation Psychology
(SAND, in progress).

## 9. Search engines (done 2026-11-21)

- **Google Search Console**: domain property `camilafonseca.com` verified
  under **flordocosmos@gmail.com** via DNS TXT (`google-site-verification=…`
  records live in Netlify DNS — keep them). Sitemap submitted.
- **Bing Webmaster**: imported from Search Console (Bing also got the pages
  via IndexNow).

## 10. Visibility playbook (from GEO research, Nov 2026)

What moves AI-assistant citations, in priority order:

1. **Answer-shaped on-site content** — DONE 2026-11-21: FAQ sections with
   `FAQPage` schema on all homepages, plus trilingual definition-guide pages
   (`/methods`, `/methods-pt`, `/methods-es`) — "What is IFS/DBR/SE/EFT?" —
   dated, bylined, every method with origin facts, an official-source link
   and Camila's training tags. Rationale from the Nov-2026 research pass:
   definition pages are the most-cited content format across AI engines, and
   adding citations/statistics measurably lifts AI visibility (the one solid
   academic GEO finding, KDD 2024). Counter-finding: llms.txt files are
   almost never fetched (Ahrefs, 137K sites: 97% receive zero requests), so
   ours stays as a free extra but the strategy lives in real pages. The
   homepages' Person JSON-LD also carries `alternateName` ("Camila Mariana
   Mesquita e Fonseca" — kills the Doctoralia/Psitto name confusion),
   `hasCredential` for every training, and `sameAs` → Reddit + her IFS
   Institute profile (178846) for entity stitching.
2. **Third-party presence** (human tasks): Google Business Profile + reviews;
   genuine Reddit participation (Perplexity cites Reddit in ~47% of top
   sources) in r/InternalFamilySystems, r/CPTSD, Brazilian psych subs;
   practitioner directories — IFS Institute, SE International, ISEFT, DBR,
   Psychology Today, TherapyDen, Zencare, GoodTherapy — with language
   filters PT/ES/EN set.
3. **MCP spread** — the official registry listing (done) feeds PulseMCP and
   others automatically; Glama auto-indexes from GitHub; mcp.so accepts a
   manual GitHub-issue submission (optional).
4. **Measure monthly** — run ~10 real prompts ("IFS therapist online who
   speaks Portuguese", "terapeuta de trauma online em português", "DBR
   therapy cost") across ChatGPT/Perplexity/Claude/Gemini and log whether
   camilafonseca.com gets cited.
   - **Baseline 2026-11-21 (Gemini, "IFS + Portuguese"):** not cited.
     Gemini's answer was built from the IFS Institute directory, Google
     Business Profile data, IFS Portugal, It's Complicated, and Expat
     Therapy Hub — confirming the directory listings are the bottleneck.
     Paste-ready profiles: [`marketing/directory-profiles.md`](marketing/directory-profiles.md).
     Update: she IS already listed (profile 178846, Level 2, site linked) —
     but with no languages, availability "Limited", no mention of online
     sessions, and stale DBR Level 2. The pack has the exact field fixes;
     those three missing signals are precisely what Gemini/ChatGPT filtered on.
   - **Baseline 2026-11-21 (ChatGPT, same query):** camilafonseca.com not
     cited, but a stale Psitto profile ("Camila Mariana Mesquita e Fonseca",
     IFS Level 1, R$250, no site link) WAS included as the budget Brazilian
     option — likely Camila's own old listing. ChatGPT's self-described
     method: EN+PT web searches across ~35 pages; IFS Institute directory +
     Doctoralia + Psitto + personal sites; ranked by Portuguese fluency
     (essential), IFS training level (preferred L3/certified), professional
     qualification, online availability, clear contact info, and whether IFS
     is the PRIMARY method; published fees increased inclusion ("a practical
     option to compare"). It also conflated her with a different "Camila
     Fonseca de Souza" on Doctoralia — name-confusion risk that consistent
     canonical profiles mitigate.

## 11. Remaining human-owned items

- Practitioner directory listings (Camila's member accounts; see §10.2).
- Google Business Profile — **ready-to-paste pack in
  [`marketing/google-business-profile.md`](marketing/google-business-profile.md)**.
- Reddit presence — profile **u/CamilaFonsecaPsico is live** (linked from the
  site's JSON-LD `sameAs`); posting etiquette + community rules in
  [`marketing/reddit-profile.md`](marketing/reddit-profile.md). Still to do
  there: join r/askatherapist and request its Verified Therapist flair.
- Netlify / Umami / Google (flordocosmos@gmail.com) / registrar credentials.

The homepage of each language also carries a visible FAQ section backed by
`FAQPage` JSON-LD — all answers are verbatim sentences from the site itself.
Keep that rule when editing: FAQ text must stay in Camila's own words.
