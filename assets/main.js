// GlassDrive website. No tracking, no third parties.
(function () {
  "use strict";

  // Scroll "woosh". Blocks marked .w glide in when 30% of them is on screen, glide out upwards once
  // you scroll past, and at least one block is always showing so the page is never empty.
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if ("IntersectionObserver" in window && !reduce) {
    document.documentElement.classList.add("js");
    var blocks = [], seen = new Map();
    var shown = function (rect) {
      var vh = window.innerHeight, top = Math.max(rect.top, 0), bottom = Math.min(rect.bottom, vh);
      return Math.max(0, bottom - top) / Math.max(1, Math.min(rect.height, vh));
    };
    var update = function () {
      var any = false;
      blocks.forEach(function (el) {
        var r = el.getBoundingClientRect(), v = shown(r), on = v >= 0.3;
        el.classList.toggle("in", on);
        el.classList.toggle("up", !on && r.top < 0);
        seen.set(el, v);
        if (on) any = true;
      });
      if (!any && blocks.length) {
        // Nothing is 30% visible: keep the block nearest the middle of the screen showing.
        var mid = window.innerHeight / 2, best = null, dist = Infinity;
        blocks.forEach(function (el) {
          var r = el.getBoundingClientRect(), d = Math.abs((r.top + r.bottom) / 2 - mid);
          if (d < dist) { dist = d; best = el; }
        });
        if (best) best.classList.add("in");
      }
    };
    var ready = function () {
      blocks = Array.prototype.slice.call(document.querySelectorAll(".w"));
      // Stagger blocks that sit side by side (cards, tiles, stats) so they arrive one after another.
      blocks.forEach(function (el) {
        var sibs = Array.prototype.filter.call(el.parentNode.children, function (c) { return c.classList.contains("w"); });
        var i = sibs.indexOf(el);
        if (sibs.length > 1 && i > 0) el.style.transitionDelay = Math.min(i, 5) * 70 + "ms";
      });
      var thresholds = []; for (var t = 0; t <= 20; t++) thresholds.push(t / 20);
      var io = new IntersectionObserver(update, { threshold: thresholds });
      blocks.forEach(function (el) { io.observe(el); });
      window.addEventListener("resize", update, { passive: true });
      update();
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready); else ready();
  }

  // Side buttons + floating Download appear once the main Download button scrolls out of view.
  // On sub-pages (no hero button) the floating Download button appears once you've scrolled a little.
  if (!document.getElementById("hero-download")) {
    var onScroll = function () { document.body.classList.toggle("scrolled", window.scrollY > window.innerHeight * 0.45); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }
  var heroButton = document.getElementById("hero-download");
  if (heroButton && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      document.body.classList.toggle("scrolled", !entries[0].isIntersecting && entries[0].boundingClientRect.top < 0);
    }).observe(heroButton);
  }

  // Highlights gallery dots.
  var gallery = document.getElementById("gallery");
  var dots = document.getElementById("gallery-dots");
  if (gallery && dots) {
    var tiles = Array.prototype.slice.call(gallery.children);
    tiles.forEach(function (tile, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", "Highlight " + (i + 1));
      b.addEventListener("click", function () { tile.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" }); });
      dots.appendChild(b);
    });
    var mark = function () {
      var mid = gallery.scrollLeft + gallery.clientWidth / 2, best = 0, dist = Infinity;
      tiles.forEach(function (t, i) { var d = Math.abs(t.offsetLeft + t.clientWidth / 2 - mid); if (d < dist) { dist = d; best = i; } });
      Array.prototype.forEach.call(dots.children, function (d, i) { d.setAttribute("aria-current", i === best ? "true" : "false"); });
    };
    gallery.addEventListener("scroll", mark, { passive: true });
    mark();
  }

  // Frost demo: 0 = completely clear, 100 = very frosted.
  var demo = document.getElementById("frost-demo"), frost = document.getElementById("frost");
  if (demo && frost) {
    var apply = function () {
      var f = frost.value / 100;
      demo.style.setProperty("--frost", (f * 28).toFixed(1) + "px");
      demo.style.setProperty("--haze", (f * 0.34).toFixed(3));
    };
    frost.addEventListener("input", apply);
    apply();
  }

  // Loyalty pricing (same rules as the app's Pricing.swift and the server's pricing.js).
  var TIERS = {
    pro: { first: 3.99, second: 3.0, step: 0.1, floor: 1.99, blurb: "Everything GlassDrive does. Included in your free trial." },
    ultimate: { first: 4.99, second: 4.0, step: 0.1, floor: 1.99, blurb: "Everything in Pro, plus custom backgrounds. A little more customisation, and an extra high five." }
  };
  var YEARLY_DISCOUNT = 0.2, EARLY_DISCOUNT = 0.2;
  var tier = "pro", isYearly = false;
  var round2 = function (v) { return Math.round(v * 100) / 100; };
  var monthly = function (n, t) { var P = TIERS[t || tier]; return n <= 1 ? P.first : Math.max(P.floor, round2(P.second - P.step * Math.floor((n - 2) / 2))); };
  var yearly = function (y, t) { var s = 0; for (var m = (y - 1) * 12 + 1; m <= y * 12; m++) s += monthly(m, t); return round2(s * (1 - YEARLY_DISCOUNT)); };
  var gbp = function (v) { return "£" + v.toFixed(2); };
  var calc = function () {};

  var ladder = document.getElementById("ladder");
  if (ladder) {
    var big = document.getElementById("price-big"), note = document.getElementById("plan-note"), blurb = document.getElementById("tier-blurb");
    var mBtn = document.getElementById("plan-monthly"), yBtn = document.getElementById("plan-yearly");
    var pBtn = document.getElementById("tier-pro"), uBtn = document.getElementById("tier-ultimate");
    var step = function (price, label, now) {
      return '<div class="step' + (now ? " now" : "") + '"><b>' + gbp(price) + "</b><span>" + label + "</span></div>";
    };
    var render = function () {
      mBtn.setAttribute("aria-pressed", String(!isYearly));
      yBtn.setAttribute("aria-pressed", String(isYearly));
      pBtn.setAttribute("aria-pressed", String(tier === "pro"));
      uBtn.setAttribute("aria-pressed", String(tier === "ultimate"));
      var P = TIERS[tier];
      blurb.textContent = P.blurb;
      if (isYearly) {
        big.innerHTML = gbp(yearly(1)) + " <small>first year</small>";
        var html = step(yearly(1), "Year 1", true) + step(yearly(2), "Year 2") + step(yearly(3), "Year 3");
        if (yearly(4) !== yearly(3)) html += step(yearly(4), "Year 4");
        ladder.innerHTML = html + step(yearly(6), "Lowest");
        note.textContent = "20% less than paying monthly for the same 12 months.";
      } else {
        big.innerHTML = gbp(P.first) + " <small>first month</small>";
        ladder.innerHTML = step(monthly(1), "Month 1", true) + step(monthly(2), "Months 2–3") + step(monthly(4), "Months 4–5") +
          step(monthly(6), "Months 6–7") + step(monthly(12), "Month 12") + step(P.floor, "Lowest");
        note.textContent = "Drops 10p every 2 months you stay, down to " + gbp(P.floor) + ". Commit during your trial and your first month is " +
          gbp(round2(P.first - EARLY_DISCOUNT)) + ".";
      }
      calc();
    };
    mBtn.addEventListener("click", function () { isYearly = false; render(); });
    yBtn.addEventListener("click", function () { isYearly = true; render(); });
    pBtn.addEventListener("click", function () { tier = "pro"; render(); });
    uBtn.addEventListener("click", function () { tier = "ultimate"; render(); });
  }

  var months = document.getElementById("months"), out = document.getElementById("calc-out");
  if (months && out) {
    calc = function () {
      var n = parseInt(months.value, 10), total = 0;
      for (var i = 1; i <= n; i++) total += monthly(i);
      var years = Math.floor(n / 12), yTotal = 0;
      for (var y = 1; y <= years; y++) yTotal += yearly(y);
      var name = tier === "pro" ? "Pro" : "Ultimate";
      var text = name + ", " + n + (n === 1 ? " month" : " months") + " monthly: " + gbp(total) + " in total (" + gbp(total / n) + "/month on average). That month you'd pay " + gbp(monthly(n)) + ".";
      if (years > 0 && n % 12 === 0) text += " Yearly instead: " + gbp(yTotal) + ", saving " + gbp(total - yTotal) + ".";
      out.textContent = text;
    };
    months.addEventListener("input", calc);
  }
  if (ladder) render(); else calc();

  // Download page: start the download automatically; the link stays as "try again".
  // Remember which advert brought the visitor (?src=tiktok) so the download can be credited to it.
  var src = (location.search.match(/[?&]src=([a-z0-9_-]{1,24})/i) || [])[1];
  try { if (src) sessionStorage.setItem("gd-src", src); else src = sessionStorage.getItem("gd-src"); } catch (e) {}
  var retry = document.getElementById("retry");
  if (retry) {
    // Once the server is live, downloads go through it so they're counted (it then hands over the file).
    var api = retry.getAttribute("data-api") || "";
    if (/^https:\/\//.test(api) && api.indexOf("example.com") === -1) {
      retry.href = api + "/download" + (src ? "?src=" + encodeURIComponent(src.toLowerCase()) : "");
    }
  }
  // Arrived just after clicking Download: the file is already downloading (it started from the click itself,
  // which browsers always allow); show "downloading" and the install steps.
  if (retry && /[?&](go|started)=1/.test(location.search)) { // old links from before: just show the steps
    setTimeout(function () { var st = document.getElementById("install"); if (st) st.scrollIntoView({ block: "start" }); }, 300);
  }

  // Every Download button is a plain link to the .dmg (it works with no JavaScript at all).
  // After the click we only *add* help: a small "Downloading…" card with what browsers may ask
  // and a link to the install steps. Nothing here stops or replaces the download itself.
  var help = function () {
    var isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);
    var isChrome = /chrome|crios|edg/i.test(navigator.userAgent);
    return isSafari ? "If Safari asks “Do you want to allow downloads?”, click <strong>Allow</strong>."
      : isChrome ? "If Chrome says the file “isn't commonly downloaded”, click <strong>Keep</strong> (it's new, so Chrome hasn't seen it much yet)."
      : "If your browser asks whether to keep or allow the file, choose <strong>Keep</strong> or <strong>Allow</strong>.";
  };
  var toast = null;
  var showToast = function () {
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "dl-toast";
      toast.setAttribute("role", "status");
      document.body.appendChild(toast);
    }
    toast.innerHTML = "<strong>Downloading GlassDrive-Beta.dmg…</strong><span>" + help() + "</span>" +
      '<a class="btn" href="download.html#install">How to install it</a>' +
      '<button type="button" aria-label="Close">×</button>';
    toast.querySelector("button").onclick = function () { toast.hidden = true; };
    toast.hidden = false;
  };
  Array.prototype.forEach.call(document.querySelectorAll("a[data-dl]"), function (a) {
    a.addEventListener("click", function () { setTimeout(showToast, 150); });
  });
  // On the download page, the big button reveals the install steps underneath.
  if (retry) {
    retry.addEventListener("click", function () {
      var started = document.getElementById("dl-started"), note = document.getElementById("dl-help");
      if (started) started.hidden = false;
      if (note) { note.innerHTML = help(); note.hidden = false; }
      setTimeout(function () { var st = document.getElementById("install"); if (st) st.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }); }, 1200);
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll(".year"), function (el) { el.textContent = new Date().getFullYear(); });
})();
