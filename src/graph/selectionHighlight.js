export function initSelectionHighlight(cy) {
    const clear = () => {
        cy.batch(() => {
            cy.nodes("[!isGrid]").removeClass("selected neighbor dim");
            cy.edges("[!isGrid]").removeClass("connected dim");
        });
    };

    const apply = () => {
        const selNodes = cy.nodes(":selected[!isGrid]");
        const selEdges = cy.edges(":selected[!isGrid]");

        // Nothing selected → normal graph
        if (selNodes.length === 0 && selEdges.length === 0) {
            clear();
            return;
        }

        cy.batch(() => {
            // Dim everything first
            cy.nodes("[!isGrid]").addClass("dim").removeClass("selected neighbor");
            cy.edges("[!isGrid]").addClass("dim").removeClass("connected");

            if (selNodes.length > 0) {
                const connectedEdges = selNodes.connectedEdges("[!isGrid]");
                const neighborNodes = connectedEdges.connectedNodes("[!isGrid]");

                connectedEdges.removeClass("dim").addClass("connected");
                neighborNodes.removeClass("dim").addClass("neighbor");

                // Selected nodes strongest
                selNodes.removeClass("dim neighbor").addClass("selected");
            } else if (selEdges.length > 0) {
                // Edge-only selection: emphasize selected edges + endpoints
                selEdges.removeClass("dim").addClass("connected");
                const endpoints = selEdges.connectedNodes("[!isGrid]");
                endpoints.removeClass("dim").addClass("neighbor");
            }
        });
    };

    cy.on("select unselect", "node, edge", apply);

    // clicking background often clears selection; re-apply to clear dimming
    cy.on("tap", (evt) => {
        if (evt.target === cy) apply();
    });

    apply();
}