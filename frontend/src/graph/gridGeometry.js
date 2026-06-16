import { layoutConfig } from "../config/layoutConfig.js";

function toBreaks(values, weights, start, end, minFrac = 0.1) {
    const total = Array.from(weights.values()).reduce((a, b) => a + b, 0) || 1;
    const n = values.length || 1;

    let fracs = values.map((v) => (weights.get(v) ?? 0) / total);
    fracs = fracs.map((f) => Math.max(f, minFrac));

    const sum = fracs.reduce((a, b) => a + b, 0) || 1;
    fracs = fracs.map((f) => f / sum);

    const span = end - start;
    const breaks = [start];
    let acc = start;

    for (let i = 0; i < n; i++) {
        acc += fracs[i] * span;
        breaks.push(acc);
    }

    breaks[breaks.length - 1] = end;
    return breaks;
}

function orderObservedOnly(preferred, observedSet) {
    const observed = Array.from(observedSet);
    const idx = new Map((preferred ?? []).map((v, i) => [v, i]));

    observed.sort((a, b) => {
        const ia = idx.has(a) ? idx.get(a) : 1e9;
        const ib = idx.has(b) ? idx.get(b) : 1e9;
        if (ia !== ib) return ia - ib;
        return a.localeCompare(b);
    });

    return observed;
}

function computeWeightsFromNodes(nodes, values, getKey) {
    const w = new Map(values.map((v) => [v, 0]));
    nodes.forEach((n) => {
        const k = String(getKey(n) ?? "Unknown");
        if (!w.has(k)) w.set(k, 0);
        w.set(k, (w.get(k) ?? 0) + 1);
    });
    return w;
}

function getLayoutNodes(cy) {
    let nodes = cy.nodes("node[!isGrid]:visible");
    if (nodes.length === 0) nodes = cy.nodes("node[!isGrid]");
    return nodes;
}

function getCellPadding(cfg, cellW = Infinity, cellH = Infinity) {
    return {
        x: Math.min(cfg.cellPadding?.x ?? 24, cellW * (cfg.cellPadding?.xFrac ?? 0.12)),
        y: Math.min(cfg.cellPadding?.y ?? 20, cellH * (cfg.cellPadding?.yFrac ?? 0.12)),
    };
}

export function computeCellGridForWidth(innerW, count, cfg = {}) {
    const preferredSlotW = cfg.targetCellW ?? 80;
    const minSlotW = Math.min(preferredSlotW, cfg.minCellW ?? 36);
    const slotH = cfg.targetCellH ?? 52;
    const maxCols = cfg.maxCols ?? 12;

    // Internal column count is width-driven:
    // 1. Assume slots may shrink down to `minSlotW`
    // 2. Fit as many columns as possible in the available box width
    // 3. Cap by `maxCols` and the number of nodes in the box
    const colsThatFitAtMin = Math.max(1, Math.floor(innerW / minSlotW));
    const cols = Math.max(1, Math.min(count || 1, maxCols, colsThatFitAtMin));
    const rows = Math.max(1, Math.ceil((count || 1) / cols));

    // The actual slot width used for positioning:
    // prefer `targetCellW`, but shrink when the box is narrower,
    // never going below `minCellW`.
    const slotW = Math.max(minSlotW, Math.min(preferredSlotW, innerW / cols));

    return { cols, rows, slotW, slotH };
}

export function computeGridGeometry(cy, cfg = layoutConfig) {
    const { bounds, orgTypeOrder, geoOrder } = cfg;
    const nodes = getLayoutNodes(cy);

    const observedOrg = [];
    const observedGeo = [];

    nodes.forEach((n) => {
        observedOrg.push(String(n.data("orgTypePrimary") ?? "Unknown"));
        observedGeo.push(String(n.data("geoPrimary") ?? "Unknown"));
    });

    const orgValues = orderObservedOnly(orgTypeOrder, new Set(observedOrg));
    const geoValues = orderObservedOnly(geoOrder, new Set(observedGeo));

    const orgW = computeWeightsFromNodes(nodes, orgValues, (n) => n.data("orgTypePrimary"));
    const geoW = computeWeightsFromNodes(nodes, geoValues, (n) => n.data("geoPrimary"));

    const xBreaks = toBreaks(orgValues, orgW, bounds.x0, bounds.x1, cfg.minColFrac ?? 0.05);
    const xIndex = new Map(orgValues.map((v, i) => [v, i]));
    const yIndex = new Map(geoValues.map((v, i) => [v, i]));

    const cellCounts = new Map();
    nodes.forEach((n) => {
        const orgType = String(n.data("orgTypePrimary") ?? "Unknown");
        const geo = String(n.data("geoPrimary") ?? "Unknown");
        const ix = xIndex.get(orgType) ?? 0;
        const iy = yIndex.get(geo) ?? 0;
        const key = `${ix}::${iy}`;
        cellCounts.set(key, (cellCounts.get(key) ?? 0) + 1);
    });

    const rowHeights = geoValues.map((_, iy) => {
        let required = cfg.minRowHeight ?? (cfg.nodeGrid?.targetCellH ?? 52) + 2 * (cfg.cellPadding?.y ?? 2);

        for (let ix = 0; ix < orgValues.length; ix++) {
            const cellW = Math.max(1, xBreaks[ix + 1] - xBreaks[ix]);
            const pad = getCellPadding(cfg, cellW, Infinity);
            const innerW = Math.max(1, cellW - 2 * pad.x);
            const count = cellCounts.get(`${ix}::${iy}`) ?? 0;
            const { rows, slotH } = computeCellGridForWidth(innerW, count, cfg.nodeGrid ?? {});

            // Row height is content-driven:
            // for each geography row, find the tallest cell implied by its node count,
            // then use that height for the entire row so nothing overlaps vertically.
            const cellHeight = 2 * pad.y + rows * slotH;
            required = Math.max(required, cellHeight);
        }

        return required;
    });

    const yBreaks = [bounds.y0];
    for (const rowHeight of rowHeights) {
        yBreaks.push(yBreaks[yBreaks.length - 1] + rowHeight);
    }

    const cells = new Map();
    for (let iy = 0; iy < geoValues.length; iy++) {
        for (let ix = 0; ix < orgValues.length; ix++) {
            const key = `${ix}::${iy}`;
            const x0 = xBreaks[ix];
            const x1 = xBreaks[ix + 1];
            const y0 = yBreaks[iy];
            const y1 = yBreaks[iy + 1];
            const width = Math.max(1, x1 - x0);
            const height = Math.max(1, y1 - y0);
            const padding = getCellPadding(cfg, width, height);
            const inner = {
                x0: x0 + padding.x,
                x1: x1 - padding.x,
                y0: y0 + padding.y,
                y1: y1 - padding.y,
            };
            inner.width = Math.max(1, inner.x1 - inner.x0);
            inner.height = Math.max(1, inner.y1 - inner.y0);

            const count = cellCounts.get(key) ?? 0;
            cells.set(key, {
                key,
                ix,
                iy,
                count,
                x0,
                x1,
                y0,
                y1,
                width,
                height,
                padding,
                inner,
                nodeGrid: computeCellGridForWidth(
                    inner.width,
                    count,
                    cfg.nodeGrid ?? {}
                ),
            });
        }
    }

    return {
        nodes,
        orgValues,
        geoValues,
        xBreaks,
        yBreaks,
        xIndex,
        yIndex,
        rowHeights,
        cells,
        bounds: {
            ...bounds,
            y1: yBreaks[yBreaks.length - 1] ?? bounds.y1,
        },
    };
}
