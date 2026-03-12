import cytoscape from "cytoscape";
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