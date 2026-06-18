# Manual Setup — Reorder Draft Copy Fields on Contact Page Layout

The 13 draft-copy field **labels** are updated in this repo and will be
applied to `hts-prod` on the next deploy (label-only change on
`force-app/main/default/objects/Contact/fields/*.field-meta.xml`).
API names are untouched, so the Gumloop agents (Dylan Copy, Ian Copy,
Lookahead Writer) are unaffected.

The **page layout reorder** is not in this repo (Contact page layouts
were configured directly in the org and never retrieved into source).
Do it once in Setup by hand, in the layout(s) actually assigned to the
B2B users (Dylan, Ian, Amanda, Travis).

## Steps

1. In Setup → Object Manager → **Contact** → **Page Layouts**, open the
   layout assigned to the B2B profiles. If multiple are assigned, repeat
   for each. (Confirm assignment under Page Layouts → Page Layout
   Assignment.)
2. Locate the **Draft Copy** section.
3. Drag the fields so they appear top to bottom in this order. API
   names are shown only for matching — display the **Label** column.

   | # | API Name | Label after deploy |
   |---|---|---|
   | 1 | `LinkedIn_Connection_Note__c` | T1 - LinkedIn Connection Request |
   | 2 | `Email_Draft_Intro__c`        | T2 - Intro Email |
   | 3 | `Email_Draft_Value1__c`       | T3 - Value-Add Email (Ian) |
   | 4 | `LinkedIn_Message_Draft_1__c` | T4 - LinkedIn Message (Primary) |
   | 5 | `Email_Draft_Sub4__c`         | T4 - Email (Secondary) |
   | 6 | `Email_Draft_FollowUp__c`     | T6 - Follow-Up Email |
   | 7 | `Email_Draft_Value2__c`       | T7 - Value-Add Email (Ian) |
   | 8 | `LinkedIn_Message_Draft_2__c` | T8 - LinkedIn Message (Primary) |
   | 9 | `Email_Draft_Sub8__c`         | T8 - Email (Secondary) |
   | 10 | `Email_Draft_DirectAsk__c`   | T10 - Direct Ask Email |
   | 11 | `LinkedIn_Message_Draft_3__c`| T12 - LinkedIn Message (Primary) |
   | 12 | `Email_Draft_Sub12__c`       | T12 - Email (Secondary) |
   | 13 | `Email_Draft_Pause__c`       | T13 - Pause Email |

4. **Save** the layout.

## Numbering gaps are intentional

Touches 5, 9, 11 are phone calls — no draft fields. Touches 4, 8, 12
each branch into Primary (LinkedIn, if connected) and Secondary (Email
fallback, if not connected), so they each have two rows.

## Verification

Open a Contact (e.g. Marco Pineda). The Draft Copy section should read
top-to-bottom: T1, T2, T3, T4 Primary, T4 Secondary, T6, T7, T8 Primary,
T8 Secondary, T10, T12 Primary, T12 Secondary, T13.

## Rollback baseline

If something goes wrong with the layout edit, the prior Draft Copy
section ordering can be restored from the org's setup audit trail
(Setup → Setup Audit Trail), or by re-dragging fields back to their
prior positions. The field labels can be reverted by `git revert`-ing
the commit that updated them, then redeploying.
