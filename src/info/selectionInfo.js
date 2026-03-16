import { renderEmptyState, renderMultiSelection } from "./infoRender.js";
import { renderNodeInfo } from "./nodeInfo.js";
import { renderEdgeInfo } from "./edgeInfo.js";

export function initSelectionInfo(cy, { selectionElId = "infoSelection" } = {}) {
    const el = document.getElementById(selectionElId);
    if (!el) {
        console.warn(`[selectionInfo] #${selectionElId} not found; skipping initSelectionInfo()`);
        return;
    }

    const render = () => {
        const selNodes = cy.nodes(":selected").filter("[!isGrid]");
        const selEdges = cy.edges(":selected").filter("[!isGrid]");

        const total = selNodes.length + selEdges.length;

        if (total === 0) {
            el.innerHTML = renderEmptyState();
            return;
        }

        if (total > 1) {
            el.innerHTML = renderMultiSelection(selNodes, selEdges);
            return;
        }

        if (selNodes.length === 1) {
            el.innerHTML = renderNodeInfo(selNodes[0]);
            return;
        }

        if (selEdges.length === 1) {
            el.innerHTML = renderEdgeInfo(selEdges[0]);
            return;
        }

        el.innerHTML = renderEmptyState();
    };

    render();

    cy.on("select unselect", "node, edge", render);

    cy.on("tap", (evt) => {
        if (evt.target === cy) render();
    });
}