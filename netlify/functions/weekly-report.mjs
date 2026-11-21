// Weekly analytics email for camilafonseca.com
// Runs every Monday 07:00 UTC on Netlify's scheduler, reads last week's
// first-party counters (written by /api/collect into Netlify Blobs) and
// emails a plain-language summary via web3forms.
//
// To activate, set the web3forms access key bound to the report recipient
// (either below or as a WEB3FORMS_KEY env var). Until then it no-ops.

import { getStore } from "@netlify/blobs";
import { isoWeek } from "./collect.mjs";

export const config = { schedule: "0 7 * * 1" };

// Same public web3forms key the contact forms use (bound to the site's
// report/contact inbox). Override with a WEB3FORMS_KEY env var to change
// the recipient without editing code.
const WEB3FORMS_KEY = process.env.WEB3FORMS_KEY || "55c1f60e-73d1-4273-9a0f-74c62d8bd946";
const DASHBOARD = "https://cloud.umami.is";

export default async () => {
  if (WEB3FORMS_KEY.includes("REPLACE")) {
    console.log("weekly-report: no web3forms key yet; skipping.");
    return new Response("not configured", { status: 200 });
  }

  // Runs Monday morning: report on the ISO week that just ended (3 days ago
  // is safely inside last week).
  const lastWeek = isoWeek(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000));
  const store = getStore("analytics");
  const data = (await store.get(lastWeek, { type: "json" })) || null;

  const body = data
    ? formatReport(lastWeek, data)
    : `No visits were recorded last week (${lastWeek}).\n\nFull dashboard: ${DASHBOARD}`;

  const sent = await fetch("https://api.web3forms.com/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      access_key: WEB3FORMS_KEY,
      subject: `camilafonseca.com — weekly visitors report (${lastWeek})`,
      from_name: "Camila Fonseca Website",
      name: "Weekly analytics report",
      email: "no-reply@camilafonseca.com",
      message: body,
    }),
  });
  const result = await sent.json().catch(() => ({}));
  console.log("weekly-report:", lastWeek, "email:", sent.status, result && result.message);
  return new Response("ok", { status: 200 });
};

const EVENT_NAMES = {
  "whatsapp-click": "Clicked the WhatsApp button",
  "contact-form-submit": "Sent the contact form",
  "video-open": "Played a video",
  "lang-switch": "Switched language",
  "email-click": "Clicked the email address",
  "contact-bubble-click": "Used the floating contact bubble",
};

const LANG_NAMES = { en: "English", "pt-BR": "Português", es: "Español" };

function top(obj, limit = 6, names = null) {
  const rows = Object.entries(obj || {}).sort((a, b) => b[1] - a[1]).slice(0, limit);
  if (!rows.length) return "  • nothing recorded";
  return rows.map(([k, v]) => `  • ${(names && names[k]) || k} — ${v}`).join("\n");
}

function formatReport(week, d) {
  return `Hello! Here is what happened on camilafonseca.com last week (${week}):

VISITS
  • ${d.pageviews} page views in total.

WHAT VISITORS DID
${top(d.events, 10, EVENT_NAMES)}

MOST VIEWED PAGES
${top(d.pages)}

LANGUAGES
${top(d.langs, 5, LANG_NAMES)}

WHERE THEY CAME FROM
${top(d.refs, 5)}

COUNTRIES
${top(d.countries, 6)}

Live dashboard with more detail: ${DASHBOARD}
(This automatic report is sent every Monday by the website itself. Counts are
anonymous aggregates — no personal data is stored.)`;
}
