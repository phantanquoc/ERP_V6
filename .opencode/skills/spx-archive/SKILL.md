---
name: spx-archive
description: Archive a completed change in the experimental workflow. Use when the user wants to finalize and archive a change after implementation is complete.
---

---
model: claude-sonnet-4-5
---

You are using the spx-archive skill, which is described as follows:

Archive a completed change in the experimental workflow.

> **CLI NOTE**: Run all `openspec` and `bash` commands directly from the workspace root. Do NOT `cd` into any directory before running them. The `openspec` CLI is designed to work from the project root.

> **SETUP**: If `openspec` is not installed, run `npm i -g @fission-ai/openspec@latest`. If you need to run `openspec init`, always use `openspec init --tools none`.

**🚫 SUBAGENT BLACKLIST:** NEVER use the `explore` or `plan` subagents. These are generic subagents from other kits and are NOT part of this workflow. Only use subagents explicitly listed in this kit (e.g., `spx-uiux-designer`). Do your own archive work directly.

**Input**: Optionally specify a change name. If omitted, infer from conversation context or auto-select.

**Steps**

1. **Resolve the target change (smart detection)**

   Resolve which change to archive using this priority order — do NOT prompt unless truly ambiguous:

   1. **Explicit name provided** → use it directly
   2. **Conversation context** → if the user recently ran `/spx-apply <name>` or `/spx-verify <name>` or otherwise worked on a specific change in this conversation, auto-select it and display: `Auto-selected "<name>" (from conversation context)`
   3. **Single active change** → run `openspec list --json`, if only 1 active (non-archived) change exists, auto-select it and display: `Auto-selected "<name>" (only active change)`
   4. **Ambiguous** → multiple active changes and no clear context. Only then use **AskUserQuestion tool** to let the user select. Show only active changes with their schema.

2. **Check artifact and task completion status (non-blocking)**

   Run `openspec status --change "<name>" --json` to check artifact completion.
   Read the tasks file (typically `tasks.md`) to check for incomplete tasks.

   Collect warnings but **do NOT prompt for confirmation** — proceed automatically:

   - **Incomplete artifacts**: Note which artifacts are not `done` → include in final summary as warning
   - **Incomplete tasks**: Count `- [ ]` vs `- [x]` → include in final summary as warning
   - **No tasks file**: Proceed without task-related warning

3. **Check verify fix log for spec impact**

   If `openspec/changes/<name>/verify-fixes.md` exists, read it. Check if any logged fix changed behavior described in spec artifacts (proposal, design, specs). If yes, update the affected spec sections to match the actual implementation before syncing. Only update sections directly affected by the fixes — do not rewrite unrelated content.

4. **Auto-sync delta specs**

   Check for delta specs at `openspec/changes/<name>/specs/`.

   - **No delta specs exist** → skip sync, proceed to archive
   - **Delta specs exist but already synced** (main specs already reflect all changes) → skip sync, proceed to archive
   - **Delta specs exist and need syncing** → display a brief summary of what will be synced, then **automatically sync** using the openspec-sync-specs skill (agent-driven). Do NOT prompt for sync/skip choice.

5. **Perform the archive**

   Create the archive directory if it doesn't exist:
   ```bash
   mkdir -p openspec/changes/archive
   ```

   Generate target name using current date: `YYYY-MM-DD-<change-name>`

   **Check if target already exists:**
   - If yes: Fail with error, suggest renaming existing archive or using different date
   - If no: Copy the directory to archive, then delete the source

   ⚠️ Do NOT use `mv` or `Move-Item` — they fail with "Permission Denied" on some systems.

   ```bash
   cp -r openspec/changes/<name> openspec/changes/archive/YYYY-MM-DD-<name>
   rm -rf openspec/changes/<name>
   ```

6. **Display consolidated summary**

   Show a single summary that includes everything — results and any warnings collected during the process:

**Output On Success**

```
## Archive Complete

**Change:** <change-name>
**Schema:** <schema-name>
**Archived to:** openspec/changes/archive/YYYY-MM-DD-<name>/
**Specs:** ✓ Synced to main specs (or "No delta specs" or "Already synced")

⚠️ 2 artifacts were incomplete: design, tasks
⚠️ 3/7 tasks were incomplete
(or "All artifacts complete. All tasks complete." if no warnings)

💡 **Suggested commit:**
`git commit -m "<type>: <what the change accomplished>"`
(type: feat, fix, refactor, chore, perf, docs)
```

**Guardrails**
- Auto-select change when inferable from conversation context or when only one active change exists
- Only prompt for change selection when truly ambiguous (multiple active changes, no context)
- Never prompt for confirmation on incomplete artifacts or tasks — show warnings in summary
- Never prompt for sync decision — always auto-sync when delta specs need syncing
- Use artifact graph (openspec status --json) for completion checking
- Preserve .openspec.yaml when moving to archive (it moves with the directory)
- Show clear consolidated summary with all warnings at the end
- Use openspec-sync-specs approach (agent-driven) for syncing

The following is the user's request: