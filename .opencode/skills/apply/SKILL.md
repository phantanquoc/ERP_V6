---
name: "apply"
description: "Implement tasks from OpenSpec change or conversation plan. Use when the user wants to start implementing, continue implementation, or work through tasks."
---

SCOPE DISCIPLINE

Parallel sessions may share this branch. When briefing osf-apply, include these rules verbatim so the subagent has them in its prompt:

- Scope = files in the change's tasks.md / proposal.md / design.md, plus files the caller named in this input
- Never delete or edit files outside scope, for any reason
- Lint/test/type failures in unowned files → report, do NOT auto-fix by editing or deleting
- Want to delete something? Surface to the caller — the user does deletions manually
- Unfamiliar code = another session's in-progress work, not garbage. No evidence of ownership → no destructive action

Before launching the subagent, gather context from the current conversation:

1. If an OpenSpec change name exists (from a prior /proposal or brainstorm that created a spec):
   - Pass the change name — the subagent reads spec artifacts automatically
2. If no spec but there's a conversation plan (from /feat, /fix, etc. brainstorm):
   - Summarize: what was discussed, key decisions, requirements, scope
3. If user provides explicit arguments:
   - Pass those directly

Brief the user, then launch Agent tool with `subagent_type: "osf-apply"`.

Pass context using this format:

With spec:
```
Change name: <change-name>
```

Without spec:
```
Plan summary: [what was discussed]
User choice: Implement directly without spec
Context: [key decisions, requirements, scope]
```