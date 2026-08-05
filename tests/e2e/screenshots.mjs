import { chromium } from "playwright";

const browser = await chromium.launch();
const baseUrl = (process.env.ALPHA_BASE_URL || "http://127.0.0.1:4173") +
  "/?cachebust=" + Date.now();

async function openPage(width, height) {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1
  });

  const errors = [];

  page.on("console", message => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  page.on("pageerror", error => {
    errors.push(error.message);
  });

  await page.goto(baseUrl, {
    waitUntil: "networkidle",
    timeout: 120000
  });

  await page.waitForSelector("#dashboard.active", {
    timeout: 30000
  });

  return { page, errors };
}

async function switchView(page, view) {
  await page.locator(`button[data-view="${view}"]`).click();
  await page.waitForSelector(`#${view}.active`);
  await page.waitForTimeout(500);
}

async function setLanguage(page, language) {
  await page.locator(`[data-lang="${language}"]`).click();
  await page.waitForTimeout(400);
}


async function assertDynamicRanking() {
  const { page, errors } = await openPage(1366, 1024);

  await setLanguage(page, "de");
  await switchView(page, "settings");
  await page.locator('[data-preset="balanced"]').click();
  await page.waitForTimeout(400);
  await switchView(page, "scanner");

  const balancedOrder = await page
    .locator(".scanner-company b")
    .allTextContents();

  await switchView(page, "settings");
  await page.locator('[data-preset="defensive"]').click();
  await page.waitForTimeout(400);
  await switchView(page, "scanner");

  const defensiveOrder = await page
    .locator(".scanner-company b")
    .allTextContents();

  if (
    balancedOrder.slice(0, 5).join("|") ===
    defensiveOrder.slice(0, 5).join("|")
  ) {
    throw new Error(
      "Dynamic ranking regression: balanced and defensive top five are identical."
    );
  }

  await page.screenshot({
    path: "screenshots/latest-scanner-defensive-ipad-de.png",
    fullPage: true
  });

  if (errors.length) {
    throw new Error(
      `Browser errors in ranking test: ${errors.join(" | ")}`
    );
  }

  await page.close();
}


async function assertUniverseAndCandidateNavigation() {
  const { page, errors } = await openPage(1366, 1024);
  await setLanguage(page, "de");
  await switchView(page, "universe");

  const universeRows = await page
    .locator("[data-universe-ticker]")
    .count();

  if (universeRows !== 50) {
    throw new Error(
      `Universe regression: expected 50 rows, received ${universeRows}.`
    );
  }

  await page.locator('[data-universe-ticker="AAPL"]').click();
  await page.waitForSelector("#decision.active");

  const candidateText = await page
    .locator("#decisionCandidate")
    .innerText();

  if (!candidateText.includes("Apple")) {
    throw new Error(
      `Candidate navigation regression: ${candidateText}`
    );
  }

  if (
    await page.locator("#decisionCoverageNotice.show").count() !== 1
  ) {
    throw new Error(
      "Research-pending coverage notice is missing."
    );
  }

  await page.screenshot({
    path: "screenshots/latest-decision-apple-pending-ipad-de.png",
    fullPage: true
  });

  if (errors.length) {
    throw new Error(
      `Browser errors in universe test: ${errors.join(" | ")}`
    );
  }

  await page.close();
}

async function assertBrowserPersistence() {
  const { page, errors } = await openPage(1366, 1024);
  await setLanguage(page, "en");
  await switchView(page, "settings");
  await page.locator('[data-preset="defensive"]').click();
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("#dashboard.active");
  if (await page.locator('[data-lang="en"].active').count() !== 1) {
    throw new Error("Language persistence regression.");
  }
  await switchView(page, "settings");
  if (await page.locator('[data-preset="defensive"].active').count() !== 1) {
    throw new Error("Strategy persistence regression.");
  }
  if (errors.length) throw new Error(`Browser errors in persistence test: ${errors.join(" | ")}`);
  await page.close();
}


async function assertResearchPipeline() {
  const { page, errors } = await openPage(1366, 1024);
  await setLanguage(page, "de");
  await switchView(page, "research");

  const cards = await page
    .locator("[data-research-ticker]")
    .count();

  if (cards !== 5) {
    throw new Error(
      `Research regression: expected 5 active records, received ${cards}.`
    );
  }

  const sources = await page
    .locator("#researchDossier .research-source a")
    .count();

  if (sources < 2) {
    throw new Error(
      "Research dossier does not expose verified source links."
    );
  }

  const locked = await page
    .locator("#researchDossier button.locked:disabled")
    .count();

  if (locked !== 1) {
    throw new Error(
      "Research approval lock is missing."
    );
  }

  await page.screenshot({
    path: "screenshots/latest-research-pipeline-ipad-de.png",
    fullPage: true
  });

  if (errors.length) {
    throw new Error(
      `Browser errors in research test: ${errors.join(" | ")}`
    );
  }

  await page.close();
}

async function capture(name, width, height, options = {}) {
  const { page, errors } = await openPage(width, height);

  if (options.language) {
    await setLanguage(page, options.language);
  }

  if (options.view && options.view !== "dashboard") {
    await switchView(page, options.view);
  }

  if (options.preset) {
    await page.locator(`[data-preset="${options.preset}"]`).click();
    await page.waitForTimeout(400);
  }

  await page.screenshot({
    path: `screenshots/${name}`,
    fullPage: true
  });

  if (errors.length) {
    throw new Error(
      `Browser errors in ${name}: ${errors.join(" | ")}`
    );
  }

  await page.close();
}

await capture(
  "latest-dashboard-desktop-de.png",
  1440,
  1000,
  { language: "de" }
);

await capture(
  "latest-dashboard-ipad-de.png",
  1366,
  1024,
  { language: "de" }
);

await capture(
  "latest-dashboard-mobile-de.png",
  430,
  932,
  { language: "de" }
);

await capture(
  "latest-scanner-ipad-de.png",
  1366,
  1024,
  { language: "de", view: "scanner" }
);

await capture(
  "latest-dashboard-desktop-en.png",
  1440,
  1000,
  { language: "en" }
);

await capture(
  "latest-strategy-studio-ipad-de.png",
  1366,
  1024,
  { language: "de", view: "settings" }
);

await capture(
  "latest-strategy-studio-ipad-en.png",
  1366,
  1024,
  { language: "en", view: "settings" }
);

await capture(
  "latest-strategy-studio-offensive-de.png",
  1366,
  1024,
  {
    language: "de",
    view: "settings",
    preset: "offensive"
  }
);

await assertDynamicRanking();

await capture(
  "latest-universe-50-ipad-de.png",
  1366,
  1024,
  { language: "de", view: "universe" }
);

await assertUniverseAndCandidateNavigation();

await assertResearchPipeline();

await assertBrowserPersistence();

await browser.close();
