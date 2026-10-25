const { assert, session, deferred, csv, basicRows } = require("./acceptance-helper.cjs");
const widths = process.env.ACCEPTANCE_WIDTHS ? process.env.ACCEPTANCE_WIDTHS.split(",").map(Number) : [1440, 900, 390];

async function prepare(test, name, data = basicRows()) {
  await test.upload(csv(Object.keys(data[0]), data), name);
  await test.navigate("issues"); await test.issue("missing", "amount");
  await test.page.locator("#reviewChooseFix").click();
  await test.method("median");
}
async function retain(test, selector) {
  await test.page.evaluate(selector => { window.__raceField = document.querySelector(selector); window.__racePreview = ReviewCore.data(ReviewCore.current()).preview; }, selector);
  return test.snapshot(selector);
}
async function unchanged(test, selector, before) {
  assert.deepEqual(await test.snapshot(selector), before, "Async output reset a draft, scope, preview, focus, caret or scroll position");
  assert.ok(await test.page.evaluate(selector => __raceField === document.querySelector(selector) && __racePreview === ReviewCore.data(ReviewCore.current()).preview, selector), "Async output replaced the active input or exact preview object");
}
async function run(name, width, options, body) {
  const test = await session(name, { width, ...options });
  let error;
  try { await body(test); } catch (failure) { error = failure; }
  finally { await test.close(error); }
  if (error) throw error;
}

(async () => {
  const failures = [];
  for (const width of widths) {
    const scenarios = [
      async () => {
        const request = deferred(), response = deferred();
        await run("late-configuration", width, { route: async route => {
          if (!route.request().url().endsWith("/api/ai/review") || route.request().method() !== "GET") return false;
          request.resolve(); await response.promise;
          await route.fulfill({ json: { available: false, turnstileSiteKey: "" } }); return true;
        } }, async test => {
          await test.step("Delayed AI configuration preserves an unfinished numeric draft", ["R04", "R05", "R09"], async () => {
            await prepare(test, "config-race.csv"); await request.promise;
            await test.page.locator("#missingMedianValue").fill("4.25");
            const before = await retain(test, "#missingMedianValue");
            response.resolve();
            await test.page.waitForFunction(() => ReviewCore.data(ReviewCore.current()).aiUnavailableByConfig === true);
            await unchanged(test, "#missingMedianValue", before);
          });
        });
      },
      async () => {
        await run("late-worker", width, { workerHold: true }, async test => {
          await test.step("Late worker results preserve selected grouping and the current draft", ["R02", "R03", "R04", "R05"], async () => {
            const data = basicRows().map((row, i) => ({ ...row, amount: i < 20 ? "" : String(20 + i % 3), region: i % 2 ? "North" : "South", segment: i < 20 ? "Missing-heavy" : i % 2 ? "Established" : "Returning" }));
            // Leave region before segment: the initial default is deliberately different from the late strongest pattern.
            data.forEach(row => { delete row.group; });
            await prepare(test, "worker-race.csv", data);
            await test.page.waitForFunction(() => __acceptanceWorkerQueue.length > 0);
            await test.page.locator("#missingMedianValue").fill("4.25");
            const before = await retain(test, "#missingMedianValue");
            await test.page.evaluate(() => __acceptanceReleaseWorkers());
            await test.page.waitForFunction(() => !ReviewCore.data(ReviewCore.current()).comparePending && __acceptanceWorkerDeliveries > 0);
            await unchanged(test, "#missingMedianValue", before);
          });
        });
      },
      async () => {
        const request = deferred(), response = deferred();
        await run("generated-ai-option", width, { route: async route => {
          if (!route.request().url().endsWith("/api/ai/review")) return false;
          if (route.request().method() === "GET") { await route.fulfill({ json: { available: true, turnstileSiteKey: "" } }); return true; }
          if (route.request().postDataJSON().mode !== "fix") return false;
          request.resolve(); await response.promise;
          await route.fulfill({ json: { provider: "controlled-test", result: { operation: "constant", params: { value: "7" }, reason: "Synthetic alternative for state-preservation verification." } } }); return true;
        } }, async test => {
          await test.step("A newly generated AI option preserves the active input and preview", ["R04", "R05", "R09"], async () => {
            await prepare(test, "generated-race.csv");
            await test.page.locator("#reviewAskAi").click();
            await test.page.locator("#reviewAiInstruction").fill("Suggest an alternative without applying it.");
            await test.page.locator("#reviewSuggestAi").click(); await request.promise;
            await test.page.locator("#missingMedianValue").fill("4.25");
            const before = await retain(test, "#missingMedianValue"); response.resolve();
            await test.page.locator('[data-fix="ai:constant"]').waitFor({ state: "attached" });
            await unchanged(test, "#missingMedianValue", before);
          });
        });
      },
      async () => {
        const request = deferred(), response = deferred();
        await run("late-ai-offscreen", width, { route: async route => {
          if (!route.request().url().endsWith("/api/ai/review")) return false;
          if (route.request().method() === "GET") { await route.fulfill({ json: { available: true, turnstileSiteKey: "" } }); return true; }
          if (route.request().postDataJSON().mode !== "fix") return false;
          request.resolve(); await response.promise;
          await route.fulfill({ json: { provider: "controlled-test", result: { operation: "constant", params: { value: "7" }, reason: "Delayed synthetic suggestion." } } }); return true;
        } }, async test => {
          await test.step("A late Review AI response does not rebuild an active spreadsheet", ["E01", "E02", "E05", "R09"], async () => {
            await prepare(test, "offscreen-race.csv");
            await test.page.locator("#reviewAskAi").click(); await test.page.locator("#reviewSuggestAi").click(); await request.promise;
            await test.navigate("view");
            await test.page.locator("td.flagged").first().click();
            await test.page.locator("#sheetViewport").evaluate(element => { element.scrollTop = 180; });
            await test.page.evaluate(() => { window.__raceSheet = document.querySelector("#sheetViewport"); window.__raceInspector = document.querySelector("#sheetDetails"); });
            const before = await test.page.evaluate(() => ({ scroll: document.querySelector("#sheetViewport").scrollTop, inspector: document.querySelector("#sheetDetails").textContent, rows: JSON.stringify(state.rows) }));
            response.resolve();
            await test.page.waitForFunction(() => Object.values(state.reviewPage).some(data => data.aiFixProposal?.operation === "constant"));
            const after = await test.page.evaluate(() => ({ scroll: document.querySelector("#sheetViewport").scrollTop, inspector: document.querySelector("#sheetDetails").textContent, rows: JSON.stringify(state.rows) }));
            assert.deepEqual(after, before, "A response for an inactive page reset the spreadsheet inspection");
            assert.ok(await test.page.evaluate(() => __raceSheet.isConnected && __raceInspector.isConnected), "A response for an inactive page remounted spreadsheet controls");
          });
        });
      },
      async () => {
        const request = deferred(), response = deferred();
        await run("stale-ai-dataset", width, { route: async route => {
          if (!route.request().url().endsWith("/api/ai/review")) return false;
          if (route.request().method() === "GET") { await route.fulfill({ json: { available: true, turnstileSiteKey: "" } }); return true; }
          if (route.request().postDataJSON().mode !== "fix") return false;
          request.resolve(); await response.promise;
          await route.fulfill({ json: { provider: "controlled-test", result: { operation: "constant", params: { value: "7" }, reason: "Old dataset result." } } }).catch(error => { if (!/closed|aborted|handled/i.test(error.message)) throw error; });
          return true;
        } }, async test => {
          await test.step("Replacing the dataset invalidates a pending AI suggestion", ["D01", "R09"], async () => {
            await prepare(test, "old-source.csv");
            await test.page.locator("#reviewAskAi").click(); await test.page.locator("#reviewSuggestAi").click(); await request.promise;
            await test.navigate("data"); await test.upload("id,amount\n1,70\n2,80\n3,90", "new-source.csv");
            const before = await test.page.evaluate(() => JSON.stringify([state.fileName, state.rows, state.changes]));
            response.resolve();
            await test.page.waitForTimeout(100); // Bounded settlement after deliberately aborting the old request.
            assert.equal(await test.page.evaluate(() => JSON.stringify([state.fileName, state.rows, state.changes])), before);
            assert.equal(await test.page.locator('[data-fix="ai:constant"]').count(), 0);
          });
        });
      },
      async () => {
        await run("blocked-and-partial", width, {}, async test => {
          await test.step("Blocked dates require explicit partial approval and exact Undo", ["R05", "R06", "R16"], async () => {
            const data = basicRows().map((row, i) => ({ ...row, order_date: i < 10 ? "31/02/2025" : i < 20 ? "3/25/2025" : "2025-03-25" }));
            await test.upload(csv(Object.keys(data[0]), data), "blocked-dates.csv");
            const original = await test.page.evaluate(() => JSON.stringify(state.rows));
            await test.navigate("issues"); await test.issue("format", "order_date");
            await test.page.locator("#reviewChooseFix").click(); await test.ready(); await test.method("to-target");
            assert.equal(await test.page.locator("#reviewApply").isDisabled(), true);
            assert.ok(await test.page.locator("#reviewApplyReason").isVisible());
            await test.page.locator("#reviewSkipBlocked").check(); await test.ready();
            assert.equal(await test.page.locator("#reviewApply").isDisabled(), false);
            await test.page.locator("#reviewApply").click(); await test.page.waitForFunction(() => state.changes.length === 1);
            assert.ok(await test.page.evaluate(() => state.rows.slice(0, 10).every(row => row.order_date === "31/02/2025")));
            await test.page.locator("#reviewUndo").click();
            assert.equal(await test.page.evaluate(() => JSON.stringify(state.rows)), original);
          });
        });
      },
      async () => {
        const request = deferred(), response = deferred();
        await run("generated-row-suggestions", width, { route: async route => {
          if (!route.request().url().endsWith("/api/ai/review")) return false;
          if (route.request().method() === "GET") { await route.fulfill({ json: { available: true, turnstileSiteKey: "" } }); return true; }
          const body = route.request().postDataJSON();
          if (body.mode === "rule-plan") {
            await route.fulfill({ json: { provider: "controlled-test", result: { columns: ["rating"], explanation: "Use the confirmed rating field.", needsClarification: false } } }); return true;
          }
          if (body.mode !== "rule-values") return false;
          request.resolve(); await response.promise;
          await route.fulfill({ json: { provider: "controlled-test", result: { suggestions: body.context.rows.map(row => ({ id: row.id, value: Number(row.values.rating) < 0.5 ? "LOW" : "HIGH", reason: "Synthetic rating threshold." })) } } }); return true;
        } }, async test => {
          await test.step("Generated row suggestions preserve a note draft, caret and exact preview", ["R10", "R04", "R05", "R06"], async () => {
            await test.upload("id,satisfaction,rating\n1,,0.2\n2,,0.8\n3,,0.4", "row-suggestions.csv");
            const original = await test.page.evaluate(() => JSON.stringify(state.rows));
            await test.navigate("issues"); await test.issue("missing", "satisfaction");
            await test.page.locator("#reviewChooseFix").click(); await test.ready(); await test.method("constant");
            await test.page.locator("#reviewAskAiRule").click();
            await test.page.locator("#reviewRuleInstruction").fill("Use LOW below 0.5 and HIGH otherwise.");
            await test.page.locator("#reviewRulePlan").click();
            await test.page.locator("#reviewRuleGenerate").waitFor();
            await test.page.locator("#reviewRuleGenerate").click(); await request.promise;
            await test.page.locator("#reviewAddNote").click();
            await test.page.locator("#reviewNote").fill("Unfinished analyst note: preserve this caret.");
            await test.page.locator("#reviewNote").press("Home"); await test.page.locator("#reviewNote").press("ArrowRight");
            const before = await retain(test, "#reviewNote"); response.resolve();
            await test.page.waitForFunction(() => ReviewCore.data(ReviewCore.current()).ruleStatus === "ready");
            assert.equal(await test.page.locator('[data-ui="review.fix.ai.rule.rows"] tbody tr').count(), 3);
            await unchanged(test, "#reviewNote", before);
            await test.page.locator('[data-ai-rule-row="2"] [data-ai-rule-action="no"]').click();
            await test.page.locator("#reviewRuleApproveAll").click(); await test.ready();
            assert.equal(await test.page.evaluate(() => ReviewCore.data(ReviewCore.current()).preview.patches.length), 2);
            assert.equal(await test.page.evaluate(() => JSON.stringify(state.rows)), original);
            await test.page.locator("#reviewApply").click(); await test.page.waitForFunction(() => state.changes.length === 1);
            assert.deepEqual(await test.page.evaluate(() => state.rows.map(row => row.satisfaction)), ["LOW", "", "LOW"]);
            await test.page.locator("#reviewUndo").click();
            assert.equal(await test.page.evaluate(() => JSON.stringify(state.rows)), original);
          });
        });
      },
      async () => {
        await run("ai-error-recovery", width, { route: async route => {
          if (!route.request().url().endsWith("/api/ai/review")) return false;
          await route.fulfill({ status: route.request().method() === "GET" ? 200 : 503, json: route.request().method() === "GET" ? { available: true, turnstileSiteKey: "" } : { error: "Synthetic provider outage" } }); return true;
        } }, async test => {
          await test.step("AI failure leaves the local treatment usable and reversible", ["R09", "R06"], async () => {
            await prepare(test, "provider-error.csv");
            const original = await test.page.evaluate(() => JSON.stringify(state.rows));
            const fingerprint = await test.page.evaluate(() => ReviewCore.data(ReviewCore.current()).preview.fingerprint);
            await test.page.locator("#reviewAskAi").click(); await test.page.locator("#reviewSuggestAi").click();
            await test.page.waitForFunction(() => ReviewCore.data(ReviewCore.current()).aiStatus === "error");
            assert.match(await test.page.locator("#reviewAiRequest").innerText(), /unavailable/i);
            assert.equal(await test.page.evaluate(() => ReviewCore.data(ReviewCore.current()).preview.fingerprint), fingerprint);
            assert.equal(await test.page.locator("#reviewApply").isDisabled(), false);
            await test.page.locator("#reviewApply").click(); await test.page.waitForFunction(() => state.changes.length === 1);
            await test.page.locator("#reviewUndo").click();
            assert.equal(await test.page.evaluate(() => JSON.stringify(state.rows)), original);
          });
        });
      },
    ];
    for (const scenario of scenarios) try { await scenario(); } catch (error) { failures.push(`${width}px: ${error.message}`); console.error(failures.at(-1)); }
  }
  if (failures.length) throw new Error(failures.join("\n"));
})().catch(error => { console.error(error); process.exitCode = 1; });
