import cytoscape from "cytoscape";
import { baseStylesheet } from "./styles.js";
import { applyBoxPresetLayout } from "./boxLayout.js";
import { addGridDecorations } from "./gridDecorations.js";
import { layoutConfig } from "../config/layoutConfig.js";
import { deriveGraphView } from "./graphViewData.js";


function normalizeElements(elements) {
    if (Array.isArray(elements)) return elements;

    if (elements && Array.isArray(elements.nodes) && Array.isArray(elements.edges)) {
        return [...elements.nodes, ...elements.edges];
    }

    console.error("[graphBuilder] Invalid elements passed to createGraph:", elements);
    return [];
}

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

function edgeDirectionStyles() {
    return [
        {
            selector: 'edge[isAggregated = "true"]',
            style: {
                width: "data(_width)",
                "line-color": "#9aa0a6",
                "source-arrow-color": "#9aa0a6",
                "target-arrow-color": "#9aa0a6",
                "curve-style": "unbundled-bezier",
                "control-point-distances": 50,
                "control-point-weights": 0.5,

                "source-arrow-shape": "none",
                "target-arrow-shape": "none",
            },
        },
        {
            selector: 'edge[isAggregated = "true"][_dir = "forward"]',
            style: {
                "source-arrow-shape": "none",
                "target-arrow-shape": "triangle",
            },
        },
        {
            selector: 'edge[isAggregated = "true"][_dir = "reverse"]',
            style: {
                "source-arrow-shape": "triangle",
                "target-arrow-shape": "none",
            },
        },
        {
            selector: 'edge[isAggregated = "true"][_dir = "bidir"]',
            style: {
                "source-arrow-shape": "triangle",
                "target-arrow-shape": "triangle",
            },
        },
    ];
}

function buildStylesheet({ nodeColorMode, edgeDisplayMode }) {
    const ss = baseStylesheet();

    ss.push(...gridDecorationStyles());

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
        },
    });

    ss.push({ selector: 'edge[!isGrid]', style: { "z-index": 5 } });
    ss.push({ selector: 'node[!isGrid]', style: { "z-index": 10 } });

    if (nodeColorMode !== "none") {
        ss.push({
            selector: 'node[!isGrid][_nodeColor]',
            style: { "background-color": "data(_nodeColor)" },
        });
    }

    // Simplified mode: aggregated gray edges with arrows
    if (edgeDisplayMode === "simplified") {
        ss.push(...edgeDirectionStyles());
    }

    // Detailed mode: raw colored edges
    if (edgeDisplayMode === "detailed") {
        ss.push({
            selector: 'edge[!isGrid][_edgeColor]',
            style: {
                "line-color": "data(_edgeColor)",
                "source-arrow-color": "data(_edgeColor)",
                "target-arrow-color": "data(_edgeColor)",
            },
        });
    }

    // Focus mode
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

    return ss;
}

function splitGridAndReal(elements) {
    const normalized = normalizeElements(elements);

    const grid = [];
    const real = [];

    for (const el of normalized) {
        if (el?.data?.isGrid === "true") grid.push(el);
        else real.push(el);
    }

    return { grid, real };
}


export function createGraph({ container, elements, initialView = {} }) {
    const normalized = normalizeElements(elements);
    const { grid, real } = splitGridAndReal(normalized);

    const cy = cytoscape({
        container,
        elements: [...grid, ...real],
        style: buildStylesheet({
            nodeColorMode: initialView.nodeColorMode ?? "none",
            edgeDisplayMode: initialView.edgeDisplayMode ?? "simplified",
        }),
        layout: { name: "cose", animate: false },
    });

    cy.scratch("_rawElements", real);
    cy.scratch("_gridElements", grid);

    cy.edges().forEach((e) => {
        if (e.data("_missingEndpoint")) e.addClass("missingEndpoint");
    });

    return cy;
}

export function applyView(cy, view = {}) {
    const rawElements = cy.scratch("_rawElements") ?? [];
    const gridElements = cy.scratch("_gridElements") ?? [];

    const derived = deriveGraphView(rawElements, view);

    cy.batch(() => {
        cy.elements('[!isGrid]').remove();
        cy.add([...derived.nodes, ...derived.edges]);

        // make sure grid still exists; usually it already does
        if (cy.elements('[isGrid="true"]').length === 0 && gridElements.length > 0) {
            cy.add(gridElements);
        }

        cy.style(buildStylesheet({
            nodeColorMode: view.nodeColorMode ?? "none",
            edgeDisplayMode: view.edgeDisplayMode ?? "simplified",
        }));
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
