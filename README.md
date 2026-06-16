# P&A network visualization

Interactive network visualization for organizations and relationships in the P&A dataset, built with Vite and Cytoscape.js.

## Features

- Loads a preprocessed graph from `frontend/public/data/graph.json`.
- Displays detailed or aggregated relationships.
- Filters and highlights organizations by category, geography, governance, role, lifeline, and other attributes.
- Supports grid and force-directed layouts.
- Provides selection details, graph statistics, search, and JSON export.
- Optionally provides a workshop selection shortcut when `workshop_selection.csv` is deployed.

## Requirements

- Node.js `20.19+` or `22.12+`
- npm
- Python `3.10+`

## Frontend

Run frontend commands from `frontend/`:

```bash
cd frontend
npm install
npm run dev
```

Production build:

```bash
cd frontend
npm run build
npm run preview
```

The dev deployment is built with Vite base `/dev/`. Runtime public assets are resolved through `src/data/publicAssets.js`, so the same code works at both the production root and the `/dev/` deployment.

## Data Pipeline

The browser only loads the generated graph JSON:

```text
frontend/public/data/graph.json
```

CSV files are preprocessing inputs only. The browser does not convert node and edge CSV files at runtime.

Generate `graph.json` from the default CSV inputs:

```bash
cd frontend
npm run preprocess:data
```

Default repository-relative paths:

```text
frontend/public/data/organizations_clean.csv
frontend/public/data/edges_clean.csv
frontend/public/data/graph.json
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
- `Notes`
- `Primary`
- `2ndry`

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
Organization Name,Org ID
```

This file is optional and may be supplied only for workshop deployments. When absent, the application hides the shortcut and continues normally.

## Project Structure

```text
frontend/
  index.html
  package.json
  public/
    data/
      graph.json
      organizations_clean.csv
      edges_clean.csv              # preprocessing input, when available
      workshop_selection.csv       # optional
  src/
    config/
    data/
      dataloader.js
      normalize.js
      publicAssets.js
    graph/
    info/
    ui/
    main.js
    style.css

scripts/
  preprocess_data.py

pa-infra/
  app.py
  cdk.json
  pa_infra/
    pa_stack.py
  tests/
```

## Infrastructure

The CDK stack imports the existing `crescent-react-hosting` bucket and configures CloudFront with S3 origin path `/pa_connection`.

Run infrastructure validation from `pa-infra/`:

```bash
cd pa-infra
python -m pip install -r requirements.txt -r requirements-dev.txt
pytest -q
npx cdk@2 synth -q
```

Deployment workflows:

- Production frontend: S3 prefix `pa_connection`
- Development frontend: S3 prefix `pa_connection/dev`
- Infrastructure: CDK stack `PaStack`

## Maintenance Notes

- Regenerate and commit `graph.json` whenever preprocessing inputs change.
- Keep category names in `frontend/src/config/visualSpec.js` aligned with generated node values.
- Update `scripts/preprocess_data.py` if CSV headers or graph fields change.
- The optional workshop CSV is the only CSV loaded by the browser.

## Troubleshooting

### Graph fails to load

- Confirm `frontend/public/data/graph.json` exists and contains `elements.nodes` and `elements.edges`.
- Run `npm run preprocess:data` from `frontend/` after providing both preprocessing CSV inputs.
- Inspect browser console output for the resolved graph URL and loading error.

### Dev deployment assets return 404

- Build with Vite base `/dev/`.
- Confirm files were uploaded to S3 prefix `pa_connection/dev`.
- Confirm CloudFront invalidation includes `/dev/*`.

### Workshop button is hidden

- This is expected when `frontend/public/data/workshop_selection.csv` is absent.
- When supplied, verify the CSV headers are `Organization Name` and `Org ID`.
