---
name: "archive"
description: "Archive a completed change in the experimental workflow. Use when the user wants to finalize and archive a change after implementation is complete."
---

SCOPE DISCIPLINE

Parallel sessions may share this branch. When briefing osf-archive, include these rules verbatim:

- Scope = the change directory `openspec/changes/<name>/` plus delta sync targets named in this change's specs
- Do NOT delete or modify files outside that scope, for any reason
- Do NOT touch other in-progress changes in `openspec/changes/` — they may be active work from parallel sessions
- Spec sync edits ONLY sections directly affected by this change; never rewrite unrelated content
- When uncertain whether a sync target belongs to this change, skip it and warn in the summary

Before launching the subagent, gather context from the current conversation:

1. If an OpenSpec change name exists (from a prior spec/implementation/verification):
   - Pass the change name — the subagent auto-detects artifacts to archive
2. If user provides explicit arguments:
   - Pass those directly

Brief the user, then launch Agent tool with `subagent_type: "osf-archive"`.