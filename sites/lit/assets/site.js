/* The Farmhouse ,  site.js. Scroll-scrub hero with NATIVE video src.
   No fetch, no blob, no loading ring ,  the browser streams the real file,
   so the scrub can never wedge. Touch devices get an autoplay loop. */
(function () {
  "use strict";
  var hero = document.getElementById("hero");
  var stage = document.getElementById("stage");
  var bands = Array.prototype.slice.call(document.querySelectorAll(".band"));
  var heroEl = document.querySelector(".hero");
  var nav = document.getElementById("nav");
  var navSolid = false;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  var useStatic = reduceMotion;

  function heroProgress() {
    var rect = heroEl.getBoundingClientRect();
    var scrollable = rect.height - window.innerHeight;
    if (scrollable <= 0) return 0;
    return Math.min(1, Math.max(0, (-rect.top) / (scrollable * 0.82))); /* completes at 82% of hero scroll, holds the final frame for the afterglow */
  }

  function startMobileLoop() {
    hero.autoplay = true;
    hero.loop = true;
    hero.muted = true;
    (function attempt() {
      var p = hero.play();
      if (p && p.catch) p.catch(function () { setTimeout(attempt, 500); });
    })();
    stage.classList.add("video-ready");
  }

  var bandsCfg = bands.map(function (b) {
    var v = b.getAttribute("data-band").split(",").map(Number);
    return { el: b, a: v[0], b: v[1], lastOp: -1, lastK: -1 };
  });
  function smoothstep(p, e0, e1) {
    var t = Math.min(1, Math.max(0, (p - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  }
  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function updateCaptions(p) {
    for (var i = 0; i < bandsCfg.length; i++) {
      var c = bandsCfg[i], a = c.a, b = c.b;
      var f = Math.min(0.02, (b - a) / 3);
      var op = smoothstep(p, a, a + f) * (1 - smoothstep(p, b - f, b));
      if (i === 0) op = 1 - smoothstep(p, b - f, b);
      if (i === bandsCfg.length - 1) op = smoothstep(p, a, a + f);
      if (Math.abs(op - c.lastOp) > 0.004) { c.lastOp = op; c.el.style.opacity = op.toFixed(3); }
      if (op > 0) {
        var k = clamp((p - a) / Math.min(0.025, (b - a) * 0.35), 0, 1);
        if (Math.abs(k - c.lastK) > 0.008) { c.lastK = k; c.el.style.setProperty("--k", k.toFixed(3)); }
      }
    }
  }

  var lastApplied = -1;
  function applyScrub(t) {
    if (!hero || !hero.duration || hero.duration === Infinity) return;
    if (useStatic || isTouch) return;
    var d = hero.duration;
    var nt = clamp(t, 0, Math.max(0, d - 0.05));
    nt = Math.round(nt * 30) / 30; /* frame-quantize: every seek lands exactly on a video frame */
    if (Math.abs(nt - lastApplied) < 0.0005) return;
    lastApplied = nt;
    try { hero.currentTime = nt; } catch (e) {}
  }

  var target = 0, shown = 0, rafId = null, lastTick = 0, heroOnScreen = true;
  function tick(now) {
    var dt = Math.min(100, now - (lastTick || now));
    lastTick = now;
    if (Math.abs(target - shown) > 0.03) {
      shown = target; /* fast scroll: position-faithful, always exactly the frame your scroll position is at */
    } else {
      var k = 0.35;
      shown += (target - shown) * (1 - Math.pow(1 - k, dt / 16.667));
    }
    if (Math.abs(target - shown) < 0.0006) {
      shown = target; rafId = null; lastTick = 0;
      applyScrub(shown * hero.duration); updateCaptions(shown);
      return;
    }
    rafId = requestAnimationFrame(tick);
    applyScrub(shown * hero.duration); updateCaptions(shown);
  }
  function onScroll() {
    target = heroProgress();
    if (useStatic) { updateCaptions(target); }
    if (rafId === null && heroOnScreen && !useStatic && !isTouch) rafId = requestAnimationFrame(tick);
    var solid = window.scrollY > 40;
    if (solid !== navSolid) { navSolid = solid; nav.classList.toggle("nav--solid", solid); }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  new IntersectionObserver(function (entries) {
    heroOnScreen = entries[0].isIntersecting;
    if (!heroOnScreen && rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
  }).observe(heroEl);

  if (!hero) { onScroll(); return; }

  function ready() {
    stage.classList.add("video-ready");
    applyScrub(heroProgress() * hero.duration);
    if (isTouch) { startMobileLoop(); return; }
    if (!useStatic && rafId === null && heroOnScreen) rafId = requestAnimationFrame(tick);
  }

  if (useStatic) {
    stage.classList.add("video-ready");
    updateCaptions(0.8);
    onScroll();
    return;
  }

  if (hero.readyState >= 3) { ready(); }
  else {
    hero.addEventListener("canplay", ready, { once: true });
    hero.addEventListener("canplaythrough", ready, { once: true });
    // safety: if the browser never fires canplay (rare), settle on the poster + captions
    setTimeout(function () {
      if (!stage.classList.contains("video-ready")) {
        stage.classList.add("video-ready");
        updateCaptions(heroProgress());
        if (isTouch) startMobileLoop();
      }
    }, 6000);
  }

  updateCaptions(0);
  onScroll();
})();