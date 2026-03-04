export function baseStylesheet() {
    return [
        {
            selector: "node",
            style: {
                "background-color": "#888",
                label: "data(label)",
                "font-size": 10,
                color: "#111",
                "text-outline-width": 2,
                "text-outline-color": "#fff",
                "text-valign": "center",
                "text-halign": "center",
                width: 28,
                height: 28,
            },
        },
        {
            selector: "edge",
            style: {
                width: 2,
                "line-color": "#bbb",
                "target-arrow-color": "#bbb",
                "target-arrow-shape": "triangle",
                "curve-style": "bezier",
            },
        },
        {
            selector: ":selected",
            style: {
                "border-width": 3,
                "border-color": "#222",
                "line-color": "#222",
                "target-arrow-color": "#222",
            },
        },
        { selector: ".missingEndpoint", style: { "line-style": "dashed" } },
    ];
}