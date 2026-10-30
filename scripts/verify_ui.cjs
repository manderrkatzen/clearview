// Current public UI regression entry point. Run with the local server already started.
const { spawnSync } = require("node:child_process");
const suites = [
  "verify_distilled_ui.cjs",
  "verify_shell_stability_ui.cjs",
  "verify_worksheet_peek_ui.cjs",
  "verify_distribution_ui.cjs",
  "verify_chart_clarity_ui.cjs",
  "verify_group_tabs_ui.cjs",
  "verify_feature_usage_ui.cjs",
  "verify_issue_usage_ui.cjs",
  "verify_async_stability_ui.cjs",
  "verify_audit_regressions_ui.cjs",
];
for (const suite of suites) {
  const result = spawnSync(process.execPath, [require.resolve(`./${suite}`)], { stdio: "inherit", env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
