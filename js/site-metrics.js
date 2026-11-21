// First-party aggregate counters feeding the weekly email report.
// Cookieless and anonymous: only counts are stored (page, language,
// referrer hostname, country) — never IPs, names, or identifiers.
(function () {
  var send = function (payload) {
    try {
      var body = JSON.stringify(payload);
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/collect", new Blob([body], { type: "application/json" }));
      } else {
        fetch("/api/collect", { method: "POST", headers: { "Content-Type": "application/json" }, body: body, keepalive: true });
      }
    } catch (e) { /* never break the page over analytics */ }
  };

  var ref = "";
  try { ref = document.referrer ? new URL(document.referrer).hostname : ""; } catch (e) {}
  if (ref === location.hostname) ref = "";

  send({ t: "pageview", p: location.pathname, r: ref, l: document.documentElement.lang || "" });

  document.addEventListener("click", function (ev) {
    var el = ev.target && ev.target.closest && ev.target.closest("[data-umami-event]");
    if (el) send({ t: "event", n: el.getAttribute("data-umami-event") });
  }, true);
})();
