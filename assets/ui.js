/* EY BizApps - ui.js
   Small shared behaviour for all three views: the bar, the mobile menu, the
   full-screen button, reveal on scroll and a few string helpers. Classic
   script, so the pages still open from file://. */
(function (root) {
  "use strict";
  var UI = {};
  UI.$ = function (s, r) { return (r || document).querySelector(s); };
  UI.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  UI.esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  };
  UI.el = function (t, c, h) { var n = document.createElement(t); if (c) n.className = c; if (h != null) n.innerHTML = h; return n; };
  UI.icon = function (k) { return (root.ICONS || {})[k] || ""; };
  UI.REDUCED = root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* the bar goes solid once the page has moved off its first screen */
  UI.bar = function () {
    var bar = UI.$(".bar"); if (!bar) return;
    var tog = UI.$(".navtog"), links = UI.$(".bar .links");
    function onScroll() { bar.classList.toggle("stuck", root.scrollY > 30 || bar.dataset.solid === "1"); }
    root.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    if (tog && links) {
      var set = function (open) { links.classList.toggle("open", open); tog.setAttribute("aria-expanded", open ? "true" : "false"); };
      tog.addEventListener("click", function () { set(tog.getAttribute("aria-expanded") !== "true"); });
      links.addEventListener("click", function (e) { if (e.target.tagName === "A") set(false); });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") set(false); });
      root.addEventListener("resize", function () { if (root.innerWidth > 1180) set(false); });
    }
    var ey = UI.icon("ey");
    UI.$$("img[data-ey]").forEach(function (i) { if (ey) i.src = ey; });
    var ms = UI.icon("microsoft");
    UI.$$("img[data-ms]").forEach(function (i) { if (ms) i.src = ms; });
  };

  UI.fullscreen = function () {
    var b = UI.$("#fsBtn");
    if (!b || !root.FS) return;
    root.FS.bind(b, UI.$("#fsTxt"));
    document.addEventListener("keydown", function (e) {
      var t = e.target;
      if (t && /input|textarea|select/i.test(t.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.key || "").toLowerCase() === "f") { root.FS.toggle(); e.preventDefault(); }
    });
  };

  UI.reveal = function () {
    var items = UI.$$(".rv");
    if (!("IntersectionObserver" in root)) { items.forEach(function (n) { n.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    items.forEach(function (n) { io.observe(n); });
  };

  /* the section links in the bar follow the reader */
  UI.spy = function () {
    var links = UI.$$(".bar .links a").filter(function (a) { return a.getAttribute("href").charAt(0) === "#"; });
    var secs = links.map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); });
    function on() {
      var cur = -1;
      secs.forEach(function (s, i) { if (s && s.getBoundingClientRect().top <= root.innerHeight * 0.4) cur = i; });
      links.forEach(function (a, i) { a.classList.toggle("on", i === cur); });
    }
    root.addEventListener("scroll", on, { passive: true }); on();
  };

  root.UI = UI;
})(window);
