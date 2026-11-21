// Weekly analytics email for camilafonseca.com
// Runs every Monday 07:00 UTC on Netlify's scheduler, reads last week's
// first-party counters (written by /api/collect into Netlify Blobs) and
// delivers a plain-language summary through the site's own Netlify form
// "weekly-report" (declared hidden in index.html). Netlify's form
// notification setting then emails it to the configured recipient.
//
// One-time setup in the Netlify dashboard: enable form detection, and add
// an email notification for the "weekly-report" form.

import { getStore } from "@netlify/blobs";
import { isoWeek } from "./collect.mjs";

export const config = { schedule: "0 7 * * 1" };

const SITE = process.env.URL || "https://camilafonseca.com";
const DASHBOARD = "https://cloud.umami.is";

export default async () => {
  // Runs Monday morning: report on the ISO week that just ended (3 days ago
  // is safely inside last week).
  const lastWeek = isoWeek(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000));
  const store = getStore("analytics");
  const data = (await store.get(lastWeek, { type: "json" })) || null;

  const body = data
    ? formatReport(lastWeek, data)
    : `No visits were recorded last week (${lastWeek}).\n\nFull dashboard: ${DASHBOARD}`;

  const form = new URLSearchParams({
    "form-name": "weekly-report",
    subject: `camilafonseca.com — weekly visitors report (${lastWeek})`,
    message: body,
  });
  const sent = await fetch(`${SITE}/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  console.log("weekly-report:", lastWeek, "form submission:", sent.status);
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
