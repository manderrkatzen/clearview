const { assert, session } = require("./acceptance-helper.cjs");
const { default: AxeBuilder } = require(process.env.AXE_PLAYWRIGHT_MODULE || "/tmp/opencode/node_modules/@axe-core/playwright");
const cases = new Set((process.env.AUDIT_CASES || "decisions,selection,markers").split(","));
const widths = process.env.ACCEPTANCE_WIDTHS ? process.env.ACCEPTANCE_WIDTHS.split(",").map(Number) : [1440, 900, 390];

async function loadFixture(page) {
  await page.evaluate(async () => { loadData(await (await fetch("ui_test_sheet.csv")).text(), "ui_test_sheet.csv"); cancelAutomaticReview(false); });
}
async function selectIssue(page, type, column) {
  await page.evaluate(({ type, column }) => {
    const finding = state.issues.find(item => item.reviewType === type && (!column || item.column === column));
    if (!finding) throw new Error(`Missing regression fixture: ${type} ${column || ""}`);
    ReviewCore.select(finding.id);
  }, { type, column });
}
async function axe(page, selector, rules) {
  assert.ok(await page.locator(selector).count(), `The accessibility target exists: ${selector}`);
  const result = await new AxeBuilder({ page }).include(selector).withRules(rules).analyze();
  assert.deepEqual(result.violations.map(item => ({ rule: item.id, nodes: item.nodes.map(node => ({ target: node.target, reason: node.failureSummary })) })), [], `Accessibility failures in ${selector}`);
  assert.equal(result.incomplete.length, 0, `Accessibility result must be conclusive in ${selector}`);
}

(async () => {
  const failures = [];
  for (const width of widths) {
    const test = await session("audit-regressions", { width });
    const { page, step, navigate, ready } = test;
    async function check(name, features, action) {
      try { await step(name, features, action); } catch (error) { failures.push(`${width}px ${name}: ${error.message}`); }
    }
    try {
      if (cases.has("decisions")) {
        await loadFixture(page);
        await selectIssue(page, "missing", "delivery_days__missing_pattern");
        const original = await page.evaluate(() => JSON.stringify([state.headers, state.rows]));
        await page.locator("#reviewChooseFix").click(); await ready();
        await page.locator("#reviewApply").click();
        await page.waitForFunction(() => state.changes.length === 1);
        await navigate("changes");
        await check("Grouped-fill history keeps Undo visible and table overflow local", ["H01", "H03", "H05"], async () => {
          assert.ok(await page.evaluate(() => state.changes[0].treatment.fillMetadata.fills.length > 10));
          const layout = await page.evaluate(() => {
            const history = document.querySelector(".change-list"), card = document.querySelector(".change-card"), undo = card.querySelector("[data-rollback]"), table = card.querySelector(".analysis-table-wrap");
            const h = history.getBoundingClientRect(), c = card.getBoundingClientRect(), u = undo.getBoundingClientRect(), t = table.getBoundingClientRect();
            return { historyWidth: history.clientWidth, historyScroll: history.scrollWidth, cardLeft: c.left, cardRight: c.right, left: h.left + history.clientLeft, right: h.left + history.clientLeft + history.clientWidth, undoLeft: u.left, undoRight: u.right, tableWidth: t.width, tableScroll: table.scrollWidth };
          });
          assert.ok(layout.historyScroll <= layout.historyWidth + 1, `History must not scroll sideways: ${JSON.stringify(layout)}`);
          assert.ok(layout.cardLeft >= layout.left - 1 && layout.cardRight <= layout.right + 1, "The whole card fits its scrollport");
          assert.ok(layout.undoLeft >= layout.left && layout.undoRight <= Math.min(width, layout.right) + 1, "Undo is visible before focus can reveal it");
          if (width < 1000) {
            assert.ok(layout.tableScroll > layout.tableWidth, "Wide provenance remains available inside its own scroller");
            await page.locator(".analysis-table-wrap").evaluate(element => { element.scrollLeft = 100; });
            assert.ok(await page.locator(".analysis-table-wrap").evaluate(element => element.scrollLeft > 0));
            assert.equal(await page.locator(".change-list").evaluate(element => element.scrollLeft), 0);
          }
          await page.screenshot({ path: `${test.directory}/decisions.png`, fullPage: true });
        });
        await check("Tab and PageDown operate the inner fill-source table", ["H03", "H08"], async () => {
          const summary = page.locator(".fill-provenance > summary"), table = page.getByRole("region", { name: /fill sources for delivery_days__missing_pattern/i });
          assert.equal(await table.count(), 1, "Provenance has a contextual accessible region name");
          assert.equal(await table.getAttribute("tabindex"), "0");
          await summary.focus(); await page.keyboard.press("Tab");
          assert.ok(await table.evaluate(element => document.activeElement === element), "Native Tab reaches the scroller");
          const before = await page.evaluate(() => ({ history: document.querySelector(".change-list").scrollTop, page: scrollY, values: JSON.stringify(state.rows) }));
          await table.evaluate(element => { element.scrollTop = 0; });
          await page.keyboard.press("PageDown");
          await page.waitForFunction(() => document.querySelector(".analysis-table-wrap").scrollTop > 0);
          assert.ok(await table.evaluate(element => element.scrollHeight > element.clientHeight));
          assert.equal(await page.locator(".change-list").evaluate(element => element.scrollTop), before.history);
          assert.equal(await page.evaluate(() => scrollY), before.page);
          assert.equal(await page.evaluate(() => JSON.stringify(state.rows)), before.values);
          assert.notEqual(await table.evaluate(element => getComputedStyle(element).outlineStyle), "none", "Keyboard focus is visible");
        });
        await check("Visible history Undo can cancel and exactly restore the source", ["H05"], async () => {
          const approved = await page.evaluate(() => JSON.stringify([state.headers, state.rows]));
          await page.locator("[data-rollback]").click(); await page.locator("#cancelRollback").click();
          assert.equal(await page.evaluate(() => JSON.stringify([state.headers, state.rows])), approved);
          await page.locator("[data-rollback]").click(); await page.locator("#doRollback").click();
          assert.equal(await page.evaluate(() => state.changes.length), 0);
          assert.equal(await page.evaluate(() => JSON.stringify([state.headers, state.rows])), original);
        });
      }
      if ((cases.has("selection") || cases.has("expanded")) && width !== 900) {
        if (cases.has("selection")) await loadFixture(page);
        const scenarios = cases.has("selection") ? [
          ["format", "ship_date__mixed_formats", "data-format-pattern"],
          ["type-mismatch", "quantity__wrong_type", "data-format-pattern"],
          ["scale", "discount_pct__mixed_scale", "data-scale-cluster"],
          ["whitespace", "customer_city__hidden_chars", "data-whitespace-type"],
          ["invalid", "rating__impossible", "data-invalid-row"],
          ["cross-column", "profit_usd__conflicts", "data-cross-row"],
          ["leading-zeros", "customer_zip__leading_zeros", "data-zero-length"],
          ["sensitive", "contact_email__sensitive", "data-sensitive-type"],
        ] : [];
        for (const [type, column, attribute] of scenarios) await check(`${type} selection has contextual names and exact keyboard scope`, ["R02", "R03"], async () => {
          await selectIssue(page, type, column);
          const selection = page.locator('[data-review-section="selection"]'), inputs = selection.locator(`input[${attribute}]`);
          const count = await inputs.count(); assert.ok(count, `${type} selection controls exist`);
          assert.equal(await selection.getByRole("checkbox", { name: new RegExp(column) }).count(), count, "Computed names identify the affected column");
          await axe(page, '[data-review-section="selection"]', ["label", "aria-required-parent", "aria-required-children"]);
          const input = selection.locator(`input[${attribute}]:not(:disabled)`).first(), key = await input.getAttribute(attribute);
          const scope = () => page.evaluate(() => ReviewCore.exploreScope(ReviewCore.current()).map(row => row._row).sort((a, b) => a - b));
          const before = await scope(), source = await page.evaluate(() => JSON.stringify(state.rows));
          await input.focus();
          await input.evaluate(element => { window.__auditSelectionControl = element; });
          await page.evaluate(() => renderPreservingReviewFocus());
          assert.ok(await input.evaluate(element => element === window.__auditSelectionControl && document.activeElement === element), "A background render preserves the exact focused control");
          await page.keyboard.press("Space");
          assert.notDeepEqual(await scope(), before, "Space changes the intended selection");
          const retained = selection.locator(`input[${attribute}]`).filter({ visible: true });
          const same = await retained.evaluateAll((elements, { attribute, key }) => elements.findIndex(element => element.getAttribute(attribute) === key), { attribute, key });
          assert.ok(same >= 0);
          await retained.nth(same).focus(); await page.keyboard.press("Space");
          assert.deepEqual(await scope(), before, "A second toggle restores the exact row set");
          assert.equal(await page.evaluate(() => JSON.stringify(state.rows)), source);
          assert.equal(await page.evaluate(() => state.changes.length), 0);
          if (type === "sensitive") {
            const snapshot = await selection.ariaSnapshot(), originals = await page.evaluate(() => [...new Set(state.rows.map(row => row[ReviewCore.current().column]).filter(Boolean))]);
            assert.ok(originals.every(value => !snapshot.includes(value)), "Accessible names and descriptions do not disclose original sensitive values");
          }
        });
        if (cases.has("selection")) await check("All finding families use valid non-table selection semantics", ["R02"], async () => {
          const types = await page.evaluate(() => [...new Set(state.issues.map(item => item.reviewType))]);
          assert.equal(types.length, 15);
          for (const type of types) {
            await selectIssue(page, type);
            assert.equal(await page.locator('.vrow[role="row"]').count(), 0, `${type} does not invent table rows`);
          }
          await selectIssue(page, "missing", "delivery_days__missing_pattern");
          const toggle = page.getByRole("button", { name: "Treat blank values as missing in delivery_days__missing_pattern", exact: true });
          assert.equal(await toggle.count(), 1);
          assert.equal(await toggle.getAttribute("aria-pressed"), "true");
          await toggle.focus(); await page.keyboard.press("Space");
          assert.equal(await toggle.getAttribute("aria-pressed"), "false");
          await page.keyboard.press("Enter");
          assert.equal(await toggle.getAttribute("aria-pressed"), "true");
        });
        if (cases.has("selection")) await check("Source evidence and estimation-risk text meet AA contrast", ["R02", "R05"], async () => {
          await selectIssue(page, "type-mismatch", "quantity__wrong_type");
          assert.ok(await page.locator("td.gap code").count());
          await axe(page, "td.gap", ["color-contrast"]);
          await selectIssue(page, "missing", "delivery_days__missing_pattern");
          await page.locator("#reviewChooseFix").click(); await ready();
          assert.ok(await page.locator('[data-ui="review.fix.risk"]').count());
          await axe(page, '[data-ui="review.fix.risk"]', ["color-contrast"]);
        });
        await check("Expanded cross-column rows retain named controls and table headers", ["R02", "R21"], async () => {
          await page.evaluate(() => {
            const records = Array.from({ length: 1200 }, (_, index) => ({ id: String(index + 1), select: "10", cost_usd: "2", profit_usd: index < 240 ? "100" : "8" }));
            loadData(csvText(Object.keys(records[0]), records), "expanded-conflicts.csv"); cancelAutomaticReview(false);
            applyRuleConfig({ ...exportRuleConfig(), metrics: [{ id: "audit-profit", target: "profit_usd", left: "select", right: "cost_usd", operation: "difference", factor: 1, tolerance: 1, decimals: 2 }] });
            cancelAutomaticReview(false);
          });
          await selectIssue(page, "cross-column", "profit_usd");
          await page.getByRole("button", { name: "Show all 240 violating rows", exact: true }).click();
          const table = page.locator('[data-ui="review.explore.cross.table"]');
          assert.equal(await table.locator("tbody tr").count(), 240);
          assert.equal(await table.getByRole("checkbox", { name: /profit_usd/ }).count(), 240);
          assert.equal(await table.locator("thead th").count(), await table.locator("tbody tr").first().locator("td").count());
          const inputColumn = await table.locator("thead th").allTextContents();
          assert.equal(await table.locator("tbody tr").first().locator("td").nth(inputColumn.indexOf("select")).innerText(), "10", "The user column named select remains distinct from Include");
          await axe(page, '[data-ui="review.explore.cross.table"]', ["label", "aria-required-parent", "aria-required-children"]);
        });
      }
    } finally { await test.close(failures.some(error => error.startsWith(`${width}px`)) ? new Error("Audit regression failure; see individual steps.") : null); }
  }
  if (cases.has("markers")) for (const width of (process.env.MARKER_WIDTHS || "320,360,390,1440").split(",").map(Number)) {
    const test = await session("marker-regressions", { width, height: width < 600 ? 844 : 900 });
    const { page, step } = test;
    let error;
    try {
      await step("Dense finding clusters stay reachable, counted, and unobscured", ["E04", "E05", "E07", "E08"], async () => {
        await page.evaluate(async () => { loadData(await (await fetch("sales_orders.csv")).text(), "sales_orders.csv"); cancelAutomaticReview(false); go("view"); });
        const rail = page.locator("#sheetRail"); await rail.scrollIntoViewIfNeeded();
        for (const position of [0, 0.5, 1]) {
          await page.locator("#sheetViewport").evaluate((element, position) => { element.scrollTop = (element.scrollHeight - element.clientHeight) * position; }, position);
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          await page.waitForFunction(() => !window.sheetMarkerFrame);
          const geometry = await rail.locator(".sheet-bubble:not([hidden])").evaluateAll(elements => elements.map(element => {
            const box = element.getBoundingClientRect(), rail = element.closest(".sheet-rail").getBoundingClientRect(), hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
            return { label: element.getAttribute("aria-label"), contained: box.left >= rail.left && box.right <= rail.right + 1 && box.top >= rail.top && box.bottom <= rail.bottom + 1, hit: Boolean(hit && element.contains(hit)) };
          }));
          assert.ok(geometry.length);
          assert.deepEqual(geometry.filter(item => !item.contained || !item.hit), [], "Markers are not clipped or covered by edge clusters");
        }
        await page.locator("#sheetViewport").evaluate(element => { element.scrollTop = 0; });
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await page.waitForFunction(() => !window.sheetMarkerFrame);
        const source = await page.evaluate(() => JSON.stringify(state.rows));
        const readMarkers = elements => elements.map(element => ({ key: element.dataset.marker, count: Number(element.dataset.findingCount) }));
        const represented = new Map((await rail.locator("button[data-marker]:not([hidden])").evaluateAll(readMarkers)).map(item => [item.key, item.count]));
        const overflows = await rail.locator("[data-marker-overflow]:not([hidden])").evaluateAll(elements => elements.map(element => element.dataset.markerOverflow));
        assert.ok(overflows.includes("below"), "Dense edge findings offer a compact overflow control");
        for (const key of overflows) {
          await rail.locator(`[data-marker-overflow="${key}"]`).click();
          const popup = page.getByRole("dialog", { name: "More spreadsheet findings" });
          assert.ok(await popup.isVisible());
          for (const item of await popup.locator("[data-marker]").evaluateAll(readMarkers)) represented.set(item.key, item.count);
          await page.keyboard.press("Escape");
          assert.ok(await rail.locator(`[data-marker-overflow="${key}"]`).evaluate(element => document.activeElement === element));
        }
        const total = await page.evaluate(() => state.issues.filter(item => item.status === "open").reduce((sum, item) => sum + item.rows.length, 0));
        assert.equal([...represented.values()].reduce((sum, count) => sum + count, 0), total, "Inline and overflow types conserve every finding occurrence");
        const target = await page.evaluate(() => {
          const viewport = document.querySelector("#sheetViewport"), box = viewport.getBoundingClientRect(), bottom = box.top + viewport.clientHeight - 17;
          for (const row of viewport.querySelectorAll("[data-sheet-row]")) {
            const bounds = row.getBoundingClientRect();
            if (bounds.top + bounds.height / 2 <= bottom) continue;
            const id = Number(row.dataset.sheetRow), issue = state.issues.find(item => item.status === "open" && sheetIssueType(item) === "schema" && item.rows.some(row => row._row === id));
            if (issue) return { row: id, issue: issue.id, column: issue.column };
          }
          throw new Error("Expected an off-screen schema finding in the Sales fixture");
        });
        const direct = rail.locator('[data-marker="below:schema"]:not([hidden])');
        if (await direct.count()) await direct.click();
        else { await rail.locator('[data-marker-overflow="below"]').click(); await page.locator('#sheetMarkerPopover [data-marker="below:schema"]').press("Enter"); }
        assert.match(await page.locator("#sheetDetails").innerText(), new RegExp(`Row ${target.row}\\b`));
        assert.ok((await page.locator("#sheetDetails").innerText()).includes(target.column));
        assert.equal(await page.evaluate(() => JSON.stringify(state.rows)), source);
        await page.locator("#sheetReview").click();
        assert.equal(await page.evaluate(() => state.selectedIssue), target.issue, "Marker handoff opens the exact finding");
      });
      await step("Seven-type row overflow preserves focus and bounded tooltip geometry on resize", ["E04", "E08"], async () => {
        await page.evaluate(() => {
          const records = Array.from({ length: 100 }, (_, index) => ({ record: String(index + 1), a: "x", b: "x", c: "x", d: "x", e: "x", f: "x", g: "x" }));
          loadData(csvText(Object.keys(records[0]), records), "dense-marker-types.csv"); cancelAutomaticReview(false);
          const kinds = { missing: "missing", outlier: "outlier", category: "category-variants", format: "format", conflict: "cross-column", duplicate: "duplicate-rows", schema: "invalid" };
          state.issues = Object.entries(kinds).map(([type, reviewType], index) => ({ id: index + 1, column: state.headers[index + 1], reviewType, type, label: sheetIssueTypes[type].label, summary: "Marker geometry fixture", rows: state.rows, status: "open", severity: "medium" }));
          go("view");
        });
        await page.locator("#sheetRail").scrollIntoViewIfNeeded();
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const trigger = page.locator('[data-marker-overflow="row-1"]');
        assert.ok(await trigger.isVisible());
        const inline = await page.locator('[data-marker-group="row-1"] [data-marker]:not([hidden])').count();
        await trigger.press("Enter");
        assert.equal(inline + await page.locator("#sheetMarkerPopover [data-marker]").count(), 7, "Every finding type is represented exactly once");
        await page.keyboard.press("Escape");
        assert.ok(await trigger.evaluate(element => document.activeElement === element));
        await page.setViewportSize({ width: width < 700 ? 800 : 390, height: width < 600 ? 844 : 900 });
        await page.waitForFunction(() => !window.sheetMarkerFrame);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        assert.ok(await trigger.evaluate(element => document.activeElement === element), "Resizing retains focus on the corresponding overflow control");
        await page.setViewportSize({ width, height: width < 600 ? 844 : 900 });
        await page.locator("#sheetRail").scrollIntoViewIfNeeded();
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await page.locator('button[data-marker="row-1:missing"]:not([hidden])').focus();
        const tooltip = page.getByRole("tooltip");
        assert.ok(await tooltip.isVisible());
        assert.ok(await tooltip.evaluate(element => { const box = element.getBoundingClientRect(); return box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight; }));
        assert.equal(await tooltip.evaluate(element => getComputedStyle(element).pointerEvents), "none");
        await page.screenshot({ path: `${test.directory}/marker-overflow.png`, fullPage: false });
      });
    } catch (failure) { error = failure; failures.push(`${width}px markers: ${failure.message}`); }
    finally { await test.close(error); }
  }
  if (failures.length) throw new Error(failures.join("\n"));
})().catch(error => { console.error(error); process.exitCode = 1; });
