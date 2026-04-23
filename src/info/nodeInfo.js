import { displayValue, escapeHtml, escapeHtmlAttr, isVisible, renderCard } from "./infoRender.js";

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

function renderNodeJump(targetNode) {
    const label = targetNode.data("orgName") ?? targetNode.data("label") ?? targetNode.id();
    return {
        html: `<button type="button" class="md-inline-action" data-select-node-id="${escapeHtmlAttr(targetNode.id())}">${escapeHtml(label)}</button>`,
        sortKey: String(label),
    };
}

function directionalConnectionsForNode(n) {
    const outgoing = [];
    const incoming = [];
    const nodeId = n.id();

    n.connectedEdges("[!isGrid]")
        .filter((e) => isVisible(e))
        .forEach((e) => {
            const data = e.data();
            const sourceId = e.source().id();
            const targetId = e.target().id();
            const other = sourceId === nodeId ? e.target() : e.source();

            if (data.isAggregated === "true") {
                const isCanonicalSource = sourceId === nodeId;
                const outgoingTypes = isCanonicalSource
                    ? data.directionalRelTypes?.forward ?? []
                    : data.directionalRelTypes?.reverse ?? [];
                const incomingTypes = isCanonicalSource
                    ? data.directionalRelTypes?.reverse ?? []
                    : data.directionalRelTypes?.forward ?? [];

                if (outgoingTypes.length) {
                    outgoing.push([renderNodeJump(other), outgoingTypes]);
                }
                if (incomingTypes.length) {
                    incoming.push([renderNodeJump(other), incomingTypes]);
                }
                return;
            }

            const relType = data.relType ?? data.type ?? "(unknown)";
            if (sourceId === nodeId && targetId === other.id()) {
                outgoing.push([renderNodeJump(other), [relType]]);
            } else {
                incoming.push([renderNodeJump(other), [relType]]);
            }
        });

    const sortRows = (rows) =>
        rows.sort((a, b) => String(a[0]?.sortKey ?? "").localeCompare(String(b[0]?.sortKey ?? "")));

    return {
        outgoing: sortRows(outgoing),
        incoming: sortRows(incoming),
    };
}

function renderConnectionSection(title, rows) {
    if (!rows.length) return "";

    return `
    <section class="md-card">
      <div class="md-card-title">${escapeHtml(title)}</div>
      <table class="md-grid-table" role="presentation">
        <thead>
          <tr>
            <th>Organization</th>
            <th>Relationship types</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(([target, relTypes]) => `
            <tr>
              <td>${target.html}</td>
              <td>${escapeHtml(displayValue(relTypes))}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </section>
  `;
}

export function renderNodeSummary(n) {
    const { detailsRows, statsRows } = summarizeNode(n);

    return `
    <div class="md-status md-status-compact">
      ${renderCard("Organization", detailsRows.slice(0, 5))}
      ${renderCard("Graph stats", statsRows.slice(0, 2))}
    </div>
  `;
}

export function renderNodeInfo(n) {
    const { detailsRows, statsRows, extraRows } = summarizeNode(n);
    const { outgoing, incoming } = directionalConnectionsForNode(n);

    return `
    <div class="md-status">
      ${renderCard("Organization", detailsRows, { linkifyValues: true })}
      ${renderCard("Graph stats", statsRows)}
      ${renderConnectionSection("Outgoing relationships", outgoing)}
      ${renderConnectionSection("Incoming relationships", incoming)}
      ${extraRows.length ? renderCard("Other attributes", extraRows, { linkifyValues: true }) : ""}
    </div>
  `;
}
