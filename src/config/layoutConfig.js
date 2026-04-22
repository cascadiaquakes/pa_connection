import { visualSpec } from "./visualSpec.js";

export const layoutConfig = {
    // Overall grid footprint in Cytoscape coordinates.
    // Increase `x1` to give every category column more width.
    // Increase `y1` only if you want more top/bottom room before scrolling.
    bounds: { x0: 120, y0: 120, x1: 1600, y1: 780 },
    // When true, the grid layout resets the viewport so the full grid fits on screen.
    // Turn this off if you prefer a fixed 1:1 zoom with manual scrolling/panning.
    fitToViewport: true,
    fitPadding: 30,
    viewportPadding: { top: 40, left: 40 },
    initialGridZoom: 1,

    orgTypeOrder: visualSpec.nodes.orgCat.order,
    geoOrder: visualSpec.nodes.geo.order,

    minColFrac: 0.1,

    // Floor for each geography row height.
    // Actual row height can grow beyond this when a crowded cell needs more node rows.
    minRowHeight: 56,

    // Actual rendered node size in the grid/boxes layout.
    nodeSize: 28,
    nodeFontSize: 10,

    nodeGrid: {
        // Preferred horizontal spacing per node slot inside a box.
        // Lower values make nodes pack more horizontally before a row wraps.
        targetCellW: 72,

        // Hard minimum slot width used when a box is narrow.
        // Lower this carefully: too small and nodes/labels will start to collide.
        minCellW: 32,

        // Vertical spacing per node slot. This directly affects computed row height.
        targetCellH: 52,

        // Upper bound on how many internal columns a single box may use.
        // Increase this if wide categories should spread out more horizontally.
        maxCols: 14
    },

    cellPadding: {
        // Padding between the cell border and the first/last node slot.
        x: 2,
        y: 2,
        xFrac: 0.12,
        yFrac: 0.12
    }
};
