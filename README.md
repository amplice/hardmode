# Surbiton + Nearby Events Calendar

`index.html` is a standalone calendar. Open it directly in a browser; no local server is needed.

For full maintainer context, see `HANDOFF.md`.

The site is split into:

- `calendar-data.json` - readable source data
- `calendar-data.js` - browser-loadable data generated from the JSON
- `assets/app.js` - UI behavior
- `assets/styles.css` - styling
- `events.ics` - subscribable calendar feed
- `manifest.webmanifest`, `sw.js`, `icons/icon.svg` - install/offline support

Useful browser features:

- Best bets, mobile quick chips, favourites and hidden rows.
- Shareable filter URLs.
- Richer event facts for travel, age guidance, booking, indoor/outdoor and map lookup.
- Favourites and hidden rows are private to the current browser via `localStorage`.

## Internet publishing

Use GitHub Pages for a stable public URL that updates whenever this folder pushes changes.

This folder publishes to the `gh-pages` branch of `amplice/hardmode`, leaving `hardmode/main` untouched. The public URL is:

```text
https://amplice.github.io/hardmode/
```

Remote setup:

```powershell
git remote add origin https://github.com/amplice/hardmode.git
git push -u origin main:gh-pages
```

Manual publish after editing `index.html`:

```powershell
npm run publish
```

The weekly updater auto-publishes after a successful `--apply` run once the `origin` remote exists. It commits the static site files; local logs, backups, and `updater/.env.local` stay out of git.

The public feed URL is:

```text
https://amplice.github.io/hardmode/events.ics
```

## Adding events to your own calendar

Use `Google` on any dated event to open a prefilled Google Calendar add-event page. Use `+ Cal` to download a one-event `.ics` file, or `Export calendar` to download all currently filtered dated events as one `.ics` file for Outlook, Apple Calendar, Google Calendar import, or another calendar app.

## AI updater

The `updater/` folder contains the automated updater. The active Windows scheduled task uses Codex CLI non-interactive mode (`codex exec`) through `updater/run-codex-update.ps1`; the old Claude task is disabled because its OAuth session expired.

Useful commands:

```powershell
npm run validate
npm run generate
npm run update:codex
npm run update:codex:nopublish
```

To register or repair the active Windows scheduled task:

```powershell
powershell -ExecutionPolicy Bypass -File .\updater\register-codex-task.ps1
```

The Codex task runs every 3 days by default, writes logs under `updater/logs/`, and publishes through `npm run publish` after a successful update.

### Instagram leads

Some venues, especially The Lamb, publish useful near-term events on Instagram before
their website. The updater can collect those posts through a local logged-in browser
session, with no Meta developer app or approval process.

First-time setup:

```powershell
npm run instagram:login
```

Log into Instagram in the browser that opens, handle any two-factor prompt, then press
Enter in the terminal. The browser session is stored locally in
`updater/instagram-profile/`, which is ignored by git.

Manual collection:

```powershell
npm run instagram:collect
```

The collector writes `updater/social-leads.json`, also ignored by git. The Codex calendar
and gig-radar update runners attempt this collection before each update and then read the
lead file. It also screenshots posts/reels into `updater/social-screenshots/` and runs
local OCR so flyer text can be extracted when the caption is thin. Instagram-only details
are treated as social leads and should stay marked `verify` unless an organiser/source page
confirms them independently.

Useful variants:

```powershell
npm run instagram:collect:headless
npm run instagram:collect:no-ocr
```

The older OpenRouter updater is still available for manual review-first runs:

1. Copy `updater/.env.example` to `updater/.env.local`.
2. Put your `OPENROUTER_API_KEY` in `updater/.env.local`.
3. Run `npm run update` to create a review log without changing `index.html`.
4. Run `npm run update:apply` only after reviewing the log.

Useful commands:

```powershell
npm run validate
npm run generate
npm run update
npm run update:apply
npm run update:prune
npm run update:prune:apply
```
