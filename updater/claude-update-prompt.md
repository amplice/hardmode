# Autonomous family-calendar update run

You are running headless and unattended as the maintainer of the Family Calendar in this repository. There is no human to ask questions, so make conservative decisions and finish the job. Your working directory is the repo root.

## 0. Orient yourself first

Read these before editing:

- `HANDOFF.md` - project contract, data model, field schemas and validation workflow.
- `updater/source-strategy.json` - source priorities, travel tiers and lower/higher inclusion thresholds.
- `updater/preferences.json` - family curation profile, high-value interests, avoid list and source trust.
- `updater/user-feedback.json` - private exported feedback, if it exists. Treat `exclude` rows as strong negative signal for exact rows and similar future rows; treat `include` rows as strong positive examples.
- `updater/sources.json` - known sources and standard search queries.
- `updater/social-leads.json` - recent Instagram/social leads, if the file exists. Treat these as discovery leads, not authoritative structured data.
- `latest-changes.json` - what the previous run changed.
- `updater/method-log.md` - previous discovery methods and dead ends.
- The `meta` block and a few sample rows of `calendar-data.json` so you match the exact field shape and id style.

"Today" means the current date in Europe/London. Use it consistently.

## 1. Remove finished events

Delete rows from `calendar-data.json` `events` whose `date` or `endDate` is before today, unless the row is an ongoing multi-day run that is still active. Leave genuine `recurring` patterns alone unless they have clearly ended.

## 2. Research and rotate methods

Refresh the known sources in `updater/sources.json` and run the standard `searchQueries`. Then try at least 2-3 discovery methods or sources you have not used recently; check `updater/method-log.md` first.

Prioritise:

- Surbiton, Berrylands, Tolworth, Kingston, Thames Ditton, Long Ditton, Hampton Court.
- Waterloo/South Bank and Wimbledon when the event is family-relevant, free/daytime music, theatre or clearly high quality.
- Instagram-heavy venues such as The Lamb; social-only details can be added when specific and future-dated, but mark `verify: true` unless independently confirmed.

## 3. Add only relevant dated events

Follow `updater/source-strategy.json`, `updater/preferences.json` and exported user feedback strictly.

Rules:

- Add new objects to `events` using the exact schema documented in `HANDOFF.md`.
- IDs are date-based: `e` + `YYYYMMDD` + optional short suffix. Guarantee uniqueness.
- Use a `row` value greater than the current maximum row.
- Never add past-dated or undated events.
- Never invent or guess a date from a stale page.
- Do not duplicate an existing row with the same `date`, `time`, `title` and `venue`.
- Do not re-add rows or close variants rejected in `updater/user-feedback.json` unless the new event is clearly different or much higher value; explain exceptions in the method log.
- Use positive `include` feedback in `updater/user-feedback.json` to raise similar future rows in sourcing and scoring.
- The child was born in January 2024. For child-specific programming, prefer toddler/preschool/under-5/all-ages rows and reject obvious older-child rows such as Lego Robotics, coding or robotics clubs, trading-card tournaments, 6+, 8-12, teen or school-age workshops unless the event is independently worthwhile for adults.
- Use specific event URLs, not generic index URLs, when available.
- Mark inferred, social-only or uncertain rows `verify: true`.
- Put uncertain leads in `watchlist` instead of additions.
- Keep descriptions short and factual.

UX rule: split monthly, fortnightly or irregular selected-date series into separate one-day event rows. Use date ranges only for true multi-day runs, exhibitions, festivals, theatre runs, seasonal attractions or weekly blocks.

## 4. Improve sources

If you found a productive recurring source, append it to `knownSources` in `updater/sources.json` and add useful new searches to `searchQueries`.

## 5. Update metadata and change record

- Update `latest-changes.json`: `generatedAt`, `dateBasis`, `summary`, `added`, `updated`, `removed` and `counts`.
- In `calendar-data.json` `meta`, set `updated` to today; extend `range` only if you added events beyond the current end of the range.

## 6. Validate

Run:

```powershell
npm run generate
npm run validate
```

Fix any validation errors and re-run until clean.

## 7. Log the run

Append a dated entry to `updater/method-log.md` recording sources/methods tried, what worked, what did not, and what to try differently next time.

## Hard constraints

- Edit only calendar-maintenance files: `calendar-data.json`, `latest-changes.json`, `updater/sources.json`, `updater/method-log.md`, and private `updater/user-feedback.json` only if normalizing exported feedback is necessary.
- Do not touch `index.html`, `assets/`, `gigs.html`, game files or service worker during unattended update runs.
- Do not run `git commit` or `git push`; the publish step handles that.
- Never wipe or wholesale-rewrite the dataset.

When finished, print a short summary of events removed, events added, new sources/methods tried and final validation counts.
