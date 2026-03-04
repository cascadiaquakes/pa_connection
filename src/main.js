import "./style.css";

import { loadWorkbookRows } from "./data/dataloader.js";
import { buildElementsFromRows } from "./data/transforms.js";
import {
    createGraph,
    applyColorModes,
    runLayout,
    recomputeVisibility,
} from "./graph/graphBuilder.js";
import { initControls } from "./ui/controls.js";

function showFatal(err) {
    console.error(err);
    const el = document.createElement("pre");
    el.style.padding = "12px";
    el.style.whiteSpace = "pre-wrap";
    el.textContent = `FATAL:\n${err?.stack || err}`;
    document.body.prepend(el);
}

(async function main() {
    try {
        const url = `${import.meta.env.BASE_URL}data/datav2.xlsx`;

        const loaded = await loadWorkbookRows({
            url,
            nodesSheet: "in",
            edgesSheet: "Relationships",
        });

        console.log("[main] loadWorkbookRows returned:", loaded);

        const nodeRows = loaded?.nodeRows ?? [];
        const edgeRows = loaded?.edgeRows ?? [];

        console.log("[main] nodeRows:", nodeRows.length, "edgeRows:", edgeRows.length);

        const { nodes, edges, diagnostics } = buildElementsFromRows(nodeRows, edgeRows);

        console.log("[main] elements:", { nodes: nodes.length, edges: edges.length, diagnostics });

        const cy = createGraph({
            container: document.getElementById("cy"),
            elements: { nodes, edges },
        });

        initControls(cy, {
            onChange: ({
                           nodeColorMode,
                           edgeColorMode,
                           allowedOrgCategories,
                           allowedGeos,
                           allowedRelTypes,
                       }) => {
                applyColorModes(cy, { nodeColorMode, edgeColorMode });
                recomputeVisibility(cy, { allowedOrgCategories, allowedGeos, allowedRelTypes });
            },
            onFit: () => cy.fit(undefined, 30),
            onLayout: (name) => runLayout(cy, name),
        });
    } catch (e) {
        showFatal(e);
    }
})();