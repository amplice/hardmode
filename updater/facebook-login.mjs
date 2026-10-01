import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const configPath = path.join(root, "updater", "facebook-sources.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const profileDir = path.resolve(root, config.profileDir || "updater/facebook-profile");
const startUrl = config.pages?.find((page) => page.enabled !== false)?.url || "https://www.facebook.com/";

fs.mkdirSync(profileDir, { recursive: true });

const context = await chromium.launchPersistentContext(profileDir, {
  headless: false,
  locale: "en-GB",
  timezoneId: "Europe/London",
  viewport: { width: 1280, height: 900 }
});

const page = context.pages()[0] || await context.newPage();
await page.goto(startUrl, { waitUntil: "domcontentloaded", timeout: 60000 });

console.log("");
console.log("Facebook login browser is open.");
console.log("Log in normally and handle any 2FA/checkpoint, then return to Codex and say you are logged in.");
console.log(`Session will be stored locally in: ${profileDir}`);
console.log("Your password is entered only into Facebook and is not stored in the repository.");

const rl = readline.createInterface({ input, output });
await rl.question("");
rl.close();

await context.close();
console.log("Facebook browser session saved.");
