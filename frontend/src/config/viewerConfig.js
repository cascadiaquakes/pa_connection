// Default P&A viewer configuration. This remains build-time source code: a
// maintainer edits it when adapting the viewer, with no extra runtime loading.
export const viewerConfig = {
    labels: {
        node: { singular: "Organization", plural: "Organizations" },
        edge: { singular: "Relationship", plural: "Relationships" },
    },
    data: {
        nodeIdKey: "id",
        nodeTitleKey: "orgName",
        edgeTypeKey: "relType",
    },
    grid: {
        columnDimensionKey: "orgCat",
        rowDimensionKey: "geo",
    },
    dimensions: [
        {
            key: "orgCat", title: "Organization Category", dataKey: "orgTypePrimary", arrayKey: "orgTypes",
            filterContainerId: "orgCategoryFilters", selectionContainerId: "selectionOrgCategoryFilters",
            filterStateKey: "allowedOrgCategories", selectionStateKey: "selectedOrgCategories",
            filterLogKey: "orgCats", selectionLogKey: "selectionOrgCats",
            filterStatus: { label: "Organization categories", singular: "category" },
            search: { key: "orgTypes", label: "Organization type", order: 30 },
            order: ["Tribal", "Government", "Quasi Governmental", "Coordination Structure", "Academic", "Nonprofit Community", "Private Sector", "Media", "Other"],
            colors: { "Academic": "#4E79A7", "Coordination Structure": "#F28E2B", "Government": "#E15759", "Media": "#76B7B2", "Nonprofit Community": "#59A14F", "Private Sector": "#EDC948", "Quasi Governmental": "#B07AA1", "Tribal": "#9C755F", "Other": "#9E9E9E" },
            fallbackColor: "#9E9E9E",
        },
        {
            key: "nodeType", title: "Node Type", dataKey: "nodeTypePrimary", arrayKey: "nodeTypes",
            filterContainerId: "nodeTypeFilters", selectionContainerId: "selectionNodeTypeFilters",
            filterStateKey: "allowedNodeTypes", selectionStateKey: "selectedNodeTypes",
            filterLogKey: "nodeTypes", selectionLogKey: "selectionNodeTypes",
            filterStatus: { label: "Node types", singular: "type" },
            search: { key: "nodeTypes", label: "Node type", order: 20 },
            order: ["Hub", "Organization", "Program", "tribe", "Other"],
            colors: { "Hub": "#E15759", "Organization": "#4E79A7", "Program": "#F28E2B", "tribe": "#59A14F", "Other": "#9E9E9E" },
            fallbackColor: "#9E9E9E",
        },
        {
            key: "governance", title: "Governance Level", dataKey: "governanceLevelPrimary", arrayKey: "governanceLevels",
            filterContainerId: "governanceFilters", selectionContainerId: "selectionGovernanceFilters",
            filterStateKey: "allowedGovernanceLevels", selectionStateKey: "selectedGovernanceLevels",
            filterLogKey: "governanceLevels", selectionLogKey: "selectionGovernanceLevels",
            filterStatus: { label: "Governance levels", singular: "level" },
            search: { key: "governanceLevels", label: "Governance", order: 50 },
            order: ["Federal", "State", "Local", "Multi", "Non Governmental", "Private", "Sovereign", "Other"],
            colors: { "Federal": "#4E79A7", "State": "#F28E2B", "Local": "#E15759", "Multi": "#76B7B2", "Non Governmental": "#EDC948", "Private": "#59A14F", "Sovereign": "#9C755F", "Other": "#9E9E9E" },
            fallbackColor: "#9E9E9E",
        },
        {
            key: "role", title: "Role", dataKey: "rolePrimary", arrayKey: "roleTags",
            filterContainerId: "roleFilters", selectionContainerId: "selectionRoleFilters",
            filterStateKey: "allowedRoles", selectionStateKey: "selectedRoles",
            filterLogKey: "roles", selectionLogKey: "selectionRoles",
            filterStatus: { label: "Roles", singular: "role" },
            search: { key: "roleTags", label: "Role", order: 70 },
            order: ["Coordination", "Data Tools Provider", "Emergency Response", "Funding Provider", "Infrastructure Operator", "Knowledge Provider", "Messaging Alerts Provider", "Policy Maker Regulator", "Other"],
            colors: { "Coordination": "#4E79A7", "Data Tools Provider": "#76B7B2", "Emergency Response": "#E15759", "Funding Provider": "#EDC948", "Infrastructure Operator": "#F28E2B", "Knowledge Provider": "#59A14F", "Messaging Alerts Provider": "#B07AA1", "Policy Maker Regulator": "#9C755F", "Other": "#9E9E9E" },
            fallbackColor: "#9E9E9E",
        },
        {
            key: "geo", title: "Geographic Area", dataKey: "geoPrimary", arrayKey: "geoTags",
            filterContainerId: "geoFilters", selectionContainerId: "selectionGeoFilters",
            filterStateKey: "allowedGeos", selectionStateKey: "selectedGeos",
            filterLogKey: "geos", selectionLogKey: "selectionGeos",
            filterStatus: { label: "Geographies", singular: "geography", plural: "geographies" },
            search: { key: "geoPrimary", label: "Geography", order: 40 },
            order: ["International", "Canada", "U.S. National", "PNW Regional", "British Columbia", "Washington", "Oregon", "California", "Other"],
            colors: { "British Columbia": "#59A14F", "California": "#76B7B2", "Canada": "#EDC948", "International": "#FF9DA7", "Oregon": "#E15759", "PNW Regional": "#B07AA1", "U.S. Federal": "#9C755F", "U.S. National": "#4E79A7", "Washington": "#F28E2B", "Other": "#9E9E9E" },
            fallbackColor: "#9E9E9E",
        },
    ],
    selection: {
        allNodes: { containerId: "selectionOrganizationFilters", title: "All Organizations", stateKey: "selectedOrganizations", logKey: "selectionOrganizations", primaryKey: "orgName", previewLimit: 5, visibleOnly: true },
    },
    visuals: {
        nodeShapes: { dataKey: "nodeTypePrimary", fallbackShape: "ellipse", shapes: { "Hub": "hexagon", "Organization": "round-rectangle", "Program": "diamond", "Tribe": "ellipse", "tribe": "ellipse", "FirstNation": "ellipse", "Other": "ellipse" }, title: "Node Shape" },
        edges: {
            relType: {
                dataKey: "relType", title: "Relationship Type",
                order: ["funding", "emergency response coordination", "info/research", "tools/products", "data"],
                colors: { "funding": "#E15759", "emergency response coordination": "#F28E2B", "info/research": "#4E79A7", "tools/products": "#59A14F", "data": "#B07AA1" },
                fallbackColor: "#9E9E9E",
            },
        },
    },
    details: {
        node: {
            cardTitle: "Organization",
            summaryFieldCount: 5,
            fields: [
                { label: "Organization", type: "title" },
                { label: "Code", type: "code" },
                { label: "Node type", dimensionKey: "nodeType" },
                { label: "Organization types", dimensionKey: "orgCat" },
                { label: "Geography", dimensionKey: "geo" },
                { label: "Governance level", dimensionKey: "governance" },
                { label: "Roles", dimensionKey: "role" },
                { label: "Website", key: "url" },
                { label: "Primary contact", key: "primary", empty: "No contact listed" },
                { label: "Secondary contact", key: "secondary" },
                { label: "Last updated", key: "lastUpdated", type: "date", empty: "Not available" },
                { label: "Review flag", key: "reviewFlag" },
                { label: "Review note", key: "reviewNote" },
                { label: "Notes", key: "notes" },
            ],
        },
    },
    search: {
        includeDimensions: true,
        nodeFields: [
            { key: "orgName", label: "Name", title: true },
            { key: "id", label: "ID" },
            { key: "notes", label: "Notes" },
            { key: "url", label: "Website" },
            { key: "primary", label: "Primary contact" },
            { key: "secondary", label: "Secondary contact" },
            { key: "reviewFlag", label: "Review flag" },
            { key: "reviewNote", label: "Review note" },
        ],
    },
    features: { workshopSelection: true, export: true },
};

export function viewerDimension(key) {
    return viewerConfig.dimensions.find((dimension) => dimension.key === key) ?? null;
}

export function viewerGridDimension(axis) {
    const key = axis === "col"
        ? viewerConfig.grid.columnDimensionKey
        : axis === "row"
            ? viewerConfig.grid.rowDimensionKey
            : null;
    return key ? viewerDimension(key) : null;
}
