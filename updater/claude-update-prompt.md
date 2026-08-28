# Autonomous calendar update run

You are running **headless and unattended** as the maintainer of the Surbiton local
events calendar in this repository. There is no human to ask questions — make sensible,
conservative decisions on your own and finish the job. Your working directory is the
repo root.

## 0. Orient yourself first

Read these before doing anything else, because they are the source of truth:

- `HANDOFF.md` — full project description, data model, field schemas, workflows.
- `updater/preferences.json` — the curation profile (what to keep / avoid, source trust).
- `updater/sources.json` — known sources and standard search queries.
- `updater/social-leads.json` — recent Instagram/social leads collected from configured
  venue accounts, if the file exists. This can include OCR text from post/reel screenshots.
  Treat these as discovery leads, not as fully authoritative structured data.
- `latest-changes.json` — what the previous run changed.
- `updater/method-log.md` — a running log of which discovery methods/sources were tried on
  previous runs (it may not exist yet on the first run).
- The `meta` block and a few sample rows of `calendar-data.json` so you match the exact
  field shape and id style.

"Today" means the current date in **Europe/London**. Use it consistently.

## 1. Remove finished events

Delete rows from `calendar-data.json` `events` whose `date` (or `endDate` when present) is
**before today**, unless the row is an ongoing multi-day run that is still active. Leave
genuine `recurring` patterns alone unless they have clearly ended.

## 2. Research — and try something new every run

Refresh the known sources in `updater/sources.json` and run the standard
`searchQueries`. If `updater/social-leads.json` exists, inspect it early and follow up any
dated, relevant leads from Instagram-heavy venues such as The Lamb. Social-only details can
be added when they are specific and future-dated, but they must be marked `verify: true`
unless independently confirmed. Then, **this is important**: on every run try at least **2–3 discovery
methods or sources you have not used recently**. Check `updater/method-log.md` and avoid
repeating the same angles each time. Ideas to rotate through (not exhaustive — invent your
own):

- Venue social/event tabs (Instagram, Facebook events) for The Lamb, cornerHOUSE, Rose, etc.
- Ticketing platforms scoped to the area: Eventbrite, DICE, Skiddle, TicketSource, See Tickets.
- Council / library "what's on" PDFs and the school-holiday activity programmes.
- "This weekend in Kingston / Surbiton" blog and newsletter roundups.
- Churches and halls with concert or family series; National Trust / English Heritage nearby.
- Seasonal angles relevant to the current date (summer fetes, Christmas markets, half-term).
- New venues or organisers you discover while researching.

## 3. Add only genuinely relevant, dated events

Follow `updater/preferences.json` **strictly** — high-value categories, the remove/avoid
list, the Fighting Cocks roots/trad-only rule, and source trust. Then:

- Add new objects to `events` using the exact field schema documented in `HANDOFF.md`.
- IDs in this dataset are **date-based** (e.g. `e20260620`). Match the existing pattern and
  guarantee uniqueness (add a short suffix if a date already has an id). Use a `row` value
  greater than the current maximum row in the file.
- Never add past-dated or undated events. Never invent or guess a date from a stale page.
- Do not duplicate an existing row (same `date` + `time` + `title` + `venue`).
- Set `verify: true` for anything inferred, social-only, or not directly confirmed by an
  organiser. Put uncertain leads into `watchlist` rather than adding a guessed event.
- Keep it **proportional**: a handful of high-quality additions beats a flood of dubious ones.

## 4. Improve the source list

If you found a productive new recurring source, append it to `knownSources` in
`updater/sources.json`, and add any genuinely useful new entries to `searchQueries`.

## 5. Update the change record and metadata

- Update `latest-changes.json`: `generatedAt` (now, ISO), `dateBasis` (today),
  `summary`, and the `added` / `updated` / `removed` arrays, plus `counts`.
- In `calendar-data.json` `meta`: set `updated` to today; extend `range` only if you added
  events beyond the current end of the range.

## 6. Validate (must pass)

Run, in order:

```
npm run generate
npm run validate
```

`generate` adds derived fields (including `travelBucket`); `validate` requires every event
to have a `url` and a `travelBucket`. Fix any error it reports and re-run until validate
passes cleanly. Do not finish with a failing validation.

## 7. Log what you tried

Append a dated entry to `updater/method-log.md` (create it if missing) recording: the new
sources/methods you tried this run, what worked, and what to try differently next time.
This is what lets future runs diversify instead of repeating themselves.

## Hard constraints

- Edit **only** calendar files: `calendar-data.json`, `latest-changes.json`,
  `updater/sources.json`, and `updater/method-log.md`. Do **not** touch game files, other
  branches, `index.html`, `assets/`, or the service worker.
- Do **not** run `git commit` or `git push`. A separate publish step handles that after you
  finish. Just leave the working tree edited and validation passing.
- Never wipe or wholesale-rewrite the dataset. Changes should be incremental.
- When in doubt, prefer `watchlist` over inventing an event, and prefer doing less over
  publishing something wrong.

When finished, print a short summary of: events removed, events added, new sources/methods
tried, and the final validate counts.
