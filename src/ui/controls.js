import { uniq } from "../data/normalize.js";

function setAllCheckboxes(container, checked) {
    const boxes = Array.from(container.querySelectorAll('input[type="checkbox"]'));
    boxes.forEach((b) => (b.checked = checked));
}

function renderChecklist(container, values, onChange) {
    container.innerHTML = "";

    // --- Controls row (All / None) ---
    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.gap = "8px";
    controls.style.marginBottom = "6px";

    const btnAll = document.createElement("button");
    btnAll.type = "button";
    btnAll.textContent = "All";
    btnAll.addEventListener("click", () => {
        setAllCheckboxes(container, true);
        onChange();
    });

    const btnNone = document.createElement("button");
    btnNone.type = "button";
    btnNone.textContent = "None";
    btnNone.addEventListener("click", () => {
        setAllCheckboxes(container, false);
        onChange();
    });

    controls.appendChild(btnAll);
    controls.appendChild(btnNone);
    container.appendChild(controls);

    // --- Checklist items ---
    const list = document.createElement("div");
    for (const v of values.length ? values : [""]) {
        const label = document.createElement("label");

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.value = v;
        cb.checked = true;
        cb.addEventListener("change", onChange);

        const span = document.createElement("span");
        span.textContent = v === "" ? "(empty)" : v;

        label.appendChild(cb);
        label.appendChild(span);
        list.appendChild(label);
    }

    container.appendChild(list);
}

function selectedFromChecklist(container) {
    if (!container) return new Set();
    const boxes = Array.from(container.querySelectorAll("input[type=checkbox]"));
    return new Set(boxes.filter((b) => b.checked).map((b) => b.value));
}

export function initControls(cy, { onChange, onFit, onLayout }) {
    const nodeColorModeEl = document.getElementById("nodeColorMode");
    const edgeColorModeEl = document.getElementById("edgeColorMode");

    const orgCategoryFiltersEl = document.getElementById("orgCategoryFilters");
    const geoFiltersEl = document.getElementById("geoFilters");
    const relTypeFiltersEl = document.getElementById("relTypeFilters");

    if (!orgCategoryFiltersEl) console.warn("[controls] Missing #orgCategoryFilters");
    if (!geoFiltersEl) console.warn("[controls] Missing #geoFilters");
    if (!relTypeFiltersEl) console.warn("[controls] Missing #relTypeFilters");

    // Build lists from ALL nodes/edges (not just visible)
    const orgCats = uniq(cy.nodes().map((n) => String(n.data("orgCategory") ?? "")));
    const geos = uniq(cy.nodes().map((n) => String(n.data("geo") ?? "")));
    const relTypes = uniq(cy.edges().map((e) => String(e.data("relType") ?? "")));

    console.log("[controls] orgCats:", orgCats.length, orgCats.slice(0, 10));
    console.log("[controls] geos:", geos.length, geos.slice(0, 10));
    console.log("[controls] relTypes:", relTypes.length, relTypes.slice(0, 10));

    const emit = () => {
        onChange({
            nodeColorMode: nodeColorModeEl?.value ?? "none",
            edgeColorMode: edgeColorModeEl?.value ?? "none",
            allowedOrgCategories: selectedFromChecklist(orgCategoryFiltersEl),
            allowedGeos: selectedFromChecklist(geoFiltersEl),
            allowedRelTypes: selectedFromChecklist(relTypeFiltersEl),
        });
    };

    if (orgCategoryFiltersEl) renderChecklist(orgCategoryFiltersEl, orgCats, emit);
    if (geoFiltersEl) renderChecklist(geoFiltersEl, geos, emit);
    if (relTypeFiltersEl) renderChecklist(relTypeFiltersEl, relTypes, emit);

    nodeColorModeEl?.addEventListener("change", emit);
    edgeColorModeEl?.addEventListener("change", emit);

    document.getElementById("btnFit")?.addEventListener("click", onFit);
    document.getElementById("btnCose")?.addEventListener("click", () => onLayout("cose"));

    emit();
}