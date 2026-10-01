import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createWorker } from "tesseract.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(fs.readFileSync(path.join(root, "updater", "facebook-sources.json"), "utf8"));
const args = new Set(process.argv.slice(2));
const quiet = args.has("--quiet");
const ocrEnabled = !args.has("--no-ocr");
const headed = args.has("--headed");
const onlyArg = process.argv.find((arg) => arg.startsWith("--page="));
const onlyPage = onlyArg ? onlyArg.split("=").slice(1).join("=").trim().toLowerCase() : "";
const maxArg = process.argv.find((arg) => arg.startsWith("--max-posts="));
const maxOverride = maxArg ? Number(maxArg.split("=")[1]) : null;

const profileDir = path.resolve(root, config.profileDir || "updater/facebook-profile");
const outputPath = path.resolve(root, config.output || "updater/facebook-leads.json");
const screenshotDir = path.resolve(root, config.screenshotDir || "updater/social-screenshots");
const ocrCacheDir = path.resolve(root, config.ocrCacheDir || "updater/ocr-cache");
const maxPosts = Number.isFinite(maxOverride) && maxOverride > 0
  ? maxOverride
  : Number(config.maxPostsPerPage || 20);
const pages = (config.pages || [])
  .filter((page) => page.enabled !== false)
  .filter((page) => !onlyPage || page.name.toLowerCase().includes(onlyPage));

if (!pages.length) throw new Error(onlyPage ? `No enabled Facebook page matched ${onlyPage}` : "No Facebook pages configured.");

fs.mkdirSync(profileDir, { recursive: true });
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.mkdirSync(screenshotDir, { recursive: true });
fs.mkdirSync(ocrCacheDir, { recursive: true });

const context = await chromium.launchPersistentContext(profileDir, {
  headless: !headed,
  locale: "en-GB",
  timezoneId: "Europe/London",
  viewport: { width: 1400, height: 1000 }
});

let ocrWorker = null;

function log(message) {
  if (!quiet) console.log(message);
}

function londonToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function normalizeText(value) {
  return String(value || "")
    .replace(/\u00c2\u00b7/g, "\u00b7")
    .replace(/\u00c2\u2026/g, "\u2026")
    .replace(/\u00c3\u00a9/g, "\u00e9")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && line !== "Facebook")
    .filter((line) => !/^Comment as\b/i.test(line))
    .filter((line) => !/^(Like|Comment|Share|Interested|Following)$/i.test(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function fetchEventDetails(page, eventUrl) {
  if (!eventUrl) return "";
  try {
    await page.goto(eventUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(1800);
    const expanders = page.getByText("See more", { exact: true });
    const count = await expanders.count().catch(() => 0);
    for (let index = 0; index < Math.min(count, 4); index += 1) {
      await expanders.nth(index).click({ timeout: 1000 }).catch(() => {});
    }
    await page.waitForTimeout(250);
    const body = normalizeText(await page.locator("body").innerText({ timeout: 10000 }).catch(() => ""));
    if (!body) return "";
    const detailsIndex = body.indexOf("\nDetails\n");
    const hostIndex = body.indexOf("\nMeet your host", Math.max(0, detailsIndex));
    const headerStart = Math.max(0, detailsIndex - 600);
    const end = hostIndex > detailsIndex ? hostIndex : Math.min(body.length, detailsIndex + 3500);
    return body.slice(headerStart, end).trim().slice(0, 5000);
  } catch {
    return "";
  }
}

function canonicalFacebookUrl(value) {
  try {
    const url = new URL(value);
    if (/\/events\/\d+/.test(url.pathname)) {
      const match = url.pathname.match(/\/events\/(\d+)/);
      return `https://www.facebook.com/events/${match[1]}/`;
    }
    url.search = "";
    url.hash = "";
    return url.href;
  } catch {
    return value || "";
  }
}

function safeSlug(value) {
  return String(value || "facebook")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "facebook";
}

function classifyLead(text) {
  const hay = text.toLowerCase();
  const tags = ["facebook"];
  if (/\b(live music|gig|band|jazz|folk|trad|irish|session|singer|swing|americana|country|blues|cajun|manouche)\b/.test(hay)) tags.push("music");
  if (/\b(kids|family|children|toddler|baby|story|craft|fair|fete)\b/.test(hay)) tags.push("family");
  if (/\b(free|no ticket|donations?)\b/.test(hay)) tags.push("free");
  if (/\b(today|tonight|tomorrow|this sunday|this friday|this saturday|next week|mon|tue|wed|thu|fri|sat|sun)\b/i.test(hay)) tags.push("dated-lead");
  return [...new Set(tags)];
}

async function getOcrWorker() {
  if (!ocrEnabled) return null;
  if (!ocrWorker) {
    log("Starting local OCR worker");
    ocrWorker = await createWorker("eng", 1, { cachePath: ocrCacheDir });
  }
  return ocrWorker;
}

async function ocrImage(filePath) {
  if (!ocrEnabled || !filePath) return { text: "", confidence: null, error: "" };
  try {
    const worker = await getOcrWorker();
    const result = await worker.recognize(filePath);
    return {
      text: normalizeText(result?.data?.text || ""),
      confidence: typeof result?.data?.confidence === "number" ? Math.round(result.data.confidence) : null,
      error: ""
    };
  } catch (error) {
    return { text: "", confidence: null, error: error instanceof Error ? error.message : String(error) };
  }
}

async function captureImage(page, source, leadKey) {
  if (!source) return "";
  const filePath = path.join(screenshotDir, `facebook-${safeSlug(leadKey)}.jpg`);
  try {
    const response = await page.request.get(source, { timeout: 30000, headers: { referer: page.url() } });
    if (!response.ok()) return "";
    fs.writeFileSync(filePath, await response.body());
    return filePath;
  } catch {
    return "";
  }
}

function pathForJson(filePath) {
  return filePath ? path.relative(root, filePath).replace(/\\/g, "/") : "";
}

function matchesConfiguredTerms(source, text) {
  if (!source.includeTerms?.length) return true;
  const hay = text.toLowerCase();
  return source.includeTerms.some((term) => hay.includes(String(term).toLowerCase()));
}

async function collectPage(source) {
  const page = await context.newPage();
  const detailPage = source.enrichEvents === false ? null : await context.newPage();
  const sourceMaxPosts = Number(source.maxPosts || maxPosts);
  const maxScrollSteps = Number(source.maxScrollSteps || config.maxScrollSteps || 20);
  const status = {
    name: source.name,
    url: source.url,
    rowsSeen: 0,
    leadsCollected: 0,
    filteredOut: 0,
    screenshotsCaptured: 0,
    ocrProcessed: 0,
    ok: false,
    error: ""
  };
  const rowsByKey = new Map();

  try {
    log(`Checking ${source.name}`);
    if (source.eventsUrl) {
      await page.goto(source.eventsUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(3000);
      const eventRows = await page.locator("a").evaluateAll((anchors) => {
        const found = new Map();
        for (const anchor of anchors) {
          const match = anchor.href?.match(/facebook\.com\/events\/(\d+)/);
          if (!match) continue;
          let container = anchor;
          for (let depth = 0; depth < 8 && container?.parentElement; depth += 1) {
            container = container.parentElement;
            const candidate = container.innerText || "";
            if (/Event by\b/.test(candidate) && candidate.length < 1000) break;
          }
          const text = container?.innerText || anchor.innerText || "";
          const image = container?.querySelector("img") || null;
          const eventUrl = `https://www.facebook.com/events/${match[1]}/`;
          const previous = found.get(eventUrl);
          if (!previous || text.length > previous.text.length) {
            found.set(eventUrl, {
              position: `upcoming-${match[1]}`,
              text,
              eventUrl,
              postUrl: "",
              imageUrl: image?.currentSrc || image?.src || "",
              imageAlt: image?.alt || "",
              origin: "upcoming-events"
            });
          }
        }
        return [...found.values()];
      });
      for (const row of eventRows) {
        const visibleText = normalizeText(row.text);
        if (visibleText) rowsByKey.set(row.eventUrl, { ...row, visibleText, permalink: row.eventUrl });
      }
      status.upcomingEventsFound = eventRows.length;
    }

    await page.goto(source.url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(3500);
    const body = await page.locator("body").innerText({ timeout: 10000 }).catch(() => "");
    if (/log in to facebook|email address or phone number\s+password/i.test(body) || /\/login/.test(page.url())) {
      status.error = "Facebook login required or session expired. Run: npm run facebook:login";
      return status;
    }

    let unchangedRounds = 0;
    for (let step = 0; step < maxScrollSteps && rowsByKey.size < sourceMaxPosts; step += 1) {
      const before = rowsByKey.size;
      const rows = await page.locator("div[aria-posinset]").evaluateAll((elements) => elements.map((element) => {
        const links = Array.from(element.querySelectorAll("a[href]"))
          .map((anchor) => anchor.href)
          .filter(Boolean);
        const eventUrl = links.find((href) => /facebook\.com\/events\/\d+/.test(href)) || "";
        const postUrl = links.find((href) => /facebook\.com\/.+\/(?:posts|videos|reel)\//.test(href)) || "";
        const images = Array.from(element.querySelectorAll("img"))
          .map((image) => ({
            src: image.currentSrc || image.src || "",
            alt: image.alt || "",
            area: Number(image.naturalWidth || 0) * Number(image.naturalHeight || 0)
          }))
          .filter((image) => image.src && image.area >= 50000)
          .sort((a, b) => b.area - a.area);
        return {
          position: element.getAttribute("aria-posinset") || "",
          text: element.innerText || "",
          eventUrl,
          postUrl,
          imageUrl: images[0]?.src || "",
          imageAlt: images[0]?.alt || ""
        };
      }));

      for (const row of rows) {
        const visibleText = normalizeText(row.text);
        if (!visibleText || visibleText.length < 12) continue;
        const permalink = canonicalFacebookUrl(row.eventUrl || row.postUrl || source.url);
        const key = row.eventUrl || row.postUrl || `${row.position}:${visibleText.slice(0, 160)}`;
        if (!rowsByKey.has(key)) rowsByKey.set(key, { ...row, visibleText, permalink, origin: "feed" });
      }

      unchangedRounds = rowsByKey.size === before ? unchangedRounds + 1 : 0;
      if (unchangedRounds >= 3) break;
      await page.mouse.wheel(0, 1000);
      await page.waitForTimeout(750);
    }

    status.rowsSeen = rowsByKey.size;
    for (const [key, row] of [...rowsByKey.entries()].slice(0, sourceMaxPosts)) {
      const preliminary = normalizeText([row.visibleText, row.imageAlt].filter(Boolean).join("\n"));
      if (!matchesConfiguredTerms(source, preliminary) && !row.eventUrl) {
        status.filteredOut += 1;
        continue;
      }

      const screenshotPath = row.eventUrl
        ? ""
        : await captureImage(page, row.imageUrl, `${source.name}-${key}`);
      if (screenshotPath) status.screenshotsCaptured += 1;
      const ocr = await ocrImage(screenshotPath);
      if (ocr.text || ocr.error) status.ocrProcessed += 1;
      const eventDetails = row.eventUrl && row.origin === "upcoming-events" && detailPage
        ? await fetchEventDetails(detailPage, canonicalFacebookUrl(row.eventUrl))
        : "";
      const text = normalizeText([
        row.visibleText,
        row.imageAlt,
        eventDetails ? `Facebook event details:\n${eventDetails}` : "",
        ocr.text ? `OCR text from Facebook image:\n${ocr.text}` : ""
      ].filter(Boolean).join("\n\n"));

      if (!matchesConfiguredTerms(source, text) && !row.eventUrl) {
        status.filteredOut += 1;
        continue;
      }

      results.leads.push({
        pageName: source.name,
        venue: source.venue || source.name,
        area: source.area || "",
        calendarTargets: source.calendarTargets || [],
        priority: source.priority || "normal",
        origin: row.origin || "feed",
        permalink: row.permalink,
        collectedAt: new Date().toISOString(),
        confidence: "social",
        needsReview: true,
        tags: classifyLead(text),
        screenshot: pathForJson(screenshotPath),
        ocrText: ocr.text,
        ocrConfidence: ocr.confidence,
        ocrError: ocr.error,
        visibleText: row.visibleText,
        eventDetails,
        text
      });
      status.leadsCollected += 1;
    }

    status.ok = true;
    return status;
  } catch (error) {
    status.error = error instanceof Error ? error.message : String(error);
    return status;
  } finally {
    await page.close().catch(() => {});
    if (detailPage) await detailPage.close().catch(() => {});
  }
}

const results = {
  generatedAt: new Date().toISOString(),
  dateBasis: londonToday(),
  source: "facebook-logged-in-browser",
  note: "Collected from configured Facebook pages with a local persistent browser session. Treat as social leads and verify event details against official pages when possible.",
  pages: [],
  leads: []
};

try {
  for (const source of pages) results.pages.push(await collectPage(source));
} finally {
  if (ocrWorker) await ocrWorker.terminate().catch(() => {});
  await context.close().catch(() => {});
}

results.summary = {
  pagesChecked: results.pages.length,
  pagesOk: results.pages.filter((page) => page.ok).length,
  leadsCollected: results.leads.length,
  screenshotsCaptured: results.pages.reduce((sum, page) => sum + page.screenshotsCaptured, 0),
  ocrProcessed: results.pages.reduce((sum, page) => sum + page.ocrProcessed, 0),
  loginRequired: results.pages.some((page) => /login required|session expired/i.test(page.error || ""))
};

fs.writeFileSync(outputPath, `${JSON.stringify(results, null, 2)}\n`, "utf8");
console.log(JSON.stringify(results.summary, null, 2));
if (results.summary.loginRequired) process.exitCode = 2;
