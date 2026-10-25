const { assert, session, csv, basicRows } = require("./acceptance-helper.cjs");

(async () => {
  const widths = process.env.ACCEPTANCE_WIDTHS ? process.env.ACCEPTANCE_WIDTHS.split(",").map(Number) : [1440, 390];
  for (const width of widths) {
    const test = await session("features", { width });
    const { page, step, upload, navigate, issue, method, ready, download } = test;
    let error, source, backup, rules;
    try {
      await step("Public samples and actual sample selection", ["D02"], async () => {
        assert.equal(await page.locator('#navigation [data-screen="issues"]').isDisabled(), true);
        await page.locator("#sampleCsv").click();
        assert.equal(await page.locator("[data-sample]").count(), 3);
        assert.equal(await page.locator('[data-sample="ui_test_sheet.csv"]').count(), 0);
        await page.locator('[data-sample="sales_orders.csv"]').click();
        await page.waitForFunction(() => state.fileName === "sales_orders.csv" && state.rows.length === 1000);
        assert.match(await page.locator(".page-head h1").innerText(), /sales_orders/);
      });
      await step("Real file chooser, profile and working distribution", ["D01", "D03", "D04", "D05"], async () => {
        await upload(csv(Object.keys(basicRows()[0]), basicRows()), "final-features.csv");
        source = await page.evaluate(() => JSON.stringify(state.rows));
        assert.equal(await page.locator(".profile-table tbody tr").count(), 7);
        assert.match(await page.locator(".metric-grid").innerText(), /100/);
        await page.locator("#cumulativeColumn").selectOption("revenue");
        assert.ok(await page.locator(".cumulative-view .bars").isVisible());
        assert.equal(await page.evaluate(() => JSON.stringify(state.rows)), source);
      });
      await step("Malformed CSV rejected atomically", ["D01"], async () => {
        const chooser = page.waitForEvent("filechooser");
        await page.locator("#replaceSource").click();
        await (await chooser).setFiles({ name: "bad.csv", mimeType: "text/csv", buffer: Buffer.from('id,value\n1,"unterminated') });
        await page.waitForFunction(() => document.querySelector("#toast").textContent.includes("Could not import"));
        assert.equal(await page.evaluate(() => state.fileName), "final-features.csv");
        assert.equal(await page.evaluate(() => JSON.stringify(state.rows)), source);
      });
      await step("Purpose and column definitions change interpretation, not values", ["D06", "D15"], async () => {
        await page.locator('[data-ui="dataset.setup"] > summary').click();
        await page.locator("#datasetPurpose").fill("Final acceptance: inspect an operational measure by group.");
        await page.locator("#columnPolicies").click();
        await page.locator("#policyColumn").selectOption("amount");
        await page.locator("#policyRole").selectOption("number");
        await page.locator("#policyMeaning").fill("Observed amount in units");
        await page.locator("#policyMissingTokens").fill("NULL\nN/A");
        await page.locator("#savePolicy").click();
        assert.equal(await page.evaluate(() => state.ruleConfig.columns.find(item => item.column === "amount").meaning), "Observed amount in units");
        assert.equal(await page.evaluate(() => JSON.stringify(state.rows)), source);
      });
      await step("Schema and derived metric definitions", ["D07", "D08"], async () => {
        if (!await page.locator('[data-ui="dataset.setup"]').evaluate(node => node.open)) await page.locator('[data-ui="dataset.setup"] > summary').click();
        await page.locator("#datasetSchema").click();
        await page.locator("#schemaColumn").selectOption("amount");
        await page.locator("#schemaType").selectOption("number");
        await page.locator("#schemaRequired").check();
        await page.locator("#schemaMinimum").fill("0");
        await page.locator("#addSchemaRule").click();
        await page.locator("#metricName").fill("Profit reconciliation");
        await page.locator("#metricTarget").selectOption("profit");
        await page.locator("#metricLeft").selectOption("revenue");
        await page.locator("#metricRight").selectOption("cost");
        await page.locator("#metricOperation").selectOption("difference");
        await page.locator("#addMetricRule").click();
        await page.locator("#saveRuleEditor").click();
        assert.ok(await page.evaluate(() => state.ruleConfig.schema.some(item => item.column === "amount" && item.required)));
        assert.ok(await page.evaluate(() => state.ruleConfig.metrics.some(item => item.target === "profit")));
        assert.equal(await page.evaluate(() => JSON.stringify(state.rows)), source);
      });
      await step("Relationships and duplicate-key definitions", ["D08", "D09"], async () => {
        if (!await page.locator('[data-ui="dataset.setup"]').evaluate(node => node.open)) await page.locator('[data-ui="dataset.setup"] > summary').click();
        await page.locator("#relationshipRules").click();
        await page.locator("#relationName").fill("Revenue covers cost");
        await page.locator("#relationColumn").selectOption("revenue");
        await page.locator("#relationLeft").selectOption("revenue");
        await page.locator("#relationRight").selectOption("cost");
        await page.locator("#addRelationship").click();
        await page.locator("#closeRelationships").click();
        await page.locator("#datasetDuplicates").click();
        await page.locator("#duplicateMode").selectOption("key");
        await page.locator('[data-dataset-key="id"]').check();
        await page.locator("#saveDuplicateDefinition").click();
        assert.equal(await page.evaluate(() => state.ruleConfig.duplicates.mode), "key");
        assert.ok(await page.evaluate(() => state.ruleConfig.relations.length));
        assert.equal(await page.evaluate(() => JSON.stringify(state.rows)), source);
      });
      await step("Business KPI definition, primary metric and scorecards", ["D10", "D11"], async () => {
        if (!await page.locator('[data-ui="dataset.setup"]').evaluate(node => node.open)) await page.locator('[data-ui="dataset.setup"] > summary').click();
        await page.locator("#businessKpis").click();
        await page.locator("#kpiName").fill("Revenue by group");
        await page.locator("#kpiMetric").selectOption("revenue");
        await page.locator("#kpiGroup").selectOption("group");
        await page.locator("#addKpi").click();
        await page.locator("#closeKpis").click();
        await page.locator("#reviewPrimaryMetric").selectOption("revenue");
        await page.waitForFunction(() => capabilityStore().scorecards?.length === state.headers.length);
        assert.ok(await page.evaluate(() => state.ruleConfig.kpis.some(item => item.name === "Revenue by group")));
        assert.equal(await page.evaluate(() => state.primaryReviewMetric), "revenue");
        assert.equal(await page.evaluate(() => JSON.stringify(state.rows)), source);
      });
      await step("Rule library save, export, import and incompatible import", ["D14"], async () => {
        await page.locator(".workspace-advanced > summary").click();
        await page.locator("#openRules").click();
        await page.locator("#ruleSetName").fill("Final acceptance rules");
        await page.locator("#saveRuleSet").click();
        await page.locator("[data-apply-rule-set]").first().waitFor();
        await page.locator("[data-apply-rule-set]").first().click();
        if (!await page.locator(".workspace-advanced").evaluate(node => node.open)) await page.locator(".workspace-advanced > summary").click();
        rules = await download("#downloadRules");
        assert.equal(JSON.parse(rules.content).format, "cleardata-rules");
        let chooser = page.waitForEvent("filechooser"); await page.locator("#importRules").click();
        await (await chooser).setFiles({ name: "rules.json", mimeType: "application/json", buffer: Buffer.from(rules.content) });
        await page.waitForFunction(() => document.querySelector("#toast").textContent.includes("definitions imported"));
        if (!await page.locator(".workspace-advanced").evaluate(node => node.open)) await page.locator(".workspace-advanced > summary").click();
        chooser = page.waitForEvent("filechooser"); await page.locator("#importRules").click();
        await (await chooser).setFiles({ name: "wrong.json", mimeType: "application/json", buffer: Buffer.from('{"format":"wrong"}') });
        await page.waitForFunction(() => document.querySelector("#toast").textContent.includes("Could not import"));
        assert.equal(await page.evaluate(() => JSON.stringify(state.rows)), source);
      });
      await step("Spreadsheet search, filtering, rail and cell-to-Review navigation", ["E01", "E02", "E03", "E04", "E05", "E06", "E07", "E08"], async () => {
        await navigate("view");
        await page.locator("#search").fill("R-21");
        assert.equal(await page.locator("#sheetViewport tbody tr").count(), 1);
        await page.locator("#search").fill("");
        await page.locator("#flaggedFilter").check();
        assert.ok(await page.locator("#sheetViewport tbody tr").count() < 100);
        await page.locator("#flaggedFilter").uncheck();
        assert.ok(await page.locator("#sheetRail .sheet-bubble").count());
        const cell = page.locator('td.flagged[data-cell-column="1"]').first();
        await cell.focus(); await page.keyboard.press("Enter");
        assert.ok(await page.locator("#sheetDetails").isVisible());
        await page.locator("#sheetReview").click();
        assert.equal(await page.evaluate(() => state.issues.find(item => item.id === state.selectedIssue).column), "amount");
        assert.equal(await page.evaluate(() => JSON.stringify(state.rows)), source);
      });
      await step("Actual missing-value approval with selected scope and literal note", ["R01", "R02", "R04", "R05", "R06", "R07", "R11"], async () => {
        await issue("missing", "amount");
        await page.locator("#reviewChooseFix").click(); await ready(); await method("median");
        await page.locator("#reviewRows").click(); assert.ok(await page.locator(".review-row-panel").isVisible());
        await page.locator("#reviewCloseRows").click();
        await page.locator("#reviewAddNote").click();
        await page.locator("#reviewNote").fill("Final acceptance: retained the reviewed numeric scope. <literal>");
        assert.equal(await page.evaluate(() => state.changes.length), 0);
        await page.locator("#reviewApply").click();
        await page.waitForFunction(() => state.changes.length === 1);
        assert.equal(await page.evaluate(() => state.rows.filter(row => !row.amount).length), 0);
        assert.match(await page.locator('[data-ui="review.review.metadata"]').innerText(), /<literal>/);
      });
      await step("Decisions, original source popup and cancelled Undo", ["H01", "H02", "H03", "H04", "H05"], async () => {
        await navigate("changes");
        assert.equal(await page.locator(".change-card").count(), 1);
        await page.locator(".decision-details > summary").click();
        assert.match(await page.locator(".change-card").innerText(), /10 records reviewed/);
        await page.locator("#historyOriginalPreview").click();
        assert.ok(await page.locator("#originalPreview").isVisible());
        await page.keyboard.press("Escape");
        await page.locator("[data-rollback]").click(); await page.locator("#cancelRollback").click();
        assert.equal(await page.evaluate(() => state.changes.length), 1);
      });
      await step("Report downloads contain the actual approved data and log", ["P01", "P02", "P03", "P04", "P05", "P06", "P07", "H07"], async () => {
        await navigate("report");
        await page.locator(".export-options > summary").click();
        await page.locator("#exportImputationMethods").check();
        const data = await download("#downloadCsv");
        assert.match(data.content.split(/\r?\n/)[0], /"amount_imputed","amount_imputation_method"/);
        assert.equal((data.content.match(/"1","median"/g) || []).length, 10);
        const report = JSON.parse((await download("#downloadQualityJson")).content);
        assert.equal(report.summary.changedCells, 10);
        assert.equal(report.activeDecisions.length, 1);
        const log = JSON.parse((await download("#downloadDecisionJson")).content);
        assert.ok(log.events.some(event => event.kind === "approval"));
        assert.match((await download("#downloadQualityHtml")).content, /ClearData quality report/);
        assert.match((await download("#downloadDecisionCsv")).content, /decision_id/);
      });
      await step("Save named project and portable backup with history", ["D13"], async () => {
        await navigate("data"); await page.locator("#saveProject").click();
        await page.locator("#projectName").fill("Final acceptance project");
        await page.locator("#confirmSaveProject").click();
        await page.waitForFunction(() => state.projectName === "Final acceptance project" && !state.projectDirty);
        backup = await download("#downloadProject");
        const project = JSON.parse(backup.content);
        assert.equal(project.format, "cleardata-project");
        assert.equal(project.changes.length, 1);
      });
      await step("Restore saved and imported projects through visible controls", ["D13"], async () => {
        await upload("id,value\n1,other\n2,source", "replacement.csv");
        await page.locator("#openProjects").click();
        await page.locator(".library-item").filter({ hasText: "Final acceptance project" }).locator("[data-open-project]").click();
        await page.waitForFunction(() => state.fileName === "final-features.csv" && state.changes.length === 1);
        const chooser = page.waitForEvent("filechooser"); await page.locator("#importProject").click();
        await (await chooser).setFiles({ name: "backup.json", mimeType: "application/json", buffer: Buffer.from(backup.content) });
        await page.waitForFunction(() => state.projectName === "Final acceptance project");
        assert.equal(await page.evaluate(() => state.rows.length), 100);
        assert.equal(await page.evaluate(() => state.changes.length), 1);
      });
      await step("History Undo restores source and exports actual rollback events", ["H05", "H07", "P05"], async () => {
        await navigate("changes"); await page.locator("[data-rollback]").click(); await page.locator("#doRollback").click();
        await page.waitForFunction(() => state.changes.length === 0);
        assert.equal(await page.evaluate(() => JSON.stringify(state.rows)), source);
        await navigate("report");
        const log = JSON.parse((await download("#downloadDecisionJson")).content);
        assert.ok(log.events.some(event => event.kind === "rollback" && event.effects.patches.length === 10));
      });
      await step("Explicit reload resumes only explicitly saved work", ["D13"], async () => {
        await page.reload({ waitUntil: "domcontentloaded" }); await test.baseline();
        assert.equal(await page.evaluate(() => state.headers.length), 0);
        await page.locator("#openProjects").click();
        await page.locator(".library-item").filter({ hasText: "Final acceptance project" }).locator("[data-open-project]").click();
        await page.waitForFunction(() => state.changes.length === 1);
        assert.equal(await page.evaluate(() => state.rows.length), 100);
      });
      await step("Corrupt backup cannot replace an active project", ["D13"], async () => {
        const before = await page.evaluate(() => JSON.stringify(state.rows));
        const chooser = page.waitForEvent("filechooser"); await page.locator("#importProject").click();
        await (await chooser).setFiles({ name: "invalid.json", mimeType: "application/json", buffer: Buffer.from('{"format":"cleardata-project","version":1}') });
        await page.waitForFunction(() => document.querySelector("#toast").textContent.includes("Could not import"));
        assert.equal(await page.evaluate(() => JSON.stringify(state.rows)), before);
      });
      await step("Manual correction and exact Undo through the shared review", ["D12", "R26", "H08"], async () => {
        await navigate("data");
        await upload(csv(Object.keys(basicRows()[0]), basicRows()), "manual.csv");
        const original = await page.evaluate(() => JSON.stringify(state.rows));
        await page.locator('[data-ui="dataset.setup"] > summary').click();
        await page.locator("#manualCorrection").click();
        await page.locator("#manualColumn").selectOption("amount");
        await page.locator("#manualRowIds").fill("11");
        await page.locator("#beginManual").click();
        await page.locator("#reviewChooseFix").click(); await ready();
        await page.locator("#manualReplacement").fill("42"); await page.locator("#manualReplacement").press("Tab"); await ready();
        await page.locator("#reviewApply").click();
        await page.waitForFunction(() => state.changes.length === 1);
        assert.equal(await page.evaluate(() => Number(state.rows[10].amount)), 42);
        await page.locator("#reviewUndo").click();
        assert.equal(await page.evaluate(() => JSON.stringify(state.rows)), original);
        await navigate("changes");
        assert.equal(await page.locator(".change-card").count(), 0);
        assert.ok(await page.locator("#reviewIssues").isVisible());
      });
      await step("Overlapping history Undo preserves a later correction", ["H05", "H07", "P05"], async () => {
        await upload(csv(Object.keys(basicRows()[0]), basicRows()), "overlapping.csv");
        const original = await page.evaluate(() => JSON.stringify(state.rows));
        await navigate("issues"); await issue("missing", "amount");
        await page.locator("#reviewChooseFix").click(); await ready(); await method("median");
        await page.locator("#reviewApply").click(); await page.waitForFunction(() => state.changes.length === 1);
        const firstId = await page.evaluate(() => state.changes[0].id);
        await navigate("data"); await page.locator('[data-ui="dataset.setup"] > summary').click();
        await page.locator("#manualCorrection").click(); await page.locator("#manualColumn").selectOption("amount");
        await page.locator("#manualRowIds").fill("1"); await page.locator("#beginManual").click();
        await page.locator("#reviewChooseFix").click(); await ready();
        await page.locator("#manualReplacement").fill("99"); await page.locator("#manualReplacement").press("Tab"); await ready();
        await page.locator("#reviewApply").click(); await page.waitForFunction(() => state.changes.length === 2);
        await navigate("changes"); await page.locator(`[data-rollback="${firstId}"]`).click(); await page.locator("#doRollback").click();
        await page.waitForFunction(() => state.changes.length === 1);
        assert.equal(await page.evaluate(() => Number(state.rows[0].amount)), 99);
        assert.ok(await page.evaluate(() => state.rows.slice(1, 10).every(row => row.amount === "")));
        await navigate("report");
        const log = JSON.parse((await download("#downloadDecisionJson")).content);
        assert.equal(log.events.filter(event => event.kind === "rollback").at(-1).effects.patches.length, 9);
        await navigate("changes"); await page.locator("[data-rollback]").click(); await page.locator("#doRollback").click();
        assert.equal(await page.evaluate(() => JSON.stringify(state.rows)), original);
      });
    } catch (failure) { error = failure; }
    finally { await test.close(error); }
    if (error) throw error;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
