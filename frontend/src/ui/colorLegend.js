import { visualSpec } from "../config/visualSpec.js";

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

export function updateNodeColorLegend(cy, nodeColorMode, { legendElId = "nodeColorLegend" } = {}) {
    const el = document.getElementById(legendElId);
    if (!el) return;

    if (MODES_WITH_HEADER_ENCODING.has(nodeColorMode)) {
        el.hidden = true;
        el.innerHTML = "";
        return;
    }

    const spec = visualSpec.nodes?.[nodeColorMode];
    if (!spec) {
        el.hidden = true;
        el.innerHTML = "";
        return;
    }

    const observedValues = collectObservedValues(cy, spec.dataKey);
    const values = orderedLegendValues(spec, observedValues);

    if (values.length === 0) {
        el.hidden = true;
        el.innerHTML = "";
        return;
    }

    const title = spec.title ?? "Legend";
    const colors = spec.colors ?? {};
    el.innerHTML = `
      <div class="color-legend-title">${title} legend</div>
      <div class="color-legend-items">
        ${values
            .map((value) => {
                const color = colors[value] ?? stableColorFromString(value);
                return `
                  <div class="color-legend-item">
                    <span class="color-legend-swatch" style="background:${color}"></span>
                    <span class="color-legend-label">${value}</span>
                  </div>
                `;
            })
            .join("")}
      </div>
    `;

    el.hidden = false;
}
