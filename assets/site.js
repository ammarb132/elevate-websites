/* Elevate Websites ,  site.js v2. Nav, scroll-reveal, hero orb, count-up. */
(function () {
  "use strict";
  var nav = document.getElementById("nav");
  var solid = false;
  function onScroll() {
    var s = window.scrollY > 40;
    if (s !== solid) { solid = s; nav.classList.toggle("nav--solid", s); }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* scroll-reveal */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll(".sec-head, .proof-strip, .grid > .card, .grid > .tile, .steps > .step, .stats, .start-card, .contact-strip"));
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { el.classList.add("reveal"); io.observe(el); });
  }

  /* hero orb follows the pointer */
  var orb = document.querySelector(".orb");
  if (orb) {
    var hero = document.querySelector(".hero");
    var raf = null;
    hero.addEventListener("pointermove", function (e) {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = null;
        var r = hero.getBoundingClientRect();
        orb.style.setProperty("--ox", (e.clientX - r.left) + "px");
        orb.style.setProperty("--oy", (e.clientY - r.top) + "px");
      });
    });
  }

  /* count-up stats */
  document.querySelectorAll("[data-count]").forEach(function (el) {
    var target = parseInt(el.getAttribute("data-count"), 10) || 0;
    var done = false;
    var io2 = new IntersectionObserver(function (entries) {
      if (!done && entries[0].isIntersecting) {
        done = true;
        var t0 = null;
        function tick(now) {
          if (!t0) t0 = now;
          var p = Math.min(1, (now - t0) / 900);
          el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(tick);
          else el.textContent = target;
        }
        requestAnimationFrame(tick);
        io2.unobserve(el);
      }
    }, { threshold: 0.6 });
    io2.observe(el);
  });
})();

(function () {
  "use strict";
/* inline preview modal ,  no navigation, everything stays on this page */
  var modal = document.getElementById("modal"), mBody = document.getElementById("modalBody");
  function openModal(html) {
    mBody.innerHTML = html;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    var v = mBody.querySelector("video");
    if (v) { var p = v.play(); if (p && p.catch) { p.catch(function () {}); } }
    var f = mBody.querySelector("iframe");
    if (f) { try { f.focus(); } catch (e) {} }
  }
  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = "";
    var v = mBody.querySelector("video");
    if (v) { v.pause(); }
    mBody.innerHTML = "";
  }
  document.querySelectorAll("[data-close]").forEach(function (el) { el.addEventListener("click", closeModal); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });
  document.querySelectorAll(".tile[data-demo]").forEach(function (t) {
    t.addEventListener("click", function () {
      openModal('<iframe class="modal-frame" src="' + t.getAttribute("data-demo") + '" loading="lazy"></iframe>' +
        '<p class="modal-cap">Live preview, built into this page. Close it and you stay right here.</p>');
    });
  });
    /* live cards open their live site directly (new tab) */

  /* live animation cards -> inline video preview (their sites block iframes) */
  document.querySelectorAll(".card[data-live]").forEach(function (c) {
    c.addEventListener("click", function () {
      var src = c.getAttribute("data-src");
      var html = '<iframe class="modal-frame" src="' + (src || c.getAttribute("data-video")) + '" allow="autoplay"></iframe>';
      html += '<div class="modal-chrome"><span class="modal-cap">' + c.getAttribute("data-name") + ' &middot; the actual live website, hosted here. Scroll anywhere - it drives the animation.</span>';
      html += '<a class="btn btn-solid" href="' + c.getAttribute("data-live") + '" target="_blank" rel="noopener">Open the live site &nearr;</a></div>';
      openModal(html);
    });
  });
})();


/* ===== Dark mode toggle ===== */
(function () {
  var root = document.documentElement;
  var btn = document.getElementById("themeBtn");
  var saved = null;
  try { saved = localStorage.getItem("elevate-theme"); } catch (e) {}
  var theme = saved || (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  root.setAttribute("data-theme", theme);
  if (btn) {
    btn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("elevate-theme", next); } catch (e) {}
    });
  }
})();
