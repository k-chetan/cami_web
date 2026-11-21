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

  // Friendly in-page submission for the contact form: shows a localized
  // success note instead of navigating away. Falls back to the classic
  // full-page /thankyou submission if anything goes wrong.
  var form = document.querySelector('form[name="contact"]');
  if (form && window.fetch && window.FormData && window.URLSearchParams) {
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var btn = form.querySelector('button[type="submit"]');
      var original = btn ? btn.innerHTML : "";
      if (btn) { btn.disabled = true; btn.textContent = form.getAttribute("data-sending") || "…"; }
      fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(new FormData(form)).toString(),
      }).then(function (r) {
        if (!r.ok) throw new Error("status " + r.status);
        var note = document.createElement("div");
        note.setAttribute("role", "status");
        note.style.cssText = "text-align:center;padding:2rem 1.5rem;border:2px dashed #81B29A;border-radius:1.5rem;background:#E6F0EB";
        var title = document.createElement("p");
        title.style.cssText = "font-family:'Gochi Hand',cursive;font-size:1.6rem;color:#5E8C76;margin:0 0 .35rem";
        title.textContent = (form.getAttribute("data-success-title") || "Message sent!") + " 🌱";
        var text = document.createElement("p");
        text.style.cssText = "font-weight:600;color:#3D405B;margin:0";
        text.textContent = form.getAttribute("data-success-text") || "";
        note.appendChild(title);
        note.appendChild(text);
        form.replaceWith(note);
      }).catch(function () {
        if (btn) { btn.disabled = false; btn.innerHTML = original; }
        HTMLFormElement.prototype.submit.call(form);
      });
    });
  }
})();
