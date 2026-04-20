import { layoutConfig } from "../config/layoutConfig.js";
import { visualSpec } from "../config/visualSpec.js";
import { selectNodesFromHeader } from "./selectionHighlight.js";


function uniq(arr) { return Array.from(new Set(arr)); }

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
        const x0 = xBreaks[ix];
        const x1 = xBreaks[ix + 1];
        const x = (x0 + x1) / 2;
        const y = bounds.y0 - 35;

        const colW = Math.max(60, x1 - x0);

        els.push({
            data: {
                id: `grid_col_${ix}`,
                label: orgValues[ix],
                isGrid: "true",
                isGridHeader: "true",
                gridAxis: "col",
                gridKey: orgValues[ix],
                _w: colW,
                _h: 30
            },
            position: { x, y },
            selectable: false,
            grabbable: false,
            locked: true,
        });
    }

    // row headers
    for (let iy = 0; iy < geoValues.length; iy++) {
        const y0 = yBreaks[iy];
        const y1 = yBreaks[iy + 1];
        const y = (y0 + y1) / 2;
        const x = bounds.x0 - 70;

        const rowH = Math.max(22, y1 - y0 - 6);

        els.push({
            data: {
                id: `grid_row_${iy}`,
                label: geoValues[iy],
                isGrid: "true",
                isGridHeader: "true",
                gridAxis: "row",
                gridKey: geoValues[iy],
                _w: 120, // left gutter width for row labels
                _h: rowH,
            },
            position: { x, y },
            selectable: false,
            grabbable: false,
            locked: true,
        });
    }

    cy.add(els);

    return { orgValues, geoValues, xBreaks, yBreaks };
}

export function initGridHeaderInteractions(cy, opts = {}) {
    const { fit = false, padding = 40, toggle = true } = opts;

    let activeHeaderId = null;

    cy.on("tap", 'node[isGridHeader = "true"][isGrid = "true"]', (evt) => {
        const header = evt.target;
        const axis = header.data("gridAxis");
        const key = header.data("gridKey") ?? header.data("label");
        const headerId = header.id();
        if (!axis || key == null) return;

        if (toggle && activeHeaderId === headerId) {
            cy.batch(() => {
                cy.elements(":selected").unselect();
            });
            activeHeaderId = null;
            return;
        }

        const nodes = selectNodesFromHeader(cy, {
            axis,
            key,
            fit,
            padding,
        });

        activeHeaderId = nodes.length > 0 ? headerId : null;
    });

    cy.on("tap", (evt) => {
        if (evt.target === cy) {
            activeHeaderId = null;
        }
    });

    cy.on("unselect", () => {
        if (cy.elements(":selected").length === 0) {
            activeHeaderId = null;
        }
    });
}

function headerText(n) {
    // Try the keys you might be using in gridDecorations
    const v =
        n.data("label") ??
        n.data("name") ??
        n.data("gridLabel") ??
        n.data("header") ??
        "";
    return String(v).trim();
}

export function updateGridHeaderColors(cy, nodeColorMode) {
    const headers = cy.nodes('[isGridHeader][isGrid="true"]');

    headers.forEach((n) => n.removeData("_gridColor"));

    if (!nodeColorMode || nodeColorMode === "none") return;

    const spec = visualSpec.nodes?.[nodeColorMode];
    if (!spec) {
        console.warn("[updateGridHeaderColors] no visualSpec for mode:", nodeColorMode);
        return;
    }

    let targetAxis = null;
    if (spec.dataKey === "orgTypePrimary") targetAxis = "col";
    if (spec.dataKey === "geoPrimary") targetAxis = "row";
    if (!targetAxis) return;

    const colors = spec.colors ?? {};
    const fallback = spec.fallbackColor ?? "#9E9E9E";

    let colored = 0;

    headers.forEach((n) => {
        if (String(n.data("gridAxis") ?? "") !== targetAxis) return;

        const txt = headerText(n);
        if (!txt) return;

        n.data("_gridColor", colors[txt] ?? fallback);
        colored += 1;
    });

    if (colored === 0) {
        const sample = headers.slice(0, 10).map((n) => headerText(n)).filter(Boolean);
        console.warn("[updateGridHeaderColors] colored 0 headers. sample header labels=", sample);
    }
}
