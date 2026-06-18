# Reorder Draft Copy Section on Contact Layout

The 13 draft-copy field **labels** are updated in this repo and will ship
to `hts-prod` on the next `./deploy.sh` run. API names are untouched, so
the Gumloop agents (Dylan Copy, Ian Copy, Lookahead Writer) keep working.

The **page layout reorder** can't be deployed from the field-metadata
files alone (page layouts were configured directly in the org and were
never retrieved into source). Instead of dragging fields in Setup, run
the one-shot script — it retrieves whichever Contact layouts exist,
reorders **only** the Draft Copy section in each, and redeploys. Every
other section, button, related list, and field is left untouched.

## Run it

```bash
sf org login web --alias hts-prod   # only if not already authed
python3 scripts/reorder_draft_copy_layout.py
```

That's it. The script prints which layouts it touched. Open a Contact
(e.g. Marco Pineda) to confirm the Draft Copy section reads top to
bottom: T1, T2, T3, T4 Primary, T4 Secondary, T6, T7, T8 Primary, T8
Secondary, T10, T12 Primary, T12 Secondary, T13. Gaps at T5, T9, T11
are intentional — those touches are phone calls.

## If something looks off

- Wrong order on a Contact — that Contact's profile is probably assigned
  a layout the script didn't see in `sf org list metadata`. Re-run with
  `ORG_ALIAS=...` if needed, or check Setup → Object Manager → Contact
  → Page Layouts → Page Layout Assignment for which layout that profile
  uses.
- Roll back — the script makes no destructive deletes, only field
  reorders within one section. To revert, drag fields back in Setup, or
  re-run the script with a different `DESIRED_ORDER` constant.
