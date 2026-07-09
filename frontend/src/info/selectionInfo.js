import {
    renderEmptyState,
    renderMultiSelection,
    setRenderedHtml,
} from "./infoRender.js";
import { renderNodeInfo, renderNodeSummary } from "./nodeInfo.js";
import { renderEdgeInfo, renderEdgeSummary } from "./edgeInfo.js";
import { selectNodeById } from "../graph/graphSelection.js";

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
        selectNodeById(cy, nodeId, { center: true });
    });

    const render = () => {
        const selNodes = cy.nodes(":selected").filter("[!isGrid]");
        const selEdges = cy.edges(":selected").filter("[!isGrid]");

        const total = selNodes.length + selEdges.length;

        if (total === 0) {
            const empty = renderEmptyState();
            setRenderedHtml(el, empty);
            setRenderedHtml(modalEl, empty);
            return;
        }

        if (total > 1) {
            const multi = renderMultiSelection(selNodes, selEdges);
            setRenderedHtml(el, multi);
            setRenderedHtml(modalEl, multi);
            return;
        }

        if (selNodes.length === 1) {
            setRenderedHtml(el, renderNodeSummary(selNodes[0]));
            setRenderedHtml(modalEl, renderNodeInfo(selNodes[0]));
            return;
        }

        if (selEdges.length === 1) {
            setRenderedHtml(el, renderEdgeSummary(selEdges[0]));
            setRenderedHtml(modalEl, renderEdgeInfo(selEdges[0]));
            return;
        }

        const empty = renderEmptyState();
        setRenderedHtml(el, empty);
        setRenderedHtml(modalEl, empty);
    };

    render();

    cy.on("select unselect", "node, edge", render);

    cy.on("tap", (evt) => {
        if (evt.target === cy) render();
    });
}
