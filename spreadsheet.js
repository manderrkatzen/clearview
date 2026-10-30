const sheetIssueTypes = {
  missing: { symbol: sheetSvgIcon("missing"), label: "Missing value", tab: "Missing" },
  outlier: { symbol: sheetSvgIcon("outlier"), label: "Potential outlier", tab: "Outlier" },
  category: { symbol: sheetSvgIcon("category"), label: "Inconsistent category", tab: "Category" },
  format: { symbol: sheetSvgIcon("format"), label: "Date/number format", tab: "Format" },
  conflict: { symbol: sheetSvgIcon("conflict"), label: "Cross-column conflict", tab: "Conflict" },
  duplicate: { symbol: sheetSvgIcon("duplicate"), label: "Duplicate record", tab: "Duplicate" },
  schema: { symbol: sheetSvgIcon("schema"), label: "Schema violation", tab: "Schema" },
};
function sheetSvgIcon(type) {
  const paths = {
    missing: '<circle cx="12" cy="12" r="8"/><path d="M8 12h8"/>',
    outlier: '<circle cx="6" cy="16" r="2"/><circle cx="11" cy="13" r="2"/><circle cx="18" cy="6" r="3"/>',
    category: '<path d="M5 8h14M5 16h14M15 4 9 20"/>',
    format: '<path d="M4 8h16m-4-4 4 4-4 4M20 16H4m4-4-4 4 4 4"/>',
    conflict: '<path d="m12 3 10 18H2zM12 9v5M12 17v1"/>',
    duplicate: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M15 8V4H4v11h4"/>',
    schema: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m7 9 2 2 3-4M14 9h3M7 16h10"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[type]}</svg>`;
}
function sheetIssueType(item) {
  if (item.reviewType) return ({missing:"missing",outlier:"outlier","duplicate-rows":"duplicate","duplicate-values":"duplicate","category-variants":"category",whitespace:"format",format:"format","type-mismatch":"format",scale:"format","leading-zeros":"format","multi-value":"format",invalid:"schema",constant:"schema",sensitive:"schema","cross-column":"conflict"})[item.reviewType] || "schema";
  if (item.recommendation === "candidate") return ["missing_token", "sentinel"].includes(item.candidate?.kind) ? "missing" : item.candidate?.kind === "category" || item.candidate?.kind === "spacing" ? "category" : "format";
  if (item.recommendation === "relation") return "schema";
  if (item.recommendation === "duplicates") return "duplicate";
  if (item.recommendation === "schema") return "schema";
  if (/missing/i.test(item.type)) return "missing";
  if (item.recommendation === "outlier") return "outlier";
  if (item.recommendation === "standardize") return "category";
  if (["date", "convert"].includes(item.recommendation)) return "format";
  return "conflict";
}
function sheetInspection(item, row) {
  const type = sheetIssueType(item), column = item.column;
  const raw = String(row[column] ?? "");
  const format = (value) => Number(value).toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: /_usd$/.test(column) ? 2 : 0, ...(/_usd$/.test(column) ? { style: "currency", currency: "USD" } : {}) });
  const evidence = [["Current value", raw.trim() ? raw : "Empty"]];
  let title, explanation, action = "Review treatments →";
  if (item.reviewType && item.reviewType !== "outlier") {
    title = `${column} · ${item.type}`; explanation = item.summary;
    if (item.reviewType === "missing") { explanation = "This representation needs contextual review. Only values explicitly locked in Explore can be filled; zero and null-like tokens are not automatically missing."; evidence.push(["Current observation meaning",observationState(row,column).replaceAll("_"," ")]); }
    if (type === "duplicate") { const profile = duplicateProfile(item.duplicateDefinition), group = profile.groups.find(group => group.rows.some(record => record._row === row._row)); evidence.push(["Compared columns",profile.columns?.join(", ") || ""],["Group row IDs",group?.rows.map(record => record._row).join(", ") || ""],["Comparison",group?.conflict ? "Other columns differ" : "Identical records"]); }
    if (item.range) evidence.push(["Valid range",`${item.range.min === "" ? "No minimum" : item.range.min} to ${item.range.max === "" ? "No maximum" : item.range.max}`]);
    if (item.rule) evidence.push(["Rule",item.rule.name || item.summary]);
    if (type === "format") evidence.push(["Representation",ReviewPageEngine.pattern(raw,Boolean(item.date))]);
    if (item.reviewType === "sensitive") { evidence[0][1] = ReviewPageEngine.mask(raw); explanation = "Potentially sensitive information. Review local masking, hashing, or column removal with a preview before applying."; }
    return {title,explanation,evidence,action};
  }
  if (item.recommendation === "candidate") {
    title = item.label;
    explanation = item.summary;
    evidence.push(["Candidate kind", item.candidate.kind.replaceAll("_", " ")], ["Matching records", item.rows.length.toLocaleString()]);
    action = "Interpret this candidate →";
  } else if (item.recommendation === "relation") {
    title = item.label; explanation = "This record violates an analyst-defined relationship. Review its meaning and choose a scoped correction.";
    evidence.push(["Rule evidence", relationProblem(row, item.rule)]);
  } else if (type === "missing") {
    title = `${column.replaceAll("_", " ")} is blank`;
    explanation = "This cell has no recorded value. A blank can be expected; unknown is different from zero or a confirmed category.";
    if (item.recommendation === "impute") {
      const stats = numericStats(numericValues(column));
      evidence.push(["Column median", format(stats.median)], ["Column mean", format(stats.mean)]);
    }
    evidence.push(["Missing across dataset", `${item.rows.length.toLocaleString()} of ${state.rows.length.toLocaleString()} rows`]);
  } else if (type === "duplicate") {
    title = "Record shares a duplicate signature or business key";
    explanation = "Repeated keys can be legitimate. Inspect the full group before removing a record; the proposed survivor is the earliest source record.";
    const profile = duplicateProfile();
    const group = profile.groups.find((entry) => entry.rows.some((entryRow) => entryRow._row === row._row));
    evidence.push(["Compared columns", profile.columns.join(", ")], ["Group row IDs", group?.rows.map((entry) => entry._row).join(", ") || ""], ["Comparison", group?.conflict ? "Conflicting values outside key" : "Identical record values"]);
    action = "Review duplicate group →";
  } else if (type === "schema" || ["metric", "metricBlocked"].includes(item.recommendation)) {
    title = item.label;
    explanation = "This finding comes from an analyst-defined business rule. Detection does not change data values.";
    evidence.push(["Rule evidence", ruleEvidence(item, row)]);
    action = "Review configured rule →";
  } else if (type === "outlier") {
    const profile = item.outlier;
    title = `${column.replaceAll("_", " ")} matches the saved ${profile.method || "iqr"} review rule`;
    explanation = "An unusual value may be legitimate. Flagging it does not mean it should be changed. Review the distribution and context first.";
    evidence[0][1] = raw.trim() && Number.isFinite(Number(raw)) ? format(Number(raw)) : raw || "Empty";
    evidence.push(["Saved rule", profile.note || `${profile.multiplier} × IQR`]);
    if (Number.isFinite(profile.lower)) evidence.push(["Lower bound", format(profile.lower)]);
    if (Number.isFinite(profile.upper)) evidence.push(["Upper bound", format(profile.upper)]);
    if (Number.isFinite(profile.sd)) evidence.push(["Population standard deviation", format(profile.sd)]);
    action = "Inspect distribution →";
  } else if (type === "category") {
    title = "Category label differs from the standard spelling";
    explanation = "This cell uses a formatting variant of Paid Social. Confirm the labels refer to the same category before mapping them.";
    evidence.push(["Compared label", "Paid Social"], ["Rows with this spelling", state.rows.filter((entry) => entry[column] === raw).length.toLocaleString()]);
  } else if (item.recommendation === "date") {
    title = "Date uses a different format";
    explanation = "This cell uses MM/DD/YYYY rather than ISO format. Confirm the month/day interpretation before converting it.";
    try { evidence.push(["ISO interpretation", isoDate(raw)]); } catch (error) { evidence.push(["Parsing problem", error.message]); }
  } else if (item.recommendation === "convert") {
    title = "Rate uses a whole-percentage scale";
    explanation = "This rate is above 1 while comparable rates use decimals. Confirm the scale before dividing it by 100.";
    evidence.push(["Decimal interpretation", format(Number(raw) / 100)]);
  } else {
    title = "Clicks exceed impressions in this row";
    explanation = "Recorded clicks are greater than recorded impressions. Confirm the measurement definitions or source values before making a decision.";
    evidence.push(["Impressions", String(row.impressions)], ["Difference", String(Number(row.clicks) - Number(row.impressions))]);
  }
  return { title, explanation, evidence, action };
}

// Row markers follow the viewport; off-screen findings collect by type at either end.
function renderSpreadsheet() {
  window.sheetCleanup?.();
  $("#topEyebrow").textContent = "SPREADSHEET VIEW";
  const flags = new Map(), rowIssues = new Map();
  state.issues.filter((item) => item.status === "open").forEach((item) => item.rows.forEach((row) => {
    const key = `${row._row}:${item.column}`;
    if (!flags.has(key)) flags.set(key, []);
    flags.get(key).push(item);
    if (!rowIssues.has(row._row)) rowIssues.set(row._row, []);
    rowIssues.get(row._row).push(item);
  }));
  const rows = state.rows.filter((row) => (!state.query || state.headers.some((column) => String(row[column]).toLowerCase().includes(state.query.toLowerCase()))) && (!state.flaggedOnly || rowIssues.has(row._row)));
  const types = Object.entries(sheetIssueTypes);
  const inferred = new Map(state.headers.map((column) => [column, inferType(column)]));
  screen.innerHTML = `<section class="view-toolbar"><input id="search" aria-label="Search values" placeholder="Search values" value="${escapeHtml(state.query)}"><label class="check"><input type="checkbox" id="flaggedFilter" ${state.flaggedOnly ? "checked" : ""}> Flagged rows only</label><span>${rows.length.toLocaleString()} of ${state.rows.length.toLocaleString()} rows</span></section>
    <div class="sheet-legend">${types.map(([type, meta]) => `<span><b class="sheet-type sheet-${type}">${meta.symbol}</b> ${meta.label}</span>`).join("")}<small>Select a marker or highlighted cell. Edge counts include findings outside the fully visible row area; +N opens more finding types.</small></div>
    <section class="sheet-grid"><div class="table-wrap" id="sheetViewport"><table><thead><tr><th class="row-no">#</th>${state.headers.map((header) => `<th>${escapeHtml(header)}<small>${inferred.get(header)}</small></th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr data-sheet-row="${row._row}"><td class="row-no">${row._row}</td>${state.headers.map((column, index) => {
      const findings = flags.get(`${row._row}:${column}`) || [];
      const type = findings.length ? sheetIssueType(findings[0]) : "";
      return `<td ${findings.length ? `class="flagged sheet-${type}" tabindex="0" role="button" data-cell-row="${row._row}" data-cell-column="${index}" aria-label="${escapeHtml(`${column}, row ${row._row}: ${findings.map((item) => item.label).join(", ")}`)}"` : ""}>${escapeHtml(row[column])}${findings.length ? `<i>${[...new Set(findings.map((item) => sheetIssueTypes[sheetIssueType(item)].symbol))].join(" ")}</i>` : ""}</td>`;
    }).join("")}</tr>`).join("")}</tbody></table></div><aside class="sheet-rail" id="sheetRail" aria-label="Row findings"></aside><div class="sheet-footer" aria-hidden="true"></div></section><div id="sheetMarkerPopover" class="sheet-marker-popover" role="dialog" aria-label="More spreadsheet findings" hidden></div><div id="sheetMarkerTooltip" class="sheet-marker-tooltip" role="tooltip" hidden></div><section id="sheetDetails" class="sheet-details" aria-live="polite" hidden></section>`;
  const viewport = $("#sheetViewport"), rail = $("#sheetRail"), popup = $("#sheetMarkerPopover"), tooltip = $("#sheetMarkerTooltip"), listeners = new AbortController();
  const elements = [...viewport.querySelectorAll("[data-sheet-row]")];
  let selected = null, targets = new Map(), overflow = new Map(), popupKey = null, popupOpener = null, tooltipOwner = null;
  const hideTooltip = () => { tooltip.hidden = true; tooltipOwner?.removeAttribute("aria-describedby"); tooltipOwner = null; };
  const closePopover = (restore = false) => {
    const opener = popupOpener;
    popup.hidden = true; popupKey = null; popupOpener = null;
    opener?.setAttribute("aria-expanded", "false");
    if (restore && opener?.isConnected) opener.focus({ preventScroll: true });
  };
  const positionFloating = (panel, anchor) => {
    panel.hidden = false;
    const box = anchor.getBoundingClientRect(), size = panel.getBoundingClientRect();
    panel.style.left = `${Math.max(12, Math.min(box.right - size.width, innerWidth - size.width - 12))}px`;
    panel.style.top = `${box.bottom + size.height + 8 <= innerHeight ? box.bottom + 6 : Math.max(12, box.top - size.height - 6)}px`;
  };
  const focusMarker = key => {
    const button = [...rail.querySelectorAll("button[data-marker]:not([hidden])")].find(element => element.dataset.marker === key);
    const group = key.split(":")[0], more = [...rail.querySelectorAll("[data-marker-overflow]")].find(element => element.dataset.markerOverflow === group && !element.hidden);
    (button || more)?.focus({ preventScroll: true });
  };
  const markerHtml = (marker, detailed = false) => `<button type="button" class="${detailed ? "sheet-marker-choice" : "sheet-bubble"} sheet-${marker.type}${marker.active ? " selected" : ""}" data-marker="${marker.key}" data-finding-count="${marker.count}" aria-label="${escapeHtml(marker.label)}" aria-pressed="${Boolean(marker.active)}">${marker.edge ? `<span class="sheet-direction" aria-hidden="true">${marker.edge === "above" ? "↑" : "↓"}</span>` : ""}${marker.meta.symbol}${detailed ? `<span>${escapeHtml(marker.meta.label)}</span>` : ""}${detailed || marker.edge || marker.count > 1 ? `<small>${marker.count.toLocaleString()}</small>` : ""}</button>`;
  const openPopover = button => {
    const key = button.dataset.markerOverflow, markers = overflow.get(key);
    if (!markers?.length) return;
    if (popupKey === key) { closePopover(true); return; }
    closePopover(); hideTooltip(); popupKey = key; popupOpener = button;
    button.setAttribute("aria-expanded", "true");
    popup.innerHTML = `<header><strong>More findings</strong><button type="button" class="ghost" data-close-markers aria-label="Close more spreadsheet findings">Close</button></header><div class="sheet-marker-options">${markers.map(marker => markerHtml(marker, true)).join("")}</div>`;
    positionFloating(popup, button);
    popup.querySelector("[data-marker]")?.focus({ preventScroll: true });
  };
  const centerRow = element => {
    const box = viewport.getBoundingClientRect(), header = viewport.querySelector("thead").getBoundingClientRect().height, row = element.getBoundingClientRect();
    viewport.scrollTop += row.top + row.height / 2 - box.top - header - (viewport.clientHeight - header) / 2;
  };
  const showDetails = (rowId, issueId) => {
    const findings = rowIssues.get(rowId) || [];
    const item = findings.find((entry) => entry.id === issueId) || findings[0];
    if (!item) return;
    selected = { rowId, issueId: item.id };
    const row = rows.find((entry) => entry._row === rowId);
    const type = sheetIssueType(item), meta = sheetIssueTypes[type], inspection = sheetInspection(item, row);
    viewport.querySelectorAll(".sheet-selected-row,.sheet-selected-cell").forEach((element) => element.classList.remove("sheet-selected-row", "sheet-selected-cell"));
    const rowElement = elements.find((element) => Number(element.dataset.sheetRow) === rowId);
    rowElement.classList.add("sheet-selected-row");
    rowElement.querySelector(`[data-cell-column="${state.headers.indexOf(item.column)}"]`)?.classList.add("sheet-selected-cell");
    const details = $("#sheetDetails");
    details.hidden = false;
    details.className = `sheet-details sheet-${type}`;
    const tabs = [...new Set(findings.map(sheetIssueType))];
    details.innerHTML = `${findings.length > 1 ? `<div class="sheet-tabs" role="group" aria-label="Findings in selected row">${tabs.map((key) => {
      const matches = findings.filter((entry) => sheetIssueType(entry) === key);
      return `<button class="sheet-tab sheet-${key}" aria-pressed="${key === type}" data-finding="${matches[0].id}">${sheetIssueTypes[key].symbol} ${sheetIssueTypes[key].tab} (${matches.length})</button>`;
    }).join("")}</div>${findings.filter((entry) => sheetIssueType(entry) === type).length > 1 ? `<div class="sheet-tabs">${findings.filter((entry) => sheetIssueType(entry) === type).map((entry) => `<button class="sheet-tab" aria-pressed="${entry.id === item.id}" data-finding="${entry.id}">${escapeHtml(entry.column)}</button>`).join("")}</div>` : ""}` : ""}
      <header class="sheet-card-heading"><span class="sheet-type">${meta.symbol}</span><b>${meta.label}</b><span>Row ${rowId} · <code>${escapeHtml(item.column)}</code></span><small>${escapeHtml(item.severity)} priority</small></header>
      <h3>${escapeHtml(inspection.title)}</h3><p>${escapeHtml(inspection.explanation)}</p>
      <dl class="sheet-evidence">${inspection.evidence.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>
      <footer class="sheet-card-action"><button class="primary" id="sheetReview">${inspection.action}</button><span>Open a guided review of ${item.rows.length.toLocaleString()} matching records in <code>${escapeHtml(item.column)}</code>.<small>Choose the treatment and exact scope before approving.</small></span></footer>`;
    details.querySelectorAll("[data-finding]").forEach((button) => button.onclick = () => showDetails(rowId, Number(button.dataset.finding)));
    $("#sheetReview").onclick = () => { state.selectedIssue = null; openIssue(item.id); };
    updateMarkers();
  };
  const marked = elements.filter((element) => rowIssues.has(Number(element.dataset.sheetRow)));
  const updateMarkers = () => {
    if (!viewport.isConnected) return;
    const box = viewport.getBoundingClientRect(), railBox = rail.getBoundingClientRect();
    const header = viewport.querySelector("thead").getBoundingClientRect().height;
    const clearance = (parseFloat(getComputedStyle(rail).getPropertyValue("--sheet-marker-size")) || 28) / 2 + 4;
    const focused = document.activeElement?.dataset.marker, focusedOverflow = document.activeElement?.dataset.markerOverflow || (popup.contains(document.activeElement) ? popupKey : null);
    closePopover(); hideTooltip();
    const groups = new Map();
    marked.forEach((element) => {
      const rect = element.getBoundingClientRect(), rowId = Number(element.dataset.sheetRow);
      const y = rect.top + rect.height / 2 - box.top;
      const edge = y < header + clearance ? "above" : y > viewport.clientHeight - clearance ? "below" : null;
      const key = edge || `row-${rowId}`;
      if (!groups.has(key)) groups.set(key, { edge, position: edge === "above" ? header / 2 : edge === "below" ? (box.bottom - railBox.top + rail.clientHeight) / 2 : y + box.top - railBox.top, entries: [] });
      rowIssues.get(rowId).forEach((item) => groups.get(key).entries.push({ rowId, item, element }));
    });
    targets = new Map(); overflow = new Map();
    rail.innerHTML = [...groups].map(([key, group]) => {
      const markers = types.flatMap(([type, meta]) => {
        const entries = group.entries.filter(entry => sheetIssueType(entry.item) === type);
        if (!entries.length) return [];
        const target = group.edge === "above" ? entries.at(-1) : entries[0], markerKey = `${key}:${type}`;
        const label = group.edge ? `${meta.label}: ${entries.length} findings ${group.edge} the fully visible row area. Go to row ${target.rowId}.` : `${entries.map(entry => entry.item.label).join("; ")} · Row ${target.rowId}`;
        const marker = { ...target, key: markerKey, type, meta, edge: group.edge, count: entries.length, label, active: selected && entries.some(entry => entry.rowId === selected.rowId && entry.item.id === selected.issueId) };
        targets.set(markerKey, marker); return [marker];
      });
      group.markers = markers;
      return `<div class="sheet-marker-cluster${group.edge ? " sheet-edge" : ""}" data-marker-group="${key}" style="top:${group.position}px">${markers.map(marker => markerHtml(marker)).join("")}<button type="button" class="sheet-bubble sheet-more" data-marker-overflow="${key}" aria-haspopup="dialog" aria-controls="sheetMarkerPopover" aria-expanded="false">+${markers.length}</button></div>`;
    }).join("");
    for (const cluster of rail.children) {
      const key = cluster.dataset.markerGroup, group = groups.get(key), buttons = [...cluster.querySelectorAll("[data-marker]")], more = cluster.querySelector("[data-marker-overflow]"), gap = parseFloat(getComputedStyle(cluster).columnGap) || 0;
      const widths = buttons.map(button => button.getBoundingClientRect().width), total = widths.reduce((sum, width) => sum + width, 0) + gap * Math.max(0, buttons.length - 1);
      if (total <= cluster.clientWidth) { more.hidden = true; continue; }
      const moreWidth = more.getBoundingClientRect().width;
      let count = 0, used = 0;
      while (count < buttons.length && used + widths[count] + gap * (count + 1) + moreWidth <= cluster.clientWidth) used += widths[count++];
      buttons.slice(count).forEach(button => { button.hidden = true; });
      const hidden = group.markers.slice(count); overflow.set(key, hidden);
      more.textContent = `${group.edge === "above" ? "↑ " : group.edge === "below" ? "↓ " : ""}+${hidden.length}`;
      more.setAttribute("aria-label", `${hidden.length} more finding types ${group.edge || `in row ${group.markers[0].rowId}`}${hidden.some(marker => marker.active) ? "; includes selected finding" : ""}`);
      more.classList.toggle("selected", hidden.some(marker => marker.active));
    }
    if (focused) focusMarker(focused);
    else if (focusedOverflow) {
      const button = [...rail.querySelectorAll("[data-marker-overflow]")].find(element => element.dataset.markerOverflow === focusedOverflow && !element.hidden);
      (button || rail.querySelector(`[data-marker-group="${focusedOverflow}"] [data-marker]:not([hidden])`))?.focus({ preventScroll: true });
    }
  };
  const activateMarker = key => {
    const marker = targets.get(key); if (!marker) return;
    closePopover(); hideTooltip();
    if (marker.edge) centerRow(marker.element);
    showDetails(marker.rowId, marker.item.id);
    focusMarker(`row-${marker.rowId}:${marker.type}`);
  };
  rail.addEventListener("click", event => {
    const button = event.target.closest("button"); if (!button) return;
    if (button.dataset.marker) activateMarker(button.dataset.marker);
    else if (button.dataset.markerOverflow) openPopover(button);
  }, { signal: listeners.signal });
  popup.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (button?.hasAttribute("data-close-markers")) closePopover(true);
    else if (button?.dataset.marker) activateMarker(button.dataset.marker);
  }, { signal: listeners.signal });
  const revealTooltip = event => {
    const button = event.target.closest("button[data-marker]"); if (!button || !popup.hidden) return;
    const marker = targets.get(button.dataset.marker); if (!marker) return;
    hideTooltip(); tooltipOwner = button; tooltip.textContent = marker.label;
    button.setAttribute("aria-describedby", tooltip.id); positionFloating(tooltip, button);
  };
  rail.addEventListener("pointerover", revealTooltip, { signal: listeners.signal });
  rail.addEventListener("focusin", revealTooltip, { signal: listeners.signal });
  rail.addEventListener("pointerout", event => { if (!event.target.closest("button[data-marker]")?.contains(event.relatedTarget)) hideTooltip(); }, { signal: listeners.signal });
  rail.addEventListener("focusout", hideTooltip, { signal: listeners.signal });
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    hideTooltip();
    if (!popup.hidden) { event.preventDefault(); event.stopPropagation(); closePopover(true); }
  }, { signal: listeners.signal });
  document.addEventListener("pointerdown", event => { if (!popup.hidden && !popup.contains(event.target) && !popupOpener?.contains(event.target)) closePopover(); }, { signal: listeners.signal });
  popup.addEventListener("focusout", event => { if (!popup.contains(event.relatedTarget) && event.relatedTarget !== popupOpener) closePopover(); }, { signal: listeners.signal });
  viewport.querySelectorAll("[data-cell-row]").forEach((cell) => {
    cell.onclick = () => showDetails(Number(cell.dataset.cellRow), flags.get(`${cell.dataset.cellRow}:${state.headers[Number(cell.dataset.cellColumn)]}`)[0].id);
    cell.onkeydown = (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); cell.click(); } };
  });
  const queueMarkers = () => { if (!viewport.isConnected || listeners.signal.aborted) return; cancelAnimationFrame(window.sheetMarkerFrame); window.sheetMarkerFrame = requestAnimationFrame(() => { window.sheetMarkerFrame = 0; updateMarkers(); }); };
  viewport.addEventListener("scroll", () => { closePopover(); hideTooltip(); queueMarkers(); }, { signal: listeners.signal });
  window.addEventListener("scroll", () => { closePopover(); hideTooltip(); }, { signal: listeners.signal });
  if (window.sheetResizeObserver) window.sheetResizeObserver.disconnect();
  window.sheetResizeObserver = new ResizeObserver(queueMarkers);
  window.sheetResizeObserver.observe(viewport);
  window.sheetCleanup = () => { listeners.abort(); cancelAnimationFrame(window.sheetMarkerFrame); window.sheetMarkerFrame = 0; window.sheetResizeObserver?.disconnect(); window.sheetResizeObserver = null; closePopover(); hideTooltip(); window.sheetCleanup = null; };
  updateMarkers();
  if (state.locateRow != null) {
    const rowId = state.locateRow;
    state.locateRow = null;
    const target = elements.find((element) => Number(element.dataset.sheetRow) === rowId);
    if (target) {
      target.classList.add("sheet-selected-row");
      centerRow(target);
      if (rowIssues.has(rowId)) showDetails(rowId);
      updateMarkers();
    }
  }
  $("#search").oninput = (event) => {
    const position = event.target.selectionStart;
    state.query = event.target.value;
    renderSpreadsheet();
    $("#search").focus();
    $("#search").setSelectionRange(position, position);
  };
  $("#flaggedFilter").onchange = (event) => { state.flaggedOnly = event.target.checked; renderSpreadsheet(); };
}
