const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

test("Pages static requests retain the exact asset response without contacting the AI backend", async () => {
  const { default: worker } = await import("../src/pages-worker.js");
  const originalFetch = global.fetch;
  global.fetch = () => { throw new Error("Static requests must not contact the backend."); };
  try {
    const response = new Response("static preview", { status: 200, headers: { "content-type": "text/html" } });
    const request = new Request("https://clearview-data-quality-copilot.pages.dev/");
    const result = await worker.fetch(request, { ASSETS: { fetch: forwarded => { assert.equal(forwarded, request); return response; } } });
    assert.equal(result, response);
  } finally { global.fetch = originalFetch; }
});

test("Pages forwards AI requests to the fixed backend with their exact body and response", async () => {
  const { default: worker } = await import("../src/pages-worker.js");
  const originalFetch = global.fetch;
  const body = JSON.stringify({ mode: "fix", turnstileToken: "verification-token", context: { column: "delivery_days" } });
  const response = new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { "retry-after": "60" } });
  let calls = 0;
  global.fetch = async (request, options) => {
    calls++;
    assert.equal(request.url, "https://clearview-data-quality-copilot.ritwikranjanpandey.workers.dev/api/ai/review?example=1");
    assert.equal(request.method, "POST");
    assert.equal(request.headers.get("content-type"), "application/json");
    assert.equal(request.headers.get("host"), null);
    assert.equal(await request.text(), body);
    assert.equal(options.redirect, "manual");
    return response;
  };
  try {
    const request = new Request("https://clearview-data-quality-copilot.pages.dev/api/ai/review?example=1", { method: "POST", headers: { "content-type": "application/json", host: "clearview-data-quality-copilot.pages.dev" }, body });
    const result = await worker.fetch(request, { ASSETS: { fetch: () => { throw new Error("AI requests must not use the static fallback."); } } });
    assert.equal(calls, 1);
    assert.equal(result, response);
    assert.equal(result.status, 429);
    assert.equal(result.headers.get("retry-after"), "60");
  } finally { global.fetch = originalFetch; }
});

test("Pages staging includes the current public assets and static metadata without repository or provider files", () => {
  const root = path.resolve(__dirname, "..");
  const output = execFileSync(process.execPath, [path.join(__dirname, "prepare_pages.cjs")], { encoding: "utf8" }).trim();
  assert.ok(output.startsWith("/tmp/opencode/clearview-pages-"));
  try {
    const files = fs.globSync("**/*", { cwd: output }).filter(file => fs.statSync(path.join(output, file)).isFile());
    for (const file of files) {
      assert.ok(!/^(?:src|scripts|functions|\.git)\//.test(file));
      assert.ok(!/\.md$|\.env|\.toml$|wrangler|server\.js/.test(file));
      if (!["index.html", "_worker.js", "_routes.json", "robots.txt"].includes(file)) assert.deepEqual(fs.readFileSync(path.join(output, file)), fs.readFileSync(path.join(root, file)), `${file} matches the current app`);
    }
    for (const file of ["app.js", "review-core.js", "issues/missing.js", "fonts/source-sans-3-latin.woff2", "og-image.png", "_worker.js"]) assert.ok(files.includes(file), `${file} is deployed`);
    const html = fs.readFileSync(path.join(output, "index.html"), "utf8"), head = html.split("</head>")[0];
    assert.ok(head.includes('property="og:image" content="https://clearview-data-quality-copilot.pages.dev/og-image.png?v=clearview"'));
    assert.ok(head.includes('property="og:url" content="https://clearview-data-quality-copilot.pages.dev/"'));
    assert.equal((head.match(/property="og:/g) || []).length, 5);
    assert.ok(!head.includes("workers.dev"));
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(output, "_routes.json"), "utf8")), { version: 1, include: ["/api/*"], exclude: [] });
  } finally { fs.rmSync(output, { recursive: true }); }
});
