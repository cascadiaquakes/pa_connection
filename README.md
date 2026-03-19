# P&A network visualization

Interactive network visualization for organizations and relationships in the P&A dataset, built with Vite + Cytoscape.

## What it does

- Loads a preprocessed graph (`public/data/graph.json`) or falls back to source CSVs.
- Renders organizations as nodes and relationships as edges.
- Supports two edge display modes:
  - `simplified`: aggregates parallel/bidirectional edges
  - `detailed`: shows raw edge rows
- Supports filtering by:
  - organization category (`orgTypes`)
  - geography (`geoPrimary`)
  - relationship type (`relType`)
- Supports two layouts:
  - grid/boxed layout (category x geography matrix)
  - organic force layout (`cose`)
- Includes:
  - info panel for selected node/edge details
  - graph status panel (loaded vs visible counts + current settings)
  - search tab (name, id, type, geography, notes, contacts)

## Tech stack

- Vite 7 (frontend bundler/dev server)
- Cytoscape.js (graph rendering)
- cytoscape-popper + tippy.js (node tooltips)
- Python script for preprocessing CSV into graph JSON

## Requirements

- Node.js `20.19+` (recommended for Vite 7)
- npm
- Python `3.10+` (tested here with 3.12)

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Generate graph JSON (recommended):

```bash
npm run preprocess:data
```

3. Start dev server:

```bash
npm run dev
```

4. Build production bundle:

```bash
npm run build
```

5. Preview production build:

```bash
npm run preview
```

## Data pipeline

Runtime loading is handled by `src/data/dataloader.js`:

- First tries: `public/data/graph.json`
- Fallback: `public/data/organizations_clean.csv` + `public/data/edges_clean.csv`

### Preprocessing script

`npm run preprocess:data` runs:

```bash
python scripts/preprocess_data.py
```

Default inputs:

- `public/data/organizations_clean.csv`
- `public/data/edges_clean.csv`

Default output:

- `public/data/graph.json`

Optional CLI args:

```bash
python scripts/preprocess_data.py --nodes path/to/nodes.csv --edges path/to/edges.csv --out path/to/graph.json
```

### Generated `graph.json` format

Top-level fields:

- `schemaVersion`
- `generatedAt`
- `sourceFiles`
- `diagnostics`
- `elements.nodes`
- `elements.edges`

`diagnostics` includes:

- counts for kept/skipped/duplicate rows
- samples for skipped/duplicate rows

## Data contracts

### Node CSV fields used

- `Org ID` (required, canonical node id)
- `Organization Name`
- `orgTypes_json` or `orgTypes`
- `orgTypePrimary`
- `geoPrimary`
- `Notes`
- `Primary`
- `2ndry`

### Edge CSV fields used

- `From agency` (required)
- `To agency` (required)
- `Relationship type`
- `Description`
- `Status`

### Transform rules (preprocess + runtime fallback)

- Node ids are whitespace-stripped (`"A B" -> "AB"`).
- Duplicate node ids are dropped (first kept).
- Edges with missing source/target are dropped.
- Edges whose endpoints are not present in nodes are dropped.
- Stable colors are computed per category/type when needed.

## Project structure

```text
public/data/
  organizations_clean.csv
  edges_clean.csv
  graph.json

scripts/
  preprocess_data.py

src/
  main.js
  style.css

  config/
    layoutConfig.js
    visualSpec.js

  data/
    dataloader.js
    normalize.js
    transforms.js

  graph/
    graphBuilder.js
    graphViewData.js
    boxLayout.js
    gridDecorations.js
    graphColors.js
    selectionHighlight.js
    nodeSearch.js
    tooltips.js
    styles.js

  info/
    graphStatus.js
    selectionInfo.js
    nodeInfo.js
    edgeInfo.js
    infoRender.js

  ui/
    controls.js
    tabs.js
    searchTab.js
```

## UI behavior

### Settings tab

- Node coloring: `Organization Category`, `Geographic Area`, `None`
- Edge mode: `Simplified` vs `Detailed`
- Filters:
  - Organization Category checklist
  - Geographic Area checklist
  - Relationship type checklist
- Toggles:
  - `Prune isolated nodes`
  - `Self Organizing Layout`

### Info tab

- Selection card:
  - empty state
  - single selected node/edge detail
  - multi-selection summary
- Graph status card:
  - loaded/visible counts
  - current display/filter settings
  - data source paths

### Search tab

- Debounced client-side search over indexed node fields.
- Clicking a result selects and centers that node.
- If result is hidden by filters, search resets to full view first.

## Configuration

### `src/config/visualSpec.js`

Defines:

- category and geography ordering
- color palettes for node categories/geographies
- relationship-type color palette for detailed edges

### `src/config/layoutConfig.js`

Defines:

- matrix bounds and size fractions
- row/column ordering
- per-cell padding and node packing target size

## Notes for maintainers

- Keep `visualSpec` category names aligned with incoming data values.
- If CSV headers change, update both:
  - `scripts/preprocess_data.py`
  - `src/data/transforms.js` (fallback path)
- Runtime fallback exists for resilience, but shipping `graph.json` is preferred.

## Troubleshooting

- Build warning about Node version:
  - Vite 7 expects Node `20.19+` or `22.12+`.
- App loads but graph is empty:
  - check `public/data/graph.json` existence and shape
  - run `npm run preprocess:data`
  - inspect browser console diagnostics (skipped edge/node samples)
- CSV path issues in dev/prod:
  - ensure files are under `public/data/`
  - runtime URLs are built from `import.meta.env.BASE_URL`
