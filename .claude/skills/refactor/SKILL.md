---
name: "refactor"
description: "Plan code refactoring. Explore scope, assess impact, then implement with optional spec creation."
---

You are planning code refactoring. This command helps you explore the refactoring scope, assess impact, and decide on the best implementation path.

BEFORE PROCEEDING: You MUST use the Skill tool to invoke "explore" unless the caller context explicitly says shared explore mode has already been loaded for this request. This loads the shared explore mode behavior (stance, verification, workflow, subagent protocols, OpenSpec awareness, guardrails) that this command depends on. Do not proceed until explore is loaded exactly once.

---

## What You Might Do

**Explore the problem space**
- Feynman Echo — restate the refactoring goal in the simplest possible language, then ask user to confirm or correct
- Ask clarifying questions that emerge from what they said
- Challenge assumptions
- Reframe the problem
- Find analogies

**Investigate the codebase**
- Map existing architecture relevant to the refactoring
- Find integration points
- Identify patterns already in use
- Surface hidden complexity
- Trace dependencies

**Compare options**
- Brainstorm multiple refactoring approaches
- Build comparison tables
- Sketch tradeoffs
- Recommend a path (if asked)

**Visualize**
```
┌─────────────────────────────────────────┐
│     Use ASCII diagrams liberally        │
├─────────────────────────────────────────┤
│   Architecture before/after, dependency │
│   graphs, module boundaries             │
└─────────────────────────────────────────┘
```

**Research external knowledge**
- When discussion involves technology choices, best practices, or security concerns → delegate to osf-researcher

**Look up API documentation**
- When discussion needs precise API usage → delegate to osf-researcher for web research

**Surface risks and unknowns**
- Identify what could go wrong with the refactoring
- Find gaps in understanding
- Suggest spikes or investigations

---

## Stress-test Questions

Resolve these before ending discovery. Self-answer by exploring the codebase. Only surface items to the user that are genuinely ambiguous or require a personal/team style choice:

1. Behavior preservation:
   "Will this refactoring change behavior:
    A. No — pure refactoring, same behavior
    B. Maybe — need to check edge cases
    C. ★ Likely — need comprehensive testing
    D. Khác/Other: ___"

2. Scope clarity:
   "What's included in this refactoring:
    A. Just this component
    B. This component + related dependencies
    C. ★ Full audit and refactor across codebase
    D. Khác/Other: ___"

3. Test strategy:
   "Test level needed:
    A. Manual verification only
    B. Unit tests for refactored code
    C. ★ Unit + integration tests
    D. Khác/Other: ___"

4. Architecture decisions:
   "Refactoring approach:
    A. Minimal changes, keep existing patterns
    B. Modernize while maintaining compatibility
    C. ★ Follow existing project pattern: [detected pattern]
    D. Khác/Other: ___"

---

## Zero-Fog Checklist (additions)

- [ ] Refactoring goal is specific enough for a verifier to objectively check
- [ ] All affected areas are explicitly named (not "refactor related code" — which files?)
- [ ] Behavior preservation strategy is clear (what must stay the same?)
- [ ] Test strategy decided (unit? integration? regression? which functions need edge case tests?)

The following is the user's request: