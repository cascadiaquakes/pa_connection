export function baseStylesheet() {
    return [
        {
            selector: "node[label]",
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

                // smooth focus transitions
                "transition-property": "opacity, border-width, text-opacity",
                "transition-duration": "150ms",
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

                // smooth highlight transitions
                "transition-property": "opacity, width",
                "transition-duration": "150ms",
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