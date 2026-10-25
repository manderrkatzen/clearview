# Review — Investigate, Preview, and Approve

## Page objective

Help an analyst turn a finding into an explicit, evidence-based decision while keeping the original source and the consequences of the proposed treatment visible.

The page should answer **“What does this finding mean, which records should be treated, and what happens if I approve this choice?”**

## Working model

Review has a finding list and one active task area with three tabs:

| Tab | Objective | Primary result |
| --- | --- | --- |
| Explore | Inspect the finding, refine relevant definitions, and select evidence. | An explicit reviewed scope |
| Fix | Choose a treatment and inspect its consequences. | An exact, approval-ready preview |
| Review | Inspect the outcome of an approved decision. | Recorded evidence with access to Undo |

The tabs should be freely navigable when their prerequisites exist. Fix requires a relevant selected scope; Review requires a recorded decision. They should not behave as a forced sequence that prevents the analyst from revisiting evidence.

## Shared capabilities

### R01. Finding navigation and identity

- Organize findings by the affected column and issue family.
- Identify the selected column, finding type, affected population, and decision status.
- Keep open, applied, and accepted findings distinguishable.
- Support moving between findings while preserving supported issue-specific choices.
- Keep the global application navigation and branding stable.

### R02. Contextual evidence and scope

- Show source representations, counts, shares, relevant examples, and applicable rules.
- Allow evidence selection through values, records, patterns, or groups as appropriate to the finding.
- Keep the intended scope explicit as the analyst moves to Fix.
- Support a narrower treatment subset where available without expanding beyond the reviewed population.
- Distinguish browsing a group from selecting that group for treatment.

### R03. Shared grouped-row browser

- Use a consistent inspection pattern for categories, duplicate groups, label variants, quantiles, and numerical ranges.
- Show group names and row counts.
- Keep row comparisons locally scrollable and load long populations progressively.
- Retain the active group and supported scroll preferences during ordinary browsing.
- Support keyboard navigation between groups.
- Avoid rebuilding unrelated controls when the analyst changes the inspected group.

### R04. Treatment selection

- Present common treatments as compact, understandable choices.
- Expand parameters and the effect of the selected treatment.
- Keep additional methods discoverable under Other treatments.
- Distinguish treatment methods, scope/metric settings, and optional AI assistance.
- Explain unavailable methods and provide the relevant configuration route where possible.
- Keep retaining legitimate data available where the issue permits it.

### R05. Consequences and exact previews

- Show the expected result before approval.
- Name the treatment's risk, including estimation, removal, structural change, or preservation.
- Use the appropriate numerical comparison, changed-label view, source examples, or structural summary.
- Keep full impact figures and relevant metric context available through additional detail.
- Distinguish a selected column sum from a business measure that has not been explicitly defined.
- Expose blocked records, incompatible values, and configured-rule consequences.
- Preserve the preview while the analyst merely opens a disclosure or inspects evidence.

### R06. Approval and exception handling

- Require an explicit Apply action for changes.
- Apply the reviewed method, parameters, and scope only while the preview remains current.
- Invalidate approval when the source context or treatment definition changes.
- Explain why approval is blocked rather than presenting an unexplained disabled action.
- Require an explicit choice before applying only the usable subset of a partially blocked population.
- Require applicable acknowledgements for conflicts or new rule violations.
- Support notes and require them for decisions whose meaning needs an explicit rationale.

### R07. Recorded outcomes

- Display the actual approved result rather than recomputing an imagined alternative.
- Show meaningful before/after metrics and changed examples.
- Retain the selected method, timestamp, optional note, and applicable AI-rule context.
- Confirm accepted-unchanged decisions without inventing modified values.
- Make Next issue the forward action and provide Undo decision.
- Keep method metadata and absent optional content from competing with the evidence.

### R08. Original-data inspection

- Make Peek at original data available across Explore, Fix, and Review.
- Open a separate read-only pane showing the preserved source, filename, and population information.
- Allow independent worksheet scrolling, sticky identifiers/headings, and additional row loading.
- Dim or blur the working region behind the pane while keeping the main navigation clear.
- Preserve the underlying draft, selection, preview, and scroll position.
- Support explicit opening and dismissal through Close, Escape, and the backdrop.
- Prevent unintended keyboard actions on obscured work.

The source pane is intentionally an inspection of original data. Masked treatment examples elsewhere do not imply that this preserved source has been erased or anonymized.

### R09. AI assistance

- Offer interpretation or treatment suggestions only for supported issue types.
- Use bounded evidence and validate suggestions against the actual columns, values, and allowed actions.
- Keep source interpretation distinct from executing a correction.
- Make recommendation ranking language honest; a model-assessed score is not a calibrated probability.
- Retain local/manual review when a provider is unavailable, limited, or returns an unusable result.
- Ignore stale assistance when its dataset or evidence context has changed.
- Keep sensitive-data treatment review local.

### R10. Per-row AI fill rules

- Let the analyst describe a rule or preference for selected missing values where this method is supported.
- Identify and explicitly confirm which context fields may be shared.
- Limit the request to the relevant selected records and confirmed context.
- Present row-specific suggestions with reasons.
- Allow individual approval, rejection, another suggestion, and batch approval of pending suggestions.
- Include only approved suggestions in the treatment preview.
- Keep final Apply as the action that changes the working dataset.
- Retain the approved values and their evidence with the decision.

## Finding families and treatment objectives

### R11. Missing values and candidate representations

**Objective:** determine whether a representation really denotes missing information, then choose a justified treatment.

- Distinguish physical blanks from unconfirmed tokens such as `NULL`, `N/A`, or sentinel values.
- Require contextual selection before a nonblank token enters a physical fill scope.
- Keep legitimate zero and not-applicable meanings distinct.
- Compare missingness across relevant groups and inspect the underlying records.
- Support leaving values missing, a reviewed constant, overall mean/median, categorical mode, and group-based fills where appropriate.
- Support numerical similar-row estimates and ordered previous/next/interpolated fills when their required context exists.
- Provide per-row AI fill rules as a separate, explicitly reviewed method.
- Support record removal where appropriate, with its effect on the wider dataset made clear.
- Show group reference limitations, fallback evidence, or blocked cases instead of fabricating donors.

### R12. Potential outliers

**Objective:** decide whether an unusual observation is valid, a likely error, or a value requiring another treatment.

- Let the analyst inspect and adjust supported outlier rules and their bounds.
- Show a distribution with the flagged population distinguished from other values.
- Preserve a deliberate distinction between editing a rule and updating its results.
- Allow selected observations to be retained as legitimate.
- Support capping to reviewed bounds, a fixed cap, median replacement, marking missing, row removal, and an additional log-transformed column where appropriate.
- Offer reviewed AI assessments or proposed corrections when supported.
- Present before/after effects without implying that every extreme value is invalid.

### R13. Invalid values and declared-rule violations

**Objective:** review observations that fail an applicable validity definition.

- Show the actual rule and the records that violate it.
- Allow relevant range definitions to be refined before treatment.
- Distinguish a bad observation from an inappropriate rule.
- Support keeping the source, marking missing, clamping to a permitted range, valid-reference median replacement, row removal, and supported sign corrections.
- Make prerequisites and the effect of changing the rule explicit.

### R14. Exact duplicate records

**Objective:** inspect repeated records and choose which copies, if any, to remove.

- Show duplicate groups and their source comparisons.
- Select the groups included in the decision.
- Support first, last, most-complete, rule-based, and per-group survivor choices where available.
- Keep retaining all copies available as an explicit decision.
- Show resulting row counts and the effect of removing duplicate measures from totals.

### R15. Repeated identifiers and business keys

**Objective:** establish whether repeats are legitimate before treating them as an identity problem.

- Ask whether the values should be unique.
- Compare records sharing the repeated value and expose differences outside the key.
- Support accepting legitimate repeats, assigning distinct IDs, retaining selected survivors, rule-based/per-group choices, and supported complementary merges.
- Preserve every row when the chosen action is identifier reassignment.
- Require conflict acknowledgement when differing records are removed or merged.
- Do not silently resolve contradictory nonblank fields by inventing an authoritative value.

### R16. Date and number formatting

**Objective:** make representations consistent without concealing uncertainty about their meaning.

- Group source patterns and let the analyst choose the intended representation.
- Make month-first/day-first interpretation explicit for ambiguous dates.
- Support available date outputs and retaining a time component where relevant.
- Support numerical parsing conventions, including explicit percentage handling.
- Block unreadable or impossible conversions and explain the affected subset.
- Offer supported AI parsing as reviewed assistance rather than silent conversion.
- Support leaving the source representation or marking an unreadable value missing when appropriate.

### R17. Type mismatches

**Objective:** determine whether apparently numerical/date-like strings should be converted, retained as text, or treated as unreadable.

- Expose the source representations and the intended target type.
- Preview only the selected patterns and relevant records.
- Preserve records that cannot be read confidently as blocked or separately reviewed cases.
- Avoid turning unreadable text into a fabricated zero or other measurement.

### R18. Mixed scales

**Objective:** reconcile different magnitude conventions only after reviewing which scale matches the column's meaning.

- Show the relevant clusters and their relationship.
- Support matching a reviewed majority scale or using an explicit multiplier.
- Keep leaving the values unchanged available.
- Limit conversion to the reviewed population and expose the numerical effect before approval.

### R19. Inconsistent labels

**Objective:** standardize equivalent representations without merging genuinely different categories.

- Show related label groups, examples, and counts.
- Let the analyst review canonical labels and keep non-equivalent labels separate.
- Support reviewed mappings, case normalization, and trimming.
- Explain when a method changes a wider nonblank population than the selected examples.
- Offer optional synonym/interpretation assistance without automatically accepting semantic equivalence.
- Show the resulting category counts and affected source values.

### R20. Whitespace and hidden characters

**Objective:** resolve representation differences that interfere with matching or grouping.

- Reveal the affected character patterns and source examples.
- Support trimming, collapsing repeated spaces, removing hidden characters, repairing supported encoding artifacts, and combined cleaning.
- Show when differently represented names become identical.
- Allow keeping the source where a distinction is meaningful.

### R21. Cross-column conflicts

**Objective:** review disagreements between related fields and the rule used to compare them.

- Show the relevant relationship, tolerance, differences, and records that cannot be evaluated.
- Allow the analyst to concentrate on meaningful differences and reconsider an unsuitable rule.
- Support a configured recalculation, marking affected values missing, or retaining them where appropriate.
- Identify the field being changed and show its effect on reported totals.
- Offer bounded assistance about conflicting evidence where supported.

### R22. Empty and constant columns

**Objective:** determine whether a low-information column should be kept after inspecting its exceptions.

- Show the dominant value or missing population.
- Expose rare informative records before column removal.
- Support keeping the column or explicitly removing it.
- Identify relevant configured dependencies and the values that removal would lose.
- Preserve the ability to restore the column through Undo.

### R23. Leading zeros and identifier representation

**Objective:** review shortened codes without treating identifiers as ordinary measurements.

- Show observed code lengths and the intended target length.
- Preview padding for eligible digit-only values.
- Explain when mixed-character codes require source review.
- Support preserving characters while storing the column as text, keeping it unchanged, or approving leading-zero restoration.
- Keep the representation decision reversible.

### R24. Multiple values in one cell

**Objective:** choose how combined categories should be represented and counted.

- Let the analyst review the separator, distinct parts, examples, and resulting structure.
- Support one row per value, one column per position, yes/no indicator columns for a bounded set of distinct values, keeping the first part, or retaining the source.
- Show row and column changes before approval.
- Explain that splitting rows copies other fields and can duplicate measures in downstream totals.
- Distinguish preserving the source from discarding later parts.
- Retain the evidence needed to reverse the structural decision.

### R25. Sensitive information

**Objective:** let the analyst review sharing-oriented transformations with clear retention limits.

- Identify supported personal/financial representations locally.
- Use masked examples in treatment previews and affected-row inspection.
- Support masking, deterministic code replacement, column removal, or keeping the values with an explicit rationale.
- Explain the limits of the selected method, including recognizable fragments or guessable inputs where applicable.
- Keep original-source retention understandable.
- Keep this review path independent of AI requests.

### R26. Analyst-selected manual corrections

**Objective:** support corrections initiated from a known column and explicit source records even when automatic detection is not the starting point.

- Preserve the selected column and record scope supplied from Dataset.
- Support the applicable reviewed replacement or decision to retain the source.
- Apply the same preview, approval, note, history, and Undo expectations as other decisions.

## Primary user flow

1. Select a finding from the issue list or arrive from Dataset/Explore.
2. Inspect its evidence and establish the relevant scope in Explore.
3. Open Fix, choose a method, and set its parameters.
4. Read the effect, risk, preview, and any blocking conditions.
5. Approve the current preview or return to the evidence.
6. Inspect the recorded result, move to the next issue, or Undo the decision.

## Acceptance criteria

- [ ] Merely selecting evidence, browsing a group, or choosing a method does not apply a treatment.
- [ ] Fix and recorded Review have clear prerequisites without turning the tabs into a forced wizard.
- [ ] The selected scope is distinguishable from the total finding population.
- [ ] An altered source, scope, or parameter set cannot reuse an outdated approval preview.
- [ ] Blocked records require an explicit subset decision before partial application.
- [ ] Actual consequences, risks, and required acknowledgements remain reachable and understandable.
- [ ] Every supported family uses the common evidence/treatment/outcome structure.
- [ ] AI remains advisory, bounded, and recoverable when unavailable.
- [ ] Sensitive treatment examples remain masked and local.
- [ ] Opening original-data inspection preserves the underlying work.
- [ ] Approval creates a recorded decision; Undo restores its actual effects while preserving unrelated later work.
- [ ] Structural decisions accurately describe row/column changes and copied measures.

## Connections

- [Dataset](Dataset.md) owns definitions, project context, and manual-review entry points.
- [Explore](Explore.md) owns the dataset-wide spreadsheet and record-level inspection.
- [Decisions](Decisions.md) owns the active history and broader Undo workflow.
- [Report](Report.md) owns exported data and review records.
