import { layoutConfig } from "./layoutConfig.js";

function uniq(arr) { return Array.from(new Set(arr)); }

function orderWithFallback(preferred, observed) {
    const out = [];
    const seen = new Set();
    for (const v of (preferred ?? [])) if (!seen.has(v)) { out.push(v); seen.add(v); }
    for (const v of observed) if (!seen.has(v)) { out.push(v); seen.add(v); }
    return out;
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

function toBreaks(values, weights, start, end, minFrac = 0.04) {
    const total = Array.from(weights.values()).reduce((a, b) => a + b, 0) || 1;
    let fracs = values.map(v => (weights.get(v) ?? 0) / total);

    fracs = fracs.map(f => Math.max(f, minFrac));
    const sum = fracs.reduce((a, b) => a + b, 0);
    fracs = fracs.map(f => f / sum);

    const span = end - start;
    const breaks = [start];
    let acc = start;
    for (let i = 0; i < values.length; i++) {
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

export function addGridDecorations(cy, cfg = layoutConfig) {
    const { bounds, orgTypeOrder, geoOrder } = cfg;

    // Prefer visible-only; if empty, fall back to all real nodes
    let nodes = cy.nodes('node[!isGrid]:visible');
    if (nodes.length === 0) nodes = cy.nodes('node[!isGrid]');

    const orgObs = uniq(nodes.map(n => String(n.data("orgTypePrimary") ?? "Unknown")));
    const geoObs = uniq(nodes.map(n => String(n.data("geoPrimary") ?? "Unknown")));

    const orgValues = orderObservedOnly(orgTypeOrder, new Set(orgObs));
    const geoValues = orderObservedOnly(geoOrder, new Set(geoObs));

    const orgW = computeWeightsFromNodes(nodes, orgValues, (n) => n.data("orgTypePrimary"));
    const geoW = computeWeightsFromNodes(nodes, geoValues, (n) => n.data("geoPrimary"));

    const xBreaks = toBreaks(orgValues, orgW, bounds.x0, bounds.x1, cfg.minColFrac ?? 0.05);
    const yBreaks = toBreaks(geoValues, geoW, bounds.y0, bounds.y1, cfg.minRowFrac ?? 0.06);

    // wipe old decorations
    cy.remove(cy.elements('[isGrid="true"]'));

    const els = [];

    const addPoint = (id, x, y) => els.push({
        data: { id, isGrid: "true", isGridPoint: "true" },
        position: { x, y },
        selectable: false,
        grabbable: false,
        locked: true,
    });

    const addLine = (id, a, b) => els.push({
        data: { id, source: a, target: b, isGrid: "true", isGridLine: "true" },
        selectable: false,
    });

    // vertical lines
    for (let i = 0; i < xBreaks.length; i++) {
        const x = xBreaks[i];
        const a = `grid_v_${i}_a`, b = `grid_v_${i}_b`;
        addPoint(a, x, bounds.y0);
        addPoint(b, x, bounds.y1);
        addLine(`grid_v_${i}`, a, b);
    }

    // horizontal lines
    for (let i = 0; i < yBreaks.length; i++) {
        const y = yBreaks[i];
        const a = `grid_h_${i}_a`, b = `grid_h_${i}_b`;
        addPoint(a, bounds.x0, y);
        addPoint(b, bounds.x1, y);
        addLine(`grid_h_${i}`, a, b);
    }

    // column headers
    for (let ix = 0; ix < orgValues.length; ix++) {
        const x = (xBreaks[ix] + xBreaks[ix + 1]) / 2;
        const y = bounds.y0 - 35;
        els.push({
            data: { id: `grid_col_${ix}`, label: orgValues[ix], isGrid: "true", isGridHeader: "true" },
            position: { x, y },
            selectable: false,
            grabbable: false,
            locked: true,
        });
    }

    // row headers
    for (let iy = 0; iy < geoValues.length; iy++) {
        const x = bounds.x0 - 70;
        const y = (yBreaks[iy] + yBreaks[iy + 1]) / 2;
        els.push({
            data: { id: `grid_row_${iy}`, label: geoValues[iy], isGrid: "true", isGridHeader: "true" },
            position: { x, y },
            selectable: false,
            grabbable: false,
            locked: true,
        });
    }

    cy.add(els);

    return { orgValues, geoValues, xBreaks, yBreaks };
}