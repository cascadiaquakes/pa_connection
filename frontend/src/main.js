import "./style.css";

import { loadGraphData } from "./data/dataloader.js";
import { publicAssetUrl } from "./data/publicAssets.js";
import {
    createGraph,
    runLayout,
    applyView
} from "./graph/graphBuilder.js";
import {initControls, NODE_SELECTION_SPECS} from "./ui/controls.js";
import {initSidebarTabs} from "./ui/tabs.js";
import {applyBoxPresetLayout} from "./graph/boxLayout.js";
import {addGridDecorations, updateGridHeaderColors, initGridHeaderInteractions} from "./graph/gridDecorations.js";
import {initGraphInfo, updateGraphInfo} from "./info/graphStatus.js";
import {setEdgeColorData, setNodeColorData} from "./graph/graphColors.js";
import {applySelectionBuckets, initSelectionHighlight} from "./graph/selectionHighlight.js";
import {initSelectionInfo} from "./info/selectionInfo.js";
import { showTooltip, hideTooltip } from "./graph/tooltips.js";
import { buildNodeSearchIndex } from "./graph/nodeSearch.js";
import { initSearchTab } from "./ui/searchTab.js";
import { initExportTab } from "./ui/exportTab.js";
import { initSidebarResize } from "./ui/sidebarResize.js";
import { updateNodeColorLegend } from "./ui/colorLegend.js";
import { initInfoModal } from "./ui/infoModal.js";

function hasActiveSelectionFilters(selectionState) {
    return Object.values(selectionState).some((value) => value instanceof Set && value.size > 0);
}

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
        // Files live in public/data and are resolved relative to the served index.html.
        const graphUrl = publicAssetUrl("data/graph.json");
        const nodesUrl = publicAssetUrl("data/organizations_clean.csv");
        const edgesUrl = publicAssetUrl("data/edges_clean.csv");

        const loaded = await loadGraphData({ graphUrl, nodesUrl, edgesUrl, allowCsvFallback: true });
        const nodes = loaded?.nodes ?? [];
        const edges = loaded?.edges ?? [];
        const diagnostics = loaded?.diagnostics ?? null;

        console.log("[main] elements:", {
            nodes: nodes.length,
            edges: edges.length,
            diagnostics,
            source: loaded?.source,
            sourceUrls: loaded?.sourceUrls,
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
        addGridDecorations(cy);
        initGridHeaderInteractions(cy, {fit: false, toggle: true});
        applyBoxPresetLayout(cy);
        const sidebarTabs = initSidebarTabs({defaultTab: "controls"});
        initInfoModal();
        initGraphInfo({
            totalNodes: nodes.length,
            totalEdges: edges.length,
            nodesUrl: loaded?.sourceUrls?.graphUrl || loaded?.sourceUrls?.nodesUrl || "",
            edgesUrl: loaded?.sourceUrls?.edgesUrl || "",
        });
        initSelectionInfo(cy);
        initSelectionHighlight(cy);
        cy.on("tap", 'node[isGrid != "true"], edge', () => {
            sidebarTabs.activate("info");
        });
        initSearchTab(cy);
        initExportTab(cy);
        updateNodeColorLegend(cy, "orgCat");
        let controls;
        controls = initControls(cy, {
            onChange: (state) => {
                const {
                    nodeColorMode,
                    edgeDisplayMode,
                    allowedOrgCategories,
                    allowedGeos,
                    allowedNodeTypes,
                    allowedGovernanceLevels,
                    allowedFunctionalDomains,
                    allowedRoles,
                    allowedLifelines,
                    selectedOrgCategories,
                    selectedGeos,
                    selectedNodeTypes,
                    selectedGovernanceLevels,
                    selectedFunctionalDomains,
                    selectedRoles,
                    selectedLifelines,
                    selectedOrganizations,
                    allowedRelTypes,
                    prune,
                    layoutMode
                } = state;

                setNodeColorData(cy, nodeColorMode);
                applyView(cy, {
                    allowedOrgCategories,
                    allowedGeos,
                    allowedNodeTypes,
                    allowedGovernanceLevels,
                    allowedFunctionalDomains,
                    allowedRoles,
                    allowedLifelines,
                    allowedRelTypes,
                    prune,
                    nodeColorMode,
                    edgeDisplayMode,
                    layoutMode
                });
                setEdgeColorData(cy, edgeDisplayMode === "detailed" ? "relType" : "none");
                const selectionState = {
                    selectedOrgCategories,
                    selectedGeos,
                    selectedNodeTypes,
                    selectedGovernanceLevels,
                    selectedFunctionalDomains,
                    selectedRoles,
                    selectedLifelines,
                    selectedOrganizations,
                };
                const selectedNodes = applySelectionBuckets(cy, NODE_SELECTION_SPECS, selectionState);
                controls?.setSelectionWarning({
                    hasActiveSelectionFilters: hasActiveSelectionFilters(selectionState),
                    matchCount: selectedNodes.length,
                });
                runLayout(cy, layoutMode === "organic" ? "organic" : "boxes");
                updateGridHeaderColors(cy, nodeColorMode);
                updateNodeColorLegend(cy, nodeColorMode);
                updateGraphInfo(cy, state);
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
