import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
    loadWorkshopSelection,
    workshopSelectionFileAvailable,
} from "../src/data/dataloader.js";

const fixtureUrl = new URL("./fixtures/workshop_test.csv", import.meta.url);

test("workshop CSV is detected and parsed when available", async (t) => {
    const originalFetch = globalThis.fetch;
    const csv = await readFile(fixtureUrl, "utf8");
    globalThis.fetch = async (_url, options = {}) => {
        if (options.method === "HEAD") {
            return new Response(null, { headers: { "content-type": "text/csv" } });
        }
        return new Response(csv, { headers: { "content-type": "text/csv" } });
    };
    t.after(() => { globalThis.fetch = originalFetch; });

    assert.equal(await workshopSelectionFileAvailable("/data/workshop_selection.csv"), true);
    assert.deepEqual(
        await loadWorkshopSelection({ workshopUrl: "/data/workshop_selection.csv" }),
        [
            { node_id: "org-001", name: "Example Resilience Organization" },
            { node_id: "org-002", name: "Example Emergency Program" },
        ]
    );
});

test("workshop control stays unavailable when a missing file resolves to HTML", async (t) => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(null, {
        headers: { "content-type": "text/html" },
    });
    t.after(() => { globalThis.fetch = originalFetch; });

    assert.equal(await workshopSelectionFileAvailable("/data/workshop_selection.csv"), false);
});
