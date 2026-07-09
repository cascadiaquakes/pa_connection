export function clearGraphSelection(cy) {
    cy.elements(":selected").unselect();
}

export function replaceGraphSelection(
    cy,
    elements,
    {
        center = false,
        fit = false,
        padding = 40,
        duration = 250,
    } = {}
) {
    cy.batch(() => {
        clearGraphSelection(cy);
        if (elements?.length > 0) elements.select();
    });

    if (elements?.length > 0 && fit) {
        cy.fit(elements, padding);
    } else if (elements?.length > 0 && center) {
        cy.animate({
            center: { eles: elements },
            duration,
        });
    }

    return elements;
}

export function selectNodeById(cy, nodeId, options = {}) {
    const node = cy.getElementById(nodeId);
    if (!node.nonempty()) return node;
    return replaceGraphSelection(cy, node, options);
}
