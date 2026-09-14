import { searchNodeIndex } from "../graph/nodeSearch.js";
import { selectNodeById } from "../graph/graphSelection.js";
import { appendHighlightedText, createElement } from "./dom.js";

function debounce(fn, delay = 150) {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), delay);
    };
}

export function renderSearchResults(
    resultsEl,
    results,
    query,
    {
        onSelect,
        onToggleHighlight = () => {},
        selectedIds = new Set(),
    }
) {
    const doc = resultsEl.ownerDocument ?? document;
    const items = results.map((result) => {
        const title = createElement(doc, "div", { className: "search-title" });
        appendHighlightedText(title, result.title, query, doc);

        const children = [title];
        if (result.subtitle) {
            const subtitle = createElement(doc, "div", {
                className: "search-subtitle",
            });
            appendHighlightedText(subtitle, result.subtitle, query, doc);
            children.push(subtitle);
        }

        const checkbox = createElement(doc, "input", {
            className: "search-result-checkbox",
            attributes: {
                type: "checkbox",
                "aria-label": `Highlight ${result.title}`,
            },
        });
        checkbox.checked = selectedIds.has(result.id);
        checkbox.addEventListener("click", (event) => {
            event.stopPropagation();
        });
        checkbox.addEventListener("change", () => {
            onToggleHighlight(result.id, checkbox.checked);
        });

        const resultButton = createElement(
            doc,
            "button",
            {
                className: "search-item",
                attributes: { type: "button" },
                dataset: { id: result.id },
            },
            children
        );
        resultButton.addEventListener("click", () => onSelect(result.id));

        return createElement(
            doc,
            "div",
            {
                className: "search-result-row",
                dataset: { id: result.id },
            },
            [checkbox, resultButton]
        );
    });

    resultsEl.replaceChildren(...items);
}

export function initSearchTab(cy) {
    const input = document.getElementById("searchInput");
    const resultsEl = document.getElementById("searchResults");
    const countEl = document.getElementById("searchCount");
    const selectAllButton = document.getElementById("btnSearchSelectAll");

    if (!input || !resultsEl || !countEl) {
        console.warn("[search] Missing DOM elements");
        return;
    }

    const index = cy.scratch("_nodeSearchIndex") || [];
    let currentResults = searchNodeIndex(index, "");

    function getControls() {
        return cy.scratch("_controls");
    }

    function render(results) {
        currentResults = results;
        const selectedIds = getControls()?.getSelectedOrganizationIds?.() ?? new Set();
        countEl.textContent = `${results.length} result${results.length === 1 ? "" : "s"}`;

        if (selectAllButton) {
            const selectedCount = results.filter((result) => selectedIds.has(result.id)).length;
            selectAllButton.disabled = results.length === 0;
            selectAllButton.textContent =
                results.length > 0 && selectedCount === results.length
                    ? "Clear all"
                    : "Select all";
        }

        renderSearchResults(resultsEl, results, input.value, {
            selectedIds,
            onToggleHighlight: (id, checked) => {
                getControls()?.setSelectedOrganizationsByIds?.([id], { checked });
                render(currentResults);
            },
            onSelect: (id) => {
                let node = cy.getElementById(id);

                if (!node.nonempty()) {
                    const controls = getControls();
                    controls?.resetToFullView?.();
                    node = cy.getElementById(id);
                }

                if (node.nonempty()) {
                    selectNodeById(cy, id, { center: true });
                }
            },
        });
    }

    const runSearch = debounce((q) => {
        const results = searchNodeIndex(index, q);
        render(results);
    }, 150);

    input.addEventListener("input", (e) => {
        runSearch(e.target.value);
    });

    selectAllButton?.addEventListener("click", () => {
        const controls = getControls();
        const selectedIds = controls?.getSelectedOrganizationIds?.() ?? new Set();
        const allSelected =
            currentResults.length > 0 &&
            currentResults.every((result) => selectedIds.has(result.id));
        controls?.setSelectedOrganizationsByIds?.(
            currentResults.map((result) => result.id),
            { checked: !allSelected }
        );
        render(currentResults);
    });

    document.addEventListener("organizationSelectionChanged", () => {
        render(currentResults);
    });

    // initial render (all nodes)
    render(currentResults);
}
