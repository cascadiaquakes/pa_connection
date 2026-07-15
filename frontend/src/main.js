import "./style.css";

import { loadGraphData } from "./data/dataloader.js";
import { publicAssetUrl } from "./data/publicAssets.js";
import {
    createGraph,
    runLayout,
    applyView
} from "./graph/graphBuilder.js";
import {initControls} from "./ui/controls.js";
import { NODE_SELECTION_SPECS } from "./config/nodeDimensions.js";
import {
    graphViewState,
    hasActiveSelectionFilters,
    nodeSelectionState,
    planAppStateUpdate,
} from "./config/appState.js";
import {initSidebarTabs} from "./ui/tabs.js";
import {updateGridHeaderColors, initGridHeaderInteractions} from "./graph/gridDecorations.js";
import {initGraphInfo, updateGraphInfo} from "./info/graphStatus.js";
import {setEdgeColorData, setNodeColorData} from "./graph/graphColors.js";
import {applySelectionBuckets, initSelectionHighlight} from "./graph/selectionHighlight.js";
import {initSelectionInfo} from "./info/selectionInfo.js";
import { showTooltip, hideTooltip } from "./graph/tooltips.js";
import { buildNodeSearchIndex } from "./graph/nodeSearch.js";
import { initSearchTab } from "./ui/searchTab.js";
import { initExportTab } from "./ui/exportTab.js";
import { initSidebarResize } from "./ui/sidebarResize.js";
import { updateNodeColorLegend, updateNodeShapeLegend } from "./ui/colorLegend.js";
import { initAboutModal, initInfoModal } from "./ui/infoModal.js";

function showFatal(err) {
    console.error(err);
    const el = document.createElement("pre");
    el.className = "fatal-error";
    el.textContent = `FATAL:\n${err?.stack || err}`;
    document.body.prepend(el);
}

function applyAppState(cy, state, controls, previousState = null) {
    const { nodeColorMode, edgeDisplayMode, layoutMode } = state;
    const update = planAppStateUpdate(previousState, state);

    if (update.viewChanged) {
        applyView(cy, graphViewState(state));
    }
    if (update.viewChanged || update.nodeColorChanged) {
        setNodeColorData(cy, nodeColorMode);
    }
    if (update.viewChanged) {
        setEdgeColorData(cy, edgeDisplayMode === "detailed" ? "relType" : "none");
    }

    if (update.viewChanged || update.selectionChanged) {
        const selectionState = nodeSelectionState(state);
        const selectedNodes = applySelectionBuckets(cy, NODE_SELECTION_SPECS, selectionState);
        controls?.setSelectionWarning({
            hasActiveSelectionFilters: hasActiveSelectionFilters(selectionState),
            matchCount: selectedNodes.length,
        });
    }

    if (update.requiresLayout) {
        runLayout(cy, layoutMode === "organic" ? "organic" : "boxes");
    }
    if (update.requiresLayout || update.nodeColorChanged) {
        updateGridHeaderColors(cy, nodeColorMode);
    }
    if (update.nodeColorChanged) {
        updateNodeColorLegend(cy, nodeColorMode);
    }
    if (update.viewChanged) {
        updateNodeShapeLegend(cy);
    }
    updateGraphInfo(cy, state);

    return update;
}

(async function main() {
    try {
        // Files live in public/data and are resolved relative to the served index.html.
        const graphUrl = publicAssetUrl("data/graph.json");
        console.log("[main] data URL:", graphUrl);

        const loaded = await loadGraphData({ graphUrl });
        const nodes = loaded?.nodes ?? [];
        const edges = loaded?.edges ?? [];
        const diagnostics = loaded?.diagnostics ?? null;

        console.log("[main] elements:", {
            nodes: nodes.length,
            edges: edges.length,
            diagnostics,
            source: loaded?.source,
            sourceUrl: loaded?.sourceUrl,
        });

        const rawElements = [...nodes, ...edges];
        const cy = createGraph({
            container: document.getElementById("cy"),
            elements: {nodes, edges},
        });
        initSidebarResize({
            onResize: () => {
                cy.resize();
            },
        });
        cy.scratch("_rawElements", rawElements);
        cy.scratch("_nodeSearchIndex", buildNodeSearchIndex(rawElements));

        //  for debug
        window.cy = cy;

        cy.on("mouseover", 'node[isGrid != "true"]', showTooltip);
        cy.on("mouseout", 'node[isGrid != "true"]', hideTooltip);
        initGridHeaderInteractions(cy, {fit: false, toggle: true});
        const sidebarTabs = initSidebarTabs({defaultTab: "controls"});
        initAboutModal();
        initInfoModal();
        initGraphInfo({
            totalNodes: nodes.length,
            totalEdges: edges.length,
            sourceUrl: loaded?.sourceUrl || "",
        });
        initSelectionInfo(cy);
        initSelectionHighlight(cy);
        cy.on("tap", 'node[isGrid != "true"], edge', () => {
            sidebarTabs.activate("info");
        });
        initSearchTab(cy);
        initExportTab(cy);
        let previousState = null;
        let controls;
        controls = initControls(cy, {
            onChange: (state) => {
                applyAppState(cy, state, controls, previousState);
                previousState = state;
            },
        });
        document.getElementById("btnResetControls")?.addEventListener("click", () => {
            controls.resetToFullView();
        });
        document.getElementById("btnResetFilters")?.addEventListener("click", () => {
            controls.resetToFullView();
        });
        cy.scratch("_controls", controls);
    } catch (e) {
        showFatal(e);
    }
})();
