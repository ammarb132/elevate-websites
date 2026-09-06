(function () {
  "use strict";
  var root = document.documentElement;
  var tilt = document.getElementById("cloudTilt");
  var button = document.getElementById("themeBtn");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var effect = null;

  function setMode(mode) {
    root.setAttribute("data-bgmode", mode);
    if (button) {
      var light = mode === "light";
      button.setAttribute("aria-pressed", String(light));
      button.setAttribute("aria-label", light ? "Switch to a darker cloud background" : "Switch to a lighter cloud background");
    }
  }

  if (button) button.addEventListener("click", function () {
    setMode(root.getAttribute("data-bgmode") === "dark" ? "light" : "dark");
  });

  if (reduced || !fine || !tilt || !window.VANTA || !window.THREE) {
    root.classList.add("static-background");
    return;
  }

  try {
    effect = window.VANTA.CLOUDS({
      el: tilt,
      mouseControls: fine,
      touchControls: false,
      gyroControls: false,
      minHeight: 200,
      minWidth: 200,
      color: 0xff6b3d,
      backgroundColor: 0x0d0f16
    });
  } catch (error) {
    root.classList.add("static-background");
  }

  if (fine) {
    var tx = -14, cy = -14, ty = 0, py = 0, frame = 0;
    document.addEventListener("pointermove", function (event) {
      var ratio = event.clientY / window.innerHeight;
      tx = -16 + ratio * 22;
      ty = (0.5 - ratio) * 0.06 * window.innerHeight;
      if (!frame) frame = requestAnimationFrame(draw);
    }, { passive: true });
    function draw() {
      cy += (tx - cy) * 0.14;
      py += (ty - py) * 0.14;
      tilt.style.transform = "translateY(" + py.toFixed(2) + "px) rotateX(" + cy.toFixed(2) + "deg) scale(1.18)";
      if (Math.abs(tx - cy) > 0.05 || Math.abs(ty - py) > 0.5) frame = requestAnimationFrame(draw);
      else frame = 0;
    }
  }

  window.addEventListener("pagehide", function () { if (effect) effect.destroy(); }, { once: true });
}());
