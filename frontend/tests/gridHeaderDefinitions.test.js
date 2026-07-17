import assert from "node:assert/strict";
import test from "node:test";

import {
    gridDefinitionKeyForAxis,
    resolveGridHeaderDefinition,
} from "../src/graph/gridHeaderDefinitions.js";

const menuDefinitions = {
    orgCat: {
        title: "Organization Category",
        definition: "The broad type of organization.",
        categories: {
            Tribal: "Tribal governments, tribal organizations, or tribally led entities.",
        },
    },
    geo: {
        title: "Geographic Area",
        definition: "The main geography.",
        categories: {
            Washington: "Organizations or activities primarily focused on Washington.",
        },
    },
};

test("grid header axes map to menu definition keys", () => {
    assert.equal(gridDefinitionKeyForAxis("col"), "orgCat");
    assert.equal(gridDefinitionKeyForAxis("row"), "geo");
    assert.equal(gridDefinitionKeyForAxis("other"), null);
});

test("grid header definitions resolve category text from explicit key", () => {
    assert.deepEqual(
        resolveGridHeaderDefinition(
            {
                label: "Tribal",
                gridKey: "Tribal",
                gridAxis: "col",
                gridDefinitionKey: "orgCat",
            },
            menuDefinitions
        ),
        {
            key: "orgCat",
            label: "Tribal",
            title: "Organization Category",
            dimensionDefinition: "The broad type of organization.",
            categoryDefinition: "Tribal governments, tribal organizations, or tribally led entities.",
        }
    );
});

test("grid header definitions fall back from axis to definition key", () => {
    const resolved = resolveGridHeaderDefinition(
        {
            label: "Washington",
            gridAxis: "row",
        },
        menuDefinitions
    );

    assert.equal(resolved.key, "geo");
    assert.equal(
        resolved.categoryDefinition,
        "Organizations or activities primarily focused on Washington."
    );
});
