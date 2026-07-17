import { NODE_DIMENSIONS } from "./nodeDimensions.js";
import { viewerConfig } from "./viewerConfig.js";

const nodeTypeDimension = NODE_DIMENSIONS.find((dimension) => dimension.key === "nodeType");

export const visualSpec = {
    nodes: Object.fromEntries(
        NODE_DIMENSIONS.map((dimension) => [
            dimension.key,
            {
                dataKey: dimension.dataKey,
                title: dimension.title,
                order: dimension.order,
                colors: dimension.colors,
                fallbackColor: dimension.fallbackColor,
            },
        ])
    ),
    nodeShapes: {
        ...viewerConfig.visuals.nodeShapes,
        order: nodeTypeDimension?.order ?? [],
    },

    edges: viewerConfig.visuals.edges,
};
