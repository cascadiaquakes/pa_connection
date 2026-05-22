import { slugify, paletteColor } from "./normalize.js";
import { dbg } from "../debug/logger.js";

const T = dbg("transforms");

function clean(s) {
    return String(s ?? "").trim();
}

function cleanId(s) {
    // match your python rule: remove internal whitespace
    return clean(s).replace(/\s+/g, "");
}

function parseJsonArrayField(r, fieldName) {
    if (Array.isArray(r[fieldName])) return r[fieldName];

    const s = clean(r[`${fieldName}_json`] ?? r[fieldName]);
    if (!s) return [];
    try {
        const v = JSON.parse(s);
        return Array.isArray(v) ? v : [];
    } catch {
        // tolerate legacy formats like "A;B" or "['A','B']" if they sneak in
        if (s.includes(";")) return s.split(";").map((x) => x.trim()).filter(Boolean);
        return [];
    }
}

export function buildElementsFromRows(nodeRows, edgeRows) {
    T.group("buildElementsFromRows");
    T.log("nodeRows:", nodeRows?.length, "edgeRows:", edgeRows?.length);

    // ---- nodes ----
    const seen = new Set();
    const skippedNodes = [];
    const duplicateNodes = [];
    const nodes = [];

    for (let i = 0; i < (nodeRows?.length ?? 0); i++) {
        const r = nodeRows[i];

        const id = cleanId(r["Org ID"]);
        if (!id) {
            skippedNodes.push({ rowIndex: i, reason: "missing Org ID", row: r });
            continue;
        }
        if (seen.has(id)) {
            duplicateNodes.push({ rowIndex: i, id, row: r });
            continue; // keep first
        }
        seen.add(id);

        const orgName = clean(r["Organization Name"]);
        const orgTypePrimary = clean(r["orgTypePrimary"]);
        const geoPrimary = clean(r["geoPrimary"]);
        const orgTypes = parseJsonArrayField(r, "orgTypes");
        const geoTags = parseJsonArrayField(r, "geoTags");
        const nodeTypes = parseJsonArrayField(r, "nodeTypes");
        const governanceLevels = parseJsonArrayField(r, "governanceLevels");
        const functionalDomains = parseJsonArrayField(r, "functionalDomains");
        const roleTags = parseJsonArrayField(r, "roleTags");
        const lifelineTags = parseJsonArrayField(r, "lifelineTags");

        nodes.push({
            data: {
                id,
                // label choice: keep id compact, but you can switch later
                label: id,
                orgName,

                // for layout/styling
                orgTypePrimary,
                geoPrimary,

                // for filtering (multi-category)
                orgTypes,
                geoTags,
                nodeTypePrimary: clean(r["nodeTypePrimary"]),
                nodeTypes,
                governanceLevelPrimary: clean(r["governanceLevelPrimary"]),
                governanceLevels,
                functionalDomainPrimary: clean(r["functionalDomainPrimary"]),
                functionalDomains,
                rolePrimary: clean(r["rolePrimary"]),
                roleTags,
                femaLifelinePrimary: clean(r["femaLifelinePrimary"]),
                lifelineTags,

                // carry-through metadata
                notes: clean(r["Notes"]),
                primary: clean(r["Primary"]),
                secondary: clean(r["2ndry"]),
                url: clean(r["url"]),
                reviewFlag: clean(r["review_flag"]),
                reviewNote: clean(r["review_note"]),

                _nodeColor: paletteColor(orgTypePrimary || geoPrimary || "unknown"),
            },
        });
    }

    const idSet = new Set(nodes.map((n) => n.data.id));

    // ---- edges ----
    const skippedEdges = [];
    const edges = [];

    for (let i = 0; i < (edgeRows?.length ?? 0); i++) {
        const r = edgeRows[i];

        const source = cleanId(r["From agency"]);
        const target = cleanId(r["To agency"]);

        if (!source || !target) {
            skippedEdges.push({ rowIndex: i, reason: "missing source/target", row: r });
            continue;
        }

        const srcOk = idSet.has(source);
        const tgtOk = idSet.has(target);

        // per your policy: do not guess/fix; just skip + report
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
                // stable-ish, but allow duplicates via suffix
                id: `${source}__${target}__${slugify(relType || "rel")}__${edges.length}`,
                source,
                target,
                relType,
                status,
                description,
                _edgeColor: paletteColor(relType || status || "unknown"),
            },
        });
    }

    const diagnostics = {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        skippedNodesCount: skippedNodes.length,
        duplicateNodesCount: duplicateNodes.length,
        skippedEdgesCount: skippedEdges.length,
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
