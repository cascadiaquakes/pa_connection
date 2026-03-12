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