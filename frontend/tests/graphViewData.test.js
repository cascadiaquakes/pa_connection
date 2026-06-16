import assert from "node:assert/strict";
import test from "node:test";

import { aggregateEdges, deriveGraphView } from "../src/graph/graphViewData.js";

function node(id, overrides = {}) {
    return {
        data: {
            id,
            orgTypes: ["Government"],
            orgTypePrimary: "Government",
            geoTags: ["Oregon"],
            geoPrimary: "Oregon",
            nodeTypes: ["Organization"],
            nodeTypePrimary: "Organization",
            governanceLevels: ["State"],
            governanceLevelPrimary: "State",
            roleTags: ["Coordination"],
            rolePrimary: "Coordination",
            lifelineTags: ["Communications"],
            femaLifelinePrimary: "Communications",
            ...overrides,
        },
    };
}

function edge(id, source, target, relType) {
    return { data: { id, source, target, relType } };
}

function fullFilterState(overrides = {}) {
    return {
        allowedOrgCategories: new Set(["Government", "Academic", "Nonprofit Community"]),
        allowedGeos: new Set(["Oregon", "Washington"]),
        allowedNodeTypes: new Set(["Organization"]),
        allowedGovernanceLevels: new Set(["State", "Local"]),
        allowedRoles: new Set(["Coordination", "Emergency Response"]),
        allowedLifelines: new Set(["Communications", "Safety Security"]),
        allowedRelTypes: new Set(["data", "funding"]),
        prune: false,
        edgeDisplayMode: "detailed",
        ...overrides,
    };
}

const nodes = [
    node("a", { orgTypes: ["Government", "Academic"] }),
    node("b", {
        orgTypes: ["Nonprofit Community"],
        orgTypePrimary: "Nonprofit Community",
        geoTags: ["Washington"],
        geoPrimary: "Washington",
        governanceLevels: ["Local"],
        governanceLevelPrimary: "Local",
        roleTags: ["Emergency Response"],
        rolePrimary: "Emergency Response",
        lifelineTags: ["Safety Security"],
        femaLifelinePrimary: "Safety Security",
    }),
    node("isolated"),
];

const edges = [
    edge("ab-data", "a", "b", "data"),
    edge("ba-funding", "b", "a", "funding"),
];

test("node filtering is OR within a dimension and AND across dimensions", () => {
    const view = deriveGraphView([...nodes, ...edges], fullFilterState({
        allowedOrgCategories: new Set(["Academic", "Nonprofit Community"]),
        allowedGeos: new Set(["Oregon"]),
    }));

    assert.deepEqual(view.nodes.map((item) => item.data.id), ["a"]);
    assert.equal(view.edges.length, 0);
});

test("edge filtering and pruning use the filtered raw graph", () => {
    const view = deriveGraphView([...nodes, ...edges], fullFilterState({
        allowedRelTypes: new Set(["data"]),
        prune: true,
    }));

    assert.deepEqual(view.nodes.map((item) => item.data.id).sort(), ["a", "b"]);
    assert.deepEqual(view.edges.map((item) => item.data.id), ["ab-data"]);
});

test("simplified mode aggregates both directions and relationship types", () => {
    const view = deriveGraphView([...nodes, ...edges], fullFilterState({
        edgeDisplayMode: "simplified",
    }));

    assert.equal(view.edges.length, 1);
    assert.equal(view.edges[0].data._dir, "bidir");
    assert.equal(view.edges[0].data.rawCount, 2);
    assert.deepEqual(view.edges[0].data.relTypes.sort(), ["data", "funding"]);
    assert.deepEqual(view.edges[0].data.directionalRelTypes.forward, ["data"]);
    assert.deepEqual(view.edges[0].data.directionalRelTypes.reverse, ["funding"]);
});

test("aggregateEdges keeps parallel direction metadata stable", () => {
    const aggregated = aggregateEdges([
        edge("one", "a", "b", "data"),
        edge("two", "a", "b", "funding"),
    ]);

    assert.equal(aggregated.length, 1);
    assert.equal(aggregated[0].data.source, "a");
    assert.equal(aggregated[0].data.target, "b");
    assert.equal(aggregated[0].data._dir, "forward");
    assert.deepEqual(aggregated[0].data.directionalRelTypes.forward, ["data", "funding"]);
});
