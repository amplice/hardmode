# Surbiton + Nearby Events Calendar

`index.html` is a standalone calendar. Open it directly in a browser; no local server is needed.

The event data is embedded in the `<script type="application/json" id="calendarData">` block near the bottom of the file, and the UI/rendering code follows it.

## Internet publishing

Use GitHub Pages for a stable public URL that updates whenever this folder pushes changes.

One-time setup:

```powershell
git init -b main
git add .
git commit -m "Publish local events site"
git remote add origin https://github.com/amplice/local-events.git
git push -u origin main
```

Create the empty public repository first at `https://github.com/new` with the name `local-events`. Do not add a README, license, or `.gitignore` on GitHub because this folder already has them.

In the GitHub repository, enable Pages from `Settings > Pages > Build and deployment > Source: Deploy from a branch`, then choose `main` and `/ (root)`. The public URL will be:

```text
https://amplice.github.io/local-events/
```

Manual publish after editing `index.html`:

```powershell
npm run publish
```

The weekly updater auto-publishes after a successful `--apply` run once the `origin` remote exists. It only commits `index.html` and `.nojekyll`; local logs, backups, and `updater/.env.local` stay out of git.

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
