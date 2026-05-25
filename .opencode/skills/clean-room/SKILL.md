---
name: "clean-room"
description: "Port a feature from an external git repo into the current project. Clones the repo to a temp folder, drafts a proposal from analysis, then brainstorms and refines the proposal to match the user's choices."
---

You are planning a clean-room port: lifting a feature from an external git repo into the user's current project. This command runs a draft-first flow — a dedicated subagent analyzes the temp clone AND drafts the complete OpenSpec change upfront, then you handle the brainstorm yourself (under explore-skill stance) by reading the draft and the user's project directly, refining the artifacts in place.

BEFORE PROCEEDING: You MUST use the Skill tool to invoke "explore" unless the caller context explicitly says shared explore mode has already been loaded. Load it once, after Phase 2 completes, so the brainstorm in Phase 3 uses the shared explore behavior (stance, verification, workflow, OpenSpec awareness, guardrails). Do NOT delegate the brainstorm to the Explore subagent — you handle it inline. The explore **skill** provides the stance; the Explore **subagent** is not used in this command.

---

## Scope Discipline

- The temp clone is **read-only**. Never edit, commit, or delete inside it.
- The user's project is the only write target. Inside it, edits stay within the OpenSpec change directory created in Phase 2 until the user approves implementation.
- Do not auto-remove the temp clone. Print the path and a manual `rm -rf` one-liner at the end. The user decides when to delete.
- If you spot license incompatibility (GPL/AGPL into permissive project, or unclear license), surface it as a blocker before drafting — do not proceed silently.

---

## Phase 1 — Clone to temp

Parse the user request for:
- A git URL (https or ssh), OR a local path to an already-cloned repo
- A feature hint: a path, file, PR/issue number, commit SHA, or natural-language description

If a local path was given, skip the clone and treat that path as the source. Otherwise:

```
mkdir -p /tmp/clean-room
git clone --depth=50 <url> /tmp/clean-room/<repo-slug>-<timestamp>
```

Deepen the clone (`git fetch --unshallow` or fetch a specific ref) only if the feature hint points at history older than the shallow window.

Record:
- Absolute temp-clone path
- License (read `LICENSE`, package manifest) — for **your** go/no-go decision only; do not pass origin identifiers (URL, SHA, fork name) into Phase 2 or any artifact

Confirm license compatibility against the user's project license now. Mismatches are a blocker — raise them before Phase 2. The license string itself stays out of the eventual artifacts; only your decision propagates ("proceed" / "abort").

---

## Phase 2 — Analyze and draft proposal

Delegate to the `osf-clean-room` subagent (Agent tool, `subagent_type: "osf-clean-room"`). Subagents have no conversation history, so the brief must be fully self-contained. The brief is deliberately minimal to keep origin identifiers out of artifacts:

- `temp-path` — absolute path from Phase 1
- `feature-hint` — the user's verbatim description
- `user-project-root` — absolute path to the user's current project
- `license-note` — license string + your compatibility decision (the subagent uses this for its own go/no-go gate; it does NOT write it into artifacts)

Do NOT pass a source repo URL, commit SHA, fork name, or any other origin identifier in the brief — the subagent must not embed those in its output.

The subagent produces:
1. A complete OpenSpec change in the user's project (proposal, design, tasks, specs, …) written as a source-free behavioral specification
2. A short report naming the change directory, behavioral-surface count, test-scenario count, and open questions

This is a **draft**. Do not treat it as final. Its job is to give the brainstorm a concrete starting point so the user reviews real text instead of imagining the port from scratch.

---

## Phase 3 — Brainstorm from the draft and refine

You handle this phase inline under the explore-skill stance loaded at the top of this command. **Do not** delegate to the Explore subagent — the draft already encodes the behavior, so your job is to read it, understand the user's project, and refine in place while the explore skill governs how you brainstorm.

Step-by-step:

1. **Read the draft artifacts directly.** Read every file in `openspec/changes/<name>/` — proposal, design, tasks, and any spec files the subagent produced. Get the full picture before saying anything.

2. **Understand the user's project.** Use the `codebase-retrieval` MCP tool (`mcp__auggie__codebase-retrieval`) with `directory_path` set to the workspace root. Ask it focused questions derived from the draft:
   - Where does a feature with this behavioral shape naturally fit in the current architecture?
   - What existing modules or patterns already cover part of the draft's scope?
   - What conventions (naming, error handling, dependency injection, testing) should the implementation follow?
   - Are there active changes or recent work that overlap with the draft's surfaces?
   Pull `openspec list --json` for in-flight changes that could conflict.

3. **Brainstorm with the user.** Present the draft in your own words — capability, behavioral surfaces, test scenarios captured, open questions — alongside what you learned about their project. Lead with the gaps and decisions, not a recap. Walk through these clean-room concerns and lock each one:

   1. **License posture** — Confirm the Phase 1 decision still holds. Compatible (clean-room work allowed), needs generic attribution, or blocking? Origin identifiers and license text stay out of artifacts regardless.
   2. **Adaptation strategy** — Match this project's idioms (recommended for clean-room safety) or stay close to a generic reference shape? Tradeoff: maintenance fit vs spec stability.
   3. **Dependency delta** — Which new packages land? Any already present at a different version? Heavy/unwanted transitive deps?
   4. **Naming reconciliation** — Confirm or override the draft's renamed identifiers. Any name still too close to a distinctive original? Any that clashes with existing project naming?
   5. **Test coverage parity** — Confirm every documented test scenario will be realized in the port. If any are dropped, record an explicit waiver inline.
   6. **Conflict surface** — Files the implementation touches. Any in-flight work in those areas?
   7. **Scope boundary** — What's in this change vs deferred. Lock the cut.
   8. **Placement** — Which modules/layers in the user's project host each behavioral surface, described as roles or paths the user confirms.

   Use ASCII diagrams when they help (data flow, placement, dependency graph). Ask clarifying questions when the codebase-retrieval results or the user's preference would change the draft.

4. **Refine the artifacts in place.** For every decision locked above, edit the corresponding section of the draft (proposal / design / tasks / specs) so the artifacts reflect the user's choice. Use Edit for targeted changes. When the user picks B over A, the draft text for A is replaced — not annotated.

   Hard rules while refining:
   - Do not reintroduce origin references (repo URL, SHA, source file paths, distinctive identifier names lifted from the source, copied test names).
   - Do not reduce the test inventory's behavioral assertion count without recording an explicit waiver in the proposal.
   - Keep the proposal source-free; the firewall established in Phase 2 must hold.

5. **Finalize.** When all open questions are resolved and the artifacts match the locked choices, remove the "Draft — pending brainstorm review" marker from the proposal. Re-run `openspec status --change "<name>"` and confirm every artifact is `done`.

---

## Cleanup

At the end, print:

```
Temp clone: /tmp/clean-room/<repo-slug>-<timestamp>
Remove when done: rm -rf /tmp/clean-room/<repo-slug>-<timestamp>
```

Do not run the removal yourself.

---

The following is the user's request: