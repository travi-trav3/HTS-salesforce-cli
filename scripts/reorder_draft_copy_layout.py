#!/usr/bin/env python3
# Reorder the Draft Copy section on every Contact UI in the target org.
# Covers both classic Page Layouts AND Lightning Record Pages (FlexiPages).
# Surgical: only the field order inside the "Draft Copy" section changes.
# Every other section, button, related list, and field on the page is
# left exactly as it was.
#
# Usage:
#   python3 scripts/reorder_draft_copy_layout.py            # against hts-prod
#   ORG_ALIAS=my-sandbox python3 scripts/reorder_draft_copy_layout.py
#
# Requires: sf CLI authed to the target org.

import json
import os
import shutil
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path

ORG_ALIAS = os.environ.get("ORG_ALIAS", "hts-prod")
SECTION_LABEL = "Draft Copy"

# Touch order. Lower index = higher on the page.
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
    return subprocess.run(cmd, cwd=cwd, check=check, text=True)


def sort_key_for_name(name):
    if name in DESIRED_ORDER:
        return (0, DESIRED_ORDER.index(name), name)
    return (1, 999, name)


# ---------- sf CLI helpers ----------

def list_metadata(metadata_type):
    out = subprocess.run(
        [
            "sf", "org", "list", "metadata",
            "--metadata-type", metadata_type,
            "--target-org", ORG_ALIAS,
            "--json",
        ],
        capture_output=True, text=True, check=True,
    ).stdout
    start = out.find("{")
    data = json.loads(out[start:])
    return data.get("result", [])


def retrieve(workdir: Path, metadata_items):
    if not metadata_items:
        return
    args = []
    for item in metadata_items:
        args += ["--metadata", item]
    run(
        ["sf", "project", "retrieve", "start", "--target-org", ORG_ALIAS, *args],
        cwd=workdir,
    )


def deploy(workdir: Path, paths):
    if not paths:
        return
    args = []
    for p in paths:
        args += ["--source-dir", str(p)]
    run(
        ["sf", "project", "deploy", "start", "--target-org", ORG_ALIAS, *args],
        cwd=workdir,
    )


# ---------- Classic Page Layout ----------

def reorder_page_layout(layout_path: Path) -> bool:
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

            def key(item):
                f = item.find("sf:field", NSMAP)
                name = f.text.strip() if (f is not None and f.text) else ""
                return sort_key_for_name(name)

            original = list(items)
            ordered = sorted(items, key=key)
            if [id(x) for x in original] == [id(x) for x in ordered]:
                continue

            for item in original:
                column.remove(item)
            for item in ordered:
                column.append(item)
            changed = True

    if changed:
        tree.write(layout_path, xml_declaration=True, encoding="UTF-8")
    return changed


# ---------- FlexiPage (Lightning Record Page) ----------

def find_property_value(component, prop_name):
    """Look up a componentInstanceProperties value by name."""
    for prop in component.findall("sf:componentInstanceProperties", NSMAP):
        name_el = prop.find("sf:name", NSMAP)
        if name_el is not None and (name_el.text or "").strip() == prop_name:
            v = prop.find("sf:value", NSMAP)
            return v.text.strip() if (v is not None and v.text) else ""
    return None


def field_api_name_from_instance(field_instance):
    """Pull the API name out of a fieldInstance, regardless of which schema variant."""
    # Variant A: <fieldInstance><fieldItem>Record.Email_Draft_Intro__c</fieldItem></fieldInstance>
    fi = field_instance.find("sf:fieldItem", NSMAP)
    if fi is not None and fi.text:
        v = fi.text.strip()
        return v.split(".", 1)[1] if v.startswith("Record.") else v
    # Variant B: properties bag with name=uiBehavior etc. and name=fieldItem
    for prop in field_instance.findall("sf:fieldInstanceProperties", NSMAP):
        name_el = prop.find("sf:name", NSMAP)
        if name_el is not None and (name_el.text or "").strip() == "fieldItem":
            v = prop.find("sf:value", NSMAP)
            if v is not None and v.text:
                t = v.text.strip()
                return t.split(".", 1)[1] if t.startswith("Record.") else t
    return ""


def reorder_flexipage(fp_path: Path) -> bool:
    tree = ET.parse(fp_path)
    root = tree.getroot()

    # Only touch FlexiPages that target the Contact sObject.
    sobj = root.find("sf:sobjectType", NSMAP)
    if sobj is None or (sobj.text or "").strip() != "Contact":
        return False

    changed = False

    # Find every fieldSection regardless of how deep it sits.
    for component in root.iter(f"{{{NS}}}componentInstance"):
        name_el = component.find("sf:componentName", NSMAP)
        if name_el is None or (name_el.text or "").strip() != "flexipage:fieldSection":
            continue
        if find_property_value(component, "label") != SECTION_LABEL:
            continue

        # Field instances are direct children of the component, named fieldInstance.
        field_instances = component.findall("sf:fieldInstance", NSMAP)
        if not field_instances:
            continue

        def key(fi):
            return sort_key_for_name(field_api_name_from_instance(fi))

        original = list(field_instances)
        ordered = sorted(field_instances, key=key)
        if [id(x) for x in original] == [id(x) for x in ordered]:
            continue

        # Need to remove + re-append in the new order while preserving sibling
        # elements (like componentInstanceProperties) that come before/after.
        for fi in original:
            component.remove(fi)
        for fi in ordered:
            component.append(fi)
        changed = True

    if changed:
        tree.write(fp_path, xml_declaration=True, encoding="UTF-8")
    return changed


# ---------- Main ----------

def main():
    if shutil.which("sf") is None:
        sys.exit("sf CLI not on PATH. Install @salesforce/cli first.")

    contact_layouts = [
        r["fullName"] for r in list_metadata("Layout")
        if r["fullName"].startswith("Contact-")
    ]
    flexipages = [r["fullName"] for r in list_metadata("FlexiPage")]

    print(f"Contact page layouts in org: {contact_layouts or 'none'}")
    print(f"FlexiPages in org:           {flexipages or 'none'}")

    if not contact_layouts and not flexipages:
        sys.exit("Nothing to retrieve. Done.")

    with tempfile.TemporaryDirectory() as tmp:
        workdir = Path(tmp)
        (workdir / "sfdx-project.json").write_text(
            '{"packageDirectories":[{"path":"force-app","default":true}],'
            '"namespace":"","sfdcLoginUrl":"https://login.salesforce.com",'
            '"sourceApiVersion":"60.0"}\n'
        )
        (workdir / "force-app" / "main" / "default").mkdir(parents=True)

        items = (
            [f"Layout:{n}" for n in contact_layouts]
            + [f"FlexiPage:{n}" for n in flexipages]
        )
        retrieve(workdir, items)

        changed_paths = []

        layouts_dir = workdir / "force-app" / "main" / "default" / "layouts"
        if layouts_dir.exists():
            for f in sorted(layouts_dir.glob("Contact-*.layout-meta.xml")):
                print(f"-- layout: {f.name}")
                if reorder_page_layout(f):
                    print("   reordered Draft Copy section")
                    changed_paths.append(f)
                else:
                    print("   no Draft Copy section (skipped)")

        flexi_dir = workdir / "force-app" / "main" / "default" / "flexipages"
        if flexi_dir.exists():
            for f in sorted(flexi_dir.glob("*.flexipage-meta.xml")):
                print(f"-- flexipage: {f.name}")
                if reorder_flexipage(f):
                    print("   reordered Draft Copy section")
                    changed_paths.append(f)
                else:
                    print("   not a Contact FlexiPage or no Draft Copy section (skipped)")

        if not changed_paths:
            print("Nothing to deploy. Done.")
            return

        deploy(workdir, changed_paths)
        print("Done. Hard-refresh a Contact tab (Cmd+Shift+R) to verify.")


if __name__ == "__main__":
    main()
