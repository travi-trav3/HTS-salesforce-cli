#!/usr/bin/env python3
# Reorder the Draft Copy section on every Contact page layout in the
# target org. Surgical: only the field order inside the "Draft Copy"
# section changes. Every other section, button, related list, and
# field elsewhere on the layout is left exactly as it was.
#
# Usage:
#   python3 scripts/reorder_draft_copy_layout.py            # against hts-prod
#   ORG_ALIAS=my-sandbox python3 scripts/reorder_draft_copy_layout.py
#
# Requires: sf CLI authed to the target org.

import os
import shutil
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path

ORG_ALIAS = os.environ.get("ORG_ALIAS", "hts-prod")
SECTION_LABEL = "Draft Copy"

# Touch order. API name -> position. Lower number = higher on the layout.
DESIRED_ORDER = [
    "LinkedIn_Connection_Note__c",   # T1
    "Email_Draft_Intro__c",          # T2
    "Email_Draft_Value1__c",         # T3
    "LinkedIn_Message_Draft_1__c",   # T4 Primary
    "Email_Draft_Sub4__c",           # T4 Secondary
    "Email_Draft_FollowUp__c",       # T6
    "Email_Draft_Value2__c",         # T7
    "LinkedIn_Message_Draft_2__c",   # T8 Primary
    "Email_Draft_Sub8__c",           # T8 Secondary
    "Email_Draft_DirectAsk__c",      # T10
    "LinkedIn_Message_Draft_3__c",   # T12 Primary
    "Email_Draft_Sub12__c",          # T12 Secondary
    "Email_Draft_Pause__c",          # T13
]

NS = "http://soap.sforce.com/2006/04/metadata"
ET.register_namespace("", NS)
NSMAP = {"sf": NS}


def run(cmd, cwd=None, check=True):
    print(f"$ {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=cwd, check=check, text=True)
    return result


def list_contact_layouts():
    """Ask the org which Contact layouts exist."""
    import json

    out = subprocess.run(
        [
            "sf", "org", "list", "metadata",
            "--metadata-type", "Layout",
            "--target-org", ORG_ALIAS,
            "--json",
        ],
        capture_output=True, text=True, check=True,
    ).stdout
    # sf may prepend warnings; locate the JSON object.
    start = out.find("{")
    data = json.loads(out[start:])
    result = data.get("result", [])
    layouts = [r["fullName"] for r in result if r["fullName"].startswith("Contact-")]
    return layouts


def retrieve_layouts(workdir: Path, layouts):
    """Pull the listed layouts into workdir/force-app/main/default/layouts/."""
    if not layouts:
        return
    # sf wants Layout:Contact-Layout%20Name format.
    metadata_args = []
    for name in layouts:
        metadata_args += ["--metadata", f"Layout:{name}"]
    run(
        ["sf", "project", "retrieve", "start", "--target-org", ORG_ALIAS, *metadata_args],
        cwd=workdir,
    )


def reorder_section(layout_path: Path) -> bool:
    """Reorder the Draft Copy section in one layout file. Returns True if changed."""
    tree = ET.parse(layout_path)
    root = tree.getroot()
    changed = False

    for section in root.findall("sf:layoutSections", NSMAP):
        label_el = section.find("sf:label", NSMAP)
        if label_el is None or (label_el.text or "").strip() != SECTION_LABEL:
            continue

        for column in section.findall("sf:layoutColumns", NSMAP):
            items = column.findall("sf:layoutItems", NSMAP)
            if not items:
                continue

            def sort_key(item):
                f = item.find("sf:field", NSMAP)
                if f is None or f.text is None:
                    return (1, 999, "")
                name = f.text.strip()
                if name in DESIRED_ORDER:
                    return (0, DESIRED_ORDER.index(name), name)
                # Unknown / non-draft items keep relative order, sink to bottom.
                return (1, 999, name)

            original = list(items)
            ordered = sorted(items, key=sort_key)
            if [id(x) for x in original] == [id(x) for x in ordered]:
                continue

            for item in original:
                column.remove(item)
            for item in ordered:
                column.append(item)
            changed = True

    if changed:
        # ET writes default ns with no prefix because we registered it; good.
        tree.write(layout_path, xml_declaration=True, encoding="UTF-8")
    return changed


def deploy_layouts(workdir: Path, paths):
    if not paths:
        return
    args = []
    for p in paths:
        args += ["--source-dir", str(p)]
    run(
        ["sf", "project", "deploy", "start", "--target-org", ORG_ALIAS, *args],
        cwd=workdir,
    )


def main():
    if shutil.which("sf") is None:
        sys.exit("sf CLI not on PATH. Install @salesforce/cli first.")

    layouts = list_contact_layouts()
    print(f"Found {len(layouts)} Contact layout(s): {layouts}")
    if not layouts:
        sys.exit("No Contact layouts found in the target org. Nothing to do.")

    with tempfile.TemporaryDirectory() as tmp:
        workdir = Path(tmp)
        # Minimal sfdx project so retrieve has somewhere to land.
        (workdir / "sfdx-project.json").write_text(
            '{"packageDirectories":[{"path":"force-app","default":true}],'
            '"namespace":"","sfdcLoginUrl":"https://login.salesforce.com",'
            '"sourceApiVersion":"60.0"}\n'
        )
        # sf CLI validates that the package directory exists before retrieve.
        (workdir / "force-app" / "main" / "default").mkdir(parents=True)

        retrieve_layouts(workdir, layouts)

        layouts_dir = workdir / "force-app" / "main" / "default" / "layouts"
        if not layouts_dir.exists():
            sys.exit(f"Retrieve produced no layouts at {layouts_dir}.")

        changed_paths = []
        for layout_file in sorted(layouts_dir.glob("Contact-*.layout-meta.xml")):
            print(f"-- {layout_file.name}")
            if reorder_section(layout_file):
                print("   reordered Draft Copy section")
                changed_paths.append(layout_file)
            else:
                print("   no change (no Draft Copy section or already in order)")

        if not changed_paths:
            print("Nothing to deploy. Done.")
            return

        deploy_layouts(workdir, changed_paths)
        print("Done. Open a Contact to verify.")


if __name__ == "__main__":
    main()
