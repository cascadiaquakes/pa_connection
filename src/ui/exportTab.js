function cloneData(data = {}) {
    return JSON.parse(JSON.stringify(data));
}

function downloadJson(filename, payload) {
    const jsonText = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonText], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
}

function isEdge(el) {
    return !!el?.data?.source && !!el?.data?.target;
}

function isNode(el) {
    return !!el?.data?.id && !isEdge(el);
}

function makeExportPayload({ nodes, edges }) {
    return {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        exportMeta: {
            format: "graph-json",
            scope: "all",
        },
        elements: {
            nodes: nodes.map((n) => ({ data: cloneData(n.data) })),
            edges: edges.map((e) => ({ data: cloneData(e.data) })),
        },
    };
}

function defaultFilename() {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    return `graph-export-all-${stamp}.json`;
}

export function initExportTab(cy) {
    const btnEl = document.getElementById("btnExportJson");
    const statusEl = document.getElementById("exportStatus");

    if (!btnEl || !statusEl) {
        console.warn("[export] Missing export tab elements");
        return;
    }

    btnEl.addEventListener("click", () => {
        const rawElements = cy.scratch("_rawElements") ?? [];
        const nodes = rawElements.filter((el) => isNode(el) && el.data?.isGrid !== "true");
        const edges = rawElements.filter((el) => isEdge(el) && el.data?.isGrid !== "true");

        const payload = makeExportPayload({ nodes, edges });
        downloadJson(defaultFilename(), payload);
        statusEl.textContent = `Exported ${nodes.length} nodes, ${edges.length} edges.`;
    });

    const rawElements = cy.scratch("_rawElements") ?? [];
    const nodeCount = rawElements.filter((el) => isNode(el) && el.data?.isGrid !== "true").length;
    const edgeCount = rawElements.filter((el) => isEdge(el) && el.data?.isGrid !== "true").length;
    statusEl.textContent = `Ready: ${nodeCount} nodes, ${edgeCount} edges.`;
}
