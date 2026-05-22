import { renderEmptyState, renderMultiSelection } from "./infoRender.js";
import { renderNodeInfo, renderNodeSummary } from "./nodeInfo.js";
import { renderEdgeInfo, renderEdgeSummary } from "./edgeInfo.js";

function selectSingleNode(cy, nodeId) {
    cy.batch(() => {
        cy.elements(":selected").unselect();
        const node = cy.getElementById(nodeId);
        if (node.nonempty()) {
            node.select();
            cy.animate({
                center: { eles: node },
                duration: 250,
            });
        }
    });
}

export function initSelectionInfo(
    cy,
    {
        selectionElId = "infoSelection",
        modalSelectionElId = "infoModalSelection",
    } = {}
) {
    const el = document.getElementById(selectionElId);
    const modalEl = document.getElementById(modalSelectionElId);
    if (!el || !modalEl) {
        console.warn("[selectionInfo] Missing selection info elements; skipping initSelectionInfo()");
        return;
    }

    modalEl.addEventListener("click", (evt) => {
        const trigger = evt.target.closest("[data-select-node-id]");
        if (!trigger) return;

        const nodeId = trigger.getAttribute("data-select-node-id");
        if (!nodeId) return;

        evt.preventDefault();
        selectSingleNode(cy, nodeId);
    });

    const render = () => {
        const selNodes = cy.nodes(":selected").filter("[!isGrid]");
        const selEdges = cy.edges(":selected").filter("[!isGrid]");

        const total = selNodes.length + selEdges.length;

        if (total === 0) {
            const empty = renderEmptyState();
            el.innerHTML = empty;
            modalEl.innerHTML = empty;
            return;
        }

        if (total > 1) {
            const multi = renderMultiSelection(selNodes, selEdges);
            el.innerHTML = multi;
            modalEl.innerHTML = multi;
            return;
        }

        if (selNodes.length === 1) {
            el.innerHTML = renderNodeSummary(selNodes[0]);
            modalEl.innerHTML = renderNodeInfo(selNodes[0]);
            return;
        }

        if (selEdges.length === 1) {
            el.innerHTML = renderEdgeSummary(selEdges[0]);
            modalEl.innerHTML = renderEdgeInfo(selEdges[0]);
            return;
        }

        const empty = renderEmptyState();
        el.innerHTML = empty;
        modalEl.innerHTML = empty;
    };

    render();

    cy.on("select unselect", "node, edge", render);

    cy.on("tap", (evt) => {
        if (evt.target === cy) render();
    });
}
