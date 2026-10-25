# Report — Summarize and Hand Off the Review

## Page objective

Give the analyst a truthful summary of the current working dataset and a practical handoff of both the data and the decisions behind it.

The page should answer **“What is the current result, what remains open, and which artifacts explain this review?”**

## Analyst goals

- Understand how much data remains and how much was reviewed or changed.
- Recognize unresolved findings without confusing them with completed decisions.
- Choose whether exported data should identify filled values and their methods.
- Download the working dataset and a shareable review record.

## Features and objectives

### P01. Current review summary

- Show working rows and columns, reviewed findings, modified cells, affected rows, and remaining blank cells.
- Show the active approved decision count and open findings.
- Report removed source rows separately when relevant.
- Reflect the current working state after approvals, structural changes, and Undo.
- Avoid implying that closing a finding means its source value was necessarily corrected.

### P02. Working CSV export

- Provide one clear primary action to export the current working dataset.
- Use the approved working state rather than reapplying unapproved drafts or AI suggestions.
- Include approved row/column transformations where relevant.
- Preserve CSV structure for quoted values, separators, and multiline content.
- Allow a handoff while findings remain open, with those concerns still visible in the review summary and report.

### P03. Fill-provenance options

- Let the analyst choose whether the CSV includes imputation/fill flags.
- Offer method columns when the analyst needs more detailed provenance.
- Present these as optional CSV settings rather than a competing primary task.
- Summarize the current options while their disclosure is closed.
- Follow active approved fills and update provenance after Undo or overlapping changes.
- Avoid generated field names colliding with the dataset's own headers.

### P04. Shareable quality report

- Offer a self-contained HTML quality report suitable for reading and browser printing.
- Offer a structured JSON equivalent.
- Include dataset identity, generation time, current counts, source/working completeness, findings, unresolved concerns, active decisions, and relevant definitions.
- Include source/working validity and consistency information where available.
- Keep an accepted finding distinguishable from an actually modified value.
- Explain the population used for counts so row removal is not mistaken for filling missing cells.

### P05. Decision-log export

- Offer JSON and CSV decision logs.
- Retain approval and rollback events with their timestamps, reviewed scope, treatment, rationale, and optional analyst note.
- Include value changes and record removals/restorations as appropriate.
- Record actual Undo effects rather than assuming every reversal simply restores the original patch in isolation.
- Keep the cumulative event log distinct from the active decision list on Decisions.

### P06. Artifact identity and consistency

- Give downloads meaningful names tied to the dataset and artifact type.
- Keep data, report, and log exports consistent with the same current review session.
- Preserve source values, names, and notes safely in exported representations.
- Ensure opening export settings or downloading an artifact does not mutate the working dataset.

### P07. Clear handoff boundaries

- Treat exported reports as analyst review records.
- Preserve unresolved findings and contextual caveats instead of presenting a certificate of universal correctness.
- Make retained-source implications understandable for sensitive-data transformations.
- Keep portable project backup creation on Dataset so it is distinct from exporting reviewed output.

## Primary user flow

1. Open Report after reviewing the dataset, or when an interim handoff is needed.
2. Read the current counts and remaining open findings.
3. Inspect or change CSV provenance options if relevant.
4. Download the working CSV.
5. Download the quality report or decision log needed to explain the work.
6. Return to Review for unresolved concerns or to Dataset to save a reusable project backup.

## Acceptance criteria

- [ ] Report counts match the current working state and active decisions.
- [ ] Modified cells, reviewed findings, blank cells, and removed rows remain distinct measures.
- [ ] The CSV includes approved work and excludes unapproved previews.
- [ ] Provenance settings have visible, accurate status and affect the exported data as selected.
- [ ] Undo removes or updates fill provenance consistently with the remaining approved work.
- [ ] HTML/JSON reports retain unresolved concerns and meaningful source comparisons.
- [ ] CSV/JSON logs include approval and actual rollback events.
- [ ] Exporting or inspecting options leaves the working dataset unchanged.
- [ ] The page presents a clear primary CSV action with report/log downloads as supporting actions.

## Connections

- [Dataset](Dataset.md) owns import, definitions, saved projects, and portable project backups.
- [Review](Review.md) owns the scope and approval of the changes represented here.
- [Decisions](Decisions.md) owns active history and Undo.
- [Explore](Explore.md) provides record-level inspection of the working data being exported.
