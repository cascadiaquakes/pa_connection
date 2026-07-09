import { NODE_FILTER_SPECS } from "../config/nodeDimensions.js";

function asSet(x) {
    return x instanceof Set ? x : new Set(x ?? []);
}

function isEdge(el) {
    return !!el?.data?.source && !!el?.data?.target;
}

function isNode(el) {
    return !!el?.data?.id && !isEdge(el);
}

function canonicalPair(a, b) {
    return a < b ? [a, b] : [b, a];
}

function nodeValues(nodeData, arrayKey, primaryKey) {
    const raw = nodeData[arrayKey];
    if (Array.isArray(raw) && raw.length > 0) {
        return raw.map((v) => String(v ?? ""));
    }

    const primary = String(nodeData[primaryKey] ?? "");
    return primary ? [primary] : [""];
}

function matchesAllowed(nodeData, allowedValues, arrayKey, primaryKey) {
    if (!(allowedValues instanceof Set) || allowedValues.size === 0) return false;
    return nodeValues(nodeData, arrayKey, primaryKey).some((value) => allowedValues.has(value));
}

function nodePassesFilters(nodeData, view) {
    return NODE_FILTER_SPECS.every((spec) =>
        matchesAllowed(
            nodeData,
            view[spec.stateKey],
            spec.arrayKey,
            spec.primaryKey
        )
    );
}

function edgePassesFilters(edgeData, allowedRelTypes) {
    const rt = String(edgeData.relType ?? "");
    return allowedRelTypes.has(rt);
}

export function deriveGraphView(
    rawElements,
    view = {}
) {
    const normalizedView = {
        ...view,
        allowedRelTypes: asSet(view.allowedRelTypes),
        prune: view.prune ?? true,
        edgeDisplayMode: view.edgeDisplayMode ?? "simplified",
    };
    for (const spec of NODE_FILTER_SPECS) {
        normalizedView[spec.stateKey] = asSet(view[spec.stateKey]);
    }

    const rawNodes = rawElements.filter((el) => isNode(el) && el.data?.isGrid !== "true");
    const rawEdges = rawElements.filter((el) => isEdge(el) && el.data?.isGrid !== "true");
    const gridElements = rawElements.filter((el) => el.data?.isGrid === "true");

    // 1) filter nodes
    const keptNodes = rawNodes.filter((n) => nodePassesFilters(n.data, normalizedView));

    const keptNodeIds = new Set(keptNodes.map((n) => String(n.data.id)));

    // 2) filter raw edges by rel type + endpoints still present
    const filteredRawEdges = rawEdges.filter((e) => {
        if (!edgePassesFilters(e.data, normalizedView.allowedRelTypes)) return false;

        const s = String(e.data.source);
        const t = String(e.data.target);

        return keptNodeIds.has(s) && keptNodeIds.has(t);
    });

    // 3) optional prune based on filtered raw graph connectivity
    let finalNodeIds = keptNodeIds;

    if (normalizedView.prune) {
        const connectedIds = new Set();
        for (const e of filteredRawEdges) {
            connectedIds.add(String(e.data.source));
            connectedIds.add(String(e.data.target));
        }
        finalNodeIds = connectedIds;
    }

    const finalNodes = keptNodes.filter((n) => finalNodeIds.has(String(n.data.id)));

    // Keep only raw edges whose endpoints survived prune
    const finalRawEdges = filteredRawEdges.filter((e) => {
        const s = String(e.data.source);
        const t = String(e.data.target);
        return finalNodeIds.has(s) && finalNodeIds.has(t);
    });

    let finalEdges;
    if (normalizedView.edgeDisplayMode === "detailed") {
        finalEdges = finalRawEdges;
    } else {
        finalEdges = aggregateEdges(finalRawEdges);
    }

    return {
        nodes: finalNodes,
        edges: finalEdges,
        grid: gridElements,
        elements: [...gridElements, ...finalNodes, ...finalEdges],
    };
}

export function aggregateEdges(rawEdges) {
    const byPair = new Map();

    for (const e of rawEdges) {
        const s = String(e.data.source);
        const t = String(e.data.target);
        const relType = String(e.data.relType ?? "");

        const [a, b] = canonicalPair(s, t);
        const key = `${a}|||${b}`;

        if (!byPair.has(key)) {
            byPair.set(key, {
                data: {
                    id: `agg:${key}`,
                    source: a,
                    target: b,
                    isAggregated: "true",
                    _dir: "none",
                    _hasForward: false,
                    _hasReverse: false,
                    relTypes: [],
                    rawCount: 0,
                    _edgeColor: "#9aa0a6",
                    _width: 3,

                    // new, minimal addition
                    directionalRelTypes: {
                        forward: [],
                        reverse: [],
                    },
                },
            });
        }

        const agg = byPair.get(key);

        agg.data.rawCount += 1;

        if (!agg.data.relTypes.includes(relType)) {
            agg.data.relTypes.push(relType);
        }

        if (s === a && t === b) {
            agg.data._hasForward = true;
            if (!agg.data.directionalRelTypes.forward.includes(relType)) {
                agg.data.directionalRelTypes.forward.push(relType);
            }
        }

        if (s === b && t === a) {
            agg.data._hasReverse = true;
            if (!agg.data.directionalRelTypes.reverse.includes(relType)) {
                agg.data.directionalRelTypes.reverse.push(relType);
            }
        }
    }

    for (const agg of byPair.values()) {
        const f = agg.data._hasForward;
        const r = agg.data._hasReverse;

        if (f && r) agg.data._dir = "bidir";
        else if (f) agg.data._dir = "forward";
        else if (r) agg.data._dir = "reverse";
        else agg.data._dir = "none";

        agg.data._width = Math.min(12, 1 + 0.8 * agg.data.rawCount);

        delete agg.data._hasForward;
        delete agg.data._hasReverse;
    }

    return Array.from(byPair.values());
}
