import "./style.css";

import { loadGraphData } from "./data/dataloader.js";
import {
    createGraph,
    runLayout,
    applyView
} from "./graph/graphBuilder.js";
import {initControls} from "./ui/controls.js";
import {initSidebarTabs} from "./ui/tabs.js";
import {applyBoxPresetLayout} from "./graph/boxLayout.js";
import {addGridDecorations, updateGridHeaderColors, initGridHeaderInteractions} from "./graph/gridDecorations.js";
import {initGraphInfo, updateGraphInfo} from "./info/graphStatus.js";
import {setEdgeColorData, setNodeColorData} from "./graph/graphColors.js";
import {initSelectionHighlight} from "./graph/selectionHighlight.js";
import {initSelectionInfo} from "./info/selectionInfo.js";
import { showTooltip, hideTooltip } from "./graph/tooltips.js";
import { buildNodeSearchIndex } from "./graph/nodeSearch.js";
import { initSearchTab } from "./ui/searchTab.js";
import { initExportTab } from "./ui/exportTab.js";
import { initSidebarResize } from "./ui/sidebarResize.js";


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

        // Files live in: public/data/*  => served as: <BASE_URL>/data/*
        const graphUrl = `${base}data/graph.json`;
        const nodesUrl = `${base}data/organizations_clean.csv`;
        const edgesUrl = `${base}data/edges_clean.csv`;

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
        initSidebarTabs({defaultTab: "settings"});
        initGraphInfo({
            totalNodes: nodes.length,
            totalEdges: edges.length,
            nodesUrl: loaded?.sourceUrls?.graphUrl || loaded?.sourceUrls?.nodesUrl || "",
            edgesUrl: loaded?.sourceUrls?.edgesUrl || "",
        });
        initSelectionInfo(cy);
        initSelectionHighlight(cy);
        initSearchTab(cy);
        initExportTab(cy);
        const controls = initControls(cy, {
            onChange: (state) => {
                const {
                    nodeColorMode,
                    edgeDisplayMode,
                    allowedOrgCategories,
                    allowedGeos,
                    allowedRelTypes,
                    prune,
                    layoutMode
                } = state;

                setNodeColorData(cy, nodeColorMode);
                applyView(cy, {
                    allowedOrgCategories,
                    allowedGeos,
                    allowedRelTypes,
                    prune,
                    nodeColorMode,
                    edgeDisplayMode,
                    layoutMode
                });
                setEdgeColorData(cy, edgeDisplayMode === "detailed" ? "relType" : "none");
                runLayout(cy, layoutMode === "organic" ? "organic" : "boxes");
                updateGridHeaderColors(cy, nodeColorMode);
                updateGraphInfo(cy, state);
            },
        });
        cy.scratch("_controls", controls);
    } catch (e) {
        showFatal(e);
    }
})();
