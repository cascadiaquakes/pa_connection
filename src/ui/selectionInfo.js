function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
    }[c]));
}

function isVisible(ele) {
    return ele.style("display") !== "none";
}

function kvTable(rows) {
    return `
    <table class="md-kv" role="presentation">
      <tbody>
        ${rows
        .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "")
        .map(([k, v]) => `
            <tr>
              <td class="md-k">${escapeHtml(k)}</td>
              <td class="md-v">${escapeHtml(v)}</td>
            </tr>
          `)
        .join("")}
      </tbody>
    </table>
  `;
}

function renderEmpty(el) {
    el.innerHTML = `
    <div class="md-status">
      <section class="md-card">
        <div class="md-card-title">Nothing selected</div>
        <div class="hint" style="margin:0;">Click a node or edge to see details here.</div>
      </section>
    </div>
  `;
}

function summarizeNode(n) {
    const d = n.data();

    // Pull the most useful known fields first (customize as you like)
    const primaryRows = [
        ["Name", d.label ?? d.name ?? d.id ?? n.id()],
        ["Organization category", d.orgCategory],
        ["Geography", d.geoPrimary],
    ];

    // Graph-derived stats
    const degree = n.degree(false);
    const visEdges = n.connectedEdges().filter(e => isVisible(e)).length;
    const visNeighbors = n.connectedNodes().filter(nn => isVisible(nn)).length;

    const statsRows = [
        ["Node id", n.id()],
        ["Degree", String(degree)],
        ["Visible edges", String(visEdges)],
        ["Visible neighbors", String(visNeighbors)],
    ];

    // Extra metadata: include remaining fields (excluding internal / noisy ones)
    const skip = new Set(["_nodeColor", "isGrid", "isGridPoint", "isGridLine", "isGridHeader"]);
    const extraRows = Object.keys(d)
        .filter((k) => !skip.has(k))
        .filter((k) => !["label", "name", "id", "orgCategory", "geoPrimary"].includes(k))
        .sort()
        .map((k) => [k, String(d[k])]);

    return { primaryRows, statsRows, extraRows };
}

function summarizeEdge(e) {
    const d = e.data();
    const src = e.source();
    const tgt = e.target();

    const primaryRows = [
        ["Relationship", d.relType ?? d.type ?? "(unknown)"],
        ["Source", src.data("label") ?? src.data("name") ?? src.id()],
        ["Target", tgt.data("label") ?? tgt.data("name") ?? tgt.id()],
    ];

    const statsRows = [
        ["Edge id", e.id()],
        ["Visible", isVisible(e) ? "yes" : "no"],
    ];

    const skip = new Set(["_edgeColor", "isGrid", "isGridLine"]);
    const extraRows = Object.keys(d)
        .filter((k) => !skip.has(k))
        .filter((k) => !["relType", "type", "source", "target", "id"].includes(k))
        .sort()
        .map((k) => [k, String(d[k])]);

    return { primaryRows, statsRows, extraRows };
}

export function initSelectionInfo(cy, { selectionElId = "infoSelection" } = {}) {
    const el = document.getElementById(selectionElId);
    if (!el) {
        console.warn(`[selectionInfo] #${selectionElId} not found; skipping initSelectionInfo()`);
        return;
    }

    const render = () => {
        const selNodes = cy.nodes(":selected").filter("[!isGrid]");
        const selEdges = cy.edges(":selected").filter("[!isGrid]");

        // Prefer single selection; if multiple, show counts
        if (selNodes.length === 0 && selEdges.length === 0) {
            renderEmpty(el);
            return;
        }

        if (selNodes.length + selEdges.length > 1) {
            el.innerHTML = `
        <div class="md-status">
          <section class="md-card">
            <div class="md-card-title">Multiple selected</div>
            ${kvTable([
                ["Selected nodes", String(selNodes.length)],
                ["Selected edges", String(selEdges.length)],
            ])}
            <div class="hint" style="margin:8px 0 0 0;">
              Tip: click empty space to clear selection, or click one element to inspect it.
            </div>
          </section>
        </div>
      `;
            return;
        }

        if (selNodes.length === 1) {
            const n = selNodes[0];
            const { primaryRows, statsRows, extraRows } = summarizeNode(n);

            el.innerHTML = `
        <div class="md-status">
          <section class="md-card">
            <div class="md-card-title">Node</div>
            ${kvTable(primaryRows)}
          </section>

          <section class="md-card">
            <div class="md-card-title">Graph</div>
            ${kvTable(statsRows)}
          </section>

          ${extraRows.length ? `
            <section class="md-card">
              <div class="md-card-title">Attributes</div>
              ${kvTable(extraRows)}
            </section>
          ` : ""}
        </div>
      `;
            return;
        }

        // single edge
        const e = selEdges[0];
        const { primaryRows, statsRows, extraRows } = summarizeEdge(e);

        el.innerHTML = `
      <div class="md-status">
        <section class="md-card">
          <div class="md-card-title">Edge</div>
          ${kvTable(primaryRows)}
        </section>

        <section class="md-card">
          <div class="md-card-title">Graph</div>
          ${kvTable(statsRows)}
        </section>

        ${extraRows.length ? `
          <section class="md-card">
            <div class="md-card-title">Attributes</div>
            ${kvTable(extraRows)}
          </section>
        ` : ""}
      </div>
    `;
    };

    // Initial render
    render();

    // Update on selection changes
    cy.on("select unselect", "node, edge", () => render());

    // Also update when clicking background (common "clear selection" pattern)
    cy.on("tap", (evt) => {
        if (evt.target === cy) render();
    });
}