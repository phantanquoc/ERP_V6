---
name: spx-apply
description: Implement tasks from an OpenSpec change or directly from conversation plan. Use when the user wants to start implementing, continue implementation, or work through tasks.
---

You are using the spx-apply skill, which is described as follows:

Implement tasks — from an OpenSpec change or directly from conversation plan.

> **CLI NOTE**: Run all `openspec` and `bash` commands directly from the workspace root. Do NOT `cd` into any directory before running them. The `openspec` CLI is designed to work from the project root.

> **SETUP**: If `openspec` is not installed, run `npm i -g @fission-ai/openspec@latest`. If you need to run `openspec init`, always use `openspec init --tools none`.

**⚠️ MODE: IMPLEMENTATION** — This command puts you in implementation mode. You write code, complete tasks, and modify files. This is the OPPOSITE of explore mode (`/spx-plan`). When this command ends (completion or pause), you remain in implementation context until the user explicitly switches mode.

**🚫 SUBAGENT BLACKLIST:** NEVER use the `explore` or `plan` subagents. These are generic subagents from other kits and are NOT part of this workflow. Only use subagents explicitly listed in this kit (e.g., `spx-uiux-designer`). Do your own implementation work directly.

**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If no openspec change exists but conversation has a plan from `/spx-plan`, use Direct Plan Mode.

**Steps**

1. **Detect mode**

   Determine which mode to use:

   **Mode A (OpenSpec Change)** — when any of these are true:
   - A change name is provided
   - Conversation context mentions a specific change
   - `openspec list --json` shows active changes

   **Mode B (Direct Plan)** — when ALL of these are true:
   - No change name provided and no active openspec changes exist (or user explicitly skips openspec)
   - Conversation has plan context from `/spx-plan` (discussed requirements, decisions, approach)

   **Complexity check for Mode B**: If the plan is complex (>10 tasks, multi-component architecture, needs design documentation, cross-cutting concerns), suggest: "This plan is substantial — want me to create a structured change with `/spx-ff` for better tracking, or implement directly?" Let user decide.

   If neither mode applies (no change, no plan context) → ask user what to implement.

   **If Mode A** → announce "Using change: <name>" and proceed to step 2.
   **If Mode B** → announce "Implementing from conversation plan" and jump to **Direct Plan Mode** below.

2. **Check status to understand the schema**
   ```bash
   openspec status --change "<name>" --json
   ```
   Parse the JSON to understand:
   - `schemaName`: The workflow being used (e.g., "spec-driven")
   - Which artifact contains the tasks (typically "tasks" for spec-driven, check status for others)

3. **Get apply instructions**

   ```bash
   openspec instructions apply --change "<name>" --json
   ```

   This returns:
   - Context file paths (varies by schema - could be proposal/specs/design/tasks or spec/tests/implementation/docs)
   - Progress (total, complete, remaining)
   - Task list with status
   - Dynamic instruction based on current state

   **Handle states:**
   - If `state: "blocked"` (missing artifacts): show message, suggest using openspec-continue-change
   - If `state: "all_done"`: congratulate, suggest archive
   - Otherwise: proceed to implementation

4. **Read context files**

   Read the files listed in `contextFiles` from the apply instructions output.
   The files depend on the schema being used:
   - **spec-driven**: proposal, specs, design, tasks
   - Other schemas: follow the contextFiles from CLI output

5. **Show current progress**

   Display:
   - Schema being used
   - Progress: "N/M tasks complete"
   - Remaining tasks overview
   - Dynamic instruction from CLI

6. **Implement tasks (loop until done or blocked)**

   For each pending task:
   - Show which task is being worked on
   - **Explore the relevant codebase area yourself** — don't rely solely on plan artifacts. Read the actual files you'll modify, trace how they connect, understand the current state.
   - **Look up API docs when unsure** — if a task involves a library/function you're not certain about (exact params, return type, version behavior), brief the user then delegate to `spx-doc-lookup` with the specific target before writing code. Brief format: what you're looking up and why, what you expect to learn, what you'll do with the answer.
   - Make the code changes required
   - Keep changes minimal and focused
   - **Mark task complete IMMEDIATELY** in the tasks file: `- [ ]` → `- [x]` — do NOT batch updates, do NOT wait until multiple tasks are done. Each task gets marked the moment it's finished.
   - Continue to next task

   **Milestone verification gate:**

   When you finish the last subtask of a major task group (e.g., all 1.x tasks done, about to start 2.x), STOP and run verification before proceeding:

   1. If `openspec/changes/<name>/verify-fixes.md` exists, read it.
   2. Determine which verifiers to spawn based on what this task group actually touched:
      - `spx-verifier` (always) — lightweight completeness check. Include `← (verify: ...)` annotations from completed tasks.
      - `spx-arch-verifier` — ONLY if this task group introduced new files, new patterns, or dependency changes. Skip for routine implementation within existing patterns.
      - `spx-uiux-verifier` — ONLY if this task group modified UI files (check actual files modified, not artifact keywords).
      - `spx-test-verifier` — ONLY if this task group modified testable code AND project has test framework.
      - If verify-fixes.md exists, add to EACH verifier instruction: `**Previously fixed issues (from verify-fixes.md):**` followed by the file content
   3. Run selected verifiers using **PVP** (parallel, fix-as-you-go).
   4. Fix CRITICAL issues from each verifier as its result arrives. Warnings/suggestions: fix if quick, otherwise note and move on.
   5. When all verifiers done and zero CRITICALs remain → proceed to next task group.

   This prevents errors from compounding across task groups. A bug in group 1 that goes undetected can cascade into group 2, 3, etc.

   **Pause if:**
   - Task is unclear → ask for clarification
   - Implementation reveals a design issue → suggest updating artifacts
   - Error or blocker encountered → report and wait for guidance
   - User interrupts

7. **On completion or pause, show status**

   Display:
   - Tasks completed this session
   - Overall progress: "N/M tasks complete"
   - If paused: explain why and wait for guidance
   - If all done OR only manual/testing tasks remain: **proceed to auto-verify** (step 8)

8. **Auto-Verify on Completion**

   When all tasks are complete OR only manual/testing tasks remain, **automatically run verification**:

   ```
   ## All Tasks Complete — Running Verification...
   ```

   Detect change characteristics and determine which verifiers to spawn based on actual files modified during implementation:
   - **Has UI files**: check if modified files include UI components (by file extension/content — `.tsx`, `.vue`, `.svelte`, component directories, style files), not just artifact keywords
   - **Has architectural changes**: new files/modules created, dependency changes, new patterns introduced, structural refactors
   - **Has testable code**: project has test framework AND modified code has corresponding test files or should have tests

   Run selected verifiers using **PVP**:

   - `spx-verifier` (always) — full artifact completeness check. Include verify focus points from task annotations.
   - `spx-arch-verifier` — ONLY if change introduced new patterns, dependencies, structural changes, or 3+ new files. Skip for routine implementation within existing patterns.
   - `spx-uiux-verifier` — ONLY if modified files include UI components (by actual file content, not artifact keywords alone).
   - `spx-test-verifier` — ONLY if project has test framework AND change touched testable code.

   If `openspec/changes/<name>/verify-fixes.md` exists, read it.

   Instruction template for each verifier:
   ```
   Verify implementation for change: <name>

   **Artifacts:**
   - Tasks: openspec/changes/<name>/tasks.md
   - Proposal: openspec/changes/<name>/proposal.md
   - Design: openspec/changes/<name>/design.md (if exists)
   - Specs: openspec/changes/<name>/specs/*.md (if exist)

   **Implementation context:**
   - [tasks completed this session]
   - [files modified]

   **Previously fixed issues (from verify-fixes.md):**
   [content of verify-fixes.md, or "None" if file doesn't exist]
   ```

   Add verifier-specific context to each instruction (verify focus points for spx-verifier, UI files for spx-uiux-verifier, etc.).

   Process results per PVP — fix issues from each verifier as it returns, don't wait for all to finish.

9. **Auto-Fix Loop**

   After receiving verification report, fix issues on the FIRST pass — CRITICAL, WARNING, and SUGGESTION. Not just the easy ones.

   **Fix without asking** (these don't need user input):
   - CRITICAL: Incomplete tasks, missing implementations, broken functionality
   - WARNING: Spec/design divergences, missing scenario coverage, test failures
   - SUGGESTION: Pattern inconsistencies, code style deviations, minor improvements
   - Type errors, lint errors → fix the code
   - Incomplete tasks that are actually done → mark checkbox

   **Skip and collect** (genuinely need user decision):
   - Ambiguous requirements where multiple interpretations are valid
   - Design decisions that need revisiting
   - Scope questions (feature boundary unclear)

   **Write verify fix log** — After fixing issues, append to `openspec/changes/<name>/verify-fixes.md`. This log prevents future re-verification from re-flagging issues that were already fixed.

   Format:
   ```markdown
   ## [YYYY-MM-DD] Round N (from spx-apply auto-verify)

   ### spx-verifier
   - Fixed: <semantic description of what was fixed and where>

   ### spx-arch-verifier
   - Fixed: <semantic description of what was fixed and where>

   ### spx-uiux-verifier
   - Fixed: <semantic description of what was fixed and where>

   ### spx-test-verifier
   - Fixed: <semantic description of what was fixed and where>
   ```

   Only include sections for verifiers that reported issues you fixed. Only log fixes that originated from verify results — do NOT log fixes from first-time implementation or user-requested changes.

   After writing the log, **re-verify** — run applicable verifiers again using **PVP** on the entire change (all artifacts, all files), not just the parts you fixed. A fix in one area can break another. Include the updated verify-fixes.md in each verifier instruction.

   ```
   ## Auto-Fixing Issues... (round 1)

   ✓ Fixed: [CRITICAL] Missing implementation for requirement X
   ✓ Fixed: [WARNING] Spec divergence in auth.ts:45
   ✓ Fixed: [SUGGESTION] Pattern inconsistency in utils.ts
   ⏸ Skipped: Ambiguous requirement (needs your input)
   📝 Logged fixes to verify-fixes.md

   Re-verifying...
   ```

   **Loop exit conditions:**
   - **Exit when 0 CRITICALs** — remaining warnings/suggestions are reported to user but do NOT trigger another re-verify round.
   - **Max 2 re-verify rounds** — if CRITICALs persist after 2 rounds of fixing, STOP. Report the persistent issues and let the user decide. Do not loop indefinitely.
   - **Exit if only user-decision items remain** (the ⏸ skipped ones).

   Each round uses PVP (selected applicable verifiers in parallel, fix as results arrive, all artifacts, all context, all previously fixed issues).

10. **Refinement Stance (when user asks to fix or improve code you already wrote)**

    When the user comes back with "this doesn't work", "fix this", "refine this", or points out issues with code you implemented:

    **Re-explore before patching** — Do NOT immediately edit the code you wrote. First:
    - Re-read the relevant codebase areas (not just your previous changes)
    - Understand the actual behavior vs expected behavior
    - Trace the execution flow to find the real cause

    **Diagnose root cause, not symptoms** — Ask yourself:
    - Is the issue in MY code, or in how my code interacts with existing code?
    - Is the approach fundamentally wrong, or is it a small mistake?
    - If I patch this spot, will the same class of issue appear elsewhere?

    **Rewrite over patch** — If the root cause is a wrong approach:
    - Do NOT add workarounds or band-aids on top of existing code
    - Rewrite the affected section from scratch with the correct approach
    - It's cheaper to rewrite 50 lines correctly than to patch 5 lines that create 3 more bugs

    **Break the safety loop** — You have permission to:
    - Delete code you wrote in this session and start over
    - Change the approach entirely if evidence shows it's wrong
    - Disagree with the original plan if implementation reveals it was flawed
    - Suggest updating artifacts (design.md, tasks.md) to reflect the better approach

11. **Final Output**

    **If all clear:**
    ```
    ## ✅ Implementation Complete & Verified

    **Change:** <change-name>
    **Progress:** 7/7 tasks complete ✓
    **Verification:** All checks passed ✓

    Ready to archive → `/spx-archive <name>`
    ```

    **If manual issues remain:**
    ```
    ## ⚠️ Implementation Complete (Manual Issues Remain)

    **Change:** <change-name>
    **Progress:** 7/7 tasks complete ✓
    **Auto-fixed:** [N] issues
    **Remaining:** [M] manual issues

    ### Issues Needing Your Decision:
    1. [issue] — [options]
    2. [issue] — [options]

    After resolving, run `/spx-verify` again or proceed to archive.
    ```

**Output During Implementation**

```
## Implementing: <change-name> (schema: <schema-name>)

Working on task 3/7: <task description>
[...implementation happening...]
✓ Task complete

Working on task 4/7: <task description>
[...implementation happening...]
✓ Task complete
```

**Output On Pause (Issue Encountered)**

```
## Implementation Paused

**Change:** <change-name>
**Schema:** <schema-name>
**Progress:** 4/7 tasks complete

### Issue Encountered
<description of the issue>

**Options:**
1. <option 1>
2. <option 2>
3. Other approach

What would you like to do?
```

---

**Direct Plan Mode (Mode B)**

When implementing directly from conversation plan without an openspec change:

1. **Extract tasks from conversation context**

   Review the plan discussed in `/spx-plan`. Identify concrete implementation tasks from the decisions, requirements, and approach discussed. Use the agent's built-in task tracking tool to create and manage the task list — do NOT create task files.

2. **Show plan summary and tasks**

   ```
   ## Implementing from conversation plan

   **What**: [1-2 sentence summary]
   **Approach**: [key decisions from plan]

   **Tasks:**
   1. [task 1]
   2. [task 2]
   ...

   Starting implementation...
   ```

3. **Implement tasks**

   For each task:
   - Show which task is being worked on
   - Explore the relevant codebase area
   - Look up API docs via `spx-doc-lookup` when unsure
   - Make the code changes
   - Keep changes minimal and focused
   - Mark task complete in the task tracking tool immediately
   - Continue to next task

   **Pause if** same rules as Mode A — unclear task, design issue, error, or user interrupts.

4. **Auto-verify on completion**

   When all tasks are done, run verification using PVP. Since there are no artifact files, pass plan context via verifier instructions:

   ```
   Verify implementation for direct plan:

   **Plan summary:**
   [summary of what was discussed and decided in spx-plan]

   **Requirements:**
   [key requirements from conversation]

   **Implementation context:**
   - [tasks completed]
   - [files modified]

   **Previously fixed issues:** None
   ```

   Run `spx-arch-verifier` (always). Run `spx-uiux-verifier` (if UI). Run `spx-test-verifier` (if tests). Skip `spx-verifier` artifact checks (no artifacts to verify against) — but include it if plan had specific requirements that can be checked against code.

5. **Auto-fix and output**

   Same auto-fix loop as Mode A (step 9), but without verify-fixes.md (no change directory). Fix all issues on first pass, re-verify until zero crits or max 2 rounds.

   ```
   ## ✅ Implementation Complete & Verified

   **Plan:** [summary]
   **Progress:** N/N tasks complete ✓
   **Verification:** All checks passed ✓

   To formalize this as an openspec change → `/spx-ff`
   ```

---

**Parallel Verification Protocol (PVP)**

**Subagent Briefing Protocol (mandatory before every spawn):**

Before launching ANY subagent, output a brief to the user in the user's language:

```
📋 **[subagent-name]**
- Why: [why this subagent is needed — 1 line]
- Expect: [what you expect to receive back]
- Handle output:
  - If CRITICAL issues → [specific action]
  - If only WARNING/SUGGESTION → [specific action]
  - If clean → [specific action]
```

The template above is in English for prompt readability. When outputting the actual brief, use the same language the user has been using in conversation.

When spawning multiple verifiers in parallel, brief ALL of them in a single block before launching. This gives the user full visibility into what's about to happen and why.

**No background mode — ever.** NEVER use `run_in_background` for any subagent. All subagents must run in parallel foreground so their execution is visible and controllable by the user. Background execution is uncontrollable behavior.

When running multiple verifiers, launch them in parallel (foreground) with streaming fixes to maximize throughput:

1. **Select applicable verifiers** — do NOT blindly spawn all four. Decide based on what was actually modified:
   - `spx-verifier`: always (artifact completeness)
   - `spx-arch-verifier`: only if new files/patterns/dependencies/structural changes
   - `spx-uiux-verifier`: only if UI files were modified (check actual files, not just artifact keywords)
   - `spx-test-verifier`: only if project has tests AND testable code was touched
2. Launch selected verifiers **in parallel (foreground, blocking)** — each as a separate parallel subagent.
3. **Fix-as-you-go** — as each verifier result arrives:
   - Read its report immediately
   - Fix CRITICAL issues right away. Fix warnings/suggestions if quick.
   - Do NOT wait for other verifiers to finish before fixing
4. When ALL verifiers have returned AND zero CRITICALs remain → proceed to next step

This pattern applies everywhere verifiers run: milestone gates, auto-verify, and re-verify loops. The benefit is significant — instead of idling while the slowest verifier finishes, you're already fixing issues from faster ones.

**Guardrails**
- Keep going through tasks until done or blocked
- Always read context files before starting (from the apply instructions output)
- If task is ambiguous, pause and ask before implementing
- If implementation reveals issues, pause and suggest artifact updates
- Keep code changes minimal and scoped to each task — but when refining, prefer rewriting over patching if the root cause demands it
- **Real-time task tracking** — Mark each task `[x]` the MOMENT it's done. Never batch checkbox updates.
- **Milestone verify gate** — Before starting a new major task group (e.g., moving from 1.x to 2.x tasks), MUST run verification. Spawn verifiers selectively: spx-verifier always, others only if the task group touched relevant areas (architecture, UI files, testable code).
- Pause on errors, blockers, or unclear requirements - don't guess
- Use contextFiles from CLI output, don't assume specific file names
- **Auto-verify on completion** — MUST run verification when all AI-doable tasks complete (even if manual/testing tasks remain). Spawn verifiers selectively based on actual files modified: spx-verifier always, spx-arch-verifier only for structural changes, spx-uiux-verifier only if UI files modified, spx-test-verifier only if testable code touched.
- **Auto-fix on first pass** — fix CRITICALs, WARNINGs, and SUGGESTIONs as each verifier result arrives. Only skip items that genuinely need user decision.
- **Re-verify loop** — after fixing, re-verify the ENTIRE implementation using PVP (not just fixed parts). Loop exits when 0 CRITICALs. Remaining warnings/suggestions are reported but don't trigger more rounds. Max 2 re-verify rounds — if crits persist, report and stop.
- **Verify fix log** — after fixing issues from verify results, MUST append to `verify-fixes.md` in the change directory. Group by verifier, use semantic descriptions. This prevents re-verify from re-flagging already-fixed issues. Always pass verify-fixes.md content to verifiers.
- **Direct Plan Mode** — when no openspec change exists but conversation has plan context, implement directly using Mode B. Track tasks with the agent's built-in task tracking tool, not files. Suggest `/spx-ff` if plan complexity is high (>10 tasks, multi-component, needs design doc).

**Fluid Workflow Integration**

This skill supports the "actions on a change" model:

- **Can be invoked anytime**: Before all artifacts are done (if tasks exist), after partial implementation, interleaved with other actions
- **Allows artifact updates**: If implementation reveals design issues, suggest updating artifacts - not phase-locked, work fluidly
- **Auto-verify on completion**: When all tasks done, automatically verify and fix issues

**Subagent Reference**

| Subagent | Purpose |
|----------|---------|
| `spx-verifier` | Independent verification of implementation (clean context) |
| `spx-arch-verifier` | Architecture, design patterns, library replacement |
| `spx-uiux-verifier` | UI/UX quality verification (when change has UI) |
| `spx-test-verifier` | Test coverage and quality verification (when project has tests) |
| `spx-doc-lookup` | Look up API/function docs — exact signatures, params, version-specific behavior |

**Mode Transition Hints**

After implementation completes (with verification) or pauses:

- To think/explore/brainstorm → `/spx-plan`
- To create a new change → `/spx-ff`
- To re-verify manually → `/spx-verify`
- To archive completed work → `/spx-archive`

**IMPORTANT**: After this command ends, do NOT automatically continue writing code on subsequent user messages unless the user explicitly asks to continue implementation or invokes `/spx-apply` again. If the user invokes `/spx-plan`, you MUST fully switch to explore mode — no code writing. If the user invokes `/spx-ff`, you MUST fully switch to change creation mode — no code writing, no continuing tasks.

The following is the user's request: