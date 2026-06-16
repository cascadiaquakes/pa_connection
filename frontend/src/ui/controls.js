import { uniq } from "../data/normalize.js";
import {
    NODE_DIMENSIONS,
    NODE_FILTER_SPECS,
    NODE_SELECTION_SPECS,
} from "../config/nodeDimensions.js";
import { createAppState } from "../config/appState.js";
import { visualSpec } from "../config/visualSpec.js";
import { deriveGraphView } from "../graph/graphViewData.js";
import { loadWorkshopSelection } from "../data/dataloader.js";
import { publicAssetUrl } from "../data/publicAssets.js";

function renderControlContainers(parentId, specs) {
    const parent = document.getElementById(parentId);
    if (!parent) {
        console.warn(`[controls] Missing #${parentId}`);
        return;
    }

    parent.replaceChildren(
        ...specs.map((spec) => {
            const container = document.createElement("div");
            container.id = spec.containerId;
            container.className = "checklist";
            return container;
        })
    );
}

function renderNodeColorOptions(selectEl) {
    if (!selectEl) return;

    const selectedValue = selectEl.value || "orgCat";
    selectEl.replaceChildren(
        ...NODE_DIMENSIONS.map((dimension) => {
            const option = document.createElement("option");
            option.value = dimension.key;
            option.textContent = dimension.title;
            return option;
        }),
        Object.assign(document.createElement("option"), {
            value: "none",
            textContent: "None",
        })
    );
    selectEl.value = selectedValue;
}

function setAllCheckboxes(container, checked) {
    const boxes = Array.from(container.querySelectorAll('input[type="checkbox"]'));
    boxes.forEach((b) => (b.checked = checked));
}

function normalizeLookupValue(value) {
    return String(value ?? "").trim().toLowerCase();
}

function setCheckboxesFromValues(container, checkedValues) {
    const boxes = Array.from(container.querySelectorAll('input[type="checkbox"]'));
    boxes.forEach((box) => {
        box.checked = checkedValues.has(box.value);
    });
}

function getNodeData(node) {
    return typeof node.data === "function" ? node.data() : node.data;
}

function firstRowValue(row, keys) {
    for (const key of keys) {
        const value = String(row[key] ?? "").trim();
        if (value) return value;
    }
    return "";
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
        extraActions = [],
    } = {}
) {
    container.replaceChildren();

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

        const chevron = document.createElement("span");
        chevron.className = "filter-accordion-chevron";
        chevron.setAttribute("aria-hidden", "true");

        summary.appendChild(titleEl);
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
    if (collapsible) {
        const actions = document.createElement("div");
        actions.className = "filter-accordion-actions checklist-actions-row";
        actions.appendChild(btnAll);
        actions.appendChild(btnNone);
        for (const action of extraActions) {
            actions.appendChild(action);
        }
        list.appendChild(actions);
    }

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
        if (Array.isArray(values) && values.length > 0) {
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

    renderControlContainers("nodeFilterControls", NODE_FILTER_SPECS);
    renderControlContainers("nodeSelectionControls", NODE_SELECTION_SPECS);
    renderNodeColorOptions(nodeColorModeEl);

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
    const workshopUrl = publicAssetUrl("data/workshop_selection.csv");
    console.log("[controls] workshop selection URL:", workshopUrl);

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
                spec.order
            ),
        ])
    );
    const nodeSelectionValues = Object.fromEntries(
        selectionContainers.map((spec) => [
            spec.stateKey,
            sortByVisualOrder(
                collectNodeValues(cy, spec.arrayKey, spec.primaryKey),
                spec.order
            ),
        ])
    );
    const relTypes = sortByVisualOrder(
        uniq(cy.edges().map((e) => String(e.data("relType") ?? ""))),
        visualSpec.edges.relType.order
    );
    const orgNameById = new Map();
    const orgNameByNormalizedName = new Map();
    Array.from(cy.nodes("[!isGrid]")).forEach((node) => {
        const data = getNodeData(node);
        const orgName = String(data?.orgName ?? "").trim();
        const orgId = String(data?.id ?? "").trim();
        if (!orgName) return;
        orgNameByNormalizedName.set(normalizeLookupValue(orgName), orgName);
        if (orgId) orgNameById.set(normalizeLookupValue(orgId), orgName);
    });

    let workshopOrganizationNamesPromise = null;
    let hasWorkshopSelection = null;

    const loadWorkshopOrganizationNames = async () => {
        const rows = await loadWorkshopSelection({ workshopUrl });
        const names = rows
            .map((row) => {
                const csvName = firstRowValue(row, ["name", "Organization Name"]);
                const csvId = firstRowValue(row, ["node_id", "Org ID"]);
                return (
                    orgNameById.get(normalizeLookupValue(csvId)) ??
                    orgNameByNormalizedName.get(normalizeLookupValue(csvName)) ??
                    csvName
                );
            })
            .filter(Boolean);
        return new Set(names);
    };

    const getWorkshopOrganizationNames = () => {
        if (!workshopOrganizationNamesPromise) {
            workshopOrganizationNamesPromise = loadWorkshopOrganizationNames();
        }
        return workshopOrganizationNamesPromise;
    };

    const updateWorkshopButtonVisibility = (button) => {
        button.hidden = hasWorkshopSelection !== true;
        getWorkshopOrganizationNames()
            .then(() => {
                hasWorkshopSelection = true;
                button.hidden = false;
            })
            .catch((err) => {
                hasWorkshopSelection = false;
                button.hidden = true;
                console.warn("[controls] Workshop selection file is unavailable:", err);
            });
    };

    const applyWorkshopSelection = async () => {
        if (!visibleOrganizationSpec?.el) return;
        try {
            const workshopOrganizationNames = await getWorkshopOrganizationNames();
            setCheckboxesFromValues(visibleOrganizationSpec.el, workshopOrganizationNames);
            emit();
        } catch (err) {
            console.error("[controls] Failed to apply workshop selection:", err);
        }
    };

    const createWorkshopButton = () => {
        const btnWorkshop = document.createElement("button");
        btnWorkshop.type = "button";
        btnWorkshop.textContent = "Workshop";
        btnWorkshop.className = "checklist-action";
        btnWorkshop.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            applyWorkshopSelection();
        });
        updateWorkshopButtonVisibility(btnWorkshop);
        return btnWorkshop;
    };

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

        return createAppState({
            nodeColorMode: nodeColorModeEl?.value ?? "none",
            edgeDisplayMode: edgeDisplayModeEl?.value ?? "none",
            ...nodeFilterState,
            ...nodeSelectionState,
            allowedRelTypes: selectedFromChecklist(relTypeFiltersEl),
            prune: pruneToggleEl?.checked ?? true,
            layoutMode: layoutToggleEl?.checked ? "organic" : "grid",
        });
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
            extraActions: [createWorkshopButton()],
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
                extraActions: spec.visibleOnly ? [createWorkshopButton()] : [],
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
