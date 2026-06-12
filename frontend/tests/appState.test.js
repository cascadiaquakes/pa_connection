import assert from "node:assert/strict";
import test from "node:test";

import {
    createAppState,
    graphViewState,
    hasActiveSelectionFilters,
    nodeSelectionState,
    planAppStateUpdate,
} from "../src/config/appState.js";
import {
    NODE_DIMENSIONS,
    NODE_FILTER_SPECS,
    NODE_SELECTION_SPECS,
} from "../src/config/nodeDimensions.js";
import { visualSpec } from "../src/config/visualSpec.js";

test("node configuration derives filters, selections, and visual order", () => {
    assert.equal(NODE_FILTER_SPECS.length, NODE_DIMENSIONS.length);
    assert.equal(NODE_SELECTION_SPECS.length, NODE_DIMENSIONS.length + 1);
    assert.deepEqual(
        Object.keys(visualSpec.nodes),
        NODE_DIMENSIONS.map(({ key }) => key)
    );
    assert.equal(
        new Set(NODE_FILTER_SPECS.map(({ stateKey }) => stateKey)).size,
        NODE_FILTER_SPECS.length
    );
    assert.deepEqual(
        NODE_SELECTION_SPECS.at(-1),
        {
            containerId: "selectionOrganizationFilters",
            title: "All Organizations",
            stateKey: "selectedOrganizations",
            logKey: "selectionOrganizations",
            primaryKey: "orgName",
            previewLimit: 5,
            visibleOnly: true,
        }
    );
});

test("createAppState supplies independent sets for all controls", () => {
    const first = createAppState();
    const second = createAppState();

    for (const { stateKey } of [
        ...NODE_FILTER_SPECS,
        ...NODE_SELECTION_SPECS,
    ]) {
        assert.ok(first[stateKey] instanceof Set);
        assert.notStrictEqual(first[stateKey], second[stateKey]);
    }
});

test("state selectors expose only the data needed by each graph operation", () => {
    const allowedRoles = new Set(["Lender"]);
    const selectedRoles = new Set(["Borrower"]);
    const state = createAppState({
        allowedRoles,
        selectedRoles,
        allowedRelTypes: new Set(["Lends to"]),
        edgeDisplayMode: "detailed",
        prune: true,
    });

    const viewState = graphViewState(state);
    const selectionState = nodeSelectionState(state);

    assert.strictEqual(viewState.allowedRoles, allowedRoles);
    assert.equal(viewState.edgeDisplayMode, "detailed");
    assert.equal(viewState.prune, true);
    assert.equal("selectedRoles" in viewState, false);

    assert.strictEqual(selectionState.selectedRoles, selectedRoles);
    assert.equal("allowedRoles" in selectionState, false);
    assert.equal(hasActiveSelectionFilters(selectionState), true);
    assert.equal(
        hasActiveSelectionFilters(nodeSelectionState(createAppState())),
        false
    );
});

test("color-only and selection-only updates do not require layout", () => {
    const previous = createAppState({
        allowedRoles: new Set(["Coordination"]),
    });

    const colorUpdate = planAppStateUpdate(
        previous,
        createAppState({
            ...previous,
            nodeColorMode: "role",
            allowedRoles: new Set(["Coordination"]),
        })
    );
    assert.equal(colorUpdate.nodeColorChanged, true);
    assert.equal(colorUpdate.viewChanged, false);
    assert.equal(colorUpdate.requiresLayout, false);

    const selectionUpdate = planAppStateUpdate(
        previous,
        createAppState({
            ...previous,
            selectedRoles: new Set(["Coordination"]),
            allowedRoles: new Set(["Coordination"]),
        })
    );
    assert.equal(selectionUpdate.selectionChanged, true);
    assert.equal(selectionUpdate.viewChanged, false);
    assert.equal(selectionUpdate.requiresLayout, false);
});

test("view and layout changes still require layout", () => {
    const previous = createAppState();

    assert.equal(
        planAppStateUpdate(previous, createAppState({
            ...previous,
            allowedRoles: new Set(["Coordination"]),
        })).requiresLayout,
        true
    );
    assert.equal(
        planAppStateUpdate(previous, createAppState({
            ...previous,
            layoutMode: "organic",
        })).requiresLayout,
        true
    );
});
