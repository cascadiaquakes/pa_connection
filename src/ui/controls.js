import { uniq } from "../data/normalize.js";

const NODE_FILTER_SPECS = [
    {
        containerId: "orgCategoryFilters",
        stateKey: "allowedOrgCategories",
        logKey: "orgCats",
        arrayKey: "orgTypes",
        primaryKey: "orgTypePrimary",
    },
    {
        containerId: "geoFilters",
        stateKey: "allowedGeos",
        logKey: "geos",
        arrayKey: "geoTags",
        primaryKey: "geoPrimary",
    },
    {
        containerId: "nodeTypeFilters",
        stateKey: "allowedNodeTypes",
        logKey: "nodeTypes",
        arrayKey: "nodeTypes",
        primaryKey: "nodeTypePrimary",
    },
    {
        containerId: "governanceFilters",
        stateKey: "allowedGovernanceLevels",
        logKey: "governanceLevels",
        arrayKey: "governanceLevels",
        primaryKey: "governanceLevelPrimary",
    },
    {
        containerId: "functionalDomainFilters",
        stateKey: "allowedFunctionalDomains",
        logKey: "functionalDomains",
        arrayKey: "functionalDomains",
        primaryKey: "functionalDomainPrimary",
    },
    {
        containerId: "roleFilters",
        stateKey: "allowedRoles",
        logKey: "roles",
        arrayKey: "roleTags",
        primaryKey: "rolePrimary",
    },
    {
        containerId: "lifelineFilters",
        stateKey: "allowedLifelines",
        logKey: "lifelines",
        arrayKey: "lifelineTags",
        primaryKey: "femaLifelinePrimary",
    },
];

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

function collectNodeValues(cy, arrayKey, primaryKey) {
    const all = [];
    cy.nodes("[!isGrid]").forEach((n) => {
        const values = n.data(arrayKey);
        if (Array.isArray(values)) {
            all.push(...values.map((x) => String(x ?? "").trim()));
            return;
        }

        const primary = String(n.data(primaryKey) ?? "").trim();
        if (primary) all.push(primary);
    });
    return uniq(all.filter(Boolean));
}

export function initControls(cy, { onChange }) {
    const nodeColorModeEl = document.getElementById("nodeColorMode");
    const edgeDisplayModeEl = document.getElementById("edgeDisplayMode");

    const relTypeFiltersEl = document.getElementById("relTypeFilters");
    const pruneToggleEl = document.getElementById("togglePrune");
    const layoutToggleEl = document.getElementById("toggleLayout");

    const filterContainers = NODE_FILTER_SPECS.map((spec) => ({
        ...spec,
        el: document.getElementById(spec.containerId),
    }));

    for (const spec of filterContainers) {
        if (!spec.el) console.warn(`[controls] Missing #${spec.containerId}`);
    }
    if (!relTypeFiltersEl) console.warn("[controls] Missing #relTypeFilters");
    if (!pruneToggleEl) console.warn("[controls] Missing #togglePrune");
    if (!layoutToggleEl) console.warn("[controls] Missing #toggleLayout");

    const nodeFilterValues = Object.fromEntries(
        filterContainers.map((spec) => [
            spec.stateKey,
            collectNodeValues(cy, spec.arrayKey, spec.primaryKey),
        ])
    );
    const relTypes = uniq(cy.edges().map((e) => String(e.data("relType") ?? "")));

    for (const spec of filterContainers) {
        const values = nodeFilterValues[spec.stateKey] ?? [];
        console.log(`[controls] ${spec.logKey}:`, values.length, values.slice(0, 10));
    }
    console.log("[controls] relTypes:", relTypes.length, relTypes.slice(0, 10));

    const emit = () => {
        const nodeFilterState = Object.fromEntries(
            filterContainers.map((spec) => [spec.stateKey, selectedFromChecklist(spec.el)])
        );

        onChange({
            nodeColorMode: nodeColorModeEl?.value ?? "none",
            edgeDisplayMode: edgeDisplayModeEl?.value ?? "none",
            ...nodeFilterState,
            allowedRelTypes: selectedFromChecklist(relTypeFiltersEl),
            prune: pruneToggleEl?.checked ?? true,
            layoutMode: layoutToggleEl?.checked ? "organic" : "grid",
        });
    };

    for (const spec of filterContainers) {
        if (spec.el) renderChecklist(spec.el, nodeFilterValues[spec.stateKey] ?? [], emit);
    }
    if (relTypeFiltersEl) renderChecklist(relTypeFiltersEl, relTypes, emit);

    nodeColorModeEl?.addEventListener("change", emit);
    edgeDisplayModeEl?.addEventListener("change", emit);
    pruneToggleEl?.addEventListener("change", emit);
    layoutToggleEl?.addEventListener("change", emit);

    function setAllChecked(container, checked) {
        if (!container) return;
        container.querySelectorAll('input[type="checkbox"]').forEach((el) => {
            el.checked = checked;
        });
    }

    function resetToFullView() {
        for (const spec of filterContainers) {
            setAllChecked(spec.el, true);
        }
        setAllChecked(relTypeFiltersEl, true);

        if (pruneToggleEl) pruneToggleEl.checked = false;

        emit();
    }

    emit();

    return {
        emit,
        resetToFullView,
    };
}
