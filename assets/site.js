(function () {
  "use strict";
  var nav = document.getElementById("nav");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function onScroll() { if (nav) nav.classList.toggle("nav--solid", window.scrollY > 40); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var revealEls = Array.prototype.slice.call(document.querySelectorAll(".sec-head,.proof-strip,.grid>* ,.steps>* ,.start-card,.contact-strip,.faq-list"));
  if (!reduced && "IntersectionObserver" in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add("in"); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.08 });
    revealEls.forEach(function (element) { element.classList.add("reveal"); observer.observe(element); });
  }

  var modal = document.getElementById("modal");
  var body = document.getElementById("modalBody");
  var title = document.getElementById("modalTitle");
  var returnFocus = null;

  function closeModal() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.body.style.overflow = "";
    body.replaceChildren();
    if (returnFocus) returnFocus.focus();
  }

  function openPreview(link) {
    returnFocus = link;
    title.textContent = link.getAttribute("data-name") || "Website preview";
    var frame = document.createElement("iframe");
    frame.className = "modal-frame";
    frame.src = link.href;
    frame.title = title.textContent + " website preview";
    frame.loading = "eager";
    frame.addEventListener("load", function () {
      try { frame.contentWindow.addEventListener("keydown", function (event) { if (event.key === "Escape") closeModal(); }); } catch (error) {}
    });
    var chrome = document.createElement("div");
    chrome.className = "modal-chrome";
    var note = document.createElement("p");
    note.className = "modal-cap";
    note.textContent = "Interactive preview. Press Escape or use the close button to return.";
    var open = document.createElement("a");
    open.className = "btn btn-solid";
    open.href = link.href;
    open.target = "_blank";
    open.rel = "noopener";
    open.textContent = "Open in a new tab ↗";
    chrome.append(note, open);
    body.replaceChildren(frame, chrome);
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    modal.querySelector(".modal-x").focus();
  }

  document.querySelectorAll("a[data-preview]").forEach(function (link) {
    link.addEventListener("click", function (event) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      openPreview(link);
    });
  });
  document.querySelectorAll("[data-close]").forEach(function (button) { button.addEventListener("click", closeModal); });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeModal();
    if (event.key === "Tab" && modal && !modal.hidden) {
      var focusable = modal.querySelectorAll("button,a[href],iframe,[tabindex]:not([tabindex='-1'])");
      var first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
}());
