import * as XLSX from "xlsx";
import { dbg } from "../debug/logger.js";

const L = dbg("dataloader");

async function fetchArrayBuffer(url) {
    const r = await fetch(url, { cache: "no-store" });
    const ct = (r.headers.get("content-type") || "").toLowerCase();

    console.log("[dataloader] HTTP:", r.status, r.statusText, "CT:", ct);

    // If it smells like HTML, read as text and show a preview
    if (ct.includes("text/html")) {
        const html = await r.text();
        console.error("[dataloader] Got HTML instead of XLSX. First 300 chars:\n", html.slice(0, 300));
        throw new Error(
            `Expected XLSX but got HTML from ${url}. This usually means the file path is wrong or rewritten to index.html.`
        );
    }

    if (!r.ok) throw new Error(`Failed to fetch ${url}: ${r.status} ${r.statusText}`);

    const buf = await r.arrayBuffer();
    console.log("[dataloader] bytes:", buf.byteLength);
    return buf;
}

function sheetToRows(workbook, sheetName) {
    L.group(`sheetToRows("${sheetName}")`);

    const names = workbook.SheetNames || [];
    L.log("Workbook sheet names:", names);

    const ws = workbook.Sheets[sheetName];
    if (!ws) {
        L.err(`Sheet "${sheetName}" not found.`);
        L.log("Available:", names);
        L.groupEnd();
        throw new Error(`Sheet "${sheetName}" not found. Available: ${names.join(", ")}`);
    }

    const range = ws["!ref"];
    L.log("Sheet range (!ref):", range);

    // dump first few header cells for sanity
    const headerPreview = [];
    for (let c = 0; c < 10; c++) {
        const addr = XLSX.utils.encode_cell({ r: 0, c });
        headerPreview.push([addr, ws[addr]?.v ?? null]);
    }
    L.log("Header row preview (row 1):", headerPreview);

    const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
    L.log("Row count:", rows.length);
    if (rows.length) {
        L.log("First row keys:", Object.keys(rows[0]));
        L.log("First row sample:", rows[0]);
    } else {
        L.warn("Sheet parsed to zero rows.");
    }

    L.groupEnd();
    return rows;
}

export async function loadWorkbookRows({
                                           url = "/data.xlsx",
                                           nodesSheet = "in",
                                           edgesSheet = "Relationship",
                                       } = {}) {
    L.group("loadWorkbookRows");
    L.log("Params:", { url, nodesSheet, edgesSheet });

    const buf = await fetchArrayBuffer(url);

    let wb;
    try {
        wb = XLSX.read(buf, { type: "array" });
    } catch (e) {
        L.err("XLSX.read failed:", e);
        L.groupEnd();
        throw e;
    }

    L.log("Parsed workbook. SheetNames:", wb.SheetNames);

    const nodeRows = sheetToRows(wb, nodesSheet);
    const edgeRows = sheetToRows(wb, edgesSheet);

    L.groupEnd();
    return { nodeRows, edgeRows, sheetNames: wb.SheetNames };
}