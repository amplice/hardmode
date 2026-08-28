# Autonomous gig-radar update run

You are running **headless and unattended** as the maintainer of the **Gig Radar** in this
repository — a curated list of live gigs in a specific set of genres. There is no human to
ask; make sensible, conservative decisions and finish the job. Working directory is the repo root.

## What the radar is for

It tracks live gigs in these genres only (basically old-school jazz + trad Americana minus bluegrass):
**hot jazz, gypsy jazz (Django/manouche), western swing, old-time, cajun, zydeco, jug band,
skiffle, old-school/classic country (pre-1970s, honky tonk), Kansas City swing, New Orleans /
trad jazz, and hot (pre-bebop) swing incl. live-band swing/Lindy dances.**

Geography: Greater London, prioritising what is easy from **Surbiton** (SW London + central
London via Waterloo). Day-trips within ~90 min by train are fine **with a travel note**.
Genuinely relevant but far festivals go in the **watchlist**, not the main list.

## 0. Orient yourself first

Read before doing anything:
- `updater/gig-preferences.json` — genres wanted, the avoid list, scope, source trust, and the
  `genreAliases` map (normalise every genre you write to a value in `canonicalGenres`).
- `updater/gig-sources.json` — key venues, aggregators, and standard search queries.
- `updater/social-leads.json` — recent Instagram/social leads collected from configured
  venue accounts, if the file exists. Treat these as discovery leads, not as fully
  authoritative structured data.
- `updater/gig-method-log.md` — what previous runs tried; do NOT repeat the same angles.
- The `meta` block and a couple of rows of `gig-data.json` to match the exact field shape and id style.

"Today" means the current date in **Europe/London**.

## 1. Remove finished gigs

Delete rows from `gig-data.json` `gigs` whose `date` (or `endDate` when present) is **before
today**. Do not delete `watchlist` entries just because they lack a date.

## 2. Research — and rotate methods every run

Refresh the key venues and run the standard `searchQueries`. If `updater/social-leads.json`
exists, inspect it early and follow up any dated, in-genre leads from Instagram-heavy venues
such as The Lamb. Social-only gigs can be added when specific and future-dated, but use
`confidence:"verify"` unless independently confirmed. Then try at least **2–3 discovery
angles you haven't used recently** (check the method log). Ideas: individual venue what's-on
pages (Le QuecumBar, Toulouse Lautrec, Cecil Sharp House, What's Cookin', Nightjar, Green Note,
The 100 Club, Bull's Head Barnes, Fighting Cocks Kingston); artist tour pages for known trad
acts; ticketing platforms (DICE, TicketSource, See Tickets, WeGotTickets, Eventbrite) filtered
to London roots/jazz; the Gypsy Jazz Agenda calendar; aggregators (Songkick, Bandsintown) by
genre; social event tabs for venues that only post there (mark those `verify`).

## 3. Add only genuinely in-genre, dated gigs

Follow `updater/gig-preferences.json`. Key rules:
- **Genres only.** Exclude the avoid list — especially **bluegrass, modern/bebop/fusion jazz,
  and modern/chart country**. Within the wanted genres, err toward including (mark `verify`).
- **The Fighting Cocks rule** (matches the main calendar): include Fighting Cocks Kingston gigs
  ONLY when explicitly roots/trad (hot jazz, cajun, country, old-time, western swing, skiffle,
  zydeco). Ignore its rock/punk/indie/metal nights.
- Add objects to `gigs` using the exact schema in existing rows. **IDs are date-based**:
  `g` + `YYYYMMDD` + short lowercase slug of the artist/venue (e.g. `g20260812-quecumbar`);
  guarantee uniqueness (add `-b` etc. on collision).
- Every gig needs: `id, date, endDate(optional/null), time, title, artist, venue, area, genres[]
  (normalised to canonicalGenres), cost, url, source, confidence("confirmed"|"verify"), note`.
- **Never add undated or past-dated gigs**, and never guess a date from a stale page. Uncertain
  leads → `watchlist` (`{name, venue, url, note}`), not the main list.
- Day-trip gigs: set the real `area` and put the travel time in `note`.
- Don't duplicate an existing gig (same date + time + artist/title + venue).
- Keep it proportional — solid confirmed gigs beat a flood of dubious ones.

## 4. Improve the source list

If you find a productive recurring venue/source, add it to `keyVenues`/`aggregators` in
`updater/gig-sources.json`, and add any useful new `searchQueries`.

## 5. Update metadata

In `gig-data.json` `meta`, set `updated` to today.

## 6. Validate (must pass)

Run, in order:

```
npm run gig:generate
npm run gig:validate
```

`gig:generate` writes `gig-data.js` and `gigs.ics` and adds derived fields; `gig:validate`
requires every gig to have a valid id, date, url, venue, title/artist, and genres, with no
duplicates. Fix any error and re-run until it passes cleanly. Do not finish on a failure.

## 7. Log what you tried

Append a dated entry to `updater/gig-method-log.md`: which venues/methods you tried, what
produced gigs, what stayed dark (e.g. social-only venues), and what to try next time.

## Hard constraints

- Edit **only** gig-radar files: `gig-data.json`, `updater/gig-sources.json`, and
  `updater/gig-method-log.md`. Do **not** touch `calendar-data.json`, `index.html`, `gigs.html`,
  `assets/`, the game files, or the service worker.
- Do **not** run `git commit` or `git push` — a separate publish step handles that.
- Never wipe or wholesale-rewrite the dataset; changes are incremental.
- When in doubt, prefer `watchlist` over inventing a gig, and prefer doing less over publishing
  something wrong.

When finished, print a short summary: gigs removed, gigs added, new sources/methods tried, and
the final `gig:validate` counts.
