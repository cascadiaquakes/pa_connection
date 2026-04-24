export function initSelectionHighlight(cy) {
    const clear = () => {
        cy.batch(() => {
            cy.nodes("[!isGrid]").removeClass("selected neighbor dim");
            cy.edges("[!isGrid]").removeClass("connected dim");
        });
    };

    const apply = () => {
        const selNodes = cy.nodes(":selected[!isGrid]").filter(
            (n) => n.style("display") !== "none"
        );
        const selEdges = cy.edges(":selected[!isGrid]").filter(
            (e) => e.style("display") !== "none"
        );

        if (selNodes.length === 0 && selEdges.length === 0) {
            clear();
            return;
        }

        cy.batch(() => {
            cy.nodes("[!isGrid]").addClass("dim").removeClass("selected neighbor");
            cy.edges("[!isGrid]").addClass("dim").removeClass("connected");

            if (selNodes.length > 0) {
                const connectedEdges = selNodes
                    .connectedEdges("[!isGrid]")
                    .filter((e) => e.style("display") !== "none");

                const neighborNodes = connectedEdges
                    .connectedNodes("[!isGrid]")
                    .filter((n) => n.style("display") !== "none")
                    .difference(selNodes);

                connectedEdges.removeClass("dim").addClass("connected");
                neighborNodes.removeClass("dim").addClass("neighbor");
                selNodes.removeClass("dim neighbor").addClass("selected");
            } else if (selEdges.length > 0) {
                const endpoints = selEdges
                    .connectedNodes("[!isGrid]")
                    .filter((n) => n.style("display") !== "none");

                selEdges.removeClass("dim").addClass("connected");
                endpoints.removeClass("dim").addClass("neighbor");
            }
        });
    };

    cy.on("select unselect", "node, edge", apply);

    cy.on("tap", (evt) => {
        if (evt.target === cy) apply();
    });

    apply();
}

function nodeMatchesValue(n, arrayKey, primaryKey, value) {
    const values = n.data(arrayKey);
    if (Array.isArray(values)) {
        return values.map((v) => String(v ?? "")).includes(String(value));
    }
    return String(n.data(primaryKey) ?? "") === String(value);
}

export function applySelectionBuckets(cy, selectionSpecs = [], selectionState = {}) {
    const activeSpecs = selectionSpecs.filter((spec) => {
        const selectedValues = selectionState[spec.stateKey];
        return selectedValues instanceof Set && selectedValues.size > 0;
    });

    const selectedNodes = cy.nodes("[!isGrid]").filter((n) => {
        if (n.style("display") === "none") return false;
        if (activeSpecs.length === 0) return false;

        return activeSpecs.every((spec) => {
            const selectedValues = selectionState[spec.stateKey];

            return Array.from(selectedValues).some((value) =>
                nodeMatchesValue(n, spec.arrayKey, spec.primaryKey, value)
            );
        });
    });

    cy.batch(() => {
        cy.elements(":selected").unselect();
        if (selectedNodes.length > 0) selectedNodes.select();
    });

    return selectedNodes;
}

/**
 * Return visible, non-grid nodes belonging to a row/column bucket.
 *
 * axis:
 *   - "col" => match node.data("orgTypePrimary")
 *   - "row" => match node.data("geoPrimary")
 */
export function getVisibleNodesForHeader(cy, { axis, key }) {
    return cy.nodes("[!isGrid]").filter((n) => {
        if (n.style("display") === "none") return false;

        if (axis === "col") return String(n.data("orgTypePrimary") ?? "Unknown") === String(key);
        if (axis === "row") return String(n.data("geoPrimary") ?? "Unknown") === String(key);

        return false;
    });
}

/**
 * Clear current selection and select all visible nodes in the clicked header bucket.
 * This reuses the existing Cytoscape selection state, which initSelectionHighlight()
 * already listens to.
 */
export function selectNodesFromHeader(
    cy,
    { axis, key, fit = false, padding = 40 } = {}
) {
    const nodes = getVisibleNodesForHeader(cy, { axis, key });

    cy.batch(() => {
        cy.elements(":selected").unselect();

        if (nodes.length > 0) {
            nodes.select();
        }
    });

    if (fit && nodes.length > 0) {
        cy.fit(nodes, padding);
    }

    return nodes;
}
