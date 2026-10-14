# Maintainer Notes

Data pipeline and maintenance details for the Cascadia Connections Dashboard. For an overview, see the [README](../README.md).

## Data Pipeline

The browser only loads the generated graph JSON:

```text
frontend/public/data/graph.json
```

CSV files are preprocessing inputs only. The browser does not convert node and edge CSV files at runtime.

Export both CSV inputs from the `master` and `Relationships` workbook tabs:

```bash
cd frontend
npm run export:excel
```

This writes `scripts/out/organizations_clean.csv` and
`scripts/out/edges_clean.csv`. Detailed cleaning diagnostics are saved to
`scripts/out/export_excel_report.json`, including category normalizations,
removed duplicate edges, invalid endpoints, and organizations without relationships.
Use `python scripts/export_excel_to_csv.py --help` for alternate workbook,
worksheet, or output paths. FEMA Lifeline columns are intentionally ignored.

Generate `graph.json` from the default CSV inputs:

```bash
cd frontend
npm run preprocess:data
```

Generate `menuDefinitions.json` from the definition worksheets in the source
workbook:

```bash
cd frontend
npm run generate:menu-definitions
```

The generator uses the `name` and `definition` columns from the five configured
definition tabs. Use `python scripts/generate_menu_definitions.py --help` to
provide another workbook or output path.

Default repository-relative paths:

```text
scripts/out/organizations_clean.csv
scripts/out/edges_clean.csv
scripts/out/graph.json
```

`edges_clean.csv` is a required preprocessing input even though it is not required by the deployed frontend after `graph.json` has been generated.

Custom paths can be passed after `--` in node, edge, output order. Paths are resolved relative to the repository root unless absolute:

```bash
cd frontend
npm run preprocess:data -- \
  path/to/organizations.csv \
  path/to/edges.csv \
  path/to/graph.json
```

When invoking the Python script directly, the equivalent `--nodes`, `--edges`, and `--out` flags are also supported.

The generated payload contains:

- `schemaVersion`
- `generatedAt`
- `sourceFiles`
- `diagnostics`
- `elements.nodes`
- `elements.edges`

Diagnostics report skipped nodes, duplicate node IDs, and edges with invalid endpoints.

### Input Contracts

Node fields used:

- `Org ID`
- `Organization Name`
- `orgTypes_json` or `orgTypes`
- `orgTypePrimary`
- `geoPrimary`
- `nodeTypes_json` or `nodeTypes`
- `nodeTypePrimary`
- `governanceLevels_json` or `governanceLevels`
- `governanceLevelPrimary`
- `roleTags_json` or `roleTags`
- `rolePrimary`
- `Notes`
- `Primary`
- `2ndry`
- `url`
- `review_flag`
- `review_note`
- `lastUpdated`

Edge fields used:

- `From agency`
- `To agency`
- `Relationship type`
- `Description`
- `Status`

### Optional Workshop Selection

The Controls tab can show a `Workshop` shortcut when this file is available:

```text
frontend/public/data/workshop_selection.csv
```

Expected columns:

```text
node_id,name
```

The legacy headers `Org ID` and `Organization Name` are also accepted.

This file is optional and may be supplied only for workshop deployments. When absent, the application hides the shortcut and continues normally.

## Reusing the Viewer with a New Dataset

The graph engine, filtering, layouts, selection interactions, search mechanics, and export functions can be reused. The current interface is still tailored to the P&A organization network, so reuse falls into two levels.

### Drop-in dataset

No frontend source edits are needed when the new `graph.json` preserves the current Cytoscape payload and node/edge field contract:

```json
{
  "elements": {
    "nodes": [{ "data": { "id": "...", "orgName": "...", "orgTypePrimary": "...", "geoPrimary": "..." } }],
    "edges": [{ "data": { "id": "...", "source": "...", "target": "...", "relType": "..." } }]
  }
}
```

All configured filter dimensions must be present for the default filters to work: organization category, node type, governance level, role, and geography. New category values are supported: they appear in controls automatically and receive a deterministic fallback color when no explicit color is configured.

The grid continues to use `orgTypePrimary` as columns and `geoPrimary` as rows. Node details continue to use organization-specific labels and fields. If those semantics still fit, replace `frontend/public/data/graph.json` and optionally `frontend/public/data/menuDefinitions.json`, then run the normal frontend tests and build.

### Dataset-specific files to review

For a different application using the same data structure, review these central locations before changing graph behavior:

| Need | Current location | What to adapt |
| --- | --- | --- |
| Filter dimensions, labels, ordering, colors | `frontend/src/config/viewerConfig.js` | Dimension names, source keys, category order, color palette |
| Node shapes and relationship colors | `frontend/src/config/viewerConfig.js` | Shape field/value mapping and relationship categories |
| Grid axes and ordering | `frontend/src/config/viewerConfig.js` | Choose the column and row dimensions; use `layoutConfig.js` only for spacing and sizing |
| Node details and date/contact fields | `frontend/src/config/viewerConfig.js` | Field labels, order, fallback text, and value formatting |
| Searchable node fields | `frontend/src/config/viewerConfig.js` | Search fields, labels, and whether dimensions are included |
| Dataset definitions shown in tooltips | `frontend/public/data/menuDefinitions.json` | Dimension and category descriptions |
| Optional Workshop shortcut | `frontend/src/ui/controls.js` | Remove, rename, or replace its CSV-driven action |
| Title, logos, About text, and labels | `frontend/index.html` and `frontend/public/logos/` | Deliberate manual rebranding for the new application |

### Planned modularization (small, safe steps)

The goal is to make a new dataset a data-and-configuration change, with all required edits collected in a small set of build-time JavaScript configuration modules. This deliberately adds no runtime configuration request or JSON parsing. Each phase should preserve the current behavior and be covered by tests before moving to the next one.

1. Completed — add a single viewer configuration module with the current values as defaults. It exposes entity labels, dimensions, visual settings, grid axes, detail fields, search fields, and optional actions without changing behavior.
2. Completed — make grid geometry, header definitions, header colors, and header selection read their axes from that configuration instead of assuming `orgCat` and `geo`.
3. Completed — make node details and search render configured field lists, including the shared `date` formatter.
4. Validate the result with a second fixture dataset and configuration, without changing frontend source code.

The intended end state separates runtime data from build-time adaptation settings:

```text
frontend/public/data/
  graph.json             # entities and relationships
  menuDefinitions.json   # optional help text for dimensions and categories

frontend/src/config/
  viewerConfig.js         # field mapping, dimensions, grid, details, search, visuals
```

Until those phases are implemented, the table above is the authoritative checklist for adapting a new dataset.

`viewerConfig.js` is the single source of truth for dataset behavior and presentation: dimensions, visual mappings, grid axes, detail fields, and search fields. Branding remains intentionally manual in `index.html` and the logo assets so a new application receives a deliberate visual and content review.

## Maintenance Notes

- Regenerate and commit `graph.json` whenever preprocessing inputs change.
- Keep node dimensions and category names in `frontend/src/config/nodeDimensions.js` aligned with generated node values.
- Update `scripts/preprocess_data.py` if CSV headers or graph fields change.
- The optional workshop CSV is the only CSV loaded by the browser.
