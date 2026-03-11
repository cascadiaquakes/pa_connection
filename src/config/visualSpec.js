export const visualSpec = {
    nodes: {
        orgCat: {
            dataKey: "orgTypePrimary",
            title: "Organization Category",
            order: [
                "Infrastructure and Planning",
                "Emergency Management",
                "Earthquake and Hazard Science",
                "Integrative Research",
                "Community Organization",
                "Media",
                "Response",
                "Academic",
                "FreeChoiceLearning",
                "Insurance",
                "Unknown",
            ],
            colors: {
                "Infrastructure and Planning": "#4E79A7",
                "Emergency Management": "#F28E2B",
                "Earthquake and Hazard Science": "#E15759",
                "Integrative Research": "#76B7B2",
                "Community Organization": "#59A14F",
                "Media": "#EDC948",
                "Response": "#B07AA1",
                "Academic": "#FF9DA7",
                "FreeChoiceLearning": "#9C755F",
                "Insurance": "#BAB0AC",
                "Unknown": "#9E9E9E",
            },
            fallbackColor: "#9E9E9E",
        },

        geo: {
            dataKey: "geoPrimary",
            title: "Geographic Area",
            order: [
                "International",
                "Canada",
                "Federal",
                "Regional",
                "Alaska",
                "British Columbia",
                "Washington",
                "Oregon",
                "California",
                "Unknown",
            ],
            colors: {
                "Alaska": "#4E79A7",
                "British Columbia": "#59A14F",
                "Washington": "#F28E2B",
                "Oregon": "#E15759",
                "California": "#76B7B2",
                "Canada": "#EDC948",
                "Regional": "#B07AA1",
                "Federal": "#9C755F",
                "International": "#FF9DA7",
                "Unknown": "#9E9E9E",
            },
            fallbackColor: "#9E9E9E",
        },
    },

    edges: {
        relType: {
            dataKey: "relType",
            title: "Relationship Type",

            // ordering for legends + any future layout/filter UI
            order: [
                "funding",
                "emergency response coordination",
                "info/research",
                "tools/products",
                "data",
            ],

            // hard-coded palette (placeholder; infographic lab can adjust)
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