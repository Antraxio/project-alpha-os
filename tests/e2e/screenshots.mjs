import { chromium } from "playwright";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const mismatchThreshold = 0.015;
const baselineDirectory = "tests/e2e/baselines";
const diffDirectory = "screenshots/diffs";

function compareScreenshot(name) {
  const baselinePath = path.join(baselineDirectory, name);
  if (process.env.UPDATE_SCREENSHOT_BASELINES === "1") {
    mkdirSync(baselineDirectory, { recursive: true });
    copyFileSync(path.join("screenshots", name), baselinePath);
    return;
  }
  if (!existsSync(baselinePath)) return;
  const actual = PNG.sync.read(readFileSync(path.join("screenshots", name)));
  const baseline = PNG.sync.read(readFileSync(baselinePath));
  if (actual.width !== baseline.width || actual.height !== baseline.height) {
    throw new Error(`Visual regression in ${name}: dimensions changed from ${baseline.width}x${baseline.height} to ${actual.width}x${actual.height}.`);
  }
  const diff = new PNG({ width: actual.width, height: actual.height });
  const changed = pixelmatch(baseline.data, actual.data, diff.data, actual.width, actual.height, { threshold: 0.1 });
  const ratio = changed / (actual.width * actual.height);
  if (ratio > mismatchThreshold) {
    mkdirSync(diffDirectory, { recursive: true });
    writeFileSync(path.join(diffDirectory, name), PNG.sync.write(diff));
    throw new Error(`Visual regression in ${name}: ${(ratio * 100).toFixed(3)}% exceeds ${(mismatchThreshold * 100).toFixed(1)}%.`);
  }
}

const browser = await chromium.launch();
const baseUrl = (process.env.ALPHA_BASE_URL || "http://127.0.0.1:4173") +
  "/?cachebust=" + Date.now();

// Screenshots must stay reproducible, so the freshness gate is evaluated one hour after the snapshot.
const referenceTime = Date.parse(JSON.parse(readFileSync("data/core.json", "utf8")).snapshotDate) + 3600000;

const staleReferenceTime = referenceTime + 30 * 3600000;

async function openPage(width, height, atTime = referenceTime) {
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

  await page.clock.setFixedTime(atTime);

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
  const primary = page.locator(`button[data-view="${view}"]`);
  if (await primary.count()) {
    await primary.click();
  } else {
    const groups = {
      universe: "opportunities",
      research: "opportunities",
      timeline: "opportunities",
      journal: "portfolio",
      methodology: "model",
      "model-history": "model"
    };
    await page.locator(`button[data-group="${groups[view]}"]`).click();
    await page.locator(`button[data-subview="${view}"]`).click();
  }
  await page.waitForSelector(`#${view}.active`);
  await page.waitForTimeout(500);
}

async function setLanguage(page, language) {
  await page.locator(`[data-lang="${language}"]`).click();
  await page.waitForTimeout(400);
}

async function assertStaleSnapshotDegradedMode() {
  const { page, errors } = await openPage(1366, 1024, staleReferenceTime);

  const expected = {
    de: {
      banner: "Snapshot veraltet",
      kicker: "LETZTE BEWERTUNG",
      headline: "Keine neue Position",
      trigger: "Kein aktueller Trigger",
      distance: "Abstand ausgeblendet",
      sizing: "Keine Stückzahl-Empfehlung",
      ladder: "keine Ausführungsschritte",
      buyWording: ["Kauf vorbereiten", "Kauf prüfen"]
    },
    en: {
      banner: "Snapshot is stale",
      kicker: "LAST ASSESSMENT",
      headline: "Do not open a new position",
      trigger: "No current trigger",
      distance: "Distance hidden",
      sizing: "No share-count recommendation",
      ladder: "No execution steps",
      buyWording: ["Prepare a purchase", "Review buy"]
    }
  };

  for (const language of ["de", "en"]) {
    const copy = expected[language];
    await setLanguage(page, language);
    await switchView(page, "dashboard");

    const banner = page.locator("#staleBanner");
    if (await banner.isHidden()) {
      throw new Error(`Stale banner is hidden in ${language}`);
    }
    if (!(await banner.innerText()).includes(copy.banner)) {
      throw new Error(`Stale banner text is wrong in ${language}: ${await banner.innerText()}`);
    }

    const checks = [
      ["#decisionKicker", copy.kicker],
      ["#briefingHeadline", copy.headline],
      ["#briefingTrigger", copy.trigger],
      ["#triggerDistance", copy.distance],
      ["#briefingPoints", copy.sizing]
    ];
    for (const [selector, needle] of checks) {
      const text = await page.locator(selector).innerText();
      if (!text.includes(needle)) {
        throw new Error(`Stale mode ${selector} in ${language} lacks "${needle}": ${text}`);
      }
    }

    const zoneWidth = await page.locator("#priceZoneProgress").evaluate(node => node.style.width);
    if (zoneWidth !== "0%") {
      throw new Error(`Stale price-zone progress is not cleared in ${language}: ${zoneWidth}`);
    }

    const verdict = await page.locator("#execVerdict").innerText();
    if (copy.buyWording.some(word => verdict.includes(word))) {
      throw new Error(`Stale mode still recommends a purchase in ${language}: ${verdict}`);
    }

    await switchView(page, "decision");
    const gates = await page.locator("#decisionGates").innerText();
    if (!gates.includes(language === "de" ? "Datenaktualität" : "Data freshness")) {
      throw new Error(`Freshness gate missing from the gate list in ${language}: ${gates}`);
    }
    const freshnessGate = page.locator("#decisionGates .gate").first();
    if (!(await freshnessGate.locator(".gate-icon.fail").count())) {
      throw new Error(`Freshness gate does not fail in ${language}`);
    }
    const ladder = await page.locator("#actionLadder").innerText();
    if (!ladder.includes(copy.ladder)) {
      throw new Error(`Stale action ladder is not replaced in ${language}: ${ladder}`);
    }
    const detail = await page.locator("#candidateDetail .level-grid").innerText();
    if (/\d+\s+(ganze|whole)/.test(detail)) {
      throw new Error(`Stale mode still suggests a share count in ${language}: ${detail}`);
    }
  }

  if (errors.length) throw new Error(`Browser errors in stale mode: ${errors.join(" | ")}`);
  await page.close();
}

async function assertSeparatedHistories() {
  const { page, errors } = await openPage(1366, 1024);
  await setLanguage(page, "de");
  await switchView(page, "journal");
  const transactions = await page.locator("#journalFeed").innerText();
  if (!["Biomarin Pharmaceutical", "Microsoft", "Meta Platforms A", "TSMC ADR"].every(item => transactions.includes(item))) {
    throw new Error(`Transaction history is incomplete: ${transactions}`);
  }
  if (["Strategy Studio", "Zweisprachige Oberfläche", "DISZIPLIN-SCORE"].some(item => transactions.includes(item))) {
    throw new Error(`Transaction history contains product or discipline content: ${transactions}`);
  }
  await switchView(page, "model-history");
  const changes = await page.locator("#modelHistoryFeed").innerText();
  if (!["Navigation vereinfacht", "Strategy Studio eingeführt", "Zweisprachige Oberfläche"].every(item => changes.includes(item))) {
    throw new Error(`Model change history is incomplete: ${changes}`);
  }
  if (["Biomarin Pharmaceutical", "Meta Platforms A", "TSMC ADR"].some(item => changes.includes(item))) {
    throw new Error(`Model change history contains portfolio transactions: ${changes}`);
  }
  if (errors.length) throw new Error(`Browser errors in separated histories: ${errors.join(" | ")}`);
  await page.close();
}

async function assertDashboardOpportunities(page, language) {
  const rows = page.locator("[data-watchlist-ticker]");
  const count = await rows.count();
  if (count !== 3) {
    throw new Error(`Dashboard opportunities regression: expected 3 rows, received ${count}.`);
  }

  const order = await rows.evaluateAll(items => items.map(item => item.dataset.watchlistTicker));
  const expectedTopThree = ["ASML", "MSFT", "NOVO-B"];
  if (order.join("|") !== expectedTopThree.join("|")) {
    throw new Error(`Dashboard opportunities ranking regression: ${order.join("|")}`);
  }

  const fieldsComplete = await rows.evaluateAll(items => items.every((item, index) =>
    item.querySelector(".watchlist-position")?.textContent === `#${index + 1}` &&
    item.querySelector(".watchlist-company b")?.textContent?.trim() &&
    item.querySelector(".watchlist-company small")?.textContent?.trim() &&
    item.querySelectorAll(".watchlist-metric").length === 2
  ));
  if (!fieldsComplete) {
    throw new Error("Watchlist rows do not expose rank, company, ticker, OS, and Conviction.");
  }

  const heading = await page.locator('[data-i18n="completeRanking"]').innerText();
  const expectedHeading = language === "de" ? "Top 3 Chancen" : "Top 3 opportunities";
  if (heading !== expectedHeading) {
    throw new Error(`Dashboard opportunities language regression: ${heading}`);
  }
}

async function assertWatchlistNavigation() {
  const { page, errors } = await openPage(1440, 1000);
  await setLanguage(page, "de");
  await page.locator('[data-watchlist-ticker="ASML"]').click();
  await page.waitForSelector("#decision.active");
  const candidate = await page.locator("#decisionCandidate").innerText();
  if (!candidate.includes("ASML")) {
    throw new Error(`Watchlist navigation regression: ${candidate}`);
  }
  if (errors.length) throw new Error(`Browser errors in Watchlist navigation: ${errors.join(" | ")}`);
  await page.close();
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
  compareScreenshot("latest-scanner-defensive-ipad-de.png");

  if (errors.length) {
    throw new Error(
      `Browser errors in ranking test: ${errors.join(" | ")}`
    );
  }

  await page.close();
}

async function assertImmediateStrategySliderAndReset() {
  const { page, errors } = await openPage(1366, 1024);
  await setLanguage(page, "de");
  await switchView(page, "settings");
  await page.locator('[data-preset="balanced"]').click();

  const rows = page.locator("[data-settings-rank-ticker]");
  const initial = await rows.evaluateAll(items => items.map(item => ({
    ticker: item.dataset.settingsRankTicker,
    rank: item.dataset.rank,
    opportunityScore: item.dataset.opportunityScore,
    strategyScore: item.dataset.strategyScore
  })));
  const initialNovo = initial.find(item => item.ticker === "NOVO-B");
  const initialRas = await page.locator("#settingsPreview .preview-grid > div").first().locator("b").innerText();

  await page.locator('input[data-setting="technical"]').evaluate(input => {
    input.value = "0";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.waitForFunction(() => document.querySelector('[data-settings-rank-ticker="NOVO-B"]')?.dataset.strategyScore === "80");

  const updated = await rows.evaluateAll(items => items.map(item => ({
    ticker: item.dataset.settingsRankTicker,
    rank: item.dataset.rank,
    opportunityScore: item.dataset.opportunityScore,
    strategyScore: item.dataset.strategyScore
  })));
  const updatedNovo = updated.find(item => item.ticker === "NOVO-B");
  const osChanged = initial.some(before => updated.find(after => after.ticker === before.ticker)?.opportunityScore !== before.opportunityScore);
  if (osChanged) {
    throw new Error(`Opportunity Score changed with a strategy slider: ${JSON.stringify({ initial, updated })}`);
  }
  if (updated.map(item => item.ticker).join("|") === initial.map(item => item.ticker).join("|")) {
    throw new Error("Strategy slider did not update the visible ranking immediately.");
  }
  if (updatedNovo?.strategyScore === initialNovo?.strategyScore) {
    throw new Error("Strategy slider did not update the candidate Strategy Score.");
  }
  const updatedRas = await page.locator("#settingsPreview .preview-grid > div").first().locator("b").innerText();
  if (updatedRas === initialRas) {
    throw new Error("RAS did not update with the active strategy profile.");
  }
  const previewText = await page.locator("#settingsPreview").innerText();
  if (previewText.includes("NaN")) {
    throw new Error(`Strategy Studio rendered a non-numeric model value: ${previewText}`);
  }
  if (await page.locator("#customBadge.custom-indicator").count() !== 1) {
    throw new Error("Custom active strategy is not visible in Strategy Studio.");
  }
  await page.screenshot({
    path: "screenshots/latest-strategy-studio-custom-de.png",
    fullPage: true
  });
  compareScreenshot("latest-strategy-studio-custom-de.png");

  await switchView(page, "scanner");
  const scannerOrder = await page.locator(".scanner-row").evaluateAll(items => items.slice(0, 5).map(item => item.dataset.ticker));
  if (scannerOrder.join("|") !== updated.map(item => item.ticker).join("|")) {
    throw new Error("Scanner ranking did not use the immediately updated Strategy Studio order.");
  }
  if (!(await page.locator("#rankingProfile").innerText()).includes("INDIVIDUELL")) {
    throw new Error("Active strategy is missing from the ranking view.");
  }

  await switchView(page, "decision");
  await page.locator('[data-decision-mode="auto"]').click();
  if (!(await page.locator("#decisionCandidate").innerText()).includes("INDIVIDUELL")) {
    throw new Error("Active strategy is missing from Decision Lab.");
  }
  const fitText = await page.locator("#decisionStrategyFit").innerText();
  if (!fitText.includes("Komponenten-Fit") || !fitText.includes("Portfolio- & Ausführungs-Fit")) {
    throw new Error(`Decision Lab strategy-fit explanation is incomplete: ${fitText}`);
  }

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("#dashboard.active");
  await switchView(page, "settings");
  if (await page.locator('input[data-setting="technical"]').inputValue() !== "0") {
    throw new Error("Custom strategy slider did not persist after reload.");
  }
  await page.locator("#resetSettings").click();
  if (await page.locator('input[data-setting="technical"]').inputValue() !== "25") {
    throw new Error("Strategy reset did not restore the documented default.");
  }
  if (await page.locator('[data-preset="balanced"].active').count() !== 1) {
    throw new Error("Strategy reset did not restore the Balanced profile.");
  }
  if (await page.evaluate(() => localStorage.getItem("alphaStrategySettings")) !== null) {
    throw new Error("Strategy reset left stale browser persistence behind.");
  }
  const resetOrder = await rows.evaluateAll(items => items.map(item => item.dataset.settingsRankTicker));
  if (resetOrder.join("|") !== initial.map(item => item.ticker).join("|")) {
    throw new Error("Strategy reset did not restore the original ranking.");
  }
  if (errors.length) throw new Error(`Browser errors in slider/reset test: ${errors.join(" | ")}`);
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
  await page.waitForSelector("#research.active");
  await page.locator('[data-research-open-lab="AAPL"]').click();
  await page.waitForSelector("#decision.active");
  // The Research dossier button is below the fold. Opening Decision Lab starts
  // the app's smooth scroll back to the top; stop that animation before taking
  // the full-page baseline so fixed shell elements are captured deterministically.
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "auto" }));
  await page.waitForFunction(() => window.scrollY === 0);
  await page.waitForTimeout(250);

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
  compareScreenshot("latest-decision-apple-pending-ipad-de.png");

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

  if (options.assertWatchlist) {
    await assertDashboardOpportunities(page, options.language || "de");
  }

  await page.screenshot({
    path: `screenshots/${name}`,
    fullPage: true
  });
  compareScreenshot(name);

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
  { language: "de", assertWatchlist: true }
);

await capture(
  "latest-dashboard-ipad-de.png",
  1366,
  1024,
  { language: "de", assertWatchlist: true }
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
  { language: "en", assertWatchlist: true }
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

await assertWatchlistNavigation();

await assertResearchPipeline();

await assertBrowserPersistence();

await assertImmediateStrategySliderAndReset();

await assertSeparatedHistories();

await assertStaleSnapshotDegradedMode();

await browser.close();
