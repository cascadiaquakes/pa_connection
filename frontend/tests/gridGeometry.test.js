import assert from "node:assert/strict";
import test from "node:test";

import cytoscape from "cytoscape";

import { applyBoxPresetLayout } from "../src/graph/boxLayout.js";
import { addGridDecorations } from "../src/graph/gridDecorations.js";
import {
    computeCellGridForWidth,
    computeGridGeometry,
} from "../src/graph/gridGeometry.js";

const config = {
    bounds: { x0: 0, y0: 0, x1: 400, y1: 200 },
    orgTypeOrder: ["A", "B"],
    geoOrder: ["North", "South"],
    minColFrac: 0.1,
    minRowHeight: 20,
    nodeGrid: {
        targetCellW: 100,
        minCellW: 50,
        targetCellH: 40,
        maxCols: 4,
    },
    cellPadding: {
        x: 10,
        y: 5,
        xFrac: 1,
        yFrac: 1,
    },
};

function graph() {
    return cytoscape({
        headless: true,
        elements: [
            ...Array.from({ length: 5 }, (_, index) => ({
                data: {
                    id: `a-${index}`,
                    orgTypePrimary: "A",
                    geoPrimary: "North",
                },
            })),
            {
                data: {
                    id: "b-north",
                    orgTypePrimary: "B",
                    geoPrimary: "North",
                },
            },
            {
                data: {
                    id: "b-south",
                    orgTypePrimary: "B",
                    geoPrimary: "South",
                },
            },
        ],
    });
}

test("cell sizing is width-driven and respects column limits", () => {
    assert.deepEqual(
        computeCellGridForWidth(220, 7, {
            targetCellW: 80,
            minCellW: 50,
            targetCellH: 40,
            maxCols: 3,
        }),
        {
            cols: 3,
            rows: 3,
            slotW: 220 / 3,
            slotH: 40,
        }
    );

    assert.deepEqual(
        computeCellGridForWidth(40, 5, {
            targetCellW: 80,
            minCellW: 50,
            targetCellH: 40,
            maxCols: 3,
        }),
        {
            cols: 1,
            rows: 5,
            slotW: 50,
            slotH: 40,
        }
    );
});

test("grid geometry uses weighted columns and crowded-cell row heights", () => {
    const cy = graph();
    try {
        const geometry = computeGridGeometry(cy, config);

        assert.deepEqual(geometry.orgValues, ["A", "B"]);
        assert.deepEqual(geometry.geoValues, ["North", "South"]);
        assert.equal(geometry.xBreaks[0], 0);
        assert.equal(geometry.xBreaks.at(-1), 400);
        assert.ok(geometry.xBreaks[1] > 280 && geometry.xBreaks[1] < 290);
        assert.deepEqual(geometry.rowHeights, [90, 50]);
        assert.deepEqual(geometry.yBreaks, [0, 90, 140]);
        assert.equal(geometry.bounds.y1, 140);

        const crowdedCell = geometry.cells.get("0::0");
        assert.equal(crowdedCell.count, 5);
        assert.deepEqual(crowdedCell.padding, { x: 10, y: 5 });
        assert.deepEqual(crowdedCell.nodeGrid, {
            cols: 4,
            rows: 2,
            slotW: crowdedCell.inner.width / 4,
            slotH: 40,
        });
        assert.equal(crowdedCell.inner.height, 80);
    } finally {
        cy.destroy();
    }
});

test("node placement and decorations reuse the supplied geometry", () => {
    const cy = graph();
    try {
        const geometry = computeGridGeometry(cy, config);

        assert.strictEqual(
            addGridDecorations(cy, geometry),
            geometry
        );
        assert.strictEqual(
            applyBoxPresetLayout(cy, geometry, config),
            geometry
        );

        const firstColumnHeader = cy.getElementById("grid_col_0");
        assert.equal(
            firstColumnHeader.position("x"),
            (geometry.xBreaks[0] + geometry.xBreaks[1]) / 2
        );

        const crowdedCell = geometry.cells.get("0::0");
        for (const node of cy.nodes('[orgTypePrimary = "A"]')) {
            assert.ok(node.position("x") >= crowdedCell.inner.x0);
            assert.ok(node.position("x") <= crowdedCell.inner.x1);
            assert.ok(node.position("y") >= crowdedCell.inner.y0);
            assert.ok(node.position("y") <= crowdedCell.inner.y1);
        }
    } finally {
        cy.destroy();
    }
});
