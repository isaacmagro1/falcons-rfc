# Falcons RFC — Official Website

Three-page site for Falcons RFC built with plain HTML, CSS and vanilla
JavaScript. No frameworks, no build step.

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
index.html          Home: hero, fixtures, standings, sponsors, join form
team.html            Squad by position + player standings
about.html           Club history + honours
css/style.css        All styles, shared by all three pages
js/script.js         All behaviour, shared by all three pages
data/                ← edit these to update the site
  matches.json        Fixtures (dates, opponents, venues, times, home/away)
  sponsors.json       Sponsor roster (tier "main" = spotlight)
  standings.json       Club standings table
  squad.json           Squad by position (also the player standings roster)
  player-stats.json    Per-player stats, matched onto squad.json by name
  team-info.json       About lead sentence, honours, social links, WhatsApp
assets/img/          Optimised web images (patterns, logos, favicon, sponsors)
assets/fonts/        Anton + Glacial Indifference (WOFF2)
design.md            Design system documentation
```

Source material (`Falcons Branding .pdf`, `Patterns/`, `Team Logos/`,
`Fonts/`, fixtures spreadsheet, sponsorship logos) stays in the project
root, untouched by the site.

## Everyday edits

- **Result came in / new fixture** — edit `data/matches.json`. Matches in the
  past disappear automatically; a match dated today gets the TODAY'S MATCH
  treatment on its own.
- **Update the league table** — edit `data/standings.json` (played/won/
  drawn/lost/pf/pa/bp/points per team). Position and points difference are
  computed automatically.
- **Update player stats** — edit `data/player-stats.json`. Each entry's
  `name` must match `data/squad.json` exactly. Points are computed from
  tries and conversions; you only enter raw counts.
- **Update club history / about text** — the short lead sentence and
  honours live in `data/team-info.json`; the full year-by-year story is
  written directly in `about.html` (`.history` section) since it's a fixed
  piece of writing, not a list.
- **New sponsor** — add an entry to `data/sponsors.json`. Drop a logo into
  `assets/img/sponsors/` and set its path in `"logo"` to replace the monogram
  tile; leave `null` to keep the styled initials. Set `"website"` to make
  the logo clickable.
- **New opponent logo** — save a transparent PNG to `assets/img/opponents/`
  named after the team, lowercase with hyphens (e.g. `new-team.png`). Without
  a file the card shows a gold initials tile instead.
- **Club/team photos** — drop files at `assets/img/team/squad.jpg` (team
  page hero) or `assets/img/about/hero.jpg` (about page hero); each fills
  its band automatically and the "coming soon" placeholder disappears.

After editing `data/*.json`, re-sync the `file://` fallback in **all three**
pages (the `<script id="fallback-data">` block in `index.html`, `team.html`
and `about.html` — they share one payload). Hosted sites always read the
JSON files directly, so this only matters for opening from disk.

## Preview a date

Fixtures react to the real calendar. To preview a specific day:

```
index.html?date=2026-10-10   → today's-match state (season opener)
index.html?date=2027-12-31   → season-complete empty state
```
