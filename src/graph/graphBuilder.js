import cytoscape from "cytoscape";
import cytoscapePopper from "cytoscape-popper";
import tippy from "tippy.js";
import "tippy.js/dist/tippy.css";
import {
    baseStylesheet,
    gridDecorationStyles,
    dynamicColorStyles,
    selectionStyles,
    edgeDisplayModeStyles,
} from "./styles.js";
import { applyBoxPresetLayout } from "./boxLayout.js";
import { addGridDecorations } from "./gridDecorations.js";
import { layoutConfig } from "../config/layoutConfig.js";
import { deriveGraphView } from "./graphViewData.js";

function tippyFactory(ref, content) {
    const dummyDomEle = document.createElement("div");

    return tippy(dummyDomEle, {
        getReferenceClientRect: ref.getBoundingClientRect,
        trigger: "manual",
        content,
        arrow: true,
        placement: "top",
        hideOnClick: false,
        interactive: true,
        appendTo: document.body,
    });
}

cytoscape.use(cytoscapePopper(tippyFactory));

function normalizeElements(elements) {
    if (Array.isArray(elements)) return elements;

    if (elements && Array.isArray(elements.nodes) && Array.isArray(elements.edges)) {
        return [...elements.nodes, ...elements.edges];
    }

    console.error("[graphBuilder] Invalid elements passed to createGraph:", elements);
    return [];
}

function buildStylesheet({ edgeDisplayMode }) {
    return [
        ...baseStylesheet(),
        ...gridDecorationStyles(),
        ...dynamicColorStyles(),
        ...selectionStyles(),
        ...edgeDisplayModeStyles(edgeDisplayMode),
    ];
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

    const selectedNodeIds = cy.nodes(":selected").map((n) => n.id());
    const selectedEdgeIds = cy.edges(":selected").map((e) => e.id());

    cy.batch(() => {
        cy.elements('[!isGrid]').remove();
        cy.add([...derived.nodes, ...derived.edges]);

        // make sure grid still exists; usually it already does
        if (cy.elements('[isGrid="true"]').length === 0 && gridElements.length > 0) {
            cy.add(gridElements);
        }

        cy.style(
            buildStylesheet({
                edgeDisplayMode: view.edgeDisplayMode ?? "simplified",
            })
        );

        selectedNodeIds.forEach((id) => {
            const node = cy.getElementById(id);
            if (node.nonempty()) node.select();
        });

        selectedEdgeIds.forEach((id) => {
            const edge = cy.getElementById(id);
            if (edge.nonempty()) edge.select();
        });
    });
}

function showGridDecorations(cy, show) {
    cy.elements('[isGrid = "true"]').forEach((ele) => {
        ele.style("display", show ? "element" : "none");
    });
}

function isVisible(ele) {
    return ele.style("display") !== "none";
}

function getVisibleWeightedDegree(node) {
    return node.connectedEdges()
        .filter((e) => isVisible(e))
        .reduce((sum, e) => {
            return sum + Number(e.data("weight") ?? 1);
        }, 0);
}

function applyNodeSizing(cy, { layoutMode } = {}) {
    const realNodes = cy.nodes('[isGrid != "true"]').filter((n) => isVisible(n));

    // Fixed size for boxed/grid layout
    if (layoutMode === "grid" || layoutMode === "boxes") {
        realNodes.forEach((n) => {
            n.style({
                width: 28,
                height: 28,
                "font-size": 10,
            });
        });
        return;
    }

    // Degree-scaled size for organic layout
    if (layoutMode === "organic") {
        const values = realNodes.map((n) => getVisibleWeightedDegree(n));
        const minVal = values.length ? Math.min(...values) : 0;
        const maxVal = values.length ? Math.max(...values) : 1;

        realNodes.forEach((n) => {
            const v = getVisibleWeightedDegree(n);

            const sqrtMin = Math.sqrt(minVal);
            const sqrtMax = Math.sqrt(maxVal);
            const sqrtV = Math.sqrt(v);

            const denom = (sqrtMax - sqrtMin) || 1;
            const t = maxVal > minVal ? (sqrtV - sqrtMin) / denom : 0;

            const size = 24 + t * 36; // 24..60

            n.style({
                width: size,
                height: size,
                "font-size": 10 + t * 4,
            });
        });
    }
}

export function runLayout(cy, name) {
    if (name === "boxes") {
        addGridDecorations(cy, layoutConfig);
        showGridDecorations(cy, true);
        applyNodeSizing(cy, { layoutMode: "grid" });
        applyBoxPresetLayout(cy, layoutConfig);
        return;
    }
    if (name === "organic") {
        showGridDecorations(cy, false);
        applyNodeSizing(cy, { layoutMode: "organic" });
        cy.layout({
            name: "cose",
            animate: true,
            animationDuration: 2000,
            fit: true,
            padding: 40,
            randomize: false,
            nodeRepulsion: 8000,
            idealEdgeLength: 120,
            edgeElasticity: 100,
            gravity: 0.8,
            numIter: 1000,
            componentSpacing: 80,
        }).run();

        return;
    }

    cy.layout({
        name,
        animate: true,
        animationDuration: 2000,
    }).run();
}