# Deployment

Clearview uses a dependency-free Node server locally and a Cloudflare Worker for the hosted application. The Worker serves static assets and handles the same-origin AI API.

**Live application and LinkedIn sharing URL:** https://clearview-data-quality-copilot.pages.dev/

**Worker backend and original application URL:** https://clearview-data-quality-copilot.ritwikranjanpandey.workers.dev

## Local configuration

Start the application with:

```bash
node server.js
```

Open http://localhost:4174. The default local provider is Ollama. Use [`.env.example`](.env.example) as the configuration reference.

The server reads `process.env`; it does not automatically load `.env`. Export variables in your shell or use a Node version that supports:

```bash
node --env-file=.env server.js
```

Keep `.env`, `.dev.vars`, and provider credentials out of source control.

## Cloudflare Worker

[`wrangler.jsonc`](wrangler.jsonc) specifies the Worker entry point, asset binding, and route handling. The static asset allowlist is [`.assetsignore`](.assetsignore).

Authenticate Wrangler with the Cloudflare account that owns the deployment:

```bash
npx wrangler login
```

For local Worker development:

```bash
npx wrangler dev
```

### AI runtime configuration

Hosted AI uses OpenAI. Configure the provider key as a Worker secret:

```bash
npx wrangler secret put OPENAI_API_KEY
```

Configure runtime variables as appropriate:

| Variable | Purpose |
| --- | --- |
| `AI_MODE` | Provider mode; use `deployed` for hosted OpenAI access |
| `OPENAI_MODEL` | Model used by the hosted provider |
| `AI_MAX_REQUESTS_PER_HOUR` | Process/isolate-local request limit |
| `TURNSTILE_SITE_KEY` | Optional public Turnstile widget key |

See `.env.example` and the shared provider code for supported options and defaults. Set runtime values in the Worker configuration/dashboard, rather than browser code.

### Optional Turnstile verification

Configure a Turnstile widget for the application hostname, set `TURNSTILE_SITE_KEY`, and store its secret:

```bash
npx wrangler secret put TURNSTILE_SECRET_KEY
```

When configured, AI requests require verification. Local CSV processing and manual review remain independent of AI availability.

### Release

Run the relevant engine and browser checks documented in [README.md](README.md), then deploy:

```bash
npx wrangler deploy --keep-vars
```

`--keep-vars` preserves runtime variables configured through the dashboard. Secrets remain server-side.

For this repository's existing deployment, retain the Worker name `clearview-data-quality-copilot`, `workers_dev: true`, and `preview_urls: false`. Releases update the permanent application URL.

Pushing source to GitHub and deploying the Worker are separate operations unless an external build integration has been configured. Switching a local Git branch does not change the hosted application.

### LinkedIn-compatible Pages address

The existing Pages project also serves the current application at
https://clearview-data-quality-copilot.pages.dev/. LinkedIn Post Inspector can
fetch this hostname; it reported connection failures for the `workers.dev`
address during testing.

To update the Pages application after deploying the Worker:

```bash
PAGES_ASSETS=$(node scripts/prepare_pages.cjs)
npx wrangler pages deploy "$PAGES_ASSETS" --cwd "$PAGES_ASSETS" --project-name clearview-data-quality-copilot --branch main
```

The staging script uses Node.js 22.17 or newer and an existing `/tmp/opencode`
directory. It copies only `.assetsignore`'s public asset allowlist into a fresh
temporary directory and rewrites the static Open Graph URLs to the Pages
hostname. Never deploy the repository root as a Pages asset directory.

`src/pages-worker.js` becomes the Pages `_worker.js` entry point. Only `/api/*`
requests invoke it; these are forwarded to the existing Worker backend, retaining
its provider configuration, validation, and AI verification. This deployment does
not use `functions/api/ai/` or require duplicate provider secrets in Pages.
The page and preview image are served directly as public static assets.

Verify the staging boundary and API forwarding with `node --test scripts/verify_pages.cjs`.

Use the Pages URL when sharing on LinkedIn. As with localhost, its saved browser
projects are origin-specific; portable backups can transfer work between hosts.

## API boundaries

The browser calls same-origin `/api/ai/*` routes for configuration, interpretations, proposals, aggregate pattern explanations, and issue review assistance.

- `src/worker.js` is the configured Workers entry point.
- `src/ai.cjs` and `src/review-ai.cjs` share provider handling and request/result validation.
- `functions/api/ai/` contains additional Cloudflare Pages handlers; deploying this repository with Wrangler uses the Worker entry point.
- `GET /api/ai/status` reports configuration without making a provider health request.
- Request size, timeout, operation, column, evidence, and result validation remain server-side.
- The hourly rate limit is process/isolate-local, not a distributed quota.

Credentials must never appear in frontend assets, browser storage, or committed configuration.

## Browser-local storage

Projects and reusable rules use IndexedDB. Quality reports, decision logs, project backups, and rule exports are generated in the browser. These features require no D1, R2, KV, or account service.

Storage is origin-specific: localhost and the hosted URL have separate project libraries. Browser storage can be cleared; project backups provide portable retention. Uploading a project backup restores browser-side state rather than creating a server-side account or cloud project.

## Rollback

For a Cloudflare deployment rollback:

```bash
npx wrangler deployments list
npx wrangler rollback <version-id>
```

Alternatively, check out a known-good Git revision, verify it, and deploy it with `npx wrangler deploy --keep-vars`. Confirm that its Worker configuration still targets the intended application and hostname.

After a release or rollback, verify the affected flow on the permanent hosted URL.
