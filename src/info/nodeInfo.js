import { displayValue, isVisible, renderCard } from "./infoRender.js";

function arrayOrPrimary(d, arrayKey, primaryKey) {
    if (Array.isArray(d[arrayKey])) return d[arrayKey];
    return d[primaryKey] ? [d[primaryKey]] : [];
}

function summarizeNode(n) {
    const d = n.data();

    const orgName = d.orgName ?? d.name ?? d.label ?? d.id ?? n.id();
    const shortLabel = d.label ?? d.id ?? n.id();

    const orgTypes = arrayOrPrimary(d, "orgTypes", "orgTypePrimary");
    const nodeTypes = arrayOrPrimary(d, "nodeTypes", "nodeTypePrimary");
    const geographies = arrayOrPrimary(d, "geoTags", "geoPrimary");
    const governanceLevels = arrayOrPrimary(d, "governanceLevels", "governanceLevelPrimary");
    const functionalDomains = arrayOrPrimary(d, "functionalDomains", "functionalDomainPrimary");
    const roles = arrayOrPrimary(d, "roleTags", "rolePrimary");
    const lifelines = arrayOrPrimary(d, "lifelineTags", "femaLifelinePrimary");

    const primaryContact =
        d.primary && String(d.primary).trim().length > 0
            ? d.primary
            : "No contact listed";

    const detailsRows = [
        ["Organization", orgName],
        ["Code", shortLabel !== orgName ? shortLabel : ""],
        ["Node type", nodeTypes],
        ["Organization types", orgTypes],
        ["Geography", geographies],
        ["Governance level", governanceLevels],
        ["Functional domains", functionalDomains],
        ["Roles", roles],
        ["FEMA lifelines", lifelines],
        ["Website", d.url],
        ["Primary contact", primaryContact],
        ["Secondary contact", d.secondary],
        ["Review flag", d.reviewFlag],
        ["Review note", d.reviewNote],
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
        "geoTags",
        "orgTypePrimary",
        "orgTypes",
        "nodeTypePrimary",
        "nodeTypes",
        "governanceLevelPrimary",
        "governanceLevels",
        "functionalDomainPrimary",
        "functionalDomains",
        "rolePrimary",
        "roleTags",
        "femaLifelinePrimary",
        "lifelineTags",
        "primary",
        "secondary",
        "notes",
        "url",
        "reviewFlag",
        "reviewNote",
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
