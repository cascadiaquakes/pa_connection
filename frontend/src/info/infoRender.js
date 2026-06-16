export function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
    }[c]));
}

export function escapeHtmlAttr(s) {
    return escapeHtml(s);
}

export function isVisible(ele) {
    return ele.style("display") !== "none";
}

export function displayValue(v) {
    if (v === undefined || v === null) return "";
    if (Array.isArray(v)) return v.join(", ");
    return String(v).trim();
}

export function nonEmptyRows(rows) {
    return rows.filter(([, v]) => displayValue(v) !== "");
}

export function setRenderedHtml(element, html) {
    element.innerHTML = String(html ?? "");
}

function linkifyText(text) {
    const value = String(text ?? "");
    const urlPattern = /(https?:\/\/[^\s<]+)/gi;
    let html = "";
    let offset = 0;

    for (const match of value.matchAll(urlPattern)) {
        const url = match[0];
        const index = match.index ?? 0;
        html += escapeHtml(value.slice(offset, index));
        html += `<a href="${escapeHtmlAttr(url)}" target="_blank" rel="noreferrer">${escapeHtml(url)}</a>`;
        offset = index + url.length;
    }

    return html + escapeHtml(value.slice(offset));
}

function renderValueCell(value, { linkifyValues = false } = {}) {
    const text = displayValue(value);
    return linkifyValues ? linkifyText(text) : escapeHtml(text);
}

export function renderInlineAction(label, dataAttribute, dataValue) {
    if (!/^[A-Za-z][A-Za-z0-9_:-]*$/.test(dataAttribute)) {
        throw new Error(`Invalid data attribute: ${dataAttribute}`);
    }
    return `<button type="button" class="md-inline-action" ${escapeHtmlAttr(dataAttribute)}="${escapeHtmlAttr(dataValue)}">${escapeHtml(label)}</button>`;
}

export function kvTable(rows, options = {}) {
    const cleanRows = nonEmptyRows(rows);

    return `
    <table class="md-kv" role="presentation">
      <tbody>
        ${cleanRows.map(([k, v]) => `
            <tr>
              <td class="md-k">${escapeHtml(k)}</td>
              <td class="md-v">${renderValueCell(v, options)}</td>
            </tr>
          `).join("")}
      </tbody>
    </table>
  `;
}

export function renderCard(title, rows, options = {}) {
    const cleanRows = nonEmptyRows(rows);
    if (!cleanRows.length) return "";

    return `
    <section class="md-card">
      <div class="md-card-title">${escapeHtml(title)}</div>
      ${kvTable(cleanRows, options)}
    </section>
  `;
}

export function renderEmptyState() {
    return `
    <div class="md-status">
      <section class="md-card">
        <div class="md-card-title">Nothing selected</div>
        <div class="hint empty-state-hint">Click a node or edge to see details here.</div>
      </section>
    </div>
  `;
}

export function renderMultiSelection(selNodes, selEdges) {
    return `
    <div class="md-status">
      <section class="md-card">
        <div class="md-card-title">Multiple selected</div>
        ${kvTable([
        ["Selected organizations", selNodes.length],
        ["Selected relationships", selEdges.length],
    ])}
        <div class="hint multi-selection-hint">
          Click one element to inspect it.
        </div>
      </section>
    </div>
  `;
}
