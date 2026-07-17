import { viewerConfig } from "./viewerConfig.js";

export const NODE_DIMENSIONS = viewerConfig.dimensions;

function controlSpec(dimension, type) {
    const isFilter = type === "filter";
    return {
        containerId: isFilter
            ? dimension.filterContainerId
            : dimension.selectionContainerId,
        title: dimension.title,
        visualKey: dimension.key,
        stateKey: isFilter
            ? dimension.filterStateKey
            : dimension.selectionStateKey,
        logKey: isFilter
            ? dimension.filterLogKey
            : dimension.selectionLogKey,
        arrayKey: dimension.arrayKey,
        primaryKey: dimension.dataKey,
        order: dimension.order,
        filterStatus: dimension.filterStatus,
    };
}

export const NODE_DIMENSION_BY_KEY = Object.fromEntries(
    NODE_DIMENSIONS.map((dimension) => [dimension.key, dimension])
);

export const NODE_FILTER_SPECS = NODE_DIMENSIONS.map((dimension) =>
    controlSpec(dimension, "filter")
);

export const NODE_SELECTION_SPECS = [
    ...NODE_DIMENSIONS.map((dimension) => controlSpec(dimension, "selection")),
    viewerConfig.selection.allNodes,
];
