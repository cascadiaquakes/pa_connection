import { displayValue, isVisible, renderCard } from "./infoRender.js";

function summarizeNode(n) {
    const d = n.data();

    const orgName = d.orgName ?? d.name ?? d.label ?? d.id ?? n.id();
    const shortLabel = d.label ?? d.id ?? n.id();

    const orgTypes = Array.isArray(d.orgTypes)
        ? d.orgTypes
        : (d.orgTypePrimary ? [d.orgTypePrimary] : []);

    const primaryContact =
        d.primary && String(d.primary).trim().length > 0
            ? d.primary
            : "No contact listed";

    const detailsRows = [
        ["Organization", orgName],
        ["Code", shortLabel !== orgName ? shortLabel : ""],
        ["Geography", d.geoPrimary],
        ["Organization types", orgTypes],
        ["Primary contact", primaryContact],
        ["Secondary contact", d.secondary],
        ["Notes", d.notes],
    ];

    const connectedEdges = n.connectedEdges();
    const visibleEdges = connectedEdges.filter((e) => isVisible(e));

    const neighborNodes = n.neighborhood("node");
    const visibleNeighborNodes = neighborNodes.filter((nn) => isVisible(nn));

    const statsRows = [
        ["Connected relationships", connectedEdges.length],
        ["Visible relationships", visibleEdges.length],
        ["Connected organizations", neighborNodes.length],
        ["Visible organizations", visibleNeighborNodes.length],
    ];

    const skip = new Set([
        "_nodeColor",
        "isGrid",
        "isGridPoint",
        "isGridLine",
        "isGridHeader",
        "id",
        "label",
        "name",
        "orgName",
        "geoPrimary",
        "orgTypePrimary",
        "orgTypes",
        "primary",
        "secondary",
        "notes",
    ]);

    const extraRows = Object.keys(d)
        .filter((k) => !skip.has(k))
        .sort()
        .map((k) => [k, displayValue(d[k])])
        .filter(([, v]) => v !== "");

    return { detailsRows, statsRows, extraRows };
}

export function renderNodeInfo(n) {
    const { detailsRows, statsRows, extraRows } = summarizeNode(n);

    return `
    <div class="md-status">
      ${renderCard("Organization", detailsRows)}
      ${renderCard("Graph stats", statsRows)}
      ${extraRows.length ? renderCard("Other attributes", extraRows) : ""}
    </div>
  `;
}