# Falcons RFC — Official Website

Single-page site for Falcons RFC (San Pawl il-Baħar, Malta) built with plain
HTML, CSS and vanilla JavaScript. No frameworks, no build step.

## Run it

Any static server works:

```bash
cd "Falcons"
python3 -m http.server 8000
# open http://localhost:8000
```

Double-clicking `index.html` also works — the site falls back to an inline
copy of the data because browsers block `fetch()` on `file://`.

## Project structure

```
index.html          Page markup + inline JSON fallback
css/style.css       All styles (mobile-first; design tokens at the top)
js/script.js        Fixtures rail, sponsor marquee, motion system, data loading
data/               ← edit these to update the site
  matches.json      Fixtures (dates, opponents, venues, times)
  sponsors.json     Sponsor roster (tier "main" = spotlight)
  team-info.json    About copy, facts, honours, social links
assets/img/         Optimised web images (patterns, logos, favicon)
assets/fonts/       Anton + Glacial Indifference (WOFF2)
design.md           Design system documentation
```

Source material (`Falcons Branding .pdf`, `Patterns/`, `Team Logos/`,
`Fonts/`, fixtures PDF) stays in the project root, untouched by the site.

## Everyday edits

- **Result came in / new fixture** — edit `data/matches.json`. Matches in the
  past disappear automatically; a match dated today gets the TODAY'S MATCH
  treatment on its own.
- **Update club history / about text** — edit `data/team-info.json`
  (`about` paragraphs, `honours`, `social`).
- **New sponsor** — add an entry to `data/sponsors.json`. Drop a logo into
  `assets/img/sponsors/` and set its path in `"logo"` to replace the monogram
  tile; leave `null` to keep the styled initials.
- **New opponent logo** — save a transparent PNG to `assets/img/opponents/`
  named after the team, lowercase with hyphens (e.g. `new-team.png`). Without
  a file the card shows a gold initials tile instead.

After editing `data/*.json`, optionally re-sync the `file://` fallback inside
`index.html` (the `<script id="fallback-data">` block). Hosted sites always
read the JSON files directly, so this only matters for opening from disk.

## Preview a date

Fixtures react to the real calendar. To preview a specific day:

```
index.html?date=2026-10-10   → today's-match state (season opener)
index.html?date=2027-12-31   → season-complete empty state
```
