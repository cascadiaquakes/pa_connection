import { visualSpec } from "./visualSpec.js";

export const layoutConfig = {
    scope: "visible",
    bounds: { x0: 120, y0: 120, x1: 1180, y1: 780 },

    orgTypeOrder: visualSpec.nodes.orgCat.order,
    geoOrder: visualSpec.nodes.geo.order,

    minColFrac: 0.05,
    minRowFrac: 0.06,

    jitter: { x: 18, y: 12, seed: 1337 },
};