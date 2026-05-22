import { searchNodeIndex } from "../graph/nodeSearch.js";

function debounce(fn, delay = 150) {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), delay);
    };
}

function highlightMatch(text, query) {
    if (!query) return text;

    const q = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(${q})`, "ig");

    return text.replace(re, "<mark>$1</mark>");
}

function selectSingleNode(cy, nodeId) {
    cy.batch(() => {
        cy.elements().unselect();
        const node = cy.getElementById(nodeId);
        if (node.nonempty()) {
            node.select();
            cy.animate({
                center: { eles: node },
                duration: 250,
            });
        }
    });
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

        const q = input.value;

        resultsEl.innerHTML = results
            .map((r) => {
                const title = highlightMatch(r.title, q);
                const subtitle = r.subtitle ? highlightMatch(r.subtitle, q) : "";

                return `
        <div class="search-item" data-id="${r.id}">
            <div class="search-title">${title}</div>
            ${subtitle ? `<div class="search-subtitle">${subtitle}</div>` : ""}
        </div>
        `;
            })
            .join("");

        resultsEl.querySelectorAll(".search-item").forEach((el) => {
            el.addEventListener("click", () => {
                const id = el.getAttribute("data-id");

                let node = cy.getElementById(id);

                if (!node.nonempty()) {
                    // reset view to guarantee visibility
                    const controls = cy.scratch("_controls");
                    if (controls?.resetToFullView) {
                        controls.resetToFullView();
                    }
                    node = cy.getElementById(id);
                }

                if (node.nonempty()) {
                    selectSingleNode(cy, id);
                }
            });
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