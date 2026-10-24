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
  // Arrived from "Yes, download it": start the download and show the install steps.
  if (retry && /[?&]go=1/.test(location.search)) {
    var started = document.getElementById("dl-started"), ready = document.getElementById("dl-ready");
    if (started) started.hidden = false;
    if (ready) ready.hidden = true;
    Array.prototype.forEach.call(document.querySelectorAll(".dl-retry"), function (a) { a.href = retry.href; });
    setTimeout(function () { retry.click(); }, 500);
    // Then glide down to the install steps.
    setTimeout(function () {
      var steps = document.getElementById("install");
      if (steps) steps.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }, 1400);
    if (history.replaceState) history.replaceState(null, "", location.pathname + "#install"); // a refresh won't download twice
  }

  // Every "Download" button asks first: "Download GlassDrive Beta?" Yes → the download page,
  // which starts the download and walks through installing it.
  var size = (document.querySelector('meta[name="gd-download-size"]') || {}).content || "";
  var dialog = null;
  var openDialog = function () {
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.className = "dl-dialog";
      dialog.setAttribute("aria-labelledby", "dl-q");
      var icon = document.querySelector(".app-icon, .mini-icon");
      dialog.innerHTML = '<form method="dialog" class="inner">' +
        '<div class="app-icon">' + (icon ? icon.innerHTML : "") + "</div>" +
        '<h2 id="dl-q">Download GlassDrive Beta?</h2>' +
        "<p>GlassDrive-Beta.dmg" + (size ? " · " + size : "") + " · for macOS 14 Sonoma or later. Free during the beta.</p>" +
        '<div class="actions"><button class="btn secondary" value="no">Not now</button>' +
        '<button class="btn" value="yes" autofocus>Download</button></div></form>';
      document.body.appendChild(dialog);
      dialog.addEventListener("close", function () {
        if (dialog.returnValue === "yes") location.href = "download.html?go=1";
      });
      dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close("no"); }); // click outside
    }
    dialog.returnValue = "";
    dialog.showModal();
  };
  if (typeof HTMLDialogElement === "function") {
    Array.prototype.forEach.call(document.querySelectorAll('a[href="download.html"]'), function (a) {
      a.addEventListener("click", function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return; // opening in a new tab: just go
        e.preventDefault();
        openDialog();
      });
    });
    // On the download page itself, the big button asks too.
    if (retry && !/[?&]go=1/.test(location.search)) {
      retry.addEventListener("click", function (e) {
        if (retry.dataset.confirmed) return;
        e.preventDefault();
        openDialog();
      });
    }
  }

  Array.prototype.forEach.call(document.querySelectorAll(".year"), function (el) { el.textContent = new Date().getFullYear(); });
})();
