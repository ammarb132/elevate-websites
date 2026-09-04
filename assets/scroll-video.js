/* Shared scroll-video controller for the six client previews.
   All scroll modes use continuous video playback instead of repeated seeking.
   A reversed companion clip keeps upward scrolling continuous too. */
(function () {
  "use strict";

  var hero = document.getElementById("hero");
  var stage = document.getElementById("stage");
  var heroEl = document.querySelector(".hero");
  var nav = document.getElementById("nav");
  var bands = Array.prototype.slice.call(document.querySelectorAll(".band"));
  if (!hero || !stage || !heroEl || !nav) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  var reverse = null;
  var reverseReady = false;
  var active = hero;
  var direction = 1;
  var switchToken = 0;
  var switching = false;
  var heroOnScreen = true;
  var targetProgress = 0;
  var animationRaf = null;
  var navSolid = false;
  var didReady = false;

  function clamp(value, low, high) {
    return Math.min(high, Math.max(low, value));
  }

  function heroProgress() {
    var rect = heroEl.getBoundingClientRect();
    var scrollable = rect.height - window.innerHeight;
    if (scrollable <= 0) return 0;
    return clamp((-rect.top) / (scrollable * 0.82), 0, 1);
  }

  function smoothstep(progress, start, end) {
    var value = clamp((progress - start) / (end - start), 0, 1);
    return value * value * (3 - 2 * value);
  }

  var bandsCfg = bands.map(function (band) {
    var range = band.getAttribute("data-band").split(",").map(Number);
    return { el: band, a: range[0], b: range[1], lastOp: -1, lastK: -1 };
  });

  function updateCaptions(progress) {
    for (var i = 0; i < bandsCfg.length; i++) {
      var config = bandsCfg[i];
      var fade = Math.min(0.02, (config.b - config.a) / 3);
      var opacity = smoothstep(progress, config.a, config.a + fade) *
        (1 - smoothstep(progress, config.b - fade, config.b));
      if (i === 0) opacity = 1 - smoothstep(progress, config.b - fade, config.b);
      if (i === bandsCfg.length - 1) opacity = smoothstep(progress, config.a, config.a + fade);
      if (Math.abs(opacity - config.lastOp) > 0.004) {
        config.lastOp = opacity;
        config.el.style.opacity = opacity.toFixed(3);
      }
      if (opacity > 0) {
        var reveal = clamp((progress - config.a) / Math.min(0.025, (config.b - config.a) * 0.35), 0, 1);
        if (Math.abs(reveal - config.lastK) > 0.008) {
          config.lastK = reveal;
          config.el.style.setProperty("--k", reveal.toFixed(3));
        }
      }
    }
  }

  function setVideoLayer(video, opacity) {
    video.style.position = "absolute";
    video.style.inset = "0";
    video.style.width = "100%";
    video.style.height = "100%";
    video.style.objectFit = "cover";
    video.style.transform = "translateZ(0)";
    video.style.willChange = "opacity";
    video.style.transition = "opacity 70ms linear";
    video.style.opacity = String(opacity);
  }

  function createReverseVideo() {
    var source = hero.querySelector("source");
    var sourcePath = source ? source.getAttribute("src") : hero.getAttribute("src");
    if (!sourcePath) return;

    reverse = document.createElement("video");
    reverse.id = "hero-reverse";
    reverse.muted = true;
    reverse.defaultMuted = true;
    reverse.playsInline = true;
    reverse.preload = "auto";
    reverse.tabIndex = -1;
    reverse.setAttribute("aria-hidden", "true");
    reverse.src = sourcePath.replace(/hero-scrub\.mp4([?#].*)?$/, "hero-scrub-reverse.mp4$1");
    setVideoLayer(reverse, 0);
    hero.parentNode.insertBefore(reverse, hero.nextSibling);

    reverse.addEventListener("canplay", function () {
      reverseReady = true;
    }, { once: true });
    reverse.addEventListener("error", function () {
      reverseReady = false;
    }, { once: true });
    reverse.load();
  }

  function visibleTime() {
    if (!hero.duration || hero.duration === Infinity) return 0;
    return direction === 1 ? active.currentTime : hero.duration - active.currentTime;
  }

  function scheduleTick() {
    if (animationRaf === null && heroOnScreen && !reduceMotion) {
      animationRaf = requestAnimationFrame(tick);
    }
  }

  function safelyPlay(video) {
    if (!video.paused) return;
    var promise = video.play();
    if (promise && promise.catch) promise.catch(function () {});
  }

  function switchDirection(nextDirection, atTime) {
    var incoming = nextDirection === 1 ? hero : reverse;
    if (!incoming || (nextDirection === -1 && !reverseReady)) return false;
    if (incoming === active) {
      direction = nextDirection;
      return true;
    }

    switching = true;
    var token = ++switchToken;
    var seekTime = nextDirection === 1 ? atTime : hero.duration - atTime;
    seekTime = clamp(seekTime, 0, Math.max(0, hero.duration - 0.02));
    incoming.pause();

    var finished = false;
    function finishSwitch() {
      if (finished || token !== switchToken) return;
      finished = true;
      active.pause();
      active.style.opacity = "0";
      incoming.style.opacity = "1";
      active = incoming;
      direction = nextDirection;
      switching = false;
      scheduleTick();
    }

    incoming.addEventListener("seeked", finishSwitch, { once: true });
    try {
      incoming.currentTime = seekTime;
    } catch (error) {
      switching = false;
      return false;
    }
    setTimeout(finishSwitch, 140);
    return true;
  }

  function tick() {
    animationRaf = null;
    if (!heroOnScreen || reduceMotion || !hero.duration || hero.duration === Infinity) return;
    if (switching) {
      scheduleTick();
      return;
    }

    var targetTime = clamp(targetProgress * hero.duration, 0, Math.max(0, hero.duration - 0.02));
    var currentTime = visibleTime();
    var error = targetTime - currentTime;
    var distance = Math.abs(error);

    if (distance < 0.012) {
      active.pause();
      return;
    }

    var wantedDirection = error > 0 ? 1 : -1;
    if (wantedDirection !== direction) {
      if (!switchDirection(wantedDirection, currentTime)) {
        active.pause();
        try {
          hero.currentTime = targetTime;
        } catch (seekError) {}
      }
      scheduleTick();
      return;
    }

    /* Playback preserves the browser's sequential decoder. The proportional
       rate catches the scroll position quickly and slows before overshooting. */
    var rate = clamp(distance * 8, 0.35, 3.5);
    if (Math.abs(active.playbackRate - rate) > 0.04) active.playbackRate = rate;
    safelyPlay(active);
    scheduleTick();
  }

  function onScroll() {
    targetProgress = heroProgress();
    updateCaptions(targetProgress);
    scheduleTick();

    var solid = window.scrollY > 40;
    if (solid !== navSolid) {
      navSolid = solid;
      nav.classList.toggle("nav--solid", solid);
    }
  }

  /* iOS permits muted inline media after a real touch. Unlock it there, then
     the same continuous forward/reverse controller handles scroll direction. */
  function unlockTouchPlayback() {
    if (!isTouch) return;
    hero.muted = true;
    hero.defaultMuted = true;
    hero.setAttribute("muted", "");
    hero.setAttribute("playsinline", "");
    safelyPlay(active);
  }

  function ready() {
    if (didReady) return;
    didReady = true;
    stage.classList.add("video-ready");
    targetProgress = heroProgress();
    updateCaptions(targetProgress);

    setVideoLayer(hero, 1);
    try {
      hero.currentTime = targetProgress * hero.duration;
    } catch (error) {}
    scheduleTick();
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  new IntersectionObserver(function (entries) {
    heroOnScreen = entries[0].isIntersecting;
    if (!heroOnScreen) {
      active.pause();
      if (animationRaf !== null) cancelAnimationFrame(animationRaf);
      animationRaf = null;
      return;
    }
    onScroll();
  }).observe(heroEl);

  if (reduceMotion) {
    stage.classList.add("video-ready");
    updateCaptions(0.8);
    return;
  }

  createReverseVideo();

  if (isTouch) {
    document.addEventListener("pointerdown", unlockTouchPlayback, { once: true, passive: true });
    document.addEventListener("touchstart", unlockTouchPlayback, { once: true, passive: true });
  }

  if (hero.readyState >= 3) ready();
  else {
    hero.addEventListener("canplay", ready, { once: true });
    hero.addEventListener("canplaythrough", ready, { once: true });
    setTimeout(function () {
      if (!stage.classList.contains("video-ready")) {
        stage.classList.add("video-ready");
        updateCaptions(heroProgress());
      }
    }, 6000);
  }

  updateCaptions(0);
  onScroll();
})();
