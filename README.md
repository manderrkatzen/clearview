# ClearData

**An analyst-led workspace for reviewing and cleaning CSV data.**

[Open the live application](https://clearview-data-quality-copilot.ritwikranjanpandey.workers.dev)

ClearData combines local data-quality checks, optional AI assistance, treatment previews, and reversible decisions. Findings are evidence for review—not automatic instructions to change the data.

## Workflow

**Dataset → Explore → Review → Decisions → Report**

1. **Dataset:** import a CSV or choose a bundled sample; inspect its column profile.
2. **Explore:** browse the spreadsheet, highlighted values, and issue markers.
3. **Review:** select a finding and move freely between **Explore**, **Fix**, and **Review** tabs. Inspect evidence, select a treatment, and approve its exact preview.
4. **Decisions:** inspect recorded changes and Undo decisions.
5. **Report:** export the working CSV, quality report, or decision log.

The original-data popup is available throughout Review and Decisions. It provides read-only source inspection while preserving the underlying draft, preview, and scroll position.

## Capabilities

- **Data profiling:** completeness, distinct values, inferred types, and numerical distributions.
- **Quality findings:** missing values and candidate tokens, outliers, duplicates, inconsistent labels, whitespace, format/type conflicts, mixed scales, invalid values, cross-column inconsistencies, leading zeros, combined values, and sensitive data.
- **Scoped treatments:** constant and statistical fills, group-wise and similar-row estimates, label mappings, formatting, parsing, scaling, bounds capping, structural changes, masking, and row/column removal where supported.
- **Explicit approval:** selecting a treatment computes a preview; applying it requires confirmation. Blocked rows and configured rule violations remain visible.
- **Reversible history:** original values and row identities are retained. Undo replays the remaining approved decisions.
- **Local projects:** explicitly save a workspace in browser storage, download a portable backup, or reuse rule definitions.
- **Exports:** cleaned CSVs, optional fill-provenance columns, self-contained HTML/JSON quality reports, and CSV/JSON decision logs.

AI can suggest interpretations and treatments, but it does not apply changes. Its scores are model-assessed rankings, not calibrated probabilities. Local/manual review remains available without a configured provider.

## Try the samples

Select **Try a sample dataset** in the application:

| Sample | Records | Context |
| --- | ---: | --- |
| Healthcare patient visits | 1,000 | Clinical measurements and visits |
| Sales orders | 1,000 | Orders, pricing, profitability, and delivery |
| Marketing campaigns | 1,000 | Spend, conversions, and campaign performance |

## Run locally

Use a current Node.js release with built-in `fetch` and `AbortSignal.timeout` support. There is no application build step or package installation required to serve the app.

```bash
node server.js
```

Open **http://localhost:4174**.

The local AI default is Ollama. See [`.env.example`](.env.example) for configuration. The server reads environment variables; it does not automatically load `.env`.

On a Node version supporting environment files:

```bash
node --env-file=.env server.js
```

## Architecture

The frontend uses vanilla JavaScript, HTML, and CSS. CSV parsing, profiling, previews, and treatment calculations run in the browser, with workers for background analysis. AI requests use a same-origin server API.

| Area | Files |
| --- | --- |
| Application shell and shared state | `index.html`, `app.js` |
| Spreadsheet and cell inspection | `spreadsheet.js`, `spreadsheet.css` |
| Review components and issue modules | `review-core.js`, `review-components.js`, `review-page.js`, `issues/` |
| Parsing, profiling, and treatment engines | `cleaning-engine.js`, `review-page-engine.js`, `profile-worker.js` |
| Analytical comparisons and background work | `analysis-engine.js`, `analysis-worker.js`, `analytics.js`, `review-bands.js` |
| Projects, rules, and exports | `workspace.js`, `capabilities-engine.js`, `capabilities.js` |
| Shared presentation | `styles.css`, `design-system.css`, `review-page.css`, `review-reference.css` |
| Local HTTP/API server | `server.js` |
| Deployed API and asset routing | `src/worker.js` |
| Shared AI validation and providers | `src/ai.cjs`, `src/review-ai.cjs` |
| Additional Cloudflare Pages API handlers | `functions/api/ai/` |

The browser scripts use shared globals and load in the order defined in `index.html`.

## Verification

### Engine and API regressions

```bash
node --test scripts/verify_quality.cjs scripts/verify_cleaning.cjs scripts/verify_review_page.cjs scripts/verify_missing_contract.cjs
node --test scripts/verify_pattern.cjs
node --test scripts/verify_analysis.cjs
node --test scripts/verify_next_capabilities.cjs
node scripts/verify_next_performance.cjs
```

Run timing-sensitive performance checks separately from heavy browser or engine workloads.

### Browser checks

Install Playwright outside the application, install Chromium, and start the local server in another terminal:

```bash
npm install --prefix /tmp/cleardata-tools playwright
/tmp/cleardata-tools/node_modules/.bin/playwright install --with-deps chromium
PLAYWRIGHT_MODULE=/tmp/cleardata-tools/node_modules/playwright node scripts/verify_ui.cjs
```

The UI runner covers the current review workflow, shell stability, original-data popup, sample distributions, chart interactions, and grouped row browsing. Provider replies are mocked; local calculations, approvals, Undo, and downloads are exercised against the real application.

`ui_test_sheet.csv` is a debugging/test fixture. It is not listed in the application's sample chooser.

Additional focused checks are available for AI composers, per-row AI suggestions, long lists, and component consistency. Set `BASE_URL` to verify another running instance. Generated browser evidence belongs outside the committed source.

`scripts/verify_ai_provider.cjs` is a separate, opt-in live-provider smoke check. It makes a real synthetic request and may require `TURNSTILE_TOKEN` when verification is enabled.

## Deployment

The live application runs on Cloudflare Workers with static assets and a server-side AI API. See [DEPLOYMENT.md](DEPLOYMENT.md) for configuration and release steps.

Only browser-delivered files listed in [`.assetsignore`](.assetsignore) enter the static asset bundle. Provider credentials stay server-side.

## Data and storage

- CSV processing and saved project storage are browser-local. Saved projects are specific to the browser and site origin; backups are the portable option.
- AI features send bounded request-specific context to the configured provider. Depending on the operation, that can include selected values or confirmed row fields. Sensitive-data review remains local and uses masked examples.
- Saving a project is explicit. Browser storage can be cleared, so download a backup for durable retention.
- Original values remain available for inspection and Undo, including in project backups. Masking or coding a working column does not erase the preserved source.
- A reviewed finding may be accepted unchanged. Blank cells, unusual values, and legitimate zero values have distinct meanings.
- This project provides review records and reversible changes; it is not a tamper-proof audit system or a promise of anonymization.

## Typography

Source Sans 3 is self-hosted under `fonts/`. Attribution and the SIL Open Font License are included in that directory.
