import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dataPath = path.join(root, "calendar-data.json");
const dataJsPath = path.join(root, "calendar-data.js");
const icsPath = path.join(root, "events.ics");
const latestChangesPath = path.join(root, "latest-changes.json");
const manifestPath = path.join(root, "manifest.webmanifest");
const swPath = path.join(root, "sw.js");
const iconPath = path.join(root, "icons", "icon.svg");

const today = getArgValue("--date") || currentDateInLondon();
const data = readJson(dataPath);
const latestChanges = fs.existsSync(latestChangesPath)
  ? readJson(latestChangesPath)
  : initialLatestChanges(data, today);

data.events = (data.events || []).map((event) => enrichEvent(event, data.meta?.updated || today));
data.latestChanges = latestChanges;

fs.mkdirSync(path.join(root, "icons"), { recursive: true });
fs.writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
fs.writeFileSync(dataJsPath, `window.CALENDAR_DATA = ${JSON.stringify(data)};\n`, "utf8");
fs.writeFileSync(icsPath, renderCalendarFeed(data.events, today), "utf8");
fs.writeFileSync(latestChangesPath, `${JSON.stringify(latestChanges, null, 2)}\n`, "utf8");
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest(), null, 2)}\n`, "utf8");
fs.writeFileSync(swPath, serviceWorker(), "utf8");
fs.writeFileSync(iconPath, iconSvg(), "utf8");

console.log(JSON.stringify({
  ok: true,
  events: data.events.length,
  feedEvents: data.events.filter((event) => (event.endDate || event.date) >= today).length,
  today
}, null, 2));

function getArgValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : "";
}

function currentDateInLondon() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalize(value) {
  return String(value || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

function eventText(event) {
  return normalize([
    event.searchText,
    event.title,
    event.venue,
    event.area,
    event.category,
    event.type,
    event.cost,
    event.tier,
    event.description,
    event.source,
    event.confidence
  ].filter(Boolean).join(" "));
}

function isFree(event) {
  const text = eventText(event);
  return /(^|[^a-z])free([^a-z]|$)/.test(text) || normalize(event.cost) === "free";
}

function isFamily(event) {
  return /(kid|kids|child|children|family|toddler|baby|under-5|under 5|rhyme|story|play|school|pta|lego|junior|youth|relaxed|sensory)/.test(eventText(event));
}

function isOutdoor(event) {
  return /(park|garden|outdoor|open air|bandstand|trail|river|thames|market|fair|festival|carnival|mural|street art|miniature railway)/.test(eventText(event));
}

function needsBooking(event) {
  return /(book|booking|ticket|tickets|pre-book|prebook|register|reservation|spaces limited|paid)/.test(eventText(event));
}

function extractPrice(value) {
  const match = String(value || "").replace(/GBP/ig, "GBP ").match(/(?:£|GBP\s*)(\d+(?:\.\d{1,2})?)/i);
  return match ? Number(match[1]) : null;
}

function travelBucket(event) {
  const text = eventText(event);
  if (/(core|surbiton|berrylands|tolworth)/.test(normalize(`${event.tier} ${event.area}`))) return "Walkable / very local";
  if (/kingston|thames ditton|long ditton|hampton court|molesey|wimbledon|morden/.test(text)) return "Easy local trip";
  if (/waterloo|south bank|southbank|london/.test(text)) return "Easy by train";
  return event.tier || "Check route";
}

function enrichEvent(event, checkedDate) {
  const text = eventText(event);
  const toddlerFriendly = Boolean(event.toddlerFriendly) || /(toddler|baby|under-5|under 5|rhyme|story|sensory|soft play|0-5|0 to 5|ages? 0|ages? 2|ages? 3|family)/.test(text);
  const indoorOutdoor = event.indoorOutdoor || (isOutdoor(event) ? "Outdoor / open-air" : /theatre|library|museum|gallery|church|hall|pub|cafe|centre|indoor/.test(text) ? "Indoor / venue-based" : "");
  return {
    ...event,
    ageRange: event.ageRange || (toddlerFriendly ? "Useful for younger children / families" : isFamily(event) ? "Family-friendly" : ""),
    bookingRequired: event.bookingRequired || (needsBooking(event) ? "Check booking / tickets" : isFree(event) ? "No ticket flagged" : ""),
    priceMin: event.priceMin ?? extractPrice(event.cost),
    indoorOutdoor,
    rainSafe: event.rainSafe ?? (indoorOutdoor.startsWith("Indoor") ? true : ""),
    toddlerFriendly,
    accessibility: event.accessibility || (/relaxed|accessible|wheelchair|sensory/.test(text) ? "Accessibility-friendly wording in listing" : ""),
    travelBucket: event.travelBucket || travelBucket(event),
    sourceLastChecked: event.sourceLastChecked || checkedDate,
    mapQuery: event.mapQuery || [event.venue, event.area, "UK"].filter(Boolean).join(", ")
  };
}

function pad(number) {
  return String(number).padStart(2, "0");
}

function parseIso(iso) {
  const [year, month, day] = String(iso || "").split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(iso, days) {
  const date = parseIso(iso);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function compactDate(iso) {
  return String(iso || "").replaceAll("-", "");
}

function parseClock(value) {
  const match = String(value || "").match(/\b(\d{1,2})[:.](\d{2})\b/);
  if (!match) return null;
  return `${pad(Math.min(Number(match[1]), 23))}:${pad(Math.min(Number(match[2]), 59))}`;
}

function clockToIcs(iso, clock) {
  return `${compactDate(iso)}T${clock.replace(":", "")}00`;
}

function addMinutesToClockDate(iso, clock, minutes) {
  const date = parseIso(iso);
  const [hour, minute] = clock.split(":").map(Number);
  date.setHours(hour, minute + minutes, 0, 0);
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    clock: `${pad(date.getHours())}:${pad(date.getMinutes())}`
  };
}

function eventTimeRange(event) {
  const time = String(event.time || "");
  if (!event.date || /all day/i.test(time)) return { allDay: true };
  const start = parseClock(event.startTime) || parseClock(time);
  if (!start) return { allDay: true };
  const range = time.match(/\b(\d{1,2}[:.]\d{2})\s*(?:-|to|\u2013|\u2014)\s*(\d{1,2}[:.]\d{2})\b/i);
  const parsedEnd = range ? parseClock(range[2]) : null;
  const fallback = addMinutesToClockDate(event.date, start, 60);
  return {
    allDay: false,
    start,
    end: parsedEnd || fallback.clock,
    endDate: parsedEnd ? (event.endDate || event.date) : fallback.date
  };
}

function icsEscape(value) {
  return String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .replaceAll("\n", "\\n")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,");
}

function eventToIcs(event, stamp) {
  const lines = [
    "BEGIN:VEVENT",
    `UID:${icsEscape(event.id || `${event.date}-${event.title}`)}@surbiton-local-events`,
    `DTSTAMP:${stamp}`,
    `SUMMARY:${icsEscape(event.title || "Local event")}`
  ];
  const range = eventTimeRange(event);
  if (range.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${compactDate(event.date)}`);
    lines.push(`DTEND;VALUE=DATE:${compactDate(addDays(event.endDate || event.date, 1))}`);
  } else {
    lines.push(`DTSTART;TZID=Europe/London:${clockToIcs(event.date, range.start)}`);
    lines.push(`DTEND;TZID=Europe/London:${clockToIcs(range.endDate, range.end)}`);
  }
  if (event.venue) lines.push(`LOCATION:${icsEscape([event.venue, event.area].filter(Boolean).join(", "))}`);
  const description = [
    event.description,
    event.cost ? `Cost: ${event.cost}` : "",
    event.travelBucket ? `Travel: ${event.travelBucket}` : "",
    event.ageRange ? `Age guidance: ${event.ageRange}` : "",
    event.confidence ? `Confidence: ${event.confidence}` : "",
    event.url ? `Source: ${event.url}` : ""
  ].filter(Boolean).join("\n");
  if (description) lines.push(`DESCRIPTION:${icsEscape(description)}`);
  if (event.url) lines.push(`URL:${icsEscape(event.url)}`);
  lines.push("END:VEVENT");
  return lines.join("\r\n");
}

function renderCalendarFeed(events, date) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const futureEvents = events
    .filter((event) => event.date && (event.endDate || event.date) >= date)
    .sort((a, b) => (a.sortKey || "").localeCompare(b.sortKey || ""));
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Surbiton Local Events//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Surbiton + Nearby Events",
    "X-WR-TIMEZONE:Europe/London",
    ...futureEvents.map((event) => eventToIcs(event, stamp)),
    "END:VCALENDAR",
    ""
  ].join("\r\n");
}

function initialLatestChanges(data, date) {
  return {
    generatedAt: new Date().toISOString(),
    dateBasis: date,
    summary: "Site files generated from the current calendar data.",
    added: [],
    updated: [],
    removed: [],
    counts: {
      events: data.events?.length || 0,
      recurring: data.recurring?.length || 0
    }
  };
}

function manifest() {
  return {
    name: "Surbiton + Nearby Events Calendar",
    short_name: "Surbiton Events",
    start_url: "./",
    scope: "./",
    display: "standalone",
    background_color: "#f5f7f8",
    theme_color: "#096c63",
    description: "A curated local events calendar for Surbiton and nearby places.",
    icons: [
      { src: "icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }
    ]
  };
}

function serviceWorker() {
  return `const CACHE_NAME = 'surbiton-events-v1';
const ASSETS = [
  './',
  './index.html',
  './assets/styles.css',
  './assets/app.js',
  './calendar-data.js',
  './calendar-data.json',
  './events.ics',
  './manifest.webmanifest',
  './icons/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request).then((response) => {
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html'))));
});
`;
}

function iconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="24" fill="#096c63"/>
  <rect x="22" y="30" width="84" height="76" rx="10" fill="#ffffff"/>
  <path d="M22 48h84" stroke="#d6dde4" stroke-width="8"/>
  <circle cx="43" cy="70" r="8" fill="#b0553d"/>
  <circle cx="65" cy="70" r="8" fill="#2d5f96"/>
  <circle cx="87" cy="70" r="8" fill="#2f6e43"/>
  <path d="M39 94h50" stroke="#17202a" stroke-width="8" stroke-linecap="round"/>
</svg>
`;
}
