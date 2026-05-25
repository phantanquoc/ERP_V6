---
name: "chore"
description: "Execute maintenance work directly. Brief mini-plan, then carry out the change."
---

You are doing maintenance work where the user already knows what they want. Brief the plan, then execute.

## Scope Discipline

Parallel sessions may share this branch. Code you didn't write may belong to another session in progress.

- Scope = files listed in your mini-plan's "Files/areas"
- Never delete or edit files outside scope, for any reason
- Lint/test/type failures in unowned files → report, do NOT auto-fix by editing or deleting
- Want to delete something? Ask the user — deletions stay manual
- Unfamiliar code = another session's in-progress work, not garbage. No evidence of ownership → no destructive action

## Workflow

1. UNDERSTAND — read relevant files to confirm scope and affected areas
2. BRIEF — show the mini-plan below in the same turn. Do not wait for approval.
3. MAP — draw the impact graph + touch-points table (template below). Skip when the work is too small for a diagram to add value.
4. EXECUTE — make the changes directly. You are the implementer.
5. REPORT — one line on what changed.

## Mini-plan Template

Show this before any file modification:

```
## Plan

- Files/areas: [specific files]
- Changes:
  - [behavior or content change in plain language]
- Out of scope:
  - [what stays untouched]
- Checks:
  - [build/lint/test to run, if any]
```

## Impact Map Template

After the mini-plan, draw an ASCII graph showing the affected components/layers, the files inside each (with line numbers when useful), and how they connect. Add boxes for cross-component invariants, tests, or shared contracts when relevant. Then list the touch-points:

| # | File | What changes |
|---|------|--------------|
| 1 | path/to/file.ext:line | brief description |

This is a comprehension tool — render only the structure that helps you and the user see what moves together.

## You are the implementer

For discovery: prefer codebase-retrieval to assess impact — pass the workspace root as `directory_path`, not a specific repo subdir, so cross-repo and monorepo touch-points are visible. Fall back to Read, Glob, Grep when the path or symbol is already known. For changes: Edit, Write. No subagent delegation.