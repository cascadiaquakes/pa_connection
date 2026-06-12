import assert from "node:assert/strict";
import test from "node:test";

import { buildNodeSearchIndex, searchNodeIndex } from "../src/graph/nodeSearch.js";

const elements = [
    {
        data: {
            id: "beta",
            orgName: "Beta Agency",
            orgTypes: ["Government"],
            nodeTypes: ["Organization"],
            geoPrimary: "Oregon",
            governanceLevels: ["State"],
            functionalDomains: ["Emergency Management"],
            roleTags: ["Coordination"],
            lifelineTags: ["Communications"],
            notes: "Maintains regional response data.",
        },
    },
    {
        data: {
            id: "alpha",
            orgName: "Alpha Center",
            orgTypes: ["Academic"],
            nodeTypes: ["Program"],
            geoPrimary: "Washington",
            governanceLevels: ["Non Governmental"],
            functionalDomains: ["Earthquake Science"],
            roleTags: ["Knowledge Provider"],
            lifelineTags: [],
        },
    },
    { data: { id: "edge", source: "alpha", target: "beta" } },
];

test("empty search returns nodes sorted by title", () => {
    const results = searchNodeIndex(buildNodeSearchIndex(elements), "");
    assert.deepEqual(results.map((result) => result.id), ["alpha", "beta"]);
});

test("search matches names and reports the first additional matching field", () => {
    const results = searchNodeIndex(buildNodeSearchIndex(elements), "alpha");
    assert.equal(results.length, 1);
    assert.equal(results[0].id, "alpha");
    assert.equal(results[0].subtitle, "ID: alpha");
});

test("search matches configured metadata and reports its field", () => {
    const results = searchNodeIndex(buildNodeSearchIndex(elements), "response data");
    assert.equal(results.length, 1);
    assert.equal(results[0].id, "beta");
    assert.match(results[0].subtitle, /^Notes:/);
});
