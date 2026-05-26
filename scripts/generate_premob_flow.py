#!/usr/bin/env python3
"""
Generates force-app/main/default/flows/Generate_PreMob_Tasks.flow-meta.xml
from the canonical Pre-Mob task table (Part 7 of the Sprint 1 brief).

The flow:
  - Triggers on Project__c create where Stage = Pre-Mob.
  - Computes BaseDate (Mobilization_Date__c or TODAY fallback).
  - For each canonical task, conditionally appends a Task to a collection.
  - DML: one Create Records on the full collection.

User IDs are emitted as {{IAN_USER_ID}} / {{AMANDA_USER_ID}} / {{DYLAN_USER_ID}}
placeholders for deploy-time substitution by deploy.sh.

Re-run after edits to the TASKS table:
    python3 scripts/generate_premob_flow.py
"""

# (subject, owner_token, t_offset_days, is_gate, section, condition)
# owner_token: "IAN" | "AMANDA" | "DYLAN" | "LEAD"
# condition: None | "NEW_HIRES" | "DRIVE_MIXED" | "FLY_MIXED"
TASKS = [
    ("Scope reviewed and clear",                              "IAN",    14, True,  "A. Financial + Scope", None),
    ("Margin validated",                                      "IAN",    14, True,  "A. Financial + Scope", None),
    ("Budget loaded",                                         "DYLAN",  12, False, "A. Financial + Scope", None),
    ("All roles filled",                                      "IAN",    10, True,  "B. Staffing", None),
    ("Skill match verified",                                  "IAN",    10, True,  "B. Staffing", None),
    ("Lead assigned",                                         "IAN",    10, True,  "B. Staffing", None),
    ("Backup coverage confirmed",                             "IAN",     7, False, "B. Staffing", None),
    ("R&R rotation scheduled and covered",                    "IAN",     7, False, "B. Staffing", None),
    ("Certifications verified",                               "IAN",    10, True,  "C. Safety", None),
    ("Site-specific safety plan complete",                    "LEAD",    7, True,  "C. Safety", None),
    ("PPE and uniforms confirmed and in-stock",               "AMANDA",  7, False, "C. Safety", None),
    ("Hazard analysis complete",                              "IAN",     7, True,  "C. Safety", None),
    ("JSEA review completed",                                 "IAN",     7, True,  "C. Safety", None),
    ("LOTO forms verified",                                   "LEAD",    5, True,  "C. Safety", None),
    ("Crew trained for scope",                                "LEAD",    5, False, "D. Training", None),
    ("Skill gaps addressed",                                  "IAN",     5, False, "D. Training", None),
    ("SSE identified and training scheduled",                 "LEAD",    5, False, "D. Training", "NEW_HIRES"),
    ("Tools staged",                                          "LEAD",    5, False, "E. Tools + Fleet", None),
    ("Equipment ordered",                                     "AMANDA", 10, False, "E. Tools + Fleet", None),
    ("Trucks assigned",                                       "IAN",     5, False, "E. Tools + Fleet", "DRIVE_MIXED"),
    ("Flights and ground transport booked",                   "AMANDA",  7, False, "E. Tools + Fleet", "FLY_MIXED"),
    ("Materials ordered",                                     "AMANDA", 10, False, "F. Procurement", None),
    ("Delivery coordinated with site",                        "AMANDA",  5, False, "F. Procurement", None),
    ("Timeline locked",                                       "IAN",     7, True,  "G. Schedule", None),
    ("Daily production targets set",                          "IAN",     3, False, "G. Schedule", None),
    ("Contingency defined",                                   "IAN",     3, False, "G. Schedule", None),
    ("Scope confirmed with client",                           "DYLAN",   7, True,  "H. Client Alignment", None),
    ("Documentation expectations detailed",                   "LEAD",    5, False, "H. Client Alignment", None),
    ("Success criteria defined",                              "IAN",     3, False, "H. Client Alignment", None),
    ("Pre-Mob sign-off: ready to mobilize",                   "IAN",     1, True,  "Sign-off", None),
]

OWNER_REF = {
    "IAN":    "{!IanUserId}",
    "AMANDA": "{!AmandaUserId}",
    "DYLAN":  "{!DylanUserId}",
    "LEAD":   "{!ProjectLeadOwnerId}",
}

CONDITION_FORMULA = {
    "NEW_HIRES":   "fIsNewHires",       # synthesized below
    "DRIVE_MIXED": "fIsDriveOrMixed",
    "FLY_MIXED":   "fIsFlyOrMixed",
}


def xml_escape(s: str) -> str:
    return (s.replace("&", "&amp;")
             .replace("<", "&lt;")
             .replace(">", "&gt;")
             .replace('"', "&quot;")
             .replace("'", "&apos;"))


def next_target_for(idx: int) -> str:
    """Resolve the next-step target after task `idx` runs. If the next task
    is conditional, the prior step must enter via its Cond_Task_NN decision
    so the include/skip routing fires."""
    if idx >= len(TASKS) - 1:
        return "Create_All_Tasks"
    next_idx = idx + 1
    if TASKS[next_idx][5] is not None:
        return f"Cond_Task_{next_idx:02d}"
    return f"Build_Task_{next_idx:02d}"


def task_block(idx: int, task) -> str:
    subject, owner, t_off, is_gate, section, condition = task
    priority = "High" if is_gate else "Normal"
    owner_ref = OWNER_REF[owner]
    next_target = next_target_for(idx)

    assign_name = f"Build_Task_{idx:02d}"
    add_name    = f"Add_Task_{idx:02d}"
    skip_name   = f"Skip_Task_{idx:02d}"
    decision    = f"Cond_Task_{idx:02d}"
    section_xml = xml_escape(section)
    subject_xml = xml_escape(subject)

    # The "build" is an Assignment that sets fields on a NEW Task variable.
    # We accumulate by using a record-typed loop variable. Salesforce flows
    # let you Assign field-by-field on a typed sObject variable, then add
    # that variable to a collection. Simpler: use Assignment of Add on a
    # collection via the "Add" operator with all field values? That's not
    # how flow Add works — Add requires a single value.
    #
    # Approach: declare a Task variable per task (TaskVar_NN), Assign each
    # field on it, then Assign-add it into TasksToCreate.
    var_name = f"TaskVar_{idx:02d}"

    assign_xml = f'''    <assignments>
        <name>{assign_name}</name>
        <label>Build Task {idx+1:02d}: {subject_xml}</label>
        <locationX>176</locationX>
        <locationY>{200 + idx * 200}</locationY>
        <assignmentItems>
            <assignToReference>{var_name}.Subject</assignToReference>
            <operator>Assign</operator>
            <value><stringValue>{subject_xml}</stringValue></value>
        </assignmentItems>
        <assignmentItems>
            <assignToReference>{var_name}.WhatId</assignToReference>
            <operator>Assign</operator>
            <value><elementReference>$Record.Id</elementReference></value>
        </assignmentItems>
        <assignmentItems>
            <assignToReference>{var_name}.OwnerId</assignToReference>
            <operator>Assign</operator>
            <value><elementReference>{owner_ref[2:-1]}</elementReference></value>
        </assignmentItems>
        <assignmentItems>
            <assignToReference>{var_name}.ActivityDate</assignToReference>
            <operator>Assign</operator>
            <value><elementReference>fDueDate_{idx:02d}</elementReference></value>
        </assignmentItems>
        <assignmentItems>
            <assignToReference>{var_name}.Status</assignToReference>
            <operator>Assign</operator>
            <value><stringValue>Not Started</stringValue></value>
        </assignmentItems>
        <assignmentItems>
            <assignToReference>{var_name}.Priority</assignToReference>
            <operator>Assign</operator>
            <value><stringValue>{priority}</stringValue></value>
        </assignmentItems>
        <assignmentItems>
            <assignToReference>{var_name}.Is_Gate__c</assignToReference>
            <operator>Assign</operator>
            <value><booleanValue>{"true" if is_gate else "false"}</booleanValue></value>
        </assignmentItems>
        <assignmentItems>
            <assignToReference>{var_name}.Pre_Mob_Section__c</assignToReference>
            <operator>Assign</operator>
            <value><stringValue>{section_xml}</stringValue></value>
        </assignmentItems>
        <assignmentItems>
            <assignToReference>TasksToCreate</assignToReference>
            <operator>Add</operator>
            <value><elementReference>{var_name}</elementReference></value>
        </assignmentItems>
        <connector>
            <targetReference>{next_target}</targetReference>
        </connector>
    </assignments>
'''

    if condition is None:
        # Skip the decision; assign is wired directly to the next block via
        # the previous block's connector. But we still need the previous
        # block to target this build. The conditional case wraps in a decision
        # before the build; in the unconditional case the previous "build"
        # already connects to assign_name.
        return assign_xml

    # Conditional: previous block connects to decision. Decision routes to
    # assign_name (build the task) OR skip directly to the next build.
    cond_formula = CONDITION_FORMULA[condition]
    decision_xml = f'''    <decisions>
        <name>{decision}</name>
        <label>Conditional Task {idx+1:02d}: {subject_xml}</label>
        <locationX>176</locationX>
        <locationY>{200 + idx * 200 - 60}</locationY>
        <defaultConnector>
            <targetReference>{next_target}</targetReference>
        </defaultConnector>
        <defaultConnectorLabel>Skip</defaultConnectorLabel>
        <rules>
            <name>Include_{idx:02d}</name>
            <label>Include</label>
            <conditionLogic>and</conditionLogic>
            <conditions>
                <leftValueReference>{cond_formula}</leftValueReference>
                <operator>EqualTo</operator>
                <rightValue><booleanValue>true</booleanValue></rightValue>
            </conditions>
            <connector>
                <targetReference>{assign_name}</targetReference>
            </connector>
        </rules>
    </decisions>
'''
    return decision_xml + assign_xml


def make_flow_xml() -> str:
    # Variables for each Task and due-date formulas
    task_var_xml = ""
    for idx, _ in enumerate(TASKS):
        task_var_xml += f'''    <variables>
        <name>TaskVar_{idx:02d}</name>
        <dataType>SObject</dataType>
        <isCollection>false</isCollection>
        <isInput>false</isInput>
        <isOutput>false</isOutput>
        <objectType>Task</objectType>
    </variables>
'''

    formula_xml = ""
    for idx, t in enumerate(TASKS):
        t_off = t[2]
        formula_xml += f'''    <formulas>
        <name>fDueDate_{idx:02d}</name>
        <dataType>Date</dataType>
        <expression>{{!BaseDate}} - {t_off}</expression>
    </formulas>
'''

    # Build the chain. Determine prior connector for each task.
    # For each task, the prior step is either the previous task's assignment
    # (if previous was unconditional) or the previous task's wrapping (which
    # already chains to next_target == this task's entry).
    # The first task is reached from Set_Base_Date_And_Lead via "Build_Task_00"
    # if unconditional, or "Cond_Task_00" if conditional.

    blocks_xml = ""
    for idx, t in enumerate(TASKS):
        blocks_xml += task_block(idx, t)

    # Determine actual entry point for the first task
    first_condition = TASKS[0][5]
    first_entry = f"Cond_Task_00" if first_condition else f"Build_Task_00"

    # Read the scaffold template and substitute
    return TEMPLATE.format(
        first_entry=first_entry,
        task_var_xml=task_var_xml,
        formula_xml=formula_xml,
        blocks_xml=blocks_xml,
    )


TEMPLATE = '''<?xml version="1.0" encoding="UTF-8"?>
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>62.0</apiVersion>
    <description>Record-triggered flow on Project__c (Work Order) create. Generates the canonical Pre-Mob task checklist as Task records related to the Work Order, with owners, due dates offset from Mobilization_Date__c, and gate flags. Conditional tasks gate on Requires_New_Hires__c and Method_of_Mobilization__c. Generated by scripts/generate_premob_flow.py.</description>
    <label>Generate Pre-Mob Tasks</label>
    <processType>AutoLaunchedFlow</processType>
    <status>Active</status>

    <constants>
        <name>IanUserId</name>
        <dataType>String</dataType>
        <value><stringValue>{{{{IAN_USER_ID}}}}</stringValue></value>
    </constants>
    <constants>
        <name>AmandaUserId</name>
        <dataType>String</dataType>
        <value><stringValue>{{{{AMANDA_USER_ID}}}}</stringValue></value>
    </constants>
    <constants>
        <name>DylanUserId</name>
        <dataType>String</dataType>
        <value><stringValue>{{{{DYLAN_USER_ID}}}}</stringValue></value>
    </constants>

    <variables>
        <name>ProjectLeadOwnerId</name>
        <dataType>String</dataType>
        <isCollection>false</isCollection>
        <isInput>false</isInput>
        <isOutput>false</isOutput>
    </variables>
    <variables>
        <name>BaseDate</name>
        <dataType>Date</dataType>
        <isCollection>false</isCollection>
        <isInput>false</isInput>
        <isOutput>false</isOutput>
    </variables>
    <variables>
        <name>TasksToCreate</name>
        <dataType>SObject</dataType>
        <isCollection>true</isCollection>
        <isInput>false</isInput>
        <isOutput>false</isOutput>
        <objectType>Task</objectType>
    </variables>
{task_var_xml}
    <formulas>
        <name>fEffectiveBaseDate</name>
        <dataType>Date</dataType>
        <expression>IF(ISBLANK({{!$Record.Mobilization_Date__c}}), TODAY(), {{!$Record.Mobilization_Date__c}})</expression>
    </formulas>
    <formulas>
        <name>fEffectiveProjectLead</name>
        <dataType>String</dataType>
        <expression>IF(ISBLANK({{!$Record.Project_Lead__c}}), {{!IanUserId}}, {{!$Record.Project_Lead__c}})</expression>
    </formulas>
    <formulas>
        <name>fIsDriveOrMixed</name>
        <dataType>Boolean</dataType>
        <expression>OR(TEXT({{!$Record.Method_of_Mobilization__c}}) = "Drive", TEXT({{!$Record.Method_of_Mobilization__c}}) = "Mixed")</expression>
    </formulas>
    <formulas>
        <name>fIsFlyOrMixed</name>
        <dataType>Boolean</dataType>
        <expression>OR(TEXT({{!$Record.Method_of_Mobilization__c}}) = "Fly", TEXT({{!$Record.Method_of_Mobilization__c}}) = "Mixed")</expression>
    </formulas>
    <formulas>
        <name>fIsNewHires</name>
        <dataType>Boolean</dataType>
        <expression>{{!$Record.Requires_New_Hires__c}}</expression>
    </formulas>
{formula_xml}
    <start>
        <locationX>50</locationX>
        <locationY>0</locationY>
        <object>Project__c</object>
        <recordTriggerType>Create</recordTriggerType>
        <triggerType>RecordAfterSave</triggerType>
        <filterLogic>and</filterLogic>
        <filters>
            <field>Stage__c</field>
            <operator>EqualTo</operator>
            <value><stringValue>Pre-Mob</stringValue></value>
        </filters>
        <connector>
            <targetReference>Set_Base_Date_And_Lead</targetReference>
        </connector>
    </start>

    <assignments>
        <name>Set_Base_Date_And_Lead</name>
        <label>Set Base Date and Project Lead</label>
        <locationX>176</locationX>
        <locationY>120</locationY>
        <assignmentItems>
            <assignToReference>BaseDate</assignToReference>
            <operator>Assign</operator>
            <value><elementReference>fEffectiveBaseDate</elementReference></value>
        </assignmentItems>
        <assignmentItems>
            <assignToReference>ProjectLeadOwnerId</assignToReference>
            <operator>Assign</operator>
            <value><elementReference>fEffectiveProjectLead</elementReference></value>
        </assignmentItems>
        <connector>
            <targetReference>{first_entry}</targetReference>
        </connector>
    </assignments>

{blocks_xml}

    <recordCreates>
        <name>Create_All_Tasks</name>
        <label>Create All Pre-Mob Tasks</label>
        <locationX>176</locationX>
        <locationY>9000</locationY>
        <inputReference>TasksToCreate</inputReference>
    </recordCreates>

</Flow>
'''


if __name__ == "__main__":
    import os
    out_path = os.path.join(
        os.path.dirname(__file__), "..",
        "force-app/main/default/flows/Generate_PreMob_Tasks.flow-meta.xml"
    )
    out_path = os.path.normpath(out_path)
    xml = make_flow_xml()
    with open(out_path, "w") as f:
        f.write(xml)
    print(f"Wrote {out_path} ({len(xml.splitlines())} lines, {len(TASKS)} tasks)")
