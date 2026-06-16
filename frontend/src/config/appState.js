import {
    NODE_FILTER_SPECS,
    NODE_SELECTION_SPECS,
} from "./nodeDimensions.js";

function pickSpecState(state, specs) {
    return Object.fromEntries(
        specs.map((spec) => [spec.stateKey, state[spec.stateKey] ?? new Set()])
    );
}

function valuesEqual(left, right) {
    if (left instanceof Set && right instanceof Set) {
        if (left.size !== right.size) return false;
        return Array.from(left).every((value) => right.has(value));
    }
    return Object.is(left, right);
}

function stateKeysChanged(previous, next, keys) {
    return keys.some((key) => !valuesEqual(previous[key], next[key]));
}

export function createAppState(overrides = {}) {
    return {
        nodeColorMode: "orgCat",
        edgeDisplayMode: "simplified",
        allowedRelTypes: new Set(),
        prune: false,
        layoutMode: "grid",
        ...pickSpecState({}, NODE_FILTER_SPECS),
        ...pickSpecState({}, NODE_SELECTION_SPECS),
        ...overrides,
    };
}

export function graphViewState(state) {
    return {
        ...pickSpecState(state, NODE_FILTER_SPECS),
        allowedRelTypes: state.allowedRelTypes ?? new Set(),
        prune: state.prune ?? false,
        edgeDisplayMode: state.edgeDisplayMode ?? "simplified",
    };
}

export function nodeSelectionState(state) {
    return pickSpecState(state, NODE_SELECTION_SPECS);
}

export function hasActiveSelectionFilters(selectionState) {
    return Object.values(selectionState).some(
        (value) => value instanceof Set && value.size > 0
    );
}

export function planAppStateUpdate(previous, next) {
    if (!previous) {
        return {
            viewChanged: true,
            selectionChanged: true,
            nodeColorChanged: true,
            layoutChanged: true,
            requiresLayout: true,
        };
    }

    const viewChanged = stateKeysChanged(previous, next, [
        ...NODE_FILTER_SPECS.map(({ stateKey }) => stateKey),
        "allowedRelTypes",
        "prune",
        "edgeDisplayMode",
    ]);
    const selectionChanged = stateKeysChanged(
        previous,
        next,
        NODE_SELECTION_SPECS.map(({ stateKey }) => stateKey)
    );
    const nodeColorChanged = !valuesEqual(
        previous.nodeColorMode,
        next.nodeColorMode
    );
    const layoutChanged = !valuesEqual(previous.layoutMode, next.layoutMode);

    return {
        viewChanged,
        selectionChanged,
        nodeColorChanged,
        layoutChanged,
        requiresLayout: viewChanged || layoutChanged,
    };
}
