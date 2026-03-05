export const layoutConfig = {
    scope: "visible",
    bounds: { x0: 120, y0: 120, x1: 1180, y1: 780 },

    // manual ordering if you want; otherwise it appends missing categories
    orgTypeOrder: [
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

    geoOrder: [
        "Alaska",
        "British Columbia",
        "Washington",
        "Oregon",
        "California",
        "Canada",
        "Regional",
        "Federal",
        "International",
        "Unknown",
    ],

    // prevent tiny categories from collapsing to invisible bands
    minColFrac: 0.05,
    minRowFrac: 0.06,

    jitter: { x: 18, y: 12, seed: 1337 },
};