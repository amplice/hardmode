// Validates gig-data.json and the generated gig-radar files.
// Prints a JSON summary and exits non-zero on any hard error.

import fs from "node:fs";
import vm from "node:vm";

const root = new URL("..", import.meta.url);
const srcPath = new URL("gig-data.json", root);
const jsPath = new URL("gig-data.js", root);
const icsPath = new URL("gigs.ics", root);
const htmlPath = new URL("gigs.html", root);

const today = process.argv.includes("--date")
  ? process.argv[process.argv.indexOf("--date") + 1]
  : new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date());

const data = JSON.parse(fs.readFileSync(srcPath, "utf8"));

if (!fs.existsSync(htmlPath)) throw new Error("Missing gigs.html");
if (!fs.existsSync(jsPath)) throw new Error("Missing gig-data.js; run npm run gig:generate");
if (!fs.existsSync(icsPath)) throw new Error("Missing gigs.ics; run npm run gig:generate");

const html = fs.readFileSync(htmlPath, "utf8");
if (!html.includes('src="gig-data.js"')) throw new Error("gigs.html does not load gig-data.js");
// gig-data.js must be valid JS that defines GIG_DATA.
const ctx = { window: {} };
vm.createContext(ctx);
new vm.Script(fs.readFileSync(jsPath, "utf8"), { filename: "gig-data.js" }).runInContext(ctx);
if (!ctx.window.GIG_DATA || !Array.isArray(ctx.window.GIG_DATA.gigs)) {
  throw new Error("gig-data.js did not define window.GIG_DATA.gigs");
}

const ID_RE = /^g\d{8}/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ids = new Set();
const seen = new Map();
let past = 0;

for (const g of data.gigs || []) {
  if (!g.id || !ID_RE.test(g.id)) throw new Error(`Gig has bad/missing id: ${JSON.stringify(g.id)}`);
  if (ids.has(g.id)) throw new Error(`Duplicate gig id: ${g.id}`);
  ids.add(g.id);
  if (!DATE_RE.test(g.date || "")) throw new Error(`Gig ${g.id} missing valid date (YYYY-MM-DD)`);
  if (!g.url) throw new Error(`Gig ${g.id} missing url`);
  if (!g.venue) throw new Error(`Gig ${g.id} missing venue`);
  if (!g.title && !g.artist) throw new Error(`Gig ${g.id} missing title/artist`);
  if (!Array.isArray(g.genres) || g.genres.length === 0) throw new Error(`Gig ${g.id} missing genres`);
  const key = `${g.date}|${g.time || ""}|${(g.title || g.artist || "").toLowerCase()}|${(g.venue || "").toLowerCase()}`;
  seen.set(key, (seen.get(key) || 0) + 1);
  if ((g.endDate || g.date) < today) past += 1;
}

const result = {
  ok: true,
  gigs: (data.gigs || []).length,
  watchlist: (data.watchlist || []).length,
  today,
  pastFinished: past,
  duplicateKeys: [...seen.values()].filter((n) => n > 1).length,
  genres: [...new Set((data.gigs || []).flatMap((g) => g.genres || []))].sort(),
  latest: (data.gigs || []).map((g) => g.endDate || g.date).sort().at(-1) || null
};

if (result.duplicateKeys > 0) throw new Error(`Found ${result.duplicateKeys} duplicate gig(s) (same date/time/title/venue)`);

console.log(JSON.stringify(result, null, 2));
