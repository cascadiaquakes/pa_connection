# Cascadia Connections Dashboard

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.22758825.svg)](https://doi.org/10.5281/zenodo.22758825)
[![License: BSD-3-Clause](https://img.shields.io/badge/License-BSD_3--Clause-blue.svg)](LICENSE)

Interactive network visualization for organizations and relationships in the P&A dataset, built with Vite and Cytoscape.js.

**Live dashboard:** https://connections-dashboard.cascadiaquakes.org

---

## Features

- Loads a preprocessed graph from `frontend/public/data/graph.json`.
- Displays detailed or aggregated relationships.
- Filters and highlights organizations by category, geography, governance, role, and other attributes.
- Supports grid and force-directed layouts.
- Provides selection details, graph statistics, search, and JSON export.
- Optionally provides a workshop selection shortcut when `workshop_selection.csv` is deployed.

---

## Data

The dashboard shows the P&A organization network: organizations as nodes and their relationships as edges. The browser loads a single preprocessed graph, `frontend/public/data/graph.json`, generated from the source workbook by the scripts in `scripts/`. Optional definitions for the filter menus come from `frontend/public/data/menuDefinitions.json`.

The full data pipeline, the input field contracts, the optional workshop shortcut and how to reuse the viewer with a new dataset are in [docs/MAINTAINERS.md](docs/MAINTAINERS.md).

---

## Running Locally

**Requirements:**

- Node.js `20.19+` or `22.12+`
- npm
- Python `3.10+`

Run frontend commands from `frontend/`:

```bash
cd frontend
npm install
npm test
npm run dev
```

Production build:

```bash
cd frontend
npm run build
npm run preview
```

The dev deployment is built with Vite base `/dev/`. Runtime public assets are resolved through `src/data/publicAssets.js`, so the same code works at both the production root and the `/dev/` deployment.

---

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

---

## Deployment

The CDK stack imports the existing `crescent-react-hosting` bucket and configures CloudFront with S3 origin path `/pa_connection`.

Validate the infrastructure from `pa-infra/`:

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

---

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
- When supplied, verify the CSV headers are `node_id` and `name`.

---

## How to Cite

> Clifford, A., Bachelot, L., Sahakian, V., Marfo, W., Eriksen, A., Thomas, A., & Elizabeth, J. (2026). *Cascadia Connections Dashboard* (v1.0.0). Zenodo. https://doi.org/10.5281/zenodo.22758825

---

## License

This project is licensed under the BSD 3-Clause License. See [LICENSE](LICENSE).

---

## Contacts

- **Loïc Bachelot**, University of Oregon: [lbachelo@uoregon.edu](mailto:lbachelo@uoregon.edu)
- **William Marfo**, University of California, Davis: [wmarfo@ucdavis.edu](mailto:wmarfo@ucdavis.edu)

For bugs or feature requests, please [open an issue](https://github.com/cascadiaquakes/pa_connection/issues).

---

## Acknowledgments

<p align="center">
  <img src="https://raw.githubusercontent.com/cascadiaquakes/.github/main/assets/crescent-logo.png" alt="CRESCENT" height="70">
  &nbsp;&nbsp;&nbsp;&nbsp;
  <img src="https://raw.githubusercontent.com/cascadiaquakes/.github/main/assets/nsf-logo.png" alt="U.S. National Science Foundation" height="70">
</p>

This project is supported by the National Science Foundation through the Cascadia Region Earthquake Science Center (CRESCENT), Cooperative Agreement EAR-2225286.
