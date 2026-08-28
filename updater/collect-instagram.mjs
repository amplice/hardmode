import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createWorker } from "tesseract.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const configPath = path.join(root, "updater", "instagram-sources.json");
const args = new Set(process.argv.slice(2));
const quiet = args.has("--quiet");
const ocrEnabled = !args.has("--no-ocr");
const headless = args.has("--headless");
const headed = args.has("--headed") || !headless;
const onlyArg = process.argv.find((arg) => arg.startsWith("--profile="));
const onlyProfile = onlyArg ? onlyArg.split("=").slice(1).join("=").trim().replace(/^@/, "") : "";
const maxArg = process.argv.find((arg) => arg.startsWith("--max-posts="));
const maxOverride = maxArg ? Number(maxArg.split("=")[1]) : null;

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeText(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function classifyLead(text) {
  const hay = text.toLowerCase();
  const tags = [];
  if (/\b(live music|gig|band|jazz|folk|trad|irish|session|singer|acoustic|dj)\b/.test(hay)) tags.push("music");
  if (/\b(kids|family|children|toddler|baby|story|craft|face paint|fair|fete)\b/.test(hay)) tags.push("family");
  if (/\b(free|no ticket|donations?)\b/.test(hay)) tags.push("free");
  if (/\b(today|tonight|tomorrow|this sunday|this friday|this saturday|next week|\d{1,2}(st|nd|rd|th)?\b)\b/.test(hay)) tags.push("dated-lead");
  return [...new Set(tags)];
}

function toOutputPath(config) {
  return path.resolve(root, config.output || "updater/social-leads.json");
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const profileDir = path.resolve(root, config.profileDir || "updater/instagram-profile");
const outputPath = toOutputPath(config);
const screenshotDir = path.resolve(root, config.screenshotDir || "updater/social-screenshots");
const ocrCacheDir = path.resolve(root, config.ocrCacheDir || "updater/ocr-cache");
const maxPostsDefault = Number.isFinite(config.maxPostsPerProfile) ? config.maxPostsPerProfile : 12;
const profiles = (config.profiles || [])
  .filter((profile) => profile.enabled !== false)
  .filter((profile) => !onlyProfile || profile.handle === onlyProfile);

if (!profiles.length) {
  throw new Error(onlyProfile ? `No enabled Instagram profile found for ${onlyProfile}` : "No enabled Instagram profiles configured.");
}

fs.mkdirSync(profileDir, { recursive: true });
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.mkdirSync(screenshotDir, { recursive: true });
fs.mkdirSync(ocrCacheDir, { recursive: true });

const context = await chromium.launchPersistentContext(profileDir, {
  headless: !headed,
  locale: "en-GB",
  timezoneId: "Europe/London",
  viewport: { width: 1280, height: 900 }
});

const results = {
  generatedAt: new Date().toISOString(),
  dateBasis: londonToday(),
  source: "instagram-logged-in-browser",
  note: "Collected from configured Instagram profile pages using a local persistent browser session. Treat as social leads; confirm details where possible before publishing.",
  profiles: [],
  leads: []
};

let ocrWorker = null;

function pathForJson(filePath) {
  return path.relative(root, filePath).replace(/\\/g, "/");
}

function safeSlug(value) {
  return String(value || "post")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "post";
}

async function getOcrWorker() {
  if (!ocrEnabled) return null;
  if (!ocrWorker) {
    log("Starting local OCR worker");
    ocrWorker = await createWorker("eng", 1, {
      cachePath: ocrCacheDir
    });
  }
  return ocrWorker;
}

async function pageLooksLoggedOut(page) {
  const url = page.url();
  const text = await page.locator("body").innerText({ timeout: 5000 }).catch(() => "");
  return /\/accounts\/login/.test(url) || /\bLog in\b.*\bSign up\b/is.test(text) || /\bLog in to Instagram\b/i.test(text);
}

async function capturePostScreenshot(page, handle, url, imageUrl = "") {
  const parsed = new URL(url);
  const parts = parsed.pathname.split("/").filter(Boolean);
  const markerIndex = parts.findIndex((part) => ["p", "reel", "tv"].includes(part));
  const postSlug = markerIndex >= 0 ? parts[markerIndex + 1] : parts[parts.length - 1];
  const fileName = `${handle}-${safeSlug(postSlug)}.${imageUrl ? "jpg" : "png"}`;
  const filePath = path.join(screenshotDir, fileName);
  if (imageUrl) {
    const response = await page.request.get(imageUrl, {
      headers: { referer: url },
      timeout: 20000
    });
    if (response.ok()) {
      fs.writeFileSync(filePath, await response.body());
      return filePath;
    }
  }

  const mediaLocator = page.locator("article img, article video");
  const mediaIndex = await mediaLocator.evaluateAll((elements) => {
    let best = -1;
    let bestArea = 0;
    for (const [index, element] of elements.entries()) {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      const area = rect.width * rect.height;
      if (style.visibility !== "hidden" && style.display !== "none" && area > bestArea) {
        best = index;
        bestArea = area;
      }
    }
    return bestArea >= 10000 ? best : -1;
  }).catch(() => -1);

  if (mediaIndex >= 0) {
    await mediaLocator.nth(mediaIndex).screenshot({ path: filePath, timeout: 15000 }).catch(async () => {
      await page.screenshot({ path: filePath, fullPage: false, timeout: 15000 });
    });
    return filePath;
  }

  const article = page.locator("article").first();
  if (await article.count()) {
    await article.screenshot({ path: filePath, timeout: 15000 }).catch(async () => {
      await page.screenshot({ path: filePath, fullPage: false, timeout: 15000 });
    });
  } else {
    await page.screenshot({ path: filePath, fullPage: false, timeout: 15000 });
  }
  return filePath;
}

async function ocrScreenshot(filePath) {
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
    return {
      text: "",
      confidence: null,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function collectProfile(profile) {
  const handle = profile.handle.replace(/^@/, "");
  const page = await context.newPage();
  const profileUrl = `https://www.instagram.com/${handle}/`;
  const startedAt = new Date().toISOString();
  const status = {
    handle,
    name: profile.name || handle,
    url: profileUrl,
    startedAt,
    postsFound: 0,
    leadsCollected: 0,
    screenshotsCaptured: 0,
    ocrProcessed: 0,
    ok: false,
    error: ""
  };

  try {
    log(`Checking @${handle}`);
    await page.goto(profileUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(3000);

    if (await pageLooksLoggedOut(page)) {
      status.error = "Instagram login required or session expired. Run: npm run instagram:login";
      return status;
    }

    for (let i = 0; i < 3; i += 1) {
      await page.mouse.wheel(0, 900);
      await page.waitForTimeout(1200);
    }

    const links = await page.evaluate(() => {
      const urls = Array.from(document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]'))
        .map((a) => new URL(a.getAttribute("href"), location.href).href.split("?")[0]);
      return Array.from(new Set(urls));
    });

    const maxPosts = Number.isFinite(maxOverride) && maxOverride > 0 ? maxOverride : maxPostsDefault;
    const postLinks = links.slice(0, maxPosts);
    status.postsFound = postLinks.length;

    for (const url of postLinks) {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(1800);

      const post = await page.evaluate(() => {
        const meta = document.querySelector('meta[property="og:description"]')?.getAttribute("content") || "";
        const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute("content") || "";
        const article = document.querySelector("article")?.innerText || "";
        const main = document.querySelector("main")?.innerText || "";
        const time = document.querySelector("time")?.getAttribute("datetime") || "";
        return { meta, ogImage, article, main, time };
      });

      let screenshotPath = "";
      let ocr = { text: "", confidence: null, error: "" };
      try {
        screenshotPath = await capturePostScreenshot(page, handle, url, post.ogImage);
        status.screenshotsCaptured += 1;
        ocr = await ocrScreenshot(screenshotPath);
        if (ocr.text || ocr.error) status.ocrProcessed += 1;
      } catch (error) {
        ocr = {
          text: "",
          confidence: null,
          error: error instanceof Error ? error.message : String(error)
        };
      }

      const visibleText = normalizeText(post.article || post.meta || post.main);
      const text = normalizeText([
        visibleText,
        ocr.text ? `OCR text from post image/video frame:\n${ocr.text}` : ""
      ].filter(Boolean).join("\n\n"));
      if (!text) continue;

      results.leads.push({
        handle,
        profileName: profile.name || handle,
        venue: profile.venue || "",
        area: profile.area || "",
        calendarTargets: profile.calendarTargets || [],
        priority: profile.priority || "normal",
        permalink: url,
        postedAt: post.time || "",
        collectedAt: new Date().toISOString(),
        confidence: "social",
        needsReview: true,
        tags: classifyLead(text),
        screenshot: screenshotPath ? pathForJson(screenshotPath) : "",
        ocrText: ocr.text,
        ocrConfidence: ocr.confidence,
        ocrError: ocr.error,
        visibleText,
        text
      });
      status.leadsCollected += 1;
      await sleep(1200 + Math.floor(Math.random() * 1200));
    }

    status.ok = true;
    return status;
  } catch (error) {
    status.error = error instanceof Error ? error.message : String(error);
    return status;
  } finally {
    await page.close().catch(() => {});
  }
}

try {
  for (const profile of profiles) {
    const status = await collectProfile(profile);
    results.profiles.push(status);
  }
} finally {
  if (ocrWorker) {
    await ocrWorker.terminate().catch(() => {});
  }
  await context.close().catch(() => {});
}

results.summary = {
  profilesChecked: results.profiles.length,
  profilesOk: results.profiles.filter((profile) => profile.ok).length,
  leadsCollected: results.leads.length,
  screenshotsCaptured: results.profiles.reduce((sum, profile) => sum + (profile.screenshotsCaptured || 0), 0),
  ocrProcessed: results.profiles.reduce((sum, profile) => sum + (profile.ocrProcessed || 0), 0),
  loginRequired: results.profiles.some((profile) => /login required|session expired/i.test(profile.error || ""))
};

fs.writeFileSync(outputPath, `${JSON.stringify(results, null, 2)}\n`, "utf8");

console.log(JSON.stringify(results.summary, null, 2));
if (results.summary.loginRequired) {
  process.exitCode = 2;
}
