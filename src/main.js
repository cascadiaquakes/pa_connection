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
import { initSidebarTabs } from "./ui/tabs.js";
import {applyBoxPresetLayout} from "./graph/boxLayout.js";
import {addGridDecorations, updateGridHeaderColors} from "./graph/gridDecorations.js";
import { initGraphStatus, updateGraphStatus } from "./ui/graphStatus.js";
import {setEdgeColorData, setNodeColorData} from "./graph/graphColors.js";
import { initSelectionHighlight } from "./graph/selectionHighlight.js";
import { initSelectionInfo } from "./ui/selectionInfo.js";

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

        //  for debug
        window.cy = cy

        addGridDecorations(cy);
        applyBoxPresetLayout(cy);
        initSidebarTabs({ defaultTab: "settings" });
        initGraphStatus({
            totalNodes: nodes.length,
            totalEdges: edges.length,
            nodesUrl,
            edgesUrl,
        });
        initSelectionInfo(cy);
        initSelectionHighlight(cy);
        initControls(cy, {
            onChange: (state) => {
                const { nodeColorMode, edgeColorMode, allowedOrgCategories, allowedGeos, allowedRelTypes, prune } = state;
                setNodeColorData(cy, nodeColorMode);
                setEdgeColorData(cy, edgeColorMode);
                applyColorModes(cy, { nodeColorMode, edgeColorMode });
                recomputeVisibility(cy, { allowedOrgCategories, allowedGeos, allowedRelTypes, prune });
                runLayout(cy, "boxes");
                updateGridHeaderColors(cy, nodeColorMode);
                updateGraphStatus(cy, state);
            },
            onFit: () => cy.fit(undefined, 30),
            onLayout: (name) => runLayout(cy, name),
        });
    } catch (e) {
        showFatal(e);
    }
})();