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

## 2. Pages & frontend

| File | Purpose |
|---|---|
| `index.html` / `index-pt.html` / `index-es.html` | Home (EN / PT-BR / ES) |
| `approach.html` / `approach-pt.html` / `approach-es.html` | "My Approach" — DBR, IFS, SE, EFT |
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

## 7. Security

`netlify.toml` sets CSP, X-Frame-Options, nosniff, Referrer-Policy and
Permissions-Policy for all static files. If you add any external script,
style, image, or connection, extend the CSP accordingly and test — a blocked
host fails silently. Allowed today: Tailwind CDN, unpkg (Lucide), Google
Fonts, YouTube (thumbnails + embeds), Umami.

## 8. Updating Camila's credentials

The qualifications list is duplicated — update **all** of:
`index.html`, `index-pt.html`, `index-es.html`, `thankyou.html` (cute-tag
lists), `llms.txt`, and `QUALIFICATIONS` in `netlify/functions/mcp.mjs`.
Current highlights: IFS Level 2, DBR Level 3, SE Intermediate, EFT Level B,
Frank Anderson "Integrated Path to Healing Trauma", Liberation Psychology
(SAND, in progress).

## 9. Operations still owned by a human

- **Google Search Console / Bing Webmaster** — verify the domain (TXT record
  can go in Netlify DNS) and submit `sitemap.xml`. Bing can import from GSC.
- **Practitioner directories** (IFS Institute, SE International, ISEFT, DBR,
  Psychology Today) — create listings with language filters PT/ES/EN; these
  are what AI assistants cite when matching therapists.
- Netlify/Umami/registrar account credentials.
