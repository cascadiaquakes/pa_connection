import { isVisible, renderCard } from "./infoRender.js";

function countLabel(setOrNull, singular, plural = `${singular}s`) {
    const n = setOrNull?.size ?? 0;
    if (n === 0) return "None";
    if (n === 1) return `1 ${singular}`;
    return `${n} ${plural}`;
}

function formatLayoutMode(layoutMode) {
    switch (layoutMode) {
        case "organic":
            return "Self-organized";
        case "grid":
        default:
            return "Grid";
    }
}

function formatNodeColorMode(mode) {
    switch (mode) {
        case "orgType":
            return "Organization type";
        case "nodeType":
            return "Node type";
        case "governance":
            return "Governance level";
        case "functionalDomain":
            return "Functional domain";
        case "role":
            return "Role";
        case "lifeline":
            return "FEMA lifeline";
        case "geo":
            return "Geography";
        case "none":
        default:
            return "None";
    }
}

function formatEdgeDisplayMode(mode) {
    switch (mode) {
        case "detailed":
            return "Detailed";
        case "simplified":
            return "Simplified";
        case "none":
        default:
            return "None";
    }
}

function summarizeGraphStatus(cy, state, staticInfo) {
    const totalNodes = Number(staticInfo.totalNodes || 0);
    const totalEdges = Number(staticInfo.totalEdges || 0);
    const nodesUrl = staticInfo.nodesUrl || "";
    const edgesUrl = staticInfo.edgesUrl || "";

    const visibleNodes = cy.nodes("[!isGrid]").filter((n) => isVisible(n)).length;
    const visibleEdges = cy.edges("[!isGrid]").filter((e) => isVisible(e)).length;

    const nodeColorMode = formatNodeColorMode(state.nodeColorMode ?? "none");
    const edgeDisplayMode = formatEdgeDisplayMode(state.edgeDisplayMode ?? "simplified");
    const layoutMode = formatLayoutMode(state.layoutMode ?? "grid");

    const prune = state.prune ? "On" : "Off";

    const overviewRows = [
        ["Organizations loaded", totalNodes],
        ["Relationships loaded", totalEdges],
        ["Organizations visible", visibleNodes],
        ["Relationships visible", visibleEdges],
    ];

    const displayRows = [
        ["Layout", layoutMode],
        ["Node coloring", nodeColorMode],
        ["Edge display", edgeDisplayMode],
        ["Hide isolated organizations", prune],
    ];

    const filterRows = [
        ["Organization categories", countLabel(state.allowedOrgCategories, "category")],
        ["Geographies", countLabel(state.allowedGeos, "geography", "geographies")],
        ["Node types", countLabel(state.allowedNodeTypes, "type")],
        ["Governance levels", countLabel(state.allowedGovernanceLevels, "level")],
        ["Functional domains", countLabel(state.allowedFunctionalDomains, "domain")],
        ["Roles", countLabel(state.allowedRoles, "role")],
        ["FEMA lifelines", countLabel(state.allowedLifelines, "lifeline")],
        ["Relationship types", countLabel(state.allowedRelTypes, "type")],
    ];

    const sourceRows = [];
    if (nodesUrl) sourceRows.push(["Nodes file", nodesUrl]);
    if (edgesUrl) sourceRows.push(["Edges file", edgesUrl]);

    return { overviewRows, displayRows, filterRows, sourceRows };
}

/**
 * Initialize the graph info panel.
 * Call once after data is loaded.
 */
export function initGraphInfo({
                                  totalNodes = 0,
                                  totalEdges = 0,
                                  nodesUrl = "",
                                  edgesUrl = "",
                                  statusElId = "infoStatus",
                              } = {}) {
    const el = document.getElementById(statusElId);
    if (!el) {
        console.warn(`[graphInfo] #${statusElId} not found; skipping initGraphInfo()`);
        return;
    }

    el.dataset.totalNodes = String(totalNodes);
    el.dataset.totalEdges = String(totalEdges);
    if (nodesUrl) el.dataset.nodesUrl = nodesUrl;
    if (edgesUrl) el.dataset.edgesUrl = edgesUrl;

    el.innerHTML = `
      <div class="md-status">
        ${renderCard("Dataset", [
        ["Organizations loaded", totalNodes],
        ["Relationships loaded", totalEdges],
    ])}
        ${
        nodesUrl || edgesUrl
            ? renderCard("Source files", [
                ["Nodes file", nodesUrl],
                ["Edges file", edgesUrl],
            ])
            : ""
    }
      </div>
    `;
}

/**
 * Update the graph info panel from current Cytoscape visibility + UI state.
 */
export function updateGraphInfo(cy, state = {}, { statusElId = "infoStatus" } = {}) {
    const el = document.getElementById(statusElId);
    if (!el) return;

    const staticInfo = {
        totalNodes: el.dataset.totalNodes,
        totalEdges: el.dataset.totalEdges,
        nodesUrl: el.dataset.nodesUrl,
        edgesUrl: el.dataset.edgesUrl,
    };

    const { overviewRows, displayRows, filterRows, sourceRows } =
        summarizeGraphStatus(cy, state, staticInfo);

    el.innerHTML = `
      <div class="md-status">
        ${renderCard("Graph overview", overviewRows)}
        ${renderCard("Display", displayRows)}
        ${renderCard("Filters", filterRows)}
        ${sourceRows.length ? renderCard("Source files", sourceRows) : ""}
      </div>
    `;
}
