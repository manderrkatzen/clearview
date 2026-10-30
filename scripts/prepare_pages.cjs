// Stage only the public asset allowlist; never deploy the repository root to Pages.
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const origin = "https://clearview-data-quality-copilot.pages.dev";
const workerOrigin = "https://clearview-data-quality-copilot.ritwikranjanpandey.workers.dev";
const patterns = fs.readFileSync(path.join(root, ".assetsignore"), "utf8").split(/\r?\n/).map(line => line.trim()).filter(line => line.startsWith("!")).map(line => line.slice(1));
const output = fs.mkdtempSync("/tmp/opencode/clearview-pages-");
for (const relative of fs.globSync(patterns, { cwd: root })) {
  const source = path.join(root, relative);
  if (!fs.statSync(source).isFile()) continue;
  const destination = path.join(output, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}
const htmlPath = path.join(output, "index.html");
fs.writeFileSync(htmlPath, fs.readFileSync(htmlPath, "utf8").replaceAll(workerOrigin, origin));
fs.copyFileSync(path.join(root, "src/pages-worker.js"), path.join(output, "_worker.js"));
fs.writeFileSync(path.join(output, "_routes.json"), JSON.stringify({ version: 1, include: ["/api/*"], exclude: [] }, null, 2) + "\n");
fs.writeFileSync(path.join(output, "robots.txt"), "User-agent: *\nAllow: /\n");
console.log(output);
