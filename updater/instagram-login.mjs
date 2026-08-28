import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const configPath = path.join(root, "updater", "instagram-sources.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const profileDir = path.resolve(root, config.profileDir || "updater/instagram-profile");

fs.mkdirSync(profileDir, { recursive: true });

const context = await chromium.launchPersistentContext(profileDir, {
  headless: false,
  locale: "en-GB",
  timezoneId: "Europe/London",
  viewport: { width: 1280, height: 900 }
});

const page = context.pages()[0] || await context.newPage();
await page.goto("https://www.instagram.com/", { waitUntil: "domcontentloaded", timeout: 60000 });

console.log("");
console.log("Instagram login browser is open.");
console.log("Log in normally, handle any 2FA/checkpoint, then press Enter here.");
console.log(`Session will be stored locally in: ${profileDir}`);
console.log("No password is stored in the repo.");

const rl = readline.createInterface({ input, output });
await rl.question("");
rl.close();

await context.close();
console.log("Instagram browser session saved.");
