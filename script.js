(function () {
  "use strict";

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Footer year ----------
  var year = $("#year");
  if (year) year.textContent = new Date().getFullYear();

  // ---------- Theme toggle ----------
  var root = document.documentElement;
  var themeBtn = $("#themeToggle");

  function updateThemeLabel() {
    var dark = root.getAttribute("data-theme") === "dark";
    themeBtn.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
  }
  updateThemeLabel();

  themeBtn.addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch (e) { /* storage unavailable */ }
    updateThemeLabel();
  });

  // ---------- Mobile menu ----------
  var nav = $("#nav");
  var menuBtn = $("#menuBtn");

  function setMenu(open) {
    nav.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }
  menuBtn.addEventListener("click", function () { setMenu(!nav.classList.contains("open")); });
  $$("a", nav).forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });

  // ---------- Scroll: progress bar, header shadow, back-to-top ----------
  var progress = $("#progress");
  var header = $("#header");
  var toTop = $("#toTop");
  var ticking = false;

  function onScroll() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - doc.clientHeight;
    var ratio = max > 0 ? doc.scrollTop / max : 0;
    progress.style.transform = "scaleX(" + ratio + ")";
    header.classList.toggle("scrolled", doc.scrollTop > 8);
    toTop.classList.toggle("show", doc.scrollTop > 600);
    ticking = false;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  toTop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  });

  // ---------- Active nav link ----------
  var links = $$(".nav a");
  var sections = links
    .map(function (a) { return $(a.getAttribute("href")); })
    .filter(Boolean);

  if ("IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var id = "#" + entry.target.id;
          links.forEach(function (a) { a.classList.toggle("active", a.getAttribute("href") === id); });
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(function (s) { spy.observe(s); });
  }

  // ---------- Count-up numbers ----------
  function format(n, decimals) { return n.toFixed(decimals); }

  function countUp(el) {
    var target = parseFloat(el.getAttribute("data-target"));
    var decimals = parseInt(el.getAttribute("data-decimals") || "0", 10);
    if (reduceMotion) { el.textContent = format(target, decimals); return; }

    var duration = 1400;
    var start = performance.now();
    (function step(now) {
      var t = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = format(target * eased, decimals);
      if (t < 1) requestAnimationFrame(step);
    })(start);
  }

  var counters = $$(".count");
  if ("IntersectionObserver" in window) {
    var counterObs = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { countUp(entry.target); obs.unobserve(entry.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { counterObs.observe(el); });
  }

  // ---------- Project filter ----------
  var filters = $$(".filter");
  var projects = $$(".project");

  filters.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var f = btn.getAttribute("data-filter");
      filters.forEach(function (b) {
        var on = b === btn;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", String(on));
      });
      projects.forEach(function (p) {
        var show = f === "all" || p.getAttribute("data-cat") === f;
        p.classList.toggle("hide", !show);
        if (show) {
          p.classList.remove("pop-in");
          void p.offsetWidth; // restart animation
          p.classList.add("pop-in");
        }
      });
    });
  });

  // ---------- Toast ----------
  var toast = $("#toast");
  var toastTimer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 2400);
  }

  // ---------- Copy email ----------
  var copyBtn = $("#copyEmail");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      var email = $("#emailText").textContent.trim();

      function fallback() {
        var ta = document.createElement("textarea");
        ta.value = email;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        var ok = false;
        try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
        document.body.removeChild(ta);
        showToast(ok ? "Email copied" : "Could not copy. Please copy it manually.");
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email).then(
          function () { showToast("Email copied"); },
          fallback
        );
      } else {
        fallback();
      }
    });
  }

  // ---------- Contact form (opens the visitor's email app) ----------
  var form = $("#contactForm");
  var errorBox = $("#formError");

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var name = form.elements.name.value.trim();
      var email = form.elements.email.value.trim();
      var message = form.elements.message.value.trim();
      var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

      $$(".field", form).forEach(function (f) { f.classList.remove("invalid"); });

      var problem = "";
      if (!name) { problem = "Please enter your name."; form.elements.name.parentNode.classList.add("invalid"); }
      else if (!emailOk) { problem = "Please enter a valid email address."; form.elements.email.parentNode.classList.add("invalid"); }
      else if (!message) { problem = "Please write a message."; form.elements.message.parentNode.classList.add("invalid"); }

      if (problem) {
        errorBox.textContent = problem;
        errorBox.hidden = false;
        return;
      }
      errorBox.hidden = true;

      var subject = "Portfolio message from " + name;
      var body = message + "\n\n— " + name + " (" + email + ")";
      window.location.href =
        "mailto:Shohagrahmanoahidur@gmail.com" +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(body);

      showToast("Opening your email app");
      form.reset();
    });
  }
})();
