#!/usr/bin/env python3
import argparse
import json
import re
import sys
from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as ET


REPO_ROOT = Path(__file__).resolve().parents[1]
MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PACKAGE_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
NS = {"main": MAIN_NS, "rel": REL_NS, "package": PACKAGE_REL_NS}

MENU_SHEETS = {
    "org_type definitions": {
        "key": "orgCat",
        "title": "Organization Category",
        "definition": "The broad type of organization represented by a node.",
    },
    "nodeType definitions": {
        "key": "nodeType",
        "title": "Node Type",
        "definition": "The graph entity type represented by a node.",
    },
    "governance definitions": {
        "key": "governance",
        "title": "Governance Level",
        "definition": "The jurisdictional or authority level associated with the entity.",
    },
    "Role definitions": {
        "key": "role",
        "title": "Role",
        "definition": "Roles an organization can serve in the network.",
    },
    "geographic_scale definitions": {
        "key": "geo",
        "title": "Geographic Area",
        "definition": "The main geography or geographic scope associated with the entity.",
    },
}


def clean(value):
    return re.sub(r"\s+", " ", str(value or "").replace("\xa0", " ")).strip()


def column_number(cell_reference):
    match = re.match(r"([A-Z]+)", cell_reference or "")
    if not match:
        return 0
    number = 0
    for letter in match.group(1):
        number = number * 26 + ord(letter) - ord("A") + 1
    return number


def read_shared_strings(workbook):
    if "xl/sharedStrings.xml" not in workbook.namelist():
        return []
    root = ET.fromstring(workbook.read("xl/sharedStrings.xml"))
    return [
        "".join(part.text or "" for part in item.findall(".//main:t", NS))
        for item in root.findall("main:si", NS)
    ]


def cell_value(cell, shared_strings):
    cell_type = cell.attrib.get("t")
    if cell_type == "inlineStr":
        return "".join(part.text or "" for part in cell.findall(".//main:t", NS))
    value = cell.find("main:v", NS)
    if value is None:
        return ""
    if cell_type == "s":
        return shared_strings[int(value.text)]
    return value.text or ""


def workbook_sheets(workbook):
    relationships = ET.fromstring(workbook.read("xl/_rels/workbook.xml.rels"))
    targets = {
        relationship.attrib["Id"]: relationship.attrib["Target"]
        for relationship in relationships.findall("package:Relationship", NS)
    }
    root = ET.fromstring(workbook.read("xl/workbook.xml"))
    sheets = {}
    for sheet in root.findall("main:sheets/main:sheet", NS):
        relationship_id = sheet.attrib[f"{{{REL_NS}}}id"]
        target = targets[relationship_id].lstrip("/")
        sheets[sheet.attrib["name"]] = target if target.startswith("xl/") else f"xl/{target}"
    return sheets


def read_definition_rows(workbook, worksheet_path, shared_strings):
    root = ET.fromstring(workbook.read(worksheet_path))
    rows = []
    for row in root.findall(".//main:sheetData/main:row", NS):
        values = {}
        for cell in row.findall("main:c", NS):
            values[column_number(cell.attrib.get("r"))] = clean(cell_value(cell, shared_strings))
        rows.append(values)

    if not rows:
        return []
    header = {value.lower(): index for index, value in rows[0].items() if value}
    name_column = header.get("name")
    definition_column = header.get("definition")
    if not name_column or not definition_column:
        raise ValueError(f"{worksheet_path} must contain 'name' and 'definition' columns")

    definitions = {}
    for row in rows[1:]:
        name = row.get(name_column, "")
        definition = row.get(definition_column, "")
        if not name and not definition:
            continue
        if not name or not definition:
            raise ValueError(
                f"{worksheet_path} has a row with a missing name or definition: {row}"
            )
        definitions[name] = definition
    return definitions


def build_menu_definitions(excel_path):
    menus = {}
    with ZipFile(excel_path) as workbook:
        shared_strings = read_shared_strings(workbook)
        sheets = workbook_sheets(workbook)
        for worksheet_name, menu in MENU_SHEETS.items():
            if worksheet_name not in sheets:
                raise ValueError(f"Workbook is missing required worksheet: {worksheet_name}")
            categories = read_definition_rows(workbook, sheets[worksheet_name], shared_strings)
            if not categories:
                raise ValueError(f"Worksheet has no category definitions: {worksheet_name}")
            menus[menu["key"]] = {
                "title": menu["title"],
                "definition": menu["definition"],
                "categories": categories,
            }

    # These menus are populated from graph data rather than workbook tabs.
    menus["relationshipType"] = {
        "title": "Relationship Type",
        "definition": "The type of connection represented by an edge between two graph entities.",
        "categories": {},
    }
    menus["allOrganizations"] = {
        "title": "All Organizations",
        "definition": "A visible-node selection menu used to highlight specific organizations after filters are applied.",
        "categories": {},
    }
    return menus


def resolve_path(value):
    path = Path(value)
    return path.resolve() if path.is_absolute() else (REPO_ROOT / path).resolve()


def display_path(path):
    try:
        return str(path.relative_to(REPO_ROOT)).replace("\\", "/")
    except ValueError:
        return str(path)


def main():
    parser = argparse.ArgumentParser(description="Generate menuDefinitions.json from an Excel workbook")
    parser.add_argument(
        "paths",
        nargs="*",
        metavar="PATH",
        help="Optional positional paths: Excel workbook, output JSON",
    )
    parser.add_argument("--excel")
    parser.add_argument("--out")
    args = parser.parse_args()

    if len(args.paths) > 2:
        parser.error("expected at most two positional paths: Excel workbook, output JSON")

    default_paths = [
        "./data_exel/cascadia_dashboard_master_updated_06-15-26.xlsx",
        "./frontend/public/data/menuDefinitions.json",
    ]
    positional_paths = [*args.paths, *default_paths[len(args.paths):]]

    excel_path = resolve_path(args.excel or positional_paths[0])
    out_file = resolve_path(args.out or positional_paths[1])

    definitions = build_menu_definitions(excel_path)
    out_file.parent.mkdir(parents=True, exist_ok=True)
    out_file.write_text(json.dumps(definitions, indent=2), encoding="utf-8")

    print(
        f"[generate-menu-definitions] wrote {display_path(out_file)} "
        f"({len(definitions)} menus)"
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as err:
        print(f"[generate-menu-definitions] failed: {err}", file=sys.stderr)
        raise SystemExit(1)
