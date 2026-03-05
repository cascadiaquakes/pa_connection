import { layoutConfig } from "./layoutConfig.js";

function seededRand(seed) {
    let s = seed >>> 0;
    return () => {
        s = (1664525 * s + 1013904223) >>> 0;
        return s / 2 ** 32;
    };
}

function orderWithFallback(preferred, observed) {
    const out = [];
    const seen = new Set();
    for (const v of (preferred ?? [])) {
        if (!seen.has(v)) { out.push(v); seen.add(v); }
    }
    for (const v of observed) {
        if (!seen.has(v)) { out.push(v); seen.add(v); }
    }
    return out;
}

function toBreaks(values, weights, start, end, minFrac = 0.04) {
    // Allocate minimum fraction per band so tiny categories are still visible.
    const total = Array.from(weights.values()).reduce((a, b) => a + b, 0) || 1;
    const n = values.length || 1;

    // raw fractions
    let fracs = values.map(v => (weights.get(v) ?? 0) / total);

    // enforce minimum, then renormalize
    fracs = fracs.map(f => Math.max(f, minFrac));
    const sum = fracs.reduce((a, b) => a + b, 0);
    fracs = fracs.map(f => f / sum);

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

export function applyBoxPresetLayout(cy, cfg = layoutConfig) {
    const { bounds, orgTypeOrder, geoOrder, jitter } = cfg;

    // Prefer visible-only; if empty, fall back to all real nodes
    let nodes = cy.nodes('node[!isGrid]:visible');
    if (nodes.length === 0) nodes = cy.nodes('node[!isGrid]');

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

    const rnd = seededRand(jitter?.seed ?? 1);

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

        // Place nodes within each cell using a grid packing
        for (const [key, cellNodes] of cellMap.entries()) {
            const [ixStr, iyStr] = key.split("::");
            const ix = Number(ixStr);
            const iy = Number(iyStr);

            const x0 = xBreaks[ix], x1 = xBreaks[ix + 1];
            const y0 = yBreaks[iy], y1 = yBreaks[iy + 1];

            const cellW = Math.max(1, x1 - x0);
            const cellH = Math.max(1, y1 - y0);

            // padding inside the box so points don't sit on lines
            const padX = Math.min(24, cellW * 0.12);
            const padY = Math.min(20, cellH * 0.12);

            const xmin = x0 + padX;
            const xmax = x1 - padX;
            const ymin = y0 + padY;
            const ymax = y1 - padY;

            const innerW = Math.max(1, xmax - xmin);
            const innerH = Math.max(1, ymax - ymin);

            const k = cellNodes.length;

            // Choose grid dims close to aspect ratio
            const aspect = innerW / innerH;
            let cols = Math.ceil(Math.sqrt(k * aspect));
            cols = Math.max(1, cols);
            let rows = Math.ceil(k / cols);
            rows = Math.max(1, rows);

            const dx = innerW / cols;
            const dy = innerH / rows;

            // Shuffle-ish ordering (deterministic) so it doesn't look too regular
            // We'll just offset indices by a pseudo-random start.
            const offset = Math.floor(rnd() * k);

            for (let idx = 0; idx < k; idx++) {
                const n = cellNodes[(idx + offset) % k];

                const r = Math.floor(idx / cols);
                const c = idx % cols;

                // center of each grid slot
                let x = xmin + (c + 0.5) * dx;
                let y = ymin + (r + 0.5) * dy;

                // small jitter inside slot so it feels organic, but keep inside slot bounds
                const jx = (rnd() - 0.5) * 2 * Math.min(jitter?.x ?? 0, dx * 0.35);
                const jy = (rnd() - 0.5) * 2 * Math.min(jitter?.y ?? 0, dy * 0.35);

                n.position({ x: x + jx, y: y + jy });
            }
        }
    });

    // preset doesn't move nodes; run to refresh internals, then fit visible (or all if none)
    cy.layout({ name: "preset", fit: false, animate: false }).run();
    const fitEles = cy.elements(':visible').length ? cy.elements(':visible') : cy.elements();
    cy.fit(fitEles, 30);

    return { orgValues, geoValues, xBreaks, yBreaks };
}