---
name: "test"
description: "Plan and implement test additions/improvements. Explore coverage, strategy, and edge cases, then implement with optional spec creation."
---

You are planning test work. This command helps you explore the testing space, assess its size, and decide on the best implementation path.

BEFORE PROCEEDING: You MUST use the Skill tool to invoke "explore" unless the caller context explicitly says shared explore mode has already been loaded for this request. This loads the shared explore mode behavior (stance, verification, workflow, subagent protocols, OpenSpec awareness, guardrails) that this command depends on. Do not proceed until explore is loaded exactly once.

---

## What You Might Do

**Explore the testing space**
- Feynman Echo — restate the user's testing need in the simplest possible language, then ask user to confirm or correct
- Ask clarifying questions about coverage, strategy, and scope
- Challenge assumptions about what needs testing
- Find analogies to existing test patterns

**Investigate the codebase**
- Map existing test structure and coverage
- Find untested code paths and edge cases
- Identify patterns already in use
- Surface hidden complexity that needs testing

**Compare options**
- Brainstorm multiple testing approaches
- Build comparison tables (unit vs integration vs E2E, mocking strategies, test frameworks)
- Sketch tradeoffs (coverage vs maintenance burden, speed vs comprehensiveness)
- Recommend a path (if asked)

**Visualize**
```
┌─────────────────────────────────────────┐
│     Use ASCII diagrams liberally        │
├─────────────────────────────────────────┤
│   Test pyramid, coverage maps,          │
│   edge case matrices, mock strategies   │
└─────────────────────────────────────────┘
```

**Research external knowledge**
- When discussion involves testing tools, frameworks, or best practices → delegate to osf-researcher

**Investigate coverage gaps**
- Trace what's currently tested vs what's missing
- Find edge cases that aren't covered
- Identify flaky or brittle tests
- Surface maintenance burden

**Surface risks and unknowns**
- Identify what could go wrong with tests
- Find gaps in understanding
- Suggest spikes or investigations

---

## Stress-test Questions

Resolve these before ending discovery. Self-answer by exploring the codebase. Only surface items to the user that are genuinely ambiguous or require a personal/team style choice:

1. Test level:
   "What level of testing:
    A. Unit tests only
    B. Unit + integration
    C. ★ Unit + integration + E2E
    D. Khác/Other: ___"

2. Coverage target:
   "Coverage goal:
    A. Critical paths only
    B. All public APIs
    C. ★ Comprehensive (public APIs + edge cases + error paths)
    D. Khác/Other: ___"

3. Mocking strategy:
   "What gets mocked:
    A. Nothing — all real dependencies
    B. External services only
    C. ★ External services + database (unit), real DB (integration)
    D. Khác/Other: ___"

4. Test data:
   "Test data strategy:
    A. Inline test data
    B. Fixtures / snapshots
    C. ★ Factories / builders
    D. Khác/Other: ___"

---

## Zero-Fog Checklist (additions)

- [ ] Test scope is specific (what's in, what's out)
- [ ] Test level is decided (unit, integration, E2E, or combination)
- [ ] Coverage target is clear (percentage or specific areas)
- [ ] Edge cases are explicitly named (what scenarios need testing?)
- [ ] Mocking/stubbing strategy is defined (what gets mocked, what's real)
- [ ] Test data strategy is decided (fixtures, factories, real data)
- [ ] Error paths are covered (what happens on failure?)
- [ ] Performance/flakiness concerns are addressed

The following is the user's request: