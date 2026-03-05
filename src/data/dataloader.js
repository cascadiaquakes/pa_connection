import { dbg } from "../debug/logger.js";

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

    // Convenience: decode orgTypes_json -> orgTypes array
    // (Keeps orgTypePrimary for layout/styling; orgTypes for filtering)
    for (const n of nodeRows) {
        if ("orgTypes_json" in n && !("orgTypes" in n)) {
            n.orgTypes = parseMaybeJSONArray(n.orgTypes_json);
        }
    }

    L.groupEnd();
    return { nodeRows, edgeRows };
}