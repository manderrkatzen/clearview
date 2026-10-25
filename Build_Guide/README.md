# Clearview — Product Build Guide

## Product objective

Build a data-quality workspace that helps an analyst investigate questionable records, understand the consequences of a correction, and retain an explainable, reversible decision.

The experience should make five things clear:

1. What data is being reviewed.
2. What evidence supports a finding.
3. Which records a proposed treatment affects.
4. What changes if that treatment is approved.
5. How to inspect, explain, export, or undo the decision afterward.

This guide expresses the objectives and acceptance criteria of the implemented Clearview experience as a page-by-page product reference. It describes behavior and feature ownership rather than prescribing code or a particular implementation technique.

## Page briefs

| Page | Primary question | Product brief |
| --- | --- | --- |
| Dataset | What does this dataset contain, and how should it be interpreted? | [Dataset.md](Dataset.md) |
| Explore | Where are the questionable values, and what is their record-level context? | [Explore.md](Explore.md) |
| Review | What should happen to this finding, and what would that change? | [Review.md](Review.md) |
| Decisions | What has been approved, why, and can it be undone? | [Decisions.md](Decisions.md) |
| Report | What is the resulting dataset, what remains unresolved, and what can be handed off? | [Report.md](Report.md) |

**Navigation:** Dataset → Explore → Review → Decisions → Report.

These are connected workspaces, not a mandatory wizard. An analyst should be able to revisit evidence and recorded work as the investigation develops.

The **Explore page** is the dataset-wide spreadsheet. The **Explore tab inside Review** concerns one selected finding. Review's other tabs are **Fix** and **Review**; their behavior belongs to the [Review brief](Review.md).

## Feature ownership

| Capability | Primary owner | Connected experience |
| --- | --- | --- |
| CSV import and public samples | Dataset | Supplies all later pages |
| Column profiles and working distributions | Dataset | Findings open in Review |
| Column meaning, parsing, and missing-value definitions | Dataset | Used by checks, evidence, and treatments |
| Schema, relationship, metric, and duplicate-key definitions | Dataset | Findings are investigated in Explore and Review |
| Business KPI definitions and suggested checks | Dataset | Retained with project/rule context |
| Project saving, backups, restore, and rule libraries | Dataset | Preserves the connected workspace |
| Spreadsheet search, finding highlights, and issue rail | Explore | Opens the relevant Review finding |
| Cell inspection and multiple findings on a record | Explore | Connects source context to treatment review |
| Finding navigation and evidence selection | Review | Uses the current working dataset |
| Treatment methods, parameters, scope, and previews | Review | Approved results appear in Decisions and Report |
| Contextual AI assessments and treatment suggestions | Review | Informed by Dataset definitions; never applies changes autonomously |
| Original-data inspection pane | Review and Decisions | Shared read-only access to the preserved source |
| Approved decision history, notes, and Undo | Decisions | Also accessible from the selected finding's Review tab |
| Current quality summary and unresolved findings | Report | Reflects active decisions and the working dataset |
| CSV provenance options and downloadable artifacts | Report | Uses recorded changes and review history |

## Shared product principles

### Analyst control

- Treat a finding as something to investigate, not proof that a value is wrong.
- Keep retaining a legitimate value or leaving an issue unresolved available where appropriate.
- Distinguish detecting an issue, selecting evidence, previewing a treatment, and approving a change.
- Applying a rule definition should run checks; applying a treatment should require a separate decision.
- AI should provide bounded assistance and validated suggestions. It should never silently change the dataset.

### Source preservation and reversibility

- Preserve the imported source and the identity of original records.
- Distinguish the original, current working, and proposed states.
- Record actual changes, affected scope, optional rationale, and structural effects.
- Undo should retain later approved work rather than indiscriminately resetting the dataset.
- An unchanged acceptance should remain a meaningful decision without being counted as modified data.

### A coherent working environment

- Keep navigation, branding, and the application header consistent between pages.
- Make the active dataset, selected finding, and relevant state understandable.
- Preserve work when opening inspection tools or reading additional detail.
- Support desktop analysis and usable narrow-screen layouts.
- Keep large tables and evidence lists manageable without shrinking text into illegibility.
- Provide keyboard-operable controls and clear focus behavior.

### Evidence-first communication

- Lead with the information the analyst needs for the next decision.
- Use concise headings and factual labels instead of narrating the workflow.
- Present a single clear primary action within each task region.
- Keep advanced methods, full metadata, and optional assistance discoverable without overwhelming the default view.
- Preserve important consequences and exceptions when simplifying the presentation.
- Display source values, column names, and analyst notes faithfully.

### Storage, AI, and handoff boundaries

- Saved projects belong to the current browser and site origin; saving is explicit.
- Portable backups should support moving a review between environments.
- AI operations may share bounded, request-specific context with the configured provider. Relevant row-field sharing should be explicit.
- Sensitive-data treatment review should remain local and use masked examples.
- Retained source snapshots and project backups can still contain original sensitive values after a working column is transformed.
- Report counts should describe actual findings, decisions, modifications, and removals without implying that all reviewed data has been corrected.

## Completion standard

The connected experience is complete when an analyst can:

1. Import a CSV and understand its profile.
2. Find a questionable value in its record-level context.
3. Review its meaning and define the intended treatment scope.
4. Inspect a treatment's consequences before approving it.
5. Inspect the recorded result and Undo it without losing unrelated later work.
6. Save the review or hand off the working dataset and its decision record.

Each page brief expands these objectives into its own features, user flow, and acceptance criteria.
