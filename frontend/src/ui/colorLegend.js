import { visualSpec } from "../config/visualSpec.js";
import { clearElement, createElement } from "./dom.js";

const MODES_WITH_HEADER_ENCODING = new Set(["none", "orgCat", "geo"]);

function stableColorFromString(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    const hue = h % 360;
    return `hsl(${hue}, 55%, 55%)`;
}

function collectObservedValues(cy, dataKey) {
    const values = new Set();
    cy.nodes("[!isGrid]").forEach((n) => {
        const value = String(n.data(dataKey) ?? "").trim();
        if (value) values.add(value);
    });
    return Array.from(values);
}

function orderedLegendValues(spec, observedValues) {
    const preferred = spec.order ?? [];
    const observed = new Set(observedValues);

    const ordered = preferred.filter((value) => observed.has(value));
    const remaining = observedValues
        .filter((value) => !preferred.includes(value))
        .sort((a, b) => a.localeCompare(b));

    return [...ordered, ...remaining];
}

export function renderColorLegend(
    element,
    {
        title = "Legend",
        values = [],
        colors = {},
    } = {}
) {
    const doc = element.ownerDocument ?? document;
    const items = values.map((value) => {
        const color = colors[value] ?? stableColorFromString(value);
        return createElement(
            doc,
            "div",
            { className: "color-legend-item" },
            [
                createElement(doc, "span", {
                    className: "color-legend-swatch",
                    style: { backgroundColor: color },
                }),
                createElement(doc, "span", {
                    className: "color-legend-label",
                    text: value,
                }),
            ]
        );
    });
    element.replaceChildren(
        createElement(doc, "div", {
            className: "color-legend-title",
            text: `${title} legend`,
        }),
        createElement(doc, "div", {
            className: "color-legend-items",
        }, items)
    );
}

export function updateNodeColorLegend(cy, nodeColorMode, { legendElId = "nodeColorLegend" } = {}) {
    const el = document.getElementById(legendElId);
    if (!el) return;

    if (MODES_WITH_HEADER_ENCODING.has(nodeColorMode)) {
        el.hidden = true;
        clearElement(el);
        return;
    }

    const spec = visualSpec.nodes?.[nodeColorMode];
    if (!spec) {
        el.hidden = true;
        clearElement(el);
        return;
    }

    const observedValues = collectObservedValues(cy, spec.dataKey);
    const values = orderedLegendValues(spec, observedValues);

    if (values.length === 0) {
        el.hidden = true;
        clearElement(el);
        return;
    }

    const title = spec.title ?? "Legend";
    const colors = spec.colors ?? {};
    renderColorLegend(el, { title, values, colors });

    el.hidden = false;
}
