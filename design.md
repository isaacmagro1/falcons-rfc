# Falcons RFC — Design System

The reference for how the Falcons RFC website looks, feels and moves.
Everything here was derived from the club's own assets: `Falcons Branding .pdf`,
the logo SVGs, and the seven jersey-pattern photographs in `Patterns/` — with
layout language studied from top-flight club sites (Stade Toulousain, Harlequins).

---

## 1. Brand foundations

### Colour

The branding PDF prints no hex values, so the palette was **sampled from the
official logo artwork** (the dominant pixel of the gold falcon is `#FDB915`)
and the jersey fabric photography.

| Token          | Hex       | Use                                                    |
| -------------- | --------- | ------------------------------------------------------ |
| `--gold`       | `#FDB915` | Brand gold — CTAs, accents, badges, the fixtures field  |
| `--gold-bright`| `#FFC531` | Hover state of gold elements                            |
| `--gold-deep`  | `#D99C00` | Reserved for pressed states / dark-on-gold shading      |
| `--black`      | `#0A0A0B` | Page background (never pure `#000` — avoids OLED smear) |
| `--ink-900`    | `#101014` | Card & footer surfaces                                  |
| `--ink-800`    | `#17171D` | Raised card gradient start                              |
| `--text`       | `#F4F1E9` | Primary text — warm white, matches the jersey stripe    |
| `--text-muted` | `#ABA79D` | Secondary text                                          |
| `--text-faint` | `#7C786F` | Tertiary text, captions                                 |
| `--on-gold`    | `#0A0A0B` | Text on the gold field                                  |

Contrast (WCAG 2.1): gold on black ≈ 11.9:1, warm white on black ≈ 17:1,
black on gold ≈ 11.9:1 — all pass AA (most pass AAA).

**The gold field.** One section — Fixtures — flips the scheme entirely: solid
brand gold (over the `jersey-gold.jpg` fabric texture) with black cards on
top. This is the visual centrepiece, the same move Harlequins make with their
sky-blue matches section. Everywhere else, gold stays an accent.

### Typography

Self-hosted, converted to WOFF2 (`assets/fonts/`), loaded with
`font-display: swap`; the two critical faces are preloaded in `<head>`.

| Face                        | Role                                            |
| --------------------------- | ----------------------------------------------- |
| **Anton** (400)             | Display: hero, section titles, dates, team names, stats. Always uppercase, tight leading (0.92–1.1) |
| **Glacial Indifference** 400| Body text, 1rem/1.6                             |
| **Glacial Indifference** 700| Eyebrows, buttons, nav links, labels — uppercase with wide tracking (0.1–0.35em) |

Type scale (fluid): hero `clamp(3.25rem, 13.5vw, 8.25rem)` · section titles
`clamp(2.75rem, 8vw, 5rem)` · featured date `clamp(1.75rem, 4.5vw, 2.75rem)`
· footer send-off `clamp(3.25rem, 12vw, 7.5rem)` · body `1rem` · labels
`0.6875–0.8125rem`.

Signature moves:
- **Numbered eyebrows** — `01 — Season 2026/27` above every section title.
- **Outline + solid mix** — the hero's first line is stroke-only
  (`-webkit-text-stroke`), the second solid with the last word in gold.
- Stats use `font-variant-numeric: tabular-nums` so count-ups don't wobble.

### The triangle motif

The jersey fabric is built from triangles, and the site echoes it in three ways:

1. **Pattern photography as texture** — real fabric photos, always under an
   overlay so text stays AA-compliant: `pattern-hero.jpg` (hero, menu),
   `jersey-gold.jpg` (the gold fixtures field), `pattern-dark.jpg` (stats,
   footer), `banner-split.jpg` (spotlight, matchday banner),
   `jersey-detail.jpg` (club photo).
2. **Notched corners** — cards and buttons clip one or two corners at 45°
   (`clip-path`, `--notch: 16px`; smaller on chips and buttons).
3. **Angular details** — gold diamond separators in the marquees, the
   kick-off chip, badge clips.

Never place a pattern image behind text at full opacity.

---

## 2. Layout

Editorial, asymmetric, left-aligned — no centered hero stacks, no equal
three-card rows.

- Max content width **1240px** (`--container`), gutter 16px mobile / 32px ≥768px.
- Spacing uses an **8px scale** (`--s-1` … `--s-8`).
- Breakpoints (mobile-first): base ≤767px · `768px` tablet · `1024px` desktop.

| Region         | Mobile              | ≥768px             | ≥1024px                  |
| -------------- | ------------------- | ------------------ | ------------------------ |
| Header         | brand + burger      | brand + links + CTA| same                     |
| Hero           | stacked, card below | stacked            | 7/5 grid, card docked right |
| Featured match | stacked             | 5/7 split          | 5/7 split                |
| Fixture rail   | horizontal scroll (78vw cards) | same (300px cards) | same + arrows |
| Stats          | 2×2                 | 4-up               | 4-up                     |
| Club           | stacked             | stacked            | 6/5 split                |
| Footer grid    | 2 columns           | 4 columns          | 4 columns                |

Page flow: hero (dark) → ticker → **fixtures (gold)** → stats (dark) →
partners (dark) → club (dark) → matchday banner (photo) → footer. The gold
block breaks the dark monotone exactly once, like a poster fold.

---

## 3. Components

### Header
Thin utility topbar (location / season) that collapses once scrolled; solid
nav with brand, links, gold CTA; 3px gold **reading-progress bar** fixed above
everything. On mobile the links move into a **full-screen overlay menu**
(burger → X, staggered link entrance, Esc/link-tap closes, body scroll locks).

### Hero
Left-aligned editorial block: crest eyebrow → outline/solid display title
(lines slide out of clipped masks on load) → tagline → two CTAs. A
**next-match card** docks right on desktop (crest v crest, KO chip,
date/venue, a **live countdown** ticking to matchday/kick-off, link to
fixtures) — rendered by JS from the same data as the fixtures. The base of
the hero carries a rolling **ticker**; a giant outlined **FALCONS wordmark**
drifts with the scroll behind the content.

**The living background** (`js/script.js: initHeroField`): a full-bleed
canvas mesh of jittered jersey triangles in near-black inks. Facets ignite
gold around the pointer and decay back (a torch-over-fabric trail), random
facets glint ambiently (~2/s), a floodlight band sweeps across every ~9s,
and taps pulse a burst — so touch devices get the show too. The rAF loop
only runs while the hero is on screen and the tab is visible; DPR is capped
at 1.5; reduced motion draws one static field. The CSS gradient beneath is
the no-JS floor.

### Fixtures — the gold field
- **Featured panel**: the next fixture (or today's match) as a full-width
  black card — badge (`NEXT UP` / pulsing `TODAY'S MATCH`), competition +
  round, big Anton date, KO + venue rows, oversized crests with KO chip.
- **Rail**: every later fixture as a black card in a horizontal
  scroll-snap rail — drag with the mouse, swipe on touch, or use the square
  arrow buttons that flank the rail (vertically centred over the cards;
  they only render when the rail actually overflows). The right edge
  bleeds off-container so a cut card advertises the scroll.
- **Home & away**: each fixture carries `home: true|false|null` in
  `matches.json` (from the club fixtures sheet: Marsa → home, New Hibs →
  away, TBC venues → null). The home side renders on the **left**, the away
  side on the **right**, and the competition line appends "• Home"/"• Away".
  Falcons away = Falcons on the right.
- **Status logic** (`js/script.js`): compare `match.date` to today's local
  `YYYY-MM-DD` — equal = today, later = upcoming, earlier = past (dropped;
  a count note appears under the rail). Missing time renders "KO TBC",
  missing venue "Venue TBC", missing opponent an initials tile + "Finalist TBC".
- Empty state: "Season complete" black panel.

### Opponent logos
`assets/img/opponents/<slug>.png` where slug = opponent name lowercased,
non-alphanumerics → `-`. On image error, JS swaps in a gold **initials tile** —
a new opponent works with zero code changes, with or without a logo file.

### Stats band
Four gold-keyline stats (fixtures, years, teams, senior clubs) whose numbers
**count up** (~1.1s, ease-out cubic) when scrolled into view. The fixtures
figure is derived from `matches.json` at runtime.

### Sponsors
Main sponsor (tier `"main"`) gets the split **spotlight card** (monogram or
logo + `MAIN SPONSOR` label + Anton name). Partners roll in a full-bleed
**marquee** — Anton names with taglines, gold diamond separators — that
scrolls continuously (~70px/s, duration normalised to content width), pauses
on hover/focus, and duplicates its content only enough to loop seamlessly.
The first copy is the real one; clones are `aria-hidden` with untabbable links.

### The Club
Editorial split: about copy (lead paragraph brighter than the rest), facts as
a **hairline ledger** (label left, Anton value right), social buttons; then
the jersey photo (clip-path wipe reveal) and honours as a **numbered index**
(`01`–`04`, gold counters, hover nudge).

### Buttons
`.btn--gold` (primary), `.btn--ghost` (outline), `.btn--dark` (black w/ gold
border — for photographic backgrounds). All uppercase Glacial bold, notched
top-right corner, hover lift, `scale(0.97)` press.

---

## 4. Motion

Built on design-engineering principles: strong custom easing curves, UI
transitions under 300ms, transform/opacity only, everything interruptible
where it can be. **Nothing on the page is fully static** — every section
either moves (marquees, parallax) or enters with motion (reveals, count-ups).

- **Curves:** `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` for entrances,
  hovers and releases; `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)` for
  on-screen movement. Never ease-in.
- **Durations:** press 140ms · hovers 200ms · reveals 500ms · title masks
  700ms · clip reveals 800ms (entrances may sit above 300ms; interactions
  never do).
- **Always moving:** the hero triangle field, ticker, partner marquee and
  the countdown never sit still (marquees pause on hover/focus so they can
  be read). The scroll-progress bar and header state track every scroll.
- **Scroll-linked:** one rAF loop drives header shrink, the progress bar,
  the hero **wordmark drift** and the banner **parallax layer**
  (`data-parallax`; offset zeroed at viewport centre and clamped so edges
  never show).
- **Pointer-reactive:** the hero field ignites around the cursor; the
  featured match card **tilts** toward it (±3°, fine pointers only); the
  fixture rail **skews with scroll velocity** (±4°, eases back upright).
- **Entrances:** `.reveal` keyframe fade-up with 45ms sibling stagger;
  `.t-line` line-mask slide for display titles (transition, so it stays
  interruptible); `.reveal--clip` wipe for photography; hero cascade on load
  (70ms steps); overlay menu links stagger via `--i` custom property.
  All hidden-before-reveal states are scoped under a `.js` root class so the
  page is fully readable without JavaScript.
- **Feedback:** every pressable element scales down on `:active` (buttons
  0.97, arrows/burger 0.94). Hover motion sits behind
  `(hover: hover) and (pointer: fine)`.
- **Count-ups:** stats animate 0→value on first view (IntersectionObserver),
  skipped entirely under reduced motion (final values are in the HTML).
- **Reduced motion = fewer/gentler, not zero:** reveals become plain 200ms
  fades; marquees stop and wrap into static rows (hero ticker hides); the
  parallax loop never registers; lifts, presses, pulses, zooms and the badge
  pulse are stripped; rail scrolling snaps without smooth behaviour.

---

## 5. Accessibility

- Semantic landmarks: `header`/`nav`/`main`/`section[aria-labelledby]`/`footer`;
  skip link to `#matches`; `scroll-padding-top` keeps anchors clear of the
  fixed header.
- Keyboard: all interactive elements are native `<a>`/`<button>`; visible
  gold `:focus-visible` outline (black variant on the gold field); rail
  arrows are real buttons with disabled states; the overlay menu closes on
  Esc and returns focus to the burger.
- Screen readers: decorative images/icons get `alt=""`/`aria-hidden`; the
  ticker is `aria-hidden`; marquee clones are `aria-hidden` with
  `tabindex="-1"` links; the KO chip carries a visually-hidden
  "Falcons versus X"; featured match region is `aria-live="polite"`.
- A global `[hidden] { display: none !important }` guard keeps the attribute
  authoritative over component display rules.
- `<noscript>` block carries the season-opener facts; static stat values and
  un-scoped reveal states keep the page readable without JS.

---

## 6. Data architecture

All content is data-driven from `data/`:

| File              | Drives                                              |
| ----------------- | --------------------------------------------------- |
| `matches.json`    | Hero match card, featured panel, rail, fixtures stat |
| `sponsors.json`   | Spotlight + partner marquee                          |
| `team-info.json`  | About copy, facts ledger, honours index, social links |

`fetch()` is the source of truth; a build-time copy of the same JSON lives in
`index.html` (`<script type="application/json" id="fallback-data">`) so the
site still renders when opened from disk (`file://`), where browsers block
fetch. **If you edit the JSON files, re-sync the inline copy** (or just ignore
it when the site is properly hosted).

### Testing dates
Append `?date=YYYY-MM-DD` to preview any day:
- `?date=2026-10-10` → TODAY'S MATCH state (MD1 vs Wolves)
- `?date=2027-01-20` → mid-season, played fixtures hidden
- `?date=2027-12-31` → "Season complete" empty state

---

## 7. Asset pipeline notes

Web assets in `assets/img/` are optimised derivatives of the source files
(which remain untouched):

- Patterns: 1920px/1400px progressive JPEG q72 (160–340KB vs 2.5–5.5MB PNGs).
- Logos: the source SVGs are bitmap-in-SVG wrappers (~1MB each), so transparent
  PNGs were extracted and composited from their embedded mask + image layers —
  `falcons-logo.png` (hero), `falcons-mark.png` (nav/cards/footer, bird only),
  `favicon.png`, and 320px opponent logos.
- Fonts: TTF/OTF → WOFF2 (88KB total for all three faces).
