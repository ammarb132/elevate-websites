/* Elevate Websites — gold pointer trail.
   Fine-pointer only, reduced-motion aware, and idle-paused to avoid a
   permanent animation loop beside the cloud background. */
(function () {
  'use strict';

  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!finePointer.matches || reduceMotion.matches) return;

  var canvas = document.createElement('canvas');
  canvas.id = 'cursor-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483000;width:100vw;height:100vh';
  document.body.appendChild(canvas);

  var ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  var DPR = Math.min(window.devicePixelRatio || 1, 1.25);
  var pointer = { x: innerWidth / 2, y: innerHeight / 2 };
  var trails = [];
  var raf = 0;
  var lastMove = 0;
  var hidden = false;
  var TRAIL_COUNT = 12;
  var NODE_COUNT = 34;

  function Node(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
  }

  function Trail(index) {
    this.spring = 0.38 + (index / TRAIL_COUNT) * 0.035;
    this.friction = 0.48 + (index % 3) * 0.004;
    this.nodes = [];
    for (var i = 0; i < NODE_COUNT; i++) this.nodes.push(new Node(pointer.x, pointer.y));
  }

  Trail.prototype.update = function () {
    var spring = this.spring;
    var node = this.nodes[0];
    node.vx += (pointer.x - node.x) * spring;
    node.vy += (pointer.y - node.y) * spring;

    for (var i = 0; i < this.nodes.length; i++) {
      node = this.nodes[i];
      if (i > 0) {
        var previous = this.nodes[i - 1];
        node.vx += (previous.x - node.x) * spring + previous.vx * 0.25;
        node.vy += (previous.y - node.y) * spring + previous.vy * 0.25;
      }
      node.vx *= this.friction;
      node.vy *= this.friction;
      node.x += node.vx;
      node.y += node.vy;
      spring *= 0.98;
    }
  };

  Trail.prototype.draw = function () {
    var nodes = this.nodes;
    ctx.beginPath();
    ctx.moveTo(nodes[0].x, nodes[0].y);
    for (var i = 1; i < nodes.length - 2; i++) {
      var node = nodes[i];
      var next = nodes[i + 1];
      ctx.quadraticCurveTo(node.x, node.y, (node.x + next.x) / 2, (node.y + next.y) / 2);
    }
    var penultimate = nodes[nodes.length - 2];
    var last = nodes[nodes.length - 1];
    ctx.quadraticCurveTo(penultimate.x, penultimate.y, last.x, last.y);
    ctx.stroke();
  };

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 1.25);
    canvas.width = Math.round(innerWidth * DPR);
    canvas.height = Math.round(innerHeight * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function draw(now) {
    raf = 0;
    if (hidden || reduceMotion.matches || !finePointer.matches) {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      return;
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'hsla(45, 96%, 64%, .34)';
    ctx.lineWidth = 1.65;
    for (var i = 0; i < trails.length; i++) {
      trails[i].update();
      trails[i].draw();
    }

    if (now - lastMove < 850) raf = requestAnimationFrame(draw);
    else ctx.clearRect(0, 0, innerWidth, innerHeight);
  }

  function wake() {
    if (!raf) raf = requestAnimationFrame(draw);
  }

  function onMove(event) {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    lastMove = performance.now();
    wake();
  }

  for (var i = 0; i < TRAIL_COUNT; i++) trails.push(new Trail(i));
  resize();
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('mousemove', onMove, { passive: true });
  document.addEventListener('visibilitychange', function () {
    hidden = document.hidden;
    if (hidden && raf) cancelAnimationFrame(raf);
    raf = 0;
  });
  reduceMotion.addEventListener('change', wake);
  finePointer.addEventListener('change', wake);
}());
