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

  /** Home side renders on the left, away side on the right (m.home === false
      means Falcons are away, so they take the right slot). Unknown → left. */
  function teamsBlockHTML(m) {
    var opponentName = m.opponent || "Finalist TBC";
    var opponentLogo = m.opponent ? opponentLogoPath(m.opponent) : null;
    var ko = m.time ? esc(m.time) : "KO TBC";
    var falcons = teamHTML("Falcons", PATHS.falconsMark);
    var opponent = teamHTML(opponentName, opponentLogo);
    var away = m.home === false;
    var reading = away
      ? esc(opponentName) + " versus Falcons"
      : "Falcons versus " + esc(opponentName);
    return (
      (away ? opponent : falcons) +
      '<span class="match-ko">' + ko +
        '<span class="visually-hidden"> — ' + reading + "</span></span>" +
      (away ? falcons : opponent)
    );
  }

  /** "Malta Rugby Championship • Matchday 3 • Away" */
  function compLine(m) {
    return esc(m.competition) +
      (m.round ? " • " + esc(m.round) : "") +
      (m.home === true ? " • Home" : m.home === false ? " • Away" : "");
  }

  /** The big "next up" panel at the top of the fixtures section. */
  function featuredCardHTML(m) {
    var isToday = m.status === "today";
    return (
      '<article class="featured-card' + (isToday ? " featured-card--today" : "") + ' reveal"' +
        (isToday ? ' aria-label="Today’s match"' : "") + ">" +
        "<div>" +
          '<span class="featured-card__badge">' + (isToday ? "Today’s match" : "Next up") + "</span>" +
          '<p class="featured-card__comp">' + compLine(m) + "</p>" +
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
        '<span class="match-card__comp">' + compLine(m) + "</span>" +
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
      '<p class="hero-card__comp">' + compLine(m) + "</p>" +
      '<div class="hero-card__teams">' + teamsBlockHTML(m) + "</div>" +
      '<div class="hero-card__count" id="hero-count" hidden></div>' +
      '<div class="hero-card__meta">' +
        "<span><strong>" + esc(formatDate(m.date)) + "</strong></span>" +
        "<span>" + esc(m.venue || "Venue TBC") + "</span>" +
      "</div>" +
      '<a class="hero-card__link" href="#matches">Full fixture list &rarr;</a>';
    attachLogoFallbacks(card);
    card.hidden = false;
    initCountdown(m);
  }

  /**
   * Live countdown in the hero card. Counts to kick-off when the time is
   * known, otherwise to midnight of matchday. On matchday itself it
   * switches to a static "It's matchday" line.
   */
  function initCountdown(m) {
    var host = document.getElementById("hero-count");
    if (!host || !m.date) { return; }

    // Matchday: no ticking needed (and under a ?date= preview the real
    // clock would disagree with the simulated day — never show both).
    var dateOverridden = new URLSearchParams(window.location.search).get("date");
    if (m.status === "today" && (!m.time || dateOverridden)) {
      host.innerHTML = '<span class="hero-card__count-label">It&rsquo;s matchday — up the Falcons</span>';
      host.hidden = false;
      return;
    }

    var p = m.date.split("-").map(Number);
    var target;
    var label = "to matchday";
    if (m.time && /^\d{1,2}:\d{2}$/.test(m.time)) {
      var t = m.time.split(":").map(Number);
      target = new Date(p[0], p[1] - 1, p[2], t[0], t[1]);
      label = "to kick-off";
    } else {
      target = new Date(p[0], p[1] - 1, p[2]);
    }

    function segment(value, unit) {
      return '<span class="hero-card__count-num">' +
        String(value).padStart(2, "0") + "<i>" + unit + "</i></span>";
    }

    var timer = null;
    function render() {
      var diff = target.getTime() - Date.now();
      if (diff <= 0) {
        host.innerHTML = '<span class="hero-card__count-label">It&rsquo;s matchday — up the Falcons</span>';
        if (timer) { window.clearInterval(timer); }
        return;
      }
      var s = Math.floor(diff / 1000);
      host.innerHTML =
        segment(Math.floor(s / 86400), "d") +
        segment(Math.floor(s % 86400 / 3600), "h") +
        segment(Math.floor(s % 3600 / 60), "m") +
        segment(s % 60, "s") +
        '<span class="hero-card__count-label">' + label + "</span>";
    }

    render();
    host.hidden = false;
    timer = window.setInterval(render, 1000);
    document.addEventListener("visibilitychange", function () {
      // No point ticking a hidden tab
      if (document.hidden) {
        if (timer) { window.clearInterval(timer); timer = null; }
      } else if (!timer) {
        render();
        timer = window.setInterval(render, 1000);
      }
    });
  }

  function renderMatches(data, today) {
    var featured = document.getElementById("match-featured");
    var railWrap = document.getElementById("matches-rail-wrap");
    var rail = document.getElementById("matches-rail");
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
      // Arrows only exist when there is actually somewhere to scroll
      var scrollable = max > 8;
      prev.hidden = !scrollable;
      next.hidden = !scrollable;
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

    // Velocity skew: cards lean into the scroll and ease back upright
    if (!REDUCED_MOTION) {
      var lastLeft = track.scrollLeft, skew = 0, settling = null;
      function settle() {
        skew *= 0.85;
        if (Math.abs(skew) < 0.05) {
          skew = 0;
          track.style.setProperty("--rail-skew", "0deg");
          settling = null;
          return;
        }
        track.style.setProperty("--rail-skew", skew.toFixed(2) + "deg");
        settling = window.requestAnimationFrame(settle);
      }
      track.addEventListener("scroll", function () {
        var delta = track.scrollLeft - lastLeft;
        lastLeft = track.scrollLeft;
        skew = Math.max(-4, Math.min(4, delta * 0.22));
        track.style.setProperty("--rail-skew", skew.toFixed(2) + "deg");
        if (!settling) { settling = window.requestAnimationFrame(settle); }
      }, { passive: true });
    }

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
     6b. HERO FIELD — the living triangle canvas
     A low-poly mesh of jersey triangles: facets ignite gold around the
     pointer, glint softly on their own, and a floodlight band sweeps
     through every few seconds so touch screens get the show too.
     ------------------------------------------------------------------------ */

  function initHeroField() {
    var canvas = document.getElementById("hero-canvas");
    var hero = document.querySelector(".hero");
    if (!canvas || !hero || !canvas.getContext) { return; }
    var ctx = canvas.getContext("2d");

    var CELL = 92;               // triangle size — bigger = calmer, cheaper
    var GOLD = [253, 185, 21];
    var tris = [];
    var width = 0, height = 0;
    var pointer = { x: -9999, y: -9999 };
    var sweep = { x: -1e4, active: false, last: 0 };
    var running = false, rafId = null, lastGlint = 0;

    // Deterministic pseudo-random so rebuilds don't reshuffle the field
    function rand(seed) {
      var v = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
      return v - Math.floor(v);
    }

    function build() {
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      tris = [];
      var cols = Math.ceil(width / CELL) + 1;
      var rows = Math.ceil(height / CELL) + 1;
      var pts = [];
      for (var r = 0; r <= rows; r++) {
        pts.push([]);
        for (var c = 0; c <= cols; c++) {
          // Jittered grid — reads as hand-cut fabric, not graph paper
          var jx = (rand(r * 91 + c) - 0.5) * CELL * 0.5;
          var jy = (rand(c * 57 + r) - 0.5) * CELL * 0.5;
          pts[r].push([c * CELL + jx - CELL / 2, r * CELL + jy - CELL / 2]);
        }
      }
      for (r = 0; r < rows; r++) {
        for (c = 0; c < cols; c++) {
          var quad = [pts[r][c], pts[r][c + 1], pts[r + 1][c + 1], pts[r + 1][c]];
          var flip = rand(r * 13 + c * 7) > 0.5;
          [[quad[0], quad[1], flip ? quad[2] : quad[3]],
           [flip ? quad[0] : quad[1], quad[2], quad[3]]].forEach(function (pt, k) {
            tris.push({
              p: pt,
              cx: (pt[0][0] + pt[1][0] + pt[2][0]) / 3,
              cy: (pt[0][1] + pt[1][1] + pt[2][1]) / 3,
              shade: rand(r * 3.3 + c * 8.1 + k),
              heat: 0,
              glint: 0
            });
          });
        }
      }
    }

    function draw(now) {
      ctx.clearRect(0, 0, width, height);

      // Ambient: a fresh facet glints roughly twice a second
      if (now - lastGlint > 450 && tris.length) {
        tris[Math.floor(Math.random() * tris.length)].glint = 1;
        lastGlint = now;
      }
      // Floodlight sweep every ~9s
      if (!sweep.active && now - sweep.last > 9000) {
        sweep.active = true;
        sweep.x = -width * 0.15;
      }
      if (sweep.active) {
        sweep.x += width / 95;   // crosses in ~1.6s at 60fps
        if (sweep.x > width * 1.15) {
          sweep.active = false;
          sweep.last = now;
        }
      }

      var anyHot = false;
      for (var i = 0; i < tris.length; i++) {
        var t = tris[i];

        var dx = t.cx - pointer.x, dy = t.cy - pointer.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < 180) {
          t.heat = Math.max(t.heat, (1 - d / 180) * 0.9);
        }
        var sw = 0;
        if (sweep.active) {
          var sd = Math.abs(t.cx - sweep.x);
          if (sd < 110) { sw = (1 - sd / 110) * 0.32; }
        }

        t.heat *= 0.945;
        t.glint *= 0.982;
        var h = Math.min(1, t.heat + t.glint * 0.45 + sw);
        if (h > 0.012) { anyHot = true; } else { h = 0; }

        // Base facet: near-black inks with a whisper of variation
        var base = 14 + t.shade * 9;
        var rr = base + (GOLD[0] - base) * h * 0.9;
        var gg = base + (GOLD[1] - base) * h * 0.9;
        var bb = (base + 3) + (GOLD[2] - (base + 3)) * h * 0.9;
        ctx.fillStyle = "rgb(" + (rr | 0) + "," + (gg | 0) + "," + (bb | 0) + ")";
        ctx.beginPath();
        ctx.moveTo(t.p[0][0], t.p[0][1]);
        ctx.lineTo(t.p[1][0], t.p[1][1]);
        ctx.lineTo(t.p[2][0], t.p[2][1]);
        ctx.closePath();
        ctx.fill();
      }
      return anyHot;
    }

    function loop(now) {
      draw(now);
      rafId = running ? window.requestAnimationFrame(loop) : null;
    }
    function start() {
      if (!running) {
        running = true;
        rafId = window.requestAnimationFrame(loop);
      }
    }
    function stop() {
      running = false;
      if (rafId) { window.cancelAnimationFrame(rafId); rafId = null; }
    }

    build();

    if (REDUCED_MOTION) {
      draw(0); // one calm, static field
      window.addEventListener("resize", debounce(function () { build(); draw(0); }, 200));
      return;
    }

    hero.addEventListener("pointermove", function (e) {
      var rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
    });
    hero.addEventListener("pointerleave", function () {
      pointer.x = -9999;
      pointer.y = -9999;
    });
    hero.addEventListener("pointerdown", function (e) {
      // Tap pulse — a burst of heat around the touch point
      var rect = canvas.getBoundingClientRect();
      var px = e.clientX - rect.left, py = e.clientY - rect.top;
      tris.forEach(function (t) {
        var d = Math.hypot(t.cx - px, t.cy - py);
        if (d < 260) { t.heat = Math.max(t.heat, (1 - d / 260)); }
      });
    });

    // Only burn frames while the hero is actually on screen
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries[0].isIntersecting ? start() : stop();
      }, { threshold: 0.02 }).observe(hero);
    } else {
      start();
    }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { stop(); }
      else if (hero.getBoundingClientRect().bottom > 0) { start(); }
    });
    window.addEventListener("resize", debounce(build, 200));
  }

  function debounce(fn, wait) {
    var t = null;
    return function () {
      window.clearTimeout(t);
      t = window.setTimeout(fn, wait);
    };
  }

  /** Featured match card leans toward the pointer (fine pointers only). */
  function initTilt() {
    if (REDUCED_MOTION ||
        !window.matchMedia("(hover: hover) and (pointer: fine)").matches) { return; }
    var card = document.querySelector(".featured-card");
    if (!card) { return; }

    card.addEventListener("pointermove", function (e) {
      var rect = card.getBoundingClientRect();
      var nx = (e.clientX - rect.left) / rect.width - 0.5;
      var ny = (e.clientY - rect.top) / rect.height - 0.5;
      card.classList.add("is-tilting");
      card.style.setProperty("--tilt-y", (nx * 3.5).toFixed(2) + "deg");
      card.style.setProperty("--tilt-x", (ny * -2.5).toFixed(2) + "deg");
    });
    card.addEventListener("pointerleave", function () {
      card.classList.remove("is-tilting");
      card.style.setProperty("--tilt-y", "0deg");
      card.style.setProperty("--tilt-x", "0deg");
    });
  }

  /* ------------------------------------------------------------------------
     7. CHROME — header, menu, progress, parallax, reveals, counters, spy
     ------------------------------------------------------------------------ */

  /** One rAF loop drives everything scroll-linked: header state,
      the progress bar and the parallax layers. */
  function initScrollLoop() {
    var header = document.querySelector(".site-header");
    var bar = document.getElementById("progress-bar");
    var watermark = REDUCED_MOTION ? null : document.getElementById("hero-watermark");
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

      // Kinetic wordmark: drifts left as you leave the hero
      if (watermark && y < window.innerHeight * 1.5) {
        watermark.style.transform = "translate3d(" + (-y * 0.18).toFixed(1) + "px,0,0)";
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
    initHeroField();

    loadData()
      .then(function (data) {
        renderMatches(data.matches, todayISO());
        renderSponsors(data.sponsors);
        renderClub(data.teamInfo);
        initReveals();
        initCounters();
        initTilt();
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
