import { uniq } from "../data/normalize.js";
import { visualSpec } from "../config/visualSpec.js";
import { deriveGraphView } from "../graph/graphViewData.js";

const NODE_FILTER_SPECS = [
    {
        containerId: "orgCategoryFilters",
        title: "Organization Category",
        visualKey: "orgCat",
        stateKey: "allowedOrgCategories",
        logKey: "orgCats",
        arrayKey: "orgTypes",
        primaryKey: "orgTypePrimary",
    },
    {
        containerId: "nodeTypeFilters",
        title: "Node Type",
        visualKey: "nodeType",
        stateKey: "allowedNodeTypes",
        logKey: "nodeTypes",
        arrayKey: "nodeTypes",
        primaryKey: "nodeTypePrimary",
    },
    {
        containerId: "governanceFilters",
        title: "Governance Level",
        visualKey: "governance",
        stateKey: "allowedGovernanceLevels",
        logKey: "governanceLevels",
        arrayKey: "governanceLevels",
        primaryKey: "governanceLevelPrimary",
    },
    {
        containerId: "functionalDomainFilters",
        title: "Functional Domain",
        visualKey: "functionalDomain",
        stateKey: "allowedFunctionalDomains",
        logKey: "functionalDomains",
        arrayKey: "functionalDomains",
        primaryKey: "functionalDomainPrimary",
    },
    {
        containerId: "roleFilters",
        title: "Role",
        visualKey: "role",
        stateKey: "allowedRoles",
        logKey: "roles",
        arrayKey: "roleTags",
        primaryKey: "rolePrimary",
    },
    {
        containerId: "lifelineFilters",
        title: "FEMA Lifeline",
        visualKey: "lifeline",
        stateKey: "allowedLifelines",
        logKey: "lifelines",
        arrayKey: "lifelineTags",
        primaryKey: "femaLifelinePrimary",
    },
    {
        containerId: "geoFilters",
        title: "Geographic Area",
        visualKey: "geo",
        stateKey: "allowedGeos",
        logKey: "geos",
        arrayKey: "geoTags",
        primaryKey: "geoPrimary",
    },
];

export const NODE_SELECTION_SPECS = [
    {
        containerId: "selectionOrgCategoryFilters",
        title: "Organization Category",
        visualKey: "orgCat",
        stateKey: "selectedOrgCategories",
        logKey: "selectionOrgCats",
        arrayKey: "orgTypes",
        primaryKey: "orgTypePrimary",
    },
    {
        containerId: "selectionNodeTypeFilters",
        title: "Node Type",
        visualKey: "nodeType",
        stateKey: "selectedNodeTypes",
        logKey: "selectionNodeTypes",
        arrayKey: "nodeTypes",
        primaryKey: "nodeTypePrimary",
    },
    {
        containerId: "selectionGovernanceFilters",
        title: "Governance Level",
        visualKey: "governance",
        stateKey: "selectedGovernanceLevels",
        logKey: "selectionGovernanceLevels",
        arrayKey: "governanceLevels",
        primaryKey: "governanceLevelPrimary",
    },
    {
        containerId: "selectionFunctionalDomainFilters",
        title: "Functional Domain",
        visualKey: "functionalDomain",
        stateKey: "selectedFunctionalDomains",
        logKey: "selectionFunctionalDomains",
        arrayKey: "functionalDomains",
        primaryKey: "functionalDomainPrimary",
    },
    {
        containerId: "selectionRoleFilters",
        title: "Role",
        visualKey: "role",
        stateKey: "selectedRoles",
        logKey: "selectionRoles",
        arrayKey: "roleTags",
        primaryKey: "rolePrimary",
    },
    {
        containerId: "selectionLifelineFilters",
        title: "FEMA Lifeline",
        visualKey: "lifeline",
        stateKey: "selectedLifelines",
        logKey: "selectionLifelines",
        arrayKey: "lifelineTags",
        primaryKey: "femaLifelinePrimary",
    },
    {
        containerId: "selectionGeoFilters",
        title: "Geographic Area",
        visualKey: "geo",
        stateKey: "selectedGeos",
        logKey: "selectionGeos",
        arrayKey: "geoTags",
        primaryKey: "geoPrimary",
    },
    {
        containerId: "selectionOrganizationFilters",
        title: "All Organizations",
        stateKey: "selectedOrganizations",
        logKey: "selectionOrganizations",
        primaryKey: "orgName",
        previewLimit: 5,
        visibleOnly: true,
    },
];

function setAllCheckboxes(container, checked) {
    const boxes = Array.from(container.querySelectorAll('input[type="checkbox"]'));
    boxes.forEach((b) => (b.checked = checked));
}

function renderChecklist(
    container,
    values,
    onChange,
    {
        checkedByDefault = true,
        collapsible = false,
        title = "",
        defaultOpen = false,
        previewLimit = null,
        previewExpanded = false,
        checkedValues = null,
    } = {}
) {
    container.innerHTML = "";

    const listParent = collapsible ? document.createElement("details") : container;
    if (collapsible) {
        listParent.className = "filter-accordion";
        listParent.open = defaultOpen;
    }

    const btnAll = document.createElement("button");
    btnAll.type = "button";
    btnAll.textContent = "All";
    btnAll.className = "checklist-action";
    btnAll.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        setAllCheckboxes(container, true);
        onChange();
    });

    const btnNone = document.createElement("button");
    btnNone.type = "button";
    btnNone.textContent = "None";
    btnNone.className = "checklist-action";
    btnNone.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        setAllCheckboxes(container, false);
        onChange();
    });

    if (collapsible) {
        const summary = document.createElement("summary");
        summary.className = "filter-accordion-summary";

        const titleEl = document.createElement("span");
        titleEl.className = "filter-accordion-title";
        titleEl.textContent = title;

        const actions = document.createElement("span");
        actions.className = "filter-accordion-actions";
        actions.appendChild(btnAll);
        actions.appendChild(btnNone);
        const chevron = document.createElement("span");
        chevron.className = "filter-accordion-chevron";
        chevron.setAttribute("aria-hidden", "true");

        summary.appendChild(titleEl);
        summary.appendChild(actions);
        summary.appendChild(chevron);
        listParent.appendChild(summary);
        container.appendChild(listParent);
    } else {
        // --- Controls row (All / None) ---
        const controls = document.createElement("div");
        controls.className = "checklist-actions-row";
        controls.appendChild(btnAll);
        controls.appendChild(btnNone);
        container.appendChild(controls);
    }

    // --- Checklist items ---
    const list = document.createElement("div");
    list.className = collapsible ? "filter-accordion-body" : "";
    const displayValues = values.length ? values : [""];
    const shouldLimit =
        Number.isInteger(previewLimit) && displayValues.length > previewLimit && !previewExpanded;

    for (const [index, v] of displayValues.entries()) {
        const label = document.createElement("label");
        if (shouldLimit && index >= previewLimit) {
            label.hidden = true;
            label.dataset.previewExtra = "true";
        }

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.value = v;
        cb.checked = checkedValues instanceof Set ? checkedValues.has(v) : checkedByDefault;
        cb.addEventListener("change", onChange);

        const span = document.createElement("span");
        span.textContent = v === "" ? "(empty)" : v;

        label.appendChild(cb);
        label.appendChild(span);
        list.appendChild(label);
    }

    if (shouldLimit) {
        const showAllButton = document.createElement("button");
        showAllButton.type = "button";
        showAllButton.className = "button-secondary checklist-show-all";
        showAllButton.textContent = `Show all (${displayValues.length})`;
        showAllButton.addEventListener("click", () => {
            container.dataset.previewExpanded = "true";
            list.querySelectorAll("[data-preview-extra]").forEach((el) => {
                el.hidden = false;
                delete el.dataset.previewExtra;
            });
            showAllButton.remove();
        });
        list.appendChild(showAllButton);
    }

    listParent.appendChild(list);
}

function selectedFromChecklist(container) {
    if (!container) return new Set();
    const boxes = Array.from(container.querySelectorAll("input[type=checkbox]"));
    return new Set(boxes.filter((b) => b.checked).map((b) => b.value));
}

function collectNodeValuesFromNodes(nodes, arrayKey, primaryKey) {
    const all = [];
    nodes.forEach((n) => {
        const data = typeof n.data === "function" ? n.data() : n.data;
        const values = data?.[arrayKey];
        if (Array.isArray(values)) {
            all.push(...values.map((x) => String(x ?? "").trim()));
            return;
        }

        const primary = String(data?.[primaryKey] ?? "").trim();
        if (primary) all.push(primary);
    });
    return uniq(all.filter(Boolean));
}

function collectNodeValues(cy, arrayKey, primaryKey) {
    return collectNodeValuesFromNodes(Array.from(cy.nodes("[!isGrid]")), arrayKey, primaryKey);
}

function sortByVisualOrder(values, order = []) {
    const orderIndex = new Map(order.map((value, index) => [value, index]));
    return [...values].sort((a, b) => {
        const ai = orderIndex.has(a) ? orderIndex.get(a) : Number.POSITIVE_INFINITY;
        const bi = orderIndex.has(b) ? orderIndex.get(b) : Number.POSITIVE_INFINITY;
        if (ai !== bi) return ai - bi;
        return String(a).localeCompare(String(b));
    });
}

function createSelectionWarning(selectionContainers) {
    const firstSelectionContainer = selectionContainers.find((spec) => spec.el)?.el;
    if (!firstSelectionContainer?.parentElement) return null;

    const warning = document.createElement("div");
    warning.className = "selection-warning";
    warning.setAttribute("role", "status");
    warning.setAttribute("aria-live", "polite");
    warning.hidden = true;
    warning.textContent = "No organizations match this highlight combination.";

    firstSelectionContainer.parentElement.insertBefore(warning, firstSelectionContainer);
    return warning;
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
    const selectionContainers = NODE_SELECTION_SPECS.map((spec) => ({
        ...spec,
        el: document.getElementById(spec.containerId),
    }));
    const visibleOrganizationSpec = selectionContainers.find((spec) => spec.visibleOnly);
    const selectionWarningEl = createSelectionWarning(selectionContainers);

    for (const spec of filterContainers) {
        if (!spec.el) console.warn(`[controls] Missing #${spec.containerId}`);
    }
    for (const spec of selectionContainers) {
        if (!spec.el) console.warn(`[controls] Missing #${spec.containerId}`);
    }
    if (!relTypeFiltersEl) console.warn("[controls] Missing #relTypeFilters");
    if (!pruneToggleEl) console.warn("[controls] Missing #togglePrune");
    if (!layoutToggleEl) console.warn("[controls] Missing #toggleLayout");

    const nodeFilterValues = Object.fromEntries(
        filterContainers.map((spec) => [
            spec.stateKey,
            sortByVisualOrder(
                collectNodeValues(cy, spec.arrayKey, spec.primaryKey),
                visualSpec.nodes[spec.visualKey]?.order
            ),
        ])
    );
    const nodeSelectionValues = Object.fromEntries(
        selectionContainers.map((spec) => [
            spec.stateKey,
            sortByVisualOrder(
                collectNodeValues(cy, spec.arrayKey, spec.primaryKey),
                visualSpec.nodes[spec.visualKey]?.order
            ),
        ])
    );
    const relTypes = sortByVisualOrder(
        uniq(cy.edges().map((e) => String(e.data("relType") ?? ""))),
        visualSpec.edges.relType.order
    );

    for (const spec of filterContainers) {
        const values = nodeFilterValues[spec.stateKey] ?? [];
        console.log(`[controls] ${spec.logKey}:`, values.length, values.slice(0, 10));
    }
    for (const spec of selectionContainers) {
        const values = nodeSelectionValues[spec.stateKey] ?? [];
        console.log(`[controls] ${spec.logKey}:`, values.length, values.slice(0, 10));
    }
    console.log("[controls] relTypes:", relTypes.length, relTypes.slice(0, 10));

    const collectState = () => {
        const nodeFilterState = Object.fromEntries(
            filterContainers.map((spec) => [spec.stateKey, selectedFromChecklist(spec.el)])
        );
        const nodeSelectionState = Object.fromEntries(
            selectionContainers.map((spec) => [spec.stateKey, selectedFromChecklist(spec.el)])
        );

        return {
            nodeColorMode: nodeColorModeEl?.value ?? "none",
            edgeDisplayMode: edgeDisplayModeEl?.value ?? "none",
            ...nodeFilterState,
            ...nodeSelectionState,
            allowedRelTypes: selectedFromChecklist(relTypeFiltersEl),
            prune: pruneToggleEl?.checked ?? true,
            layoutMode: layoutToggleEl?.checked ? "organic" : "grid",
        };
    };

    const updateVisibleOrganizationSelection = (state) => {
        if (!visibleOrganizationSpec?.el) return;

        const selectedBefore = selectedFromChecklist(visibleOrganizationSpec.el);
        const rawElements = cy.scratch("_rawElements") ?? [];
        const derived = deriveGraphView(rawElements, state);
        const values = sortByVisualOrder(
            collectNodeValuesFromNodes(derived.nodes, null, visibleOrganizationSpec.primaryKey)
        );
        const selectedVisible = new Set(values.filter((value) => selectedBefore.has(value)));

        renderChecklist(visibleOrganizationSpec.el, values, emit, {
            checkedByDefault: false,
            collapsible: true,
            title: visibleOrganizationSpec.title,
            defaultOpen: visibleOrganizationSpec.el.querySelector("details")?.open ?? false,
            previewLimit: visibleOrganizationSpec.previewLimit,
            previewExpanded: visibleOrganizationSpec.el.dataset.previewExpanded === "true",
            checkedValues: selectedVisible,
        });
    };

    const emit = () => {
        let state = collectState();
        updateVisibleOrganizationSelection(state);
        state = collectState();
        onChange(state);
    };

    for (const [, spec] of filterContainers.entries()) {
        if (spec.el) {
            renderChecklist(spec.el, nodeFilterValues[spec.stateKey] ?? [], emit, {
                collapsible: true,
                title: spec.title,
                defaultOpen: false,
            });
        }
    }
    for (const [, spec] of selectionContainers.entries()) {
        if (spec.el) {
            renderChecklist(spec.el, nodeSelectionValues[spec.stateKey] ?? [], emit, {
                checkedByDefault: false,
                collapsible: true,
                title: spec.title,
                defaultOpen: false,
                previewLimit: spec.previewLimit,
            });
        }
    }
    if (relTypeFiltersEl) {
        renderChecklist(relTypeFiltersEl, relTypes, emit, {
            checkedByDefault: false,
            collapsible: true,
            title: "Relationship Type",
            defaultOpen: false,
        });
    }

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
        for (const spec of selectionContainers) {
            setAllChecked(spec.el, false);
        }
        setAllChecked(relTypeFiltersEl, false);

        if (pruneToggleEl) pruneToggleEl.checked = false;

        emit();
    }

    emit();

    return {
        emit,
        resetToFullView,
        setSelectionWarning({ hasActiveSelectionFilters = false, matchCount = 0 } = {}) {
            if (!selectionWarningEl) return;
            selectionWarningEl.hidden = !hasActiveSelectionFilters || matchCount > 0;
        },
    };
}
