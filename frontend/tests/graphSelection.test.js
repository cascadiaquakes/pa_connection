import assert from "node:assert/strict";
import test from "node:test";

import {
    clearGraphSelection,
    replaceGraphSelection,
    selectNodeById,
} from "../src/graph/graphSelection.js";

function collection(length = 1) {
    return {
        length,
        selected: false,
        unselected: false,
        nonempty() {
            return this.length > 0;
        },
        select() {
            this.selected = true;
        },
        unselect() {
            this.unselected = true;
        },
    };
}

function graph(node = collection()) {
    const selected = collection();
    return {
        selected,
        node,
        animation: null,
        fitted: null,
        batch(callback) {
            callback();
        },
        elements() {
            return selected;
        },
        getElementById() {
            return node;
        },
        animate(options) {
            this.animation = options;
        },
        fit(elements, padding) {
            this.fitted = { elements, padding };
        },
    };
}

test("selection replacement clears prior state and centers once", () => {
    const target = collection();
    const cy = graph(target);

    assert.strictEqual(
        replaceGraphSelection(cy, target, { center: true, duration: 125 }),
        target
    );
    assert.equal(cy.selected.unselected, true);
    assert.equal(target.selected, true);
    assert.deepEqual(cy.animation, {
        center: { eles: target },
        duration: 125,
    });
    assert.equal(cy.fitted, null);
});

test("node selection and clearing use the shared graph behavior", () => {
    const target = collection();
    const cy = graph(target);

    assert.strictEqual(selectNodeById(cy, "node-1", { fit: true }), target);
    assert.deepEqual(cy.fitted, { elements: target, padding: 40 });

    clearGraphSelection(cy);
    assert.equal(cy.selected.unselected, true);

    const missing = collection(0);
    const missingGraph = graph(missing);
    assert.strictEqual(selectNodeById(missingGraph, "missing"), missing);
    assert.equal(missingGraph.selected.unselected, false);
});
