import { slugify, paletteColor } from "./normalize.js"; // slugify no longer used for id, but ok to keep
import { dbg } from "../debug/logger.js";

const T = dbg("transforms");

function clean(s) {
    return String(s ?? "").trim();
}

export function buildElementsFromRows(nodeRows, edgeRows) {
    T.group("buildElementsFromRows");
    T.log("nodeRows:", nodeRows?.length, "edgeRows:", edgeRows?.length);

    // ---- nodes: strict ID from "Acronym (Org ID)" ----
    const seen = new Set();
    const skippedNodes = [];
    const duplicateNodes = [];

    const nodes = [];
    for (let i = 0; i < nodeRows.length; i++) {
        const r = nodeRows[i];

        const id = clean(r["Org ID"]);
        if (!id) {
            skippedNodes.push({ rowIndex: i, reason: "missing Acronym (Org ID)", row: r });
            continue;
        }
        if (seen.has(id)) {
            duplicateNodes.push({ rowIndex: i, id, row: r });
            // keep the FIRST occurrence; skip the duplicates
            continue;
        }
        seen.add(id);

        const orgName = clean(r["Organization Name"]);
        const orgType = clean(r["organization type"]);
        const geo = clean(r["Geographic Area"]);

        nodes.push({
            data: {
                id,
                label: id, // you can swap to orgName later; keeping id is consistent + compact
                orgName,
                nest: clean(r["Nest"]),
                orgCategory: orgType,
                geo,
                _nodeColor: paletteColor(orgType || geo || "unknown"),
            },
        });
    }

    const idSet = new Set(nodes.map((n) => n.data.id));

    // ---- edges: only keep edges whose endpoints exist ----
    const skippedEdges = [];
    const edges = [];

    for (let i = 0; i < edgeRows.length; i++) {
        const r = edgeRows[i];

        const source = clean(r["From agency"]);
        const target = clean(r["To agency"]);
        if (!source || !target) {
            skippedEdges.push({ rowIndex: i, reason: "missing source/target", row: r });
            continue;
        }

        const srcOk = idSet.has(source);
        const tgtOk = idSet.has(target);

        if (!srcOk || !tgtOk) {
            skippedEdges.push({
                rowIndex: i,
                reason: "endpoint not found in nodes",
                source,
                target,
                srcOk,
                tgtOk,
                row: r,
            });
            continue;
        }

        const relType = clean(r["Relationship type"]);
        const status = clean(r["Status"]);
        const description = clean(r["Description"]);

        edges.push({
            data: {
                id: `${source}__${target}__${slugify(relType)}__${edges.length}`,
                source,
                target,
                relType,
                status,
                description,
                _edgeColor: paletteColor(relType || status || "unknown"),
                _missingEndpoint: false,
            },
        });
    }

    const diagnostics = {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        skippedNodesCount: skippedNodes.length,
        duplicateNodesCount: duplicateNodes.length,
        skippedEdgesCount: skippedEdges.length,
        // keep a small sample so console isn't spammed
        skippedNodesSample: skippedNodes.slice(0, 5),
        duplicateNodesSample: duplicateNodes.slice(0, 5),
        skippedEdgesSample: skippedEdges.slice(0, 5),
    };

    T.log("diagnostics:", diagnostics);
    if (skippedNodes.length) T.warn("Skipped nodes sample:", diagnostics.skippedNodesSample);
    if (duplicateNodes.length) T.warn("Duplicate node IDs sample:", diagnostics.duplicateNodesSample);
    if (skippedEdges.length) T.warn("Skipped edges sample:", diagnostics.skippedEdgesSample);

    T.groupEnd();
    return { nodes, edges, diagnostics };
}