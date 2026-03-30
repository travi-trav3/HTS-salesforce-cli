#!/usr/bin/env python3
"""
Fix Salesforce Flow XML files:
1. Group all child elements of <Flow> by tag name (Salesforce requires this)
2. Remove top-level <triggerType> and <recordTriggerType> (belong in <start> only)
3. Ensure <triggerType> exists inside <start> for record-triggered flows
"""
import xml.etree.ElementTree as ET
import sys
import os
import re

NS = "http://soap.sforce.com/2006/04/metadata"
ET.register_namespace("", NS)

# Salesforce Flow element ordering (alphabetical is safest)
ELEMENT_ORDER = [
    "actionCalls",
    "apiVersion",
    "assignments",
    "choices",
    "constants",
    "decisions",
    "description",
    "dynamicChoiceSets",
    "formulas",
    "interviewLabel",
    "label",
    "loops",
    "processMetadataValues",
    "processType",
    "recordCreates",
    "recordDeletes",
    "recordLookups",
    "recordUpdates",
    "screens",
    "stages",
    "start",
    "status",
    "subflows",
    "textTemplates",
    "variables",
]


def get_sort_key(tag):
    """Get sort order for a Flow child element tag."""
    local = tag.replace(f"{{{NS}}}", "")
    try:
        return ELEMENT_ORDER.index(local)
    except ValueError:
        return 999  # Unknown elements go last


def fix_flow(filepath):
    """Fix a single Flow XML file."""
    tree = ET.parse(filepath)
    root = tree.getroot()

    # Collect top-level triggerType and recordTriggerType values before removing
    trigger_type = None
    record_trigger_type = None

    children = list(root)
    to_remove = []

    for child in children:
        local = child.tag.replace(f"{{{NS}}}", "")
        if local == "triggerType":
            trigger_type = child.text
            to_remove.append(child)
        elif local == "recordTriggerType":
            record_trigger_type = child.text
            to_remove.append(child)

    for child in to_remove:
        root.remove(child)

    # If we found a triggerType, ensure it's in <start>
    if trigger_type:
        start_elem = root.find(f"{{{NS}}}start")
        if start_elem is not None:
            existing = start_elem.find(f"{{{NS}}}triggerType")
            if existing is None:
                tt = ET.SubElement(start_elem, f"{{{NS}}}triggerType")
                tt.text = trigger_type

    # Sort all children by element type
    children = list(root)
    for child in children:
        root.remove(child)

    children.sort(key=lambda c: (get_sort_key(c.tag), children.index(c) if False else 0))

    # Stable sort: group by tag, maintain order within each group
    from itertools import groupby
    grouped = {}
    order_seen = []
    for child in children:
        local = child.tag.replace(f"{{{NS}}}", "")
        if local not in grouped:
            grouped[local] = []
            order_seen.append(local)
        grouped[local].append(child)

    # Reorder by ELEMENT_ORDER, then any remaining in order seen
    sorted_tags = []
    for tag in ELEMENT_ORDER:
        if tag in grouped:
            sorted_tags.append(tag)
    for tag in order_seen:
        if tag not in sorted_tags:
            sorted_tags.append(tag)

    for tag in sorted_tags:
        for child in grouped[tag]:
            root.append(child)

    # Write back with proper formatting
    ET.indent(tree, space="    ")
    tree.write(filepath, encoding="UTF-8", xml_declaration=True)

    # Fix the XML declaration to use single quotes (Salesforce style)
    with open(filepath, "r") as f:
        content = f.read()
    content = content.replace("<?xml version='1.0' encoding='UTF-8'?>",
                              '<?xml version="1.0" encoding="UTF-8"?>')
    with open(filepath, "w") as f:
        f.write(content)

    print(f"  Fixed: {os.path.basename(filepath)}")
    if trigger_type:
        print(f"    Moved triggerType={trigger_type} into <start>")
    if record_trigger_type:
        print(f"    Removed top-level recordTriggerType={record_trigger_type}")


if __name__ == "__main__":
    flow_dir = "force-app/main/default/flows"
    if len(sys.argv) > 1:
        flow_dir = sys.argv[1]

    print("Fixing Flow XML element ordering...")
    for filename in sorted(os.listdir(flow_dir)):
        if filename.endswith(".flow-meta.xml"):
            fix_flow(os.path.join(flow_dir, filename))
    print("Done.")
