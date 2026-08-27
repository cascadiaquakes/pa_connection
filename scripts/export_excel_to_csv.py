#!/usr/bin/env python3
"""Export the dashboard workbook into CSV inputs for preprocess_data.py."""

import argparse
from collections import Counter, defaultdict
import csv
import json
import re
import sys
from datetime import datetime, timedelta
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile

from generate_menu_definitions import (
    NS,
    cell_value,
    clean,
    column_number,
    display_path,
    read_shared_strings,
    resolve_path,
    workbook_sheets,
)


MISSING_TOKENS = {"", "nan", "none", "n/a", "na", "null", "???"}
CATEGORY_EXPORTS = {
    "node_type": ("nodeTypes_json", "nodeTypePrimary"),
    "org_type": ("orgTypes_json", "orgTypePrimary"),
    "governance_level": ("governanceLevels_json", "governanceLevelPrimary"),
    "geographic_scale": ("geoTags_json", "geoPrimary"),
    "roles": ("roleTags_json", "rolePrimary"),
}
NODE_COLUMNS = [
    "Organization Name",
    "Org ID",
    "orgTypes_json",
    "orgTypePrimary",
    "geoPrimary",
    "Notes",
    "Primary",
    "2ndry",
    "geoTags_json",
    "nodeTypes_json",
    "nodeTypePrimary",
    "governanceLevels_json",
    "governanceLevelPrimary",
    "roleTags_json",
    "rolePrimary",
    "url",
    "review_flag",
    "review_note",
    "lastUpdated",
]
EDGE_COLUMNS = ["From agency", "To agency", "Relationship type", "Description", "Status"]


def normalize_text(value):
    value = re.sub(r"\s+", " ", str(value or "")).strip()
    return "" if value.lower() in MISSING_TOKENS else value


def clean_id(value):
    return re.sub(r"\s+", "", normalize_text(value))


def pretty_label(value):
    value = normalize_text(value)
    if not value:
        return "Other"
    if "_" in value:
        return value.replace("_", " ").title()
    return value.title() if value.islower() else value


def split_categories(value):
    value = normalize_text(value)
    if not value:
        return ["Other"]
    categories = []
    for part in re.split(r"\s*[,;/|]\s*", value):
        label = pretty_label(part)
        if label not in categories:
            categories.append(label)
    return categories or ["Other"]


def excel_date(value):
    value = normalize_text(value)
    if not value:
        return ""
    try:
        serial = float(value)
    except ValueError:
        return value
    if not 1 <= serial <= 2_958_465:
        return value
    return (datetime(1899, 12, 30) + timedelta(days=serial)).date().isoformat()


def worksheet_rows(workbook, worksheet_path, shared_strings):
    root = ET.fromstring(workbook.read(worksheet_path))
    raw_rows = []
    for row in root.findall(".//main:sheetData/main:row", NS):
        raw_rows.append(
            {
                column_number(cell.attrib.get("r")): clean(cell_value(cell, shared_strings))
                for cell in row.findall("main:c", NS)
            }
        )
    if not raw_rows:
        return []
    headers = {index: value for index, value in raw_rows[0].items() if value}
    return [
        {header: row.get(index, "") for index, header in headers.items()}
        for row in raw_rows[1:]
        if any(row.get(index, "") for index in headers)
    ]


def require_columns(rows, required, sheet_name):
    available = set(rows[0]) if rows else set()
    missing = [column for column in required if column not in available]
    if missing:
        raise ValueError(f"Sheet {sheet_name!r} is missing columns: {', '.join(missing)}")


def combine_notes(row):
    parts = []
    for column in ("Summary", "Description of relevant resources"):
        value = normalize_text(row.get(column))
        if value and value not in parts:
            parts.append(value)
    return "\n\n".join(parts)


def build_node_rows(rows, sheet_name):
    require_columns(rows, ["node_id", "name", *CATEGORY_EXPORTS], sheet_name)
    output = []
    seen_ids = set()
    skipped_missing_ids = []
    category_counts = defaultdict(Counter)
    category_normalizations = defaultdict(Counter)
    for row_number, row in enumerate(rows, start=2):
        node_id = clean_id(row.get("node_id"))
        if not node_id:
            skipped_missing_ids.append(
                {"row": row_number, "name": normalize_text(row.get("name"))}
            )
            continue
        if node_id in seen_ids:
            raise ValueError(f"Duplicate node_id {node_id!r} in {sheet_name!r} row {row_number}")
        seen_ids.add(node_id)
        item = {
            "Organization Name": normalize_text(row.get("name")),
            "Org ID": node_id,
            "Notes": combine_notes(row),
            "Primary": normalize_text(row.get("key_contact")),
            "2ndry": normalize_text(row.get("contact_email") or row.get("contact_url")),
            "url": normalize_text(row.get("url")),
            "review_flag": normalize_text(row.get("review_flag")),
            "review_note": normalize_text(row.get("review_note")),
            "lastUpdated": excel_date(row.get("last_update")),
        }
        for source, (list_column, primary_column) in CATEGORY_EXPORTS.items():
            categories = split_categories(row.get(source))
            item[list_column] = json.dumps(categories)
            item[primary_column] = categories[0]
            raw_value = normalize_text(row.get(source))
            normalized_value = ", ".join(categories)
            category_counts[source].update(categories)
            if raw_value != normalized_value:
                category_normalizations[source][(raw_value, normalized_value)] += 1
        output.append(item)
    diagnostics = {
        "sourceRows": len(rows),
        "exportedRows": len(output),
        "skippedMissingNodeIds": skipped_missing_ids,
        "categoryCounts": {
            source: dict(sorted(counts.items()))
            for source, counts in category_counts.items()
        },
        "categoryNormalizations": {
            source: [
                {"from": before, "to": after, "rows": count}
                for (before, after), count in sorted(changes.items())
            ]
            for source, changes in category_normalizations.items()
        },
    }
    return output, diagnostics


def build_edge_rows(rows, sheet_name):
    require_columns(rows, ["From agency", "To agency", "Relationship type"], sheet_name)
    output = []
    seen = set()
    duplicates = []
    skipped_blank_rows = []
    for row_number, row in enumerate(rows, start=2):
        item = {column: normalize_text(row.get(column)) for column in EDGE_COLUMNS}
        item["From agency"] = clean_id(item["From agency"])
        item["To agency"] = clean_id(item["To agency"])
        signature = tuple(item[column] for column in EDGE_COLUMNS)
        if not any(signature):
            skipped_blank_rows.append(row_number)
        elif signature in seen:
            duplicates.append({"row": row_number, **item})
        else:
            seen.add(signature)
            output.append(item)
    diagnostics = {
        "sourceRows": len(rows),
        "exportedRows": len(output),
        "duplicateRowsRemoved": duplicates,
        "blankRowsSkipped": skipped_blank_rows,
    }
    return output, diagnostics


def relationship_diagnostics(node_rows, edge_rows):
    node_ids = {row["Org ID"] for row in node_rows}
    from_ids = {row["From agency"] for row in edge_rows if row["From agency"]}
    to_ids = {row["To agency"] for row in edge_rows if row["To agency"]}
    endpoint_ids = from_ids | to_ids
    return {
        "edgeSourcesMissingFromNodes": sorted(from_ids - node_ids),
        "edgeTargetsMissingFromNodes": sorted(to_ids - node_ids),
        "organizationsWithRelationships": sorted(node_ids & endpoint_ids),
        "organizationsWithoutRelationships": sorted(node_ids - endpoint_ids),
    }


def write_csv(path, columns, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def write_report(path, report):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, indent=2), encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(
        description="Export node and relationship CSV files from the dashboard Excel workbook"
    )
    parser.add_argument(
        "--excel",
        default="data_exel/cascadia_dashboard_master_updated_06-15-26.xlsx",
    )
    parser.add_argument("--nodes-sheet", default="master")
    parser.add_argument("--edges-sheet", default="Relationships")
    parser.add_argument("--nodes-out", default="scripts/out/organizations_clean.csv")
    parser.add_argument("--edges-out", default="scripts/out/edges_clean.csv")
    parser.add_argument("--report-out", default="scripts/out/export_excel_report.json")
    args = parser.parse_args()

    excel_path = resolve_path(args.excel)
    nodes_out = resolve_path(args.nodes_out)
    edges_out = resolve_path(args.edges_out)
    report_out = resolve_path(args.report_out)
    with ZipFile(excel_path) as workbook:
        sheets = workbook_sheets(workbook)
        missing_sheets = [
            name for name in (args.nodes_sheet, args.edges_sheet) if name not in sheets
        ]
        if missing_sheets:
            raise ValueError(
                f"Workbook is missing sheets: {', '.join(missing_sheets)}. "
                f"Available sheets: {', '.join(sheets)}"
            )
        shared_strings = read_shared_strings(workbook)
        node_source = worksheet_rows(workbook, sheets[args.nodes_sheet], shared_strings)
        edge_source = worksheet_rows(workbook, sheets[args.edges_sheet], shared_strings)

    node_rows, node_diagnostics = build_node_rows(node_source, args.nodes_sheet)
    edge_rows, edge_diagnostics = build_edge_rows(edge_source, args.edges_sheet)
    relationships = relationship_diagnostics(node_rows, edge_rows)
    write_csv(nodes_out, NODE_COLUMNS, node_rows)
    write_csv(edges_out, EDGE_COLUMNS, edge_rows)
    write_report(
        report_out,
        {
            "sourceWorkbook": display_path(excel_path),
            "nodes": node_diagnostics,
            "edges": edge_diagnostics,
            "relationships": relationships,
        },
    )
    print(f"[export-excel] wrote {display_path(nodes_out)} ({len(node_rows)} nodes)")
    print(f"[export-excel] wrote {display_path(edges_out)} ({len(edge_rows)} edges)")
    print(
        f"[export-excel] removed {len(edge_diagnostics['duplicateRowsRemoved'])} "
        "duplicate edges"
    )
    print(
        f"[export-excel] found "
        f"{len(relationships['organizationsWithoutRelationships'])} organizations "
        "without relationships"
    )
    print(f"[export-excel] wrote diagnostics to {display_path(report_out)}")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"[export-excel] failed: {error}", file=sys.stderr)
        raise SystemExit(1)
