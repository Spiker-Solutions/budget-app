import { chromium } from "playwright";
import { readFile } from "fs/promises";

const BASE = process.env.DEMO_BASE_URL ?? "http://localhost:3000";
const PAUSE = 2800;
const ENVELOPE_ID_FILE = "/tmp/demo-recurring-envelope-id.txt";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fillDate(page, label, value) {
  const field = page.getByLabel(label, { exact: false }).first();
  await field.click();
  await field.fill(value);
  await page.keyboard.press("Tab");
  await sleep(500);
}

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await sleep(PAUSE);
  await page.getByLabel("Email").fill("test@test.com");
  await page.locator('input[data-path="password"]').first().fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 12000 });
  await sleep(PAUSE);
}

async function selectDemoBudget(page) {
  const budgetSelect = page.locator(".mantine-Select-input").first();
  if (await budgetSelect.isVisible()) {
    await budgetSelect.click();
    const demoOption = page.getByRole("option", { name: /Demo.*Household/i });
    if (await demoOption.count()) {
      await demoOption.click();
      await sleep(PAUSE);
    }
  }
}

async function goToDemoEnvelope(page, envelopeId) {
  await page.goto(`${BASE}/dashboard/envelopes/${envelopeId}`, {
    waitUntil: "networkidle",
  });
  await sleep(PAUSE);
}

async function readPeriodLabel(page) {
  return page.locator("text=/\\w{3} \\d{1,2}, \\d{4}/").first().textContent();
}

async function readPeriodStart(page) {
  const text = await readPeriodLabel(page);
  const startPart = text?.split("–")[0]?.trim();
  return startPart ? new Date(startPart) : null;
}

async function clickPeriodNav(page, direction) {
  const label = direction === "next" ? "Next period" : "Previous period";
  const btn = page.getByRole("button", { name: label });
  if (await btn.isEnabled()) {
    await btn.click();
    await sleep(PAUSE);
    return true;
  }
  return false;
}

async function jumpToPeriodContaining(page, envelopeId, targetDate) {
  await goToDemoEnvelope(page, envelopeId);
  const target = new Date(targetDate);

  for (let i = 0; i < 24; i++) {
    const start = await readPeriodStart(page);
    if (
      start &&
      start.getMonth() === target.getMonth() &&
      start.getFullYear() === target.getFullYear()
    ) {
      console.log("  Period:", await readPeriodLabel(page));
      return true;
    }
    if (!start) break;

    const goNext =
      start.getFullYear() < target.getFullYear() ||
      (start.getFullYear() === target.getFullYear() &&
        start.getMonth() < target.getMonth());

    const moved = await clickPeriodNav(page, goNext ? "next" : "previous");
    if (!moved) break;
  }
  console.log("  At:", await readPeriodLabel(page));
  return false;
}

async function createExpense(page, envelopeId, { amount, payee, date, recurrence, endDate }) {
  await page.goto(`${BASE}/dashboard/expenses/new?envelopeId=${envelopeId}`, {
    waitUntil: "networkidle",
  });
  await sleep(PAUSE);

  await page.getByLabel("Amount").fill(String(amount));
  await page.getByRole("textbox", { name: "Payee" }).fill(payee);
  await fillDate(page, "Date", date);

  if (recurrence) {
    await page.getByRole("textbox", { name: "Recurrence" }).click();
    await page.getByRole("option", { name: recurrence, exact: true }).click();
    await sleep(800);
  }

  if (endDate) {
    await fillDate(page, "End date", endDate);
  }

  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 20000 });
  await sleep(PAUSE);
}

async function countExpenseRows(page) {
  return page.locator("tbody tr").count();
}

async function countPayeeRows(page, payee) {
  return page.getByRole("row").filter({ hasText: payee }).count();
}

async function editExpenseEndDate(page, envelopeId, payee, endDate) {
  await goToDemoEnvelope(page, envelopeId);
  await page.getByRole("row").filter({ hasText: payee }).first().click();
  await page.waitForURL(/\/edit/, { timeout: 10000 });
  await sleep(PAUSE);
  await fillDate(page, "End date", endDate);
  await page.getByRole("button", { name: /save changes/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 20000 });
  await sleep(PAUSE);
}

async function main() {
  const envelopeId = (await readFile(ENVELOPE_ID_FILE, "utf8")).trim();

  const browser = await chromium.launch({
    headless: false,
    channel: "chrome",
    args: ["--window-size=1440,900", "--window-position=0,0"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: "/opt/cursor/artifacts", size: { width: 1440, height: 900 } },
  });

  const page = await context.newPage();

  await login(page);
  await selectDemoBudget(page);
  await goToDemoEnvelope(page, envelopeId);

  console.log("1) Monthly recurring");
  await createExpense(page, envelopeId, {
    amount: 30,
    payee: "Netflix",
    date: "06/15/2026",
    recurrence: "Monthly",
  });
  await jumpToPeriodContaining(page, envelopeId, "2026-06-20");
  console.log("  Rows:", await countExpenseRows(page));

  console.log("2) Yearly — not every monthly period");
  await createExpense(page, envelopeId, {
    amount: 1200,
    payee: "Insurance",
    date: "06/10/2026",
    recurrence: "Yearly",
  });
  await jumpToPeriodContaining(page, envelopeId, "2026-06-20");
  console.log("  Insurance in Jun:", await countPayeeRows(page, "Insurance"));
  await jumpToPeriodContaining(page, envelopeId, "2026-07-20");
  console.log("  Insurance in Jul (expect 0):", await countPayeeRows(page, "Insurance"));

  console.log("3) Daily — multiple in one period");
  await createExpense(page, envelopeId, {
    amount: 5,
    payee: "Coffee",
    date: "06/01/2026",
    recurrence: "Daily",
    endDate: "06/05/2026",
  });
  await jumpToPeriodContaining(page, envelopeId, "2026-06-20");
  console.log("  Coffee rows in Jun (expect 5):", await countPayeeRows(page, "Coffee"));
  console.log("  Total rows in Jun:", await countExpenseRows(page));

  console.log("4) Previous periods");
  await jumpToPeriodContaining(page, envelopeId, "2026-07-20");
  console.log("  Netflix in Jul:", await countPayeeRows(page, "Netflix"));
  await jumpToPeriodContaining(page, envelopeId, "2026-05-20");
  console.log("  Netflix in May (expect 0):", await countPayeeRows(page, "Netflix"));

  console.log("5) Stop recurring via end date");
  await editExpenseEndDate(page, envelopeId, "Netflix", "08/15/2026");
  await jumpToPeriodContaining(page, envelopeId, "2026-09-15");
  console.log("  Netflix in Sep (expect 0):", await countPayeeRows(page, "Netflix"));
  await jumpToPeriodContaining(page, envelopeId, "2026-08-20");
  console.log("  Netflix in Aug (expect 1):", await countPayeeRows(page, "Netflix"));

  await sleep(4000);
  const video = page.video();
  await page.close();
  await context.close();
  await browser.close();

  if (video) {
    const path = await video.path();
    const fs = await import("fs/promises");
    const { execSync } = await import("child_process");
    const webmPath = "/opt/cursor/artifacts/recurring_demo_clean_raw.webm";
    const mp4Path = "/opt/cursor/artifacts/recurring_demo_clean_envelope.mp4";
    await fs.copyFile(path, webmPath);
    execSync(
      `ffmpeg -y -i ${webmPath} -c:v libx264 -pix_fmt yuv420p -movflags +faststart -an ${mp4Path}`,
      { stdio: "inherit" }
    );
    console.log(`Saved: ${mp4Path}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
