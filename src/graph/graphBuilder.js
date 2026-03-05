import cytoscape from "cytoscape";
import { baseStylesheet } from "./styles.js";
import { applyBoxPresetLayout } from "./boxLayout.js";
import {addGridDecorations} from "./gridDecorations.js";
import {layoutConfig} from "./layoutConfig.js";

export function createGraph({ container, elements }) {
    const cy = cytoscape({
        container,
        elements,
        style: [
            ...baseStylesheet(),

            // --- Grid decoration styles ---
            // Grid points: invisible anchors for lines
            {
                selector: 'node[isGridPoint][isGrid="true"]',
                style: {
                    width: 1,
                    height: 1,
                    opacity: 0,
                    "events": "no",
                    label: "",          // hard override: never try to map label
                    "z-index": 0,
                },
            },

            // Grid lines (edges)
            {
                selector: 'edge[isGridLine][isGrid="true"]',
                style: {
                    width: 1,
                    "line-color": "#d0d0d0",
                    "curve-style": "straight",
                    "target-arrow-shape": "none",
                    opacity: 1,
                    "events": "no",
                    "z-index": 0,
                },
            },

            // Headers only (these have data.label)
            {
                selector: 'node[isGridHeader][isGrid="true"][label]',
                style: {
                    shape: "round-rectangle",
                    "background-opacity": 0,
                    "border-width": 0,
                    label: "data(label)",
                    "font-size": 12,
                    "text-wrap": "wrap",
                    "text-max-width": 140,
                    "text-valign": "center",
                    "text-halign": "center",
                    "text-opacity": 0.9,
                    color: "#333",
                    "events": "no",
                    "z-index": 0,
                },
            },

            // Ensure real graph elements render above grid
            { selector: 'edge[!isGrid]', style: { "z-index": 5 } },
            { selector: 'node[!isGrid]', style: { "z-index": 10 } },
        ],

        layout: { name: "cose", animate: false },
    });

    cy.edges().forEach((e) => {
        if (e.data("_missingEndpoint")) e.addClass("missingEndpoint");
    });

    return cy;
}

export function applyColorModes(cy, { nodeColorMode, edgeColorMode }) {
    const ss = baseStylesheet();

    // Keep grid decoration rules alive after style rebuild
    ss.push({
        selector: 'node[isGridPoint][isGrid="true"]',
        style: { label: "", opacity: 0, width: 1, height: 1, "events": "no", "z-index": 0 },
    });
    ss.push({
        selector: 'edge[isGridLine][isGrid="true"]',
        style: {
            width: 1,
            "line-color": "#d0d0d0",
            "curve-style": "straight",
            "target-arrow-shape": "none",
            opacity: 1,
            "events": "no",
            "z-index": 0,
        },
    });
    ss.push({
        selector: 'node[isGridHeader][isGrid="true"][label]',
        style: {
            "background-opacity": 0,
            "border-width": 0,
            label: "data(label)",
            "font-size": 12,
            "text-wrap": "wrap",
            "text-max-width": 140,
            "text-valign": "center",
            "text-halign": "center",
            "text-opacity": 0.9,
            color: "#333",
            "events": "no",
            "z-index": 0,
        },
    });

    // Ensure real nodes/edges above grid
    ss.push({ selector: 'edge[!isGrid]', style: { "z-index": 5 } });
    ss.push({ selector: 'node[!isGrid]', style: { "z-index": 10 } });

    // Node color mode (do NOT affect grid)
    if (nodeColorMode !== "none") {
        ss.push({
            selector: 'node[!isGrid][_nodeColor]',
            style: { "background-color": "data(_nodeColor)" },
        });
    }

    // Edge color mode (do NOT affect grid)
    if (edgeColorMode !== "none") {
        ss.push({
            selector: 'edge[!isGrid][_edgeColor]',
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
    { allowedOrgCategories, allowedGeos, allowedRelTypes, prune = true } = {}
) {
    allowedOrgCategories = asSet(allowedOrgCategories);
    allowedGeos = asSet(allowedGeos);
    allowedRelTypes = asSet(allowedRelTypes);

    cy.batch(() => {
        // 0) Clean slate
        cy.nodes().style("display", "none");
        cy.edges().style("display", "none");

        // Always show grid decorations
        cy.elements('[isGrid="true"]').style("display", "element");

        // 1) Show real nodes that pass filters
        cy.nodes('[!isGrid]').forEach((n) => {
            const geo = String(n.data("geoPrimary") ?? "");

            const orgTypes = n.data("orgTypes");
            const typesArr = Array.isArray(orgTypes)
                ? orgTypes.map((t) => String(t ?? ""))
                : [String(n.data("orgTypePrimary") ?? "")];

            const okCat = typesArr.some((t) => allowedOrgCategories.has(t));
            const okGeo = allowedGeos.has(geo);

            if (okCat && okGeo) n.style("display", "element");
        });

        // 2) Show real edges that pass filters AND connect visible real nodes
        cy.edges('[!isGrid]').forEach((e) => {
            const rt = String(e.data("relType") ?? "");
            if (!allowedRelTypes.has(rt)) return;

            const sVisible = e.source().style("display") !== "none";
            const tVisible = e.target().style("display") !== "none";
            if (sVisible && tVisible) e.style("display", "element");
        });

        // 3) Optional prune of isolated nodes
        if (prune) {
            cy.nodes().forEach((n) => {
                if (n.style("display") === "none") return;

                const hasVisibleEdge = n.connectedEdges().some(
                    (e) => e.style("display") !== "none"
                );

                if (!hasVisibleEdge) n.style("display", "none");
            });
        }

        // 4) Safety pass for real edges only
        cy.edges('[!isGrid]').forEach((e) => {
            if (e.style("display") === "none") return;
            const sVisible = e.source().style("display") !== "none";
            const tVisible = e.target().style("display") !== "none";
            if (!sVisible || !tVisible) e.style("display", "none");
        });
    });
}

export function runLayout(cy, name) {
    if (name === "boxes") {
        addGridDecorations(cy, layoutConfig);
        applyBoxPresetLayout(cy, layoutConfig);
        return;
    }
    cy.layout({ name, animate: true, animationDuration: 300 }).run();
}
