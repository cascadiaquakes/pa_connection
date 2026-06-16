#!/usr/bin/env python3
import argparse
import csv
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]


def clean(value):
    return str(value or "").strip()


def clean_id(value):
    return re.sub(r"\s+", "", clean(value))


def slugify(value):
    s = clean(value).lower()
    s = re.sub(r"[^a-z0-9]+", "_", s)
    return re.sub(r"^_+|_+$", "", s)


def palette_color(key):
    s = str(key or "unknown")
    h = 0
    for ch in s:
        h = (h * 31 + ord(ch)) & 0xFFFFFFFF
    hue = h % 360
    return f"hsl({hue}, 60%, 55%)"


def parse_json_array_field(row, field_name):
    value = row.get(field_name)
    if isinstance(value, list):
        return value

    s = clean(row.get(f"{field_name}_json") or row.get(field_name))
    if not s:
        return []

    try:
        parsed = json.loads(s)
        return parsed if isinstance(parsed, list) else []
    except json.JSONDecodeError:
        if ";" in s:
            return [part.strip() for part in s.split(";") if part.strip()]
        return []


def read_csv_rows(csv_path):
    rows = []
    with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames:
            return []

        headers = [clean(h) for h in reader.fieldnames]
        for raw in reader:
            if raw is None:
                continue
            row = {}
            for idx, header in enumerate(headers):
                source_header = reader.fieldnames[idx]
                row[header or f"col_{idx}"] = clean(raw.get(source_header))
            if any(v != "" for v in row.values()):
                rows.append(row)
    return rows


def resolve_path(value):
    path = Path(value)
    return path.resolve() if path.is_absolute() else (REPO_ROOT / path).resolve()


def display_path(path):
    try:
        return str(path.relative_to(REPO_ROOT)).replace("\\", "/")
    except ValueError:
        return str(path)


def build_elements_from_rows(node_rows, edge_rows):
    seen_ids = set()
    skipped_nodes = []
    duplicate_nodes = []
    nodes = []

    for i, row in enumerate(node_rows):
        node_id = clean_id(row.get("Org ID"))
        if not node_id:
            skipped_nodes.append({"rowIndex": i, "reason": "missing Org ID", "row": row})
            continue
        if node_id in seen_ids:
            duplicate_nodes.append({"rowIndex": i, "id": node_id, "row": row})
            continue
        seen_ids.add(node_id)

        org_name = clean(row.get("Organization Name"))
        org_type_primary = clean(row.get("orgTypePrimary"))
        geo_primary = clean(row.get("geoPrimary"))
        org_types = parse_json_array_field(row, "orgTypes")
        geo_tags = parse_json_array_field(row, "geoTags")
        node_types = parse_json_array_field(row, "nodeTypes")
        governance_levels = parse_json_array_field(row, "governanceLevels")
        functional_domains = parse_json_array_field(row, "functionalDomains")
        role_tags = parse_json_array_field(row, "roleTags")
        lifeline_tags = parse_json_array_field(row, "lifelineTags")

        nodes.append(
            {
                "data": {
                    "id": node_id,
                    "label": node_id,
                    "orgName": org_name,
                    "orgTypePrimary": org_type_primary,
                    "geoPrimary": geo_primary,
                    "orgTypes": org_types,
                    "geoTags": geo_tags,
                    "nodeTypePrimary": clean(row.get("nodeTypePrimary")),
                    "nodeTypes": node_types,
                    "governanceLevelPrimary": clean(row.get("governanceLevelPrimary")),
                    "governanceLevels": governance_levels,
                    "functionalDomainPrimary": clean(row.get("functionalDomainPrimary")),
                    "functionalDomains": functional_domains,
                    "rolePrimary": clean(row.get("rolePrimary")),
                    "roleTags": role_tags,
                    "femaLifelinePrimary": clean(row.get("femaLifelinePrimary")),
                    "lifelineTags": lifeline_tags,
                    "notes": clean(row.get("Notes")),
                    "primary": clean(row.get("Primary")),
                    "secondary": clean(row.get("2ndry")),
                    "url": clean(row.get("url")),
                    "reviewFlag": clean(row.get("review_flag")),
                    "reviewNote": clean(row.get("review_note")),
                    "_nodeColor": palette_color(org_type_primary or geo_primary or "unknown"),
                }
            }
        )

    id_set = {n["data"]["id"] for n in nodes}
    skipped_edges = []
    edges = []

    for i, row in enumerate(edge_rows):
        source = clean_id(row.get("From agency"))
        target = clean_id(row.get("To agency"))

        if not source or not target:
            skipped_edges.append({"rowIndex": i, "reason": "missing source/target", "row": row})
            continue

        src_ok = source in id_set
        tgt_ok = target in id_set
        if not src_ok or not tgt_ok:
            skipped_edges.append(
                {
                    "rowIndex": i,
                    "reason": "endpoint not found in nodes",
                    "source": source,
                    "target": target,
                    "srcOk": src_ok,
                    "tgtOk": tgt_ok,
                    "row": row,
                }
            )
            continue

        rel_type = clean(row.get("Relationship type"))
        status = clean(row.get("Status"))
        description = clean(row.get("Description"))

        edges.append(
            {
                "data": {
                    "id": f"{source}__{target}__{slugify(rel_type or 'rel')}__{len(edges)}",
                    "source": source,
                    "target": target,
                    "relType": rel_type,
                    "status": status,
                    "description": description,
                    "_edgeColor": palette_color(rel_type or status or "unknown"),
                }
            }
        )

    diagnostics = {
        "nodeCount": len(nodes),
        "edgeCount": len(edges),
        "skippedNodesCount": len(skipped_nodes),
        "duplicateNodesCount": len(duplicate_nodes),
        "skippedEdgesCount": len(skipped_edges),
        "skippedNodesSample": skipped_nodes[:5],
        "duplicateNodesSample": duplicate_nodes[:5],
        "skippedEdgesSample": skipped_edges[:5],
    }
    return nodes, edges, diagnostics


def main():
    parser = argparse.ArgumentParser(description="Preprocess CSV graph data into graph.json")
    parser.add_argument(
        "paths",
        nargs="*",
        metavar="PATH",
        help="Optional positional paths: nodes CSV, edges CSV, output JSON",
    )
    parser.add_argument("--nodes")
    parser.add_argument("--edges")
    parser.add_argument("--out")
    args = parser.parse_args()

    if len(args.paths) > 3:
        parser.error("expected at most three positional paths: nodes, edges, output")

    default_paths = [
        "./scripts/organizations_clean.csv",
        "./scripts/edges_clean.csv",
        "./scripts/out/graph.json",
    ]
    positional_paths = [*args.paths, *default_paths[len(args.paths):]]

    nodes_csv = resolve_path(args.nodes or positional_paths[0])
    edges_csv = resolve_path(args.edges or positional_paths[1])
    out_file = resolve_path(args.out or positional_paths[2])

    node_rows = read_csv_rows(nodes_csv)
    edge_rows = read_csv_rows(edges_csv)
    nodes, edges, diagnostics = build_elements_from_rows(node_rows, edge_rows)

    payload = {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "sourceFiles": {
            "nodesCsv": display_path(nodes_csv),
            "edgesCsv": display_path(edges_csv),
        },
        "diagnostics": diagnostics,
        "elements": {"nodes": nodes, "edges": edges},
    }

    out_file.parent.mkdir(parents=True, exist_ok=True)
    out_file.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    print(
        f"[preprocess-data] wrote {display_path(out_file)} "
        f"({len(nodes)} nodes, {len(edges)} edges)"
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as err:
        print(f"[preprocess-data] failed: {err}", file=sys.stderr)
        raise SystemExit(1)
