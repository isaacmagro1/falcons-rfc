/* ==========================================================================
   FALCONS RFC — script.js
   Vanilla JS, no dependencies.

   Contents:
     1. Utilities & config
     2. Data loading (fetch data/*.json, inline <script> fallback for file://)
     3. Fixtures — today / upcoming / past logic
     4. Sponsors — spotlight + auto-rotating carousel
     5. The Club — about, facts, honours, social links
     6. Chrome — header state, scroll-reveal, footer year

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
    calendar: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M7 2v3M17 2v3M3.5 9h17M5 4.5h14A1.5 1.5 0 0 1 20.5 6v13A1.5 1.5 0 0 1 19 20.5H5A1.5 1.5 0 0 1 3.5 19V6A1.5 1.5 0 0 1 5 4.5Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    clock: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    pin: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 21s-6.5-5.5-6.5-10.3a6.5 6.5 0 0 1 13 0C18.5 15.5 12 21 12 21Z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="10.5" r="2.2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    trophy: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M8 4h8v5a4 4 0 0 1-8 0V4ZM8 5H4.5v1A3.5 3.5 0 0 0 8 9.5M16 5h3.5v1A3.5 3.5 0 0 1 16 9.5M12 13v4m-3.5 3h7M9 20l.5-3h5l.5 3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  /** Add status ("today" | "upcoming" | "past") relative to the given day. */
  function categorise(matches, today) {
    return matches.map(function (m) {
      var status = m.date === today ? "today" : (m.date > today ? "upcoming" : "past");
      return Object.assign({}, m, { status: status });
    });
  }

  function teamHTML(name, logoSrc, isFalcons) {
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

  function matchCardHTML(m) {
    var isToday = m.status === "today";
    var opponentName = m.opponent || "Finalist TBC";
    var opponentLogo = m.opponent ? opponentLogoPath(m.opponent) : null;

    var badge = isToday
      ? '<span class="badge badge--today">Today’s Match</span>'
      : '<span class="badge badge--upcoming">Upcoming</span>';

    var meta =
      '<div class="match-meta-row">' + ICONS.calendar +
        "<span><strong>" + esc(formatDate(m.date)) + "</strong></span></div>" +
      '<div class="match-meta-row">' + ICONS.clock +
        "<span>" + (m.time ? "Kick-off <strong>" + esc(m.time) + "</strong>" : "Kick-off TBC") + "</span></div>" +
      '<div class="match-meta-row">' + ICONS.pin +
        "<span>" + (m.venue ? esc(m.venue) : "Venue TBC") + "</span></div>";

    return (
      '<article class="match-card' + (isToday ? " match-card--today" : "") + ' reveal"' +
        (isToday ? ' aria-label="Today’s match"' : "") + ">" +
        '<div class="match-card__top">' +
          '<span class="match-card__comp">' + esc(m.competition) +
            (m.round ? " • " + esc(m.round) : "") + "</span>" + badge +
        "</div>" +
        '<div class="match-card__teams">' +
          teamHTML("Falcons", PATHS.falconsMark, true) +
          '<span class="match-card__vs" aria-hidden="true">VS</span>' +
          '<span class="visually-hidden">versus</span>' +
          teamHTML(opponentName, opponentLogo, false) +
        "</div>" +
        '<div class="match-card__meta">' + meta + "</div>" +
      "</article>"
    );
  }

  function renderMatches(data, today) {
    var grid = document.getElementById("matches-grid");
    var note = document.getElementById("matches-note");
    if (!grid) { return; }

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
      grid.innerHTML =
        '<div class="matches-empty reveal"><strong>Season complete</strong>' +
        "New fixtures land here as soon as they are announced. Follow us on social for the news first.</div>";
    } else {
      grid.innerHTML = visible.map(matchCardHTML).join("");
    }

    // Swap broken opponent logos for initials tiles
    grid.querySelectorAll("img[data-fallback]").forEach(function (img) {
      img.addEventListener("error", function () {
        var tile = document.createElement("span");
        tile.className = "match-team__initials";
        tile.setAttribute("aria-hidden", "true");
        tile.textContent = img.getAttribute("data-fallback");
        img.replaceWith(tile);
      });
    });

    var played = all.length - visible.length;
    if (note && played > 0) {
      note.textContent = played + " played fixture" + (played === 1 ? "" : "s") +
        " hidden — up the Falcons.";
      note.hidden = false;
    }

    // Hero chip: the very next fixture
    var next = visible[0];
    var chip = document.getElementById("hero-next");
    var chipDetail = document.getElementById("hero-next-detail");
    if (chip && chipDetail && next) {
      var opp = next.opponent || "Finalist TBC";
      chipDetail.textContent =
        (next.status === "today" ? "TODAY — " : "") +
        "Falcons vs " + opp + " • " + formatDate(next.date) +
        (next.venue ? " • " + next.venue : "");
      chip.hidden = false;
    }
  }

  /* ------------------------------------------------------------------------
     4. SPONSORS
     ------------------------------------------------------------------------ */

  function sponsorCardHTML(s) {
    var media = s.logo
      ? '<img class="sponsor-card__logo" src="' + esc(s.logo) + '" alt="" loading="lazy" />'
      : '<span class="sponsor-card__mono" aria-hidden="true">' + esc(initials(s.name)) + "</span>";
    var inner =
      media +
      '<span class="sponsor-card__name">' + esc(s.name) + "</span>" +
      '<span class="sponsor-card__tag">' + esc(s.tagline || "") + "</span>";
    return s.website
      ? '<a class="sponsor-card" href="' + esc(s.website) + '" target="_blank" rel="noopener">' + inner + "</a>"
      : '<div class="sponsor-card">' + inner + "</div>";
  }

  function renderSpotlight(main) {
    var host = document.getElementById("sponsor-spotlight");
    if (!host || !main) { return; }
    var media = main.logo
      ? '<img src="' + esc(main.logo) + '" alt="' + esc(main.name) + ' logo" loading="lazy" />'
      : '<p class="spotlight-card__name">' + esc(main.name) + "</p>";
    host.innerHTML =
      '<div class="spotlight-card reveal">' +
        '<p class="spotlight-card__label">Main Sponsor</p>' + media +
        '<p class="spotlight-card__tag">' + esc(main.tagline || "") + "</p>" +
      "</div>";
  }

  /**
   * Auto-rotating sponsor carousel.
   * - 2 / 3 / 4 items per view (mobile / tablet / desktop)
   * - advances one card every 5s, wraps around
   * - pauses on hover, keyboard focus, hidden tab, or reduced-motion
   */
  function Carousel(root, items) {
    this.root = root;
    this.viewport = root.querySelector("#carousel-viewport");
    this.track = root.querySelector("#carousel-track");
    this.status = root.querySelector("#carousel-status");
    this.count = items.length;
    this.index = 0;
    this.timer = null;

    this.track.innerHTML = items.map(function (s) {
      return '<li class="carousel__slide">' + sponsorCardHTML(s) + "</li>";
    }).join("");

    var self = this;
    root.querySelector("#carousel-prev").addEventListener("click", function () { self.step(-1, true); });
    root.querySelector("#carousel-next").addEventListener("click", function () { self.step(1, true); });

    ["mouseenter", "focusin"].forEach(function (ev) {
      root.addEventListener(ev, function () { self.pause(); });
    });
    ["mouseleave", "focusout"].forEach(function (ev) {
      root.addEventListener(ev, function () { self.play(); });
    });
    document.addEventListener("visibilitychange", function () {
      document.hidden ? self.pause() : self.play();
    });

    // Re-measure when the responsive per-view count changes
    var queries = [window.matchMedia("(min-width: 1024px)"), window.matchMedia("(min-width: 768px)")];
    queries.forEach(function (q) {
      q.addEventListener("change", function () { self.update(); });
    });

    this.update();
    this.play();
  }

  Carousel.prototype.perView = function () {
    if (window.matchMedia("(min-width: 1024px)").matches) { return 4; }
    if (window.matchMedia("(min-width: 768px)").matches) { return 3; }
    return 2;
  };

  Carousel.prototype.maxIndex = function () {
    return Math.max(0, this.count - this.perView());
  };

  Carousel.prototype.update = function () {
    var per = this.perView();
    this.track.style.setProperty("--per-view", per);
    this.index = Math.min(this.index, this.maxIndex());
    this.track.style.transform = "translateX(-" + (this.index * (100 / per)) + "%)";
    if (this.status) {
      var from = this.index + 1;
      var to = Math.min(this.index + per, this.count);
      this.status.textContent = from + "–" + to + " of " + this.count;
    }
  };

  Carousel.prototype.step = function (dir, manual) {
    var max = this.maxIndex();
    this.index += dir;
    if (this.index > max) { this.index = 0; }        // wrap forwards
    if (this.index < 0) { this.index = max; }        // wrap backwards
    this.update();
    if (manual) { this.restart(); }
  };

  Carousel.prototype.play = function () {
    if (REDUCED_MOTION || this.timer || this.maxIndex() === 0) { return; }
    var self = this;
    this.timer = window.setInterval(function () { self.step(1, false); }, 5000);
  };

  Carousel.prototype.pause = function () {
    window.clearInterval(this.timer);
    this.timer = null;
  };

  Carousel.prototype.restart = function () {
    this.pause();
    this.play();
  };

  function renderSponsors(data) {
    var list = (data.sponsors || []);
    renderSpotlight(list.find(function (s) { return s.tier === "main"; }));

    var partners = list.filter(function (s) { return s.tier !== "main"; });
    var root = document.getElementById("sponsor-carousel");
    if (root && partners.length) {
      new Carousel(root, partners);
    } else if (root) {
      root.hidden = true;
    }
  }

  /* ------------------------------------------------------------------------
     5. THE CLUB
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
      about.innerHTML = info.about.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("");
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
        return '<div class="club-fact"><dt>' + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd></div>";
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
          '<div class="honour-card reveal">' + ICONS.trophy +
          '<div><p class="honour-card__title">' + esc(h.title) + "</p>" +
          '<p class="honour-card__detail">' + esc(h.detail) + "</p></div></div>"
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
     6. CHROME — header, reveals, footer year
     ------------------------------------------------------------------------ */

  function initHeader() {
    var header = document.querySelector(".site-header");
    if (!header) { return; }
    var update = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 24);
    };
    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  function initReveals() {
    var targets = document.querySelectorAll(".reveal");
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

  function initFooterYear() {
    var el = document.getElementById("footer-year");
    if (el) { el.textContent = String(new Date().getFullYear()); }
  }

  /* ------------------------------------------------------------------------
     BOOT
     ------------------------------------------------------------------------ */

  document.addEventListener("DOMContentLoaded", function () {
    initHeader();
    initFooterYear();

    loadData()
      .then(function (data) {
        renderMatches(data.matches, todayISO());
        renderSponsors(data.sponsors);
        renderClub(data.teamInfo);
        initReveals();
      })
      .catch(function (err) {
        console.error("Falcons RFC: could not load site data.", err);
        var grid = document.getElementById("matches-grid");
        if (grid) {
          grid.innerHTML =
            '<div class="matches-empty"><strong>Fixtures unavailable</strong>' +
            "Please refresh the page, or follow us on social for the latest fixtures.</div>";
        }
        initReveals();
      });
  });
})();
