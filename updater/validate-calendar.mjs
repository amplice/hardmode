import fs from "node:fs";
import vm from "node:vm";

const htmlPath = new URL("../index.html", import.meta.url);
const dataPath = new URL("../calendar-data.json", import.meta.url);
const dataJsPath = new URL("../calendar-data.js", import.meta.url);
const appPath = new URL("../assets/app.js", import.meta.url);
const cssPath = new URL("../assets/styles.css", import.meta.url);
const icsPath = new URL("../events.ics", import.meta.url);
const html = fs.readFileSync(htmlPath, "utf8");
const today = process.argv.includes("--date")
  ? process.argv[process.argv.indexOf("--date") + 1]
  : new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date());

const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
new vm.Script(fs.readFileSync(dataJsPath, "utf8"), { filename: "calendar-data.js" });
new vm.Script(fs.readFileSync(appPath, "utf8"), { filename: "assets/app.js" });

if (!html.includes('href="assets/styles.css"')) throw new Error("index.html does not load assets/styles.css");
if (!html.includes('src="calendar-data.js"')) throw new Error("index.html does not load calendar-data.js");
if (!html.includes('src="assets/app.js"')) throw new Error("index.html does not load assets/app.js");
if (!fs.existsSync(cssPath)) throw new Error("Missing assets/styles.css");
if (!fs.existsSync(icsPath)) throw new Error("Missing events.ics; run npm run generate");

const seen = new Map();
for (const event of data.events || []) {
  const key = `${event.date}|${event.time}|${event.title}|${event.venue}`;
  seen.set(key, (seen.get(key) || 0) + 1);
  if (!event.url) throw new Error(`Event missing source URL: ${event.id}`);
  if (!event.travelBucket) throw new Error(`Event missing derived travelBucket: ${event.id}`);
}

const result = {
  ok: true,
  events: data.events?.length || 0,
  recurring: data.recurring?.length || 0,
  sources: data.sources?.length || 0,
  watchlist: data.watchlist?.length || 0,
  today,
  pastFinished: (data.events || []).filter((e) => (e.endDate || e.date) < today).length,
  duplicateKeys: [...seen.values()].filter((count) => count > 1).length,
  latest: (data.events || []).map((e) => e.endDate || e.date).sort().at(-1) || null
};

console.log(JSON.stringify(result, null, 2));
