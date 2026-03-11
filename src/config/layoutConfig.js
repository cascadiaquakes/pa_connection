import { visualSpec } from "./visualSpec.js";

export const layoutConfig = {
    bounds: { x0: 120, y0: 120, x1: 1180, y1: 780 },

    orgTypeOrder: visualSpec.nodes.orgCat.order,
    geoOrder: visualSpec.nodes.geo.order,

    minColFrac: 0.1,
    minRowFrac: 0.06,

    nodeGrid: {
        targetCellW: 80,
        targetCellH: 52,
        maxCols: 10,
        maxRows: 8
    },

    cellPadding: {
        x: 2,
        y: 2,
        xFrac: 0.12,
        yFrac: 0.12
    }
};