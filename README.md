# P&A network visualization

## Overview

The network viewer is a Cytoscape-based application designed with a
modular structure so that **configuration**, **graph rendering**,
**layout logic**, and **UI controls** are separated. This keeps the
visualization maintainable and allows design or layout changes without
rewriting the graph engine.

## Main Components

### Configuration (`config/`)

Configuration files define the structure and visual styling of the
graph.

**visualSpec.js**\
Defines color mappings for node categories and edge relationship types.
This allows designers to adjust the visual appearance without modifying
graph logic.

**layoutConfig.js**\
Defines the grid layout used by the viewer. The graph is arranged as a
matrix where:

-   **Columns** represent organization categories (`orgTypePrimary`)
-   **Rows** represent geographic regions (`geoPrimary`)

This file controls:

-   preferred category ordering
-   layout bounds
-   minimum row/column size
-   node jitter within grid cells

### Graph Engine (`graph.js`)

This module initializes and manages the Cytoscape graph instance.

Responsibilities include:

-   creating the Cytoscape graph
-   defining the base stylesheet
-   applying node and edge color modes
-   recomputing graph visibility when filters change
-   running layouts
-   managing selection highlighting

This file acts as the interface between the UI and the underlying graph.

### Grid Layout System (`boxLayout.js`, `gridDecorations.js`)

The viewer uses a **matrix-style layout** where nodes are placed based
on categorical attributes.

**gridDecorations.js** builds the visual grid structure:

-   row and column lines
-   header labels
-   header background coloring based on the active color mode

**boxLayout.js** places nodes inside each grid cell using a jittered
preset layout so nodes spread naturally within their category cell.

The layout recalculates using **only visible nodes**, allowing the grid
to adapt when filters are applied.

### UI Components (`ui/`)

UI modules control interaction with the graph.

Examples:

-   `controlsPanel.js` -- filter and coloring controls
-   `selectionHighlight.js` -- node selection spotlight effect
-   `graphStatus.js` -- graph statistics display

UI modules update the graph by calling functions exposed by the graph
engine.

## Rendering Flow

When the viewer loads:

1.  Data is loaded and passed to `createGraph()`.
2.  Cytoscape initializes with the base stylesheet.
3.  Grid decorations are created.
4.  Nodes are positioned using the box layout.

When filters or settings change:

1.  Node and edge colors are updated.
2.  Grid header colors update to match the active color mode.
3.  Node and edge visibility is recomputed.
4.  The layout recalculates using visible nodes.

This keeps the visualization compact and readable even when filters hide
large parts of the network.

## Node Data Fields

The viewer relies on the following node attributes:

-   `label` --- display name
-   `orgTypePrimary` --- organization category (column)
-   `geoPrimary` --- geographic region (row)
-   `orgTypes` --- optional list of categories
