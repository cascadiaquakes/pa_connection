import Papa from "papaparse";

import { dbg } from "../debug/logger.js";

const L = dbg("dataloader");

async function fetchText(url) {
    const r = await fetch(url, { cache: "no-store" });
    const ct = (r.headers.get("content-type") || "").toLowerCase();

    L.log("[fetchText] HTTP:", r.status, r.statusText, "CT:", ct);

    // If it smells like HTML, read a preview and throw.
    if (ct.includes("text/html")) {
        const html = await r.text();
        L.err("[fetchText] Got HTML instead of CSV. First 300 chars:\n", html.slice(0, 300));
        throw new Error(
            `Expected CSV but got HTML from ${url}. This usually means the file path is wrong or rewritten to index.html.`
        );
    }

    if (!r.ok) throw new Error(`Failed to fetch ${url}: ${r.status} ${r.statusText}`);
    return await r.text();
}

async function fetchJson(url) {
    const r = await fetch(url, { cache: "no-store" });
    const ct = (r.headers.get("content-type") || "").toLowerCase();

    L.log("[fetchJson] HTTP:", r.status, r.statusText, "CT:", ct);

    if (ct.includes("text/html")) {
        const html = await r.text();
        L.err("[fetchJson] Got HTML instead of JSON. First 300 chars:\n", html.slice(0, 300));
        throw new Error(
            `Expected JSON but got HTML from ${url}. This usually means the file path is wrong or rewritten to index.html.`
        );
    }

    if (!r.ok) throw new Error(`Failed to fetch ${url}: ${r.status} ${r.statusText}`);
    return await r.json();
}

function parseCSV(text) {
    const result = Papa.parse(text, {
        header: true,
        skipEmptyLines: "greedy",
        transformHeader: (header) => String(header ?? "").trim(),
        transform: (value) => String(value ?? "").trim(),
    });

    if (result.errors.length > 0) {
        const firstError = result.errors[0];
        throw new Error(
            `Failed to parse CSV at row ${firstError.row ?? "unknown"}: ${firstError.message}`
        );
    }

    return result.data;
}

export async function loadWorkshopSelection({
    workshopUrl = "/data/workshop_selection.csv",
} = {}) {
    L.group("loadWorkshopSelection");
    L.log("Params:", { workshopUrl });

    try {
        const workshopText = await fetchText(workshopUrl);
        const workshopRows = parseCSV(workshopText);

        L.log(
            "workshopRows:",
            workshopRows.length,
            workshopRows[0] ? Object.keys(workshopRows[0]) : "(none)"
        );
        return workshopRows;
    } finally {
        L.groupEnd();
    }
}

export async function loadGraphData({ graphUrl = "/data/graph.json" } = {}) {
    L.group("loadGraphData");
    L.log("Params:", { graphUrl });

    try {
        const payload = await fetchJson(graphUrl);
        const nodes = payload?.elements?.nodes ?? payload?.nodes;
        const edges = payload?.elements?.edges ?? payload?.edges;

        if (!Array.isArray(nodes) || !Array.isArray(edges)) {
            throw new Error(`Preprocessed graph payload is missing array elements at ${graphUrl}.`);
        }

        const diagnostics = payload?.diagnostics ?? null;
        L.log("[loadGraphData] using preprocessed graph JSON:", {
            nodes: nodes.length,
            edges: edges.length,
        });

        return {
            nodes,
            edges,
            diagnostics,
            source: "preprocessed-json",
            sourceUrl: graphUrl,
        };
    } finally {
        L.groupEnd();
    }
}

export async function loadMenuDefinitions({
    definitionsUrl = "/data/menuDefinitions.json",
} = {}) {
    L.group("loadMenuDefinitions");
    L.log("Params:", { definitionsUrl });

    try {
        const definitions = await fetchJson(definitionsUrl);
        if (!definitions || typeof definitions !== "object" || Array.isArray(definitions)) {
            throw new Error(`Menu definitions payload must be a JSON object at ${definitionsUrl}.`);
        }
        return definitions;
    } finally {
        L.groupEnd();
    }
}
