import { dbg } from "../debug/logger.js";
import { buildElementsFromRows } from "./transforms.js";

const L = dbg("dataloader");

// -------- fetch helpers --------
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

// -------- CSV parsing (RFC4180-ish, quote-safe) --------
// Handles: commas inside quotes, newlines inside quotes, "" escaping.
function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = "";
    let i = 0;
    let inQuotes = false;

    // Normalize newlines to \n
    text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    while (i < text.length) {
        const ch = text[i];

        if (inQuotes) {
            if (ch === '"') {
                const next = text[i + 1];
                if (next === '"') {
                    field += '"'; // escaped quote
                    i += 2;
                    continue;
                } else {
                    inQuotes = false;
                    i += 1;
                    continue;
                }
            } else {
                field += ch;
                i += 1;
                continue;
            }
        } else {
            if (ch === '"') {
                inQuotes = true;
                i += 1;
                continue;
            }
            if (ch === ",") {
                row.push(field);
                field = "";
                i += 1;
                continue;
            }
            if (ch === "\n") {
                row.push(field);
                field = "";
                // Avoid pushing a final totally-empty row from trailing newline
                if (!(row.length === 1 && row[0] === "" && rows.length > 0)) rows.push(row);
                row = [];
                i += 1;
                continue;
            }
            field += ch;
            i += 1;
        }
    }

    // flush last field/row
    row.push(field);
    if (!(row.length === 1 && row[0] === "" && rows.length > 0)) rows.push(row);

    if (rows.length === 0) return [];

    const headers = rows[0].map((h) => (h ?? "").trim());
    const out = [];

    for (let r = 1; r < rows.length; r++) {
        const vals = rows[r];
        if (vals.every((v) => (v ?? "").trim() === "")) continue; // skip blank lines
        const obj = {};
        for (let c = 0; c < headers.length; c++) {
            const key = headers[c] || `col_${c}`;
            obj[key] = (vals[c] ?? "").trim();
        }
        out.push(obj);
    }

    return out;
}

function parseMaybeJSONArray(s) {
    if (!s) return [];
    try {
        const v = JSON.parse(s);
        return Array.isArray(v) ? v : [];
    } catch {
        return [];
    }
}

const NODE_JSON_ARRAY_FIELDS = [
    "orgTypes",
    "geoTags",
    "nodeTypes",
    "governanceLevels",
    "functionalDomains",
    "roleTags",
    "lifelineTags",
];

// -------- public API --------
export async function loadCsvRows({
    nodesUrl = "/data/organizations_clean.csv",
    edgesUrl = "/data/edges_clean.csv",
} = {}) {
    L.group("loadCsvRows");
    L.log("Params:", { nodesUrl, edgesUrl });

    const [nodesText, edgesText] = await Promise.all([fetchText(nodesUrl), fetchText(edgesUrl)]);

    const nodeRows = parseCSV(nodesText);
    const edgeRows = parseCSV(edgesText);

    L.log("nodeRows:", nodeRows.length, nodeRows[0] ? Object.keys(nodeRows[0]) : "(none)");
    L.log("edgeRows:", edgeRows.length, edgeRows[0] ? Object.keys(edgeRows[0]) : "(none)");

    for (const n of nodeRows) {
        for (const fieldName of NODE_JSON_ARRAY_FIELDS) {
            const jsonKey = `${fieldName}_json`;
            if (jsonKey in n && !(fieldName in n)) {
                n[fieldName] = parseMaybeJSONArray(n[jsonKey]);
            }
        }
    }

    L.groupEnd();
    return { nodeRows, edgeRows };
}

export async function loadGraphData({
    graphUrl = "/data/graph.json",
    nodesUrl = "/data/organizations_clean.csv",
    edgesUrl = "/data/edges_clean.csv",
    allowCsvFallback = true,
} = {}) {
    L.group("loadGraphData");
    L.log("Params:", { graphUrl, nodesUrl, edgesUrl, allowCsvFallback });

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

        L.groupEnd();
        return {
            nodes,
            edges,
            diagnostics,
            source: "preprocessed-json",
            sourceUrls: { graphUrl },
        };
    } catch (err) {
        if (!allowCsvFallback) {
            L.groupEnd();
            throw err;
        }

        L.warn("[loadGraphData] preprocessed graph unavailable, falling back to CSV:", err);

        const { nodeRows, edgeRows } = await loadCsvRows({ nodesUrl, edgesUrl });
        const { nodes, edges, diagnostics } = buildElementsFromRows(nodeRows, edgeRows);

        L.groupEnd();
        return {
            nodes,
            edges,
            diagnostics,
            source: "runtime-csv",
            sourceUrls: { nodesUrl, edgesUrl },
        };
    }
}
