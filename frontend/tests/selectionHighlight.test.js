import assert from "node:assert/strict";
import test from "node:test";

import cytoscape from "cytoscape";

import { applySelectionBuckets } from "../src/graph/selectionHighlight.js";

const selectionSpecs = [
    {
        stateKey: "selectedOrgCategories",
        arrayKey: "orgTypes",
        primaryKey: "orgTypePrimary",
    },
    {
        stateKey: "selectedGeos",
        arrayKey: "geoTags",
        primaryKey: "geoPrimary",
    },
];

function createGraph() {
    return cytoscape({
        headless: true,
        elements: [
            {
                data: {
                    id: "a",
                    orgTypes: ["Government", "Academic"],
                    orgTypePrimary: "Government",
                    geoTags: ["Oregon"],
                    geoPrimary: "Oregon",
                },
            },
            {
                data: {
                    id: "b",
                    orgTypes: ["Nonprofit Community"],
                    orgTypePrimary: "Nonprofit Community",
                    geoTags: ["Washington"],
                    geoPrimary: "Washington",
                },
            },
        ],
    });
}

test("selection is OR within a dimension and AND across active dimensions", () => {
    const cy = createGraph();
    try {
        const selected = applySelectionBuckets(cy, selectionSpecs, {
            selectedOrgCategories: new Set(["Academic", "Nonprofit Community"]),
            selectedGeos: new Set(["Oregon"]),
        });

        assert.deepEqual(selected.map((node) => node.id()), ["a"]);
        assert.deepEqual(cy.nodes(":selected").map((node) => node.id()), ["a"]);
    } finally {
        cy.destroy();
    }
});

test("no active selection filters clears the current selection", () => {
    const cy = createGraph();
    try {
        cy.getElementById("a").select();

        const selected = applySelectionBuckets(cy, selectionSpecs, {
            selectedOrgCategories: new Set(),
            selectedGeos: new Set(),
        });

        assert.equal(selected.length, 0);
        assert.equal(cy.nodes(":selected").length, 0);
    } finally {
        cy.destroy();
    }
});
