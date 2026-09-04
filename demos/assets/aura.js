/* Elevate Websites, shared cursor aura
   A soft glowing trail that follows the pointer. Subtle, premium, and
   respectful of reduced-motion / touch devices. */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && window.matchMedia('(pointer:fine)').matches;
  if (reduce || !fine) return;

  var layer = document.createElement('div');
  layer.setAttribute('aria-hidden', 'true');
  layer.style.cssText =
    'position:fixed;inset:0;pointer-events:none;z-index:2147483646;' +
    'mix-blend-mode:screen;';
  document.body.appendChild(layer);

  var glow = document.createElement('div');
  glow.style.cssText =
    'position:fixed;top:0;left:0;width:380px;height:380px;margin:-190px 0 0 -190px;' +
    'border-radius:50%;' +
    'background:radial-gradient(circle, rgba(120,240,225,.20), rgba(120,240,225,.08) 38%, rgba(120,240,225,0) 70%);' +
    'will-change:transform;';
  layer.appendChild(glow);

  var dot = document.createElement('div');
  dot.style.cssText =
    'position:fixed;top:0;left:0;width:7px;height:7px;margin:-3.5px 0 0 -3.5px;' +
    'border-radius:50%;background:#7af0e0;mix-blend-mode:difference;' +
    'will-change:transform;';
  document.body.appendChild(dot);

  var tx = window.innerWidth / 2, ty = window.innerHeight / 2;
  var gx = tx, gy = ty, dx = tx, dy = ty;
  var visible = false;

  window.addEventListener('mousemove', function (e) {
    tx = e.clientX; ty = e.clientY;
    if (!visible) { visible = true; gx = dx = tx; gy = dy = ty; }
    dot.style.opacity = '1';
    glow.style.opacity = '1';
  }, { passive: true });

  window.addEventListener('mouseleave', function () {
    dot.style.opacity = '0'; glow.style.opacity = '0';
  });
  document.addEventListener('mouseout', function (e) {
    if (!e.relatedTarget && !e.toElement) { dot.style.opacity = '0'; glow.style.opacity = '0'; }
  });

  (function loop() {
    gx += (tx - gx) * 0.14;
    gy += (ty - gy) * 0.14;
    dx += (tx - dx) * 0.35;
    dy += (ty - dy) * 0.35;
    glow.style.transform = 'translate(' + gx + 'px,' + gy + 'px)';
    dot.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    requestAnimationFrame(loop);
  })();
})();
