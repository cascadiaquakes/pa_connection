import cytoscape from "cytoscape";
import { baseStylesheet } from "./styles.js";

export function createGraph({ container, elements }) {
    const cy = cytoscape({
        container,
        elements,
        style: baseStylesheet(),
        layout: { name: "cose", animate: false },
    });

    cy.edges().forEach((e) => {
        if (e.data("_missingEndpoint")) e.addClass("missingEndpoint");
    });

    return cy;
}

export function applyColorModes(cy, { nodeColorMode, edgeColorMode }) {
    const ss = baseStylesheet();

    // Fallback defaults first
    ss.push({ selector: "node", style: { "background-color": "#888" } });
    ss.push({
        selector: "edge",
        style: { "line-color": "#bbb", "target-arrow-color": "#bbb" },
    });

    if (nodeColorMode !== "none") {
        ss.push({
            selector: "node[_nodeColor]",
            style: { "background-color": "data(_nodeColor)" },
        });
    }

    if (edgeColorMode !== "none") {
        ss.push({
            selector: "edge[_edgeColor]",
            style: {
                "line-color": "data(_edgeColor)",
                "target-arrow-color": "data(_edgeColor)",
            },
        });
    }

    cy.style(ss);
}

function asSet(x) {
    return x instanceof Set ? x : new Set();
}

export function recomputeVisibility(
    cy,
    { allowedOrgCategories, allowedGeos, allowedRelTypes } = {}
) {
    allowedOrgCategories = asSet(allowedOrgCategories);
    allowedGeos = asSet(allowedGeos);
    allowedRelTypes = asSet(allowedRelTypes);

    cy.batch(() => {
        // 0) Start from a clean slate
        cy.nodes().style("display", "none");
        cy.edges().style("display", "none");

        // 1) Show nodes that pass node filters
        cy.nodes().forEach((n) => {
            const cat = String(n.data("orgCategory") ?? "");
            const geo = String(n.data("geo") ?? "");

            const okCat = allowedOrgCategories.has(cat);
            const okGeo = allowedGeos.has(geo);

            if (okCat && okGeo) n.style("display", "element");
        });

        // 2) Show edges that pass edge filters AND connect visible nodes
        cy.edges().forEach((e) => {
            const rt = String(e.data("relType") ?? "");
            if (!allowedRelTypes.has(rt)) return;

            const sVisible = e.source().style("display") !== "none";
            const tVisible = e.target().style("display") !== "none";
            if (sVisible && tVisible) e.style("display", "element");
        });

        // 3) Prune isolated nodes (based on visible edges)
        cy.nodes().forEach((n) => {
            if (n.style("display") === "none") return;
            const hasVisibleEdge = n
                .connectedEdges()
                .some((e) => e.style("display") !== "none");
            if (!hasVisibleEdge) n.style("display", "none");
        });

        // 4) Safety: hide any edges that became invalid due to pruning
        cy.edges().forEach((e) => {
            if (e.style("display") === "none") return;
            const sVisible = e.source().style("display") !== "none";
            const tVisible = e.target().style("display") !== "none";
            if (!sVisible || !tVisible) e.style("display", "none");
        });
    });
}

export function runLayout(cy, name) {
    cy.layout({ name, animate: true, animationDuration: 300 }).run();
}