function normalizeText(v) {
    return String(v ?? "").trim().toLowerCase();
}

function isMeaningful(v) {
    if (v == null) return false;
    if (Array.isArray(v)) return v.length > 0;

    const s = String(v).trim();
    return s !== "" && s.toLowerCase() !== "nan";
}

function formatFieldValue(field, value) {
    if (field.format) return field.format(value);
    return String(value ?? "").trim();
}

function makeSnippet(text, query, radius = 28) {
    const raw = String(text ?? "").trim();
    if (!raw) return "";

    const lower = raw.toLowerCase();
    const q = query.toLowerCase();
    const idx = lower.indexOf(q);

    if (idx < 0) {
        return raw.length > radius * 2 ? raw.slice(0, radius * 2).trim() + "..." : raw;
    }

    const start = Math.max(0, idx - radius);
    const end = Math.min(raw.length, idx + q.length + radius);

    let snippet = raw.slice(start, end).trim();
    if (start > 0) snippet = "..." + snippet;
    if (end < raw.length) snippet = snippet + "...";
    return snippet;
}

const NODE_SEARCH_FIELDS = [
    { key: "orgName", label: "Name" },
    { key: "id", label: "ID" },
    {
        key: "nodeTypes",
        label: "Node type",
        format: (v) => (Array.isArray(v) ? v.join(", ") : String(v ?? "")),
    },
    {
        key: "orgTypes",
        label: "Organization type",
        format: (v) => (Array.isArray(v) ? v.join(", ") : String(v ?? "")),
    },
    { key: "geoPrimary", label: "Geography" },
    {
        key: "governanceLevels",
        label: "Governance",
        format: (v) => (Array.isArray(v) ? v.join(", ") : String(v ?? "")),
    },
    {
        key: "functionalDomains",
        label: "Functional domain",
        format: (v) => (Array.isArray(v) ? v.join(", ") : String(v ?? "")),
    },
    {
        key: "roleTags",
        label: "Role",
        format: (v) => (Array.isArray(v) ? v.join(", ") : String(v ?? "")),
    },
    {
        key: "lifelineTags",
        label: "FEMA lifeline",
        format: (v) => (Array.isArray(v) ? v.join(", ") : String(v ?? "")),
    },
    { key: "notes", label: "Notes" },
    { key: "url", label: "Website" },
    { key: "primary", label: "Primary contact" },
    { key: "secondary", label: "Secondary contact" },
    { key: "reviewFlag", label: "Review flag" },
    { key: "reviewNote", label: "Review note" },
];

export function buildNodeSearchIndex(rawElements = []) {
    return rawElements
        .filter((el) => el?.data?.id && el?.data?.isGrid !== "true" && !el?.data?.source)
        .map((el) => {
            const d = el.data;
            const title = d.orgName || d.id || "";
            const sortKey = normalizeText(title);

            return {
                id: d.id,
                title,
                sortKey,
                fields: NODE_SEARCH_FIELDS.map((field) => ({
                    key: field.key,
                    label: field.label,
                    value: formatFieldValue(field, d[field.key]),
                })),
            };
        });
}

export function searchNodeIndex(index = [], query = "") {
    const q = normalizeText(query);

    return index
        .map((record) => {
            if (!q) {
                return {
                    id: record.id,
                    title: record.title,
                    subtitle: "",
                    sortKey: record.sortKey,
                };
            }

            let nameMatched = false;
            let firstNonNameMatch = null;

            for (const field of record.fields) {
                if (!isMeaningful(field.value)) continue;

                const normalizedValue = normalizeText(field.value);
                if (!normalizedValue.includes(q)) continue;

                if (field.key === "orgName") {
                    nameMatched = true;
                    continue;
                }

                firstNonNameMatch = {
                    label: field.label,
                    snippet: makeSnippet(field.value, q),
                };
                break;
            }

            if (!nameMatched && !firstNonNameMatch) return null;

            return {
                id: record.id,
                title: record.title,
                subtitle: firstNonNameMatch
                    ? `${firstNonNameMatch.label}: ${firstNonNameMatch.snippet}`
                    : "",
                sortKey: record.sortKey,
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}
