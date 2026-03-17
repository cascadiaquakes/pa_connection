import { layoutConfig } from "../config/layoutConfig.js";

function toBreaks(values, weights, start, end, minFrac = 0.1) {
    // Allocate minimum fraction per band so tiny categories are still visible.
    const total = Array.from(weights.values()).reduce((a, b) => a + b, 0) || 1;
    const n = values.length || 1;

    // raw fractions
    let fracs = values.map((v) => (weights.get(v) ?? 0) / total);

    // enforce minimum, then renormalize
    fracs = fracs.map((f) => Math.max(f, minFrac));
    const sum = fracs.reduce((a, b) => a + b, 0);
    fracs = fracs.map((f) => f / sum);

    // cumulative breaks in absolute coordinates
    const span = end - start;
    const breaks = [start];
    let acc = start;
    for (let i = 0; i < n; i++) {
        acc += fracs[i] * span;
        breaks.push(acc);
    }

    // ensure exact end
    breaks[breaks.length - 1] = end;
    return breaks; // length n+1
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

function sortCellNodes(cellNodes) {
    return [...cellNodes].sort((a, b) => {
        const oa = a.data("visualOrder") ?? 1e9;
        const ob = b.data("visualOrder") ?? 1e9;
        if (oa !== ob) return oa - ob;

        const la = String(a.data("label") ?? a.data("name") ?? a.id());
        const lb = String(b.data("label") ?? b.data("name") ?? b.id());
        return la.localeCompare(lb);
    });
}

function computeCellGrid(innerW, innerH, k, cfg = {}) {
    const targetCellW = cfg.targetCellW ?? 80;
    const targetCellH = cfg.targetCellH ?? 52;
    const maxCols = cfg.maxCols ?? 12;
    const maxRows = cfg.maxRows ?? 12;

    let cols = Math.max(1, Math.min(maxCols, Math.floor(innerW / targetCellW)));
    let rows = Math.max(1, Math.min(maxRows, Math.floor(innerH / targetCellH)));

    // If the box is too small relative to target size, we still need at least 1x1.
    cols = Math.max(1, cols);
    rows = Math.max(1, rows);

    // Make sure capacity can hold all nodes.
    while (cols * rows < k) {
        const nextColDx = innerW / (cols + 1);
        const nextRowDy = innerH / (rows + 1);

        const colPenalty = Math.abs(nextColDx - targetCellW);
        const rowPenalty = Math.abs(nextRowDy - targetCellH);

        if (cols >= maxCols && rows < maxRows) {
            rows += 1;
        } else if (rows >= maxRows && cols < maxCols) {
            cols += 1;
        } else if (cols < maxCols && (rowPenalty > colPenalty || rows >= maxRows)) {
            cols += 1;
        } else if (rows < maxRows) {
            rows += 1;
        } else {
            // Safety valve: if both maxed out, stop growing.
            break;
        }
    }

    // If we somehow ended up with lots of extra unused space, trim gently.
    while (rows > 1 && cols * (rows - 1) >= k) rows -= 1;
    while (cols > 1 && (cols - 1) * rows >= k) cols -= 1;

    const dx = innerW / cols;
    const dy = innerH / rows;

    return { cols, rows, dx, dy };
}

export function applyBoxPresetLayout(cy, cfg = layoutConfig) {
    const { bounds, orgTypeOrder, geoOrder } = cfg;

    // Prefer visible-only; if empty, fall back to all real nodes
    let nodes = cy.nodes("node[!isGrid]:visible");
    if (nodes.length === 0) nodes = cy.nodes("node[!isGrid]");

    // observed categories from chosen scope
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
    const yBreaks = toBreaks(geoValues, geoW, bounds.y0, bounds.y1, cfg.minRowFrac ?? 0.05);

    const xIndex = new Map(orgValues.map((v, i) => [v, i]));
    const yIndex = new Map(geoValues.map((v, i) => [v, i]));

    cy.batch(() => {
        // Group nodes by cell
        const cellMap = new Map(); // key -> array of nodes

        nodes.forEach((n) => {
            const orgType = String(n.data("orgTypePrimary") ?? "Unknown");
            const geo = String(n.data("geoPrimary") ?? "Unknown");
            const ix = xIndex.get(orgType) ?? 0;
            const iy = yIndex.get(geo) ?? 0;
            const key = `${ix}::${iy}`;
            if (!cellMap.has(key)) cellMap.set(key, []);
            cellMap.get(key).push(n);
        });

        // Place nodes within each cell using a geometry-driven grid
        for (const [key, rawCellNodes] of cellMap.entries()) {
            const [ixStr, iyStr] = key.split("::");
            const ix = Number(ixStr);
            const iy = Number(iyStr);

            const x0 = xBreaks[ix];
            const x1 = xBreaks[ix + 1];
            const y0 = yBreaks[iy];
            const y1 = yBreaks[iy + 1];

            const cellW = Math.max(1, x1 - x0);
            const cellH = Math.max(1, y1 - y0);

            // padding inside the box so nodes do not sit on the border lines
            const padX = Math.min(cfg.cellPadding.x ?? 24, cellW * (cfg.cellPadding.xFrac ?? 0.12));
            const padY = Math.min(cfg.cellPadding.y ?? 20, cellH * (cfg.cellPadding.yFrac ?? 0.12));

            const xmin = x0 + padX;
            const xmax = x1 - padX;
            const ymin = y0 + padY;
            const ymax = y1 - padY;

            const innerW = Math.max(1, xmax - xmin);
            const innerH = Math.max(1, ymax - ymin);

            const cellNodes = sortCellNodes(rawCellNodes);
            const k = cellNodes.length;
            if (k === 0) continue;

            const { cols, rows, dx, dy } = computeCellGrid(
                innerW,
                innerH,
                k,
                cfg.nodeGrid ?? {}
            );

            for (let idx = 0; idx < k; idx++) {
                const n = cellNodes[idx];

                const r = Math.floor(idx / cols);
                const idxInRow = idx % cols;

                const isLastRow = r === rows - 1;
                const itemsInThisRow = isLastRow ? (k - r * cols) : cols;
                const rowOffset = (cols - itemsInThisRow) / 2;
                const c = rowOffset + idxInRow;

                const x = xmin + (c + 0.5) * dx;
                const y = ymin + (r + 0.5) * dy;

                n.position({ x, y });
            }
        }
    });

    // preset doesn't move nodes; run to refresh internals, then fit visible (or all if none)
    cy.layout({ name: "preset", fit: false, animate: false }).run();
    const fitEles = cy.elements(":visible").length ? cy.elements(":visible") : cy.elements();
    cy.fit(fitEles, 30);

    return { orgValues, geoValues, xBreaks, yBreaks };
}