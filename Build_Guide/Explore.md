# Explore — Inspect Records in Context

## Page objective

Provide a dataset-wide spreadsheet where an analyst can find questionable values, understand the surrounding record, and enter the relevant Review finding.

The page should answer **“Where is this issue in the data, and what does the record tell me about it?”**

This page is distinct from the Explore tab inside Review, which concentrates on evidence for one finding.

## Analyst goals

- Browse the current working records and their column meanings.
- Find values without losing their row context.
- Focus on records with unresolved findings.
- Understand multiple concerns associated with one record.
- Open a guided treatment review from the relevant evidence.

## Features and objectives

### E01. Working-data spreadsheet

- Present the working dataset as a readable table with original record identifiers.
- Show column names and their interpreted types.
- Keep the table usable when the dataset has many rows or columns.
- Reflect approved changes and Undo in the values and findings shown.
- Make browsing an inspection activity; selecting a cell must not apply a treatment.

### E02. Search and flagged-record filtering

- Search values across the available columns.
- Allow the analyst to restrict the view to records with open findings.
- Show how many records match the active view relative to the working dataset.
- Keep filtering separate from deletion or treatment scope.
- Preserve original record identity when the displayed population changes.

### E03. Finding highlights and legend

- Identify affected cells through consistent finding categories, icons, and labels.
- Distinguish missing values, potential outliers, inconsistent categories, format concerns, cross-column conflicts, duplicate records, and rule violations.
- Represent unusual values as findings to investigate rather than confirmed errors.
- Use textual explanations and recognizable markers alongside color.

### E04. Issue rail and off-screen findings

- Provide record-aligned markers alongside the spreadsheet.
- Keep markers aligned with the currently visible records while the table scrolls.
- Summarize off-screen findings by type at the upper and lower edges of the visible region.
- Let an edge marker bring the relevant record into view and open its inspection context.
- Distinguish the selected marker from other findings.

### E05. Cell and record inspection

- Open an evidence panel when the analyst selects a highlighted cell or finding marker.
- Identify the record, column, finding type, and available priority information.
- Show the value and the relevant reason, rule, pattern, bounds, comparison, or duplicate-group evidence.
- Explain the current observation meaning when it affects interpretation.
- Use masked examples in sensitive-finding inspection summaries.

### E06. Multiple findings on a record

- Expose the finding categories associated with the selected record.
- Allow movement between concerns without losing the record-level context.
- Distinguish multiple affected columns within the same category.
- Keep the selected evidence connected to the finding that will open in Review.

### E07. Handoff to Review

- Give the selected finding a clear action that opens its guided Review context.
- Carry the issue and affected column forward rather than opening an unrelated default concern.
- Let Review establish the intended treatment scope; spreadsheet visibility alone must not determine which records are changed.

### E08. Keyboard and narrow-screen inspection

- Make highlighted cells and finding markers operable with the keyboard.
- Provide clear focus and selection feedback.
- Keep column headings, row identifiers, and inspection evidence legible.
- Use local scrolling for wide data rather than compressing every column into a narrow viewport.
- Keep inspection controls reachable without covering the information they describe.

## Primary user flow

1. Open Explore with a loaded dataset.
2. Search for a value or show only flagged records if useful.
3. Select a highlighted cell or rail marker.
4. Inspect the record's evidence and any additional findings.
5. Open the relevant finding in Review.

## Acceptance criteria

- [ ] Searching or filtering never removes records from the working dataset.
- [ ] Findings remain associated with the correct source record and column.
- [ ] Rail markers follow table scrolling and explain off-screen counts.
- [ ] Selecting a finding opens the corresponding evidence panel.
- [ ] Multiple concerns on one record remain individually reachable.
- [ ] Keyboard activation supports the same inspection path as a pointer.
- [ ] The Review action opens the selected issue rather than expanding treatment scope implicitly.
- [ ] Approved changes and Undo update the visible working data and finding markers.

## Connections

- [Dataset](Dataset.md) owns import, definitions, and dataset-wide profiles.
- [Review](Review.md) owns decisions about the highlighted evidence.
- [Decisions](Decisions.md) explains the approved changes already reflected in this spreadsheet.
