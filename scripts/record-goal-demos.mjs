import { chromium } from "playwright";
import { mkdir, rename } from "fs/promises";
import { join } from "path";
import { readdir } from "fs/promises";

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
  await page.waitForTimeout(2000);
}

async function goAddGoal(page) {
  const add = page.getByRole("button", { name: "Add goal" }).or(page.getByRole("link", { name: "Add goal" }));
  await add.first().waitFor({ timeout: 20000 });
  await add.first().click();
}

async function recordDemo(name, fn) {
  const dir = join(ARTIFACTS, "pw-videos");
  await mkdir(dir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir, size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();
  try {
    await login(page);
    await fn(page);
    await page.waitForTimeout(1000);
  } finally {
    const video = page.video();
    await page.close();
    await context.close();
    await browser.close();
    if (video) {
      const rawPath = await video.path();
      const dest = join(ARTIFACTS, `${name}.webm`);
      await new Promise((r) => setTimeout(r, 500));
      await rename(rawPath, dest);
      console.log(`Saved ${dest}`);
    }
  }
}

const ONLY = process.env.ONLY?.split(",") ?? null;

async function main() {
  const all = [
  ["01-saving-goal-creation", async (page) => {
    await goAddGoal(page);
    await page.waitForURL("**/goals/new**");
    await page.getByLabel("Name").fill("Vacation Fund Demo");
    await page.getByLabel("Target amount").fill("5000");
    await page.getByRole("button", { name: "Create goal" }).click();
    await page.waitForURL("**/goals/**");
    await page.waitForTimeout(1500);
  }],
  ["02-debt-goal-creation", async (page) => {
    await goAddGoal(page);
    await page.waitForURL("**/goals/new**");
    await page.locator(".mantine-SegmentedControl-label").filter({ hasText: "Debt payoff" }).click();
    await page.getByLabel("Name").fill("Credit Card Demo");
    const starting = page.getByLabel(/Starting balance owed/);
    await starting.fill("2500");
    await page.getByLabel(/Payoff target/).fill("0");
    await page.getByRole("button", { name: "Create goal" }).click();
    await page.waitForURL("**/goals/**");
    await page.waitForTimeout(1500);
  }],
  ["03-goal-contribution", async (page) => {
    await page.getByRole("link", { name: "Add Expense" }).click();
    await page.locator(".mantine-SegmentedControl-label").filter({ hasText: "Goal contribution" }).click();
    await page.getByRole("textbox", { name: "Goal" }).click();
    await page.getByRole("option").first().click();
    await page.getByRole("textbox", { name: "Amount" }).fill("150");
    await page.getByRole("textbox", { name: "Payee" }).fill("Bank transfer");
    await page.getByRole("textbox", { name: "Envelope" }).click();
    await page.getByRole("option").first().click();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.waitForTimeout(2000);
  }],
  ["04-remainder-wizard", async (page) => {
    const openWizard = page.getByRole("button", { name: /Open wizard|Allocate remainders/ });
    if (await openWizard.count()) {
      await openWizard.first().click();
      await page.waitForTimeout(1000);
      const actionSelect = page.locator("table tbody tr").first().locator("input").first();
      if (await actionSelect.count()) {
        await actionSelect.click({ force: true });
        await page.getByRole("option", { name: "Send to save goal" }).click();
        const goalSelect = page.locator("table tbody tr").first().locator("input").nth(1);
        await goalSelect.click({ force: true });
        await page.getByRole("option").first().click();
      }
      await page.getByRole("button", { name: "Confirm allocations" }).click();
      await page.waitForTimeout(2000);
    } else {
      await page.goto(`${BASE}/dashboard`);
      await page.waitForTimeout(2000);
    }
  }],
  ["05-debt-charge-and-dashboard", async (page) => {
    await page.goto(`${BASE}/dashboard`);
    await page.getByText("Credit Card Demo").first().click();
    await page.getByRole("button", { name: "Add charge" }).click();
    await page.getByLabel("Amount").fill("25");
    await page.getByRole("button", { name: "Add charge" }).click();
    await page.waitForTimeout(1500);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForTimeout(2000);
  }],
  ];

  for (const [name, fn] of all) {
    if (ONLY && !ONLY.includes(name.split("-")[0]) && !ONLY.includes(name)) continue;
    await recordDemo(name, fn);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
