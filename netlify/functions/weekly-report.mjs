// Weekly analytics email for camilafonseca.com
// Runs every Monday 07:00 UTC on Netlify's scheduler, reads last week's stats
// from Umami via the website's public share-link token (free plan friendly),
// and emails a plain-language summary via web3forms.
//
// Needed to activate (both can be set here or as Netlify env vars):
//   UMAMI_SHARE_URL   — the website's Share URL from Umami settings
//                       (e.g. https://cloud.umami.is/share/AbCdEf123/camilafonseca.com)
//   WEB3FORMS_KEY     — a web3forms access key bound to the report recipient
// Until both are set, the function runs and exits quietly.

export const config = { schedule: "0 7 * * 1" };

const UMAMI_SHARE_URL = process.env.UMAMI_SHARE_URL || "REPLACE_WITH_SHARE_URL";
const WEB3FORMS_KEY = process.env.WEB3FORMS_KEY || "REPLACE_WITH_WEB3FORMS_KEY";

const DASHBOARD = "https://cloud.umami.is";

export default async () => {
  if (UMAMI_SHARE_URL.includes("REPLACE") || WEB3FORMS_KEY.includes("REPLACE")) {
    console.log("weekly-report: not configured yet (share URL / web3forms key missing); skipping.");
    return new Response("not configured", { status: 200 });
  }

  const endAt = Date.now();
  const startAt = endAt - 7 * 24 * 60 * 60 * 1000;
  const fmt = (ms) => new Date(ms).toISOString().slice(0, 10);

  let body;
  try {
    body = await buildReport(startAt, endAt, fmt);
  } catch (err) {
    console.error("weekly-report: failed to fetch stats:", err);
    body = `I couldn't fetch this week's numbers automatically (${String(err).slice(0, 120)}).\n\nYou can always see everything live at ${DASHBOARD}`;
  }

  const sent = await fetch("https://api.web3forms.com/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      access_key: WEB3FORMS_KEY,
      subject: `camilafonseca.com — weekly visitors report (${fmt(startAt)} to ${fmt(endAt)})`,
      from_name: "Camila Fonseca Website",
      name: "Weekly analytics report",
      email: "no-reply@camilafonseca.com",
      message: body,
    }),
  });
  const result = await sent.json().catch(() => ({}));
  console.log("weekly-report: email sent:", sent.status, result && result.message);
  return new Response("ok", { status: 200 });
};

async function buildReport(startAt, endAt, fmt) {
  const m = UMAMI_SHARE_URL.match(/\/share\/([^/]+)/);
  if (!m) throw new Error("Share URL looks wrong");
  const base = new URL(UMAMI_SHARE_URL).origin;

  // The share id resolves to a website id + read-only token (what the public
  // share page itself uses).
  const share = await getJson(`${base}/api/share/${m[1]}`, {});
  const token = share.token;
  const websiteId = share.id || share.websiteId;
  if (!token || !websiteId) throw new Error("Share token not available");

  const h = { "x-umami-share-token": token };
  const range = `startAt=${startAt}&endAt=${endAt}`;

  const stats = await getJson(`${base}/api/websites/${websiteId}/stats?${range}`, h);
  const pages = await getJson(`${base}/api/websites/${websiteId}/metrics?${range}&type=url&limit=6`, h).catch(() => []);
  const refs = await getJson(`${base}/api/websites/${websiteId}/metrics?${range}&type=referrer&limit=5`, h).catch(() => []);
  const countries = await getJson(`${base}/api/websites/${websiteId}/metrics?${range}&type=country&limit=5`, h).catch(() => []);
  const events = await getJson(`${base}/api/websites/${websiteId}/metrics?${range}&type=event&limit=10`, h).catch(() => []);

  const n = (v) => (v && typeof v === "object" ? v.value : v) || 0;
  const list = (rows, label) =>
    (rows || []).length
      ? rows.map((r) => `  • ${r.x || "(direct)"} — ${r.y}`).join("\n")
      : `  • no ${label} recorded this week`;

  const eventNames = {
    "whatsapp-click": "Clicked the WhatsApp button",
    "contact-form-submit": "Sent the contact form",
    "video-open": "Played a video",
    "lang-switch": "Switched language",
    "email-click": "Clicked the email address",
    "contact-bubble-click": "Used the floating contact bubble",
  };
  const eventList = (events || []).length
    ? events.map((e) => `  • ${eventNames[e.x] || e.x} — ${e.y}×`).join("\n")
    : "  • no actions recorded this week";

  return `Hello! Here is what happened on camilafonseca.com from ${fmt(startAt)} to ${fmt(endAt)}:

VISITORS
  • ${n(stats.visitors)} visitors made ${n(stats.visits)} visits and viewed ${n(stats.pageviews)} pages.

WHAT THEY DID
${eventList}

MOST VISITED PAGES
${list(pages, "pages")}

WHERE THEY CAME FROM
${list(refs, "referrers")}

COUNTRIES
${list(countries, "countries")}

Full dashboard: ${DASHBOARD}
(This automatic report is sent every Monday by the website itself.)`;
}

async function getJson(url, headers) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${res.status} from ${url.split("?")[0]}`);
  return res.json();
}
