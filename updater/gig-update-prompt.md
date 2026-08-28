# Autonomous gig-radar update run

You are running headless and unattended as the maintainer of the Gig Radar in this repository. There is no human to ask questions, so make conservative decisions and finish the job. Working directory is the repo root.

## What the radar is for

It tracks live gigs in old-school jazz and trad/roots music: hot jazz, gypsy jazz, western swing, old-time, cajun, zydeco, jug band, skiffle, old-school/classic country, honky tonk, Kansas City swing, New Orleans/trad jazz, trad Irish sessions, and hot pre-bebop swing including live-band Lindy dances.

Geography: prioritise what is easy from Surbiton. Nearby and easy-to-reach rows have a lower inclusion threshold. Further or awkward trips need a stronger genre match, a better venue, a rarer artist or clearer date-night value.

## 0. Orient yourself first

Read before editing:

- `HANDOFF.md` - project contract, data model, field schemas and validation workflow.
- `updater/source-strategy.json` - source priorities, travel tiers and lower/higher inclusion thresholds.
- `updater/gig-preferences.json` - genres wanted, avoid list, scope, source trust and `genreAliases`.
- `updater/user-feedback.json` - private exported feedback, if it exists. Treat `exclude` rows as strong negative signal for exact gigs and similar future gigs; treat `include` rows as strong positive examples.
- `updater/gig-sources.json` - key venues, aggregators and standard search queries.
- `updater/instagram-sources.json` - configured Instagram profiles to inspect with the logged-in local browser collector when available.
- `updater/social-leads.json` - recent Instagram/social leads, if the file exists. Treat these as discovery leads, not authoritative structured data.
- `updater/gig-method-log.md` - previous discovery methods and dead ends.
- The `meta` block and a few sample rows of `gig-data.json` so you match the exact field shape and id style.

"Today" means the current date in Europe/London.

## 1. Remove finished gigs

Delete rows from `gig-data.json` `gigs` whose `date` or `endDate` is before today. Do not delete `watchlist` entries just because they lack a date.

## 2. Research and rotate methods

Refresh key venues and run standard search queries. Then try at least 2-3 discovery angles you have not used recently; check `updater/gig-method-log.md` first.

Treat `priorityVenues` in `updater/gig-sources.json` as mandatory every run. For each one, crawl the primary URL, useful secondary URLs, pagination/API/feed variants noted in `crawlRule`, and configured Instagram profiles or Instagram search queries when possible. These are the venue/source names the user specifically wants watched closely: Jamboree, The Lamb Surbiton, Green Note, The Harrison, Nightjar, Spice of Life, Ram Jam Records, TwickFolk at The Cabbage Patch, The Magic Garden Battersea, Epsom Hot Jazz Club and Old Barn Bookham Jazz Club.

Good discovery angles:

- The Lamb, Ram Jam, Fighting Cocks, Rose, cornerHOUSE and other easy local venues.
- Jamboree, The Harrison, The Magic Garden, TwickFolk/Cabbage Patch, Toulouse Lautrec, Cecil Sharp House, What's Cookin', Nightjar, Green Note, 100 Club, Bull's Head Barnes and similar known genre venues.
- Specialist listings: The Jazz Guide, SwingdanceUK, Swing Out London, Halibuts swing, Irish Cultural Centre, Irish Music in London, The Session.
- Ticketing platforms: DICE, TicketSource, See Tickets, WeGotTickets, Eventbrite.
- Artist tour pages for known trad/jazz/roots acts.
- Venue social posts where sites lag; mark social-only rows `confidence: "verify"`.

## 3. Add only genuinely in-genre dated gigs

Follow `updater/source-strategy.json`, `updater/gig-preferences.json` and exported user feedback strictly.

Rules:

- Add objects to `gigs` using the exact schema in `HANDOFF.md`.
- IDs are `g` + `YYYYMMDD` + a short lowercase slug of artist or venue; guarantee uniqueness.
- Every gig needs: `id`, `date`, `endDate`, `time`, `title`, `artist`, `venue`, `area`, `genres`, `cost`, `url`, `source`, `confidence`, `note`.
- Normalize every genre to `updater/gig-preferences.json` `canonicalGenres`.
- Never add undated or past-dated gigs.
- Never guess dates from stale pages.
- Do not duplicate an existing gig with the same `date`, `time`, `artist/title` and `venue`.
- Do not re-add gigs or close variants rejected in `updater/user-feedback.json` unless the new gig is clearly different or much higher value; explain exceptions in the method log.
- Use positive `include` feedback in `updater/user-feedback.json` to raise similar future gigs in sourcing and scoring.
- Exclude bluegrass-only, modern jazz, fusion, chart country, indie-folk, rock, punk, metal, DJ nights, tribute acts and generic open mics.
- Fighting Cocks Kingston is included only for explicit roots/trad-compatible listings.
- Day-trip gigs need a real `area` and travel note.
- Uncertain leads go to `watchlist`.

## 4. Improve sources

If you find a productive recurring venue/source, add it to `keyVenues` or `aggregators` in `updater/gig-sources.json`, and add useful new `searchQueries`.

## 5. Update metadata

In `gig-data.json` `meta`, set `updated` to today.

## 6. Validate

Run:

```powershell
npm run gig:generate
npm run gig:validate
```

Fix any validation errors and re-run until clean.

## 7. Log the run

Append a dated entry to `updater/gig-method-log.md`: venues/methods tried, what produced gigs, what stayed dark and what to try next.

## Hard constraints

- Edit only gig-maintenance files: `gig-data.json`, `updater/gig-sources.json`, `updater/instagram-sources.json`, `updater/social-leads.json`, `updater/gig-method-log.md`, and private `updater/user-feedback.json` only if normalizing exported feedback is necessary.
- Do not touch `calendar-data.json`, `index.html`, `gigs.html`, `assets/`, game files or service worker during unattended update runs.
- Do not run `git commit` or `git push`; the publish step handles that.
- Never wipe or wholesale-rewrite the dataset.

When finished, print a short summary: gigs removed, gigs added, new sources/methods tried and final validation counts.
