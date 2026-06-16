import fs from "node:fs";
import vm from "node:vm";

const htmlPath = new URL("../index.html", import.meta.url);
const html = fs.readFileSync(htmlPath, "utf8");
const match = html.match(/<script type="application\/json" id="calendarData">([\s\S]*?)<\/script>/);
const today = process.argv.includes("--date")
  ? process.argv[process.argv.indexOf("--date") + 1]
  : new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date());

if (!match) {
  throw new Error("Could not find embedded calendarData JSON block in index.html");
}

const data = JSON.parse(match[1]);
for (const script of [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1])) {
  new vm.Script(script);
}

const seen = new Map();
for (const event of data.events || []) {
  const key = `${event.date}|${event.time}|${event.title}|${event.venue}`;
  seen.set(key, (seen.get(key) || 0) + 1);
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
