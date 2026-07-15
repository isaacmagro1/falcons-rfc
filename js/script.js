/* ==========================================================================
   FALCONS RFC — script.js
   Vanilla JS, no dependencies.

   Contents:
     1. Utilities & config
     2. Data loading (fetch data/*.json, inline <script> fallback for file://)
     3. Fixtures — featured panel, rail, hero card
     4. Fixture rail — arrows, drag, snap
     5. Sponsors — spotlight + rolling marquee
     6. The Club — about, facts, honours, social links
     7. Chrome — header, menu overlay, progress, parallax, reveals,
        counters, scrollspy

   Testing tip: append ?date=YYYY-MM-DD to the URL to preview any day,
   e.g. index.html?date=2026-10-10 shows the TODAY'S MATCH state for MD1.
   ========================================================================== */

(function () {
  "use strict";

  /* ------------------------------------------------------------------------
     1. UTILITIES & CONFIG
     ------------------------------------------------------------------------ */

  var PATHS = {
    matches: "data/matches.json",
    sponsors: "data/sponsors.json",
    teamInfo: "data/team-info.json",
    opponentLogos: "assets/img/opponents/",
    falconsMark: "assets/img/falcons-mark.png"
  };

  var REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /** Escape a string for safe interpolation into innerHTML templates. */
  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /**
   * Today's date as "YYYY-MM-DD" in the visitor's local timezone.
   * A ?date=YYYY-MM-DD query param overrides it for testing.
   */
  function todayISO() {
    var override = new URLSearchParams(window.location.search).get("date");
    if (override && /^\d{4}-\d{2}-\d{2}$/.test(override)) {
      return override;
    }
    var now = new Date();
    return (
      now.getFullYear() +
      "-" + String(now.getMonth() + 1).padStart(2, "0") +
      "-" + String(now.getDate()).padStart(2, "0")
    );
  }

  /** "2026-10-10" -> "Sat 10 Oct 2026" (parsed as local date, not UTC). */
  function formatDate(iso) {
    var p = iso.split("-").map(Number);
    var d = new Date(p[0], p[1] - 1, p[2]);
    return d.toLocaleDateString("en-GB", {
      weekday: "short", day: "numeric", month: "short", year: "numeric"
    });
  }

  /** "Kavallieri" -> "kavallieri" -> matching logo path. */
  function opponentLogoPath(name) {
    var slug = String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return PATHS.opponentLogos + slug + ".png";
  }

  /** "The San Paolo" -> "SP" (initials for monogram tiles). */
  function initials(name) {
    var words = String(name).replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).filter(Boolean);
    var skip = { the: 1, and: 1, of: 1 };
    var letters = words
      .filter(function (w) { return !skip[w.toLowerCase()]; })
      .map(function (w) { return w[0].toUpperCase(); });
    return (letters.slice(0, 2).join("")) || "?";
  }

  /** Swap broken opponent logos inside root for initials tiles. */
  function attachLogoFallbacks(root) {
    root.querySelectorAll("img[data-fallback]").forEach(function (img) {
      img.addEventListener("error", function () {
        var tile = document.createElement("span");
        tile.className = "match-team__initials";
        tile.setAttribute("aria-hidden", "true");
        tile.textContent = img.getAttribute("data-fallback");
        img.replaceWith(tile);
      });
    });
  }

  /* ------------------------------------------------------------------------
     2. DATA LOADING
     fetch() is the source of truth; when it is unavailable (opening
     index.html straight from disk) we fall back to the inline JSON copy
     embedded in index.html.
     ------------------------------------------------------------------------ */

  function fetchJSON(url) {
    return fetch(url).then(function (res) {
      if (!res.ok) { throw new Error(url + " -> HTTP " + res.status); }
      return res.json();
    });
  }

  function loadData() {
    return Promise.all([
      fetchJSON(PATHS.matches),
      fetchJSON(PATHS.sponsors),
      fetchJSON(PATHS.teamInfo)
    ]).then(function (results) {
      return { matches: results[0], sponsors: results[1], teamInfo: results[2] };
    }).catch(function (err) {
      var inline = document.getElementById("fallback-data");
      if (inline) {
        console.info("Falcons RFC: using inline data fallback (" + err.message + ")");
        return JSON.parse(inline.textContent);
      }
      throw err;
    });
  }

  /* ------------------------------------------------------------------------
     3. FIXTURES
     ------------------------------------------------------------------------ */

  var ICONS = {
    clock: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    pin: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 21s-6.5-5.5-6.5-10.3a6.5 6.5 0 0 1 13 0C18.5 15.5 12 21 12 21Z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="10.5" r="2.2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>'
  };

  /** Add status ("today" | "upcoming" | "past") relative to the given day. */
  function categorise(matches, today) {
    return matches.map(function (m) {
      var status = m.date === today ? "today" : (m.date > today ? "upcoming" : "past");
      return Object.assign({}, m, { status: status });
    });
  }

  function teamHTML(name, logoSrc) {
    var media;
    if (logoSrc) {
      // data-fallback lets the error handler swap in an initials tile
      media = '<img class="match-team__logo" src="' + esc(logoSrc) + '" alt="" ' +
              'loading="lazy" data-fallback="' + esc(initials(name)) + '" />';
    } else {
      media = '<span class="match-team__initials" aria-hidden="true">' +
              esc(initials(name)) + "</span>";
    }
    return (
      '<div class="match-team">' + media +
      '<span class="match-team__name">' + esc(name) + "</span></div>"
    );
  }

  function teamsBlockHTML(m) {
    var opponentName = m.opponent || "Finalist TBC";
    var opponentLogo = m.opponent ? opponentLogoPath(m.opponent) : null;
    var ko = m.time ? esc(m.time) : "KO TBC";
    return (
      teamHTML("Falcons", PATHS.falconsMark) +
      '<span class="match-ko">' + ko +
        '<span class="visually-hidden"> — Falcons versus ' + esc(opponentName) + "</span></span>" +
      teamHTML(opponentName, opponentLogo)
    );
  }

  /** The big "next up" panel at the top of the fixtures section. */
  function featuredCardHTML(m) {
    var isToday = m.status === "today";
    return (
      '<article class="featured-card' + (isToday ? " featured-card--today" : "") + ' reveal"' +
        (isToday ? ' aria-label="Today’s match"' : "") + ">" +
        "<div>" +
          '<span class="featured-card__badge">' + (isToday ? "Today’s match" : "Next up") + "</span>" +
          '<p class="featured-card__comp">' + esc(m.competition) +
            (m.round ? " • " + esc(m.round) : "") + "</p>" +
          '<p class="featured-card__date">' + esc(formatDate(m.date)) + "</p>" +
          '<div class="featured-card__meta">' +
            "<span>" + ICONS.clock + (m.time ? "Kick-off <strong>&nbsp;" + esc(m.time) + "</strong>" : "Kick-off TBC") + "</span>" +
            "<span>" + ICONS.pin + esc(m.venue || "Venue TBC") + "</span>" +
          "</div>" +
        "</div>" +
        '<div class="featured-card__teams">' + teamsBlockHTML(m) + "</div>" +
      "</article>"
    );
  }

  /** Compact card for the horizontal rail. */
  function railCardHTML(m) {
    return (
      '<li class="reveal"><article class="match-card">' +
        '<span class="match-card__comp">' + esc(m.competition) +
          (m.round ? " • " + esc(m.round) : "") + "</span>" +
        '<span class="match-card__date">' + esc(formatDate(m.date)) + "</span>" +
        '<div class="match-card__teams">' + teamsBlockHTML(m) + "</div>" +
        '<span class="match-card__venue">' + ICONS.pin +
          esc(m.venue || "Venue TBC") + "</span>" +
      "</article></li>"
    );
  }

  /** The docked match card in the hero. */
  function renderHeroCard(m) {
    var card = document.getElementById("hero-next");
    if (!card || !m) { return; }
    var isToday = m.status === "today";
    card.innerHTML =
      '<p class="hero-card__label' + (isToday ? " hero-card__label--today" : "") + '">' +
        (isToday ? "Today’s match" : "Next match") + "</p>" +
      '<p class="hero-card__comp">' + esc(m.competition) +
        (m.round ? " • " + esc(m.round) : "") + "</p>" +
      '<div class="hero-card__teams">' + teamsBlockHTML(m) + "</div>" +
      '<div class="hero-card__meta">' +
        "<span><strong>" + esc(formatDate(m.date)) + "</strong></span>" +
        "<span>" + esc(m.venue || "Venue TBC") + "</span>" +
      "</div>" +
      '<a class="hero-card__link" href="#matches">Full fixture list &rarr;</a>';
    attachLogoFallbacks(card);
    card.hidden = false;
  }

  function renderMatches(data, today) {
    var featured = document.getElementById("match-featured");
    var railWrap = document.getElementById("matches-rail-wrap");
    var rail = document.getElementById("matches-rail");
    var controls = document.getElementById("rail-controls");
    var note = document.getElementById("matches-note");
    if (!featured || !rail) { return; }

    var all = categorise(data.matches || [], today);
    var visible = all
      .filter(function (m) { return m.status !== "past"; })
      .sort(function (a, b) {
        // Today's match always leads, then soonest first
        if (a.status === "today" && b.status !== "today") { return -1; }
        if (b.status === "today" && a.status !== "today") { return 1; }
        return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
      });

    if (visible.length === 0) {
      featured.innerHTML =
        '<div class="matches-empty reveal"><strong>Season complete</strong>' +
        "New fixtures land here as soon as they are announced. Follow us on social for the news first.</div>";
      if (railWrap) { railWrap.hidden = true; }
    } else {
      featured.innerHTML = featuredCardHTML(visible[0]);
      var rest = visible.slice(1);
      if (rest.length) {
        rail.innerHTML = rest.map(railCardHTML).join("");
        if (controls) { controls.hidden = rest.length < 3; }
        initRail();
      } else if (railWrap) {
        railWrap.hidden = true;
      }
      renderHeroCard(visible[0]);
    }
    attachLogoFallbacks(featured);
    attachLogoFallbacks(rail);

    var played = all.length - visible.length;
    if (note && played > 0) {
      note.textContent = played + " played fixture" + (played === 1 ? "" : "s") +
        " hidden — up the Falcons.";
      note.hidden = false;
    }

    // The fixtures stat mirrors the real fixture list
    var stat = document.querySelector('[data-stat="fixtures"]');
    if (stat && all.length) {
      stat.setAttribute("data-count", String(all.length));
      stat.textContent = String(all.length);
    }
  }

  /* ------------------------------------------------------------------------
     4. FIXTURE RAIL — arrow buttons, mouse drag, native touch scroll
     ------------------------------------------------------------------------ */

  function initRail() {
    var track = document.getElementById("matches-rail");
    var prev = document.getElementById("rail-prev");
    var next = document.getElementById("rail-next");
    if (!track) { return; }

    function stepWidth() {
      var card = track.querySelector("li");
      return card ? card.getBoundingClientRect().width + 16 : 320;
    }

    function updateButtons() {
      if (!prev || !next) { return; }
      var max = track.scrollWidth - track.clientWidth;
      prev.disabled = track.scrollLeft <= 4;
      next.disabled = track.scrollLeft >= max - 4;
    }

    function scrollByStep(dir) {
      track.scrollBy({
        left: dir * stepWidth(),
        behavior: REDUCED_MOTION ? "auto" : "smooth"
      });
    }

    if (prev) { prev.addEventListener("click", function () { scrollByStep(-1); }); }
    if (next) { next.addEventListener("click", function () { scrollByStep(1); }); }
    track.addEventListener("scroll", updateButtons, { passive: true });
    window.addEventListener("resize", updateButtons);
    updateButtons();

    // Mouse drag (touch already scrolls natively)
    var startX = 0, startScroll = 0, dragging = false, moved = false;
    track.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse" || e.button !== 0) { return; }
      dragging = true;
      moved = false;
      startX = e.clientX;
      startScroll = track.scrollLeft;
      track.setPointerCapture(e.pointerId);
    });
    track.addEventListener("pointermove", function (e) {
      if (!dragging) { return; }
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 6) {
        moved = true;
        track.classList.add("is-dragging");
      }
      if (moved) { track.scrollLeft = startScroll - dx; }
    });
    function endDrag() {
      if (!dragging) { return; }
      dragging = false;
      track.classList.remove("is-dragging"); // snap re-engages and settles
    }
    track.addEventListener("pointerup", endDrag);
    track.addEventListener("pointercancel", endDrag);
    track.addEventListener("dragstart", function (e) { e.preventDefault(); });
  }

  /* ------------------------------------------------------------------------
     5. SPONSORS — spotlight + rolling marquee
     ------------------------------------------------------------------------ */

  function renderSpotlight(main) {
    var host = document.getElementById("sponsor-spotlight");
    if (!host || !main) { return; }
    var media = main.logo
      ? '<img src="' + esc(main.logo) + '" alt="' + esc(main.name) + ' logo" loading="lazy" />'
      : '<span class="spotlight-card__mono" aria-hidden="true">' + esc(initials(main.name)) + "</span>";
    host.innerHTML =
      '<div class="spotlight-card reveal">' + media +
        "<div>" +
          '<p class="spotlight-card__label">Main Sponsor</p>' +
          '<p class="spotlight-card__name">' + esc(main.name) + "</p>" +
          '<p class="spotlight-card__tag">' + esc(main.tagline || "") + "</p>" +
        "</div>" +
      "</div>";
  }

  function sponsorItemHTML(s) {
    var name = s.website
      ? '<a class="sponsor-item__name" href="' + esc(s.website) + '" target="_blank" rel="noopener">' + esc(s.name) + "</a>"
      : '<span class="sponsor-item__name">' + esc(s.name) + "</span>";
    return (
      '<li class="sponsor-item">' + name +
      '<span class="sponsor-item__tag">' + esc(s.tagline || "") + "</span></li>"
    );
  }

  /**
   * Build the partner marquee: one real set for screen readers/keyboard,
   * then enough aria-hidden copies that the -50% keyframe loops seamlessly
   * at any viewport width. Speed is normalised to px/s, so the rail rolls
   * at the same pace regardless of how many partners there are.
   */
  function renderSponsorMarquee(partners) {
    var marquee = document.getElementById("sponsor-marquee");
    var track = document.getElementById("sponsor-track");
    var hint = document.querySelector(".sponsors-hint");
    if (!marquee || !track) { return; }
    if (!partners.length) {
      marquee.hidden = true;
      if (hint) { hint.hidden = true; }
      return;
    }

    var setHTML = partners.map(sponsorItemHTML).join("");
    track.innerHTML = setHTML;

    if (REDUCED_MOTION) { return; } // CSS wraps the single set into a grid

    var setWidth = track.scrollWidth;
    var copies = Math.max(1, Math.ceil(window.innerWidth / Math.max(setWidth, 1)));
    var half = "";
    for (var i = 0; i < copies; i++) { half += setHTML; }
    track.innerHTML = half + half;

    // Everything after the first set is decoration
    var items = track.querySelectorAll(".sponsor-item");
    items.forEach(function (item, idx) {
      if (idx >= partners.length) {
        item.setAttribute("aria-hidden", "true");
        var link = item.querySelector("a");
        if (link) { link.setAttribute("tabindex", "-1"); }
      }
    });

    track.style.animationDuration = ((setWidth * copies) / 70).toFixed(2) + "s";
  }

  function renderSponsors(data) {
    var list = (data.sponsors || []);
    renderSpotlight(list.find(function (s) { return s.tier === "main"; }));
    renderSponsorMarquee(list.filter(function (s) { return s.tier !== "main"; }));
  }

  /** The hero ticker ships two copies in the HTML; on very wide screens
      clone them until one half fills the viewport, then normalise speed. */
  function initHeroMarquee() {
    var track = document.querySelector(".hero__marquee .marquee__track");
    if (!track || REDUCED_MOTION) { return; }
    var half = track.scrollWidth / 2;
    var copies = Math.max(1, Math.ceil(window.innerWidth / Math.max(half, 1)));
    if (copies > 1) {
      var html = track.innerHTML;
      for (var i = 1; i < copies; i++) { track.innerHTML += html; }
    }
    track.style.animationDuration = ((half * copies) / 55).toFixed(2) + "s";
  }

  /* ------------------------------------------------------------------------
     6. THE CLUB
     ------------------------------------------------------------------------ */

  var SOCIAL_ICONS = {
    instagram: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.2" cy="6.8" r="1.3" fill="currentColor"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M14 8.5V7a1.5 1.5 0 0 1 1.5-1.5H17V2.8h-2.6A3.9 3.9 0 0 0 10.5 6.7v1.8H8v3h2.5v9.7H14v-9.7h2.5l.5-3H14Z" fill="currentColor"/></svg>'
  };

  function socialLinkHTML(s) {
    var icon = SOCIAL_ICONS[String(s.platform).toLowerCase()] || "";
    return (
      '<a class="social-link" href="' + esc(s.url) + '" target="_blank" rel="noopener">' +
      icon + "<span>" + esc(s.handle || s.platform) + "</span></a>"
    );
  }

  function renderClub(info) {
    var about = document.getElementById("club-about");
    if (about && Array.isArray(info.about)) {
      about.innerHTML = info.about.map(function (p) {
        return '<p class="reveal">' + esc(p) + "</p>";
      }).join("");
    }

    var facts = document.getElementById("club-facts");
    if (facts) {
      var rows = [
        ["Location", info.location],
        ["Colours", info.colors],
        ["League", info.league],
        ["Cup", info.cup]
      ].filter(function (r) { return r[1]; });
      facts.innerHTML = rows.map(function (r) {
        return '<div class="club-fact reveal"><dt>' + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd></div>";
      }).join("");
    }

    var social = document.getElementById("club-social");
    if (social && Array.isArray(info.social)) {
      social.innerHTML = info.social.map(socialLinkHTML).join("");
    }

    var honours = document.getElementById("club-honours");
    if (honours && Array.isArray(info.honours)) {
      honours.innerHTML = info.honours.map(function (h) {
        return (
          '<li class="honour-row reveal">' +
          '<div><p class="honour-row__title">' + esc(h.title) + "</p>" +
          '<p class="honour-row__detail">' + esc(h.detail) + "</p></div></li>"
        );
      }).join("");
    }

    var footerSocial = document.querySelector("#footer-social ul");
    if (footerSocial && Array.isArray(info.social)) {
      footerSocial.innerHTML = info.social.map(function (s) {
        return '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' +
               esc(s.platform) + "</a></li>";
      }).join("");
    }
  }

  /* ------------------------------------------------------------------------
     7. CHROME — header, menu, progress, parallax, reveals, counters, spy
     ------------------------------------------------------------------------ */

  /** One rAF loop drives everything scroll-linked: header state,
      the progress bar and the parallax layers. */
  function initScrollLoop() {
    var header = document.querySelector(".site-header");
    var bar = document.getElementById("progress-bar");
    var layers = REDUCED_MOTION ? [] :
      Array.prototype.slice.call(document.querySelectorAll("[data-parallax]"));
    var ticking = false;

    function update() {
      ticking = false;
      var y = window.scrollY;

      if (header) { header.classList.toggle("is-scrolled", y > 24); }

      if (bar) {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.transform = "scaleX(" + (max > 0 ? Math.min(y / max, 1) : 0) + ")";
      }

      var vh = window.innerHeight;
      layers.forEach(function (el) {
        var parent = el.parentElement;
        var r = parent.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) { return; }
        var speed = parseFloat(el.getAttribute("data-parallax")) || 0.2;
        // Zero when the section is centred in the viewport; the layer lags
        // behind the scroll, clamped so it never exposes its own edge.
        var shift = -(r.top + r.height / 2 - vh / 2) * speed;
        var limit = r.height * 0.11;
        shift = Math.max(-limit, Math.min(limit, shift));
        el.style.transform = "translate3d(0," + shift.toFixed(1) + "px,0)";
      });
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  }

  /** Mobile full-screen menu. */
  function initMenu() {
    var burger = document.getElementById("nav-burger");
    var overlay = document.getElementById("menu-overlay");
    if (!burger || !overlay) { return; }

    function setOpen(open) {
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      document.body.style.overflow = open ? "hidden" : "";
      if (open) {
        overlay.hidden = false;
        // Next frame so the entrance transition actually runs
        window.requestAnimationFrame(function () {
          overlay.classList.add("is-open");
        });
      } else {
        overlay.classList.remove("is-open");
        window.setTimeout(function () {
          if (!overlay.classList.contains("is-open")) { overlay.hidden = true; }
        }, 340);
      }
    }

    burger.addEventListener("click", function () {
      setOpen(burger.getAttribute("aria-expanded") !== "true");
    });
    overlay.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () { setOpen(false); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && burger.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        burger.focus();
      }
    });
    window.matchMedia("(min-width: 768px)").addEventListener("change", function (q) {
      if (q.matches) { setOpen(false); }
    });
  }

  function initReveals() {
    var targets = document.querySelectorAll(".reveal, .t-line");
    if (REDUCED_MOTION || !("IntersectionObserver" in window)) {
      // CSS downgrades .is-visible to a plain 200ms fade under reduced motion
      targets.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      // Elements that enter the viewport together cascade in, 45ms apart
      // (capped so late items never feel like they are lagging).
      var visible = entries.filter(function (e) { return e.isIntersecting; });
      visible.forEach(function (entry, i) {
        entry.target.style.setProperty("--reveal-delay", Math.min(i * 45, 270) + "ms");
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    targets.forEach(function (el) { observer.observe(el); });
  }

  /** Count the stat numbers up when they scroll into view. */
  var countersStarted = false;
  function initCounters() {
    if (countersStarted) { return; }
    countersStarted = true;

    var nums = document.querySelectorAll(".stat__num [data-count]");
    if (!nums.length) { return; }
    if (REDUCED_MOTION || !("IntersectionObserver" in window)) { return; } // keep final values

    function animate(el) {
      var target = parseInt(el.getAttribute("data-count"), 10) || 0;
      var start = null;
      var DURATION = 1100;
      function frame(ts) {
        if (start === null) { start = ts; }
        var t = Math.min((ts - start) / DURATION, 1);
        var eased = 1 - Math.pow(1 - t, 3);
        el.textContent = String(Math.round(eased * target));
        if (t < 1) { window.requestAnimationFrame(frame); }
      }
      window.requestAnimationFrame(frame);
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        animate(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
    nums.forEach(function (el) {
      el.textContent = "0";
      observer.observe(el);
    });
  }

  function initFooterYear() {
    var el = document.getElementById("footer-year");
    if (el) { el.textContent = String(new Date().getFullYear()); }
  }

  /** Highlight the nav link for the section currently in view. */
  function initScrollSpy() {
    var links = document.querySelectorAll('.nav-links a[href^="#"]');
    if (!links.length || !("IntersectionObserver" in window)) { return; }
    var byId = {};
    links.forEach(function (l) { byId[l.getAttribute("href").slice(1)] = l; });

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        links.forEach(function (l) { l.removeAttribute("aria-current"); });
        var link = byId[entry.target.id];
        if (link) { link.setAttribute("aria-current", "true"); }
      });
      // Above the first section (hero): no section is current
      if (window.scrollY < window.innerHeight * 0.4) {
        links.forEach(function (l) { l.removeAttribute("aria-current"); });
      }
    }, { rootMargin: "-35% 0px -55% 0px" });

    Object.keys(byId).forEach(function (id) {
      var section = document.getElementById(id);
      if (section) { observer.observe(section); }
    });
  }

  /* ------------------------------------------------------------------------
     BOOT
     ------------------------------------------------------------------------ */

  document.addEventListener("DOMContentLoaded", function () {
    initScrollLoop();
    initMenu();
    initFooterYear();
    initScrollSpy();
    initHeroMarquee();

    loadData()
      .then(function (data) {
        renderMatches(data.matches, todayISO());
        renderSponsors(data.sponsors);
        renderClub(data.teamInfo);
        initReveals();
        initCounters();
      })
      .catch(function (err) {
        console.error("Falcons RFC: could not load site data.", err);
        var featured = document.getElementById("match-featured");
        if (featured) {
          featured.innerHTML =
            '<div class="matches-empty"><strong>Fixtures unavailable</strong>' +
            "Please refresh the page, or follow us on social for the latest fixtures.</div>";
        }
        initReveals();
        initCounters();
      });
  });
})();
