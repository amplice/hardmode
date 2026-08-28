# Local Events Project Contract

This repository is a static Surbiton-area events planner with two products:

- `index.html` is the Family Calendar.
- `gigs.html` is the Gig Radar.

Both pages must work as plain static files and on GitHub Pages. There is no server-side write path from the browser.

## Data Layers

- `calendar-data.json` is the source of truth for the Family Calendar.
- `calendar-data.js` is generated from `calendar-data.json`.
- `events.ics` is generated from `calendar-data.json`.
- `gig-data.json` is the source of truth for the Gig Radar.
- `gig-data.js` is generated from `gig-data.json`.
- `gigs.ics` is generated from `gig-data.json`.
- `updater/source-strategy.json` describes the two-product curation model, source priorities, travel tiers and inclusion thresholds.
- `updater/user-feedback.json` is optional, private and ignored by git. If present, update runs must treat it as strong negative feedback.

## Family Calendar Row Shape

Every `calendar-data.json` event should keep the existing fields:

`id, row, date, endDate, time, startTime, title, venue, area, category, type, cost, tier, description, source, url, confidence, status, verify`.

Generated fields such as `day`, `month`, `sortKey`, `searchText`, `travelBucket`, `sourceLastChecked` and map/accessibility fields are produced or normalized by `npm run generate`.

Rules:

- Date rows must be current or future in Europe/London.
- Use date ranges only for true multi-day runs, exhibitions, festivals, theatre runs, seasonal attractions or weekly blocks.
- Split monthly, fortnightly or irregular selected-date events into separate dated rows.
- Prefer specific source URLs.
- Never guess a current-year date from a stale or ambiguous page.

## Gig Radar Row Shape

Every `gig-data.json` gig should keep the existing fields:

`id, date, endDate, time, title, artist, venue, area, genres, cost, url, source, confidence, note`.

Rules:

- Genres must normalize to `updater/gig-preferences.json` `canonicalGenres`.
- Past gigs are removed.
- Social-only rows are allowed only when specific and future-dated; mark them `confidence: "verify"` unless independently confirmed.
- Fighting Cocks Kingston is included only for explicit roots/trad-compatible listings.

## Curation Model

Use `updater/source-strategy.json` first, then the relevant preferences file.

Family Calendar modes:

- `nannyWeekday`: weekday daytime, toddler-friendly, free/cheap, walkable/easy local.
- `familyWeekend`: weekends/bank holidays, family days out, Hampton Court, railway, festivals, outdoor culture.
- `daytimeMusic`: free or daytime music, especially Rose Cafe, Canbury Bandstand and family-friendly sessions.
- `dateNight`: music/theatre/performance worth arranging childcare for.
- `easyLocal`: doorstep and easy local things with a lower inclusion threshold.
- `destination`: further-out things only when explicitly worth the trip.

Gig Radar modes:

- `nearbyEasy`: lower threshold for nearby/easy-to-reach live music.
- `strictGenre`: hot jazz, gypsy jazz, western swing, old-time, cajun, zydeco, skiffle, honky tonk, old-school country, trad Irish, live-band swing.
- `dateNight`: quality evening music worth arranging childcare for.
- `worthTrip`: further-out shows only when unusually good or rare.

## Feedback Loop

The static pages store skip feedback in browser `localStorage` and can export `user-feedback.json`.

For the updater to use it:

1. Export feedback from the page.
2. Put/overwrite the file at `updater/user-feedback.json`.
3. Run the normal update task.

Update runs must avoid exact rejected rows and close matches by title, venue, category, genre and note unless the new event is clearly different or substantially higher value.

## Validation

Family Calendar:

```powershell
npm run generate
npm run validate
```

Gig Radar:

```powershell
npm run gig:generate
npm run gig:validate
```
