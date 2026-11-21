// Receives the site's first-party analytics beacons (see /js/site-metrics.js)
// and keeps weekly aggregate counters in Netlify Blobs.
// Stores ONLY counts — no IPs, no identifiers, no personal data.
//
//   POST /api/collect  {t:"pageview",p,r,l} or {t:"event",n}   → 204
//   GET  /api/collect[?week=2026-W48]                          → aggregate JSON
//
// The GET endpoint exposes the same aggregate-level data as a public
// analytics share page (counts only).

import { getStore } from "@netlify/blobs";

export const config = { path: "/api/collect" };

export function isoWeek(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

const EMPTY = () => ({ pageviews: 0, pages: {}, langs: {}, refs: {}, countries: {}, events: {} });

export default async (req, context) => {
  const store = getStore("analytics");

  if (req.method === "GET") {
    const week = new URL(req.url).searchParams.get("week") || isoWeek(new Date());
    if (!/^\d{4}-W\d{2}$/.test(week)) return new Response("bad week", { status: 400 });
    const data = (await store.get(week, { type: "json" })) || EMPTY();
    return Response.json({ week, ...data });
  }

  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  let body;
  try {
    const text = await req.text();
    if (text.length > 1000) return new Response("too large", { status: 413 });
    body = JSON.parse(text);
  } catch {
    return new Response("bad json", { status: 400 });
  }

  const key = isoWeek(new Date());
  const data = (await store.get(key, { type: "json" })) || EMPTY();
  const bump = (obj, k) => {
    if (!k || typeof k !== "string") return;
    k = k.slice(0, 80);
    obj[k] = (obj[k] || 0) + 1;
  };

  if (body.t === "event") {
    bump(data.events, body.n);
  } else if (body.t === "pageview") {
    if (typeof body.p !== "string" || !body.p.startsWith("/")) return new Response("bad path", { status: 400 });
    data.pageviews += 1;
    bump(data.pages, body.p);
    bump(data.langs, body.l);
    bump(data.refs, body.r || "(direct)");
    bump(data.countries, context.geo && context.geo.country && context.geo.country.name);
  } else {
    return new Response("bad type", { status: 400 });
  }

  // Note: read-modify-write; two simultaneous visitors can rarely drop a
  // count. Fine for a weekly pulse of a small site.
  await store.setJSON(key, data);
  return new Response(null, { status: 204 });
};
