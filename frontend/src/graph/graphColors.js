import { visualSpec } from "../config/visualSpec.js";

function stableColorFromString(str) {
    // Keep as deterministic fallback for new categories the spec doesn't know yet.
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    const hue = h % 360;
    return `hsl(${hue}, 55%, 55%)`;
}

export function setNodeColorData(cy, nodeColorMode) {
    const spec = visualSpec.nodes[nodeColorMode];

    if (!spec) {
        cy.nodes("[!isGrid]").forEach((n) => n.removeData("_nodeColor"));
        return;
    }

    const { dataKey, colors, fallbackColor } = spec;

    cy.nodes("[!isGrid]").forEach((n) => {
        const value = (n.data(dataKey) ?? "").toString().trim();

        if (!value) {
            n.data("_nodeColor", fallbackColor ?? "#999");
            return;
        }

        // Prefer hard-coded color from spec
        const c = colors?.[value];
        if (c) {
            n.data("_nodeColor", c);
            return;
        }

        // Fallback for unexpected categories (keeps it deterministic)
        n.data("_nodeColor", stableColorFromString(value));
    });
}

export function setEdgeColorData(cy, edgeColorMode) {
    const spec = visualSpec.edges[edgeColorMode];

    if (!spec) {
        cy.edges("[!isGrid]").forEach((e) => e.removeData("_edgeColor"));
        return;
    }

    const { dataKey, colors, fallbackColor } = spec;

    cy.edges("[!isGrid]").forEach((e) => {
        const value = (e.data(dataKey) ?? "").toString().trim();
        if (!value) {
            e.data("_edgeColor", fallbackColor ?? "#999");
            return;
        }
        e.data("_edgeColor", colors?.[value] ?? stableColorFromString(value));
    });
}