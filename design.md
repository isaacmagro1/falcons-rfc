# Falcons RFC — Design System

The reference for how the Falcons RFC website looks, feels and moves.
Everything here was derived from the club's own assets: `Falcons Branding .pdf`,
the logo SVGs, and the seven jersey-pattern photographs in `Patterns/`.

---

## 1. Brand foundations

### Colour

The branding PDF prints no hex values, so the palette was **sampled from the
official logo artwork** (the dominant pixel of the gold falcon is `#FDB915`)
and the jersey fabric photography.

| Token          | Hex       | Use                                                    |
| -------------- | --------- | ------------------------------------------------------ |
| `--gold`       | `#FDB915` | Brand gold — CTAs, accents, badges, keylines            |
| `--gold-bright`| `#FFC531` | Hover state of gold elements                            |
| `--gold-deep`  | `#D99C00` | Reserved for pressed states / dark-on-gold shading      |
| `--black`      | `#0A0A0B` | Page background (never pure `#000` — avoids OLED smear) |
| `--ink-900`    | `#101014` | Card & footer surfaces                                  |
| `--ink-800`    | `#17171D` | Raised card gradient start                              |
| `--ink-700`    | `#202028` | Highest surface (rarely used)                           |
| `--text`       | `#F4F1E9` | Primary text — warm white, matches the jersey stripe    |
| `--text-muted` | `#ABA79D` | Secondary text                                          |
| `--text-faint` | `#7C786F` | Tertiary text, captions                                 |

Contrast (WCAG 2.1): gold on black ≈ 11.9:1, warm white on black ≈ 17:1,
muted text on card ink ≈ 7.5:1 — all pass AA (most pass AAA).

**Rule: gold is an accent, not a background.** Large gold fields appear only
inside pattern photography (banner) or the main CTA button.

### Typography

Self-hosted, converted to WOFF2 (`assets/fonts/`), loaded with
`font-display: swap`; the two critical faces are preloaded in `<head>`.

| Face                        | Role                                            |
| --------------------------- | ----------------------------------------------- |
| **Anton** (400)             | Display: H1/H2, team names, stat values. Always uppercase, tight leading (0.98–1.1), letter-spacing 0.01–0.05em |
| **Glacial Indifference** 400| Body text, 1rem/1.6                             |
| **Glacial Indifference** 700| Eyebrows, buttons, nav links, labels — uppercase with wide tracking (0.1–0.42em) |

Type scale (fluid): H1 `clamp(3rem, 11vw, 6rem)` · H2 `clamp(2.125rem, 5.5vw, 3.25rem)`
· banner line `clamp(1.75rem, 5vw, 2.75rem)` · body `1rem` · meta `0.9375rem`
· labels `0.6875–0.8125rem`.

The **eyebrow + big Anton headline + muted sub** stack is the signature header
pattern used by every section.

### The triangle motif

The jersey fabric is built from triangles, and the site echoes it in three ways:

1. **Pattern photography as texture** — real fabric photos, always under a
   dark overlay gradient so text stays AA-compliant:
   - `pattern-hero.jpg` (dark slate triangles) → hero background
   - `pattern-dark.jpg` (soft knit triangles) → fixtures section, spotlight card, footer (≈ 4–10% visibility through the overlay)
   - `banner-split.jpg` (diagonal gold/black split) → matchday banner
   - `jersey-detail.jpg`, `jersey-gold.jpg` → "photography" in The Club section
2. **Notched corners** — cards, buttons and tiles clip one or two corners at
   45° (`clip-path`, `--notch: 16px`; 12px on small elements). Match cards notch
   top-right + bottom-left; buttons notch top-right only.
3. **Angular details** — the scroll cue, badge clips and monogram tiles reuse
   the same cut-corner language.

Never place a pattern image behind text at full opacity.

---

## 2. Layout

- Max content width **1200px** (`--container`), gutter 16px mobile / 24px ≥768px.
- Spacing uses an **8px scale**: `--s-1` 8 · `--s-2` 16 · `--s-3` 24 · `--s-4` 32
  · `--s-5` 48 · `--s-6` 64 · `--s-7` 96 · `--s-8` 128.
- Section rhythm: `--s-6` padding on mobile, `--s-7` from tablet.
- Breakpoints (mobile-first): base ≤767px · `768px` tablet · `1024px` desktop,
  plus a `≤479px` micro-query that compacts the nav.

| Component      | Mobile      | ≥768px          | ≥1024px        |
| -------------- | ----------- | --------------- | -------------- |
| Matches grid   | 1 column    | 2 columns       | 3 columns      |
| Today's match  | full width  | spans all cols  | spans all cols |
| Carousel       | 2 per view  | 3 per view      | 4 per view     |
| Club section   | stacked     | stacked         | 7/5 split      |
| Footer grid    | 2 columns   | 4 columns       | 4 columns      |

---

## 3. Components

### Match card
Surface `ink-800→ink-900` gradient, 1px `--line` border, notched corners.
Rows: competition/round + status badge → Falcons mark **VS** opponent logo →
divider → date / kick-off / venue rows with 16px gold inline SVG icons.
Hover: `translateY(-4px)` + gold border tint.

**Today's match**: spans the full grid row, gold border + soft gold glow
(`--glow-gold`), pulsing solid-gold `TODAY'S MATCH` badge, enlarged logos and
type, meta row centred horizontally on desktop.

**Status logic** (in `js/script.js`): compare `match.date` to today's local
`YYYY-MM-DD` string — equal = today, later = upcoming, earlier = past (hidden;
a count note appears under the grid). Missing time renders "Kick-off TBC",
missing venue "Venue TBC", missing opponent (cup final) renders an initials
tile + "Finalist TBC".

### Opponent logos
`assets/img/opponents/<slug>.png` where slug = opponent name lowercased,
non-alphanumerics → `-`. On image error, JS swaps in a gold **initials tile** —
so a new opponent works with zero code changes, with or without a logo file.

### Sponsor spotlight & carousel
Main sponsor (tier `"main"`) gets the full-width spotlight card: gold top
keyline, `MAIN SPONSOR` eyebrow, Anton name (or logo image when provided).
Partners render in the carousel: monogram tile (initials in Anton gold on an
8% gold field) + name + tagline. Auto-advances every **5s**, one card at a
time with wrap-around; pauses on hover, keyboard focus and hidden tabs;
disabled entirely under reduced motion. Prev/next buttons + an `aria-live`
"1–4 of 8" status between them.

### Buttons
`.btn--gold` (primary, black text on gold), `.btn--ghost` (outline),
`.btn--dark` (black with gold border — safe on photographic backgrounds).
All uppercase Glacial bold, notched top-right corner, hover lift of 2px.

### Banner
`banner-split.jpg` under a left-heavy dark gradient; eyebrow + short Anton
line (max 18ch) + `.btn--dark`.

---

## 4. Motion

- Durations 0.2s (`--t-fast`, hovers) and 0.5s (`--t-slow`, reveals/carousel),
  easing `cubic-bezier(0.22, 0.61, 0.36, 1)`.
- Scroll reveals: `.reveal` fades up 22px via one shared IntersectionObserver
  (threshold 0.15), each element observed once.
- Animated: transform/opacity only (GPU-friendly). The badge pulse animates
  box-shadow, deliberately confined to one small element.
- `prefers-reduced-motion: reduce` collapses every animation and transition,
  hides the scroll cue, disables smooth scrolling and stops the carousel timer
  (both CSS and JS check it).

---

## 5. Accessibility

- Semantic landmarks: `header`/`nav`/`main`/`section[aria-labelledby]`/`footer`;
  skip link to `#matches`; `scroll-padding-top` keeps anchors clear of the
  fixed header.
- Keyboard: all interactive elements are native `<a>`/`<button>`; visible
  gold `:focus-visible` outline; carousel viewport is focusable and pauses
  rotation while focused.
- Screen readers: decorative images/icons get `alt=""`/`aria-hidden`; the
  "VS" glyph is duplicated as visually-hidden "versus"; carousel status and
  match grid are `aria-live="polite"`.
- `<noscript>` block carries the season-opener facts.

---

## 6. Data architecture

All content is data-driven from `data/`:

| File              | Drives                                    |
| ----------------- | ------------------------------------------ |
| `matches.json`    | Fixture cards, hero next-match chip         |
| `sponsors.json`   | Spotlight + carousel                        |
| `team-info.json`  | About copy, facts grid, honours, social links (header + footer) |

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
