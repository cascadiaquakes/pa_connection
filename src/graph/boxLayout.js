import { layoutConfig } from "../config/layoutConfig.js";
import { computeCellGridForWidth, computeGridGeometry } from "./gridGeometry.js";

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

export function applyBoxPresetLayout(cy, cfg = layoutConfig) {
    const {
        nodes,
        orgValues,
        geoValues,
        xBreaks,
        yBreaks,
        xIndex,
        yIndex,
        bounds,
    } = computeGridGeometry(cy, cfg);

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

            // `computeCellGridForWidth` decides how many internal columns this box gets.
            // If you want boxes to spread wider before becoming taller, tune:
            // - layoutConfig.bounds.x1
            // - layoutConfig.nodeGrid.targetCellW
            // - layoutConfig.nodeGrid.minCellW
            // - layoutConfig.nodeGrid.maxCols
            const { cols, rows, slotW, slotH } = computeCellGridForWidth(innerW, k, cfg.nodeGrid ?? {});
            const contentH = rows * slotH;
            const startY = ymin + Math.max(0, (innerH - contentH) / 2);

            for (let idx = 0; idx < k; idx++) {
                const n = cellNodes[idx];

                const r = Math.floor(idx / cols);
                const idxInRow = idx % cols;

                const isLastRow = r === rows - 1;
                const itemsInThisRow = isLastRow ? (k - r * cols) : cols;
                const contentW = itemsInThisRow * slotW;

                // Center each row within the box.
                // Earlier rows use `cols`, the last row may have fewer items.
                const startX = xmin + Math.max(0, (innerW - contentW) / 2);

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

    return { orgValues, geoValues, xBreaks, yBreaks };
}
