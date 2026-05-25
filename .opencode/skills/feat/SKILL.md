---
name: "feat"
description: "Plan and implement a new feature. Explore requirements, assess scope, then implement with optional spec creation."
---

You are planning a new feature. This command helps you explore the feature space, assess its size, and decide on the best implementation path.

BEFORE PROCEEDING: You MUST use the Skill tool to invoke "explore" unless the caller context explicitly says shared explore mode has already been loaded for this request. This loads the shared explore mode behavior (stance, verification, workflow, subagent protocols, OpenSpec awareness, guardrails) that this command depends on. Do not proceed until explore is loaded exactly once.

---

## What You Might Do

**Explore the problem space**
- Feynman Echo — restate the user's requirement in the simplest possible language (as if explaining to a non-technical person), then ask user to confirm or correct. Gaps reveal themselves when you struggle to simplify a part. When you get stuck simplifying, name the gap explicitly and offer concrete options to resolve it.
- Ask clarifying questions that emerge from what they said
- Challenge assumptions
- Reframe the problem
- Find analogies

**Investigate the codebase**
- Map existing architecture relevant to the discussion
- Find integration points
- Identify patterns already in use
- Surface hidden complexity

**Compare options**
- Brainstorm multiple approaches
- Build comparison tables
- Sketch tradeoffs
- Recommend a path (if asked)

**Visualize**
```
┌─────────────────────────────────────────┐
│     Use ASCII diagrams liberally        │
├─────────────────────────────────────────┤
│   System diagrams, state machines,      │
│   data flows, architecture sketches,    │
│   dependency graphs, comparison tables  │
└─────────────────────────────────────────┘
```

**Research external knowledge**
- When discussion involves technology choices, best practices, or security concerns → delegate to osf-researcher

**Look up API documentation**
- When discussion needs precise API usage → delegate to osf-researcher for web research

**Investigate a problem (bug, unexpected behavior)**
- Trace, don't theorize — read actual code, follow execution flow step by step
- Form hypotheses then verify in code
- 5 Whys — each answer becomes the next question until you hit the real cause

**Design UI/UX**
- When user needs UI for a new feature → delegate to osf-uiux-designer

**Surface risks and unknowns**
- Identify what could go wrong
- Find gaps in understanding
- Suggest spikes or investigations

---

## Stress-test Questions

Resolve these before ending discovery. Self-answer by exploring the codebase. Only surface items to the user that are genuinely ambiguous or require a personal/team style choice:

1. Error paths:
   "When [operation] fails:
    A. Redirect to error page
    B. Silent retry (max N times) then show error
    C. ★ Show inline error + retry button
    D. Khác/Other: ___"

2. Edge cases:
   "For [input/data], edge cases to handle:
    A. Empty/null — show empty state
    B. Too long — truncate at N chars
    C. Special characters — sanitize
    D. ★ All of the above
    E. Khác/Other: ___"

3. Component states (if UI):
   "Component [X] needs which states:
    A. Loading + Success (minimal)
    B. ★ Loading + Error + Empty + Success (complete)
    C. Khác/Other: ___"

4. Accessibility (if UI):
   "Accessibility requirements:
    A. Basic (contrast + focus states)
    B. ★ Full WCAG 2.1 AA (keyboard nav, screen reader, contrast)
    C. Khác/Other: ___"

5. Test strategy:
   "Test level needed:
    A. Unit tests for all public functions + edge cases
    B. Unit + integration tests
    C. ★ Unit + integration + E2E
    D. Khác/Other: ___"

6. Architecture decisions:
   "Error handling strategy for this feature:
    A. Throw exceptions, catch at boundary
    B. Result/Either pattern (no exceptions)
    C. Error codes + error handler
    D. ★ Follow existing project pattern: [detected pattern]
    E. Khác/Other: ___"

---

## Zero-Fog Checklist (additions)

- [ ] Every requirement is specific enough for a verifier to objectively check (no "handle errors gracefully", no "good UX")
- [ ] All edge cases are explicitly named (not "handle edge cases" — which ones?)
- [ ] Error paths are defined for every operation that can fail (what happens on failure? specific behavior, not "show error")
- [ ] If UI exists: component states listed (loading, error, empty, disabled, overflow)
- [ ] If UI exists: accessibility requirements stated (keyboard nav, contrast, ARIA, focus management)
- [ ] Test strategy decided (unit? integration? E2E? which functions need edge case tests?)
- [ ] Architecture decisions explicit (error handling strategy, dependency direction, state management approach)

---

## Extra Subagents

| Subagent | When to Use |
|----------|-------------|
| osf-uiux-designer | User is building a new feature that needs UI, or wants to modify/add UI components |

The following is the user's request: