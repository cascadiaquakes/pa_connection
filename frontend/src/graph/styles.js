import { visualSpec } from "../config/visualSpec.js";

function nodeShapeStyles() {
    const spec = visualSpec.nodeShapes;

    return Object.entries(spec.shapes ?? {})
        .filter(([value]) => value !== "Other")
        .map(([value, shape]) => ({
            selector: `node[!isGrid][nodeTypePrimary = "${value}"], node[!isGrid][nodeType = "${value}"]`,
            style: { shape },
        }));
}

export function baseStylesheet() {
    return [
        {
            selector: "node[label]",
            style: {
                "background-color": "#888",
                label: "data(label)",

                shape: "ellipse",

                "font-size": 10,
                color: "#111",
                "text-outline-width": 2,
                "text-outline-color": "#fff",
                "text-valign": "center",
                "text-halign": "center",

                width: 40,
                height: 25,

                // smooth focus transitions
                "transition-property": "opacity, border-width, text-opacity",
                "transition-duration": "150ms",
            },
        },
        ...nodeShapeStyles(),
        {
            selector: "node[!isGrid][!nodeTypePrimary][!nodeType]",
            style: {
                shape: visualSpec.nodeShapes.fallbackShape,
                width: 32,
                height: 32,
            },
        },
        {
            selector: "edge",
            style: {
                width: 2,
                "line-color": "#bbb",
                "target-arrow-color": "#bbb",
                "target-arrow-shape": "triangle",
                "curve-style": "bezier",

                // smooth highlight transitions
                "transition-property": "opacity, width",
                "transition-duration": "150ms",
            },
        },
        {
            selector: ":selected",
            style: {
                "border-width": 3,
                "border-color": "#222",
                "line-color": "#222",
                "target-arrow-color": "#222",
            },
        },
        {
            selector: ".missingEndpoint",
            style: {
                "line-style": "dashed",
            },
        },
    ];
}

export function gridDecorationStyles() {
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
                "font-size": 15,

                "text-wrap": "wrap",
                "text-max-width": "data(_w)",

                "text-valign": "center",
                "text-halign": "center",

                "background-color": "#d9dde3",
                "background-opacity": 0.45,
                "border-width": 0,

                color: "#222",
                "text-outline-width": 0,
                "text-outline-color": "transparent",
                "z-index": 0,
                "events": "yes",
                "text-events": "yes",
            },
        },
        {
            selector: 'node[isGridHeader][gridAxis="col"]',
            style: {
                "font-size": 15,
                "text-wrap": "wrap",
            },
        },
        { selector: 'edge[!isGrid]', style: { "z-index": 5 } },
        { selector: 'node[!isGrid]', style: { "z-index": 10 } },
    ];
}

export function dynamicColorStyles() {
    return [
        {
            selector: 'node[!isGrid][_nodeColor]',
            style: {
                "background-color": "data(_nodeColor)",
            },
        },
        {
            selector: 'edge[!isGrid][_edgeColor]',
            style: {
                "line-color": "data(_edgeColor)",
                "source-arrow-color": "data(_edgeColor)",
                "target-arrow-color": "data(_edgeColor)",
            },
        },
        {
            selector: 'node[isGridHeader][isGrid="true"][label][_gridColor]',
            style: {
                "background-color": "data(_gridColor)",
                "background-opacity": 0.35,
                "text-outline-width": 0,
                color: "#333",
            },
        },
    ];
}

export function edgeDirectionStyles() {
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

export function selectionStyles() {
    return [
        {
            selector: "node[!isGrid].dim",
            style: {
                opacity: 0.10,
                "text-opacity": 0.0,
            },
        },
        {
            selector: "edge[!isGrid].dim",
            style: {
                opacity: 0.08,
            },
        },
        {
            selector: "node[!isGrid].neighbor",
            style: {
                opacity: 0.75,
                "text-opacity": 1,
                "border-width": 2,
                "border-color": "rgba(47, 128, 237, 0.55)",
            },
        },
        {
            selector: "edge[!isGrid].connected",
            style: {
                opacity: 0.75,
                "z-index": 50,
            },
        },
        {
            selector: "node[!isGrid].selected",
            style: {
                opacity: 1,
                "text-opacity": 1,
                "border-width": 5,
                "border-color": "#2f80ed",
                "z-index": 100,
            },
        },
    ];
}

export function edgeDisplayModeStyles(edgeDisplayMode) {
    if (edgeDisplayMode === "simplified") {
        return edgeDirectionStyles();
    }

    if (edgeDisplayMode === "detailed") {
        return [
            {
                selector: 'edge[!isGrid][_edgeColor]',
                style: {
                    "line-color": "data(_edgeColor)",
                    "source-arrow-color": "data(_edgeColor)",
                    "target-arrow-color": "data(_edgeColor)",
                },
            },
        ];
    }

    return [];
}
