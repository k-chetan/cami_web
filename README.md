# camilafonseca.com

Website for Camila Fonseca's psychotherapy practice. Hand-crafted static HTML
(Tailwind Play CDN + Lucide icons), hosted on **Netlify**, in three languages.

## Structure

| File | Purpose |
|---|---|
| `index.html` / `index-pt.html` / `index-es.html` | Home (EN / PT-BR / ES) |
| `approach.html` / `approach-pt.html` / `approach-es.html` | "My Approach" — therapy methods |
| `thankyou.html` | Post-contact-form page (noindex) |
| `images/*.webp` | Optimized images used by the pages (`*.png` are the originals, kept as source) |
| `favicon.svg` | Site icon |
| `netlify.toml` | Security headers (CSP etc.), caching, functions config |
| `netlify/functions/mcp.mjs` | **MCP server** at `/mcp` (zero dependencies) |
| `llms.txt`, `robots.txt`, `sitemap.xml`, `.well-known/mcp.json` | AI & search discoverability |

## AI integration

- **`/llms.txt`** — summary of the practice for AI assistants, including the
  estimated session price (about **USD $75 per ~1.5-hour session** — deliberately
  *not* shown on the human-facing pages; assistants are told to advise confirming
  with Camila directly).
- **`/mcp`** — a Model Context Protocol server (Streamable HTTP, stateless,
  no auth). Tools: `get_practice_overview`, `get_therapy_methods`,
  `get_qualifications`, `get_session_pricing`, `get_contact_options`,
  `get_testimonials`.
- `robots.txt` explicitly welcomes GPTBot, ClaudeBot, PerplexityBot, etc.
- Each page carries schema.org JSON-LD, Open Graph tags, canonical + hreflang.

### Connecting an AI client to the MCP server

- **Claude** (claude.ai → Settings → Connectors → Add custom connector):
  URL `https://camilafonseca.com/mcp`
- **Claude Code**: `claude mcp add --transport http camila https://camilafonseca.com/mcp`
- **ChatGPT** (developer mode connectors) and **Cursor**: add a remote MCP server
  with the same URL.

### Testing the MCP server

```bash
curl -s https://camilafonseca.com/mcp -X POST \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_session_pricing","arguments":{}}}'
```

## Analytics (Umami Cloud — free, cookieless)

Every page is pre-instrumented with `data-umami-event` attributes
(`whatsapp-click`, `contact-form-submit`, `video-open`, `lang-switch`,
`email-click`, `contact-bubble-click`) and carries an `UMAMI_ANALYTICS`
placeholder comment in `<head>`. To switch it on:

1. Create a free account at https://cloud.umami.is (Hobby plan), add the
   website `camilafonseca.com`, and copy its **Website ID**.
2. Replace the `UMAMI_ANALYTICS` comment in all 7 HTML files with
   `<script defer src="https://cloud.umami.is/script.js" data-website-id="YOUR-ID"></script>`.
3. Deploy. The CSP in `netlify.toml` already allows Umami. No cookie banner
   is needed — Umami is cookieless and GDPR/LGPD-friendly.

## Deploying

The site deploys on Netlify. **Note:** `netlify/functions/mcp.mjs` only ships if
the deploy includes functions — i.e. the site is linked to this Git repository
(recommended) or deployed with `netlify deploy --prod` from the CLI. A plain
drag-and-drop of loose files will not include the function.

## Updating credentials

The qualifications list lives in **five places** — keep them in sync:
`index.html`, `index-pt.html`, `index-es.html`, `thankyou.html` (cute-tag lists),
plus `llms.txt` and the `QUALIFICATIONS` block in `netlify/functions/mcp.mjs`.
