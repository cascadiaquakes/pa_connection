import { NODE_DIMENSIONS } from "./nodeDimensions.js";

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
        dataKey: "nodeTypePrimary",
        fallbackShape: "ellipse",
        order: nodeTypeDimension?.order ?? [],
        shapes: {
            Hub: "hexagon",
            Organization: "round-rectangle",
            Program: "diamond",
            Tribe: "ellipse",
            tribe: "ellipse",
            FirstNation: "ellipse",
            Other: "ellipse",
        },
        title: "Node Shape",
    },

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
