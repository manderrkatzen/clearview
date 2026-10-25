# Clearview

**A portfolio project that makes data-cleaning decisions inspectable and reversible.**

[Explore the live project](https://clearview-data-quality-copilot.ritwikranjanpandey.workers.dev)

Clearview brings together data profiling, contextual issue detection, before-and-after analysis, optional AI recommendations, and reversible change history. The project covers the complete path from a raw CSV to a reviewed dataset and an exportable decision record.

## The problem I focused on

Cleaning data involves judgment. A blank can be legitimate, an outlier can be a real event, and a statistically convenient replacement can change an analytical conclusion. Those decisions become difficult to defend when the original evidence and reasoning disappear.

I focused on making that judgment visible: **what was flagged, why it matters, what a proposed correction changes, and how to undo it.**

## What I built

The application follows one connected workflow:

**Dataset → Explore → Review → Decisions → Report**

- **Dataset profiling:** inferred types, completeness, distinct values, and numerical distributions.
- **Evidence-led investigation:** a spreadsheet with highlighted cells, issue markers, column-specific findings, and grouped row comparisons.
- **Treatment previews:** scoped fills, mappings, parsing, scaling, duplicate handling, structural changes, and other corrections with visible consequences.
- **Human-reviewed AI:** bounded interpretations and treatment suggestions, validated before becoming actionable.
- **Reversible decisions:** preserved source values, recorded changes, analyst notes, and Undo that retains later approved work.
- **A complete handoff:** cleaned CSVs, fill-provenance options, quality reports, decision logs, and portable project backups.

Within Review, the **Explore / Fix / Review** tabs separate evidence, proposed treatment, and recorded outcome. They remain freely navigable. A read-only original-data pane supports comparison without resetting the underlying work.

## Decisions behind the implementation

| Design decision | Reasoning | Implementation evidence |
| --- | --- | --- |
| Preview before applying | Analysts need to see scope and consequences before changing data. | [Review and approval logic](review-core.js) validates an unchanged preview before applying it. |
| Distinguish missingness meanings | Blanks, unconfirmed tokens, not-applicable values, and legitimate zeros should not collapse into one category. | [Observation and treatment engine](cleaning-engine.js), [contextual value review](value-review.js). |
| Compare analytical impact | A correction can affect distributions, group attribution, and reported totals. | [Analysis engine](analysis-engine.js), [comparison charts](review-charts.js), and [capability calculations](capabilities-engine.js). |
| Preserve reversibility | Undo must account for overlapping decisions and structural changes. | [Replay engine](review-page-engine.js) and [regression coverage](scripts/verify_quality.cjs). |
| Keep AI bounded | Recommendations need to refer to real columns, evidence, and supported operations. | [Shared provider validation](src/ai.cjs) and [issue-specific contracts](src/review-ai.cjs); credentials remain server-side. |
| Separate inspection from mutation | Browsing evidence or opening a popup should preserve drafts, previews, and navigation state. | [Shared review components](review-components.js), [shell stability checks](scripts/verify_shell_stability_ui.cjs), and [popup checks](scripts/verify_worksheet_peek_ui.cjs). |

## What this project demonstrates

**Business and product analysis** — translating ambiguous data-quality concerns into explicit definitions, treatment choices, approval conditions, and traceable decisions.

**Data analysis** — working with distributions, missingness patterns, grouped comparisons, effect sizes, and the downstream impact of proposed corrections.

**Software engineering** — separating calculation engines from presentation, using background workers, validating API contracts, preserving state, and testing reversible operations.

**AI integration** — combining deterministic computation with constrained recommendations, explicit context sharing, stale-response protection, and human approval.

**Interface design** — establishing an evidence-first hierarchy, reducing repetitive instructions, supporting keyboard interaction, and maintaining a consistent desktop/mobile workspace.

## A representative example

The bundled **sales-orders dataset** connects the main ideas: investigate missing delivery measurements, compare their distribution across sales channels, preview a fill, inspect its analytical effect, approve the exact scope, and revisit the result in Decisions.

Healthcare and marketing samples extend the demonstration to different column meanings and business contexts. Each public sample contains 1,000 records.

## Technical overview

**Frontend:** vanilla JavaScript, HTML, CSS, inline SVG charts, and self-hosted Source Sans 3.

**Data processing:** browser-local CSV parsing and treatment engines, with workers for profiling and analytical computation.

**AI and hosting:** Node.js with Ollama for local development; Cloudflare Workers with OpenAI for the hosted application. The browser uses a same-origin API.

**Persistence:** explicitly saved IndexedDB projects and downloadable JSON backups; no account service or database binding is required for local projects.

| Area | Starting points |
| --- | --- |
| Application and shared state | [`index.html`](index.html), [`app.js`](app.js) |
| Data-quality and treatment engines | [`cleaning-engine.js`](cleaning-engine.js), [`review-page-engine.js`](review-page-engine.js) |
| Review experience | [`review-core.js`](review-core.js), [`review-components.js`](review-components.js), [`issues/`](issues/) |
| Analytical computation | [`analysis-engine.js`](analysis-engine.js), [`analysis-worker.js`](analysis-worker.js), [`review-bands.js`](review-bands.js) |
| Projects, rules, and exports | [`workspace.js`](workspace.js), [`capabilities-engine.js`](capabilities-engine.js) |
| Hosted API | [`src/worker.js`](src/worker.js), [`src/ai.cjs`](src/ai.cjs), [`src/review-ai.cjs`](src/review-ai.cjs) |
| Verification | [`scripts/`](scripts/) |

## Evidence of correctness

The repository includes automated checks for CSV round-tripping, scoped treatments, ambiguous formats, blocked records, source preservation, project restore, overlapping changes, and structural rollback.

Browser checks exercise the actual review workflow, keyboard and touch interactions, grouped tables, charts, original-data inspection, approval, export, and Undo. They also check that the application shell remains stable between screens. AI responses are mocked in these tests; local calculations and data changes are real.

The project includes a separate opt-in live-provider smoke check and timing-sensitive analytical performance checks.

## Scope and tradeoffs

The project prioritizes a complete, inspectable review loop over account management or cloud-synchronized storage. Processing and saved projects are browser-local, with portable backups for transfer between devices.

AI operations use bounded, request-specific context and return validated suggestions. Their scores are recommendation rankings, not calibrated probabilities. Preserved source snapshots make Undo possible; that retention also means original values remain in project backups after a working column is masked.

<details>
<summary><strong>Run and verify locally</strong></summary>

Use a current Node.js release with built-in `fetch` and `AbortSignal.timeout` support. There is no application build step.

```bash
node server.js
```

Open **http://localhost:4174**. Configuration options are in [`.env.example`](.env.example); the server reads environment variables and does not automatically load `.env`.

Core regression checks:

```bash
node --test scripts/verify_quality.cjs scripts/verify_cleaning.cjs scripts/verify_review_page.cjs scripts/verify_missing_contract.cjs
node --test scripts/verify_pattern.cjs
node --test scripts/verify_analysis.cjs
node --test scripts/verify_next_capabilities.cjs
node scripts/verify_next_performance.cjs
```

Run timing-sensitive checks separately from heavy workloads.

For browser checks, start the local server in another terminal:

```bash
npm install --prefix /tmp/cleardata-tools playwright
/tmp/cleardata-tools/node_modules/.bin/playwright install --with-deps chromium
PLAYWRIGHT_MODULE=/tmp/cleardata-tools/node_modules/playwright node scripts/verify_ui.cjs
```

Set `BASE_URL` to target another running instance. `ui_test_sheet.csv` is a debugging fixture and is not offered in the public sample chooser.

`scripts/verify_ai_provider.cjs` makes a real synthetic provider request. Turnstile-enabled instances may require `TURNSTILE_TOKEN`.

</details>

[Product build guide](Build_Guide/README.md) · [Deployment details](DEPLOYMENT.md) · [Font attribution](fonts/README.md)
