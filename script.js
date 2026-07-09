document.body.classList.add("js");

// --- Cinematic intro loader: counter ticks to 100%, then wipes up to reveal the page ---
// Animated with the Motion library (motion.dev) — vanilla, no React. Falls back to
// CSS + setInterval if the CDN module can't load (e.g. offline), so it never gets stuck.
(function () {
  var loader = document.getElementById("loader");
  if (!loader) return;

  var countEl = document.getElementById("loaderCount");
  var barFill = document.getElementById("loaderBar");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // lock scroll while the intro plays
  var htmlEl = document.documentElement;
  htmlEl.style.overflow = "hidden";
  document.body.style.overflow = "hidden";

  var MIN_MS = reduce ? 400 : 2200;   // keep the intro on screen at least this long
  var startTime = Date.now();
  var done = false;

  function render(v) {
    if (countEl) countEl.textContent = Math.round(v) + "%";
    if (barFill) barFill.style.width = v + "%";
  }

  function unlockScroll() {
    htmlEl.style.overflow = "";
    document.body.style.overflow = "";
  }

  function hide() { loader.style.display = "none"; }

  function scheduleWipe(wipeFn) {
    var wait = Math.max(0, MIN_MS - (Date.now() - startTime));
    setTimeout(wipeFn, wait);
  }

  // --- Motion-powered path -------------------------------------------------
  function runMotion(animate) {
    // counter + progress bar tied to a single 0 → 100 value tween
    animate(0, 100, {
      duration: reduce ? 0.4 : 2,
      ease: "easeOut",
      onUpdate: render,
      onComplete: function () { scheduleWipe(function () { wipeMotion(animate); }); }
    });
  }

  function wipeMotion(animate) {
    if (done) return;
    done = true;
    loader.style.pointerEvents = "none";
    loader.style.transition = "none";   // let Motion own the transform (avoid double-animating)
    unlockScroll();
    var controls = animate(loader,
      { y: ["0%", "-100%"] },
      { duration: reduce ? 0.4 : 1, ease: [0.76, 0, 0.24, 1] });
    if (controls && controls.finished) controls.finished.then(hide, hide);
    setTimeout(hide, 1600);             // safety
  }

  // --- CSS fallback path (no external library) -----------------------------
  function runFallback() {
    var progress = 0;
    var tick = setInterval(function () {
      progress += Math.random() * 10 + 2;   // uneven ticks feel more organic
      if (progress >= 100) {
        progress = 100;
        render(progress);
        clearInterval(tick);
        scheduleWipe(wipeFallback);
      } else {
        render(progress);
      }
    }, 110);
  }

  function wipeFallback() {
    if (done) return;
    done = true;
    loader.style.pointerEvents = "none";
    unlockScroll();
    loader.classList.add("done");
    loader.addEventListener("transitionend", hide, { once: true });
    setTimeout(hide, 1400);
  }

  // Load Motion, then run; fall back cleanly on any load error.
  import("https://cdn.jsdelivr.net/npm/motion@11/+esm")
    .then(function (motion) {
      window.__motionLoaded = true;
      runMotion(motion.animate);
    })
    .catch(function () { runFallback(); });

  // hard safety: never trap the page if everything above stalls
  setTimeout(function () {
    if (!done) { done = true; unlockScroll(); hide(); }
  }, 8000);
})();

// Hide the hero-video placeholder hint once a real video loads, and ensure it plays
var heroVideo = document.getElementById("heroVideo");
if (heroVideo) {
  heroVideo.addEventListener("loadeddata", function () {
    var hint = document.querySelector(".hero-video-hint");
    if (hint) hint.style.display = "none";
  });

  var tryPlay = function () {
    heroVideo.muted = true;
    var p = heroVideo.play();
    if (p && p.catch) p.catch(function () {});
  };
  heroVideo.addEventListener("canplay", tryPlay);
  tryPlay();
  // Fallback: start on first user interaction if autoplay was blocked
  var kick = function () {
    tryPlay();
    window.removeEventListener("scroll", kick);
    window.removeEventListener("pointerdown", kick);
  };
  window.addEventListener("scroll", kick, { passive: true });
  window.addEventListener("pointerdown", kick);
}

// Footer year
document.getElementById("year").textContent = new Date().getFullYear();

// Mobile menu toggle
var toggle = document.getElementById("menuToggle");
var nav = document.getElementById("nav");
if (toggle && nav) {
  toggle.addEventListener("click", function () {
    nav.classList.toggle("open");
  });
  nav.addEventListener("click", function (e) {
    if (e.target.closest("a")) nav.classList.remove("open");
  });
}

// --- Parallax: works drift upward at different speeds while scrolling ---
var works = Array.prototype.slice.call(document.querySelectorAll(".scatter .work"));
var isMobile = window.matchMedia("(max-width: 720px)").matches;
var ticking = false;

var INTENSITY = 1.8; // higher = more dramatic drift

function applyParallax() {
  var y = window.scrollY || window.pageYOffset;
  for (var i = 0; i < works.length; i++) {
    var speed = parseFloat(works[i].getAttribute("data-speed")) || 1;
    // speed < 1 lags behind (drifts down), speed > 1 races ahead (drifts up)
    var offset = y * (speed - 1) * INTENSITY;
    works[i].style.transform = "translateY(" + offset + "px)";
  }
  ticking = false;
}

if (works.length && !isMobile) {
  window.addEventListener("scroll", function () {
    if (!ticking) {
      window.requestAnimationFrame(applyParallax);
      ticking = true;
    }
  }, { passive: true });
  applyParallax();
}

// --- Wrap heading words so each snaps to red on hover ---
(function () {
  var els = document.querySelectorAll(
    ".tagline, .text-section h2, .work-meta .title, .services-list li, " +
    ".about-text p, .nav a, .footer-social a, .footer-left a");
  els.forEach(function (el) {
    var parts = el.textContent.split(/(\s+)/);
    el.textContent = "";
    parts.forEach(function (p) {
      if (p.trim() === "") {
        el.appendChild(document.createTextNode(p));
      } else {
        var span = document.createElement("span");
        span.className = "word";
        span.textContent = p;
        el.appendChild(span);
      }
    });
  });
})();

// --- Big centered title on hover ---
var hoverTitle = document.getElementById("hoverTitle");
var htName = hoverTitle ? hoverTitle.querySelector(".ht-name") : null;
var htCredit = hoverTitle ? hoverTitle.querySelector(".ht-credit") : null;

if (hoverTitle && !isMobile) {
  works.forEach(function (work) {
    work.addEventListener("mouseenter", function () {
      htName.textContent = work.getAttribute("data-title") || "";
      htCredit.textContent = work.getAttribute("data-credit") || "";
      hoverTitle.classList.add("show");
    });
    work.addEventListener("mouseleave", function () {
      hoverTitle.classList.remove("show");
    });
  });
}

// --- Hero video: grows from banner to full-screen background, blurs on scroll ---
var heroWrap = document.getElementById("heroWrap");
var heroVid = document.getElementById("heroVideo");
var workEl = document.getElementById("work");
var heroTick = false;

function updateHero() {
  var y = window.scrollY || window.pageYOffset;
  var vh = window.innerHeight;
  // grow completes by the time the works section is one viewport away
  var end = workEl ? Math.max(1, workEl.offsetTop - vh * 0.9) : vh;
  var p = Math.min(1, Math.max(0, y / end));

  // banner insets at rest -> 0 when full screen
  var top = 108 * (1 - p);
  var side = 32 * (1 - p);
  var bottom0 = vh - (108 + 0.58 * vh); // banner bottom inset at rest
  var bottom = bottom0 * (1 - p);
  var radius = 6 * (1 - p);
  heroWrap.style.clipPath =
    "inset(" + top + "px " + side + "px " + bottom + "px " + side + "px round " + radius + "px)";

  // blur ramps in quickly once scrolling begins; scrim darkens gradually
  var blur = Math.min(1, p / 0.22) * 11;
  heroWrap.style.setProperty("--hv-blur", blur + "px");
  heroWrap.style.setProperty("--hv-scrim", (p * 0.42).toFixed(3));

  heroTick = false;
}

if (heroWrap && !isMobile) {
  window.addEventListener("scroll", function () {
    if (!heroTick) {
      window.requestAnimationFrame(updateHero);
      heroTick = true;
    }
  }, { passive: true });
  window.addEventListener("resize", updateHero, { passive: true });
  updateHero();
}

// --- Logo shrinks as you start scrolling ---
var brandLogo = document.querySelector(".brand-logo");
var logoTick = false;

function updateLogo() {
  var y = window.scrollY || window.pageYOffset;
  var p = Math.min(1, y / 320);      // shrink over the first 320px of scroll
  var scale = 1 - p * 0.4;           // down to 60% size
  brandLogo.style.transform = "scale(" + scale + ")";
  logoTick = false;
}

if (brandLogo) {
  window.addEventListener("scroll", function () {
    if (!logoTick) {
      window.requestAnimationFrame(updateLogo);
      logoTick = true;
    }
  }, { passive: true });
  updateLogo();
}

// --- Showreel: framed video grows to fill the screen while scrolling the section ---
var showreelSec = document.getElementById("showreel");
var showreelFrame = document.getElementById("showreelFrame");
var showreelVid = document.getElementById("showreelVideo");
var showreelCaption = document.getElementById("showreelCaption");
var captionPopped = false;
var srTick = false;

function popCaption() {
  if (showreelCaption && !captionPopped) {
    showreelCaption.classList.add("pop");
    captionPopped = true;
  }
}

function updateShowreel() {
  var rect = showreelSec.getBoundingClientRect();
  var scrollable = showreelSec.offsetHeight - window.innerHeight;
  var p = Math.min(1, Math.max(0, (-rect.top) / Math.max(1, scrollable)));
  var w = 40 + p * 52;   // TV grows 40vw -> 92vw (height follows via aspect-ratio)
  showreelFrame.style.width = w + "vw";
  if (rect.top < window.innerHeight * 0.7) popCaption();
  srTick = false;
}

if (showreelSec && showreelFrame && !isMobile) {
  window.addEventListener("scroll", function () {
    if (!srTick) { window.requestAnimationFrame(updateShowreel); srTick = true; }
  }, { passive: true });
  window.addEventListener("resize", updateShowreel, { passive: true });
  updateShowreel();
}

// Fallback trigger for the caption pop (mobile / when the scrub isn't running)
if (showreelCaption && "IntersectionObserver" in window) {
  var capIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { popCaption(); capIO.unobserve(en.target); }
    });
  }, { threshold: 0.25 });
  capIO.observe(showreelCaption);
}

// Autoplay the showreel video + hide hint once it loads
if (showreelVid) {
  showreelVid.addEventListener("loadeddata", function () {
    var hint = document.querySelector(".showreel-hint");
    if (hint) hint.style.display = "none";
  });
  var srPlay = function () { showreelVid.muted = true; var p = showreelVid.play(); if (p && p.catch) p.catch(function () {}); };
  showreelVid.addEventListener("canplay", srPlay);
  srPlay();
}

// --- Click the TV to cycle through the three frames ---
var TVS = [
  { src: "tv.png",  ar: "614 / 427", screen: { l: 8.14, t: 9.6,  w: 64.66, h: 70.02 } },
  { src: "tv2.png", ar: "736 / 736", screen: { l: 17.93, t: 33.97, w: 49.05, h: 40.63 } },
  { src: "tv3.png", ar: "736 / 736", screen: { l: 17.66, t: 27.04, w: 65.76, h: 51.63 } }
];
var tvIndex = 0;
var showreelTvImg = showreelFrame ? showreelFrame.querySelector(".showreel-tv") : null;
var showreelScreen = showreelFrame ? showreelFrame.querySelector(".showreel-screen") : null;

function applyTV(i) {
  var tv = TVS[i];
  showreelFrame.style.aspectRatio = tv.ar;
  showreelScreen.style.left = tv.screen.l + "%";
  showreelScreen.style.top = tv.screen.t + "%";
  showreelScreen.style.width = tv.screen.w + "%";
  showreelScreen.style.height = tv.screen.h + "%";
  showreelTvImg.src = tv.src;
}

if (showreelFrame && showreelTvImg && showreelScreen) {
  showreelFrame.style.cursor = "pointer";
  applyTV(0);
  var showreelNote = document.getElementById("showreelNote");
  showreelFrame.addEventListener("click", function () {
    tvIndex = (tvIndex + 1) % TVS.length;
    applyTV(tvIndex);
    if (showreelNote) showreelNote.classList.add("hide");
  });
}

// --- About photo slides in from the left as the section scrolls into view ---
var aboutPhoto = document.getElementById("aboutPhoto");
var aboutSection = document.getElementById("about");
var aboutTick = false;

function updateAboutPhoto() {
  var r = aboutSection.getBoundingClientRect();
  var vh = window.innerHeight;
  // 0 when the section is just entering (top at bottom of viewport), 1 when well in view
  var prog = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.75)));
  var tx = (1 - prog) * -460; // starts far left, glides to rest
  aboutPhoto.style.transform = "translateX(" + tx + "px)";
  aboutPhoto.style.opacity = prog.toFixed(3);
  aboutTick = false;
}

if (aboutPhoto && aboutSection && !isMobile) {
  window.addEventListener("scroll", function () {
    if (!aboutTick) {
      window.requestAnimationFrame(updateAboutPhoto);
      aboutTick = true;
    }
  }, { passive: true });
  window.addEventListener("resize", updateAboutPhoto, { passive: true });
  updateAboutPhoto();
} else if (aboutPhoto) {
  // mobile: show it plainly
  aboutPhoto.style.transform = "none";
  aboutPhoto.style.opacity = "1";
}

// --- Heading drifts right, word by word, as you scroll (with click ticks) ---
var taglineEl = document.querySelector(".tagline");
var taglineWords = document.querySelectorAll(".tagline .word");
var headTick = false;

var lastStep = 0;
var TICK_STEP = 46; // px of scroll per notch
var PER_STEP = 20;  // px the farthest word advances per notch

function applyStep(step) {
  var n = taglineWords.length || 1;
  for (var i = 0; i < taglineWords.length; i++) {
    // later words advance further, so the line fans out to the right
    var amount = step * PER_STEP * ((i + 1) / n);
    taglineWords[i].style.transform = "translateX(" + amount + "px)";
  }
}

function updateHeadingShift() {
  var y = window.scrollY || window.pageYOffset;
  var step = Math.round(y / TICK_STEP); // quantize scroll into notches

  // Move only when a new notch is crossed
  if (step !== lastStep) {
    lastStep = step;
    applyStep(step);
  }
  headTick = false;
}

if (taglineWords.length) {
  window.addEventListener("scroll", function () {
    if (!headTick) {
      window.requestAnimationFrame(updateHeadingShift);
      headTick = true;
    }
  }, { passive: true });
  updateHeadingShift();
}

// --- Mascot slides in on scroll and shoves the "Portfolio" title off-frame ---
(function () {
  var mascot = document.getElementById("mascot");
  var heading = document.querySelector(".page-heading");
  var phText = document.querySelector(".ph-text");
  if (!mascot || !heading || !phText) return;
  if (window.matchMedia("(max-width: 720px)").matches) return;

  var END = 560;      // px of scroll over which the whole shove plays out
  var GAP = 40;       // extra travel so the title clears the right edge completely
  var CONTACT = 0.34; // fraction of the scroll spent walking in before contact
  var TOUCH = 16;     // px gap kept between the mascot and the title on contact
  var mTick = false;

  function mascotFrame() {
    var y = window.scrollY || window.pageYOffset;
    var p = Math.min(1, Math.max(0, y / END));
    var vw = window.innerWidth;
    var halfText = phText.getBoundingClientRect().width / 2;
    var mW = mascot.getBoundingClientRect().width || 180;

    var titleRestLeft = vw / 2 - halfText;     // title's left edge while centred
    var mStart = -(mW + 80);                   // parked off-screen left
    var mContact = titleRestLeft - TOUCH - mW; // mascot resting just left of the title

    var push, mx;
    if (p < CONTACT) {
      // Phase 1: mascot walks in from the left; title stays centred
      var q = p / CONTACT;
      push = 0;
      mx = mStart + (mContact - mStart) * q;
    } else {
      // Phase 2: mascot is in contact and shoves the title off to the right,
      // travelling far enough that the mascot itself also clears the frame.
      var q2 = (p - CONTACT) / (1 - CONTACT);
      var pushMax = vw / 2 + halfText + TOUCH + mW + GAP;
      push = q2 * pushMax;
      mx = mContact + push;                    // travel together, staying in contact
    }

    heading.style.transform = "translateX(" + push + "px)";
    mascot.style.transform = "translateX(" + mx + "px)";

    mTick = false;
  }

  window.addEventListener("scroll", function () {
    if (!mTick) { window.requestAnimationFrame(mascotFrame); mTick = true; }
  }, { passive: true });
  window.addEventListener("resize", mascotFrame, { passive: true });
  mascot.addEventListener("load", mascotFrame);
  mascotFrame();
})();

// --- Scroll-reveal: works fade in, sections fade + rise into view ---
works.forEach(function (w) { w.classList.add("fade-in"); });
document.querySelectorAll(".text-section, .site-footer").forEach(function (s) {
  s.classList.add("reveal");
});

var revealEls = document.querySelectorAll(".reveal, .fade-in");
if ("IntersectionObserver" in window) {
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) {
        en.target.classList.add("is-in");
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
  revealEls.forEach(function (el) { io.observe(el); });
} else {
  revealEls.forEach(function (el) { el.classList.add("is-in"); });
}

// --- Custom trailing cursor (desktop only) ---
if (!isMobile && window.matchMedia("(pointer: fine)").matches) {
  document.body.classList.add("custom-cursor");

  var cursor = document.createElement("div");
  cursor.className = "cursor";
  var cLabel = document.createElement("span");
  cLabel.className = "cursor-label";
  cLabel.textContent = "View";
  cursor.appendChild(cLabel);
  document.body.appendChild(cursor);

  var mx = window.innerWidth / 2, my = window.innerHeight / 2;
  var cx = mx, cy = my;

  window.addEventListener("mousemove", function (e) {
    mx = e.clientX;
    my = e.clientY;
  }, { passive: true });

  function cursorLoop() {
    cx += (mx - cx) * 0.2;
    cy += (my - cy) * 0.2;
    cursor.style.transform =
      "translate(" + cx + "px," + cy + "px) translate(-50%, -50%)";
    window.requestAnimationFrame(cursorLoop);
  }
  cursorLoop();

  // Enlarged cursor with a label over interactive targets
  function attachLabelCursor(el, label) {
    if (!el) return;
    el.addEventListener("mouseenter", function () {
      cLabel.textContent = label;
      cursor.classList.add("view");
    });
    el.addEventListener("mouseleave", function () { cursor.classList.remove("view"); });
  }
  works.forEach(function (work) { attachLabelCursor(work, "View"); });
  attachLabelCursor(document.getElementById("showreelFrame"), "Swap");

  // Hide when leaving the window
  document.addEventListener("mouseleave", function () { cursor.style.opacity = "0"; });
  document.addEventListener("mouseenter", function () { cursor.style.opacity = "1"; });
}

// --- Logo shatters like glass on click ---
var brand = document.querySelector(".brand");
var brandImg = document.querySelector(".brand-logo");
var shattering = false;

function buildTriangles(cols, rows) {
  var tris = [];
  for (var r = 0; r < rows; r++) {
    for (var c = 0; c < cols; c++) {
      var x0 = (c / cols) * 100, x1 = ((c + 1) / cols) * 100;
      var y0 = (r / rows) * 100, y1 = ((r + 1) / rows) * 100;
      tris.push([[x0, y0], [x1, y0], [x0, y1]]);
      tris.push([[x1, y0], [x1, y1], [x0, y1]]);
    }
  }
  return tris;
}

function shatterLogo() {
  if (shattering || !brandImg) return;
  shattering = true;

  var rect = brandImg.getBoundingClientRect();
  var bRect = brand.getBoundingClientRect();
  var w = rect.width, h = rect.height;

  var cont = document.createElement("div");
  cont.style.cssText =
    "position:absolute;left:" + (rect.left - bRect.left) + "px;top:" + (rect.top - bRect.top) +
    "px;width:" + w + "px;height:" + h + "px;pointer-events:none;z-index:5;";
  brand.style.position = "relative";
  brand.appendChild(cont);
  brandImg.style.visibility = "hidden";

  var tris = buildTriangles(5, 3);
  tris.forEach(function (t) {
    var poly = t.map(function (p) { return p[0].toFixed(1) + "% " + p[1].toFixed(1) + "%"; }).join(",");
    var sh = document.createElement("div");
    sh.style.cssText =
      "position:absolute;inset:0;background-image:url('logo.png');background-size:100% 100%;" +
      "background-repeat:no-repeat;-webkit-clip-path:polygon(" + poly + ");clip-path:polygon(" + poly + ");" +
      "transition:transform 0.95s cubic-bezier(.2,.55,.25,1),opacity 0.95s ease;will-change:transform,opacity;";
    cont.appendChild(sh);
    var cx = (t[0][0] + t[1][0] + t[2][0]) / 3;
    var cy = (t[0][1] + t[1][1] + t[2][1]) / 3;
    var dx = (cx - 50) / 50, dy = (cy - 50) / 50;
    var tx = dx * 70 + (Math.random() * 50 - 25);
    var ty = dy * 25 + 90 + Math.random() * 70; // gravity: pieces fall
    var rot = Math.random() * 160 - 80;
    sh._to = "translate(" + tx.toFixed(1) + "px," + ty.toFixed(1) + "px) rotate(" + rot.toFixed(1) + "deg) scale(0.55)";
  });

  // Force a reflow so the initial state is registered, then set targets to trigger the transition
  void cont.offsetWidth;
  Array.prototype.forEach.call(cont.children, function (sh) {
    sh.style.transform = sh._to;
    sh.style.opacity = "0";
  });

  setTimeout(function () {
    cont.remove();
    brandImg.style.visibility = "visible";
    shattering = false;
  }, 1050);
}

if (brand) {
  brand.addEventListener("click", function (e) {
    e.preventDefault();
    shatterLogo();
  });
}
