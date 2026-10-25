const { assert, session, csv } = require("./acceptance-helper.cjs");
const rows = make => Array.from({ length: 100 }, (_, i) => ({ id: String(i + 1), ...make(i) }));
const families = [
  { type: "missing", feature: "R11", method: "median", data: rows(i => ({ amount: i < 5 ? "" : String(10 + i % 3), region: i % 2 ? "North" : "South" })) },
  { type: "invalid", feature: "R13", method: "abs", data: rows(i => ({ age: i === 0 ? "-2" : String(20 + i % 10) })) },
  { type: "outlier", feature: "R12", method: "cap", data: rows(i => ({ amount: i === 0 ? "10000" : String(10 + i % 3) })) },
  { type: "duplicate-rows", feature: "R14", method: "keep-first", data: rows(i => ({ id: i === 99 ? "1" : String(i + 1), amount: i === 99 ? "10" : String(10 + i), region: i === 99 ? "North" : i % 2 ? "South" : "North" })) },
  { type: "duplicate-values", feature: "R15", method: "new-ids", data: rows(i => ({ id: i === 99 ? "1" : String(i + 1), amount: String(10 + i) })), uniqueness: true },
  { type: "format", feature: "R16", method: "to-target", data: rows(i => ({ order_date: i < 10 ? "3/25/2025" : "2025-03-25", amount: String(10 + i) })) },
  { type: "type-mismatch", feature: "R17", method: "set-missing", data: rows(i => ({ amount: i < 5 ? "oops" : String(10 + i) })) },
  { type: "scale", feature: "R18", method: "to-majority", data: rows(i => ({ discount_pct: i < 10 ? "0.5" : "50", amount: String(10 + i) })) },
  { type: "category-variants", feature: "R19", method: "map-to-canonical", data: rows(i => ({ channel: i < 10 ? "paid_social" : "Paid Social", amount: String(10 + i) })) },
  { type: "whitespace", feature: "R20", method: "clean-all", data: rows(i => ({ region: i < 10 ? "North " : "North", amount: String(10 + i) })) },
  { type: "cross-column", feature: "R21", method: "recalculate", data: rows(i => ({ profit_usd: i < 5 ? "-7800" : "8", revenue_usd: "10", cost_usd: "2" })) },
  { type: "constant", feature: "R22", method: "drop-column", data: rows(i => ({ currency: "USD", amount: String(10 + i) })) },
  { type: "leading-zeros", feature: "R23", method: "pad-zeros", data: rows(i => ({ zip: i < 10 ? "2134" : "90210", amount: String(10 + i) })) },
  { type: "multi-value", feature: "R24", method: "split-to-rows", data: rows(i => ({ parts: i < 10 ? "Email; Search" : "Email", amount: String(10 + i) })) },
  { type: "sensitive", feature: "R25", method: "hash", data: rows(i => ({ contact: `person${i}@example.com`, amount: String(10 + i) })) },
];

(async () => {
  const widths = process.env.ACCEPTANCE_WIDTHS ? process.env.ACCEPTANCE_WIDTHS.split(",").map(Number) : [1440, 390];
  for (const width of widths) {
    const test = await session("issues", { width });
    const { page, step, upload, navigate, issue, method, ready } = test;
    const failures = [];
    try {
      for (const family of families) {
        try {
          await step(`${family.type}: evidence → treatment → Apply → exact Undo`, [family.feature, "R01", "R04", "R05", "R06", "R07", "H05"], async () => {
            await upload(csv(Object.keys(family.data[0]), family.data), `${family.type}.csv`);
            const original = await page.evaluate(() => JSON.stringify([state.headers, state.rows]));
            await navigate("issues"); await issue(family.type);
            if (family.uniqueness) await page.locator("#duplicateNo").click();
            await page.locator("#reviewChooseFix").click();
            await page.waitForFunction(() => document.querySelector('[data-tab="fix"]'));
            await ready(); await method(family.method);
            const preview = await page.evaluate(() => { const data = ReviewCore.data(ReviewCore.current()); return { error: data.error, patches: data.preview?.patches.length, removedRows: data.preview?.removedRows.length, addedRows: data.preview?.addedRows.length, removedColumns: data.preview?.removedColumns.length }; });
            assert.equal(preview.error, "", "The selected supported treatment must compute");
            assert.ok(preview.patches || preview.removedRows || preview.addedRows || preview.removedColumns, "Preview describes an actual effect");
            if (family.type === "sensitive") assert.doesNotMatch(await page.locator(".main").innerText(), /person\d+@example.com/);
            if (await page.locator("#duplicateConflictAck").count()) await page.locator("#duplicateConflictAck").check();
            assert.equal(await page.locator("#reviewApply").isDisabled(), false);
            assert.equal(await page.evaluate(() => state.changes.length), 0);
            await page.locator("#reviewApply").click();
            await page.waitForFunction(() => state.changes.length === 1);
            assert.notEqual(await page.evaluate(() => JSON.stringify([state.headers, state.rows])), original);
            if (family.type === "multi-value") assert.equal(await page.evaluate(() => state.rows.length), 110);
            if (family.type === "constant") assert.equal(await page.evaluate(() => state.headers.includes("currency")), false);
            await page.locator("#reviewUndo").click();
            assert.equal(await page.evaluate(() => JSON.stringify([state.headers, state.rows])), original, "Undo restores exact values, order, row identity and structure");
          });
        } catch (failure) { failures.push(`${family.type}: ${failure.message}`); }
      }
      await step("Accepted-unchanged finding is recorded and can be reopened", ["H06", "R06", "R07"], async () => {
        const family = families[2]; await upload(csv(Object.keys(family.data[0]), family.data), "accepted.csv");
        const original = await page.evaluate(() => JSON.stringify(state.rows));
        await navigate("issues"); await issue("outlier");
        await page.locator("#reviewAccept").click();
        await page.waitForFunction(() => state.changes.length === 1);
        assert.equal(await page.evaluate(() => JSON.stringify(state.rows)), original);
        await navigate("changes"); assert.match(await page.locator(".change-card").innerText(), /Accepted unchanged/);
        await page.locator("[data-rollback]").click(); await page.locator("#doRollback").click();
        assert.equal(await page.evaluate(() => state.changes.length), 0);
        assert.equal(await page.evaluate(() => JSON.stringify(state.rows)), original);
      });
      if (failures.length) throw new Error(failures.join("\n"));
    } catch (error) { failures.push(error.message); }
    finally { await test.close(failures.length ? new Error(failures.join("\n")) : null); }
    if (failures.length) throw new Error(failures.join("\n"));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
