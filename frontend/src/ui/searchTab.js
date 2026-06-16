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

export function renderSearchResults(resultsEl, results, query, onSelect) {
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

        const item = createElement(
            doc,
            "button",
            {
                className: "search-item",
                attributes: { type: "button" },
                dataset: { id: result.id },
            },
            children
        );
        item.addEventListener("click", () => onSelect(result.id));
        return item;
    });

    resultsEl.replaceChildren(...items);
}

export function initSearchTab(cy) {
    const input = document.getElementById("searchInput");
    const resultsEl = document.getElementById("searchResults");
    const countEl = document.getElementById("searchCount");

    if (!input || !resultsEl || !countEl) {
        console.warn("[search] Missing DOM elements");
        return;
    }

    const index = cy.scratch("_nodeSearchIndex") || [];

    function render(results) {
        countEl.textContent = `${results.length} result${results.length === 1 ? "" : "s"}`;

        renderSearchResults(resultsEl, results, input.value, (id) => {
            let node = cy.getElementById(id);

            if (!node.nonempty()) {
                const controls = cy.scratch("_controls");
                controls?.resetToFullView?.();
                node = cy.getElementById(id);
            }

            if (node.nonempty()) {
                selectNodeById(cy, id, { center: true });
            }
        });
    }

    const runSearch = debounce((q) => {
        const results = searchNodeIndex(index, q);
        render(results);
    }, 150);

    input.addEventListener("input", (e) => {
        runSearch(e.target.value);
    });

    // initial render (all nodes)
    render(searchNodeIndex(index, ""));
}
