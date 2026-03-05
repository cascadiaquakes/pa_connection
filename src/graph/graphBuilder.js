import cytoscape from "cytoscape";
import {baseStylesheet} from "./styles.js";
import {applyBoxPresetLayout} from "./boxLayout.js";
import {addGridDecorations} from "./gridDecorations.js";
import {layoutConfig} from "../config/layoutConfig.js";


function gridDecorationStyles() {
    return [
        {
            selector: 'node[isGridPoint][isGrid="true"]',
            style: {
                width: 1,
                height: 1,
                opacity: 0,
                "events": "no",
                label: "",
                "z-index": 0,
            },
        },
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
        {
            selector: 'node[isGridHeader][isGrid="true"][label]',
            style: {
                shape: "round-rectangle",

                width: "data(_w)",
                height: "data(_h)",

                label: "data(label)",
                "font-size": 11,

                "text-wrap": "wrap",
                "text-max-width": "data(_w)",

                "text-valign": "center",
                "text-halign": "center",

                "background-opacity": 0,
                "border-width": 0,

                color: "#333",
                "z-index": 0,
                "events": "no",
            },
        },
        { selector: 'edge[!isGrid]', style: { "z-index": 5 } },
        { selector: 'node[!isGrid]', style: { "z-index": 10 } },
    ];
}

export function createGraph({container, elements}) {
    const cy = cytoscape({
        container,
        elements,
        style: [
            ...baseStylesheet(),
            ...gridDecorationStyles(),
        ],

        layout: {name: "cose", animate: false},
    });

    cy.edges().forEach((e) => {
        if (e.data("_missingEndpoint")) e.addClass("missingEndpoint");
    });

    return cy;
}

export function applyColorModes(cy, {nodeColorMode, edgeColorMode}) {
    const ss = baseStylesheet();

    ss.push(...gridDecorationStyles());
    // Grid header background tint (must be >= specificity of the base header rule)
    ss.push({
        selector: 'node[isGridHeader][isGrid="true"][label][_gridColor]',
        style: {
            "background-color": "data(_gridColor)",
            "background-opacity": 0.35,
            "text-outline-width": 0,
            color: "#333",
        },
    });
    ss.push({
        selector: 'node[isGridHeader][gridAxis="col"]',
        style: {
            "font-size": 10,
            "text-wrap": "wrap",
        }
    });

    // Ensure real nodes/edges above grid
    ss.push({selector: 'edge[!isGrid]', style: {"z-index": 5}});
    ss.push({selector: 'node[!isGrid]', style: {"z-index": 10}});

    // Node color mode (do NOT affect grid)
    if (nodeColorMode !== "none") {
        ss.push({
            selector: 'node[!isGrid][_nodeColor]',
            style: {"background-color": "data(_nodeColor)"},
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

    // --- Focus mode (selection spotlight) ---

// Dim everything else
    ss.push({
        selector: "node[!isGrid].dim",
        style: {
            opacity: 0.10,
            "text-opacity": 0.0,
        },
    });
    ss.push({
        selector: "edge[!isGrid].dim",
        style: {
            opacity: 0.08,
        },
    });

// Secondary emphasis: neighbors + connected edges
    ss.push({
        selector: "node[!isGrid].neighbor",
        style: {
            opacity: 0.55,
            "text-opacity": 1,
            "border-width": 2,
            "border-color": "rgba(47, 128, 237, 0.55)",
        },
    });
    ss.push({
        selector: "edge[!isGrid].connected",
        style: {
            opacity: 0.75,
            width: 3,
            "z-index": 50,
        },
    });

// Primary emphasis: selected node
    ss.push({
        selector: "node[!isGrid].selected",
        style: {
            opacity: 1,
            "text-opacity": 1,
            "border-width": 5,
            "border-color": "#2f80ed",
            "z-index": 100,
        },
    });

    cy.style(ss);
}

function asSet(x) {
    return x instanceof Set ? x : new Set();
}

export function recomputeVisibility(
    cy,
    {allowedOrgCategories, allowedGeos, allowedRelTypes, prune = true} = {}
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
    cy.layout({name, animate: true, animationDuration: 300}).run();
}
