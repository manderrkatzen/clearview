// Regenerate the static social preview with the external Playwright installation.
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "/tmp/opencode/node_modules/playwright");

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 627 }, deviceScaleFactor: 1 });
    await page.setContent(`<!doctype html><html lang="en"><meta charset="utf-8"><style>
      *{box-sizing:border-box}body{margin:0;width:1200px;height:627px;background:#102c50;color:#fff;font-family:Arial,sans-serif;padding:64px 72px}
      .brand{font-size:30px;font-weight:700;display:flex;align-items:center;gap:14px}.mark{color:#9dbfff;font-size:36px}
      .eyebrow{margin:46px 0 18px;color:#a9c7f4;font-size:16px;letter-spacing:3px;font-weight:700}
      h1{font-size:62px;line-height:1.08;letter-spacing:-2px;margin:0;max-width:1000px}h1 span{color:#a9d7c3}
      p{font-size:23px;line-height:1.5;color:#d5e1f1;max-width:930px;margin:25px 0 30px}
      .flow{display:flex;align-items:center;gap:18px;font-size:17px;color:#d5e1f1}.step{padding:12px 20px;border:1px solid #56708f;border-radius:7px}.approved{background:#d6eee1;color:#143d2b;border-color:#d6eee1}.arrow{color:#9dbfff}
    </style><body><div class="brand"><span class="mark">▦</span> ClearData</div>
      <div class="eyebrow">YOUR DATA. YOUR DECISIONS.</div>
      <h1>AI-assisted data cleaning.<br><span>Human approved.</span></h1>
      <p>Upload a messy spreadsheet. AI reviews each issue with a confidence score; you choose, preview and approve every fix.</p>
      <div class="flow"><span class="step">Upload</span><span class="arrow">→</span><span class="step">Review</span><span class="arrow">→</span><span class="step">Preview</span><span class="arrow">→</span><span class="step approved">✓ Approve</span></div>
    </body></html>`);
    await page.screenshot({ path: path.resolve(__dirname, "../og-image.png"), type: "png" });
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
