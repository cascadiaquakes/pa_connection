function isVisible(ele) {
    // Cytoscape style("display") returns "element" or "none"
    return ele.style("display") !== "none";
}

function labelOrAll(setOrNull) {
    const n = setOrNull?.size ?? 0;
    return n === 0 ? "all" : String(n);
}

/**
 * Initialize the Info tab status panel.
 * Call once, after you have nodes/edges counts.
 */
export function initGraphStatus({
                                    totalNodes = 0,
                                    totalEdges = 0,
                                    nodesUrl = "",
                                    edgesUrl = "",
                                    statusElId = "infoStatus",
                                } = {}) {
    const el = document.getElementById(statusElId);
    if (!el) {
        console.warn(`[graphStatus] #${statusElId} not found; skipping initGraphStatus()`);
        return;
    }

    // Store static info on the element for later use (cheap & simple)
    el.dataset.totalNodes = String(totalNodes);
    el.dataset.totalEdges = String(totalEdges);
    if (nodesUrl) el.dataset.nodesUrl = nodesUrl;
    if (edgesUrl) el.dataset.edgesUrl = edgesUrl;

    // Initial render
    el.textContent = [
        `Loaded: ${totalNodes} nodes, ${totalEdges} edges`,
        nodesUrl || edgesUrl ? `Source: ${nodesUrl || "(nodes?)"} | ${edgesUrl || "(edges?)"}` : "",
    ]
        .filter(Boolean)
        .join("\n");
}

/**
 * Update the Info tab status panel based on current graph visibility + UI state.
 */
export function updateGraphStatus(cy, state = {}, { statusElId = "infoStatus" } = {}) {
    const el = document.getElementById(statusElId);
    if (!el) return;

    const totalNodes = Number(el.dataset.totalNodes || 0);
    const totalEdges = Number(el.dataset.totalEdges || 0);
    const nodesUrl = el.dataset.nodesUrl || "";
    const edgesUrl = el.dataset.edgesUrl || "";

    const visibleNodes = cy.nodes().filter((n) => isVisible(n)).length;
    const visibleEdges = cy.edges().filter((e) => isVisible(e)).length;

    const nodeColorMode = state.nodeColorMode ?? "none";
    const edgeColorMode = state.edgeColorMode ?? "none";

    const orgCats = labelOrAll(state.allowedOrgCategories);
    const geos = labelOrAll(state.allowedGeos);
    const relTypes = labelOrAll(state.allowedRelTypes);

    const prune = state.prune ? "On" : "Off";

    const groups = [
        {
            title: "Graph",
            rows: [
                ["Loaded nodes", totalNodes],
                ["Loaded edges", totalEdges],
                ["Visible nodes", visibleNodes],
                ["Visible edges", visibleEdges],
            ],
        },
        {
            title: "Display",
            rows: [
                ["Node coloring", nodeColorMode],
                ["Edge coloring", edgeColorMode],
                ["Prune isolated", prune],
            ],
        },
        {
            title: "Filters",
            rows: [
                ["Org categories", orgCats],
                ["Geographic", geos],
                ["Relationship types", relTypes],
            ],
        },
    ];

    if (nodesUrl || edgesUrl) {
        groups.push({
            title: "Source",
            rows: [[
                "Files",
                `${nodesUrl || "(nodes?)"}\n${edgesUrl || "(edges?)"}`
            ]],
        });
    }

    el.innerHTML = `
      <div class="md-status">
        ${groups.map(g => `
          <section class="md-card">
            <div class="md-card-title">${escapeHtml(g.title)}</div>
            <table class="md-kv" role="presentation">
              <tbody>
                ${g.rows.map(([k, v]) => `
                  <tr>
                    <td class="md-k">${escapeHtml(String(k))}</td>
                    <td class="md-v">${formatValue(v)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </section>
        `).join("")}
      </div>
    `;
}

// --- helpers local to this module ---
function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
    }[c]));
}

function formatValue(v) {
    const s = String(v ?? "");
    // allow line breaks for the Source group
    return escapeHtml(s).replace(/\n/g, "<br/>");
}