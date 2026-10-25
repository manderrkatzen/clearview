const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const playwright = require(process.env.PLAYWRIGHT_MODULE || "/tmp/opencode/node_modules/playwright");
const root = path.resolve(__dirname, "..");
const artifacts = path.resolve(process.env.ARTIFACT_DIR || path.join(root, "artifacts/final-acceptance"));
const base = process.env.BASE_URL || "http://localhost:4174";

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

async function session(suite, { width = 1440, height = Number(process.env.ACCEPTANCE_HEIGHT || 900), browserName = process.env.BROWSER || "chromium", route, workerHold = false } = {}) {
  const directory = path.join(artifacts, `${suite}-${browserName}-${width}x${height}`);
  fs.mkdirSync(directory, { recursive: true });
  const result = { suite, browser: browserName, width, height, base, steps: [], navigations: [], documentRequests: [], errors: [], assetFailures: [], status: "running" };
  const browser = await playwright[browserName].launch();
  result.browserVersion = browser.version();
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: width <= 620, acceptDownloads: true });
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  await context.addInitScript(({ workerHold }) => {
    window.__acceptanceDocumentId = `${Date.now()}-${Math.random()}`;
    window.__acceptanceWorkerHold = workerHold;
    window.__acceptanceWorkerQueue = [];
    window.__acceptanceWorkerDeliveries = 0;
    if (window.Worker) {
      const OriginalWorker = window.Worker;
      window.Worker = class extends OriginalWorker {
        constructor(url, options) {
          super(url, options);
          if (!String(url).includes("analysis-worker.js")) return;
          this.addEventListener("message", event => {
            if (!window.__acceptanceWorkerHold) { window.__acceptanceWorkerDeliveries++; return; }
            event.stopImmediatePropagation();
            window.__acceptanceWorkerQueue.push({ worker: this, data: event.data });
          });
        }
      };
    }
    window.__acceptanceReleaseWorkers = () => {
      window.__acceptanceWorkerHold = false;
      for (const entry of window.__acceptanceWorkerQueue.splice(0)) entry.worker.dispatchEvent(new MessageEvent("message", { data: entry.data }));
    };
  }, { workerHold });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on("pageerror", error => result.errors.push(error.message));
  page.on("framenavigated", frame => { if (frame === page.mainFrame()) result.navigations.push(frame.url()); });
  page.on("request", request => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) result.documentRequests.push(request.url()); });
  page.on("response", response => {
    const url = new URL(response.url());
    if (url.origin === new URL(base).origin && response.status() >= 400 && !url.pathname.startsWith("/api/")) result.assetFailures.push({ path: url.pathname, status: response.status() });
  });
  await page.route("https://challenges.cloudflare.com/**", request => request.fulfill({ contentType: "application/javascript", body: "" }));
  await page.route("**/api/ai/**", async request => {
    if (route && await route(request, page)) return;
    await request.fulfill({ status: request.request().method() === "GET" ? 200 : 503, json: { available: false, error: "AI unavailable", turnstileSiteKey: "" } });
  });
  let identity, requestCount, signature;
  async function baseline() {
    await page.waitForFunction(() => typeof loadData === "function" && document.querySelector(".sidebar"));
    await page.evaluate(() => {
      window.__acceptanceShell = [...document.querySelectorAll(".sidebar,.brand,#navigation,.topbar,#screen")];
      window.__acceptanceParent = document.querySelector("#screen").parentElement;
    });
    identity = await page.evaluate(() => window.__acceptanceDocumentId);
    requestCount = result.documentRequests.length;
    signature = await shellSignature();
  }
  async function shellSignature() {
    return page.evaluate(() => {
      const rail = document.querySelector(".sidebar"), box = rail.getBoundingClientRect();
      return { width: box.width, height: box.height, brandSize: getComputedStyle(document.querySelector(".brand")).fontSize, navigationHeight: document.querySelector("#navigation").getBoundingClientRect().height };
    });
  }
  async function guard() {
    assert.equal(await page.evaluate(() => window.__acceptanceDocumentId), identity, "Unexpected document reload/replacement");
    assert.equal(result.documentRequests.length, requestCount, "Unexpected main-document navigation");
    assert.ok(await page.evaluate(() => __acceptanceShell.every(node => node.isConnected) && document.querySelector("#screen").parentElement === __acceptanceParent), "Persistent application shell was replaced");
    assert.deepEqual(await shellSignature(), signature, "Navigation/branding resized during ordinary feature usage");
    assert.deepEqual(result.errors, [], "Browser runtime errors");
    assert.deepEqual(result.assetFailures, [], "Missing application assets");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Unexpected page-wide horizontal overflow");
  }
  async function step(name, features, action) {
    const entry = { name, features, status: "running" }, started = Date.now();
    result.steps.push(entry);
    try {
      await action();
      await guard();
      entry.status = "passed";
      console.log(`PASS ${suite}/${width}: ${name}`);
    } catch (error) {
      entry.status = "failed";
      entry.error = error.message;
      await page.screenshot({ path: path.join(directory, "failure.png"), fullPage: true }).catch(() => {});
      throw error;
    } finally { entry.durationMs = Date.now() - started; }
  }
  async function upload(csv, name = "acceptance.csv") {
    if (!await page.locator("#openCsv,#replaceSource").count()) await navigate("data");
    const chooser = page.waitForEvent("filechooser");
    await page.locator(await page.locator("#openCsv").count() ? "#openCsv" : "#replaceSource").click();
    await (await chooser).setFiles({ name, mimeType: "text/csv", buffer: Buffer.from(csv) });
    await page.waitForFunction(name => state.fileName === name, name);
  }
  async function navigate(name) { await page.locator(`#navigation [data-screen="${name}"]`).click(); await page.waitForFunction(name => state.screen === name, name); }
  async function issue(type, column) {
    const id = await page.evaluate(({ type, column }) => state.issues.find(item => item.reviewType === type && (!column || item.column === column))?.id, { type, column });
    assert.ok(id, `Expected ${type} finding${column ? ` for ${column}` : ""}`);
    if (!await page.locator(`#reviewIssue${id}`).count()) await navigate("issues");
    await page.locator(`#reviewIssue${id}`).click();
    await page.waitForFunction(id => state.selectedIssue === id, id);
  }
  async function ready() { await page.waitForFunction(() => { const item = state.issues.find(item => item.id === state.selectedIssue); if (!item) return false; const data = ReviewCore.data(item); return !data.pending && Boolean(data.preview || data.error); }); }
  async function method(key) {
    const radio = page.locator(`.treatment-list [data-fix="${key}"]`);
    if (await radio.count()) await radio.click();
    else {
      const menu = page.locator("#reviewMoreMethods");
      if (!await menu.evaluate(element => element.open)) await menu.locator("summary").click();
      await menu.locator(`[data-fix="${key}"]`).click();
    }
    await ready();
  }
  async function download(selector) {
    const [file] = await Promise.all([page.waitForEvent("download"), page.locator(selector).click()]);
    const chunks = [];
    const stream = await file.createReadStream();
    for await (const chunk of stream) chunks.push(chunk);
    const content = Buffer.concat(chunks).toString("utf8");
    assert.ok(content.length, "Download must contain actual content");
    return { name: file.suggestedFilename(), content };
  }
  async function snapshot(field) {
    return page.evaluate(field => {
      const item = state.issues.find(item => item.id === state.selectedIssue), data = item && ReviewCore.data(item), input = field && document.querySelector(field);
      return { screen: state.screen, issue: state.selectedIssue, tab: data?.tab, fix: data?.fix, locked: data?.locked, groups: data?.locks, selectedIds: data?.preview?.selectedIds, fingerprint: data?.preview?.fingerprint, changes: state.changes.length, rows: JSON.stringify(state.rows), draft: input?.value, focus: document.activeElement?.id, caret: input?.selectionStart, windowScroll: [scrollX, scrollY], contentScroll: document.querySelector(".main > .content")?.scrollTop };
    }, field);
  }
  async function close(error) {
    result.status = error || result.steps.some(entry => entry.status === "failed") ? "failed" : "passed";
    if (error) result.error = error.message;
    result.unexpectedDocumentRequests = result.documentRequests.length - requestCount;
    await context.tracing.stop({ path: path.join(directory, "trace.zip") }).catch(() => {});
    fs.writeFileSync(path.join(directory, "results.json"), JSON.stringify(result, null, 2));
    await browser.close();
  }
  try {
    for (let attempt = 0; ; attempt++) {
      try { await page.goto(base, { waitUntil: "domcontentloaded", timeout: 30000 }); break; }
      catch (error) {
        if (attempt >= 4 || !/net::ERR_CONNECTION_REFUSED|net::ERR_ABORTED/.test(error.message)) throw error;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    await baseline();
  }
  catch (error) { await close(error); throw error; }
  return { page, context, step, upload, navigate, issue, method, ready, download, snapshot, guard, baseline, close, directory, result };
}

function csv(columns, rows) { return [columns, ...rows.map(row => columns.map(column => row[column] ?? ""))].map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n"); }
function basicRows(count = 100) { return Array.from({ length: count }, (_, i) => ({ id: `R-${i + 1}`, amount: i < 10 ? "" : String(20 + i % 11), group: i % 2 ? "North" : "South", date: `2025-03-${String(i % 28 + 1).padStart(2, "0")}`, revenue: String(100 + i), cost: String(20 + i % 3), profit: String(80 + i - i % 3) })); }
module.exports = { assert, fs, path, root, artifacts, base, session, deferred, csv, basicRows };
