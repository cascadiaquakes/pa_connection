import { layoutConfig } from "../config/layoutConfig.js";

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

export function applyBoxPresetLayout(
    cy,
    geometry,
    cfg = layoutConfig
) {
    const {
        nodes,
        xIndex,
        yIndex,
        cells,
        bounds,
    } = geometry;

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
            const cell = cells.get(key);
            if (!cell) continue;

            const cellNodes = sortCellNodes(rawCellNodes);
            const k = cellNodes.length;
            if (k === 0) continue;

            const { cols, rows, slotW, slotH } = cell.nodeGrid;
            const contentH = rows * slotH;
            const startY =
                cell.inner.y0 +
                Math.max(0, (cell.inner.height - contentH) / 2);

            for (let idx = 0; idx < k; idx++) {
                const n = cellNodes[idx];

                const r = Math.floor(idx / cols);
                const idxInRow = idx % cols;

                const isLastRow = r === rows - 1;
                const itemsInThisRow = isLastRow ? (k - r * cols) : cols;
                const contentW = itemsInThisRow * slotW;

                const startX =
                    cell.inner.x0 +
                    Math.max(0, (cell.inner.width - contentW) / 2);

                const x = startX + idxInRow * slotW + slotW / 2;
                const y = startY + r * slotH + slotH / 2;

                n.position({ x, y });
            }
        }
    });

    // Refresh internals, then either fit the full grid to the viewport or keep
    // a fixed zoom/pan depending on the grid viewport preference.
    cy.layout({ name: "preset", fit: false, animate: false }).run();
    if (cfg.fitToViewport ?? false) {
        const fitEles = cy.elements(":visible").length ? cy.elements(":visible") : cy.elements();
        cy.fit(fitEles, cfg.fitPadding ?? 30);
    } else {
        cy.zoom(cfg.initialGridZoom ?? 1);
        cy.pan({
            x: (cfg.viewportPadding?.left ?? 40) - bounds.x0,
            y: (cfg.viewportPadding?.top ?? 40) - bounds.y0,
        });
    }

    return geometry;
}
