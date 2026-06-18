# Surbiton + Nearby Events Calendar

`index.html` is a standalone calendar. Open it directly in a browser; no local server is needed.

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

## Weekly AI updater

The `updater/` folder contains a review-first updater that uses OpenRouter with web search to check known sources, propose additions/removals, and write logs.

Setup:

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

To register the weekly Windows scheduled task in auto-apply mode:

```powershell
powershell -ExecutionPolicy Bypass -File .\updater\register-weekly-task.ps1
```

The task writes run logs and proposals under `updater/logs/`, creates backups under `updater/backups/`, and updates `index.html` automatically.
