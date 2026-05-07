import { escapeHtml, displayValue, renderCard } from "./infoRender.js";

function renderDirectionCard(fromName, toName, relTypes) {
    const clean = Array.isArray(relTypes)
        ? relTypes.filter((v) => String(v ?? "").trim() !== "")
        : [];

    if (!clean.length) return "";

    return `
    <section class="md-card">
      <div class="md-card-title">${escapeHtml(fromName)} → ${escapeHtml(toName)}</div>
      <table class="md-kv" role="presentation">
        <tbody>
          <tr>
            <td class="md-k">Connections</td>
            <td class="md-v">${escapeHtml(clean.join(", "))}</td>
          </tr>
        </tbody>
      </table>
    </section>
  `;
}

function summarizeSimpleEdge(e) {
    const d = e.data();
    const src = e.source();
    const tgt = e.target();

    const sourceName = src.data("orgName") ?? src.data("label") ?? src.id();
    const targetName = tgt.data("orgName") ?? tgt.data("label") ?? tgt.id();

    const detailsRows = [
        ["Relationship", d.relType ?? d.type ?? "(unknown)"],
        ["From", sourceName],
        ["To", targetName],
    ];

    const skip = new Set([
        "_edgeColor",
        "isGrid",
        "isGridLine",
        "id",
        "source",
        "target",
        "relType",
        "type",
    ]);

    const extraRows = Object.keys(d)
        .filter((k) => !skip.has(k))
        .sort()
        .map((k) => [k, displayValue(d[k])])
        .filter(([, v]) => v !== "");

    return { detailsRows, extraRows };
}

function summarizeAggregatedEdge(e) {
    const d = e.data();
    const src = e.source();
    const tgt = e.target();

    const sourceName = src.data("orgName") ?? src.data("label") ?? src.id();
    const targetName = tgt.data("orgName") ?? tgt.data("label") ?? tgt.id();

    const forward = d.directionalRelTypes?.forward ?? [];
    const reverse = d.directionalRelTypes?.reverse ?? [];

    const summaryRows = [
        ["Organizations", `${sourceName} and ${targetName}`],
        ["Total connections", d.rawCount],
        ["Overall direction", d._dir === "bidir"
            ? "Both directions"
            : d._dir === "forward"
                ? `${sourceName} → ${targetName}`
                : d._dir === "reverse"
                    ? `${targetName} → ${sourceName}`
                    : "Unknown"],
    ];

    const skip = new Set([
        "_edgeColor",
        "isGrid",
        "isGridLine",
        "id",
        "source",
        "target",
        "relType",
        "type",
        "relTypes",
        "directionalRelTypes",
        "rawCount",
        "_dir",
        "_width",
        "isAggregated",
    ]);

    const extraRows = Object.keys(d)
        .filter((k) => !skip.has(k))
        .sort()
        .map((k) => [k, displayValue(d[k])])
        .filter(([, v]) => v !== "");

    return {
        sourceName,
        targetName,
        forward,
        reverse,
        summaryRows,
        extraRows,
    };
}

export function renderEdgeInfo(e) {
    const d = e.data();
    const isAggregated = d.isAggregated === "true";

    if (isAggregated) {
        const {
            sourceName,
            targetName,
            forward,
            reverse,
            summaryRows,
            extraRows,
        } = summarizeAggregatedEdge(e);

        return `
        <div class="md-status">
          ${renderCard("Relationship summary", summaryRows, { linkifyValues: true })}
          ${renderDirectionCard(sourceName, targetName, forward)}
          ${reverse.length ? renderDirectionCard(targetName, sourceName, reverse) : ""}
          ${extraRows.length ? renderCard("Other attributes", extraRows, { linkifyValues: true }) : ""}
        </div>
      `;
    }

    const { detailsRows, extraRows } = summarizeSimpleEdge(e);

    return `
    <div class="md-status">
      ${renderCard("Relationship", detailsRows, { linkifyValues: true })}
      ${extraRows.length ? renderCard("Other attributes", extraRows, { linkifyValues: true }) : ""}
    </div>
  `;
}

export function renderEdgeSummary(e) {
    const d = e.data();
    const isAggregated = d.isAggregated === "true";

    if (isAggregated) {
        const { summaryRows } = summarizeAggregatedEdge(e);

        return `
        <div class="md-status md-status-compact">
          ${renderCard("Relationship summary", summaryRows)}
        </div>
      `;
    }

    const { detailsRows } = summarizeSimpleEdge(e);

    return `
    <div class="md-status md-status-compact">
      ${renderCard("Relationship", detailsRows)}
    </div>
  `;
}
