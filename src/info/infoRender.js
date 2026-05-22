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

function linkifyText(text) {
    const escaped = escapeHtml(text);
    return escaped.replace(
        /(https?:\/\/[^\s<]+)/gi,
        (url) => `<a href="${escapeHtmlAttr(url)}" target="_blank" rel="noreferrer">${url}</a>`
    );
}

function renderValueCell(value, { linkifyValues = false } = {}) {
    if (value && typeof value === "object" && "html" in value) {
        return String(value.html ?? "");
    }

    const text = displayValue(value);
    return linkifyValues ? linkifyText(text) : escapeHtml(text);
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
        <div class="hint" style="margin:0;">Click a node or edge to see details here.</div>
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
        <div class="hint" style="margin:8px 0 0 0;">
          Click one element to inspect it.
        </div>
      </section>
    </div>
  `;
}
