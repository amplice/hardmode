import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const htmlPath = path.join(repoRoot, "index.html");
const dataPath = path.join(repoRoot, "calendar-data.json");
const latestChangesPath = path.join(repoRoot, "latest-changes.json");
const logsDir = path.join(__dirname, "logs");
const backupsDir = path.join(__dirname, "backups");
const preferencesPath = path.join(__dirname, "preferences.json");
const sourcesPath = path.join(__dirname, "sources.json");
const sourceStrategyPath = path.join(__dirname, "source-strategy.json");
const userFeedbackPath = path.join(__dirname, "user-feedback.json");

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const pruneOnly = args.has("--prune-only");
const today = getArgValue("--date") || currentDateInLondon();
loadEnvFile(path.join(__dirname, ".env.local"));
const model = process.env.OPENROUTER_MODEL || process.env.OPENAI_MODEL || "~openai/gpt-latest";
const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});

async function main() {
  fs.mkdirSync(logsDir, { recursive: true });
  fs.mkdirSync(backupsDir, { recursive: true });

  const html = fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath, "utf8") : "";
  const data = readCalendarData(html);
  const preferences = readJson(preferencesPath);
  const sources = readJson(sourcesPath);
  const sourceStrategy = fs.existsSync(sourceStrategyPath) ? readJson(sourceStrategyPath) : {};
  const userFeedback = fs.existsSync(userFeedbackPath) ? readJson(userFeedbackPath) : {};

  const deterministicRemovals = getPastFinishedRemovals(data, today);
  let proposal = emptyProposal(today);
  proposal.removals.events.push(...deterministicRemovals);

  if (!pruneOnly) {
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY is not set. Set it in updater/.env.local, then run `npm run update` again.");
    }
    const aiProposal = await requestAiProposal({ data, preferences, sources, sourceStrategy, userFeedback, today, model, apiKey });
    proposal = mergeProposals(proposal, aiProposal);
  }

  const beforeCounts = countData(data);
  const proposedData = applyProposal(data, proposal, today);
  const afterCounts = countData(proposedData);
  validateData(proposedData);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonLog = path.join(logsDir, `${stamp}-proposal.json`);
  const mdLog = path.join(logsDir, `${stamp}-${apply ? "applied" : "review"}.md`);

  fs.writeFileSync(jsonLog, JSON.stringify(proposal, null, 2), "utf8");
  fs.writeFileSync(mdLog, renderMarkdownLog({ proposal, beforeCounts, afterCounts, apply, pruneOnly, today, model }), "utf8");

  if (apply) {
    const backupPath = path.join(backupsDir, `calendar-data-${stamp}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(data, null, 2), "utf8");
    fs.writeFileSync(dataPath, `${JSON.stringify(proposedData, null, 2)}\n`, "utf8");
    fs.writeFileSync(latestChangesPath, `${JSON.stringify(renderLatestChanges({ proposal, beforeCounts, afterCounts, today }), null, 2)}\n`, "utf8");
    execFileSync(process.execPath, [path.join(__dirname, "generate-site-files.mjs"), "--date", today], { stdio: "inherit" });
    console.log(`Applied update. Backup: ${path.relative(repoRoot, backupPath)}`);
  } else {
    console.log("Dry run complete. Review the log, then run `npm run update:apply` if it looks right.");
  }

  console.log(`Markdown log: ${path.relative(repoRoot, mdLog)}`);
  console.log(`JSON proposal: ${path.relative(repoRoot, jsonLog)}`);
  console.log(JSON.stringify({ before: beforeCounts, after: afterCounts }, null, 2));
}

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

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (!process.env[key]) {
      process.env[key] = rest.join("=").replace(/^["']|["']$/g, "");
    }
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readCalendarData(html) {
  if (fs.existsSync(dataPath)) return readJson(dataPath);
  return extractCalendarData(html);
}

function extractCalendarData(html) {
  const match = html.match(/<script type="application\/json" id="calendarData">([\s\S]*?)<\/script>/);
  if (!match) throw new Error("Could not find embedded calendarData JSON block");
  return JSON.parse(match[1]);
}

function countData(data) {
  return {
    events: data.events?.length || 0,
    recurring: data.recurring?.length || 0,
    sources: data.sources?.length || 0,
    watchlist: data.watchlist?.length || 0
  };
}

function renderLatestChanges({ proposal, beforeCounts, afterCounts, today }) {
  return {
    generatedAt: new Date().toISOString(),
    dateBasis: today,
    summary: proposal.summary || "Calendar updated.",
    added: [
      ...(proposal.additions?.events || []).map((event) => `${event.date} ${event.title}`),
      ...(proposal.additions?.recurring || []).map((row) => `Recurring: ${row.name}`)
    ],
    updated: [
      ...(proposal.updates?.events || []).map((event) => `${event.id} ${event.title}`),
      ...(proposal.updates?.recurring || []).map((row) => `Recurring: ${row.id} ${row.name}`)
    ],
    removed: [
      ...(proposal.removals?.events || []).map((event) => `${event.id}: ${event.reason}`),
      ...(proposal.removals?.recurring || []).map((row) => `Recurring ${row.id}: ${row.reason}`)
    ],
    counts: {
      before: beforeCounts,
      after: afterCounts
    }
  };
}

function emptyProposal(date) {
  return {
    summary: `Deterministic calendar maintenance for ${date}.`,
    additions: { events: [], recurring: [] },
    updates: { events: [], recurring: [] },
    removals: { events: [], recurring: [] },
    sourceNotes: [],
    watchlist: []
  };
}

function mergeProposals(base, incoming) {
  return {
    summary: incoming.summary || base.summary,
    additions: {
      events: [...base.additions.events, ...(incoming.additions?.events || [])],
      recurring: [...base.additions.recurring, ...(incoming.additions?.recurring || [])]
    },
    updates: {
      events: [...base.updates.events, ...(incoming.updates?.events || [])],
      recurring: [...base.updates.recurring, ...(incoming.updates?.recurring || [])]
    },
    removals: {
      events: [...base.removals.events, ...(incoming.removals?.events || [])],
      recurring: [...base.removals.recurring, ...(incoming.removals?.recurring || [])]
    },
    sourceNotes: [...base.sourceNotes, ...(incoming.sourceNotes || [])],
    watchlist: [...base.watchlist, ...(incoming.watchlist || [])]
  };
}

function getPastFinishedRemovals(data, date) {
  return (data.events || [])
    .filter((event) => (event.endDate || event.date) < date)
    .map((event) => ({
      id: event.id,
      reason: `Finished before ${date}`,
      confidence: "High / deterministic"
    }));
}

async function requestAiProposal({ data, preferences, sources, sourceStrategy, userFeedback, today, model, apiKey }) {
  const compactData = compactCalendarData(data, today);
  const prompt = buildPrompt({ compactData, preferences, sources, sourceStrategy, userFeedback, today });
  const schema = proposalSchema();

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "file:///C:/Users/cobra/local-events/index.html",
      "X-OpenRouter-Title": "Surbiton Local Events Calendar"
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: "You are a careful local-events calendar maintainer. Return only valid JSON matching the response schema."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      tools: [
        {
          type: "openrouter:web_search",
          parameters: {
            engine: "auto",
            max_results: 5,
            max_total_results: 25,
            search_context_size: "medium",
            user_location: {
              type: "approximate",
              city: "Surbiton",
              region: "London",
              country: "GB",
              timezone: "Europe/London"
            }
          }
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "local_events_calendar_update",
          strict: true,
          schema
        }
      }
    })
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`OpenRouter API request failed (${response.status}): ${JSON.stringify(payload, null, 2)}`);
  }

  const outputText = payload.choices?.[0]?.message?.content || payload.output_text || collectOutputText(payload);
  if (!outputText) {
    throw new Error(`OpenRouter response did not include message content: ${JSON.stringify(payload, null, 2)}`);
  }

  const proposal = typeof outputText === "string" ? JSON.parse(outputText) : outputText;
  validateProposalShape(proposal);
  return proposal;
}

function compactCalendarData(data, today) {
  const futureEvents = (data.events || [])
    .filter((event) => (event.endDate || event.date) >= today)
    .map((event) => ({
      id: event.id,
      date: event.date,
      endDate: event.endDate || "",
      time: event.time || "",
      title: event.title,
      venue: event.venue,
      area: event.area,
      category: event.category,
      cost: event.cost || "",
      source: event.source,
      url: event.url,
      confidence: event.confidence
    }));

  return {
    meta: data.meta,
    existingEvents: futureEvents,
    recurring: data.recurring || [],
    sources: data.sources || [],
    watchlist: data.watchlist || []
  };
}

function buildPrompt({ compactData, preferences, sources, sourceStrategy, userFeedback, today }) {
  return [
    "You are maintaining a standalone local events calendar for a family in Surbiton, UK.",
    `Today is ${today}. Only propose current/future events from today through 2026-12-31.`,
    "Use web search and official/primary sources whenever possible. Do not guess dates from stale pages.",
    "Return only JSON matching the supplied schema.",
    "",
    "Curation profile:",
    JSON.stringify(preferences, null, 2),
    "",
    "Source and curation strategy:",
    JSON.stringify(sourceStrategy, null, 2),
    "",
    "Exported user feedback / negative examples:",
    JSON.stringify(userFeedback, null, 2),
    "",
    "Known sources and searches to check:",
    JSON.stringify(sources, null, 2),
    "",
    "Existing embedded calendar data, compacted:",
    JSON.stringify(compactData, null, 2),
    "",
    "Update rules:",
    "- Prefer adding high-signal events: music, theatre, kid-friendly, daytime/free music, folk/trad/Irish, Hampton Court, miniature railway, Canbury Bandstand, distinctive festivals and markets.",
    "- Avoid the configured remove/avoid categories.",
    "- Treat exported user feedback as strong negative examples. Avoid exact rejected rows and similar future rows unless clearly different or much higher value.",
    "- If an event already exists, return an update rather than a duplicate.",
    "- UX rule: if a source page represents selected monthly, fortnightly, or irregular dates as a date range, split those into separate one-day event rows. Only use date ranges for true multi-day runs, exhibitions, festivals, theatre runs, seasonal attractions, or weekly class/workshop blocks where the range is clearer than many rows.",
    "- Use specific event URLs, not generic index URLs, when available.",
    "- Keep proposed descriptions short and factual.",
    "- Include a source note for every source used to add or materially update rows.",
    "- Put uncertain leads in watchlist instead of additions.",
    "- Do not remove rows only because they are not perfect; removals should be past rows, disliked categories, duplicates, cancelled events, or stale/incorrect rows."
  ].join("\n");
}

function proposalSchema() {
  const event = {
    type: "object",
    additionalProperties: false,
    properties: {
      id: { type: "string" },
      date: { type: "string" },
      endDate: { type: "string" },
      time: { type: "string" },
      startTime: { type: "string" },
      title: { type: "string" },
      venue: { type: "string" },
      area: { type: "string" },
      category: { type: "string" },
      type: { type: "string" },
      cost: { type: "string" },
      tier: { type: "string" },
      description: { type: "string" },
      source: { type: "string" },
      url: { type: "string" },
      confidence: { type: "string" },
      verify: { type: "boolean" },
      reason: { type: "string" }
    },
    required: ["id", "date", "endDate", "time", "startTime", "title", "venue", "area", "category", "type", "cost", "tier", "description", "source", "url", "confidence", "verify", "reason"]
  };

  const recurring = {
    type: "object",
    additionalProperties: false,
    properties: {
      id: { type: "string" },
      name: { type: "string" },
      pattern: { type: "string" },
      venue: { type: "string" },
      area: { type: "string" },
      category: { type: "string" },
      dates: { type: "string" },
      source: { type: "string" },
      url: { type: "string" },
      confidence: { type: "string" },
      verify: { type: "boolean" },
      reason: { type: "string" }
    },
    required: ["id", "name", "pattern", "venue", "area", "category", "dates", "source", "url", "confidence", "verify", "reason"]
  };

  const removal = {
    type: "object",
    additionalProperties: false,
    properties: {
      id: { type: "string" },
      reason: { type: "string" },
      confidence: { type: "string" }
    },
    required: ["id", "reason", "confidence"]
  };

  return {
    type: "object",
    additionalProperties: false,
    properties: {
      summary: { type: "string" },
      additions: {
        type: "object",
        additionalProperties: false,
        properties: {
          events: { type: "array", items: event },
          recurring: { type: "array", items: recurring }
        },
        required: ["events", "recurring"]
      },
      updates: {
        type: "object",
        additionalProperties: false,
        properties: {
          events: { type: "array", items: event },
          recurring: { type: "array", items: recurring }
        },
        required: ["events", "recurring"]
      },
      removals: {
        type: "object",
        additionalProperties: false,
        properties: {
          events: { type: "array", items: removal },
          recurring: { type: "array", items: removal }
        },
        required: ["events", "recurring"]
      },
      sourceNotes: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            name: { type: "string" },
            url: { type: "string" },
            notes: { type: "string" }
          },
          required: ["name", "url", "notes"]
        }
      },
      watchlist: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            item: { type: "string" },
            finding: { type: "string" },
            recommendedAction: { type: "string" },
            url: { type: "string" }
          },
          required: ["item", "finding", "recommendedAction", "url"]
        }
      }
    },
    required: ["summary", "additions", "updates", "removals", "sourceNotes", "watchlist"]
  };
}

function collectOutputText(payload) {
  const chunks = [];
  for (const item of payload.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) chunks.push(content.text);
    }
  }
  return chunks.join("");
}

function validateProposalShape(proposal) {
  for (const key of ["additions", "updates", "removals"]) {
    if (!proposal[key]?.events || !proposal[key]?.recurring) {
      throw new Error(`Proposal missing ${key}.events or ${key}.recurring`);
    }
  }
}

function applyProposal(data, proposal, date) {
  const next = JSON.parse(JSON.stringify(data));
  const removeEventIds = new Set((proposal.removals?.events || []).map((r) => r.id));
  const removeRecurringIds = new Set((proposal.removals?.recurring || []).map((r) => r.id));

  next.events = (next.events || []).filter((event) => !removeEventIds.has(event.id));
  next.recurring = (next.recurring || []).filter((row) => !removeRecurringIds.has(row.id));

  for (const update of proposal.updates?.events || []) {
    const existing = next.events.find((event) => event.id === update.id);
    if (existing) Object.assign(existing, normalizeEvent(update, existing.id, existing.row, date));
  }

  for (const update of proposal.updates?.recurring || []) {
    const existing = next.recurring.find((row) => row.id === update.id);
    if (existing) Object.assign(existing, normalizeRecurring(update, existing.id, existing.row));
  }

  let nextEventNumber = nextIdNumber(next.events, "e");
  let nextEventRow = nextRowNumber(next.events);
  for (const addition of proposal.additions?.events || []) {
    if (isDuplicateEvent(next.events, addition)) continue;
    next.events.push(normalizeEvent(addition, `e${nextEventNumber++}`, nextEventRow++, date));
  }

  let nextRecurringNumber = nextIdNumber(next.recurring, "r");
  let nextRecurringRow = nextRowNumber(next.recurring);
  for (const addition of proposal.additions?.recurring || []) {
    if (isDuplicateRecurring(next.recurring, addition)) continue;
    next.recurring.push(normalizeRecurring(addition, `r${nextRecurringNumber++}`, nextRecurringRow++));
  }

  for (const note of proposal.sourceNotes || []) {
    if (!note.name || !note.url) continue;
    const existing = (next.sources || []).find((source) => source.name === note.name || source.url === note.url);
    if (existing) existing.notes = note.notes || existing.notes;
    else next.sources.push({ name: note.name, url: note.url, notes: note.notes || "" });
  }

  for (const item of proposal.watchlist || []) {
    if (!item.item) continue;
    const existing = (next.watchlist || []).find((w) => (w["Item / gap"] || w.item) === item.item);
    const row = {
      "Item / gap": item.item,
      "What I found": item.finding,
      "Recommended action": item.recommendedAction,
      "Source URL": item.url
    };
    if (existing) Object.assign(existing, row);
    else next.watchlist.push(row);
  }

  next.events.sort((a, b) => (a.sortKey || `${a.date}T${a.startTime || "99:99"}`).localeCompare(b.sortKey || `${b.date}T${b.startTime || "99:99"}`));
  next.meta = { ...(next.meta || {}), updated: date };
  return next;
}

function normalizeEvent(row, id, rowNumber, today) {
  const date = row.date;
  const startTime = row.startTime || parseStartTime(row.time);
  const event = {
    id,
    row: rowNumber,
    date,
    endDate: row.endDate || "",
    time: row.time || "",
    startTime,
    title: row.title,
    venue: row.venue,
    area: row.area,
    category: row.category,
    type: row.type,
    cost: row.cost || "",
    tier: row.tier || "Nearby",
    description: row.description || "",
    source: row.source,
    url: row.url,
    confidence: row.confidence,
    status: "Current/future",
    day: formatDay(date),
    month: formatMonth(date),
    sortKey: `${date}T${startTime || "23:59"}`,
    verify: Boolean(row.verify),
    pastArchive: false
  };
  if ((event.endDate || event.date) < today) {
    throw new Error(`Refusing to add past event ${event.title} on ${event.date}`);
  }
  event.searchText = buildEventSearchText(event);
  return event;
}

function normalizeRecurring(row, id, rowNumber) {
  const recurring = {
    id,
    row: rowNumber,
    name: row.name,
    pattern: row.pattern,
    venue: row.venue,
    area: row.area,
    category: row.category,
    dates: row.dates || "",
    source: row.source,
    url: row.url,
    confidence: row.confidence,
    verify: Boolean(row.verify)
  };
  recurring.searchText = `${recurring.name} ${recurring.pattern} ${recurring.venue} ${recurring.area} ${recurring.category} ${recurring.dates} ${recurring.source} ${recurring.confidence}`.toLowerCase();
  return recurring;
}

function nextIdNumber(rows, prefix) {
  return Math.max(0, ...rows.map((row) => Number(String(row.id || "").replace(prefix, ""))).filter(Number.isFinite)) + 1;
}

function nextRowNumber(rows) {
  return Math.max(0, ...rows.map((row) => Number(row.row)).filter(Number.isFinite)) + 1;
}

function isDuplicateEvent(events, candidate) {
  return events.some((event) =>
    event.date === candidate.date &&
    normalize(event.title) === normalize(candidate.title) &&
    normalize(event.venue) === normalize(candidate.venue)
  );
}

function isDuplicateRecurring(rows, candidate) {
  return rows.some((row) => normalize(row.name) === normalize(candidate.name) && normalize(row.venue) === normalize(candidate.venue));
}

function parseStartTime(time) {
  const match = String(time || "").match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (!match) return "";
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function formatDay(iso) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(new Date(`${iso}T12:00:00`));
}

function formatMonth(iso) {
  return new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" }).format(new Date(`${iso}T12:00:00`));
}

function buildEventSearchText(event) {
  return [
    event.title,
    event.venue,
    event.area,
    event.category,
    event.type,
    event.cost,
    event.tier,
    event.description,
    event.source,
    event.confidence,
    event.time,
    event.date,
    event.status
  ].filter(Boolean).join(" ").toLowerCase();
}

function normalize(value) {
  return String(value || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").trim();
}

function validateData(data) {
  const ids = new Set();
  for (const event of data.events || []) {
    if (!event.id || ids.has(event.id)) throw new Error(`Duplicate/missing event id: ${event.id}`);
    ids.add(event.id);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(event.date)) throw new Error(`Bad event date for ${event.id}: ${event.date}`);
    if (!event.title || !event.venue || !event.url) throw new Error(`Incomplete event ${event.id}`);
  }
  const recurringIds = new Set();
  for (const row of data.recurring || []) {
    if (!row.id || recurringIds.has(row.id)) throw new Error(`Duplicate/missing recurring id: ${row.id}`);
    recurringIds.add(row.id);
    if (!row.name || !row.pattern) throw new Error(`Incomplete recurring row ${row.id}`);
  }
}

function renderMarkdownLog({ proposal, beforeCounts, afterCounts, apply, pruneOnly, today, model }) {
  const lines = [];
  lines.push(`# Local Events Update - ${new Date().toLocaleString("en-GB")}`);
  lines.push("");
  lines.push(`Mode: ${apply ? "applied" : "review only"}`);
  lines.push(`Date basis: ${today}`);
  lines.push(`Model: ${pruneOnly ? "not used; prune-only" : model}`);
  lines.push("");
  lines.push(`Before: ${beforeCounts.events} dated / ${beforeCounts.recurring} recurring`);
  lines.push(`After: ${afterCounts.events} dated / ${afterCounts.recurring} recurring`);
  lines.push("");
  lines.push(`Summary: ${proposal.summary}`);
  lines.push("");
  addSection(lines, "Added Dated Events", proposal.additions.events, (e) => `- ${e.date} ${e.time || ""} - ${e.title} @ ${e.venue} (${e.source})`);
  addSection(lines, "Updated Dated Events", proposal.updates.events, (e) => `- ${e.id} - ${e.title}: ${e.reason}`);
  addSection(lines, "Removed Dated Events", proposal.removals.events, (e) => `- ${e.id}: ${e.reason}`);
  addSection(lines, "Added Recurring Rows", proposal.additions.recurring, (r) => `- ${r.name} @ ${r.venue}: ${r.pattern}`);
  addSection(lines, "Updated Recurring Rows", proposal.updates.recurring, (r) => `- ${r.id} - ${r.name}: ${r.reason}`);
  addSection(lines, "Removed Recurring Rows", proposal.removals.recurring, (r) => `- ${r.id}: ${r.reason}`);
  addSection(lines, "Source Notes", proposal.sourceNotes, (s) => `- ${s.name}: ${s.url} - ${s.notes}`);
  addSection(lines, "Watchlist", proposal.watchlist, (w) => `- ${w.item}: ${w.finding} Next: ${w.recommendedAction} ${w.url}`);
  return `${lines.join("\n")}\n`;
}

function addSection(lines, title, rows, render) {
  lines.push(`## ${title}`);
  if (!rows?.length) lines.push("- None");
  else rows.forEach((row) => lines.push(render(row)));
  lines.push("");
}
