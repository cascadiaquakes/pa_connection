import { NODE_DIMENSIONS } from "./nodeDimensions.js";

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

    edges: {
        relType: {
            dataKey: "relType",
            title: "Relationship Type",
            order: [
                "funding",
                "emergency response coordination",
                "info/research",
                "tools/products",
                "data",
            ],
            colors: {
                "funding": "#E15759",
                "emergency response coordination": "#F28E2B",
                "info/research": "#4E79A7",
                "tools/products": "#59A14F",
                "data": "#B07AA1",
            },
            fallbackColor: "#9E9E9E",
        },
    },
};
