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
    if (Array.isArray(raw)) return raw.map((v) => String(v ?? ""));
    return [String(nodeData[primaryKey] ?? "")];
}

function matchesAllowed(nodeData, allowedValues, arrayKey, primaryKey) {
    if (!(allowedValues instanceof Set) || allowedValues.size === 0) return false;
    return nodeValues(nodeData, arrayKey, primaryKey).some((value) => allowedValues.has(value));
}

function nodePassesFilters(
    nodeData,
    {
        allowedOrgCategories,
        allowedGeos,
        allowedNodeTypes,
        allowedGovernanceLevels,
        allowedFunctionalDomains,
        allowedRoles,
        allowedLifelines,
    }
) {
    return (
        matchesAllowed(nodeData, allowedOrgCategories, "orgTypes", "orgTypePrimary") &&
        matchesAllowed(nodeData, allowedGeos, "geoTags", "geoPrimary") &&
        matchesAllowed(nodeData, allowedNodeTypes, "nodeTypes", "nodeTypePrimary") &&
        matchesAllowed(
            nodeData,
            allowedGovernanceLevels,
            "governanceLevels",
            "governanceLevelPrimary"
        ) &&
        matchesAllowed(
            nodeData,
            allowedFunctionalDomains,
            "functionalDomains",
            "functionalDomainPrimary"
        ) &&
        matchesAllowed(nodeData, allowedRoles, "roleTags", "rolePrimary") &&
        matchesAllowed(nodeData, allowedLifelines, "lifelineTags", "femaLifelinePrimary")
    );
}

function edgePassesFilters(edgeData, allowedRelTypes) {
    const rt = String(edgeData.relType ?? "");
    return allowedRelTypes.has(rt);
}

export function deriveGraphView(
    rawElements,
    {
        allowedOrgCategories = new Set(),
        allowedGeos = new Set(),
        allowedNodeTypes = new Set(),
        allowedGovernanceLevels = new Set(),
        allowedFunctionalDomains = new Set(),
        allowedRoles = new Set(),
        allowedLifelines = new Set(),
        allowedRelTypes = new Set(),
        prune = true,
        edgeDisplayMode = "simplified", // "simplified" | "detailed"
    } = {}
) {
    allowedOrgCategories = asSet(allowedOrgCategories);
    allowedGeos = asSet(allowedGeos);
    allowedNodeTypes = asSet(allowedNodeTypes);
    allowedGovernanceLevels = asSet(allowedGovernanceLevels);
    allowedFunctionalDomains = asSet(allowedFunctionalDomains);
    allowedRoles = asSet(allowedRoles);
    allowedLifelines = asSet(allowedLifelines);
    allowedRelTypes = asSet(allowedRelTypes);

    const rawNodes = rawElements.filter((el) => isNode(el) && el.data?.isGrid !== "true");
    const rawEdges = rawElements.filter((el) => isEdge(el) && el.data?.isGrid !== "true");
    const gridElements = rawElements.filter((el) => el.data?.isGrid === "true");

    // 1) filter nodes
    const keptNodes = rawNodes.filter((n) => nodePassesFilters(n.data, {
        allowedOrgCategories,
        allowedGeos,
        allowedNodeTypes,
        allowedGovernanceLevels,
        allowedFunctionalDomains,
        allowedRoles,
        allowedLifelines,
    }));

    const keptNodeIds = new Set(keptNodes.map((n) => String(n.data.id)));

    // 2) filter raw edges by rel type + endpoints still present
    const filteredRawEdges = rawEdges.filter((e) => {
        if (!edgePassesFilters(e.data, allowedRelTypes)) return false;

        const s = String(e.data.source);
        const t = String(e.data.target);

        return keptNodeIds.has(s) && keptNodeIds.has(t);
    });

    // 3) optional prune based on filtered raw graph connectivity
    let finalNodeIds = keptNodeIds;

    if (prune) {
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
    if (edgeDisplayMode === "detailed") {
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
