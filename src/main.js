import "./style.css";

import { loadCsvRows } from "./data/dataloader.js";
import { buildElementsFromRows } from "./data/transforms.js";
import {
    createGraph,
    applyColorModes,
    runLayout,
    recomputeVisibility,
} from "./graph/graphBuilder.js";
import { initControls } from "./ui/controls.js";
import {applyBoxPresetLayout} from "./graph/boxLayout.js";
import { addGridDecorations } from "./graph/gridDecorations.js";


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
        const base = import.meta.env.BASE_URL || "/";

        // Files live in: public/data/*.csv  => served as: <BASE_URL>/data/*.csv
        const nodesUrl = `${base}data/organizations_clean.csv`;
        const edgesUrl = `${base}data/edges_clean.csv`;

        const loaded = await loadCsvRows({ nodesUrl, edgesUrl });

        console.log("[main] loadCsvRows returned:", loaded);

        const nodeRows = loaded?.nodeRows ?? [];
        const edgeRows = loaded?.edgeRows ?? [];

        console.log("[main] nodeRows:", nodeRows.length, "edgeRows:", edgeRows.length);

        const { nodes, edges, diagnostics } = buildElementsFromRows(nodeRows, edgeRows);

        console.log("[main] elements:", { nodes: nodes.length, edges: edges.length, diagnostics });

        const cy = createGraph({
            container: document.getElementById("cy"),
            elements: { nodes, edges },
        });

        addGridDecorations(cy);
        applyBoxPresetLayout(cy);

        initControls(cy, {
            onChange: ({ nodeColorMode, edgeColorMode, allowedOrgCategories, allowedGeos, allowedRelTypes, prune }) => {
                applyColorModes(cy, { nodeColorMode, edgeColorMode });
                recomputeVisibility(cy, { allowedOrgCategories, allowedGeos, allowedRelTypes, prune });
                runLayout(cy, "boxes");
            },
            onFit: () => cy.fit(undefined, 30),
            onLayout: (name) => runLayout(cy, name),
        });
    } catch (e) {
        showFatal(e);
    }
})();