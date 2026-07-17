import {
    displayValue,
    escapeHtml,
    isVisible,
    renderCard,
    renderInlineAction,
} from "./infoRender.js";
import { viewerConfig, viewerDimension } from "../config/viewerConfig.js";

function arrayOrPrimary(d, arrayKey, primaryKey) {
    if (Array.isArray(d[arrayKey])) return d[arrayKey];
    return d[primaryKey] ? [d[primaryKey]] : [];
}

function formatDate(value, emptyValue = "") {
    if (!value) return emptyValue;

    const normalizedValue = String(value).trim();
    const date = new Date(
        /^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)
            ? `${normalizedValue}T00:00:00`
            : normalizedValue
    );
    if (Number.isNaN(date.getTime())) return emptyValue;

    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function detailValue(field, data, { title, shortLabel }) {
    if (field.type === "title") return title;
    if (field.type === "code") return shortLabel !== title ? shortLabel : "";

    if (field.dimensionKey) {
        const dimension = viewerDimension(field.dimensionKey);
        return dimension
            ? arrayOrPrimary(data, dimension.arrayKey, dimension.dataKey)
            : "";
    }

    const value = data[field.key];
    if (field.type === "date") return formatDate(value, field.empty ?? "");
    if (String(value ?? "").trim() === "" && field.empty) return field.empty;
    return value;
}

function summarizeNode(n) {
    const d = n.data();

    const titleKey = viewerConfig.data.nodeTitleKey;
    const idKey = viewerConfig.data.nodeIdKey;
    const title = d[titleKey] ?? d.name ?? d.label ?? d[idKey] ?? n.id();
    const shortLabel = d.label ?? d[idKey] ?? n.id();
    const detailsConfig = viewerConfig.details.node;
    const detailsRows = detailsConfig.fields.map((field) => [
        field.label,
        detailValue(field, d, { title, shortLabel }),
    ]);

    const skip = new Set([
        "_nodeColor",
        "isGrid",
        "isGridPoint",
        "isGridLine",
        "isGridHeader",
        idKey,
        "label",
        "name",
        titleKey,
        "functionalDomainPrimary",
        "functionalDomains",
        ...viewerConfig.dimensions.flatMap(({ dataKey, arrayKey }) => [dataKey, arrayKey]),
        ...detailsConfig.fields.map(({ key }) => key).filter(Boolean),
    ]);

    const extraRows = Object.keys(d)
        .filter((k) => !skip.has(k))
        .sort()
        .map((k) => [k, displayValue(d[k])])
        .filter(([, v]) => v !== "");

    return { detailsRows, extraRows };
}

function renderNodeJump(targetNode) {
    const label = targetNode.data(viewerConfig.data.nodeTitleKey) ?? targetNode.data("label") ?? targetNode.id();
    return {
        html: renderInlineAction(
            label,
            "data-select-node-id",
            targetNode.id()
        ),
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

            const relType = data[viewerConfig.data.edgeTypeKey] ?? data.type ?? "(unknown)";
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
    const { detailsRows } = summarizeNode(n);

    return `
    <div class="md-status md-status-compact">
      ${renderCard(viewerConfig.details.node.cardTitle, detailsRows.slice(0, viewerConfig.details.node.summaryFieldCount))}
    </div>
  `;
}

export function renderNodeInfo(n) {
    const { detailsRows, extraRows } = summarizeNode(n);
    const { outgoing, incoming } = directionalConnectionsForNode(n);

    return `
    <div class="md-status">
      ${renderCard(viewerConfig.details.node.cardTitle, detailsRows, { linkifyValues: true })}
      ${renderConnectionSection("Outgoing relationships", outgoing)}
      ${renderConnectionSection("Incoming relationships", incoming)}
      ${extraRows.length ? renderCard("Other attributes", extraRows, { linkifyValues: true }) : ""}
    </div>
  `;
}
