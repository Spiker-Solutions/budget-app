import { chromium } from "playwright";
import { mkdir } from "fs/promises";
import { join } from "path";

const BASE = "http://localhost:3000";
const ARTIFACTS = "/opt/cursor/artifacts";
const EMAIL = "test@test.com";
const PASSWORD = "password123";

async function login(page) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/dashboard**", { timeout: 30000 });
}

async function main() {
  await mkdir(ARTIFACTS, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 960, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await login(page);
  await page.goto(`${BASE}/dashboard/goals/progress-preview`, { waitUntil: "networkidle" });
  await page.getByText("Goal progress colors (preview)").waitFor({ timeout: 30000 });
  await page.waitForTimeout(500);

  await page.screenshot({
    path: join(ARTIFACTS, "goal-progress-colors-all-percentages.png"),
    fullPage: true,
  });
  console.log("Saved full page screenshot");

  for (const percent of [0, 25, 50, 75, 100]) {
    const section = page.locator(`[data-percent="${percent}"]`);
    await section.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: join(ARTIFACTS, `goal-progress-colors-${percent}pct.png`),
      clip: (await section.boundingBox()) ?? undefined,
    });
    console.log(`Saved ${percent}% screenshot`);
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
