# Decisions — Inspect and Reconsider Approved Work

## Page objective

Provide an understandable record of the decisions currently shaping the working dataset and a reliable way to undo a decision.

The page should answer **“What was approved, what changed, why, and what happens if I reverse it?”**

## Analyst goals

- Distinguish approved work from unresolved findings.
- Understand the source and result of a treatment.
- Revisit the rationale and scope of a decision.
- Compare recorded work with the original data.
- Reverse a decision without losing unrelated later approvals.

## Features and objectives

### H01. Active decision history

- List the active approved decisions affecting the current workspace.
- Show the approved decision count.
- Identify the relevant column, treatment, and recorded time.
- Distinguish a treatment that changed the working data from an acceptance that retained the source.
- Keep a long decision history readable through a bounded local scroll region.

### H02. Actual change summary

- Show how many cells changed and how many rows were removed where applicable.
- Present meaningful before/after examples.
- Retain the distinction between records reviewed, values modified, rows removed, and structural effects.
- Avoid treating an unchanged acceptance as a modified-value count.

### H03. Rationale and supporting detail

- Show an analyst-authored note when present.
- Keep the treatment reason, reviewed scope, interpretation, and applicable conditions available under Decision details.
- Preserve applicable fill/provenance information with the recorded work.
- Display notes literally and safely, including unusual punctuation or text resembling an empty-state message.
- Omit an absent optional note rather than displaying filler.

### H04. Original-data inspection

- Provide the same read-only original-data pane available in Review.
- Make the preserved source and its filename/population understandable.
- Allow independent scrolling and additional row loading.
- Keep the global navigation clear while the working region behind the pane is dimmed or blurred.
- Preserve the mounted history and its scroll position when the pane opens and closes.
- Support pointer, touch, keyboard, Close, Escape, and backdrop dismissal as appropriate.

### H05. Deliberate Undo

- Give each active decision an Undo action.
- Explain the scope of the reversal and allow cancellation before proceeding from the history page.
- Remove the selected decision's effects while retaining later approved decisions.
- Refresh the working data, relevant findings, counts, and downstream views afterward.
- Handle both ordinary value changes and supported row/column transformations.
- Preserve original record identity and restore removed data in the appropriate context.

### H06. Reconsidering accepted-unchanged findings

- Treat accepting a value as legitimate as a recorded decision.
- Allow that decision to be undone so the finding can be reviewed again.
- Do not imply that undoing an unchanged acceptance modifies source values.

### H07. Active history versus the exported event log

- Use this page to show the active decisions that currently shape the workspace.
- Preserve approval and rollback events for the decision-log exports on Report.
- Record the actual effects of Undo, especially where later overlapping decisions alter the resulting reversal.
- Do not equate removing a decision from the active list with erasing its recorded event history.

### H08. Empty history

- Explain when there are no active approved decisions.
- Provide a direct route back to reviewing findings.
- Avoid inventing a completed result when no decision has been recorded.

## Primary user flow

1. Open Decisions after one or more reviews.
2. Inspect the relevant decision and its before/after evidence.
3. Read the note or expand Decision details if needed.
4. Optionally compare the work with the original-data pane.
5. Keep the decision or choose Undo and confirm the reversal.
6. Continue reviewing the refreshed dataset or export its records from Report.

## Acceptance criteria

- [ ] Active history reflects actual recorded approvals.
- [ ] Accepted-unchanged decisions and applied changes are distinguishable.
- [ ] Notes, reasons, timestamps, and scope remain attached to the correct decision.
- [ ] Original-data inspection does not reset or replace the history view.
- [ ] Undo can be cancelled from the history confirmation.
- [ ] Undo retains later approved work, including overlapping value changes where supported.
- [ ] Findings and dataset counts refresh after the reversal.
- [ ] The exported event log retains the approval and actual rollback effects.
- [ ] A long history remains navigable with keyboard and local scrolling.

## Connections

- [Review](Review.md) creates approved decisions and offers issue-specific recorded outcomes.
- [Dataset](Dataset.md) saves the connected project and restores its history.
- [Explore](Explore.md) reflects the working values resulting from active decisions.
- [Report](Report.md) exports the current dataset, reports, and cumulative decision events.
