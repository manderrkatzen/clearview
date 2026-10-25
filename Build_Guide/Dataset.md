# Dataset — Establish the Data and Its Meaning

## Page objective

Give the analyst a reliable starting point: load the data, understand its structure and current quality, establish its business meaning, and manage the review project.

The page should answer **“What am I working with, what needs attention, and which definitions should guide the review?”**

## Analyst goals

- Bring a CSV into the workspace or resume previous work.
- Understand the dataset's size, completeness, column types, and value distributions.
- Identify the columns that warrant investigation.
- Define the meaning and business expectations of the data.
- Save the review and reuse relevant definitions.

## Features and objectives

### D01. CSV import and source identity

- Accept a local CSV and make its filename and dataset identity visible.
- Preserve an original snapshot alongside the working dataset.
- Handle valid quoted fields, embedded separators, and multiline values.
- Explain an invalid import without replacing an already loaded, valid workspace.
- Allow a different CSV to replace the active dataset as a deliberate new source selection.

### D02. Public sample datasets

- Offer healthcare, sales, and marketing samples so the project can be explored without preparing a file.
- Give each sample a useful domain label and short description.
- Treat a sample as a normal dataset with the same review, approval, history, and export behavior.
- Keep developer/debugging fixtures out of the public sample chooser.

### D03. Dataset overview

- Summarize working row count, column count, blank cells, and reviewed findings.
- Distinguish approved decisions from actual changed values.
- Show the extent of open findings and the number of affected rows/columns.
- Provide a direct route to Review and access to the spreadsheet through Explore.
- Keep definitions of these counts available without repeating explanatory paragraphs beneath every metric.

### D04. Column profile

- Describe each column's type, completeness, distinct nonblank values, and numerical range where applicable.
- Distinguish inferred types from analyst-declared definitions.
- Associate findings with their affected columns.
- Allow a column's finding to open directly in Review.
- Keep a wide profile readable through local table scrolling.

### D05. Working distribution

- Let the analyst choose a column and inspect its current distribution.
- Compare original and working observations where meaningful.
- Support numerical distributions and category-oriented summaries as appropriate to the column.
- Refresh the view after approved treatments or Undo.

### D06. Dataset purpose and column definitions

- Let the analyst describe what the dataset measures.
- Support an explicit analytical role such as identifier, number, integer, category, text, date, or boolean.
- Capture relevant meaning and units.
- Support declared missing tokens, numerical parsing conventions, percentage interpretation, decimal precision, and date interpretation.
- Treat identifiers as identifiers rather than automatically applying measurement-oriented reasoning to them.
- Change the interpretation and checks when definitions change; do not silently rewrite stored source values.

### D07. Schema and validity expectations

- Let the analyst define expected types, required values, permitted categories, and numerical bounds.
- Use these definitions to identify records that need review.
- Preserve the distinction between a rule violation and a confirmed source error.
- Provide a route to inspect the resulting findings before choosing a correction.

### D08. Business relationships and metric checks

- Support comparisons between related fields and conditional requirements.
- Support configured checks such as revenue against quantity and unit price, or profit against revenue and cost.
- Make tolerance and interpretation choices explicit.
- Surface missing inputs or unusable denominators as review concerns.
- Keep accepting a definition separate from approving a recalculated value.

### D09. Duplicate definitions

- Support identifying exact duplicate records and repeated business keys.
- Allow the analyst to choose the fields that define a business key.
- Avoid treating blank key values as a valid shared identity.
- Let Review handle the comparison, survivor choice, merging, or decision to retain legitimate repeats.

### D10. Business KPI definitions and review metric

- Let the analyst define named business metrics using supported aggregations and grouping fields.
- Support reviewing suggested KPI definitions when the columns make them relevant.
- Retain these definitions as part of the project's business context.
- Let the analyst choose the primary metric used to contextualize Review, including a row-count perspective.
- Name a displayed column sum accurately rather than presenting it as a business measure that has not been defined.

### D11. Suggested checks and quality scorecards

- Offer candidate business checks based on the dataset.
- Present their supporting pass-rate evidence so the analyst can decide whether the definition is appropriate.
- Require deliberate acceptance before a suggested definition becomes active.
- Show per-column validity and consistency information where available.
- Represent the absence of applicable rules honestly rather than presenting an unsupported quality score.

### D12. Manual correction entry point

- Let the analyst choose a column and original record identifiers for a manual review.
- Open the correction in Review with an explicit scope.
- Route manual replacements through the same preview and approval discipline as detected findings.

### D13. Project saving and restoration

- Support explicitly saving the current workspace under a project name in the current browser.
- Reopen a saved project with its original/working data, definitions, decisions, and supported review preferences.
- Offer a portable project backup and a way to import it.
- Validate imported project content before replacing the active workspace.
- Make unsaved status, browser-local storage, and the effect of opening another project understandable.
- Allow a saved local copy to be deleted without implying that an external backup has also been deleted.

### D14. Reusable rule library

- Save named sets of review definitions.
- Support importing, exporting, applying, and deleting reusable rule sets.
- Check that referenced columns and definitions are compatible with the active dataset.
- Apply definitions and rerun checks without automatically executing treatments.

### D15. AI analysis context and refresh

- Allow supported background interpretation to begin after import.
- Use the dataset's purpose and definitions to contextualize assistance.
- Let the analyst refresh interpretation when that context changes.
- Keep local profiling, definitions, and manual review usable when AI is unavailable.

## Primary user flow

1. Import a CSV, choose a public sample, or open a saved project.
2. Read the overview and inspect the relevant column profiles.
3. Establish any important column meanings or business checks.
4. Open a finding in Review or inspect records in Explore.
5. Return to save the project, inspect the working distribution, or refine definitions.

## Acceptance criteria

- [ ] An invalid import leaves the previous valid workspace intact.
- [ ] The source filename and original/working distinction remain understandable.
- [ ] The public chooser offers the three domain samples and excludes debugging fixtures.
- [ ] Profile findings open the appropriate Review context.
- [ ] Editing definitions identifies new review work without silently treating records.
- [ ] Legitimate zeros and identifiers are not automatically treated as missing measurements.
- [ ] Saved projects and portable backups preserve meaningful review state.
- [ ] An incompatible project or rule import is rejected before active work is replaced.
- [ ] The page remains usable without an AI provider.

## Connections

- [Explore](Explore.md) owns record-level browsing and cell inspection.
- [Review](Review.md) owns treatment selection, previews, and approval.
- [Decisions](Decisions.md) owns the active decision history and Undo.
- [Report](Report.md) owns the final dataset and review-artifact handoff.
